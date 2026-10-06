from fastapi import FastAPI, UploadFile, File, Header, HTTPException, Request, Response
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import tempfile
import os
import shutil
import asyncio
import uuid
import time
import glob
import json
import hashlib
import httpx
from dotenv import load_dotenv

load_dotenv(override=True)

from backend.logger import app_logger, sanitize_text
from backend.errors import SummAIException, ErrorCode, summai_exception_handler
from backend.rate_limiter import limiter, get_client_identifier
from backend.audio_processor import process_and_chunk_audio, extract_audio_from_video
from backend.summarizer import (
    transcribe_audio_with_fallback,
    generate_summary_with_fallback,
    generate_summary_stream_with_fallback,
)
import backend.db as db

from contextlib import asynccontextmanager

from backend.batch_worker import batch_worker

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Initialize SQLite Database & Migrations
    db.init_db()

    # 2. Cleanup orphaned temp directories older than 1 hour (3600s)
    temp_root = tempfile.gettempdir()
    pattern = os.path.join(temp_root, "summai_job_*")
    now = time.time()
    count = 0
    for folder in glob.glob(pattern):
        try:
            if os.path.isdir(folder) and (now - os.path.getctime(folder) > 3600):
                shutil.rmtree(folder, ignore_errors=True)
                count += 1
        except Exception:
            pass
    if count > 0:
        app_logger.info(f"Cleaned up {count} orphaned temporary job directories on startup.")
            
    # 3. Clean stale upload sessions in DB
    stale_sessions = db.get_stale_upload_sessions(max_age_seconds=86400)
    for s in stale_sessions:
        db.delete_upload_session(s["id"])
        if os.path.exists(s["job_dir"]):
            shutil.rmtree(s["job_dir"], ignore_errors=True)

    app_logger.info(f"Startup clean: {count} temp dirs, {len(stale_sessions)} stale upload sessions removed.")

    # 4. Start Persistent Background Batch Worker
    batch_worker.start()

    try:
        yield
    finally:
        await batch_worker.stop()

app = FastAPI(title="SummAI Backend", version="1.0.0", lifespan=lifespan)

# Register Normalized Error Handler
app.add_exception_handler(SummAIException, summai_exception_handler)

# Structured request & duration logging middleware
@app.middleware("http")
async def trace_and_log_middleware(request: Request, call_next):
    trace_id = str(uuid.uuid4())[:8]
    request.state.trace_id = trace_id
    start_time = time.time()
    
    response = await call_next(request)
    duration_ms = round((time.time() - start_time) * 1000, 2)
    response.headers["X-Trace-ID"] = trace_id
    
    app_logger.info(
        f"{request.method} {request.url.path} -> {response.status_code} ({duration_ms}ms)",
        extra={
            "trace_id": trace_id,
            "method": request.method,
            "path": request.url.path,
            "status_code": response.status_code,
            "duration_ms": duration_ms,
            "client_ip": request.client.host if request.client else "unknown",
        }
    )
    return response

# CORS Configuration
frontend_url = os.environ.get("FRONTEND_URL", "")
allowed_origins = [orig.strip() for orig in frontend_url.split(",") if orig.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins if allowed_origins else ["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- REQUEST / RESPONSE SCHEMAS ---

class SummarizeRequest(BaseModel):
    raw_transcript: str = Field(..., min_length=1)
    filename: str = Field(..., min_length=1, max_length=255)
    media_type: str = Field(default="txt", max_length=20)
    custom_prompt: Optional[str] = Field(default=None, max_length=10000)
    title: Optional[str] = Field(default=None, max_length=200)
    duration_seconds: Optional[float] = 0
    folder_id: Optional[int] = None
    segments: Optional[List[Dict[str, Any]]] = None

class CreatePresetRequest(BaseModel):
    title: str = Field(..., min_length=3, max_length=100)
    prompt: str = Field(..., min_length=10, max_length=10000)

class GenerateTitleRequest(BaseModel):
    transcript: str = Field(..., min_length=1)

class UpdateActionItemRequest(BaseModel):
    status: str = Field(..., pattern="^(open|in_progress|done|cancelled)$")

class CreateFolderRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    color: Optional[str] = Field(default="#10b981", max_length=20)

class CreateTagRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)
    color: Optional[str] = Field(default="#38bdf8", max_length=20)

class CreateShareRequest(BaseModel):
    meeting_id: int
    allow_transcript: Optional[bool] = True
    password: Optional[str] = Field(default=None, max_length=100)
    expires_in_days: Optional[int] = Field(default=30, ge=1, le=365)

class ChatMeetingRequest(BaseModel):
    raw_transcript: str
    summary: Optional[str] = None
    question: str = Field(..., min_length=2, max_length=1000)
    segments: Optional[List[Dict[str, Any]]] = None

class UploadInitRequest(BaseModel):
    filename: str = Field(..., min_length=1, max_length=255)
    filesize: int = Field(..., gt=0, le=2 * 1024 * 1024 * 1024) # Max 2GB
    media_type: str = Field(..., max_length=20)
    total_chunks: int = Field(..., ge=1, le=5000)

class JobCreateRequest(BaseModel):
    filename: str = Field(..., min_length=1, max_length=255)
    media_type: str = Field(default="mp4", max_length=20)
    filesize: int = Field(default=0, ge=0)

class SlackIntegrationRequest(BaseModel):
    webhook_url: str = Field(..., min_length=10, max_length=500)
    title: str = Field(..., min_length=1, max_length=255)
    summary: str = Field(..., min_length=5)
    action_items: Optional[List[str]] = None

class NotionIntegrationRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    summary: str = Field(..., min_length=5)
    webhook_url: Optional[str] = Field(default=None, max_length=500)
    notion_api_token: Optional[str] = Field(default=None, max_length=200)
    parent_id: Optional[str] = Field(default=None, max_length=100)
    parent_type: Optional[str] = Field(default="database", pattern="^(database|page)$")

# --- API ENDPOINTS ---

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "timestamp": time.time(),
        "database": "sqlite_wal",
        "schema_version": 6,
    }

