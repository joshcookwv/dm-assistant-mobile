@echo off
title Infernal Codex Mobile (Expo)
cd /d "%~dp0"

if not exist node_modules (
  echo Installing dependencies the first time this may take a few minutes...
  call npm install
  if errorlevel 1 (
    echo.
    echo Install failed. Make sure Node.js is installed from https://nodejs.org then try again.
    pause
    exit /b 1
  )
)

echo.
echo Starting the Expo dev server...
echo This app needs a dev-client build installed on your phone -- Expo Go will not work.
echo Keep this window open while testing. Close it to stop the server.
echo.

call npx expo start

pause
