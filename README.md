<div align="center">

# 🎙️ SummAI — Meeting Intelligence

**Zero-cost, privacy-first AI Meeting Intelligence & Structured Synthesis.**  
Convert hours of recorded audio, video, and transcripts into actionable Markdown summaries, Jira tasks, and Notion-ready documentation.

[![Next.js](https://img.shields.io/badge/Next.js-16.2_(Turbopack)-black?style=flat&logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=flat&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Groq](https://img.shields.io/badge/Groq-Whisper_Large--v3-f55036?style=flat)](https://groq.com/)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini-3.6_Flash-4285F4?style=flat&logo=google)](https://aistudio.google.com/)
[![SQLite](https://img.shields.io/badge/SQLite-Local_Storage-003B57?style=flat&logo=sqlite)](https://sqlite.org/)

</div>

---

## ✨ Features

- **🚀 Groq Whisper Large-v3 STT**: Transcribe audio and video files in seconds with real-time progress, live elapsed timer, and speed tracking.
- **🧠 Google Gemini 3.6 Flash Synthesis**: Transform raw transcripts into structured executive summaries, action items, sprint retrospectives, and architecture reviews.
- **🛡️ 100% Local Privacy**: Your transcripts and meeting records are stored exclusively on your machine in local SQLite (`meetings.db`). Zero telemetry, zero cloud tracking.
- **🎨 Modern Aesthetic Dashboard**:
  - **Overview**: Real-time stats, metrics, quick dropzone, and recent synthesis history.
  - **Summarizer Studio**: 4-step workflow (*Upload Media* → *Review Transcript* → *Select Preset* → *Export Summary*) with abortable cancellation.
  - **Meeting Library**: Searchable and filterable archive across audio, video, and text transcripts.
  - **Settings & Presets**: In-app API key verification and connection testing for Groq and Gemini.
- **📋 1-Click Export Hub**: Copy directly as formatted Markdown, Jira-compatible markup, or download `.md` files.

---

## 🛠️ Architecture

```
SummAI/
├── backend/                  # FastAPI Application
│   ├── main.py               # REST API endpoints & API key management
│   ├── summarizer.py         # Groq Whisper & Gemini 3.6 Flash pipeline
│   ├── audio_processor.py    # FFmpeg audio compression & chunking
│   └── db.py                 # SQLite local persistence engine
├── frontend/                 # Next.js 16 App Router UI
│   ├── src/app/              # Next.js pages (Landing, Dashboard, Studio, Library, Settings)
│   ├── src/components/       # Modular UI components & Studio stepper
│   └── public/               # SummAI brand assets and favicons
└── meetings.db               # Local SQLite database
```

---

## 🚀 Quick Start

### 1. Prerequisites
- **Python 3.10+**
- **Node.js 18+** & **npm**
- **[FFmpeg](https://ffmpeg.org/download.html)** installed and accessible in your system PATH (required for audio compression and extraction).

### 2. Backend Setup
```bash
# Clone repository
git clone https://github.com/your-repo/summai.git
cd summai

# Create & activate Python virtual environment
python -m venv .venv
# On Windows:
.\.venv\Scripts\activate
# On macOS/Linux:
source .venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt

# Start FastAPI backend server (Port 8000)
uvicorn backend.main:app --reload --port 8000
```

### 3. Frontend Setup
```bash
# In a new terminal window:
cd frontend

# Install Node dependencies
npm install

# Start Next.js development server (Port 3000)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to launch **SummAI**.

---

## 🔑 API Keys Configuration

SummAI runs entirely on free-tier API credentials:
1. **Groq API Key**: Get a free API key at [console.groq.com/keys](https://console.groq.com/keys) for ultra-fast Whisper speech-to-text.
2. **Google Gemini API Key**: Get a free API key at [aistudio.google.com](https://aistudio.google.com/app/apikey) for structured synthesis.

You can input and verify your keys directly in the **Settings & Presets** page (`/dashboard/settings`), which will save them to both your `.env` file and browser storage.

---

## 📄 License

MIT License. Designed with precision for teams and professionals who value privacy, speed, and clean meeting intelligence.