# --- PERSISTENT RESUMABLE CHUNK UPLOAD ---

@app.post("/api/uploads/init")
async def init_chunk_upload(
    req: UploadInitRequest,
    request: Request,
    x_user_email: Optional[str] = Header(None),
):
    limiter.check_rate_limit("upload_init", get_client_identifier(request), max_requests=30, window_seconds=60)
    user_email = (x_user_email or "default").strip().lower()
    
    upload_id = str(uuid.uuid4())
    job_dir = tempfile.mkdtemp(prefix="summai_job_")

    session = db.create_upload_session(
        upload_id=upload_id,
        filename=req.filename,
        filesize=req.filesize,
        media_type=req.media_type,
        total_chunks=req.total_chunks,
        job_dir=job_dir,
        user_email=user_email,
    )
    return session

@app.get("/api/uploads/{upload_id}")
async def get_chunk_upload_status(
    upload_id: str,
    x_user_email: Optional[str] = Header(None),
):
    user_email = (x_user_email or "default").strip().lower()
    session = db.get_upload_session(upload_id, user_email=user_email)
    if not session:
        raise SummAIException(ErrorCode.NOT_FOUND, "Upload session expired or not found.", status_code=404)
    return session

@app.put("/api/uploads/{upload_id}/chunks/{index}")
async def upload_chunk(
    upload_id: str,
    index: int,
    request: Request,
    x_user_email: Optional[str] = Header(None),
):
    user_email = (x_user_email or "default").strip().lower()
    session = db.get_upload_session(upload_id, user_email=user_email)
    if not session:
        raise SummAIException(ErrorCode.NOT_FOUND, "Upload session expired or not found.", status_code=404)
    
    if index < 0 or index >= session["total_chunks"]:
        raise SummAIException(
            ErrorCode.UPLOAD_INVALID,
            f"Chunk index {index} out of bounds (total: {session['total_chunks']}).",
            status_code=400
        )

    chunk_path = os.path.join(session["job_dir"], f"chunk_{index:05d}.part")
    body = await request.body()
    
    if not body:
        raise SummAIException(ErrorCode.UPLOAD_INVALID, "Empty chunk payload.", status_code=400)

    with open(chunk_path, "wb") as f:
        f.write(body)
        
    received = db.add_received_chunk(upload_id, index)
    return {"status": "chunk_received", "index": index, "received_count": len(received), "total_chunks": session["total_chunks"]}

