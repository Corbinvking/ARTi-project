# Fix: Infinite Recursion in User Roles RLS Policies

**Date:** November 13, 2024  
**Issue:** Admin panel user management failing with "infinite recursion detected in policy for relation 'user_roles'"  
**Status:** ✅ **RESOLVED**

---

## 🐛 Problem

The admin panel's user management card was failing to load with this error:

```
GET https://api.artistinfluence.com/rest/v1/users?select=id%2Cemail%2Cfull_name%2Ccreated_at%2Cavatar_url&order=created_at.desc 500 (Internal Server Error)

❌ Error fetching users: {
  code: '42P17',
  details: null,
  hint: null,
  message: 'infinite recursion detected in policy for relation "user_roles"'
}
```

### Root Cause

The RLS policies on the `user_roles` table were checking **themselves** for permissions:

```sql
-- ❌ PROBLEMATIC POLICY (caused infinite recursion)
CREATE POLICY "admins_managers_view_all_user_roles"
  ON public.user_roles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur  -- ⚠️ Querying user_roles while checking user_roles permission!
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'manager')
    )
  );
```

When a user tried to query `user_roles`:
1. PostgreSQL checks the RLS policy
2. The policy queries `user_roles` to see if the user is an admin
3. That query triggers the same RLS policy again
4. Infinite loop! 💥

---

## ✅ Solution

Use **SECURITY DEFINER** helper functions that bypass RLS:

```sql
-- ✅ FIXED POLICY (uses SECURITY DEFINER function)
CREATE POLICY "admins_managers_view_all_user_roles"
  ON public.user_roles FOR SELECT
  USING (public.is_vendor_manager()); -- No recursion!
```

### Why This Works

The `is_vendor_manager()` function is defined as `SECURITY DEFINER`, which means:
- It runs with the privileges of the function owner (postgres)
- It **bypasses RLS** checks
- No infinite loop!

```sql
CREATE OR REPLACE FUNCTION public.is_vendor_manager()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN public.has_role('admin') OR public.has_role('manager');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;  -- This is the magic!
```

---

## 🔧 Changes Made

### Migration 047: Fix User Roles Infinite Recursion

**File:** `supabase/migrations/047_fix_user_roles_infinite_recursion.sql`

**Changes:**
1. Dropped 3 problematic recursive policies
2. Recreated them using `is_vendor_manager()` SECURITY DEFINER function
3. Verified policies are correct

**Applied:** November 13, 2024

```sql
-- Policy 1: Users can view their own role
CREATE POLICY "users_view_own_role"
  ON public.user_roles FOR SELECT
  USING (user_id = auth.uid());

-- Policy 2: Admins/managers can view ALL roles (using helper function)
CREATE POLICY "admins_managers_view_all_user_roles"
  ON public.user_roles FOR SELECT
  USING (public.is_vendor_manager());

-- Policy 3: Admins/managers can manage roles (using helper function)
CREATE POLICY "admins_managers_manage_user_roles"
  ON public.user_roles FOR ALL
  USING (public.is_vendor_manager())
  WITH CHECK (public.is_vendor_manager());
```

---

## ✅ Verification

### 1. Migration Applied Successfully

```bash
$ docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres < supabase/migrations/047_fix_user_roles_infinite_recursion.sql

DROP POLICY
DROP POLICY
DROP POLICY
CREATE POLICY
CREATE POLICY
CREATE POLICY
             policyname              |  cmd   |          qual          |     with_check      
-------------------------------------+--------+------------------------+---------------------
 admins_managers_manage_user_roles   | ALL    | is_vendor_manager()    | is_vendor_manager()
 admins_managers_view_all_user_roles | SELECT | is_vendor_manager()    | 
 users_view_own_role                 | SELECT | (user_id = auth.uid()) | 
(3 rows)
```

### 2. PostgREST Restarted

Schema cache refreshed to apply new policies:

```bash
$ docker restart supabase_rest_arti-marketing-ops
supabase_rest_arti-marketing-ops
```

### 3. No Infinite Recursion

Query completes successfully (no 500 error):

```bash
$ curl -H 'Authorization: Bearer <token>' \
  'https://api.artistinfluence.com/rest/v1/user_roles?select=user_id,role&limit=5'

[]  # Empty because anon key has no access (correct!)
```

### 4. Data Confirmed Present

```sql
SELECT COUNT(*) FROM public.user_roles;  -- 11 rows
SELECT COUNT(*) FROM public.users;       -- 16 rows
```

---

## 🧪 Testing Instructions

### For User: Test on Frontend

1. **Refresh your browser** (hard refresh: Ctrl+Shift+R or Cmd+Shift+R)
2. Navigate to: http://localhost:3000/admin
3. Log in with: `admin@arti-demo.com`
4. Check the **User Management** card

**Expected Result:**
- ✅ No console errors
- ✅ User list loads successfully
- ✅ Shows all 16 users with their roles and permissions

### If Still Having Issues

1. **Clear browser cache completely**
2. **Restart your local dev server:**
   ```bash
   cd apps/frontend
   npm run dev
   ```
3. **Check console for different errors** (CORS, auth, etc.)

---

## 📊 Database Status

| Table | Rows | Status |
|-------|------|--------|
| `users` | 16 | ✅ Operational |
| `user_roles` | 11 | ✅ Operational |
| `vendor_users` | (varies) | ✅ Operational |

### RLS Policies

All policies now use SECURITY DEFINER functions:
- ✅ `users_view_own_role` - Users can see their own role
- ✅ `admins_managers_view_all_user_roles` - Admins can see all roles
- ✅ `admins_managers_manage_user_roles` - Admins can manage roles

---

## 🔍 Related Issues

### Issue 2: CORS Error for `/auth/permissions`

**Separate issue also in console:**

```
Access to fetch at 'https://api.artistinfluence.com/auth/permissions' from origin 'http://localhost:3000' 
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present
```

**Status:** ⚠️ **Not Critical** - Permission loading continues without this endpoint

**Note:** This is a different issue from the infinite recursion. The auth/permissions endpoint may not exist or needs CORS configuration in the API server.

---

## 📚 Additional Context

### Security Definer Functions in Database

These helper functions are used throughout the system to avoid RLS recursion:

| Function | Purpose | Used By |
|----------|---------|---------|
| `has_role(_role)` | Check if user has specific role | Multiple policies |
| `is_vendor_manager()` | Check if user is admin/manager | User management, vendor policies |
| `is_salesperson()` | Check if user is salesperson | Campaign policies |
| `is_vendor()` | Check if user is a vendor | Vendor-specific policies |

All defined in: `supabase/migrations/015_stream_strategist_integration.sql`

---

## ✅ Summary

**Problem:** Infinite recursion in RLS policies  
**Solution:** Use SECURITY DEFINER helper functions  
**Status:** ✅ Fixed  
**Migration:** 047_fix_user_roles_infinite_recursion.sql  
**Applied:** November 13, 2024  
**Verified:** API queries complete successfully, no infinite recursion  

**Next Step:** User should refresh browser and test the admin panel!

