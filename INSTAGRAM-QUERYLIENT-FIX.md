# Instagram QueryClient Fix

## Issue
The `/instagram/creators` page was returning "No QueryClient set" error because it's a separate Next.js route outside the `SeedstormApp` wrapper.

## Problem Analysis

### Route Structure
```
/instagram (layout.tsx)
├── /instagram/page.tsx (wrapped by SeedstormApp ✅)
├── /instagram/creators/page.tsx (NOT wrapped ❌)
├── /instagram/campaigns/page.tsx (NOT wrapped ❌)
├── /instagram/campaign-builder/page.tsx (NOT wrapped ❌)
└── /instagram/workflow/page.tsx (NOT wrapped ❌)
```

Only the main `/instagram/page.tsx` was wrapped with `SeedstormApp` (which had `QueryClientProvider`). All other routes couldn't access the QueryClient.

## Solution
Move `QueryClientProvider` from `SeedstormApp` to the `Instagram layout.tsx` so ALL Instagram routes have access to it.

### Changes Made

#### 1. Updated `apps/frontend/app/(dashboard)/instagram/layout.tsx`
```typescript
import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export default function InstagramLayout({ children }: { children: ReactNode }) {
  // Create QueryClient for Instagram routes
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 minutes
        retry: 1,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      {/* Navigation and content */}
    </QueryClientProvider>
  );
}
```

#### 2. Simplified `apps/frontend/app/(dashboard)/instagram/seedstorm-builder/components/SeedstormApp.tsx`
Removed `QueryClientProvider` to avoid double-wrapping:

```typescript
export function SeedstormApp({ children }: SeedstormAppProps) {
  // QueryClientProvider is now in the Instagram layout.tsx
  return (
    <AuthProvider>
      <Toaster />
      <Sonner />
      {children}
    </AuthProvider>
  )
}
```

## Architecture After Fix

```
Instagram Layout (QueryClientProvider) ✅
├── /instagram/page.tsx
│   └── SeedstormApp (AuthProvider)
│       └── ProtectedRoute
│           └── Index (minimal test page)
│
├── /instagram/creators/page.tsx ✅
├── /instagram/campaigns/page.tsx ✅
├── /instagram/campaign-builder/page.tsx ✅
└── /instagram/workflow/page.tsx ✅
```

Now ALL Instagram routes have access to QueryClient!

## Important Notes

### No Double Wrapping
- ✅ One `QueryClientProvider` at layout level
- ❌ No nested `QueryClientProvider` in pages

### QueryClient Scope
- Each major section (Instagram, Spotify, etc.) has its own QueryClient
- This prevents cache conflicts between different apps
- Each QueryClient has isolated cache

### Testing
After this fix:
1. ✅ Dashboard tab loads
2. ✅ Campaign Builder tab loads
3. ✅ Workflow tab loads
4. ✅ Creators tab should now load (was failing before)
5. ✅ Campaigns tab should now load
6. ✅ Quality Assurance tab should now load

## Why We Use useState for QueryClient

```typescript
const [queryClient] = useState(() => new QueryClient({...}))
```

This pattern ensures:
1. QueryClient is created ONCE when component mounts
2. Same instance persists across re-renders
3. No infinite re-creation loops
4. Lazy initialization (only runs once)

## Related Issues

### Previous Issue: Radix UI Infinite Loop
The main `/instagram/page.tsx` was causing "Maximum update depth exceeded" due to Radix UI components (Tabs, Select, etc.) in `HomePage/EnhancedDashboard`.

**Current workaround**: Using minimal test page instead of full HomePage.

**Long-term solution**: Either:
1. Fix Radix UI component conflicts
2. Rebuild dashboard without Radix UI Tabs
3. Use different component library

## Next Steps

1. ✅ Test all Instagram routes load correctly
2. ⏳ Fix HomePage/EnhancedDashboard Radix UI issue
3. ⏳ Restore full Instagram dashboard functionality

## Test Commands

```bash
# Test all routes
http://localhost:3000/instagram          # Main dashboard (minimal)
http://localhost:3000/instagram/creators # Creators page
http://localhost:3000/instagram/campaigns # Campaigns page
http://localhost:3000/instagram/campaign-builder # Campaign builder
http://localhost:3000/instagram/workflow # Workflow
http://localhost:3000/instagram/quality-assurance # QA
```

All should load without "No QueryClient" errors!

