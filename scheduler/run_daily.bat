@echo off
REM Daily FX rate scrape — used by Windows Task Scheduler.
REM Adjust PYTHON and PROJECT paths if needed.

set PYTHON=python
set PROJECT=%~dp0..
cd /d "%PROJECT%"

%PYTHON% scripts\scrape.py -q
if %ERRORLEVEL% neq 0 (
    echo Scrape failed with exit code %ERRORLEVEL%
    exit /b %ERRORLEVEL%
)

echo Scrape completed successfully.
