@echo off
cd /d "%~dp0"
echo Creating the Karaokur processing environment...
py -3.12 -m venv .karaoke-venv
if errorlevel 1 (
  echo Python 3.12 was not found through the Windows Python launcher.
  echo Reinstall Python 3.12 with the Python Launcher option, then run this file again.
  pause
  exit /b 1
)
.karaoke-venv\Scripts\python.exe -m pip install --upgrade pip
if errorlevel 1 goto failed
.karaoke-venv\Scripts\python.exe -m pip install -r requirements-karaoke.txt
if errorlevel 1 goto failed
echo.
echo Setup is complete. Install FFmpeg and add its bin folder to PATH if you have not already.
pause
exit /b 0
:failed
echo.
echo Setup did not finish. Read the error above, then run this file again.
pause
exit /b 1
