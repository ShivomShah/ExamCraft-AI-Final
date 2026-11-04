@echo off
cd /d "%~dp0"
py -c "import flask, PIL, pypdf" >nul 2>&1
if errorlevel 1 (
  echo Installing required Python libraries...
  py -m pip install -r requirements.txt
  if errorlevel 1 (
    pause
    exit /b 1
  )
)
py app.py
pause
