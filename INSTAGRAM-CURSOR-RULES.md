# Instagram App - Cursor Rules for AI Agents

**Last Updated**: 2025-11-07  
**Status**: Phase 1 Complete - Production Deployed  
**Commit**: `790a2b9`

> **📖 For complete onboarding**: Read `INSTAGRAM-APP-ONBOARDING.md` first!  
> This file contains specific rules and patterns for working with the Instagram app.

---

## 🚨 CRITICAL - Never Use These Components

### Radix UI Tabs, Select, Tooltip → Infinite Loops in Next.js App Router

```typescript
// ❌ FORBIDDEN - Will cause "Maximum update depth exceeded"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import { Select, SelectTrigger, SelectContent, SelectItem } from "./ui/select";
import { Tooltip, TooltipTrigger, TooltipContent } from "./ui/tooltip";

// ✅ ALLOWED - Use these instead
// For tabs: State-based tabs with buttons
const [activeTab, setActiveTab] = useState('overview');
<Button onClick={() => setActiveTab('overview')}>Overview</Button>
{activeTab === 'overview' && <OverviewContent />}

// For select: Native HTML select
<select value={value} onChange={(e) => setValue(e.target.value)}>
  <option value="us">United States</option>
</select>

// For tooltip: Native title attribute
<div title="Tooltip text">Hover me</div>
```

**Reason**: Radix UI uses `forwardRef` and ref composition which conflicts with Next.js App Router's reconciliation process.

**Files Already Fixed**:
- ✅ `EnhancedDashboard.tsx` - Tabs
- ✅ `CreatorScoring.tsx` - Select
- ✅ `CampaignManagementDashboard.tsx` - Select

**Files Remaining (16)**: Fix incrementally in Phase 2

---

## ✅ Required Code Patterns

### 1. React Query - ALWAYS Use Data Directly

```typescript
// ✅ CORRECT - Use React Query data directly
const { data: creators = [] } = useQuery<Creator[]>({
  queryKey: ['creators'],
  queryFn: async () => {
    const { data, error } = await supabase.rpc('get_public_creators');
    if (error) throw error;
    return data || [];
  },
  staleTime: 1000 * 60 * 5,        // 5 minutes - CRITICAL for stability
  refetchOnWindowFocus: false,      // CRITICAL - prevents infinite loops
});

// Compute derived state with useMemo
const stats = useMemo(() => ({
  total: creators.length,
  active: creators.filter(c => c.verified).length
}), [creators]);

// ❌ WRONG - Don't duplicate React Query data in state
const { data: creatorsData } = useQuery(...);
const [creators, setCreators] = useState([]);
useEffect(() => setCreators(creatorsData), [creatorsData]); // INFINITE LOOP!
```

**Why This Matters**: React Query returns new array references on every render, even if data hasn't changed. Duplicating to state triggers infinite `useEffect` loops.

---

### 2. Memoization - ALWAYS Required

```typescript
// ✅ CORRECT - Memoize callbacks
const handleClick = useCallback(() => {
  setOpen(true);
}, []);

// ✅ CORRECT - Memoize computed values
const filteredItems = useMemo(() => 
  items.filter(item => item.active), 
  [items]
);

// ✅ CORRECT - Memoize arrays/objects in useEffect
const shortcuts = useMemo(() => [
  { key: 'k', ctrl: true, action: openSearch }
], [openSearch]);

useEffect(() => {
  // Register shortcuts...
}, [shortcuts]); // Now stable

// ❌ WRONG - Unstable dependencies
useEffect(() => {
  const config = { key: 'value' }; // New object every render
  // Use config...
}, [config]); // INFINITE LOOP!
```

---

### 3. Navigation - Next.js Router Pattern

```typescript
import { useRouter } from 'next/navigation';

const router = useRouter();

// ✅ CORRECT - Always include /instagram prefix
router.push('/instagram/creators');

// ✅ CORRECT - Use query params for state
router.push('/instagram/creators?filter=verified&territory=us');

// ❌ WRONG - React Router (not available)
import { useNavigate } from 'react-router-dom'; // Don't import this!
navigate('/creators', { state: { filter: 'verified' } }); // Doesn't work!
```

---

### 4. Import Paths - Strict Pattern

```typescript
// ✅ CORRECT - Shared UI components (absolute path)
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

// ✅ CORRECT - Instagram internal components (relative path)
import { CreatorCard } from "../components/CreatorCard";
import { useCreators } from "../hooks/useCreators";
import { Creator } from "../lib/types";

// ❌ WRONG - Don't mix patterns
import { CreatorCard } from "@/instagram/components/CreatorCard";
import { useCreators } from "@/app/(dashboard)/instagram/hooks/useCreators";
```

