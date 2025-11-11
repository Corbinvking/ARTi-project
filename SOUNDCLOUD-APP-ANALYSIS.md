# 🎵 SoundCloud (artist-spark) App Analysis

**Generated**: November 10, 2025  
**Source**: https://github.com/artistinfluence/artist-spark.git  
**Status**: Ready for integration

---

## 📊 App Structure Overview

### Build & Framework
- **Build Tool**: Vite (not Next.js)
- **Package Manager**: npm (has both package-lock.json and bun.lockb)
- **Router**: React Router v6.30.1
- **Language**: TypeScript ✅
- **UI Framework**: Radix UI (same as shadcn-ui) ✅

### Dependencies (Compatible ✅)
- **Auth**: @supabase/supabase-js v2.55.0 ✅
- **State**: @tanstack/react-query v5.83.0 ✅
- **UI**: Radix UI components (matches our stack) ✅
- **Forms**: react-hook-form + zod ✅
- **Styling**: Tailwind CSS ✅
- **Icons**: lucide-react ✅
- **Charts**: recharts, d3 ✅
- **Animation**: framer-motion ✅

### File Structure
```
src/
├── App.tsx                  # Main router setup with BrowserRouter
├── main.tsx                 # Entry point
├── components/
│   ├── admin/              # Admin-specific components (7 files)
│   ├── auth/               # LoginPage, RoleBasedRoute, UnauthorizedPage
│   ├── calendar/           # Calendar components (4 files)
│   ├── dashboard/          # Main dashboard pages (60+ files)
│   ├── notifications/      # NotificationBell, NotificationCenter
│   ├── portal/             # Member portal (11 files)
│   ├── public/             # PublicMemberSubmissionForm
│   └── ui/                 # shadcn-ui components
├── contexts/
│   └── AuthContext.tsx     # ⚠️ Queries database tables!
├── hooks/                  # 23 custom hooks
├── integrations/
│   └── supabase/
│       ├── client.ts       # ⚠️ Hardcoded credentials!
│       └── types.ts        # Database types
├── lib/
│   └── utils.ts
├── pages/
│   ├── Index.tsx
│   ├── NotFound.tsx
│   └── PreviewTool.tsx
├── types/
│   └── calendar.ts
└── utils/                  # Various utility functions
```

---

## ⚠️ BREAKING CHANGES - What WILL Break

### 🔴 CRITICAL - Router (React Router v6)
**Impact**: ~60+ files use React Router

**Hooks Found**:
- `useNavigate()` - Used extensively for navigation
- `useLocation()` - Used for active state checks
- `useSearchParams()` - Used for query params
- `BrowserRouter` - Wraps entire app
- `Routes`, `Route`, `Navigate` - Routing components
- `Link` - Navigation links (possibly)

**Files Affected**:
- App.tsx (main router setup)
- All dashboard components (60+ files)
- Portal components (11 files)
- Auth components (3 files)

**Solution**: Migrate to Next.js router (useRouter, usePathname, useSearchParams, Link)

---

### 🔴 CRITICAL - Auth Context (Database Queries)
**Location**: `src/contexts/AuthContext.tsx`

**Current Implementation** (Lines 59-87):
```typescript
const fetchUserData = async (userId: string, userEmail: string) => {
  // ❌ Queries user_roles table
  const { data: rolesData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId);
  
  // ❌ Queries members table
  const { data: memberData } = await supabase
    .from('members')
    .select(`
      id, name, primary_email, emails, status, size_tier, 
      monthly_repost_limit, submissions_this_month, net_credits,
      soundcloud_url, families, soundcloud_followers
    `)
    .contains('emails', [userEmail])
    .maybeSingle();
}
```

**Why This Breaks**:
- `user_roles` table may not exist in unified dashboard
- `members` table structure may differ
- RLS policies may conflict
- Can cause infinite loops, 406 errors

**Solution**: Use metadata-only auth pattern (get role from user.user_metadata)

---

