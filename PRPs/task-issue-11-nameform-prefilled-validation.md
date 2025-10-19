# Task PRP: Fix NameForm Pre-filled Name Validation Bug

**Issue:** #11 - [BUG] Name set requires change
**Severity:** 🔥 Critical (app unusable)
**Type:** Bug Fix
**Scope:** Single component (NameForm)

---

## Goal

Fix critical bug where submit buttons remain disabled when NameForm is pre-filled with a saved name from localStorage. Currently, users must modify the name (add/remove a letter) before the submit button becomes enabled, even though a valid name is already present.

## Why (Business Value)

- **Critical UX Issue**: Users cannot proceed with saved names, making the app unusable for returning users
- **User Frustration**: Forces unnecessary interaction (modify name then change it back)
- **Breaks User Expectation**: localStorage is meant to save user preferences, not create obstacles
- **Affects All Name Entry Points**: Mode selection, hot-seat Player 1 & 2, URL mode

## What (User-Visible Behavior)

### Before (Current Bug)
1. User plays game and saves name "Alice" to localStorage
2. User starts new game
3. Name field shows "Alice" (pre-filled from localStorage)
4. Submit button is DISABLED (❌ unusable)
5. User must type "Alicee" then delete the "e" to enable submit
6. Submit button finally enables (✅ usable)

### After (Fixed)
1. User plays game and saves name "Alice" to localStorage
2. User starts new game
3. Name field shows "Alice" (pre-filled from localStorage)
4. Submit button is ENABLED (✅ usable immediately)
5. User can click submit right away

## All Needed Context

### Root Cause Analysis

**File:** `src/components/game/NameForm.tsx`

**Problem Location:** Lines 57-72 (useEffect for loading saved name)

```typescript
// Current code (BUGGY)
useEffect(() => {
  let savedName: string | null = null;

  if (storageKey === 'my-name') {
    savedName = storage.getMyName();
  } else if (storageKey === 'player1') {
    savedName = storage.getPlayer1Name();
  } else if (storageKey === 'player2') {
    savedName = storage.getPlayer2Name();
  }

  if (savedName) {
    setName(savedName);
    setIsValid(true);
    // ❌ BUG: onNameChange callback is NOT called here
  }
}, [storageKey]);
```

**Why This Breaks:**
1. `onNameChange` callback is only called in `handleChange` during debounced save (lines 139-144)
2. Parent components (App.tsx lines 40, 246, 545) use `onNameChange` to set `isNameValid` state
3. Submit buttons use `disabled={!isNameValid}` (App.tsx lines 55, etc.)
4. Since `onNameChange` is never called on mount, `isNameValid` stays `false`
5. Submit button stays disabled

### Affected Code Locations

**NameForm.tsx:**
- Lines 57-72: useEffect that loads saved name (needs fix)
- Lines 139-144: onNameChange callback invocation (current working behavior)

**App.tsx (Parent Components):**
- Line 40-43: Mode selection name form (onNameChange sets isNameValid)
- Line 246: Hot-seat Player 1 name form
- Line 545: URL mode initial name form

### React 19 Patterns (from CLAUDE-REACT.md)

**useEffect Dependencies:**
- Include callback in dependency array if it can change
- Use `useCallback` for stable callback references
- Call callbacks synchronously in effects when appropriate

**State Updates:**
- Batch updates are automatic in React 19
- Can call multiple setState in sequence

### Existing Test Patterns

**File:** `src/components/game/NameForm.test.tsx`

**Mock Pattern:**
```typescript
vi.mocked(storage.getMyName).mockReturnValue('SavedName');
const onNameChange = vi.fn();
render(<NameForm storageKey="my-name" onNameChange={onNameChange} />);
```

**Assertion Pattern:**
```typescript
await waitFor(() => {
  expect(onNameChange).toHaveBeenCalledWith('SavedName');
});
```

### Gotchas

1. **Callback Stability:** `onNameChange` might not be stable (no useCallback in parent)
   - **Solution:** Don't add to dependency array, call directly in effect

2. **Timing:** Must call after state updates complete
   - **Solution:** Call `onNameChange` synchronously after `setIsValid(true)`

3. **Optional Callback:** `onNameChange` is optional (`onNameChange?.(name)`)
   - **Solution:** Use optional chaining when calling

4. **Testing:** localStorage mocks must return value BEFORE component renders
   - **Solution:** Set mock return value in beforeEach or before render

