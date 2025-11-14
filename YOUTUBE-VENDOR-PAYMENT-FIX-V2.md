# YouTube Vendor Payment Calculation Fix (v2)

**Date:** 2025-11-14  
**Issue:** Vendor costs showing $0.00 and 404 errors for `youtube_pricing_tiers` table

---

## Problems Identified

### 1. Missing `youtube_pricing_tiers` Table (404 Errors)
The frontend was trying to fetch pricing data from a table that didn't exist yet:
```
GET .../youtube_pricing_tiers?... 404 (Not Found)
```

### 2. Real-time Subscription Failures
Supabase realtime channels were failing with `CHANNEL_ERROR`, causing console noise but not blocking functionality.

---

## Solutions Implemented

### Fix 1: Disabled Failing Real-time Subscriptions
**File:** `apps/frontend/app/(dashboard)/youtube/vidi-health-flow/hooks/useCampaigns.ts`

- **Action:** Commented out real-time subscriptions for `youtube_campaigns`, `youtube_clients`, and `youtube_salespersons`
- **Reason:** RLS policies not properly configured for real-time yet
- **Impact:** No more `CHANNEL_ERROR` spam in console. Data still refreshes on manual actions.
- **Re-enable When:** RLS policies for real-time are properly configured

### Fix 2: Added Fallback Pricing Rates
**File:** `apps/frontend/app/(dashboard)/youtube/vidi-health-flow/lib/vendorPaymentCalculator.ts`

**Changes:**
1. Added `DEFAULT_PRICING_RATES` constant with hardcoded rates for all service types
2. Modified calculation logic to:
   - **First try:** Fetch rate from `youtube_pricing_tiers` table
   - **Fallback:** Use default rate if table doesn't exist or query fails
   - **Silent:** No errors logged when table is missing (just debug logs)

**Default Rates Added:**
```typescript
const DEFAULT_PRICING_RATES: Record<string, number> = {
  'ww_display': 1.20,
  'us_display': 6.50,
  'latam_display': 2.80,
  'eur_display': 6.50,
  // ... (28 total service types)
};
```

**Calculation Flow:**
```
1. Fetch campaign data
2. Check if calculated_vendor_payment is already set → use it
3. For each service type in campaign:
   a. Set rate = DEFAULT_PRICING_RATES[serviceType]
   b. Try to fetch from youtube_pricing_tiers table
   c. If found, override with database rate
   d. If 404 or error, keep default rate
   e. Calculate: cost = (views / 1000) * rate
4. Return total_cost and breakdown
```

### Fix 3: Created Database Migration
**File:** `supabase/migrations/048_create_youtube_pricing_tiers.sql`

**Creates:**
- `youtube_pricing_tiers` table with columns:
  - `service_type` (youtube_service_type enum)
  - `tier_min_views` (integer)
  - `tier_max_views` (integer, nullable for unlimited)
  - `cost_per_1k_views` (numeric)
  - `notes` (text)
- RLS policies for admin full access, authenticated users read-only
- Index on `(service_type, tier_min_views, tier_max_views)` for fast lookups
- Pre-populated with default rates matching the hardcoded values

---

## How to Apply

### Step 1: Apply Database Migration
```bash
# Option A: Using Supabase CLI
npx supabase migration up

# Option B: Direct SQL execution
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres < supabase/migrations/048_create_youtube_pricing_tiers.sql
```

### Step 2: Verify Table Created
```bash
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT service_type, cost_per_1k_views, notes 
FROM youtube_pricing_tiers 
ORDER BY service_type 
LIMIT 10;
"
```

Expected output:
```
 service_type  | cost_per_1k_views |         notes          
---------------+-------------------+------------------------
 asia_website  |           3.0000 | Asia Website
 aus_display   |           6.5000 | Australia Display Ads
 aus_skip      |           6.5000 | Australia Skippable Ads
 ...
```

