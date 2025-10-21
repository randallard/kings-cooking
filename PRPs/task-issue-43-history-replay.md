# Task PRP: Implement History Replay Controls (#43)

**Issue**: https://github.com/randallard/kings-cooking/issues/43
**Branch**: `issue-43-history-replay`
**Priority**: 🔥 Critical (blocking other work)
**Complexity**: 🟢 Simple (1-2 days)

## Goal

Implement playback controls (back/forward/return) to allow players to review game history move-by-move in both hot-seat and URL modes.

## Context

### Feature Summary
Players can review all moves that have been made by stepping backward and forward through history. The board displays historical game states, and piece selection is disabled until returning to the current/latest move.

### User Experience Flow

**Review History**:
1. Player clicks "Back" button → board shows previous move state
2. Continue clicking "Back" → step through history to start
3. Click "Forward" → step forward through history
4. Click "Return" (refresh icon) → jump back to latest/current move
5. Indicator shows "Viewing move 5 of 12" 

**Interaction States**:
- **At Latest Move**: Back enabled, Forward disabled, can make moves
- **Viewing History**: Back enabled (unless at move 0), Forward enabled, cannot make moves
- **At Move 0**: Back disabled, Forward enabled, cannot make moves

### Design Decisions (from context gathering)

1. ✅ **Layout**: `[← Back] [Forward →] [Return ↻] | [Confirm Move]` (grouped controls)
2. ✅ **Button States**:
   - Back: disabled at move 0
   - Forward: disabled at latest move
   - Return: hidden when at latest move
   - Confirm: disabled when viewing history (already implemented)
3. ✅ **Indicator**: Show "Viewing move X of Y" 
4. ✅ **Board Interaction**: View-only when not at latest (disable piece selection/movement)
5. ✅ **Mode Support**: Works independently in both hot-seat and URL modes
6. ✅ **No Handoff**: Don't show handoff screen when returning to current in hot-seat

### Related Files

**Files to Create**:
- `src/components/game/PlaybackControls.tsx` - New playback UI component
- `src/components/game/PlaybackControls.module.css` - Playback styles
- `src/components/game/PlaybackControls.test.tsx` - Playback tests

**Files to Modify**:
- `src/App.tsx` - Add history navigation state and handlers
- `src/components/game/GameBoard.tsx` - Add `isViewOnly` prop to disable interactions

**Existing Resources**:
- `src/lib/validation/schemas.ts` - GameState.moveHistory array already exists
- `src/components/game/MoveConfirmButton.tsx` - Already supports disabled state
- `src/lib/chess/KingsChessEngine.ts` - Can reconstruct game state from move history

### Technical Patterns

**State Management** (React 19 patterns from CLAUDE-REACT.md):
```typescript
// App.tsx - Add history navigation state
const [historyIndex, setHistoryIndex] = useState<number | null>(null);

// Derived state: are we viewing history?
const isViewingHistory = historyIndex !== null;

// Derived state: what board state to display?
const displayedGameState = useMemo(() => {
  if (!isViewingHistory || state.phase !== 'playing') {
    return state.gameState; // Show current
  }
  // Reconstruct historical state from move history
  return reconstructGameStateAtMove(state.gameState, historyIndex);
}, [historyIndex, state]);
```

**History Navigation Handlers**:
```typescript
const handleStepBack = useCallback(() => {
  if (state.phase !== 'playing') return;
  const currentIndex = historyIndex ?? state.gameState.moveHistory.length;
  if (currentIndex > 0) {
    setHistoryIndex(currentIndex - 1);
  }
}, [historyIndex, state]);

const handleStepForward = useCallback(() => {
  if (state.phase !== 'playing') return;
  const currentIndex = historyIndex ?? state.gameState.moveHistory.length;
  const maxIndex = state.gameState.moveHistory.length;
  if (currentIndex < maxIndex) {
    setHistoryIndex(currentIndex + 1);
  }
}, [historyIndex, state]);

const handleReturnToCurrent = useCallback(() => {
  setHistoryIndex(null); // null = at latest
}, []);
```

**Game State Reconstruction** (helper function):
```typescript
/**
 * Reconstruct game state at a specific move index.
 * Replays moves from initial state up to the target index.
 */
function reconstructGameStateAtMove(
  finalState: GameState,
  targetMoveIndex: number
): GameState {
  // Start with initial state (empty board, turn 0)
  const engine = new KingsChessEngine(
    finalState.lightPlayer,
    finalState.darkPlayer
  );

  // Replay moves up to targetMoveIndex
  for (let i = 0; i <= targetMoveIndex && i < finalState.moveHistory.length; i++) {
    const move = finalState.moveHistory[i];
    if (move) {
      engine.makeMove(move.from, move.to);
    }
  }

  return engine.getGameState();
}
```

