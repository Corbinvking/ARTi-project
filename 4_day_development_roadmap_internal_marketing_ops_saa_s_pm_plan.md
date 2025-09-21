# 4‑Day Development Roadmap — Internal Marketing Ops SaaS (PM Plan)

**Owner (PM):** You (acting as PM)

**Goal:** In 4 days, stand up a reliable foundation of the app so the client’s team can sign in/out, RBAC controls views, data flows through a real DB, daily AI insights run on a schedule, and event‑driven automations (Slack/email) work via n8n.

---

## North Star "Definition of Done" (DoD) for Day 4
- **Auth/RBAC:** Supabase Auth working with org‑scoped roles (`admin`, `manager`, `analyst`, `creator`). RLS policies enforced; UI gates match roles.
- **App Shell:** Next.js app on Vercel with tabs: **Dashboard, Instagram, Spotify, SoundCloud, YouTube, Admin**. Admin visible only to `admin`.
- **Backend/API:** Dockerized Node API on DigitalOcean. Validates Supabase JWT, queries Supabase Postgres via service key, and exposes `/webhooks/*`.
- **DB:** Supabase Postgres initialized with core tables for orgs/users/memberships, connected accounts, metrics, insights, embeddings (pgvector enabled), jobs, webhook_events.
- **Data Flow:** One provider vertical slice (Spotify) fully functional: connect account (token stored), fetch one KPI job on schedule, write to `metrics`.
- **Insights Job:** Scheduled worker runs an “Insights (daily)” job: queries metrics, does a basic vector lookup over seeded content, calls LLM, writes to `insights`.
- **Automations:** n8n receives a signed webhook (e.g., `insight.created`) and posts to Slack/email.
- **Scraper Stub:** Headless scraper container reachable by the worker; writes sample payloads to `staging_*` tables (no production scraping required).
- **Ops:** Central `.env`/secrets, healthcheck endpoints, basic logs (pino), Sentry wired, and runbook documented below.

---

## System Overview (Stack & Responsibilities)

- **Frontend — Next.js (Vercel)**
  - Supabase client for Auth; role‑gated routes; TanStack Query for data fetching; server actions for SSR.
  - Presents tabs (Dashboard/Instagram/Spotify/SoundCloud/YouTube/Admin).
  - Calls Backend API with user JWT; never exposes service keys.

- **Backend API — Node (Fastify or Nest) on DO (Docker)**
  - Validates Supabase JWT; enforces `org_id` scoping and role.
  - Proxies provider APIs; manages encrypted tokens in Postgres; exposes `/webhooks/*` for n8n.
  - Writes/reads from Postgres through Supabase (PostgREST/SQL) using service key.

- **Jobs/Workers — Node + BullMQ (Redis)**
  - **Cron:** metrics sync (Spotify slice), insights generation, token refresh, scraper test run.
  - **Queue:** on‑demand jobs from Admin.

- **Automations — n8n (Docker)**
  - Receives events (Slack/email) and can call back into API.

- **Database — Supabase Postgres (+ RLS + pgvector)**
  - Auth/RBAC; org‑scoped data; embeddings for RAG; storage for artifacts if needed.

- **Scraper — Playwright container**
  - POC endpoint invoked by worker; anti‑ban hygiene baked into template; writes to staging tables.

- **LLM/RAG**
  - Simplified ingestion → chunks → embeddings in pgvector.
  - Daily job composes context from metrics + vector search → LLM → persists to `insights`.

- **Airtable Migration (one‑time + incremental)**
  - **Discovery:** Pull base schema + sample data; profile field types; map to normalized Postgres model.
  - **Staging:** Create `staging_airtable_*` tables (raw JSONB `payload`, `external_id`, `org_id`, `ingested_at`).
  - **Transform:** Deterministic upserts from staging → core tables; handle multi‑selects via join tables; attachments to Supabase Storage.
  - **Incremental sync:** Use `LAST_MODIFIED_TIME()` filter to capture deltas until cutover; preserve Airtable record id as `external_id`.
  - **DQ checks:** counts per table, NULL audits for required columns, referential integrity checks, duplicate detection by business keys.
---

