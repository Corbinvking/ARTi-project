# 🚀 Deploy Supabase Studio Authentication

## Choose Your Method

### ⚡ **Option 1: Automated Script** (Recommended)

```bash
# SSH to production
ssh root@artistinfluence.com

# Navigate to project
cd /root/arti-marketing-ops

# Pull latest changes
git pull origin main

# Make script executable
chmod +x scripts/add-studio-auth.sh

# Run the setup script
./scripts/add-studio-auth.sh
```

The script will:
1. ✅ Ask for your password
2. ✅ Generate secure hash
3. ✅ Backup current Caddyfile
4. ✅ Update configuration
5. ✅ Reload Caddy (no downtime)
6. ✅ Test and verify

---

### 📝 **Option 2: Manual Setup** (3 simple steps)

See: `SIMPLE-STUDIO-AUTH-SETUP.md`

1. Generate hash: `docker exec caddy caddy hash-password`
2. Edit Caddyfile: Add `basicauth { admin $hash }` 
3. Reload: `docker exec caddy caddy reload --config /etc/caddy/Caddyfile`

---

## 🧪 Verification Checklist

After setup, test these:

### ✅ **Test 1: Login Prompt Appears**
```bash
# Open in browser (incognito mode)
https://db.artistinfluence.com
```
Expected: Browser shows login dialog

### ✅ **Test 2: Wrong Credentials Rejected**
```
Username: admin
Password: wrongpassword
```
Expected: "401 Unauthorized" or prompt appears again

### ✅ **Test 3: Correct Credentials Work**
```
Username: admin
Password: [your password from setup]
```
Expected: Supabase Studio loads successfully

### ✅ **Test 4: Session Persists**
```
# After logging in, navigate around Studio
# Close browser
# Open browser again to https://db.artistinfluence.com
```
Expected: Still logged in (no new prompt)

---

## 🔐 Security Best Practices

### ✅ **Strong Password Requirements**
- Minimum 12 characters
- Mix of upper/lower case
- Include numbers and symbols
- Example: `MyStudio@2024!Pass`

### ✅ **Save Credentials Securely**
Use a password manager:
- 1Password
- LastPass
- Bitwarden
- KeePass

### ✅ **Share Access Safely**
If you need to share access with team:
1. **Add multiple users** in Caddyfile:
   ```caddyfile
   basicauth {
       admin $2a$14$HASH_ADMIN
       developer $2a$14$HASH_DEVELOPER
       manager $2a$14$HASH_MANAGER
   }
   ```
2. Each person gets their own username/password
3. Can revoke access by removing their line

---

## 🛠️ Troubleshooting

### **Issue: "Failed to reload Caddy"**
```bash
# Check Caddy logs
docker logs caddy

# Test config syntax
docker exec caddy caddy validate --config /etc/caddy/Caddyfile
```

### **Issue: "Can't access studio at all"**
```bash
# Restore backup
cp /root/arti-marketing-ops/caddy/Caddyfile.production.backup.* \
   /root/arti-marketing-ops/caddy/Caddyfile.production

# Reload
docker exec caddy caddy reload --config /etc/caddy/Caddyfile
```

### **Issue: "Forgot password"**
```bash
# Generate new hash
docker exec caddy caddy hash-password

# Update Caddyfile with new hash
nano /root/arti-marketing-ops/caddy/Caddyfile.production

# Reload
docker exec caddy caddy reload --config /etc/caddy/Caddyfile
```

---

## 📊 What This Protects

### **Before Setup:**
```
Anyone can access: https://db.artistinfluence.com
↓
Direct access to database admin panel
↓
Can view/edit all data ⚠️
```

### **After Setup:**
```
Visit: https://db.artistinfluence.com
↓
🔒 Browser login prompt appears
↓
Must enter valid username + password
↓
Only authorized users can access database
↓
✅ Your data is protected!
```

---

## 🎯 Next Steps After Setup

1. ✅ **Test access** with your credentials
2. ✅ **Save credentials** in password manager
3. ✅ **Share access** with authorized team members only
4. ✅ **Monitor logs** for unauthorized access attempts:
   ```bash
   tail -f /var/log/caddy/supabase.log
   ```

---

## 📞 Need Help?

If you encounter issues:
1. Check `ADD-STUDIO-AUTH-WALL.md` for detailed info
2. Review Caddy logs: `docker logs caddy`
3. Verify Caddyfile syntax: `docker exec caddy caddy validate --config /etc/caddy/Caddyfile`

---

## 🔄 Rollback Plan

If something goes wrong:

```bash
# 1. Find backup
ls -la /root/arti-marketing-ops/caddy/Caddyfile.production.backup.*

# 2. Restore most recent backup
BACKUP=$(ls -t /root/arti-marketing-ops/caddy/Caddyfile.production.backup.* | head -1)
cp $BACKUP /root/arti-marketing-ops/caddy/Caddyfile.production

# 3. Reload Caddy
docker exec caddy caddy reload --config /etc/caddy/Caddyfile

# 4. Verify
curl -I https://db.artistinfluence.com
```

---

## ✅ Success Indicators

You'll know it's working when:

✅ Browser shows login prompt at `https://db.artistinfluence.com`  
✅ Wrong password is rejected  
✅ Correct password grants access  
✅ No errors in Caddy logs  
✅ Studio functions normally after login  

🎉 **Your Supabase Studio is now protected!**

