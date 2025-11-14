# YouTube Database Fix - Testing Guide

**Status**: ✅ Ready to Test  
**Last Updated**: November 14, 2025

---

## 🧪 **Quick Test Checklist**

### 1. Start the Development Server

```bash
cd apps/frontend
pnpm run dev
```

Navigate to: `http://localhost:3000/youtube/campaigns`

---

## ✅ **Test 1: Campaigns Page Loads**

**Expected**:
- Page loads without errors
- Console shows:
  ```
  🎬 Fetching YouTube campaigns...
  ✅ YouTube campaigns fetched: X
  👥 Fetching YouTube clients...
  ✅ YouTube clients fetched: X
  💼 Fetching YouTube salespersons...
  ✅ YouTube salespersons fetched: X
  ```
- Table displays with data (if you have campaigns in database)

**If you see this error** ❌:
```
relation "campaigns" does not exist
```
**Cause**: Old code still trying to query wrong table  
**Fix**: Clear browser cache and hard refresh (Ctrl+Shift+R)

---

## ✅ **Test 2: Campaign Data Displays Correctly**

**Check the table shows**:
- ✅ Campaign names
- ✅ Client names (from `youtube_clients` table)
- ✅ Status badges (pending, active, complete)
- ✅ View counts
- ✅ Service types (e.g., "ww_display", "us_website")
- ✅ Start dates

**If you see "No client"**:
- Check if campaigns have `client_id` set in database
- Check if `youtube_clients` table has matching records

---

## ✅ **Test 3: Search Works**

1. Type a campaign name in search box
2. Table should filter instantly
3. Try searching by:
   - Campaign name
   - Client name
   - Genre
   - Status

**Expected**: Real-time filtering with no lag

---

## ✅ **Test 4: Tabs Work**

1. Click "All Campaigns" tab
2. Click "Pending Submissions" tab

**Expected**: Tab content switches, showing filtered campaigns

---

## ✅ **Test 5: Export to CSV**

1. Click "Export" button
2. Check downloaded file: `youtube_campaigns_export.csv`

**CSV should include columns**:
- Campaign Name
- Client
- Salesperson
- Status
- Views
- Goal
- Revenue
- Service Types

---

## ✅ **Test 6: Clients Page**

Navigate to: `http://localhost:3000/youtube/clients`

**Expected**:
- List of all clients from `youtube_clients` table
- Search box works
- Can create new client
- Can edit existing clients
- Can delete clients (with confirmation)

---

## ✅ **Test 7: Real-Time Updates**

**Open two browser windows** side by side:

**Window 1**: `/youtube/campaigns`  
**Window 2**: Database editor or SQL query tool

**Test**:
1. In Window 2, update a campaign status:
   ```sql
   UPDATE youtube_campaigns 
   SET status = 'complete' 
   WHERE id = 'some-uuid';
   ```
2. In Window 1, the campaign status should update automatically (within 1-2 seconds)

**Expected**: Real-time updates via Supabase subscriptions

---

## 🐛 **Common Issues & Fixes**

### Issue 1: "No data showing"

**Diagnosis**:
```sql
-- Check if campaigns exist
SELECT COUNT(*) FROM youtube_campaigns;

-- Check if clients exist
SELECT COUNT(*) FROM youtube_clients;
```

**Fix**:
- If 0 rows: You need to import data (see CSV import scripts)
- If >0 rows but UI empty: Check browser console for errors

---

### Issue 2: "Client shows as 'No client'"

**Diagnosis**:
```sql
-- Check campaign-client relationships
SELECT 
  c.campaign_name,
  c.client_id,
  cl.name as client_name
FROM youtube_campaigns c
LEFT JOIN youtube_clients cl ON c.client_id = cl.id
WHERE c.id = 'campaign-uuid-here';
```

**Fix**:
```sql
-- If client_id is NULL, set it
UPDATE youtube_campaigns
SET client_id = (SELECT id FROM youtube_clients WHERE name = 'Client Name')
WHERE id = 'campaign-uuid';

-- If client doesn't exist, create it
INSERT INTO youtube_clients (name, email)
VALUES ('Client Name', 'client@example.com');
```

---

### Issue 3: "TypeError: Cannot read properties of undefined"

**Common causes**:
```typescript
// ❌ Bad (will crash if youtube_clients is null)
campaign.youtube_clients.name

// ✅ Good (safe)
campaign.youtube_clients?.name || 'No client'
```

