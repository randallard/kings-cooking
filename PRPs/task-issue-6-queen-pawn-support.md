# Task PRP: Add Queen and Pawn Rendering and Move Validation

**Created**: 2025-10-20
**Type**: Bug Fix (Issue #6)
**Status**: Ready for Execution
**Related Issues**: #6 - Piece Selection Flow

---

## Goal

Fix two critical bugs preventing queen and pawn pieces from working during gameplay:
1. Queen and pawn display as '?' on the game board (rendering bug)
2. No valid moves highlighted when queen or pawn are selected (move validation bug)

---

## Why

**Business Value**: Players can select queen and pawn during piece selection, but these pieces are non-functional during gameplay. This breaks the game experience and makes 2 out of 5 available piece types unusable.

**User Impact**:
- **BEFORE**: Queen and pawn can be selected but show as '?' during gameplay with no valid moves
- **AFTER**: Queen and pawn display correctly with proper unicode characters and show all legal moves when selected

**Context from Issue #6**:
- User reported: "queen shows up as a ? when playing and after selecting there are no available spaces highlighted to move to"
- Root cause 1: `PIECE_UNICODE` object in GameCell.tsx missing queen and pawn entries
- Root cause 2: Move validation system (`pieceMovement.ts` and `moveValidation.ts`) has no queen or pawn handling
- Piece selection screen works correctly (uses `PIECE_POOL` from `pieceSelection/types.ts`)
- Game board uses separate `PIECE_UNICODE` lookup in GameCell.tsx
- Selection system works (piece gets visually selected), but move calculation returns empty array

---

## What (User-Visible Behavior)

### Before Fix
1. User selects "Mirrored" mode and chooses queen for position 1
2. Starts game
3. **BUG 1**: Queen appears as '?' character on board (not ♕/♛)
4. User clicks on queen piece
5. Queen gets visually selected (border/highlight)
6. **BUG 2**: No valid move squares are highlighted (move array is empty)

### After Fix
1. User selects any mode and chooses queen and/or pawn
2. Starts game
3. **FIXED**: Queen displays as ♕ (light) or ♛ (dark) using proper unicode
4. **FIXED**: Pawn displays as ♙ (light) or ♟ (dark) using proper unicode
5. User clicks on queen
6. **FIXED**: All legal queen moves highlighted (combination of rook + bishop moves)
7. User clicks on pawn
8. **FIXED**: Valid pawn moves highlighted (forward 1, diagonal captures)

---

## All Needed Context

### Documentation & Patterns

**React 19 Patterns**: Reference `/home/ryankhetlyr/Development/kings-cooking/claude_md_files/CLAUDE-REACT.md`
- Follow TDD: Red → Green → Refactor
- Accessibility: ARIA labels for screen readers

**Chess Move Patterns**: `src/lib/chess/pieceMovement.ts`
- Movement functions follow consistent pattern: `getRookMoves()`, `getKnightMoves()`, `getBishopMoves()`
- All return `Position[]` array of legal moves
- All take parameters: `(from: Position, getPiece: (pos: Position) => Piece | null, currentPlayer: 'light' | 'dark')`
- Use `isInBounds(row, col)` to check board boundaries (0-2 for 3x3 board)
- Check for blocking pieces and capture rules

**Move Validation**: `src/lib/chess/moveValidation.ts`
- `validateStandardMove()` uses switch statement on `piece.type` (lines 151-166)
- `getValidMovesForPiece()` helper uses switch statement (lines 234-243)
- Both missing queen and pawn cases
- Off-board moves handled separately in `validateOffBoardMove()` function

**Unicode Reference**: `src/lib/pieceSelection/types.ts` lines 51-57
```typescript
export const PIECE_POOL = {
  rook: { max: 2, unicode: { light: '♜', dark: '♖' } },
  knight: { max: 2, unicode: { light: '♞', dark: '♘' } },
  bishop: { max: 2, unicode: { light: '♝', dark: '♗' } },
  queen: { max: 1, unicode: { light: '♛', dark: '♕' } },
  pawn: { max: 8, unicode: { light: '♟', dark: '♙' } },
} as const;
```

### Existing Code Patterns

**Current PIECE_UNICODE (INCOMPLETE)** (`src/components/game/GameCell.tsx` lines 136-140):
```typescript
const PIECE_UNICODE: Record<string, { light: string; dark: string }> = {
  rook: { light: '♜', dark: '♖' },
  knight: { light: '♞', dark: '♘' },
  bishop: { light: '♝', dark: '♗' },
  // MISSING: queen and pawn
};
```

**Fallback Behavior** (`GameCell.tsx` line 145):
```typescript
function getPieceUnicode(piece: Piece): string {
  const pieceType = PIECE_UNICODE[piece.type];
  if (!pieceType) {
    return '?'; // ← This is why queen/pawn show as '?'
  }
  return pieceType[piece.owner];
}
```

**Existing Move Function Pattern** (`src/lib/chess/pieceMovement.ts`):
```typescript
export function getRookMoves(
  from: Position,
  getPiece: (pos: Position) => Piece | null,
  currentPlayer: 'light' | 'dark'
): Position[] {
  if (!from) return [];

  const moves: Position[] = [];
  const directions: Direction[] = [[0, 1], [0, -1], [1, 0], [-1, 0]];

  for (const [dr, dc] of directions) {
    let row = from[0] + dr;
    let col = from[1] + dc;

    while (isInBounds(row, col)) {
      const piece = getPiece([row, col]);

      if (!piece) {
        moves.push([row, col]);
      } else if (piece.owner !== currentPlayer) {
        moves.push([row, col]); // Can capture
        break;
      } else {
        break; // Own piece blocks
      }

      row += dr;
      col += dc;
    }
  }

  return moves;
}
```

**Test Pattern** (`src/lib/chess/pieceMovement.test.ts` lines 59-68):
```typescript
describe('getRookMoves', () => {
  test('should return vertical and horizontal moves on empty board', () => {
    const moves = getRookMoves([1, 1], emptyBoard(), 'light');

    expect(moves).toContainEqual([0, 1]); // Up
    expect(moves).toContainEqual([2, 1]); // Down
    expect(moves).toContainEqual([1, 0]); // Left
    expect(moves).toContainEqual([1, 2]); // Right
    expect(moves).toHaveLength(4);
  });
});
```

### Gotchas

1. **Queen Moves = Rook + Bishop Combined**:
   - Queen can move horizontally, vertically, AND diagonally
   - Simplest implementation: call `getRookMoves()` and `getBishopMoves()`, combine results
   - **Solution**: `return [...getRookMoves(from, getPiece, currentPlayer), ...getBishopMoves(from, getPiece, currentPlayer)]`

2. **Pawn Direction Depends on Owner**:
   - Light pawns move FORWARD (decreasing row: row - 1) toward dark's side
   - Dark pawns move FORWARD (increasing row: row + 1) toward light's side
   - **Solution**: Use `owner === 'light' ? -1 : 1` for direction multiplier

3. **Pawn Capture Rules**:
   - Move forward 1 square ONLY if empty
   - Capture diagonally forward 1 square ONLY if enemy piece present
   - Cannot capture straight ahead
   - Cannot move forward if blocked
   - **Solution**: Check forward square separately from diagonal captures

4. **No En Passant on 3x3 Board**:
   - Standard chess has en passant (special pawn capture)
   - 3x3 board is too small for en passant to be relevant
   - **Solution**: Don't implement en passant

5. **Pawn Promotion Not Needed Yet**:
   - Standard chess promotes pawns reaching opposite edge
   - King's Cooking: pawns reaching edge go "off-board" to court (handled by off-board logic)
   - **Solution**: No promotion logic needed in this task

6. **Off-Board Movement for Queen and Pawn**:
   - Queens can move off-board (combine rook and bishop off-board rules)
   - Pawns likely can move off-board when reaching opponent's starting row
   - Current off-board logic in `moveValidation.ts` only handles rook, knight, bishop
   - **Solution**: Add queen and pawn cases to `validateOffBoardMove()` function

7. **Test Mocks Need uuid**:
   - Piece schema requires `id` field with uuid
   - Tests use `import { v4 as uuid } from 'uuid'` (line 17)
   - **Solution**: Follow existing test pattern with uuid() calls

### Chess Rules Reference

**Queen Movement** (Standard Chess):
- Moves any number of squares horizontally, vertically, or diagonally
- Cannot jump over pieces
- Can capture enemy pieces
- Most powerful piece

**Pawn Movement** (Standard Chess, simplified for 3x3):
- Moves forward 1 square (cannot move backward)
- First move can be 2 squares (NOT applicable on 3x3 board - no room)
- Captures diagonally forward 1 square only
- Cannot capture straight ahead
- En passant (NOT applicable on 3x3 board)
- Promotion (handled by off-board logic in King's Cooking)

---

## Implementation Blueprint

### Task 1: Add Queen and Pawn Unicode to GameCell

**File**: `src/components/game/GameCell.tsx`

**Changes**:
```typescript
// MODIFY lines 136-140
const PIECE_UNICODE: Record<string, { light: string; dark: string }> = {
  rook: { light: '♜', dark: '♖' },
  knight: { light: '♞', dark: '♘' },
  bishop: { light: '♝', dark: '♗' },
  queen: { light: '♛', dark: '♕' },   // ADD
  pawn: { light: '♟', dark: '♙' },    // ADD
};
```

**Why**: Fixes rendering bug - getPieceUnicode() will find queen/pawn and return proper unicode instead of '?'.

**Validation**:
```bash
pnpm run check  # TypeScript validation
pnpm test -- GameCell.test  # Component tests
```

**If Fail**:
- Check unicode characters copied correctly (use PIECE_POOL as reference)
- Verify light/dark are not swapped
- Ensure comma after bishop line

**Rollback**:
```bash
git checkout src/components/game/GameCell.tsx
```

---

### Task 2: Add Test for Queen/Pawn Unicode Rendering

**File**: `src/components/game/GameCell.test.tsx`

**Changes**:
```typescript
// ADD new test in existing describe block
it('should render queen unicode', () => {
  const queenPiece: Piece = {
    type: 'queen',
    owner: 'light',
    position: [1, 1],
    moveCount: 0,
    id: '00000000-0000-0000-0000-000000000001',
  };

  render(
    <GameCell
      position={[1, 1]}
      piece={queenPiece}
      isSelected={false}
      isLegalMove={false}
      isLastMove={false}
      onClick={() => {}}
    />
  );

  expect(screen.getByText('♛')).toBeInTheDocument();
});

it('should render pawn unicode', () => {
  const pawnPiece: Piece = {
    type: 'pawn',
    owner: 'dark',
    position: [0, 0],
    moveCount: 0,
    id: '00000000-0000-0000-0000-000000000002',
  };

  render(
    <GameCell
      position={[0, 0]}
      piece={pawnPiece}
      isSelected={false}
      isLegalMove={false}
      isLastMove={false}
      onClick={() => {}}
    />
  );

  expect(screen.getByText('♙')).toBeInTheDocument();
});
```

**Why**: TDD - verify unicode rendering works for queen and pawn.

**Validation**:
```bash
pnpm test -- GameCell.test
```

**Expected**: Tests pass immediately (unicode lookup is simple)

**If Fail**:
- Verify Task 1 completed correctly
- Check that unicode characters match expected values
- Ensure piece type strings are correct: 'queen', 'pawn'

**Rollback**:
```bash
git checkout src/components/game/GameCell.test.tsx
```

---

### Task 3: Implement getQueenMoves() Function

**File**: `src/lib/chess/pieceMovement.ts`

**Changes**:
```typescript
// ADD after getBishopMoves function (after line 150)

/**
 * Get all queen moves from position.
 *
 * Queens move horizontally, vertically, or diagonally any distance.
 * Combines rook and bishop movement patterns.
 * Cannot jump over pieces.
 *
 * @param from - Starting position
 * @param getPiece - Function to get piece at position
 * @param currentPlayer - Current player color
 * @returns Array of valid destination positions
 */
export function getQueenMoves(
  from: Position,
  getPiece: (pos: Position) => Piece | null,
  currentPlayer: 'light' | 'dark'
): Position[] {
  if (!from) return [];

  // Queen = rook + bishop moves
  const rookMoves = getRookMoves(from, getPiece, currentPlayer);
  const bishopMoves = getBishopMoves(from, getPiece, currentPlayer);

  return [...rookMoves, ...bishopMoves];
}
```

**Why**: Implements queen movement logic by combining existing rook and bishop functions.

**Validation**:
```bash
pnpm run check  # TypeScript
```

**If Fail**:
- Check that getRookMoves and getBishopMoves are imported/available in scope
- Verify return type is Position[]
- Ensure spread operator syntax is correct

**Rollback**:
```bash
git checkout src/lib/chess/pieceMovement.ts
```

---

### Task 4: Implement getPawnMoves() Function

**File**: `src/lib/chess/pieceMovement.ts`

**Changes**:
```typescript
// ADD after getQueenMoves function

/**
 * Get all pawn moves from position.
 *
 * Pawns move forward 1 square (direction depends on owner).
 * Can capture diagonally forward 1 square.
 * Cannot move backward or sideways.
 * Cannot capture straight ahead.
 *
 * Light pawns move toward row 0 (dark's side).
 * Dark pawns move toward row 2 (light's side).
 *
 * @param from - Starting position
 * @param getPiece - Function to get piece at position
 * @param currentPlayer - Current player color
 * @returns Array of valid destination positions
 */
export function getPawnMoves(
  from: Position,
  getPiece: (pos: Position) => Piece | null,
  currentPlayer: 'light' | 'dark'
): Position[] {
  if (!from) return [];

  const moves: Position[] = [];
  const [row, col] = from;

  // Light pawns move up (row - 1), dark pawns move down (row + 1)
  const direction = currentPlayer === 'light' ? -1 : 1;

  // Forward move (1 square straight ahead)
  const forwardRow = row + direction;
  if (isInBounds(forwardRow, col)) {
    const forwardPiece = getPiece([forwardRow, col]);
    if (!forwardPiece) {
      moves.push([forwardRow, col]); // Can only move forward if empty
    }
  }

  // Diagonal captures (left and right)
  const diagonals: number[] = [-1, 1]; // col - 1 and col + 1
  for (const dc of diagonals) {
    const captureCol = col + dc;
    if (isInBounds(forwardRow, captureCol)) {
      const capturePiece = getPiece([forwardRow, captureCol]);
      if (capturePiece && capturePiece.owner !== currentPlayer) {
        moves.push([forwardRow, captureCol]); // Can only capture diagonally if enemy piece
      }
    }
  }

  return moves;
}
```

**Why**: Implements pawn movement with direction-based forward movement and diagonal captures.

**Validation**:
```bash
pnpm run check
```

**If Fail**:
- Check direction calculation is correct (light = -1, dark = +1)
- Verify diagonal capture logic doesn't allow capturing own pieces
- Ensure forward move doesn't allow capturing

**Rollback**:
```bash
git checkout src/lib/chess/pieceMovement.ts
```

---

### Task 5: Add Unit Tests for getQueenMoves()

**File**: `src/lib/chess/pieceMovement.test.ts`

**Changes**:
```typescript
// ADD after getBishopMoves tests (before hasRookPathToEdge tests)

describe('getQueenMoves', () => {
  test('should combine rook and bishop moves on empty board', () => {
    const moves = getQueenMoves([1, 1], emptyBoard(), 'light');

    // Rook moves (horizontal/vertical)
    expect(moves).toContainEqual([0, 1]); // Up
    expect(moves).toContainEqual([2, 1]); // Down
    expect(moves).toContainEqual([1, 0]); // Left
    expect(moves).toContainEqual([1, 2]); // Right

    // Bishop moves (diagonal)
    expect(moves).toContainEqual([0, 0]); // Up-left
    expect(moves).toContainEqual([0, 2]); // Up-right
    expect(moves).toContainEqual([2, 0]); // Down-left
    expect(moves).toContainEqual([2, 2]); // Down-right

    expect(moves).toHaveLength(8); // All 8 directions from center
  });

  test('should stop at board edges', () => {
    const moves = getQueenMoves([0, 0], emptyBoard(), 'light');

    // Can only move right, down, and down-right from corner
    expect(moves).toContainEqual([0, 1]); // Right
    expect(moves).toContainEqual([0, 2]); // Right 2
    expect(moves).toContainEqual([1, 0]); // Down
    expect(moves).toContainEqual([2, 0]); // Down 2
    expect(moves).toContainEqual([1, 1]); // Down-right
    expect(moves).toContainEqual([2, 2]); // Down-right 2
    expect(moves).toHaveLength(6);
  });

  test('should stop at own pieces', () => {
    const ownPiece = createMockPiece('rook', 'light', [1, 0]);
    const getPiece = boardWithPieces([{ pos: [1, 0], piece: ownPiece }]);

    const moves = getQueenMoves([2, 0], getPiece, 'light');

    expect(moves).not.toContainEqual([1, 0]); // Blocked by own rook
    expect(moves).not.toContainEqual([0, 0]); // Can't jump over
  });

  test('should capture opponent pieces', () => {
    const opponentPiece = createMockPiece('knight', 'dark', [0, 1]);
    const getPiece = boardWithPieces([{ pos: [0, 1], piece: opponentPiece }]);

    const moves = getQueenMoves([1, 1], getPiece, 'light');

    expect(moves).toContainEqual([0, 1]); // Can capture
  });

  test('should return empty array for null position', () => {
    const moves = getQueenMoves(null, emptyBoard(), 'light');
    expect(moves).toEqual([]);
  });
});
```

**Why**: TDD - comprehensive tests for queen movement patterns.

**Validation**:
```bash
pnpm test -- pieceMovement.test
```

**Expected**: All queen tests pass

**If Fail**:
- Check that getQueenMoves is exported from pieceMovement.ts
- Verify move calculation is correct
- Ensure test helpers (createMockPiece, emptyBoard, boardWithPieces) are available

**Rollback**:
```bash
git checkout src/lib/chess/pieceMovement.test.ts
```

---

### Task 6: Add Unit Tests for getPawnMoves()

**File**: `src/lib/chess/pieceMovement.test.ts`

**Changes**:
```typescript
// ADD after getQueenMoves tests

describe('getPawnMoves', () => {
  test('light pawn should move forward (up) one square', () => {
    const moves = getPawnMoves([1, 1], emptyBoard(), 'light');

    expect(moves).toContainEqual([0, 1]); // Forward (up)
    expect(moves).toHaveLength(1); // No captures available
  });

  test('dark pawn should move forward (down) one square', () => {
    const moves = getPawnMoves([1, 1], emptyBoard(), 'dark');

    expect(moves).toContainEqual([2, 1]); // Forward (down)
    expect(moves).toHaveLength(1);
  });

  test('should not move forward if blocked', () => {
    const blockingPiece = createMockPiece('rook', 'dark', [0, 1]);
    const getPiece = boardWithPieces([{ pos: [0, 1], piece: blockingPiece }]);

    const moves = getPawnMoves([1, 1], getPiece, 'light');

    expect(moves).not.toContainEqual([0, 1]); // Blocked
    expect(moves).toHaveLength(0); // No moves if forward is blocked and no captures
  });

  test('should capture diagonally forward', () => {
    const enemy1 = createMockPiece('knight', 'dark', [0, 0]);
    const enemy2 = createMockPiece('bishop', 'dark', [0, 2]);
    const getPiece = boardWithPieces([
      { pos: [0, 0], piece: enemy1 },
      { pos: [0, 2], piece: enemy2 },
    ]);

    const moves = getPawnMoves([1, 1], getPiece, 'light');

    expect(moves).toContainEqual([0, 0]); // Capture left
    expect(moves).toContainEqual([0, 2]); // Capture right
    expect(moves).toContainEqual([0, 1]); // Can also move forward
    expect(moves).toHaveLength(3);
  });

  test('should not capture own pieces', () => {
    const ownPiece = createMockPiece('knight', 'light', [0, 0]);
    const getPiece = boardWithPieces([{ pos: [0, 0], piece: ownPiece }]);

    const moves = getPawnMoves([1, 1], getPiece, 'light');

    expect(moves).not.toContainEqual([0, 0]); // Cannot capture own piece
  });

  test('should not move diagonally if no enemy piece', () => {
    const moves = getPawnMoves([1, 1], emptyBoard(), 'light');

    expect(moves).not.toContainEqual([0, 0]); // No diagonal move without capture
    expect(moves).not.toContainEqual([0, 2]);
  });

  test('should not move beyond board edges', () => {
    // Light pawn at top edge
    const moves = getPawnMoves([0, 1], emptyBoard(), 'light');
    expect(moves).toEqual([]); // Cannot move forward off-board

    // Dark pawn at bottom edge
    const moves2 = getPawnMoves([2, 1], emptyBoard(), 'dark');
    expect(moves2).toEqual([]); // Cannot move forward off-board
  });

  test('should handle corner positions', () => {
    const enemy = createMockPiece('rook', 'dark', [0, 1]);
    const getPiece = boardWithPieces([{ pos: [0, 1], piece: enemy }]);

    const moves = getPawnMoves([1, 0], getPiece, 'light');

    // Can capture diagonally right, cannot go diagonally left (off board)
    expect(moves).toContainEqual([0, 1]);
    expect(moves).toContainEqual([0, 0]); // Can move forward
    expect(moves).toHaveLength(2);
  });

  test('should return empty array for null position', () => {
    const moves = getPawnMoves(null, emptyBoard(), 'light');
    expect(moves).toEqual([]);
  });
});
```

**Why**: TDD - comprehensive tests for pawn movement including forward moves, diagonal captures, blocking.

**Validation**:
```bash
pnpm test -- pieceMovement.test
```

**Expected**: All pawn tests pass

**If Fail**:
- Check direction calculation (light = -1, dark = +1)
- Verify diagonal capture logic
- Ensure forward blocking works correctly

**Rollback**:
```bash
git checkout src/lib/chess/pieceMovement.test.ts
```

---

### Task 7: Export New Functions from pieceMovement.ts

**File**: `src/lib/chess/pieceMovement.ts`

**Changes**:
```typescript
// Verify exports at top of file (should auto-export with export keyword)
// Functions already use 'export' keyword, but verify they're accessible
```

**Why**: Ensure getQueenMoves and getPawnMoves can be imported by moveValidation.ts.

**Validation**:
```bash
pnpm run check
pnpm test -- pieceMovement.test
```

**Expected**: TypeScript compiles, tests import functions successfully

**If Fail**:
- Add explicit export if needed: `export { getQueenMoves, getPawnMoves }`

**Rollback**: N/A (verification step)

---

### Task 8: Add Queen and Pawn to validateStandardMove Switch

**File**: `src/lib/chess/moveValidation.ts`

**Changes**:
```typescript
// MODIFY lines 151-166 - add imports first
import {
  getRookMoves,
  getKnightMoves,
  getBishopMoves,
  getQueenMoves,  // ADD
  getPawnMoves,   // ADD
  hasRookPathToEdge,
  canKnightJumpOffBoard,
  canBishopMoveOffBoard,
} from './pieceMovement';

// Then modify the switch statement in validateStandardMove function
function validateStandardMove(
  from: Position,
  to: Position,
  piece: Piece,
  getPiece: (pos: Position) => Piece | null,
  currentPlayer: 'light' | 'dark'
): ValidationResult {
  if (!to) {
    return {
      valid: false,
      reason: 'Invalid destination position',
    };
  }

  // Get all valid moves for this piece
  let validMoves: Position[];

  switch (piece.type) {
    case 'rook':
      validMoves = getRookMoves(from, getPiece, currentPlayer);
      break;
    case 'knight':
      validMoves = getKnightMoves(from, getPiece, currentPlayer);
      break;
    case 'bishop':
      validMoves = getBishopMoves(from, getPiece, currentPlayer);
      break;
    case 'queen':  // ADD
      validMoves = getQueenMoves(from, getPiece, currentPlayer);
      break;
    case 'pawn':   // ADD
      validMoves = getPawnMoves(from, getPiece, currentPlayer);
      break;
    default:
      return {
        valid: false,
        reason: `Unknown piece type`,
      };
  }

  // ... rest of function unchanged
}
```

**Why**: Adds queen and pawn handling to standard move validation.

**Validation**:
```bash
pnpm run check
pnpm test -- moveValidation.test
```

**If Fail**:
- Verify imports are correct
- Check switch statement syntax (colons, breaks)
- Ensure case labels match PieceType enum values

**Rollback**:
```bash
git checkout src/lib/chess/moveValidation.ts
```

---

### Task 9: Add Queen and Pawn to getValidMovesForPiece Helper

**File**: `src/lib/chess/moveValidation.ts`

**Changes**:
```typescript
// MODIFY lines 234-243
function getValidMovesForPiece(
  from: Position,
  piece: Piece,
  getPiece: (pos: Position) => Piece | null,
  currentPlayer: 'light' | 'dark'
): Position[] {
  switch (piece.type) {
    case 'rook':
      return getRookMoves(from, getPiece, currentPlayer);
    case 'knight':
      return getKnightMoves(from, getPiece, currentPlayer);
    case 'bishop':
      return getBishopMoves(from, getPiece, currentPlayer);
    case 'queen':  // ADD
      return getQueenMoves(from, getPiece, currentPlayer);
    case 'pawn':   // ADD
      return getPawnMoves(from, getPiece, currentPlayer);
    default:
      return [];
  }
}
```

**Why**: Enables stalemate detection and move highlighting for queen and pawn.

**Validation**:
```bash
pnpm run check
pnpm test -- moveValidation.test
```

**If Fail**:
- Verify function names match imports
- Check return statements
- Ensure all cases handled

**Rollback**:
```bash
git checkout src/lib/chess/moveValidation.ts
```

---

### Task 10: Add Queen Off-Board Logic

**File**: `src/lib/chess/moveValidation.ts`

**Changes**:
```typescript
// MODIFY validateOffBoardMove function (after bishop case, before return)
function validateOffBoardMove(
  from: Position,
  piece: Piece,
  getPiece: (pos: Position) => Piece | null
): ValidationResult {
  if (piece.type === 'rook') {
    // ... existing rook logic
  }

  if (piece.type === 'knight') {
    // ... existing knight logic
  }

  if (piece.type === 'bishop') {
    // ... existing bishop logic
  }

  // ADD queen case
  if (piece.type === 'queen') {
    // Queen can move off-board if either rook path OR bishop path is valid
    const hasRookPath = hasRookPathToEdge(from, { ...piece, type: 'rook' }, getPiece);
    const hasBishopPath = canBishopMoveOffBoard(from, { ...piece, type: 'bishop' }, getPiece);

    if (!hasRookPath && !hasBishopPath) {
      return {
        valid: false,
        reason: 'Queen has no clear path to board edge (needs either rook-style or bishop-style path)',
      };
    }
    return {
      valid: true,
      warnings: [`${piece.owner} queen moves to opponent's court`],
    };
  }

  // ADD pawn case
  if (piece.type === 'pawn') {
    // Pawns can move off-board if they're on opponent's starting row
    const onOpponentStartingRow =
      (piece.owner === 'light' && from && from[0] === 0) ||
      (piece.owner === 'dark' && from && from[0] === 2);

    if (!onOpponentStartingRow) {
      return {
        valid: false,
        reason: 'Pawn must reach opponent starting row before moving off-board',
      };
    }
    return {
      valid: true,
      warnings: [`${piece.owner} pawn moves to opponent's court`],
    };
  }

  // Unknown piece type
  return {
    valid: false,
    reason: `Piece cannot move off-board`,
  };
}
```

**Why**: Allows queen and pawn to score by moving off-board to opponent's court.

**Validation**:
```bash
pnpm run check
pnpm test -- moveValidation.test
```

**If Fail**:
- Verify hasRookPathToEdge and canBishopMoveOffBoard are imported
- Check piece type spreading syntax
- Ensure row index checks are correct (0 for dark's row, 2 for light's row)

**Rollback**:
```bash
git checkout src/lib/chess/moveValidation.ts
```

---

### Task 11: Add Integration Test for Queen Move Highlighting

**File**: Create new file `src/components/game/GameBoard.integration.test.tsx` OR add to existing integration test file

**Changes**:
```typescript
// ADD test to verify queen selection shows valid moves
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GameBoard } from './GameBoard';
import type { PlayingPhase } from '@/types/gameFlow';
import { KingsChessEngine } from '@/lib/chess/KingsChessEngine';

