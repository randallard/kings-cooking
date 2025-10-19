# Task PRP: Fix Piece Movement Visualization Bug

**Issue:** #17 - [BUG] Can't see to verify move and confirm
**Priority:** 🔥 Critical (core gameplay broken)
**Complexity:** 🟡 Medium (2-3 days)
**Type:** Bug Fix
**Scope:** GameBoard, GameCell, CourtArea components + App.tsx integration

---

## Goal

Fix missing visual feedback when moves are staged. Currently, when a player selects a piece and clicks a destination, only the destination square highlights blue - the piece doesn't visually move and stats don't update until the move is confirmed. This makes it impossible to verify the move before confirming.

## Why (Business Value)

- **Critical UX Issue**: Players cannot see their move before confirming it
- **Gameplay Broken**: No visual feedback = players make mistakes and undo moves frequently
- **Core Feature Missing**: Move preview/staging has never worked since launch
- **User Frustration**: Bug makes the game feel unfinished and unpolished

## What (User-Visible Behavior)

### Before (Current Bug)

1. Player clicks piece → piece highlights (yellow border)
2. Legal moves show with green dots on destination squares
3. Player clicks destination square → **only blue highlight appears**
4. **Piece stays at original position** (no visual feedback)
5. **Stats don't update** (courts/captures unchanged)
6. Confirm button enables (green)
7. Player clicks Confirm → piece finally moves, stats update, turn switches

### After (Fixed Behavior)

1. Player clicks piece → piece highlights (yellow border)
2. Legal moves show with green dots on destination squares
3. Player clicks destination square → **piece smoothly slides to new position** (300ms CSS animation)
4. **Source square shows ghost outline** (semi-transparent piece at 30% opacity)
5. **Stats update immediately** (courts show projected captures, piece counts update)
6. Confirm button enables (green) - unchanged
7. Player clicks Confirm → animation completes if still in progress, turn switches
8. **If player selects different piece** → pending move reverses, original state restored

## All Needed Context

### Existing Infrastructure

**pendingMove State** (`src/lib/gameFlow/reducer.ts` line 346-351):
```typescript
case 'STAGE_MOVE':
  if (state.phase !== 'playing') return state;
  return {
    ...state,
    pendingMove: { from: action.from, to: action.to },  // ← EXISTS but not rendered!
  };
```

**GameBoard Component** (`src/components/game/GameBoard.tsx` lines 47-253):
```typescript
// Currently receives: gameState, onMove, isPlayerTurn
// Missing: pendingMove prop!

export const GameBoard = ({
  gameState,
  onMove,
  isPlayerTurn = true,
}: GameBoardProps): ReactElement => {
  // ... selection logic works fine
  // ... legal moves work fine
  // ❌ No logic to render pendingMove
};
```

**GameCell Component** (`src/components/game/GameCell.tsx` lines 47-108):
```typescript
// Currently receives: piece, isSelected, isLegalMove, position, etc.
// Missing: isPendingSource, isPendingDestination props!

export const GameCell = ({
  piece,
  position,
  isSelected,
  isLegalMove,
  // ❌ No pending move props
  onClick,
  disabled,
}: GameCellProps): ReactElement => {
  // ... rendering works
  // ❌ No logic for ghost piece or pending destination
};
```

**App.tsx Victory Phase Pattern** (lines 645-653):
```typescript
// Pattern for passing optional props conditionally
victoryProps.onNewGame = () => {
  localStorage.removeItem('kings-cooking:victory-url-copied');
  dispatch({ type: 'NEW_GAME' });
};

// ← Use same pattern for pendingMove prop
```

### Component Structure

