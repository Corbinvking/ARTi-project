# ARTi Platform Overview

## What is ARTi?

ARTi (Artist Influence) is a multi-platform music marketing operations SaaS platform. It manages promotion campaigns across Spotify, Instagram, YouTube, and SoundCloud — providing campaign management, vendor/creator coordination, financial tracking, analytics, and automated workflows.

The platform is used internally by the Artist Influence operations team to run music promotion campaigns for their clients (artists, labels, and managers).

## Production URLs

| Service | URL | Hosting |
|---------|-----|---------|
| Frontend App | https://app.artistinfluence.com | Vercel |
| Backend API | https://api.artistinfluence.com | DigitalOcean |
| Database Admin | https://db.artistinfluence.com | Supabase Studio |
| Automation | https://link.artistinfluence.com | n8n |

## Platform Modules

| Module | Route | Purpose |
|--------|-------|---------|
| Dashboard | `/dashboard` | Cross-platform operations overview with revenue, risk, and health metrics |
| Spotify | `/spotify` | Playlist campaign management (Stream Strategist) |
| Instagram | `/instagram` | Creator promotion campaigns (Seedstorm) |
| YouTube | `/youtube` | Video promotion campaigns (Vidi Health Flow) |
| SoundCloud | `/soundcloud` | Repost campaign and member portal management |
| Operator | `/operator` | Internal ops queue and platform development tracking |
| Admin | `/admin` | User management, system settings, platform integrations |

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, shadcn/ui |
| Backend API | Node.js, Fastify, TypeScript |
| Database | PostgreSQL 15 (Supabase) with Row Level Security |
| Auth | Supabase Auth with JWT tokens |
| Queue/Jobs | Redis + BullMQ |
| Automation | n8n workflow engine |
| Deployment | Vercel (frontend), Docker on DigitalOcean (backend), Cloudflare (DNS/CDN) |
| State Management | React Query (TanStack Query) for server state |

## Architecture

```
User Browser
    │
    ▼
Next.js Frontend (Vercel)
    │
    ├──► Supabase (Direct client queries with RLS)
    │
    └──► Backend API (DigitalOcean Docker)
              │
              ├──► Supabase (Service role queries)
              ├──► External APIs (Spotify, YouTube, etc.)
              ├──► Redis/BullMQ (Background jobs)
              └──► n8n (Automation workflows)
```

### Key Architectural Patterns

- **Direct Supabase access**: The frontend connects directly to Supabase for most data queries, protected by Row Level Security (RLS) policies that scope data to the user's organization.
- **API proxy for external services**: The backend API handles interactions with external services (Spotify Web API, YouTube API) and operations requiring service-role database access.
- **Multi-tenant isolation**: All data is scoped to organizations via `org_id` columns and RLS policies.
- **Role-based UI**: Navigation, pages, and actions adapt based on the user's role (admin, manager, operator, etc.).

## Authentication

- Users authenticate via Supabase Auth (email/password).
- Sessions persist via JWT tokens stored in the browser.
- User roles are stored in Supabase auth metadata (`user_metadata.role`).
- Roles do NOT query the database — they come from auth metadata only (performance pattern).
- Platform-specific permissions can be managed via the Admin panel's permission matrix.

## Data Scale (Approximate)

| Entity | Count |
|--------|-------|
| Spotify campaigns | ~2,100+ |
| SoundCloud campaigns | ~2,000+ |
| YouTube campaigns | ~820+ |
| Instagram campaigns | ~160+ |
| Total campaigns | ~5,100+ |
| Clients | ~240+ |
| Vendors | ~12 active |
| Users | ~10 active |

## Notification System

The platform sends one-way Slack notifications for key events:
- Campaign status changes
- New campaign creation
- Submission status updates
- Configured per-platform via Settings pages (webhook URL + channel)
- Supports: Spotify, Instagram, YouTube, SoundCloud

## Development & Bug Reporting

- **In-app reporting**: Operators can report bugs/features via the Operator panel's Platform Development tab, which creates GitHub issues automatically.
- **Slack bot**: The Cursor Slack bot answers platform questions and can create GitHub issues for bugs/features.
- **GitHub pipeline**: Issues flow through an automated triage > dispatch > agent worker > PR pipeline.
