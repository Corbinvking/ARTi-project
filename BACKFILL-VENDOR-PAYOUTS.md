# Backfill Vendor Payouts for Existing Campaigns

## 🎯 Purpose

This script populates `campaign_allocations_performance` table with data from existing campaigns, enabling the Vendor Payouts feature to work for campaigns created before this feature was implemented.

---

## 🚀 Quick Run

On the production server:

```bash
cd /root/arti-marketing-ops

# Run the backfill
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres < scripts/backfill-campaign-allocations-performance.sql
```

---

## 📊 What It Does

The script:

1. **Fetches all campaign-playlist relationships** from `campaign_playlists`
2. **Joins with campaign data** to get campaign goals and budgets
3. **Joins with vendor data** to get payment rates (`cost_per_1k_streams`)
4. **Calculates allocated streams** by distributing campaign goal evenly across playlists
5. **Sets actual streams** from scraped data (`streams_28d`)
6. **Marks all as unpaid** initially
7. **Skips algorithmic playlists** (only vendor playlists)

---

## ✅ Expected Results

After running, you should see:

```sql
 total_entries | unique_campaigns | unique_vendors | total_amount_owed 
---------------+------------------+----------------+-------------------
           385 |               87 |             12 |         12,456.78
```

(Numbers will vary based on your actual data)

---

## 🔍 Verify It Worked

Check the Vendor Payouts section in the frontend:

```bash
# On server, verify data exists
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT 
    v.name as vendor,
    COUNT(*) as campaigns,
    SUM(allocated_streams * cost_per_stream) as total_owed
FROM campaign_allocations_performance cap
JOIN vendors v ON cap.vendor_id = v.id
WHERE payment_status = 'unpaid'
GROUP BY v.name
ORDER BY total_owed DESC;
"
```

Then refresh the frontend and navigate to:
**Spotify → Campaign History → Vendor Payments tab**

You should now see:
- ✅ All vendors with campaigns listed
- ✅ Checkboxes for individual campaign selection
- ✅ "Select All" checkbox in header
- ✅ Per-vendor "Select All" button
- ✅ "Mark All as Paid" bulk action button
- ✅ Individual "Mark Paid" buttons

---

## 🎨 Features Now Available

### 1. **Individual Selection**
- Click checkbox next to any unpaid campaign
- Selected campaigns shown in bulk actions bar

### 2. **Vendor-Level Selection**
- Click checkbox in vendor header row
- Selects all unpaid campaigns for that vendor
- Or use "Select All" / "Deselect All" button in Actions column

### 3. **Mass Select All**
- Click checkbox in table header
- Selects ALL unpaid campaigns across ALL vendors

### 4. **Bulk Mark as Paid**
- Select campaigns (individual, vendor, or all)
- Click "Mark All as Paid" in bulk actions bar
- Processes all selected campaigns at once

### 5. **Edit Payment Amount**
- Click edit icon next to amount
- Adjust payment before marking as paid
- Save or cancel changes

---

## 🔧 Troubleshooting

### No vendors showing after backfill

Check if campaign_playlists have vendor_id:

```sql
SELECT 
    COUNT(*) as total,
    COUNT(vendor_id) as with_vendor_id
FROM campaign_playlists;
```

If `with_vendor_id` is 0, you need to sync playlists first:
```bash
bash scripts/merge-enriched-playlists.sh
```

### Amounts showing as $0.00

Check if vendors have cost_per_1k_streams set:

```sql
SELECT name, cost_per_1k_streams 
FROM vendors 
WHERE cost_per_1k_streams IS NULL OR cost_per_1k_streams = 0;
```

Update vendor rates:
```sql
UPDATE vendors 
SET cost_per_1k_streams = 10.00  -- $10 per 1,000 streams (adjust as needed)
WHERE cost_per_1k_streams IS NULL;
```

---

## 📝 For New Campaigns

Going forward, all new campaigns created via the Campaign Builder will automatically:
- ✅ Create `campaign_allocations_performance` entries
- ✅ Show up in Vendor Payouts with selection UI
- ✅ Support bulk payment processing

**No manual backfill needed for new campaigns!** 🎉

---

**Run the backfill now to enable vendor payouts for existing campaigns!**