---

## Implementation Blueprint

### TASK 1: Write Failing Test (RED)

**File:** `src/components/game/NameForm.test.tsx`

**Location:** Add new test in "localStorage Integration" describe block (after existing tests)

**Pseudocode:**
```typescript
describe('localStorage Integration', () => {
  // ... existing tests ...

  it('should call onNameChange on mount when saved name exists', async () => {
    // RED: This test will FAIL initially

    // Arrange: Mock localStorage to return saved name
    vi.mocked(storage.getMyName).mockReturnValue('Alice');
    const onNameChange = vi.fn();

    // Act: Render component
    render(<NameForm storageKey="my-name" onNameChange={onNameChange} />);

    // Assert: Callback should be called with saved name
    await waitFor(() => {
      expect(onNameChange).toHaveBeenCalledWith('Alice');
    });
  });

  it('should call onNameChange for player1 saved name', async () => {
    vi.mocked(storage.getPlayer1Name).mockReturnValue('Bob');
    const onNameChange = vi.fn();

    render(<NameForm storageKey="player1" onNameChange={onNameChange} />);

    await waitFor(() => {
      expect(onNameChange).toHaveBeenCalledWith('Bob');
    });
  });

  it('should call onNameChange for player2 saved name', async () => {
    vi.mocked(storage.getPlayer2Name).mockReturnValue('Charlie');
    const onNameChange = vi.fn();

    render(<NameForm storageKey="player2" onNameChange={onNameChange} />);

    await waitFor(() => {
      expect(onNameChange).toHaveBeenCalledWith('Charlie');
    });
  });

  it('should not call onNameChange when no saved name exists', () => {
    vi.mocked(storage.getMyName).mockReturnValue(null);
    const onNameChange = vi.fn();

    render(<NameForm storageKey="my-name" onNameChange={onNameChange} />);

    // Should NOT call callback when no saved name
    expect(onNameChange).not.toHaveBeenCalled();
  });
});
```

**Validation:**
```bash
pnpm test src/components/game/NameForm.test.tsx
```

**Expected Result:** 4 new tests FAIL (RED)

**If Tests Pass:** Something is wrong - check that you're testing the bug correctly

**Rollback:**
```bash
git restore src/components/game/NameForm.test.tsx
```

---

### TASK 2: Fix the Bug (GREEN)

**File:** `src/components/game/NameForm.tsx`

**Location:** Lines 57-72 (useEffect for loading saved name)

**Pseudocode:**
```typescript
// Load saved name from localStorage on mount
useEffect(() => {
  let savedName: string | null = null;

  if (storageKey === 'my-name') {
    savedName = storage.getMyName();
  } else if (storageKey === 'player1') {
    savedName = storage.getPlayer1Name();
  } else if (storageKey === 'player2') {
    savedName = storage.getPlayer2Name();
  }

  if (savedName) {
    setName(savedName);
    setIsValid(true);

    // ✅ FIX: Call onNameChange callback immediately
    // This notifies parent component that valid name exists
    onNameChange?.(savedName);
  }
}, [storageKey, onNameChange]); // Add onNameChange to deps? See gotcha below
```

**IMPORTANT DECISION - Dependency Array:**

**Option A:** Add `onNameChange` to dependency array
- **Pro:** Follows React exhaustive deps rule
- **Con:** Effect re-runs every time parent re-renders (if no useCallback)
- **Risk:** Infinite loop if parent's onNameChange changes on every render

**Option B:** Omit `onNameChange` from dependency array, use eslint-disable
- **Pro:** Effect only runs on mount (when storageKey changes)
- **Pro:** Matches the semantic intent (load saved name once)
- **Con:** Violates exhaustive deps rule
- **Solution:** Add ESLint disable comment with explanation

**RECOMMENDED:** Option B with ESLint disable comment

**Final Implementation:**
```typescript
// Load saved name from localStorage on mount
useEffect(() => {
  let savedName: string | null = null;

  if (storageKey === 'my-name') {
    savedName = storage.getMyName();
  } else if (storageKey === 'player1') {
    savedName = storage.getPlayer1Name();
  } else if (storageKey === 'player2') {
    savedName = storage.getPlayer2Name();
  }

  if (savedName) {
    setName(savedName);
    setIsValid(true);

    // Notify parent that valid name was loaded from storage
    onNameChange?.(savedName);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  // onNameChange is intentionally omitted to prevent re-running on parent re-renders
}, [storageKey]);
```

