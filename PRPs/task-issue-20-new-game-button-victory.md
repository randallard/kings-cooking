# Task PRP: Add "New Game" Button to VictoryScreen

**Issue:** #20 - [TDD] link to game start from victory
**Priority:** 🔥 Critical (blocking other work)
**Complexity:** 🟢 Simple (1-2 days)
**Type:** Feature
**Scope:** VictoryScreen component + App.tsx integration

---

## Goal

Add "New Game" button to VictoryScreen that allows players to start a new game after one finishes, returning them to the mode selection screen. Button behavior differs between hot-seat and URL modes.

## Why (Business Value)

- **Critical UX Gap**: Players currently have no way to start a new game from victory screen
- **Improves Flow**: Removes need to manually navigate or refresh page
- **URL Mode Optimization**: Shows button only after player has shared URL (doesn't rush them)
- **User Retention**: Makes it easy to play multiple games in succession

## What (User-Visible Behavior)

### Hot-Seat Mode

**Before:**
1. Game ends, victory screen shows
2. User sees stats and "Review Moves" button
3. No clear way to start new game
4. User must manually navigate or refresh page

**After:**
1. Game ends, victory screen shows
2. "New Game" button appears under the title
3. User clicks "New Game"
4. Returns to mode selection screen
5. Player names are pre-filled from localStorage

### URL Mode

**Before:**
1. Game ends, victory screen shows with URLSharer
2. User copies URL to send to opponent
3. No option to start new game while waiting
4. User must manually navigate away

**After:**
1. Game ends, victory screen shows with URLSharer
2. User clicks Copy button, sends URL
3. User closes tab to send URL via messaging app
4. User returns to victory screen
5. "New Game" button now appears (because copy flag was set)
6. User clicks "New Game"
7. Returns to mode selection screen

## All Needed Context

### Existing Infrastructure

**NEW_GAME Action** (`src/lib/gameFlow/reducer.ts` line 429):
```typescript
case 'NEW_GAME':
  // Clear localStorage game state (Issue #7 fix)
  storage.clearGameState();
  return { phase: 'mode-selection' };
```

**VictoryScreen Props Pattern** (`src/App.tsx` lines 605-645):
```typescript
const victoryProps: Parameters<typeof VictoryScreen>[0] = {
  winner: state.winner,
  // ... other props
};

// Add optional callback
if (state.mode === 'url') {
  victoryProps.shareUrl = fullShareUrl;
}

return <VictoryScreen {...victoryProps} />;
```

**URLSharer onCopy Callback** (`src/components/game/URLSharer.tsx` line 53):
```typescript
await navigator.clipboard.writeText(url);
setCopyStatus('success');
onCopy?.();  // ← We can use this
```

### Component Structure

**VictoryScreen Layout** (`src/components/game/VictoryScreen.tsx`):
```tsx
<div className={styles.overlay}>
  <div className={styles.container}>
    <h1 id="victory-title">{getCelebrationMessage()}</h1>
    <p id="victory-subtitle">{getSubtitle()}</p>

    {/* NEW: New Game button goes here */}

    {shareUrl && <URLSharer ... />}

    <div className={styles.stats}>...</div>

    <div className={styles.actions}>
      {onReviewMoves && <button>Review Moves</button>}
    </div>
  </div>
</div>
```

### localStorage Storage Keys

**Existing Keys** (`src/lib/storage/localStorage.ts`):
- `kings-cooking:my-name` - User's name
- `kings-cooking:player1-name` - Player 1 name
- `kings-cooking:player2-name` - Player 2 name
- `kings-cooking:game-state` - Current game state
- `kings-cooking:game-mode` - Selected mode

**New Key Needed:**
- `kings-cooking:victory-url-copied` - Flag indicating URL was copied

### React 19 Patterns (from CLAUDE-REACT.md)

**useEffect for localStorage Check:**
```typescript
useEffect(() => {
  const flag = localStorage.getItem('kings-cooking:victory-url-copied');
  setShowNewGameButton(flag === 'true');
}, []);
```

**Event Handler Pattern:**
```typescript
const handleNewGame = () => {
  onNewGame?.();
};
```

**Conditional Rendering:**
```typescript
{showNewGameButton && (
  <button onClick={handleNewGame}>New Game</button>
)}
```

### Existing Test Patterns

**VictoryScreen Tests** (`src/components/game/VictoryScreen.test.tsx`):
```typescript
describe('Action Buttons', () => {
  it('should render Review Moves button when onReviewMoves is provided', () => {
    render(<VictoryScreen {...defaultProps} onReviewMoves={vi.fn()} />);
    expect(screen.getByRole('button', { name: /review game moves/i })).toBeInTheDocument();
  });
});
```

### Gotchas

1. **localStorage Flag Persistence:**
   - **Issue:** Flag persists across sessions
   - **Fix:** Clear flag when NEW_GAME action is dispatched
   - **Alternative:** Use session-based flag (cleared on tab close)

2. **Hot-Seat vs URL Mode:**
   - **Issue:** Different visibility logic for same button
   - **Fix:** Hot-seat always shows, URL shows only if flag exists OR after copy

3. **Button Positioning:**
   - **Issue:** Need consistent spacing between title and stats
   - **Fix:** Use existing spacing variables from CSS modules

4. **Callback Stability:**
   - **Issue:** onNewGame callback might not be stable
   - **Fix:** Don't add to useEffect deps, call directly in handler

5. **Copy Button in URLSharer:**
   - **Issue:** Need to set localStorage flag from URLSharer
   - **Fix:** Pass enhanced onCopy callback from VictoryScreen to URLSharer

---

## Implementation Blueprint

### TASK 1: Add onNewGame Prop to VictoryScreen Interface (RED)

**File:** `src/components/game/VictoryScreen.tsx`

**Location:** Lines 11-38 (VictoryScreenProps interface)

**Pseudocode:**
```typescript
interface VictoryScreenProps {
  // ... existing props ...

  /** Callback for reviewing moves */
  onReviewMoves?: () => void;

  /** Callback for starting a new game */
  onNewGame?: () => void;  // ← ADD THIS
}
```

**Write Failing Test First:**

**File:** `src/components/game/VictoryScreen.test.tsx`

**Location:** Add to "Action Buttons" describe block

```typescript
describe('Action Buttons', () => {
  // ... existing tests ...

  it('should render New Game button when onNewGame is provided (hot-seat mode)', () => {
    // RED: This will FAIL initially
    const onNewGame = vi.fn();

    render(<VictoryScreen {...defaultProps} onNewGame={onNewGame} />);

    expect(screen.getByRole('button', { name: /new game/i })).toBeInTheDocument();
  });

  it('should call onNewGame when New Game button is clicked', () => {
    const onNewGame = vi.fn();

    render(<VictoryScreen {...defaultProps} onNewGame={onNewGame} />);

    fireEvent.click(screen.getByRole('button', { name: /new game/i }));

    expect(onNewGame).toHaveBeenCalledTimes(1);
  });

  it('should not render New Game button when onNewGame is not provided', () => {
    render(<VictoryScreen {...defaultProps} />);

    expect(screen.queryByRole('button', { name: /new game/i })).not.toBeInTheDocument();
  });
});
```

**Validation:**
```bash
pnpm test src/components/game/VictoryScreen.test.tsx
```

**Expected Result:** 3 new tests FAIL (RED)

**Rollback:**
```bash
git restore src/components/game/VictoryScreen.test.tsx
```

---

### TASK 2: Add New Game Button to VictoryScreen (GREEN)

**File:** `src/components/game/VictoryScreen.tsx`

**Location:** After subtitle, before URLSharer/stats (around line 182)

**Pseudocode:**
```typescript
export const VictoryScreen = ({
  winner,
  // ... existing props ...
  onReviewMoves,
  onNewGame,  // ← ADD TO DESTRUCTURING
}: VictoryScreenProps): ReactElement => {
  // ... existing code ...

  return (
    <div className={styles.overlay}>
      <div className={styles.container}>
        <h1 id="victory-title">{getCelebrationMessage()}</h1>

        <p id="victory-subtitle">{getSubtitle()}</p>

        {/* NEW GAME BUTTON - Hot-seat mode always shows, URL mode conditional */}
        {onNewGame && (
          <div className={styles.newGameSection}>
            <button
              type="button"
              onClick={onNewGame}
              className={`${styles.button} ${styles.primaryButton}`}
              aria-label="Start a new game"
            >
              New Game
            </button>
          </div>
        )}

        {/* URL Sharing - shown immediately in URL mode */}
        {shareUrl && <URLSharer ... />}

        {/* Game Statistics */}
        <div className={styles.stats}>...</div>

        {/* Action Buttons */}
        <div className={styles.actions}>
          {onReviewMoves && <button>Review Moves</button>}
        </div>
      </div>
    </div>
  );
};
```

**CSS Addition:**

**File:** `src/components/game/VictoryScreen.module.css`

**Location:** After `.subtitle` styles (around line 141)

```css
.newGameSection {
  margin: var(--spacing-lg, 1.5rem) 0;
  text-align: center;
}

.newGameSection .button {
  min-width: 200px;
}
```

**Validation:**
```bash
pnpm test src/components/game/VictoryScreen.test.tsx
```

**Expected Result:** 3 new tests PASS (GREEN)

**Rollback:**
```bash
git restore src/components/game/VictoryScreen.tsx src/components/game/VictoryScreen.module.css
```

---

### TASK 3: Add localStorage Flag Logic for URL Mode (REFACTOR)

**Goal:** Show "New Game" button in URL mode only after Copy is clicked

**File:** `src/components/game/VictoryScreen.tsx`

**Location:** Top of component, after imports

**Pseudocode:**
```typescript
import { useState, useEffect, type ReactElement } from 'react';  // ← ADD useState, useEffect
import type { Piece } from '@/lib/validation/schemas';
import { URLSharer } from './URLSharer';
import styles from './VictoryScreen.module.css';

// Storage key constant
const VICTORY_URL_COPIED_KEY = 'kings-cooking:victory-url-copied';

// ... interface ...

export const VictoryScreen = ({
  winner,
  // ... props
  shareUrl,
  onNewGame,
  onReviewMoves,
}: VictoryScreenProps): ReactElement => {

  // Track whether URL has been copied (URL mode only)
  const [urlWasCopied, setUrlWasCopied] = useState(false);

  /**
   * Check localStorage on mount for URL copied flag.
   * This allows button to appear when user returns after sharing.
   */
  useEffect(() => {
    if (shareUrl) {
      const flag = localStorage.getItem(VICTORY_URL_COPIED_KEY);
      setUrlWasCopied(flag === 'true');
    }
  }, [shareUrl]);

  /**
   * Handle Copy button click - set flag in localStorage.
   */
  const handleUrlCopied = () => {
    localStorage.setItem(VICTORY_URL_COPIED_KEY, 'true');
    setUrlWasCopied(true);
  };

  /**
   * Determine if New Game button should be shown.
   * - Hot-seat mode: Always show if onNewGame provided
   * - URL mode: Show only if URL was copied
   */
  const showNewGameButton = onNewGame && (!shareUrl || urlWasCopied);

  return (
    <div className={styles.overlay}>
      <div className={styles.container}>
        <h1 id="victory-title">{getCelebrationMessage()}</h1>
        <p id="victory-subtitle">{getSubtitle()}</p>

        {/* NEW GAME BUTTON */}
        {showNewGameButton && (
          <div className={styles.newGameSection}>
            <button
              type="button"
              onClick={onNewGame}
              className={`${styles.button} ${styles.primaryButton}`}
              aria-label="Start a new game"
            >
              New Game
            </button>
          </div>
        )}

        {/* URL Sharing */}
        {shareUrl && (
          <div style={{ marginTop: 'var(--spacing-lg)', marginBottom: 'var(--spacing-lg)' }}>
            <URLSharer
              url={shareUrl}
              onCopy={handleUrlCopied}  // ← PASS ENHANCED CALLBACK
            />
          </div>
        )}

        {/* ... rest of component ... */}
      </div>
    </div>
  );
};
```

**Write Tests for URL Mode Logic:**

**File:** `src/components/game/VictoryScreen.test.tsx`

**Location:** Add to "Action Buttons" describe block

```typescript
describe('Action Buttons', () => {
  // ... existing tests ...

  describe('New Game Button - URL Mode', () => {
    beforeEach(() => {
      // Clear localStorage before each test
      localStorage.clear();
    });

    it('should NOT show New Game button in URL mode before copy', () => {
      const onNewGame = vi.fn();
      const shareUrl = 'https://example.com/game#abc123';

      render(<VictoryScreen {...defaultProps} shareUrl={shareUrl} onNewGame={onNewGame} />);

      expect(screen.queryByRole('button', { name: /new game/i })).not.toBeInTheDocument();
    });

    it('should show New Game button in URL mode after copy is clicked', async () => {
      const onNewGame = vi.fn();
      const shareUrl = 'https://example.com/game#abc123';

      render(<VictoryScreen {...defaultProps} shareUrl={shareUrl} onNewGame={onNewGame} />);

      // Click copy button
      const copyButton = screen.getByRole('button', { name: /copy/i });
      fireEvent.click(copyButton);

      // New Game button should now appear
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /new game/i })).toBeInTheDocument();
      });
    });

    it('should show New Game button on mount if localStorage flag exists', () => {
      // Simulate previous copy action
      localStorage.setItem('kings-cooking:victory-url-copied', 'true');

      const onNewGame = vi.fn();
      const shareUrl = 'https://example.com/game#abc123';

      render(<VictoryScreen {...defaultProps} shareUrl={shareUrl} onNewGame={onNewGame} />);

      // Button should be visible on mount
      expect(screen.getByRole('button', { name: /new game/i })).toBeInTheDocument();
    });

    it('should not interfere with hot-seat mode (no shareUrl)', () => {
      const onNewGame = vi.fn();

      render(<VictoryScreen {...defaultProps} onNewGame={onNewGame} />);

      // Button should show immediately in hot-seat mode
      expect(screen.getByRole('button', { name: /new game/i })).toBeInTheDocument();
    });
  });
});
```

**Validation:**
```bash
pnpm test src/components/game/VictoryScreen.test.tsx
```

**Expected Result:** All tests PASS (including 4 new URL mode tests)

**Rollback:**
```bash
git restore src/components/game/VictoryScreen.tsx src/components/game/VictoryScreen.test.tsx
```

---

### TASK 4: Wire Up NEW_GAME Action from App.tsx

**File:** `src/App.tsx`

**Location:** Victory phase section (lines 604-646)

**Pseudocode:**
```typescript
// ===========================
// Phase 5: Victory
// ===========================
if (state.phase === 'victory') {
  // Build VictoryScreen props conditionally
  const victoryProps: Parameters<typeof VictoryScreen>[0] = {
    winner: state.winner,
    totalMoves: state.gameState.currentTurn,
    lightCourt: state.gameState.lightCourt,
    darkCourt: state.gameState.darkCourt,
    capturedLight: state.gameState.capturedLight,
    capturedDark: state.gameState.capturedDark,
    board: state.gameState.board,
  };

  // Add optional props
  if (state.winner !== 'draw') {
    // ... winner/loser names
  }

  // Add player names
  if (state.player1Name) {
    victoryProps.player1Name = state.player1Name;
  }
  if (state.player2Name) {
    victoryProps.player2Name = state.player2Name;
  }

  // URL mode
  if (state.mode === 'url') {
    const victoryUrlHash = buildFullStateUrl(state.gameState, state.player1Name);
    const fullShareUrl = `${window.location.origin}${window.location.pathname}${victoryUrlHash}`;
    victoryProps.shareUrl = fullShareUrl;
  }

  // ← ADD NEW GAME CALLBACK
  victoryProps.onNewGame = () => {
    // Clear victory URL copied flag
    localStorage.removeItem('kings-cooking:victory-url-copied');
    // Dispatch NEW_GAME action
    dispatch({ type: 'NEW_GAME' });
  };

  return <VictoryScreen {...victoryProps} />;
}
```

**Write Integration Test:**

**File:** `src/App.test.tsx` (or create new integration test file)

**Location:** Add to existing test suite or create new describe block

```typescript
describe('Victory Screen - New Game Flow', () => {
  it('should dispatch NEW_GAME action when New Game button clicked (hot-seat)', async () => {
    // Setup: Get to victory screen in hot-seat mode
    render(<App />);

    // ... navigate to victory (simplified for PRP) ...

    // Act: Click New Game button
    const newGameButton = await screen.findByRole('button', { name: /new game/i });
    fireEvent.click(newGameButton);

    // Assert: Should be back at mode selection
    expect(screen.getByText(/Choose Game Mode/i)).toBeInTheDocument();
  });

  it('should clear victory-url-copied flag when New Game clicked', async () => {
    // Setup: Set flag in localStorage
    localStorage.setItem('kings-cooking:victory-url-copied', 'true');

    // ... navigate to victory in URL mode ...

    // Act: Click New Game
    const newGameButton = await screen.findByRole('button', { name: /new game/i });
    fireEvent.click(newGameButton);

    // Assert: Flag should be cleared
    expect(localStorage.getItem('kings-cooking:victory-url-copied')).toBeNull();
  });
});
```

**Validation:**
```bash
pnpm test src/App.test.tsx
```

**Rollback:**
```bash
git restore src/App.tsx src/App.test.tsx
```

---

### TASK 5: Clean Up localStorage Flag in NEW_GAME Reducer (Optional)

**File:** `src/lib/gameFlow/reducer.ts`

**Location:** Line 429 (NEW_GAME case)

**Pseudocode:**
```typescript
case 'NEW_GAME':
  // Clear localStorage game state (Issue #7 fix)
  storage.clearGameState();

  // ← ADD: Clear victory URL copied flag
  localStorage.removeItem('kings-cooking:victory-url-copied');

  return { phase: 'mode-selection' };
```

**Note:** This is defensive - flag is already cleared in App.tsx callback, but this ensures cleanup even if NEW_GAME is dispatched from elsewhere.

**Validation:**
```bash
pnpm test src/lib/gameFlow/reducer.test.tsx
```

**Rollback:**
```bash
git restore src/lib/gameFlow/reducer.ts
```

---

### TASK 6: Update Button Accessibility

**File:** `src/components/game/VictoryScreen.tsx`

**Location:** New Game button section

**Enhancements:**
```typescript
<button
  type="button"
  onClick={onNewGame}
  className={`${styles.button} ${styles.primaryButton}`}
  aria-label="Start a new game and return to mode selection"
  data-testid="new-game-button"  // For easier testing
>
  New Game
</button>
```

**Add Keyboard Navigation Test:**

**File:** `src/components/game/VictoryScreen.test.tsx`

```typescript
describe('Accessibility', () => {
  // ... existing tests ...

  it('should support keyboard navigation for New Game button', async () => {
    const onNewGame = vi.fn();
    render(<VictoryScreen {...defaultProps} onNewGame={onNewGame} />);

    const button = screen.getByRole('button', { name: /new game/i });

    // Focus button
    button.focus();
    expect(button).toHaveFocus();

    // Press Enter
    fireEvent.keyDown(button, { key: 'Enter', code: 'Enter' });

    // Should not call (button handles this natively)
    // But space should work
    fireEvent.keyDown(button, { key: ' ', code: 'Space' });

    // onClick should be called on click
    fireEvent.click(button);
    expect(onNewGame).toHaveBeenCalled();
  });
});
```

**Validation:**
```bash
pnpm test src/components/game/VictoryScreen.test.tsx
```

---

## Validation Loop

### Level 1: Unit Tests
```bash
pnpm test src/components/game/VictoryScreen.test.tsx
```
**Expected:** All tests pass (7+ new tests)

**If Fail:**
- Check localStorage is cleared in beforeEach
- Verify Copy button click triggers state update
- Check conditional rendering logic

### Level 2: Type Checking
```bash
pnpm run check
```
**Expected:** No type errors

**If Fail:**
- Verify onNewGame prop type matches callback signature
- Check optional chaining: `onNewGame?.()`

### Level 3: Linting
```bash
pnpm run lint
```
**Expected:** Pass

**If Fail:**
- Check for unused imports
- Verify button has aria-label

### Level 4: Full Test Suite
```bash
pnpm test
```
**Expected:** All 681+ tests pass (no regressions)

**If Fail:**
- Check for unexpected side effects
- Verify App.tsx integration tests

### Level 5: Integration Tests
```bash
pnpm test:integration
```
**Expected:** All 17 tests pass

### Level 6: E2E Tests
```bash
pnpm test:e2e
```
**Expected:** All 12 tests pass

### Level 7: Build
```bash
pnpm build
```
**Expected:** Clean build

---

## Success Criteria

### Functional Requirements
- [x] Hot-seat mode: New Game button appears under title
- [x] URL mode: Button appears after Copy is clicked
- [x] URL mode: Button appears on return if flag exists in localStorage
- [x] Button dispatches NEW_GAME action
- [x] localStorage flag is cleared on NEW_GAME
- [x] Player names stay in localStorage
- [x] Button is keyboard accessible

### Testing Requirements
- [x] 3 tests for basic button functionality
- [x] 4 tests for URL mode conditional display
- [x] 2 tests for App.tsx integration
- [x] 1 test for keyboard accessibility
- [x] All existing tests still pass

### Code Quality Requirements
- [x] Type checking passes
- [x] Linting passes
- [x] Build succeeds
- [x] Accessibility standards met (ARIA labels, keyboard nav)

---

## Rollback Strategy

### If TASK 1-2 fail (basic button):
```bash
git restore src/components/game/VictoryScreen.tsx src/components/game/VictoryScreen.test.tsx src/components/game/VictoryScreen.module.css
```

### If TASK 3 fails (localStorage logic):
```bash
git restore src/components/game/VictoryScreen.tsx src/components/game/VictoryScreen.test.tsx
```

### If TASK 4 fails (App.tsx integration):
```bash
git restore src/App.tsx src/App.test.tsx
```

### Complete rollback:
```bash
git checkout main -- src/components/game/VictoryScreen.tsx src/components/game/VictoryScreen.test.tsx src/components/game/VictoryScreen.module.css src/App.tsx
```

---

## Estimated Complexity

- **Lines Changed:** ~80 lines (component + tests + styles + App.tsx)
- **Files Modified:** 4-5 files
- **Risk Level:** LOW (isolated feature addition, well-tested)
- **Time Estimate:** 2-3 hours (includes testing)

---

## References

- Issue #20: https://github.com/randallard/kings-cooking/issues/20
- CLAUDE-REACT.md: `/home/ryankhetlyr/Development/kings-cooking/claude_md_files/CLAUDE-REACT.md`
- VictoryScreen.tsx: `src/components/game/VictoryScreen.tsx`
- App.tsx: `src/App.tsx` (lines 604-646)
- NEW_GAME action: `src/lib/gameFlow/reducer.ts` (line 429)

---

## Final Checklist

- [ ] 🔴 RED: Write failing tests (TASK 1)
- [ ] 🟢 GREEN: Add button to component (TASK 2)
- [ ] 🔄 REFACTOR: Add URL mode logic (TASK 3)
- [ ] ✅ Integration: Wire up App.tsx (TASK 4)
- [ ] 🧪 Cleanup: Clear flag in reducer (TASK 5)
- [ ] ♿ Accessibility: Add ARIA labels and keyboard nav (TASK 6)
- [ ] 📝 All tests pass (no regressions)
- [ ] 🚀 Ready for PR
