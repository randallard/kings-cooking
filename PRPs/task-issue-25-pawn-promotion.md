# Task PRP: Implement Pawn Promotion (#25)

**Issue**: https://github.com/randallard/kings-cooking/issues/25
**Branch**: `issue-25-pawn-promotion`
**Type**: 🎯 Feature (chess variant rule implementation)
**Complexity**: Medium-High (affects engine, UI, URL sync)

---

## Goal

Implement standard chess pawn promotion when pawns reach the opponent's starting row (row 0 for light pawns, row 2 for dark pawns). Players choose from queen/rook/bishop/knight via modal UI.

**Success Criteria**:
- Pawn reaching opposite edge triggers promotion modal
- Player selects promotion piece type
- Pawn transforms into selected piece
- Cancel button reverses move
- En passant eligibility preserved after 2-square jump + promotion
- URL mode: remote player sees promoted piece automatically
- All tests pass with 80%+ coverage

---

## Why

**User Value**:
- Unlocks standard chess promotion mechanic for King's Cooking variant
- Strategic depth: players can choose best promotion piece for situation
- Completes pawn mechanics (already have movement, capture, en passant)

**Technical Debt**:
- Currently blocks pawns from moving off-board (see `moveValidation.ts:210-219`)
- TODO comments already in codebase (lines 211-214, 191-193)

---

## What (User-Visible Behavior)

### Hot-Seat Mode Flow
1. Player moves pawn to opponent's starting row
2. **Modal appears**: "Choose a piece to confirm and promote"
3. **Options**: Queen, Rook, Bishop, Knight (with piece icons)
4. **Cancel button**: Reverses move, pawn returns to starting position
5. **Select piece**: Pawn transforms, move confirmed, turn switches

### URL Mode Flow
1. Player 1 moves pawn to promotion row → modal appears → selects piece
2. Player 1 shares URL with promoted piece already in state
3. Player 2 loads URL → sees promoted piece on board (no modal)
4. Move history shows promotion in move list

### En Passant Edge Case
**Scenario**: Pawn makes 2-square first move AND lands on promotion row
```
Before:  [L][D][ ]    (Light pawn at row 2, Dark pawn at row 0)
Move:    Light pawn moves 2 squares up to row 0 (promotion row)
After:   [L→Q][D][ ]  (Promoted to Queen)
Result:  Dark pawn can STILL capture en passant on next move
```

**Why this matters**: `Move.piece` must preserve original piece type `'pawn'` for en passant detection, even after promotion changes the on-board piece.

---

## All Needed Context

### Documentation

**React 19 Patterns**:
- File: `/home/ryankhetlyr/Development/kings-cooking/claude_md_files/CLAUDE-REACT.md`
- Focus: Modal components, focus management, accessibility

**Existing Promotion Research**:
- Similar issue: #33 (en passant capture fix) - shows how to detect pawn moves
- Pattern: PiecePickerModal already exists for piece selection during setup

**Zod Validation Patterns**:
- File: `kings-cooking-docs/ZOD_VALIDATION_PATTERNS_RESEARCH.md`
- Focus: Schema extensions, optional fields, type narrowing

### Codebase Patterns

**PiecePickerModal Component** (`src/components/game/PiecePickerModal.tsx`):
```typescript
// Already exists! Can reuse with minor modifications
interface PiecePickerModalProps {
  isOpen: boolean;
  availablePieces: PieceType[];  // For promotion: ['queen', 'rook', 'bishop', 'knight']
  onSelect: (piece: PieceType) => void;
  onClose: () => void;  // For cancel button
  position: number;
}

// Features:
// - Keyboard navigation (Tab, Escape)
// - Focus trapping
// - Accessible (ARIA labels, role="dialog")
// - Already styled with CSS modules
```

**En Passant Detection** (`src/lib/chess/KingsChessEngine.ts:294-323`):
```typescript
// Handle EN PASSANT capture (pawn only)
if (piece.type === 'pawn' && !targetPiece) {
  const lastMove = this.gameState.moveHistory[this.gameState.moveHistory.length - 1];
  if (lastMove?.piece.type === 'pawn') {  // ← Uses lastMove.piece for detection
    // Check if last move was a 2-square pawn move
    const moveDistance = Math.abs(lastMove.to[0] - lastMove.from[0]);
    if (moveDistance === 2) {
      // En passant capture logic
    }
  }
}
```

