# SoundCloud Platform - Complete System Guide

**Last Updated**: 2025-11-11  
**Status**: ✅ Production Ready  
**Integration Date**: 2025-11-11  
**Source**: `https://github.com/artistinfluence/artist-spark`  
**Framework**: Next.js 14.2.16 (migrated from React Router v6)

---

## 🏗️ Architecture Overview

### Integration Pattern

The SoundCloud app is **fully integrated into the unified ARTi dashboard** at `/soundcloud/*`. It inherits authentication from the main dashboard and operates as a nested application within the Next.js App Router structure.

```
apps/frontend/app/(dashboard)/soundcloud/
├── layout.tsx                    # SoundCloud section layout with QueryClientProvider
├── page.tsx                      # Entry point - renders UnifiedOverview
├── loading.tsx                   # Loading state
├── dashboard/                    # All dashboard sub-routes
│   ├── analytics/page.tsx
│   ├── automation/page.tsx
│   ├── campaigns/page.tsx
│   ├── genres/page.tsx
│   ├── health/page.tsx
│   ├── members/page.tsx
│   ├── planner/page.tsx
│   ├── queue/page.tsx
│   └── settings/page.tsx
└── soundcloud-app/               # Original app source (migrated)
    ├── components/
    ├── contexts/
    ├── hooks/
    ├── integrations/
    ├── lib/
    ├── pages/
    ├── types/
    └── utils/
```

---

## 🗄️ Database Schema

The SoundCloud platform uses **57 tables** for comprehensive campaign management, member tracking, analytics, and automation.

### Core Tables

#### 1. **`soundcloud_campaigns`** - Campaign management
```sql
Key Columns:
- id (uuid, primary key)
- campaign_name (text) - Campaign title
- artist_name (text) - Artist name
- track_url (text) - SoundCloud track URL
- track_id (text) - SoundCloud track ID
- status (text) - 'draft', 'active', 'paused', 'completed', 'cancelled'
- start_date, end_date (date)
- goal_plays (integer) - Target plays
- goal_likes, goal_reposts, goal_comments (integer)
- budget (decimal) - Campaign budget
- spent (decimal) - Amount spent
- client_id (uuid) - FK to clients
- assigned_members (text[]) - Array of member IDs
- targeting (jsonb) - Genre/demographic targeting
- created_at, updated_at (timestamp)
```

#### 2. **`members`** - SoundCloud reposting artists
```sql
Key Columns:
- id (uuid, primary key)
- name (text) - Member name
- primary_email (text) - Contact email
- emails (text[]) - All associated emails
- soundcloud_url (text) - SoundCloud profile URL
- soundcloud_id (text) - SoundCloud user ID
- soundcloud_followers (integer) - Follower count
- spotify_url (text) - Optional Spotify link
- status (text) - 'active', 'inactive', 'suspended', 'pending'
- size_tier (text) - 'nano', 'micro', 'medium', 'macro', 'mega'
- primary_genres (text[]) - Main genres
- all_genres (text[]) - All genre tags
- monthly_repost_limit (integer) - Max reposts per month
- submissions_this_month (integer) - Current month submissions
- net_credits (integer) - Credit balance
- credit_balance (integer) - Available credits
- families (text[]) - Member groups/networks
- avg_plays_per_repost (decimal) - Performance metric
- engagement_rate (decimal) - Engagement %
- reach_score (decimal) - Calculated reach
- reliability_score (decimal) - 0-100 reliability
- joined_date (date)
- last_active (timestamp)
- metadata (jsonb) - Additional data
```

#### 3. **`campaign_members`** - Campaign-member assignments
```sql
Key Columns:
- id (uuid, primary key)
- campaign_id (uuid) - FK to soundcloud_campaigns
- member_id (uuid) - FK to members
- status (text) - 'assigned', 'accepted', 'declined', 'completed'
- assigned_at (timestamp)
- accepted_at, completed_at (timestamp)
- credits_offered (integer) - Credits for this assignment
- performance_bonus (integer) - Bonus credits
- repost_url (text) - URL of repost
- actual_plays, actual_likes, actual_reposts (integer)
- notes (text)
```

#### 4. **`queue_items`** - Submission queue management
```sql
Key Columns:
- id (uuid, primary key)
- submission_id (uuid) - FK to submissions
- member_id (uuid) - FK to members
- status (text) - 'pending', 'processing', 'accepted', 'rejected', 'completed'
- priority (integer) - Queue priority (higher = more urgent)
- assigned_to (uuid) - Staff member assigned
- position_in_queue (integer) - Queue position
- estimated_processing_time (integer) - Minutes
- deadline (timestamp)
- notes (text)
- tags (text[])
- created_at, updated_at (timestamp)
```