@app.post("/api/uploads/{upload_id}/complete")
async def complete_chunk_upload(
    upload_id: str,
    request: Request,
    x_groq_api_key: Optional[str] = Header(None),
    x_cf_api_token: Optional[str] = Header(None),
    x_user_email: Optional[str] = Header(None),
):
    limiter.check_rate_limit("transcription", get_client_identifier(request), max_requests=10, window_seconds=60)
    user_email = (x_user_email or "default").strip().lower()
    session = db.get_upload_session(upload_id, user_email=user_email)
    if not session:
        raise SummAIException(ErrorCode.NOT_FOUND, "Upload session not found.", status_code=404)
    
    job_dir = session["job_dir"]
    filename = session["filename"]
    ext = filename.split(".")[-1].lower() if "." in filename else "mp4"
    merged_path = os.path.join(job_dir, f"input.{ext}")

    try:
        # Merge all chunks in order & verify completeness
        with open(merged_path, "wb") as outfile:
            for i in range(session["total_chunks"]):
                chunk_file = os.path.join(job_dir, f"chunk_{i:05d}.part")
                if not os.path.exists(chunk_file):
                    raise SummAIException(
                        ErrorCode.UPLOAD_INVALID,
                        f"Cannot complete upload: missing chunk index {i}.",
                        status_code=400
                    )
                with open(chunk_file, "rb") as infile:
                    outfile.write(infile.read())

        # Validate file size matches expected size
        actual_size = os.path.getsize(merged_path)
        if actual_size != session["filesize"]:
            app_logger.warning(f"File size mismatch: expected {session['filesize']}, got {actual_size}")

        # Compute SHA-256 Checksum
        sha256_hash = hashlib.sha256()
        with open(merged_path, "rb") as f:
            for byte_block in iter(lambda: f.read(65536), b""):
                sha256_hash.update(byte_block)
        file_checksum = sha256_hash.hexdigest()

        # Execute transcription pipeline
        if ext in ["mp4", "mov", "mkv", "avi", "webm"]:
            audio_path = await asyncio.to_thread(extract_audio_from_video, merged_path, job_dir)
            chunks = await asyncio.to_thread(process_and_chunk_audio, audio_path, 20 * 60 * 1000, job_dir)
        else:
            chunks = await asyncio.to_thread(process_and_chunk_audio, merged_path, 20 * 60 * 1000, job_dir)

        full_transcript = []
        all_segments = []
        offset_seconds = 0.0
        provider_used = "Groq Whisper (Large-v3)"
        fallback_applied = False

        for chunk in chunks:
            result = await transcribe_audio_with_fallback(
                chunk,
                custom_groq_key=x_groq_api_key,
                custom_cf_token=x_cf_api_token,
            )
            full_transcript.append(result["transcript"])
            for seg in result.get("segments", []):
                seg_copy = dict(seg)
                seg_copy["id"] = len(all_segments) + 1
                seg_copy["start"] = round(float(seg_copy.get("start", 0.0)) + offset_seconds, 2)
                seg_copy["end"] = round(float(seg_copy.get("end", 0.0)) + offset_seconds, 2)
                all_segments.append(seg_copy)
            offset_seconds += float(result.get("duration", 0.0) or 0.0)
            provider_used = result.get("provider", provider_used)
            if result.get("fallback_applied"):
                fallback_applied = True

        db.delete_upload_session(upload_id, user_email=user_email)

        return {
            "transcript": " ".join(full_transcript),
            "segments": all_segments,
            "filename": filename,
            "media_type": ext,
            "checksum_sha256": file_checksum,
            "provider_used": provider_used,
            "fallback_applied": fallback_applied,
        }
    except SummAIException:
        raise
    except Exception as e:
        app_logger.error(f"Upload complete processing failure: {sanitize_text(str(e))}", exc_info=True)
        raise SummAIException(ErrorCode.TRANSCRIPTION_FAILED, f"Failed to transcribe media: {str(e)}", status_code=500)
    finally:
        shutil.rmtree(job_dir, ignore_errors=True)

@app.delete("/api/uploads/{upload_id}")
async def cancel_chunk_upload(
    upload_id: str,
    x_user_email: Optional[str] = Header(None),
):
    user_email = (x_user_email or "default").strip().lower()
    session = db.get_upload_session(upload_id, user_email=user_email)
    if session:
        if os.path.exists(session["job_dir"]):
            shutil.rmtree(session["job_dir"], ignore_errors=True)
        db.delete_upload_session(upload_id, user_email=user_email)
    return {"status": "cancelled", "upload_id": upload_id}

# Standard direct upload endpoint (small files)
@app.post("/api/upload")
async def upload_audio(
    request: Request,
    file: UploadFile = File(...),
    x_groq_api_key: Optional[str] = Header(None),
    x_cf_api_token: Optional[str] = Header(None),
):
    limiter.check_rate_limit("direct_upload", get_client_identifier(request), max_requests=20, window_seconds=60)
    if not file.filename:
        raise SummAIException(ErrorCode.UPLOAD_INVALID, "No file sent.", status_code=400)

    ext = file.filename.split(".")[-1].lower() if "." in file.filename else "mp4"
    job_dir = tempfile.mkdtemp(prefix="summai_job_")

    try:
        tmp_path = os.path.join(job_dir, f"input.{ext}")
        with open(tmp_path, "wb") as f:
            shutil.copyfileobj(file.file, f)

        all_segments = []
        offset_seconds = 0.0
        provider_used = "Groq Whisper (Large-v3)"
        fallback_applied = False

        if ext in ["mp4", "mov", "mkv", "avi", "webm"]:
            audio_path = await asyncio.to_thread(extract_audio_from_video, tmp_path, job_dir)
            chunks = await asyncio.to_thread(process_and_chunk_audio, audio_path, 20 * 60 * 1000, job_dir)
            full_transcript = []
            for chunk in chunks:
                result = await transcribe_audio_with_fallback(chunk, custom_groq_key=x_groq_api_key, custom_cf_token=x_cf_api_token)
                full_transcript.append(result["transcript"])
                for seg in result.get("segments", []):
                    seg_copy = dict(seg)
                    seg_copy["id"] = len(all_segments) + 1
                    seg_copy["start"] = round(float(seg_copy.get("start", 0.0)) + offset_seconds, 2)
                    seg_copy["end"] = round(float(seg_copy.get("end", 0.0)) + offset_seconds, 2)
                    all_segments.append(seg_copy)
                offset_seconds += float(result.get("duration", 0.0) or 0.0)
                provider_used = result.get("provider", provider_used)
                if result.get("fallback_applied"): fallback_applied = True
            transcript = " ".join(full_transcript)
        elif ext in ["mp3", "wav", "m4a"]:
            chunks = await asyncio.to_thread(process_and_chunk_audio, tmp_path, 20 * 60 * 1000, job_dir)
            full_transcript = []
            for chunk in chunks:
                result = await transcribe_audio_with_fallback(chunk, custom_groq_key=x_groq_api_key, custom_cf_token=x_cf_api_token)
                full_transcript.append(result["transcript"])
                for seg in result.get("segments", []):
                    seg_copy = dict(seg)
                    seg_copy["id"] = len(all_segments) + 1
                    seg_copy["start"] = round(float(seg_copy.get("start", 0.0)) + offset_seconds, 2)
                    seg_copy["end"] = round(float(seg_copy.get("end", 0.0)) + offset_seconds, 2)
                    all_segments.append(seg_copy)
                offset_seconds += float(result.get("duration", 0.0) or 0.0)
                provider_used = result.get("provider", provider_used)
                if result.get("fallback_applied"): fallback_applied = True
            transcript = " ".join(full_transcript)
        elif ext == "txt":
            with open(tmp_path, "r", encoding="utf-8", errors="ignore") as f:
                transcript = f.read()
            provider_used = "Direct Text Input"
            fallback_applied = False
            all_segments = [{"id": 1, "start": 0.0, "end": 0.0, "text": transcript, "speaker": "Speaker 1"}]
        else:
            raise SummAIException(ErrorCode.UPLOAD_INVALID, "Unsupported media format. Supported: MP3, WAV, M4A, MP4, MOV, MKV, TXT.", status_code=400)

        return {
            "transcript": transcript,
            "segments": all_segments,
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
    request: Request,
    x_gemini_api_key: Optional[str] = Header(None),
    x_groq_api_key: Optional[str] = Header(None),
    x_cf_api_token: Optional[str] = Header(None),
    x_user_email: Optional[str] = Header(None),
):
    limiter.check_rate_limit("synthesis", get_client_identifier(request), max_requests=30, window_seconds=60)
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
            segments=req.segments,
        )
        
        return {
            "id": meeting_id,
            "summary": summary,
            "provider_used": provider_used,
            "fallback_applied": fallback_applied,
        }
    except SummAIException:
        raise
    except Exception as e:
        app_logger.error(f"Synthesis error: {sanitize_text(str(e))}", exc_info=True)
        raise SummAIException(ErrorCode.SYNTHESIS_FAILED, f"Failed to synthesize summary: {str(e)}", status_code=500)

