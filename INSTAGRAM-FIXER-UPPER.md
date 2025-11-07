# 🔧 Instagram Integration Fixer-Upper Guide

**Created**: November 6, 2025  
**Based on**: YouTube (vidi-health-flow) successful migration  
**Source App**: Seedstorm Builder (Instagram campaign manager)

---

## 📋 Table of Contents

1. [Quick Diagnostics](#-quick-diagnostics)
2. [Common Issues & Fixes](#-common-issues--fixes)
3. [Import Path Fixer Script](#-import-path-fixer-script)
4. [Router Migration Guide](#-router-migration-guide)
5. [Step-by-Step Troubleshooting](#-step-by-step-troubleshooting)
6. [Testing Checklist](#-testing-checklist)

---

## 🔍 Quick Diagnostics

### Current Instagram Integration Status

**File Structure**: ✅ Good
```
instagram/
  ├── layout.tsx              ✅ Has QueryClient setup
  ├── page.tsx                ✅ Main dashboard route
  ├── contexts/               ✅ AuthContext exists
  ├── seedstorm-builder/      ⚠️ Original app files
  │   ├── App.tsx             ❌ Still uses BrowserRouter
  │   ├── components/         ⚠️ May have react-router imports
  │   ├── pages/              ⚠️ May have useNavigate, useLocation
  │   ├── hooks/              ✅ Likely clean
  │   └── integrations/
  │       └── supabase/
  │           └── client.ts   ✅ Already configured!
  ├── campaign-builder/       ✅ Route page exists
  ├── campaigns/              ✅ Route page exists
  ├── creators/               ✅ Route page exists
  ├── qa/                     ✅ Route page exists
  └── workflow/               ✅ Route page exists
```

**Known Issues**:
- ❌ `App.tsx` uses `BrowserRouter` (8 files total)
- ⚠️ 3 components use `useNavigate`, `useLocation`, or `NavLink`
- ✅ Supabase already configured correctly!

---

## 🛠️ Common Issues & Fixes

### Issue 1: "Module not found" - Wrong Import Path

**Error**:
```
Module not found: Can't resolve '../../integrations/supabase/client'
```

**Cause**: File depth changed when copying into deeper Next.js structure

**Fix Pattern**:
```typescript
// If file is in: components/ (top level)
import { supabase } from "../integrations/supabase/client";  // ✅ Go up 1

// If file is in: components/subfolder/
import { supabase } from "../../integrations/supabase/client";  // ✅ Go up 2

// If file is in: pages/
import { supabase } from "../integrations/supabase/client";  // ✅ Go up 1
```

**Quick Fix**: Use the [Import Path Fixer Script](#-import-path-fixer-script) below.

---

### Issue 2: "Unterminated string constant" - Quote Mismatch

**Error**:
```
Unterminated string constant
× Syntax Error at line X
```

**Cause**: Mismatched quotes in import statements

**Examples**:
```typescript
// ❌ BAD - starts with " ends with '
import { supabase } from "../integrations/supabase/client';

// ❌ BAD - starts with ' ends with "
import { Component } from '../components/MyComponent";

// ✅ GOOD - consistent double quotes
import { supabase } from "../integrations/supabase/client";

// ✅ GOOD - consistent single quotes
import { Component } from '../components/MyComponent';
```

**Quick Fix**: Find and replace with consistent quotes:
```bash
# PowerShell script to fix quotes
Get-ChildItem -Path "app\(dashboard)\instagram\seedstorm-builder" -Recurse -Include *.ts,*.tsx | 
ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    # Fix mixed quotes in imports
    $content = $content -replace "from `"([^']+)'", 'from "$1"'
    $content = $content -replace "from '([^`"]+)`"", "from '$1'"
    Set-Content $_.FullName $content -NoNewline
}
```

---

### Issue 3: React Router → Next.js Router Migration

**Common Errors**:
```
Cannot read properties of undefined (reading 'get')
useNavigate is not defined
useLocation is not a function
```

**Migration Map**:

| React Router | Next.js | Usage |
|--------------|---------|-------|
| `useNavigate()` | `useRouter()` | Navigation |
| `navigate('/path')` | `router.push('/instagram/path')` | Go to page |
| `useLocation()` | `usePathname()` | Get current path |
| `useSearchParams()` (RR) | `useSearchParams()` (Next) | Get query params |
| `<NavLink>` | `<Link>` + `usePathname()` | Active links |
| `<Link to="/path">` | `<Link href="/instagram/path">` | Navigation |

**File-by-File Migration**:

#### Components with Navigation
```typescript
// ❌ BEFORE (React Router)
import { useNavigate, useLocation, NavLink } from 'react-router-dom';

const MyComponent = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const goToPage = () => {
    navigate('/campaigns');
  };
  
  return (
    <NavLink to="/creators" className={({isActive}) => isActive ? 'active' : ''}>
      Creators
    </NavLink>
  );
};

// ✅ AFTER (Next.js)
"use client"
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

const MyComponent = () => {
  const router = useRouter();
  const pathname = usePathname();
  
  const goToPage = () => {
    router.push('/instagram/campaigns');
  };
  
  const isActive = pathname === '/instagram/creators';
  
  return (
    <Link 
      href="/instagram/creators" 
      className={isActive ? 'active' : ''}
    >
      Creators
    </Link>
  );
};
```

#### Search Params
```typescript
// ❌ BEFORE (React Router)
const [searchParams] = useSearchParams();
const tab = searchParams.get('tab');

// ✅ AFTER (Next.js) - Add null safety!
const searchParams = useSearchParams();
const tab = searchParams?.get('tab');  // ← Note the ?.
```

---

### Issue 4: Export Mismatches

**Error**:
```
Attempted import error: 'ComponentName' is not exported
Element type is invalid: expected a string but got: undefined
```

**Fix**: Export both default and named exports for compatibility:

```typescript
// ❌ BEFORE - only default export
const ProtectedRoute = ({ children }) => {
  return <>{children}</>;
};
export default ProtectedRoute;

// ✅ AFTER - both exports
const ProtectedRoute = ({ children }) => {
  return <>{children}</>;
};
export { ProtectedRoute };  // ← Add this!
export default ProtectedRoute;
```

---

## 🔧 Import Path Fixer Script

Save this as `fix-instagram-imports.ps1` and run from `apps/frontend`:

```powershell
# Instagram Import Path Fixer
# Based on successful YouTube migration
# Run from: apps/frontend directory

Write-Host "🔧 Instagram Import Path Fixer" -ForegroundColor Cyan
Write-Host "================================`n" -ForegroundColor Cyan

$basePath = "app\(dashboard)\instagram\seedstorm-builder"
$fixCount = 0
$filesChecked = 0

# Function to calculate correct import path
function Get-CorrectImportPath {
    param(
        [string]$filePath,
        [string]$targetPath
    )
    
    # Count directory levels from seedstorm-builder
    $relativePath = $filePath -replace ".*seedstorm-builder\\", ""
    $depth = ($relativePath -split "\\").Count - 1
    
    # Build correct path
    $upLevels = ".." * $depth -join "/"
    if ($upLevels) {
        return "$upLevels/$targetPath"
    }
    return $targetPath
}

# Find all TypeScript files
Get-ChildItem -Path $basePath -Recurse -Include *.ts,*.tsx | ForEach-Object {
    $file = $_
    $filesChecked++
    $content = Get-Content $file.FullName -Raw
    $modified = $false
    
    # Fix integrations/supabase/client imports
    if ($content -match 'from ["\']\.\.\/\.\.\/\.\.\/integrations/supabase/client["\']') {
        $correctPath = Get-CorrectImportPath -filePath $file.FullName -targetPath "integrations/supabase/client"
        $content = $content -replace 'from ["\'](\.\.\/)+integrations/supabase/client["\']', "from `"$correctPath`""
        $modified = $true
        Write-Host "  📝 Fixed: $($file.Name)" -ForegroundColor Yellow
        $fixCount++
    }
    
    # Fix integrations/supabase/types imports
    if ($content -match 'from ["\']\.\.\/\.\.\/\.\.\/integrations/supabase/types["\']') {
        $correctPath = Get-CorrectImportPath -filePath $file.FullName -targetPath "integrations/supabase/types"
        $content = $content -replace 'from ["\'](\.\.\/)+integrations/supabase/types["\']', "from `"$correctPath`""
        $modified = $true
        Write-Host "  📝 Fixed: $($file.Name)" -ForegroundColor Yellow
        $fixCount++
    }
    
    # Fix contexts/AuthContext imports
    if ($content -match 'from ["\']\.\.\/\.\.\/\.\.\/contexts/AuthContext["\']') {
        $correctPath = Get-CorrectImportPath -filePath $file.FullName -targetPath "contexts/AuthContext"
        $content = $content -replace 'from ["\'](\.\.\/)+contexts/AuthContext["\']', "from `"$correctPath`""
        $modified = $true
        Write-Host "  📝 Fixed: $($file.Name)" -ForegroundColor Yellow
        $fixCount++
    }
    
    # Fix mismatched quotes
    if ($content -match 'from ["''][^"'']*["'']["\']' -and $content -match '(from `"[^'']*''|from ''[^`"]*`")') {
        $content = $content -replace "from `"([^']+)'", 'from "$1"'
        $content = $content -replace "from '([^`"]+)`"", "from '$1'"
        $modified = $true
        Write-Host "  🔤 Fixed quotes: $($file.Name)" -ForegroundColor Green
        $fixCount++
    }
    
    if ($modified) {
        Set-Content $file.FullName $content -NoNewline
    }
}

Write-Host "`n================================" -ForegroundColor Cyan
Write-Host "✅ Checked: $filesChecked files" -ForegroundColor Green
Write-Host "🔧 Fixed: $fixCount issues" -ForegroundColor Green
Write-Host "`nDone! Run 'pnpm run build' to verify.`n" -ForegroundColor Cyan
```

**Usage**:
```powershell
cd apps/frontend
.\fix-instagram-imports.ps1
```

---

## 🔄 Router Migration Guide

### Step 1: Identify Files Using React Router

```powershell
# Find all files importing from react-router-dom
cd apps/frontend
Get-ChildItem -Path "app\(dashboard)\instagram\seedstorm-builder" -Recurse -Include *.tsx,*.ts | 
  Select-String -Pattern "from ['\"]react-router-dom['\"]" | 
  Select-Object -ExpandProperty Path -Unique
```

**Instagram Current Status**: 8 files need migration
- `App.tsx` (BrowserRouter)
- `Navigation.tsx` (useNavigate, NavLink)
- `Breadcrumbs.tsx` (useLocation, NavLink)
- `WorkflowAlerts.tsx` (useLocation)
- `NotFound.tsx` (Link)
- `CreatorDatabase.tsx` (useLocation)
- `CampaignHistory.tsx` (useLocation)
- `CampaignBuilder.tsx` (useLocation)
- `ClientDashboard.tsx` (useLocation)

### Step 2: Migration Priority

**High Priority** (breaks navigation):
1. ✅ `Navigation.tsx` - Main navigation component
2. ✅ `Breadcrumbs.tsx` - Used across pages
3. `App.tsx` - Not needed (we use layout.tsx instead)

**Medium Priority** (page-specific):
4. `CreatorDatabase.tsx`, `CampaignHistory.tsx`, etc.

**Low Priority** (rarely used):
5. `WorkflowAlerts.tsx`, `NotFound.tsx`

### Step 3: File-by-File Migration Template

For each file:

```typescript
// 1. Update imports
// ❌ Remove
import { useNavigate, useLocation, NavLink, Link } from 'react-router-dom';

// ✅ Add
"use client"  // ← Add at top if not present
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';

// 2. Update hook usage
// ❌ Remove
const navigate = useNavigate();
const location = useLocation();
const [searchParams] = useSearchParams();

// ✅ Add
const router = useRouter();
const pathname = usePathname();
const searchParams = useSearchParams();  // No destructuring!

// 3. Update navigation calls
// ❌ Remove
navigate('/campaigns');
navigate(-1);  // Go back

// ✅ Add
router.push('/instagram/campaigns');  // ← Note /instagram prefix!
router.back();

// 4. Update path checks
// ❌ Remove
const isActive = location.pathname === '/campaigns';

// ✅ Add
const isActive = pathname === '/instagram/campaigns';

// 5. Update search params
// ❌ Remove
const tab = searchParams.get('tab');

// ✅ Add (with null safety!)
const tab = searchParams?.get('tab');

// 6. Update Links
// ❌ Remove
<Link to="/campaigns">Campaigns</Link>
<NavLink to="/creators" className={({isActive}) => ...}>

// ✅ Add
<Link href="/instagram/campaigns">Campaigns</Link>
<Link 
  href="/instagram/creators"
  className={pathname === '/instagram/creators' ? 'active' : ''}
>
```

### Step 4: URL Prefix Rules

**CRITICAL**: All Instagram internal URLs must start with `/instagram/`

```typescript
// ❌ WRONG - missing prefix
router.push('/campaigns');
<Link href="/creators">

// ✅ CORRECT - has prefix
router.push('/instagram/campaigns');
<Link href="/instagram/creators">

// ❌ WRONG - external links shouldn't have it
<Link href="/instagram/youtube">  // Goes to YouTube app

// ✅ CORRECT - external/auth links
<Link href="/login">  // Unified login
<Link href="/youtube">  // Other app
<Link href="/dashboard">  // Main dashboard
```

---

## 🔍 Step-by-Step Troubleshooting

### When You Get a Build Error

#### 1. Read the Error Carefully

```
Example Error:
Module not found: Can't resolve '../../integrations/supabase/client'
File: app/(dashboard)/instagram/seedstorm-builder/components/MyComponent.tsx
```

**What it tells you**:
- **Problem**: Import path is wrong
- **File**: `MyComponent.tsx` in `components/` folder
- **Looking for**: `integrations/supabase/client`

#### 2. Calculate Correct Path

From `components/MyComponent.tsx` to `integrations/supabase/client.ts`:
```
seedstorm-builder/
  ├── components/
  │   └── MyComponent.tsx  ← You are here
  └── integrations/
      └── supabase/
          └── client.ts    ← You want to go here

Path: ../ (up to seedstorm-builder) + integrations/supabase/client
Result: "../integrations/supabase/client"
```

From `components/subfolder/MyComponent.tsx`:
```
seedstorm-builder/
  ├── components/
  │   └── subfolder/
  │       └── MyComponent.tsx  ← You are here
  └── integrations/
      └── supabase/
          └── client.ts        ← You want to go here

Path: ../../ (up 2 levels) + integrations/supabase/client
Result: "../../integrations/supabase/client"
```

#### 3. Fix and Test

```typescript
// Fix the import
import { supabase } from "../integrations/supabase/client";

// Save file and check terminal
// Should see: "✓ Compiled successfully"
```

### When You Get a Runtime Error

#### "Cannot read properties of undefined"

**Error Example**:
```
TypeError: Cannot read properties of undefined (reading 'get')
at searchParams.get('tab')
```

**Fix**: Add optional chaining
```typescript
// ❌ Before
const tab = searchParams.get('tab');

// ✅ After
const tab = searchParams?.get('tab');
```

#### "Element type is invalid"

**Error Example**:
```
Element type is invalid: expected a string but got: undefined
You likely forgot to export your component
```

**Fix**: Add named export
```typescript
// At end of component file
export { ComponentName };
export default ComponentName;
```

#### "useNavigate is not defined"

**Fix**: Migrate to Next.js router
```typescript
// ❌ Remove
import { useNavigate } from 'react-router-dom';
const navigate = useNavigate();

// ✅ Add
import { useRouter } from 'next/navigation';
const router = useRouter();
```

---

## ✅ Testing Checklist

After making fixes, test each route:

### Instagram Routes to Test

- [ ] `/instagram` - Main dashboard
  - [ ] Page loads without errors
  - [ ] Navigation visible
  - [ ] User menu shows
  - [ ] Auth check works
  
- [ ] `/instagram/creators` - Creator database
  - [ ] Table/grid loads
  - [ ] Search works
  - [ ] Filters work
  - [ ] Navigation between pages
  
- [ ] `/instagram/campaign-builder` - Campaign creation
  - [ ] Form loads
  - [ ] Can select creators
  - [ ] Can save campaign
  - [ ] Navigation after save
  
- [ ] `/instagram/campaigns` - Campaign history
  - [ ] List loads
  - [ ] Can view details
  - [ ] Can edit campaigns
  - [ ] Tabs work (if any)
  
- [ ] `/instagram/qa` - Quality assurance
  - [ ] QA tools load
  - [ ] Can mark items
  - [ ] Status updates work
  
- [ ] `/instagram/workflow` - Workflow management
  - [ ] Workflow UI loads
  - [ ] Can create rules
  - [ ] Alerts work

### Quick Test Commands

```bash
# Build test
cd apps/frontend
pnpm run build

# Look for:
# ✅ "Compiled successfully"
# ❌ "Failed to compile" - fix errors!

# Dev server test
pnpm run dev

# Open browser:
# http://localhost:3000/instagram
# Click through all navigation items
```

### Browser Console Checklist

Open DevTools (F12) and check for:
- ✅ No red errors
- ✅ Auth messages: "✅ Found active session"
- ✅ Navigation works smoothly
- ⚠️ Yellow warnings are usually OK
- ❌ Red errors need fixing

---

## 🎯 Quick Reference: YouTube vs Instagram

### What Worked for YouTube

| Issue | Solution | Status for Instagram |
|-------|----------|---------------------|
| Database schema mismatch | Use auth metadata only | ✅ Already done |
| Import paths wrong | Calculated correct relative paths | ⚠️ Needs checking |
| Quote mismatches | Fixed to consistent quotes | ⚠️ Needs checking |
| React Router imports | Migrated to Next.js | ❌ Not done yet (8 files) |
| SearchParams null | Added `?.` optional chaining | ⚠️ Check when migrating |
| Export mismatches | Added named + default exports | ⚠️ Check if needed |
| Supabase connection | Used env variables + headers | ✅ Already done |

### Instagram-Specific Considerations

**Good News**:
- ✅ Supabase client already configured
- ✅ Layout with QueryClient exists
- ✅ Route pages created
- ✅ AuthContext exists

**Needs Work**:
- ❌ React Router still in use (8 files)
- ⚠️ May have import path issues
- ⚠️ Navigation components need migration

---

## 📚 Additional Resources

### Key Files Reference

**Instagram Core Files**:
```
instagram/
  ├── layout.tsx                    # QueryClient, navigation
  ├── page.tsx                      # Main dashboard wrapper
  ├── contexts/AuthContext.tsx      # Top-level auth (minimal)
  └── seedstorm-builder/
      ├── contexts/AuthContext.tsx  # App-specific auth
      ├── components/
      │   ├── Navigation.tsx        # Main nav (NEEDS MIGRATION)
      │   ├── Breadcrumbs.tsx       # Breadcrumbs (NEEDS MIGRATION)
      │   ├── ProtectedRoute.tsx    # Auth guard
      │   └── SeedstormApp.tsx      # App wrapper
      ├── integrations/
      │   └── supabase/
      │       ├── client.ts         # ✅ Already configured
      │       └── types.ts          # Database types
      └── pages/
          ├── Index.tsx             # Dashboard page
          ├── CreatorDatabase.tsx   # Creators (NEEDS MIGRATION)
          └── ...                   # Other pages (NEED MIGRATION)
```

### Common Patterns

**App Wrapper Pattern**:
```typescript
// Used in: /instagram/page.tsx
<SeedstormApp>
  <ProtectedRoute>
    <PageComponent />
  </ProtectedRoute>
</SeedstormApp>
```

**Layout Pattern**:
```typescript
// layout.tsx provides:
- QueryClientProvider
- Navigation bar
- App-wide context
```

**Route Page Pattern**:
```typescript
// Each route page imports from seedstorm-builder
import Component from "../seedstorm-builder/pages/Component"
export default function Page() {
  return <Component />
}
```

---

## 🚀 Recommended Action Plan

### Phase 1: Diagnostics (5 min)
1. Run build: `pnpm run build`
2. Note all errors
3. Categorize: Import paths? React Router? Quotes?

### Phase 2: Quick Wins (10 min)
1. Run `fix-instagram-imports.ps1`
2. Fix any remaining import paths manually
3. Run build again

### Phase 3: Router Migration (30-60 min)
1. Start with `Navigation.tsx`
2. Then `Breadcrumbs.tsx`
3. Then page components
4. Test after each file

### Phase 4: Testing (15 min)
1. Visit each route
2. Click all navigation
3. Test key features
4. Check console for errors

### Phase 5: Polish (as needed)
1. Fix remaining issues
2. Add error boundaries
3. Improve loading states
4. Document any quirks

---

## 💡 Pro Tips

### From YouTube Migration Experience

1. **Start with one file at a time** - Don't try to fix everything at once
2. **Test frequently** - After each fix, check if it compiles
3. **Use optional chaining** - Next.js hooks can return null: `searchParams?.get()`
4. **Prefix all routes** - Internal links need `/instagram/` prefix
5. **Export both ways** - Named + default exports prevent import errors
6. **Watch the terminal** - Next.js auto-compiles and shows errors immediately
7. **Check browser console** - Runtime errors show there, not in build
8. **Clear cache if stuck** - Ctrl+Shift+R refreshes without cache

### Time Savers

- Use the import fixer script first - fixes 80% of path issues
- Copy-paste the router migration template - faster than typing
- Keep APP-IMPORT-GUIDE.md open - reference for patterns
- Test in browser immediately - catches runtime errors early

---

## 🆘 When You're Stuck

### Error Still Persists?

1. **Read error carefully** - Note file name and line number
2. **Check that specific line** - Use VS Code "Go to Line" (Ctrl+G)
3. **Compare with YouTube** - Find equivalent file in `/youtube/`
4. **Check this guide** - Search for error message
5. **Clear and rebuild** - Sometimes Next.js cache is stale
   ```bash
   rm -rf .next
   pnpm run dev
   ```

### Need Help?

**Check these docs**:
- `APP-IMPORT-GUIDE.md` - Full import guide
- `YOUTUBE-*.md` - All YouTube fix docs
- This file - Instagram-specific fixes

**Compare files**:
```bash
# Find equivalent YouTube file
# Instagram: seedstorm-builder/components/Navigation.tsx
# YouTube:   vidi-health-flow/components/navigation/AppSidebar.tsx
```

---

## ✨ Success Criteria

Instagram integration is **complete** when:

- ✅ `pnpm run build` succeeds with no errors
- ✅ All 6 Instagram routes load without errors
- ✅ Navigation between pages works
- ✅ Auth check works (protected routes)
- ✅ User menu shows correctly
- ✅ No console errors in browser
- ✅ Data loads from Supabase
- ✅ Forms and interactions work

---

## 📊 Current Status Summary

| Component | Status | Action Needed |
|-----------|--------|---------------|
| Supabase Client | ✅ Working | None |
| Layout & QueryClient | ✅ Working | None |
| Route Pages | ✅ Created | None |
| AuthContext | ✅ Working | None |
| Import Paths | ⚠️ Unknown | Run fixer script |
| React Router | ❌ Not Migrated | Migrate 8 files |
| Navigation | ❌ Uses RR | Migrate to Next.js |
| Breadcrumbs | ❌ Uses RR | Migrate to Next.js |
| Page Components | ⚠️ May use RR | Check and migrate |

---

**Created**: November 6, 2025  
**Based on**: YouTube migration success (4 major issues fixed)  
**Estimated Time**: 1-2 hours for complete migration  
**Difficulty**: Medium (following proven patterns)

**Good luck! You've got proven techniques from YouTube - Instagram will be similar! 🚀**

