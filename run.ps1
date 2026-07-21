# DLLM Start Script for PowerShell

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Starting Backend and Frontend servers..." -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

Write-Host "[1/2] Starting FastAPI Backend on port 8000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "& { .\venv\Scripts\Activate.ps1; python -m uvicorn backend.main:app --reload --port 8000 }"

Write-Host "[2/2] Starting Vite Frontend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "& { cd frontend; npm run dev }"

Write-Host "==========================================" -ForegroundColor Green
Write-Host "Done! Both servers have been launched in separate windows." -ForegroundColor Green
