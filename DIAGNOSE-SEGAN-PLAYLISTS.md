# Diagnose Segan Playlist Issue

## Problem
- **"Segan - DNBMF"** campaign shows NO playlists
- **"Segan"** campaign shows 22 playlists (8 vendor, 14 algorithmic)

The playlists might be linked to the wrong campaign group, or the songs under each group have different track IDs.

## Run This On Production

```bash
# SSH to production
ssh root@artistinfluence.com
cd /root/arti-marketing-ops

# Pull latest diagnostic SQL
git pull origin main

# Run the diagnostic
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres < CHECK-SEGAN-CAMPAIGNS.sql
```

## What To Look For

1. **Campaign Groups**: You should see two campaign groups:
   - `Segan - DNBMF`
   - `Segan`

2. **Songs**: Check which `spotify_campaigns` (songs) are under each group

3. **Playlists**: Check which songs have playlist data

## Likely Scenarios

### Scenario A: Different Track IDs
- "Segan - DNBMF" has song with track ID `ABC123`
- "Segan" has song with track ID `XYZ789`
- Playlists are linked to `XYZ789`, so only "Segan" shows them

**Fix**: Move playlists to the correct song, or merge the campaign groups

### Scenario B: Missing Song Entry
- "Segan - DNBMF" has NO `spotify_campaigns` record
- "Segan" has the song record with all the playlists

**Fix**: Create the missing song record or merge the groups

### Scenario C: Duplicate Campaigns
- Both campaigns exist but represent the same song
- Playlists randomly linked to one or the other

**Fix**: Merge into one campaign group

## After Diagnosis

Share the output and I'll create a fix script to:
1. Consolidate the campaigns
2. Move all playlists to the correct location
3. Ensure data consistency

