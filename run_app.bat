@echo off
title AeroShield Tirupati PM10 ML Analysis System
echo ===================================================
echo   AeroShield Tirupati PM10 ML Analysis Server
echo ===================================================
echo Starting AeroShield server...
echo Access in browser: http://127.0.0.1:5000
echo.
cd /d "%~dp0"
.\venv\Scripts\python.exe app.py
pause
