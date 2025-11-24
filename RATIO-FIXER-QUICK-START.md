# Ratio Fixer Integration - Quick Start

**Status:** 🟡 Ready to Deploy  
**Time Required:** ~1.5 hours  
**All Code:** ✅ Complete

---

## What We've Created

1. **`flask-api-endpoints-patch.py`** - Automated script to add API endpoints to Flask
2. **`RATIO-FIXER-FULL-INTEGRATION-GUIDE.md`** - Complete step-by-step guide
3. **`deploy-ratio-fixer-integration.sh`** - Automated deployment script
4. **`RATIO-FIXER-STATUS-REVIEW.md`** - Current status and checklist

---

## Quick Deployment (Automated)

**On your droplet:**

```bash
# 1. Pull latest code
cd ~/arti-marketing-ops
git pull origin main

# 2. Copy patch script to ratio-fixer
cp flask-api-endpoints-patch.py /opt/ratio-fixer/

# 3. Copy deployment script
cp deploy-ratio-fixer-integration.sh /opt/ratio-fixer/

# 4. Run deployment script
cd /opt/ratio-fixer
chmod +x deploy-ratio-fixer-integration.sh
bash deploy-ratio-fixer-integration.sh
```

**The script will:**
- ✅ Add API endpoints to Flask
- ✅ Install flask-cors
- ✅ Generate and configure API keys
- ✅ Set up systemd service
- ✅ Start Flask app
- ✅ Rebuild API container
- ✅ Run database migration
- ✅ Test everything

---

## Manual Deployment (Step-by-Step)

If you prefer manual control, follow:
**`RATIO-FIXER-FULL-INTEGRATION-GUIDE.md`**

---

## What Gets Added to Flask

### API Endpoints:
- `POST /api/create_campaign` - Create campaign via API
- `GET /api/campaign_status/<id>` - Get campaign status
- `POST /api/stop_campaign/<id>` - Stop campaign
- `GET /healthz` - Health check

### Features:
- CORS enabled for API routes
- API key authentication
- JSON responses (not HTML redirects)
- Full integration with existing campaign logic

---

## API Keys Needed

| Key | Status | Action |
|-----|--------|--------|
| **RATIO_FIXER_API_KEY** | ❌ Generate | Script will generate automatically |
| **JINGLE_SMM_API_KEY** | ✅ Have | Add to `apps/api/production.env` |
| **YOUTUBE_API_KEY** | ✅ Have | Already configured |

---

## After Deployment

### Test Integration:

1. **Flask Health:**
   ```bash
   curl http://localhost:5000/healthz
   # Expected: {"status":"healthy"}
   ```

2. **API Bridge Health:**
   ```bash
   curl http://localhost:3001/api/ratio-fixer/health
   # Expected: {"status":"healthy","available":true}
   ```

3. **Frontend Test:**
   - Go to: https://app.artistinfluence.com/youtube/campaigns
   - Click a campaign
   - Navigate to "Ratio Fixer" tab
   - Click "Start Automated Ratio Fixer"

---

## Troubleshooting

### Flask Won't Start
```bash
sudo systemctl status ratio-fixer
sudo journalctl -u ratio-fixer -n 50
```

### API Bridge Returns 502
```bash
# Check Flask is running
curl http://localhost:5000/healthz

# Check API container
docker compose logs api --tail 50
```

### Migration Fails
```bash
# Check if already applied
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'youtube_campaigns' 
AND column_name LIKE 'ratio_fixer%';
"
```

---

## Files Created

- ✅ `flask-api-endpoints-patch.py` - Patch script
- ✅ `deploy-ratio-fixer-integration.sh` - Deployment automation
- ✅ `RATIO-FIXER-FULL-INTEGRATION-GUIDE.md` - Complete guide
- ✅ `RATIO-FIXER-STATUS-REVIEW.md` - Status review
- ✅ `RATIO-FIXER-QUICK-START.md` - This file

---

## Next Steps

1. **SSH to droplet**
2. **Pull latest code:** `git pull origin main`
3. **Run deployment script:** `bash deploy-ratio-fixer-integration.sh`
4. **Test from frontend**
5. **Monitor logs:** `sudo journalctl -u ratio-fixer -f`

---

**Ready to deploy!** 🚀