## Requirements

1. **Create PlaybackControls Component**
   - Layout: `[← Back] [Forward →] [Return ↻] | [Confirm Move]`
   - Back button (← icon + "Back" text)
   - Forward button ("Forward" text + → icon)
   - Return button (↻ refresh icon, hidden when at latest)
   - Visual separator (|) before Confirm button
   - All buttons have ARIA labels
   - Keyboard navigation support (Tab, Enter, Space)

2. **Display History Indicator**
   - Show "Viewing move X of Y" when `historyIndex !== null`
   - Position: Above playback controls
   - Style: Secondary text color, small font
   - Hide when at latest move

3. **Implement History Navigation State**
   - Add `historyIndex` state in App.tsx (number | null)
   - `null` = at latest move (current game state)
   - `0` = at start (no moves applied)
   - `N` = at move N (moves 0 through N applied)

4. **Reconstruct Historical Board State**
   - Create `reconstructGameStateAtMove()` helper
   - Replay moves from start up to `historyIndex`
   - Use KingsChessEngine to ensure valid state
   - Memoize with `useMemo` to avoid redundant calculations

5. **Disable Board Interaction When Viewing History**
   - Add `isViewOnly` prop to GameBoard
   - When true: disable piece selection (onClick handlers)
   - When true: grey out board slightly (opacity: 0.85)
   - Show visual indicator: border or overlay message

6. **Button State Management**
   - Back: `disabled={historyIndex === 0}`
   - Forward: `disabled={historyIndex === moveHistory.length || historyIndex === null}`
   - Return: `hidden={historyIndex === null}`
   - Confirm: `disabled={!pendingMove || historyIndex !== null}`

7. **Works in Both Modes**
   - Hot-seat: Each player can independently review history
   - URL: Each device maintains its own history navigation state
   - No interference with game flow or handoff screens

8. **Accessibility**
   - All buttons have aria-label
   - Keyboard navigation with Tab
   - Enter/Space to activate buttons
   - Screen reader announces "Viewing move 5 of 12"
   - Focus indicators visible

9. **Testing Coverage**
   - Unit tests for PlaybackControls component
   - Integration tests for history navigation
   - Test button states at boundaries (move 0, latest)
   - Test board state reconstruction
   - Test disabled interaction when viewing history

## Implementation Blueprint

### Task 1: Create PlaybackControls Component (TDD Red)

**File**: `src/components/game/PlaybackControls.test.tsx` (NEW)

Write failing tests first:

```typescript
/**
 * @fileoverview Tests for PlaybackControls component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { PlaybackControls } from './PlaybackControls';

describe('PlaybackControls', () => {
  it('should render all playback buttons', () => {
    render(
      <PlaybackControls
        onStepBack={vi.fn()}
        onStepForward={vi.fn()}
        onReturnToCurrent={vi.fn()}
        canStepBack={true}
        canStepForward={true}
        isAtLatest={false}
        currentMoveIndex={5}
        totalMoves={10}
      />
    );

    expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /forward/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /return to current/i })).toBeInTheDocument();
  });

  it('should show history indicator', () => {
    render(
      <PlaybackControls
        onStepBack={vi.fn()}
        onStepForward={vi.fn()}
        onReturnToCurrent={vi.fn()}
        canStepBack={true}
        canStepForward={true}
        isAtLatest={false}
        currentMoveIndex={5}
        totalMoves={10}
      />
    );

    expect(screen.getByText(/viewing move 5 of 10/i)).toBeInTheDocument();
  });

  it('should disable back button when cannot step back', () => {
    render(
      <PlaybackControls
        onStepBack={vi.fn()}
        onStepForward={vi.fn()}
        onReturnToCurrent={vi.fn()}
        canStepBack={false}
        canStepForward={true}
        isAtLatest={false}
        currentMoveIndex={0}
        totalMoves={10}
      />
    );

    expect(screen.getByRole('button', { name: /back/i })).toBeDisabled();
  });

  it('should disable forward button when cannot step forward', () => {
    render(
      <PlaybackControls
        onStepBack={vi.fn()}
        onStepForward={vi.fn()}
        onReturnToCurrent={vi.fn()}
        canStepBack={true}
        canStepForward={false}
        isAtLatest={true}
        currentMoveIndex={10}
        totalMoves={10}
      />
    );

    expect(screen.getByRole('button', { name: /forward/i })).toBeDisabled();
  });

  it('should hide return button when at latest', () => {
    render(
      <PlaybackControls
        onStepBack={vi.fn()}
        onStepForward={vi.fn()}
        onReturnToCurrent={vi.fn()}
        canStepBack={true}
        canStepForward={false}
        isAtLatest={true}
        currentMoveIndex={10}
        totalMoves={10}
      />
    );

    expect(screen.queryByRole('button', { name: /return to current/i })).not.toBeInTheDocument();
  });

  it('should call onStepBack when back button clicked', async () => {
    const user = userEvent.setup();
    const onStepBack = vi.fn();

    render(
      <PlaybackControls
        onStepBack={onStepBack}
        onStepForward={vi.fn()}
        onReturnToCurrent={vi.fn()}
        canStepBack={true}
        canStepForward={true}
        isAtLatest={false}
        currentMoveIndex={5}
        totalMoves={10}
      />
    );

    await user.click(screen.getByRole('button', { name: /back/i }));
    expect(onStepBack).toHaveBeenCalledTimes(1);
  });

  // ... more tests ...
});
```

