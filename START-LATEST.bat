@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo ======================================
echo   CORE-DRAW - FORCE LATEST LOCAL
echo   URL: http://127.0.0.1:5173/
echo ======================================
echo.

for /f "delims=" %%r in ('git remote get-url origin 2^>nul') do set "CORE_REMOTE=%%r"
echo Repository: %CD%
echo Remote:     %CORE_REMOTE%
echo.

echo %CORE_REMOTE% | findstr /I /C:"Alicetel-u/CORE-DRAW" >nul
if errorlevel 1 (
  echo ERROR: This folder is not Alicetel-u/CORE-DRAW.
  echo Open START-LATEST.bat from the actual CORE-DRAW folder.
  pause
  exit /b 1
)

echo [1/5] Stopping anything already using port 5173...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173" ^| findstr "LISTENING"') do (
  taskkill /PID %%a /F >nul 2>nul
)

echo [2/5] Fetching origin/main...
git fetch origin main
if errorlevel 1 goto :gitfail

for /f "delims=" %%s in ('git status --porcelain') do set "CORE_DIRTY=1"
if defined CORE_DIRTY (
  echo Local changes detected. Saving them to git stash before syncing latest...
  git stash push -u -m "CORE-DRAW auto-backup before START-LATEST"
  if errorlevel 1 goto :gitfail
)

echo [3/5] Forcing this checkout to match origin/main...
git checkout -B main origin/main
if errorlevel 1 goto :gitfail
git reset --hard origin/main
if errorlevel 1 goto :gitfail

for /f %%i in ('git rev-parse --short HEAD') do set "CORE_COMMIT=%%i"
for /f "tokens=3 delims='" %%v in ('findstr /C:"const APP_VERSION" src\App.tsx') do set "CORE_VERSION=%%v"

echo.
echo ======================================
echo   SYNC OK
if defined CORE_VERSION echo   APP:    %CORE_VERSION%
echo   COMMIT: %CORE_COMMIT%
echo ======================================
echo.

echo [4/5] Syncing dependencies without rewriting package-lock...
call npm install --package-lock=false
if errorlevel 1 (
  echo.
  echo npm install failed.
  pause
  exit /b 1
)

echo [5/5] Starting CORE-DRAW from commit %CORE_COMMIT%...
start "" cmd /c "timeout /t 2 /nobreak >nul & start http://127.0.0.1:5173/?build=%CORE_COMMIT%"
call npm run dev
exit /b %errorlevel%

:gitfail
echo.
echo Git sync failed. No local work was deleted; dirty work was stashed when possible.
echo Run: git status
pause
exit /b 1