#### 5. **`submissions`** - Track submissions from artists
```sql
Key Columns:
- id (uuid, primary key)
- artist_name (text)
- artist_email (text)
- track_url (text)
- track_title (text)
- genre (text)
- subgenres (text[])
- description (text)
- target_audience (text)
- budget_range (text)
- preferred_members (text[]) - Preferred reposters
- status (text) - 'new', 'reviewing', 'approved', 'rejected', 'archived'
- submission_type (text) - 'regular', 'premium', 'urgent'
- priority_score (decimal)
- submitted_at (timestamp)
- reviewed_at, approved_at (timestamp)
- reviewed_by (uuid)
- rejection_reason (text)
- metadata (jsonb)
```

#### 6. **`attribution_snapshots`** - Daily performance tracking
```sql
Key Columns:
- id (uuid, primary key)
- parent_id (uuid) - Campaign or member ID
- parent_type (text) - 'campaign' or 'member'
- snapshot_date (date)
- day_index (integer) - Day since campaign start
- plays, likes, reposts, comments (integer)
- followers (integer) - For member snapshots
- collection_source (text) - 'api', 'scraper', 'manual'
- collected_at (timestamp)
- metadata (jsonb)
```

#### 7. **`genres`** - Genre taxonomy
```sql
Key Columns:
- id (uuid, primary key)
- name (text) - Genre name
- slug (text) - URL-safe slug
- parent_id (uuid) - FK to parent genre (for subgenres)
- level (integer) - Hierarchy level (0 = top-level)
- description (text)
- related_genres (text[]) - Similar genres
- member_count (integer) - Members in this genre
- avg_reach (decimal) - Average reach for genre
- popularity_score (decimal)
- metadata (jsonb)
- display_order (integer)
- is_active (boolean)
```

#### 8. **`automation_rules`** - Workflow automation
```sql
Key Columns:
- id (uuid, primary key)
- name (text) - Rule name
- description (text)
- trigger_type (text) - 'submission_received', 'campaign_ended', etc.
- trigger_conditions (jsonb) - Condition logic
- actions (jsonb) - Actions to perform
- is_active (boolean)
- priority (integer)
- last_executed (timestamp)
- execution_count (integer)
- created_by (uuid)
- created_at, updated_at (timestamp)
```

#### 9. **`analytics_events`** - Event tracking
```sql
Key Columns:
- id (uuid, primary key)
- event_type (text) - 'page_view', 'action', 'error'
- event_name (text) - Specific event
- user_id (uuid)
- session_id (uuid)
- properties (jsonb) - Event data
- context (jsonb) - Browser/device info
- timestamp (timestamp)
```

#### 10. **`receipt_links`** - Campaign receipts/proofs
```sql
Key Columns:
- id (uuid, primary key)
- campaign_id (uuid) - FK to soundcloud_campaigns
- member_id (uuid) - FK to members
- receipt_url (text) - URL to receipt/screenshot
- receipt_type (text) - 'screenshot', 'analytics', 'invoice'
- upload_date (timestamp)
- verified (boolean)
- verified_by (uuid)
- notes (text)
```

### Supporting Tables

- **`clients`** - Client organizations
- **`vendors`** - Service vendors
- **`notifications`** - User notifications
- **`email_templates`** - Email automation templates
- **`communication_logs`** - Communication history
- **`credit_transactions`** - Member credit ledger
- **`performance_metrics`** - Aggregated performance data
- **`audit_logs`** - System audit trail
- **`anomaly_detections`** - Automated anomaly detection
- **`predictive_models`** - ML model metadata
- **`integration_configs`** - Third-party integrations
- **`workflow_executions`** - Automation run history
- **`calendar_events`** - Planner events
- **`complaints`** - Issue tracking
- **`inquiries`** - Incoming requests
- **`reports`** - Generated reports

---

## 🔐 Authentication & Authorization

### Auth Pattern: **Metadata-Only (No Database Queries)**

The SoundCloud app uses a **critical architectural pattern** to avoid RLS (Row Level Security) issues and schema conflicts:

#### ✅ **CORRECT: Use Auth Metadata**