**Validation**:
```bash
pnpm test PlaybackControls.test.tsx
# Expected: Tests fail (component doesn't exist yet)
```

---

### Task 2: Implement PlaybackControls Component (TDD Green)

**File**: `src/components/game/PlaybackControls.tsx` (NEW)

```typescript
/**
 * @fileoverview Playback controls for history navigation
 * @module components/game/PlaybackControls
 */

import { type ReactElement } from 'react';
import styles from './PlaybackControls.module.css';

interface PlaybackControlsProps {
  /** Callback to step back one move */
  onStepBack: () => void;
  /** Callback to step forward one move */
  onStepForward: () => void;
  /** Callback to return to current/latest move */
  onReturnToCurrent: () => void;
  /** Can step back? (disabled at move 0) */
  canStepBack: boolean;
  /** Can step forward? (disabled at latest) */
  canStepForward: boolean;
  /** Is at latest move? (hide return button) */
  isAtLatest: boolean;
  /** Current move index being viewed */
  currentMoveIndex: number;
  /** Total number of moves in history */
  totalMoves: number;
}

/**
 * Playback controls for reviewing game history.
 *
 * Layout: [← Back] [Forward →] [Return ↻] | separator
 * (Confirm button is separate, passed as children)
 *
 * @component
 * @example
 * ```tsx
 * <PlaybackControls
 *   onStepBack={handleStepBack}
 *   onStepForward={handleStepForward}
 *   onReturnToCurrent={handleReturn}
 *   canStepBack={historyIndex > 0}
 *   canStepForward={historyIndex < totalMoves}
 *   isAtLatest={historyIndex === null}
 *   currentMoveIndex={historyIndex ?? totalMoves}
 *   totalMoves={gameState.moveHistory.length}
 * />
 * ```
 */
export const PlaybackControls = ({
  onStepBack,
  onStepForward,
  onReturnToCurrent,
  canStepBack,
  canStepForward,
  isAtLatest,
  currentMoveIndex,
  totalMoves,
}: PlaybackControlsProps): ReactElement => {
  return (
    <div className={styles.container}>
      {/* History indicator */}
      {!isAtLatest && (
        <div className={styles.indicator} aria-live="polite">
          Viewing move {currentMoveIndex} of {totalMoves}
        </div>
      )}

      {/* Playback controls */}
      <div className={styles.controls}>
        {/* Back button */}
        <button
          onClick={onStepBack}
          disabled={!canStepBack}
          className={styles.button}
          aria-label="Step back to previous move"
        >
          ← Back
        </button>

        {/* Forward button */}
        <button
          onClick={onStepForward}
          disabled={!canStepForward}
          className={styles.button}
          aria-label="Step forward to next move"
        >
          Forward →
        </button>

        {/* Return to current button */}
        {!isAtLatest && (
          <button
            onClick={onReturnToCurrent}
            className={styles.button}
            aria-label="Return to current move"
            title="Return to current move"
          >
            ↻
          </button>
        )}
      </div>
    </div>
  );
};
```

**Validation**:
```bash
pnpm run check:types
pnpm test PlaybackControls.test.tsx
# Expected: Tests pass
```

---

### Task 3: Add PlaybackControls Styles

**File**: `src/components/game/PlaybackControls.module.css` (NEW)

