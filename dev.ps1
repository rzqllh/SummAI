Write-Host "🚀 Menjalankan SummAI Backend (FastAPI) & Frontend (Next.js)..." -ForegroundColor Cyan
Set-Location "$PSScriptRoot\frontend"
npx concurrently -n "BACKEND,FRONTEND" -c "cyan.bold,magenta.bold" "cd ..; .\.venv\Scripts\uvicorn.exe backend.main:app --reload --port 8000" "npm run dev"
