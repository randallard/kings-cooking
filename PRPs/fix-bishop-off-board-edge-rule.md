# Fix Bishop Off-Board from Edge - Task PRP

**Version:** 1.0.0
**Date:** 2025-10-17
**Status:** Ready for Implementation
**Type:** TASK PRP (Bug Fix)

---

## Goal

Fix `canBishopMoveOffBoard()` function to allow bishops already positioned on the opponent's starting row to move off-board, in addition to the existing single-move diagonal rule.

**Success Criteria:**
- White bishop at any position on row 0 (black's starting row) can move off-board
- Black bishop at any position on row 2 (white's starting row) can move off-board
- Existing diagonal-through-middle-column rule still works
- All tests pass with 80%+ coverage
- TypeScript and ESLint validation passes

---

## Why

**Business Value:**
- Players cannot score with bishops that have reached the opponent's edge
- This breaks game flow and prevents legitimate scoring moves
- Creates frustration when "Party!" button doesn't enable for valid moves

**User Impact:**
- Bishop at [0, 0] (corner of opponent's row) cannot move off-board (should be able to)
- Bishop at [0, 2] (other corner) cannot move off-board (should be able to)
- Only bishops at [0, 1] (middle) can currently move off-board from edge positions

---

## What

### Current Behavior (Broken)

**Rule:** Bishops can ONLY move off-board if diagonal path crosses through middle column (col 1)

**Test Case:**
```typescript
// White bishop at [0, 0] - black's starting row, left corner
const result = canBishopMoveOffBoard([0, 0], whiteBishop, getPiece);
// Result: false ❌ (WRONG - should be true)
```

**Problem:** The function only checks if the diagonal path crosses column 1, ignoring the simpler rule that bishops already on the edge can move off-board.

### Expected Behavior (Fixed)

**Two Rules (OR condition):**
1. **Edge Rule:** Bishop is already on opponent's starting row → can move off-board
2. **Diagonal Rule:** Bishop's diagonal path crosses through middle column (col 1) → can move off-board

**Test Cases:**
```typescript
// Rule 1: Edge positions
canBishopMoveOffBoard([0, 0], whiteBishop, getPiece) // true ✅
canBishopMoveOffBoard([0, 1], whiteBishop, getPiece) // true ✅
canBishopMoveOffBoard([0, 2], whiteBishop, getPiece) // true ✅

// Rule 2: Diagonal through middle
canBishopMoveOffBoard([1, 0], whiteBishop, getPiece) // true if clear path to [0,1] ✅

// Invalid cases
canBishopMoveOffBoard([1, 1], whiteBishop, getPiece) // false (corner diagonal) ✅
canBishopMoveOffBoard([2, 0], whiteBishop, getPiece) // false (own starting row) ✅
```

---

## All Needed Context

### Current Implementation

**File:** `src/lib/chess/pieceMovement.ts:251-288`

```typescript
export function canBishopMoveOffBoard(
  from: Position,
  piece: Piece,
  getPiece: (pos: Position) => Piece | null
): boolean {
  if (!from || piece.type !== 'bishop') return false;

  const diagonals: Direction[] = [[1, 1], [1, -1], [-1, 1], [-1, -1]];

  for (const [dr, dc] of diagonals) {
    let row = from[0] + dr;
    let col = from[1] + dc;

    // Follow diagonal path until reaching edge or blocked
    while (isInBounds(row, col)) {
      if (getPiece([row, col])) break; // Path blocked

      row += dr;
      col += dc;
    }

    // Check if we exited through opponent's edge (not side edge)
    const exitedThroughOpponentEdge =
      piece.owner === 'white' ? row < 0 : row > 2;

    if (!exitedThroughOpponentEdge) continue; // Wrong edge

    // Check which column the diagonal crosses through opponent's row
    const crossingColumn = col - dc;

    // Can move off-board if crossing through MIDDLE column (1)
    if (crossingColumn === 1) return true;
  }

  return false; // No valid diagonal path to move off-board
}
```

### The Fix

**Add early return check at the beginning:**

```typescript
export function canBishopMoveOffBoard(
  from: Position,
  piece: Piece,
  getPiece: (pos: Position) => Piece | null
): boolean {
  if (!from || piece.type !== 'bishop') return false;

  // NEW: Rule 1 - Bishop already on opponent's starting row
  const onOpponentStartingRow =
    (piece.owner === 'white' && from[0] === 0) ||
    (piece.owner === 'black' && from[0] === 2);

  if (onOpponentStartingRow) return true; // ✨ NEW

  // Existing Rule 2 - Diagonal through middle column
  const diagonals: Direction[] = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
  // ... rest of existing code
}
```

### Game Rules Reference

**From PRD.md and kings-cooking-docs/kings-cooking.md:**

1. **Bishop Edge Rule (Option C):** Bishop can move off-board in a single move from ANY edge position on opponent's starting row
2. **Bishop Diagonal Rule (Option B):** Bishop can move off-board in a SINGLE MOVE if diagonal path crosses through middle column (col 1) of opponent's starting row

Both rules should work (OR condition).

### Existing Tests to Update

**File:** `src/lib/chess/pieceMovement.test.ts`

Current tests likely don't cover edge positions. Need to add:
```typescript
describe('canBishopMoveOffBoard', () => {
  describe('edge position rule', () => {
    test('white bishop at [0, 0] can move off-board');
    test('white bishop at [0, 1] can move off-board');
    test('white bishop at [0, 2] can move off-board');
    test('black bishop at [2, 0] can move off-board');
    test('black bishop at [2, 1] can move off-board');
    test('black bishop at [2, 2] can move off-board');
  });

  describe('diagonal through middle column rule', () => {
    test('white bishop at [1, 0] with clear path to [0, 1] can move off-board');
    // ... existing diagonal tests
  });

  describe('invalid cases', () => {
    test('white bishop at [2, 0] on own starting row cannot move off-board');
    test('bishop with blocked path cannot move off-board');
  });
});
```

### Gotchas

1. **Opponent's Starting Row Definition:**
   - White's starting row: row 2
   - Black's starting row: row 0
   - White bishop on row 0 = on BLACK's starting row = can score
   - Black bishop on row 2 = on WHITE's starting row = can score

2. **Don't Remove Existing Logic:**
   - The diagonal-through-middle-column rule is still valid
   - Add the edge rule as an additional condition (OR, not replacement)

3. **Side Edges Still Block:**
   - Bishops cannot move through side edges (col < 0 or col > 2)
   - This is already handled by bishop movement validation
   - No additional check needed

---

## Implementation Blueprint

### Task Breakdown

**Task 1: Update canBishopMoveOffBoard Function**
- Add early return check for bishop on opponent's starting row
- Keep existing diagonal-through-middle-column logic
- Update JSDoc comments to document both rules

**Task 2: Add Unit Tests**
- Test white bishop at [0, 0], [0, 1], [0, 2] - all should return true
- Test black bishop at [2, 0], [2, 1], [2, 2] - all should return true
- Test bishops on own starting row - should return false
- Test bishops at middle positions with/without clear diagonal - existing tests

**Task 3: Run Validation**
- TypeScript check: `pnpm run check`
- ESLint check: `pnpm run lint`
- Unit tests: `pnpm test pieceMovement.test`
- Full test suite: `pnpm test`

**Task 4: Manual Testing**
- Start game in hot-seat mode
- Move white bishop to [0, 0] (black's starting row corner)
- Select the bishop
- Verify "Party!" button is enabled
- Click "Party!" and verify bishop scores

---

## Implementation Code

### Updated Function

```typescript
/**
 * Check if bishop can move off-board based on position or diagonal trajectory.
 *
 * KING'S COOKING RULES:
 * 1. Bishops already on opponent's starting row can move off-board
 * 2. Bishops can move off-board if diagonal path crosses MIDDLE column (col 1) of opponent's row
 *
 * @param from - Starting position
 * @param piece - Piece to check (must be bishop)
 * @param getPiece - Function to get piece at position
 * @returns True if bishop can move off-board
 *
 * @example
 * // Rule 1: Bishop on opponent's starting row
 * canBishopMoveOffBoard([0, 0], whiteBishop, getPiece); // true
 *
 * @example
 * // Rule 2: Diagonal through middle column
 * // White bishop at (1,0) with clear path through (0,1)
 * canBishopMoveOffBoard([1, 0], whiteBishop, getPiece); // true if path clear
 */
export function canBishopMoveOffBoard(
  from: Position,
  piece: Piece,
  getPiece: (pos: Position) => Piece | null
): boolean {
  if (!from || piece.type !== 'bishop') return false;

  // Rule 1: Bishop already on opponent's starting row
  // White bishops score on row 0 (black's starting row)
  // Black bishops score on row 2 (white's starting row)
  const onOpponentStartingRow =
    (piece.owner === 'white' && from[0] === 0) ||
    (piece.owner === 'black' && from[0] === 2);

  if (onOpponentStartingRow) return true;

  // Rule 2: Diagonal path through middle column
  const diagonals: Direction[] = [[1, 1], [1, -1], [-1, 1], [-1, -1]];

  for (const [dr, dc] of diagonals) {
    let row = from[0] + dr;
    let col = from[1] + dc;

    // Follow diagonal path until reaching edge or blocked
    while (isInBounds(row, col)) {
      if (getPiece([row, col])) break; // Path blocked

      row += dr;
      col += dc;
    }

    // Check if we exited through opponent's edge (not side edge)
    const exitedThroughOpponentEdge =
      piece.owner === 'white' ? row < 0 : row > 2;

    if (!exitedThroughOpponentEdge) continue; // Wrong edge

    // Check which column the diagonal crosses through opponent's row
    // Step back to last valid column before going off-board
    const crossingColumn = col - dc;

    // Can move off-board if crossing through MIDDLE column (1)
    // Must stop if crossing through CORNER columns (0 or 2)
    if (crossingColumn === 1) return true;
  }

  return false; // No valid path to move off-board
}
```

### New Tests

```typescript
describe('canBishopMoveOffBoard', () => {
  describe('Rule 1: Bishop on opponent starting row', () => {
    test('white bishop at [0, 0] (black starting row, left corner) can move off-board', () => {
      const whiteBishop = createMockPiece('bishop', 'white', [0, 0]);
      const getPiece = vi.fn().mockReturnValue(null);

      const result = canBishopMoveOffBoard([0, 0], whiteBishop, getPiece);

      expect(result).toBe(true);
    });

    test('white bishop at [0, 1] (black starting row, middle) can move off-board', () => {
      const whiteBishop = createMockPiece('bishop', 'white', [0, 1]);
      const getPiece = vi.fn().mockReturnValue(null);

      const result = canBishopMoveOffBoard([0, 1], whiteBishop, getPiece);

      expect(result).toBe(true);
    });

    test('white bishop at [0, 2] (black starting row, right corner) can move off-board', () => {
      const whiteBishop = createMockPiece('bishop', 'white', [0, 2]);
      const getPiece = vi.fn().mockReturnValue(null);

      const result = canBishopMoveOffBoard([0, 2], whiteBishop, getPiece);

      expect(result).toBe(true);
    });

    test('black bishop at [2, 0] (white starting row, left corner) can move off-board', () => {
      const blackBishop = createMockPiece('bishop', 'black', [2, 0]);
      const getPiece = vi.fn().mockReturnValue(null);

      const result = canBishopMoveOffBoard([2, 0], blackBishop, getPiece);

      expect(result).toBe(true);
    });

    test('black bishop at [2, 1] (white starting row, middle) can move off-board', () => {
      const blackBishop = createMockPiece('bishop', 'black', [2, 1]);
      const getPiece = vi.fn().mockReturnValue(null);

      const result = canBishopMoveOffBoard([2, 1], blackBishop, getPiece);

      expect(result).toBe(true);
    });

    test('black bishop at [2, 2] (white starting row, right corner) can move off-board', () => {
      const blackBishop = createMockPiece('bishop', 'black', [2, 2]);
      const getPiece = vi.fn().mockReturnValue(null);

      const result = canBishopMoveOffBoard([2, 2], blackBishop, getPiece);

      expect(result).toBe(true);
    });

    test('white bishop at [2, 0] (own starting row) cannot move off-board', () => {
      const whiteBishop = createMockPiece('bishop', 'white', [2, 0]);
      const getPiece = vi.fn().mockReturnValue(null);

      const result = canBishopMoveOffBoard([2, 0], whiteBishop, getPiece);

      expect(result).toBe(false);
    });

    test('black bishop at [0, 0] (own starting row) cannot move off-board', () => {
      const blackBishop = createMockPiece('bishop', 'black', [0, 0]);
      const getPiece = vi.fn().mockReturnValue(null);

      const result = canBishopMoveOffBoard([0, 0], blackBishop, getPiece);

      expect(result).toBe(false);
    });
  });

  describe('Rule 2: Diagonal through middle column (existing tests)', () => {
    test('white bishop at [1, 0] with clear diagonal through [0, 1] can move off-board', () => {
      const whiteBishop = createMockPiece('bishop', 'white', [1, 0]);
      const getPiece = vi.fn().mockReturnValue(null);

      const result = canBishopMoveOffBoard([1, 0], whiteBishop, getPiece);

      expect(result).toBe(true);
    });

    test('white bishop at [1, 1] with corner diagonal cannot move off-board', () => {
      const whiteBishop = createMockPiece('bishop', 'white', [1, 1]);
      const getPiece = vi.fn().mockReturnValue(null);

      const result = canBishopMoveOffBoard([1, 1], whiteBishop, getPiece);

      expect(result).toBe(false); // Diagonal exits through corners
    });
  });
});
```

---

## Validation Loop

### Level 1: Syntax & Style (MUST PASS)

```bash
pnpm run check  # TypeScript
pnpm run lint   # ESLint

# Expected: 0 errors, 0 warnings
```

**If Fail:**
- Check TypeScript errors: Verify Position type usage
- Check ESLint: Run `pnpm run lint:fix` for auto-fixes

### Level 2: Unit Tests (MUST PASS)

```bash
pnpm test pieceMovement.test  # Specific tests
pnpm test                      # All tests

# Expected: All tests passing, 80%+ coverage
```

**If Fail:**
- Check test output for failures
- Add console.log to debug bishop position checks
- Verify opponent's starting row logic (row 0 vs row 2)

### Level 3: Integration Test (MUST PASS)

```bash
pnpm run validate  # Full validation

# Expected: All checks pass
```

### Level 4: Manual Verification (MUST PASS)

**Test Scenario:**
1. Start game (hot-seat mode)
2. Move white bishop to [0, 0] (use multiple turns if needed)
3. Click white bishop → "Party!" button should enable ✅
4. Click "Party!" → Bishop moves off-board ✅
5. Bishop appears in Black King's Court scored pieces ✅

**If Fail:**
- Check browser console for errors
- Verify `canSelectedPieceMoveOffBoard` in GameBoard.tsx calls `canBishopMoveOffBoard`
- Check piece owner and row position in React DevTools

### Level 5: Build (MUST PASS)

```bash
pnpm build

# Expected: Build succeeds
```

---

## Rollback Strategy

**If Fix Fails:**

```bash
# Revert the function change
git checkout HEAD -- src/lib/chess/pieceMovement.ts

# Remove new tests
git checkout HEAD -- src/lib/chess/pieceMovement.test.ts

# Run tests to verify rollback
pnpm test
```

---

## Debug Strategies

**Issue: Tests still failing after fix**
```bash
# Debug specific test
pnpm test pieceMovement.test -t "white bishop at [0, 0]"

# Add debug output
console.log('Bishop position:', from);
console.log('Bishop owner:', piece.owner);
console.log('On opponent row:', onOpponentStartingRow);
```

**Issue: "Party!" button still not enabling**
```typescript
// In GameBoard.tsx, add debug:
console.log('Selected position:', selectedPosition);
console.log('Piece:', gameState.board[selectedPosition[0]]?.[selectedPosition[1]]);
console.log('Can move off-board:', canSelectedPieceMoveOffBoard);
```

---

## Success Checklist

- [ ] TypeScript check passes (0 errors)
- [ ] ESLint check passes (0 errors, 0 warnings)
- [ ] All 8 new tests added and passing
- [ ] All existing tests still passing (630+ tests)
- [ ] Coverage maintained at 80%+
- [ ] Manual test: White bishop at [0, 0] can move off-board
- [ ] Manual test: Black bishop at [2, 0] can move off-board
- [ ] Build succeeds
- [ ] No console errors in dev mode

---

**END OF PRP**
