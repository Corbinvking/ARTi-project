# Problem Spec: SoundCloud Influence Planner Channel Status Data Availability

**App**: SoundCloud  
**Type**: Investigation / Research  
**Created**: 2025-03-06  
**Status**: Draft

---

## Problem Statement

We need to determine whether the Influence Planner platform exposes **channel status tags** (linked, unlinked, pending, invalid) via their Partner API, and if so, how ARTi can consume and use this data to improve repost network management.

Operators and admins see these statuses in the Influence Planner UI when managing network members. If the same data is available via the API, we can:

- Surface channel status in ARTi’s SoundCloud dashboard
- Filter or highlight channels by status (e.g., exclude invalid/unlinked from suggestions)
- Sync status into our own data model for reporting and workflows
- Reduce manual checks in the Influence Planner UI

---

## Status Tags of Interest

| Status | Description (from Influence Planner) |
|--------|-------------------------------------|
| **Linked** | The user is linked to your account |
| **Unlinked** | The user has unlinked their account from your network |
| **Pending** | The user has been invited to join your network, but has not yet accepted |
| **Invalid** | The user has an invalid connection to the platform, and cannot be used |

Additional statuses documented in the API (for completeness):

- **PENDING_APPROVAL** — User requested to join, awaiting your approval
- **DECLINED** — User declined the invitation

---

## Investigation Goals

1. **API availability**  
   Confirm that the Influence Planner Partner API returns channel/member status for each network member.

2. **Field location and format**  
   Identify the exact endpoint(s), response field(s), and value format (e.g., `LINKED`, `linked`, etc.).

3. **Current ARTi usage**  
   Determine where ARTi already calls the Influence Planner API and whether status is being read or ignored.

4. **Gaps and opportunities**  
   Identify where status data could be stored, displayed, or used in ARTi (e.g., operator UI, channel suggestions, member sync).

---

## Known Context (Pre-Investigation)

### Influence Planner API

- **Base URL**: `https://api.influenceplanner.com/partner/v1/`
- **Relevant endpoint**: `GET /network/members`
- **Auth**: Basic auth with `username:API_KEY` (Base64)
- **Documentation**: `influenceplanner.md` in repo root

### Network Member Object (from API docs)

The `/network/members` response includes a `status` field per member:

```json
{
  "membership_id": 61400,
  "status": "LINKED",
  "user_id": "SOUNDCLOUD-USER-1234",
  "name": "John Doe",
  "image_url": "...",
  "profile_url": "...",
  "followers": 9800,
  "updated_at": "2025-07-01T22:24:44Z"
}
```

Documented status values: `LINKED`, `INVALID`, `PENDING`, `PENDING_APPROVAL`, `UNLINKED`, `DECLINED`.

### Current ARTi Usage

- **`/api/soundcloud/influenceplanner/suggest-channels`** — Fetches `/network/members` and filters to `status === "LINKED"` for channel suggestions. Non-LINKED members are excluded from suggestions but their status is not persisted or surfaced.
- **`influenceplannerClient.ts`** — Shared client for Influence Planner API calls.
- **`soundcloud_repost_channel_genres`** — Stores `ip_user_id` (maps to `user_id` from API) for genre tagging; no status column.

### Database

- **`soundcloud_members`** — Has `influence_planner_status` in a disabled migration (`0048_soundcloud_ip_status_tracking.sql.disabled`), with values like `connected`, `disconnected`, `invited`, `hasnt_logged_in`, `uninterested`. This is **member login/activity status**, not the same as the API’s channel linkage status.

---

## Investigation Tasks

- [ ] **T1** — Call `GET /network/members` with real credentials and capture a sample response; verify `status` is present and matches documented values.
- [ ] **T2** — Trace all ARTi code paths that call Influence Planner; list which endpoints are used and whether `status` is read, filtered, or ignored.
- [ ] **T3** — Map `user_id` / `membership_id` from the API to ARTi’s `soundcloud_members` and `soundcloud_repost_channel_genres` to assess how we could join status data.
- [ ] **T4** — Propose where to surface status in the UI (e.g., channel picker, member list, genre tagging) and whether we need a new DB column or can derive status on demand.
- [ ] **T5** — Document findings and recommendations in this spec.

---

## Success Criteria

- Clear answer: **Yes** or **No** — channel status is available via the API.
- If yes: documented endpoint, field, and format; recommended integration approach.
- If no: documented alternative (e.g., manual sync, Influence Planner support request).

---

## Out of Scope

- Changing Influence Planner’s API or behavior.
- Implementing new UI or storage (this spec is investigation only).

---

## References

- `influenceplanner.md` — Influence Planner Partner API docs
- `influence-planner/docs.md` — Duplicate docs
- `apps/frontend/app/api/soundcloud/influenceplanner/suggest-channels/route.ts` — Current usage
- `supabase/migrations/0048_soundcloud_ip_status_tracking.sql.disabled` — Member login status (different concept)
