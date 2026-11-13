@echo off
title CyberDesk - FastAPI Central Controller
echo ========================================================
echo  Launching CyberDesk Central Backend (Port 8000)...
echo ========================================================
cd /d "%~dp0backend"
call .venv\Scripts\activate.bat
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
pause