## Minimal Data Model (Foundation)
- `orgs(id, name)`
- `users(id, email)`
- `memberships(user_id, org_id, role)` // `admin|manager|analyst|creator`
- `connected_accounts(org_id, provider, access_token, refresh_token, meta, expires_at)`
- `assets(org_id, platform, external_id, title, url, meta)`
- `metrics(org_id, platform, asset_id, ts, kpi, value, source)`
- `documents(id, org_id, source, path, meta)`
- `chunks(id, document_id, idx, text)`
- `embeddings(chunk_id, vector)`
- `insights(org_id, ts, period, topic, summary, details_json, source_refs)`
- `jobs(id, type, status, payload_json, scheduled_for, attempts)`
- `webhook_events(id, org_id, type, payload_json, delivered_at)`
- `staging_airtable_* (external_id, payload jsonb, org_id, ingested_at)`

> **RLS:** Every table includes `org_id`. Policies restrict to `org_id` in JWT and role‑based permissions; server (service role) can bypass.
---

## Critical Flows We Must Nail
1) **Auth + RBAC:** Supabase login → JWT includes `org_id` & `role` → UI gates → API enforces → DB RLS enforces.
2) **Provider Vertical Slice (Spotify):** Connect account → token stored encrypted → metrics cron → write to `metrics` → Dashboard renders.
3) **Insights:** Worker aggregates last 7d metrics + vector context → LLM call → write to `insights` → webhook `insight.created` → n8n posts Slack/email.
4) **Admin Controls:** Invite user, set role, toggle automations, trigger job now, rotate provider tokens.
5) **Webhooks & Automations:** API emits events → n8n handles side‑effects → optional callback to API for follow‑ups.

---

## System Interfaces (diagramless overview)

### Backend API (minimal contracts)
- `GET /healthz` → 200 with `{status:"ok"}`; includes DB/Redis pings in body.
- `GET /readyz` → 200 only when DB + Redis + queue + JWT JWKS are reachable.
- `POST /webhooks/n8n` → inbound test endpoint (signed, HMAC header `x-signature`).
- `POST /events/insight.created` → **outbound** to n8n (signed payload; see event schema below).
- `GET /metrics/spotify?asset_id=...&from=...&to=...` → org‑scoped KPI read.
- `POST /jobs/sync/spotify` (admin) → enqueue metrics sync now.
- `POST /jobs/insights/run` (admin) → enqueue insights job now.
- `GET /insights?period=7d` → list recent insights (org‑scoped).
- `GET /auth/me` → echo back decoded JWT claims (org_id, role, sub) for debugging.

### Event Schema (example: `insight.created`)
```json
{
  "event_id": "uuid",
  "type": "insight.created",
  "org_id": "uuid",
  "insight_id": "uuid",
  "summary": "Top movement on Spotify followers week‑over‑week",
  "created_at": "2025-09-21T02:32:00Z",
  "hmac": "base64(signature)"
}
```

### Cron & Queues (UTC)
- 01:45 **Hourly token check** — refresh expiring provider tokens.
- 02:00 **Nightly metrics: Spotify** — fetch artist/playlist KPIs; backoff on rate‑limit.
- 02:30 **Daily insights** — vector search + LLM; write to `insights`; emit `insight.created`.
- 08:00/14:00/20:00 **Scraper stub** — write sample rows to `staging_scrapes` for pipeline validation.

> Adjust crons to client timezone after Day‑4 demo; above are UTC placeholders.

### RBAC Policy (behavioral overview)
- **admin**: full read/write within org; manage users/roles; rotate tokens; run jobs; toggle automations.
- **manager**: read all; write to `connected_accounts`, trigger safe jobs; cannot change roles.
- **analyst**: read `metrics`, `insights`, `assets`; cannot write tokens or run jobs.
- **creator**: read own asset metrics/insights; cannot see financial/admin surfaces.

### RLS (policy sketch)
- Every table has `org_id` and `created_by`.
- Read policy: `using (org_id = auth.jwt() ->> 'org_id')`.
- Write policy: `with check (org_id = auth.jwt() ->> 'org_id')` and role‑based allowlists per table.
- Service role (backend/worker) bypasses RLS; never expose service key to client.

### Spotify data plan (API + Scraper)
- **Web API (safe & supported):** `artist.followers`, `artist.popularity`, playlist followers, and selected audio features for known tracks.
- **Scraper (charts‑based):** Pull daily/weekly **Spotify Charts** for tracks visible on charts; map by `spotify_track_id`; save `kpi=track.streams.daily` with `source='charts'`.
- **Caveat:** Spotify does **not** expose per‑track lifetime play counts via its public Web API. Where counts are not publicly available (non‑chart tracks), display N/A rather than fabricating values.

