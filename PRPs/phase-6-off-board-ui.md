# Phase 6: Off-Board Move UI - Task PRP

**Version:** 1.0.0
**Date:** 2025-10-17
**Status:** Ready for Implementation
**Type:** TASK PRP (Focused UI Enhancement)

---

## Goal

Add UI support for off-board moves by displaying "Party!" buttons in the king's court areas when a selected piece can move off-board to score.

**Success Criteria:**
- White pieces can click "Party!" button in Black King's Court (above board)
- Black pieces can click "Party!" button in White King's Court (below board)
- Button only appears when it is in the goal court for the current player
- Button is only enabled when a piece is selected that can legally move off-board
- Button executes off-board move when clicked
- Court areas show scored pieces and pieces that were sent back to their king's court (captured)
- All existing tests pass
- New tests achieve 80%+ coverage

---

## Why

**Business Value:**
- Players currently cannot execute off-board moves from the UI (game logic exists but no UI access)
- This is a **critical missing feature** preventing game completion
- Off-board moves are the primary scoring mechanism in King's Cooking

**User Impact:**
- Players cannot score points without this feature
- Games cannot be won/completed
- Current implementation is effectively unplayable in production

---

## What

### User-Visible Changes

**Before (Current State):**
```
[No visible court area]
┌─────────────┐
│ ♜  ♞  ♝    │ ← Black's pieces (row 0)
│            │ ← Middle row (row 1)
│ ♖  ♘  ♗    │ ← White's pieces (row 2)
└─────────────┘
[No visible court area]
```

**After (With Feature):**
```
┌─────────────────────────────┐
│ Black King's Court          │
│ [Party! 🎉] (if white turn) │ ← Button appears when white piece can move off-board
│ Scored: ♖ ♗  Caught:  ♜     │ ← Shows scored white pieces
└─────────────────────────────┘

┌─────────────┐
│ ♜  ♞  ♝    │ ← Black's pieces (row 0)
│            │ ← Middle row (row 1)
│ ♖  ♘  ♗    │ ← White's pieces (row 2)
└─────────────┘

┌─────────────────────────────┐
│ White King's Court          │
│ [Party! 🎉] (if black turn) │ ← Button appears when black piece can move off-board
│ Scored: ♞ ♝    Caught: ♖    │ ← Shows scored black pieces
└─────────────────────────────┘
```

### Interaction Flow

**Scenario 1: White Rook at Edge (Can Move Off-Board)**
1. User clicks white rook at (0, 0)
2. Board highlights legal on-board moves
3. **"Party!" button enables in Black King's Court (above board)** ✨ NEW
4. User clicks "Party!" button
5. Move executes: rook moves `from: [0, 0]` to `'off_board'`
6. Rook appears in Black King's Court scored pieces display
7. Turn switches to black

**Scenario 2: White Knight at (1, 1) (Can Jump Off-Board)**
1. User clicks white knight at (1, 1)
2. Board highlights legal on-board moves
3. **"Party!" button enables in Black King's Court** ✨ NEW
4. User clicks "Party!" button
5. Knight jumps off-board to score

**Scenario 3: Black Bishop at (1, 1) (Cannot Move Off-Board Yet)**
1. User clicks black bishop at (1, 1)
2. Board highlights legal on-board moves
3. **"Party!" button remains disabled** (no clear path off-board)
4. User must move bishop to edge first

### Button States

**Three States Per Court:**

| State | Condition | Appearance |
|-------|-----------|------------|
| **Hidden** | Not current player's target court | `display: none` |
| **Disabled** | No piece selected OR selected piece cannot move off-board | Grey, opacity 0.5, cursor not-allowed |
| **Enabled** | Selected piece can legally move off-board | Green (#28a745), cursor pointer, hover effect |

**Example - White's Turn:**
- Black King's Court button: Visible (enabled if white piece can move off-board)
- White King's Court button: Hidden (white can't score in own court)

**Example - Black's Turn:**
- Black King's Court button: Hidden
- White King's Court button: Visible (enabled if black piece can move off-board)

