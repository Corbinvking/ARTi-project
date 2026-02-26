#!/bin/bash
# =============================================================================
# ARTi Platform - GitHub Label Taxonomy Setup
# =============================================================================
# Creates a standardized label system for routing issues to the correct
# app domain and enabling agentic workflows.
#
# Usage:
#   gh auth login  # if not already authenticated
#   bash scripts/setup-github-labels.sh
#
# Requires: GitHub CLI (gh) installed and authenticated
# =============================================================================

REPO="Corbinvking/ARTi-project"

echo "=== ARTi Platform: Setting up GitHub label taxonomy ==="
echo "Repository: $REPO"
echo ""

create_label() {
  local name="$1"
  local color="$2"
  local description="$3"

  if gh label create "$name" --repo "$REPO" --color "$color" --description "$description" 2>/dev/null; then
    echo "  ✓ Created: $name"
  else
    gh label edit "$name" --repo "$REPO" --color "$color" --description "$description" 2>/dev/null
    echo "  ~ Updated: $name"
  fi
}

# ---------------------------------------------------------------------------
# APP DOMAIN LABELS (route issues to correct project/agent)
# ---------------------------------------------------------------------------
echo ""
echo "--- App Domain Labels ---"
create_label "app:spotify"     "1DB954" "Spotify campaign management module"
create_label "app:instagram"   "E1306C" "Instagram creator campaigns module"
create_label "app:youtube"     "FF0000" "YouTube video campaigns module"
create_label "app:soundcloud"  "FF5500" "SoundCloud repost network module"
create_label "app:dashboard"   "6366F1" "Cross-platform dashboard module"
create_label "app:operator"    "8B5CF6" "Internal operator tools module"
create_label "app:admin"       "64748B" "Admin panel module"
create_label "app:api"         "0EA5E9" "Backend API (Fastify)"
create_label "app:scraper"     "A855F7" "Data scrapers (Spotify, Instagram, Roster)"
create_label "app:shared"      "06B6D4" "Shared components, hooks, utilities"
create_label "app:infra"       "78716C" "Infrastructure, CI/CD, deployment"
create_label "app:database"    "F59E0B" "Supabase schema, migrations, RLS"

# ---------------------------------------------------------------------------
# ISSUE TYPE LABELS
# ---------------------------------------------------------------------------
echo ""
echo "--- Issue Type Labels ---"
create_label "type:bug"        "D73A4A" "Something isn't working"
create_label "type:feature"    "0075CA" "New functionality request"
create_label "type:refactor"   "FBCA04" "Code restructuring without behavior change"
create_label "type:perf"       "E4E669" "Performance improvement"
create_label "type:docs"       "0075CA" "Documentation improvement"
create_label "type:test"       "BFD4F2" "Test coverage improvement"
create_label "type:chore"      "D4C5F9" "Maintenance, dependencies, tooling"
create_label "type:security"   "B60205" "Security vulnerability or hardening"

# ---------------------------------------------------------------------------
# AGENT WORKFLOW LABELS (control the agentic pipeline)
# ---------------------------------------------------------------------------
echo ""
echo "--- Agent Workflow Labels ---"
create_label "agent:ready"       "2EA44F" "Triaged and ready for agent assignment"
create_label "agent:in-progress" "FBCA04" "Agent is actively working on this"
create_label "agent:pr-open"     "0E8A16" "Agent has opened a PR for review"
create_label "agent:needs-review" "C5DEF5" "Agent work complete, needs human review"
create_label "agent:blocked"     "B60205" "Agent cannot proceed, needs human input"
create_label "agent:failed"      "E4E669" "Agent attempted but could not resolve"
create_label "agent:skip"        "EEEEEE" "Do not assign to agent (manual only)"

# ---------------------------------------------------------------------------
# COMPLEXITY LABELS (helps agents estimate scope)
# ---------------------------------------------------------------------------
echo ""
echo "--- Complexity Labels ---"
create_label "complexity:low"    "C2E0C6" "Simple fix, isolated change (< 1 hour)"
create_label "complexity:medium" "FEF2C0" "Moderate scope, may touch multiple files (1-4 hours)"
create_label "complexity:high"   "F9D0C4" "Complex change, architectural impact (> 4 hours)"

# ---------------------------------------------------------------------------
# PRIORITY LABELS
# ---------------------------------------------------------------------------
echo ""
echo "--- Priority Labels ---"
create_label "priority:critical" "B60205" "Production broken, needs immediate fix"
create_label "priority:high"     "D93F0B" "Important, should be fixed soon"
create_label "priority:medium"   "FBCA04" "Normal priority"
create_label "priority:low"      "0E8A16" "Nice to have, no rush"

# ---------------------------------------------------------------------------
# STATUS LABELS
# ---------------------------------------------------------------------------
echo ""
echo "--- Status Labels ---"
create_label "status:triage"     "D876E3" "Needs initial assessment and labeling"
create_label "status:confirmed"  "0075CA" "Bug confirmed and reproducible"
create_label "status:duplicate"  "CFD3D7" "Duplicate of another issue"
create_label "status:wontfix"    "FFFFFF" "Decided not to address"

echo ""
echo "=== Label setup complete ==="
echo ""
echo "Label groups:"
echo "  app:*         - Route issues to the correct app domain"
echo "  type:*        - Classify the nature of the issue"
echo "  agent:*       - Control the agentic workflow pipeline"
echo "  complexity:*  - Estimate scope for agent assignment"
echo "  priority:*    - Set urgency level"
echo "  status:*      - Track triage state"
