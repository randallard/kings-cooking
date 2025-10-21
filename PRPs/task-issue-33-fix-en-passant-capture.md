# Task PRP: Fix En Passant Capture Bug (#33)

**Issue**: https://github.com/randallard/kings-cooking/issues/33
**Branch**: `issue-33-fix-en-passant-capture`
**Severity**: 🔥 Critical (game logic broken)

## Goal

Fix the en passant capture bug where the captured pawn is not removed from the board and doesn't appear in the captured pieces list.

## Context

### Bug Summary
When performing an en passant capture:
- ✅ Capturing pawn moves to correct diagonal position
- ❌ Captured pawn stays on the board (should be removed)
- ❌ Captured pawn doesn't appear in `capturedPieces` array
- Happens in both hot-seat and URL modes (core chess engine bug)

### Root Cause Analysis

**File**: `src/lib/chess/KingsChessEngine.ts:267-323`

In `executeStandardMove()`:
```typescript
const targetPiece = this.getPieceAt(to); // Line 279

// Handle capture
if (targetPiece) {  // Lines 282-291
  // Captures piece at destination
}
```

**Problem**: For en passant, the captured pawn is **NOT** at the destination square (`to`). It's at a different position - one rank behind the destination:
- Capturing pawn moves to: `[enPassantRow, enPassantCol]` (diagonal forward)
- Captured pawn is at: `[capturedRow, enPassantCol]` (one rank behind destination)

**En Passant Geometry**:
```
Light pawn (moving up, toward row 0):
  Capturing: [row, col] → [row - 1, enemyCol]
  Captured: [row, enemyCol]

Dark pawn (moving down, toward row 2):
  Capturing: [row, col] → [row + 1, enemyCol]
  Captured: [row, enemyCol]
```

### Related Files

**Detection Logic** (works correctly):
- `src/lib/chess/pieceMovement.ts:249-268` - `getPawnMoves()` correctly detects en passant
- Tests: `src/lib/chess/pieceMovement.test.ts:353-436` - Tests confirm detection works

**Execution Logic** (BROKEN):
- `src/lib/chess/KingsChessEngine.ts:267-323` - `executeStandardMove()` doesn't handle en passant captures
- **Missing**: Tests for en passant capture execution in `KingsChessEngine.test.ts`

### Dependencies

- `src/lib/chess/types.ts` - `Move` interface includes `lastMove` for en passant detection
- `src/lib/validation/schemas.ts` - Piece and Move schemas for validation

## Requirements

1. **Remove captured pawn from board**
   - Detect en passant by checking: pawn move + diagonal to empty square + lastMove criteria
   - Calculate position of captured pawn (one rank behind destination)
   - Remove captured pawn from `board[capturedRow][capturedCol]`

2. **Add captured pawn to capturedPieces array**
   - Add to `capturedLight` or `capturedDark` based on captured pawn's owner
   - Set captured pawn's `position` to `null`

3. **Record capture in move history**
   - Set `move.captured` to the en passant captured piece
   - Return captured piece in `MoveResult.captured`

4. **Add regression tests**
   - Test en passant capture execution (not just detection)
   - Verify captured pawn removed from board
   - Verify captured pawn in capturedPieces array
   - Test both light and dark en passant captures

5. **Works in both modes**
   - No mode-specific logic needed (chess engine level)
   - URL sync will work automatically via move history

## Implementation Blueprint

### Task 1: Write Failing Test (RED)

**File**: `src/lib/chess/KingsChessEngine.test.ts`

Add test after existing move tests (around line 400+):

