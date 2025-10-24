# 🚀 Run SQL Import on Production

## ✅ **What We Have:**
- ✅ `IMPORT-SCRAPED-DATA.sql` uploaded to production
- ✅ Contains 79 campaigns with 1,928 playlists
- ✅ Direct SQL that bypasses JWT authentication

---

## 📋 **Method 1: Run via Supabase CLI (Recommended)**

```bash
# On production SSH terminal
cd /root/arti-marketing-ops

# Run the SQL import
supabase db execute -f IMPORT-SCRAPED-DATA.sql
```

---

## 📋 **Method 2: Run via psql (Alternative)**

```bash
# Get database connection details
supabase status

# Connect to database and run SQL
psql postgresql://postgres:postgres@localhost:54322/postgres -f IMPORT-SCRAPED-DATA.sql
```

---

## 📋 **Method 3: Supabase Studio (Manual)**

1. Open Supabase Studio: `https://db.artistinfluence.com`
2. Login with credentials
3. Go to SQL Editor
4. Copy contents of `IMPORT-SCRAPED-DATA.sql`
5. Paste and Execute

---

## 📊 **Expected Output:**

The script will process 79 campaigns and insert/update 1,928 playlist records. You'll see NOTICE messages like:

```
NOTICE:  Found campaign: <uuid>
NOTICE:  Found campaign: <uuid>
...
```

---

## ✅ **Verification:**

After running, check that playlist data exists:

```sql
SELECT COUNT(*) FROM campaign_playlists;
```

Should show **~1,928 records** (or more if some already existed).

---

## 🎯 **Next Step:**

Run this command on production:
```bash
cd /root/arti-marketing-ops && supabase db execute -f IMPORT-SCRAPED-DATA.sql
```

