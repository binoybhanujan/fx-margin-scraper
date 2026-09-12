@echo off
REM Serve the FX dashboard with Python (no Node/Vite).
cd /d "%~dp0.."
echo Starting dashboard at http://127.0.0.1:5173
python scripts\serve_dashboard.py
