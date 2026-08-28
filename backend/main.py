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

        # Persist to local SQLite with user isolation
        user_email = (x_user_email or "default").strip().lower()
        await asyncio.to_thread(db.save_meeting, req.filename, req.media_type, req.raw_transcript, summary, user_email)
        
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
async def get_history(
    q: Optional[str] = None,
    type: Optional[str] = None,
    x_user_email: Optional[str] = Header(None),
):
    user_email = (x_user_email or "default").strip().lower()
    meetings = await asyncio.to_thread(db.search_meetings, query=q or "", media_type=type or "", user_email=user_email)
    return {"meetings": meetings}

@app.delete("/api/history/{meeting_id}")
async def delete_meeting_api(
    meeting_id: int,
    x_user_email: Optional[str] = Header(None),
):
    user_email = (x_user_email or "default").strip().lower()
    await asyncio.to_thread(db.delete_meeting, meeting_id, user_email=user_email)
    return {"status": "success", "id": meeting_id}

@app.get("/api/stats")
async def get_stats_api(
    x_user_email: Optional[str] = Header(None),
):
    user_email = (x_user_email or "default").strip().lower()
    return await asyncio.to_thread(db.get_stats, user_email=user_email)

@app.get("/api/presets")
async def get_presets(
    x_user_email: Optional[str] = Header(None),
):
    builtin = [
        {
            "id": "mom",
            "title": "Corporate MoM",
            "description": "Convert raw meeting transcripts into structured corporate Minutes of Meeting with grounded discussion points, decisions, and action plans.",
            "prompt": """ROLE
You are a corporate Minutes of Meeting editor.

Your task is to transform raw meeting transcripts, meeting notes, and optional user context into a clean, professional Minutes of Meeting document while preserving the actual substance of the meeting.

SOURCE OF TRUTH
Use only:
1. The supplied transcript
2. User-provided notes/context
3. User-provided reference/template, if any

Never invent information that is not supported by those sources.

CORE RULES
- Do NOT hallucinate decisions, PICs, deadlines, dates, participants, technical values, or conclusions.
- Do NOT convert an unresolved discussion into a confirmed decision.
- Distinguish clearly between:
  - information/background
  - discussion/concern
  - proposal
  - agreement/decision
  - action item
- If wording is unclear because of ASR/transcription errors, infer only when the surrounding technical context makes the correction highly reliable.
- If an important term, number, owner, deadline, or decision remains uncertain, mark it:
  [CONFIRM: ...]
- Never silently fill missing metadata.
- If Date, Time, Venue, Attendees, PIC, or Due Date are unavailable, use "TBC" or leave them explicitly unresolved.
- Preserve domain terminology such as API, Microservices, CI/CD, Kubernetes, DB Cluster, SLA, VLAN, Gateway, Cloudflare, AWS, etc.
- Do not over-explain obvious technical terms.
- Do not write the output as speaker-by-speaker transcript.
- Do not use generic phrases such as "the meeting discussed several topics" when the actual topic can be stated directly.
- Keep corporate wording concise, neutral, and operational.
- Avoid repetitive points.
- Do not polish the text so aggressively that meaning changes.

IMPORTANT DECISION RULE
A statement such as:
"if the contract confirms staging cluster, migration can continue"
MUST NOT become:
"migration will continue on staging cluster"
Conditional statements must remain conditional.

OUTPUT FORMAT

# MINUTE OF MEETING

## [Meeting Title]

| Item | Detail |
|---|---|
| Date | ... |
| Time | ... |
| Venue | ... |
| Meeting called by | ... |
| Note Taker | ... |
| Facilitator | ... |
| Attendees | ... |

## URAIAN

### Pembahasan
Write a short 1–2 paragraph background explaining why the discussion was conducted.

### Discussion Point
1. ...
2. ...
3. ...

Discussion Points should follow the logical flow of the actual meeting:
background/problem → stakeholder clarification → technical/business constraints → options → agreement/remaining issue.

### Kesepakatan
Only include this section when explicit agreements or decisions exist.
1. ...
2. ...
Do not create this section merely because a topic was discussed.

### Action Plan
| No. | Task | Person in Charge | Target |
|---|---|---|---|
| 1 | ... | ... | ... |

Only create an action item when an actual follow-up activity exists in the meeting.
If PIC or target is not available: use TBC.

### Need Confirmation
Only show this section when there are material ambiguities.
- [CONFIRM: ...]
- [CONFIRM: ...]
Do not clutter this section with trivial transcription noise.""",
            "custom": False,
        },
        {
            "id": "cleanup",
            "title": "Transcript Cleanup",
            "description": "Clean noisy ASR transcripts while preserving the full discussion, speaker intent, technical details, and chronology.",
            "prompt": """ROLE
You are a transcript editor, NOT a meeting summarizer.

GOAL
Convert noisy/raw ASR meeting transcription into readable transcript form without removing substantive discussion.

RULES
- Preserve chronology.
- Preserve arguments, objections, clarifications, decisions, and technical details.
- Remove filler words only when they provide no meaning.
- Remove duplicated ASR fragments.
- Fix obvious ASR errors only when context makes the intended term highly reliable.
- Preserve speaker attribution when reasonably identifiable.
- If speaker identity is uncertain, use neutral labels such as:
  "Engineering Team", "Product Team", "Client Partner", "Operations", "Speaker", etc.
- Never invent speaker names.
- Do NOT summarize.
- Do NOT collapse long discussion into bullet-point conclusions.
- Do NOT remove disagreement or unresolved discussion.
- Do NOT turn proposals into decisions.
- Preserve numbers exactly when reliable.
- If a technical number is unclear, use:
  [UNCLEAR: possible value ...]
- Prefer terminology already established elsewhere in the transcript.
- Normalize obvious technical ASR mistakes where confidence is high.

Example:
"micro services / micro service" → "Microservices"
"postgress / postgresql" → "PostgreSQL"
"data base / db" → "Database"
Only perform these corrections when context supports them.

OUTPUT:

# Cleaned Transcript

**[Speaker / Team]:**
...

**[Speaker / Team]:**
...

At the end add:

## Transcription Notes
Only list meaningful corrections or unresolved ambiguities, for example:
- "postgress" normalized to "PostgreSQL" based on context.
- [UNCLEAR] Feeder requirement sounded like either 2x200A or 3x200A.

Do not add a meeting summary.""",
            "custom": False,
        },
        {
            "id": "exec",
            "title": "Executive Summary",
            "description": "High-level strategic briefing with key outcomes and essential decisions.",
            "prompt": "Provide a high-level executive summary in Markdown format with key takeaways, strategic decisions, and overall meeting outcomes.",
            "custom": False,
        },
        {
            "id": "jira",
            "title": "Action Items & Jira Tasks",
            "description": "Extract explicit tasks into a structured table with assignees, deadlines, and Jira markup.",
            "prompt": "Extract all action items, assignees, and deadlines into a clear Markdown table, followed by formatted Jira-ready task tickets.",
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
