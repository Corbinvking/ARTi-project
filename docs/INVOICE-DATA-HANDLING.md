# Invoice Data Handling — ARTi Platform Standard

> Single source of truth for how invoices are created, edited, synced, paid, and
> tracked across every service on the platform. All current and future services
> MUST follow this document.

---

## 1. Core Principle

**Every campaign is 1:1 with an invoice.** An invoice represents the client's
obligation to pay for one campaign (which may span multiple services). Tracking
that invoice from creation through payment is the financial backbone of the
platform.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        INVOICE LIFECYCLE                                     │
│                                                                              │
│   CREATED ──► SENT ──► VIEWED ──► PAID ──► SYNCED TO QBO                    │
│     │                    │                      │                             │
│     │            (overdue if past               │                             │
│     │             due_date)                     ▼                             │
│     │                              ┌─────────────────────┐                   │
│     │                              │  Cascade triggered:  │                   │
│     │                              │  • Campaign → READY  │                   │
│     │                              │  • Commission unlock │                   │
│     │                              │  • Vendor payout ok  │                   │
│     │                              └─────────────────────┘                   │
│     │                                                                        │
│     └──► VOIDED (cancelled/refunded — never deleted)                         │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Tables

### 2.1 `campaign_invoices` — Platform source of truth

This is the **single canonical record** for every invoice on the platform.
All services reference this table. QuickBooks mirrors it; it does not replace it.

| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID PK | Internal identifier |
| `org_id` | UUID FK → orgs | Tenant isolation |
| `campaign_id` | UUID FK (nullable) | Legacy link to stream_strategist_campaigns |
| `invoice_number` | TEXT UNIQUE | Human-readable number (e.g. `INV-2026-0042`) |
| `amount` | DECIMAL(10,2) | Total invoice amount |
| `status` | ENUM | `pending` · `sent` · `paid` · `overdue` · `voided` |
| `issued_date` | DATE | When the invoice was created |
| `due_date` | DATE | Payment deadline |
| `paid_date` | DATE | When payment was received (null until paid) |
| `payment_method` | TEXT | e.g. `credit_card`, `ach`, `check`, `wire` |
| `client_name` | TEXT | Client display name |
| `client_email` | TEXT | Client contact email |
| `services_selected` | TEXT[] | Which services this invoice covers |
| `intake_payload` | JSONB | Snapshot of the intake form data |
| `notes` | TEXT | Internal notes |
| `qbo_invoice_id` | TEXT | QuickBooks invoice ID (null until synced) |
| `qbo_sync_status` | TEXT | `not_synced` · `pending` · `synced` · `error` |
| `qbo_last_synced_at` | TIMESTAMPTZ | Last successful sync to QBO |
| `qbo_error_message` | TEXT | Last sync error (null on success) |
| `created_at` | TIMESTAMPTZ | Row creation time |
| `updated_at` | TIMESTAMPTZ | Last modification time |

### 2.2 `qbo_invoices` — QuickBooks mirror (read-only sync)

Populated by sync from QuickBooks. Used to detect payments (balance = 0).
Linked back to `campaign_invoices` via `campaign_invoice_id`.

### 2.3 Per-service campaign tables

Each service table has two invoice columns:

| Column | Type | Purpose |
|--------|------|---------|
| `source_invoice_id` | UUID FK → campaign_invoices | Links campaign to its invoice |
| `invoice_status` | TEXT | Denormalized copy of the invoice status |

These columns exist on: `youtube_campaigns`, `soundcloud_submissions`,
`soundcloud_campaigns`, `instagram_campaigns`, `campaigns`,
`campaign_submissions`, `spotify_campaigns` (via `campaign_groups`).

---

## 3. Invoice Statuses

Every invoice has exactly one status at any time. Status transitions are
one-directional (except for corrections noted below).

| Status | Meaning | Allowed transitions |
|--------|---------|---------------------|
| `pending` | Invoice created, not yet sent to client | → `sent`, → `voided` |
| `sent` | Invoice delivered to client | → `paid`, → `overdue`, → `voided` |
| `overdue` | Past `due_date` and still unpaid | → `paid`, → `voided` |
| `paid` | Payment received and verified | → `voided` (refund only) |
| `voided` | Cancelled or refunded — terminal state | (none — final) |

