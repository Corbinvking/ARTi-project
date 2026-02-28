# Spotify Module

## Overview

The Spotify module manages playlist promotion campaigns where clients (artists/labels) pay to have their songs placed on curated playlists managed by vendors (playlist curators). The module tracks campaign performance using real scraped data from Spotify for Artists.

**URL**: `/spotify`
**Internal name**: Stream Strategist
**Accessible by**: Admin, Manager, Operator, Sales (limited), Vendor (portal only)

## Key Concepts

### Campaign Structure

Campaigns are organized in three layers:

1. **Campaign Group** — Top-level container for a client's promotion effort (e.g., "Artist Name - Album Campaign"). Can include multiple songs.
2. **Spotify Campaign** — Individual song placement (e.g., "Artist Name - Song Title"). Links to a specific track URL and vendor.
3. **Campaign Playlist** — A specific playlist placement with real performance data (streams per time range, date added, vendor attribution).

### Vendors

Vendors are playlist curators who place client songs on their playlists. Each vendor has:
- A roster of playlists they manage
- A promised cost per 1,000 streams (CP1K)
- Performance metrics calculated from real scraped data
- Active status (can be deactivated)

Current active vendors include: Club Restricted, Glenn, Golden Nugget, Vynx, Moon, Levianth, House Views, Alekk, Majed, Torok, SoundWorld.

### Playlists

Playlists are Spotify playlists managed by vendors. Each playlist has:
- Spotify metadata (follower count, track count, description)
- Genre tags (derived from the artists of tracks in the playlist)
- Average daily streams
- Vendor association

### Algorithmic vs Vendor Playlists

- **Vendor playlists**: Paid placements on curated playlists (have a `vendor_id`)
- **Algorithmic playlists**: Spotify-generated playlists like Discover Weekly, Release Radar, Daily Mixes. These are organic and not paid for. Identified by `is_algorithmic = true` and `vendor_id = NULL`.

## Pages and Navigation

### Spotify Dashboard (`/spotify`)
The main landing page showing an overview of active campaigns, recent activity, and key metrics.
- **Who sees it**: Admin, Manager, Operator

### Vendors / Playlists (`/spotify/playlists`)
Manage vendors and their playlist rosters.
- **Vendors View**: Card-based layout showing each vendor with their playlists, follower counts, genres, and average daily streams.
- **Table View**: All playlists in a sortable/filterable table.
- **Actions**: Add vendor, add playlist to vendor, edit playlist URL/metadata, import playlists from CSV.
- **Who sees it**: Admin, Manager, Operator

### Campaigns (`/spotify/campaigns`)
View and manage all campaign groups.
- Campaign list with search and status filters (Active, Pending, Complete)
- Click a campaign to open the Campaign Details Modal showing:
  - Overview tab: Campaign goal, budget, remaining streams, progress
  - Playlists tab: All playlist placements grouped by vendor, plus algorithmic playlists
  - Performance tab: Charts and analytics
  - Payments tab: Vendor payment tracking
- Tabs for Submissions and Vendor Payouts
- **Who sees it**: Admin, Manager, Operator, Sales

### Clients (`/spotify/clients`)
Manage client entities (artists, labels).
- Client list with contact info, campaign counts, and budget totals
- Create/edit clients
- Click a client to view their campaigns
- **Who sees it**: Admin, Manager, Operator, Sales

### Campaign Intelligence (`/spotify/ml-dashboard`)
ML-powered analytics dashboard for campaign performance prediction and optimization.
- Genre relevance analysis
- Historical performance data
- Vendor reliability scoring
- **Who sees it**: Admin, Manager, Operator

### Campaign Intake (`/spotify/campaign-intake`)
Multi-step wizard for creating new campaigns.
- Step 1: Select or create a client
- Step 2: Enter track details (Spotify URL, song name, artist)
- Step 3: Set stream goal and budget
- Step 4: Select genre
- Step 5: Assign vendors and allocate streams
- Step 6: Select playlists from vendor rosters
- Step 7: Review and submit
- **Who sees it**: Admin, Manager, Operator, Sales

### Campaign Builder (`/spotify/campaign-builder`)
Alternative campaign creation flow with playlist recommendations.
- **Who sees it**: Admin, Manager, Operator

