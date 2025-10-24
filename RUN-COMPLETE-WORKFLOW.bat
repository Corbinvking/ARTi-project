@echo off
REM Complete Workflow - Windows Batch File
REM Runs the complete end-to-end Spotify campaign workflow

echo ================================================================================
echo COMPLETE SPOTIFY CAMPAIGN WORKFLOW
echo ================================================================================
echo.

python scripts/run_complete_workflow.py %*

pause