```typescript
describe('En Passant Capture Execution', () => {
  test('should remove captured pawn from board (light captures dark)', () => {
    // Setup: Create game with pawns positioned for en passant
    const engine = new KingsChessEngine(
      { id: '1', name: 'Light' },
      { id: '2', name: 'Dark' }
    );

    // Place light pawn at [1, 1] and dark pawn at [0, 2]
    const lightPawn = createPiece('pawn', 'light', [1, 1]);
    const darkPawn = createPiece('pawn', 'dark', [0, 2]);

    engine.gameState.board[1]![1] = lightPawn;
    engine.gameState.board[0]![2] = darkPawn;

    // Simulate dark pawn double-move from [2, 2] to [0, 2]
    darkPawn.moveCount = 1;
    const darkPawnMove: Move = {
      from: [2, 2],
      to: [0, 2],
      piece: darkPawn,
      captured: null,
      timestamp: Date.now(),
    };
    engine.gameState.moveHistory.push(darkPawnMove);
    engine.gameState.currentPlayer = 'light';

    // Execute en passant capture: [1, 1] → [0, 2] (diagonal)
    const result = engine.makeMove([1, 1], [0, 2]);

    // Assertions
    expect(result.success).toBe(true);
    expect(result.captured).toBeTruthy();
    expect(result.captured?.type).toBe('pawn');
    expect(result.captured?.owner).toBe('dark');

    // Captured pawn should be removed from original position
    expect(engine.gameState.board[0]![2]).toBeNull(); // Dark pawn removed

    // Captured pawn should be in capturedDark array
    expect(engine.gameState.capturedDark).toHaveLength(1);
    expect(engine.gameState.capturedDark[0]!.type).toBe('pawn');
  });

  test('should remove captured pawn from board (dark captures light)', () => {
    // Similar test for dark capturing light
    // ...
  });
});
```

**Validation**:
```bash
pnpm test KingsChessEngine.test.ts
# Expected: Test fails because en passant pawn not removed
```

### Task 2: Implement En Passant Capture Logic (GREEN)

**File**: `src/lib/chess/KingsChessEngine.ts:267-323`

Modify `executeStandardMove()` to detect and handle en passant:

```typescript
private executeStandardMove(
  from: Position,
  to: Position,
  piece: Piece
): MoveResult {
  if (!from || !to) {
    return {
      success: false,
      error: 'Invalid position',
    };
  }

  const targetPiece = this.getPieceAt(to);
  let capturedPiece: Piece | null = targetPiece;

  // Handle normal capture
  if (targetPiece) {
    targetPiece.position = null;

    if (targetPiece.owner === 'light') {
      this.gameState.capturedLight.push(targetPiece);
    } else {
      this.gameState.capturedDark.push(targetPiece);
    }
  }

  // Handle EN PASSANT capture (pawn only)
  if (piece.type === 'pawn' && !targetPiece) {
    // Get last move for en passant detection
    const lastMove = this.gameState.moveHistory.length > 0
      ? this.gameState.moveHistory[this.gameState.moveHistory.length - 1]
      : null;

    if (lastMove && lastMove.piece.type === 'pawn' && lastMove.to !== 'off_board') {
      const [lastFromRow] = lastMove.from;
      const [lastToRow, lastToCol] = lastMove.to;
      const moveDistance = Math.abs(lastToRow - lastFromRow);

      // Check if last move was 2-square pawn move and landed beside our pawn
      const [fromRow, fromCol] = from;
      const [toRow, toCol] = to;

      if (moveDistance === 2 && lastToRow === fromRow && Math.abs(lastToCol - fromCol) === 1) {
        // This is an en passant capture!
        // The captured pawn is at the lastMove.to position (beside us, not diagonal)
        const enPassantTarget = this.getPieceAt(lastMove.to);

        if (enPassantTarget && enPassantTarget.owner !== piece.owner) {
          // Remove captured pawn from board
          this.gameState.board[lastToRow]![lastToCol] = null;
          enPassantTarget.position = null;

          // Add to captured pieces
          if (enPassantTarget.owner === 'light') {
            this.gameState.capturedLight.push(enPassantTarget);
          } else {
            this.gameState.capturedDark.push(enPassantTarget);
          }

          capturedPiece = enPassantTarget;
        }
      }
    }
  }

  // Move piece
  this.gameState.board[from[0]]![from[1]] = null;
  this.gameState.board[to[0]]![to[1]] = piece;
  piece.position = to;
  piece.moveCount++;

  // Record move
  const move: Move = MoveSchema.parse({
    from,
    to,
    piece: PieceSchema.parse(piece),
    captured: capturedPiece ? PieceSchema.parse(capturedPiece) : null,
    timestamp: Date.now(),
  });

  this.gameState.moveHistory.push(move);

  // Switch turns
  this.advanceTurn();

  const result: MoveResult = {
    success: true,
    gameState: this.gameState,
  };

  if (capturedPiece) {
    result.captured = capturedPiece;
  }

  return result;
}
```

**Validation**:
```bash
pnpm test KingsChessEngine.test.ts
# Expected: En passant tests now pass
pnpm run check
# Expected: TypeScript validation passes
```

### Task 3: Run All Tests (Ensure No Regressions)

**Validation**:
```bash
pnpm test
# Expected: All 831+ tests pass (including new en passant tests)
```