**Fix**: Already applied optional chaining (`?.`) in all code

---

### Issue 4: "Relation does not exist" errors

**Error message**:
```
relation "campaigns" does not exist
```

**Fix**:
1. Hard refresh browser (Ctrl+Shift+R)
2. Clear localStorage:
   ```javascript
   localStorage.clear()
   sessionStorage.clear()
   ```
3. Restart dev server:
   ```bash
   # Stop (Ctrl+C)
   pnpm run dev
   ```

---

## 📊 **Database Verification Queries**

### Check Campaign Count
```sql
SELECT 
  COUNT(*) as total_campaigns,
  COUNT(*) FILTER (WHERE status = 'active') as active,
  COUNT(*) FILTER (WHERE status = 'pending') as pending,
  COUNT(*) FILTER (WHERE status = 'complete') as completed
FROM youtube_campaigns;
```

### Check Campaign-Client Relationships
```sql
SELECT 
  COUNT(*) as campaigns_with_clients,
  COUNT(*) FILTER (WHERE client_id IS NULL) as missing_client
FROM youtube_campaigns;
```

### Sample Campaign Query
```sql
SELECT 
  yc.campaign_name,
  yc.status,
  yc.current_views,
  yc.goal_views,
  cl.name as client_name,
  sp.name as salesperson_name,
  yc.service_types
FROM youtube_campaigns yc
LEFT JOIN youtube_clients cl ON yc.client_id = cl.id
LEFT JOIN youtube_salespersons sp ON yc.salesperson_id = sp.id
ORDER BY yc.created_at DESC
LIMIT 5;
```

### Check Service Types
```sql
SELECT 
  service_types,
  COUNT(*) as campaign_count
FROM youtube_campaigns
GROUP BY service_types
LIMIT 10;
```

---

## 🎯 **Performance Checks**

### Query Performance
```sql
-- Should be fast (< 100ms for < 1000 campaigns)
EXPLAIN ANALYZE
SELECT * FROM youtube_campaigns
ORDER BY created_at DESC
LIMIT 50;
```

**Expected**:
- Execution time: < 100ms
- Uses index on `created_at`

### Frontend Performance

**Open Chrome DevTools → Performance**:
1. Start recording
2. Navigate to `/youtube/campaigns`
3. Stop recording

**Expected metrics**:
- First Contentful Paint: < 1.5s
- Time to Interactive: < 3s
- No layout shifts
- No excessive re-renders

---

## 🚨 **Emergency Rollback**

If something breaks:

```bash
# 1. Revert the changes
git checkout HEAD -- apps/frontend/app/\(dashboard\)/youtube/vidi-health-flow/hooks/useCampaigns.ts
git checkout HEAD -- apps/frontend/app/\(dashboard\)/youtube/vidi-health-flow/pages/Campaigns.tsx
git checkout HEAD -- apps/frontend/app/\(dashboard\)/youtube/vidi-health-flow/components/dashboard/CampaignTableEnhanced.tsx

# 2. Restart dev server
cd apps/frontend
pnpm run dev
```

---

## ✅ **Success Criteria**

All of these should work:

- ✅ Campaigns page loads without errors
- ✅ Campaign data displays with client names
- ✅ Search filters campaigns in real-time
- ✅ Export to CSV works
- ✅ Clients page shows all clients
- ✅ Can create/edit/delete clients
- ✅ Real-time updates work
- ✅ No console errors
- ✅ Console shows proper table names in logs

---

## 📞 **Need Help?**

**Check these files for reference**:
- `YOUTUBE-DATABASE-FIX-SUMMARY.md` - What was changed
- `YOUTUBE-DATABASE-SCHEMA.md` - Database structure
- `YOUTUBE-APP-COMPLETE-GUIDE.md` - Full app documentation

**Run this SQL to see current state**:
```sql
-- Show campaign with all relationships
SELECT 
  json_build_object(
    'campaign', yc.campaign_name,
    'client', cl.name,
    'salesperson', sp.name,
    'status', yc.status,
    'views', yc.current_views,
    'goal', yc.goal_views
  ) as campaign_data
FROM youtube_campaigns yc
LEFT JOIN youtube_clients cl ON yc.client_id = cl.id
LEFT JOIN youtube_salespersons sp ON yc.salesperson_id = sp.id
LIMIT 1;
```

---

**Happy Testing!** 🎉