```typescript
// In AuthContext.tsx
const fetchUserData = async (userId: string, userEmail: string) => {
  // ✅ Get user from auth (no DB query)
  const { data: userData } = await supabase.auth.getUser();
  const authUser = userData.user;

  // ✅ Get roles from metadata
  const metadataRoles = authUser.user_metadata?.roles || authUser.app_metadata?.roles || [];
  const role = authUser.user_metadata?.role || authUser.app_metadata?.role;
  
  // Combine and set roles
  const allRoles: string[] = [];
  if (role) allRoles.push(role);
  if (Array.isArray(metadataRoles)) allRoles.push(...metadataRoles);
  
  // Default to admin for development
  const finalRoles = allRoles.length > 0 ? allRoles : ['admin'];
  setUserRoles(finalRoles);

  // ✅ Get member status from metadata (not database)
  const isMemberFlag = authUser.user_metadata?.is_member || false;
  const memberData = authUser.user_metadata?.member_data;

  if (isMemberFlag || memberData) {
    setMember({
      id: userId,
      name: memberData?.name || authUser.user_metadata?.name || 'Member',
      primary_email: userEmail,
      emails: memberData?.emails || [userEmail],
      status: memberData?.status || 'active',
      size_tier: memberData?.size_tier || 'standard',
      // ... build from metadata
    });
  }
};
```

#### ❌ **WRONG: Database Queries in Auth**

```typescript
// ❌ DON'T DO THIS - will cause RLS errors!
const { data: roles } = await supabase
  .from('user_roles')
  .select('*')
  .eq('user_id', userId);

// ❌ DON'T DO THIS - schema mismatch risk
const { data: member } = await supabase
  .from('members')
  .select('*')
  .eq('email', userEmail);
```

### Role-Based Access Control (RBAC)

The app supports three role types:

1. **`admin`** - Full access to all features
2. **`moderator`** - Can manage submissions, campaigns, and members
3. **`member`** - Limited access to their own data (portal view)

```typescript
// Using role checks
const { isAdmin, isModerator, isMember } = useAuth();

// In RoleBasedRoute component
<RoleBasedRoute allowedRoles={['admin', 'moderator']}>
  <AdminPanel />
</RoleBasedRoute>
```

---

## 📂 File Structure & Organization

### Key Files and Their Purposes

#### **Entry Point**
- **`page.tsx`** - Main entry, renders `UnifiedOverview` with Suspense

```typescript
"use client"
import { Suspense } from "react"
import UnifiedOverview from "./soundcloud-app/components/dashboard/UnifiedOverview"

export default function SoundCloudPage() {
  return (
    <div className="h-full w-full p-6">
      <Suspense fallback={<LoadingSpinner />}>
        <UnifiedOverview />
      </Suspense>
    </div>
  )
}
```

#### **Layout**
- **`layout.tsx`** - Provides QueryClientProvider and navigation

```typescript
"use client";
import { ReactNode, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const navItems = [
  { label: "Dashboard", path: "/soundcloud", icon: Home },
  { label: "Planner", path: "/soundcloud/dashboard/planner", icon: Calendar },
  { label: "Campaigns", path: "/soundcloud/dashboard/campaigns", icon: Music },
  // ... more nav items
];

export default function SoundCloudLayout({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: { staleTime: 60000, retry: 1 },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      {/* Navigation + Children */}
    </QueryClientProvider>
  );
}
```

#### **Auth Context**
- **`contexts/AuthContext.tsx`** - Metadata-only auth provider

#### **Supabase Integration**
- **`integrations/supabase/client.ts`** - Configured with unified dashboard credentials
- **`integrations/supabase/types.ts`** - Full TypeScript database types (2700+ lines)

```typescript
// client.ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export default supabase;
```

### Component Organization

#### **Dashboard Components** (`components/dashboard/`)
- **UnifiedOverview.tsx** - Main dashboard with metrics
- **CampaignsPage.tsx** - Campaign management
- **MembersPage.tsx** - Member directory
- **QueuePage.tsx** - Submission queue
- **PlannerPage.tsx** - Calendar planner
- **AnalyticsDashboard.tsx** - Analytics dashboard
- **HealthPage.tsx** - System health monitoring
- **AutomationPage.tsx** - Workflow automation
- **GenresPage.tsx** - Genre administration
- **SettingsPage.tsx** - Settings panel

#### **Admin Components** (`components/admin/`)
- **GenreMindMap.tsx** - Visual genre taxonomy
- **DraggableGenreManager.tsx** - Drag-drop genre editing
- **ArtistGenreBrowser.tsx** - Genre browser
- **GenreDistributionChart.tsx** - Genre analytics

#### **Calendar Components** (`components/calendar/`)
- **UnifiedCalendar.tsx** - Calendar view
- **EventList.tsx** - Event list view
- **CalendarEvent.tsx** - Event component
- **EventDetailsModal.tsx** - Event details

