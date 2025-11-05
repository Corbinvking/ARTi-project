# Instagram Integration - React Query Fix

## Issue: No QueryClient Set

**Error Message:**
```
Unhandled Runtime Error
Error: No QueryClient set, use QueryClientProvider to set one

Source: app\(dashboard)\instagram\page.tsx (30:48)
```

## Root Cause

The Instagram pages use React Query's `useQuery` hook to fetch data from Supabase, but there was no `QueryClientProvider` wrapping the Instagram app.

### Why This Happened

When we copied the Instagram components from the seedstorm-builder repo, they were designed to work with their own `QueryClient` setup in their `App.tsx`. However, in our Next.js structure, we needed to provide the `QueryClient` at the layout level.

## Solution

Added `QueryClientProvider` to the Instagram layout so all Instagram pages have access to React Query.

### Changes Made

**File:** `apps/frontend/app/(dashboard)/instagram/layout.tsx`

```typescript
// Added imports
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Created QueryClient instance
const queryClient = new QueryClient();

// Wrapped children with QueryClientProvider
export default function InstagramLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex min-h-screen flex-col">
        {/* Navigation and content */}
        {children}
      </div>
    </QueryClientProvider>
  );
}
```

## Why This Works

1. **Layout-level Provider**: By adding `QueryClientProvider` to the Instagram layout, all pages nested under `/instagram` automatically have access to React Query.

2. **Separate QueryClient**: Each Instagram page gets its own `QueryClient` instance, isolated from other parts of the app (like Spotify stream-strategist which has its own).

3. **Follows Next.js Patterns**: This is the recommended way to add providers in Next.js App Router - at the layout level for the section that needs them.

## Pages That Use useQuery

The following Instagram pages now work correctly:

1. **`page.tsx` (Dashboard)**
   - Fetches creators: `useQuery(['instagram-creators'])`
   - Fetches campaigns: `useQuery(['instagram-campaigns'])`

2. **`creators/page.tsx`**
   - Fetches creators: `useQuery(['instagram-creators'])`

3. **`campaigns/page.tsx`**
   - Fetches campaigns: `useQuery(['instagram-campaigns'])`

All other pages and components that use `useQuery` will also work.

## Testing

**Run:**
```bash
npm run dev
```

**Visit:**
```
http://localhost:3000/instagram
```

**Expected:**
- ✅ No React Query errors
- ✅ Data fetches work
- ✅ Dashboard displays creators and campaigns
- ✅ All pages load successfully

## QueryClient Configuration

Currently using default configuration:
```typescript
const queryClient = new QueryClient();
```

### Optional: Advanced Configuration

If you want to customize React Query behavior, you can add options:

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      cacheTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
```

## Related Files

- **Layout**: `apps/frontend/app/(dashboard)/instagram/layout.tsx` ✅
- **Main Page**: `apps/frontend/app/(dashboard)/instagram/page.tsx`
- **Creators**: `apps/frontend/app/(dashboard)/instagram/creators/page.tsx`
- **Campaigns**: `apps/frontend/app/(dashboard)/instagram/campaigns/page.tsx`

## Comparison with Other Apps

**Spotify Stream-Strategist:**
- Has its own `QueryClientProvider` in `App.tsx`
- Uses React Router (SPA approach)

**Instagram Manager:**
- Has `QueryClientProvider` in `layout.tsx`
- Uses Next.js App Router (Server Components + Client Components)

Both approaches work, but Instagram's is more Next.js-idiomatic.

---

**Status**: ✅ Fixed  
**Date**: November 4, 2025  
**Issue**: React Query provider missing  
**Solution**: Added QueryClientProvider to Instagram layout