---

### 5. 'use client' Directive

```typescript
// ✅ CORRECT - Always at the very top
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export default function MyComponent() { ... }

// ❌ WRONG - After imports
import { useState } from 'react';
'use client'; // Error: directive must be at top

// ❌ WRONG - Missing directive
import { useState } from 'react'; // Error: useState not available in server components
```

---

### 6. QueryClient Initialization

```typescript
// ❌ WRONG - Creates new QueryClient every render
function Layout() {
  const queryClient = new QueryClient();
  return <QueryClientProvider client={queryClient}>...</QueryClientProvider>;
}

// ✅ CORRECT - Initialize once with useState
function Layout() {
  const [queryClient] = useState(() => new QueryClient());
  return <QueryClientProvider client={queryClient}>...</QueryClientProvider>;
}
```

---

### 7. Layout Structure

```typescript
// ❌ WRONG - Blocks main navigation
export default function InstagramLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col">
      <nav>Instagram Nav</nav>
      <div className="flex-1">{children}</div>
    </div>
  );
}

// ✅ CORRECT - Simple sub-navigation bar
export default function InstagramLayout({ children }) {
  return (
    <>
      <div className="border-b">
        <nav className="flex space-x-4 px-6 py-3">Instagram Tabs</nav>
      </div>
      {children}
    </>
  );
}
```

---

## 📚 Database Patterns

### Multi-Tenancy (CRITICAL)

**ALWAYS filter by org_id**:

```typescript
// ✅ CORRECT - Uses RPC with built-in org filtering
const { data } = await supabase.rpc('get_public_creators');

// ✅ CORRECT - Manual query with org_id
const { data } = await supabase
  .from('creators')
  .select('*')
  .eq('org_id', userOrgId);

// ❌ WRONG - No org_id filter (security risk!)
const { data } = await supabase
  .from('creators')
  .select('*'); // Returns all organizations' data!
```

### Array Types (PostgreSQL text[] ↔ TypeScript string[])

```typescript
// Database stores genres as text[]
// TypeScript expects string[]

// ✅ CORRECT - Types match
const creator: Creator = {
  genres: ['pop', 'rock'] // string[]
};

// When inserting from JSON to PostgreSQL:
// ✅ CORRECT
genres = ARRAY(SELECT jsonb_array_elements_text('["pop", "rock"]'::jsonb))

// ❌ WRONG - Type mismatch
genres = '["pop", "rock"]'::jsonb
```

### Query Invalidation

```typescript
// ALWAYS invalidate related queries after mutations
const createCreator = useMutation({
  mutationFn: async (newCreator) => { ... },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['creators'] });
    queryClient.invalidateQueries({ queryKey: ['creator-stats'] });
  }
});
```

---

## 🐛 Debugging Infinite Loops

If you see **"Maximum update depth exceeded"**:

### Checklist

1. ✅ **Check Radix UI components** → Replace Tabs/Select/Tooltip
2. ✅ **Check React Query duplication** → Use data directly
3. ✅ **Check callback memoization** → Add `useCallback`
4. ✅ **Check computed memoization** → Add `useMemo`
5. ✅ **Check useEffect dependencies** → Memoize arrays/objects

### Debug Pattern

```typescript
// Add to component to log every render
useEffect(() => {
  console.log('Component rendered', { creators, campaigns });
});
```

### Common Causes

| Issue | Fix |
|-------|-----|
| Radix UI Tabs/Select | Replace with native elements or state-based |
| React Query → useState | Use React Query data directly |
| Unmemoized callbacks | Wrap with `useCallback` |
| Unmemoized computed values | Wrap with `useMemo` |
| Unstable useEffect dependencies | Memoize arrays/objects |
| New QueryClient every render | Use `useState(() => new QueryClient())` |

---

## 📁 File Locations

### Core Files (Most Important)

```
apps/frontend/app/(dashboard)/instagram/
├── layout.tsx                              # QueryClient provider, sub-nav
├── page.tsx                                # Entry point
│
└── seedstorm-builder/
    ├── components/
    │   ├── EnhancedDashboard.tsx          # ✅ FIXED - State-based tabs
    │   ├── CreatorScoring.tsx             # ✅ FIXED - Native select
    │   ├── CampaignManagementDashboard.tsx # ✅ FIXED - Native select
    │   ├── CampaignBuilder.tsx            # ⚠️ TODO - Has Radix Select
    │   ├── QualityAssurance.tsx           # ⚠️ TODO - Has Radix Select
    │   └── WorkflowManager.tsx            # ⚠️ TODO - Has Radix Select
    │
    ├── pages/
    │   ├── Index.tsx                       # Dashboard wrapper
    │   ├── HomePage.tsx                    # ✅ FIXED - Main dashboard
    │   ├── CreatorDatabase.tsx             # Creator list
    │   └── CampaignHistory.tsx             # Campaign list
    │
    ├── hooks/
    │   ├── useKeyboardShortcuts.ts         # ✅ FIXED - Memoized
    │   └── useCreators.ts                  # Creator data fetching
    │
    └── integrations/supabase/
        └── client.ts                       # Supabase instance
```

