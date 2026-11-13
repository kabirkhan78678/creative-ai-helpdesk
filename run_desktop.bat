@echo off
title CyberDesk - Electron & React Desktop App
echo ========================================================
echo  Launching CyberDesk Desktop App (Electron + Vite)...
echo ========================================================
cd /d "%~dp0desktop"
npm run electron:dev
pause