**Key Insight**: `Move.piece` stores the ORIGINAL piece at move time, not the current piece state. This is CRITICAL for promotion.

### Gotchas and Pitfalls

1. **Move.piece must remain 'pawn' after promotion**
   - Issue: If we update `Move.piece.type` to 'queen', en passant detection breaks
   - Fix: `Move.piece` is a snapshot at move time. Keep it as 'pawn' even after board piece becomes 'queen'
   - Validation: Test case where 2-square pawn jump + promotion still allows en passant capture

2. **Cancel must fully reverse move**
   - Must restore: board state, piece position, moveCount
   - Don't add to move history if cancelled
   - Return focus to game board after cancel

3. **Off-board detection vs promotion**
   - Current code: `moveValidation.ts:210-219` blocks pawns from moving off-board
   - New behavior: Allow pawns to reach opponent's starting row ON-BOARD
   - Promotion row is row 0 (light) or row 2 (dark) - these are ON the 3x3 board
   - Off-board is BEYOND these rows (not possible on 3x3 board for pawns)

4. **Pending promotion state**
   - Need temporary state between "move validation passed" and "piece selected"
   - Options:
     - A) Add `pendingPromotion` field to GameState (requires schema change)
     - B) Handle in UI layer with React state (cleaner, no schema change)
   - **Recommendation**: Option B - React state in GameBoard/App component

5. **URL mode edge case**
   - Player 1 promotes pawn → creates URL with promoted piece
   - Player 2 loads URL → no promotion modal, just sees promoted piece
   - This is CORRECT behavior (matches existing move sync pattern)

6. **MoveResult vs GameState**
   - `makeMove()` returns `MoveResult` with new `gameState`
   - If promotion needed, return `success: false` with special flag?
   - OR return `success: true` but delay state update until promotion selected?
   - **Recommendation**: Return special result for promotion needed, handle in UI

### Dependencies

**Files to modify**:
- `src/lib/chess/moveValidation.ts` (remove pawn off-board restriction)
- `src/lib/chess/KingsChessEngine.ts` (add promotion detection and execution)
- `src/lib/chess/types.ts` (add `PromotionResult` type)
- `src/components/game/PiecePickerModal.tsx` (add promotion mode support)
- `src/components/game/GameBoard.tsx` (handle promotion flow)
- `src/App.tsx` (integrate promotion modal)
- `src/lib/validation/schemas.ts` (possibly add optional pending promotion field)

**Files to create tests**:
- `src/lib/chess/promotion.test.ts` (new test file for promotion logic)
- Update `src/lib/chess/KingsChessEngine.test.ts` (add promotion scenarios)
- Update `src/components/game/PiecePickerModal.test.tsx` (add promotion mode tests)

---

## Implementation Blueprint

### Phase 1: Chess Engine (Core Logic)

#### Task 1.1: Update MoveValidation (Remove Pawn Off-Board Block)

**File**: `src/lib/chess/moveValidation.ts`

**Current code** (lines 210-219):
```typescript
if (piece.type === 'pawn') {
  // TODO: Issue #25 - Implement pawn promotion instead of blocking off-board
  return {
    valid: false,
    reason: 'Pawns cannot move off-board. They score by being captured.',
  };
}
```

**Change to**:
```typescript
if (piece.type === 'pawn') {
  // Pawns reaching opponent's starting row will trigger promotion
  // This is handled in KingsChessEngine.makeMove()
  // Pawns cannot move completely off-board (beyond starting rows)
  return {
    valid: false,
    reason: 'Pawns promote when reaching opponent starting row, cannot move off-board',
  };
}
```

**Why**: Clarify that pawns CAN reach promotion row (on-board move), but CANNOT go off-board.

**Validation**:
```bash
pnpm test src/lib/chess/moveValidation.test.ts
```