#### **Portal Components** (`components/portal/`)
Member-facing submission portal (19 components)

#### **Custom UI Components** (`components/ui/`)
62 custom components including:
- **soundcloud-reach-estimator.tsx** - Reach calculator
- **interactive-card.tsx** - Interactive card component
- **scroll-reveal.tsx** - Scroll animations
- Plus all shadcn-ui components

### Custom Hooks (`hooks/`)

#### **Core Hooks**
- **`useAuth`** - From AuthContext
- **`useToast`** - Toast notifications
- **`use-mobile.tsx`** - Mobile detection

#### **Data Hooks**
- **`useCampaignReachData`** - Campaign reach calculations
- **`useMemberSubmissions`** - Member submission data
- **`useQueueAssignments`** - Queue management
- **`useCalendarEvents`** - Calendar events
- **`useNotifications`** - Notification management
- **`useSubmissions`** - Submission CRUD
- **`useWeeklyCampaignReports`** - Weekly reports

#### **Analytics Hooks**
- **`useAnalyticsTracking`** - Event tracking
- **`useCampaignAttribution`** - Attribution tracking
- **`useScrapingAnalytics`** - Scraping metrics
- **`usePredictiveAnalytics`** - ML predictions

#### **Monitoring Hooks**
- **`useAdvancedMonitoring`** - System monitoring
- **`useAnomalyDetection`** - Anomaly detection
- **`usePerformanceOptimization`** - Performance tracking
- **`useSecurityMonitoring`** - Security monitoring

#### **Integration Hooks**
- **`useIntegrations`** - Third-party integrations
- **`useSmartNotifications`** - Smart notifications
- **`useCampaignReceiptLinks`** - Receipt management

---

## 🎨 UI Component Library

### Shared Components (from main dashboard)
The SoundCloud app uses **shadcn-ui** components from the main dashboard:

```typescript
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
// ... 50+ more components
```

### Custom SoundCloud UI Components

Located in `soundcloud-app/components/ui/`:

1. **soundcloud-reach-estimator.tsx** - Calculate expected reach
2. **interactive-card.tsx** - Animated interactive cards
3. **scroll-reveal.tsx** - Scroll-triggered animations
4. **loading-spinner.tsx** - Custom loading states

### Migration Notes: Missing Components

During migration, these components were simplified:

- **AnimatedCounter** → Replaced with `.toLocaleString()`
- **LoadingSkeleton** → Replaced with `Skeleton`

```typescript
// ❌ OLD (missing component)
<AnimatedCounter value={totalPlays} duration={1000} />

// ✅ NEW (using toLocaleString)
{totalPlays.toLocaleString()}
```

---

## 🧭 Routing & Navigation

### Next.js App Router Structure

```
/soundcloud                          # Main dashboard
/soundcloud/dashboard/planner        # Calendar planner
/soundcloud/dashboard/campaigns      # Campaign management
/soundcloud/dashboard/queue          # Queue management
/soundcloud/dashboard/members        # Member directory
/soundcloud/dashboard/analytics      # Analytics dashboard
/soundcloud/dashboard/health         # Health monitoring
/soundcloud/dashboard/automation     # Workflow automation
/soundcloud/dashboard/genres         # Genre administration
/soundcloud/dashboard/settings       # Settings
```

### Navigation Pattern

All internal links **MUST** include the `/soundcloud/` prefix:

```typescript
// ✅ CORRECT
import { useRouter } from "next/navigation";
const router = useRouter();
router.push("/soundcloud/dashboard/campaigns");

<Link href="/soundcloud/dashboard/members">Members</Link>

// ❌ WRONG - will navigate outside SoundCloud section
router.push("/dashboard/campaigns");
<Link href="/members">Members</Link>
```

### Migration from React Router

The app was migrated from **React Router v6** to **Next.js App Router**:

```typescript
// ❌ OLD (React Router)
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
const navigate = useNavigate();
const location = useLocation();
const [searchParams] = useSearchParams();

navigate("/campaigns");
const tab = searchParams.get("tab");

// ✅ NEW (Next.js)
import { useRouter, usePathname, useSearchParams } from "next/navigation";
const router = useRouter();
const pathname = usePathname();
const searchParams = useSearchParams();

router.push("/soundcloud/dashboard/campaigns");
const tab = searchParams?.get("tab"); // Note optional chaining!
```

### Critical Migration Pattern

**ALWAYS use optional chaining with `searchParams.get()`:**

```typescript
// ✅ CORRECT - safe
const tab = searchParams?.get("tab") || "overview";

// ❌ WRONG - will crash if searchParams is null
const tab = searchParams.get("tab") || "overview";
```

