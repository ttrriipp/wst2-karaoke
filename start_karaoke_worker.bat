@echo off
cd /d "%~dp0"
if not exist ".karaoke-venv\Scripts\python.exe" (
  echo Run setup_karaoke_worker.bat first.
  pause
  exit /b 1
)
".karaoke-venv\Scripts\python.exe" karaoke_worker.py
pause
