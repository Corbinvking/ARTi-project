# 📺 YouTube Manager App - Complete Guide

**App Name**: YouTube Manager (vidi-health-flow)  
**Purpose**: YouTube influencer campaign management platform  
**Integration Status**: ✅ Production Ready  
**Last Updated**: November 6, 2025

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [File Structure](#file-structure)
4. [Core Concepts](#core-concepts)
5. [Features](#features)
6. [Components Reference](#components-reference)
7. [Hooks & State Management](#hooks--state-management)
8. [Database Schema](#database-schema)
9. [API Integration](#api-integration)
10. [Routing Guide](#routing-guide)
11. [Authentication & Authorization](#authentication--authorization)
12. [Code Patterns & Best Practices](#code-patterns--best-practices)
13. [Testing](#testing)
14. [Troubleshooting](#troubleshooting)
15. [Deployment](#deployment)

---

## Overview

### What is YouTube Manager?

YouTube Manager is a comprehensive campaign management platform for managing YouTube influencer marketing campaigns. It enables the Artist Influence team to:

- **Manage Campaigns**: Create, track, and optimize YouTube influencer campaigns
- **Client Management**: Maintain client relationships and campaign history
- **Vendor Coordination**: Work with YouTube influencers (vendors) to execute campaigns
- **Payment Tracking**: Monitor and process vendor payments
- **Performance Analytics**: Track campaign performance and ROI
- **User Management**: Admin tools for team management

### Key Stakeholders

**Roles**:
1. **Admin** - Full platform access, user management, system configuration
2. **Manager** - Campaign oversight, vendor coordination, reporting
3. **Salesperson** - Client-facing role, campaign creation, performance tracking

### Business Flow

```
1. Salesperson creates campaign for client
2. Campaign gets assigned to vendors (YouTube influencers)
3. Vendors create content and publish
4. System tracks video performance
5. Payments calculated and processed
6. Reports generated for client
7. Campaign marked complete
```

---

## Architecture

### Technology Stack

**Frontend**:
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **UI Library**: shadcn-ui (Radix UI + Tailwind CSS)
- **State Management**: React Query (TanStack Query)
- **Routing**: Next.js App Router
- **Icons**: Lucide React

**Backend**:
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Real-time**: Supabase Realtime
- **Storage**: Supabase Storage (if needed)

**Development**:
- **Package Manager**: pnpm
- **Build Tool**: Next.js
- **Linting**: ESLint
- **Formatting**: Prettier
- **Type Checking**: TypeScript

### Integration Architecture

```
Unified ARTi Dashboard
├── Main Dashboard (/)
├── Instagram App (/instagram)
├── YouTube App (/youtube) ← This app
├── Spotify App (/spotify)
└── Shared Components (@/components/ui)
```

**App Isolation**:
- Each app has its own route namespace
- Shared UI components via absolute imports
- Independent QueryClient per app
- Shared Supabase instance with app identifier

---

## File Structure

### Directory Tree

```
youtube/
├── layout.tsx                          # App layout with navigation
├── loading.tsx                         # Loading state
├── page.tsx                            # Main dashboard entry
│
├── campaigns/page.tsx                  # Campaign list route
├── campaign-intake/page.tsx            # Campaign creation route
├── clients/page.tsx                    # Client management route
├── vendor-payments/page.tsx            # Vendor payment route
├── users/page.tsx                      # User management route
├── settings/page.tsx                   # Settings route
├── system-health/page.tsx              # System health route
├── help/page.tsx                       # Help & support route
│
└── vidi-health-flow/                   # Original app source
    ├── components/                     # UI components
    │   ├── admin/                      # Admin features
    │   │   ├── AdminUserManagement.tsx
    │   │   └── SystemHealthDashboard.tsx
    │   │
    │   ├── auth/                       # Authentication
    │   │   └── ProtectedRoute.tsx
    │   │
    │   ├── campaigns/                  # Campaign features
    │   │   ├── CampaignSettingsModal.tsx
    │   │   ├── CampaignSetupModal.tsx
    │   │   ├── CreateCampaignModal.tsx
    │   │   ├── MultiServiceTypeSelector.tsx
    │   │   ├── RatioFixerModal.tsx
    │   │   ├── ServiceTypeSelector.tsx
    │   │   └── YouTubeAnalyticsModal.tsx
    │   │
    │   ├── clients/                    # Client management
    │   │   └── ClientsManagement.tsx
    │   │
    │   ├── dashboard/                  # Dashboard widgets
    │   │   ├── CampaignHealthChart.tsx
    │   │   ├── CampaignTable.tsx
    │   │   ├── CampaignTableEnhanced.tsx
    │   │   ├── HealthMetricsGrid.tsx
    │   │   ├── KeyboardShortcuts.tsx
    │   │   ├── PaymentAnalyticsDashboard.tsx
    │   │   ├── PaymentAuditLog.tsx
    │   │   ├── PaymentHistoryTracker.tsx
    │   │   ├── PerformanceTrends.tsx
    │   │   ├── RatioFixerQueue.tsx
    │   │   ├── SalespersonCampaignTable.tsx
    │   │   ├── SettingsModal.tsx
    │   │   ├── TableConfigModal.tsx
    │   │   ├── VendorPaymentsTable.tsx
    │   │   └── WeeklySummary.tsx
    │   │
    │   ├── layout/                     # Layout components
    │   │   └── AppLayout.tsx
    │   │
    │   ├── navigation/                 # Navigation components
    │   │   ├── AppHeader.tsx
    │   │   ├── AppSidebar.tsx
    │   │   └── UserMenu.tsx
    │   │
    │   ├── settings/                   # Settings features
    │   │   └── PricingManagement.tsx
    │   │
    │   ├── users/                      # User management
    │   │   └── UsersManagement.tsx
    │   │
    │   ├── youtube/                    # YouTube-specific
    │   │   └── YouTubePlayerDialog.tsx
    │   │
    │   ├── ui/                         # shadcn-ui components (50+ files)
    │   │   ├── button.tsx
    │   │   ├── card.tsx
    │   │   ├── dialog.tsx
    │   │   ├── input.tsx
    │   │   ├── select.tsx
    │   │   ├── table.tsx
    │   │   └── ...
    │   │
    │   ├── VidiHealthApp.tsx          # App wrapper
    │   └── TestYouTubeAPI.tsx         # API testing component
    │
    ├── contexts/                       # React contexts
    │   └── AuthContext.tsx            # Authentication context
    │
    ├── hooks/                          # Custom React hooks
    │   ├── use-mobile.tsx             # Mobile detection
    │   ├── use-toast.ts               # Toast notifications
    │   ├── useBreadcrumbs.ts          # Breadcrumb navigation
    │   ├── useCampaigns.ts            # Campaign data management
    │   ├── useEmailTesting.ts         # Email testing
    │   ├── usePaymentNotifications.ts # Payment notifications
    │   ├── useSettings.ts             # App settings
    │   ├── useSystemHealth.ts         # System monitoring
    │   └── useValidation.ts           # Form validation
    │
    ├── integrations/                   # External integrations
    │   └── supabase/
    │       ├── client.ts              # Supabase client config
    │       └── types.ts               # Database type definitions
    │
    ├── lib/                            # Utility libraries
    │   ├── constants.ts               # App constants
    │   ├── utils.ts                   # Helper functions
    │   ├── vendorPaymentCalculator.ts # Payment calculations
    │   └── youtube.ts                 # YouTube-specific utilities
    │
    └── pages/                          # Page components
        ├── Auth.tsx                   # Login/signup
        ├── CampaignDetail.tsx         # Campaign detail view
        ├── CampaignIntake.tsx         # Campaign creation wizard
        ├── Campaigns.tsx              # Campaign list
        ├── Clients.tsx                # Client management
        ├── Dashboard.tsx              # Main dashboard
        ├── Help.tsx                   # Help & support
        ├── Index.tsx                  # Dashboard index
        ├── NotFound.tsx               # 404 page
        ├── Profile.tsx                # User profile
        ├── SalespersonDashboard.tsx   # Salesperson view
        ├── Settings.tsx               # Settings page
        ├── SystemHealth.tsx           # System health
        ├── Users.tsx                  # User management
        └── VendorPayments.tsx         # Vendor payments
```

### Key Files Explained

#### Layout & Entry Points

**`layout.tsx`** - App-level layout
- Provides QueryClient for React Query
- Navigation bar with all routes
- Active route highlighting
- Responsive design

**`page.tsx`** - Main dashboard entry
- Wraps app in VidiHealthApp component
- Provides AuthContext
- Protected route wrapper
- Renders Index page

#### Core Components

**`VidiHealthApp.tsx`** - App wrapper
- Provides AuthContext to all children
- Initializes toast notifications
- App-level error boundaries

**`ProtectedRoute.tsx`** - Route protection
- Checks if user is authenticated
- Redirects to login if not
- Optional role-based access control
- Loading states during auth check

#### Context & State

**`AuthContext.tsx`** - Authentication state
- Manages user session
- User profile data
- Role-based permissions
- Sign in/out functions

#### Database Layer

**`client.ts`** - Supabase configuration
- Database client initialization
- Auth configuration
- App identifier header
- Org-scoped client helper

**`types.ts`** - Database types
- TypeScript types for all tables
- Generated from Supabase schema
- Type-safe database queries

---

## Core Concepts

### 1. Campaign Lifecycle

```
DRAFT → PENDING → IN_PROGRESS → COMPLETED
                      ↓
                  CANCELLED
```

**Draft**: Initial creation, not yet submitted  
**Pending**: Awaiting vendor assignment  
**In Progress**: Vendors working on content  
**Completed**: All content published, payment processed  
**Cancelled**: Campaign terminated early

### 2. Service Types

YouTube campaigns support multiple service types:

```typescript
SERVICE_TYPES = {
  'ww_display': 'WW Display',           // Worldwide display ads
  'us_website': 'US Website',           // US website placement
  'ww_website': 'WW Website',           // Worldwide website
  'latam_display': 'LATAM Display',     // Latin America display
  'youtube_eng_ad': 'YouTube Eng. Ad',  // YouTube engagement ad
  // ... 20+ more service types
}
```

Each service type has:
- Geographic targeting
- Pricing structure
- Performance metrics
- Delivery requirements

### 3. Vendor Payment System

**Payment Calculation**:
```typescript
Payment = (Service Rate × Quantity) + Bonuses - Deductions

Where:
- Service Rate = Price per service type
- Quantity = Number of videos/posts delivered
- Bonuses = Performance bonuses, referral fees
- Deductions = Penalties, refunds
```

**Payment Flow**:
1. Campaign completed
2. Performance verified
3. Payment calculated
4. Payment scheduled
5. Payment processed
6. Payment confirmed
7. Record in audit log

### 4. User Roles & Permissions

**Admin**:
- Full system access
- User management
- Settings configuration
- System health monitoring
- All campaign operations

**Manager**:
- Campaign oversight
- Vendor coordination
- Payment approval
- Reporting access
- Limited settings

**Salesperson**:
- Own campaigns only
- Client interactions
- Campaign creation
- Performance tracking
- Limited data access

### 5. Data Relationships

```
Client ─1:N─→ Campaign ─N:M─→ Vendor
                ↓
          CampaignVideo ─1:1─→ Video
                ↓
            Payment ─N:1─→ Vendor
```

**Explanation**:
- A Client can have many Campaigns
- A Campaign can have many Vendors
- A Vendor can work on many Campaigns
- Each Campaign has multiple Videos
- Each Video links to one Campaign
- Payments link Campaigns to Vendors

---

## Features

### 1. Dashboard

**Location**: `/youtube`  
**Component**: `pages/Dashboard.tsx`

**Features**:
- Campaign health overview
- Key performance metrics
- Active campaigns list
- Pending payments
- Performance trends
- Weekly summary
- Quick actions

**Metrics Displayed**:
- Total active campaigns
- Total revenue (this month)
- Pending payments
- Campaign success rate
- Average campaign duration
- Top performing vendors

**Role-Specific Views**:
- **Admin/Manager**: All campaigns system-wide
- **Salesperson**: Only their assigned campaigns

### 2. Campaign Management

**Location**: `/youtube/campaigns`  
**Component**: `pages/Campaigns.tsx`

**Features**:
- Campaign list with filters
- Search by campaign name, client
- Status-based filtering
- Sort by date, budget, status
- Campaign details modal
- Edit campaign
- Delete campaign
- Campaign analytics

**Campaign Details**:
- Client information
- Service type
- Budget and pricing
- Assigned vendors
- Video list
- Performance metrics
- Payment status
- Timeline

**Tabs**:
- All Campaigns
- Active
- Pending
- Completed
- Cancelled

### 3. Campaign Intake

**Location**: `/youtube/campaign-intake`  
**Component**: `pages/CampaignIntake.tsx`

**Purpose**: Multi-step wizard for creating new campaigns

**Steps**:
1. **Client Selection**
   - Choose existing client or create new
   - Client details (name, email, company)
   - Client notes

2. **Campaign Details**
   - Campaign name
   - Service type selection (multi-select supported)
   - Campaign goals and objectives
   - Special instructions

3. **Budget & Pricing**
   - Total budget
   - Service-specific pricing
   - Payment schedule
   - Budget allocation per service

4. **Video Requirements**
   - Number of videos needed
   - Video duration requirements
   - Content guidelines
   - Prohibited content
   - Deadline

5. **Vendor Assignment**
   - Select vendors (manual or auto-suggest)
   - Vendor capacity check
   - Workload distribution
   - Vendor communication

6. **Review & Submit**
   - Review all details
   - Terms & conditions
   - Submit for processing

**Features**:
- Save as draft
- Resume from saved draft
- Form validation
- Auto-save progress
- Template support (reuse past campaigns)

### 4. Client Management

**Location**: `/youtube/clients`  
**Component**: `pages/Clients.tsx`

**Features**:
- Client list with search
- Add new client
- Edit client details
- View client campaign history
- Client notes and tags
- Client status (active/inactive)
- Contact information
- Company details

**Client Details**:
- Name and company
- Email and phone
- Address
- Campaign history
- Total spend
- Active campaigns
- Payment history
- Notes and communications

### 5. Vendor Payments

**Location**: `/youtube/vendor-payments`  
**Component**: `pages/VendorPayments.tsx`

**Features**:
- Payment queue
- Payment history
- Payment calculations
- Payment approval workflow
- Payment method management
- Bulk payment processing
- Payment analytics
- Audit log

**Payment Table Columns**:
- Vendor name
- Campaign
- Amount
- Status
- Due date
- Payment method
- Actions (approve, reject, hold)

**Payment Status**:
- Pending - Awaiting approval
- Approved - Ready for processing
- Processing - Payment in progress
- Paid - Payment completed
- Failed - Payment failed
- Cancelled - Payment cancelled

**Payment Analytics**:
- Total pending payments
- Total paid (this month)
- Average payment amount
- Top earning vendors
- Payment success rate

### 6. User Management

**Location**: `/youtube/users`  
**Component**: `pages/Users.tsx`  
**Access**: Admin only

**Features**:
- User list
- Add new user
- Edit user details
- Assign roles
- Deactivate/activate users
- Reset password
- User activity log

**User Details**:
- Name and email
- Role (Admin, Manager, Salesperson)
- Status (Active, Inactive)
- Last login
- Campaigns assigned
- Performance metrics

### 7. Settings

**Location**: `/youtube/settings`  
**Component**: `pages/Settings.tsx`

**Configurable Settings**:

**Pricing**:
- Service type rates
- Tier-based pricing
- Custom pricing rules
- Bulk discounts
- Promotional pricing

**Notifications**:
- Email notifications
- Campaign alerts
- Payment notifications
- System updates
- User mentions

**Campaign Defaults**:
- Default service types
- Default video requirements
- Default budget ranges
- Auto-assignment rules

**System**:
- Timezone
- Date format
- Currency
- Language
- API keys

### 8. System Health

**Location**: `/youtube/system-health`  
**Component**: `pages/SystemHealth.tsx`  
**Access**: Admin only

**Monitors**:
- Database connection status
- API response times
- Error rate (last 24h)
- Active user sessions
- Supabase status
- Memory usage
- API rate limits

**Alerts**:
- High error rate
- Slow response times
- Database connection issues
- API quota warnings

### 9. Help & Support

**Location**: `/youtube/help`  
**Component**: `pages/Help.tsx`

**Resources**:
- User guides
- Video tutorials
- FAQ
- Keyboard shortcuts
- Contact support
- Feature requests
- Bug reports

---

## Components Reference

### Authentication Components

#### ProtectedRoute

**Purpose**: Protect routes requiring authentication

**Location**: `components/auth/ProtectedRoute.tsx`

**Usage**:
```typescript
<ProtectedRoute requiredRole="admin">
  <AdminOnlyPage />
</ProtectedRoute>

<ProtectedRoute>
  <AnyAuthenticatedUserPage />
</ProtectedRoute>
```

**Props**:
```typescript
interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'manager' | 'salesperson';
}
```

**Behavior**:
- Checks if user is authenticated
- Redirects to `/login` if not authenticated
- Shows loading spinner during auth check
- Checks role if `requiredRole` provided
- Shows "Access Denied" if role mismatch

### Campaign Components

#### CreateCampaignModal

**Purpose**: Modal for creating new campaigns

**Location**: `components/campaigns/CreateCampaignModal.tsx`

**Features**:
- Form with validation
- Client selection
- Service type selection
- Budget input
- Submit handler
- Error handling

**Usage**:
```typescript
<CreateCampaignModal 
  open={isOpen}
  onOpenChange={setIsOpen}
  onSuccess={() => {
    // Refresh campaign list
    queryClient.invalidateQueries({ queryKey: ['campaigns'] });
  }}
/>
```

#### CampaignSettingsModal

**Purpose**: Configure campaign-specific settings

**Location**: `components/campaigns/CampaignSettingsModal.tsx`

**Configurable**:
- Video requirements
- Content guidelines
- Approval workflow
- Notification preferences
- Performance goals

#### ServiceTypeSelector

**Purpose**: Select service types for campaign

**Location**: `components/campaigns/ServiceTypeSelector.tsx`

**Features**:
- Single or multi-select
- Search/filter service types
- Categorized by region
- Displays pricing info
- Validation

**Usage**:
```typescript
<ServiceTypeSelector
  value={selectedServices}
  onChange={setSelectedServices}
  multiple={true}
/>
```

#### YouTubeAnalyticsModal

**Purpose**: Display YouTube video analytics

**Location**: `components/youtube/YouTubeAnalyticsModal.tsx`

**Displays**:
- Views over time
- Engagement rate
- Comments
- Likes/Dislikes
- Watch time
- Demographics

### Dashboard Components

#### HealthMetricsGrid

**Purpose**: Display KPI metrics as cards

**Location**: `components/dashboard/HealthMetricsGrid.tsx`

**Metrics**:
- Active campaigns
- Total revenue
- Pending payments
- Success rate

**Design**: 4-column grid on desktop, responsive

#### CampaignTable / CampaignTableEnhanced

**Purpose**: Display campaign list

**Location**: `components/dashboard/CampaignTable.tsx`

**Features**:
- Sortable columns
- Filterable
- Search
- Pagination
- Row actions (view, edit, delete)
- Status badges
- Export to CSV

**Columns**:
- Campaign name
- Client
- Service type
- Budget
- Status
- Start date
- End date
- Actions

#### PaymentAnalyticsDashboard

**Purpose**: Payment analytics and insights

**Location**: `components/dashboard/PaymentAnalyticsDashboard.tsx`

**Charts**:
- Payment trends over time
- Payment status distribution
- Top vendors by earnings
- Payment method breakdown

#### PerformanceTrends

**Purpose**: Campaign performance trends

**Location**: `components/dashboard/PerformanceTrends.tsx`

**Displays**:
- Campaign success rate over time
- Budget utilization
- Vendor performance
- ROI trends

### Navigation Components

#### AppHeader

**Purpose**: Top navigation bar

**Location**: `components/navigation/AppHeader.tsx`

**Features**:
- App logo
- Main navigation links
- User menu
- Notifications
- Search

#### AppSidebar

**Purpose**: Side navigation (if layout supports)

**Location**: `components/navigation/AppSidebar.tsx`

**Features**:
- Collapsible
- Icons + labels
- Active state
- Grouped by category
- Keyboard navigation

#### UserMenu

**Purpose**: User dropdown menu

**Location**: `components/navigation/UserMenu.tsx`

**Menu Items**:
- Profile
- Settings
- Help
- Sign out

**Shows**:
- User name
- User email
- User role
- Avatar

---

## Hooks & State Management

### useCampaigns

**Purpose**: Manage campaign data with React Query

**Location**: `hooks/useCampaigns.ts`

**Features**:
- Fetch campaigns
- Create campaign
- Update campaign
- Delete campaign
- Filter campaigns
- Real-time updates (optional)

**Usage**:
```typescript
const {
  campaigns,
  isLoading,
  error,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  refetch,
} = useCampaigns();

// Create campaign
await createCampaign({
  campaign_name: 'New Campaign',
  client_id: 'client-uuid',
  service_type: 'ww_display',
  budget: 5000,
  status: 'draft',
});

// Update campaign
await updateCampaign(campaignId, {
  status: 'in_progress',
});

// Delete campaign
await deleteCampaign(campaignId);
```

**Queries**:
```typescript
// All campaigns
useQuery({ queryKey: ['campaigns'] })

// Single campaign
useQuery({ queryKey: ['campaign', id] })

// Filtered campaigns
useQuery({ 
  queryKey: ['campaigns', { status: 'active' }]
})

// Clients
useQuery({ queryKey: ['clients'] })

// Vendors
useQuery({ queryKey: ['vendors'] })
```

**Mutations**:
```typescript
useMutation({
  mutationFn: createCampaign,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['campaigns'] });
  }
})
```

### useSettings

**Purpose**: Manage app settings

**Location**: `hooks/useSettings.ts`

**Settings**:
- Pricing configuration
- Notification preferences
- Campaign defaults
- System configuration

**Usage**:
```typescript
const { settings, updateSettings, isLoading } = useSettings();

await updateSettings({
  notifications: {
    email: true,
    campaigns: true,
  }
});
```

### useValidation

**Purpose**: Form validation logic

**Location**: `hooks/useValidation.ts`

**Validators**:
- Campaign form validation
- Client form validation
- Payment form validation
- Email validation
- URL validation
- Budget validation

**Usage**:
```typescript
const { validateCampaign, errors } = useValidation();

const isValid = validateCampaign({
  campaign_name: 'Test Campaign',
  budget: 1000,
  client_id: 'uuid',
});

if (!isValid) {
  console.log(errors); // { campaign_name: 'Required', ... }
}
```

### useSystemHealth

**Purpose**: Monitor system health

**Location**: `hooks/useSystemHealth.ts`

**Monitors**:
- Database status
- API response time
- Error rate
- Active sessions

**Usage**:
```typescript
const { health, isHealthy, checkHealth } = useSystemHealth();

console.log(health.database); // 'healthy' | 'degraded' | 'down'
console.log(health.apiResponseTime); // in ms
console.log(health.errorRate); // percentage
```

### useAuth (from AuthContext)

**Purpose**: Access authentication state

**Usage**:
```typescript
const { 
  user,           // Current user object
  profile,        // User profile with role
  loading,        // Auth loading state
  signIn,         // Sign in function
  signOut,        // Sign out function
  hasRole,        // Check role
  isAdmin,        // Is user admin?
  isManager,      // Is user manager?
  isSalesperson,  // Is user salesperson?
} = useAuth();

// Check authentication
if (!user) {
  router.push('/login');
}

// Check role
if (isAdmin) {
  // Show admin features
}

// Sign out
await signOut();
```

---

## Database Schema

### Table: campaigns

**Purpose**: Store campaign records

```typescript
{
  id: string;                          // UUID, primary key
  campaign_name: string;               // Campaign name
  client_id: string;                   // FK → clients.id
  salesperson_id: string;              // FK → salespersons.id
  service_type: string;                // Service type enum
  budget: number;                      // Campaign budget
  status: string;                      // Campaign status enum
  start_date: string;                  // ISO date
  end_date: string | null;             // ISO date
  created_at: string;                  // ISO timestamp
  updated_at: string;                  // ISO timestamp
  created_by: string;                  // User ID
  notes: string | null;                // Campaign notes
  goals: string | null;                // Campaign goals
  
  // Relations
  clients?: Client;                    // Client details
  salespersons?: Salesperson;          // Salesperson details
  campaign_videos?: CampaignVideo[];   // Associated videos
  payments?: Payment[];                // Associated payments
}
```

**Indexes**:
- `campaigns_pkey` on `id`
- `campaigns_client_id_idx` on `client_id`
- `campaigns_status_idx` on `status`
- `campaigns_created_at_idx` on `created_at`

**RLS Policies**:
- Admins/Managers: Full access
- Salespersons: Only their campaigns

### Table: clients

**Purpose**: Store client information

```typescript
{
  id: string;                    // UUID, primary key
  name: string;                  // Client name
  email: string | null;          // Client email
  phone: string | null;          // Client phone
  company: string | null;        // Company name
  address: string | null;        // Address
  notes: string | null;          // Notes
  status: string;                // 'active' | 'inactive'
  created_at: string;            // ISO timestamp
  updated_at: string;            // ISO timestamp
  
  // Relations
  campaigns?: Campaign[];        // Client's campaigns
}
```

### Table: salespersons

**Purpose**: Store salesperson information

```typescript
{
  id: string;                    // UUID, primary key
  name: string;                  // Salesperson name
  email: string;                 // Email
  phone: string | null;          // Phone
  commission_rate: number;       // Commission percentage
  status: string;                // 'active' | 'inactive'
  created_at: string;            // ISO timestamp
  updated_at: string;            // ISO timestamp
  
  // Relations
  campaigns?: Campaign[];        // Assigned campaigns
}
```

### Table: vendors

**Purpose**: Store vendor (influencer) information

```typescript
{
  id: string;                    // UUID, primary key
  name: string;                  // Vendor name
  channel_name: string;          // YouTube channel name
  channel_url: string | null;    // YouTube channel URL
  subscriber_count: number | null; // Subscriber count
  email: string;                 // Contact email
  phone: string | null;          // Contact phone
  payment_method: string | null; // Payment method
  payment_details: object | null;// Payment details (encrypted)
  notes: string | null;          // Notes
  status: string;                // 'active' | 'inactive'
  created_at: string;            // ISO timestamp
  updated_at: string;            // ISO timestamp
  
  // Relations
  campaign_vendors?: CampaignVendor[]; // Campaign associations
  payments?: Payment[];          // Payment records
}
```

### Table: campaign_videos

**Purpose**: Track videos for campaigns

```typescript
{
  id: string;                    // UUID, primary key
  campaign_id: string;           // FK → campaigns.id
  vendor_id: string;             // FK → vendors.id
  video_url: string;             // YouTube video URL
  video_id: string;              // YouTube video ID
  title: string | null;          // Video title
  view_count: number | null;     // View count
  like_count: number | null;     // Like count
  comment_count: number | null;  // Comment count
  upload_date: string | null;    // Upload date
  status: string;                // 'pending' | 'live' | 'removed'
  created_at: string;            // ISO timestamp
  updated_at: string;            // ISO timestamp
  
  // Relations
  campaigns?: Campaign;          // Campaign details
  vendors?: Vendor;              // Vendor details
}
```

### Table: payments

**Purpose**: Track vendor payments

```typescript
{
  id: string;                    // UUID, primary key
  campaign_id: string;           // FK → campaigns.id
  vendor_id: string;             // FK → vendors.id
  amount: number;                // Payment amount
  status: string;                // Payment status enum
  payment_method: string | null; // Payment method
  payment_date: string | null;   // Payment date
  transaction_id: string | null; // External transaction ID
  notes: string | null;          // Payment notes
  created_at: string;            // ISO timestamp
  updated_at: string;            // ISO timestamp
  approved_by: string | null;    // User ID who approved
  approved_at: string | null;    // Approval timestamp
  
  // Relations
  campaigns?: Campaign;          // Campaign details
  vendors?: Vendor;              // Vendor details
}
```

### Table: campaign_settings

**Purpose**: Store campaign-specific settings

```typescript
{
  id: string;                    // UUID, primary key
  campaign_id: string;           // FK → campaigns.id
  video_requirements: object;    // Video specs
  content_guidelines: object;    // Content rules
  approval_workflow: object;     // Approval steps
  performance_goals: object;     // Target metrics
  created_at: string;            // ISO timestamp
  updated_at: string;            // ISO timestamp
}
```

### Table: system_settings

**Purpose**: Global system settings

```typescript
{
  id: string;                    // UUID, primary key
  key: string;                   // Setting key (unique)
  value: object;                 // Setting value (JSON)
  category: string;              // Setting category
  description: string | null;    // Description
  updated_at: string;            // ISO timestamp
  updated_by: string;            // User ID
}
```

**Categories**:
- `pricing` - Pricing configuration
- `notifications` - Notification settings
- `campaigns` - Campaign defaults
- `system` - System configuration

### Enums

**service_type**:
```typescript
'ww_display' | 'us_website' | 'ww_website' | 'latam_display' | 
'latam_website' | 'latam_skip' | 'eur_display' | 'eur_website' | 
'eur_skip' | 'asia_website' | 'youtube_eng_ad' | 'ww_website_ads' | 
'engagements_only' | 'us_website_ads' | 'aus_website' | 'aus_display' | 
'aus_skip' | 'us_display' | 'us_eur_website' | 'us_skip' | 'ww_skip' | 
'mena_display' | 'cad_display' | 'cad_website' | 'cad_skip' | 'custom'
```

**campaign_status**:
```typescript
'draft' | 'pending' | 'in_progress' | 'completed' | 'cancelled'
```

**payment_status**:
```typescript
'pending' | 'approved' | 'processing' | 'paid' | 'failed' | 'cancelled'
```

**user_role**:
```typescript
'admin' | 'manager' | 'salesperson'
```

---

## API Integration

### Supabase Client Configuration

**Location**: `integrations/supabase/client.ts`

```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

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
      'x-application': 'vidi-health-flow'  // App identifier
    }
  }
});
```

**Environment Variables**:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://db.artistinfluence.com
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### Query Patterns

**Fetch with relations**:
```typescript
const { data, error } = await supabase
  .from('campaigns')
  .select(`
    *,
    clients (
      id,
      name,
      email,
      company
    ),
    salespersons (
      id,
      name,
      email
    ),
    campaign_videos (
      id,
      video_url,
      view_count
    )
  `)
  .eq('status', 'active')
  .order('created_at', { ascending: false });
```

**Insert**:
```typescript
const { data, error } = await supabase
  .from('campaigns')
  .insert([{
    campaign_name: 'New Campaign',
    client_id: 'uuid',
    service_type: 'ww_display',
    budget: 5000,
    status: 'draft',
    created_by: user.id,
  }])
  .select()
  .single();
```

**Update**:
```typescript
const { data, error } = await supabase
  .from('campaigns')
  .update({
    status: 'in_progress',
    updated_at: new Date().toISOString(),
  })
  .eq('id', campaignId)
  .select()
  .single();
```

**Delete**:
```typescript
const { error } = await supabase
  .from('campaigns')
  .delete()
  .eq('id', campaignId);
```

**Filters**:
```typescript
// Equals
.eq('status', 'active')

// Not equals
.neq('status', 'cancelled')

// Greater than
.gt('budget', 1000)

// In array
.in('service_type', ['ww_display', 'us_display'])

// Like (pattern matching)
.like('campaign_name', '%marketing%')

// Is null
.is('end_date', null)

// Order
.order('created_at', { ascending: false })

// Limit
.limit(50)

// Range (pagination)
.range(0, 49)  // First 50
.range(50, 99) // Next 50
```

### Real-time Subscriptions

```typescript
const channel = supabase
  .channel('campaigns-changes')
  .on(
    'postgres_changes',
    {
      event: '*',  // 'INSERT' | 'UPDATE' | 'DELETE'
      schema: 'public',
      table: 'campaigns',
    },
    (payload) => {
      console.log('Campaign changed:', payload);
      // Refetch data or update state
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    }
  )
  .subscribe();

// Cleanup
return () => {
  supabase.removeChannel(channel);
};
```

---

## Routing Guide

### Route Structure

```
/youtube                    → Dashboard
/youtube/campaigns          → Campaign list
/youtube/campaigns/:id      → Campaign detail (if implemented)
/youtube/campaign-intake    → Campaign creation wizard
/youtube/clients            → Client management
/youtube/vendor-payments    → Vendor payments
/youtube/users              → User management (admin)
/youtube/settings           → Settings
/youtube/system-health      → System health (admin)
/youtube/help               → Help & support
```

### Navigation Patterns

**Programmatic Navigation**:
```typescript
import { useRouter } from 'next/navigation';

const router = useRouter();

// Navigate to route
router.push('/youtube/campaigns');

// Navigate with query params
router.push('/youtube/campaigns?status=active');

// Navigate back
router.back();

// Refresh current route
router.refresh();

// Replace (no history entry)
router.replace('/youtube/campaigns');
```

**Link Component**:
```typescript
import Link from 'next/link';

<Link href="/youtube/campaigns">View Campaigns</Link>

<Link 
  href="/youtube/campaigns?status=active"
  className="text-blue-500 hover:underline"
>
  Active Campaigns
</Link>
```

**Active Route Detection**:
```typescript
import { usePathname } from 'next/navigation';

const pathname = usePathname();

const isActive = pathname === '/youtube/campaigns' ||
  pathname.startsWith('/youtube/campaigns/');

<Link 
  href="/youtube/campaigns"
  className={isActive ? 'text-foreground' : 'text-foreground/60'}
>
  Campaigns
</Link>
```

**Search Params**:
```typescript
import { useSearchParams } from 'next/navigation';

const searchParams = useSearchParams();

// Get param (with null safety!)
const status = searchParams?.get('status') || 'all';
const tab = searchParams?.get('tab');

// Check if param exists
if (searchParams?.has('filter')) {
  // ...
}

// Get all params
const allParams = Object.fromEntries(searchParams?.entries() || []);
```

### Route Protection

**All YouTube routes are wrapped in ProtectedRoute**:

```typescript
// In page.tsx
export default function YouTubePage() {
  return (
    <VidiHealthApp>
      <ProtectedRoute>
        <Index />
      </ProtectedRoute>
    </VidiHealthApp>
  )
}
```

**Role-based protection**:
```typescript
<ProtectedRoute requiredRole="admin">
  <AdminOnlyFeature />
</ProtectedRoute>
```

---

## Authentication & Authorization

### Authentication Flow

```
1. User visits /youtube
2. ProtectedRoute checks auth state
3. If not authenticated → redirect to /login
4. If authenticated → load user profile from auth metadata
5. Render protected content
```

### Auth Context Pattern

**Uses auth metadata ONLY** (no database queries):

```typescript
// ✅ CORRECT
const { data: userData } = await supabase.auth.getUser();
const user = userData.user;

const role = user.user_metadata?.role || 
             user.app_metadata?.role || 
             'admin';

const profile = {
  id: user.id,
  email: user.email,
  first_name: user.user_metadata?.first_name,
  last_name: user.user_metadata?.last_name,
  role: role
};

// ❌ WRONG - Never do this
const { data } = await supabase.from('user_profiles').select('*');
```

**Why metadata only?**:
- No database schema dependencies
- No RLS policy issues
- No infinite recursion errors
- Faster (JWT is already in memory)
- Reliable (auth always available)

### Sign In

```typescript
const { signIn } = useAuth();

const handleSignIn = async (email: string, password: string) => {
  const { error } = await signIn(email, password);
  
  if (error) {
    toast({ 
      title: "Sign In Failed", 
      description: error.message,
      variant: "destructive"
    });
  } else {
    router.push('/youtube');
  }
};
```

### Sign Out

```typescript
const { signOut } = useAuth();

const handleSignOut = async () => {
  await signOut();
  router.push('/login');
};
```

### Role Checking

```typescript
const { isAdmin, isManager, isSalesperson, hasRole, profile } = useAuth();

// Conditional rendering
{isAdmin && <AdminPanel />}
{(isAdmin || isManager) && <ManagerFeatures />}
{isSalesperson && <SalespersonView />}

// Custom role check
{hasRole('admin') && <AdminContent />}

// In code
if (!isAdmin) {
  toast({ title: "Access Denied", variant: "destructive" });
  return;
}
```

### Permission Checks

```typescript
// Check if user can edit campaign
const canEditCampaign = (campaign: Campaign) => {
  if (isAdmin || isManager) return true;
  if (isSalesperson && campaign.salesperson_id === profile?.id) return true;
  return false;
};

// Check if user can delete campaign
const canDeleteCampaign = (campaign: Campaign) => {
  return isAdmin;
};

// Check if user can approve payment
const canApprovePayment = () => {
  return isAdmin || isManager;
};
```

---

## Code Patterns & Best Practices

### Component Structure

```typescript
"use client"  // Required for Next.js App Router

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../integrations/supabase/client';
import type { Database } from '../integrations/supabase/types';

type Campaign = Database['public']['Tables']['campaigns']['Row'];

interface MyCampaignComponentProps {
  campaignId: string;
  onUpdate?: (campaign: Campaign) => void;
}

export function MyCampaignComponent({ 
  campaignId, 
  onUpdate 
}: MyCampaignComponentProps) {
  const router = useRouter();
  const { user, isAdmin } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  
  // Effects
  useEffect(() => {
    fetchCampaign();
  }, [campaignId]);
  
  // Handlers
  const fetchCampaign = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();
      
      if (error) throw error;
      setCampaign(data);
    } catch (error) {
      console.error('Error fetching campaign:', error);
      toast({ 
        title: "Error", 
        description: "Failed to load campaign",
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleEdit = () => {
    router.push(`/youtube/campaigns/${campaignId}/edit`);
  };
  
  // Loading state
  if (isLoading) {
    return <div>Loading...</div>;
  }
  
  // Error state
  if (!campaign) {
    return <div>Campaign not found</div>;
  }
  
  // Render
  return (
    <div>
      <h2>{campaign.campaign_name}</h2>
      {isAdmin && (
        <Button onClick={handleEdit}>Edit</Button>
      )}
    </div>
  );
}

// Export both for compatibility
export { MyCampaignComponent };
export default MyCampaignComponent;
```

### Error Handling Pattern

```typescript
try {
  const { data, error } = await supabase
    .from('campaigns')
    .select('*');
  
  if (error) throw error;
  
  // Success path
  setCampaigns(data);
  toast({ title: "Success", description: "Campaigns loaded" });
  
} catch (error) {
  // Error path
  console.error('Error loading campaigns:', error);
  toast({ 
    title: "Error",
    description: error.message || "Failed to load campaigns",
    variant: "destructive"
  });
} finally {
  // Always runs
  setIsLoading(false);
}
```

### Loading States

```typescript
const [isLoading, setIsLoading] = useState(false);

const handleSubmit = async () => {
  setIsLoading(true);
  try {
    await someLongOperation();
  } finally {
    setIsLoading(false);
  }
};

return (
  <Button onClick={handleSubmit} disabled={isLoading}>
    {isLoading ? 'Loading...' : 'Submit'}
  </Button>
);
```

### Form Handling

```typescript
const [formData, setFormData] = useState({
  campaign_name: '',
  budget: 0,
  service_type: '',
});

const handleChange = (field: string, value: any) => {
  setFormData(prev => ({
    ...prev,
    [field]: value
  }));
};

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  // Validation
  if (!formData.campaign_name) {
    toast({ title: "Error", description: "Campaign name required" });
    return;
  }
  
  // Submit
  try {
    await createCampaign(formData);
    toast({ title: "Success" });
    router.push('/youtube/campaigns');
  } catch (error) {
    toast({ title: "Error", variant: "destructive" });
  }
};

return (
  <form onSubmit={handleSubmit}>
    <Input 
      value={formData.campaign_name}
      onChange={(e) => handleChange('campaign_name', e.target.value)}
    />
    <Button type="submit">Create Campaign</Button>
  </form>
);
```

### Modal Pattern

```typescript
const [isOpen, setIsOpen] = useState(false);

return (
  <>
    <Button onClick={() => setIsOpen(true)}>
      Open Modal
    </Button>
    
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modal Title</DialogTitle>
        </DialogHeader>
        <div>
          Modal content
        </div>
        <DialogFooter>
          <Button onClick={() => setIsOpen(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>
);
```

---

## Testing

### Manual Testing

**After making changes**:

1. **Build Test**:
```bash
cd apps/frontend
pnpm run build
```
Should see: `✓ Compiled successfully`

2. **Dev Server Test**:
```bash
pnpm run dev
```
Visit: `http://localhost:3000/youtube`

3. **Browser Console** (F12):
- ✅ No red errors
- ✅ `✅ YouTube profile loaded: user@example.com role: admin`
- ✅ Network requests succeed (200 OK)

4. **Feature Testing**:
- [ ] Navigation works (click all nav items)
- [ ] Auth works (login/logout)
- [ ] Data loads correctly
- [ ] Forms submit successfully
- [ ] Modals open/close
- [ ] Tables display data
- [ ] Filters work
- [ ] Search works
- [ ] Pagination works
- [ ] Create/Edit/Delete operations work

### Test Checklist

#### Dashboard (`/youtube`)
- [ ] Page loads
- [ ] Metrics display correct numbers
- [ ] Campaign table shows data
- [ ] Charts render
- [ ] Quick actions work
- [ ] Role-specific content shows correctly

#### Campaigns (`/youtube/campaigns`)
- [ ] Campaign list loads
- [ ] Search works
- [ ] Filters work
- [ ] Sort works
- [ ] Pagination works
- [ ] View campaign details
- [ ] Edit campaign
- [ ] Delete campaign
- [ ] Status badges display correctly

#### Campaign Intake (`/youtube/campaign-intake`)
- [ ] Multi-step form works
- [ ] Client selection works
- [ ] Service type selection works
- [ ] Form validation works
- [ ] Save as draft works
- [ ] Submit campaign works
- [ ] Error handling works

#### Clients (`/youtube/clients`)
- [ ] Client list loads
- [ ] Add new client
- [ ] Edit client
- [ ] View client campaigns
- [ ] Client notes save

#### Vendor Payments (`/youtube/vendor-payments`)
- [ ] Payment list loads
- [ ] Payment calculations correct
- [ ] Approve payment
- [ ] Reject payment
- [ ] Payment history shows
- [ ] Audit log displays

#### Users (`/youtube/users`) - Admin only
- [ ] User list loads (admin sees this)
- [ ] Non-admins don't see link
- [ ] Add new user
- [ ] Edit user
- [ ] Assign roles
- [ ] Deactivate user

#### Settings (`/youtube/settings`)
- [ ] Settings load
- [ ] Update settings
- [ ] Changes persist
- [ ] Validation works

#### System Health (`/youtube/system-health`) - Admin only
- [ ] Health metrics display
- [ ] Status indicators work
- [ ] Alerts show if issues
- [ ] Refresh updates data

---

## Troubleshooting

### Common Issues

#### 1. "Module not found" Error

**Error**:
```
Module not found: Can't resolve '../../integrations/supabase/client'
```

**Fix**: Recalculate import path based on file depth

```typescript
// From: components/campaigns/CreateCampaignModal.tsx (depth 2)
import { supabase } from "../../integrations/supabase/client";  // ✅

// From: pages/Dashboard.tsx (depth 1)
import { supabase } from "../integrations/supabase/client";  // ✅
```

#### 2. "Cannot read properties of undefined (reading 'get')"

**Error**:
```
TypeError: Cannot read properties of undefined (reading 'get')
```

**Fix**: Add optional chaining to `searchParams`

```typescript
// ❌ Wrong
const tab = searchParams.get('tab');

// ✅ Correct
const tab = searchParams?.get('tab');
```

#### 3. "useNavigate is not defined"

**Error**:
```
ReferenceError: useNavigate is not defined
```

**Fix**: Using React Router instead of Next.js

```typescript
// ❌ Wrong
import { useNavigate } from 'react-router-dom';
const navigate = useNavigate();

// ✅ Correct
import { useRouter } from 'next/navigation';
const router = useRouter();
```

#### 4. "Element type is invalid"

**Error**:
```
Error: Element type is invalid: expected a string (for built-in components) or a class/function (for composite components) but got: undefined
```

**Fix**: Missing component export

```typescript
// ❌ Wrong
export default MyComponent;

// ✅ Correct
export { MyComponent };
export default MyComponent;
```

#### 5. 404 on Route

**Symptoms**: Clicking a link leads to 404

**Fix**: Missing `/youtube/` prefix

```typescript
// ❌ Wrong
<Link href="/campaigns">

// ✅ Correct
<Link href="/youtube/campaigns">
```

#### 6. Auth Error: "Could not find table 'user_profiles'"

**Fix**: App is trying to query database for user profile

```typescript
// ❌ Wrong
const { data } = await supabase.from('user_profiles').select('*');

// ✅ Correct - Use auth metadata
const { data: userData } = await supabase.auth.getUser();
const role = userData.user?.user_metadata?.role || 'admin';
```

#### 7. Infinite Re-renders

**Symptoms**: Page freezes, browser tab crashes

**Common Causes**:
- `useEffect` without dependencies
- State update in render
- Recursive function call

**Fix**:
```typescript
// ❌ Wrong
useEffect(() => {
  setState(value);  // No dependency array!
});

// ✅ Correct
useEffect(() => {
  setState(value);
}, [dependency]);  // Add dependencies
```

#### 8. Data Not Loading

**Checklist**:
- [ ] Check browser console for errors
- [ ] Check Network tab for failed requests
- [ ] Verify Supabase URL and key in `.env.local`
- [ ] Check RLS policies on table
- [ ] Verify user has permission to access data
- [ ] Check if data exists in database

### Debugging Tips

**Enable verbose logging**:
```typescript
console.log('User:', user);
console.log('Profile:', profile);
console.log('Campaign data:', campaigns);
console.log('Error:', error);
```

**Check Supabase connection**:
```typescript
const { data, error } = await supabase
  .from('campaigns')
  .select('count');

console.log('DB connected:', !error);
```

**Inspect React Query state**:
```typescript
import { useQueryClient } from '@tanstack/react-query';

const queryClient = useQueryClient();
console.log('All queries:', queryClient.getQueryCache().getAll());
console.log('Campaign query:', queryClient.getQueryState(['campaigns']));
```

---

## Deployment

### Environment Variables

**Required**:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://db.artistinfluence.com
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

**Optional**:
```bash
NEXT_PUBLIC_APP_URL=https://app.artistinfluence.com
NEXT_PUBLIC_API_URL=https://api.artistinfluence.com
```

### Build

```bash
cd apps/frontend
pnpm run build
```

**Check for**:
- ✅ No TypeScript errors
- ✅ No ESLint errors
- ✅ Build completes successfully
- ✅ All routes generated

### Pre-Deployment Checklist

- [ ] All tests pass
- [ ] No console errors in development
- [ ] All environment variables set
- [ ] Build completes successfully
- [ ] Database migrations run
- [ ] RLS policies configured
- [ ] User roles set up
- [ ] Test data created
- [ ] Admin user created

### Post-Deployment Verification

- [ ] App loads at `/youtube`
- [ ] Auth flow works
- [ ] All routes accessible
- [ ] Data loads correctly
- [ ] Forms submit successfully
- [ ] No console errors
- [ ] Performance acceptable
- [ ] Mobile responsive

---

## Appendix

### Quick Command Reference

```bash
# Development
cd apps/frontend
pnpm run dev

# Build
pnpm run build

# Type check
pnpm run type-check

# Lint
pnpm run lint

# Format
pnpm run format
```

### Useful Links

- **App**: http://localhost:3000/youtube
- **Supabase**: https://db.artistinfluence.com
- **Main Dashboard**: http://localhost:3000/dashboard
- **Instagram App**: http://localhost:3000/instagram

### Key Files Quick Access

```
youtube/
├── layout.tsx                                              # App layout
├── page.tsx                                                # Main entry
├── vidi-health-flow/
│   ├── components/VidiHealthApp.tsx                        # App wrapper
│   ├── components/auth/ProtectedRoute.tsx                  # Route protection
│   ├── contexts/AuthContext.tsx                            # Auth state
│   ├── hooks/useCampaigns.ts                              # Campaign data
│   ├── integrations/supabase/client.ts                    # Supabase config
│   ├── lib/constants.ts                                    # Constants
│   └── pages/Dashboard.tsx                                 # Main dashboard
```

### Support

**Documentation**:
- `.cursorrules-youtube` - Cursor rules
- This file - Complete guide
- `YOUTUBE-*.md` - Fix documentation
- `QUICK-REFERENCE-CHEAT-SHEET.md` - Quick reference

**Questions**:
- Check `.cursorrules-youtube` first
- Review this guide
- Check integration docs
- Check browser console for errors

---

**Document Version**: 1.0  
**Created**: November 6, 2025  
**Last Updated**: November 6, 2025  
**Status**: ✅ Complete & Production Ready  
**Maintained By**: ARTi Engineering Team

---

**End of YouTube Manager App Complete Guide** 📺✨

