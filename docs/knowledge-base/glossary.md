# Glossary

Platform-specific terms, acronyms, and definitions used across the ARTi platform.

## General Platform Terms

| Term | Definition |
|------|-----------|
| **ARTi** | Artist Influence — the name of the platform and the company |
| **Artist Influence** | The music marketing company operating the ARTi platform |
| **Campaign** | A promotion effort for a piece of content (song, video, track) across a specific platform |
| **Campaign Group** | A container for multiple related campaigns (e.g., an album campaign with multiple songs) |
| **Client** | An artist, label, or manager who pays for promotion campaigns |
| **Vendor** | A service provider who delivers promotion services (playlist curators, engagement providers) |
| **Creator** | An Instagram influencer who creates content featuring a client's music |
| **Member** | A SoundCloud artist who participates in the repost network |
| **Ops Queue** | Centralized task queue showing pending actions across all platforms |
| **FAB** | Floating Action Button — the bug report button in the bottom-left corner of the screen |
| **RLS** | Row Level Security — PostgreSQL feature that restricts data access by organization/user |
| **Org** | Organization — the top-level tenant in the multi-tenant system |

## Spotify Terms

| Term | Definition |
|------|-----------|
| **Stream Strategist** | Internal name for the Spotify campaign management module |
| **CP1K** | Cost per 1,000 streams — the standard pricing metric for playlist placement campaigns |
| **Playlist Placement** | A song being added to a curated playlist for promotion |
| **Algorithmic Playlist** | A Spotify-generated playlist (Discover Weekly, Release Radar, Daily Mix, etc.) — organic, not paid |
| **Vendor Playlist** | A curated playlist managed by a vendor (paid placement) |
| **Enrichment** | The process of fetching metadata from the Spotify Web API (follower counts, genres, track info) |
| **Scraper** | The Spotify for Artists scraper that collects real stream performance data |
| **Campaign Playlists** | The database table linking individual songs to specific playlist placements with performance data |
| **Playlist Links** | The raw playlist URLs from the CSV import, stored in the `playlist_links` column |
| **SFA** | Spotify for Artists — the analytics dashboard Spotify provides to artists and their teams |
| **Campaign Intelligence** | ML-powered analytics dashboard for campaign performance prediction |
| **Base62 ID** | Spotify's 22-character alphanumeric identifier for playlists, tracks, and artists |

## Instagram Terms

| Term | Definition |
|------|-----------|
| **Seedstorm** | Internal name for the Instagram creator seeding campaign module |
| **Seeding** | The process of distributing music to creators for organic-looking promotion |
| **CP1K** | Cost per 1,000 views — the standard pricing metric for Instagram creator campaigns |
| **Engagement Rate** | Ratio of interactions (likes, comments, shares) to views or followers |
| **Reel** | Instagram's short-form video format (up to 90 seconds) — typically gets the most views |
| **Story** | Instagram's 24-hour ephemeral content format |
| **QA** | Quality Assurance — the review process where operators approve or reject creator posts |
| **Territory** | Geographic/demographic targeting for audience reach |
| **Sound URL** | The Instagram audio URL that creators use in their posts |

## YouTube Terms

| Term | Definition |
|------|-----------|
| **Vidi Health Flow** | Internal name for the YouTube campaign management module |
| **Health Score** | A 0-100 metric evaluating whether a video's engagement ratios look natural |
| **Ratio Fixer** | Tool that calculates what additional engagement is needed to normalize engagement ratios |
| **Engagement Ratio** | The relationship between different engagement types (likes:views, comments:likes) |
| **Service Type** | The type of engagement being purchased (views, likes, comments, subscribers, watch hours) |
| **Monitoring Phase** | Campaign phase where engagement ratios are being tracked for anomalies |
| **Ratio Alert** | Warning that a campaign's engagement ratios are outside natural-looking ranges |

## SoundCloud Terms

| Term | Definition |
|------|-----------|
| **Repost** | Sharing a track on SoundCloud so it appears in followers' feeds — the primary promotion mechanism |
| **Repost Network** | The collection of SoundCloud accounts/channels that participate in reposting campaigns |
| **Member Portal** | Self-service interface for SoundCloud artists to submit tracks and manage their account |
| **Credits** | Virtual currency used by members to pay for repost campaigns |
| **Credit Ledger** | Transaction history showing all credit earned, spent, and purchased |
| **Submission Queue** | The queue of track submissions waiting for operator review |
| **Genre Family** | A top-level genre category that contains multiple subgenres |
| **Avoid List** | Member-configured list of tracks/artists that should not be reposted to their channel |
| **Channel** | A SoundCloud account used for reposting tracks in the network |
| **Attribution** | Tracking which reposts drove engagement for a track |

## Dashboard Terms

| Term | Definition |
|------|-----------|
| **Campaign Funnel** | Visual representation of campaigns by lifecycle stage (Intake → Setup → Active → Reporting → Completed) |
| **Platform Health** | Real-time status of each platform's operations (delivery pace, API connectivity) |
| **Campaign Risk** | Aggregated risk indicators: missing assets, behind schedule, API failures, overdue reports |
| **Invoice Health** | Breakdown of invoice status: paid, outstanding, overdue |
| **Behind Schedule** | A campaign whose actual delivery rate is below the expected pace for its timeline |
| **Profitability Risk** | Campaigns with margins below 20% |
| **Ending Soon** | Campaigns approaching their completion date (within 7, 14, or 30 days) |

## Technical Terms

| Term | Definition |
|------|-----------|
| **Supabase** | The open-source Firebase alternative providing database, auth, and storage for the platform |
| **React Query** | (TanStack Query) Library for managing server state, caching, and data fetching in React |
| **Query Invalidation** | Clearing the React Query cache after a mutation so the UI refetches fresh data |
| **shadcn/ui** | UI component library used for the platform's design system |
| **Fastify** | Node.js web framework used for the backend API server |
| **n8n** | Workflow automation platform used for event-driven automations (webhooks, notifications) |
| **BullMQ** | Redis-based job queue used for background processing and scheduled tasks |
| **pgvector** | PostgreSQL extension for vector embeddings, used for AI/semantic search features |
| **JWT** | JSON Web Token — the authentication token format used for user sessions |
| **RBAC** | Role-Based Access Control — the permission system based on user roles |

## Status Values

### Campaign Status
| Status | Meaning |
|--------|---------|
| Draft | Campaign created but not yet submitted |
| Pending | Awaiting review or approval |
| Active | Campaign is live and delivering |
| Paused | Temporarily stopped |
| Completed | Campaign finished all deliverables |

### Invoice Status
| Status | Meaning |
|--------|---------|
| Not Invoiced | Invoice not yet created |
| Sent | Invoice sent to client |
| Paid | Client has paid |
| Overdue | Payment past due date |

### Report Status (Platform Development)
| Status | Meaning |
|--------|---------|
| Open | Report submitted, not yet addressed |
| In Progress | Someone is working on it |
| Complete | Issue resolved or feature implemented |

### Curator Status (Spotify)
| Status | Meaning |
|--------|---------|
| Pending | Waiting for vendor to accept/reject the placement |
| Accepted | Vendor has placed the song on their playlist |
| Rejected | Vendor declined the placement |
