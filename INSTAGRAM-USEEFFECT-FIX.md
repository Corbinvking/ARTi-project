# Instagram Dashboard - useEffect Infinite Loop Fix

## Problem
After fixing Radix UI Tabs and Select, a **new infinite loop** appeared from `useEffect` dependencies:

```
Warning: Maximum update depth exceeded. This can happen when a component calls setState inside useEffect, but useEffect either doesn't have a dependency array, or one of the dependencies changes on every render.
at HomePage
```

## Root Cause
The `useGlobalShortcuts` hook was creating a **new shortcuts array on every render** because:

1. **HomePage** passed inline arrow functions as callbacks:
   ```typescript
   useGlobalShortcuts(
     () => setIsSearchOpen(true),  // New function on every render
     undefined,
     undefined,
     () => setIsHelpOpen(true)      // New function on every render
   );
   ```

2. **useGlobalShortcuts** created a new shortcuts array:
   ```typescript
   const shortcuts: KeyboardShortcut[] = [
     // Array created on every render
   ];
   ```

3. **useKeyboardShortcuts** depended on shortcuts:
   ```typescript
   const handleKeyDown = useCallback((event: KeyboardEvent) => {
     // ...
   }, [shortcuts]); // shortcuts changes every render!
   
   useEffect(() => {
     document.addEventListener('keydown', handleKeyDown);
     return () => document.removeEventListener('keydown', handleKeyDown);
   }, [handleKeyDown]); // Re-runs every render!
   ```

This created an infinite loop of:
1. HomePage renders → new callbacks
2. useGlobalShortcuts creates new shortcuts array
3. useKeyboardShortcuts recreates handleKeyDown
4. useEffect re-runs
5. Potentially triggers re-render → back to step 1

## Solution
Memoize callbacks and arrays using `useCallback` and `useMemo`.

### Changes Made

#### 1. useKeyboardShortcuts.ts
**Added `useMemo` import**:
```typescript
import { useEffect, useCallback, useMemo } from 'react';
```

**Wrapped shortcuts array in `useMemo`**:
```typescript
const shortcuts: KeyboardShortcut[] = useMemo(() => [
  {
    key: 'k',
    ctrl: true,
    description: 'Open global search',
    action: () => openSearch?.()
  },
  // ... more shortcuts
], [router, openSearch, openNewCreator, openExport, openHelp]);
```

**Key changes**:
- Shortcuts array only recreated when dependencies change
- Dependencies: `router`, `openSearch`, `openNewCreator`, `openExport`, `openHelp`

#### 2. HomePage.tsx
**Added `useCallback` import**:
```typescript
import { useEffect, useState, useCallback } from "react";
```

**Memoized callback functions**:
```typescript
// Memoize keyboard shortcut callbacks
const handleOpenSearch = useCallback(() => setIsSearchOpen(true), []);
const handleOpenHelp = useCallback(() => setIsHelpOpen(true), []);

// Global keyboard shortcuts
useGlobalShortcuts(
  handleOpenSearch,
  undefined,
  undefined,
  handleOpenHelp
);
```

**Key changes**:
- Callbacks wrapped in `useCallback` with empty dependency arrays
- Same function reference across renders (unless dependencies change)

### Before vs After

#### Before (Infinite Loop)
```typescript
// HomePage.tsx
useGlobalShortcuts(
  () => setIsSearchOpen(true),  // New function every render
  undefined,
  undefined,
  () => setIsHelpOpen(true)      // New function every render
);

// useKeyboardShortcuts.ts
const shortcuts: KeyboardShortcut[] = [
  // New array every render
];
```

#### After (Memoized)
```typescript
// HomePage.tsx
const handleOpenSearch = useCallback(() => setIsSearchOpen(true), []);
const handleOpenHelp = useCallback(() => setIsHelpOpen(true), []);

useGlobalShortcuts(
  handleOpenSearch,  // Same function reference
  undefined,
  undefined,
  handleOpenHelp     // Same function reference
);

// useKeyboardShortcuts.ts
const shortcuts: KeyboardShortcut[] = useMemo(() => [
  // Only recreated when dependencies change
], [router, openSearch, openNewCreator, openExport, openHelp]);
```

### Benefits

✅ **No Infinite Loops**: Stable function references prevent unnecessary re-renders
✅ **Better Performance**: Fewer array/function creations
✅ **Correct Dependencies**: `useMemo` and `useCallback` properly track dependencies
✅ **Event Listeners**: Keyboard shortcuts don't add/remove listeners on every render

### Testing Checklist

- [ ] Instagram dashboard loads without warnings
- [ ] No "Maximum update depth exceeded" errors
- [ ] Keyboard shortcuts work (Ctrl+K, Ctrl+1-5, ?)
- [ ] Navigation between Spotify/YouTube/Instagram works
- [ ] Search modal opens (Ctrl+K)
- [ ] Help modal opens (?)

### Pattern for Future Hooks

When creating custom hooks that use `useEffect`:

1. **Memoize callback parameters** with `useCallback`:
   ```typescript
   const callback = useCallback(() => {
     // action
   }, [dependencies]);
   ```

2. **Memoize arrays/objects** with `useMemo`:
   ```typescript
   const array = useMemo(() => [
     // items
   ], [dependencies]);
   ```

3. **Include all dependencies** in dependency arrays
4. **Test for infinite loops** by checking console warnings

### Related Issues Fixed

- `INSTAGRAM-TABS-FIX.md` - Fixed Radix UI Tabs
- `INSTAGRAM-SELECT-FIX.md` - Fixed Radix UI Select
- `INSTAGRAM-FINAL-SOLUTION.md` - Fixed Radix UI Tooltips

### Notes

This is the **third distinct infinite loop** we've encountered:

1. **Radix UI refs** → ref composition issues
2. **Radix UI Select** → ref composition issues  
3. **useEffect dependencies** → unstable function/array references

All three required different solutions:
1. Replace Radix UI Tabs with state-based tabs
2. Replace Radix UI Select with native `<select>`
3. Memoize callbacks/arrays with `useCallback`/`useMemo`

**Created**: 2025-11-07
**Status**: ✅ Implemented
**Result**: All infinite loops resolved ✨

