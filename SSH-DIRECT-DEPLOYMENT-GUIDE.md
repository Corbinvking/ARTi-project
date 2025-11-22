# SSH Direct Deployment & Debugging Guide

## Overview

This guide explains when and how to use **direct SSH/SCP deployment** vs **Git-based deployment** for the ARTi production server.

**TL;DR:** Use SSH/SCP for debugging and hotfixes. Use Git for feature development and UI changes.

---

## When to Use Each Method

### ✅ Use SSH/SCP Direct Deployment For:

- **Debugging production issues** - Instant feedback loop
- **Hotfixes** - Critical bugs that need immediate resolution
- **Configuration changes** - Environment variables, config files
- **Script testing** - Testing bash scripts, Python scripts
- **Log inspection** - Reading logs, checking system state
- **Quick iterations** - Testing small code changes rapidly
- **Backend fixes** - API routes, database migrations, worker scripts
- **Dependency updates** - Installing packages, updating requirements.txt

**Advantages:**
- ⚡ Instant deployment (seconds)
- 🔄 No git history pollution from debug commits
- 🎯 Direct file manipulation
- 🔍 Immediate feedback
- 🚀 Perfect for trial-and-error debugging

### ✅ Use Git-based Deployment For:

- **Feature development** - New features, major changes
- **Frontend UI updates** - React components, styling, pages
- **Version-controlled changes** - Changes you want in git history
- **Team collaboration** - Multiple developers working together
- **Vercel deployments** - Frontend changes that trigger rebuilds
- **Database schema changes** - Migrations that should be tracked
- **Documentation** - README files, guides, documentation

**Advantages:**
- 📝 Full version history
- 🔄 Easy rollback to previous versions
- 👥 Team visibility
- 🔐 Code review process
- 🚀 Automatic Vercel deployments

---

## SSH Configuration

### Server Details
```bash
Server IP: 164.90.129.146
Hostname: artistinfluence
User: root
SSH Key: ~/.ssh/id_ed25519 (auto-generated)
```

### Test Connection
```bash
ssh root@164.90.129.146 "echo 'Connected!'"
```

---

## Essential SSH Commands

### 1. Running Remote Commands

**Basic syntax:**
```bash
ssh root@164.90.129.146 "command"
```

**Examples:**
```bash
# Check if a service is running
ssh root@164.90.129.146 "docker ps"

# View logs
ssh root@164.90.129.146 "docker logs api_container --tail 50"

# Check disk space
ssh root@164.90.129.146 "df -h"

# Test database connection
ssh root@164.90.129.146 "docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c 'SELECT COUNT(*) FROM playlists;'"

# Restart a service
ssh root@164.90.129.146 "cd /opt/ratio-fixer && pm2 restart ratio-app"
```

**Multiple commands:**
```bash
ssh root@164.90.129.146 "cd /opt/ratio-fixer && ls -la && cat .env | grep API_KEY"
```

### 2. Copying Files TO Server (SCP)

**Basic syntax:**
```bash
scp local-file root@164.90.129.146:/remote/path/
```

**Examples:**
```bash
# Copy a single file
scp campaign.py root@164.90.129.146:/opt/ratio-fixer/

# Copy a script to temp
scp deploy.sh root@164.90.129.146:/tmp/

# Copy entire directory
scp -r ./local-folder root@164.90.129.146:/opt/

# Copy with Windows paths
scp "C:\Users\corbi\Documents\script.py" root@164.90.129.146:/opt/
```

### 3. Copying Files FROM Server

**Examples:**
```bash
# Download a log file
scp root@164.90.129.146:/var/log/app.log ./logs/

# Download database backup
scp root@164.90.129.146:/backup/db.sql ./backups/

# Download entire directory
scp -r root@164.90.129.146:/opt/ratio-fixer/logs ./local-logs/
```

### 4. Interactive SSH Session

**Connect to server:**
```bash
ssh root@164.90.129.146
```

**Common workflow:**
```bash
ssh root@164.90.129.146
cd /opt/ratio-fixer
source venv/bin/activate
python main.py  # Test your changes
exit
```

---

## Debugging Workflow

