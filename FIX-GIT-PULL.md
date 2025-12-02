# Fix Git Pull Conflict

## Issue
Local changes to `caddy/Caddyfile.production` and `rebuild-api-with-ratio-fixer.sh` are blocking the pull.

## Solution

```bash
# Stash local changes
git stash

# Pull latest code
git pull origin main

# (Optional) Restore your local changes if needed
# git stash pop
```

---

## Quick Copy-Paste

```bash
cd /root/arti-marketing-ops
git stash
git pull origin main
cd spotify_scraper
sed -i 's/HEADLESS=.*/HEADLESS=true/' .env 2>/dev/null || echo "HEADLESS=true" >> .env
cd /root/arti-marketing-ops
bash TEST-SCRAPER-FIXES.sh
```

This will:
1. Stash your local changes (saves them temporarily)
2. Pull the latest code with fixes
3. Set HEADLESS=true in .env
4. Run the test

---

## If You Need Your Local Changes Back

After testing, if you need those local changes:
```bash
git stash list  # See what was stashed
git stash pop   # Restore the changes
```

---

**Copy-paste the commands above now!** 🚀