---

#### Task 1.2: Add Promotion Detection Logic

**File**: `src/lib/chess/KingsChessEngine.ts`

**Location**: In `makeMove()` method, after validation passes (around line 209)

**Current code**:
```typescript
// Execute move
if (to === 'off_board') {
  return this.executeOffBoardMove(from, piece);
} else {
  return this.executeStandardMove(from, to, piece);
}
```

**Change to**:
```typescript
// Check for pawn promotion BEFORE executing move
if (to !== 'off_board' && piece.type === 'pawn') {
  const promotionRow = piece.owner === 'light' ? 0 : 2;
  if (to[0] === promotionRow) {
    // Pawn reached promotion row - require promotion piece selection
    return {
      success: false,
      requiresPromotion: true,
      from,
      to,
      piece,
      error: 'Pawn promotion required',
    };
  }
}

// Execute move
if (to === 'off_board') {
  return this.executeOffBoardMove(from, piece);
} else {
  return this.executeStandardMove(from, to, piece);
}
```

**Validation**: Test that pawn moves to promotion row return `requiresPromotion: true`

---

#### Task 1.3: Add Promotion Execution Method

**File**: `src/lib/chess/KingsChessEngine.ts`

**Location**: Add new public method after `makeMove()`

```typescript
/**
 * Execute a pawn promotion.
 *
 * CRITICAL: This method completes a move that was started by makeMove().
 * Call sequence:
 * 1. makeMove(from, to) → returns requiresPromotion: true
 * 2. User selects promotion piece via UI
 * 3. promotePawn(from, to, promotionPiece) → executes move with promotion
 *
 * En Passant Edge Case:
 * - If pawn makes 2-square jump to promotion row, Move.piece must preserve 'pawn' type
 * - This allows adjacent enemy pawns to capture en passant on next turn
 * - Board piece becomes promoted type, but Move.piece stays as 'pawn' for history
 *
 * @param from - Starting position (same as original makeMove call)
 * @param to - Promotion row position (same as original makeMove call)
 * @param promotionPiece - Type to promote to ('queen', 'rook', 'bishop', 'knight')
 * @returns Move result with updated game state
 */
public promotePawn(
  from: Position,
  to: Position,
  promotionPiece: 'queen' | 'rook' | 'bishop' | 'knight'
): MoveResult {
  const piece = this.getPieceAt(from);

  if (!piece || piece.type !== 'pawn') {
    return {
      success: false,
      error: 'No pawn at starting position',
    };
  }

  if (!to) {
    return {
      success: false,
      error: 'Invalid promotion position',
    };
  }

  // Verify promotion row
  const promotionRow = piece.owner === 'light' ? 0 : 2;
  if (to[0] !== promotionRow) {
    return {
      success: false,
      error: 'Pawn is not on promotion row',
    };
  }

  // Execute the move FIRST (handles captures, en passant detection)
  const moveResult = this.executeStandardMove(from, to, piece);

  if (!moveResult.success) {
    return moveResult;
  }

  // THEN promote the piece on the board
  // Get the piece from destination (it was moved by executeStandardMove)
  const movedPiece = this.getPieceAt(to);

  if (!movedPiece) {
    return {
      success: false,
      error: 'Piece not found at destination after move',
    };
  }

  // CRITICAL: Change piece type on board
  movedPiece.type = promotionPiece;

  // CRITICAL: Move.piece in history already recorded as 'pawn'
  // This preserves en passant detection for 2-square jumps
  // Do NOT update Move.piece - it's a historical snapshot

  return {
    success: true,
    gameState: this.gameState,
    promoted: true,
    promotionPiece,
  };
}
```

**Validation**:
```bash
# Test promotion execution
pnpm test src/lib/chess/KingsChessEngine.test.ts -t "promotion"
```

---

#### Task 1.4: Update MoveResult Type

**File**: `src/lib/chess/types.ts`

