@echo off
setlocal
cd /d "%~dp0"

echo ======================================
echo   CORE-DRAW - START LATEST LOCAL
echo   URL: http://127.0.0.1:5173/
echo ======================================
echo.

echo [1/4] Stopping old server on port 5173...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173" ^| findstr "LISTENING"') do (
  taskkill /PID %%a /F >nul 2>nul
)

echo [2/4] Pulling latest main...
git pull --ff-only origin main
if errorlevel 1 (
  echo.
  echo Git pull failed. Local changes may exist.
  echo If package-lock.json is the only changed file, run: git restore package-lock.json
  pause
  exit /b 1
)

echo.
echo [3/4] Syncing dependencies without rewriting package-lock...
call npm install --package-lock=false
if errorlevel 1 (
  echo.
  echo npm install failed.
  pause
  exit /b 1
)

echo.
echo [4/4] Starting fresh CORE-DRAW at http://127.0.0.1:5173/
start "" cmd /c "timeout /t 2 /nobreak >nul & start http://127.0.0.1:5173/?fresh=%RANDOM%"
call npm run dev

endlocal