# --- SSE STREAMING SYNTHESIS (Server-Sent Events) ---

@app.post("/api/synthesis/stream")
async def stream_synthesis(
    req: SummarizeRequest,
    request: Request,
    x_gemini_api_key: Optional[str] = Header(None),
    x_groq_api_key: Optional[str] = Header(None),
    x_cf_api_token: Optional[str] = Header(None),
    x_user_email: Optional[str] = Header(None),
):
    limiter.check_rate_limit("synthesis_stream", get_client_identifier(request), max_requests=30, window_seconds=60)

    async def sse_event_generator():
        yield f"event: start\ndata: {json.dumps({'status': 'started', 'message': 'Selecting best intelligence model...'})}\n\n"
        await asyncio.sleep(0.01)

        try:
            full_summary = ""
            provider_used = "Google Gemini Flash"

            stream_iter = generate_summary_stream_with_fallback(
                raw_transcript=req.raw_transcript,
                custom_prompt=req.custom_prompt,
                custom_gemini_key=x_gemini_api_key,
                custom_groq_key=x_groq_api_key,
                custom_cf_token=x_cf_api_token,
            )

            async for event in stream_iter:
                ev_type = event.get("type")
                if ev_type == "provider":
                    provider_used = event.get("provider", provider_used)
                    yield f"event: provider\ndata: {json.dumps({'provider': provider_used, 'fallback': event.get('fallback', False)})}\n\n"
                elif ev_type == "token":
                    delta = event.get("delta", "")
                    if delta:
                        yield f"event: token\ndata: {json.dumps({'delta': delta})}\n\n"
                elif ev_type == "done":
                    full_summary = event.get("full_summary", "")
                    provider_used = event.get("provider", provider_used)

            # Persist to SQLite database
            user_email = (x_user_email or "default").strip().lower()
            meeting_id = await asyncio.to_thread(
                db.save_meeting,
                filename=req.filename,
                media_type=req.media_type,
                raw_transcript=req.raw_transcript,
                summary=full_summary,
                user_email=user_email,
                title=req.title,
                duration_seconds=req.duration_seconds or 0,
                provider_stt="Groq Whisper",
                provider_llm=provider_used,
                folder_id=req.folder_id,
                segments=req.segments,
            )

            yield f"event: done\ndata: {json.dumps({'id': meeting_id, 'summary': full_summary, 'provider': provider_used})}\n\n"
        except Exception as e:
            app_logger.error(f"SSE Synthesis error: {sanitize_text(str(e))}")
            yield f"event: error\ndata: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(sse_event_generator(), media_type="text/event-stream")

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
    request: Request,
    x_gemini_api_key: Optional[str] = Header(None),
    x_groq_api_key: Optional[str] = Header(None),
    x_cf_api_token: Optional[str] = Header(None),
):
    limiter.check_rate_limit("chat", get_client_identifier(request), max_requests=40, window_seconds=60)
    question = req.question.strip()
    if not question:
        raise SummAIException(ErrorCode.UPLOAD_INVALID, "Question cannot be empty.", status_code=400)
    if not req.raw_transcript and not req.summary:
        raise SummAIException(ErrorCode.UPLOAD_INVALID, "Transcript or summary context required.", status_code=400)

    # Format transcript with explicit segment citation tags if segments available
    formatted_transcript = ""
    segments_by_id = {}
    if req.segments and len(req.segments) > 0:
        segment_lines = []
        for idx, seg in enumerate(req.segments):
            seg_id = seg.get("id", idx + 1)
            segments_by_id[str(seg_id)] = seg
            start_m, start_s = divmod(int(seg.get("start", 0)), 60)
            end_m, end_s = divmod(int(seg.get("end", 0)), 60)
            speaker = seg.get("speaker") or "Speaker"
            txt = seg.get("text", "").strip()
            segment_lines.append(f"[seg_{seg_id}] ({start_m:02d}:{start_s:02d} - {end_m:02d}:{end_s:02d}) {speaker}: {txt}")
        formatted_transcript = "\n".join(segment_lines)
    else:
        formatted_transcript = req.raw_transcript

    system_prompt = f"""ROLE: You are an intelligent Meeting Q&A Assistant.
Answer the user's question accurately, concisely, and factually using ONLY the meeting context below.

CITATION RULES:
- Ground all facts strictly in the transcript or summary.
- If the transcript has segment tags like [seg_1], [seg_2], you MUST append the exact segment tag [seg_X] after each claim or fact in your answer (e.g. "The budget was approved for Q4 [seg_3].").
- If a person, date, technical value, or decision was NOT mentioned, state truthfully: "This detail was not discussed or mentioned in the meeting records."
- Do NOT hallucinate.
- Keep answers operational, bulleted, and directly helpful.

MEETING CONTEXT:
Summary:
{req.summary or "N/A"}

Transcript:
{formatted_transcript}

QUESTION:
{question}
"""
    try:
        result = await generate_summary_with_fallback(
            raw_transcript=formatted_transcript,
            custom_prompt=system_prompt,
            custom_gemini_key=x_gemini_api_key,
            custom_groq_key=x_groq_api_key,
            custom_cf_token=x_cf_api_token,
        )
        answer_text = result["summary"]

        # Parse cited segment IDs from the model's generated answer
        import re
        cited_ids = list(dict.fromkeys(re.findall(r"\[seg_(\d+)\]", answer_text)))
        evidence_segments = []
        for cid in cited_ids:
            if cid in segments_by_id:
                evidence_segments.append(segments_by_id[cid])

        # Fallback if no citations in text but keywords matched
        if not evidence_segments and req.segments:
            q_tokens = set(question.lower().split())
            ranked = []
            for seg in req.segments:
                seg_text = seg.get("text", "").lower()
                overlap = sum(1 for token in q_tokens if token in seg_text)
                if overlap > 0:
                    ranked.append((overlap, seg))
            ranked.sort(key=lambda x: x[0], reverse=True)
            evidence_segments = [item[1] for item in ranked[:3]]

        return {
            "answer": answer_text,
            "evidence": evidence_segments,
            "provider_used": result.get("provider", "Google Gemini Flash"),
        }
    except Exception as e:
        app_logger.error(f"Chat meeting error: {sanitize_text(str(e))}", exc_info=True)
        raise SummAIException(ErrorCode.SYNTHESIS_FAILED, f"Failed to answer question: {str(e)}", status_code=500)

