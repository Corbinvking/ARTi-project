# ⚡ Quick Reference Cheat Sheet

**For**: App integrations into unified ARTi dashboard  
**Based on**: YouTube (vidi-health-flow) successful migration  
**Print this** or keep it open while working!

---

## 🚀 Quick Start (Instagram)

```powershell
# 1. Run import fixer
cd apps/frontend
.\fix-instagram-imports.ps1

# 2. Build and check errors
pnpm run build

# 3. Start dev server
pnpm run dev

# 4. Test in browser
# Open: http://localhost:3000/instagram
```

---

## 🔧 Import Path Calculator

```
File Depth → Path Prefix

components/File.tsx           → ../
components/folder/File.tsx    → ../../
components/a/b/File.tsx       → ../../../
pages/File.tsx                → ../
hooks/File.tsx                → ../
```

**Example**:
```typescript
// From: components/admin/AdminUI.tsx
// To:   integrations/supabase/client.ts
// Depth: 2 levels

import { supabase } from "../../integrations/supabase/client";
```

---

## 🔄 React Router → Next.js

### Imports
```typescript
// ❌ Remove
import { useNavigate, useLocation, NavLink, Link } from 'react-router-dom';

// ✅ Add
"use client"
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
```

### Hooks
```typescript
// ❌ Remove
const navigate = useNavigate();
const location = useLocation();
const [searchParams] = useSearchParams();

// ✅ Add
const router = useRouter();
const pathname = usePathname();
const searchParams = useSearchParams();  // No []!
```

### Navigation
```typescript
// ❌ Remove
navigate('/campaigns');
navigate(-1);

// ✅ Add (with prefix!)
router.push('/youtube/campaigns');  // or /instagram/campaigns
router.back();
```

### Path Checks
```typescript
// ❌ Remove
const isActive = location.pathname === '/campaigns';

// ✅ Add (with prefix!)
const isActive = pathname === '/youtube/campaigns';
```

### Links
```typescript
// ❌ Remove
<Link to="/campaigns">Campaigns</Link>
<NavLink to="/creators" className={({isActive}) => isActive ? 'active' : ''}>

// ✅ Add (with prefix!)
<Link href="/youtube/campaigns">Campaigns</Link>
<Link 
  href="/youtube/creators"
  className={pathname === '/youtube/creators' ? 'active' : ''}
>
  Creators
</Link>
```

### Search Params (Add `?.`)
```typescript
// ❌ Can crash
const tab = searchParams.get('tab');

// ✅ Safe
const tab = searchParams?.get('tab');
```

---

## 📝 Common Fixes

### Fix 1: Module Not Found
```
Error: Module not found: Can't resolve '../../integrations/supabase/client'
```
**Fix**: Recalculate path depth and use correct `../`

### Fix 2: Unterminated String
```
Error: Unterminated string constant at line X
```
**Fix**: Match quotes - both `"` or both `'`
```typescript
// ❌ Bad
import { x } from "../path';

// ✅ Good
import { x } from "../path";
```

### Fix 3: Cannot Read 'get'
```
TypeError: Cannot read properties of undefined (reading 'get')
```
**Fix**: Add optional chaining
```typescript
const param = searchParams?.get('name');
```

### Fix 4: Element Type Invalid
```
Error: Element type is invalid: expected a string but got: undefined
```
**Fix**: Add named export
```typescript
export { ComponentName };
export default ComponentName;
```

### Fix 5: useNavigate Not Defined
```
Error: useNavigate is not defined
```
**Fix**: Migrate to Next.js
```typescript
// ❌ Remove
import { useNavigate } from 'react-router-dom';

// ✅ Add
import { useRouter } from 'next/navigation';
```

---

## 🎯 URL Prefix Rules

| App | Internal URLs Must Start With |
|-----|------------------------------|
| YouTube | `/youtube/` |
| Instagram | `/instagram/` |
| Spotify | `/spotify/` |
| Main Dashboard | `/dashboard/` |

**Examples**:
```typescript
// ❌ WRONG - missing prefix
router.push('/campaigns');
<Link href="/creators">

// ✅ CORRECT - has prefix
router.push('/instagram/campaigns');
<Link href="/instagram/creators">

// ✅ CORRECT - external links
<Link href="/login">         // Unified auth
<Link href="/dashboard">     // Main dashboard
<Link href="/youtube">       // Other app
```

---

## 🧪 Testing Checklist

```
After each fix:

1. □ Save file
2. □ Check terminal for compile errors
3. □ If error, fix and repeat
4. □ If success, test in browser
5. □ Check browser console (F12)
6. □ Click through navigation
7. □ Test key features
```

---

## 🔍 Diagnostic Commands

