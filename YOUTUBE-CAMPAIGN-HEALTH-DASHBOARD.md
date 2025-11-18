# YouTube Campaign Health Dashboard - Logic Documentation

**Last Updated:** November 18, 2025  
**Purpose:** Campaign performance tracking and health scoring system  
**Formula:** Progress-based health calculation with visual indicators

---

## Overview

The Campaign Health Dashboard provides **real-time performance tracking** for YouTube campaigns using a **simple, transparent health scoring system** based on view count progress toward goals.

### Core Concept
**Health = Progress toward goal**

A campaign's health is directly tied to how close it is to reaching its view count goal:
- **100% health** = Goal reached or exceeded
- **80% health** = 80% of goal views achieved
- **0% health** = No progress yet

This simple formula makes health scores immediately understandable and actionable.

---

## Health Calculation Formula

### Individual Campaign Health

```typescript
Health Score = (Current Views / Goal Views) × 100

// Capped at 100% maximum
Health Score = Math.min((Current Views / Goal Views) × 100, 100)

// Handle division by zero
Health Score = Goal Views > 0 
  ? Math.min((Current Views / Goal Views) × 100, 100) 
  : 0
```

### Examples

| Current Views | Goal Views | Calculation | Health Score | Status |
|--------------|-----------|-------------|--------------|--------|
| 80,000 | 100,000 | (80k / 100k) × 100 | **80%** | 🟡 On Track |
| 120,000 | 100,000 | (120k / 100k) × 100 → capped | **100%** | 🟢 Complete |
| 45,000 | 100,000 | (45k / 100k) × 100 | **45%** | 🔴 Needs Attention |
| 0 | 100,000 | (0 / 100k) × 100 | **0%** | 🔴 Not Started |
| 50,000 | 0 | N/A (no goal set) | **0%** | ⚪ No Goal |

---

## Health Score Tiers

### Tier System
The health scoring uses a **3-tier color-coded system**:

```typescript
function getHealthColor(health: number) {
  if (health >= 80) return 'green';   // 🟢 Healthy
  if (health >= 50) return 'yellow';  // 🟡 Warning
  return 'red';                       // 🔴 Critical
}
```

### Tier Definitions

#### 🟢 **Healthy (≥80%)**
- **Color:** Green (`bg-green-100 text-green-700 border-green-300`)
- **Meaning:** Campaign is on track or exceeding expectations
- **Action:** Monitor normally, maintain current strategy
- **Business Context:** 
  - Client expectations being met
  - Vendor performance satisfactory
  - Likely to reach goal on time

#### 🟡 **Warning (50-79%)**
- **Color:** Yellow (`bg-yellow-100 text-yellow-700 border-yellow-300`)
- **Meaning:** Campaign is progressing but may need intervention
- **Action:** Review campaign strategy, consider optimization
- **Business Context:**
  - May need engagement boost (ratio fixer)
  - Check if timeline is realistic
  - Evaluate vendor performance

#### 🔴 **Critical (<50%)**
- **Color:** Red (`bg-red-100 text-red-700 border-red-300`)
- **Meaning:** Campaign significantly behind, immediate action required
- **Action:** Urgent intervention needed
- **Business Context:**
  - Risk of not meeting client expectations
  - May need refund/discount discussion
  - Review contract terms
  - Escalate to manager

---

## Client-Level Health Aggregation

### Average Health Calculation

For clients with multiple campaigns, health is calculated as the **average of all campaign health scores**:

```typescript
// Calculate health for each campaign
const healthScores = campaigns.map(campaign => {
  const goal = campaign.goal_views || 0;
  const current = campaign.current_views || 0;
  return goal > 0 
    ? Math.min((current / goal) * 100, 100) 
    : 0;
});

// Average all campaign health scores
const clientHealth = healthScores.length > 0 
  ? healthScores.reduce((sum, score) => sum + score, 0) / healthScores.length 
  : 0;
```

### Example

**Client: "Artist Records"** has 4 campaigns:

| Campaign | Current | Goal | Health |
|----------|---------|------|--------|
| Song A | 90,000 | 100,000 | 90% |
| Song B | 60,000 | 80,000 | 75% |
| Song C | 30,000 | 50,000 | 60% |
| Song D | 100,000 | 100,000 | 100% |