```css
/**
 * PlaybackControls Styles
 */

.container {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.indicator {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  text-align: center;
  font-weight: 500;
}

.controls {
  display: flex;
  gap: var(--spacing-sm);
  align-items: center;
  justify-content: flex-start;
}

.button {
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--font-size-base);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 44px; /* Touch target */
}

.button:hover:not(:disabled) {
  background-color: var(--bg-hover);
  border-color: var(--border-hover);
}

.button:active:not(:disabled) {
  transform: scale(0.98);
}

.button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.button:focus-visible {
  outline: 2px solid var(--border-focus);
  outline-offset: 2px;
}

/* Responsive: stack on mobile */
@media (max-width: 640px) {
  .controls {
    flex-wrap: wrap;
  }

  .button {
    flex: 1 1 auto;
    min-width: 80px;
  }
}
```

**Validation**:
```bash
pnpm run lint
# Expected: CSS lint passes
```

---

### Task 4: Add History Navigation State to App.tsx

**File**: `src/App.tsx`

**Changes**:
1. Import PlaybackControls component
2. Add `historyIndex` state
3. Add navigation handler functions
4. Add `reconstructGameStateAtMove` helper
5. Compute `displayedGameState` with useMemo
6. Pass state to PlaybackControls and GameBoard

```typescript
// Add import
import { PlaybackControls } from './components/game/PlaybackControls';

// Inside App component, add after line 91:
// History navigation state (null = at latest move)
const [historyIndex, setHistoryIndex] = useState<number | null>(null);

// Derived state: are we viewing history?
const isViewingHistory = historyIndex !== null;

// Handler: step back one move
const handleStepBack = useCallback(() => {
  if (state.phase !== 'playing') return;
  const currentIndex = historyIndex ?? state.gameState.moveHistory.length;
  if (currentIndex > 0) {
    setHistoryIndex(currentIndex - 1);
  }
}, [historyIndex, state]);

// Handler: step forward one move
const handleStepForward = useCallback(() => {
  if (state.phase !== 'playing') return;
  const currentIndex = historyIndex ?? state.gameState.moveHistory.length;
  const maxIndex = state.gameState.moveHistory.length;
  if (currentIndex < maxIndex) {
    setHistoryIndex(currentIndex + 1);
  }
}, [historyIndex, state]);

// Handler: return to current (latest) move
const handleReturnToCurrent = useCallback(() => {
  setHistoryIndex(null);
}, []);

// Helper: reconstruct game state at specific move index
const reconstructGameStateAtMove = useCallback((
  finalState: GameState,
  targetIndex: number
): GameState => {
  const engine = new KingsChessEngine(
    finalState.lightPlayer,
    finalState.darkPlayer
  );

  // Replay moves up to targetIndex
  for (let i = 0; i <= targetIndex && i < finalState.moveHistory.length; i++) {
    const move = finalState.moveHistory[i];
    if (move) {
      engine.makeMove(move.from, move.to);
    }
  }

  return engine.getGameState();
}, []);

// Compute displayed game state (current or historical)
const displayedGameState = useMemo(() => {
  if (state.phase !== 'playing') return null;
  if (!isViewingHistory) return state.gameState;
  return reconstructGameStateAtMove(state.gameState, historyIndex ?? 0);
}, [state, isViewingHistory, historyIndex, reconstructGameStateAtMove]);
```

**In playing phase JSX** (around line 479):
```typescript
// Replace existing controls section with:
<div style={{ marginBottom: 'var(--spacing-md)' }}>
  <PlaybackControls
    onStepBack={handleStepBack}
    onStepForward={handleStepForward}
    onReturnToCurrent={handleReturnToCurrent}
    canStepBack={(historyIndex ?? state.gameState.moveHistory.length) > 0}
    canStepForward={(historyIndex ?? state.gameState.moveHistory.length) < state.gameState.moveHistory.length}
    isAtLatest={historyIndex === null}
    currentMoveIndex={historyIndex ?? state.gameState.moveHistory.length}
    totalMoves={state.gameState.moveHistory.length}
  />
  <div style={{ marginTop: 'var(--spacing-sm)' }}>
    <MoveConfirmButton
      onConfirm={handleConfirmMove}
      disabled={!state.pendingMove || isViewingHistory}
      isProcessing={false}
    />
  </div>
</div>

// Update GameBoard call:
<GameBoard
  gameState={displayedGameState ?? state.gameState}
  onMove={(from, to) => {
    if (!isViewingHistory) {
      dispatch({ type: 'STAGE_MOVE', from, to });
    }
  }}
  onCancelMove={() => {
    dispatch({ type: 'DESELECT_PIECE' });
  }}
  isPlayerTurn={!isViewingHistory}
  pendingMove={state.pendingMove}
/>
```