### 🟡 MEDIUM - Supabase Client (Hardcoded Credentials)
**Location**: `src/integrations/supabase/client.ts`

**Current** (Lines 5-6):
```typescript
const SUPABASE_URL = "https://xwvxufnntlytvtqpzbqw.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGci...";
```

**Issues**:
- ❌ Hardcoded credentials (not using environment variables)
- ❌ Different Supabase instance than unified dashboard
- ❌ No org-scoping

**Solution**: 
- Replace with `process.env.NEXT_PUBLIC_SUPABASE_URL`
- Replace with `process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Use unified dashboard's Supabase instance
- Add org-scoping capability

---

### 🟡 MEDIUM - Import Paths
**Impact**: ~200+ import statements

**Current Pattern**:
```typescript
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
```

**Issue**:
- `@/` alias points to `src/` in Vite
- After moving to Next.js, files will be nested deeper: `app/(dashboard)/soundcloud/soundcloud-app/`
- Relative imports will break: `../../../` depth changes

**Solution**: Run automated import path fixer script

---

### 🟢 LOW - Environment Variables
**Impact**: 3 files

**Current Usage** (Minimal):
```typescript
// Only in serviceWorker.ts
process.env.NODE_ENV
process.env.PUBLIC_URL
process.env.REACT_APP_VAPID_PUBLIC_KEY
```

**Solution**: 
- Map to Next.js equivalents
- Most env vars are hardcoded in client.ts (already covered above)

---

### 🟢 LOW - PWA/Service Worker
**Impact**: 2 files

**Files**:
- `src/utils/serviceWorker.ts`
- `public/sw.js`

**Decision**: 
- [ ] Keep PWA functionality? (May need adjustments for Next.js)
- [ ] Remove PWA functionality? (Simplify integration)

---

## ✅ What WON'T Break (Compatible)

### ✅ UI Components
- All Radix UI components match our shadcn-ui setup
- No migration needed

### ✅ React Query
- We already use @tanstack/react-query
- QueryClient setup compatible

### ✅ Hooks
- All custom hooks will work (except those using React Router)
- 20+ custom hooks for various features

### ✅ TypeScript
- Fully typed
- No JS migration needed

### ✅ Utilities
- All utility functions compatible
- No breaking changes

### ✅ Styling
- Tailwind CSS (same configuration)
- CSS variables for theming (compatible)

---

## 📋 Database Dependencies

### Tables Queried (Need to Verify in Unified Dashboard)
1. **`user_roles`** - Used for admin/moderator role checks
2. **`members`** - Core member data table
3. **`campaigns`** - Campaign data (likely exists)
4. **`submissions`** - Track submissions (likely exists)
5. **`queue_assignments`** - Queue management
6. **Other tables** - ~30+ tables in supabase/migrations/

**Action Required**: 
- Check if these tables exist in unified dashboard Supabase
- If not, consider whether to:
  - [ ] Import tables from artist-spark
  - [ ] Mock the data for SoundCloud section
  - [ ] Use metadata-only (no database queries)

---

## 🗺️ Routing Structure (Needs Migration)

### Current Routes (React Router)
```
/                          → AuthenticatedRedirect (auto-redirect)
/auth                      → Login page
/preview                   → PreviewTool (public)
/submit                    → PublicMemberSubmissionForm (public)
/unauthorized              → UnauthorizedPage