**GameBoard Rendering** (`src/components/game/GameBoard.tsx` lines 149-253):
```tsx
return (
  <div className={styles.gameBoardContainer}>
    <div className={styles.gameBoard} role="grid">
      {gameState.board.map((row, rowIndex) => (
        <div key={rowIndex} className={styles.boardRow} role="row">
          {row.map((piece, colIndex) => {
            const position: Position = [rowIndex, colIndex];
            const isSelected = /* ... */;
            const isLegalMove = /* ... */;

            // ❌ Need to add: isPendingSource, isPendingDestination, ghostPiece

            return (
              <GameCell
                key={`${rowIndex}-${colIndex}`}
                piece={piece}
                position={position}
                isSelected={isSelected}
                isLegalMove={isLegalMove}
                onClick={handleCellClick}
                disabled={!isPlayerTurn}
              />
            );
          })}
        </div>
      ))}
    </div>
  </div>
);
```

### CourtArea Stats Update

**CourtArea Component** (`src/components/game/CourtArea.tsx`):
```typescript
// Currently shows actual captured pieces
// Need to pass projectedCaptures when pendingMove exists

export const CourtArea = ({
  court: actualCourt,
  captured: actualCaptured,
  // ❌ Add: projectedCourt, projectedCaptured
}: CourtAreaProps): ReactElement => {
  // Use projected stats if available, otherwise actual
};
```

### CSS Animation Pattern

**Existing Transitions** (`src/components/game/GameCell.module.css` line 9):
```css
.gameCell {
  transition: background-color 0.2s;  /* 200ms smooth color */
}
```

**Move Animation Pattern** (to be added):
```css
.pendingDestination {
  animation: slideIn 300ms ease-out;
}

@keyframes slideIn {
  from {
    transform: translate(var(--from-x), var(--from-y));
    opacity: 0.5;
  }
  to {
    transform: translate(0, 0);
    opacity: 1;
  }
}
```

### React 19 Patterns (from CLAUDE-REACT.md)

**Optional Prop Pattern**:
```typescript
interface GameBoardProps {
  gameState: GameState;
  onMove: (from: Position, to: Position) => void;
  isPlayerTurn?: boolean;
  pendingMove?: { from: Position; to: Position | 'off_board' } | null;  // ← Add
}
```

**Conditional Rendering**:
```typescript
const isPendingSource = pendingMove &&
  pendingMove.from[0] === rowIndex &&
  pendingMove.from[1] === colIndex;

const isPendingDest = pendingMove &&
  pendingMove.to !== 'off_board' &&
  pendingMove.to[0] === rowIndex &&
  pendingMove.to[1] === colIndex;
```

### Gotchas

1. **Off-Board Moves:**
   - **Issue:** pendingMove.to can be 'off_board' string
   - **Fix:** Check `to !== 'off_board'` before array access

2. **Animation During Confirm:**
   - **Issue:** User might click Confirm while animation is mid-flight
   - **Fix:** Animation is CSS-based, will complete naturally

3. **Multiple Piece Selection:**
   - **Issue:** Selecting different piece should reverse pending move
   - **Fix:** DESELECT_PIECE action already clears pendingMove

4. **Ghost Piece Rendering:**
   - **Issue:** Source square needs to show semi-transparent piece
   - **Fix:** Render piece at source with `.ghostPiece` class (opacity: 0.3)

5. **Court Stats Calculation:**
   - **Issue:** Need to compute projected captures without mutating state
   - **Fix:** Chess engine has methods to preview move results

---

## Implementation Blueprint

### TASK 1: Add pendingMove Prop to GameBoard (RED)

**File:** `src/components/game/GameBoard.tsx`

**Location:** Lines 27-33 (GameBoardProps interface)

**Pseudocode:**
```typescript
interface GameBoardProps {
  /** Current game state */
  gameState: GameState;
  /** Callback when a move is made */
  onMove: (from: Position, to: Position | 'off_board') => void;
  /** Whether this player can make moves */
  isPlayerTurn?: boolean;

  /** Staged move awaiting confirmation */  // ← ADD THIS
  pendingMove?: { from: Position; to: Position | 'off_board' } | null;
}
```

**Write Failing Test First:**

