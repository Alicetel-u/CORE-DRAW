@echo off
setlocal
cd /d "%~dp0"

echo ======================================
echo   CORE-DRAW - START LATEST LOCAL

echo   URL: http://127.0.0.1:5173/
echo ======================================
echo.

echo [1/3] Pulling latest main...
git pull --ff-only origin main
if errorlevel 1 (
  echo.
  echo Git pull failed. Local changes may exist.
  echo Nothing was overwritten.
  pause
  exit /b 1
)

echo.
echo [2/3] Syncing dependencies...
call npm install
if errorlevel 1 (
  echo.
  echo npm install failed.
  pause
  exit /b 1
)

echo.
echo [3/3] Starting CORE-DRAW at http://127.0.0.1:5173/
start "" cmd /c "timeout /t 2 /nobreak >nul & start http://127.0.0.1:5173/"
call npm run dev

endlocal
