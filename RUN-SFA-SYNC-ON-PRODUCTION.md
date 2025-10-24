# 🔗 Sync SFA URLs to Production (SQL Method)

## ✅ **File Already Uploaded:**
`SYNC-SFA-URLS.sql` is already on production server.

---

## 🚀 **Run This Command on Production SSH:**

```bash
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -f /root/arti-marketing-ops/SYNC-SFA-URLS.sql
```

---

## 📊 **What It Does:**

- Reads 121 SFA URLs from roster scraping results
- Matches each URL to a campaign by track ID
- Updates `spotify_campaigns.sfa` column
- Only updates if the URL is different or NULL

---

## ✅ **Expected Output:**

```
NOTICE:  Updated campaign 123: Artist Name - Song Name
NOTICE:  Updated campaign 124: Artist Name - Song Name
...
NOTICE:  Campaign not found for track: abc123xyz
```

---

## 🎯 **Verify:**

After running, check your UI:
1. Click on any campaign
2. Look for "Spotify for Artists Link" section
3. Link should now appear! 🔗

---

## 📝 **Notes:**

- This uses direct SQL, bypassing Node.js JWT authentication issues
- Safe to run multiple times (only updates when needed)
- Skips campaigns that already have the correct SFA URL

