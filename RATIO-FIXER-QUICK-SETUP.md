# Ratio Fixer Quick Setup Commands

Run these commands **directly on your droplet** (you're already SSH'd in):

```bash
# 1. Create deployment directory
sudo mkdir -p /opt/ratio-fixer
sudo chown $USER:$USER /opt/ratio-fixer

# 2. Navigate to ratio_app copy directory
cd ~/arti-marketing-ops/ratio_app\ copy

# 3. Copy essential files
cp main.py campaign.py jingle_smm.py logger.py requirements.txt /opt/ratio-fixer/

# 4. Copy .env file (if it exists)
if [ -f .env ]; then
    cp .env /opt/ratio-fixer/
    echo "✅ Copied .env"
else
    echo "⚠️  .env not found - you'll need to create it"
fi

# 5. Copy Google Cloud service account (if it exists)
if [ -f rich-phenomenon-428302-q5-dba5f2f381c1.json ]; then
    cp rich-phenomenon-428302-q5-dba5f2f381c1.json /opt/ratio-fixer/
    echo "✅ Copied service account"
fi

# 6. Navigate to deployment directory
cd /opt/ratio-fixer

# 7. Create virtual environment
python3 -m venv venv

# 8. Activate virtual environment
source venv/bin/activate

# 9. Upgrade pip
pip install --upgrade pip

# 10. Install dependencies
pip install -r requirements.txt

# 11. Verify .env file
cat .env

# 12. Test the app (Ctrl+C to stop)
python main.py
```

**Expected output when running `python main.py`:**
```
 * Running on http://127.0.0.1:5000
```

If you see that, it's working! Press Ctrl+C to stop, then we'll set up the systemd service.

