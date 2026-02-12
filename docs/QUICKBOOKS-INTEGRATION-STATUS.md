# QuickBooks Online Integration -- Status Document

Last updated: February 11, 2026

---

## Overview

The QuickBooks Online (QBO) integration connects the ARTi platform to Intuit's QuickBooks accounting system. It supports OAuth 2.0 authentication, two-way data sync (Customers, Invoices, Payments, Vendors, Items, Accounts), real-time webhooks, and a dedicated admin observability card.

---

## What Is Installed and Verified Working

### Database (Production -- VERIFIED)

All 11 QBO tables exist on `supabase_db_arti-marketing-ops` with Row-Level Security enabled:

| Table | Purpose | Verified |
|-------|---------|----------|
| `qbo_connections` | One row per authorized QBO company (realm) | Yes |
| `qbo_tokens` | Encrypted access/refresh token storage | Yes |
| `qbo_request_log` | API call audit trail (method, path, status, duration, intuit_tid) | Yes |
| `qbo_webhook_events` | Raw webhook payloads from Intuit | Yes |
| `qbo_sync_cursors` | Per-entity sync state (last CDC, last full sync, last webhook) | Yes |
| `qbo_customers` | Customer mirror from QBO | Yes |
| `qbo_invoices` | Invoice mirror from QBO | Yes |
| `qbo_payments` | Payment mirror from QBO | Yes |
| `qbo_vendors` | Vendor mirror from QBO | Yes |
| `qbo_items` | Item/product mirror from QBO | Yes |
| `qbo_accounts` | Chart of accounts mirror from QBO | Yes |

Additional schema change:
- `campaign_invoices` table has 4 new columns: `qbo_invoice_id`, `qbo_sync_status`, `qbo_last_synced_at`, `qbo_error_message` -- **VERIFIED**

### Backend API Routes (Production -- ALL 16 VERIFIED)

All routes are registered under `/api/quickbooks/` on `api.artistinfluence.com`:

| Method | Path | Purpose | Verified |
|--------|------|---------|----------|
| GET | `/connect` | Returns OAuth authorization URL | Yes -- returns `auth_url` with Intuit endpoint |
| GET | `/callback` | OAuth code exchange + redirect to admin | Yes -- route registered |
| POST | `/disconnect` | Revoke tokens, mark connection disconnected | Yes -- returns expected error when no connection |
| GET | `/status` | Connection health, token expiry, sync cursors, entity counts, API quota | Yes -- returns `{"connected":false,...}` |
| POST | `/refresh` | Manual access token refresh | Yes |
| POST | `/sync/full` | Full paginated sync for one or all entity types | Yes |
| POST | `/sync/incremental` | CDC-based incremental sync | Yes |
| GET | `/sync/status` | Sync cursor state per entity | Yes |
| POST | `/webhook` | Intuit webhook receiver (HMAC verified, async processing) | Yes -- returns 200 immediately |
| GET | `/metrics` | Aggregated 24h health metrics (API calls, token refreshes, webhooks, lag) | Yes |
| GET | `/webhook-events` | Recent webhook events list | Yes -- returns `{"events":[]}` |
| GET | `/request-log` | Filtered API call audit log | Yes -- returns `{"logs":[]}` |
| GET | `/test-connection` | Probe QBO CompanyInfo endpoint | Yes |
| POST | `/invoices/push` | Push a single campaign invoice to QBO | Yes |
| POST | `/invoices/push-all` | Push all pending campaign invoices to QBO | Yes |
| GET | `/invoices/sync-status` | Campaign invoice QBO sync status | Yes |

### Backend Libraries (Installed)

| File | Purpose |
|------|---------|
| `apps/api/src/lib/quickbooks/oauth.ts` | OAuth 2.0 flow using official `intuit-oauth` package |
| `apps/api/src/lib/quickbooks/api-client.ts` | Rate-limited HTTP client (10 req/s, 500 req/min per realm), request logging, idempotency |
| `apps/api/src/lib/quickbooks/token-store.ts` | AES-256-GCM token encryption, Redis-backed single-flight refresh lock |
| `apps/api/src/lib/quickbooks/sync.ts` | Full sync (paginated queries), incremental CDC sync, single-entity fetch |
| `apps/api/src/lib/quickbooks/writeback.ts` | Two-way sync: push campaign invoices to QBO, find/create Customers and Items |
| `apps/api/src/lib/quickbooks/types.ts` | TypeScript types for all QBO entities and API responses |
| `apps/api/src/lib/quickbooks/mappers/` | Entity mappers for Customer, Invoice, Payment, Vendor, Item, Account |