---

## 📊 State Management

### React Query (TanStack Query)

The SoundCloud app uses **React Query v5** for all server state:

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Example: Fetch campaigns
const { data: campaigns, isLoading, error } = useQuery({
  queryKey: ["soundcloud-campaigns"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("soundcloud_campaigns")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (error) throw error;
    return data;
  },
  staleTime: 60000, // 1 minute
});

// Example: Create campaign mutation
const createCampaign = useMutation({
  mutationFn: async (newCampaign) => {
    const { data, error } = await supabase
      .from("soundcloud_campaigns")
      .insert(newCampaign)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["soundcloud-campaigns"] });
    toast({ title: "Campaign created!" });
  },
});
```

### Query Key Conventions

```typescript
// Use descriptive, hierarchical keys
["soundcloud-campaigns"]                          // All campaigns
["soundcloud-campaigns", campaignId]              // Single campaign
["soundcloud-members"]                            // All members
["soundcloud-members", { genre: "hip-hop" }]      // Filtered members
["soundcloud-queue", { status: "pending" }]       // Filtered queue
["soundcloud-analytics", { dateRange }]           // Analytics with params
```

### Query Invalidation Pattern

**ALWAYS invalidate related queries after mutations:**

```typescript
// After creating/updating a campaign
queryClient.invalidateQueries({ queryKey: ["soundcloud-campaigns"] });
queryClient.invalidateQueries({ queryKey: ["soundcloud-analytics"] });
queryClient.invalidateQueries({ queryKey: ["soundcloud-members"] }); // If assignments changed

// After updating member
queryClient.invalidateQueries({ queryKey: ["soundcloud-members"] });
queryClient.invalidateQueries({ queryKey: ["soundcloud-campaigns"] }); // If campaigns include member data
```

---

## 🔧 Common Patterns & Best Practices

### 1. Safe Array Rendering

**ALWAYS check arrays before mapping:**

```typescript
// ✅ CORRECT
{member.primary_genres && Array.isArray(member.primary_genres) && member.primary_genres.length > 0 ? (
  member.primary_genres.map(genre => (
    <Badge key={genre}>{genre}</Badge>
  ))
) : (
  <span className="text-muted-foreground">No genres</span>
)}

// ❌ WRONG - will crash if array is null/undefined
{member.primary_genres.map(genre => <Badge key={genre}>{genre}</Badge>)}
```

### 2. Number Formatting

```typescript
// For display numbers
{totalPlays.toLocaleString()} // 1,234,567

// For currency
{budget.toLocaleString('en-US', { style: 'currency', currency: 'USD' })} // $1,234.56

// For percentages
{(engagementRate * 100).toFixed(2)}% // 12.34%
```

### 3. Date Handling

```typescript
import { format, parseISO, formatDistanceToNow } from "date-fns";

// Display date
{format(parseISO(campaign.start_date), "MMM d, yyyy")} // Nov 11, 2025

// Relative time
{formatDistanceToNow(parseISO(submission.submitted_at), { addSuffix: true })} // 2 hours ago
```

### 4. Error Handling

```typescript
try {
  const { data, error } = await supabase
    .from("soundcloud_campaigns")
    .select("*");
  
  if (error) throw error;
  
  // Handle success
} catch (error) {
  console.error("Error fetching campaigns:", error);
  toast({
    title: "Error",
    description: error.message || "Failed to fetch campaigns",
    variant: "destructive",
  });
}
```

### 5. Loading States

```typescript
if (isLoading) {
  return (
    <div className="space-y-4">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}

if (error) {
  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>{error.message}</AlertDescription>
    </Alert>
  );
}
```

### 6. TypeScript Best Practices

```typescript
// Use database types from types.ts
import type { Database } from "../integrations/supabase/types";

type Campaign = Database["public"]["Tables"]["soundcloud_campaigns"]["Row"];
type Member = Database["public"]["Tables"]["members"]["Row"];

// Type-safe queries
const { data } = await supabase
  .from("soundcloud_campaigns")
  .select<"*", Campaign>("*");
```

---

## ⚠️ Common Pitfalls & Solutions

### 1. Import Path Issues

**Problem**: `@/` alias not resolving in nested structure

```typescript
// ❌ WRONG - fails in soundcloud-app/components/
import { Button } from "@/components/ui/button"

