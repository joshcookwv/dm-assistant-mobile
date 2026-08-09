@echo off
title Android Emulator (Pixel 8, API 35)
set ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk
set PATH=%ANDROID_HOME%\emulator;%ANDROID_HOME%\platform-tools;%PATH%

echo Starting the Pixel 8 / Android 15 emulator...
echo First boot after your PC restarts can take a minute or two.
echo.

start "" "%ANDROID_HOME%\emulator\emulator.exe" -avd Pixel8_API35

echo.
echo Emulator window opening in the background. Once it's booted, install an APK with:
echo   "%ANDROID_HOME%\platform-tools\adb.exe" install -r "builds\dm-assistant-mobile-v1.0.0-preview.apk"
echo.
pause
