Install Apify CLI
Using installation script (macOS/Linux):

curl -fsSL https://apify.com/install-cli.sh | bash

Using installation script (Windows):

irm https://apify.com/install-cli.ps1 | iex

Using Homebrew:

brew install apify-cli

Using NPM:

npm install -g apify-cli

Having problems? Read the installation guide
Log in to Apify
You will need to provide your Apify API token to complete this action.

apify login

Run this Actor from the command line
echo '{
  "username": [
    "natgeo",
    "https://www.instagram.com/natgeo/",
    "https://www.instagram.com/p/DLNsnpUTdVS/"
  ],
  "resultsLimit": 24,
  "skipPinnedPosts": false
}' |
apify call apify/instagram-post-scraper --silent --output-dataset