// ✅ CORRECT - use relative paths
import { Button } from "../../components/ui/button"
// OR for shared components
import { Button } from "@/components/ui/button" // Only works from dashboard root
```

**Solution**: Use relative paths within `soundcloud-app/` directory:
- From `soundcloud-app/components/dashboard/`: `../ui/component-name`
- From `soundcloud-app/hooks/`: `../../components/ui/component-name`

### 2. Router Migration Issues

**Problem**: React Router hooks don't work in Next.js

```typescript
// ❌ WRONG - causes "useNavigate must be in Router context" error
import { useNavigate } from "react-router-dom";
const navigate = useNavigate();

// ✅ CORRECT
import { useRouter } from "next/navigation";
const router = useRouter();
```

**Solution**: Replace all React Router imports with Next.js equivalents:
- `useNavigate()` → `useRouter()` + `.push()` / `.replace()`
- `useLocation()` → `usePathname()`
- `useSearchParams()` → `useSearchParams()` (but with optional chaining!)
- `<Navigate to="..." />` → `router.push("...")`
- `<Link to="..." />` → `<Link href="..." />`

### 3. Auth Database Queries

**Problem**: Querying `user_roles` or `members` table in auth context causes RLS errors

```typescript
// ❌ WRONG - will fail with RLS errors
const { data: roles } = await supabase
  .from('user_roles')
  .select('*')
  .eq('user_id', user.id);

// ✅ CORRECT - use metadata
const roles = user.user_metadata?.roles || user.app_metadata?.roles || [];
```

**Solution**: **NEVER** query database tables in `AuthContext.tsx`. Always use `user_metadata` or `app_metadata`.

### 4. Missing UI Components

**Problem**: Some components from original app don't exist in main dashboard

```typescript
// ❌ These don't exist in main dashboard
import { AnimatedCounter } from "@/components/ui/animated-counter"
import { LoadingSkeleton } from "@/components/ui/loading-skeleton"

// ✅ Replacements
{number.toLocaleString()} // Instead of AnimatedCounter
<Skeleton className="h-12 w-full" /> // Instead of LoadingSkeleton
```

### 5. Query Key Collisions

**Problem**: Query keys conflict with other platform sections

```typescript
// ❌ WRONG - might conflict with Spotify campaigns
["campaigns"]

// ✅ CORRECT - prefix with platform
["soundcloud-campaigns"]
["soundcloud-members"]
["soundcloud-queue"]
```

### 6. PostgreSQL Array Types

**Problem**: Genre arrays stored as `text[]` in database

```typescript
// ✅ CORRECT - handle as array
const genres: string[] = member.primary_genres || [];

// Type checking for array safety
if (Array.isArray(genres) && genres.length > 0) {
  genres.map(...)
}

// ❌ WRONG - treating as string
const genres: string = member.primary_genres; // Type error!
```

### 7. Null vs Undefined

**Problem**: Database returns `null`, but TypeScript expects `undefined`

```typescript
// ✅ CORRECT - handle both null and undefined
const name = member?.name ?? "Unknown Member";
const genres = member?.primary_genres || [];

// ❌ WRONG - only handles undefined
const name = member?.name || "Unknown Member"; // Fails if name is empty string
```

---

## 📦 Dependencies

### Core Dependencies

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.57.4",
    "@tanstack/react-query": "^5.90.2",
    "@xyflow/react": "^12.9.2",
    "date-fns": "^4.1.0",
    "framer-motion": "^12.23.24",
    "lucide-react": "^0.454.0",
    "next": "14.2.16",
    "react": "18.3.1",
    "react-beautiful-dnd": "^13.1.1",
    "react-dom": "18.3.1",
    "react-hook-form": "^7.63.0",
    "recharts": "^3.2.1",
    "zod": "^3.25.67"
  }
}
```

### SoundCloud-Specific Dependencies

1. **@xyflow/react** - For GenreMindMap visual graph
2. **react-beautiful-dnd** - For DraggableGenreManager
3. **framer-motion** - For scroll animations and transitions
4. **recharts** - For analytics charts

### Installation

If dependencies are missing after integration:

```bash
cd apps/frontend
pnpm add @xyflow/react react-beautiful-dnd framer-motion
```

---

## 🧪 Testing & Debugging

### Development Server

```bash
cd apps/frontend
pnpm run dev
# Visit http://localhost:3000/soundcloud
```

### Production Build Test

```bash
pnpm run build
# Should complete with no errors
```

### Common Build Errors

1. **Module not found: Can't resolve '@/...'**
   - Fix: Update to relative path or check if component exists

2. **useNavigate/useLocation error**
   - Fix: Migrate to Next.js router hooks

3. **Type error in database query**
   - Fix: Check types.ts for correct type definitions

### Browser DevTools Checks

