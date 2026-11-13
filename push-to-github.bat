@echo off
echo ========================================================
echo  Creative AI Helpdesk - Push to GitHub for Cloud DMG Build
echo ========================================================
echo.
set /p REPO_URL="Enter your GitHub Repository URL (e.g. https://github.com/kabirkhan78678/helpdesk.git): "
if "%REPO_URL%"=="" (
    echo Error: Repository URL cannot be empty!
    pause
    exit /b
)

git remote remove origin 2>nul
git remote add origin %REPO_URL%
git branch -M main
echo.
echo Pushing code to GitHub...
git push -u origin main

echo.
echo ========================================================
echo  SUCCESS! Your code is pushed to GitHub.
echo.
echo  GitHub Actions is now automatically building your .DMG!
echo  Check the "Actions" tab on your GitHub repository to
echo  download your "Creative AI IT Helpdesk-1.0.0.dmg".
echo ========================================================
pause

