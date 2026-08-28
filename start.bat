@echo off
title SummAI Development Server
echo ===================================================
echo   SummAI (Backend + Frontend)
echo ===================================================
cd /d "%~dp0frontend"
call npx concurrently -n "BACKEND,FRONTEND" -c "cyan.bold,magenta.bold" "cd .. && .\.venv\Scripts\uvicorn.exe backend.main:app --reload --port 8000" "npm run dev"
pause
