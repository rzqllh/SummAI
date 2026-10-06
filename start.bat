@echo off
title SummAI Development Server

cd /d "%~dp0"

if not exist ".venv\Scripts\uvicorn.exe" goto no_venv
if not exist "frontend\node_modules" goto no_modules

:start_servers
echo ====================================================================
echo                   SummAI Local Development Server
echo ====================================================================
echo Root: %~dp0
echo.
echo [OK] Backend  : http://localhost:8000 (API Docs: http://localhost:8000/docs)
echo [OK] Frontend : http://localhost:3000
echo.
echo Tekan [Ctrl + C] untuk mematikan kedua server sekaligus.
echo ====================================================================
echo.

cd /d "%~dp0frontend"
call npx concurrently -k -n "BACKEND,FRONTEND" -c "cyan.bold,magenta.bold" "cd .. && .\.venv\Scripts\uvicorn.exe backend.main:app --reload --port 8000" "npm run dev"

pause
exit /b 0

:no_venv
echo [ERROR] Virtual environment .venv tidak ditemukan di folder root repo!
echo Silakan buat venv dan install requirements:
echo   python -m venv .venv
echo   .\.venv\Scripts\pip install -r requirements.txt
echo.
pause
exit /b 1

:no_modules
echo [INFO] Folder frontend\node_modules belum ada. Menjalankan npm install...
cd /d "%~dp0frontend"
call npm install
cd /d "%~dp0"
goto start_servers