### Security & Secrets
- HMAC for incoming webhooks; rotate shared secrets.
- Encrypt provider tokens at rest; scope OAuth to least permissions.
- Per‑request correlation id; structured logs; deny by default CORS.

### Observability
- Pino logs with org_id and request id; ship to file/stdout.
- Sentry wired (frontend, API, worker) with release tags; trace job chains (enqueue→process→emit).
- Health dashboards: expose last cron run status/time in Admin > Jobs.

### Demo Script (Day‑4)
1) Login as Admin → verify role‑gated Admin tab.
2) Connect Spotify → "Sync now" → see metrics populate on Dashboard.
3) Run "Generate insights" → see new record under Insights and Slack message via n8n.
4) Flip automation toggles (on/off) → re‑run insight to confirm behavior.
5) Trigger scraper stub → verify a row in `staging_scrapes` and promotion to `metrics` sample.


---

## Day‑by‑Day Plan (with Acceptance Criteria)

### **Day 1 — Foundations, Airtable Discovery & Access Control**
**Objectives**
- Stand up repos & environments. Ship login + RBAC gates end‑to‑end. Complete Airtable schema discovery and migration plan.

**Work**
- Create mono‑repo or two repos (frontend, platform). Add CI (build, lint) and `.env.example`.
- Provision Supabase project; enable pgvector; create core schemas + RLS policies (org‑scoped).
- Next.js app shell on Vercel: Auth UI (magic link/email), role‑gated routes/tabs, SSR health page.
- Backend API Docker image; deploy to DO droplet. JWT validation against Supabase JWKS. `/healthz` endpoint.
- n8n container up on DO; create inbound test webhook.
- **Airtable discovery:**
  - Collect base IDs/table list; export 100‑record samples per table via Airtable API.
  - Draft mapping doc: Airtable → Postgres (field types, joins, attachments, enums).
  - Create `staging_airtable_*` tables and load sample payloads (JSONB) with `external_id`.

**Acceptance Criteria**
- User can sign up/in; role stored in `memberships`; Admin can see Admin tab; others cannot.
- API returns 200 on `/healthz` and rejects invalid/foreign org JWT.
- RLS proven via test queries.
- **Airtable mapping approved** (documented), and sample rows present in staging tables.

**Risks & Mitigation**
- RLS misconfig → Add integration tests.
- Airtable schema surprises → Keep raw JSONB + staged loads so we can evolve transforms without data loss.

---

### **Day 2 — Airtable Full Load, Provider Slice (Spotify) & Metrics Pipeline**
**Objectives**
- Execute first **full load** from Airtable into staging → core. Demonstrate the full data loop for Spotify.

**Work**
- **Airtable ETL:** Build a worker task `etl:airtable:full`:
  - Paginate through all tables; write raw rows to `staging_airtable_*` (idempotent on `external_id`).
  - Transform to core tables: normalize multi‑selects → join tables; resolve references; move attachments to Supabase Storage; assign `org_id`.
- **Delta sync scaffold:** Implement `etl:airtable:delta` using `LAST_MODIFIED_TIME()`; schedule hourly.
- Backend endpoints: `/providers/spotify/connect`, `/providers/spotify/callback`, `/metrics/spotify/sync`.
- Store tokens in `connected_accounts` (encrypted). Token refresh path.
- Worker + Redis up. Implement `metrics:spotify:sync` job (followers, popularity for one artist/playlist).
- Dashboard UI renders latest Spotify KPIs per org.

**Acceptance Criteria**
- Full Airtable load completes with row counts logged; transform populates core tables with referential integrity.
- Delta sync creates/updates expected rows on change.
- Admin connects a Spotify org account; manual “Sync now” works; nightly cron enqueues and writes to `metrics`.

**Risks & Mitigation**
- Airtable rate limits → throttle/concurrent=1, backoff; checkpoint per table.
- OAuth redirects → test locally with tunnel; document allowed URIs.

---

### **Day 3 — Insights (LLM/RAG), Dual Spotify Data, & Automations**
**Objectives**
- Generate daily insights and notify via n8n. Add **Playwright scraper** for Spotify charts‑based streams to complement the Web API.

