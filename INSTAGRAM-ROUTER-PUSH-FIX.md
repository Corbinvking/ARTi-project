# Instagram Router Push Fix

## Critical Issue

Next.js `router.push()` does NOT accept a `state` object like React Router's `navigate()` does.

## Wrong Syntax (React Router)
```typescript
navigate('/creators', { 
  state: { 
    filter: 'underutilized' 
  }
})
```

## Correct Syntax (Next.js)
```typescript
// Use query parameters instead
router.push('/instagram/creators?filter=underutilized')
```

## Files That Need Manual Fixes

These files have complex state objects that need to be converted to query parameters:

1. **SmartRecommendations.tsx** - Multiple state-based navigation calls
2. **DashboardWidgets.tsx** - Navigation with filter states
3. **GlobalSearch.tsx** - Navigation with search context
4. **CampaignHistory.tsx** - Navigation with campaign data

For now, we'll simplify these to just navigate without state.