**File:** `src/components/game/GameBoard.test.tsx`

**Location:** Add to test suite

```typescript
describe('Pending Move Visualization', () => {
  it('should render piece at destination when move is staged', () => {
    // RED: This will FAIL initially
    const pendingMove = { from: [6, 4], to: [4, 4] };  // e2 to e4

    render(
      <GameBoard
        gameState={defaultGameState}
        onMove={vi.fn()}
        pendingMove={pendingMove}
      />
    );

    // Destination square should show the piece
    const destCell = screen.getByTestId('cell-4-4');
    expect(destCell).toHaveTextContent('♙');  // Pawn symbol

    // Source square should show ghost piece
    const sourceCell = screen.getByTestId('cell-6-4');
    expect(sourceCell).toHaveClass('ghostPiece');
  });

  it('should not show pending move when null', () => {
    render(
      <GameBoard
        gameState={defaultGameState}
        onMove={vi.fn()}
        pendingMove={null}
      />
    );

    // No ghost pieces should exist
    expect(screen.queryByClass('ghostPiece')).not.toBeInTheDocument();
  });
});
```

**Validation:**
```bash
pnpm test src/components/game/GameBoard.test.tsx
```

**Expected Result:** 2 tests FAIL (RED)

**Rollback:**
```bash
git restore src/components/game/GameBoard.tsx src/components/game/GameBoard.test.tsx
```

---

### TASK 2: Pass pendingMove from App.tsx to GameBoard (GREEN)

**File:** `src/App.tsx`

**Location:** Playing phase section (around line 454)

**Pseudocode:**
```typescript
// Playing phase
if (state.phase === 'playing') {
  return (
    <div className="game-container">
      <GameBoard
        gameState={state.gameState}
        onMove={(from, to) => {
          dispatch({ type: 'STAGE_MOVE', from, to });
        }}
        isPlayerTurn={true}
        pendingMove={state.pendingMove}  // ← ADD THIS
      />

      {/* Confirm button - existing code unchanged */}
      {state.pendingMove && (
        <MoveConfirmButton onConfirm={handleConfirmMove} />
      )}
    </div>
  );
}
```

**Validation:**
```bash
pnpm run check  # Type checking
```

**Expected Result:** No type errors

**Rollback:**
```bash
git restore src/App.tsx
```

---

### TASK 3: Add Pending Move Logic to GameBoard Rendering (REFACTOR)

**File:** `src/components/game/GameBoard.tsx`

**Location:** Cell rendering loop (lines 149-253)

**Pseudocode:**
```typescript
export const GameBoard = ({
  gameState,
  onMove,
  isPlayerTurn = true,
  pendingMove,  // ← ADD TO DESTRUCTURING
}: GameBoardProps): ReactElement => {

  // ... existing selection logic ...

  return (
    <div className={styles.gameBoardContainer}>
      <div className={styles.gameBoard} role="grid">
        {gameState.board.map((row, rowIndex) => (
          <div key={rowIndex} className={styles.boardRow} role="row">
            {row.map((piece, colIndex) => {
              const position: Position = [rowIndex, colIndex];

              // Existing logic
              const isSelected = /* ... */;
              const isLegalMove = /* ... */;

              // ← ADD PENDING MOVE LOGIC
              const isPendingSource = pendingMove &&
                pendingMove.from[0] === rowIndex &&
                pendingMove.from[1] === colIndex;

              const isPendingDest = pendingMove &&
                pendingMove.to !== 'off_board' &&
                Array.isArray(pendingMove.to) &&
                pendingMove.to[0] === rowIndex &&
                pendingMove.to[1] === colIndex;

              // Determine which piece to render
              let displayedPiece = piece;

              if (isPendingDest && pendingMove.to !== 'off_board') {
                // Show moving piece at destination
                const [fromRow, fromCol] = pendingMove.from;
                displayedPiece = gameState.board[fromRow]?.[fromCol] ?? null;
              }

              return (
                <GameCell
                  key={`${rowIndex}-${colIndex}`}
                  piece={displayedPiece}
                  position={position}
                  isSelected={isSelected}
                  isLegalMove={isLegalMove}
                  isPendingSource={isPendingSource}  // ← ADD
                  isPendingDestination={isPendingDest}  // ← ADD
                  ghostPiece={isPendingSource ? piece : null}  // ← ADD
                  onClick={handleCellClick}
                  disabled={!isPlayerTurn}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};
```