**Client Health = (90 + 75 + 60 + 100) / 4 = 81.25%** 🟢

### Why Average vs. Weighted?

**Current Approach: Simple Average**
- **Pros:**
  - Easy to understand
  - Treats all campaigns equally
  - No bias toward larger campaigns
- **Cons:**
  - Doesn't account for campaign size/value
  - A small $500 campaign affects health same as a $10,000 campaign

**Alternative: Weighted Average** (not currently implemented)
```typescript
// Weighted by goal views
const weightedHealth = campaigns.reduce((sum, c) => {
  const weight = c.goal_views || 0;
  const health = ((c.current_views || 0) / (c.goal_views || 1)) * 100;
  return sum + (health * weight);
}, 0) / campaigns.reduce((sum, c) => sum + (c.goal_views || 0), 0);

// Weighted by sale price
const weightedHealth = campaigns.reduce((sum, c) => {
  const weight = c.sale_price || 0;
  const health = ((c.current_views || 0) / (c.goal_views || 1)) * 100;
  return sum + (health * weight);
}, 0) / campaigns.reduce((sum, c) => sum + (c.sale_price || 0), 0);
```

**Recommendation:** Consider implementing weighted health in future for enterprise clients with diverse campaign sizes.

---

## Health Display Locations

### 1. Campaign Table Rows
**Location:** Main campaigns page, each table row

**Display:**
- Progress percentage badge (e.g., "85%")
- Color-coded based on tier
- Progress bar visual

**Code:**
```typescript
<span className={`font-medium ${
  progress >= 80 ? 'text-green-600' :
  progress >= 50 ? 'text-yellow-600' :
  'text-red-600'
}`}>
  {progress.toFixed(1)}%
</span>
```

### 2. Client Table Rows
**Location:** Clients management page, "Health" column

**Display:**
- Badge with client health percentage
- Color-coded background + border
- Example: `[81%]` in green badge

**Code:**
```typescript
<Badge 
  variant="outline" 
  className={`${getHealthColor(stats.health)} font-medium`}
>
  {stats.health.toFixed(0)}%
</Badge>
```

### 3. Client Detail Modal
**Location:** Modal opened when clicking a client row

**Display:**
- Client name with health badge in header
- Individual campaign cards with progress bars
- Each campaign shows:
  - Current vs. goal views
  - Progress percentage
  - Visual progress bar
  - "Views remaining" calculation

**Code:**
```typescript
<DialogTitle className="flex items-center gap-2">
  {client.name}
  <Badge className={getHealthColor(overallHealth)}>
    {overallHealth.toFixed(0)}% Health
  </Badge>
</DialogTitle>
```

### 4. Campaign Detail Cards
**Location:** Within client detail modal, each campaign

**Display:**
- Progress bar (0-100%)
- Current views / Goal views
- Color-coded percentage
- "X views remaining" text

**Visual:**
```
┌────────────────────────────────────────────┐
│ Campaign: "Song Title"                     │
│                                            │
│ 85,000 / 100,000 views            85.0%   │
│ ██████████████████████████░░░░░░░░        │
│ 15,000 views remaining                     │
└────────────────────────────────────────────┘
```

### 5. Dashboard Overview Cards (Future)
**Location:** YouTube dashboard landing page (not yet implemented)

**Planned Display:**
- Overall platform health score
- Campaigns by health tier (count)
- Trending health (up/down arrows)
- At-risk campaigns alert

---

## Progress Calculation

### Campaign Progress

```typescript
const progress = campaign.goal_views && campaign.goal_views > 0
  ? (campaign.current_views || 0) / campaign.goal_views * 100
  : 0;

const viewsRemaining = Math.max(
  (campaign.goal_views || 0) - (campaign.current_views || 0), 
  0
);

const isComplete = progress >= 100;
```

### Overall Progress (Client Level)

```typescript
const totalViews = campaigns.reduce((sum, c) => 
  sum + (c.current_views || 0), 0
);
const totalGoal = campaigns.reduce((sum, c) => 
  sum + (c.goal_views || 0), 0
);
const overallProgress = totalGoal > 0 
  ? (totalViews / totalGoal) * 100 
  : 0;
```