---

## All Needed Context

### Existing Chess Engine API

**Off-board move validation already exists:**
```typescript
// src/lib/chess/KingsChessEngine.ts
public makeMove(from: Position, to: Position | 'off_board'): MoveResult;
public getValidMoves(position: Position): Position[];

// src/lib/chess/moveValidation.ts
export function validateMove(
  from: Position,
  to: Position | 'off_board',
  piece: Piece,
  getPiece: (pos: Position) => Piece | null,
  currentPlayer: 'white' | 'black'
): ValidationResult;

// Helper functions for off-board detection
export function hasRookPathToEdge(from: Position, piece: Piece, getPiece: (pos: Position) => Piece | null): boolean;
export function canKnightJumpOffBoard(from: Position, piece: Piece): boolean;
export function canBishopMoveOffBoard(from: Position, piece: Piece, getPiece: (pos: Position) => Piece | null): boolean;
```

### Off-Board Movement Rules (from PRD.md)

**Rook:**
- Can move straight off the opponent's edge if path is clear
- Example: White rook at (0, 0) with clear path can move to `'off_board'`

**Knight:**
- Can jump directly into opponent's court if L-shaped move lands in goal zone
- Example: White knight at (1, 1) can jump off-board (row calculation: 1 + (-2) = -1, off-board)

**Bishop:**
- **CRITICAL RULE:** Can move off-board ONLY if diagonal crosses through MIDDLE column (col 1) of opponent's row
- **Corner columns (0 or 2):** Bishop MUST STOP at edge, cannot continue off-board
- Example: White bishop at (1, 0) moving toward (0, 1) → can move off-board (crosses middle column)
- Counter-example: White bishop at (2, 0) moving toward (0, 0) → must stop at edge (crosses corner column)

### GameState Structure

```typescript
// src/lib/validation/schemas.ts
export interface GameState {
  board: (Piece | null)[][];           // 3x3 grid
  whiteCourt: Piece[];                 // White pieces in Black's court (white scores)
  blackCourt: Piece[];                 // Black pieces in White's court (black scores)
  capturedWhite: Piece[];              // Captured white pieces (no score)
  capturedBlack: Piece[];              // Captured black pieces (no score)
  currentPlayer: 'white' | 'black';
  currentTurn: number;
  // ... other fields
}
```

### Existing Component Patterns

**Button Component Pattern (from MoveConfirmButton.tsx):**
```typescript
interface ButtonProps {
  onConfirm: () => void;
  disabled?: boolean;
  isProcessing?: boolean;
  error?: string | null;
}

// CSS Module pattern
import styles from './Component.module.css';

// ARIA attributes for accessibility
<button
  type="button"
  className={styles.button}
  onClick={onConfirm}
  disabled={disabled}
  aria-label="Descriptive label"
  aria-busy={isProcessing}
>
  Button Text
</button>
```

**CSS Module Pattern (from GameBoard.module.css):**
```css
.container {
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* Mobile-first responsive design */
@media (min-width: 768px) {
  .container {
    max-width: 600px;
  }
}
```

### Game Flow Context

**Current GameBoard.tsx flow:**
```typescript
// 1. User clicks piece → setSelectedPosition(position)
// 2. engine.getValidMoves(position) → returns Position[] (on-board only)
// 3. User clicks destination → onMove(from, to)
// 4. App.tsx executes move via engine.makeMove(from, to)
```

**NEW flow with off-board:**
```typescript
// 1. User clicks piece → setSelectedPosition(position)
// 2. engine.getValidMoves(position) → returns Position[]
// 3a. User clicks on-board destination → onMove(from, to)
// 3b. User clicks "Party!" button → onMove(from, 'off_board') ✨ NEW
// 4. App.tsx executes move via engine.makeMove(from, 'off_board')
```

### Gotchas and Pitfalls

**CRITICAL GOTCHAS:**