**Validation:**
```bash
# Run tests - should now PASS
pnpm test src/components/game/NameForm.test.tsx

# Run type checking
pnpm run check

# Run linting (will show eslint-disable is intentional)
pnpm run lint
```

**Expected Result:** All tests PASS (GREEN)

**If Tests Fail:**
- Check that `onNameChange?.(savedName)` is called AFTER `setIsValid(true)`
- Verify mock setup in tests
- Check that savedName is not null

**Rollback:**
```bash
git restore src/components/game/NameForm.tsx
```

---

### TASK 3: Refactor for Clarity (REFACTOR)

**File:** `src/components/game/NameForm.tsx`

**Optional Improvements:**

1. **Extract savedName loading logic:**
```typescript
// Helper function for clarity
const getSavedName = (key: typeof storageKey): string | null => {
  if (key === 'my-name') return storage.getMyName();
  if (key === 'player1') return storage.getPlayer1Name();
  if (key === 'player2') return storage.getPlayer2Name();
  return null;
};

useEffect(() => {
  const savedName = getSavedName(storageKey);

  if (savedName) {
    setName(savedName);
    setIsValid(true);
    onNameChange?.(savedName);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [storageKey]);
```

2. **Add JSDoc comment:**
```typescript
/**
 * Load saved name from localStorage on mount.
 * Calls onNameChange callback to notify parent of pre-filled valid name.
 */
useEffect(() => {
  // ... implementation
}, [storageKey]);
```

**Validation:**
```bash
# All tests should still pass
pnpm test src/components/game/NameForm.test.tsx

# Type checking
pnpm run check

# Linting
pnpm run lint
```

**Expected Result:** No regressions, all tests still PASS

**Rollback:**
```bash
git restore src/components/game/NameForm.tsx
```

---

### TASK 4: Integration Testing

**Goal:** Verify fix works in actual App.tsx usage contexts

**Test Scenarios:**

1. **Mode Selection Screen:**
```typescript
// Manual test in browser:
// 1. Clear localStorage
// 2. Enter name "Alice" in mode selection
// 3. Complete game
// 4. Start new game
// 5. VERIFY: Name shows "Alice" AND submit button is enabled
```

2. **Hot-Seat Player 1:**
```typescript
// Manual test:
// 1. Select hot-seat mode
// 2. Enter Player 1 name "Bob"
// 3. Complete handoff to Player 2
// 4. Refresh page
// 5. VERIFY: Player 1 name shows "Bob" AND continue button enabled
```

3. **Hot-Seat Player 2:**
```typescript
// Manual test:
// 1. Complete Player 1 entry
// 2. Enter Player 2 name "Charlie"
// 3. Refresh during Player 2 entry
// 4. VERIFY: Player 2 name shows "Charlie" AND continue button enabled
```

**Automated Integration Test (Optional):**

**File:** Create `src/components/game/NameForm.integration.test.tsx`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NameForm } from './NameForm';
import { storage } from '@/lib/storage/localStorage';

vi.mock('@/lib/storage/localStorage');

