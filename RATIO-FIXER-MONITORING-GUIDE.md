# Ratio Fixer Monitoring Guide

## How to Verify Ratio Fixer is Working

After starting the Ratio Fixer, here's how to verify it's actually working:

---

## 1. Frontend Status Display

### In the Campaign Modal (Ratio Fixer Tab)

When Ratio Fixer is running, you should see:

- **"Ratio Fixer Active"** badge with spinning loader
- **Status section** showing:
  - Target Likes: [number]
  - Target Comments: [number]
  - **Ordered Likes: [number]** ← This should increase over time
  - **Ordered Comments: [number]** ← This should increase over time

### What to Look For:

1. **Status updates every 30 seconds** (automatic polling)
2. **Ordered counts increase** when orders are placed
3. **Status shows "Running"** badge

---

## 2. Check Flask Logs

The Flask app logs all activity. Check logs to see if it's working:

```bash
# On your droplet
sudo journalctl -u ratio-fixer -f --no-pager
# or
sudo tail -f /var/log/ratio-fixer/ratio-fixer.log
```

### What to Look For:

- `"Video ID: [id] Current views: X, Last views: Y"`
- `"Current likes for [id]: X, Desired likes: Y"`
- `"Current comments for [id]: X, Desired comments: Y"`
- `"Ordering [likes/comments] for video [id]"`
- `"Order placed: [order_id]"`

---

## 3. Check Database

### Active Campaigns

```bash
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT 
    campaign_name,
    ratio_fixer_campaign_id,
    ratio_fixer_status,
    desired_likes,
    desired_comments,
    ordered_likes,
    ordered_comments,
    ratio_fixer_last_check
FROM youtube_campaigns
WHERE ratio_fixer_status = 'running';
"
```

### Recent Orders

```bash
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT 
    order_type,
    quantity,
    jingle_order_id,
    jingle_status,
    ordered_at
FROM youtube_ratio_fixer_orders
ORDER BY ordered_at DESC
LIMIT 20;
"
```

---

## 4. Check Status via API

Get real-time status for a running campaign:

```bash
# Get campaign ID from database first
CAMPAIGN_ID="your-campaign-id-here"

curl -H "X-API-Key: 5f1c6f51dd6430beac6746467593e99b75b924ae1cde6b7f0943edef30d328c7" \
  http://164.90.129.146:5000/api/campaign_status/${CAMPAIGN_ID}
```

Expected response:
```json
{
  "views": 10000,
  "likes": 200,
  "comments": 20,
  "status": "Running",
  "desired_comments": 10,
  "desired_likes": 200,
  "ordered_likes": 50,
  "ordered_comments": 5
}
```

---

## 5. Quick Monitoring Script

Run the monitoring script to check everything at once:

```bash
cd ~/arti-marketing-ops
git pull origin main
bash monitor-ratio-fixer-activity.sh
```

This will show:
- Flask service status
- Recent log activity
- Active campaigns in database
- Recent orders
- API health check

---

## Signs It's Working

✅ **Working:**
- Flask logs show "Ordering likes/comments" messages
- Database `ordered_likes` and `ordered_comments` increase
- Status API returns increasing `ordered_likes`/`ordered_comments`
- Frontend shows "Ordered" counts increasing
- JingleSMM order IDs appear in logs/database

❌ **Not Working:**
- Flask logs show no activity
- Status stays the same (no increases in ordered counts)
- Database shows no new orders
- Status API returns same values repeatedly

---

## Troubleshooting

### If ordered counts aren't increasing:

1. **Check Flask logs** for errors
2. **Verify JingleSMM API key** is configured
3. **Check if video has minimum engagement** (default: 500 views)
4. **Verify wait_time** - orders happen in cycles (default: every 36 seconds)
5. **Check if ratios are already met** - won't order if already at target

### If status isn't updating:

1. **Check API bridge** is working: `curl https://api.artistinfluence.com/api/ratio-fixer/health`
2. **Verify Flask is accessible** from API container
3. **Check frontend polling** - should refresh every 30 seconds
4. **Check browser console** for API errors

---

## Expected Behavior

1. **Immediately after starting:**
   - Status shows "Running"
   - Target likes/comments calculated
   - Ordered counts start at 0

2. **Within first cycle (36 seconds):**
   - Flask checks current stats
   - Calculates if orders needed
   - Places orders if ratios are low
   - Ordered counts update

3. **Ongoing:**
   - Checks every 36 seconds (or configured wait_time)
   - Places orders as needed
   - Updates ordered counts
   - Logs all activity

---

## Quick Test

To quickly verify it's working:

```bash
# 1. Check if any campaigns are running
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT campaign_name, ratio_fixer_status, ordered_likes, ordered_comments 
FROM youtube_campaigns 
WHERE ratio_fixer_status = 'running' 
LIMIT 1;
"

# 2. Wait 1-2 minutes, then check again
# If ordered_likes or ordered_comments increased, it's working!
```

---

## Frontend Indicators

In the Ratio Fixer tab, you should see:

1. **"Ratio Fixer Active"** section appears
2. **Spinning loader** indicates active polling
3. **Ordered counts** update every 30 seconds
4. **Values increase** when orders are placed

If you see these, the Ratio Fixer is working! 🎉