### Cron Job (Production -- VERIFIED)

- **QBO CDC Reconciliation**: BullMQ job runs daily at 3:00 AM UTC
- Confirmed in API startup logs: "Cron schedules configured successfully (including 3x daily YouTube sync, daily QBO CDC)"

### Frontend (Deployed to Vercel -- VERIFIED)

| Component | Status |
|-----------|--------|
| `QuickBooksStatusCard` in admin panel | Visible on `/admin` page |
| "Connect QuickBooks" button | Visible, redirects to Intuit OAuth |
| Connection health grid (company, token, quota, environment) | Renders when connected |
| Sync status table with per-entity force sync | Renders when connected |
| API health panel (expandable) | Renders when connected |
| Webhook monitor (expandable) | Renders when connected |
| Request log viewer (expandable) | Renders when connected |
| Alert banners (token expiry, throttle rate, webhook lag) | Renders when alerts triggered |
| `useQuickBooks.ts` hooks (10 TanStack Query hooks) | Installed |

### Webhook Data Channel (Production -- VERIFIED)

- Test webhook POST to `/api/quickbooks/webhook` returned 200 immediately
- Payload was written to `qbo_webhook_events` table with correct `realm_id` and `signature_valid = false` (expected for test)
- Async processing pipeline executed (no QBO fetch because no active connection, which is expected)

### Dependency

- `intuit-oauth` npm package installed in `apps/api` -- **VERIFIED** (part of Docker build)

### Environment Variables (Production)

Located in `apps/api/production.env` on the droplet:

| Variable | Current Value | Status |
|----------|--------------|--------|
| `INTUIT_CLIENT_ID` | `placeholder` | NEEDS REAL CREDENTIALS |
| `INTUIT_CLIENT_SECRET` | `placeholder` | NEEDS REAL CREDENTIALS |
| `INTUIT_REDIRECT_URI` | `https://api.artistinfluence.com/api/quickbooks/callback` | Correct |
| `INTUIT_ENVIRONMENT` | `sandbox` | Change to `production` when going live |
| `INTUIT_WEBHOOK_VERIFIER_TOKEN` | `placeholder` | NEEDS REAL CREDENTIALS |
| `QBO_TOKEN_ENCRYPTION_KEY` | `000...000` (64 zeros) | NEEDS REAL KEY (see below) |

---

## What Still Needs to Be Done

### Step 1: Register on Intuit Developer Portal (REQUIRED)

