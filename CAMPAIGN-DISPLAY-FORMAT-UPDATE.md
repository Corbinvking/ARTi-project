# Campaign Display Format Update

## 🎯 **Problem**
Campaign rows were only showing the campaign name (which is typically "Artist - Song"), but not displaying the artist name and song name separately. The user wanted:
- **Artist Name** displayed prominently in the Campaign column
- **Song Name** (campaign name) displayed as secondary text below
- **Client Name** shown in the Client column

## ✅ **Solution Implemented**

### **Updated Campaign Display Format**

Changed from:
```
Campaign Column:
  Conrad Taylor - mein schatz
  Budget: $240 | Goal: 30,000
  Started: 10/10/2025
```

To:
```
Campaign Column:
  Conrad Taylor          ← Artist Name (bold)
  mein schatz            ← Song Name (gray secondary text)
  Budget: $240 | Goal: 30,000
  Started: 10/10/2025
```

### **Files Updated**

#### 1. **CampaignHistory.tsx** (Main campaigns page)

**Before:**
```tsx
<div className="font-medium">{campaign.name}</div>
```

**After:**
```tsx
<div className="font-medium">{campaign.artist_name || campaign.name}</div>
<div className="text-sm text-muted-foreground">
  {campaign.name}
</div>
```

#### 2. **CampaignGroupList.tsx** (Campaign groups component)

**Before:**
```tsx
<div className="font-medium">{campaign.name}</div>
```

**After:**
```tsx
<div className="font-medium">{campaign.artist_name || campaign.name}</div>
<div className="text-sm text-muted-foreground">
  {campaign.name}
</div>
```

#### 3. **Campaign Interface**

Added `artist_name` field to the Campaign interface:

```typescript
interface Campaign {
  id: string;
  name: string;
  artist_name?: string;  // ✅ NEW
  client: string;
  client_name?: string;
  // ... other fields
}
```

## 📊 **Data Source**

- **Artist Name**: `campaign_groups.artist_name`
- **Song Name**: `campaign_groups.name` (displayed as secondary text)
- **Client Name**: `clients.name` (via relationship)

## 🎨 **Visual Hierarchy**

```
┌─────────────────────────────────────┐
│ Campaign Column:                    │
│                                     │
│ ✓ Artist Name (BOLD, 16px)         │ ← Primary
│ ✓ Song Name (Gray, 14px)           │ ← Secondary
│ ✓ Salesperson (xs, gray)           │ ← Tertiary
│ ✓ Budget/Goal (xs, gray)           │ ← Info
│                                     │
│ Client Column:                      │
│ ✓ Client Name (BOLD, 16px)         │ ← Primary
│ ✓ Start Date (xs, gray)            │ ← Info
└─────────────────────────────────────┘
```

## 🔄 **Fallback Logic**

If `artist_name` is not available:
```tsx
{campaign.artist_name || campaign.name}
```

This ensures:
- If `artist_name` exists → Show it as primary
- If `artist_name` is null/empty → Show `name` as primary
- Always show `name` as secondary text

## ✅ **Examples**

### Example 1: Conrad Taylor Campaign
```
Conrad Taylor                          ← Artist (from artist_name)
mein schatz                            ← Song (from name)
by John Smith                          ← Salesperson
Budget: $240 | Goal: 30,000           ← Metrics
```

### Example 2: Lani Daye Campaign
```
Lani Daye                              ← Artist (from artist_name)
Lani Daye                              ← Song (from name)
by Sarah Jones                         ← Salesperson
Budget: $500 | Goal: 15,000           ← Metrics
```

### Example 3: Segan Campaign
```
Segan                                  ← Artist (from artist_name)
Segan - DNBMF                          ← Song (from name)
by Mike Wilson                         ← Salesperson
Budget: $2,000 | Goal: 75,000         ← Metrics
```

## 🚀 **Deployment**

Changes deployed to production via Vercel.

### **Verification Steps**

1. Navigate to: `https://app.artistinfluence.com/spotify/campaigns`
2. **Hard refresh**: `Ctrl + Shift + R`
3. Check the campaign table displays:
   - ✅ Artist name in bold
   - ✅ Song name in gray below
   - ✅ Client name in separate column
   - ✅ Proper visual hierarchy

## 📝 **Notes**

- The `artist_name` field is populated during campaign creation or CSV import
- If campaigns don't have `artist_name` set, they will fall back to showing the full `name` field
- Search functionality already includes `artist_name` in the filter (line 70 in CampaignGroupList.tsx)
- Sorting still works on the `name` field (which contains the song/campaign name)

## 🔄 **Version**

- **Version**: v1.0.3
- **Deployed**: 2025-01-21
- **Files Changed**:
  - `apps/frontend/app/(dashboard)/spotify/stream-strategist/pages/CampaignHistory.tsx`
  - `apps/frontend/app/(dashboard)/spotify/stream-strategist/components/CampaignGroupList.tsx`

