# ARTi Platform Branching Strategy

## Cloud Agent Navigation Guide

This document serves as the authoritative reference for any cloud agent working on this codebase. Read this first before making changes.

---

## Platform Architecture Overview

### The 7 Apps

| App | Route | Primary Purpose | Database Schema |
|-----|-------|-----------------|-----------------|
| **Dashboard** | `/dashboard` | Cross-platform overview, revenue, risk analysis | Shared tables only |
| **Spotify** | `/spotify` | Playlist campaign management | `spotify_campaigns`, `playlists`, `vendors`, `campaign_playlists` |
| **Instagram** | `/instagram` | Creator-based promotion campaigns | `instagram_campaigns`, `instagram_campaign_creators`, `creators` |
| **YouTube** | `/youtube` | Video promotion campaigns | `youtube_campaigns`, `youtube_performance_logs` |
| **SoundCloud** | `/soundcloud` | Repost network management | `soundcloud_members`, `soundcloud_submissions` |
| **Operator** | `/operator` | Internal ops queue, platform dev | `ops_queue`, `platform_development_requests` |
| **Admin** | `/admin` | User management, system settings | `users`, `orgs`, `memberships` |

### Shared Infrastructure

These components are used across ALL apps:
- `apps/frontend/components/ui/` - shadcn/ui components
- `apps/frontend/components/navigation/` - Platform navigation
- `apps/frontend/hooks/` - Auth, query hooks
- `apps/frontend/lib/` - Supabase client, utilities
- Shared DB tables: `clients`, `salespeople`, `campaign_groups`, `orgs`, `users`

---

## Branch Naming Convention

### Format
```
{type}/{app}/{short-description}
```

### Types
| Type | Use Case |
|------|----------|
| `feature` | New functionality |
| `fix` | Bug fixes |
| `refactor` | Code restructuring without behavior change |
| `chore` | Maintenance, dependencies, tooling |
| `hotfix` | Production emergency fixes |

### Apps
| App Code | Full App Name |
|----------|---------------|
| `spotify` | Spotify campaign platform |
| `instagram` | Instagram creator campaigns |
| `youtube` | YouTube video campaigns |
| `soundcloud` | SoundCloud repost network |
| `dashboard` | Cross-platform dashboard |
| `operator` | Operator tools |
| `admin` | Admin panel |
| `shared` | Cross-app shared code |
| `infra` | Infrastructure, deployment |

### Examples
```bash
# Good branch names
feature/spotify/playlist-enrichment
feature/instagram/creator-discovery-v2
fix/soundcloud/portal-auth-redirect
refactor/shared/query-invalidation-patterns
chore/infra/update-dependencies
hotfix/spotify/campaign-submission-crash

# Bad branch names (avoid)
update-stuff              # No context
spotify-fix               # Missing type and description
my-changes                # Not descriptive
```

---

## Branch Hierarchy

```
main (production)
│
├── develop (integration - optional)
│
├── feature/spotify/...
├── feature/instagram/...
├── feature/youtube/...
├── feature/soundcloud/...
├── feature/dashboard/...
├── feature/operator/...
├── feature/admin/...
├── feature/shared/...
│
├── fix/...
├── refactor/...
└── hotfix/...
```

### Branch Rules

1. **main**: Production code. Never push directly.
2. **feature branches**: Short-lived. Merge and delete after PR approval.
3. **hotfix branches**: Branch from main, merge to main AND develop.

---

## Cloud Agent Workflow

### Before Starting Work

1. **Read this document** to understand the platform structure
2. **Check `.cursorrules`** for database schema and code patterns
3. **Identify which app** your task affects
4. **Create appropriate branch** following naming convention

### Starting a New Task

```bash
# 1. Ensure you're on main and up to date
git checkout main
git pull origin main

# 2. Create your feature branch
git checkout -b feature/spotify/your-feature-name

# 3. Work on your changes, committing frequently
git add .
git commit -m "feat(spotify): implement playlist filtering"

# 4. Push your branch
git push -u origin feature/spotify/your-feature-name
```

### Commit Message Format

```
{type}({app}): {short description}

{optional body with more details}
```

Types: `feat`, `fix`, `refactor`, `chore`, `docs`, `test`

Examples:
```
feat(spotify): add genre filtering to playlist view
fix(instagram): resolve creator search pagination
refactor(shared): consolidate query invalidation logic
chore(infra): update supabase to v2.45.0
```

---

## App-Specific Reference

### Spotify App

**Location**: `apps/frontend/app/(dashboard)/spotify/`

**Sub-routes**:
| Route | Description | Key Components |
|-------|-------------|----------------|
| `/spotify` | Main dashboard | `page.tsx` |
| `/spotify/stream-strategist/` | Full campaign management app | Separate routing system |
| `/spotify/vendor/` | Vendor portal | `playlists/`, `requests/` |
| `/spotify/campaigns` | Campaign list | Campaign tables |
| `/spotify/clients` | Client management | Client CRUD |
| `/spotify/playlists` | Playlist management | Playlist tables |
| `/spotify/ml-dashboard` | ML analytics | Algorithm insights |

**Key Database Tables**:
- `spotify_campaigns` (id: INTEGER) - Individual campaigns
- `campaign_playlists` (campaign_id → INTEGER) - Campaign-playlist links
- `playlists` (spotify_id: VARCHAR) - Playlist metadata
- `vendors` - Playlist vendors

**Critical Patterns** (from .cursorrules):
- Column is `campaign` NOT `campaign_name`
- `genres` is `text[]` NOT `jsonb`
- Always query by `spotify_id` for playlists

