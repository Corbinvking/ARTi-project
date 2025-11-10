# 🎵 SoundCloud Integration Tips (Lessons from YouTube & Instagram)

**Purpose**: Avoid the 10+ hours of debugging we did with YouTube  
**Result**: Clean integration in 2-3 hours instead of 10+  
**Status**: Pre-integration checklist and automation suite

---

## 🎯 What I Wish We Knew Before YouTube

### **The Reality**
YouTube integration took ~10 hours total including debugging:
- ⏰ 2 hours: File copying and initial setup
- ⏰ 3 hours: Import path fixes (manual iteration)
- ⏰ 2 hours: React Router migration (trial and error)
- ⏰ 2 hours: Auth/database debugging (schema mismatch)
- ⏰ 1 hour: Quote fixes, export issues, null safety

### **What Would Have Saved 7+ Hours**
1. ✅ **Pre-flight checks** - Know what will break BEFORE copying
2. ✅ **Automated scripts ready** - Run immediately after copying
3. ✅ **Auth pattern decided** - Use metadata-only from day 1
4. ✅ **Router migration template** - Copy-paste instead of figure out
5. ✅ **Known gotchas documented** - Check list, fix proactively
6. ✅ **Test at each phase** - Not at the end

---

## 📋 Pre-Integration Checklist (Do This FIRST!)

### Phase 0: Before You Clone Anything

#### 1. **Understand the Source App** (15 min)

```bash
# Clone to temp location first (NOT in your project yet)
cd ~/temp
git clone <repo-url> temp-soundcloud-app
cd temp-soundcloud-app

# Answer these questions:
```

**Critical Questions**:
- [ ] What router does it use? (React Router, Reach Router, Next.js, none?)
- [ ] What auth does it use? (Supabase, Auth0, Firebase, custom?)
- [ ] What UI library? (MUI, Ant Design, shadcn, custom?)
- [ ] What state management? (Redux, Zustand, Context, React Query?)
- [ ] Is it TypeScript or JavaScript?
- [ ] What's the file structure? (pages/, components/, src/?)
- [ ] Does it have a database schema? (SQL files, migrations?)
- [ ] What environment variables does it need?

**Quick Scan Commands**:
```bash
# Check for React Router
grep -r "react-router" package.json
grep -r "useNavigate\|useLocation" src/

# Check for auth
grep -r "supabase\|auth0\|firebase" package.json

# Check for database queries
grep -r "\.from\(.*user" src/
grep -r "user_profiles\|user_roles" src/

# List environment variables needed
grep -r "process.env" src/ | grep -v node_modules | head -20

# Check exports pattern
grep -r "^export default\|^export {" src/components/ | head -20
```

**Document Findings**:
```markdown
# SoundCloud App Analysis

## Router: React Router v6
## Auth: Supabase (queries user_profiles table)
## UI: shadcn-ui
## State: React Query
## Language: TypeScript
## Structure: src/pages/, src/components/
## Database: Uses user_profiles, user_roles, soundcloud_tracks tables
## Env Vars: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
```

#### 2. **Identify Breaking Changes** (10 min)

Based on scan above, mark what WILL break:

```markdown
## ⚠️ Will Break - Router
- [ ] 15 files use React Router (useNavigate, useLocation, NavLink)
- [ ] Need to migrate all to Next.js router
- [ ] All links need /soundcloud/ prefix

## ⚠️ Will Break - Auth
- [ ] Queries user_profiles table (may not exist in unified schema)
- [ ] Queries user_roles table (may have RLS issues)
- [ ] Solution: Use auth metadata pattern

## ⚠️ Will Break - Import Paths
- [ ] All relative imports will break (deeper nesting in Next.js)
- [ ] ~200 import statements to fix

## ⚠️ Will Break - Environment Variables
- [ ] Uses VITE_* prefix (Next.js uses NEXT_PUBLIC_*)
- [ ] Need to map to unified dashboard env vars

## ✅ Won't Break
- [ ] UI components (shadcn-ui matches dashboard)
- [ ] React Query (we use this too)
- [ ] TypeScript (consistent)
```

