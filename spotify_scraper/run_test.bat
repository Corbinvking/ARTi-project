@echo off
echo Setting up Spotify for Artists Scraper test environment...

REM Create Python virtual environment
python -m venv venv
call venv\Scripts\activate

REM Install dependencies
pip install -r requirements.txt
playwright install

REM Set up test environment
python setup_test.py

echo.
echo Setup complete! Please edit the .env file with your credentials.
echo.
echo Press any key to run the test...
pause

REM Run the test
python tests\test_scraper.py
pause

