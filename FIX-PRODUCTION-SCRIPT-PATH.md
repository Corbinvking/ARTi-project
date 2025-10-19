# Fix Production Script Path Issue

## 🔍 **Problem**
The script is looking for: `/root/arti-marketing-ops/scripts/spotify_scraper/data`
But the data is actually at: `/root/arti-marketing-ops/spotify_scraper/data`

## ✅ **Solution**

Run these commands on the production server:

```bash
# Go back to project root
cd /root/arti-marketing-ops

# Run the script from the project root (not from scripts/)
node scripts/populate-playlist-vendor-data-v2.js
```

The script uses a relative path that needs to be run from the project root!

---

## 📋 **Full Command Sequence**

Copy and paste this into your SSH session:

```bash
# Make sure you're in the right directory
cd /root/arti-marketing-ops

# Set the environment variable (if not already set)
export SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU"

# Run from project root
node scripts/populate-playlist-vendor-data-v2.js
```

This should now find the scraped data files and import them!

