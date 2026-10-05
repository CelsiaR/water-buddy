@echo off
rem Stops Water Buddy and removes old auto-starts
taskkill /F /IM electron.exe >nul 2>&1
for %%f in ("%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\*buddy*") do del "%%~f" >nul 2>&1
echo Water Buddy stopped.
timeout /t 2 >nul