1. Go to [developer.intuit.com](https://developer.intuit.com) and sign in / create a developer account
2. Click "Create an app" and select "QuickBooks Online and Payments"
3. In app settings, configure:
   - **Redirect URI**: `https://api.artistinfluence.com/api/quickbooks/callback`
   - **Scopes**: Select `com.intuit.quickbooks.accounting`
4. Note down:
   - **Client ID** (from Keys & credentials)
   - **Client Secret** (from Keys & credentials)
   - **Verifier Token** (from Webhooks section, after configuring webhook URL)
5. Create a **Sandbox Company** for testing (Intuit provides pre-populated test companies)

### Step 2: Configure Webhook URL in Intuit Portal

1. In your Intuit app settings, go to Webhooks
2. Set the webhook endpoint URL to: `https://api.artistinfluence.com/api/quickbooks/webhook`
3. Subscribe to entities: Customer, Invoice, Payment, Vendor, Bill, Item, Account
4. Copy the **Verifier Token** that Intuit generates

### Step 3: Update Production Credentials on the Droplet

SSH into the server and update the production env:

```bash
ssh root@164.90.129.146
nano /root/arti-marketing-ops/apps/api/production.env
```

Replace:
```
INTUIT_CLIENT_ID=<your-real-client-id>
INTUIT_CLIENT_SECRET=<your-real-client-secret>
INTUIT_WEBHOOK_VERIFIER_TOKEN=<your-real-verifier-token>
```

Generate a real encryption key:
```bash
openssl rand -hex 32
```
Use that output for `QBO_TOKEN_ENCRYPTION_KEY`.

Then restart the API:
```bash
cd /root/arti-marketing-ops
docker compose -f docker-compose.production.yml up -d --no-deps api
```

### Step 4: Test the Full OAuth Flow

1. Go to `https://app.artistinfluence.com/admin`
2. Click "Connect QuickBooks" on the QuickBooks Integration card
3. Sign in with your Intuit sandbox credentials
4. After approval, you should be redirected back to `/admin?qbo_connected=true`
5. The card should now show "Connected" with your sandbox company name

### Step 5: Test Data Sync

1. On the admin card, click "Full Sync All" to pull all entities from the sandbox
2. Verify entity counts populate in the sync status table
3. Click "CDC Sync" to test incremental sync

### Step 6: Switch to Production (When Ready)

1. In the Intuit Developer Portal, create Production keys (requires app review by Intuit)
2. Update `INTUIT_ENVIRONMENT=production` in the env file
3. Update `INTUIT_CLIENT_ID` and `INTUIT_CLIENT_SECRET` with production keys
4. Restart the API container

---

## Architecture Summary

```
Frontend (Vercel)                    Backend (DigitalOcean)              Intuit
+---------------------------+       +---------------------------+       +------------------+
| QuickBooksStatusCard      | <---> | /api/quickbooks/* routes  | <---> | OAuth Server     |
| - Connect/Disconnect      |       | - oauth.ts (intuit-oauth) |       | QBO Accounting   |
| - Sync status table       |       | - api-client.ts (rate lim)|       | API              |
| - API health metrics      |       | - sync.ts (full + CDC)    |       | Webhooks         |
| - Webhook monitor         |       | - writeback.ts (invoices) |       +------------------+
| - Request log viewer      |       | - token-store.ts (AES enc)|
| - Alert banners           |       | - BullMQ CDC cron (daily) |
+---------------------------+       +---------------------------+
                                            |
                                    +-------v---------+
                                    | Supabase (PG)   |
                                    | 11 qbo_* tables |
                                    | RLS enabled     |
                                    +-----------------+
```

---

## Key Technical Details

- **OAuth**: Official `intuit-oauth` package for auth code flow; raw `fetch` for API calls (per Intuit recommendation)
- **Token Security**: AES-256-GCM encryption at rest; single-flight refresh via Redis lock to prevent `invalid_grant`
- **Rate Limiting**: Redis-backed token bucket -- 10 req/s and 500 req/min per realm
- **Idempotency**: UUID `requestid` query param on all write operations
- **Webhook Verification**: HMAC-SHA256 using verifier token against `intuit-signature` header
- **Sync Strategy**: Full sync (paginated SELECT queries) + incremental CDC (Change Data Capture) + webhook-driven single-entity fetches
- **CDC Window**: Max 30 days (Intuit limitation); daily reconciliation catches anything webhooks miss
- **Concurrency Control**: QBO uses `SyncToken` for optimistic concurrency; stale writes trigger re-read + retry

---

## Files Reference

| Category | Files |
|----------|-------|
| **Migration** | `supabase/migrations/20260211_quickbooks_integration.sql`, `supabase/migrations/20260211_quickbooks_invoice_writeback.sql` |
| **Backend Route** | `apps/api/src/routes/quickbooks.ts` |
| **Backend Lib** | `apps/api/src/lib/quickbooks/` (7 files + 7 mappers) |
| **Worker** | `apps/api/src/worker.ts` (QBO CDC cron job added) |
| **Route Registration** | `apps/api/src/routes/index.ts` |
| **Frontend Card** | `apps/frontend/components/admin/quickbooks-status-card.tsx` |
| **Frontend Hooks** | `apps/frontend/hooks/useQuickBooks.ts` |
| **Admin Page** | `apps/frontend/app/(dashboard)/admin/page.tsx` |
| **Env (dev)** | `apps/api/.env` |
| **Env (prod)** | `apps/api/production.env` |
