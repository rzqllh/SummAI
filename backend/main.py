from fastapi import FastAPI, UploadFile, File, Header, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import tempfile
import os
import shutil
import logging
import asyncio
import uuid
import time
import glob
from dotenv import load_dotenv

load_dotenv(override=True)
logger = logging.getLogger("summai")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] [%(name)s] %(message)s")

from backend.audio_processor import process_and_chunk_audio, extract_audio_from_video
from backend.summarizer import (
    transcribe_audio_with_fallback,
    generate_summary_with_fallback,
    groq_stt,
    gemini_llm,
    cloudflare_stt,
    cloudflare_llm,
)
import backend.db as db

app = FastAPI(
    title="SummAI - Meeting Intelligence API",
    description="Zero-cost, local-first meeting transcription and structured synthesis with smart Cloudflare fallback."
)

# Startup Temp Directory Cleanup
@app.on_event("startup")
async def cleanup_orphaned_temp_dirs():
    temp_root = tempfile.gettempdir()
    pattern = os.path.join(temp_root, "summai_job_*")
    now = time.time()
    count = 0
    for folder in glob.glob(pattern):
        try:
            mtime = os.path.getmtime(folder)
            # Remove orphaned temp directories older than 1 hour (3600s)
            if now - mtime > 3600:
                shutil.rmtree(folder, ignore_errors=True)
                count += 1
        except Exception:
            pass
    if count > 0:
        logger.info(f"Cleaned up {count} orphaned temp job directories on startup.")

# Trace ID Middleware
@app.middleware("http")
async def trace_id_middleware(request: Request, call_next):
    trace_id = request.headers.get("x-trace-id") or str(uuid.uuid4())
    request.state.trace_id = trace_id
    response: Response = await call_next(request)
    response.headers["x-trace-id"] = trace_id
    return response