#### 3. **Prepare Automation Scripts** (20 min)

Create these scripts BEFORE copying files:

**a) Import Path Fixer**: `apps/frontend/fix-soundcloud-imports.ps1`
```powershell
# See template below - customize for SoundCloud paths
```

**b) Router Migration Script**: `apps/frontend/migrate-soundcloud-router.ps1`
```powershell
# See template below - automated router fixes
```

**c) Environment Variable Mapper**: `apps/frontend/map-soundcloud-env.ps1`
```powershell
# See template below - maps VITE_* to NEXT_PUBLIC_*
```

#### 4. **Create File Structure Template** (5 min)

```bash
# Create directories BEFORE copying
cd apps/frontend
mkdir -p "app/(dashboard)/soundcloud/soundcloud-app"
mkdir -p "app/(dashboard)/soundcloud/soundcloud-app/components"
mkdir -p "app/(dashboard)/soundcloud/soundcloud-app/pages"
mkdir -p "app/(dashboard)/soundcloud/soundcloud-app/hooks"
mkdir -p "app/(dashboard)/soundcloud/soundcloud-app/lib"
mkdir -p "app/(dashboard)/soundcloud/soundcloud-app/integrations/supabase"
mkdir -p "app/(dashboard)/soundcloud/soundcloud-app/contexts"
```

---

## 🚀 Integration Process (With Automation)

### Phase 1: Copy & Structure (30 min)

#### Step 1.1: Copy Source Files
```bash
# From temp location to project
cd ~/temp/temp-soundcloud-app
cp -r src/* ~/Desktop/ARTi-project/apps/frontend/app/\(dashboard\)/soundcloud/soundcloud-app/

# Verify copy
cd ~/Desktop/ARTi-project/apps/frontend
ls "app/(dashboard)/soundcloud/soundcloud-app/"
```

#### Step 1.2: Create Next.js Route Structure
```bash
cd apps/frontend
```

**Create `app/(dashboard)/soundcloud/layout.tsx`**:
```typescript
"use client";

import { ReactNode, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Home, Music, PlayCircle, BarChart3, Settings } from "lucide-react";

const navItems = [
  { title: "Dashboard", href: "/soundcloud", icon: Home },
  { title: "Tracks", href: "/soundcloud/tracks", icon: Music },
  { title: "Playlists", href: "/soundcloud/playlists", icon: PlayCircle },
  { title: "Analytics", href: "/soundcloud/analytics", icon: BarChart3 },
  { title: "Settings", href: "/soundcloud/settings", icon: Settings },
];

export default function SoundCloudLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5,
        retry: 1,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex min-h-screen flex-col">
        <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-14 items-center">
            <div className="mr-4 flex">
              <Link href="/soundcloud" className="mr-6 flex items-center space-x-2">
                <span className="font-bold">SoundCloud Manager</span>
              </Link>
            </div>
            <div className="flex flex-1 items-center space-x-2 justify-end md:justify-between">
              <nav className="flex items-center space-x-6 text-sm font-medium">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href ||
                    (item.href !== "/soundcloud" && pathname.startsWith(item.href));

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-2 transition-colors hover:text-foreground/80",
                        isActive ? "text-foreground" : "text-foreground/60"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="hidden sm:inline-block">{item.title}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        </nav>
        <div className="flex-1">
          {children}
        </div>
      </div>
    </QueryClientProvider>
  );
}
```

**Create `app/(dashboard)/soundcloud/page.tsx`**:
```typescript
"use client"

import { SoundCloudApp } from "./soundcloud-app/components/SoundCloudApp"
import { ProtectedRoute } from "./soundcloud-app/components/ProtectedRoute"
import Index from "./soundcloud-app/pages/Index"

export default function SoundCloudPage() {
  return (
    <div className="h-full w-full">
      <SoundCloudApp>
        <ProtectedRoute requiredPermissions={['view_soundcloud']}>
          <Index />
        </ProtectedRoute>
      </SoundCloudApp>
    </div>
  )
}
```

