# Vendor Portal Setup Guide

## 🎯 Overview
The vendor portal allows playlist vendors to:
- View their playlists
- Manage campaign participation requests
- Track their campaign performance
- Update playlist information

## 📁 Current Implementation

### Pages
- **`VendorDashboard.tsx`** - Main vendor dashboard
- **`VendorPlaylistsPage.tsx`** - Manage vendor playlists
- **`VendorRequestsPage.tsx`** - Handle campaign requests

### Routing
Vendors should be automatically routed to `/spotify/stream-strategist/vendor` when they log in.

## 🔧 Local Setup Steps

### 1. Create Vendor Users

Run this script to create test vendor users locally:

```bash
node scripts/create-vendor-users.js
```

### 2. Create Vendor Records

Vendors need to be linked in the `vendors` table:

```sql
-- Insert test vendor
INSERT INTO public.vendors (name, email, is_active, cost_per_1k_streams)
VALUES 
  ('Test Vendor 1', 'vendor1@arti-demo.com', true, 5.00),
  ('Test Vendor 2', 'vendor2@arti-demo.com', true, 4.50)
ON CONFLICT (email) DO NOTHING;
```

### 3. Link Users to Vendors

```sql
-- Link auth user to vendor
UPDATE public.vendors
SET user_id = (SELECT id FROM auth.users WHERE email = 'vendor1@arti-demo.com')
WHERE email = 'vendor1@arti-demo.com';

UPDATE public.vendors
SET user_id = (SELECT id FROM auth.users WHERE email = 'vendor2@arti-demo.com')
WHERE email = 'vendor2@arti-demo.com';
```

## 🔑 Test Credentials

After setup:
- Email: `vendor1@arti-demo.com`
- Password: `Password123!`

Or:
- Email: `vendor2@arti-demo.com`
- Password: `Password123!`

## 📋 Features

### Vendor Dashboard
- View total playlists
- See daily stream count
- Track pending campaign requests
- Manage active campaigns
- Add/edit playlists

### Campaign Requests
- Approve/deny campaign participation
- Allocate playlists to campaigns
- Set stream goals per playlist

### Performance Tracking
- View campaign progress
- Track stream delivery
- Payment status
- Per-playlist performance

## 🚀 Next Steps

1. Create vendor users locally ✅
2. Test vendor login
3. Add test playlists
4. Create mock campaign requests
5. Test workflow end-to-end