**Rules:**
- Status never goes backward (e.g. `paid` → `sent` is illegal).
- `overdue` is derived: any invoice with status `sent` past its `due_date` is
  overdue. The status can be set explicitly or computed at query time.
- `voided` is the only way to "delete" an invoice. We never hard-delete invoice
  records for audit trail integrity.
- `paid` requires a `paid_date`. Setting status to `paid` without `paid_date`
  is invalid.

---

## 4. Standard Operations

### 4.1 Create Invoice

**Trigger:** Campaign intake form submission, or manual creation.

**Steps:**
1. Generate `invoice_number` (format: `INV-{YYYY}-{sequential 4-digit}`).
2. INSERT into `campaign_invoices` with:
   - `status: 'pending'`
   - `issued_date: today`
   - `due_date: today + 30 days` (default, overridable)
   - `qbo_sync_status: 'not_synced'`
   - `client_name`, `client_email`, `amount`, `services_selected`
3. Create per-service campaign records with:
   - `source_invoice_id: campaign_invoices.id`
   - `invoice_status: 'pending'`
4. If QBO is connected, queue push to QuickBooks (async, non-blocking).

**Data guarantee:** The `campaign_invoices` INSERT happens first, before any
service campaign creation. If a service campaign fails, the invoice still
exists.

```
campaign_invoices INSERT (always first)
    ├── spotify campaign INSERT (source_invoice_id = invoice.id)
    ├── youtube campaign INSERT (source_invoice_id = invoice.id)
    ├── soundcloud campaign INSERT (source_invoice_id = invoice.id)
    └── instagram campaign INSERT (source_invoice_id = invoice.id)
```

### 4.2 Edit Invoice

**Allowed fields:** `amount`, `due_date`, `notes`, `client_name`,
`client_email`, `services_selected`.

**Not allowed to edit:** `invoice_number`, `issued_date`, `paid_date`,
`status` (use dedicated status transitions instead).

**Steps:**
1. UPDATE `campaign_invoices` with new values.
2. Set `updated_at: now()`.
3. If `qbo_sync_status = 'synced'`, set `qbo_sync_status: 'pending'` to
   trigger re-sync on next push cycle.

**Rule:** Invoices with `status: 'paid'` or `status: 'voided'` cannot be
edited. Return an error.

### 4.3 Send Invoice

**Trigger:** Manual action by admin/sales user.

**Steps:**
1. Verify `status = 'pending'`.
2. UPDATE `campaign_invoices` SET `status: 'sent'`.
3. UPDATE all linked service campaigns SET `invoice_status: 'sent'`.

### 4.4 Invoice Paid

**Trigger:** Automatic (QBO payment detected) or manual marking.

**Automatic flow (preferred):**
1. QBO sync detects `qbo_invoices.balance = 0`.
2. `processInvoicePayment()` fires:
   a. UPDATE `campaign_invoices` SET `status: 'paid'`, `paid_date: now`.
   b. UPDATE linked `campaign_groups`:
      - `invoice_status: 'Paid'`
      - `status: 'Ready'` (if was `'Draft'`)
      - `commission_eligible: true`
      - `vendor_payout_eligible: true`
      - `payment_verified_at: now`
      - `payment_verified_source: 'qbo_webhook' | 'qbo_cdc' | 'qbo_full_sync'`
   c. UPDATE all linked service campaigns SET `invoice_status: 'paid'`.
   d. UPDATE vendor payment allocations SET `payment_status: 'eligible'`.
3. Log to `qbo_automation_log`.

**Manual flow (fallback when QBO is disconnected):**
1. Admin sets invoice status to `paid` with `paid_date`.
2. Same cascade as above, with `payment_verified_source: 'manual'`.

**Cascade summary:**