# --- HISTORY & LIBRARY ---

@app.get("/api/history")
async def get_history(
    q: Optional[str] = None,
    type: Optional[str] = None,
    folder_id: Optional[int] = None,
    tag_id: Optional[int] = None,
    x_user_email: Optional[str] = Header(None),
):
    user_email = (x_user_email or "default").strip().lower()
    if q or (type and type != "all"):
        meetings = await asyncio.to_thread(db.search_meetings, query=q or "", media_type=type or "", user_email=user_email)
    else:
        meetings = await asyncio.to_thread(db.get_all_meetings, user_email=user_email, folder_id=folder_id, tag_id=tag_id)
    return {"meetings": meetings}

@app.get("/api/history/{meeting_id}")
async def get_meeting_detail(
    meeting_id: int,
    x_user_email: Optional[str] = Header(None),
):
    user_email = (x_user_email or "default").strip().lower()
    meeting = await asyncio.to_thread(db.get_meeting, meeting_id, user_email=user_email)
    if not meeting:
        raise SummAIException(ErrorCode.NOT_FOUND, "Meeting not found.", status_code=404)
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
        raise SummAIException(ErrorCode.NOT_FOUND, "Action item not found.", status_code=404)
    return {"status": "updated", "id": item_id}

# --- WORKSPACE FOLDERS & TAGS ---

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

@app.get("/api/tags")
async def list_tags(
    x_user_email: Optional[str] = Header(None),
):
    user_email = (x_user_email or "default").strip().lower()
    tags = await asyncio.to_thread(db.get_tags, user_email=user_email)
    return {"tags": tags}