### Typical Debugging Session

**Scenario:** API endpoint is returning 500 errors

```bash
# Step 1: Check logs
ssh root@164.90.129.146 "docker logs arti_api_container --tail 100"

# Step 2: Identify the bug in local file (e.g., apps/api/src/routes/campaigns.ts)
# Edit locally in Cursor

# Step 3: Deploy the fix instantly
scp apps/api/src/routes/campaigns.ts root@164.90.129.146:/opt/arti-api/src/routes/

# Step 4: Restart the service
ssh root@164.90.129.146 "cd /opt/arti-api && pm2 restart api"

# Step 5: Test immediately
curl https://api.artistinfluence.com/api/campaigns

# Step 6: If works, NOW commit to git for version control
git add apps/api/src/routes/campaigns.ts
git commit -m "fix: resolve 500 error in campaigns endpoint"
git push
```

---

## Common Use Cases

### 1. Hotfix Python Script

```bash
# Edit locally
# Fix bug in ratio_app/campaign.py

# Deploy
scp ratio_app/campaign.py root@164.90.129.146:/opt/ratio-fixer/

# Restart
ssh root@164.90.129.146 "cd /opt/ratio-fixer && pm2 restart ratio-app"

# Verify
ssh root@164.90.129.146 "pm2 logs ratio-app --lines 20"
```

### 2. Update Environment Variables

```bash
# Edit .env locally with new API key

# Deploy
scp production.env root@164.90.129.146:/opt/arti-api/.env

# Restart
ssh root@164.90.129.146 "cd /opt/arti-api && pm2 restart api"
```

### 3. Test Database Migration

```bash
# Create migration locally: supabase/migrations/044_new_feature.sql

# Copy to server
scp supabase/migrations/044_new_feature.sql root@164.90.129.146:/tmp/

# Test on server
ssh root@164.90.129.146 "docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres < /tmp/044_new_feature.sql"

# If successful, commit to git
git add supabase/migrations/044_new_feature.sql
git commit -m "feat: add new database feature"
git push
```

### 4. Fix Line Endings (Windows → Linux)

```bash
# After copying a script with SCP, if you get "$'\r': command not found" errors:
ssh root@164.90.129.146 "sed -i 's/\r$//' /tmp/deploy.sh"

# Or install dos2unix
ssh root@164.90.129.146 "dos2unix /tmp/deploy.sh"
```

### 5. Quick Log Analysis

```bash
# Check error frequency
ssh root@164.90.129.146 "grep -c 'ERROR' /var/log/app.log"

# Find specific error
ssh root@164.90.129.146 "grep 'Database connection failed' /var/log/app.log | tail -10"

# Check Docker container logs
ssh root@164.90.129.146 "docker logs arti_api_container 2>&1 | grep -i error"
```

---

## Advanced Techniques

### 1. Running Scripts with Input

```bash
# Run a script that needs input (use heredoc)
ssh root@164.90.129.146 "python /opt/ratio-fixer/backup.py" << EOF
yes
backup_name
EOF
```

### 2. Copying Multiple Files

```bash
# Copy all Python files
scp *.py root@164.90.129.146:/opt/ratio-fixer/

# Copy specific files
scp campaign.py main.py logger.py root@164.90.129.146:/opt/ratio-fixer/
```

### 3. Rsync for Large Deployments

```bash
# More efficient than SCP for large directories
rsync -avz --progress ./local-dir/ root@164.90.129.146:/opt/remote-dir/

# Exclude node_modules and .git
rsync -avz --progress --exclude 'node_modules' --exclude '.git' ./app/ root@164.90.129.146:/opt/app/
```

### 4. Port Forwarding (Tunnel)

```bash
# Access remote database locally
ssh -L 5432:localhost:5432 root@164.90.129.146

# Now connect to localhost:5432 from your local machine
```

### 5. Background Process Monitoring

```bash
# Start a long-running process
ssh root@164.90.129.146 "nohup python /opt/scraper.py > /tmp/scraper.log 2>&1 &"

# Check if it's running
ssh root@164.90.129.146 "ps aux | grep scraper"

# View logs
ssh root@164.90.129.146 "tail -f /tmp/scraper.log"
```

