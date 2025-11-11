# ⚠️ SoundCloud Integration - Breaking Changes & Solutions

**Date**: November 10, 2025  
**App**: artist-spark → ARTi unified dashboard  
**Priority**: Fix in order listed (critical first)

---

## 🔴 CRITICAL #1: React Router → Next.js Router

### Problem
- 60+ files use React Router v6 hooks and components
- Will break immediately when copied to Next.js app

### Files Affected
```
src/App.tsx                    # Main router setup
src/components/dashboard/*     # 60+ files
src/components/portal/*        # 11 files  
src/components/auth/*          # 3 files
```

### Specific Changes Needed

| React Router | Next.js | Notes |
|-------------|---------|-------|
| `BrowserRouter` | Remove | Use Next.js App Router |
| `Routes` | Remove | Use file-based routing |
| `Route` | `page.tsx` files | File-based routing |
| `Navigate` | `redirect()` or `router.push()` | Server/client redirect |
| `useNavigate()` | `useRouter()` | Import from `next/navigation` |
| `useLocation()` | `usePathname()` | Import from `next/navigation` |
| `useSearchParams()` | `useSearchParams()` | Same name, different import, add `?.` |
| `<Link to=` | `<Link href=` | Import from `next/link` |
| `<NavLink>` | `<Link>` + manual active | No NavLink in Next.js |

### Migration Checklist (Per File)
- [ ] Add `"use client"` at top of file
- [ ] Replace `import { useNavigate, useLocation } from 'react-router-dom'`
- [ ] Replace with `import { useRouter, usePathname, useSearchParams } from 'next/navigation'`
- [ ] Replace `import { Link } from 'react-router-dom'`
- [ ] Replace with `import Link from 'next/link'`
- [ ] Change `navigate('/path')` → `router.push('/soundcloud/path')`
- [ ] Change `navigate(-1)` → `router.back()`
- [ ] Change `location.pathname` → `pathname`
- [ ] Change `searchParams.get('x')` → `searchParams?.get('x')` (add optional chaining)
- [ ] Change `<Link to="/path">` → `<Link href="/soundcloud/path">`
- [ ] Add `/soundcloud/` prefix to ALL internal routes
- [ ] Convert `<NavLink>` to `<Link>` with manual active state

### Solution
- Run automated router migration script (handles 80%)
- Manually fix remaining 20% (complex cases)

**Time**: 45 minutes with automation

---

## 🔴 CRITICAL #2: Auth Context - Database Queries

### Problem
AuthContext queries two database tables that may not exist or have different schemas in unified dashboard:
1. `user_roles` - For admin/moderator roles
2. `members` - For member data

### Current Code (Lines 59-87 in AuthContext.tsx)
```typescript
const fetchUserData = async (userId: string, userEmail: string) => {
  // ❌ BREAKS: Queries user_roles table
  const { data: rolesData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId);
  
  setUserRoles(rolesData?.map(r => r.role) || []);

  // ❌ BREAKS: Queries members table
  const { data: memberData } = await supabase
    .from('members')
    .select('*')
    .contains('emails', [userEmail])
    .maybeSingle();
  
  setMember(memberData || null);
}
```

### Why This Breaks
- `user_roles` table may not exist in unified schema
- `members` table may have different structure
- RLS policies may deny access
- Can cause 406 errors, infinite loops, auth failures

### ✅ SOLUTION: Metadata-Only Auth Pattern

**Replace with** (Based on YouTube/Instagram success):
```typescript
const fetchUserProfile = async (userId: string) => {
  try {
    // ✅ Get user from auth (no DB query)
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;

    if (!user) {
      setProfile(null);
      return;
    }

    // ✅ Get role from user metadata (no DB query)
    const userRole = user.user_metadata?.role || user.app_metadata?.role || 'admin';
    
    // ✅ Get member status from metadata
    const isMember = user.user_metadata?.is_member || false;
    
    // ✅ Build profile from metadata only
    setProfile({
      id: userId,
      email: user.email ?? '',
      first_name: user.user_metadata?.first_name,
      last_name: user.user_metadata?.last_name,
      role: userRole as UserRole,
    });
    
    setMember(isMember ? { 
      id: userId, 
      name: user.user_metadata?.name,
      email: user.email 
    } : null);

    console.log('✅ SoundCloud profile loaded:', user.email, 'role:', userRole);
  } catch (error) {
    console.error('❌ Error in fetchUserProfile:', error);
    // Fallback profile
    setProfile({
      id: userId,
      email: 'user@example.com',
      role: 'admin',
    });
  }
};
```

### Benefits
- ✅ No database dependencies
- ✅ No RLS policy issues
- ✅ Works immediately
- ✅ Matches YouTube/Instagram pattern (proven)
- ✅ Faster (no DB roundtrip)

**Time**: 20 minutes

---

## 🟡 MEDIUM #3: Supabase Client - Hardcoded Credentials

### Problem
Supabase credentials are hardcoded in `src/integrations/supabase/client.ts`

### Current Code (Lines 5-6)
```typescript
const SUPABASE_URL = "https://xwvxufnntlytvtqpzbqw.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGci...very-long-token...";
```

### Issues
- ❌ Different Supabase instance than unified dashboard
- ❌ Not using environment variables
- ❌ No org-scoping capability
- ❌ Credentials exposed in code

### ✅ SOLUTION: Use Unified Dashboard's Supabase

**Replace with**:
```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// ✅ Use unified Supabase instance
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      'x-application': 'soundcloud-manager'
    }
  }
});

// ✅ Org-scoped client (optional)
export function createOrgScopedClient(orgId: string) {
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    },
    global: {
      headers: {
        'x-org-id': orgId,
        'x-application': 'soundcloud-manager'
      }
    }
  });
}

export default supabase;
```