@app.post("/api/tags", status_code=201)
async def create_new_tag(
    req: CreateTagRequest,
    x_user_email: Optional[str] = Header(None),
):
    user_email = (x_user_email or "default").strip().lower()
    tag = await asyncio.to_thread(db.create_tag, name=req.name, color=req.color or "#38bdf8", user_email=user_email)
    return {"tag": tag}

@app.delete("/api/tags/{tag_id}")
async def delete_user_tag(
    tag_id: int,
    x_user_email: Optional[str] = Header(None),
):
    user_email = (x_user_email or "default").strip().lower()
    deleted = await asyncio.to_thread(db.delete_tag, tag_id, user_email=user_email)
    return {"status": "deleted" if deleted else "not_found", "id": tag_id}

@app.post("/api/meetings/{meeting_id}/tags/{tag_id}")
async def add_tag_to_meeting_endpoint(
    meeting_id: int,
    tag_id: int,
    x_user_email: Optional[str] = Header(None),
):
    user_email = (x_user_email or "default").strip().lower()
    success = await asyncio.to_thread(db.assign_tag_to_meeting, meeting_id, tag_id, user_email=user_email)
    if not success:
        raise SummAIException(ErrorCode.NOT_FOUND, "Meeting not found.", status_code=404)
    return {"status": "assigned", "meeting_id": meeting_id, "tag_id": tag_id}

@app.delete("/api/meetings/{meeting_id}/tags/{tag_id}")
async def remove_tag_from_meeting_endpoint(
    meeting_id: int,
    tag_id: int,
    x_user_email: Optional[str] = Header(None),
):
    user_email = (x_user_email or "default").strip().lower()
    await asyncio.to_thread(db.remove_tag_from_meeting, meeting_id, tag_id, user_email=user_email)
    return {"status": "removed", "meeting_id": meeting_id, "tag_id": tag_id}

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
            expires_in_days=req.expires_in_days,
            user_email=user_email,
        )
        return link_data
    except ValueError as e:
        raise SummAIException(ErrorCode.NOT_FOUND, str(e), status_code=404)

@app.get("/api/share/{token}")
async def view_shared_meeting(
    token: str,
    request: Request,
    password: Optional[str] = None,
):
    # Rate limit password guessing per IP
    limiter.check_rate_limit("share_view", get_client_identifier(request), max_requests=10, window_seconds=60)
    meeting = await asyncio.to_thread(db.get_shared_meeting, token=token, password=password)
    if not meeting:
        raise SummAIException(ErrorCode.NOT_FOUND, "Shared meeting not found or link expired.", status_code=404)
    return meeting

@app.delete("/api/share/{token}")
async def revoke_shared_meeting(
    token: str,
    x_user_email: Optional[str] = Header(None),
):
    user_email = (x_user_email or "default").strip().lower()
    revoked = await asyncio.to_thread(db.revoke_share_link, token=token, user_email=user_email)
    if not revoked:
        raise SummAIException(ErrorCode.NOT_FOUND, "Share link not found or unauthorized.", status_code=404)
    return {"status": "revoked"}

@app.post("/api/share/{token}/regenerate")
async def regenerate_share_link(
    token: str,
    x_user_email: Optional[str] = Header(None),
):
    user_email = (x_user_email or "default").strip().lower()
    new_token = await asyncio.to_thread(db.regenerate_share_token, old_token=token, user_email=user_email)
    if not new_token:
        raise SummAIException(ErrorCode.NOT_FOUND, "Share link not found or unauthorized.", status_code=404)
    return {"status": "regenerated", "share_token": new_token}

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
    user_email = (x_user_email or "default").strip().lower()
    preset = await asyncio.to_thread(db.save_custom_preset, title, prompt, user_email=user_email)
    return {"preset": preset}

@app.delete("/api/presets/{preset_id}")
async def delete_preset(
    preset_id: str,
    x_user_email: Optional[str] = Header(None),
):
    if not preset_id.startswith("custom_"):
        raise SummAIException(ErrorCode.FORBIDDEN, "Built-in presets cannot be deleted.", status_code=400)
    try:
        db_id = int(preset_id.replace("custom_", ""))
    except ValueError:
        raise SummAIException(ErrorCode.UPLOAD_INVALID, "Invalid preset id.", status_code=400)
    user_email = (x_user_email or "default").strip().lower()
    await asyncio.to_thread(db.delete_custom_preset, db_id, user_email=user_email)
    return {"status": "deleted", "id": preset_id}

# --- BATCH JOBS QUEUE ---

@app.get("/api/jobs")
async def list_jobs(
    x_user_email: Optional[str] = Header(None),
):
    user_email = (x_user_email or "default").strip().lower()
    jobs = await asyncio.to_thread(db.get_user_jobs, user_email=user_email)
    return {"jobs": jobs}

@app.post("/api/jobs", status_code=201)
async def create_new_job(
    req: JobCreateRequest,
    x_user_email: Optional[str] = Header(None),
):
    job_id = f"job_{uuid.uuid4().hex[:12]}"
    user_email = (x_user_email or "default").strip().lower()
    job = await asyncio.to_thread(
        db.create_job,
        job_id=job_id,
        filename=req.filename,
        media_type=req.media_type,
        filesize=req.filesize,
        user_email=user_email,
    )
    return {"job": job}

