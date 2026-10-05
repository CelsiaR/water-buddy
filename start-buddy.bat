@echo off
cd /d "%~dp0"
rem close any copy that is already running
taskkill /F /IM electron.exe >nul 2>&1
if not exist node_modules (
  where npm >nul 2>&1 || (echo Please install Node.js LTS from https://nodejs.org first, then run this again. & pause & exit /b)
  echo Installing - first run only, takes a minute...
  call npm install
)
start "" wscript "%~dp0start-hidden.vbs"