# CORS configuration
allowed_origins_env = os.environ.get("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
allowed_origins = [orig.strip() for orig in allowed_origins_env.split(",") if orig.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins if allowed_origins else ["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def mask_key(key: Optional[str]) -> str:
    if not key or not key.strip():
        return ""
    key = key.strip()
    if len(key) <= 8:
        return "****"
    return f"{key[:4]}...{key[-4:]}"

# --- REQUEST SCHEMAS ---

class SummarizeRequest(BaseModel):
    raw_transcript: str
    filename: str
    media_type: str
    custom_prompt: Optional[str] = None
    title: Optional[str] = None
    duration_seconds: Optional[float] = 0
    folder_id: Optional[int] = None

class TestKeyRequest(BaseModel):
    api_key: Optional[str] = None

class CreatePresetRequest(BaseModel):
    title: str
    prompt: str

class GenerateTitleRequest(BaseModel):
    transcript: str

class UpdateActionItemRequest(BaseModel):
    status: str

class CreateFolderRequest(BaseModel):
    name: str
    color: Optional[str] = "#10b981"

class CreateShareRequest(BaseModel):
    meeting_id: int
    allow_transcript: Optional[bool] = True
    password: Optional[str] = None

class ChatMeetingRequest(BaseModel):
    raw_transcript: str
    summary: Optional[str] = None
    question: str

class UploadInitRequest(BaseModel):
    filename: str
    filesize: int
    media_type: str
    total_chunks: int

# --- API ENDPOINTS ---

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "timestamp": time.time(),
        "database": "sqlite_wal",
    }

# --- RESUMABLE CHUNK UPLOAD ---

UPLOAD_SESSIONS: Dict[str, Dict[str, Any]] = {}

@app.post("/api/uploads/init")
async def init_chunk_upload(req: UploadInitRequest):
    upload_id = str(uuid.uuid4())
    job_dir = tempfile.mkdtemp(prefix="summai_job_")
    UPLOAD_SESSIONS[upload_id] = {
        "filename": req.filename,
        "filesize": req.filesize,
        "media_type": req.media_type,
        "total_chunks": req.total_chunks,
        "received_chunks": set(),
        "job_dir": job_dir,
        "created_at": time.time(),
    }
    return {"upload_id": upload_id}

@app.put("/api/uploads/{upload_id}/chunks/{index}")
async def upload_chunk(
    upload_id: str,
    index: int,
    request: Request,
):
    if upload_id not in UPLOAD_SESSIONS:
        raise HTTPException(status_code=404, detail="Upload session expired or not found.")
    session = UPLOAD_SESSIONS[upload_id]
    chunk_path = os.path.join(session["job_dir"], f"chunk_{index:05d}.part")
    
    body = await request.body()
    with open(chunk_path, "wb") as f:
        f.write(body)
        
    session["received_chunks"].add(index)
    return {"status": "chunk_received", "index": index, "total": len(session["received_chunks"])}

@app.post("/api/uploads/{upload_id}/complete")
async def complete_chunk_upload(
    upload_id: str,
    x_groq_api_key: Optional[str] = Header(None),
    x_cf_api_token: Optional[str] = Header(None),
):
    if upload_id not in UPLOAD_SESSIONS:
        raise HTTPException(status_code=404, detail="Upload session not found.")
    session = UPLOAD_SESSIONS.pop(upload_id)
    job_dir = session["job_dir"]
    filename = session["filename"]
    ext = filename.split(".")[-1].lower() if "." in filename else "mp4"
    merged_path = os.path.join(job_dir, f"input.{ext}")

    try:
        # Merge all chunks in order
        with open(merged_path, "wb") as outfile:
            for i in range(session["total_chunks"]):
                chunk_file = os.path.join(job_dir, f"chunk_{i:05d}.part")
                if not os.path.exists(chunk_file):
                    raise HTTPException(status_code=400, detail=f"Missing chunk index {i}")
                with open(chunk_file, "rb") as infile:
                    outfile.write(infile.read())

        # Execute transcription pipeline
        if ext in ["mp4", "mov", "mkv", "avi", "webm"]:
            audio_path = await asyncio.to_thread(extract_audio_from_video, merged_path, job_dir)
            chunks = await asyncio.to_thread(process_and_chunk_audio, audio_path, 20 * 60 * 1000, job_dir)
        else:
            chunks = await asyncio.to_thread(process_and_chunk_audio, merged_path, 20 * 60 * 1000, job_dir)

        full_transcript = []
        provider_used = "Groq Whisper (Large-v3)"
        fallback_applied = False

        for chunk in chunks:
            result = await transcribe_audio_with_fallback(
                chunk,
                custom_groq_key=x_groq_api_key,
                custom_cf_token=x_cf_api_token,
            )
            full_transcript.append(result["transcript"])
            provider_used = result.get("provider", provider_used)
            if result.get("fallback_applied"):
                fallback_applied = True

        return {
            "transcript": " ".join(full_transcript),
            "filename": filename,
            "media_type": ext,
            "provider_used": provider_used,
            "fallback_applied": fallback_applied,
        }
    finally:
        shutil.rmtree(job_dir, ignore_errors=True)

# Standard direct upload endpoint (backwards compatibility)
@app.post("/api/upload")
async def upload_audio(
    file: UploadFile = File(...),
    x_groq_api_key: Optional[str] = Header(None),
    x_cf_api_token: Optional[str] = Header(None),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file sent")

    ext = file.filename.split(".")[-1].lower() if "." in file.filename else "mp4"
    job_dir = tempfile.mkdtemp(prefix="summai_job_")

    try:
        tmp_path = os.path.join(job_dir, f"input.{ext}")
        with open(tmp_path, "wb") as f:
            shutil.copyfileobj(file.file, f)

        if ext in ["mp4", "mov", "mkv", "avi", "webm"]:
            audio_path = await asyncio.to_thread(extract_audio_from_video, tmp_path, job_dir)
            chunks = await asyncio.to_thread(process_and_chunk_audio, audio_path, 20 * 60 * 1000, job_dir)
            full_transcript = []
            provider_used = "Groq Whisper (Large-v3)"
            fallback_applied = False
            for chunk in chunks:
                result = await transcribe_audio_with_fallback(chunk, custom_groq_key=x_groq_api_key, custom_cf_token=x_cf_api_token)
                full_transcript.append(result["transcript"])
                provider_used = result.get("provider", provider_used)
                if result.get("fallback_applied"): fallback_applied = True
            transcript = " ".join(full_transcript)
        elif ext in ["mp3", "wav", "m4a"]:
            chunks = await asyncio.to_thread(process_and_chunk_audio, tmp_path, 20 * 60 * 1000, job_dir)
            full_transcript = []
            provider_used = "Groq Whisper (Large-v3)"
            fallback_applied = False
            for chunk in chunks:
                result = await transcribe_audio_with_fallback(chunk, custom_groq_key=x_groq_api_key, custom_cf_token=x_cf_api_token)
                full_transcript.append(result["transcript"])
                provider_used = result.get("provider", provider_used)
                if result.get("fallback_applied"): fallback_applied = True
            transcript = " ".join(full_transcript)
        elif ext == "txt":
            with open(tmp_path, "r", encoding="utf-8", errors="ignore") as f:
                transcript = f.read()
            provider_used = "Direct Text Input"
            fallback_applied = False
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format.")

        return {
            "transcript": transcript,
            "filename": file.filename,
            "media_type": ext,
            "provider_used": provider_used,
            "fallback_applied": fallback_applied,
        }
    finally:
        shutil.rmtree(job_dir, ignore_errors=True)

# --- SYNTHESIS & SUMMARIZATION ---

@app.post("/api/summarize")
async def summarize(
    req: SummarizeRequest,
    x_gemini_api_key: Optional[str] = Header(None),
    x_groq_api_key: Optional[str] = Header(None),
    x_cf_api_token: Optional[str] = Header(None),
    x_user_email: Optional[str] = Header(None),
):
    try:
        result = await generate_summary_with_fallback(
            raw_transcript=req.raw_transcript,
            custom_prompt=req.custom_prompt,
            custom_gemini_key=x_gemini_api_key,
            custom_groq_key=x_groq_api_key,
            custom_cf_token=x_cf_api_token,
        )
        summary = result["summary"]
        provider_used = result.get("provider", "Google Gemini Flash")
        fallback_applied = result.get("fallback_applied", False)

        # Persist to local SQLite with user isolation & structured columns
        user_email = (x_user_email or "default").strip().lower()
        meeting_id = await asyncio.to_thread(
            db.save_meeting,
            filename=req.filename,
            media_type=req.media_type,
            raw_transcript=req.raw_transcript,
            summary=summary,
            user_email=user_email,
            title=req.title,
            duration_seconds=req.duration_seconds or 0,
            provider_stt="Groq Whisper",
            provider_llm=provider_used,
            folder_id=req.folder_id,
        )
        
        return {
            "id": meeting_id,
            "summary": summary,
            "provider_used": provider_used,
            "fallback_applied": fallback_applied,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Synthesis error", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to synthesize summary: {str(e)}")

# --- TITLE AUTO-GENERATION ---

@app.post("/api/generate-title")
async def generate_title(
    req: GenerateTitleRequest,
    x_gemini_api_key: Optional[str] = Header(None),
    x_groq_api_key: Optional[str] = Header(None),
    x_cf_api_token: Optional[str] = Header(None),
):
    if not req.transcript.strip():
        return {"title": "Executive Meeting Summary"}
        
    prompt = f"""ROLE: You are an executive secretary.
Based on the transcript below, provide ONLY a concise, professional title (3 to 7 words).
Do NOT include quotes, prefixes, or markdown.

TRANSCRIPT:
{req.transcript[:3000]}
"""
    try:
        res = await generate_summary_with_fallback(
            raw_transcript=req.transcript[:3000],
            custom_prompt=prompt,
            custom_gemini_key=x_gemini_api_key,
            custom_groq_key=x_groq_api_key,
            custom_cf_token=x_cf_api_token,
        )
        clean_title = res["summary"].strip().replace('"', '').replace("Title:", "").strip()
        return {"title": clean_title}
    except Exception:
        return {"title": "Executive Meeting Summary"}

# --- CHAT WITH MEETING ---

@app.post("/api/chat-meeting")
async def chat_meeting(
    req: ChatMeetingRequest,
    x_gemini_api_key: Optional[str] = Header(None),
    x_groq_api_key: Optional[str] = Header(None),
    x_cf_api_token: Optional[str] = Header(None),
):
    question = req.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="Question cannot be empty")
    if not req.raw_transcript and not req.summary:
        raise HTTPException(status_code=400, detail="Transcript or summary context required")

    system_prompt = f"""ROLE: You are an intelligent Meeting Q&A Assistant.
Answer the user's question accurately, concisely, and factually using ONLY the meeting context below.

RULES:
- Ground all facts strictly in the transcript or summary.
- If a person, date, technical value, or decision was NOT mentioned, state truthfully: "This detail was not discussed or mentioned in the meeting records."
- Do NOT hallucinate.
- Keep answers operational, bulleted, and directly helpful.

MEETING CONTEXT:
Summary:
{req.summary or "N/A"}

Transcript:
{req.raw_transcript}

QUESTION:
{question}
"""
    try:
        result = await generate_summary_with_fallback(
            raw_transcript=req.raw_transcript,
            custom_prompt=system_prompt,
            custom_gemini_key=x_gemini_api_key,
            custom_groq_key=x_groq_api_key,
            custom_cf_token=x_cf_api_token,
        )
        return {
            "answer": result["summary"],
            "provider_used": result.get("provider", "Google Gemini Flash"),
        }
    except Exception as e:
        logger.error("Chat meeting error", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to answer question: {str(e)}")

# --- HISTORY & LIBRARY ---

@app.get("/api/history")
async def get_history(
    q: Optional[str] = None,
    type: Optional[str] = None,
    folder_id: Optional[int] = None,
    x_user_email: Optional[str] = Header(None),
):
    user_email = (x_user_email or "default").strip().lower()
    if q or (type and type != "all"):
        meetings = await asyncio.to_thread(db.search_meetings, query=q or "", media_type=type or "", user_email=user_email)
    else:
        meetings = await asyncio.to_thread(db.get_all_meetings, user_email=user_email, folder_id=folder_id)
    return {"meetings": meetings}

@app.get("/api/history/{meeting_id}")
async def get_meeting_detail(
    meeting_id: int,
    x_user_email: Optional[str] = Header(None),
):
    user_email = (x_user_email or "default").strip().lower()
    meeting = await asyncio.to_thread(db.get_meeting, meeting_id, user_email=user_email)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return {"meeting": meeting}

@app.delete("/api/history/{meeting_id}")
async def delete_history_item(
    meeting_id: int,
    x_user_email: Optional[str] = Header(None),
):
    user_email = (x_user_email or "default").strip().lower()
    await asyncio.to_thread(db.delete_meeting, meeting_id, user_email=user_email)
    return {"status": "deleted", "id": meeting_id}

@app.get("/api/stats")
async def get_user_stats(
    x_user_email: Optional[str] = Header(None),
):
    user_email = (x_user_email or "default").strip().lower()
    stats = await asyncio.to_thread(db.get_stats, user_email=user_email)
    return stats

# --- ACTION ITEMS ---

@app.get("/api/action-items")
async def get_action_items(
    status: Optional[str] = None,
    x_user_email: Optional[str] = Header(None),
):
    user_email = (x_user_email or "default").strip().lower()
    items = await asyncio.to_thread(db.get_user_action_items, user_email=user_email, status=status)
    return {"action_items": items}

@app.patch("/api/action-items/{item_id}")
async def update_action_item(
    item_id: int,
    req: UpdateActionItemRequest,
    x_user_email: Optional[str] = Header(None),
):
    user_email = (x_user_email or "default").strip().lower()
    updated = await asyncio.to_thread(db.update_action_item_status, item_id, req.status, user_email=user_email)
    if not updated:
        raise HTTPException(status_code=404, detail="Action item not found")
    return {"status": "updated", "id": item_id}

# --- FOLDERS ---

@app.get("/api/folders")
async def list_folders(
    x_user_email: Optional[str] = Header(None),
):
    user_email = (x_user_email or "default").strip().lower()
    folders = await asyncio.to_thread(db.get_folders, user_email=user_email)
    return {"folders": folders}

@app.post("/api/folders", status_code=201)
async def create_new_folder(
    req: CreateFolderRequest,
    x_user_email: Optional[str] = Header(None),
):
    user_email = (x_user_email or "default").strip().lower()
    folder = await asyncio.to_thread(db.create_folder, name=req.name, color=req.color or "#10b981", user_email=user_email)
    return {"folder": folder}

# --- SECURE SHARE LINKS ---

@app.post("/api/share")
async def create_share(
    req: CreateShareRequest,
    x_user_email: Optional[str] = Header(None),
):
    user_email = (x_user_email or "default").strip().lower()
    try:
        link_data = await asyncio.to_thread(
            db.create_share_link,
            meeting_id=req.meeting_id,
            allow_transcript=bool(req.allow_transcript),
            password=req.password,
            user_email=user_email,
        )
        return link_data
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@app.get("/api/share/{token}")
async def view_shared_meeting(
    token: str,
    password: Optional[str] = None,
):
    meeting = await asyncio.to_thread(db.get_shared_meeting, token=token, password=password)
    if not meeting:
        raise HTTPException(status_code=404, detail="Shared meeting not found or expired.")
    return meeting

# --- PRESETS CRUD ---

@app.get("/api/presets")
async def get_presets(
    x_user_email: Optional[str] = Header(None),
):
    builtin = [
        {
            "id": "mom",
            "title": "Corporate MoM",
            "description": "Convert raw meeting transcripts into structured corporate Minutes of Meeting with grounded discussion points, decisions, and action plans.",
            "prompt": "Convert the following raw transcript into formal Corporate Minutes of Meeting (MoM) with Agenda, Discussion Summary, Decisions Reached, and Action Plan Table.",
            "custom": False,
        },
        {
            "id": "cleanup",
            "title": "Transcript Cleanup & Polish",
            "description": "Clean filler words, stuttering, and transcription noise into clear, readable, natural verbatim text.",
            "prompt": "Polish the raw transcript: remove filler words (e.g. um, uh, ya, gitu), fix grammatical artifacts, but preserve 100% of facts and speaker flow.",
            "custom": False,
        },
        {
            "id": "exec",
            "title": "Executive Summary",
            "description": "High-level summary with key takeaways and strategic decisions.",
            "prompt": "Provide a high-level executive summary in Markdown format with key takeaways, strategic decisions, and overall meeting outcomes.",
            "custom": False,
        },
        {
            "id": "action_items",
            "title": "Action Items & Tasks",
            "description": "Extract explicit tasks into a structured table with assignees, deadlines, and operational checklists.",
            "prompt": "Extract all action items, assignees, and deadlines into a clear Markdown table, followed by formatted actionable checklists.",
            "custom": False,
        },
        {
            "id": "retro",
            "title": "Sprint Retrospective",
            "description": "Categorize discussion into What Went Well, What Could Be Improved, and Next Action Points.",
            "prompt": "Structure the meeting notes in Sprint Retrospective format: 1. What Went Well, 2. What Could Be Improved / Blockers, 3. Concrete Action Points for Next Sprint.",
            "custom": False,
        },
        {
            "id": "tech",
            "title": "Technical Architecture Review",
            "description": "Summarize engineering tradeoffs, system design choices, and architectural decisions.",
            "prompt": "Summarize technical decisions, engineering constraints, database/API design choices, and system architecture specs discussed in the meeting.",
            "custom": False,
        },
    ]
    user_email = (x_user_email or "default").strip().lower()
    custom = await asyncio.to_thread(db.get_custom_presets, user_email=user_email)
    return {"presets": builtin + custom}

@app.post("/api/presets", status_code=201)
async def create_preset(
    req: CreatePresetRequest,
    x_user_email: Optional[str] = Header(None),
):
    title = req.title.strip()
    prompt = req.prompt.strip()
    if not title or not prompt:
        raise HTTPException(status_code=400, detail="title and prompt are required")
    if len(title) > 150:
        raise HTTPException(status_code=400, detail="title must be 150 characters or fewer")
    if len(prompt) > 10000:
        raise HTTPException(status_code=400, detail="prompt must be 10000 characters or fewer")
    user_email = (x_user_email or "default").strip().lower()
    preset = await asyncio.to_thread(db.save_custom_preset, title, prompt, user_email=user_email)
    return {"preset": preset}

@app.delete("/api/presets/{preset_id}")
async def delete_preset(
    preset_id: str,
    x_user_email: Optional[str] = Header(None),
):
    if not preset_id.startswith("custom_"):
        raise HTTPException(status_code=400, detail="Built-in presets cannot be deleted")
    try:
        db_id = int(preset_id.replace("custom_", ""))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid preset id")
    user_email = (x_user_email or "default").strip().lower()
    await asyncio.to_thread(db.delete_custom_preset, db_id, user_email=user_email)
    return {"status": "deleted", "id": preset_id}
