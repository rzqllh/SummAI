<div align="center">

# SummAI

**Turn recorded meetings into structured notes in minutes. Free. Private. Local.**

[![Next.js](https://img.shields.io/badge/Next.js-16.2-black?style=flat&logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.141+-009688?style=flat&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Groq](https://img.shields.io/badge/Groq-Whisper_Large--v3-f55036?style=flat)](https://groq.com/)
[![Gemini](https://img.shields.io/badge/Gemini-2.0_Flash-4285F4?style=flat&logo=google)](https://aistudio.google.com/)
[![SQLite](https://img.shields.io/badge/SQLite-local_only-003B57?style=flat&logo=sqlite)](https://sqlite.org/)

</div>

---

SummAI transcribes audio and video files, then synthesizes the transcript into structured Markdown: executive summaries, action items, sprint retrospectives, or architecture reviews. Everything runs locally. Your files go directly to your API provider (Groq, Gemini) and are stored on your machine in SQLite. No SummAI server sees any of it.

## What it does

Upload a meeting recording or paste a raw transcript. SummAI runs it through Groq Whisper for transcription, then through Gemini for synthesis. You get formatted output you can copy, export as `.md`, or format for Jira in one click.

**Supports:** `.mp3` `.wav` `.m4a` `.mp4` `.mov` `.mkv` `.txt` — up to 2 GB

**Synthesis presets:**
- Executive Summary
- Action Items + Jira Tasks
- Sprint Retrospective
- Technical Architecture Review

**Cost:** $0. Both Groq and Gemini offer free-tier API keys that cover normal meeting workloads.

## How it works

```
Upload → Transcribe (Groq Whisper) → Synthesize (Gemini) → Export
```

All meeting records and summaries go into a local SQLite database. Nothing leaves your machine except the API calls you initiate with your own keys.

## Architecture

```
SummAI/
├── backend/
│   ├── main.py              # FastAPI REST API
│   ├── summarizer.py        # Groq + Gemini pipeline
│   ├── audio_processor.py   # FFmpeg chunking
│   └── db.py                # SQLite persistence
├── frontend/
│   ├── src/app/             # Next.js 16 App Router pages
│   └── src/components/      # UI components
└── meetings.db              # Local database
```

## Setup

### Requirements

- Python 3.10+
- Node.js 18+ and npm
- [FFmpeg](https://ffmpeg.org/download.html) on your system PATH

### Install and run

```bash
# Clone
git clone https://github.com/rzqllh/SummAI.git
cd SummAI

# Python virtual environment
python -m venv .venv

# Activate (Windows)
.\.venv\Scripts\activate
# Activate (macOS / Linux)
source .venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt

# Install Node dependencies
cd frontend && npm install && cd ..
```

### Start (one command)

From the root folder:

```bash
# Windows PowerShell
.\dev.ps1
```

Or double-click `start.bat` in File Explorer.

Both servers start together: backend on port `8000`, frontend on port `3000`.

### Start separately

```bash
# Backend only
uvicorn backend.main:app --reload --port 8000

# Frontend only (in a separate terminal)
cd frontend && npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## API Keys

SummAI needs two free API keys. Enter them in **Settings** (`/dashboard/settings`) after launch. SummAI verifies the connection and saves the keys to your local `.env` file.

| Key | Where to get it |
|-----|-----------------|
| Groq | [console.groq.com/keys](https://console.groq.com/keys) |
| Gemini | [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) |

## Environment variables

Create a `.env` in the project root (or use the Settings page to fill it in):

```env
GROQ_API_KEY=your_groq_key
GEMINI_API_KEY=your_gemini_key
```

See `.env.example` for the full list.

## License

MIT