**Validation**:
```bash
pnpm run check:types
pnpm test App.test.tsx
# Expected: All tests pass
```

---

### Task 5: Add `isViewOnly` Prop to GameBoard

**File**: `src/components/game/GameBoard.tsx`

**Changes**:
1. Add `isViewOnly` prop to interface
2. Pass to GameCell components
3. Update styles for view-only mode

```typescript
interface GameBoardProps {
  /** Current game state */
  gameState: GameState;
  /** Callback when move is completed */
  onMove: (from: Position, to: Position | 'off_board') => void;
  /** Callback to cancel pending move */
  onCancelMove?: () => void;
  /** Is it this player's turn? */
  isPlayerTurn?: boolean;
  /** Staged move awaiting confirmation */
  pendingMove?: { from: Position; to: Position | 'off_board' } | null;
  /** Is board in view-only mode (viewing history)? */
  isViewOnly?: boolean; // NEW
}

// In component, add to destructuring:
export const GameBoard = ({
  gameState,
  onMove,
  onCancelMove,
  isPlayerTurn = true,
  pendingMove,
  isViewOnly = false, // NEW
}: GameBoardProps): ReactElement => {

// Update handleCellClick to check isViewOnly:
const handleCellClick = useCallback((position: Position): void => {
  if (isViewOnly) return; // Don't allow interaction in view-only mode
  // ... rest of logic
}, [isViewOnly, /* other deps */]);

// Add visual indicator for view-only mode:
return (
  <div className={styles.container}>
    {isViewOnly && (
      <div className={styles.viewOnlyOverlay} aria-live="polite">
        Viewing history - return to current to make moves
      </div>
    )}
    {/* ... rest of component */}
  </div>
);
```

**File**: `src/components/game/GameBoard.module.css`

Add styles:
```css
.viewOnlyOverlay {
  position: absolute;
  top: -30px;
  left: 0;
  right: 0;
  text-align: center;
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  background-color: var(--bg-warning);
  padding: var(--spacing-xs);
  border-radius: 4px;
  z-index: 100;
}

/* Slightly grey out board in view-only mode */
.container[data-view-only="true"] .board {
  opacity: 0.85;
  pointer-events: none;
}
```

**Validation**:
```bash
pnpm test GameBoard.test.tsx
# Expected: All tests pass
```

---

### Task 6: Integration Testing

**File**: `src/App.test.tsx`

Add new test cases:

```typescript
describe('History Replay Controls', () => {
  it('should allow stepping back through history', () => {
    // Setup: Create game with some moves
    // Click back button
    // Verify board shows previous state
  });

  it('should disable back button at move 0', () => {
    // Setup: Step back to move 0
    // Verify back button is disabled
  });

  it('should disable forward button at latest move', () => {
    // Setup: At latest move
    // Verify forward button is disabled
  });

  it('should return to current when return button clicked', () => {
    // Setup: Viewing history
    // Click return button
    // Verify at latest move, return button hidden
  });

  it('should disable piece selection when viewing history', () => {
    // Setup: Step back
    // Try to select piece
    // Verify piece not selectable
  });
});
```

**Validation**:
```bash
pnpm test App.test.tsx
# Expected: All integration tests pass
```

---

### Task 7: E2E Testing (optional)

**File**: `tests/e2e/history-replay.spec.ts` (NEW)

```typescript
import { test, expect } from '@playwright/test';

test.describe('History Replay', () => {
  test('should step through move history', async ({ page }) => {
    // Start game, make moves
    // Click back button
    // Verify board changes
    // Click forward button
    // Verify board advances
  });
});
```

**Validation**:
```bash
pnpm test:e2e
# Expected: E2E tests pass
```

---

### Task 8: Refactor & Optimize

**Potential Improvements**:
1. Add keyboard shortcuts (Left Arrow = back, Right Arrow = forward)
2. Add animation when stepping through history
3. Optimize `reconstructGameStateAtMove` with memoization cache
4. Add "Jump to Move X" feature (future enhancement)

**Validation**:
```bash
pnpm run check && pnpm run lint && pnpm test
# Expected: All checks pass
```

---

## Validation Strategy

### Level 1: Type Safety
```bash
pnpm run check:types
```
- PlaybackControls types validate
- App.tsx history state types validate
- GameBoard isViewOnly prop validates

