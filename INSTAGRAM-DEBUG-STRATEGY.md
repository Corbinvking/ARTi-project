# Instagram Debug Strategy

## Current Status

The application is experiencing an infinite loop error in `@radix-ui/react-compose-refs` that persists despite fixing all TooltipProvider nesting issues.

## Error Details

```
Error: Maximum update depth exceeded. This can happen when a component 
repeatedly calls setState inside componentWillUpdate or componentDidUpdate.
React limits the number of nested updates to prevent infinite loops.

Call Stack:
- throwIfInfiniteUpdateLoopDetected
- getRootForUpdatedFiber
- enqueueConcurrentHookUpdate
- dispatchSetState
- setRef (@radix-ui/react-compose-refs)
```

## Debugging Steps Applied

### Step 1: Minimal Page Test ✅

Created a minimal test version of `page.tsx` that renders only:
- `SeedstormApp` wrapper
- `ProtectedRoute` wrapper
- Simple HTML content (no complex components)

**Purpose**: Isolate whether the issue is in:
- The wrapper components (`SeedstormApp`, `ProtectedRoute`, `AuthContext`)
- OR in the page content (`HomePage`, `EnhancedDashboard`, etc.)

**Test the page now** and observe:

#### If Minimal Page Works:
✅ The issue is in `HomePage` or its children
- Next step: Add back components incrementally
- Start with empty `HomePage` shell
- Add `EnhancedDashboard` without tooltips
- Add tooltips last

#### If Minimal Page STILL Fails:
❌ The issue is in the wrappers themselves
- Check `SeedstormApp` for infinite re-render
- Check `AuthContext` for state update loops
- Check `ProtectedRoute` for navigation loops
- Check if `QueryClient` is being recreated

## Potential Root Causes

### 1. State Update During Render
Some component might be calling `setState` during the render phase, not in an effect or event handler.

**Check for:**
```typescript
// ❌ BAD - setState during render
function Component() {
  const [state, setState] = useState(0);
  setState(1); // Will cause infinite loop
  return <div>{state}</div>;
}

// ✅ GOOD - setState in effect
function Component() {
  const [state, setState] = useState(0);
  useEffect(() => {
    setState(1);
  }, []);
  return <div>{state}</div>;
}
```

### 2. Ref Callback Recreated on Every Render
A ref callback that's not memoized could cause infinite updates.

**Check for:**
```typescript
// ❌ BAD - new function on every render
<div ref={(node) => { /* do something */ }} />

// ✅ GOOD - memoized callback
const refCallback = useCallback((node) => { /* do something */ }, []);
<div ref={refCallback} />
```

### 3. Context Provider Value Changes on Every Render
If a context provider's value is recreated on every render, all consumers will re-render.

**Check for:**
```typescript
// ❌ BAD - new object every render
<Context.Provider value={{ user, loading }}>

// ✅ GOOD - memoized value
const value = useMemo(() => ({ user, loading }), [user, loading]);
<Context.Provider value={value}>
```

### 4. Conflicting Radix UI Versions
Multiple versions of `@radix-ui` packages could cause ref composition conflicts.

**Check:**
```bash
npm list @radix-ui/react-tooltip
npm list @radix-ui/react-compose-refs
```

### 5. React Strict Mode Double Rendering
In development, React Strict Mode renders components twice, which could expose timing issues.

**Check:** The issue persists in production build?

## Next Steps

1. **Test the minimal page** - Does it load?

2. **If minimal works:**
   - Add components back one at a time
   - Start with: `<HomePage>` with empty render
   - Then: `<EnhancedDashboard>` without children
   - Then: Add tabs without tooltips
   - Finally: Add tooltips back

3. **If minimal fails:**
   - Remove `TooltipPrimitive.Provider` entirely
   - Remove `AuthProvider` to test
   - Remove `QueryClientProvider` to test
   - Narrow down which wrapper causes the issue

4. **Check for state updates during render:**
   ```bash
   # Search for setState calls not in useEffect/handlers
   grep -r "set[A-Z].*(" --include="*.tsx" | grep -v "useEffect" | grep -v "onClick" | grep -v "onSubmit"
   ```

5. **Check package versions:**
   ```bash
   cd apps/frontend
   npm list @radix-ui/react-tooltip
   npm list @radix-ui/react-compose-refs
   npm list react
   npm list react-dom
   ```

## Recovery Options

### Option A: Remove All Tooltips Temporarily
Comment out all TooltipPrimitive usage to see if page loads without them.

### Option B: Use Different Tooltip Library
Switch to a simpler tooltip solution that doesn't use Radix UI refs.

### Option C: Copy Spotify Pattern Exactly
Check if Spotify integration has tooltips and how they're implemented there.

## Files to Check

Priority files for debugging:
1. `SeedstormApp.tsx` - Wrapper that provides QueryClient and TooltipProvider
2. `AuthContext.tsx` - Context provider for auth state
3. `ProtectedRoute.tsx` - Auth guard that uses router
4. `HomePage.tsx` - Main page component
5. `EnhancedDashboard.tsx` - Dashboard with tabs

## Current State

- ✅ All tooltip components use `TooltipPrimitive` directly
- ✅ Single `TooltipPrimitive.Provider` at app level
- ✅ No nested providers
- ✅ QueryClient in state with lazy initializer
- ⏳ Testing minimal page...

## Test Results

**Date:** [To be filled after test]

**Minimal Page Status:** [Works / Fails]

**Next Action:** [Based on result]