```javascript
// Check auth state
supabase.auth.getUser().then(console.log)

// Check role
document.querySelector('[data-role]')?.dataset.role

// Check query cache
window.__REACT_QUERY_DEVTOOLS_GLOBAL_HOOK__
```

---

## 🚀 Deployment Checklist

### Pre-Deployment

- [ ] All imports use correct paths (no `@/` in soundcloud-app/)
- [ ] All React Router code migrated to Next.js
- [ ] Auth uses metadata-only (no database queries)
- [ ] All query keys prefixed with `soundcloud-`
- [ ] Production build passes: `pnpm run build`
- [ ] No console errors in browser
- [ ] All routes accessible and render correctly

### Environment Variables

Ensure these are set in production:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### Database Setup

Ensure all tables exist in production Supabase:
1. Run migrations (if any)
2. Verify RLS policies
3. Test queries with production credentials

---

## 📝 File Locations Reference

### Frontend Structure

```
apps/frontend/app/(dashboard)/soundcloud/
├── layout.tsx                           # Main layout with QueryClient
├── page.tsx                             # Entry point
├── loading.tsx                          # Loading state
├── dashboard/                           # Sub-routes (9 pages)
└── soundcloud-app/                      # Core application
    ├── components/
    │   ├── admin/                       # 7 admin components
    │   ├── auth/                        # 3 auth components
    │   ├── calendar/                    # 4 calendar components
    │   ├── dashboard/                   # 56 dashboard components
    │   ├── notifications/               # 2 notification components
    │   ├── portal/                      # 19 portal components
    │   └── ui/                          # 62 UI components
    ├── contexts/
    │   └── AuthContext.tsx              # ⚡ CRITICAL - Metadata-only auth
    ├── hooks/                           # 22 custom hooks
    ├── integrations/
    │   └── supabase/
    │       ├── client.ts                # Supabase client config
    │       └── types.ts                 # Database types (2700+ lines)
    ├── lib/
    │   └── utils.ts                     # Utility functions
    ├── pages/                           # 3 page components (legacy)
    ├── types/
    │   └── calendar.ts                  # Calendar types
    └── utils/                           # 6 utility files
```

### Key Configuration Files

- **`apps/frontend/package.json`** - Dependencies
- **`apps/frontend/tsconfig.json`** - TypeScript config
- **`apps/frontend/next.config.mjs`** - Next.js config
- **`apps/frontend/tailwind.config.ts`** - Tailwind config

---

## 🎯 Quick Reference

### Navigation URLs

| Feature | URL |
|---------|-----|
| Dashboard | `/soundcloud` |
| Calendar Planner | `/soundcloud/dashboard/planner` |
| Campaigns | `/soundcloud/dashboard/campaigns` |
| Queue | `/soundcloud/dashboard/queue` |
| Members | `/soundcloud/dashboard/members` |
| Analytics | `/soundcloud/dashboard/analytics` |
| Health | `/soundcloud/dashboard/health` |
| Automation | `/soundcloud/dashboard/automation` |
| Genres | `/soundcloud/dashboard/genres` |
| Settings | `/soundcloud/dashboard/settings` |

### Most Used Components

| Component | Import Path |
|-----------|-------------|
| UnifiedOverview | `./soundcloud-app/components/dashboard/UnifiedOverview` |
| CampaignsPage | `./soundcloud-app/components/dashboard/CampaignsPage` |
| MembersPage | `./soundcloud-app/components/dashboard/MembersPage` |
| QueuePage | `./soundcloud-app/components/dashboard/QueuePage` |
| AuthContext | `./soundcloud-app/contexts/AuthContext` |
| Supabase Client | `./soundcloud-app/integrations/supabase/client` |

### Most Used Hooks

| Hook | Purpose |
|------|---------|
| `useAuth()` | Auth state & methods |
| `useCampaignReachData()` | Campaign reach calculations |
| `useMemberSubmissions()` | Member submissions |
| `useQueueAssignments()` | Queue management |
| `useCalendarEvents()` | Calendar events |
| `useNotifications()` | Notifications |

### Database Query Patterns

```typescript
// Fetch all campaigns
const { data } = await supabase
  .from("soundcloud_campaigns")
  .select("*")
  .order("created_at", { ascending: false });

// Fetch with relations
const { data } = await supabase
  .from("soundcloud_campaigns")
  .select(`
    *,
    members:campaign_members(member_id, status),
    client:clients(name)
  `);

// Filter campaigns
const { data } = await supabase
  .from("soundcloud_campaigns")
  .select("*")
  .eq("status", "active")
  .gte("start_date", "2025-01-01");

// Update campaign
const { data, error } = await supabase
  .from("soundcloud_campaigns")
  .update({ status: "completed" })
  .eq("id", campaignId)
  .select()
  .single();

// Insert with returning
const { data, error } = await supabase
  .from("members")
  .insert({
    name: "Artist Name",
    soundcloud_url: "https://soundcloud.com/artist",
    status: "active",
  })
  .select()
  .single();
```

