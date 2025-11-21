# Finding Ratio Fixer Files on Droplet

The `ratio_app copy` directory might be empty or a git submodule. Let's find where the files actually are:

## Commands to Run:

```bash
# 1. Check what's in the current directory
ls -la

# 2. Check if it's a git submodule
cat .git

# 3. Check parent directory
cd ~/arti-marketing-ops
ls -la | grep ratio

# 4. Search for main.py
find ~/arti-marketing-ops -name "main.py" -type f 2>/dev/null

# 5. Check if files are in a different location
find ~ -name "campaign.py" -type f 2>/dev/null | head -5
```

## Alternative: Clone or Copy from Local

Since the files might not be on the droplet, you have two options:

### Option A: Use Git (if the repo has the files)
```bash
cd ~/arti-marketing-ops
git pull origin main
# Then check if ratio_app copy has files now
```

### Option B: Copy from Local Machine
On your **local Windows machine**, open PowerShell and run:

```powershell
cd "C:\Users\corbi\OneDrive\Documents\GitHub\ARTi-project\ratio_app copy"
scp main.py campaign.py jingle_smm.py logger.py requirements.txt root@165.227.91.129:/opt/ratio-fixer/
scp .env root@165.227.91.129:/opt/ratio-fixer/ 2>$null
scp rich-phenomenon-428302-q5-dba5f2f381c1.json root@165.227.91.129:/opt/ratio-fixer/ 2>$null
```

But first, check if SSH works from local:
```powershell
ssh root@165.227.91.129 "echo 'SSH connection works'"
```

If SSH times out, we'll need to use a different method.