```
campaign_invoices.status = 'paid'
    ├── campaign_groups.invoice_status = 'Paid'
    ├── campaign_groups.commission_eligible = true
    ├── campaign_groups.vendor_payout_eligible = true
    ├── youtube_campaigns.invoice_status = 'paid'
    ├── soundcloud_submissions.invoice_status = 'paid'
    ├── instagram_campaigns.invoice_status = 'paid'
    ├── campaigns.invoice_status = 'paid'
    ├── campaign_submissions.invoice_status = 'paid'
    └── campaign_allocations_performance.payment_status = 'eligible'
```

### 4.5 Invoice Overdue

**Trigger:** Automatic check or query-time derivation.

**Steps:**
1. Any invoice where `status = 'sent'` and `due_date < today` is overdue.
2. Can be set explicitly via UPDATE `campaign_invoices` SET
   `status: 'overdue'`.
3. UPDATE all linked service campaigns SET `invoice_status: 'overdue'`.
4. Triggers alert in `useAlertsFeed` on the dashboard.

### 4.6 Void Invoice

**Trigger:** Manual action by admin. Used for cancellations and refunds.

**Steps:**
1. UPDATE `campaign_invoices` SET `status: 'voided'`.
2. UPDATE all linked service campaigns SET `invoice_status: 'voided'`.
3. If `qbo_sync_status = 'synced'`, void the QBO invoice too (future).
4. Reverse any commission/payout eligibility on linked `campaign_groups`.

**Rule:** Voiding a `paid` invoice should include a refund reason in `notes`.

---

## 5. QuickBooks Sync

### 5.1 Push flow (Platform → QBO)

```
campaign_invoices (status: any, qbo_sync_status: 'not_synced' | 'error')
    │
    ▼  pushInvoiceToQBO()
    │
    ├── Find/create QBO Customer from client_name / client_email
    ├── Find/create QBO Item per service in services_selected
    ├── POST /invoice to QBO API
    │
    ├── On success:
    │     campaign_invoices.qbo_invoice_id = QBO ID
    │     campaign_invoices.qbo_sync_status = 'synced'
    │     campaign_invoices.qbo_last_synced_at = now
    │     qbo_invoices row upserted (mirror)
    │
    └── On failure:
          campaign_invoices.qbo_sync_status = 'error'
          campaign_invoices.qbo_error_message = error text
          (retried every 15 min by qbo-invoice-push-retry job)
```

### 5.2 Pull flow (QBO → Platform)

```
QBO API (CDC sync every 15 min, or webhook)
    │
    ▼  qbo_invoices upserted
    │
    ▼  processInvoicePayment() checks balance
    │
    └── If balance = 0 → cascade (Section 4.4)
```

### 5.3 Disconnection resilience

| Scenario | What happens | Data loss? |
|----------|-------------|------------|
| Invoice created while QBO disconnected | Saved in `campaign_invoices` with `qbo_sync_status: 'not_synced'` | No |
| Invoice edited while QBO disconnected | Updated locally, `qbo_sync_status: 'pending'` | No |
| Invoice paid while QBO disconnected (manual) | `paid` cascade runs locally from platform data | No |
| QBO reconnects | `qbo-invoice-push-retry` job pushes all pending/error invoices within 15 min | No |
| QBO reconnects (user clicks Connect) | `pushAllPendingInvoices` runs immediately after OAuth callback | No |

---

## 6. Service Integration Contract

**Every new service added to the platform MUST:**

1. **Have these columns on its campaign table:**
   ```sql
   source_invoice_id UUID REFERENCES campaign_invoices(id),
   invoice_status TEXT DEFAULT 'pending'
   ```

2. **Set `source_invoice_id` at campaign creation** from the campaign intake
   form's `campaign_invoices.id`.

3. **Never set `invoice_status` directly.** Only the payment engine and
   invoice status transition functions should update this column. The
   per-service table value is a denormalized copy of
   `campaign_invoices.status`.

