from fastapi import FastAPI, UploadFile, File, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import tempfile
import os
import shutil
import logging
import asyncio
from dotenv import load_dotenv

load_dotenv(override=True)
logger = logging.getLogger(__name__)

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

class SummarizeRequest(BaseModel):
    raw_transcript: str
    filename: str
    media_type: str
    custom_prompt: Optional[str] = None

class TestKeyRequest(BaseModel):
    api_key: Optional[str] = None

class CreatePresetRequest(BaseModel):
    title: str
    prompt: str

@app.get("/api/settings/keys")
async def get_keys_status():
    load_dotenv(override=True)
    groq_key = os.environ.get("GROQ_API_KEY", "").strip()
    gemini_key = os.environ.get("GEMINI_API_KEY", "").strip()
    cf_token = os.environ.get("CLOUDFLARE_API_TOKEN", "").strip()
    cf_account = os.environ.get("CLOUDFLARE_ACCOUNT_ID", "").strip()

    return {
        "groq_configured": bool(groq_key),
        "gemini_configured": bool(gemini_key),
        "cloudflare_configured": bool(cf_token and cf_account),
        "groq_preview": mask_key(groq_key),
        "gemini_preview": mask_key(gemini_key),
        "cloudflare_preview": mask_key(cf_token),
    }

@app.post("/api/settings/test-groq")
async def test_groq_key(req: TestKeyRequest):
    return await groq_stt.test_connection(api_key=req.api_key)

@app.post("/api/settings/test-gemini")
async def test_gemini_key(req: TestKeyRequest):
    return await gemini_llm.test_connection(api_key=req.api_key)

@app.post("/api/settings/test-cloudflare")
async def test_cloudflare_key(req: TestKeyRequest):
    return await cloudflare_stt.test_connection(api_key=req.api_key)

@app.post("/api/upload")
async def upload_and_extract(
    file: UploadFile = File(...),
    x_groq_api_key: Optional[str] = Header(None),
    x_cf_api_token: Optional[str] = Header(None),
):
    if not file:
        raise HTTPException(status_code=400, detail="No file sent")

    ext = file.filename.split(".")[-1].lower() if "." in file.filename else "mp4"
    
    # Create an isolated temporary directory for this job
    job_dir = tempfile.mkdtemp(prefix="summai_job_")

    try:
        tmp_path = os.path.join(job_dir, f"input.{ext}")
        with open(tmp_path, "wb") as f:
            shutil.copyfileobj(file.file, f)

        if ext in ["mp4", "mov", "mkv", "avi", "webm"]:
            # Extract audio from video in worker thread
            audio_path = await asyncio.to_thread(extract_audio_from_video, tmp_path, job_dir)
            
            # Process and chunk extracted audio
            chunks = await asyncio.to_thread(process_and_chunk_audio, audio_path, 20 * 60 * 1000, job_dir)

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

            transcript = " ".join(full_transcript)

        elif ext in ["mp3", "wav", "m4a"]:
            chunks = await asyncio.to_thread(process_and_chunk_audio, tmp_path, 20 * 60 * 1000, job_dir)

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

            transcript = " ".join(full_transcript)

        elif ext == "txt":
            try:
                with open(tmp_path, "r", encoding="utf-8") as f:
                    transcript = f.read()
            except UnicodeDecodeError:
                with open(tmp_path, "r", encoding="utf-8", errors="ignore") as f:
                    transcript = f.read()
            provider_used = "Direct Text Input"
            fallback_applied = False
        else:
            raise HTTPException(
                status_code=400,
                detail="Unsupported file format. Supported: MP3, WAV, M4A, MP4, MOV, MKV, WEBM, TXT."
            )

        return {
            "transcript": transcript,
            "filename": file.filename,
            "media_type": ext,
            "provider_used": provider_used,
            "fallback_applied": fallback_applied,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Upload/transcription pipeline failure", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to process media file: {str(e)}")
    finally:
        # Clean up entire job directory safely
        shutil.rmtree(job_dir, ignore_errors=True)

@app.post("/api/summarize")
async def summarize(
    req: SummarizeRequest,
    x_gemini_api_key: Optional[str] = Header(None),
    x_groq_api_key: Optional[str] = Header(None),
    x_cf_api_token: Optional[str] = Header(None),
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

        # Persist to local SQLite
        await asyncio.to_thread(db.save_meeting, req.filename, req.media_type, req.raw_transcript, summary)
        
        return {
            "summary": summary,
            "provider_used": provider_used,
            "fallback_applied": fallback_applied,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Synthesis error", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to synthesize summary: {str(e)}")

@app.get("/api/history")
async def get_history(q: Optional[str] = None, type: Optional[str] = None):
    meetings = await asyncio.to_thread(db.search_meetings, query=q or "", media_type=type or "")
    return {"meetings": meetings}

@app.delete("/api/history/{meeting_id}")
async def delete_meeting_api(meeting_id: int):
    await asyncio.to_thread(db.delete_meeting, meeting_id)
    return {"status": "success", "id": meeting_id}

@app.get("/api/stats")
async def get_stats_api():
    return await asyncio.to_thread(db.get_stats)

@app.get("/api/presets")
async def get_presets():
    builtin = [
        {"id": "exec",  "title": "Executive Summary",         "prompt": "Provide a high-level executive summary with key takeaways and strategic decisions.",                                "custom": False},
        {"id": "jira",  "title": "Action Items & Jira Tasks",  "prompt": "Extract explicit action items with assignees, deadlines, and formatted Jira task descriptions.",              "custom": False},
        {"id": "retro", "title": "Sprint Retrospective",       "prompt": "Categorize points into What Went Well, What Could Be Improved, and Action Points.",                          "custom": False},
        {"id": "tech",  "title": "Technical Architecture Review", "prompt": "Summarize technical decisions, engineering constraints, and system design specs discussed.",              "custom": False},
    ]
    custom = await asyncio.to_thread(db.get_custom_presets)
    return {"presets": builtin + custom}

@app.post("/api/presets", status_code=201)
async def create_preset(req: CreatePresetRequest):
    title = req.title.strip()
    prompt = req.prompt.strip()
    if not title or not prompt:
        raise HTTPException(status_code=400, detail="title and prompt are required")
    if len(title) > 120:
        raise HTTPException(status_code=400, detail="title must be 120 characters or fewer")
    if len(prompt) > 2000:
        raise HTTPException(status_code=400, detail="prompt must be 2000 characters or fewer")
    preset = await asyncio.to_thread(db.save_custom_preset, title, prompt)
    return {"preset": preset}

@app.delete("/api/presets/{preset_id}")
async def delete_preset(preset_id: str):
    if not preset_id.startswith("custom_"):
        raise HTTPException(status_code=400, detail="Built-in presets cannot be deleted")
    try:
        db_id = int(preset_id.replace("custom_", ""))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid preset id")
    await asyncio.to_thread(db.delete_custom_preset, db_id)
    return {"status": "deleted", "id": preset_id}
