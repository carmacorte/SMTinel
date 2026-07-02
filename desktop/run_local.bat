@echo off
setlocal
cd /d "%~dp0\.."
py desktop\app.py
if errorlevel 1 (
  echo.
  echo If py is not available, install Python 3.11+ or replace py with python in this file.
)
pause
