# Task PRP: Fix Player 2 Name Form Timing in Hot-Seat Mirrored Mode

**Issue**: #31
**Branch**: `issue-31-fix-player2-name-timing`
**Severity**: 🔥 Critical (incorrect game flow)
**Type**: Bug Fix

---

## Goal

Fix timing of Player 2 name form in hot-seat mirrored mode to appear **after** Player 1's first move instead of **after** piece selection.

---

## Why This Matters

**User Impact**: Currently, the game flow is confusing and incorrect:
- Player 1 selects pieces
- **BUG**: Player 2 name form appears immediately
- Player 1 makes first move
- Player 2 sees game board

**Business Value**: Correct game flow improves UX and maintains logical turn-based progression

---

## What Changes (User-Visible Behavior)

### Current (Incorrect) Flow
1. Player 1 enters name
2. Player 1 chooses color
3. Player 1 chooses selection mode (mirrored)
4. Player 1 selects pieces
5. ❌ **Player 2 name form appears** (WRONG - before Player 1's move)
6. Player 1 makes first move
7. Handoff screen appears
8. Player 2 sees game board

### Desired (Correct) Flow
1. Player 1 enters name
2. Player 1 chooses color
3. Player 1 chooses selection mode (mirrored)
4. Player 1 selects pieces
5. ✅ **Player 1 sees game board and makes first move**
6. Handoff screen appears: "Pass device to Player 2"
7. Player 2 clicks Continue
8. ✅ **Player 2 name form appears** (CORRECT - after Player 1's move)
9. Player 2 enters name
10. Story panel appears (if not seen)
11. Player 2 sees game board

---

## All Needed Context

### Architecture Overview

**Game Flow State Machine** (`src/types/gameFlow.ts`, `src/lib/gameFlow/reducer.ts`):
- 7 phases: mode-selection → setup → color-selection → piece-selection → playing → handoff → victory
- Actions trigger transitions via `gameFlowReducer`
- Hot-seat mode uses handoff phase for device passing between players

**Key Files**:
- `src/lib/gameFlow/reducer.ts`: State machine logic
- `src/types/gameFlow.ts`: Phase and action type definitions
- `src/App.tsx`: React component rendering each phase

### Root Cause Analysis

**Location**: `src/lib/gameFlow/reducer.ts:371-465` (`COMPLETE_PIECE_SELECTION` case)

**Bug Code** (lines 382-398):
```typescript
// In hot-seat mode, check if player2Name is missing (only for mirrored/random modes)
if (state.selectionMode !== 'independent' &&
    state.mode === 'hotseat' &&
    (!state.player2Name || state.player2Name.trim().length === 0)) {
  // Transition to handoff to collect player 2's name
  return {
    phase: 'handoff',
    mode: state.mode,
    player1Name: state.player1Name,
    player2Name: '',
    // Store piece selection data to use after name collection
    selectionMode: state.selectionMode,
    player1Pieces: state.player1Pieces,
    player2Pieces: state.player2Pieces,
    player1Color: state.player1Color,
    gameState: null as never, // Will be created after name collection
  };
}
```

**Why This Is Wrong**: Transitions to handoff phase **immediately after piece selection**, triggering name entry before Player 1's first move.

### Pattern References

**Existing Handoff Transition** (`reducer.ts:510-520`, `CONFIRM_MOVE` case):
```typescript
// Transition to handoff
return {
  phase: 'handoff',
  mode: state.mode,
  player1Name: state.player1Name,
  player2Name: state.player2Name || '', // Prompt if empty
  gameState: action.result.newState,
  lastMove: state.pendingMove,
  countdown: 3, // Hot-seat countdown
  generatedUrl: null,
};
```

**Handoff Phase Rendering** (`App.tsx:513-648`):
- Lines 517-520: If `player2Name` empty → show `Player2NameEntryScreen`
- Lines 524-547: If `gameState` null (from piece-selection) → show "Ready to Play" button
- Lines 550-570: Normal handoff with countdown and privacy screen

### Gotchas

1. **Independent Mode vs. Mirrored Mode**: Bug only affects mirrored/random modes where Player 2 name is collected after Player 1 setup
2. **Handoff Phase Dual Purpose**: Currently used both for (1) post-piece-selection name collection AND (2) post-move device passing
3. **Game State Creation**: Must happen with placeholder "Player 2" name, then update after real name collected
4. **React State in App.tsx**: Need local state to track "handoff completed, show name entry" for correct flow
5. **Don't Break URL Mode**: Changes must not affect URL mode flow

---

## Implementation Blueprint

### Task Sequence

```
1. REMOVE: Early handoff trigger in COMPLETE_PIECE_SELECTION
2. ADD: Check for missing player2Name in CONFIRM_MOVE
3. MODIFY: Handoff phase rendering in App.tsx to handle two-step flow
4. UPDATE: Tests for new flow
5. VALIDATE: All test suites pass
```

### Task 1: Remove Early Handoff Trigger

**FILE**: `src/lib/gameFlow/reducer.ts`
**OPERATION**: Delete lines 382-398 (the problematic check)
**LOCATION**: Inside `COMPLETE_PIECE_SELECTION` case (line 371)

**Before** (lines 371-399):
```typescript
case 'COMPLETE_PIECE_SELECTION': {
  if (state.phase !== 'piece-selection') return state;
  if (
    !state.selectionMode ||
    !state.player1Pieces ||
    !state.player2Pieces ||
    !state.player1Color
  ) {
    return state;
  }

  // In hot-seat mode, check if player2Name is missing (only for mirrored/random modes)
  if (state.selectionMode !== 'independent' &&
      state.mode === 'hotseat' &&
      (!state.player2Name || state.player2Name.trim().length === 0)) {
    // Transition to handoff to collect player 2's name
    return {
      phase: 'handoff',
      mode: state.mode,
      player1Name: state.player1Name,
      player2Name: '',
      // Store piece selection data to use after name collection
      selectionMode: state.selectionMode,
      player1Pieces: state.player1Pieces,
      player2Pieces: state.player2Pieces,
      player1Color: state.player1Color,
      gameState: null as never, // Will be created after name collection
    };
  }

  // Create board with selected pieces
  const board = createBoardWithPieces(
```

**After**:
```typescript
case 'COMPLETE_PIECE_SELECTION': {
  if (state.phase !== 'piece-selection') return state;
  if (
    !state.selectionMode ||
    !state.player1Pieces ||
    !state.player2Pieces ||
    !state.player1Color
  ) {
    return state;
  }

  // Create board with selected pieces
  const board = createBoardWithPieces(
```

**WHY**: This removes the early handoff trigger, allowing game to proceed to playing phase

**VALIDATE**: `pnpm run check:types` - no TypeScript errors

---

### Task 2: Update Game State Creation to Use Placeholder

**FILE**: `src/lib/gameFlow/reducer.ts`
**OPERATION**: Ensure player2Name defaults to empty string when missing
**LOCATION**: Lines 409-416 (lightPlayer/darkPlayer creation)

**Before** (lines 409-416):
```typescript
const lightPlayer = {
  id: crypto.randomUUID() as never,
  name: state.player1Color === 'light' ? state.player1Name : state.player2Name || 'Player 2',
};
const darkPlayer = {
  id: crypto.randomUUID() as never,
  name: state.player1Color === 'light' ? state.player2Name || 'Player 2' : state.player1Name,
};
```

**After** (NO CHANGE - already uses 'Player 2' placeholder):
```typescript
// This code is already correct - it uses 'Player 2' as placeholder
const lightPlayer = {
  id: crypto.randomUUID() as never,
  name: state.player1Color === 'light' ? state.player1Name : state.player2Name || 'Player 2',
};
const darkPlayer = {
  id: crypto.randomUUID() as never,
  name: state.player1Color === 'light' ? state.player2Name || 'Player 2' : state.player1Name,
};
```

**WHY**: No change needed - code already handles empty player2Name correctly

**VALIDATE**: `pnpm run check:types` - no TypeScript errors

---

### Task 3: Add Player2 Name Check in CONFIRM_MOVE

**FILE**: `src/lib/gameFlow/reducer.ts`
**OPERATION**: Add check for missing player2Name after first move
**LOCATION**: Lines 491-521 (`CONFIRM_MOVE` case)

**Before** (lines 509-520):
```typescript
// Transition to handoff
return {
  phase: 'handoff',
  mode: state.mode,
  player1Name: state.player1Name,
  player2Name: state.player2Name || '', // Prompt if empty
  gameState: action.result.newState,
  lastMove: state.pendingMove,
  countdown: 3, // Hot-seat countdown
  generatedUrl: null, // URL mode: will be set by URL_GENERATED action
};
```

**After**:
```typescript
// Check if this is first move in hot-seat mode with missing player2Name
const isFirstMove = action.result.newState.currentTurn === 1;
const needsPlayer2Name = state.mode === 'hotseat' &&
                        (!state.player2Name ||
                         state.player2Name.trim().length === 0 ||
                         state.player2Name === 'Player 2');

// Transition to handoff
return {
  phase: 'handoff',
  mode: state.mode,
  player1Name: state.player1Name,
  // Force empty string to trigger name entry in App.tsx
  player2Name: (isFirstMove && needsPlayer2Name) ? '' : (state.player2Name || ''),
  gameState: action.result.newState,
  lastMove: state.pendingMove,
  countdown: 3, // Hot-seat countdown
  generatedUrl: null, // URL mode: will be set by URL_GENERATED action
};
```

**WHY**: Ensures player2Name is empty string on first move if missing, triggering name collection flow in App.tsx

**VALIDATE**: `pnpm run check:types` - no TypeScript errors

---

### Task 4: Modify Handoff Phase Rendering in App.tsx

**FILE**: `src/App.tsx`
**OPERATION**: Add two-step flow (handoff screen → name entry) when player2Name empty after a move
**LOCATION**: Lines 513-571 (handoff phase rendering)

**STRATEGY**: Add React state to track whether handoff screen was shown

**Before** (lines 513-571):
```typescript
// Phase 5: Handoff
if (state.phase === 'handoff') {
  // Hot-seat mode: Show privacy screen with "I'm Ready" button
  if (state.mode === 'hotseat') {
    // If player2Name is empty on first handoff, prompt for name
    if (!state.player2Name || state.player2Name.trim().length === 0) {
      // Separate component to properly use hooks
      return <Player2NameEntryScreen dispatch={dispatch} />;
    }

    // gameState might be null if coming from piece-selection
    // In that case, the COMPLETE_HANDOFF will create it
    if (!state.gameState) {
      // Coming from piece-selection, just show a simple "Continue" button
      return (
        <div style={{
          maxWidth: '600px',
          margin: '0 auto',
          padding: 'var(--spacing-xl)',
        }}>
          <h1 style={{ textAlign: 'center', marginBottom: 'var(--spacing-lg)' }}>
            Ready to Play!
          </h1>
          <div className="card">
            <p style={{ marginBottom: 'var(--spacing-md)', textAlign: 'center' }}>
              All players are set. Click Continue to start the game!
            </p>
            <button
              onClick={() => dispatch({ type: 'COMPLETE_HANDOFF' })}
              style={{ width: '100%' }}
            >
              Continue to Game
            </button>
          </div>
        </div>
      );
    }

    // Show HandoffScreen with countdown (normal turn-based handoff)
    const previousPlayer = state.gameState.currentPlayer === 'light' ? 'dark' : 'light';
    const previousPlayerName = previousPlayer === 'light'
      ? (state.player1Name || 'Light')
      : (state.player2Name || 'Dark');
    const nextPlayerName = state.gameState.currentPlayer === 'light'
      ? (state.player1Name || 'Light')
      : (state.player2Name || 'Dark');

    return (
      <HandoffScreen
        nextPlayer={state.gameState.currentPlayer}
        nextPlayerName={nextPlayerName}
        previousPlayer={previousPlayer}
        previousPlayerName={previousPlayerName}
        onContinue={() => {
          dispatch({ type: 'COMPLETE_HANDOFF' });
        }}
        countdownSeconds={3}
      />
    );
  } else {
    // URL mode handling...
```

**After**:
```typescript
// Phase 5: Handoff
if (state.phase === 'handoff') {
  // Hot-seat mode: Show privacy screen with "I'm Ready" button
  if (state.mode === 'hotseat') {
    // Check if player2Name is missing
    const needsPlayer2Name = !state.player2Name || state.player2Name.trim().length === 0;

    // Check if we're coming from a move (gameState exists) vs. piece-selection (gameState null)
    const comingFromMove = state.gameState !== null;

    if (needsPlayer2Name && comingFromMove) {
      // NEW: Two-step flow for name collection after first move
      // Step 1: Show handoff screen
      // Step 2: Show name entry after continue
      const [handoffCompleted, setHandoffCompleted] = useState(false);

      if (!handoffCompleted) {
        // Show handoff screen first
        const previousPlayer = state.gameState.currentPlayer === 'light' ? 'dark' : 'light';
        const previousPlayerName = state.player1Name || 'Light'; // Previous player is always Player 1 on first move

        return (
          <HandoffScreen
            nextPlayer={state.gameState.currentPlayer}
            nextPlayerName="Player 2" // Name not known yet
            previousPlayer={previousPlayer}
            previousPlayerName={previousPlayerName}
            onContinue={() => {
              setHandoffCompleted(true);
            }}
            countdownSeconds={3}
          />
        );
      } else {
        // After handoff completed, show name entry
        return <Player2NameEntryScreen dispatch={dispatch} />;
      }
    }

    if (needsPlayer2Name && !comingFromMove) {
      // OLD: Coming from piece-selection (this code path should never execute after our fix)
      console.warn('Unexpected flow: piece-selection → handoff for name entry');
      return <Player2NameEntryScreen dispatch={dispatch} />;
    }

    // gameState might be null if coming from piece-selection (legacy fallback)
    if (!state.gameState) {
      return (
        <div style={{
          maxWidth: '600px',
          margin: '0 auto',
          padding: 'var(--spacing-xl)',
        }}>
          <h1 style={{ textAlign: 'center', marginBottom: 'var(--spacing-lg)' }}>
            Ready to Play!
          </h1>
          <div className="card">
            <p style={{ marginBottom: 'var(--spacing-md)', textAlign: 'center' }}>
              All players are set. Click Continue to start the game!
            </p>
            <button
              onClick={() => dispatch({ type: 'COMPLETE_HANDOFF' })}
              style={{ width: '100%' }}
            >
              Continue to Game
            </button>
          </div>
        </div>
      );
    }

    // Show HandoffScreen with countdown (normal turn-based handoff with both names known)
    const previousPlayer = state.gameState.currentPlayer === 'light' ? 'dark' : 'light';
    const previousPlayerName = previousPlayer === 'light'
      ? (state.player1Name || 'Light')
      : (state.player2Name || 'Dark');
    const nextPlayerName = state.gameState.currentPlayer === 'light'
      ? (state.player1Name || 'Light')
      : (state.player2Name || 'Dark');

    return (
      <HandoffScreen
        nextPlayer={state.gameState.currentPlayer}
        nextPlayerName={nextPlayerName}
        previousPlayer={previousPlayer}
        previousPlayerName={previousPlayerName}
        onContinue={() => {
          dispatch({ type: 'COMPLETE_HANDOFF' });
        }}
        countdownSeconds={3}
      />
    );
  } else {
    // URL mode handling...
```

**PROBLEM**: `useState` cannot be used conditionally!

**REVISED SOLUTION**: Move state outside the conditional

**CORRECT IMPLEMENTATION**:

Add state at top of App component (line 88):
```typescript
// Story panel visibility state
const [showStoryPanel, setShowStoryPanel] = useState(false);

// ADD: Handoff step tracking for Player 2 name collection
const [handoffStepCompleted, setHandoffStepCompleted] = useState(false);
```

Reset state when entering handoff phase (add useEffect around line 211):
```typescript
// Reset handoff step when phase changes
useEffect(() => {
  if (state.phase === 'handoff') {
    setHandoffStepCompleted(false);
  }
}, [state.phase]);
```

Then use the state in handoff rendering (lines 513-571):
```typescript
// Phase 5: Handoff
if (state.phase === 'handoff') {
  // Hot-seat mode: Show privacy screen with "I'm Ready" button
  if (state.mode === 'hotseat') {
    // Check if player2Name is missing
    const needsPlayer2Name = !state.player2Name || state.player2Name.trim().length === 0;

    // Check if we're coming from a move (gameState exists)
    const comingFromMove = state.gameState !== null;

    if (needsPlayer2Name && comingFromMove) {
      // Two-step flow: Handoff screen → Name entry
      if (!handoffStepCompleted) {
        // Step 1: Show handoff screen
        const previousPlayer = state.gameState.currentPlayer === 'light' ? 'dark' : 'light';
        const previousPlayerName = state.player1Name || 'Light';

        return (
          <HandoffScreen
            nextPlayer={state.gameState.currentPlayer}
            nextPlayerName="Player 2"
            previousPlayer={previousPlayer}
            previousPlayerName={previousPlayerName}
            onContinue={() => {
              setHandoffStepCompleted(true);
            }}
            countdownSeconds={3}
          />
        );
      } else {
        // Step 2: Show name entry
        return <Player2NameEntryScreen dispatch={dispatch} />;
      }
    }

    // Rest of handoff logic unchanged...
```

**WHY**: Implements correct flow: handoff screen first, then name entry

**VALIDATE**:
- `pnpm run check:types` - no TypeScript errors
- Manual test: Verify handoff screen appears before name entry

---

## Validation Strategy

### Level 1: TypeScript Compilation
```bash
pnpm run check:types
```
**Expected**: ✅ No errors

### Level 2: Unit Tests
```bash
pnpm test src/lib/gameFlow/reducer.test.ts
```
**Expected**: ✅ All tests pass

**NEW TESTS NEEDED** (add to `reducer.test.ts`):
1. Test `COMPLETE_PIECE_SELECTION` no longer triggers handoff in mirrored mode
2. Test `COMPLETE_PIECE_SELECTION` creates game with 'Player 2' placeholder
3. Test `CONFIRM_MOVE` sets empty player2Name on first move if missing
4. Test `CONFIRM_MOVE` preserves player2Name on subsequent moves

### Level 3: Integration Tests
```bash
pnpm test:integration
```
**Expected**: ✅ All tests pass

**UPDATE**: Any tests that expect old flow (name entry after piece selection)

### Level 4: E2E Tests
```bash
pnpm test:e2e
```
**Expected**: ✅ All tests pass

**NEW E2E TEST NEEDED**:
```typescript
test('Hot-seat mirrored: Player 2 name collected after first move', async ({ page }) => {
  // 1. Select hot-seat mode
  await page.click('[data-testid="hotseat-mode-button"]');

  // 2. Enter Player 1 name
  await page.fill('[data-testid="player-name-input"]', 'Alice');
  await page.click('button:has-text("Continue")');

  // 3. Select color
  await page.click('[data-testid="light-color-button"]');

  // 4. Select mirrored mode
  await page.click('[data-testid="mirrored-mode-button"]');

  // 5. Select pieces
  // ... piece selection logic ...
  await page.click('button:has-text("Start Game")');

  // 6. VERIFY: Game board appears (NOT name form)
  await expect(page.locator('[data-testid="game-board"]')).toBeVisible();
  await expect(page.locator('h1:has-text("Player 2\'s Turn")')).not.toBeVisible();

  // 7. Make first move
  await page.click('[data-testid="piece-0-0"]'); // Select piece
  await page.click('[data-testid="square-0-1"]'); // Move to square
  await page.click('button:has-text("Confirm Move")');

  // 8. VERIFY: Handoff screen appears
  await expect(page.locator('h2:has-text("Pass the device to Player 2")')).toBeVisible();

  // 9. Click continue or wait for countdown
  await page.click('button:has-text("Skip Countdown")');

  // 10. VERIFY: Player 2 name form appears
  await expect(page.locator('h1:has-text("Player 2\'s Turn")')).toBeVisible();
  await expect(page.locator('h2:has-text("Enter Your Name")')).toBeVisible();

  // 11. Enter Player 2 name
  await page.fill('[data-testid="player-name-input"]', 'Bob');
  await page.click('button:has-text("Continue to Game")');

  // 12. VERIFY: Game board appears for Player 2
  await expect(page.locator('[data-testid="game-board"]')).toBeVisible();
});
```

### Level 5: Manual Testing
**Test Cases**:
1. ✅ Hot-seat mirrored: Player 2 name appears after first move
2. ✅ Hot-seat independent: Player 2 name collected during piece selection (unchanged)
3. ✅ Hot-seat random: Player 2 name appears after first move
4. ✅ URL mode: No regression (Player 2 name flow unchanged)
5. ✅ Handoff screen shows correct player names
6. ✅ Story panel appears at correct time

---

## Rollback Strategy

If this fix breaks the game flow:

1. **Revert Reducer Changes**:
```bash
git diff HEAD src/lib/gameFlow/reducer.ts > /tmp/reducer-changes.patch
git checkout HEAD -- src/lib/gameFlow/reducer.ts
```

2. **Revert App.tsx Changes**:
```bash
git checkout HEAD -- src/App.tsx
```

3. **Run Tests**:
```bash
pnpm test && pnpm run check:types
```

4. **If Tests Pass**: Push revert commit
```bash
git add src/lib/gameFlow/reducer.ts src/App.tsx
git commit -m "revert: rollback Player 2 name timing fix (Issue #31)"
git push
```

---

## Debug Strategies

### Issue: Name form still appears after piece selection

**Debug Steps**:
1. Add console.log in `COMPLETE_PIECE_SELECTION`:
```typescript
console.log('COMPLETE_PIECE_SELECTION:', {
  selectionMode: state.selectionMode,
  mode: state.mode,
  player2Name: state.player2Name,
  willTransitionToHandoff: false // Should always be false after fix
});
```

2. Check if early handoff code was fully removed (lines 382-398 deleted)

3. Verify game state created with placeholder:
```typescript
console.log('Created game state:', {
  lightPlayer: lightPlayer.name,
  darkPlayer: darkPlayer.name,
});
```

### Issue: Handoff doesn't show before name entry

**Debug Steps**:
1. Add console.log in App.tsx handoff phase:
```typescript
console.log('Handoff phase:', {
  mode: state.mode,
  needsPlayer2Name,
  comingFromMove,
  handoffStepCompleted,
  gameState: state.gameState !== null,
});
```

2. Verify `handoffStepCompleted` state is being reset on phase change

3. Check `onContinue` callback is updating state correctly

### Issue: Tests failing

**Debug Steps**:
1. Run tests in watch mode:
```bash
pnpm test --watch
```

2. Check test expectations match new flow

3. Update test mocks if needed

---

## Performance Impact

**Expected**: Negligible
- No additional renders beyond existing handoff flow
- Single additional React state variable
- No new API calls or heavy computations

---

## Security Considerations

**None** - This is a UI flow change with no security implications

---

## Accessibility Considerations

**Maintained**:
- HandoffScreen already has WCAG 2.1 AA compliance
- Player2NameEntryScreen uses accessible NameForm component
- Keyboard navigation preserved
- Screen reader announcements maintained

---

## Mobile Responsiveness

**Maintained**:
- All components already mobile-responsive
- No new CSS changes needed
- Touch interactions unchanged

---

## Related Files

**Modified**:
- `src/lib/gameFlow/reducer.ts` - Remove early handoff, add first-move check
- `src/App.tsx` - Add two-step handoff flow

**Tests to Update**:
- `src/lib/gameFlow/reducer.test.ts` - Update/add unit tests
- `src/test/e2e/` - Add E2E test for new flow

**Reference Documentation**:
- `/home/ryankhetlyr/Development/kings-cooking/claude_md_files/CLAUDE-REACT.md` - React 19 patterns
- `src/types/gameFlow.ts` - Type definitions
- `src/components/game/HandoffScreen.tsx` - Handoff component

---

## Success Criteria

✅ Player 2 name form appears **after** Player 1's first move in hot-seat mirrored mode
✅ Handoff screen appears before name form
✅ All existing tests pass
✅ No regression in URL mode or independent mode
✅ TypeScript compilation succeeds
✅ WCAG 2.1 AA accessibility maintained
✅ Mobile-responsive design maintained

---

## Estimated Effort

**Implementation**: 1-2 hours
**Testing**: 1 hour
**Total**: 2-3 hours
