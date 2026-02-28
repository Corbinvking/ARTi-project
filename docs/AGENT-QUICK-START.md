# Cloud Agent Quick Start Guide

**Read this first before starting any task.**

---

## Step 1: Identify Your Task Scope

Ask: "Which app does this task affect?"

| If task involves... | App code | Branch prefix |
|---------------------|----------|---------------|
| Playlist campaigns, vendors, Spotify API | `spotify` | `feature/spotify/` |
| Creator campaigns, Instagram posts | `instagram` | `feature/instagram/` |
| Video campaigns, YouTube metrics | `youtube` | `feature/youtube/` |
| Repost network, member portal | `soundcloud` | `feature/soundcloud/` |
| Cross-platform overview, revenue | `dashboard` | `feature/dashboard/` |
| Ops queue, internal tools | `operator` | `feature/operator/` |
| User management, system settings | `admin` | `feature/admin/` |
| Shared components, auth, utilities | `shared` | `feature/shared/` |
| Deployment, CI/CD, infrastructure | `infra` | `chore/infra/` |

---

## Step 2: Navigate to the Right Files

### Quick Path Reference

```
Frontend App:     apps/frontend/app/(dashboard)/{app}/
App Components:   apps/frontend/app/(dashboard)/{app}/**/components/
Shared UI:        apps/frontend/components/ui/
Shared Hooks:     apps/frontend/hooks/
API Routes:       apps/api/src/routes/
Migrations:       supabase/migrations/
Scripts:          scripts/
```

### App-Specific Paths

| App | Frontend Path | Has Sub-App? |
|-----|---------------|--------------|
| Spotify | `spotify/` | Yes: `stream-strategist/`, `vendor/` |
| Instagram | `instagram/` | Yes: `seedstorm-builder/` |
| YouTube | `youtube/` | Yes: `vidi-health-flow/` |
| SoundCloud | `soundcloud/` | Yes: `soundcloud-app/`, `portal/` |
| Dashboard | `dashboard/` | No |
| Operator | `operator/` | No |
| Admin | `admin/` | No |

---

## Step 3: Check Database Schema

**Before ANY database work, read `.cursorrules`** for:
- Correct column names (e.g., `campaign` NOT `campaign_name`)
- Data types (e.g., `genres` is `text[]` NOT `jsonb`)
- Foreign key relationships

### Key Tables by App

| App | Primary Tables |
|-----|----------------|
| Spotify | `spotify_campaigns`, `playlists`, `vendors`, `campaign_playlists` |
| Instagram | `instagram_campaigns`, `creators`, `instagram_campaign_creators` |
| YouTube | `youtube_campaigns`, `youtube_performance_logs` |
| SoundCloud | `soundcloud_members`, `soundcloud_submissions` |
| Shared | `clients`, `salespeople`, `campaign_groups`, `users`, `orgs` |

---

## Step 4: Create Your Branch

```bash
# Format: {type}/{app}/{description}

# Examples:
git checkout -b feature/spotify/playlist-genre-filter
git checkout -b fix/instagram/creator-search-bug
git checkout -b refactor/shared/query-hooks
```

Types: `feature`, `fix`, `refactor`, `chore`, `hotfix`

---

## Step 5: Commit Pattern

```bash
# Format: {type}({app}): {description}

git commit -m "feat(spotify): add playlist genre filtering"
git commit -m "fix(instagram): resolve creator pagination"
```

---

## Cross-App Impact Checklist

If you modify any of these, TEST multiple apps:

- [ ] `components/ui/*` → Affects ALL apps
- [ ] `components/navigation/*` → Affects ALL apps
- [ ] `hooks/use-auth.ts` → Affects ALL apps
- [ ] `lib/supabase.ts` → Affects ALL apps
- [ ] `clients` table → Affects Spotify, YouTube, Instagram
- [ ] `campaign_groups` table → Affects all campaign apps

---

## Common Mistakes to Avoid

1. **Wrong column name**: Use `campaign` not `campaign_name`
2. **Type mismatch**: `genres` is `text[]` not `jsonb`
3. **Missing null checks**: Always check arrays before `.map()`
4. **Query invalidation**: Always invalidate related queries after mutations
5. **Campaign ID types**: `campaign_groups.id` is UUID, `spotify_campaigns.id` is INTEGER

---

## Full Documentation

- **Branching Strategy**: `docs/BRANCHING-STRATEGY.md`
- **Code Patterns**: `.cursorrules`
- **System Architecture**: `docs/system-architecture-diagram.md`
