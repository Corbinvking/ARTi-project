# ✅ Correct Commands for Your Production Setup

## Container Name Identified
Your Caddy container is: **`supabase_caddy_arti-marketing-ops`**

---

## 🚀 3-Step Setup (Copy & Paste)

### **Step 1: Generate Password Hash**

```bash
docker exec supabase_caddy_arti-marketing-ops caddy hash-password
```

When prompted, enter your password (e.g., `MyStudio2024!`)  
**Copy the entire hash** - it starts with `$2a$14$...`

---

### **Step 2: Edit Caddyfile**

```bash
# Backup first
cp /root/arti-marketing-ops/caddy/Caddyfile.production /root/arti-marketing-ops/caddy/Caddyfile.production.backup

# Edit the file
nano /root/arti-marketing-ops/caddy/Caddyfile.production
```

Find this section (around line 116-117):

```caddyfile
# Supabase Studio (Self-Hosted Admin Panel)
db.artistinfluence.com {
    reverse_proxy localhost:54323 {
```

**Change it to:**

```caddyfile
# Supabase Studio (Self-Hosted Admin Panel) - WITH AUTH
db.artistinfluence.com {
    basicauth {
        admin $2a$14$PASTE_YOUR_HASH_FROM_STEP_1_HERE
    }
    
    reverse_proxy localhost:54323 {
```

**Save and exit:**
- Press `Ctrl+X`
- Press `Y` (yes)
- Press `Enter`

---

### **Step 3: Reload Caddy**

```bash
docker exec supabase_caddy_arti-marketing-ops caddy reload --config /etc/caddy/Caddyfile
```

Expected output: `Config reloaded successfully`

---

## ✅ Done! Now Test

```bash
# Test 1: Check auth was added
grep -A 3 "basicauth" /root/arti-marketing-ops/caddy/Caddyfile.production

# Test 2: Check Caddy logs
docker logs supabase_caddy_arti-marketing-ops --tail 20

# Test 3: Test with curl (should return 401)
curl -I https://db.artistinfluence.com
```

**Then open in browser:**
1. Go to: `https://db.artistinfluence.com`
2. Browser should show login prompt
3. Enter:
   - Username: `admin`
   - Password: `[your password from Step 1]`

---

## 📋 Complete Example Session

```bash
root@artistinfluence:~/arti-marketing-ops# docker exec supabase_caddy_arti-marketing-ops caddy hash-password
Enter password: MyStudio2024!
Confirm password: MyStudio2024!
$2a$14$abc123xyz...  # <-- COPY THIS

root@artistinfluence:~/arti-marketing-ops# cp caddy/Caddyfile.production caddy/Caddyfile.production.backup

root@artistinfluence:~/arti-marketing-ops# nano caddy/Caddyfile.production
# ... edit file, add basicauth block ...

root@artistinfluence:~/arti-marketing-ops# docker exec supabase_caddy_arti-marketing-ops caddy reload --config /etc/caddy/Caddyfile
Config reloaded successfully

root@artistinfluence:~/arti-marketing-ops# curl -I https://db.artistinfluence.com
HTTP/2 401 
www-authenticate: Basic realm="restricted"
# ✅ Perfect! Auth is working
```

---

## 🔧 Troubleshooting

### **"Config reload failed"**
Check syntax:
```bash
docker exec supabase_caddy_arti-marketing-ops caddy validate --config /etc/caddy/Caddyfile
```

### **Still no login prompt**
Clear browser cache or try incognito mode:
```
Ctrl+Shift+N (Chrome)
Ctrl+Shift+P (Firefox)
```

### **Locked out?**
Restore backup:
```bash
cp /root/arti-marketing-ops/caddy/Caddyfile.production.backup \
   /root/arti-marketing-ops/caddy/Caddyfile.production
   
docker exec supabase_caddy_arti-marketing-ops caddy reload --config /etc/caddy/Caddyfile
```

---

## 📝 Exact Text to Add

Copy this **exact block** and paste it after line 117 in the Caddyfile:

```caddyfile
    basicauth {
        admin $2a$14$YOUR_HASH_HERE
    }
    
```

Make sure the indentation matches (4 spaces).

---

## ✅ Success Checklist

- [ ] Password hash generated successfully
- [ ] Caddyfile backed up
- [ ] `basicauth` block added to Caddyfile
- [ ] Caddy reloaded without errors
- [ ] `curl -I https://db.artistinfluence.com` returns 401
- [ ] Browser shows login prompt
- [ ] Can login with correct credentials
- [ ] Supabase Studio loads after login

🎉 **All done! Your Supabase Studio is now protected!**

