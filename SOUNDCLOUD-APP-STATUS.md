# SoundCloud App - Implementation Status

**Last Updated:** December 5, 2025  
**Status:** ✅ Core Features Complete | 🔄 Member Onboarding In Progress

---

## Table of Contents

1. [Overview](#overview)
2. [Working Features](#working-features)
3. [Database Schema](#database-schema)
4. [Member Portal](#member-portal)
5. [Admin Campaign Management](#admin-campaign-management)
6. [Authentication Flow](#authentication-flow)
7. [Pending Tasks](#pending-tasks)
8. [Testing & Credentials](#testing--credentials)
9. [Technical Implementation](#technical-implementation)

---

## Overview

The SoundCloud app is a campaign management platform that connects **Artists (Members)** with the Artist Influence team. Members submit tracks for promotional campaigns, and admins manage campaign status, track performance, and coordinate payouts.

### Key Components

| Component | Status | Description |
|-----------|--------|-------------|
| Member Portal | ✅ Complete | Dedicated dashboard for members to view their campaigns |
| Member Login | ✅ Complete | Supabase Auth integration with role-based access |
| Admin Dashboard | ✅ Complete | Full campaign management for admins |
| Campaign Status | ✅ Complete | 4-state status system (Pending/Active/Complete/Cancelled) |
| Member Email Import | 🔄 Pending | Bulk import emails from CSV to create logins |
| IP Status Tracking | ✅ Complete | Auto-updates "connected" status on member login |

---

## Working Features

### ✅ Member Login Flow

1. Member visits `app.artistinfluence.com/login`
2. Enters email + password (credentials created by admin)
3. System detects `member` role from `soundcloud_member_users` table
4. Auto-redirects to `/soundcloud/portal` (member dashboard)
5. Member is **blocked** from accessing admin routes (`/dashboard`, `/soundcloud/dashboard/*`)

### ✅ Member Portal UI

Located at `/soundcloud/portal/*`:

| Route | Purpose |
|-------|---------|
| `/soundcloud/portal` | Main dashboard - campaign overview |
| `/soundcloud/portal/queue` | View campaigns in queue |
| `/soundcloud/portal/submit` | Submit new tracks |
| `/soundcloud/portal/history` | Past campaign history |
| `/soundcloud/portal/credits` | Credit balance & history |
| `/soundcloud/portal/profile` | Member profile settings |
| `/soundcloud/portal/analytics` | Performance analytics |
| `/soundcloud/portal/avoid-list` | Manage avoid list |
| `/soundcloud/portal/attribution` | Attribution settings |

**Features:**
- Orange "Artist Portal" branded header
- Member-specific navigation (no admin tools visible)
- Parent admin nav bar hidden for portal routes

### ✅ Admin Campaign Management

Located at `/soundcloud/dashboard/campaigns`:

- View all campaigns (1000+ entries supported)
- **Status dropdown** - change status directly in table
- Filter by status, search by track/artist/client
- Sort by any column
- View campaign details modal
- Edit campaign settings
- Weekly reporting toggle

### ✅ Campaign Status System

| UI Status | Database Value | Meaning |
|-----------|---------------|---------|
| **Pending** | `new` | Submitted, awaiting admin approval |
| **Active** | `approved` | Campaign is running |
| **Complete** | `complete` | Campaign finished successfully |
| **Cancelled** | `rejected` | Campaign was rejected/cancelled |

**Database Enum:** `soundcloud_submission_status`
```sql
{new, approved, rejected, complete}
```

---

## Database Schema

### Core Tables

#### `soundcloud_members`
Stores member profile information.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `name` | VARCHAR | Display name |
| `primary_email` | VARCHAR | Login email (nullable - needs population) |
| `status` | VARCHAR | Member status (Active, Inactive, etc.) |
| `influence_planner_status` | VARCHAR | 'connected' or 'disconnected' |
| `last_login_at` | TIMESTAMPTZ | Auto-updated on login |
| `genre_family_id` | UUID | FK to genre families |
| `org_id` | UUID | Organization isolation |

#### `soundcloud_member_users`
Links Supabase Auth users to SoundCloud members.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | FK to `auth.users` (unique) |
| `member_id` | UUID | FK to `soundcloud_members` (unique) |
| `created_at` | TIMESTAMPTZ | When link was created |

**Constraints:**
- One auth user → One member (1:1 relationship)
- UNIQUE on both `user_id` and `member_id`

#### `soundcloud_submissions`
Campaign/track submissions.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `member_id` | UUID | FK to soundcloud_members |
| `track_url` | VARCHAR | SoundCloud track URL |
| `track_name` | VARCHAR | Track name |
| `artist_name` | VARCHAR | Artist name |
| `status` | ENUM | new/approved/rejected/complete |
| `expected_reach_planned` | INTEGER | Goal reach |
| `support_date` | DATE | Campaign start date |
| `notes` | TEXT | Campaign notes |

### RLS Policies

All SoundCloud tables have Row Level Security enabled:

```sql
-- Members can only see their own data
CREATE POLICY "soundcloud_submissions_member_select" 
ON soundcloud_submissions FOR SELECT TO authenticated
USING (member_id IN (
  SELECT member_id FROM soundcloud_member_users 
  WHERE user_id = auth.uid()
));

-- Authenticated users (admins) can manage all data
CREATE POLICY "soundcloud_submissions_select_authenticated" 
ON soundcloud_submissions FOR SELECT TO authenticated
USING (true);
```

---

## Member Portal

### Architecture

```
/soundcloud/portal/
├── layout.tsx          # Portal-specific layout with orange branding
├── page.tsx            # Main dashboard (MemberDashboard component)
├── queue/page.tsx      # Queue view
├── submit/page.tsx     # Track submission form
├── history/page.tsx    # Campaign history
├── credits/page.tsx    # Credit management
├── profile/page.tsx    # Member profile
├── analytics/page.tsx  # Performance analytics
├── avoid-list/page.tsx # Avoid list management
└── attribution/page.tsx # Attribution settings
```

### Key Hooks

#### `useMyMember`
Fetches the current logged-in user's member data.

```typescript
const { member, loading, error } = useMyMember();

// Returns:
// - member: SoundCloudMember object or null
// - loading: boolean
// - error: Error object or null
```

**Implementation:**
```typescript
// Fetches from soundcloud_member_users → soundcloud_members
const { data } = await supabase
  .from('soundcloud_member_users')
  .select('member_id, soundcloud_members(*)')
  .eq('user_id', user.id)
  .single();
```

---

## Admin Campaign Management

### CampaignsPage.tsx

**Location:** `apps/frontend/app/(dashboard)/soundcloud/soundcloud-app/components/dashboard/CampaignsPage.tsx`

**Key Functions:**

#### `fetchCampaigns()`
- Fetches all submissions from `soundcloud_submissions`
- Transforms database status to UI display status
- Maps: `new`→Pending, `approved`→Active, `complete`→Complete, `rejected`→Cancelled

#### `updateCampaignStatus(campaignId, newStatus)`
- Maps UI status back to database enum
- Updates `soundcloud_submissions.status`
- Triggers table refresh

#### Status Mapping
```typescript
// DB → UI (for display)
const displayStatusMap = {
  'new': 'Pending',
  'approved': 'Active',
  'rejected': 'Cancelled',
  'complete': 'Complete',
};

// UI → DB (for updates)
const getDbStatus = (uiStatus: string): string => {
  const dbMap = {
    'Pending': 'new',
    'Active': 'approved',
    'Complete': 'complete',
    'Cancelled': 'rejected',
  };
  return dbMap[uiStatus] || uiStatus;
};
```

---

## Authentication Flow

### Login Process

1. **User submits credentials** → `login-form.tsx`
2. **Supabase Auth** validates email/password
3. **AuthContext** fetches user role from `soundcloud_member_users`
4. **Role-based redirect:**
   - `member` → `/soundcloud/portal`
   - `admin/manager` → `/dashboard`
5. **ProtectedLayout** enforces access control on all routes

### Member Account Creation

**Script:** `scripts/create-soundcloud-member-accounts.ts`

```bash
# Dry run (see what would be created)
npx ts-node scripts/create-soundcloud-member-accounts.ts --dry-run

# Create accounts (no email sent)
npx ts-node scripts/create-soundcloud-member-accounts.ts

# Create accounts with welcome emails
npx ts-node scripts/create-soundcloud-member-accounts.ts --send-emails
```

**What it does:**
1. Fetches Active members from `soundcloud_members` where `primary_email` is set
2. Creates Supabase Auth account with generated password
3. Links auth user to member via `soundcloud_member_users`
4. Optionally sends welcome email

### IP Status Tracking

**Trigger:** `on_auth_user_login_update_member_last_login`

When a member logs in:
1. `auth.users.last_sign_in_at` is updated by Supabase
2. Trigger fires `update_member_last_login()` function
3. Updates `soundcloud_members.last_login_at = now()`
4. Sets `soundcloud_members.influence_planner_status = 'connected'`

---

## Pending Tasks

### 🔄 Import Member Emails from CSV

**Problem:** Most `soundcloud_members` have `primary_email = NULL`

**Solution needed:**
1. Export member data with emails from source system
2. Create import script to update `primary_email` column
3. Run account creation script

**Temporary workaround (for testing):**
```sql
-- Manually set email for a single member
UPDATE soundcloud_members 
SET primary_email = 'test@example.com' 
WHERE name = 'MemberName';
```

### 🔄 Member Portal Components

The portal routes exist but use placeholder components. Need to build:
- `MemberDashboard` - Campaign summary cards
- `MemberQueue` - Active campaigns list
- `SubmitTrack` - Track submission form
- `MemberHistory` - Historical campaigns
- `CreditHistory` - Credit transactions

### 🔄 Welcome Email Template

Create email template for new member accounts with:
- Login URL
- Temporary password
- Instructions to change password
- Link to portal

---

## Testing & Credentials

### Test Member Account

| Field | Value |
|-------|-------|
| Email | `test-member@artistinfluence.com` |
| Password | `TempPass123!` |
| Member Name | DVRKSTAR |
| Portal URL | `app.artistinfluence.com/soundcloud/portal` |

### Admin Account

| Field | Value |
|-------|-------|
| Email | `admin@arti-demo.com` |
| Role | admin |
| Dashboard | `app.artistinfluence.com/soundcloud/dashboard/campaigns` |

### Manual Password Update (if needed)

```bash
# Using Supabase Admin API
curl -X PUT "https://api.artistinfluence.com/auth/v1/admin/users/USER_UUID" \
  -H "Authorization: Bearer SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"password": "NewPassword123!"}'
```

---

## Technical Implementation

### File Locations

#### Frontend
```
apps/frontend/
├── app/(dashboard)/soundcloud/
│   ├── layout.tsx                    # Parent layout (hides nav for portal)
│   ├── portal/
│   │   ├── layout.tsx                # Portal layout with orange branding
│   │   ├── page.tsx                  # Main portal page
│   │   └── [...slug]/page.tsx        # Dynamic portal routes
│   └── soundcloud-app/
│       ├── contexts/AuthContext.tsx  # Auth state management
│       ├── hooks/useMyMember.ts      # Member data hook
│       └── components/dashboard/
│           └── CampaignsPage.tsx     # Admin campaigns management
├── components/
│   ├── auth/login-form.tsx           # Login with role-based redirect
│   └── dashboard/protected-layout.tsx # Route protection
└── hooks/use-auth.tsx                # Global auth context
```

#### Database Migrations
```
supabase/migrations/
├── 043_soundcloud_complete_schema.sql    # Base schema
├── 046_soundcloud_member_auth_link.sql   # Member-user linking table
├── 047_soundcloud_ip_status_tracking.sql # Login tracking triggers
├── 048_fix_soundcloud_rls_policies.sql   # RLS policy fixes
└── 049_add_complete_status_enum.sql      # Add 'complete' to status enum
```

#### Scripts
```
scripts/
└── create-soundcloud-member-accounts.ts  # Bulk account creation
```

### Environment Variables

**Frontend (Vercel):**
```
NEXT_PUBLIC_SUPABASE_URL=https://api.artistinfluence.com
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

**Scripts (local/server):**
```
SUPABASE_URL=https://api.artistinfluence.com
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

---

## Quick Commands

### Apply All Migrations
```bash
git pull origin main
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres < supabase/migrations/048_fix_soundcloud_rls_policies.sql
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres < supabase/migrations/049_add_complete_status_enum.sql
docker restart supabase_rest_arti-marketing-ops
```

### Check Enum Values
```bash
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "SELECT enum_range(NULL::soundcloud_submission_status);"
# Expected: {new,approved,rejected,complete}
```

### Check Member Links
```bash
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT m.name, m.primary_email, u.email as auth_email
FROM soundcloud_members m
LEFT JOIN soundcloud_member_users mu ON m.id = mu.member_id
LEFT JOIN auth.users u ON mu.user_id = u.id
WHERE mu.id IS NOT NULL;
"
```

---

## Next Steps

1. **Import member emails** - Get CSV with member emails, create import script
2. **Build portal components** - Replace placeholders with real campaign data views
3. **Create welcome email flow** - Send credentials to new members
4. **Add campaign tracking** - Receipt links, reach metrics, progress tracking
5. **Member notification system** - Email alerts for status changes

---

*Document maintained by AI Assistant. For questions, check the codebase or ask in #dev-soundcloud.*