describe('GameBoard - Queen Move Highlighting', () => {
  it('should highlight valid queen moves when queen is selected', async () => {
    const user = userEvent.setup();

    // Create game state with queen at center position
    const engine = new KingsChessEngine();
    const gameState = engine.getState();

    // Manually place queen at [1, 1] (center of 3x3 board)
    gameState.board[1][1] = {
      type: 'queen',
      owner: 'light',
      position: [1, 1],
      moveCount: 0,
      id: '00000000-0000-0000-0000-000000000001',
    };

    const playingState: PlayingPhase = {
      phase: 'playing',
      mode: 'hotseat',
      player1Name: 'Alice',
      player2Name: 'Bob',
      gameState,
      selectedPosition: null,
      legalMoves: [],
      pendingMove: null,
    };

    const mockDispatch = vi.fn();

    render(<GameBoard state={playingState} dispatch={mockDispatch} />);

    // Click on queen to select it
    const queenCell = screen.getByRole('gridcell', { name: /light queen at B2/i });
    await user.click(queenCell);

    // Verify SELECT_POSITION was dispatched
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'SELECT_POSITION',
      position: [1, 1],
    });

    // Note: Actual move highlighting happens in reducer when it calculates legalMoves
    // This test verifies the selection triggers, full integration would need reducer test
  });
});
```

**Why**: Integration test ensures queen selection triggers move calculation in the game flow.

**Validation**:
```bash
pnpm test -- GameBoard.integration.test
```

**Expected**: Test passes, demonstrating queen selection works end-to-end

**If Fail**:
- Check test setup matches actual GameBoard props
- Verify mock dispatch captures SELECT_POSITION action
- Ensure GameBoard component exists and accepts these props

**Rollback**:
```bash
git checkout src/components/game/GameBoard.integration.test.tsx  # or rm if new file
```

---

### Task 12: Run Full Validation Suite

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
- Tests: All passing (including new queen/pawn tests)
- Build: Successful

**If Fail**:
- Review error messages
- Run specific test files to isolate issues
- Check that all tasks completed successfully
- Verify imports are correct
- Ensure no missing exports

**Rollback**:
```bash
git checkout src/components/game/GameCell.tsx
git checkout src/components/game/GameCell.test.tsx
git checkout src/lib/chess/pieceMovement.ts
git checkout src/lib/chess/pieceMovement.test.ts
git checkout src/lib/chess/moveValidation.ts
git checkout src/components/game/GameBoard.integration.test.tsx  # if created
```

---

## Task Checklist

- [ ] Task 1: Add queen and pawn unicode to GameCell PIECE_UNICODE
- [ ] Task 2: Add tests for queen/pawn unicode rendering
- [ ] Task 3: Implement getQueenMoves() function
- [ ] Task 4: Implement getPawnMoves() function
- [ ] Task 5: Add unit tests for getQueenMoves()
- [ ] Task 6: Add unit tests for getPawnMoves()
- [ ] Task 7: Verify exports from pieceMovement.ts
- [ ] Task 8: Add queen/pawn to validateStandardMove switch
- [ ] Task 9: Add queen/pawn to getValidMovesForPiece helper
- [ ] Task 10: Add queen/pawn off-board logic
- [ ] Task 11: Add integration test for queen move highlighting
- [ ] Task 12: Run full validation suite

---

## Validation Strategy

### Unit Testing
- After Task 2: Test queen/pawn unicode rendering
- After Task 5: Test getQueenMoves() with various board states
- After Task 6: Test getPawnMoves() with direction, blocking, captures
- After Task 9: Test move validation integration

### Integration Testing
- After Task 11: Test queen selection shows valid moves in GameBoard

### Manual Testing Checklist
- [ ] Select queen in piece selection (any mode)
- [ ] Start game and verify queen shows correct unicode (♕ or ♛)
- [ ] Click on queen and verify valid moves are highlighted
- [ ] Move queen and verify it moves correctly
- [ ] Select pawn in piece selection
- [ ] Start game and verify pawn shows correct unicode (♙ or ♟)
- [ ] Click on pawn and verify valid forward/capture moves highlighted
- [ ] Test pawn blocking (cannot move forward if blocked)
- [ ] Test pawn diagonal capture

---

## Rollback Strategy

**Per-Task Rollback**: Use `git checkout` commands provided in each task

**Full Rollback**:
```bash
git checkout src/components/game/GameCell.tsx
git checkout src/components/game/GameCell.test.tsx
git checkout src/lib/chess/pieceMovement.ts
git checkout src/lib/chess/pieceMovement.test.ts
git checkout src/lib/chess/moveValidation.ts
git checkout src/components/game/GameBoard.integration.test.tsx
git reset --hard HEAD  # Nuclear option
```

---

## Risk Assessment

**Low Risk**:
- Additive changes (no deletions)
- Follows existing patterns
- Comprehensive test coverage
- No state management changes
- No UI layout changes

**Potential Issues**:

1. **Pawn Direction Confusion**:
   - Light/dark direction might be inverted
   - **Mitigation**: Comprehensive tests for both colors
   - **Validation**: Manual testing with both light and dark pawns
   - **Fallback**: Easy to swap direction multiplier

2. **Queen Performance**:
   - Combining rook + bishop moves might produce duplicates
   - **Mitigation**: JavaScript Set would deduplicate, but arrays are fine (positions are compared by value)
   - **Validation**: Test on 3x3 board is fast enough
   - **Fallback**: No performance impact expected on 3x3 board

3. **Off-Board Edge Cases**:
   - Pawn/queen off-board logic might have edge cases
   - **Mitigation**: Follow existing rook/bishop patterns
   - **Validation**: Manual testing of off-board moves
   - **Fallback**: Can disable off-board for queen/pawn initially if issues arise

---

## Success Criteria

- ✅ Queen displays as ♕ (light) or ♛ (dark) on game board
- ✅ Pawn displays as ♙ (light) or ♟ (dark) on game board
- ✅ getQueenMoves() implemented and tested (8 directions from center)
- ✅ getPawnMoves() implemented and tested (forward + diagonal captures)
- ✅ Queen move highlighting works in GameBoard
- ✅ Pawn move highlighting works in GameBoard
- ✅ All TypeScript checks pass (0 errors)
- ✅ All ESLint checks pass (0 warnings)
- ✅ All tests pass (12+ new tests for queen/pawn)
- ✅ Production build succeeds
- ✅ Manual testing checklist complete
- ✅ No regressions in existing piece functionality

---

## Assumptions

1. Queen moves = rook + bishop (standard chess rules)
2. Pawn cannot move 2 squares on first move (3x3 board too small)
3. No en passant (3x3 board too small)
4. Pawn promotion handled by off-board logic (out of scope)
5. Queen can move off-board using rook OR bishop rules
6. Pawn can move off-board only from opponent's starting row
7. Direction convention: Light toward row 0, Dark toward row 2
8. No special "pawn push" or "pawn storm" mechanics needed

---

## Notes

- This completes the piece selection feature (Issue #6)
- All 5 piece types now fully functional: rook, knight, bishop, queen, pawn
- TDD approach: Red → Green → Refactor
- Reference CLAUDE-REACT.md for React 19 patterns
- Unicode characters sourced from PIECE_POOL in pieceSelection/types.ts
- GameCell.tsx has its own PIECE_UNICODE lookup (intentional duplication for separation of concerns)
- Tests use uuid for piece IDs (follow existing test patterns)
- Off-board logic allows scoring by moving pieces to opponent's court

---

**END OF TASK PRP**