@app.get("/api/jobs/{job_id}")
async def get_job_status(
    job_id: str,
    x_user_email: Optional[str] = Header(None),
):
    user_email = (x_user_email or "default").strip().lower()
    job = await asyncio.to_thread(db.get_job, job_id=job_id, user_email=user_email)
    if not job:
        raise SummAIException(ErrorCode.NOT_FOUND, "Job not found.", status_code=404)
    return job

@app.delete("/api/jobs/{job_id}")
async def cancel_job(
    job_id: str,
    x_user_email: Optional[str] = Header(None),
):
    user_email = (x_user_email or "default").strip().lower()
    await asyncio.to_thread(db.delete_job, job_id=job_id, user_email=user_email)
    return {"status": "deleted", "job_id": job_id}

# --- USER DATA BACKUP & EXPORT ---

@app.get("/api/account/export")
async def export_account_data(
    x_user_email: Optional[str] = Header(None),
):
    user_email = (x_user_email or "default").strip().lower()
    data = await asyncio.to_thread(db.export_user_workspace, user_email=user_email)
    date_str = time.strftime("%Y%m%d", time.gmtime())
    filename = f"summai-workspace-{user_email}-{date_str}.json"

    return Response(
        content=json.dumps(data, indent=2),
        media_type="application/json",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        }
    )

# --- INTEGRATIONS (SLACK & NOTION) ---

@app.post("/api/integrations/slack")
async def send_to_slack(
    req: SlackIntegrationRequest,
    x_user_email: Optional[str] = Header(None),
):
    if not req.webhook_url.startswith("https://hooks.slack.com/"):
        raise SummAIException(ErrorCode.UPLOAD_INVALID, "Invalid Slack webhook URL. Must start with https://hooks.slack.com/", status_code=400)

    # Format Slack Block Kit message
    summary_excerpt = req.summary[:2500]
    blocks = [
        {
            "type": "header",
            "text": {
                "type": "plain_text",
                "text": f"🎯 Meeting Intelligence: {req.title[:100]}",
                "emoji": True,
            },
        },
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": f"*Summary Highlights:*\n{summary_excerpt}",
            },
        },
    ]

    if req.action_items and len(req.action_items) > 0:
        action_text = "\n".join([f"• {a}" for a in req.action_items[:10]])
        blocks.append({
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": f"*⚡ Action Items:*\n{action_text}",
            },
        })

    blocks.append({
        "type": "context",
        "elements": [
            {
                "type": "mrkdwn",
                "text": "Generated by *SummAI* • 100% Local-First Meeting Intelligence",
            }
        ],
    })

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(req.webhook_url, json={"blocks": blocks})
            if resp.status_code != 200:
                raise SummAIException(
                    ErrorCode.INTERNAL_ERROR,
                    f"Slack returned HTTP {resp.status_code}: {resp.text}",
                    status_code=502,
                )
        return {"status": "success", "message": "Dispatched to Slack channel."}
    except httpx.RequestError as e:
        raise SummAIException(
            ErrorCode.NETWORK_ERROR,
            f"Failed to connect to Slack webhook: {str(e)}",
            status_code=502,
        )