---

## 🧪 Testing Commands

### Dev Server
```bash
cd apps/frontend
pnpm run dev
# Access: http://localhost:3000/instagram
```

### Production Build
```bash
cd apps/frontend
pnpm run build
# Should see: ✓ Compiled successfully (42 pages)
```

### Common Console Warnings (Safe to Ignore)

1. **"Multiple GoTrueClient instances detected"**
   - Expected: Supabase client initialized in multiple contexts
   - No action needed

2. **"404 (Not Found) for get_public_creators"**
   - Means: RPC function not deployed
   - Fix: Run database migration

3. **"406 (Not Acceptable) for profiles"**
   - Means: RLS policy issue or missing profile
   - Fix: Check user profile exists in database

4. **"ERR_CONNECTION_REFUSED for auth/permissions"**
   - Means: Backend auth service not running
   - Fix: Start auth service or mock permissions

---

## 📖 Documentation

**For complete onboarding**: `INSTAGRAM-APP-ONBOARDING.md` (25,000+ words)

**For specific issues**:
- `INSTAGRAM-TABS-FIX.md` - Radix UI Tabs solution
- `INSTAGRAM-SELECT-FIX.md` - Radix UI Select solution
- `INSTAGRAM-USEEFFECT-FIX.md` - useEffect memoization
- `INSTAGRAM-INFINITE-LOOP-FINAL-FIX.md` - HomePage fix
- `INSTAGRAM-NAVIGATION-FIX.md` - Layout simplification
- `INSTAGRAM-DEV-SERVER-READY.md` - Dev server status
- `APP-IMPORT-GUIDE.md` - Future integration guide
- `INSTAGRAM-PHASE1-COMPLETE.md` - Phase 1 summary

---

## 🎯 Quick Reference

### Component Structure Template

```typescript
'use client'; // ALWAYS at the very top for client components

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../integrations/supabase/client';

export default function MyComponent() {
  const router = useRouter();
  
  // 1. Data fetching (React Query)
  const { data: items = [] } = useQuery({
    queryKey: ['items'],
    queryFn: async () => {
      const { data, error } = await supabase.from('items').select('*');
      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });
  
  // 2. Local state
  const [isOpen, setIsOpen] = useState(false);
  
  // 3. Computed values (memoized)
  const filteredItems = useMemo(() => 
    items.filter(item => item.active), 
    [items]
  );
  
  // 4. Callbacks (memoized)
  const handleClick = useCallback(() => {
    setIsOpen(true);
  }, []);
  
  const handleNavigate = useCallback(() => {
    router.push('/instagram/other-page');
  }, [router]);
  
  // 5. Render
  return (
    <div>
      <Button onClick={handleClick}>Open</Button>
      {filteredItems.map(item => (
        <div key={item.id}>{item.name}</div>
      ))}
    </div>
  );
}
```

---

## 🚀 Production Status

**Deployed**: ✅ Production (Vercel)  
**Commit**: `790a2b9`  
**Routes**: 6 (Dashboard, Creators, Campaigns, Campaign Builder, QA, Workflow)  
**Status**: Phase 1 Complete - All tabs loading, navigation working, no infinite loops

**Phase 2 Remaining**:
- Fix 16 Radix Select components (incremental)
- Test CRUD operations
- Verify UI/UX parity
- Verify database schema

---

## ✅ Quick Checklist Before Making Changes

- [ ] Is this a client component? Add `'use client'` at the top
- [ ] Using React Query? Use data directly, don't duplicate in state
- [ ] Using `useEffect`? Memoize all dependencies
- [ ] Passing callbacks to hooks? Wrap with `useCallback`
- [ ] Computing derived values? Wrap with `useMemo`
- [ ] Need tabs? Use state-based, not Radix UI Tabs
- [ ] Need dropdown? Use native `<select>`, not Radix UI Select
- [ ] Need tooltip? Use native `title` attribute
- [ ] Navigating? Use `router.push('/instagram/...')`
- [ ] Importing shared UI? Use `@/components/ui/*`
- [ ] Importing Instagram internal? Use relative paths `../components/*`

---

**Last Updated**: 2025-11-07  
**Author**: AI Assistant  
**Status**: Phase 1 Complete ✅