1. **Type Signature Mismatch:**
   - `getValidMoves()` returns `Position[]` (no 'off_board' in array)
   - Must check off-board eligibility separately using helper functions
   - Do NOT try to add `'off_board'` to the `Position[]` array

2. **Court Display Logic:**
   - White King's Court is BELOW the board (black pieces score here)
   - Black King's Court is ABOVE the board (white pieces score here)
   - **Inversion:** White pieces score in BLACK'S court (opponent's court)
   - **Note:** Black pieces captured go to BLACK'S court captured - no score in BLACK'S court (owner's court)

3. **Button Visibility Rules:**
   - White's turn: Show button in Black King's Court (above)
   - Black's turn: Show button in White King's Court (below)
   - **Only ONE button visible at a time** (current player's target court)

4. **Piece Selection State:**
   - Button must disable when `selectedPosition` is null
   - Must re-check eligibility when selection changes
   - Must check piece owner matches current player

5. **Existing onMove Callback:**
   - Current signature: `onMove(from: Position, to: Position)`
   - Must expand to: `onMove(from: Position, to: Position | 'off_board')`
   - App.tsx already handles 'off_board' in engine.makeMove()

6. **CSS Module Scoping:**
   - All styles must use CSS modules (`.module.css`)
   - No global styles
   - Dark mode support via CSS variables

7. **Accessibility Requirements:**
   - ARIA labels must explain what "Party!" does
   - Screen reader should announce: "Move [piece] to opponent's court to score"
   - Button must be keyboard accessible (Tab + Enter)
   - Disabled state must have `aria-disabled="true"`

8. **Mobile Touch Targets:**
   - Button must be minimum 44x44px (WCAG 2.1 AA)
   - Must work with touch events on mobile
   - No hover-only states

### Documentation References

**Game Rules:**
- `/home/ryankhetlyr/Development/kings-cooking/PRD.md` (Section 1.4: Special Movement Cases)
- `/home/ryankhetlyr/Development/kings-cooking/kings-cooking-docs/kings-cooking.md` (Off-board movement)

**Chess Engine:**
- `src/lib/chess/KingsChessEngine.ts` (makeMove, getValidMoves)
- `src/lib/chess/moveValidation.ts` (validateOffBoardMove)
- `src/lib/chess/pieceMovement.ts` (hasRookPathToEdge, canKnightJumpOffBoard, canBishopMoveOffBoard)

**Component Patterns:**
- `src/components/game/GameBoard.tsx` (existing board structure)
- `src/components/game/MoveConfirmButton.tsx` (button pattern)
- `src/components/game/GameCell.tsx` (styling patterns)

**Testing:**
- `src/lib/chess/pieceMovement.test.ts` (off-board validation tests)
- `src/components/game/GameBoard.test.tsx` (component test patterns)

---

## Implementation Blueprint

### Task Breakdown

**Task 1: Create OffBoardButton Component**
- Create `src/components/game/OffBoardButton.tsx`
- Create `src/components/game/OffBoardButton.module.css`
- Props: `onOffBoardMove, disabled, pieceType, courtOwner`
- Three states: hidden, disabled, enabled
- ARIA labels for accessibility
- Mobile-friendly touch target (44x44px min)

**Task 2: Create CourtArea Component**
- Create `src/components/game/CourtArea.tsx`
- Create `src/components/game/CourtArea.module.css`
- Display court label (e.g., "Black King's Court")
- Display scored pieces (icons from whiteCourt/blackCourt)
- Display captured pieces (icons from blackCourt/whiteCourt)
- Include OffBoardButton as child
- Responsive layout (stack on mobile)

**Task 3: Add Off-Board Detection Logic to GameBoard**
- Import helper functions: `hasRookPathToEdge`, `canKnightJumpOffBoard`, `canBishopMoveOffBoard`
- Create `canSelectedPieceMoveOffBoard()` helper function
- Check piece type and call appropriate validator
- Memoize result with `useMemo` (depends on selectedPosition, gameState)

**Task 4: Update GameBoard Layout**
- Wrap board with CourtArea components (above and below)
- Pass `canMoveOffBoard` state to CourtArea
- Pass `handleOffBoardMove` callback to OffBoardButton
- Ensure proper visibility logic (only current player's target court)

**Task 5: Update onMove Callback Type**
- Change `onMove: (from: Position, to: Position)` to `onMove: (from: Position, to: Position | 'off_board')`
- Update App.tsx to handle 'off_board' destination
- Ensure existing on-board moves still work

**Task 6: Add Tests**
- Unit tests for OffBoardButton (3 states)
- Unit tests for CourtArea (piece display)
- Integration tests for GameBoard with off-board button
- Test each piece type (rook, knight, bishop)
- Test visibility logic (white/black turns)
- Test disabled state (no selection, cannot move off-board)

**Task 7: Update Existing Tests**
- Fix any GameBoard tests broken by layout changes
- Update type signatures in test files
- Ensure 80%+ coverage maintained

### Pseudocode

```typescript
// ========================================
// Task 1: OffBoardButton.tsx
// ========================================

interface OffBoardButtonProps {
  /** Callback when button clicked */
  onOffBoardMove: () => void;
  /** Is button disabled (no piece selected or cannot move off-board) */
  disabled: boolean;
  /** Type of piece that would move off-board */
  pieceType: 'rook' | 'knight' | 'bishop' | null;
  /** Owner of the court (white/black) */
  courtOwner: 'white' | 'black';
}

export const OffBoardButton = ({
  onOffBoardMove,
  disabled,
  pieceType,
  courtOwner,
}: OffBoardButtonProps): ReactElement => {
  // Determine button classes
  const buttonClasses = [
    styles.offBoardButton,
    disabled ? styles.disabled : styles.enabled,
  ].join(' ');

  // ARIA label for screen readers
  const ariaLabel = disabled
    ? 'No piece can move to opponent\'s court'
    : `Move ${pieceType} to ${courtOwner === 'white' ? 'White' : 'Black'} King's Court to score`;

  return (
    <button
      type="button"
      className={buttonClasses}
      onClick={onOffBoardMove}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-disabled={disabled}
    >
      🎉 Party!
    </button>
  );
};

// ========================================
// Task 2: CourtArea.tsx
// ========================================

interface CourtAreaProps {
  /** Owner of this court (white/black) */
  courtOwner: 'white' | 'black';
  /** Pieces that have scored in this court */
  scoredPieces: Piece[];
  /** Is off-board button enabled */
  canMoveOffBoard: boolean;
  /** Callback for off-board move */
  onOffBoardMove: () => void;
  /** Current player's turn */
  currentPlayer: 'white' | 'black';
  /** Selected piece type (if any) */
  selectedPieceType: 'rook' | 'knight' | 'bishop' | null;
}

export const CourtArea = ({
  courtOwner,
  scoredPieces,
  canMoveOffBoard,
  onOffBoardMove,
  currentPlayer,
  selectedPieceType,
}: CourtAreaProps): ReactElement => {
  // Determine if this court should show button
  // White scores in Black's court, Black scores in White's court
  const isTargetCourt = currentPlayer !== courtOwner;

  return (
    <div className={styles.courtArea}>
      <div className={styles.courtLabel}>
        {courtOwner === 'white' ? 'White' : 'Black'} King's Court
      </div>

      <div className={styles.scoredPieces}>
        {scoredPieces.length === 0 ? (
          <span className={styles.emptyText}>No pieces scored yet</span>
        ) : (
          scoredPieces.map((piece, index) => (
            <span key={index} className={styles.pieceIcon}>
              {getPieceIcon(piece)}
            </span>
          ))
        )}
      </div>

      {isTargetCourt && (
        <OffBoardButton
          onOffBoardMove={onOffBoardMove}
          disabled={!canMoveOffBoard}
          pieceType={selectedPieceType}
          courtOwner={courtOwner}
        />
      )}
    </div>
  );
};

// ========================================
// Task 3: Update GameBoard.tsx
// ========================================

// Import helper functions
import {
  hasRookPathToEdge,
  canKnightJumpOffBoard,
  canBishopMoveOffBoard,
} from '@/lib/chess/pieceMovement';

// Add inside GameBoard component
const canSelectedPieceMoveOffBoard = useMemo(() => {
  if (!selectedPosition) return false;

  const piece = gameState.board[selectedPosition[0]]?.[selectedPosition[1]];
  if (!piece) return false;
  if (piece.owner !== gameState.currentPlayer) return false;

  // Check based on piece type
  switch (piece.type) {
    case 'rook':
      return hasRookPathToEdge(selectedPosition, piece, (pos: Position) => {
        const [row, col] = pos;
        return gameState.board[row]?.[col] ?? null;
      });
    case 'knight':
      return canKnightJumpOffBoard(selectedPosition, piece);
    case 'bishop':
      return canBishopMoveOffBoard(selectedPosition, piece, (pos: Position) => {
        const [row, col] = pos;
        return gameState.board[row]?.[col] ?? null;
      });
    default:
      return false;
  }
}, [selectedPosition, gameState]);

// Handle off-board move
const handleOffBoardMove = useCallback(() => {
  if (!selectedPosition) return;
  if (!canSelectedPieceMoveOffBoard) return;

  onMove(selectedPosition, 'off_board');
  setSelectedPosition(null);
}, [selectedPosition, canSelectedPieceMoveOffBoard, onMove]);

// Get selected piece type
const selectedPieceType = useMemo(() => {
  if (!selectedPosition) return null;
  const piece = gameState.board[selectedPosition[0]]?.[selectedPosition[1]];
  return piece?.type ?? null;
}, [selectedPosition, gameState]);

// ========================================
// Task 4: Update GameBoard Layout
// ========================================

return (
  <div className={styles.gameBoardContainer}>
    {/* Black King's Court (above board) */}
    <CourtArea
      courtOwner="black"
      scoredPieces={gameState.whiteCourt} // WHITE pieces scored in BLACK's court
      canMoveOffBoard={
        gameState.currentPlayer === 'white' && canSelectedPieceMoveOffBoard
      }
      onOffBoardMove={handleOffBoardMove}
      currentPlayer={gameState.currentPlayer}
      selectedPieceType={selectedPieceType}
    />

    {/* Existing 3x3 board */}
    <div className={styles.gameBoard}>
      {/* ... existing board cells ... */}
    </div>

    {/* White King's Court (below board) */}
    <CourtArea
      courtOwner="white"
      scoredPieces={gameState.blackCourt} // BLACK pieces scored in WHITE's court
      canMoveOffBoard={
        gameState.currentPlayer === 'black' && canSelectedPieceMoveOffBoard
      }
      onOffBoardMove={handleOffBoardMove}
      currentPlayer={gameState.currentPlayer}
      selectedPieceType={selectedPieceType}
    />
  </div>
);

// ========================================
// Task 5: Update App.tsx onMove Handler
// ========================================

// Change signature
const handleMove = (from: Position, to: Position | 'off_board') => {
  const engine = new KingsChessEngine(
    gameState.whitePlayer,
    gameState.blackPlayer,
    gameState
  );

  const result = engine.makeMove(from, to); // Already supports 'off_board'

  if (result.success) {
    // ... existing success handling
  } else {
    console.error('Move failed:', result.error);
  }
};
```

### CSS Styling Guide

```css
/* OffBoardButton.module.css */
.offBoardButton {
  min-width: 120px;
  min-height: 44px; /* WCAG AA touch target */
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  font-weight: 600;
  border-radius: 8px;
  border: 2px solid;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.enabled {
  background: #28a745; /* Green */
  color: white;
  border-color: #28a745;
}

.enabled:hover {
  background: #218838;
  border-color: #1e7e34;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.enabled:active {
  transform: translateY(0);
}

.disabled {
  background: #6c757d; /* Grey */
  color: #ccc;
  border-color: #6c757d;
  opacity: 0.5;
  cursor: not-allowed;
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .enabled {
    background: #28a745;
    border-color: #28a745;
  }
  .disabled {
    background: #495057;
    border-color: #495057;
  }
}

/* CourtArea.module.css */
.courtArea {
  width: 100%;
  max-width: 800px;
  padding: 1rem;
  background: var(--bg-secondary, #f8f9fa);
  border: 2px solid var(--border-color, #dee2e6);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.courtLabel {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text-primary, #212529);
}

.scoredPieces {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  justify-content: center;
  min-height: 2rem;
}

.pieceIcon {
  font-size: 1.5rem;
  line-height: 1;
}

.emptyText {
  font-size: 0.875rem;
  color: var(--text-secondary, #6c757d);
  font-style: italic;
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
  .courtArea {
    background: var(--bg-secondary-dark, #343a40);
    border-color: var(--border-color-dark, #495057);
  }
}

/* Mobile */
@media (max-width: 768px) {
  .courtArea {
    padding: 0.75rem;
  }
  .courtLabel {
    font-size: 1rem;
  }
}
```

---

## Validation Loop

### Level 1: Syntax & Style (MUST PASS)

```bash
# TypeScript type checking
pnpm run check

# ESLint (zero warnings)
pnpm run lint

# Expected: 0 errors, 0 warnings
```

**If Fail:**
- Fix TypeScript errors: Check Position | 'off_board' type usage
- Fix ESLint warnings: Check unused imports, prop types
- Run `pnpm run lint:fix` for auto-fixes

### Level 2: Unit Tests (MUST PASS)

```bash
# Run all tests
pnpm test

# Run specific component tests
pnpm test OffBoardButton
pnpm test CourtArea
pnpm test GameBoard

# Expected: All tests passing, 80%+ coverage
```

**New Tests Required:**
```typescript
// OffBoardButton.test.tsx
describe('OffBoardButton', () => {
  test('renders with Party! text');
  test('disabled state - grey, opacity 0.5, cursor not-allowed');
  test('enabled state - green, cursor pointer');
  test('calls onOffBoardMove when clicked (enabled)');
  test('does not call onOffBoardMove when clicked (disabled)');
  test('ARIA label describes move correctly');
  test('minimum 44px height (touch target)');
});

// CourtArea.test.tsx
describe('CourtArea', () => {
  test('renders court label correctly');
  test('shows scored pieces');
  test('shows "No pieces scored yet" when empty');
  test('shows button only for target court');
  test('hides button for non-target court');
  test('passes canMoveOffBoard to button');
});

// GameBoard.test.tsx (additions)
describe('GameBoard - Off-Board Moves', () => {
  test('shows Party button when white rook can move off-board');
  test('shows Party button when black knight can jump off-board');
  test('shows Party button when white bishop at edge crosses middle column');
  test('hides Party button when bishop cannot move off-board (corner path)');
  test('disables Party button when no piece selected');
  test('calls onMove with "off_board" when Party clicked');
  test('clears selection after off-board move');
});
```

**If Fail:**
- Check test setup: Mock gameState with pieces at edge
- Check imports: Ensure helper functions imported
- Check mocks: Ensure getPiece function returns correct pieces
- Run `pnpm test -- --watch` for live feedback

### Level 3: Integration Tests (MUST PASS)

```bash
# Run integration tests
pnpm run test:integration

# Expected: Full game flow works with off-board moves
```

**Test Scenarios:**
1. White rook moves to edge, then off-board → appears in blackCourt
2. Black knight jumps off-board → appears in whiteCourt
3. White bishop at (1,0) moves off-board → scores
4. Black bishop at (1,1) cannot move off-board (corner path) → button disabled

**If Fail:**
- Check game state updates: Inspect whiteCourt/blackCourt arrays
- Check move validation: Log validateMove results
- Check turn switching: Ensure currentPlayer updates after off-board move

### Level 4: Manual Verification (MUST PASS)

```bash
# Start dev server
pnpm dev

# Open http://localhost:5173
```

**Manual Test Checklist:**

**Test 1: White Rook Off-Board**
- [ ] Start new game
- [ ] Move white rook to (0, 0) (top-left edge)
- [ ] Click white rook → "Party!" button appears in Black King's Court (above)
- [ ] Button is green and enabled
- [ ] Click "Party!" → Rook disappears from board
- [ ] Rook icon appears in "Black King's Court" scored pieces
- [ ] Turn switches to black

**Test 2: Black Knight Jump Off-Board**
- [ ] Black's turn
- [ ] Click black knight at (0, 1)
- [ ] "Party!" button appears in White King's Court (below)
- [ ] Click "Party!" → Knight jumps off-board
- [ ] Knight icon appears in "White King's Court" scored pieces

**Test 3: White Bishop Edge Case**
- [ ] White bishop at (1, 0)
- [ ] Click bishop → "Party!" button enabled (diagonal crosses middle column)
- [ ] White bishop at (2, 0) moving toward (0, 0)
- [ ] Click bishop → "Party!" button DISABLED (corner path)

**Test 4: Button Visibility**
- [ ] White's turn: Only Black King's Court shows button
- [ ] Black's turn: Only White King's Court shows button
- [ ] No piece selected: Button is grey/disabled
- [ ] Wrong piece selected: Button disabled

**Test 5: Accessibility**
- [ ] Tab to "Party!" button with keyboard
- [ ] Press Enter → move executes
- [ ] Screen reader announces: "Move [piece] to opponent's court to score"
- [ ] Disabled button has aria-disabled="true"

**Test 6: Mobile**
- [ ] Resize to 375px width
- [ ] Button is at least 44px tall (touch target)
- [ ] Tap button → move executes
- [ ] Court areas stack properly on mobile

**Test 7: Dark Mode**
- [ ] Toggle OS dark mode
- [ ] Court areas have dark background
- [ ] Button colors adapt to dark mode
- [ ] Text is readable

**If Fail:**
- Check browser console for errors
- Check React DevTools: Inspect selectedPosition state
- Check Network tab: Ensure no API errors
- Add console.log to canSelectedPieceMoveOffBoard to debug

### Level 5: Build & Deploy (MUST PASS)

```bash
# Build for production
pnpm build

# Preview production build
pnpm preview

# Expected: Build succeeds, no runtime errors
```

**If Fail:**
- Check import paths: Ensure all imports resolve
- Check CSS modules: Ensure .module.css files imported correctly
- Check TypeScript: Run `pnpm run check` again
- Check bundle size: Should not increase by more than 10KB

---

## Rollback Strategy

**If Implementation Fails:**

1. **Revert Git Commit:**
   ```bash
   git log --oneline  # Find commit hash
   git revert <commit-hash>
   git push
   ```

2. **Remove New Files:**
   ```bash
   rm src/components/game/OffBoardButton.tsx
   rm src/components/game/OffBoardButton.module.css
   rm src/components/game/OffBoardButton.test.tsx
   rm src/components/game/CourtArea.tsx
   rm src/components/game/CourtArea.module.css
   rm src/components/game/CourtArea.test.tsx
   ```

3. **Restore GameBoard.tsx:**
   ```bash
   git checkout HEAD~1 -- src/components/game/GameBoard.tsx
   git checkout HEAD~1 -- src/components/game/GameBoard.test.tsx
   ```

4. **Restore App.tsx:**
   ```bash
   git checkout HEAD~1 -- src/App.tsx
   ```

5. **Run Tests:**
   ```bash
   pnpm test
   pnpm run validate
   ```

**Partial Rollback (If Only UI Fails):**
- Keep chess engine changes (already working)
- Remove only UI components (OffBoardButton, CourtArea)
- Restore GameBoard to previous version

---

## Debug Strategies

**Issue: Button Not Appearing**
- **Symptom:** "Party!" button never shows
- **Debug:**
  ```typescript
  // Add to GameBoard.tsx
  console.log('Selected position:', selectedPosition);
  console.log('Can move off-board:', canSelectedPieceMoveOffBoard);
  console.log('Current player:', gameState.currentPlayer);
  ```
- **Fix:** Check selectedPosition is not null, check piece owner matches currentPlayer

**Issue: Button Always Disabled**
- **Symptom:** Button shows but always grey
- **Debug:**
  ```typescript
  // Check helper function results
  const piece = gameState.board[selectedPosition[0]]?.[selectedPosition[1]];
  console.log('Piece type:', piece?.type);
  console.log('hasRookPathToEdge:', hasRookPathToEdge(selectedPosition, piece, getPieceCallback));
  ```
- **Fix:** Ensure helper functions receive correct arguments, check getPiece callback returns accurate board state

**Issue: Move Fails When Clicked**
- **Symptom:** Button clicks but move rejected
- **Debug:**
  ```typescript
  // In handleOffBoardMove
  const result = engine.makeMove(selectedPosition, 'off_board');
  console.log('Move result:', result);
  if (!result.success) {
    console.error('Validation error:', result.error);
  }
  ```
- **Fix:** Check validation in moveValidation.ts, ensure piece meets off-board criteria

**Issue: Wrong Court Shows Button**
- **Symptom:** Button appears in wrong location
- **Debug:**
  ```typescript
  // In CourtArea
  console.log('Court owner:', courtOwner);
  console.log('Current player:', currentPlayer);
  console.log('Is target court:', isTargetCourt);
  ```
- **Fix:** Check logic: `currentPlayer !== courtOwner` (white scores in black's court)

**Issue: Pieces Not Showing in Court**
- **Symptom:** Scored pieces don't display
- **Debug:**
  ```typescript
  console.log('White court:', gameState.whiteCourt);
  console.log('Black court:', gameState.blackCourt);
  ```
- **Fix:** Check executeOffBoardMove in KingsChessEngine.ts, ensure piece added to correct court array

---

## Success Checklist

**Before Marking Complete:**

- [ ] All TypeScript errors resolved (0 errors)
- [ ] All ESLint warnings resolved (0 warnings)
- [ ] All unit tests passing (OffBoardButton, CourtArea, GameBoard)
- [ ] All integration tests passing
- [ ] Test coverage ≥ 80%
- [ ] Manual testing completed (all 7 test scenarios)
- [ ] Accessibility verified (keyboard nav, screen reader, ARIA)
- [ ] Mobile testing completed (375px width minimum)
- [ ] Dark mode testing completed
- [ ] Production build succeeds
- [ ] No console errors in production build
- [ ] Bundle size increase ≤ 10KB
- [ ] Git commit created with conventional commit message
- [ ] PR description includes screenshots/video
- [ ] Documentation updated (if needed)

**Performance Targets:**
- [ ] Off-board button click → move executes in < 100ms
- [ ] Button state updates in < 50ms when selection changes
- [ ] Court area renders with < 16ms (60fps)
- [ ] No memory leaks (check with React DevTools Profiler)

**Code Quality Targets:**
- [ ] All new functions have JSDoc comments
- [ ] All new components have usage examples
- [ ] All props have TypeScript types
- [ ] All CSS uses modules (no global styles)
- [ ] All magic numbers extracted to constants
- [ ] No console.log statements in production code
- [ ] No commented-out code

---

## Additional Notes

**Future Enhancements (NOT in this PRP):**
- Animated piece movement to court area (Phase 7)
- Sound effect when piece scores (Phase 7)
- Confetti animation on off-board move (Phase 7)
- Undo button for last move (Phase 8)
- Move history panel (Phase 8)

**Known Limitations:**
- Does not implement visual board state comparison (deferred to Phase 6)
- Does not show move preview animation (deferred to Phase 7)
- Does not persist off-board moves in URL history (already handled by Phase 3)

**Dependencies:**
- React 19.1
- TypeScript 5.9
- Vite 7.1
- Vitest 3.x
- No new dependencies required

---

**END OF PRP**
