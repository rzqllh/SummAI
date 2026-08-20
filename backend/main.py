from fastapi import FastAPI, UploadFile, File, Form, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import tempfile
import os
import shutil
import logging
from dotenv import load_dotenv
from groq import Groq
from google import genai

load_dotenv(override=True)
logger = logging.getLogger(__name__)

from backend.audio_processor import process_and_chunk_audio
from backend.summarizer import transcribe_audio, process_video_transcript, generate_summary
import backend.db as db

app = FastAPI(title="Meeting Summarizer API")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ENV_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")

def mask_key(key: Optional[str]) -> str:
    if not key or not key.strip():
        return ""
    key = key.strip()
    if len(key) <= 8:
        return "****"
    return f"{key[:4]}...{key[-4:]}"

def update_env_file(groq_key: Optional[str] = None, gemini_key: Optional[str] = None):
    env_vars = {}
    if os.path.exists(ENV_PATH):
        try:
            with open(ENV_PATH, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, v = line.split("=", 1)
                        env_vars[k.strip()] = v.strip()
        except Exception as e:
            logger.error(f"Error reading .env file: {e}")

    if groq_key is not None:
        clean_groq = groq_key.strip()
        env_vars["GROQ_API_KEY"] = clean_groq
        os.environ["GROQ_API_KEY"] = clean_groq
    if gemini_key is not None:
        clean_gemini = gemini_key.strip()
        env_vars["GEMINI_API_KEY"] = clean_gemini
        os.environ["GEMINI_API_KEY"] = clean_gemini

    try:
        with open(ENV_PATH, "w", encoding="utf-8") as f:
            for k, v in env_vars.items():
                f.write(f"{k}={v}\n")
    except Exception as e:
        logger.error(f"Error writing to .env file: {e}")
        raise RuntimeError(f"Could not save .env file: {str(e)}")

    load_dotenv(ENV_PATH, override=True)

class SummarizeRequest(BaseModel):
    raw_transcript: str
    filename: str
    media_type: str
    custom_prompt: Optional[str] = None

class SaveKeysRequest(BaseModel):
    groq_api_key: Optional[str] = None
    gemini_api_key: Optional[str] = None

class TestKeyRequest(BaseModel):
    api_key: Optional[str] = None

@app.get("/api/settings/keys")
async def get_keys_status():
    load_dotenv(ENV_PATH, override=True)
    groq_key = os.environ.get("GROQ_API_KEY", "").strip()
    gemini_key = os.environ.get("GEMINI_API_KEY", "").strip()

    return {
        "groq_configured": bool(groq_key),
        "gemini_configured": bool(gemini_key),
        "groq_preview": mask_key(groq_key),
        "gemini_preview": mask_key(gemini_key),
    }

@app.post("/api/settings/keys")
async def save_keys(req: SaveKeysRequest):
    try:
        update_env_file(groq_key=req.groq_api_key, gemini_key=req.gemini_api_key)
        return {
            "status": "success",
            "message": "API keys saved to server environment (.env) successfully.",
            "groq_preview": mask_key(os.environ.get("GROQ_API_KEY")),
            "gemini_preview": mask_key(os.environ.get("GEMINI_API_KEY")),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/settings/test-groq")
async def test_groq_key(req: TestKeyRequest):
    key = req.api_key or os.environ.get("GROQ_API_KEY")
    if not key or not key.strip():
        return {"valid": False, "message": "No Groq API Key provided or configured."}

    try:
        client = Groq(api_key=key.strip())
        client.models.list()
        return {"valid": True, "message": "Groq API Key is active and verified!"}
    except Exception as e:
        logger.warning(f"Groq verification failed: {e}")
        return {"valid": False, "message": f"Groq Error: {str(e)}"}

@app.post("/api/settings/test-gemini")
async def test_gemini_key(req: TestKeyRequest):
    key = req.api_key or os.environ.get("GEMINI_API_KEY")
    if not key or not key.strip():
        return {"valid": False, "message": "No Gemini API Key provided or configured."}

    try:
        client = genai.Client(api_key=key.strip())
        client.models.generate_content(
            model="gemini-3.6-flash",
            contents="Ping test. Respond with OK."
        )
        return {"valid": True, "message": "Gemini API Key is active and verified!"}
    except Exception as e:
        logger.warning(f"Gemini verification failed: {e}")
        return {"valid": False, "message": f"Gemini Error: {str(e)}"}

@app.post("/api/upload")
async def upload_and_extract(
    file: UploadFile = File(...),
    x_groq_api_key: Optional[str] = Header(None),
):
    if not file:
        raise HTTPException(status_code=400, detail="No file sent")

    ext = file.filename.split(".")[-1].lower()
    temp_files_to_clean: List[str] = []
    
    # Save file temporarily
    with tempfile.NamedTemporaryFile(delete=False, suffix=f".{ext}") as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = tmp.name
        temp_files_to_clean.append(tmp_path)

    try:
        if ext in ["mp4", "mov", "mkv", "avi", "webm"]:
            from backend.audio_processor import extract_audio_from_video
            # Extract audio from video locally first
            audio_path = extract_audio_from_video(tmp_path)
            temp_files_to_clean.append(audio_path)
            
            # Process and chunk extracted audio
            chunks = process_and_chunk_audio(audio_path)
            for c in chunks:
                if c != audio_path and c not in temp_files_to_clean:
                    temp_files_to_clean.append(c)

            full_transcript = []
            for chunk in chunks:
                full_transcript.append(transcribe_audio(chunk, custom_groq_key=x_groq_api_key))
            transcript = " ".join(full_transcript)

        elif ext in ["mp3", "wav", "m4a"]:
            chunks = process_and_chunk_audio(tmp_path)
            for c in chunks:
                if c != tmp_path and c not in temp_files_to_clean:
                    temp_files_to_clean.append(c)

            full_transcript = []
            for chunk in chunks:
                full_transcript.append(transcribe_audio(chunk, custom_groq_key=x_groq_api_key))
            transcript = " ".join(full_transcript)

        elif ext == "txt":
            try:
                with open(tmp_path, "r", encoding="utf-8") as f:
                    transcript = f.read()
            except UnicodeDecodeError:
                try:
                    with open(tmp_path, "r", encoding="utf-16") as f:
                        transcript = f.read()
                except UnicodeDecodeError:
                    with open(tmp_path, "r", encoding="utf-8", errors="ignore") as f:
                        transcript = f.read()
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format. Please upload MP3, WAV, M4A, MP4, MOV, or TXT.")
            
        return {"transcript": transcript, "filename": file.filename, "media_type": ext}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("Upload/extraction error", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        for p in temp_files_to_clean:
            if os.path.exists(p):
                try:
                    os.remove(p)
                except Exception as ex:
                    logger.warning(f"Failed to remove temp file {p}: {ex}")

@app.post("/api/summarize")
async def summarize(
    req: SummarizeRequest,
    x_gemini_api_key: Optional[str] = Header(None),
):
    try:
        summary = generate_summary(
            req.raw_transcript,
            req.custom_prompt,
            custom_gemini_key=x_gemini_api_key,
        )
        # Save to DB
        db.save_meeting(req.filename, req.media_type, req.raw_transcript, summary)
        return {"summary": summary}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("Summarize error", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/history")
async def get_history(q: Optional[str] = None, type: Optional[str] = None):
    meetings = db.search_meetings(query=q or "", media_type=type or "")
    return {"meetings": meetings}

@app.delete("/api/history/{meeting_id}")
async def delete_meeting_api(meeting_id: int):
    db.delete_meeting(meeting_id)
    return {"status": "success", "id": meeting_id}

@app.get("/api/stats")
async def get_stats_api():
    return db.get_stats()

@app.get("/api/presets")
async def get_presets():
    return {
        "presets": [
            {"id": "exec", "title": "Executive Summary", "prompt": "Provide a high-level executive summary with key takeaways and strategic decisions."},
            {"id": "jira", "title": "Action Items & Jira Tasks", "prompt": "Extract explicit action items with assignees, deadlines, and formatted Jira task descriptions."},
            {"id": "retro", "title": "Sprint Retrospective", "prompt": "Categorize points into What Went Well, What Could Be Improved, and Action Points."},
            {"id": "tech", "title": "Technical Architecture Review", "prompt": "Summarize technical decisions, engineering constraints, and system design specs discussed."}
        ]
    }

