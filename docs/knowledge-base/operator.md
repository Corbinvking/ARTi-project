# Operator Module

## Overview

The Operator module provides internal tools for day-to-day operations management. It has two main sections: the Ops Queue (unified task management across all platforms) and Platform Development (bug/feature reporting with GitHub integration).

**URL**: `/operator`
**Accessible by**: Admin, Operator

## Ops Queue

### What It Does

The Ops Queue aggregates pending tasks from all four platforms into a single unified view. Instead of checking each platform separately, operators can see everything that needs attention in one place.

### Queue Data Sources

| Platform | What Enters the Queue |
|----------|----------------------|
| **Spotify** | Campaign submissions pending review, Stream Strategist campaigns needing action |
| **SoundCloud** | Track submissions (new/pending, ready, active/approved) |
| **YouTube** | Campaigns in various phases needing attention |
| **Instagram** | Seeding campaigns with specific workflow filters |

### Queue Interface

- **Service Stats**: Summary cards at the top showing counts per platform (new campaigns, needs approval, in progress)
- **Filter Tabs**: Filter by service (All, Spotify, SoundCloud, YouTube, Instagram)
- **Queue Table**: Each row shows:
  - Service icon (identifies which platform)
  - Campaign/submission name
  - Client name
  - Priority/reason (why it's in the queue)
  - Creation date
  - Link to the campaign in its platform module
- **Priority Indicators**: High-priority items are marked with an alert icon

### How to Process the Queue

1. Navigate to **Operator > Ops Queue** tab
2. Review items in priority order (high priority items first)
3. Click the service icon or campaign name to navigate to the relevant platform
4. Take the required action in the platform module (approve, review, update)
5. The item leaves the queue when the action is completed

## Platform Development

### What It Does

The Platform Development section allows operators to report bugs and request features. Reports are tracked internally and automatically bridged to GitHub Issues via the agentic infrastructure.

### Reporting a Bug or Feature

1. Navigate to **Operator > Platform Development** tab
2. Click the **Report** button
3. Fill in the form:
   - **Type**: Bug or Feature
   - **Title**: Short description of the issue
   - **Description**: Detailed explanation
   - **Priority**: Low, Medium, High, Critical
4. Optionally use the **Element Picker** to capture context:
   - Click "Inspect Element" to activate the picker
   - Click on the problematic UI element
   - The picker captures: DOM selector, tag name, CSS classes, text content, page URL, bounding rectangle
5. Submit the report

### What Happens After Submission

1. The report is saved to Supabase (`platform_development_reports` table)
2. A GitHub Issue is automatically created with proper labels (app domain, type, priority)
3. The issue is routed to the correct GitHub Project (Spotify, Instagram, YouTube, SoundCloud, Dashboard)
4. A success toast shows with a link to the GitHub issue
5. The report appears in the timeline below with its status

### Report Timeline

All submitted reports appear in a timeline view showing:
- Type badge (Bug / Feature)
- Status badge (Open / In Progress / Complete)
- Priority indicator
- Title and description
- Element data (if captured) showing where the bug was reported
- GitHub issue link (clickable to view on GitHub)
- Submission date

### Managing Reports

- **Update status**: Click the status badge to change from Open → In Progress → Complete
- **View GitHub issue**: Click the GitHub link to see the issue on GitHub
- **Filter**: Use status or type filters to find specific reports

### Admin View

Admins have an additional view at **Admin > Platform Development** that provides:
- All reports across all users
- Status management
- Filtering and prioritization
- GitHub issue integration

## Element Picker

The Element Picker is a tool available in the bug report form that captures detailed information about a UI element. When activated:

1. A visual overlay appears on the page
2. Hovering over elements highlights them
3. Clicking an element captures:
   - **DOM Selector**: Full CSS path to the element (e.g., `button.flex.items-center`)
   - **Tag Name**: HTML element type (button, div, input, etc.)
   - **Classes**: CSS classes applied to the element
   - **Text Content**: The visible text in the element
   - **Page URL**: Which page the user was on
   - **Bounding Rectangle**: Position and size on screen (top, left, width, height)
   - **React Component**: The React component name (if available)
   - **Timestamp**: When the element was captured

This context helps developers quickly locate and reproduce the issue.

## FAQ

**Q: Why can't I see the Operator tab?**
A: Only Admin and Operator roles have access to the Operator module. Check with an admin if you need access.

**Q: Where do my reports go?**
A: Reports are saved to the database and automatically create a GitHub Issue. The issue goes through the agentic pipeline: triage → dispatch → agent worker → PR.

**Q: Can I report a bug from any page?**
A: Yes. The floating action button (FAB) in the bottom-left corner is available on all pages for operators and admins. Click it to activate the element picker and report a bug.

**Q: What's the difference between Ops Queue and the Dashboard?**
A: The Dashboard shows metrics and health status (overview). The Ops Queue shows specific actionable items that need immediate attention (task list).

**Q: Does the element picker work on all elements?**
A: It works on most visible DOM elements. Some dynamic elements (tooltips, dropdowns that close on click) may be harder to capture.