### Level 2: Unit Tests
```bash
pnpm test PlaybackControls.test.tsx
pnpm test GameBoard.test.tsx
```
- PlaybackControls rendering
- Button states (disabled/enabled)
- Event handlers called correctly
- Indicator display logic

### Level 3: Integration Tests
```bash
pnpm test App.test.tsx
```
- History navigation works in playing phase
- Board state reconstructs correctly
- Interaction disabled when viewing history
- Button states match navigation position

### Level 4: E2E Tests
```bash
pnpm test:e2e
```
- Full user flow through history
- Keyboard navigation works
- Both hot-seat and URL modes work

### Level 5: Accessibility
```bash
# Manual testing with screen reader
```
- All buttons have ARIA labels
- History indicator announces via aria-live
- Keyboard navigation with Tab + Enter
- Focus indicators visible

### Level 6: Build
```bash
pnpm build
```
- Production build succeeds
- No bundle size issues

## Rollback Strategy

If tests fail unexpectedly:

1. **Revert Integration** (Tasks 4-5):
   ```bash
   git checkout HEAD -- src/App.tsx
   git checkout HEAD -- src/components/game/GameBoard.tsx
   ```

2. **Keep Component** (Tasks 1-3):
   - PlaybackControls remains for future use
   - Mark as experimental feature

## Debug Strategies

### History Not Reconstructing Correctly
1. Check move history array in state
2. Verify KingsChessEngine.makeMove() succeeds
3. Log intermediate states during reconstruction
4. Check for off-by-one errors in index

### Buttons Not Disabling
1. Log `canStepBack` and `canStepForward` computed values
2. Check `historyIndex` state updates
3. Verify boundary conditions (move 0, latest)

### Board Still Interactive When Viewing History
1. Check `isViewOnly` prop passed correctly
2. Verify GameBoard handleCellClick checks isViewOnly
3. Check CSS pointer-events applied

## Success Criteria

- [ ] PlaybackControls component created and tested
- [ ] Back/Forward/Return buttons functional
- [ ] History indicator shows "Viewing move X of Y"
- [ ] Board reconstructs historical states correctly
- [ ] Piece selection disabled when viewing history
- [ ] Works in both hot-seat and URL modes
- [ ] All button states correct (disabled at boundaries)
- [ ] Accessibility: ARIA labels, keyboard nav
- [ ] All existing tests still pass (no regressions)
- [ ] New tests pass (component, integration)
- [ ] Manual testing confirms smooth UX

## TDD Workflow

1. **🔴 RED**: Write failing tests for PlaybackControls (Task 1)
2. **🟢 GREEN**: Implement PlaybackControls to pass tests (Task 2-3)
3. **🔄 REFACTOR**: Clean up component implementation
4. **🔴 RED**: Write failing integration tests (Task 6)
5. **🟢 GREEN**: Integrate into App.tsx (Task 4-5)
6. **🔄 REFACTOR**: Optimize state management
7. **✅ VALIDATE**: Run full test suite
8. **🧪 MANUAL**: Manual testing in both modes

## References

- `/home/ryankhetlyr/Development/kings-cooking/claude_md_files/CLAUDE-REACT.md` - React 19 patterns
- `src/components/game/GameBoard.tsx` - Current board implementation
- `src/components/game/MoveConfirmButton.tsx` - Button patterns
- `src/lib/chess/KingsChessEngine.ts` - Game state reconstruction
- React Testing Library: https://testing-library.com/docs/react-testing-library/intro/

## Gotchas

1. **Off-by-one errors**: historyIndex is 0-based, but display is 1-based
2. **Null vs 0**: `null` = at latest, `0` = at first move (after initial state)
3. **Move reconstruction**: Must replay ALL moves, not just apply deltas
4. **Pending moves**: Clear pending move when entering history view
5. **Mode differences**: History state is local to each device/player
6. **Performance**: Memoize reconstructGameStateAtMove to avoid redundant calculations
7. **Focus management**: Return focus to appropriate element after navigation
8. **Mobile**: Ensure touch targets are 44px+ for all buttons
9. **Edge case**: Empty move history (game just started) - disable both back/forward
10. **URL mode**: Don't sync history navigation state via URL (keep local)

## Notes

- This feature is foundational for Issue #40 (Move Replay/Animation)
- KISS approach: Simple back/forward, no timeline scrubber (YAGNI)
- Future: Could add jump-to-move dropdown or slider
- Future: Could add "Play" button to auto-step through history