### Salesperson Dashboard (`/spotify/salesperson`)
Dedicated view for the sales team.
- Campaign tracking focused on sales pipeline
- Campaign intake shortcut
- Client management
- **Who sees it**: Sales only

### Vendor Portal (`/spotify/vendor`)
Self-service portal for vendors.
- **Vendor Dashboard** (`/spotify/vendor`): Overview of assigned campaigns
- **My Playlists** (`/spotify/vendor/playlists`): Manage their playlist roster
- **Campaign Requests** (`/spotify/vendor/requests`): View and respond to campaign placement requests
- **Who sees it**: Vendor only

## How To

### Create a new campaign

1. Navigate to **Spotify > Campaign Intake** (or click the campaign intake button from the dashboard)
2. Select an existing client or create a new one
3. Enter the Spotify track URL, song name, and artist name
4. Set the total stream goal and budget
5. Select the primary genre for the track
6. Choose vendors and allocate stream targets per vendor
7. Select specific playlists from each vendor's roster
8. Review all details and submit

### Add a new vendor

1. Navigate to **Spotify > Vendors/Playlists**
2. Click **Add Vendor**
3. Enter vendor name, contact email, and cost per 1K streams
4. Save the vendor
5. Add playlists to the vendor by clicking **Add Playlist** on the vendor card

### Add playlists to a campaign

1. Navigate to **Spotify > Campaigns**
2. Click on the campaign to open the details modal
3. Go to the **Playlists** tab
4. Click **Add Playlist**
5. Use the playlist selector to search/filter by vendor, genre, or minimum daily streams
6. Select playlists and confirm

### View vendor performance

1. Navigate to **Spotify > Vendors/Playlists**
2. Click on a vendor card to expand and see their playlists
3. Review: total playlists, average daily streams, follower counts
4. For campaign-level performance, open a campaign and check the Performance tab

### Check campaign progress

1. Navigate to **Spotify > Campaigns**
2. Find the campaign (use search or filters)
3. Click to open the Campaign Details Modal
4. The Overview tab shows: stream goal, current progress, remaining streams, budget
5. The Performance tab shows charts with real scraped stream data

## Data Sources

Campaign data flows from multiple sources:

1. **CSV Import**: Bulk campaign data including client info, vendor assignments, playlist links
2. **Spotify Web API**: Playlist metadata (follower counts, track counts, genres from track artists)
3. **Spotify for Artists Scraper**: Real stream performance data (plays last 7/28 days, 12 months, playlist adds, saves)
4. **Manual entry**: Campaign intake forms in the UI

## Database Tables

| Table | Purpose |
|-------|---------|
| `spotify_campaigns` | Individual song placements with stream goals, vendor assignments, and scraped performance data |
| `campaign_groups` | Campaign containers grouping multiple songs |
| `campaign_playlists` | Links songs to specific playlists with real performance metrics |
| `playlists` | Aggregated playlist data for vendor display (follower counts, genres, avg streams) |
| `clients` | Client entities (artists/labels) |
| `vendors` | Playlist curators with cost rates and active status |

## FAQ

**Q: Why do some playlists show no follower count or genres?**
A: The playlist hasn't been enriched yet. Enrichment fetches metadata from the Spotify Web API. Contact an admin to run the enrichment script.

**Q: What does "algorithmic" mean for a playlist?**
A: Algorithmic playlists are auto-generated by Spotify (Discover Weekly, Release Radar, etc.). These are organic placements, not paid vendor placements.

**Q: Why can't I see the Vendors page?**
A: The Vendors page is only accessible to Admin, Manager, and Operator roles. Sales users see the Salesperson Dashboard instead.

**Q: How are genres determined for a playlist?**
A: Genres come from the artists of tracks in the playlist (not the playlist itself — Spotify doesn't tag playlists with genres). The top 3 most common genres across the first 10 tracks are stored.

**Q: What's the difference between campaign_groups and spotify_campaigns?**
A: A `campaign_group` is the top-level campaign for a client (can have multiple songs). Each `spotify_campaign` is an individual song placement within that group.

**Q: How often is stream data updated?**
A: The Spotify for Artists scraper runs on a schedule (typically daily). Enrichment data (follower counts, genres) is refreshed periodically via manual scripts.
