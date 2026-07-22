@echo off
title DLLM Start Script

echo ==========================================
echo Starting Backend and Frontend servers...
echo ==========================================

echo [1/2] Starting FastAPI Backend on port 8000...
start "FastAPI Backend" cmd /k "venv\Scripts\activate.bat && python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000"

echo [2/2] Starting Vite Frontend on port 5173...
start "Vite Frontend" cmd /k "cd /d frontend && npm run dev -- --host 0.0.0.0"

echo ==========================================
echo Done! Both servers are starting in separate windows.
echo ==========================================
pause