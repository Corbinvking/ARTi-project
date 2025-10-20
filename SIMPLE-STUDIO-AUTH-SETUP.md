# 🔐 Simple 3-Step Setup: Protect Supabase Studio

## Quick Setup (5 minutes)

### **Step 1: Generate Password Hash**

SSH into production and run:

```bash
ssh root@artistinfluence.com
docker exec caddy caddy hash-password
```

When prompted, enter your desired password (e.g., `MyStudioPass2024!`)

**Copy the hash output** - looks like: `$2a$14$xyz...`

---

### **Step 2: Edit Caddyfile**

```bash
nano /root/arti-marketing-ops/caddy/Caddyfile.production
```

Find this section (around line 116):

```caddyfile
# Supabase Studio (Self-Hosted Admin Panel)
db.artistinfluence.com {
    reverse_proxy localhost:54323 {
```

**Replace it with** (paste YOUR hash from Step 1):

```caddyfile
# Supabase Studio (Self-Hosted Admin Panel) - WITH AUTH
db.artistinfluence.com {
    basicauth {
        admin $2a$14$YOUR_HASH_FROM_STEP_1_HERE
    }
    
    reverse_proxy localhost:54323 {
```

Save and exit (`Ctrl+X`, then `Y`, then `Enter`)

---

### **Step 3: Reload Caddy**

```bash
docker exec caddy caddy reload --config /etc/caddy/Caddyfile
```

✅ **Done!**

---

## 🧪 Test It

1. Open browser: `https://db.artistinfluence.com`
2. You should see a login prompt
3. Enter:
   - Username: `admin`
   - Password: `[whatever you entered in Step 1]`

---

## ⚡ Even Faster: Use the Script

Or just run the automated script:

```bash
cd /root/arti-marketing-ops
chmod +x scripts/add-studio-auth.sh
./scripts/add-studio-auth.sh
```

It will:
1. Ask for your password
2. Generate the hash
3. Update Caddyfile
4. Reload Caddy
5. All done! ✅

---

## 🔄 To Remove Auth Later

If you need to remove the auth wall:

```bash
nano /root/arti-marketing-ops/caddy/Caddyfile.production
```

Remove the `basicauth { ... }` block, then reload:

```bash
docker exec caddy caddy reload --config /etc/caddy/Caddyfile
```

---

## 📝 Complete Before/After Example

### **Before:**
```caddyfile
db.artistinfluence.com {
    reverse_proxy localhost:54323 {
        header_up Host {host}
        # ...
    }
}
```

### **After:**
```caddyfile
db.artistinfluence.com {
    basicauth {
        admin $2a$14$YOUR_HASH_HERE
    }
    
    reverse_proxy localhost:54323 {
        header_up Host {host}
        # ...
    }
}
```

That's it! Just add 3 lines. 🎯

