# Populate Playlist Genres - Production Guide

## Overview
This guide shows how to populate genre data for all playlists by fetching artist genres from the Spotify Web API.

## What's Changed
The `enrich-playlists-direct.sh` script now:
1. ✅ Fetches playlist metadata (name, followers, tracks) - **ALREADY DONE**
2. ✅ Extracts artist IDs from the first 10 tracks in each playlist - **NEW**
3. ✅ Fetches genre data for those artists from Spotify Web API - **NEW**
4. ✅ Aggregates the top 3 most common genres - **NEW**
5. ✅ Stores genres in the `playlists` table - **NEW**

## Commands to Run on Production

```bash
# 1. Navigate to project directory
cd ~/arti-marketing-ops

# 2. Pull the latest changes
git pull origin main

# 3. Apply the vendor_id nullable migration (if not already done)
npx supabase migration up

# 4. Run the enrichment script (will now populate genres)
bash scripts/enrich-playlists-direct.sh
```

## Expected Output

You should see output like:
```
[1/653] Processing: Campaign Name
  Processing playlist: 37i9dQZF1DXcBWIGoYBM5M
    ✅ Discover Weekly
    👥 1,234,567 followers
    🎸 Fetching genres from artists...
    🎵 Genres: pop, rock, indie
    🔗 Linked to campaign
```

## Verification

After the script completes, verify genres are populated:

```bash
# Check how many playlists have genres
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT 
  COUNT(*) as total_playlists,
  COUNT(*) FILTER (WHERE jsonb_array_length(genres) > 0) as with_genres,
  COUNT(*) FILTER (WHERE follower_count > 0) as with_followers
FROM playlists;
"

# View a sample of playlists with genres
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "
SELECT name, follower_count, genres 
FROM playlists 
WHERE jsonb_array_length(genres) > 0 
LIMIT 10;
"
```

## Frontend Display

After enrichment completes:
1. **Refresh the browser** on `app.artistinfluence.com/spotify/playlists`
2. Click on any vendor to view their playlists
3. You should now see:
   - ✅ **Follower counts** (e.g., "1,234 followers")
   - ✅ **Genre badges** (e.g., "pop", "rock", "indie")

## Notes

- The script processes **all 653 campaigns** and their playlists
- Rate limiting is applied (0.2s delay between playlists)
- Genres are fetched from the **artists** of tracks in each playlist
- The top 3 most common genres are stored
- If no genres are found, an empty array `[]` is stored

## Troubleshooting

### If genres don't appear in UI:
1. Hard refresh the browser (Ctrl+Shift+R or Cmd+Shift+R)
2. Clear the React Query cache by refreshing
3. Check browser console for any API errors

### If enrichment fails:
1. Verify Spotify token is valid: `echo $ACCESS_TOKEN`
2. Check if token needs refresh (expires after 1 hour)
3. Re-run the authentication section of the script

### Database Connection Issues:
```bash
# Test database connection
docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres -c "SELECT version();"
```

## Performance

- **Expected duration**: ~30-45 minutes for 653 campaigns
- **API calls**: 2 per playlist (1 for playlist, 1 for artists)
- **Rate limit**: 0.2s between playlists = ~2 playlists/minute = ~6 hours max
- **Actual**: Much faster due to batch processing and cached data

## Success Criteria

✅ Follower counts are visible in UI  
✅ Genre badges appear under playlist names  
✅ Vendor playlists show enriched data  
✅ Campaign playlist tables show metadata  
✅ All data persists across page refreshes