**Validation:**
```bash
pnpm test src/components/game/GameBoard.test.tsx
```

**Expected Result:** Tests still FAIL (GameCell doesn't have new props yet)

**Rollback:**
```bash
git restore src/components/game/GameBoard.tsx
```

---

### TASK 4: Add Pending Move Props to GameCell

**File:** `src/components/game/GameCell.tsx`

**Location:** Lines 12-32 (GameCellProps interface)

**Pseudocode:**
```typescript
interface GameCellProps {
  /** Chess piece on this cell */
  piece: Piece | null;
  /** Board position */
  position: Position;
  /** Whether this cell is currently selected */
  isSelected: boolean;
  /** Whether this is a legal move destination */
  isLegalMove: boolean;

  /** Whether this is the source of a pending move */  // ← ADD
  isPendingSource?: boolean;
  /** Whether this is the destination of a pending move */  // ← ADD
  isPendingDestination?: boolean;
  /** Ghost piece to show at source during pending move */  // ← ADD
  ghostPiece?: Piece | null;

  /** Click handler */
  onClick: (position: Position) => void;
  /** Whether clicks are disabled */
  disabled?: boolean;
}
```

**File:** `src/components/game/GameCell.tsx`

**Location:** Component body (lines 47-108)

**Pseudocode:**
```typescript
export const GameCell = ({
  piece,
  position,
  isSelected,
  isLegalMove,
  isPendingSource = false,  // ← ADD
  isPendingDestination = false,  // ← ADD
  ghostPiece = null,  // ← ADD
  onClick,
  disabled = false,
}: GameCellProps): ReactElement => {

  // ... existing logic ...

  // Build CSS classes
  const cellClasses = [
    styles.gameCell,
    isLightSquare ? styles.lightSquare : styles.darkSquare,
    isSelected && styles.selected,
    isLegalMove && styles.legalMove,
    isPendingSource && styles.pendingSource,  // ← ADD
    isPendingDestination && styles.pendingDestination,  // ← ADD
    disabled && styles.disabled,
  ].filter(Boolean).join(' ');

  return (
    <div
      className={cellClasses}
      onClick={handleClick}
      role="gridcell"
      aria-label={ariaLabel}
      data-testid={`cell-${position[0]}-${position[1]}`}
    >
      {/* Render ghost piece at source if pending move */}
      {isPendingSource && ghostPiece && (
        <span className={styles.ghostPiece} aria-hidden="true">
          {getPieceSymbol(ghostPiece)}
        </span>
      )}

      {/* Render actual piece (or moved piece at destination) */}
      {piece && (
        <span
          className={`${styles.piece} ${isPendingDestination ? styles.animatedPiece : ''}`}
          aria-label={`${piece.owner} ${piece.type}`}
        >
          {getPieceSymbol(piece)}
        </span>
      )}

      {/* Legal move indicator */}
      {isLegalMove && !piece && (
        <span className={styles.moveIndicator} aria-hidden="true" />
      )}
    </div>
  );
};
```

**Validation:**
```bash
pnpm test src/components/game/GameCell.test.tsx
```

**Expected Result:** GameCell tests pass, GameBoard tests may pass

**Rollback:**
```bash
git restore src/components/game/GameCell.tsx
```

---

### TASK 5: Add CSS Animations for Piece Movement

**File:** `src/components/game/GameCell.module.css`

**Location:** After existing styles (around line 95)

**Pseudocode:**
```css
/* Ghost piece at source during pending move */
.ghostPiece {
  opacity: 0.3;
  filter: grayscale(50%);
  pointer-events: none;
}

/* Pending source square (slightly dimmed) */
.pendingSource {
  background-color: var(--bg-pending-source, rgba(128, 128, 128, 0.2));
}

/* Pending destination square (highlighted) */
.pendingDestination {
  background-color: var(--bg-pending-dest, rgba(0, 123, 255, 0.3));
  box-shadow: inset 0 0 0 2px var(--color-primary, #007bff);
}

/* Animated piece sliding to destination */
.animatedPiece {
  animation: slideToDestination 300ms ease-out;
}

@keyframes slideToDestination {
  from {
    transform: scale(0.8);
    opacity: 0.5;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

/* Ensure smooth transitions */
.piece {
  transition: transform 0.2s ease-out, opacity 0.2s ease-out;
}
```

**Validation:**
```bash
pnpm run check  # CSS in modules doesn't need validation
pnpm test src/components/game/GameCell.test.tsx
```

**Expected Result:** All GameCell tests pass

**Rollback:**
```bash
git restore src/components/game/GameCell.module.css
```

---

### TASK 6: Add Tests for Pending Move Rendering

**File:** `src/components/game/GameCell.test.tsx`

**Location:** Add new describe block

**Pseudocode:**
```typescript
describe('Pending Move Visualization', () => {
  it('should show ghost piece at source', () => {
    const piece: Piece = {
      type: 'pawn',
      owner: 'light',
      hasMoved: false,
    };

    render(
      <GameCell
        piece={null}
        position={[6, 4]}
        isSelected={false}
        isLegalMove={false}
        isPendingSource={true}
        ghostPiece={piece}
        onClick={vi.fn()}
      />
    );

    expect(screen.getByText('♙')).toHaveClass('ghostPiece');
  });

  it('should show animated piece at destination', () => {
    const piece: Piece = {
      type: 'pawn',
      owner: 'light',
      hasMoved: false,
    };

    render(
      <GameCell
        piece={piece}
        position={[4, 4]}
        isSelected={false}
        isLegalMove={false}
        isPendingDestination={true}
        onClick={vi.fn()}
      />
    );

    const pieceElement = screen.getByText('♙');
    expect(pieceElement).toHaveClass('animatedPiece');
  });

  it('should highlight pending destination square', () => {
    render(
      <GameCell
        piece={null}
        position={[4, 4]}
        isSelected={false}
        isLegalMove={false}
        isPendingDestination={true}
        onClick={vi.fn()}
      />
    );

    const cell = screen.getByTestId('cell-4-4');
    expect(cell).toHaveClass('pendingDestination');
  });
});
```

**Validation:**
```bash
pnpm test src/components/game/GameCell.test.tsx
```

**Expected Result:** All tests pass

**Rollback:**
```bash
git restore src/components/game/GameCell.test.tsx
```

---

### TASK 7: Update Court Stats for Projected Captures (Optional Enhancement)

**Note:** This is optional for MVP - can be done in a follow-up PR.

**File:** `src/components/game/CourtArea.tsx`

**Pseudocode:**
```typescript
interface CourtAreaProps {
  court: Piece[];
  captured: Piece[];

  // Optional: Projected stats during pending move
  projectedCourt?: Piece[];
  projectedCaptured?: Piece[];
}

export const CourtArea = ({
  court,
  captured,
  projectedCourt,
  projectedCaptured,
}: CourtAreaProps): ReactElement => {
  // Use projected stats if available, otherwise actual
  const displayCourt = projectedCourt ?? court;
  const displayCaptured = projectedCaptured ?? captured;

  return (
    <div className={styles.courtArea}>
      <div className={styles.courtPieces}>
        {displayCourt.map((piece, idx) => (
          <span key={idx}>{getPieceSymbol(piece)}</span>
        ))}
      </div>
      <div className={styles.capturedPieces}>
        Captured: {displayCaptured.length}
      </div>
    </div>
  );
};
```

**Validation:**
```bash
pnpm test src/components/game/CourtArea.test.tsx
```

**Rollback:**
```bash
git restore src/components/game/CourtArea.tsx
```

---

## Validation Loop

### Level 1: Unit Tests
```bash
pnpm test src/components/game/GameBoard.test.tsx
pnpm test src/components/game/GameCell.test.tsx
```
**Expected:** All tests pass (10+ new tests)

**If Fail:**
- Check pendingMove prop is passed correctly
- Verify isPendingSource/isPendingDestination logic
- Check CSS classes are applied

### Level 2: Type Checking
```bash
pnpm run check
```
**Expected:** No type errors

**If Fail:**
- Verify optional prop types (use `?`)
- Check Position type usage
- Verify 'off_board' string literal handling

### Level 3: Linting
```bash
pnpm run lint
```
**Expected:** Pass

**If Fail:**
- Add explicit return types
- Fix unused imports
- Check ARIA labels on new elements

### Level 4: Full Test Suite
```bash
pnpm test
```
**Expected:** All 688+ tests pass (no regressions)

**If Fail:**
- Check for unexpected side effects
- Verify existing tests still pass
- Check snapshot updates

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
- [x] Piece appears at destination square when move is staged
- [x] Source square shows ghost piece (30% opacity)
- [x] Destination square has blue highlight
- [x] Animation is smooth (300ms CSS)
- [x] Confirm button still works correctly
- [x] Selecting different piece reverses pending move
- [x] Works in both hot-seat and URL modes

### Testing Requirements
- [x] 2+ tests for GameBoard pending move rendering
- [x] 3+ tests for GameCell ghost piece and animation
- [x] All existing tests still pass
- [x] No regressions in move selection or confirmation

### Code Quality Requirements
- [x] Type checking passes
- [x] Linting passes
- [x] Build succeeds
- [x] CSS follows existing patterns
- [x] Accessibility maintained (ARIA labels)

---

## Rollback Strategy

### If TASK 1-2 fail (prop passing):
```bash
git restore src/components/game/GameBoard.tsx src/components/game/GameBoard.test.tsx src/App.tsx
```

### If TASK 3-4 fail (rendering logic):
```bash
git restore src/components/game/GameBoard.tsx src/components/game/GameCell.tsx
```

### If TASK 5 fails (CSS animations):
```bash
git restore src/components/game/GameCell.module.css
```

### Complete rollback:
```bash
git checkout main -- src/components/game/GameBoard.tsx src/components/game/GameCell.tsx src/components/game/GameCell.module.css src/App.tsx
```

---

## Estimated Complexity

- **Lines Changed:** ~120 lines (components + tests + styles)
- **Files Modified:** 6 files
- **Risk Level:** MEDIUM (touches core gameplay, but isolated to rendering)
- **Time Estimate:** 3-4 hours (includes testing)

---

## References

- Issue #17: https://github.com/randallard/kings-cooking/issues/17
- CLAUDE-REACT.md: `/home/ryankhetlyr/Development/kings-cooking/claude_md_files/CLAUDE-REACT.md`
- GameBoard.tsx: `src/components/game/GameBoard.tsx` (lines 47-253)
- GameCell.tsx: `src/components/game/GameCell.tsx` (lines 47-108)
- App.tsx playing phase: `src/App.tsx` (lines 454-468)

---

## Final Checklist

- [ ] 🔴 RED: Write failing tests (TASK 1)
- [ ] 🟢 GREEN: Pass pendingMove prop through chain (TASK 2-4)
- [ ] 🔄 REFACTOR: Add CSS animations (TASK 5)
- [ ] ✅ All unit tests pass
- [ ] ✅ Integration tests pass
- [ ] 🧪 Added regression tests
- [ ] 📝 All validation gates pass
- [ ] 🚀 Ready for PR
