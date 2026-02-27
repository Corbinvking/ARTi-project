# Roles and Permissions

## User Roles

The ARTi platform has six user roles, each with different levels of access.

### Admin
**Full access to everything.**
- Can access all platform modules (Dashboard, Spotify, Instagram, YouTube, SoundCloud, Operator, Admin)
- Can manage users: create, edit, delete, assign roles
- Can configure system settings (session timeout, notifications, maintenance mode)
- Can manage platform integrations (API connections, QuickBooks, scrapers)
- Can view and manage platform development reports
- Sees all navigation items across all modules

### Manager
**Campaign management across all platforms.**
- Can access: Dashboard, Spotify, Instagram, YouTube, SoundCloud
- Can create, edit, and manage campaigns
- Can manage clients and vendors
- Can view analytics and reporting
- Cannot access the Admin panel
- Cannot manage users or system settings

### Operator
**Day-to-day campaign operations plus internal tools.**
- Can access: Dashboard, Spotify, Instagram, YouTube, SoundCloud, Operator panel
- Can manage campaigns and process the operations queue
- Can submit platform development reports (bugs/features)
- Can use the ops queue to triage work across platforms
- Cannot access the Admin panel
- Gets redirected to Operator panel if they try to access Admin

### Sales (Salesperson)
**Campaign intake and client management.**
- Can access: Dashboard, Spotify, Instagram, YouTube, SoundCloud
- Primary workflow: Campaign intake and client relationship management
- In Spotify, sees a specialized Salesperson Dashboard with campaign intake and client views
- Can create new campaigns via campaign intake forms
- Cannot manage vendors or system settings

### Vendor
**Limited access to their own vendor portal.**
- Can access: Spotify vendor portal, SoundCloud (limited)
- In Spotify, sees: Vendor Dashboard, My Playlists, Campaign Requests
- Cannot see platform navigation tabs — only their vendor portal
- Cannot access admin, operator, or other platform modules
- Gets redirected to vendor portal on login

### Member
**SoundCloud portal access only.**
- Can access: SoundCloud member portal only
- Can submit tracks, view campaigns, manage profile, view credits, see analytics
- Automatically redirected to `/soundcloud/portal` if they try to access other areas
- Cannot see any other platform module
- This role is specifically for SoundCloud artists in the repost network

## Platform Access Matrix

| Platform | Admin | Manager | Operator | Sales | Vendor | Member |
|----------|-------|---------|----------|-------|--------|--------|
| Dashboard | Yes | Yes | Yes | Yes | No | No |
| Spotify | Yes | Yes | Yes | Yes | Portal only | No |
| Instagram | Yes | Yes | Yes | Yes | No | No |
| YouTube | Yes | Yes | Yes | Yes | No | No |
| SoundCloud | Yes | Yes | Yes | Yes | Limited | Portal only |
| Operator | Yes | No | Yes | No | No | No |
| Admin | Yes | No | No | No | No | No |

## Per-Module Navigation by Role

### Spotify Module

| Page | Admin | Manager | Operator | Sales | Vendor |
|------|-------|---------|----------|-------|--------|
| Dashboard (`/spotify`) | Yes | Yes | Yes | No | No |
| Vendors/Playlists (`/spotify/playlists`) | Yes | Yes | Yes | No | No |
| Campaigns (`/spotify/campaigns`) | Yes | Yes | Yes | Yes | No |
| Clients (`/spotify/clients`) | Yes | Yes | Yes | Yes | No |
| Campaign Intelligence (`/spotify/ml-dashboard`) | Yes | Yes | Yes | No | No |
| Campaign Intake (`/spotify/campaign-intake`) | Yes | Yes | Yes | Yes | No |
| Salesperson Dashboard (`/spotify/salesperson`) | No | No | No | Yes | No |
| Vendor Dashboard (`/spotify/vendor`) | No | No | No | No | Yes |
| Vendor Playlists (`/spotify/vendor/playlists`) | No | No | No | No | Yes |
| Campaign Requests (`/spotify/vendor/requests`) | No | No | No | No | Yes |

### YouTube Module

| Page | Admin | Manager | Sales |
|------|-------|---------|-------|
| Dashboard (`/youtube`) | Yes | Yes | Yes |
| Campaigns (`/youtube/campaigns`) | Yes | Yes | Yes |
| Campaign Intake (`/youtube/campaign-intake`) | Yes | Yes | No |
| Clients (`/youtube/clients`) | Yes | Yes | Yes |
| Vendor Payments (`/youtube/vendor-payments`) | Yes | Yes | No |
| Users (`/youtube/users`) | Yes | No | No |
| System Health (`/youtube/system-health`) | Yes | No | No |
| Settings (`/youtube/settings`) | Yes | Yes | Yes |

## Permission System Details

The platform uses a dual-layer permission system:

1. **Database permissions** (primary): Stored in `user_permissions` table with per-platform granularity (`can_read`, `can_write`, `can_delete`). Managed via Admin > User Management.

2. **Role-based fallback** (legacy): If database permissions haven't been configured for a user, the system falls back to role-based access rules hardcoded in the frontend.

Admins can configure per-platform permissions for any user via the permission matrix in the Admin panel's User Management page.

## How to Change a User's Role

1. Navigate to **Admin > User Management**
2. Find the user in the table (use search if needed)
3. Click the **Edit** button on their row
4. Change the **Role** dropdown
5. Adjust platform permissions in the permission matrix if needed
6. Click **Save**

## How to Create a New User

1. Navigate to **Admin > User Management**
2. Click **Add User**
3. Fill in: name, email, password, role
4. Set platform permissions via the checkbox matrix
5. Click **Create**