**Add new fields**:
```typescript
export interface MoveResult {
  success: boolean;
  error?: string;
  gameState?: GameState;
  captured?: Piece;

  // NEW: Promotion fields
  requiresPromotion?: boolean;  // True if pawn reached promotion row
  promoted?: boolean;            // True if promotion was executed
  promotionPiece?: 'queen' | 'rook' | 'bishop' | 'knight';  // Type promoted to
  from?: Position;              // Original position (for promotion flow)
  to?: Position | 'off_board';  // Destination position (for promotion flow)
  piece?: Piece;                // Piece being moved (for promotion flow)
}
```

**Validation**: TypeScript compilation should pass

---

### Phase 2: UI Components

#### Task 2.1: Extend PiecePickerModal for Promotion

**File**: `src/components/game/PiecePickerModal.tsx`

**Changes**:
1. Add `mode` prop: `'selection' | 'promotion'`
2. Change title based on mode
3. For promotion mode:
   - Title: "Choose a piece to confirm and promote"
   - Available pieces: `['queen', 'rook', 'bishop', 'knight']`
   - Close button text: "Cancel" (visible and emphasized)

**Updated interface**:
```typescript
interface PiecePickerModalProps {
  isOpen: boolean;
  availablePieces: PieceType[];
  onSelect: (piece: PieceType) => void;
  onClose: () => void;
  position?: number;  // Optional for promotion mode
  mode?: 'selection' | 'promotion';  // NEW
}
```

**Updated render**:
```tsx
<h2 id="piece-picker-title" className={styles.title}>
  {mode === 'promotion'
    ? 'Choose a piece to confirm and promote'
    : `Choose Piece for Position ${position + 1}`
  }
</h2>

{/* Emphasize cancel button for promotion */}
<button
  type="button"
  onClick={onClose}
  className={mode === 'promotion' ? styles.cancelButton : styles.closeButton}
  aria-label={mode === 'promotion' ? 'Cancel promotion' : 'Close modal'}
>
  {mode === 'promotion' ? 'Cancel' : '✕'}
</button>
```

**Validation**:
```bash
pnpm test src/components/game/PiecePickerModal.test.tsx
```

---

#### Task 2.2: Add Promotion Flow to GameBoard

**File**: `src/components/game/GameBoard.tsx`

**Changes**:
1. Add state for pending promotion
2. Intercept move confirmation when promotion needed
3. Show promotion modal
4. Handle promotion piece selection
5. Handle cancel (reverse move)

**New state**:
```typescript
const [pendingPromotion, setPendingPromotion] = useState<{
  from: Position;
  to: Position;
  piece: Piece;
} | null>(null);
```

**Updated handleMoveConfirm**:
```typescript
const handleMoveConfirm = useCallback(() => {
  if (!selectedCell || !targetCell || !engine) return;

  // Attempt move
  const result = engine.makeMove(selectedCell, targetCell);

  // Check if promotion required
  if (!result.success && result.requiresPromotion) {
    setPendingPromotion({
      from: result.from!,
      to: result.to as Position,
      piece: result.piece!,
    });
    // Don't clear selection yet - keep board state
    return;
  }

  // Handle normal move result
  if (result.success) {
    onMove(result.gameState);
    clearSelection();
  } else {
    setError(result.error ?? 'Invalid move');
  }
}, [selectedCell, targetCell, engine, onMove, clearSelection]);
```

**Handle promotion selection**:
```typescript
const handlePromotionSelect = useCallback((promotionPiece: PieceType) => {
  if (!pendingPromotion || !engine) return;

  const result = engine.promotePawn(
    pendingPromotion.from,
    pendingPromotion.to,
    promotionPiece as 'queen' | 'rook' | 'bishop' | 'knight'
  );

  if (result.success) {
    onMove(result.gameState);
    setPendingPromotion(null);
    clearSelection();
  } else {
    setError(result.error ?? 'Promotion failed');
  }
}, [pendingPromotion, engine, onMove, clearSelection]);

const handlePromotionCancel = useCallback(() => {
  // Just close modal and clear selection
  // No move was executed yet
  setPendingPromotion(null);
  clearSelection();
}, [clearSelection]);
```

