# Troubleshooting

## Login and Authentication

### Cannot sign in with correct credentials

**Symptoms**: Login form shows "Failed to fetch" or `ERR_CONNECTION_REFUSED`.

**Likely causes**:
1. The Supabase URL is misconfigured. The frontend may be trying to connect to `127.0.0.1:54321` (local Supabase) instead of the production URL.
2. Check that `NEXT_PUBLIC_SUPABASE_URL` is set to `https://api.artistinfluence.com` (not a localhost address).
3. Check that `NEXT_PUBLIC_SUPABASE_ANON_KEY` is set correctly.

**Fix**: Verify the `.env.local` file in `apps/frontend/` has the correct production Supabase URL and anon key. Restart the dev server after changing env vars.

### Session expired / logged out unexpectedly

**Symptoms**: User gets redirected to the login page mid-session.

**Likely causes**:
1. JWT token expired and auto-refresh failed.
2. Network connectivity issue preventing token refresh.
3. Session timeout configured too short in Admin > System Settings.

**Fix**: Log in again. If it persists, check the session timeout setting in Admin > System Settings.

### Redirected to wrong page after login

**Symptoms**: Vendor sees the main dashboard, or member sees Spotify.

**Likely causes**: Role-based redirect logic didn't trigger properly.

**Expected redirects**:
- Vendor → `/spotify/vendor` (Spotify vendor portal)
- Member → `/soundcloud/portal` (SoundCloud member portal)
- All other roles → `/dashboard`

**Fix**: Hard refresh the browser (Ctrl+Shift+R). If the issue persists, check the user's role in Admin > User Management.

## Data Not Showing

### Page loads but shows no data (empty tables/cards)

**Symptoms**: Tables show "No data" or cards show $0 / 0 counts.

**Check these in order**:
1. **Browser console** (F12): Look for red error messages, especially failed network requests.
2. **Network tab**: Check if Supabase queries are returning 200 or erroring.
3. **Role permissions**: The user may not have `can_read` permission for this platform. Check Admin > User Management > Permissions.
4. **RLS policies**: Data is scoped to the user's organization. If the user isn't in an org, they won't see data.
5. **Browser cache**: Try a hard refresh (Ctrl+Shift+R).

### Spotify playlists show no follower counts or genres

**Symptoms**: Playlist follower count shows 0 or "-", genre badges don't appear.

**Causes**:
1. The playlist hasn't been enriched (no Spotify Web API metadata fetched).
2. The enriched playlist data hasn't been merged into vendor playlists.

**Fix**: Ask an admin to run the enrichment and merge scripts on the production server.

### Dashboard shows stale metrics

**Symptoms**: Numbers don't match what you see in individual platform modules.

**Fix**: Click the Refresh button in the dashboard header. If data is still stale, the underlying platform data may need updating (e.g., scraper needs to run).

## UI and Display Issues

### Page is blank or shows a white screen

**Likely causes**:
1. JavaScript error preventing rendering. Check browser console (F12) for red errors.
2. Missing environment variables causing the Supabase client to fail.
3. Build error in the deployed version.

**Fix**: Check browser console for the specific error. Report it via the Platform Development tool (Operator > Platform Development).

### Elements cut off or overlapping

**Likely causes**: Browser zoom level or viewport size issue.

**Fix**: Reset browser zoom to 100% (Ctrl+0). Try a different browser width.

### Toast notifications not appearing

**Likely causes**: Toast container may not be rendered, or a JavaScript error prevents it.

**Fix**: Hard refresh the page. If toasts never appear, report as a bug.

## Platform-Specific Issues

### Spotify: Vendor payouts showing $0

**Causes**:
1. `sale_price` is stored as a string with "$" (e.g., "$500.00") — parsing may fail.
2. `paid_vendor` is stored as the string "true" instead of boolean `true`.
3. Missing campaign data linking vendors to payments.

**This is a known pattern**: The payout calculation parses `sale_price` by removing "$" and commas, and checks `paid_vendor === 'true'` OR `paid_vendor === true`.

### Spotify: Duplicate playlists appearing

**Causes**: Playlists can exist with the same name but different IDs (one from CSV import, one from enrichment).

**Fix**: Ask an admin to run the cleanup script that removes duplicate playlists with fake/slugified URLs.

### Instagram: Posts not appearing in QA queue

**Causes**: The post may already be approved, or the campaign status filter may be hiding it.

**Fix**: Check the filter settings. Clear all filters and search for the specific post or campaign.

### YouTube: Health score showing as 0

**Causes**: The campaign may not have enough engagement data yet to calculate a health score.

**Fix**: Wait for more data to accumulate. Health scores require minimum thresholds of views, likes, and comments.

### SoundCloud: Member can't submit tracks

**Causes**:
1. Insufficient credits in the member's wallet.
2. Track URL is invalid or already submitted.
3. Member account may be inactive.

**Fix**: Check the member's credit balance in SoundCloud > Dashboard > Members. Verify the track URL is a valid SoundCloud link.

## Bug Reporting Issues

### Bug report form 500 error

**Symptoms**: `POST /api/github-issues 500 (Internal Server Error)` when submitting a bug report.

**Causes**:
1. `GITHUB_TOKEN` environment variable is not set in the deployment environment.
2. The GitHub token has expired or been revoked.

**Fix**: Verify the `GITHUB_TOKEN` is set in Vercel's environment variables (for production) or in `apps/frontend/.env.local` (for development).

### Bug report saves but no GitHub issue created

**Symptoms**: Toast says "Report submitted" but no GitHub issue link appears.

**Causes**:
1. The GitHub API call failed silently (the report is still saved to Supabase).
2. Network issue reaching GitHub's API.

**Fix**: Check browser console for errors from the `/api/github-issues` endpoint. The report is still in the system — it can be manually linked to a GitHub issue later.

## Performance Issues

### Pages loading slowly

**Common causes**:
1. Large data sets being fetched without pagination.
2. Multiple React Query requests running simultaneously.
3. Slow Supabase queries (missing indexes).

**Quick fixes**:
1. Use search/filter to narrow down data.
2. Hard refresh to clear stale cache.
3. Report persistent slowness as a bug.

### Browser tab using high memory

**Common causes**:
1. React Query cache holding too much data.
2. Long session without page refresh.

**Fix**: Refresh the page to clear the cache.

## General Debugging Steps

When something isn't working:

1. **Check the browser console** (F12 > Console tab): Look for red error messages.
2. **Check the Network tab** (F12 > Network tab): Look for failed requests (red entries).
3. **Try a hard refresh**: Ctrl+Shift+R to bypass the cache.
4. **Try a different browser**: Rules out browser-specific issues.
5. **Check your role**: Some features are role-restricted. See [roles-permissions.md](roles-permissions.md).
6. **Report the issue**: Use the Platform Development tool (Operator tab) or tell the Cursor Slack bot.
