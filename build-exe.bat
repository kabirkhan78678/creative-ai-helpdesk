@echo off
title Creative AI - Building Standalone Windows .EXE
echo ========================================================
echo    CREATIVE AI - IT MANAGEMENT & HELPDESK
echo    Building Standalone Windows Executable (.exe)
echo ========================================================
echo.
cd /d "%~dp0"
call npm run build:exe
echo.
echo ========================================================
echo Build Complete! Check the folder: desktop\release
echo ========================================================
pause