---

## Best Practices

### ✅ DO:

1. **Always test locally first** before deploying to production
2. **Back up critical files** before overwriting:
   ```bash
   ssh root@164.90.129.146 "cp /opt/app/important.py /opt/app/important.py.backup"
   ```
3. **Commit working changes to git** after successful debugging
4. **Use descriptive commit messages** when you eventually commit
5. **Check logs after deployment** to verify changes worked
6. **Use `/tmp/` for temporary test files** on the server
7. **Document emergency hotfixes** in commit messages

### ❌ DON'T:

1. **Don't skip git completely** - Always commit working changes after debugging
2. **Don't edit production files directly** - Edit locally, then SCP
3. **Don't forget to restart services** after file changes
4. **Don't deploy untested code** to production
5. **Don't use SSH for large feature development** - Use git workflow
6. **Don't forget line ending issues** - Windows files need `dos2unix` or `sed`
7. **Don't modify database directly** without backups

---

## Troubleshooting

### Permission Denied

```bash
# Check SSH key is loaded
ssh-add -l

# If not, add it
ssh-add ~/.ssh/id_ed25519
```

### Line Ending Errors (`$'\r': command not found`)

```bash
# Fix after copying
ssh root@164.90.129.146 "sed -i 's/\r$//' /path/to/file.sh"

# Or before copying (in PowerShell on Windows)
(Get-Content script.sh) | Set-Content -NoNewline script.sh
```

### SCP Permission Denied

```bash
# Check file permissions on server
ssh root@164.90.129.146 "ls -la /opt/target-directory"

# Fix permissions
ssh root@164.90.129.146 "chmod 755 /opt/target-directory"
```

### Service Won't Restart

```bash
# Check service status
ssh root@164.90.129.146 "pm2 status"

# Force restart
ssh root@164.90.129.146 "pm2 kill && pm2 resurrect"

# Check for errors
ssh root@164.90.129.146 "pm2 logs --err"
```

---

## Workflow Comparison

### Debugging with SSH/SCP (Fast ⚡)
```
1. Identify bug (30s)
2. Edit file locally (2min)
3. SCP to server (5s)
4. Restart service (5s)
5. Test (30s)
6. Repeat if needed
---
Total: ~3 minutes per iteration
```

### Debugging with Git (Slow 🐌)
```
1. Identify bug (30s)
2. Edit file locally (2min)
3. Git commit (30s)
4. Git push (10s)
5. SSH into server (5s)
6. Git pull (10s)
7. Restart service (5s)
8. Test (30s)
9. If failed, repeat all steps
---
Total: ~5 minutes per iteration + git history clutter
```

---

## Security Notes

- ✅ SSH keys are secure (better than passwords)
- ✅ All connections are encrypted
- ⚠️ Be careful with production database commands
- ⚠️ Always backup before making destructive changes
- ⚠️ Don't commit sensitive data to git (use .env files)

---

## Quick Reference

### Server Paths
```
Production API: /opt/arti-api/
Ratio Fixer App: /opt/ratio-fixer/
Spotify Scraper: /opt/spotify-scraper/
Database Backups: /backup/
Logs: /var/log/
Temp Files: /tmp/
```

### Common Services
```bash
# API Server
ssh root@164.90.129.146 "pm2 restart api"

# Ratio Fixer
ssh root@164.90.129.146 "cd /opt/ratio-fixer && pm2 restart ratio-app"

# Database
ssh root@164.90.129.146 "docker restart supabase_db_arti-marketing-ops"

# All Docker containers
ssh root@164.90.129.146 "docker ps -a"
```

---

## Summary

**Use SSH/SCP when:**
- You need immediate results
- You're debugging an issue
- You're testing scripts or configs
- You need to iterate quickly

**Use Git when:**
- You're building features
- You're updating UI/frontend
- You need version control
- You're collaborating with team

**Best approach:** Debug with SSH/SCP, then commit working changes to Git for permanent version control.

---

**Last Updated:** November 2024  
**Server:** artistinfluence (164.90.129.146)  
**SSH Key:** ~/.ssh/id_ed25519