**Work**
- Seed `documents/chunks/embeddings` with a small org knowledge base and enable pgvector.
- Implement `insights:daily` job: read last 7d metrics + vector search over org docs → LLM → write `insights`.
- API emits `insight.created` webhook (signed, includes org_id + insight id).
- n8n flow receives webhook → posts Slack message and sends fallback email.
- **Dual Spotify data**:
  - Keep Web API for followers/popularity.
  - Add Playwright job `metrics:spotify:streams:scrape` that pulls **public Spotify Charts** (track/region/day) and maps to known tracks by `spotify_track_id`.
  - Persist scraped counts to `metrics` with `kpi` like `track.streams.daily` and source tag `charts`.
- Admin screen: toggle “Enable daily insights”, test fire.

**Acceptance Criteria**
- Cron fires; `insights` row created; n8n posts to Slack with summary + link.
- Scraper writes at least one `track.streams.daily` metric for a track present in charts; API and UI show the merged KPIs with source labels.

**Risks & Mitigation**
- LLM latency/failure → retries + fallback template.
- Track not present on charts → store null/absent; avoid fabricating counts; display source badges.

---

### **Day 4 — Hardening, Cutover Plan, Scraper Stub, Admin Ops & Demo**
**Objectives**
- Tighten ops, finalize Airtable **cutover plan**, validate incremental sync, and run client demo.

**Work**
- Sentry wired (frontend/backend/worker); structured logs (pino) with request ids.
- Health checks: `/healthz`, `/readyz`; Redis and DB ping endpoints; simple uptime monitor.
- Scraper reliability: user‑agent rotation, retry policy, and per‑source rate limits.
- **Airtable cutover**: freeze window, run final delta, compare counts/hashes, mark `source_system='supabase'` and switch UI reads fully to Postgres.
- Admin: invite user, set roles, rotate provider tokens, toggle jobs, “Run now” for any job.
- Demo script executed end‑to‑end.

**Acceptance Criteria**
- All services pass health checks; errors captured in Sentry.
- Airtable deltas clean; cutover checklist signed off; UI reads supabase‑only.
- Admin flows complete; demo succeeds (login→dashboard→admin→sync→insights→Slack; plus charts streams metric visible when available).

**Risks & Mitigation**
- Playwright dependencies in Docker → use maintained image; cache browsers; `--no-sandbox` in container.
- Time overrun → keep provider scope to Spotify; stub others.
---

## Non‑Negotiables (Quality Bar)
- **Security:** No service keys in client; tokens encrypted; least privilege; RLS enforced for every table.
- **Multi‑tenant Safety:** Every query scoped by `org_id`. Tests validate cross‑org isolation.
- **Observability:** Health endpoints, logs with correlation ids, Sentry errors, minimal dashboards.
- **Idempotency:** Webhooks and jobs dedupe by `event_id`/job key. Safe retries.
- **Backpressure:** Rate‑limit provider calls; exponential backoff.

---

## Admin Surface (MVP)
- User management (invite, role change, deactivate).
- Provider connections (connect, reconnect, rotate, revoke).
- Jobs (enable/disable, run now, last run status, next run time).
- Automations (toggle Slack/email). Audit log (last 20 events).

---

## Minimal Runbook (Ops)
- **Secrets:**
  - `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
  - `JWT_AUDIENCE`, `JWT_ISSUER`
  - `REDIS_URL`
  - `OPENAI_API_KEY` (or chosen LLM)
  - `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REDIRECT_URI`
  - `N8N_WEBHOOK_SECRET`
- **Health:** `GET /healthz`, `GET /readyz`; Redis `PING`; DB `SELECT 1`.
- **Deploy:**
  - Frontend: Vercel with env vars.
  - Backend/Worker/n8n/Scraper: Docker Compose on DO; tagged images; restart policies.
- **Backups:** Supabase automated backups; export schema weekly.

---

## Backlog After Day 4 (Next Up)
- Add YouTube/Instagram/SoundCloud connectors behind a provider abstraction.
- Build richer dashboards & anomaly detection.
- OAuth account linking per user for creator‑specific tabs.
- Audit & billing (financials view) in Admin.
- Fine‑grain RBAC (per‑tab permissions), feature flags.

---

## Success Criteria (What “Ready” Means to the Client)
- Team can log in and sees correct tabs per role.
- Admin can manage users and integrations without engineering help.
- One real data source (Spotify) proves the loop from provider → DB → insights → Slack/email.
- Nightly jobs run reliably and are observable.
- Clear path to add next providers without re‑architecting.

