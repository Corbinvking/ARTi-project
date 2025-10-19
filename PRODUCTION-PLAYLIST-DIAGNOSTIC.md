# Production Playlist Diagnostic

## Problem
The production instance shows "No Playlist Data Yet" for the Segan - DNBMF campaign, even though:
- ✅ Data was imported (1,433 records)
- ✅ RLS policy is permissive
- ✅ User has membership record

## Diagnostic Steps

### 1. SSH to Production
```bash
ssh root@artistinfluence.com
cd /root/arti-marketing-ops
```

### 2. Upload and Run Diagnostic SQL
```bash
cat > check-segan-playlists.sql << 'EOF'
-- Check if we have playlists for the Segan campaign
-- Campaign ID: be7da8c7-4195-443b-91fa-425182876d82

\echo '=== 1. Campaign Group ==='
SELECT 
    id,
    name,
    org_id,
    status
FROM campaign_groups 
WHERE id = 'be7da8c7-4195-443b-91fa-425182876d82';

\echo ''
\echo '=== 2. Spotify Campaigns (Songs) ==='
SELECT 
    id,
    campaign,
    campaign_group_id
FROM spotify_campaigns 
WHERE campaign_group_id = 'be7da8c7-4195-443b-91fa-425182876d82';

\echo ''
\echo '=== 3. Campaign Playlists ==='
SELECT 
    cp.id,
    cp.campaign_id,
    cp.playlist_name,
    cp.streams_28d,
    cp.is_algorithmic,
    cp.org_id
FROM campaign_playlists cp
WHERE cp.campaign_id IN (
    SELECT id FROM spotify_campaigns 
    WHERE campaign_group_id = 'be7da8c7-4195-443b-91fa-425182876d82'
);

\echo ''
\echo '=== 4. Count of Playlists ==='
SELECT 
    COUNT(*) as total_playlists,
    SUM(CASE WHEN is_algorithmic THEN 1 ELSE 0 END) as algorithmic,
    SUM(CASE WHEN NOT is_algorithmic THEN 1 ELSE 0 END) as vendor
FROM campaign_playlists cp
WHERE cp.campaign_id IN (
    SELECT id FROM spotify_campaigns 
    WHERE campaign_group_id = 'be7da8c7-4195-443b-91fa-425182876d82'
);

\echo ''
\echo '=== 5. User Membership ==='
SELECT 
    m.user_id,
    m.org_id,
    m.role,
    u.email
FROM memberships m
JOIN users u ON m.user_id = u.id
WHERE m.user_id = '97bf0622-6d2f-4bed-931d-e9134307545f';

\echo ''
\echo '=== 6. Org ID Comparison ==='
SELECT 
    cg.org_id as campaign_org_id,
    sc.id as song_id,
    COUNT(cp.id) as playlist_count,
    cp.org_id as playlist_org_id
FROM campaign_groups cg
LEFT JOIN spotify_campaigns sc ON sc.campaign_group_id = cg.id
LEFT JOIN campaign_playlists cp ON cp.campaign_id = sc.id
WHERE cg.id = 'be7da8c7-4195-443b-91fa-425182876d82'
GROUP BY cg.org_id, sc.id, cp.org_id;

\echo ''
\echo '=== 7. RLS Policy Check ==='
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'campaign_playlists';
EOF

docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres < check-segan-playlists.sql
```

### 3. Analyze Results

Expected results if data exists:
- **Campaign Group**: Should show "Segan - DNBMF" with status "Active"
- **Spotify Campaigns**: Should show at least 1 song
- **Campaign Playlists**: Should show 7-10 playlists
- **Count**: Should show algorithmic and vendor playlist counts
- **User Membership**: Should show user with org_id `00000000-0000-0000-0000-000000000001`
- **Org ID Comparison**: All `org_id` values should match
- **RLS Policy**: Should show permissive SELECT policy for authenticated users

### 4. Potential Issues

If playlists are missing:
1. **Data not imported**: Re-run `populate-playlist-vendor-data-v2.js`
2. **Wrong campaign_id**: The song IDs don't match
3. **Org ID mismatch**: Playlists have different `org_id` than user's membership

If playlists exist but aren't showing:
1. **RLS blocking**: Policy is too restrictive
2. **Frontend query issue**: React Query is using wrong campaign ID
3. **Supabase client issue**: Auth token not being sent

### 5. Quick Fix Commands

If data is missing, re-import:
```bash
cd /root/arti-marketing-ops
export SUPABASE_URL=http://localhost:54321
export SUPABASE_SERVICE_ROLE_KEY=your_key_here
node scripts/populate-playlist-vendor-data-v2.js
```

If org_id is wrong, fix it:
```bash
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres << 'EOF'
UPDATE campaign_playlists
SET org_id = '00000000-0000-0000-0000-000000000001'
WHERE org_id != '00000000-0000-0000-0000-000000000001';
EOF
```