/dashboard                 → Admin/Moderator only
  ├── /                    → UnifiedOverview
  ├── /planner             → PlannerPage
  ├── /campaigns           → CampaignsPage
  ├── /queue               → QueuePage
  ├── /members             → MembersPage
  ├── /health              → HealthPage
  ├── /automation          → AutomationPage
  ├── /genres              → GenresPage
  ├── /settings            → SettingsPage
  └── /analytics/*         → 8 analytics sub-routes

/portal                    → Members only
  ├── /                    → MemberDashboard
  ├── /queue               → MemberQueue
  ├── /submit              → SubmitTrack
  ├── /submit-advanced     → AdvancedSubmitTrack
  ├── /history             → MemberHistory
  ├── /credits             → CreditSystem
  ├── /analytics           → MemberAnalytics
  ├── /performance         → PerformanceAnalytics
  ├── /attribution         → AttributionDashboard
  ├── /avoid-list          → AvoidListManager
  └── /profile             → MemberProfile
```

### Target Routes (Next.js)
```
All routes will be prefixed with /soundcloud/

/soundcloud                      → Main dashboard
/soundcloud/dashboard            → Admin section
/soundcloud/dashboard/planner    → etc.
/soundcloud/portal               → Member section
/soundcloud/portal/submit        → etc.
```

---

## 🎯 Integration Strategy

### Phase 0: Pre-Flight (DONE ✅)
- [x] Clone repo to temp location
- [x] Analyze structure
- [x] Identify breaking changes
- [x] Document dependencies

### Phase 1: Setup (30 min)
- [ ] Create automation scripts
- [ ] Create directory structure
- [ ] Copy files to Next.js structure

### Phase 2: Automated Fixes (15 min)
- [ ] Fix Supabase client (env vars)
- [ ] Run import path fixer
- [ ] Test build (expect 50% errors fixed)

### Phase 3: Auth Migration (20 min) ⚠️ CRITICAL
- [ ] Migrate AuthContext to metadata-only
- [ ] Remove user_roles query
- [ ] Remove members query
- [ ] Use user.user_metadata for everything

### Phase 4: Router Migration (45 min)
- [ ] Find all React Router files (~60 files)
- [ ] Run automated migration script
- [ ] Manually fix remaining 20% (NavLink, complex navigate())
- [ ] Add /soundcloud/ prefix to all routes

### Phase 5: Testing (30 min)
- [ ] Build test
- [ ] Dev server test
- [ ] Functional testing (all routes)
- [ ] Console error check

---

## 🚨 Critical Decisions Needed

### 1. Database Tables
**Question**: Does unified dashboard have these tables?
- `user_roles`
- `members`
- `campaigns`
- `submissions`
- `queue_assignments`

**Options**:
- A) Use metadata-only (no DB queries) → **RECOMMENDED**
- B) Import tables from artist-spark
- C) Mock the data

### 2. Authentication Approach
**Recommendation**: Use metadata-only pattern from YouTube/Instagram success

**Why**:
- ✅ No database dependencies
- ✅ No RLS issues
- ✅ Works immediately
- ✅ Matches unified dashboard pattern

### 3. Supabase Instance
**Question**: Should SoundCloud section use:
- A) Unified dashboard's Supabase → **RECOMMENDED**
- B) Artist-spark's Supabase (separate)

**Recommendation**: Use unified dashboard's Supabase for consistency

---

## 📈 Complexity Assessment

### High Complexity (Most Effort)
1. **Router Migration** - 60+ files need migration
2. **Auth Context Overhaul** - Critical for functionality

### Medium Complexity
3. **Import Path Fixes** - Automated script handles most
4. **Supabase Client Config** - Straightforward replacement

### Low Complexity
5. **Environment Variables** - Minimal usage
6. **Testing** - Standard process

---

## ⏱️ Time Estimate

**With Automation & Guide**: 2.5-3 hours
- Pre-flight analysis: 30 min ✅ (DONE)
- Setup + automation scripts: 30 min
- Automated fixes: 15 min
- Auth migration: 20 min
- Router migration: 45 min
- Testing: 30 min

**Without Guide**: 10+ hours (based on YouTube experience)

**Time Saved**: ~7 hours 🚀

---

## ✅ Next Steps

1. **Create automation scripts** (import fixer, router migration, env mapper)
2. **Set up directory structure** in apps/frontend
3. **Copy source files** to new location
4. **Execute phased migration** following the guide
5. **Test thoroughly** at each phase

---

**Status**: Analysis Complete ✅  
**Ready for**: Phase 1 (Setup & Structure)