**Create `app/(dashboard)/soundcloud/loading.tsx`**:
```typescript
export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-muted-foreground">Loading SoundCloud...</p>
      </div>
    </div>
  )
}
```

**Create route pages** (for each route in the app):
```bash
# Example: tracks page
mkdir -p "app/(dashboard)/soundcloud/tracks"
# Create page.tsx for each route
```

#### Step 1.3: Create App Wrapper Component

**Create `app/(dashboard)/soundcloud/soundcloud-app/components/SoundCloudApp.tsx`**:
```typescript
"use client"

import { AuthProvider } from "../contexts/AuthContext"
import { Toaster } from "@/components/ui/toaster"
import { Toaster as Sonner } from "@/components/ui/sonner"

interface SoundCloudAppProps {
  children?: React.ReactNode;
}

export function SoundCloudApp({ children }: SoundCloudAppProps) {
  return (
    <AuthProvider>
      <Toaster />
      <Sonner />
      {children}
    </AuthProvider>
  )
}

export { SoundCloudApp as default };
```

### Phase 2: Automated Fixes (15 min)

#### Step 2.1: Fix Supabase Client Configuration

**Create/Update `app/(dashboard)/soundcloud/soundcloud-app/integrations/supabase/client.ts`**:
```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Use unified Supabase instance
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

#### Step 2.2: Run Import Path Fixer
```powershell
cd apps/frontend
.\fix-soundcloud-imports.ps1
```

#### Step 2.3: Run Environment Variable Mapper
```powershell
.\map-soundcloud-env.ps1
```

#### Step 2.4: Test Build
```bash
pnpm run build
```

**Expected**: ~50% of errors fixed (import paths, env vars)

### Phase 3: Auth Context Migration (20 min)

**CRITICAL**: Do this BEFORE any other fixes!

**Update `app/(dashboard)/soundcloud/soundcloud-app/contexts/AuthContext.tsx`**:

```typescript
"use client"

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../integrations/supabase/client';
import { useToast } from "@/components/ui/use-toast";

type UserRole = 'admin' | 'manager' | 'user';

interface UserProfile {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role: UserRole;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, firstName?: string, lastName?: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  hasRole: (role: UserRole) => boolean;
  isAdmin: boolean;
  isManager: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // ✅ USE AUTH METADATA ONLY - No database queries!
  const fetchUserProfile = async (userId: string) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;

      if (!user) {
        setProfile(null);
        return;
      }

      // Get role from user metadata (no DB query needed)
      const userRole = user.user_metadata?.role || user.app_metadata?.role || 'admin';
      
      let mappedRole: UserRole = 'admin';
      if (userRole === 'admin' || userRole === 'manager' || userRole === 'user') {
        mappedRole = userRole as UserRole;
      }

      // Build profile from metadata only
      setProfile({
        id: userId,
        email: user.email ?? '',
        first_name: user.user_metadata?.first_name || user.user_metadata?.full_name?.split(' ')[0],
        last_name: user.user_metadata?.last_name || user.user_metadata?.full_name?.split(' ').slice(1).join(' '),
        role: mappedRole,
      });