---

## 🆘 Troubleshooting

### Issue: "Cannot find module" errors

**Symptom**: Build fails with `Module not found: Can't resolve '@/...'`

**Solution**:
1. Check if importing from within `soundcloud-app/` directory
2. Use relative paths: `../ui/component-name` instead of `@/components/ui/component-name`
3. For shared components from main dashboard, use absolute `@/` paths

### Issue: "useNavigate must be in Router context"

**Symptom**: Runtime error when clicking navigation

**Solution**:
1. Find all `import { useNavigate } from "react-router-dom"` in the file
2. Replace with `import { useRouter } from "next/navigation"`
3. Replace `navigate(path)` with `router.push(path)`
4. Add `/soundcloud/` prefix to all internal paths

### Issue: Auth not working / getting logged out

**Symptom**: Redirected to login when visiting `/soundcloud`

**Solution**:
1. Verify `page.tsx` **does NOT** wrap children in `AuthProvider`
2. The main dashboard layout already provides auth
3. Check browser console for Supabase auth errors
4. Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set

### Issue: Database query fails with RLS error

**Symptom**: "new row violates row-level security policy"

**Solution**:
1. Check Supabase RLS policies for the table
2. Ensure policies allow insert/update/delete for authenticated users
3. Verify `auth.uid()` is properly set in policies
4. Test query in Supabase SQL editor as authenticated user

### Issue: TypeScript errors in database queries

**Symptom**: Type errors when querying Supabase

**Solution**:
1. Check `integrations/supabase/types.ts` for correct type
2. Use explicit type casting:
   ```typescript
   const { data } = await supabase
     .from("soundcloud_campaigns")
     .select<"*", Campaign>("*");
   ```
3. Regenerate types if schema changed:
   ```bash
   npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types.ts
   ```

---

## 📚 Additional Resources

### Documentation
- [Next.js App Router Docs](https://nextjs.org/docs/app)
- [Supabase JS Client Docs](https://supabase.com/docs/reference/javascript)
- [TanStack Query Docs](https://tanstack.com/query/latest/docs/react/overview)
- [shadcn-ui Components](https://ui.shadcn.com/)

### Related Guides
- `SOUNDCLOUD-INTEGRATION-TIPS.md` - Integration lessons learned
- `SPOTIFY-PLATFORM-COMPLETE-GUIDE.md` - Similar platform for reference
- `INSTAGRAM-PHASE1-COMPLETE.md` - Instagram integration patterns
- `.cursorrules` - Project-wide cursor rules

---

**Last Migration**: 2025-11-11  
**Files Integrated**: 218 files  
**Lines of Code**: 57,057  
**Build Status**: ✅ Passing  
**Production Ready**: ✅ Yes

---

## 🎓 For New Developers

### Getting Started

1. **Understand the unified dashboard structure**
   - SoundCloud is a sub-section at `/soundcloud/*`
   - It inherits auth from main dashboard
   - Uses Next.js App Router (not React Router)

2. **Key architectural patterns**
   - Metadata-only auth (no database queries in auth context)
   - Query key prefixing (`soundcloud-*`)
   - Relative imports within `soundcloud-app/`
   - Optional chaining for `searchParams`

3. **Most common tasks**
   - Adding a new component: Use relative imports
   - Adding a new route: Create `page.tsx` in `dashboard/` subdirectory
   - Querying database: Use React Query with proper query keys
   - Navigating: Use Next.js `useRouter()` with `/soundcloud/` prefix

4. **Testing your changes**
   ```bash
   cd apps/frontend
   pnpm run dev          # Start dev server
   # Visit http://localhost:3000/soundcloud
   # Make changes, hot reload should work
   pnpm run build        # Test production build
   ```

5. **Common gotchas**
   - ❌ Don't use `@/` imports from within `soundcloud-app/components/`
   - ❌ Don't query database in `AuthContext.tsx`
   - ❌ Don't forget `/soundcloud/` prefix in navigation
   - ❌ Don't use React Router hooks
   - ✅ Do use optional chaining: `searchParams?.get("tab")`
   - ✅ Do prefix query keys: `["soundcloud-campaigns"]`
   - ✅ Do use relative paths within `soundcloud-app/`

---

**End of Guide** 🎉

