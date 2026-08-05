@echo off
title DM Assistant Mobile (Expo)
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
echo Scan the QR code below with the Expo Go app on your phone.
echo Keep this window open while testing. Close it to stop the server.
echo.

call npx expo start

pause