**Time**: 10 minutes

---

## 🟡 MEDIUM #4: Import Paths

### Problem
- All imports use `@/` alias pointing to `src/`
- Files will be nested deeper in Next.js: `app/(dashboard)/soundcloud/soundcloud-app/`
- Relative imports will break

### Examples of What Will Break
```typescript
// Current (works in Vite)
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

// After copying (BREAKS - wrong depth)
import { supabase } from '@/integrations/supabase/client'; // ❌ Can't find file
```

### ✅ SOLUTION: Automated Import Path Fixer

**What the script does**:
1. Calculate correct relative path depth for each file
2. Fix imports to integrations/supabase
3. Fix imports to contexts/AuthContext
4. Fix imports to components within soundcloud-app
5. Leave @/components/ui imports alone (they point to shared UI)

**Example Fix**:
```typescript
// File: app/(dashboard)/soundcloud/soundcloud-app/components/dashboard/CampaignsPage.tsx
// Depth: 2 levels deep in soundcloud-app

// BEFORE (breaks)
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// AFTER (works)
import { supabase } from '../../integrations/supabase/client';
import { useAuth } from '../../contexts/AuthContext';

// UNCHANGED (points to shared UI in apps/frontend/components/ui)
import { Button } from '@/components/ui/button';
```

**Time**: 10 minutes (automated) + 5 minutes (verify)

---

## 🟢 LOW #5: Environment Variables

### Problem
Minimal usage, but needs mapping for PWA features

### Current Usage
```typescript
// src/utils/serviceWorker.ts
process.env.NODE_ENV           // → Already exists in Next.js
process.env.PUBLIC_URL         // → Need to replace
process.env.REACT_APP_VAPID_PUBLIC_KEY  // → Need to map
```

### ✅ SOLUTION: Environment Variable Mapper

| Old (Vite/CRA) | New (Next.js) |
|----------------|---------------|
| `process.env.PUBLIC_URL` | `''` (root) or `/soundcloud` |
| `process.env.REACT_APP_VAPID_PUBLIC_KEY` | `process.env.NEXT_PUBLIC_VAPID_KEY` |
| `import.meta.env.*` | `process.env.*` |

**Action**: Run env mapper script or manually replace (only 3 occurrences)

**Time**: 5 minutes

---

## 🟢 LOW #6: PWA/Service Worker (Optional)

### Problem
Artist-spark has PWA functionality with service workers

### Files
- `src/utils/serviceWorker.ts`
- `public/sw.js`
- `public/manifest.json`

### Decision Options
**A) Keep PWA** (Recommended for SoundCloud use case)
- Update service worker for Next.js
- Update manifest paths
- Test offline functionality
- **Time**: +30 minutes

**B) Remove PWA** (Simpler integration)
- Remove service worker registration from main.tsx
- Delete serviceWorker.ts
- Delete sw.js and manifest.json
- **Time**: 5 minutes

### ✅ RECOMMENDATION: Keep PWA
SoundCloud users often work offline or on mobile, PWA features are valuable.

---

## 📊 Priority Matrix

| Priority | Issue | Impact | Time | Automated? |
|----------|-------|--------|------|-----------|
| 🔴 P1 | React Router Migration | CRITICAL | 45m | 80% |
| 🔴 P1 | Auth Context | CRITICAL | 20m | Manual |
| 🟡 P2 | Supabase Client | HIGH | 10m | Manual |
| 🟡 P2 | Import Paths | HIGH | 15m | 95% |
| 🟢 P3 | Environment Variables | LOW | 5m | 90% |
| 🟢 P3 | PWA/Service Worker | LOW | 5-30m | Manual |

**Total Time**: ~2.5 hours with automation

---

## 🎯 Execution Order

### Phase 1: Infrastructure (Setup)
1. Create directory structure
2. Copy files
3. Create Next.js boilerplate (layout, page, loading)

### Phase 2: Automated Fixes (Run Scripts)
1. ✅ Fix Supabase client (manual, 10 min)
2. ✅ Fix import paths (script, 10 min)
3. ✅ Fix env variables (script, 5 min)
4. Test build → Expect 50% of errors fixed

### Phase 3: Critical Manual Fixes
1. ✅ Migrate Auth Context (20 min) - MUST DO FIRST!
2. ✅ Migrate React Router (45 min) - Use script + manual

### Phase 4: Testing
1. Build test (`pnpm run build`)
2. Dev server test (`pnpm run dev`)
3. Functional testing (click through all routes)
4. Console error check (F12)

---

## 🚨 Don't Forget

### Route Prefixing
ALL internal routes need `/soundcloud/` prefix:
```typescript
// ❌ Wrong
router.push('/dashboard')
<Link href="/portal">

// ✅ Right
router.push('/soundcloud/dashboard')
<Link href="/soundcloud/portal">
```

### Optional Chaining
Next.js hooks can return null, always use optional chaining:
```typescript
// ❌ Wrong
const tab = searchParams.get('tab')

// ✅ Right
const tab = searchParams?.get('tab')
```

### "use client" Directive
All components using hooks or state need:
```typescript
"use client"  // ← Add at top of file

import { useState } from 'react'
```

### Export Consistency
All components need both exports:
```typescript
export { ComponentName };  // ← Named export
export default ComponentName;  // ← Default export
```

---

## ✅ Success Criteria

Integration is complete when:
- [ ] `pnpm run build` succeeds with 0 errors
- [ ] All routes load in browser
- [ ] Navigation works between pages
- [ ] No console errors in browser
- [ ] Auth check works (redirects to login if not authenticated)
- [ ] Data loads from Supabase (if applicable)
- [ ] Forms work (if applicable)

---

**Status**: Ready to execute  
**Next**: Create automation scripts (Phase 1)


