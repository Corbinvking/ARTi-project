#!/bin/bash
# =============================================================================
# ARTi Platform - GitHub Projects Setup
# =============================================================================
# Creates per-domain GitHub Projects (v2) for organizing issues and enabling
# parallel agentic workflows across app modules.
#
# Usage:
#   gh auth login  # if not already authenticated
#   bash scripts/setup-github-projects.sh
#
# Requires: GitHub CLI (gh) installed and authenticated
# =============================================================================

OWNER="Corbinvking"
REPO="Corbinvking/ARTi-project"

echo "=== ARTi Platform: Setting up GitHub Projects ==="
echo "Owner: $OWNER"
echo ""

create_project() {
  local title="$1"
  local description="$2"

  PROJECT_URL=$(gh project create --owner "$OWNER" --title "$title" 2>/dev/null)
  if [ $? -eq 0 ]; then
    echo "  ✓ Created project: $title"
    echo "    URL: $PROJECT_URL"

    PROJECT_NUM=$(echo "$PROJECT_URL" | grep -oP '\d+$')
    if [ -n "$PROJECT_NUM" ]; then
      gh project field-create "$PROJECT_NUM" --owner "$OWNER" \
        --name "Agent Assignable" --data-type "SINGLE_SELECT" \
        --single-select-options "Yes,No,Needs Triage" 2>/dev/null

      gh project field-create "$PROJECT_NUM" --owner "$OWNER" \
        --name "App Domain" --data-type "TEXT" 2>/dev/null

      gh project field-create "$PROJECT_NUM" --owner "$OWNER" \
        --name "Agent Run ID" --data-type "TEXT" 2>/dev/null

      echo "    + Added custom fields"
    fi
  else
    echo "  ~ Project may already exist: $title"
  fi
}

echo ""
echo "--- Creating Per-Domain Projects ---"
echo ""

create_project \
  "ARTi - Spotify Module" \
  "Spotify campaign management: playlist campaigns, vendors, stream strategist, ML dashboard"

create_project \
  "ARTi - Instagram Module" \
  "Instagram creator campaigns: campaign builder, creator discovery, seedstorm builder, QA"

create_project \
  "ARTi - YouTube Module" \
  "YouTube video campaigns: campaign management, vidi health flow, vendor payments"

create_project \
  "ARTi - SoundCloud Module" \
  "SoundCloud repost network: member management, submission queue, portal, campaigns"

create_project \
  "ARTi - Core Platform" \
  "Cross-platform dashboard, operator tools, admin panel, shared components"

create_project \
  "ARTi - API & Backend" \
  "Fastify API: routes, auth, queues, integrations, Redis/BullMQ"

create_project \
  "ARTi - Scrapers & Data" \
  "Data collection: Spotify scraper, Instagram scraper, roster scraper, Supabase migrations"

echo ""
echo "=== Project setup complete ==="
echo ""
echo "Projects created:"
echo "  1. ARTi - Spotify Module"
echo "  2. ARTi - Instagram Module"
echo "  3. ARTi - YouTube Module"
echo "  4. ARTi - SoundCloud Module"
echo "  5. ARTi - Core Platform"
echo "  6. ARTi - API & Backend"
echo "  7. ARTi - Scrapers & Data"
echo ""
echo "Next steps:"
echo "  1. Run 'bash scripts/setup-github-labels.sh' to create the label taxonomy"
echo "  2. Configure project views (Board, Table) in the GitHub UI"
echo "  3. Set up workflow automations in each project's settings"