### Step 3: Refresh Frontend
1. Hard refresh browser (Ctrl+Shift+R)
2. Navigate to Vendor Payouts page
3. Vendor costs should now show calculated amounts instead of $0.00

---

## Expected Behavior After Fixes

### ✅ Before Migration Applied
- **Vendor costs:** Calculated using hardcoded `DEFAULT_PRICING_RATES`
- **Console:** No more 404 errors (silently caught and fallback used)
- **No errors:** System works without database table

### ✅ After Migration Applied
- **Vendor costs:** Uses database rates from `youtube_pricing_tiers`
- **Console:** No errors, clean queries
- **Database-driven:** Rates can be updated in database without code changes

---

## Testing

### Test 1: Verify Calculations Work
1. Go to `/youtube/vidi-health-flow/vendor-payouts`
2. Check that campaigns show non-zero vendor costs
3. Example:
   - Campaign with 10,000 views on `us_display` ($6.50/1k)
   - Expected cost: $65.00
   - Formula: (10,000 / 1,000) * 6.50 = $65.00

### Test 2: Check Console for Errors
- Open browser console (F12)
- Should see: `✅ YouTube campaigns fetched: X`
- Should NOT see: 404 errors for `youtube_pricing_tiers`
- Should NOT see: `CHANNEL_ERROR` warnings

### Test 3: Multi-Service Campaigns
1. Find campaign with multiple service types (JSONB array)
2. Verify each service type calculates correctly
3. Verify total cost is sum of all services

---

## Future Enhancements

### 1. Tiered Pricing (Already Supported!)
The table schema supports view-based pricing tiers:
```sql
-- Example: First 10k views at $5/1k, 10k+ at $4/1k
INSERT INTO youtube_pricing_tiers VALUES
    ('us_display', 0, 10000, 5.00, 'US Display - Tier 1'),
    ('us_display', 10001, NULL, 4.00, 'US Display - Tier 2 (volume discount)');
```

### 2. Admin UI for Managing Rates
Create page at `/youtube/settings/pricing` to:
- View all pricing tiers
- Add/edit/delete tiers
- Bulk import from CSV

### 3. Re-enable Real-time Subscriptions
Once RLS policies are configured:
1. Uncomment real-time code in `useCampaigns.ts`
2. Test subscriptions connect successfully
3. Verify data updates in real-time

### 4. Server-Side Calculation Function
Replace client-side calculation with PostgreSQL function:
```sql
CREATE OR REPLACE FUNCTION calculate_vendor_payment(p_campaign_id uuid)
RETURNS jsonb AS $$
  -- Logic here
$$ LANGUAGE plpgsql;
```

---

## Troubleshooting

### Issue: Still seeing $0.00 costs
**Check:**
1. Campaign has `current_views > 0`
2. Campaign has valid `service_type` or `service_types` array
3. Service type exists in `DEFAULT_PRICING_RATES` or database
4. Browser cache cleared (hard refresh)

### Issue: Some campaigns work, others don't
**Check:**
1. Open browser console
2. Look for specific campaign IDs in error messages
3. Verify those campaigns have valid data:
```sql
SELECT id, campaign_name, service_type, service_types, current_views
FROM youtube_campaigns
WHERE id = 'CAMPAIGN_ID';
```

### Issue: Database rates not being used
**Check:**
1. Table exists: `SELECT COUNT(*) FROM youtube_pricing_tiers;`
2. RLS policies allow reads: Run query as authenticated user
3. Service type matches exactly (case-sensitive)

---

## Files Changed

1. **`useCampaigns.ts`** - Disabled real-time subscriptions
2. **`vendorPaymentCalculator.ts`** - Added fallback pricing logic
3. **`048_create_youtube_pricing_tiers.sql`** - New database table

## Summary

The vendor payment calculation now works **both with and without** the `youtube_pricing_tiers` table:
- **Without table:** Uses hardcoded default rates (no errors)
- **With table:** Uses database rates (more flexible)

This provides a smooth user experience even during incomplete migrations, while still supporting full database-driven pricing once the table is created.