**Render modal**:
```tsx
<PiecePickerModal
  isOpen={!!pendingPromotion}
  availablePieces={['queen', 'rook', 'bishop', 'knight']}
  onSelect={handlePromotionSelect}
  onClose={handlePromotionCancel}
  mode="promotion"
/>
```

**Validation**:
```bash
pnpm test src/components/game/GameBoard.test.tsx -t "promotion"
```

---

### Phase 3: Testing Strategy

#### Task 3.1: Unit Tests for Promotion Logic

**File**: `src/lib/chess/KingsChessEngine.test.ts`

**Add test suite**:
```typescript
describe('Pawn Promotion', () => {
  test('should detect promotion when light pawn reaches row 0', () => {
    // Setup: Place light pawn at row 1
    // Move: Pawn moves to row 0
    // Assert: makeMove returns requiresPromotion: true
  });

  test('should detect promotion when dark pawn reaches row 2', () => {
    // Setup: Place dark pawn at row 1
    // Move: Pawn moves to row 2
    // Assert: makeMove returns requiresPromotion: true
  });

  test('should promote pawn to queen', () => {
    // Setup: Light pawn at row 1
    // Execute: makeMove to row 0, then promotePawn('queen')
    // Assert: Piece at row 0 has type 'queen'
    // Assert: Move history shows piece.type === 'pawn' (original)
  });

  test('should promote to all piece types', () => {
    for (const piece of ['queen', 'rook', 'bishop', 'knight']) {
      // Test promotion to each type
    }
  });

  test('should preserve en passant after 2-square jump + promotion', () => {
    // Setup: Light pawn at row 2 (starting position)
    // Move 1: Light pawn jumps 2 squares to row 0 (promotion row)
    // Execute: Promote to queen
    // Setup: Dark pawn at row 0, col+1
    // Assert: Dark pawn can capture en passant
    // Critical: Check Move.piece.type === 'pawn' in move history
  });

  test('should reject promotion from non-promotion row', () => {
    // Setup: Pawn at row 1
    // Execute: promotePawn() on row 1 position
    // Assert: Returns success: false
  });

  test('should reject promotion of non-pawn piece', () => {
    // Setup: Rook at promotion row
    // Execute: promotePawn()
    // Assert: Returns success: false
  });
});
```

**Validation**:
```bash
pnpm test src/lib/chess/KingsChessEngine.test.ts -t "Pawn Promotion"
```

---

#### Task 3.2: Component Tests for Promotion Modal

**File**: `src/components/game/PiecePickerModal.test.tsx`

**Add test suite**:
```typescript
describe('Promotion Mode', () => {
  test('should show promotion title in promotion mode', () => {
    render(
      <PiecePickerModal
        isOpen={true}
        availablePieces={['queen', 'rook', 'bishop', 'knight']}
        onSelect={() => {}}
        onClose={() => {}}
        mode="promotion"
      />
    );

    expect(screen.getByText('Choose a piece to confirm and promote')).toBeInTheDocument();
  });

  test('should show Cancel button in promotion mode', () => {
    const onClose = vi.fn();
    render(
      <PiecePickerModal
        isOpen={true}
        availablePieces={['queen', 'rook', 'bishop', 'knight']}
        onSelect={() => {}}
        onClose={onClose}
        mode="promotion"
      />
    );

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    expect(cancelButton).toBeInTheDocument();

    fireEvent.click(cancelButton);
    expect(onClose).toHaveBeenCalledOnce();
  });

  test('should call onSelect with chosen piece', () => {
    const onSelect = vi.fn();
    render(
      <PiecePickerModal
        isOpen={true}
        availablePieces={['queen', 'rook', 'bishop', 'knight']}
        onSelect={onSelect}
        onClose={() => {}}
        mode="promotion"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /queen/i }));
    expect(onSelect).toHaveBeenCalledWith('queen');
  });
});
```

**Validation**:
```bash
pnpm test src/components/game/PiecePickerModal.test.tsx -t "Promotion Mode"
```

---

#### Task 3.3: Integration Tests for Full Promotion Flow

**File**: `src/components/game/GameBoard.test.tsx`