```powershell
# Find react-router imports
Get-ChildItem -Recurse -Include *.tsx,*.ts | 
  Select-String "react-router-dom"

# Find useNavigate usage
Get-ChildItem -Recurse -Include *.tsx,*.ts | 
  Select-String "useNavigate"

# Find mismatched quotes
Get-ChildItem -Recurse -Include *.tsx,*.ts | 
  Select-String 'from ["''][^"'']*["'']["\']'

# Count files to migrate
(Get-ChildItem -Recurse -Include *.tsx,*.ts | 
  Select-String "react-router-dom").Count
```

---

## 📋 Migration Order

```
Priority Order:

1. ✅ Run import fixer script         (15 min)
2. ✅ Fix remaining import paths      (10 min)
3. ✅ Fix quote mismatches            (5 min)
4. ✅ Migrate Navigation component    (15 min)
5. ✅ Migrate Breadcrumbs component   (10 min)
6. ✅ Migrate page components         (30 min)
7. ✅ Test all routes                 (15 min)
8. ✅ Fix runtime errors              (varies)

Total: 1.5-2.5 hours
```

---

## 🛠️ PowerShell Snippets

### Find Files to Migrate
```powershell
Get-ChildItem -Path "app\(dashboard)\instagram\seedstorm-builder" `
  -Recurse -Include *.tsx,*.ts | 
  Select-String -Pattern "react-router-dom" | 
  Select-Object -ExpandProperty Path -Unique
```

### Fix Import Path (Manual)
```powershell
# Calculate depth
$file = "components/admin/MyFile.tsx"
$depth = ($file -split "/").Count - 1  # Result: 2

# Build path
$path = "../" * $depth + "integrations/supabase/client"
# Result: "../../integrations/supabase/client"
```

### Fix Quotes
```powershell
$content = Get-Content file.tsx -Raw
$content = $content -replace 'from `"([^'']+)''', 'from "$1"'
Set-Content file.tsx $content -NoNewline
```

---

## 🎨 Component Template

```typescript
"use client"

import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { supabase } from "../integrations/supabase/client";
import { useAuth } from "../contexts/AuthContext";

export function MyComponent() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  
  const handleNavigate = () => {
    router.push('/instagram/target-page');
  };
  
  const isActive = (path: string) => {
    return pathname === `/instagram${path}`;
  };
  
  return (
    <div>
      <Link 
        href="/instagram/campaigns"
        className={isActive('/campaigns') ? 'active' : ''}
      >
        Campaigns
      </Link>
      
      <button onClick={handleNavigate}>
        Navigate
      </button>
    </div>
  );
}

export { MyComponent };
export default MyComponent;
```

---

## 🚨 Common Mistakes

| Mistake | Impact | Fix |
|---------|--------|-----|
| Forgetting `/instagram/` prefix | 404 errors | Add prefix to all internal URLs |
| Using `navigate('/path')` | Runtime error | Use `router.push('/instagram/path')` |
| `searchParams.get()` without `?.` | Crash | Use `searchParams?.get()` |
| Mismatched quotes | Build error | Make all quotes consistent |
| Wrong import depth | Module not found | Recalculate `../` path |
| Only default export | Import error | Add both exports |
| `location.pathname` | Undefined error | Use `pathname` hook |

---

## ⚡ Speed Tips

1. **Use the script** - Fixes 80% of issues automatically
2. **Copy from YouTube** - Find equivalent file and copy pattern
3. **Test frequently** - After each file, not after all files
4. **Watch terminal** - Auto-compiles and shows errors instantly
5. **Clear cache** - If stuck: Ctrl+Shift+R in browser
6. **Search & Replace** - Use VS Code find/replace for repetitive fixes

---

## 📊 Success Indicators

```
✅ Build: "Compiled successfully"
✅ Browser: No red errors in console
✅ Navigation: All routes load
✅ Auth: User menu shows
✅ Data: Loads from Supabase
✅ Forms: Can submit/save
✅ Search: Filters work
```

---

## 🆘 When Stuck

1. **Read error carefully** - Note file and line number
2. **Check that line** - VS Code: Ctrl+G to go to line
3. **Compare with YouTube** - Find similar file
4. **Check this sheet** - Find your error type
5. **Clear cache** - Browser: Ctrl+Shift+R, Build: `rm -rf .next`
6. **Check docs** - `INSTAGRAM-FIXER-UPPER.md` has details

---

## 📚 Full Docs

- `INSTAGRAM-FIXER-UPPER.md` - Complete Instagram guide
- `MIGRATION-TECHNIQUES-SUMMARY.md` - All techniques explained
- `APP-IMPORT-GUIDE.md` - Master integration guide
- `YOUTUBE-*.md` - YouTube fix examples
- This file - Quick reference!

---

## 💾 Save Commands

```bash
# Format this for easy reference
cat QUICK-REFERENCE-CHEAT-SHEET.md

# Or open in VS Code
code QUICK-REFERENCE-CHEAT-SHEET.md
```

---

**Print this out or keep it open in a second monitor!** 🖨️

**Questions?** Check the full docs above. ⬆️

**Good luck with Instagram!** 🚀

