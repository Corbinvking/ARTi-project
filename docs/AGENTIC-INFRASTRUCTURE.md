# ARTi Agentic Infrastructure

> A GitHub-native system for automated issue routing, parallel agent workflows, and per-app bug/feature management across the ARTi platform.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Setup Guide](#setup-guide)
4. [Label Taxonomy](#label-taxonomy)
5. [Issue Templates](#issue-templates)
6. [GitHub Projects](#github-projects)
7. [Pipeline Workflows](#pipeline-workflows)
8. [Agent Integration](#agent-integration)
9. [Manual Operations](#manual-operations)
10. [Troubleshooting](#troubleshooting)

---

## Overview

The ARTi platform has 7 frontend app modules, a backend API, and multiple data scrapers. The agentic infrastructure enables:

- **Per-app issue isolation** — bugs and features are routed to domain-specific projects
- **Parallel agent workflows** — multiple agents can work on different app domains simultaneously without conflicts
- **Automated pipeline** — from issue creation to PR merge, with human review gates
- **Scoped context** — agents only see files relevant to their assigned app domain

### The Pipeline at a Glance

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐     ┌──────────────┐     ┌────────────┐
│  Issue       │ ──→ │  Auto-Triage  │ ──→ │  Agent          │ ──→ │  Agent       │ ──→ │  PR Merge  │
│  Created     │     │  (labels +    │     │  Dispatcher     │     │  Worker      │     │  + Cleanup │
│              │     │   routing)    │     │  (branch +      │     │  (fix + PR)  │     │            │
└─────────────┘     └──────────────┘     │   dispatch)     │     └──────────────┘     └────────────┘
                                          └─────────────────┘
                                                  │
                                    ┌─────────────┼─────────────┐
                                    │             │             │
                              ┌─────▼───┐   ┌────▼────┐   ┌───▼──────┐
                              │ Spotify │   │ Insta   │   │ YouTube  │  ... (parallel)
                              │ Worker  │   │ Worker  │   │ Worker   │
                              └─────────┘   └─────────┘   └──────────┘
```

---

## Architecture

### App Domain Mapping

| Domain | Label | Scope Directories | GitHub Project |
|--------|-------|-------------------|----------------|
| Spotify | `app:spotify` | `apps/frontend/app/(dashboard)/spotify/` | ARTi - Spotify Module |
| Instagram | `app:instagram` | `apps/frontend/app/(dashboard)/instagram/` | ARTi - Instagram Module |
| YouTube | `app:youtube` | `apps/frontend/app/(dashboard)/youtube/` | ARTi - YouTube Module |
| SoundCloud | `app:soundcloud` | `apps/frontend/app/(dashboard)/soundcloud/` | ARTi - SoundCloud Module |
| Dashboard | `app:dashboard` | `apps/frontend/app/(dashboard)/dashboard/` | ARTi - Core Platform |
| Operator | `app:operator` | `apps/frontend/app/(dashboard)/operator/` | ARTi - Core Platform |
| Admin | `app:admin` | `apps/frontend/app/(dashboard)/admin/` | ARTi - Core Platform |
| API | `app:api` | `apps/api/` | ARTi - API & Backend |
| Scrapers | `app:scraper` | `spotify_scraper/`, `instagram_scraper/`, `roster_scraper/` | ARTi - Scrapers & Data |
| Shared | `app:shared` | `apps/frontend/components/`, `hooks/`, `lib/` | ARTi - Core Platform |
| Infra | `app:infra` | `.github/`, `docker-compose.yml` | ARTi - Core Platform |
| Database | `app:database` | `supabase/` | ARTi - Scrapers & Data |

### Workflow Files

| File | Trigger | Purpose |
|------|---------|---------|
| `agent-triage.yml` | Issue opened | Parses templates, applies labels, posts triage summary |
| `agent-dispatcher.yml` | Issue labeled `agent:ready` | Creates branch, dispatches to per-app worker |
| `agent-worker.yml` | `repository_dispatch` | Checks out branch, runs agent, creates PR |
| `agent-pr-cleanup.yml` | Agent PR merged | Closes issue, deletes branch, posts summary |
| `agent-manual-dispatch.yml` | Manual trigger | Re-dispatch or force-dispatch any issue |

---

## Setup Guide

### Prerequisites

- [GitHub CLI (`gh`)](https://cli.github.com/) installed and authenticated
- Repository admin access to `Corbinvking/ARTi-project`

### Step 1: Create Labels

```bash
bash scripts/setup-github-labels.sh
```

This creates the full label taxonomy (~35 labels) across these groups:
- `app:*` — Route to app domain
- `type:*` — Issue classification
- `agent:*` — Pipeline state tracking
- `complexity:*` — Scope estimation
- `priority:*` — Urgency level
- `status:*` — Triage state

### Step 2: Create GitHub Projects

```bash
bash scripts/setup-github-projects.sh
```

Creates 7 per-domain GitHub Projects (v2) with custom fields:
- Agent Assignable (Yes / No / Needs Triage)
- App Domain (text)
- Agent Run ID (text for linking to workflow runs)

### Step 3: Push Workflows

```bash
git add .github/workflows/agent-*.yml
git add .github/ISSUE_TEMPLATE/
git commit -m "chore(infra): add agentic infrastructure workflows and templates"
git push origin main
```

### Step 4: Configure Project Automations (GitHub UI)

For each project, set up these built-in automations:
1. **Auto-add issues** — Filter by the project's `app:*` label
2. **Auto-set status** — New items → "Triage" column
3. **Auto-close** — When PR merges → "Done" column

### Step 5: Verify

1. Create a test issue using the Bug Report template
2. Select "Spotify" as the app
3. Mark it as "Agent Assignable: Yes"
4. Confirm:
   - Labels are auto-applied (`app:spotify`, `type:bug`, `agent:ready`)
   - Dispatcher creates a branch (`agent/fix/spotify/...`)
   - Worker runs and posts status to the issue

---

## Label Taxonomy

### App Domain Labels (`app:*`)

These are the primary routing mechanism. Every issue should have exactly one `app:*` label.

| Label | Color | Meaning |
|-------|-------|---------|
| `app:spotify` | 🟢 `#1DB954` | Spotify campaign management module |
| `app:instagram` | 🔴 `#E1306C` | Instagram creator campaigns module |
| `app:youtube` | 🔴 `#FF0000` | YouTube video campaigns module |
| `app:soundcloud` | 🟠 `#FF5500` | SoundCloud repost network module |
| `app:dashboard` | 🟣 `#6366F1` | Cross-platform dashboard module |
| `app:operator` | 🟣 `#8B5CF6` | Internal operator tools module |
| `app:admin` | ⚫ `#64748B` | Admin panel module |
| `app:api` | 🔵 `#0EA5E9` | Backend API (Fastify) |
| `app:scraper` | 🟣 `#A855F7` | Data scrapers |
| `app:shared` | 🔵 `#06B6D4` | Shared components, hooks, utilities |
| `app:infra` | ⚫ `#78716C` | Infrastructure, CI/CD, deployment |
| `app:database` | 🟡 `#F59E0B` | Supabase schema, migrations, RLS |

### Agent Pipeline Labels (`agent:*`)

These track where an issue is in the agent pipeline.

| Label | Meaning | Set By |
|-------|---------|--------|
| `agent:ready` | Triaged, ready for agent pickup | Human or auto-triage |
| `agent:in-progress` | Agent is actively working | Dispatcher workflow |
| `agent:pr-open` | Agent opened a PR | Worker workflow |
| `agent:needs-review` | Work complete, needs human review | Worker workflow |
| `agent:blocked` | Agent can't proceed | Agent or human |
| `agent:failed` | Agent attempted but failed | Worker workflow |
| `agent:skip` | Do not assign to agent | Human |

### Pipeline State Machine

```
                 ┌──────────┐
                 │  Opened  │
                 └────┬─────┘
                      │ (auto-triage)
                      ▼
              ┌───────────────┐
              │ status:triage │
              └───────┬───────┘
                      │ (human or auto)
                      ▼
              ┌───────────────┐     ┌──────────────┐
              │  agent:ready  │────→│  agent:skip  │ (manual only)
              └───────┬───────┘     └──────────────┘
                      │ (dispatcher)
                      ▼
           ┌──────────────────┐
           │ agent:in-progress│
           └────────┬─────────┘
                    │ (worker)
              ┌─────┴──────┐
              ▼            ▼
     ┌──────────────┐  ┌──────────────┐
     │ agent:pr-open│  │ agent:failed │
     └──────┬───────┘  └──────────────┘
            │ (merge)
            ▼
     ┌──────────────┐
     │    Closed    │
     └──────────────┘
```

---

## Issue Templates

Three issue templates are configured in `.github/ISSUE_TEMPLATE/`:

### Bug Report (`bug-report.yml`)
- **Auto-labels:** `type:bug`, `status:triage`
- **Fields:** App module (dropdown), description, reproduction steps, severity, agent assignability
- **Auto-triage adds:** `app:*`, `priority:*`, `agent:ready` (if applicable)

### Feature Request (`feature-request.yml`)
- **Auto-labels:** `type:feature`, `status:triage`
- **Fields:** App module, description, acceptance criteria, complexity, agent assignability
- **Auto-triage adds:** `app:*`, `complexity:*`, `agent:ready` (if applicable)

### Refactor / Tech Debt (`refactor.yml`)
- **Auto-labels:** `type:refactor`, `status:triage`
- **Fields:** App module, description, motivation, affected files, agent assignability

All templates require selecting an app module, which the triage workflow uses for automatic routing.

---

## GitHub Projects

Seven per-domain projects organize work across the platform:

| Project | Covers | Issues Routed By |
|---------|--------|-----------------|
| ARTi - Spotify Module | Playlist campaigns, vendors, stream strategist, ML | `app:spotify` |
| ARTi - Instagram Module | Creator campaigns, seedstorm, QA, workflow | `app:instagram` |
| ARTi - YouTube Module | Video campaigns, vidi health flow, vendor payments | `app:youtube` |
| ARTi - SoundCloud Module | Repost network, member portal, submissions | `app:soundcloud` |
| ARTi - Core Platform | Dashboard, Operator, Admin, Shared, Infra | `app:dashboard`, `app:operator`, `app:admin`, `app:shared`, `app:infra` |
| ARTi - API & Backend | Fastify API, routes, auth, queues | `app:api` |
| ARTi - Scrapers & Data | All scrapers, database migrations | `app:scraper`, `app:database` |

### Custom Fields

Each project has these custom fields:
- **Agent Assignable** (Single Select: Yes / No / Needs Triage)
- **App Domain** (Text: the specific `app:*` value)
- **Agent Run ID** (Text: links to the GitHub Actions run)

### Recommended Board Columns

Configure each project with these columns:
1. **Triage** — New issues land here
2. **Agent Ready** — Triaged and labeled `agent:ready`
3. **Agent Working** — Agent is in progress
4. **In Review** — PR open, awaiting human review
5. **Done** — Merged and closed

---

## Pipeline Workflows

### 1. Auto-Triage (`agent-triage.yml`)

**Trigger:** Issue opened

**What it does:**
1. Parses the issue body for template form responses
2. Maps the selected "App Module" dropdown to an `app:*` label
3. Maps severity to `priority:*` labels
4. Maps complexity to `complexity:*` labels
5. If the user selected "Agent Assignable: Yes", adds `agent:ready`
6. Posts a triage summary comment on the issue

**Example auto-applied labels for a Spotify bug marked agent-ready:**
- `type:bug` (from template)
- `status:triage` (from template)
- `app:spotify` (from triage workflow)
- `priority:high` (from triage workflow)
- `agent:ready` (from triage workflow)

### 2. Agent Dispatcher (`agent-dispatcher.yml`)

**Trigger:** Issue labeled `agent:ready`

**What it does:**
1. Reads the issue's `app:*` and `type:*` labels
2. Creates a working branch: `agent/{type}/{app}/{description}-{issue#}`
3. Swaps `agent:ready` → `agent:in-progress`
4. Posts a dispatch comment with branch link and scope info
5. Fires `repository_dispatch` event: `agent-work-{app}`

**Branch naming examples:**
- `agent/fix/spotify/playlist-count-wrong-123`
- `agent/feature/instagram/creator-search-filter-456`
- `agent/refactor/api/consolidate-auth-middleware-789`

**Scoped directories** — the dispatcher tells the worker which directories to focus on, preventing agents from wandering into unrelated code.

### 3. Agent Worker (`agent-worker.yml`)

**Trigger:** `repository_dispatch` (all `agent-work-*` event types)

**What it does:**
1. Checks out the agent's working branch
2. Gathers scoped context (file listing, recent git history)
3. **Agent Integration Point** — this is where your AI agent plugs in
4. If changes were made: runs linting, commits, pushes, creates PR
5. Updates issue labels to `agent:pr-open`
6. Posts completion comment linking to the PR

**Concurrency:** Uses `group: agent-{app}-{issue}` so multiple app agents can run in parallel, but the same issue won't have duplicate runs.

**The Agent Integration Point** is clearly marked in the workflow. See [Agent Integration](#agent-integration) for options.

### 4. PR Cleanup (`agent-pr-cleanup.yml`)

**Trigger:** Pull request closed (merged) with branch starting with `agent/`

**What it does:**
1. Extracts the linked issue number from the PR body
2. Closes the issue with state_reason "completed"
3. Removes all `agent:*` labels
4. Deletes the agent working branch
5. Posts a completion summary comment

### 5. Manual Dispatch (`agent-manual-dispatch.yml`)

**Trigger:** `workflow_dispatch` (manual, from Actions tab)

**Inputs:**
- `issue_number` — which issue to dispatch
- `app_domain` — optional override (auto-detects from labels if empty)

**Use cases:**
- Re-running a failed agent attempt
- Dispatching an issue that wasn't auto-triaged
- Testing the pipeline with a specific issue

---

## Agent Integration

The agent worker workflow has a clearly marked **"Agent Integration Point"** step. This is where you connect your AI coding agent.

### Option A: Cursor Agent (Recommended for ARTi)

If you're using Cursor as your primary agent, the workflow creates the branch and scoped context. You can:

1. Let the workflow create the branch automatically
2. Check out the branch locally: `git checkout agent/fix/spotify/...`
3. Open Cursor in that context
4. Use Cursor's agent mode with the scoped directory
5. Push changes — the PR will be created by the workflow

### Option B: Claude API / Anthropic

Replace the "Agent Integration Point" step with:

```yaml
- name: Run Claude Agent
  env:
    ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
  run: |
    # Call Claude API with scoped context
    # See: https://docs.anthropic.com/en/docs/agents
    python scripts/run-claude-agent.py \
      --issue "$ISSUE_NUMBER" \
      --scope "$SCOPE" \
      --branch "$BRANCH"
```

### Option C: OpenAI Codex / GPT

```yaml
- name: Run Codex Agent
  env:
    OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
  run: |
    npx codex --issue "$ISSUE_NUMBER" --scope "$SCOPE"
```

### Option D: Custom Agent Script

Create a script at `scripts/agent-runner.sh` that:
1. Reads `.agent-context.json` (written by the worker)
2. Collects the relevant source files from the scope directories
3. Calls your AI provider's API
4. Applies the suggested changes
5. The workflow handles committing and PR creation

### Context Available to Agents

The worker provides this context:
- **Branch:** Checked out and ready for commits
- **Scope directories:** Only the relevant app's files
- **Issue details:** Number, title, body
- **`.agent-context.json`:** Machine-readable context file
- **Git history:** Recent changes in the scope directories
- **`.cursorrules`:** Project-specific coding rules and database schema

---

## Manual Operations

### Dispatching an issue manually

```bash
# Via GitHub Actions UI
# Go to Actions → "Agent Manual Dispatch" → Run workflow
# Enter the issue number and optionally override the app domain

# Via CLI
gh workflow run agent-manual-dispatch.yml \
  -f issue_number=123 \
  -f app_domain=spotify
```

### Re-running a failed agent

1. Remove the `agent:failed` label from the issue
2. Add `agent:ready` label → dispatcher will re-trigger
3. Or use the manual dispatch workflow

### Skipping agent assignment

Add the `agent:skip` label to any issue to prevent agent assignment. The dispatcher ignores issues with this label.

### Canceling an in-progress agent

1. Remove the `agent:in-progress` label
2. Delete the agent branch: `git push origin --delete agent/fix/spotify/...`
3. The worker has a 30-minute timeout and will stop automatically

### Viewing agent activity

```bash
# List all agent branches
git branch -r | grep agent/

# List open agent PRs
gh pr list --label "agent:needs-review"

# List issues in agent pipeline
gh issue list --label "agent:in-progress"
gh issue list --label "agent:ready"
```

### Bulk operations

```bash
# Close all agent branches
git branch -r | grep 'agent/' | sed 's/origin\///' | xargs -I {} git push origin --delete {}

# Remove agent:ready from all issues (pause the pipeline)
gh issue list --label "agent:ready" --json number -q '.[].number' | \
  xargs -I {} gh issue edit {} --remove-label "agent:ready"
```

---

## Troubleshooting

### Issue not getting triaged

**Symptoms:** No labels applied, no triage comment

**Check:**
- Was the issue created using a template? (Free-form issues bypass triage)
- Is the `agent-triage.yml` workflow enabled? (Actions → Workflows)
- Check the workflow run log for errors

### Dispatcher not firing

**Symptoms:** Issue has `agent:ready` but no branch created

**Check:**
- Does the issue also have an `app:*` label? (Required)
- Is the `agent-dispatcher.yml` workflow enabled?
- Check for workflow run errors in the Actions tab

### Agent worker not running

**Symptoms:** Branch created, but no worker activity

**Check:**
- Verify the `repository_dispatch` event type matches: `agent-work-{app}`
- Check the `agent-worker.yml` `types` list includes the app domain
- Look for the workflow run in the Actions tab

### PR not created

**Symptoms:** Worker ran but no PR appeared

**Check:**
- Did the agent make any changes? (Check "has_changes" output)
- If no agent is integrated yet, this is expected — the worker posts a "ready" comment instead
- Check for merge conflicts with main

### Labels not updating

**Symptoms:** Labels stuck in wrong state

**Fix manually:**
```bash
gh issue edit 123 --remove-label "agent:in-progress" --add-label "agent:ready"
```

---

## File Reference

```
ARTi-project/
├── .github/
│   ├── ISSUE_TEMPLATE/
│   │   ├── config.yml              # Template chooser config
│   │   ├── bug-report.yml          # Bug report template
│   │   ├── feature-request.yml     # Feature request template
│   │   └── refactor.yml            # Refactor/tech debt template
│   └── workflows/
│       ├── agent-triage.yml        # Auto-label & route issues
│       ├── agent-dispatcher.yml    # Route to per-app workers
│       ├── agent-worker.yml        # Execute fixes & create PRs
│       ├── agent-pr-cleanup.yml    # Post-merge housekeeping
│       ├── agent-manual-dispatch.yml # Manual dispatch trigger
│       ├── ci.yml                  # Existing CI pipeline
│       ├── deploy-api.yml          # Existing API deployment
│       └── deploy-frontend.yml     # Existing frontend deployment
├── scripts/
│   ├── setup-github-labels.sh      # Create label taxonomy
│   └── setup-github-projects.sh    # Create GitHub Projects
└── docs/
    ├── AGENTIC-INFRASTRUCTURE.md   # This document
    ├── AGENT-QUICK-START.md        # Agent coding guide
    └── BRANCHING-STRATEGY.md       # Branch naming conventions
```

---

## Integration with Existing Workflows

The agentic infrastructure complements (does not replace) the existing CI/CD:

| Workflow | Trigger | Relationship |
|----------|---------|-------------|
| `ci.yml` | Push to main/develop, PRs | Runs on agent PRs too — linting and tests must pass |
| `deploy-frontend.yml` | Push to main (frontend changes) | Deploys after agent PRs are merged |
| `deploy-api.yml` | Push to main (API changes) | Deploys after agent PRs are merged |
| `agent-triage.yml` | Issue opened | New — entry point for agentic pipeline |
| `agent-dispatcher.yml` | Label `agent:ready` added | New — creates branches and routes |
| `agent-worker.yml` | Repository dispatch | New — does the actual work |
| `agent-pr-cleanup.yml` | Agent PR merged | New — closes issues, cleans branches |

The existing `ci.yml` workflow will automatically run on agent-created PRs, ensuring all agent changes pass linting and tests before merge.

---

## Design Decisions

### Why GitHub Projects v2 (not Jira/Linear)?

- Zero context switching — issues, PRs, branches, and actions all in one platform
- Native label-based routing — no webhook integrations needed
- Free for public repos, included in GitHub Teams
- `gh` CLI support for automation

### Why per-app concurrency groups?

The worker uses `concurrency: group: agent-{app}-{issue}` which means:
- Two agents CAN work on different apps simultaneously (parallel)
- Two agents CANNOT work on the same issue simultaneously (safe)
- Multiple issues in the same app CAN run in parallel (they have different issue numbers)

### Why repository_dispatch instead of direct calls?

- Enables per-app event filtering (`agent-work-spotify`, `agent-work-instagram`, etc.)
- Allows different timeout/resource configurations per app domain
- Future-proofs for app-specific pre/post processing

### Why a separate cleanup workflow?

- Decouples the PR lifecycle from the agent work
- Handles edge cases (manual merges, force-closes)
- Keeps the worker workflow focused on code changes

---

## Version History

| Date | Author | Changes |
|------|--------|---------|
| 2026-02-26 | Cloud Agent | Initial agentic infrastructure setup |

---

## Related Documentation

- [Agent Quick Start](AGENT-QUICK-START.md) — Essential reference for agents working on the codebase
- [Branching Strategy](BRANCHING-STRATEGY.md) — Branch naming conventions and workflow
- `.cursorrules` — Database schema and code patterns