**Add test suite**:
```typescript
describe('Pawn Promotion Integration', () => {
  test('should show promotion modal when pawn reaches promotion row', async () => {
    // Setup: GameBoard with light pawn at row 1
    // Action: Click pawn, click row 0 square, click confirm
    // Assert: Promotion modal appears
    // Assert: Modal shows 4 piece options
  });

  test('should promote pawn when piece selected', async () => {
    // Setup: Trigger promotion modal
    // Action: Click 'queen' button
    // Assert: Modal closes
    // Assert: onMove called with promoted piece
    // Assert: Board shows queen at promotion row
  });

  test('should cancel promotion and reverse move', async () => {
    // Setup: Trigger promotion modal
    // Action: Click 'Cancel' button
    // Assert: Modal closes
    // Assert: Board state unchanged (pawn still at original position)
    // Assert: onMove NOT called
  });
});
```

**Validation**:
```bash
pnpm test src/components/game/GameBoard.test.tsx -t "Pawn Promotion Integration"
```

---

### Phase 4: Validation Gates

**Level 1: TypeScript + ESLint**
```bash
pnpm run check
pnpm run lint
```
Expected: 0 errors, 0 warnings

**Level 2: Unit Tests**
```bash
pnpm test
```
Expected: All tests pass, coverage ≥ 80%

**Level 3: Integration Tests**
```bash
pnpm test:integration
```
Expected: All integration tests pass

**Level 4: E2E Tests** (if applicable)
```bash
pnpm test:e2e
```
Expected: Promotion flow works in both hot-seat and URL modes

**Level 5: Build**
```bash
pnpm build
```
Expected: Production build succeeds

---

## Rollback Strategy

**If promotion breaks existing tests**:
1. Revert `moveValidation.ts` changes → restore pawn off-board block
2. Keep `promotePawn()` method but disable call path
3. Comment out modal integration in GameBoard

**If en passant breaks**:
1. Check `Move.piece` snapshot logic in `executeStandardMove()`
2. Verify tests use `lastMove.piece.type` not `getPieceAt().type`

**If URL sync breaks**:
1. Verify promoted piece is in `gameState.board` correctly
2. Check URL builder includes promoted piece type
3. Test URL parser handles piece type changes

---

## Success Checklist

- [ ] `makeMove()` detects pawn reaching promotion row
- [ ] `makeMove()` returns `requiresPromotion: true` for promotion moves
- [ ] `promotePawn()` method executes promotion correctly
- [ ] PiecePickerModal has promotion mode with "Cancel" button
- [ ] GameBoard shows promotion modal at correct time
- [ ] Selecting promotion piece updates board
- [ ] Cancel button closes modal without executing move
- [ ] En passant works after 2-square jump + promotion
- [ ] `Move.piece` preserves 'pawn' type in history
- [ ] URL mode: promoted piece syncs correctly
- [ ] All unit tests pass (promotion scenarios)
- [ ] All component tests pass (modal, GameBoard)
- [ ] All integration tests pass
- [ ] TypeScript: 0 errors
- [ ] ESLint: 0 warnings
- [ ] Test coverage: ≥ 80%
- [ ] Production build: succeeds

---

## References

**Related Issues**:
- #33 - En passant capture fix (shows pawn move detection pattern)
- #6 - Piece selection (PiecePickerModal created for this)
- #43 - History replay (move history infrastructure complete)

**Key Files**:
- `/home/ryankhetlyr/Development/kings-cooking/claude_md_files/CLAUDE-REACT.md` - React 19 patterns
- `src/lib/chess/KingsChessEngine.ts:294-323` - En passant implementation (reference for Move.piece usage)
- `src/components/game/PiecePickerModal.tsx` - Existing modal to extend
- `PRPs/task-issue-33-fix-en-passant-capture.md` - Similar pawn logic fix

**Testing Patterns**:
- TDD: Red → Green → Refactor
- Write failing test FIRST
- Minimum code to pass
- Refactor while keeping tests green

---

**Generated**: 2025-10-21
**Framework**: PRP (Product Requirement Prompt)
**AI Agent**: Claude Code
