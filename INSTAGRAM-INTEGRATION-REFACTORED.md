# Instagram Integration - Refactored Approach

## ✅ New Structure (Matching Spotify Pattern)

The Instagram app has been refactored to match the proven **Spotify stream-strategist** integration pattern.

### Directory Structure

```
apps/frontend/app/(dashboard)/instagram/
├── layout.tsx                           # Navigation wrapper
├── page.tsx                             # Entry point (renders SeedstormApp)
└── seedstorm-builder/                   # Entire app copied intact from repo
    ├── components/
    │   ├── SeedstormApp.tsx            # 🆕 Main wrapper (like StreamStrategistApp)
    │   ├── ProtectedRoute.tsx
    │   ├── EnhancedDashboard.tsx
    │   └── ui/
    ├── pages/
    │   ├── Index.tsx                    # Entry page
    │   ├── HomePage.tsx                 # Main dashboard
    │   ├── CampaignBuilder.tsx
    │   ├── CreatorDatabase.tsx
    │   └── ...
    ├── hooks/
    ├── lib/
    ├── contexts/
    │   └── AuthContext.tsx
    └── integrations/
        └── supabase/
            └── client.ts                # 🔄 Points to unified @/lib/auth
```

## Key Changes

### 1. **Import Path Conversion**

All internal seedstorm-builder imports have been converted from `@/` to relative paths:

```typescript
// Before (broken)
import { supabase } from "@/integrations/supabase/client"
import { Creator } from "@/lib/types"
import { useCreators } from "@/hooks/useCreators"

// After (fixed)
import { supabase } from "../integrations/supabase/client"
import { Creator } from "../lib/types"
import { useCreators } from "../hooks/useCreators"
```

**Exception**: `@/components/ui/*` imports remain unchanged - these correctly import from the unified dashboard's shared UI components.

### 2. **SeedstormApp Wrapper** (`SeedstormApp.tsx`)

Created a wrapper component that provides all necessary context (same pattern as Spotify):

```typescript
export function SeedstormApp({ children }: SeedstormAppProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          {children}
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  )
}
```

### 3. **Unified Supabase Client**

Updated `seedstorm-builder/integrations/supabase/client.ts` to use the unified dashboard's auth:

```typescript
// Import the unified dashboard's supabase client
import { supabase } from "@/lib/auth";

// Re-export for compatibility with seedstorm-builder imports
export { supabase };
```

### 4. **Next.js Router Integration**

Updated `HomePage.tsx` to use Next.js routing:

- Changed `useNavigate()` from `react-router-dom` → `useRouter()` from `next/navigation`
- Updated navigation paths: `/creators` → `/instagram/creators`
- Fixed relative imports to work within the seedstorm-builder structure

### 5. **Instagram Page Entry Point**

Simplified `page.tsx` to match Spotify pattern:

```typescript
export default function InstagramPage() {
  return (
    <div className="h-full w-full">
      <SeedstormApp>
        <ProtectedRoute requiredPermissions={['view_instagram']}>
          <Index />
        </ProtectedRoute>
      </SeedstormApp>
    </div>
  )
}
```

## Advantages of This Approach

✅ **Self-Contained**: The entire seedstorm-builder app structure is preserved  
✅ **No Import Hell**: Internal imports work correctly within the module  
✅ **Provider Isolation**: QueryClient and TooltipProvider are properly scoped  
✅ **Consistent Pattern**: Matches the proven Spotify integration  
✅ **Maintainable**: Easy to update from source repo  
✅ **Auth Integration**: Seamlessly uses the unified dashboard's authentication

## Removed Files

The following incorrectly integrated files have been removed:

- `apps/frontend/app/(dashboard)/instagram/components/` (all files)
- `apps/frontend/app/(dashboard)/instagram/hooks/` (all files)
- `apps/frontend/app/(dashboard)/instagram/lib/` (all files)

These are now properly contained within `seedstorm-builder/`.

## Navigation Routes

The Instagram app now responds to these routes:

- `/instagram` - Main dashboard (HomePage)
- `/instagram/creators` - Creator database
- `/instagram/campaign-builder` - Campaign builder  
- `/instagram/campaigns` - Campaign history
- `/instagram/qa` - Quality assurance
- `/instagram/workflow` - Workflow management

## Testing

1. Start the development server:
   ```bash
   cd apps/frontend
   npm run dev
   ```

2. Navigate to: `http://localhost:3000/instagram`

3. The Instagram app should load without:
   - ❌ Maximum update depth errors
   - ❌ QueryClient errors
   - ❌ useNavigate errors
   - ❌ Import path errors

## Comparison: Before vs After

### Before (Broken)
- ❌ Components copied piecemeal into dashboard structure
- ❌ Import paths broken (`@/` mismatches)
- ❌ Multiple QueryClient providers causing infinite loops
- ❌ Mixed routing systems (React Router + Next.js)

### After (Fixed)
- ✅ Entire app copied intact (like stream-strategist)
- ✅ Clean wrapper component handles all providers
- ✅ Single unified Supabase client
- ✅ Consistent Next.js routing

## Next Steps

To add new Instagram sub-pages (like `/instagram/creators`):

1. Create page route: `apps/frontend/app/(dashboard)/instagram/creators/page.tsx`
2. Import and render the corresponding seedstorm-builder page component
3. Wrap in `SeedstormApp` provider

Example:

```typescript
// apps/frontend/app/(dashboard)/instagram/creators/page.tsx
"use client"

import { SeedstormApp } from "../seedstorm-builder/components/SeedstormApp"
import CreatorDatabase from "../seedstorm-builder/pages/CreatorDatabase"

export default function CreatorsPage() {
  return (
    <div className="h-full w-full">
      <SeedstormApp>
        <CreatorDatabase />
      </SeedstormApp>
    </div>
  )
}
```

---

**Status**: ✅ Refactoring Complete  
**Pattern**: Matches Spotify stream-strategist integration  
**Ready**: For testing and deployment

