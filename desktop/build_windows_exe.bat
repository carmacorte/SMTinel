@echo off
setlocal

cd /d "%~dp0\.."

echo ========================================
echo Building SMTinel Windows Desktop package
echo ========================================

where py >nul 2>nul
if errorlevel 1 (
  echo Python launcher py was not found.
  echo Install Python 3.11+ or edit this file and replace py with python.
  pause
  exit /b 1
)

py -m pip install --upgrade pip
py -m pip install -r desktop\requirements.txt

if exist build rmdir /s /q build
if exist dist\SMTinel rmdir /s /q dist\SMTinel

py -m PyInstaller desktop\SMTinel.spec --clean --noconfirm

if errorlevel 1 (
  echo Build failed.
  pause
  exit /b 1
)

echo.
echo Done.
echo Output folder:
echo %cd%\dist\SMTinel
echo.
echo Run:
echo %cd%\dist\SMTinel\SMTinel.exe
pause