### Task 4: Manual Testing

**Test Scenario** (from issue #33):
1. Choose three pawns in piece selection
2. Place pawns on board
3. Move center pawn up one square
4. Capture with side pawn
5. Recapture with side pawn
6. Move pawn two spaces (double-move)
7. En passant capture with center pawn
8. Confirm move

**Expected Result**:
- ✅ Capturing pawn moves to diagonal square
- ✅ Captured pawn removed from board
- ✅ Captured pawn appears in captured pieces list
- ✅ Game continues normally

### Task 5: Refactor (if needed)

**Potential Improvements**:
- Extract en passant detection into helper function if logic gets complex
- Add inline comments explaining en passant geometry
- Consider edge cases (pawn at board edge, multiple pawns)

**Validation**:
```bash
pnpm test
pnpm run check
# Expected: All tests still pass after refactoring
```

## Validation Strategy

### Level 1: Unit Tests
```bash
pnpm test KingsChessEngine.test.ts
```
- New en passant capture tests pass
- Existing move tests still pass

### Level 2: Integration Tests
```bash
pnpm test
```
- All 831+ tests pass
- No regressions in other components

### Level 3: Type Safety
```bash
pnpm run check
```
- TypeScript validates all changes
- No type errors

### Level 4: Manual Testing
- Test en passant in hot-seat mode
- Test en passant in URL mode
- Verify captured piece appears in UI

## Rollback Strategy

If tests fail unexpectedly:
1. Revert changes to `KingsChessEngine.ts:executeStandardMove()`
2. Keep failing test for future debugging
3. Document issue in PRP for next attempt

Git commands:
```bash
git checkout HEAD -- src/lib/chess/KingsChessEngine.ts
git add src/lib/chess/KingsChessEngine.test.ts
git commit -m "test: add failing en passant capture test (#33)"
```

## Debug Strategies

### If test fails:
1. **Print captured pawn position**: `console.log('En passant target at:', lastMove.to)`
2. **Verify detection logic**: Ensure `getPawnMoves()` returns correct en passant square
3. **Check board state**: Print board before/after move to see if piece removed

### If TypeScript errors:
1. Ensure `lastMove` is properly typed as `Move | null`
2. Add null checks for `lastMove.to` (could be 'off_board')
3. Verify `capturedPiece` type matches `Piece | null`

### If capture doesn't appear in UI:
1. Check `VictoryScreen` component uses `capturedLight`/`capturedDark`
2. Verify `GameBoard` or `CourtArea` displays captured pieces
3. Test with `console.log(engine.gameState.capturedDark)` after move

## Success Criteria

- [x] Failing test written that reproduces bug
- [ ] Test passes after implementing fix
- [ ] All existing tests still pass (no regressions)
- [ ] TypeScript validation passes
- [ ] Manual testing confirms fix in both modes
- [ ] Captured pawn removed from board
- [ ] Captured pawn appears in captured pieces list
- [ ] Move history records captured piece

## TDD Workflow

1. **🔴 RED**: Write failing test (Task 1)
2. **🟢 GREEN**: Implement minimal fix (Task 2)
3. **🔄 REFACTOR**: Clean up code (Task 5)
4. **✅ VALIDATE**: Run all tests (Task 3)
5. **🧪 MANUAL**: Test in browser (Task 4)

## References

- `/home/ryankhetlyr/Development/kings-cooking/claude_md_files/CLAUDE-REACT.md` - React 19 patterns
- `src/lib/chess/pieceMovement.ts:249-268` - En passant detection logic (works correctly)
- `src/lib/chess/KingsChessEngine.ts:267-323` - Move execution (needs fix)
- https://www.chessprogramming.org/En_passant - En passant rules reference

## Gotchas

1. **En passant is NOT at destination**: Captured pawn is one rank behind, not at diagonal square
2. **Last move check**: Must verify `lastMove.to !== 'off_board'` before accessing as Position
3. **Timing**: En passant only valid immediately after double-move (already handled by detection)
4. **Geometry**: Light pawns move toward row 0, dark pawns toward row 2 (direction matters)
5. **Captured array**: Use `capturedLight` for light pieces, `capturedDark` for dark pieces (NOT by captor)

## Notes

- This bug only affects en passant captures; normal captures work fine
- The detection logic in `getPawnMoves()` is correct; only execution is broken
- Fix is isolated to `KingsChessEngine.ts`; no UI changes needed
- URL mode will automatically sync via move history (no special handling)
