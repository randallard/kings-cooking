# Task PRP: Fix Mode Switching Bug - Clear Mode on Victory Screen

**Created**: 2025-10-17
**Type**: Bug Fix (Issue #7)
**Status**: Ready for Execution
**Related Issues**: #7 - [BUG] Can't Switch Mode

---

## Goal

Fix the bug where the mode selection screen doesn't appear after completing a game. When a game ends and transitions to the victory phase, clear the saved game mode from localStorage so that navigating back to the base URL shows the mode selection screen.

---

## Why

**Business Value**: Users need to be able to switch between hot-seat and URL modes between games. Currently, they're locked into whichever mode they first selected.

**User Impact**:
- **BEFORE**: After completing a game, navigating to base URL skips mode selection and auto-starts in the previous mode
- **AFTER**: Mode selection screen appears, allowing users to choose hot-seat or URL mode for each new game

**Context from Issue #7**:
- User reported: "mode choice does not appear - game starts in same mode you chose previously"
- Root cause: localStorage stores the selected mode and the app restores it on page load
- User wants: "going to the base path should result in showing the mode choice first and foremost"
- Solution: Clear mode from localStorage when victory screen displays
- Multiple concurrent games will be handled in a separate feature

---

## What (User-Visible Behavior)

### Before Fix
1. User selects "Hot-Seat Mode"
2. Plays game to completion (victory screen appears)
3. Navigates to base URL
4. **BUG**: App skips mode selection, goes directly to setup for hot-seat mode

### After Fix
1. User selects "Hot-Seat Mode"
2. Plays game to completion (victory screen appears)
3. Mode is cleared from localStorage when transitioning to victory phase
4. Navigates to base URL
5. **FIXED**: Mode selection screen appears, user can choose any mode

---

## All Needed Context

### Documentation & Patterns

**React 19 Patterns**: Reference `/home/ryankhetlyr/Development/kings-cooking/claude_md_files/CLAUDE-REACT.md`
- Use `useEffect` hooks for side effects
- Follow TDD: Red → Green → Refactor

**localStorage Patterns**: `src/lib/storage/localStorage.ts`
- Namespaced keys: `kings-cooking:*`
- Validated read/write with Zod schemas
- Helper methods: `storage.getGameMode()`, `storage.setGameMode()`, `storage.clearAll()`
- **NEW METHOD NEEDED**: `storage.clearGameMode()` - clears only the mode key

**Game Flow Reducer**: `src/lib/gameFlow/reducer.ts`
- State machine with 5 phases: mode-selection, setup, playing, handoff, victory
- Transitions to victory phase in two places:
  1. Line 355-363: `CONFIRM_MOVE` action when `victoryResult.gameOver` is true
  2. Line 408-417: `GAME_OVER` action

### Existing Code Patterns

**Victory Phase Transition** (`src/lib/gameFlow/reducer.ts`):
```typescript
// CONFIRM_MOVE action (line 350-377)
case 'CONFIRM_MOVE': {
  if (state.phase !== 'playing' || !state.pendingMove) return state;

  const victoryResult = action.result.engine.checkGameEnd();
  if (victoryResult.gameOver) {
    return {
      phase: 'victory',  // ← Transition to victory phase
      mode: state.mode,
      winner: victoryResult.winner || 'draw',
      gameState: action.result.newState,
      player1Name: state.player1Name,
      player2Name: state.player2Name || 'Player 2',
    };
  }
  // ...
}

// GAME_OVER action (line 408-417)
case 'GAME_OVER':
  if (state.phase !== 'playing') return state;
  return {
    phase: 'victory',  // ← Transition to victory phase
    mode: state.mode,
    winner: action.winner,
    gameState: state.gameState,
    player1Name: state.player1Name,
    player2Name: state.player2Name || 'Player 2',
  };
```

**localStorage Helpers** (`src/lib/storage/localStorage.ts`):
```typescript
// Existing pattern (lines 195-199)
getGameMode: (): 'hotseat' | 'url' | null =>
  getValidatedItem(STORAGE_KEYS.GAME_MODE, GameModeSchema),

setGameMode: (mode: 'hotseat' | 'url'): boolean =>
  setValidatedItem(STORAGE_KEYS.GAME_MODE, mode, GameModeSchema),

// Need to add:
clearGameMode: (): void =>
  removeItem(STORAGE_KEYS.GAME_MODE),
```

**App.tsx Restoration Logic** (lines 57-94):
```typescript
useEffect(() => {
  const savedMode = storage.getGameMode();
  const savedGameState = storage.getGameState();

  if (state.phase === 'mode-selection' && savedMode && savedGameState) {
    // Restores saved game if both mode AND gameState exist
    // If mode is cleared on victory, this won't trigger
  }
}, []);
```

### Gotchas

1. **Two Victory Transition Points**: Must clear mode in BOTH places:
   - `CONFIRM_MOVE` action when game ends naturally
   - `GAME_OVER` action when game is explicitly ended
   - **Solution**: Clear mode in both case statements

2. **Preserve Other Data**: Only clear the mode, NOT:
   - Game state (might want to review game)
   - Player names (convenience for next game)
   - Story panel flags (already seen, don't show again)
   - **Solution**: Use `storage.clearGameMode()` not `storage.clearAll()`

3. **LOAD_FROM_URL Victory Transition**: `src/lib/gameFlow/reducer.ts` line 107-116
   - URL mode can also transition to victory when loading a completed game
   - Must clear mode here too
   - **Solution**: Add mode clearing in `handleUrlLoad` when `victoryResult.gameOver`

4. **React useEffect Dependencies**: App.tsx line 95 has empty deps `[]`
   - useEffect only runs on mount, not when mode is cleared
   - This is actually OK - we want it to run once and check localStorage
   - If mode is cleared, `savedMode` will be null on next page load
   - **No change needed** to App.tsx for this bug fix

---

## Implementation Blueprint

### Task 1: Add `clearGameMode()` Helper to localStorage

**File**: `src/lib/storage/localStorage.ts`

**Changes**:
```typescript
// ADD after setGameMode (line 199)
clearGameMode: (): void =>
  removeItem(STORAGE_KEYS.GAME_MODE),
```

**Why**: Provides clean API for clearing only the game mode key without affecting other localStorage data.

**Validation**:
```bash
pnpm run check  # TypeScript validation
```

**If Fail**:
- Check that `removeItem` is imported (should be at line 139)
- Verify comma after previous method
- Ensure correct indentation (2 spaces)

**Rollback**:
```bash
git checkout src/lib/storage/localStorage.ts
```

---

### Task 2: Add Unit Test for `clearGameMode()`

**File**: `src/lib/storage/localStorage.test.ts`

**Changes**:
```typescript
// ADD in "Game Mode" describe block (after existing setGameMode test)
it('should clear game mode', () => {
  storage.setGameMode('hotseat');
  expect(storage.getGameMode()).toBe('hotseat');

  storage.clearGameMode();
  expect(storage.getGameMode()).toBe(null);
});
```

**Why**: TDD RED phase - test the new helper method.

**Validation**:
```bash
pnpm test -- localStorage.test
```

**Expected**: Test passes (helper is simple, should work immediately)

**If Fail**:
- Check that `clearGameMode` is correctly implemented in Task 1
- Verify localStorage is cleared in beforeEach hook

**Rollback**:
```bash
git checkout src/lib/storage/localStorage.test.ts
```

---

### Task 3: Clear Mode in `CONFIRM_MOVE` Victory Transition

**File**: `src/lib/gameFlow/reducer.ts`

**Changes**:
```typescript
// MODIFY lines 350-364
case 'CONFIRM_MOVE': {
  if (state.phase !== 'playing' || !state.pendingMove) return state;

  // Check for game over
  const victoryResult = action.result.engine.checkGameEnd();
  if (victoryResult.gameOver) {
    // Clear game mode when transitioning to victory (Issue #7 fix)
    storage.clearGameMode();

    return {
      phase: 'victory',
      mode: state.mode,
      winner: victoryResult.winner || 'draw',
      gameState: action.result.newState,
      player1Name: state.player1Name,
      player2Name: state.player2Name || 'Player 2',
    };
  }
  // ... rest unchanged
}
```

**Why**: Clears mode when game ends naturally (most common case).

**Validation**:
```bash
pnpm run check  # TypeScript
pnpm test -- reducer.test  # Unit tests
```

**If Fail**:
- Check that `storage` is imported at top of file
- Verify `clearGameMode` method exists in storage
- Ensure placement is BEFORE the return statement

**Rollback**:
```bash
git checkout src/lib/gameFlow/reducer.ts
```

---

### Task 4: Clear Mode in `GAME_OVER` Victory Transition

**File**: `src/lib/gameFlow/reducer.ts`

**Changes**:
```typescript
// MODIFY lines 408-417
case 'GAME_OVER':
  if (state.phase !== 'playing') return state;

  // Clear game mode when transitioning to victory (Issue #7 fix)
  storage.clearGameMode();

  return {
    phase: 'victory',
    mode: state.mode,
    winner: action.winner,
    gameState: state.gameState,
    player1Name: state.player1Name,
    player2Name: state.player2Name || 'Player 2',
  };
```

**Why**: Clears mode when game is explicitly ended via GAME_OVER action.

**Validation**:
```bash
pnpm run check
pnpm test -- reducer.test
```

**If Fail**: Same as Task 3

**Rollback**:
```bash
git checkout src/lib/gameFlow/reducer.ts
```

---

### Task 5: Clear Mode in `LOAD_FROM_URL` Victory Transition

**File**: `src/lib/gameFlow/reducer.ts`

**Changes**:
```typescript
// MODIFY lines 107-117 in handleUrlLoad function
if (victoryResult && victoryResult.gameOver) {
  // Clear game mode when loading completed game (Issue #7 fix)
  storage.clearGameMode();

  // Game is over - go to victory phase
  return {
    phase: 'victory',
    mode: 'url',
    winner: victoryResult.winner || 'draw',
    gameState: payload.gameState,
    player1Name,
    player2Name: player2Name || myName || 'Player 2',
  };
}
```

**Why**: Covers URL mode case when loading a completed game from URL.

**Validation**:
```bash
pnpm run check
pnpm test -- reducer.test
```

**If Fail**: Same as Task 3

**Rollback**:
```bash
git checkout src/lib/gameFlow/reducer.ts
```

---

### Task 6: Add Regression Test for Victory Mode Clearing

**File**: `src/lib/gameFlow/reducer.test.ts`

**Changes**:
```typescript
// ADD new describe block at end of file (before closing brace)
describe('Issue #7: Clear Mode on Victory', () => {
  it('should clear game mode when CONFIRM_MOVE triggers victory', () => {
    // Setup: Create playing state with hotseat mode
    const playingState: GameFlowState = {
      phase: 'playing',
      mode: 'hotseat',
      player1Name: 'Alice',
      player2Name: 'Bob',
      gameState: mockGameState,
      selectedPosition: null,
      legalMoves: [],
      pendingMove: { from: [0, 0], to: [0, 1] },
    };

    // Save mode to localStorage
    storage.setGameMode('hotseat');
    expect(storage.getGameMode()).toBe('hotseat');

    // Mock engine that indicates game is over
    const mockEngine = {
      checkGameEnd: () => ({ gameOver: true, winner: 'white' as const }),
    };

    // Action: Confirm move that ends game
    const action: GameFlowAction = {
      type: 'CONFIRM_MOVE',
      result: {
        success: true,
        newState: mockGameState,
        engine: mockEngine as any,
      },
    };

    // Execute reducer
    const newState = gameFlowReducer(playingState, action);

    // Assert: Phase is victory
    expect(newState.phase).toBe('victory');

    // Assert: Game mode was cleared from localStorage
    expect(storage.getGameMode()).toBe(null);
  });

  it('should clear game mode when GAME_OVER action is dispatched', () => {
    const playingState: GameFlowState = {
      phase: 'playing',
      mode: 'url',
      player1Name: 'Alice',
      player2Name: 'Bob',
      gameState: mockGameState,
      selectedPosition: null,
      legalMoves: [],
      pendingMove: null,
    };

    storage.setGameMode('url');
    expect(storage.getGameMode()).toBe('url');

    const action: GameFlowAction = {
      type: 'GAME_OVER',
      winner: 'black',
    };

    const newState = gameFlowReducer(playingState, action);

    expect(newState.phase).toBe('victory');
    expect(storage.getGameMode()).toBe(null);
  });
});
```

**Why**: TDD - ensures mode is cleared on victory and prevents regression.

**Validation**:
```bash
pnpm test -- reducer.test
```

**Expected**: Both new tests pass

**If Fail**:
- Check that `storage.clearGameMode()` is called in victory transitions
- Verify mock setup matches actual state structure
- Ensure localStorage is cleared in beforeEach

**Rollback**:
```bash
git checkout src/lib/gameFlow/reducer.test.ts
```

---

### Task 7: Run Full Validation Suite

**Validation Commands**:
```bash
# Level 1: Type checking
pnpm run check

# Level 2: Linting
pnpm run lint

# Level 3: Unit tests
pnpm test

# Level 4: Production build
pnpm build
```

**Expected Results**:
- TypeScript: 0 errors
- ESLint: 0 warnings
- Tests: All passing (+2 new tests for clearGameMode)
- Build: Successful

**If Fail**:
- Review error messages
- Run specific test files to isolate issues
- Check that all tasks completed successfully
- Verify imports are correct

**Rollback**:
```bash
git checkout src/lib/storage/localStorage.ts
git checkout src/lib/storage/localStorage.test.ts
git checkout src/lib/gameFlow/reducer.ts
git checkout src/lib/gameFlow/reducer.test.ts
```

---

## Task Checklist

- [ ] Task 1: Add `clearGameMode()` helper to localStorage
- [ ] Task 2: Add unit test for `clearGameMode()`
- [ ] Task 3: Clear mode in CONFIRM_MOVE victory transition
- [ ] Task 4: Clear mode in GAME_OVER victory transition
- [ ] Task 5: Clear mode in LOAD_FROM_URL victory transition
- [ ] Task 6: Add regression tests for victory mode clearing
- [ ] Task 7: Run full validation suite

---

## Validation Strategy

### Unit Testing
- After Task 2: Test clearGameMode() helper
- After Task 6: Test mode clearing in reducer actions

### Integration Testing
- No new integration tests needed (covered by existing App.test.tsx)

### Manual Testing Checklist
- [ ] Start new game in hot-seat mode
- [ ] Play to victory screen
- [ ] Navigate to base URL (refresh page or go to /)
- [ ] Verify mode selection screen appears
- [ ] Repeat for URL mode
- [ ] Verify other localStorage data is preserved (player names, story flags)

---

## Rollback Strategy

**Per-Task Rollback**: Use `git checkout` commands provided in each task

**Full Rollback**:
```bash
git checkout src/lib/storage/localStorage.ts
git checkout src/lib/storage/localStorage.test.ts
git checkout src/lib/gameFlow/reducer.ts
git checkout src/lib/gameFlow/reducer.test.ts
git reset --hard HEAD  # Nuclear option
```

---

## Risk Assessment

**Low Risk**:
- Simple change: clear one localStorage key
- No state management changes
- No UI changes
- No game logic changes
- Narrow scope with clear rollback

**Potential Issues**:

1. **Side Effect on Game Restoration**: Clearing mode might affect restoration logic
   - **Mitigation**: Only clears mode, preserves gameState
   - **Validation**: Manual testing of page refresh during active game
   - **Fallback**: User can select mode again (expected behavior)

2. **Edge Cases**:
   - User clicks browser back after victory → Still shows mode selection (GOOD)
   - User refreshes on victory screen → Mode is already cleared (OK)
   - Multiple tabs open → Each tab clears mode independently (OK)

---

## Success Criteria

- ✅ `clearGameMode()` helper added to localStorage
- ✅ Mode is cleared when transitioning to victory phase (all 3 paths)
- ✅ Mode selection screen appears after game completion
- ✅ All TypeScript checks pass (0 errors)
- ✅ All ESLint checks pass (0 warnings)
- ✅ All tests pass (+2 new tests)
- ✅ Production build succeeds
- ✅ Manual testing checklist complete
- ✅ No regressions in other functionality

---

## Assumptions

1. Victory screen is the correct place to clear mode (not "New Game" button)
2. User wants mode selection for EVERY new game (no "remember my preference")
3. Other localStorage data should be preserved (game state, player names, flags)
4. Multiple concurrent games will be handled in a future feature
5. No localStorage migration needed (just start clearing mode going forward)

---

## Notes

- This is a focused bug fix - intentionally narrow scope
- Multiple concurrent games (#6) will require namespacing localStorage by game ID
- Story panel flags should remain (already seen by players)
- Player names could be preserved for convenience (not part of this fix)
- TDD approach: Red → Green → Refactor
- Reference CLAUDE-REACT.md for React 19 patterns

---

**END OF TASK PRP**