@app.post("/api/integrations/notion")
async def send_to_notion(
    req: NotionIntegrationRequest,
    x_user_email: Optional[str] = Header(None),
):
    # Mode A: Direct Official Notion REST API
    if req.notion_api_token and req.parent_id:
        token = req.notion_api_token.strip()
        parent_id = req.parent_id.strip()

        # Build Notion block hierarchy
        blocks = []
        for line in req.summary.split("\n"):
            raw = line.strip()
            if not raw:
                continue
            if raw.startswith("# "):
                blocks.append({
                    "object": "block",
                    "type": "heading_1",
                    "heading_1": {"rich_text": [{"type": "text", "text": {"content": raw[2:].strip()}}]}
                })
            elif raw.startswith("## "):
                blocks.append({
                    "object": "block",
                    "type": "heading_2",
                    "heading_2": {"rich_text": [{"type": "text", "text": {"content": raw[3:].strip()}}]}
                })
            elif raw.startswith("### "):
                blocks.append({
                    "object": "block",
                    "type": "heading_3",
                    "heading_3": {"rich_text": [{"type": "text", "text": {"content": raw[4:].strip()}}]}
                })
            elif raw.startswith("- ") or raw.startswith("* "):
                blocks.append({
                    "object": "block",
                    "type": "bulleted_list_item",
                    "bulleted_list_item": {"rich_text": [{"type": "text", "text": {"content": raw[2:].replace("**", "").strip()}}]}
                })
            else:
                blocks.append({
                    "object": "block",
                    "type": "paragraph",
                    "paragraph": {"rich_text": [{"type": "text", "text": {"content": raw.replace("**", "").strip()}}]}
                })

        parent_dict = {"database_id": parent_id} if req.parent_type == "database" else {"page_id": parent_id}
        prop_name = "title" if req.parent_type == "page" else "Name"

        payload = {
            "parent": parent_dict,
            "properties": {
                prop_name: {
                    "title": [{"type": "text", "text": {"content": req.title}}]
                }
            },
            "children": blocks[:99], # Notion limits to 100 blocks per request
        }

        headers = {
            "Authorization": f"Bearer {token}",
            "Notion-Version": "2022-06-28",
            "Content-Type": "application/json",
        }

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.post("https://api.notion.com/v1/pages", headers=headers, json=payload)
                if resp.status_code not in (200, 201):
                    raise SummAIException(
                        ErrorCode.INTERNAL_ERROR,
                        f"Notion API error (HTTP {resp.status_code}): {resp.text}",
                        status_code=502
                    )
                page_data = resp.json()
                return {"status": "success", "message": "Created meeting page in Notion.", "page_url": page_data.get("url")}
        except httpx.RequestError as e:
            raise SummAIException(ErrorCode.NETWORK_ERROR, f"Failed to connect to Notion API: {str(e)}", status_code=502)

    # Mode B: Webhook Relay (Zapier / Make / custom)
    if req.webhook_url and (req.webhook_url.startswith("https://") or req.webhook_url.startswith("http://")):
        payload = {
            "title": req.title,
            "content": req.summary,
            "source": "SummAI",
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(req.webhook_url, json=payload)
                if resp.status_code not in (200, 201, 202):
                    raise SummAIException(
                        ErrorCode.INTERNAL_ERROR,
                        f"Notion webhook returned HTTP {resp.status_code}: {resp.text}",
                        status_code=502,
                    )
            return {"status": "success", "message": "Dispatched to Notion webhook relay."}
        except httpx.RequestError as e:
            raise SummAIException(
                ErrorCode.NETWORK_ERROR,
                f"Failed to connect to Notion webhook: {str(e)}",
                status_code=502,
            )

    raise SummAIException(ErrorCode.UPLOAD_INVALID, "Either Notion API Token + Parent ID or a valid Webhook URL is required.", status_code=400)


# --- SETTINGS / API KEYS TESTS ---

class TestAPIKeyRequest(BaseModel):
    api_key: Optional[str] = None

@app.get("/api/settings/keys")
async def get_settings_keys():
    groq_key = os.environ.get("GROQ_API_KEY", "")
    gemini_key = os.environ.get("GEMINI_API_KEY", "")
    cf_token = os.environ.get("CLOUDFLARE_API_TOKEN") or os.environ.get("CF_API_TOKEN", "")
    
    return {
        "groq_configured": bool(groq_key),
        "gemini_configured": bool(gemini_key),
        "cloudflare_configured": bool(cf_token),
        "groq_preview": f"{groq_key[:6]}...{groq_key[-4:]}" if len(groq_key) > 10 else ("***" if groq_key else ""),
        "gemini_preview": f"{gemini_key[:6]}...{gemini_key[-4:]}" if len(gemini_key) > 10 else ("***" if gemini_key else ""),
        "cloudflare_preview": f"{cf_token[:6]}...{cf_token[-4:]}" if len(cf_token) > 10 else ("***" if cf_token else ""),
    }

@app.post("/api/settings/test-groq")
async def test_groq_key(req: TestAPIKeyRequest):
    key = req.api_key or os.environ.get("GROQ_API_KEY")
    if not key:
        return {"valid": False, "message": "No Groq API key provided."}
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                "https://api.groq.com/openai/v1/models",
                headers={"Authorization": f"Bearer {key}"}
            )
            if resp.status_code == 200:
                return {"valid": True, "message": "Successfully connected to Groq API."}
            else:
                return {"valid": False, "message": f"Groq API returned HTTP {resp.status_code}: {resp.text}"}
    except Exception as e:
        return {"valid": False, "message": f"Failed to connect: {str(e)}"}

@app.post("/api/settings/test-gemini")
async def test_gemini_key(req: TestAPIKeyRequest):
    key = req.api_key or os.environ.get("GEMINI_API_KEY")
    if not key:
        return {"valid": False, "message": "No Gemini API key provided."}
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                f"https://generativelanguage.googleapis.com/v1beta/models?key={key}"
            )
            if resp.status_code == 200:
                return {"valid": True, "message": "Successfully connected to Google Gemini API."}
            else:
                return {"valid": False, "message": f"Gemini API returned HTTP {resp.status_code}: {resp.text}"}
    except Exception as e:
        return {"valid": False, "message": f"Failed to connect: {str(e)}"}

@app.post("/api/settings/test-cloudflare")
async def test_cf_key(req: TestAPIKeyRequest):
    key = req.api_key or os.environ.get("CLOUDFLARE_API_TOKEN") or os.environ.get("CF_API_TOKEN")
    account_id = os.environ.get("CLOUDFLARE_ACCOUNT_ID") or os.environ.get("CF_ACCOUNT_ID")
    if not key or not account_id:
        return {"valid": False, "message": "Cloudflare Token or Account ID missing."}
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                f"https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/models",
                headers={"Authorization": f"Bearer {key}"}
            )
            if resp.status_code == 200:
                return {"valid": True, "message": "Successfully connected to Cloudflare Workers AI."}
            else:
                return {"valid": False, "message": f"Cloudflare API returned HTTP {resp.status_code}: {resp.text}"}
    except Exception as e:
        return {"valid": False, "message": f"Failed to connect: {str(e)}"}
