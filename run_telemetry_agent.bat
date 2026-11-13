@echo off
title CyberDesk - Live PC Telemetry Agent
echo ========================================================
echo  Launching Hardware Telemetry Background Agent...
echo ========================================================
cd /d "%~dp0backend"
call .venv\Scripts\activate.bat
python agent_telemetry.py
pause