describe('NameForm Integration - Submit Button Enable', () => {
  it('should enable submit button when saved name exists', () => {
    // Simulate real usage in App.tsx
    vi.mocked(storage.getMyName).mockReturnValue('Alice');

    let isNameValid = false;
    const handleNameChange = (name: string) => {
      isNameValid = name.trim().length > 0;
    };

    render(<NameForm storageKey="my-name" onNameChange={handleNameChange} />);

    // Wait for effect to run
    expect(isNameValid).toBe(true);
  });
});
```

**Validation:**
```bash
pnpm test src/components/game/NameForm.integration.test.tsx
```

---

### TASK 5: Regression Prevention

**Add Edge Case Tests:**

**File:** `src/components/game/NameForm.test.tsx`

**Location:** Add to end of "localStorage Integration" describe block

**Pseudocode:**
```typescript
describe('localStorage Integration', () => {
  // ... existing tests ...

  it('should handle empty string from localStorage gracefully', () => {
    vi.mocked(storage.getMyName).mockReturnValue('');
    const onNameChange = vi.fn();

    render(<NameForm storageKey="my-name" onNameChange={onNameChange} />);

    // Should NOT call callback for empty string
    expect(onNameChange).not.toHaveBeenCalled();
  });

  it('should handle whitespace-only name from localStorage', () => {
    vi.mocked(storage.getMyName).mockReturnValue('   ');
    const onNameChange = vi.fn();

    render(<NameForm storageKey="my-name" onNameChange={onNameChange} />);

    // Should call callback but validation will fail (tested elsewhere)
    expect(onNameChange).toHaveBeenCalledWith('   ');
  });

  it('should not crash when onNameChange is undefined', () => {
    vi.mocked(storage.getMyName).mockReturnValue('Alice');

    // Should not crash without callback
    expect(() => {
      render(<NameForm storageKey="my-name" />);
    }).not.toThrow();
  });
});
```

**Validation:**
```bash
pnpm test src/components/game/NameForm.test.tsx
```

---

## Validation Loop

### Level 1: Unit Tests
```bash
pnpm test src/components/game/NameForm.test.tsx
```
**Expected:** All tests pass (including 7 new tests)

**If Fail:**
- Check test mocks are set up before render
- Verify onNameChange is called with correct value
- Check waitFor timeout (may need to increase)

### Level 2: Type Checking
```bash
pnpm run check
```
**Expected:** No type errors

**If Fail:**
- Check that onNameChange signature matches: `(name: string) => void`
- Verify optional chaining: `onNameChange?.(savedName)`

### Level 3: Linting
```bash
pnpm run lint
```
**Expected:** Pass (eslint-disable comment is intentional)

**If Fail:**
- Ensure eslint-disable comment is properly formatted
- Check that comment explains why onNameChange is omitted from deps

### Level 4: Full Test Suite
```bash
pnpm test
```
**Expected:** All 674+ tests pass (no regressions)

**If Fail:**
- Check for unexpected side effects in other components
- Verify App.tsx integration tests still pass

### Level 5: Integration Tests
```bash
pnpm test:integration
```
**Expected:** All 17 tests pass

### Level 6: Build
```bash
pnpm build
```
**Expected:** Clean build with no errors

---

## Success Criteria

### Functional Requirements
- [x] Submit button enabled immediately when saved name exists
- [x] Submit button disabled when no saved name exists
- [x] Works for all three storageKeys: 'my-name', 'player1', 'player2'
- [x] Does not break existing debounced save behavior
- [x] onNameChange callback called exactly once on mount (when saved name exists)

### Testing Requirements
- [x] 4 new tests for onNameChange callback on mount
- [x] 3 edge case tests for regression prevention
- [x] All existing tests still pass (no regressions)
- [x] Integration test demonstrates real usage (optional)

### Code Quality Requirements
- [x] Type checking passes
- [x] Linting passes (with intentional eslint-disable)
- [x] Build succeeds
- [x] No performance degradation

---

## Rollback Strategy

### If TASK 1 fails (tests):
```bash
git restore src/components/game/NameForm.test.tsx
```

### If TASK 2 fails (implementation):
```bash
git restore src/components/game/NameForm.tsx
git restore src/components/game/NameForm.test.tsx
```

### If validation fails:
```bash
git restore src/components/game/NameForm.tsx src/components/game/NameForm.test.tsx
pnpm test  # Verify rollback successful
```

### Complete rollback:
```bash
git checkout main -- src/components/game/NameForm.tsx src/components/game/NameForm.test.tsx
```

---

## Estimated Complexity

- **Lines Changed:** ~10 lines (1 callback invocation + 7 new tests)
- **Files Modified:** 1-2 files (NameForm.tsx + NameForm.test.tsx)
- **Risk Level:** LOW (isolated change, well-tested)
- **Time Estimate:** 30-45 minutes (includes testing)

---

## References

- Issue #11: https://github.com/randallard/kings-cooking/issues/11
- CLAUDE-REACT.md: `/home/ryankhetlyr/Development/kings-cooking/claude_md_files/CLAUDE-REACT.md`
- NameForm.tsx: `src/components/game/NameForm.tsx` (lines 57-72, 139-144)
- App.tsx: `src/App.tsx` (lines 40-43, 246, 545)

---

## Final Checklist

- [ ] 🔴 RED: Write failing test (TASK 1)
- [ ] 🟢 GREEN: Fix bug (TASK 2)
- [ ] 🔄 REFACTOR: Improve clarity (TASK 3)
- [ ] ✅ All tests pass (no regressions)
- [ ] 🧪 Regression tests added (TASK 5)
- [ ] 📝 Documentation updated (ESLint comment)
- [ ] 🚀 Ready for PR

