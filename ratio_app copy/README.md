# Artist Influence Campaign Manager

This project is a campaign manager for YouTube videos, designed to automate the process of ordering likes and comments to boost video engagement. It uses Flask for the web interface, Google Sheets API for managing comments, and JingleSMM for ordering likes and comments.

## Features

- User registration and login
- Create and manage campaigns for YouTube videos
- Order likes and comments for videos
- Export campaign data to CSV
- Integration with Google Sheets for managing comments
- Integration with JingleSMM for ordering likes and comments

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/artist_influence_campaign_manager.git
   cd artist_influence_campaign_manager

2. Create a virtual environment:
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows use `venv\Scripts\activate`
   ```

3. Install the dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Set up environment variables:
   Create a `.env` file in the root directory and add the following:
   ```plaintext
   YOUTUBE_API_KEY=your_youtube_api_key
   JINGLE_SMM_KEY=your_jingle_smm_key
   GCP_SA_KEY_BASE64=your_google_cloud_service_account_base64
   ```

5. Set up Google Cloud credentials:
   Place your Google Cloud service account JSON file in the root directory and update the 

SERVICE_ACCOUNT_FILE

 path in 

campaign.py

.

## Usage

1. Run the Flask application:
   ```bash
   flask run
   ```

2. Open your web browser and navigate to `http://localhost:5000`.

3. Register a new user and log in.

4. Create a new campaign by providing the YouTube video URL, genre, comments sheet URL, and wait time.

5. Manage your campaigns from the dashboard.

## Deployment

### Deploying to Google Cloud Platform

1. Ensure you have the Google Cloud SDK installed and authenticated:
   ```bash
   gcloud auth login
   gcloud config set project your_project_id
   ```

2. Deploy the application:
   ```bash
   gcloud app deploy
   ```


Working with ENV 
(turn service file to base64 and add them to a file)
```bash
create base64 base64 -i rich-phenomenon-428302-q5-dba5f2f381c1.json -o rich-phenomenon-428302-q5-dba5f2f381c1.json.base64


```
## Running the Migration 
To alter our campaign table in order to accomodate new fields, a migration script is added. 

Install the Flask Migrate Package and run : 
```
flask db upgrade
```