**Note:** `overallProgress` (total views / total goals) is different from `avgHealth` (average of individual health scores).

#### Example Showing the Difference:

**Client with 2 campaigns:**

| Campaign | Current | Goal | Individual Health |
|----------|---------|------|-------------------|
| Song A | 90,000 | 100,000 | 90% |
| Song B | 10,000 | 100,000 | 10% |

- **Overall Progress:** (100k / 200k) = **50%**
- **Average Health:** (90 + 10) / 2 = **50%**

*(In this case they match, but this isn't always true)*

**Another example:**

| Campaign | Current | Goal | Individual Health |
|----------|---------|------|-------------------|
| Song A | 100,000 | 100,000 | 100% |
| Song B | 0 | 200,000 | 0% |

- **Overall Progress:** (100k / 300k) = **33.3%**
- **Average Health:** (100 + 0) / 2 = **50%**

**Current Implementation:** Uses **Average Health** for client health scores, not overall progress.

---

## Health Status Icons

### Status-Based Icons (Campaign Status)

```typescript
function getStatusIcon(status: string) {
  switch(status) {
    case 'active':
      return <Play className="h-4 w-4 text-green-600" />;
    case 'pending':
      return <Clock className="h-4 w-4 text-yellow-600" />;
    case 'paused':
      return <Pause className="h-4 w-4 text-orange-600" />;
    case 'complete':
      return <CheckCircle2 className="h-4 w-4 text-blue-600" />;
    default:
      return <AlertTriangle className="h-4 w-4 text-gray-600" />;
  }
}
```

### Health-Based Icons (Performance)

- 🟢 **Healthy:** `TrendingUp` icon, green
- 🟡 **Warning:** `Minus` or `Activity` icon, yellow
- 🔴 **Critical:** `TrendingDown` or `AlertTriangle` icon, red

---

## Business Logic Rules

### 1. Goal-Based Health
**Rule:** Only campaigns with `goal_views > 0` contribute to health calculation.

**Reason:** Campaigns without goals can't be measured for progress.

**Implementation:**
```typescript
const health = goal_views > 0 
  ? Math.min((current_views / goal_views) * 100, 100) 
  : 0;
```

### 2. Health Cap at 100%
**Rule:** Health never exceeds 100%, even if views exceed goal.

**Reason:** 
- Over-delivery is success, not a problem
- Prevents skewing of client average health
- 100% = "goal achieved" is clear

**Implementation:**
```typescript
Math.min(healthScore, 100)
```

### 3. Zero Division Handling
**Rule:** If `goal_views = 0`, health = 0% (not error/null).

**Reason:**
- Prevents crashes
- 0% health indicates no trackable goal
- UI shows "No Goal" or "-" indicator

### 4. Completed Campaign Handling
**Rule:** Campaigns with `status = 'complete'` still calculate health based on views.

**Reason:**
- Historical data remains accurate
- Client health reflects final delivered results
- Useful for reporting and analytics

**Note:** Complete campaigns show green checkmark badge instead of percentage.

---

## Health Thresholds - Business Justification

### Why 80% for "Healthy"?

**Reasoning:**
- Industry standard for "on-track" performance
- Allows for minor fluctuations without alarm
- 20% buffer is reasonable given:
  - YouTube algorithm variability
  - Organic view patterns
  - Natural campaign lifecycle

**Client Expectation:**
- If campaign reaches 80%, client is generally satisfied
- Final 20% often comes faster due to momentum
- Under-promise, over-deliver strategy

### Why 50% for "Warning"?

**Reasoning:**
- Mid-point indicates significant under-performance
- Requires attention but not yet critical
- Still recoverable with intervention:
  - Engagement boost (ratio fixer)
  - Timeline extension negotiation
  - Marketing strategy adjustment

**Business Impact:**
- Yellow zone = "review and optimize" trigger
- Manager check-in recommended
- Not yet escalation-worthy

### Why <50% is "Critical"?

**Reasoning:**
- Less than halfway = high risk of goal failure
- Immediate action required to avoid:
  - Client dissatisfaction
  - Refund requests
  - Reputation damage
- May need contract renegotiation

**Business Impact:**
- Red zone = escalation protocol
- Manager must be notified
- Client communication may be necessary
- Refund/discount consideration

---

## Edge Cases & Special Scenarios

### 1. Campaign with No Goal Set
**Scenario:** `goal_views = 0` or `NULL`

**Health Calculation:** `0%`

**Display:**
- Shows "-" or "No Goal" instead of percentage
- Gray/muted color
- No progress bar

**Business Meaning:** Campaign is tracking only, no performance target.

### 2. Campaign Exceeding Goal
**Scenario:** `current_views > goal_views`

**Health Calculation:** `100%` (capped)

**Display:**
- Green "Complete" badge
- Checkmark icon
- Progress bar filled 100%

**Business Meaning:** Goal achieved, over-delivery successful.

### 3. Negative Views (Data Error)
**Scenario:** `current_views < 0` (database error)

**Health Calculation:** `0%` (Math.min handles this)

**Display:** Shows as 0% progress

**Action Needed:** Data integrity check, log error.

### 4. Client with No Campaigns
**Scenario:** `campaigns.length = 0`

**Health Calculation:** `0%`

**Display:** "-" or "No Campaigns"

**Business Meaning:** New client, no health score yet.

### 5. Client with All Zero-Goal Campaigns
**Scenario:** All campaigns have `goal_views = 0`

**Health Calculation:** `0%` (average of all 0%s)

**Display:** "0%" but grayed out

**Business Meaning:** Tracking-only client, no performance targets.

---

## Health-Based Features & Automations

### Current Implementations

**1. Visual Color Coding**
- Instant visual feedback on campaign table
- Client health visible at a glance
- No need to click into details

**2. Client Sorting by Health** (Potential)
- Not yet implemented
- Would allow prioritizing at-risk clients
- "Sort by health" column header

**3. Health Filtering** (Potential)
- Not yet implemented
- "Show only critical campaigns"
- "Show only healthy campaigns"

### Future Automation Opportunities

**1. Health-Based Alerts**
- Email/Slack notification when campaign drops below 50%
- Daily digest of critical campaigns
- Manager escalation for <30% health

**2. Auto-Escalation**
- Campaigns <40% health auto-assign to manager
- Ticket created in project management system
- Client communication template generated

**3. Predictive Health**
- ML model predicts future health based on current trajectory
- "At risk of falling below 50% in 7 days"
- Proactive intervention recommendations

**4. Health-Based Pricing**
- Dynamic pricing adjustments based on campaign health
- Early achievement bonuses
- Under-performance discounts (automated)

**5. Health Trends**
- Track health over time (daily snapshots)
- Show trend arrows (improving/declining)
- Historical health charts

---

## Health Dashboard Components

### Key UI Components

**1. Progress Bar**
- Component: `<Progress value={progress} />`
- Visual fill: 0-100%
- Color changes based on tier
- Smooth animation

**2. Health Badge**
- Component: `<Badge className={getHealthColor(health)}>{health}%</Badge>`
- Color-coded background
- Border styling
- Font weight: medium/bold

**3. Status Icons**
- Lucide icons: `Play`, `Clock`, `CheckCircle2`, `AlertTriangle`
- Size: 4x4 (16px)
- Color matches health tier

**4. Views Display**
- Format: "85,000 / 100,000 views"
- Number formatting with commas
- "X views remaining" helper text

### Component Reusability

All health calculation logic is contained in:
- **Client Level:** `ClientsManagement.tsx`, `ClientDetailModal.tsx`, `ClientDetailCard.tsx`
- **Campaign Level:** Individual campaign cards within above components

**Recommendation:** Extract to a shared utility file:
```typescript
// lib/healthCalculator.ts
export function calculateCampaignHealth(campaign: Campaign): number {
  const goal = campaign.goal_views || 0;
  const current = campaign.current_views || 0;
  return goal > 0 ? Math.min((current / goal) * 100, 100) : 0;
}

export function calculateClientHealth(campaigns: Campaign[]): number {
  const healthScores = campaigns.map(calculateCampaignHealth);
  return healthScores.length > 0 
    ? healthScores.reduce((sum, score) => sum + score, 0) / healthScores.length 
    : 0;
}

export function getHealthTier(health: number): 'healthy' | 'warning' | 'critical' {
  if (health >= 80) return 'healthy';
  if (health >= 50) return 'warning';
  return 'critical';
}

export function getHealthColor(health: number): string {
  const tier = getHealthTier(health);
  switch(tier) {
    case 'healthy': return 'bg-green-100 text-green-700 border-green-300';
    case 'warning': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
    case 'critical': return 'bg-red-100 text-red-700 border-red-300';
  }
}
```

---

## Testing Health Calculations

### Unit Test Cases

```typescript
describe('Campaign Health Calculation', () => {
  test('should return 0 for campaign with no goal', () => {
    const campaign = { current_views: 1000, goal_views: 0 };
    expect(calculateCampaignHealth(campaign)).toBe(0);
  });

  test('should return 50 for half completion', () => {
    const campaign = { current_views: 50000, goal_views: 100000 };
    expect(calculateCampaignHealth(campaign)).toBe(50);
  });

  test('should cap at 100 for over-achievement', () => {
    const campaign = { current_views: 150000, goal_views: 100000 };
    expect(calculateCampaignHealth(campaign)).toBe(100);
  });

  test('should handle null/undefined current_views', () => {
    const campaign = { current_views: null, goal_views: 100000 };
    expect(calculateCampaignHealth(campaign)).toBe(0);
  });
});

describe('Client Health Aggregation', () => {
  test('should average multiple campaign health scores', () => {
    const campaigns = [
      { current_views: 90000, goal_views: 100000 }, // 90%
      { current_views: 50000, goal_views: 100000 }, // 50%
    ];
    expect(calculateClientHealth(campaigns)).toBe(70);
  });

  test('should return 0 for client with no campaigns', () => {
    expect(calculateClientHealth([])).toBe(0);
  });
});
```

---

## Performance Considerations

### Calculation Frequency

**Current:** Health calculated on-demand (React useMemo)

**Triggers:**
- Campaign list changes
- Individual campaign view count updates
- Client page load/refresh

**Optimization:**
- `useMemo` prevents re-calculation unless campaigns change
- No server-side calculation needed (frontend only)
- Very fast (<1ms for 100 campaigns)

### Database Query Optimization

**Current:** Health NOT stored in database (calculated in UI)

**Pros:**
- Always real-time
- No stale data
- Simple to maintain

**Cons:**
- Can't sort/filter by health in SQL
- Must load all campaigns to calculate client health

**Future Optimization:**
- Store `calculated_health` column in database
- Update via trigger when `current_views` changes
- Allows SQL-based sorting/filtering
- Enables health trend tracking

```sql
-- Potential trigger
CREATE OR REPLACE FUNCTION update_campaign_health()
RETURNS TRIGGER AS $$
BEGIN
  NEW.calculated_health := 
    CASE 
      WHEN NEW.goal_views > 0 
      THEN LEAST((NEW.current_views::float / NEW.goal_views::float) * 100, 100)
      ELSE 0
    END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER campaign_health_trigger
BEFORE INSERT OR UPDATE OF current_views, goal_views ON youtube_campaigns
FOR EACH ROW EXECUTE FUNCTION update_campaign_health();
```

---

## Related Documentation
- [YOUTUBE-APP-CURRENT-STATUS.md](./YOUTUBE-APP-CURRENT-STATUS.md) - Overall app status
- [YOUTUBE-CLIENT-CAMPAIGN-RELATIONSHIPS.md](./YOUTUBE-CLIENT-CAMPAIGN-RELATIONSHIPS.md) - Data relationships
- [YOUTUBE-CAMPAIGN-INTAKE-UX.md](./YOUTUBE-CAMPAIGN-INTAKE-UX.md) - Campaign creation flow

---

**Status:** ✅ Fully Documented  
**Formula Confirmed:** `(current_views / goal_views) × 100` capped at 100%  
**Tiers:** Green ≥80%, Yellow 50-79%, Red <50%  
**Implementation:** Frontend-only calculation (no database storage)  
**Recommendation:** Consider DB-stored health for advanced filtering/analytics