4. **Be registered in `PLATFORM_TABLES`** in
   `apps/api/src/lib/quickbooks/payment-engine.ts` so the paid cascade
   reaches it:
   ```typescript
   const PLATFORM_TABLES = [
     'spotify_campaigns',
     'youtube_campaigns',
     'instagram_campaigns',
     'soundcloud_submissions',
     'campaign_submissions',
     'campaigns',
     'your_new_service_campaigns',  // ← add here
   ] as const;
   ```

5. **Display invoice status using the standard badge mapping:**

   | Status | Color | Label |
   |--------|-------|-------|
   | `pending` | Gray | Pending |
   | `sent` | Blue | Sent |
   | `overdue` | Red | Overdue |
   | `paid` | Green | Paid |
   | `voided` | Dark gray | Voided |

---

## 7. Idempotency & Safety

| Rule | Implementation |
|------|---------------|
| Payment detection is idempotent | `processInvoicePayment()` checks `paid_date` before cascading |
| Auto-matching is idempotent | Matches only invoices where `campaign_invoice_id IS NULL` |
| QBO push is idempotent | `pushInvoiceToQBO()` returns existing `qbo_invoice_id` if already synced |
| No hard deletes | Invoices are voided, never deleted |
| Audit trail | All payment cascades logged to `qbo_automation_log` |
| Status transitions are one-way | `pending → sent → paid` (never backward) |

---

## 8. API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/quickbooks/invoices/push` | Push single invoice to QBO |
| `POST` | `/api/quickbooks/invoices/push-all` | Push all pending invoices |
| `GET` | `/api/quickbooks/invoices/sync-status` | List invoices with QBO sync status |
| `POST` | `/api/quickbooks/invoices/match` | Manually link QBO ↔ campaign invoice |
| `POST` | `/api/quickbooks/invoices/auto-match` | Batch auto-match by doc_number |
| `GET` | `/api/quickbooks/financial-summary` | Aggregated financial metrics |
| `POST` | `/api/invoice-campaign/create` | Create campaign from external invoice (YouTube) |
| `POST` | `/api/invoice-campaign/soundcloud/create` | Create campaign from external invoice (SoundCloud) |
| `PATCH` | `/api/invoice-campaign/:id/invoice-status` | Update campaign invoice status |

---

## 9. Data Flow Diagram

```
                  ┌───────────────────┐
                  │  Campaign Intake  │
                  │  (any service)    │
                  └────────┬──────────┘
                           │
                  ┌────────▼──────────┐
                  │ campaign_invoices │  ← Source of truth
                  │ status: pending   │
                  │ qbo_sync: not_set │
                  └────────┬──────────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
     ┌────────▼───┐ ┌──────▼──────┐ ┌──▼──────────┐
     │  YouTube   │ │ SoundCloud  │ │  Spotify     │
     │  campaign  │ │ submission  │ │  group       │
     │  inv: pend │ │ inv: pend   │ │  inv: pend   │  ... (any service)
     └────────────┘ └─────────────┘ └──────────────┘
                           │
                  ┌────────▼──────────┐
                  │  Push to QBO      │  (when connected)
                  │  qbo_sync: synced │
                  └────────┬──────────┘
                           │
                  ┌────────▼──────────┐
                  │  QBO detects      │
                  │  payment          │
                  │  (balance = 0)    │
                  └────────┬──────────┘
                           │
                  ┌────────▼──────────┐
                  │  Payment cascade  │
                  │  status → paid    │
                  │  commission ✓     │
                  │  vendor payout ✓  │
                  └───────────────────┘
```

---

## 10. Checklist for New Service Integration

- [ ] Add `source_invoice_id UUID REFERENCES campaign_invoices(id)` to table
- [ ] Add `invoice_status TEXT DEFAULT 'pending'` to table
- [ ] Campaign intake sets `source_invoice_id` from `campaign_invoices.id`
- [ ] Register table name in `PLATFORM_TABLES` in `payment-engine.ts`
- [ ] Confirm `updatePlatformCampaigns()` can update `invoice_status` on the table
- [ ] Display invoice status badge using standard color mapping
- [ ] Never write to `invoice_status` from service-specific code
- [ ] Test: create invoice → push to QBO → mark paid → verify cascade reaches new table
