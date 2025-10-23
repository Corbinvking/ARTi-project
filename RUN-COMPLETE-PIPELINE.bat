@echo off
REM ================================================================================
REM COMPLETE 1-CLICK STREAM DATA PIPELINE
REM From CSV to Production in One Click
REM ================================================================================

echo.
echo ================================================================================
echo   COMPLETE STREAM DATA PIPELINE
echo   CSV -^> URLs -^> Scraping -^> Local DB -^> Production DB
echo ================================================================================
echo.

REM Navigate to project directory
cd /d "%~dp0"

REM Check if venv exists, activate it
if exist "venv\Scripts\activate.bat" (
    echo Activating virtual environment...
    call venv\Scripts\activate.bat
)

REM Run the complete pipeline
echo Starting complete pipeline...
echo.
python scripts\run_complete_pipeline.py

REM Check result
if %ERRORLEVEL% EQU 0 (
    echo.
    echo ================================================================================
    echo   SUCCESS! Pipeline completed successfully!
    echo ================================================================================
    echo.
    echo   Check your production UI: https://artistinfluence.com
    echo.
) else (
    echo.
    echo ================================================================================
    echo   ERROR! Pipeline failed. Check logs above for details.
    echo ================================================================================
    echo.
)

pause

