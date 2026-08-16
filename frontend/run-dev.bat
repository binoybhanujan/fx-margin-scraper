@echo off
REM Start the FX dashboard dev server (adds Node to PATH if needed).
set "NODE_DIR=C:\Program Files\nodejs"
if exist "%NODE_DIR%\node.exe" set "PATH=%NODE_DIR%;%PATH%"

cd /d "%~dp0"
if not exist node_modules (
  echo Installing dependencies...
  call npm install
)
echo Starting dashboard at http://localhost:5173
npm run dev
