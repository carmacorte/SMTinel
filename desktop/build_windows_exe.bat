@echo off
setlocal

cd /d "%~dp0\.."

echo ========================================
echo Building SMTinel Windows Desktop package
echo ========================================

where python >nul 2>nul
if errorlevel 1 (
  echo Python was not found in PATH.
  echo Install Python 3.11+ and enable Add Python to PATH.
  pause
  exit /b 1
)

python -m pip install --upgrade pip
python -m pip install -r desktop\requirements.txt

if exist build rmdir /s /q build
if exist dist\SMTinel rmdir /s /q dist\SMTinel

pyinstaller desktop\SMTinel.spec --clean --noconfirm

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