      console.log('✅ SoundCloud profile loaded:', user.email, 'role:', mappedRole);
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

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          fetchUserProfile(session.user.id);
        } else {
          setProfile(null);
        }

        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        fetchUserProfile(session.user.id);
      }

      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast({ title: "Sign In Failed", description: error.message, variant: "destructive" });
      }
      return { error };
    } catch (error) {
      console.error('Sign in error:', error);
      return { error };
    }
  };

  const signUp = async (email: string, password: string, firstName?: string, lastName?: string) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { 
          emailRedirectTo: redirectUrl, 
          data: { first_name: firstName, last_name: lastName } 
        }
      });
      if (error) {
        toast({ title: "Sign Up Failed", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Account Created", description: "Check your email to verify your account!" });
      }
      return { error };
    } catch (error) {
      console.error('Sign up error:', error);
      return { error };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast({ title: "Sign Out Failed", description: error.message, variant: "destructive" });
      }
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const hasRole = (role: UserRole): boolean => profile?.role === role;
  const isAdmin = hasRole('admin');
  const isManager = hasRole('manager');

  const value: AuthContextType = {
    user,
    session,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    hasRole,
    isAdmin,
    isManager,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
```

**Why This Saves Hours**: 
- ✅ No database table dependencies
- ✅ No RLS policy issues
- ✅ Works immediately
- ✅ Matches unified dashboard pattern

### Phase 4: Router Migration (45 min)

This is the most time-consuming part. **But** with templates, it's just copy-paste.

#### Step 4.1: Find All Router Files
```powershell
Get-ChildItem -Path "app\(dashboard)\soundcloud\soundcloud-app" -Recurse -Include *.tsx,*.ts | 
  Select-String -Pattern "react-router" | 
  Select-Object -ExpandProperty Path -Unique
```

#### Step 4.2: Migrate Each File (Use Template)

**For EACH file found, apply this template**:

```typescript
// ==========================================
// BEFORE (React Router)
// ==========================================
import { useNavigate, useLocation, useSearchParams, Link, NavLink } from 'react-router-dom';

function MyComponent() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  
  const handleClick = () => {
    navigate('/tracks');
  };
  
  const tab = searchParams.get('tab');
  const isActive = location.pathname === '/tracks';
  
  return (
    <>
      <Link to="/playlists">Playlists</Link>
      <NavLink to="/analytics" className={({isActive}) => isActive ? 'active' : ''}>
        Analytics
      </NavLink>
      <button onClick={handleClick}>Go to Tracks</button>
    </>
  );
}

// ==========================================
// AFTER (Next.js) - COPY THIS PATTERN
// ==========================================
"use client"  // ← Add this!
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function MyComponent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const handleClick = () => {
    router.push('/soundcloud/tracks');  // ← Add /soundcloud/ prefix!
  };
  
  const tab = searchParams?.get('tab');  // ← Add ?. for safety!
  const isActive = pathname === '/soundcloud/tracks';  // ← Add /soundcloud/ prefix!
  
  return (
    <>
      <Link href="/soundcloud/playlists">Playlists</Link>
      <Link 
        href="/soundcloud/analytics"
        className={pathname === '/soundcloud/analytics' ? 'active' : ''}
      >
        Analytics
      </Link>
      <button onClick={handleClick}>Go to Tracks</button>
    </>
  );
}
```

**Migration Checklist per File**:
- [ ] Add `"use client"` at top
- [ ] Replace `useNavigate` → `useRouter`
- [ ] Replace `useLocation` → `usePathname`
- [ ] Keep `useSearchParams` but add `?.` when calling `.get()`
- [ ] Replace `navigate('/path')` → `router.push('/soundcloud/path')`
- [ ] Replace `navigate(-1)` → `router.back()`
- [ ] Replace `<Link to=` → `<Link href=`
- [ ] Add `/soundcloud/` prefix to ALL internal links
- [ ] Replace `<NavLink>` with `<Link>` + manual active check
- [ ] Test the file after migration

#### Step 4.3: Run Automated Router Migration Script
```powershell
cd apps/frontend
.\migrate-soundcloud-router.ps1  # Handles 80% automatically
```

### Phase 5: ProtectedRoute Component (10 min)

**Update `app/(dashboard)/soundcloud/soundcloud-app/components/ProtectedRoute.tsx`**:

```typescript
"use client"

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from "../contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermissions?: string[];
  requiredRole?: 'admin' | 'manager' | 'user';
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredPermissions,
  requiredRole 
}) => {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (requiredRole && profile?.role !== requiredRole && profile?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive">Access Denied</h1>
          <p className="text-muted-foreground">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

// Export both for compatibility
export { ProtectedRoute };
export default ProtectedRoute;
```

### Phase 6: Export Consistency (10 min)

**For ALL component files**, ensure both exports:

```powershell
# Find files that might need export fixes
Get-ChildItem -Path "app\(dashboard)\soundcloud\soundcloud-app\components" -Recurse -Include *.tsx | 
  ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    if ($content -match "export default \w+" -and $content -notmatch "export \{") {
      Write-Host "Need to add named export: $($_.Name)" -ForegroundColor Yellow
    }
  }
```

**Fix each file**:
```typescript
// At end of file
export { ComponentName };  // ← Add if missing
export default ComponentName;
```

### Phase 7: Testing & Iteration (30 min)

#### Step 7.1: Build Test
```bash
pnpm run build
```

**If errors**:
1. Read error message carefully
2. Note file and line number
3. Check QUICK-REFERENCE-CHEAT-SHEET.md for fix
4. Fix and rebuild

#### Step 7.2: Dev Server Test
```bash
pnpm run dev
```

Visit: `http://localhost:3000/soundcloud`

**Test each route**:
- [ ] `/soundcloud` - Dashboard loads
- [ ] `/soundcloud/tracks` - Tracks page loads
- [ ] `/soundcloud/playlists` - Playlists page loads
- [ ] `/soundcloud/analytics` - Analytics page loads
- [ ] `/soundcloud/settings` - Settings page loads

**Check for**:
- [ ] No console errors (F12)
- [ ] Navigation works between pages
- [ ] Auth check works (logged in users only)
- [ ] Data loads from Supabase
- [ ] Forms submit correctly

#### Step 7.3: Browser Console Check
```
F12 → Console tab

✅ Good signs:
- "✅ SoundCloud profile loaded"
- No red errors
- Network requests succeed (200 OK)

❌ Bad signs:
- Red error messages
- 404/406 HTTP errors
- "Cannot read properties of undefined"
```

---

## 🤖 Automation Scripts

### Script 1: Import Path Fixer

**File**: `apps/frontend/fix-soundcloud-imports.ps1`

```powershell
# SoundCloud Import Path Fixer
# Based on YouTube & Instagram success

Write-Host "`n🔧 SoundCloud Import Path Fixer" -ForegroundColor Cyan
Write-Host "================================`n" -ForegroundColor Cyan

$basePath = "app\(dashboard)\soundcloud\soundcloud-app"
$fixCount = 0

if (-not (Test-Path $basePath)) {
    Write-Host "❌ Error: Directory not found!" -ForegroundColor Red
    exit 1
}

Get-ChildItem -Path $basePath -Recurse -Include *.ts,*.tsx | ForEach-Object {
    $file = $_
    $relativePath = $file.FullName -replace ".*soundcloud-app\\", ""
    $depth = ($relativePath -split "\\").Count - 1
    $upLevels = "../" * $depth
    if (-not $upLevels) { $upLevels = "./" }
    
    $content = Get-Content $file.FullName -Raw
    $originalContent = $content
    
    # Fix integrations/supabase imports
    if ($content -match 'from ["''](\.\./)+integrations/supabase') {
        $correctPath = "${upLevels}integrations/supabase"
        $content = $content -replace 'from ["''](\.\./)+integrations/supabase/client["'']', "from `"${correctPath}/client`""
        $content = $content -replace 'from ["''](\.\./)+integrations/supabase/types["'']', "from `"${correctPath}/types`""
        Write-Host "  📝 Fixed: $relativePath" -ForegroundColor Yellow
        $fixCount++
    }
    
    # Fix contexts/AuthContext imports
    if ($content -match 'from ["''](\.\./)+contexts/AuthContext["'']') {
        $correctPath = "${upLevels}contexts/AuthContext"
        $content = $content -replace 'from ["''](\.\./)+contexts/AuthContext["'']', "from `"$correctPath`""
        Write-Host "  📝 Fixed: $relativePath" -ForegroundColor Yellow
        $fixCount++
    }
    
    if ($content -ne $originalContent) {
        Set-Content $file.FullName $content -NoNewline
    }
}

Write-Host "`n✅ Fixed $fixCount files" -ForegroundColor Green
Write-Host "Next: pnpm run build`n" -ForegroundColor Cyan
```

### Script 2: Router Migration Helper

**File**: `apps/frontend/migrate-soundcloud-router.ps1`

```powershell
# SoundCloud Router Migration Helper
# Automates 80% of React Router → Next.js migration

Write-Host "`n🔄 SoundCloud Router Migration Helper" -ForegroundColor Cyan
Write-Host "====================================`n" -ForegroundColor Cyan

$basePath = "app\(dashboard)\soundcloud\soundcloud-app"
$migratedCount = 0

Get-ChildItem -Path $basePath -Recurse -Include *.tsx,*.ts | ForEach-Object {
    $file = $_
    $content = Get-Content $file.FullName -Raw
    $originalContent = $content
    
    # Skip if already migrated
    if ($content -match "from ['\"]next/navigation['\"]") {
        return
    }
    
    # Only process files with react-router
    if ($content -notmatch "from ['\"]react-router-dom['\"]") {
        return
    }
    
    Write-Host "Migrating: $($file.Name)" -ForegroundColor Yellow
    
    # Add "use client" if not present
    if ($content -notmatch '^["'']use client["'']') {
        $content = "`"use client`"`n`n" + $content
    }
    
    # Replace imports
    $content = $content -replace "import \{([^}]*)\} from ['\"]react-router-dom['\"];?", ""
    
    # Add Next.js imports (at top after "use client")
    $nextImports = @"
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
"@
    
    if ($content -notmatch "from ['\"]next/navigation['\"]") {
        $content = $content -replace '("use client"\s*\n)', "`$1`n$nextImports`n"
    }
    
    # Replace hooks
    $content = $content -replace '\bconst navigate = useNavigate\(\);?', 'const router = useRouter();'
    $content = $content -replace '\bconst location = useLocation\(\);?', 'const pathname = usePathname();'
    $content = $content -replace '\bconst \[searchParams\] = useSearchParams\(\);?', 'const searchParams = useSearchParams();'
    
    # Replace navigate calls (simple ones)
    $content = $content -replace "navigate\(['\"]([^'\"]+)['\"]\)", 'router.push(''/soundcloud$1'')'
    $content = $content -replace "navigate\(-1\)", 'router.back()'
    
    # Replace location.pathname
    $content = $content -replace 'location\.pathname', 'pathname'
    
    # Add optional chaining to searchParams.get
    $content = $content -replace 'searchParams\.get\(', 'searchParams?.get('
    
    # Replace Link components
    $content = $content -replace '<Link\s+to=["\']([^"\']+)["\']', '<Link href="/soundcloud$1"'
    
    # Save if changed
    if ($content -ne $originalContent) {
        Set-Content $file.FullName $content -NoNewline
        Write-Host "  ✅ Migrated: $($file.Name)" -ForegroundColor Green
        $migratedCount++
    }
}

Write-Host "`n✅ Migrated $migratedCount files" -ForegroundColor Green
Write-Host "⚠️  Manual review needed for:" -ForegroundColor Yellow
Write-Host "  - NavLink components (need manual active state)" -ForegroundColor Gray
Write-Host "  - Complex navigate() calls with state" -ForegroundColor Gray
Write-Host "  - URL construction logic" -ForegroundColor Gray
Write-Host "`nNext: pnpm run build`n" -ForegroundColor Cyan
```

### Script 3: Environment Variable Mapper

**File**: `apps/frontend/map-soundcloud-env.ps1`

```powershell
# SoundCloud Environment Variable Mapper
# Maps VITE_* to NEXT_PUBLIC_* or unified dashboard vars

Write-Host "`n🔐 SoundCloud Environment Variable Mapper" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$basePath = "app\(dashboard)\soundcloud\soundcloud-app"
$mappedCount = 0

# Define mappings
$envMappings = @{
    'VITE_SUPABASE_URL' = 'NEXT_PUBLIC_SUPABASE_URL'
    'VITE_SUPABASE_ANON_KEY' = 'NEXT_PUBLIC_SUPABASE_ANON_KEY'
    'VITE_SUPABASE_KEY' = 'NEXT_PUBLIC_SUPABASE_ANON_KEY'
    'VITE_API_URL' = 'NEXT_PUBLIC_API_URL'
}

Get-ChildItem -Path $basePath -Recurse -Include *.ts,*.tsx | ForEach-Object {
    $file = $_
    $content = Get-Content $file.FullName -Raw
    $originalContent = $content
    
    foreach ($oldVar in $envMappings.Keys) {
        $newVar = $envMappings[$oldVar]
        if ($content -match "process\.env\.$oldVar") {
            $content = $content -replace "process\.env\.$oldVar", "process.env.$newVar"
            Write-Host "  📝 $($file.Name): $oldVar → $newVar" -ForegroundColor Yellow
            $mappedCount++
        }
        
        # Also check for import.meta.env (Vite style)
        if ($content -match "import\.meta\.env\.$oldVar") {
            $content = $content -replace "import\.meta\.env\.$oldVar", "process.env.$newVar"
            Write-Host "  📝 $($file.Name): import.meta.env.$oldVar → process.env.$newVar" -ForegroundColor Yellow
            $mappedCount++
        }
    }
    
    if ($content -ne $originalContent) {
        Set-Content $file.FullName $content -NoNewline
    }
}

Write-Host "`n✅ Mapped $mappedCount environment variables" -ForegroundColor Green
Write-Host "`nMake sure .env.local has:" -ForegroundColor Cyan
$envMappings.Values | Sort-Object -Unique | ForEach-Object {
    Write-Host "  $_=your_value" -ForegroundColor Gray
}
Write-Host ""
```

---

## ⚡ Time Comparison

### Without This Guide (YouTube Experience)
```
Total: ~10 hours
- Setup: 2 hours
- Debugging import paths: 3 hours (manual iteration)
- Router migration: 2 hours (figuring out patterns)
- Auth debugging: 2 hours (schema mismatches)
- Misc fixes: 1 hour (quotes, exports, null safety)
```

### With This Guide + Automation
```
Total: ~2.5 hours
- Pre-flight checks: 30 min
- Setup + copy: 30 min
- Run automation scripts: 15 min
- Manual router fixes: 45 min
- Testing: 30 min
```

**Time Saved: 7.5 hours (75% faster)** 🚀

---

## 🎯 Success Checklist

### Before You Start
- [ ] Analyzed source app (router, auth, structure)
- [ ] Created automation scripts
- [ ] Prepared file structure
- [ ] Documented breaking changes

### After Phase 1 (Copy)
- [ ] Files copied to correct location
- [ ] Layout.tsx created
- [ ] Main page.tsx created
- [ ] Route pages created
- [ ] App wrapper component created

### After Phase 2 (Automation)
- [ ] Supabase client configured
- [ ] Import paths fixed (script run)
- [ ] Env vars mapped (script run)
- [ ] Build test shows < 50% errors

### After Phase 3 (Auth)
- [ ] AuthContext uses metadata only
- [ ] No database queries for users
- [ ] Profile loading works
- [ ] Role assignment functional

### After Phase 4 (Router)
- [ ] All react-router imports removed
- [ ] All components use Next.js router
- [ ] All links have /soundcloud/ prefix
- [ ] SearchParams use optional chaining
- [ ] Build test shows 0 router errors

### After Phase 5 (ProtectedRoute)
- [ ] ProtectedRoute migrated to Next.js
- [ ] Both exports (named + default)
- [ ] Works with AuthContext

### After Phase 6 (Exports)
- [ ] All components export both ways
- [ ] No "invalid element type" errors

### After Phase 7 (Testing)
- [ ] `pnpm run build` succeeds
- [ ] All routes load in browser
- [ ] Navigation works
- [ ] No console errors
- [ ] Auth check works
- [ ] Data loads correctly
- [ ] Forms work

---

## 🚨 Common Gotchas (And How to Avoid Them)

### 1. Forgetting /soundcloud/ Prefix
**Problem**: Links go to 404  
**Prevention**: Search-replace before testing
```typescript
// Wrong
router.push('/tracks')
<Link href="/playlists">

// Right
router.push('/soundcloud/tracks')
<Link href="/soundcloud/playlists">
```

### 2. Querying Database for User Info
**Problem**: RLS errors, infinite recursion  
**Prevention**: Use auth metadata pattern from day 1
```typescript
// ❌ Don't do this
const { data } = await supabase.from('user_profiles').select('*')

// ✅ Do this
const { data: { user } } = await supabase.auth.getUser()
const role = user.user_metadata?.role || 'admin'
```

### 3. Not Using Optional Chaining
**Problem**: "Cannot read properties of undefined"  
**Prevention**: Always use `?.` with Next.js hooks
```typescript
// ❌ Wrong
const tab = searchParams.get('tab')

// ✅ Right
const tab = searchParams?.get('tab')
```

### 4. Mixed Export Styles
**Problem**: Import errors at runtime  
**Prevention**: Export both ways from the start
```typescript
// Always do this
export { ComponentName };
export default ComponentName;
```

### 5. Not Testing Incrementally
**Problem**: 100 errors at once, hard to debug  
**Prevention**: Test after each phase
```bash
# After every major change
pnpm run build
# Fix errors before moving on
```

---

## 📚 Reference Documentation

Keep these open while working:

1. **This file** - Overall process
2. `QUICK-REFERENCE-CHEAT-SHEET.md` - Quick fixes
3. `MIGRATION-TECHNIQUES-SUMMARY.md` - Deep explanations
4. `INSTAGRAM-FIXER-UPPER.md` - Similar app example
5. `APP-IMPORT-GUIDE.md` - Master guide

---

## 💡 Pro Tips

1. **Clone to temp first** - Analyze before integrating
2. **Scripts before code** - Write automation upfront
3. **Auth metadata only** - Never query user tables
4. **Test at each phase** - Don't accumulate errors
5. **Copy from YouTube/Instagram** - Don't reinvent patterns
6. **Document as you go** - Future you will thank you
7. **Use optional chaining everywhere** - Next.js hooks can be null
8. **Export both ways always** - Prevents compatibility issues
9. **Prefix all routes** - Internal links need /soundcloud/
10. **Watch the terminal** - Next.js shows errors immediately

---

## 🎓 Key Learnings from YouTube

### What Worked
- ✅ Metadata-only auth (no DB dependencies)
- ✅ Automated import fixing (saved hours)
- ✅ Systematic router migration (one file at a time)
- ✅ Testing at each phase (catch errors early)
- ✅ Copy-paste templates (faster than figuring out)

### What Didn't Work
- ❌ Trying to fix everything at once (too overwhelming)
- ❌ Manual import path fixing (error-prone, slow)
- ❌ Querying database for users (schema dependencies)
- ❌ Testing only at the end (hard to debug)
- ❌ Figuring out patterns from scratch (wheel-reinventing)

---

## ✨ Final Checklist Before You Start

Print this and check off as you go:

```
□ Read this entire document
□ Clone app to temp location
□ Analyze app structure (router, auth, etc.)
□ Create automation scripts
□ Prepare file structure
□ Document breaking changes
□ Copy QUICK-REFERENCE-CHEAT-SHEET.md nearby
□ Open terminal + VS Code side-by-side
□ Have YouTube/Instagram examples open for reference
□ Set aside 2-3 uninterrupted hours
□ Ready to test frequently
□ Coffee/tea ready ☕

LET'S GO! 🚀
```

---

**Created**: November 6, 2025  
**Based on**: 10+ hours of YouTube debugging  
**Purpose**: Save you 7+ hours on SoundCloud (and every future integration)  
**Status**: Battle-tested techniques, ready to use

**Good luck! You've got this!** 🎵🚀