---

### Instagram App

**Location**: `apps/frontend/app/(dashboard)/instagram/`

**Sub-routes**:
| Route | Description |
|-------|-------------|
| `/instagram` | Dashboard |
| `/instagram/creators` | Creator database |
| `/instagram/campaign-builder` | Build new campaigns |
| `/instagram/campaigns` | Campaign management |
| `/instagram/qa` | Quality assurance |
| `/instagram/workflow` | Business rules |
| `/instagram/seedstorm-builder/` | Full app (separate routing) |

**Key Database Tables**:
- `instagram_campaigns`
- `instagram_campaign_creators`
- `instagram_campaign_posts`
- `creators` (shared with other platforms)

---

### YouTube App

**Location**: `apps/frontend/app/(dashboard)/youtube/`

**Sub-routes**:
| Route | Description |
|-------|-------------|
| `/youtube` | Dashboard |
| `/youtube/campaigns` | Campaign management |
| `/youtube/clients` | Client management |
| `/youtube/vendor-payments` | Payment tracking |
| `/youtube/system-health` | Health monitoring |
| `/youtube/vidi-health-flow/` | Full app (separate routing) |

**Key Database Tables**:
- `youtube_campaigns`
- `youtube_performance_logs`
- `youtube_ratio_fixer_queue`

---

### SoundCloud App

**Location**: `apps/frontend/app/(dashboard)/soundcloud/`

**Sub-routes**:
| Route | Description |
|-------|-------------|
| `/soundcloud` | Dashboard redirect |
| `/soundcloud/dashboard/` | Admin dashboard |
| `/soundcloud/dashboard/members` | Member management |
| `/soundcloud/dashboard/queue` | Repost queue |
| `/soundcloud/dashboard/campaigns` | Campaign management |
| `/soundcloud/portal/` | Member self-service portal |

**Key Database Tables**:
- `soundcloud_members`
- `soundcloud_submissions`
- `soundcloud_member_campaigns`
- `soundcloud_genre_families`

---

### Dashboard App

**Location**: `apps/frontend/app/(dashboard)/dashboard/`

**Purpose**: Cross-platform overview with:
- Revenue metrics
- Risk analysis
- Platform health
- Activity feed

**Database**: Uses shared tables (`campaign_groups`, aggregates from all platforms)

---

### Operator App

**Location**: `apps/frontend/app/(dashboard)/operator/`

**Purpose**: Internal tools for:
- Operations queue management
- Platform development requests
- Task tracking

**Access**: Operator and Admin roles only

---

### Admin App

**Location**: `apps/frontend/app/(dashboard)/admin/`

**Purpose**: System administration:
- User management
- Platform integrations
- System settings
- QuickBooks status
- Scraper management

**Access**: Admin role only

---

## File Location Quick Reference

### Frontend
```
apps/frontend/
├── app/
│   ├── (auth)/           # Login pages
│   ├── (dashboard)/      # All 7 apps live here
│   │   ├── dashboard/
│   │   ├── spotify/
│   │   ├── instagram/
│   │   ├── youtube/
│   │   ├── soundcloud/
│   │   ├── operator/
│   │   └── admin/
│   └── page.tsx          # Landing page
├── components/           # Shared components
│   ├── ui/              # shadcn/ui
│   ├── navigation/      # Platform nav
│   └── dashboard/       # Dashboard widgets
├── hooks/               # Shared hooks
└── lib/                 # Utilities, Supabase client
```

### Backend
```
apps/api/
├── src/
│   ├── routes/          # API endpoints
│   ├── lib/             # Shared utilities
│   └── index.ts         # Express app
└── production.env       # Environment variables
```

### Database
```
supabase/
├── migrations/          # Schema migrations
└── seed.sql            # Seed data
```

### Scripts
```
scripts/
├── enrich-playlists-direct.sh
├── simple-import.sh
└── *.sql               # Database scripts
```

---

## Cross-App Dependencies

When modifying these areas, test ALL affected apps:

| File/Folder | Apps Affected |
|-------------|---------------|
| `components/ui/` | ALL |
| `components/navigation/` | ALL |
| `hooks/use-auth.ts` | ALL |
| `lib/supabase.ts` | ALL |
| `clients` table | Spotify, YouTube, Instagram |
| `campaign_groups` table | ALL campaign apps |
| `users`/`orgs` tables | ALL |

---

## When to Create a New Branch vs. Extend Existing

**Create NEW branch when:**
- Starting fresh feature development
- Task is independent of other ongoing work
- Bug fix for specific issue

**Consider EXTENDING existing branch when:**
- Follow-up to recently merged feature
- Related fixes in same app area
- Part of larger coordinated effort

---

## Merge Strategy

1. **Feature → main**: Squash merge (clean history)
2. **Hotfix → main**: Regular merge (preserve commits)
3. **Large features**: Consider rebase before final merge

---

## Emergency Procedures

### Production Bug
```bash
git checkout main
git pull origin main
git checkout -b hotfix/spotify/critical-bug-description
# Fix the bug
git push -u origin hotfix/spotify/critical-bug-description
# Create PR, get quick review, merge
```

### Reverting Bad Merge
```bash
git checkout main
git revert <commit-hash>
git push origin main
```

---

## Version History

| Date | Author | Changes |
|------|--------|---------|
| 2026-02-25 | Cloud Agent | Initial branching strategy document |

---

## Related Documentation

- `.cursorrules` - Database schema and code patterns
- `docs/system-architecture-diagram.md` - System architecture
- `docs/core-functionality.md` - Feature documentation
