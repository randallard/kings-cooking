# Phase 2: King's Cooking Chess Engine Implementation

**Version:** 1.0.0
**Date:** October 13, 2025
**Phase:** 2 of 7 (Chess Engine Core Logic)
**Estimated Duration:** Week 1-2
**Complexity:** High

---

## 🎯 GOAL

Implement a fully functional, type-safe chess engine for King's Cooking variant with comprehensive test coverage.

**Specific End State:**
- Complete `KingsChessEngine` class with all piece movement logic
- Rook, knight, and bishop movement validation (standard chess rules)
- Off-board movement mechanics (rooks can exit, knights can jump off, bishops must edge-first)
- Capture mechanics (captured pieces go to capturing player's king's court)
- Victory condition detection (most pieces in opponent's court wins)
- Move history tracking with complete game state serialization
- **MINIMUM 80% test coverage** on chess engine code
- Zero TypeScript errors, zero ESLint warnings
- Production-ready build passing

**Success Criteria:**
- [ ] All piece movements validated correctly per chess rules
- [ ] Off-board moves work according to King's Cooking rules
- [ ] Captures send pieces to correct court (captured piece to captor's king court)
- [ ] Victory detection works correctly
- [ ] Move history tracks all moves with timestamps
- [ ] State serialization round-trips successfully
- [ ] 80%+ test coverage achieved
- [ ] All validation gates pass

---

## 💡 WHY

### Business Value

This phase implements the **core game logic** that makes King's Cooking playable. Without a working chess engine:
- No move validation → players could cheat
- No victory detection → games never end
- No state management → can't save/load games
- No move history → can't review or undo

### User Impact

While Phase 2 doesn't directly show UI changes, it enables:
- **Phase 3**: URL encoding/decryption of valid game states
- **Phase 4**: UI components that display validated moves
- **Phase 5**: Full game flow with working rules
- **Phase 6**: Confident polish knowing logic is solid

### Technical Dependencies

Phase 2 builds on Phase 1 foundation:
- Uses `GameStateSchema` from `src/lib/validation/schemas.ts` (273 lines)
- Uses `PieceSchema`, `MoveSchema` branded types
- Leverages localStorage utilities from `src/lib/storage/localStorage.ts`
- Follows TypeScript strict mode patterns established
- Uses Vitest testing infrastructure

Phase 3+ depend on Phase 2:
- URL encoding needs valid game states
- UI needs move validation
- Game flow needs victory detection

---

## 📋 WHAT

### User-Visible Behavior

**Note:** Phase 2 has NO direct user-visible changes (engine only). However, it enables all future gameplay.

### Technical Requirements

#### 1. Chess Engine Class (`src/lib/chess/KingsChessEngine.ts`)

```typescript
class KingsChessEngine {
  // Initialize 3x3 board with starting pieces
  constructor(initialState?: GameState)

  // Core public API
  public makeMove(from: Position, to: Position | 'off_board'): MoveResult
  public getValidMoves(position: Position): Position[]
  public checkGameEnd(): VictoryResult
  public getGameState(): GameState

  // State management
  public toJSON(): GameState
  public static fromJSON(json: GameState): KingsChessEngine
}
```

#### 2. Movement Validation (`src/lib/chess/moveValidation.ts`)

- **Rook Movement:**
  - Horizontal/vertical any distance
  - Cannot jump pieces
  - Can move off-board if path to edge is clear

- **Knight Movement:**
  - L-shape: 2 squares one direction, 1 perpendicular
  - Can jump pieces
  - Can jump directly off-board into opponent's court

- **Bishop Movement:**
  - Diagonal any distance
  - Cannot jump pieces
  - MUST stop at board edge, then move off-board on next turn

#### 3. Board Edge Rules

```
[Black King's Court] ← Goal zone (off-board, scorable)
[♜][♞][♝]            ← Black's starting row (row 0)
[ ][ ][ ]            ← Middle row (row 1)
[♖][♘][♗]            ← White's starting row (row 2)
[White King's Court] ← Goal zone (off-board, scorable)
```

**Edge Rules:**
1. **Opponent's court edge** (row -1 for Black, row 3 for White): CAN move off to score
2. **Own court edge**: CANNOT move backward off toward own court
3. **Side edges** (columns -1 and 3): CANNOT move off sides

#### 4. Capture Mechanics

**CRITICAL RULE:** When a piece is captured:
- The captured piece goes to the **capturing player's king's court**
- NOT the opponent's court
- Does NOT count toward score
- Example: White rook captures Black knight → Black knight goes to **White** king's court (no points for anyone)

#### 5. Victory Conditions

**Primary Win Condition:**
```typescript
// Count pieces that successfully reached opponent's court
whiteScore = whitePieces.filter(p => p.position === 'black_court').length
blackScore = blackPieces.filter(p => p.position === 'white_court').length

if (whiteScore > blackScore) return { winner: 'white' }
if (blackScore > whiteScore) return { winner: 'black' }
return { winner: null } // Draw
```

**Game End Triggers:**
- All 6 pieces are either captured or in a king's court
- Stalemate (no legal moves available)

#### 6. State Serialization

Must serialize to/from `GameState` schema:
```typescript
{
  version: '1.0.0',
  gameId: GameId,
  board: (Piece | null)[][],  // 3x3 grid
  whiteCourt: Piece[],         // White pieces in Black's court (white scores)
  blackCourt: Piece[],         // Black pieces in White's court (black scores)
  capturedWhite: Piece[],      // White pieces captured (in White's court)
  capturedBlack: Piece[],      // Black pieces captured (in Black's court)
  currentTurn: number,
  currentPlayer: 'white' | 'black',
  whitePlayer: PlayerInfo,
  blackPlayer: PlayerInfo,
  status: 'playing' | 'white_wins' | 'black_wins' | 'draw',
  winner: 'white' | 'black' | null,
  moveHistory: Move[],
  checksum: string
}
```

---

## 📚 ALL NEEDED CONTEXT

### Phase 1 Foundation (MUST READ FIRST)

**Already Implemented:**
- ✅ `src/lib/validation/schemas.ts` (273 lines)
  - GameStateSchema, PieceSchema, MoveSchema with branded types
  - PlayerIdSchema, GameIdSchema, MoveIdSchema
  - Complete validation helpers
- ✅ `src/lib/storage/localStorage.ts` (203 lines)
  - Type-safe storage with Zod validation
  - getValidatedItem(), setValidatedItem()
- ✅ TypeScript strict mode configured (tsconfig.json)
- ✅ Vitest 3.2.4 + Playwright 1.56.0 testing setup
- ✅ ESLint + Prettier with zero warnings enforcement

### External Documentation (CRITICAL READING)

#### Chess Engine Patterns

1. **chess.js** - TypeScript chess library (industry standard)
   - URL: https://github.com/jhlywa/chess.js
   - Use: Move generation/validation patterns
   - Key: See how they validate moves, track history
   - **GOTCHA**: chess.js assumes standard 8x8 board - we have 3x3

2. **chessops** - Chess variants in TypeScript
   - URL: https://github.com/niklasf/chessops
   - Use: Variant implementation patterns
   - Key: How to handle non-standard rules
   - **GOTCHA**: More complex than needed, extract patterns only

3. **KhepriChess** - Custom TypeScript engine
   - URL: https://github.com/kurt1288/KhepriChess
   - Use: Clean architecture patterns
   - Key: See class structure, move validation
   - **GOTCHA**: Uses bitboards (overkill for 3x3)

4. **Edd Mann's Chess Tutorial**
   - URL: https://eddmann.com/posts/creating-a-react-based-chess-game-with-wasm-bots-in-typescript/
   - Use: Complete implementation guide
   - Key: React + engine integration
   - **GOTCHA**: Focus on engine parts, ignore WASM

#### Project Documentation (MANDATORY)

5. **PRD.md** - Game Rules Specification
   - Location: `/home/ryankhetlyr/Development/kings-cooking/PRD.md`
   - Read: Lines 38-177 (Game Rules Specification)
   - Key: Off-board movement rules (lines 92-106)
   - Key: Capture mechanics (lines 107-119)
   - Key: Victory conditions (lines 121-141)
   - Key: Example game flow (lines 142-177)

6. **chess_engine_typescript_patterns.md**
   - Location: `/home/ryankhetlyr/Development/kings-cooking/kings-cooking-docs/chess_engine_typescript_patterns.md`
   - Use: Reference implementation for King's Cooking
   - Key: KingsChessEngine class (lines 48-356)
   - Key: Setup modes (lines 359-481)
   - Key: Move validation (lines 484-678)
   - Key: Testing patterns (lines 750-900)

7. **CLAUDE-REACT.md**
   - Location: `/home/ryankhetlyr/Development/kings-cooking/claude_md_files/CLAUDE-REACT.md`
   - Use: TypeScript and testing standards
   - Key: Strict mode requirements (lines 204-222)
   - Key: JSDoc documentation requirements (lines 546-683)
   - Key: Testing standards (lines 389-455)

### Code Examples from Research

#### Piece Movement Pattern (from chess.js)

```typescript
// Rook moves (horizontal/vertical)
getRookMoves(from: Position): Position[] {
  const moves: Position[] = [];
  const directions = [[0,1], [0,-1], [1,0], [-1,0]];

  for (const [dr, dc] of directions) {
    let row = from[0] + dr;
    let col = from[1] + dc;

    while (this.isInBounds(row, col)) {
      const piece = this.getPieceAt([row, col]);

      if (!piece) {
        moves.push([row, col]); // Empty square
      } else if (piece.owner !== this.currentPlayer) {
        moves.push([row, col]); // Capture
        break; // Can't jump
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

#### Off-Board Movement Pattern

```typescript
// Check if piece can move off-board
canMoveOffBoard(from: Position, piece: Piece): boolean {
  // Only rooks and knights for King's Cooking
  if (piece.type === 'rook') {
    return this.hasPathToOpponentEdge(from);
  }

  if (piece.type === 'knight') {
    // Knight can jump, check if L-shape lands off-board
    return this.hasKnightJumpOffBoard(from);
  }

  // Bishops cannot move off-board (must edge-first)
  return false;
}
```

### Common Gotchas & Pitfalls

1. **Board Size Confusion**
   - ❌ **WRONG**: Use 8x8 chess patterns directly
   - ✅ **CORRECT**: 3x3 board with 0-indexed [0-2][0-2]
   - **Fix**: All bounds checking must use `row >= 0 && row < 3 && col >= 0 && col < 3`

2. **Capture Destination Error**
   - ❌ **WRONG**: Captured piece goes to opponent's court (scoring)
   - ✅ **CORRECT**: Captured piece goes to captor's king's court (no score)
   - **Fix**: `if (captured) { this.myCourt.push(captured); }` not `opponentCourt`

3. **Off-Board Movement Confusion**
   - ❌ **WRONG**: All pieces can move off-board
   - ✅ **CORRECT**: Only rooks (path clear) and knights (jump)
   - ❌ **WRONG**: Bishops can move diagonally off
   - ✅ **CORRECT**: Bishops MUST stop at edge, then move off next turn
   - **Fix**: Implement `canMoveOffBoard()` with piece-specific logic

4. **Victory Condition Mistake**
   - ❌ **WRONG**: Count all pieces in courts (including captured)
   - ✅ **CORRECT**: Only count pieces that reached opponent's court
   - **Fix**: `whiteCourt` = white pieces in Black's court (white score)
   - **Fix**: `capturedWhite` = white pieces captured (NOT scored)

5. **Position Tracking Error**
   - ❌ **WRONG**: Use `position: [row, col]` for off-board pieces
   - ✅ **CORRECT**: Use `position: null` when off-board
   - **Fix**: Update schema, track location separately (`whiteCourt` array)

6. **Move History Validation**
   - ❌ **WRONG**: Store moves without validation
   - ✅ **CORRECT**: Validate with Zod before adding to history
   - **Fix**: Use `MoveSchema.parse(move)` before `moveHistory.push()`

7. **TypeScript Branded Types**
   - ❌ **WRONG**: Assume `string` is `GameId`
   - ✅ **CORRECT**: Use `GameIdSchema.parse()` to create branded type
   - **Fix**: `const gameId: GameId = GameIdSchema.parse(uuid())`

8. **Edge Detection Off-By-One**
   - ❌ **WRONG**: Check if `row === 3` for White's off-board edge
   - ✅ **CORRECT**: Check if `row < 0` (Black's edge) or `row > 2` (White's edge)
   - **Fix**: Use `to === 'off_board'` string literal, not position checks

### Performance Considerations

- **3x3 Board**: Very small, performance NOT a concern
- **No Need for Bitboards**: Overkill for 9 squares
- **Simple Array**: `board: (Piece | null)[][]` is perfectly fine
- **Move Validation**: <1ms per move with brute force
- **Focus**: Correctness over optimization

---

## 🔨 IMPLEMENTATION BLUEPRINT

### High-Level Architecture

```
src/lib/chess/
├── KingsChessEngine.ts        # Main engine class
├── moveValidation.ts           # Piece movement logic
├── pieceMovement.ts            # Get valid moves for each piece
├── victoryConditions.ts        # Win/draw detection
├── types.ts                    # Engine-specific types
└── __tests__/
    ├── KingsChessEngine.test.ts
    ├── moveValidation.test.ts
    ├── pieceMovement.test.ts
    └── victoryConditions.test.ts
```

### Implementation Tasks (In Order)

#### Task 1: Create Engine Types (`src/lib/chess/types.ts`)

**Purpose:** Define engine-specific types beyond schemas

```typescript
/**
 * @fileoverview Type definitions for Kings Chess Engine
 * @module lib/chess/types
 */

import type { Piece, GameState, Position } from '../validation/schemas';

/**
 * Result of attempting a move.
 */
export interface MoveResult {
  /** Whether move was successful */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Updated game state if successful */
  gameState?: GameState;
  /** Piece that was captured, if any */
  captured?: Piece;
}

/**
 * Result of checking for game end.
 */
export interface VictoryResult {
  /** Whether game is over */
  gameOver: boolean;
  /** Winner if game over */
  winner?: 'white' | 'black' | null;
  /** Score breakdown */
  score?: {
    white: number;
    black: number;
  };
  /** Reason for game end */
  reason?: string;
}

/**
 * Direction vectors for piece movement.
 */
export type Direction = [number, number];

/**
 * Validation result with detailed feedback.
 */
export interface ValidationResult {
  valid: boolean;
  reason?: string;
  warnings?: string[];
}
```

**Tests:** None needed (types only)

**Validation:**
```bash
pnpm run type-check
```

---

#### Task 2: Implement Piece Movement Helpers (`src/lib/chess/pieceMovement.ts`)

**Purpose:** Calculate valid moves for each piece type

```typescript
/**
 * @fileoverview Piece movement calculation for Kings Chess
 * @module lib/chess/pieceMovement
 *
 * Calculates all possible moves for each piece type following
 * standard chess rules within a 3x3 board.
 */

import type { Piece, Position } from '../validation/schemas';
import type { Direction } from './types';

/**
 * Check if position is within board bounds (0-2, 0-2).
 *
 * @param row - Row index
 * @param col - Column index
 * @returns True if position is on board
 */
export function isInBounds(row: number, col: number): boolean {
  return row >= 0 && row < 3 && col >= 0 && col < 3;
}

/**
 * Get all rook moves from position.
 *
 * Rooks move horizontally or vertically any distance.
 * Cannot jump over pieces.
 *
 * @param from - Starting position
 * @param getpiece - Function to get piece at position
 * @param currentPlayer - Current player color
 * @returns Array of valid destination positions
 */
export function getRookMoves(
  from: Position,
  getPiece: (pos: Position) => Piece | null,
  currentPlayer: 'white' | 'black'
): Position[] {
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

/**
 * Get all knight moves from position.
 *
 * Knights move in L-shape: 2 squares one direction, 1 perpendicular.
 * Can jump over pieces.
 *
 * @param from - Starting position
 * @param getPiece - Function to get piece at position
 * @param currentPlayer - Current player color
 * @returns Array of valid destination positions
 */
export function getKnightMoves(
  from: Position,
  getPiece: (pos: Position) => Piece | null,
  currentPlayer: 'white' | 'black'
): Position[] {
  const moves: Position[] = [];
  const offsets: Direction[] = [
    [2, 1], [2, -1], [-2, 1], [-2, -1],
    [1, 2], [1, -2], [-1, 2], [-1, -2],
  ];

  for (const [dr, dc] of offsets) {
    const row = from[0] + dr;
    const col = from[1] + dc;

    if (!isInBounds(row, col)) continue;

    const piece = getPiece([row, col]);
    if (!piece || piece.owner !== currentPlayer) {
      moves.push([row, col]);
    }
  }

  return moves;
}

/**
 * Get all bishop moves from position.
 *
 * Bishops move diagonally any distance.
 * Cannot jump over pieces.
 *
 * @param from - Starting position
 * @param getPiece - Function to get piece at position
 * @param currentPlayer - Current player color
 * @returns Array of valid destination positions
 */
export function getBishopMoves(
  from: Position,
  getPiece: (pos: Position) => Piece | null,
  currentPlayer: 'white' | 'black'
): Position[] {
  const moves: Position[] = [];
  const directions: Direction[] = [[1, 1], [1, -1], [-1, 1], [-1, -1]];

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

/**
 * Check if rook has clear path to opponent's edge.
 *
 * For King's Cooking off-board moves.
 * Rook must have unobstructed path in at least one direction.
 *
 * @param from - Starting position
 * @param piece - Piece to check (must be rook)
 * @param getPiece - Function to get piece at position
 * @returns True if clear path exists to scorable edge
 */
export function hasRookPathToEdge(
  from: Position,
  piece: Piece,
  getPiece: (pos: Position) => Piece | null
): boolean {
  if (piece.type !== 'rook') return false;

  const directions: Direction[] = [[0, 1], [0, -1], [1, 0], [-1, 0]];

  for (const [dr, dc] of directions) {
    let row = from[0] + dr;
    let col = from[1] + dc;
    let pathClear = true;

    while (isInBounds(row, col)) {
      if (getPiece([row, col])) {
        pathClear = false;
        break;
      }
      row += dr;
      col += dc;
    }

    if (pathClear) {
      // Check if we exited through opponent's edge
      const exitRow = row;
      if (piece.owner === 'white' && exitRow < 0) return true;
      if (piece.owner === 'black' && exitRow > 2) return true;
    }
  }

  return false;
}

/**
 * Check if knight can jump off board to opponent's court.
 *
 * For King's Cooking off-board moves.
 * Knight L-shaped move must land beyond opponent's edge.
 *
 * @param from - Starting position
 * @param piece - Piece to check (must be knight)
 * @returns True if knight can jump to opponent's court
 */
export function canKnightJumpOffBoard(
  from: Position,
  piece: Piece
): boolean {
  if (piece.type !== 'knight') return false;

  const offsets: Direction[] = [
    [2, 1], [2, -1], [-2, 1], [-2, -1],
    [1, 2], [1, -2], [-1, 2], [-1, -2],
  ];

  for (const [dr, dc] of offsets) {
    const row = from[0] + dr;
    const col = from[1] + dc;

    // Check if L-move lands off-board through opponent's edge
    if (piece.owner === 'white' && row < 0) return true;
    if (piece.owner === 'black' && row > 2) return true;
  }

  return false;
}
```

**Tests:** Create `pieceMovement.test.ts`
- Test rook moves in all 4 directions
- Test knight L-shaped moves
- Test bishop diagonal moves
- Test path blocking
- Test capture moves
- Test off-board path detection
- Test board boundaries

**Validation:**
```bash
pnpm test src/lib/chess/pieceMovement.test.ts
```

---

#### Task 3: Implement Move Validation (`src/lib/chess/moveValidation.ts`)

**Purpose:** Validate moves according to King's Cooking rules

```typescript
/**
 * @fileoverview Move validation for Kings Chess Engine
 * @module lib/chess/moveValidation
 *
 * Validates all moves according to King's Cooking rules:
 * - Standard chess piece movement
 * - Off-board movement restrictions
 * - Capture rules
 */

import type { Piece, Position } from '../validation/schemas';
import type { ValidationResult } from './types';
import {
  getRookMoves,
  getKnightMoves,
  getBishopMoves,
  hasRookPathToEdge,
  canKnightJumpOffBoard,
} from './pieceMovement';

/**
 * Validate if move is legal.
 *
 * @param from - Starting position
 * @param to - Destination position or 'off_board'
 * @param piece - Piece being moved
 * @param getPiece - Function to get piece at position
 * @param currentPlayer - Current player
 * @returns Validation result with success status and error details
 */
export function validateMove(
  from: Position,
  to: Position | 'off_board',
  piece: Piece,
  getPiece: (pos: Position) => Piece | null,
  currentPlayer: 'white' | 'black'
): ValidationResult {
  // Check it's this piece's turn
  if (piece.owner !== currentPlayer) {
    return {
      valid: false,
      reason: `It's ${currentPlayer}'s turn, cannot move ${piece.owner} pieces`,
    };
  }

  // Handle off-board moves
  if (to === 'off_board') {
    return validateOffBoardMove(from, piece, getPiece);
  }

  // Handle standard on-board moves
  return validateStandardMove(from, to, piece, getPiece, currentPlayer);
}

/**
 * Validate off-board move.
 *
 * CRITICAL RULES:
 * - Rooks: Can move off if clear path to opponent's edge
 * - Knights: Can jump off to opponent's court
 * - Bishops: CANNOT move off (must edge-first, then next turn)
 *
 * @param from - Starting position
 * @param piece - Piece to move off-board
 * @param getPiece - Function to get piece at position
 * @returns Validation result
 */
function validateOffBoardMove(
  from: Position,
  piece: Piece,
  getPiece: (pos: Position) => Piece | null
): ValidationResult {
  if (piece.type === 'rook') {
    const hasPath = hasRookPathToEdge(from, piece, getPiece);
    if (!hasPath) {
      return {
        valid: false,
        reason: 'Rook has no clear path to board edge',
      };
    }
    return {
      valid: true,
      warnings: [`${piece.owner} rook moves to ${piece.owner} king's court`],
    };
  }

  if (piece.type === 'knight') {
    const canJump = canKnightJumpOffBoard(from, piece);
    if (!canJump) {
      return {
        valid: false,
        reason: 'Knight L-move does not land in opponent court',
      };
    }
    return {
      valid: true,
      warnings: [`${piece.owner} knight jumps to ${piece.owner} king's court`],
    };
  }

  // Bishops cannot move off-board
  return {
    valid: false,
    reason: 'Bishops cannot move off-board (must stop at edge, then move off next turn)',
  };
}

/**
 * Validate standard on-board move.
 *
 * @param from - Starting position
 * @param to - Destination position
 * @param piece - Piece being moved
 * @param getPiece - Function to get piece at position
 * @param currentPlayer - Current player
 * @returns Validation result
 */
function validateStandardMove(
  from: Position,
  to: Position,
  piece: Piece,
  getPiece: (pos: Position) => Piece | null,
  currentPlayer: 'white' | 'black'
): ValidationResult {
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
    default:
      return {
        valid: false,
        reason: `Unknown piece type: ${piece.type}`,
      };
  }

  // Check if destination is in valid moves
  const isValid = validMoves.some(([r, c]) => r === to[0] && c === to[1]);

  if (!isValid) {
    return {
      valid: false,
      reason: `${piece.type} cannot move from [${from}] to [${to}]`,
    };
  }

  // Check for capture
  const targetPiece = getPiece(to);
  const warnings: string[] = [];

  if (targetPiece) {
    warnings.push(
      `Captured ${targetPiece.owner} ${targetPiece.type} will go to ${currentPlayer} king's court`
    );
  }

  return { valid: true, warnings };
}

/**
 * Check if player is in stalemate (no legal moves).
 *
 * @param pieces - Array of current player's pieces on board
 * @param getPiece - Function to get piece at position
 * @param currentPlayer - Current player
 * @returns True if no legal moves exist
 */
export function isStalemate(
  pieces: Piece[],
  getPiece: (pos: Position) => Piece | null,
  currentPlayer: 'white' | 'black'
): boolean {
  for (const piece of pieces) {
    if (piece.position === null) continue; // Off-board

    const validMoves = getValidMovesForPiece(
      piece.position,
      piece,
      getPiece,
      currentPlayer
    );

    if (validMoves.length > 0) return false; // Has moves
  }

  return true; // No legal moves
}

/**
 * Get all valid moves for a piece (helper).
 */
function getValidMovesForPiece(
  from: Position,
  piece: Piece,
  getPiece: (pos: Position) => Piece | null,
  currentPlayer: 'white' | 'black'
): Position[] {
  switch (piece.type) {
    case 'rook':
      return getRookMoves(from, getPiece, currentPlayer);
    case 'knight':
      return getKnightMoves(from, getPiece, currentPlayer);
    case 'bishop':
      return getBishopMoves(from, getPiece, currentPlayer);
    default:
      return [];
  }
}
```

**Tests:** Create `moveValidation.test.ts`
- Test all piece movement validation
- Test off-board move validation
- Test capture detection
- Test stalemate detection
- Test error messages

**Validation:**
```bash
pnpm test src/lib/chess/moveValidation.test.ts
```

---

#### Task 4: Implement Victory Conditions (`src/lib/chess/victoryConditions.ts`)

**Purpose:** Detect game end and determine winner

```typescript
/**
 * @fileoverview Victory condition detection for Kings Chess
 * @module lib/chess/victoryConditions
 *
 * Implements King's Cooking victory rules:
 * - Winner = player with most pieces in OPPONENT'S court
 * - Draw = equal pieces in each court
 * - Game ends when all pieces captured or scored
 */

import type { GameState } from '../validation/schemas';
import type { VictoryResult } from './types';

/**
 * Check if game has ended and determine winner.
 *
 * CRITICAL RULES:
 * - whiteCourt = white pieces in BLACK's court (white scores)
 * - blackCourt = black pieces in WHITE's court (black scores)
 * - capturedWhite = white pieces captured (no score)
 * - capturedBlack = black pieces captured (no score)
 *
 * @param gameState - Current game state
 * @returns Victory result with winner and scores
 */
export function checkGameEnd(gameState: GameState): VictoryResult {
  // Check if all pieces are off-board
  const allOffBoard = areAllPiecesOffBoard(gameState);

  if (!allOffBoard) {
    return { gameOver: false };
  }

  // Count scored pieces (in opponent's courts)
  const whiteScore = gameState.whiteCourt.length; // White in Black's court
  const blackScore = gameState.blackCourt.length; // Black in White's court

  if (whiteScore > blackScore) {
    return {
      gameOver: true,
      winner: 'white',
      score: { white: whiteScore, black: blackScore },
      reason: `White wins with ${whiteScore} pieces in Black's court!`,
    };
  }

  if (blackScore > whiteScore) {
    return {
      gameOver: true,
      winner: 'black',
      score: { white: whiteScore, black: blackScore },
      reason: `Black wins with ${blackScore} pieces in White's court!`,
    };
  }

  return {
    gameOver: true,
    winner: null,
    score: { white: whiteScore, black: blackScore },
    reason: 'Draw! Both kings serve together.',
  };
}

/**
 * Check if all pieces are off-board (captured or scored).
 *
 * @param gameState - Current game state
 * @returns True if no pieces remain on board
 */
function areAllPiecesOffBoard(gameState: GameState): boolean {
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      if (gameState.board[row]?[col] !== null) {
        return false; // Found piece on board
      }
    }
  }
  return true;
}

/**
 * Get current score breakdown.
 *
 * @param gameState - Current game state
 * @returns Score for each player
 */
export function getCurrentScore(gameState: GameState): {
  white: number;
  black: number;
} {
  return {
    white: gameState.whiteCourt.length,
    black: gameState.blackCourt.length,
  };
}
```

**Tests:** Create `victoryConditions.test.ts`
- Test white win scenario
- Test black win scenario
- Test draw scenario
- Test game not over
- Test score calculation

**Validation:**
```bash
pnpm test src/lib/chess/victoryConditions.test.ts
```

---

#### Task 5: Implement Main Engine Class (`src/lib/chess/KingsChessEngine.ts`)

**Purpose:** Main chess engine orchestrating all logic

```typescript
/**
 * @fileoverview Kings Chess Engine - Core game logic
 * @module lib/chess/KingsChessEngine
 *
 * Complete chess engine for King's Cooking variant.
 * Handles move validation, piece placement, capture mechanics,
 * and victory detection.
 */

import { v4 as uuid } from 'uuid';
import {
  GameStateSchema,
  PieceSchema,
  MoveSchema,
  GameIdSchema,
  PlayerIdSchema,
} from '../validation/schemas';
import type {
  GameState,
  Piece,
  Position,
  Move,
  GameId,
  PlayerId,
  PlayerInfo,
} from '../validation/schemas';
import type { MoveResult, VictoryResult } from './types';
import { validateMove } from './moveValidation';
import { checkGameEnd, getCurrentScore } from './victoryConditions';
import {
  getRookMoves,
  getKnightMoves,
  getBishopMoves,
} from './pieceMovement';

/**
 * Kings Chess Engine - Main game logic class.
 *
 * Manages 3x3 board with rook, knight, bishop pieces.
 * Implements King's Cooking rules for off-board movement,
 * captures, and victory conditions.
 *
 * @example
 * ```typescript
 * const engine = new KingsChessEngine(whitePlayer, blackPlayer);
 * const result = engine.makeMove([2, 0], [1, 0]);
 * if (result.success) {
 *   const victory = engine.checkGameEnd();
 *   if (victory.gameOver) {
 *     console.log(victory.reason);
 *   }
 * }
 * ```
 */
export class KingsChessEngine {
  private gameState: GameState;

  /**
   * Create new chess engine.
   *
   * @param whitePlayer - White player info
   * @param blackPlayer - Black player info
   * @param initialState - Optional initial state to restore from
   */
  constructor(
    whitePlayer: PlayerInfo,
    blackPlayer: PlayerInfo,
    initialState?: GameState
  ) {
    if (initialState) {
      // Validate and restore state
      this.gameState = GameStateSchema.parse(initialState);
    } else {
      // Create new game
      this.gameState = this.createInitialState(whitePlayer, blackPlayer);
    }
  }

  /**
   * Create initial game state with starting position.
   *
   * Starting setup:
   * ```
   * [♜][♞][♝]  ← Black (row 0)
   * [ ][ ][ ]  ← Empty (row 1)
   * [♖][♘][♗]  ← White (row 2)
   * ```
   */
  private createInitialState(
    whitePlayer: PlayerInfo,
    blackPlayer: PlayerInfo
  ): GameState {
    const gameId: GameId = GameIdSchema.parse(uuid());

    // Create starting pieces
    const whiteRook: Piece = {
      type: 'rook',
      owner: 'white',
      position: [2, 0],
      moveCount: 0,
      id: uuid(),
    };

    const whiteKnight: Piece = {
      type: 'knight',
      owner: 'white',
      position: [2, 1],
      moveCount: 0,
      id: uuid(),
    };

    const whiteBishop: Piece = {
      type: 'bishop',
      owner: 'white',
      position: [2, 2],
      moveCount: 0,
      id: uuid(),
    };

    const blackRook: Piece = {
      type: 'rook',
      owner: 'black',
      position: [0, 0],
      moveCount: 0,
      id: uuid(),
    };

    const blackKnight: Piece = {
      type: 'knight',
      owner: 'black',
      position: [0, 1],
      moveCount: 0,
      id: uuid(),
    };

    const blackBishop: Piece = {
      type: 'bishop',
      owner: 'black',
      position: [0, 2],
      moveCount: 0,
      id: uuid(),
    };

    // Create 3x3 board
    const board: (Piece | null)[][] = [
      [blackRook, blackKnight, blackBishop],
      [null, null, null],
      [whiteRook, whiteKnight, whiteBishop],
    ];

    const initialState: GameState = {
      version: '1.0.0',
      gameId,
      board,
      whiteCourt: [],
      blackCourt: [],
      capturedWhite: [],
      capturedBlack: [],
      currentTurn: 0,
      currentPlayer: 'white',
      whitePlayer,
      blackPlayer,
      status: 'playing',
      winner: null,
      moveHistory: [],
      checksum: this.generateChecksum(gameId, 0, board),
    };

    return GameStateSchema.parse(initialState);
  }

  /**
   * Make a move on the board.
   *
   * @param from - Starting position
   * @param to - Destination position or 'off_board'
   * @returns Move result with success status
   */
  public makeMove(from: Position, to: Position | 'off_board'): MoveResult {
    const piece = this.getPieceAt(from);

    if (!piece) {
      return {
        success: false,
        error: `No piece at position [${from}]`,
      };
    }

    // Validate move
    const validation = validateMove(
      from,
      to,
      piece,
      this.getPieceAt.bind(this),
      this.gameState.currentPlayer
    );

    if (!validation.valid) {
      return {
        success: false,
        error: validation.reason,
      };
    }

    // Execute move
    if (to === 'off_board') {
      return this.executeOffBoardMove(from, piece);
    } else {
      return this.executeStandardMove(from, to, piece);
    }
  }

  /**
   * Execute off-board move.
   */
  private executeOffBoardMove(from: Position, piece: Piece): MoveResult {
    // Remove piece from board
    this.gameState.board[from[0]]![from[1]] = null;

    // Update piece position
    piece.position = null;
    piece.moveCount++;

    // Add to scoring court (piece goes to OWN king's court in opponent's side)
    if (piece.owner === 'white') {
      this.gameState.whiteCourt.push(piece);
    } else {
      this.gameState.blackCourt.push(piece);
    }

    // Record move
    const move: Move = MoveSchema.parse({
      id: uuid(),
      from,
      to: 'off_board',
      piece: PieceSchema.parse(piece),
      captured: null,
      timestamp: Date.now(),
    });

    this.gameState.moveHistory.push(move);

    // Switch turns
    this.advanceTurn();

    return {
      success: true,
      gameState: this.gameState,
    };
  }

  /**
   * Execute standard on-board move.
   */
  private executeStandardMove(
    from: Position,
    to: Position,
    piece: Piece
  ): MoveResult {
    const targetPiece = this.getPieceAt(to);

    // Handle capture
    if (targetPiece) {
      // CRITICAL: Captured piece goes to CAPTOR's king court
      targetPiece.position = null;

      if (piece.owner === 'white') {
        this.gameState.capturedBlack.push(targetPiece);
      } else {
        this.gameState.capturedWhite.push(targetPiece);
      }
    }

    // Move piece
    this.gameState.board[from[0]]![from[1]] = null;
    this.gameState.board[to[0]]![to[1]] = piece;
    piece.position = to;
    piece.moveCount++;

    // Record move
    const move: Move = MoveSchema.parse({
      id: uuid(),
      from,
      to,
      piece: PieceSchema.parse(piece),
      captured: targetPiece ? PieceSchema.parse(targetPiece) : null,
      timestamp: Date.now(),
    });

    this.gameState.moveHistory.push(move);

    // Switch turns
    this.advanceTurn();

    return {
      success: true,
      gameState: this.gameState,
      captured: targetPiece ?? undefined,
    };
  }

  /**
   * Advance to next turn.
   */
  private advanceTurn(): void {
    this.gameState.currentTurn++;
    this.gameState.currentPlayer =
      this.gameState.currentPlayer === 'white' ? 'black' : 'white';
    this.gameState.checksum = this.generateChecksum(
      this.gameState.gameId,
      this.gameState.currentTurn,
      this.gameState.board
    );
  }

  /**
   * Get valid moves for piece at position.
   *
   * @param position - Position to check
   * @returns Array of valid move destinations
   */
  public getValidMoves(position: Position): Position[] {
    const piece = this.getPieceAt(position);
    if (!piece) return [];
    if (piece.owner !== this.gameState.currentPlayer) return [];

    switch (piece.type) {
      case 'rook':
        return getRookMoves(
          position,
          this.getPieceAt.bind(this),
          this.gameState.currentPlayer
        );
      case 'knight':
        return getKnightMoves(
          position,
          this.getPieceAt.bind(this),
          this.gameState.currentPlayer
        );
      case 'bishop':
        return getBishopMoves(
          position,
          this.getPieceAt.bind(this),
          this.gameState.currentPlayer
        );
      default:
        return [];
    }
  }

  /**
   * Check if game has ended.
   *
   * @returns Victory result with winner
   */
  public checkGameEnd(): VictoryResult {
    return checkGameEnd(this.gameState);
  }

  /**
   * Get current game state.
   *
   * @returns Current game state (deep copy)
   */
  public getGameState(): GameState {
    return GameStateSchema.parse(JSON.parse(JSON.stringify(this.gameState)));
  }

  /**
   * Get piece at position.
   *
   * @param position - Position to check
   * @returns Piece at position or null
   */
  public getPieceAt(position: Position): Piece | null {
    return this.gameState.board[position[0]]?.[position[1]] ?? null;
  }

  /**
   * Serialize to JSON.
   *
   * @returns Game state as JSON
   */
  public toJSON(): GameState {
    return this.getGameState();
  }

  /**
   * Create engine from JSON state.
   *
   * @param json - Serialized game state
   * @returns New engine instance
   */
  public static fromJSON(json: GameState): KingsChessEngine {
    const validated = GameStateSchema.parse(json);
    return new KingsChessEngine(
      validated.whitePlayer,
      validated.blackPlayer,
      validated
    );
  }

  /**
   * Generate checksum for state validation.
   */
  private generateChecksum(
    gameId: GameId,
    turn: number,
    board: (Piece | null)[][]
  ): string {
    const data = `${gameId}-${turn}-${JSON.stringify(board)}`;
    // Simple checksum (could use crypto.subtle for production)
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
  }
}
```

**Tests:** Create `KingsChessEngine.test.ts`
- Test initial state creation
- Test makeMove success/failure
- Test off-board moves
- Test captures
- Test victory detection
- Test serialization
- Test fromJSON
- Test checksum validation

**Validation:**
```bash
pnpm test src/lib/chess/KingsChessEngine.test.ts --coverage
```

---

#### Task 6: Write Comprehensive Tests

**Create test files with 80%+ coverage**

`src/lib/chess/__tests__/KingsChessEngine.test.ts` (example):

```typescript
/**
 * @fileoverview Tests for Kings Chess Engine
 * @module lib/chess/__tests__/KingsChessEngine
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { KingsChessEngine } from '../KingsChessEngine';
import { GameIdSchema, PlayerIdSchema } from '../../validation/schemas';
import type { PlayerInfo } from '../../validation/schemas';
import { v4 as uuid } from 'uuid';

describe('KingsChessEngine', () => {
  let whitePlayer: PlayerInfo;
  let blackPlayer: PlayerInfo;
  let engine: KingsChessEngine;

  beforeEach(() => {
    whitePlayer = {
      id: PlayerIdSchema.parse(uuid()),
      name: 'White Player',
    };

    blackPlayer = {
      id: PlayerIdSchema.parse(uuid()),
      name: 'Black Player',
    };

    engine = new KingsChessEngine(whitePlayer, blackPlayer);
  });

  describe('initialization', () => {
    test('should create valid initial state', () => {
      const state = engine.getGameState();

      expect(state.version).toBe('1.0.0');
      expect(state.currentPlayer).toBe('white');
      expect(state.currentTurn).toBe(0);
      expect(state.status).toBe('playing');
      expect(state.whiteCourt).toHaveLength(0);
      expect(state.blackCourt).toHaveLength(0);
      expect(state.capturedWhite).toHaveLength(0);
      expect(state.capturedBlack).toHaveLength(0);
    });

    test('should set up starting position correctly', () => {
      const state = engine.getGameState();
      const board = state.board;

      // Black pieces on row 0
      expect(board[0]![0]?.type).toBe('rook');
      expect(board[0]![0]?.owner).toBe('black');
      expect(board[0]![1]?.type).toBe('knight');
      expect(board[0]![2]?.type).toBe('bishop');

      // Empty row 1
      expect(board[1]![0]).toBeNull();
      expect(board[1]![1]).toBeNull();
      expect(board[1]![2]).toBeNull();

      // White pieces on row 2
      expect(board[2]![0]?.type).toBe('rook');
      expect(board[2]![0]?.owner).toBe('white');
      expect(board[2]![1]?.type).toBe('knight');
      expect(board[2]![2]?.type).toBe('bishop');
    });
  });

  describe('makeMove', () => {
    test('should allow valid rook move', () => {
      const result = engine.makeMove([2, 0], [1, 0]);

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();

      const state = engine.getGameState();
      expect(state.board[1]![0]?.type).toBe('rook');
      expect(state.board[2]![0]).toBeNull();
      expect(state.currentPlayer).toBe('black');
      expect(state.currentTurn).toBe(1);
    });

    test('should reject move to occupied square', () => {
      const result = engine.makeMove([2, 0], [2, 1]);

      expect(result.success).toBe(false);
      expect(result.error).toContain('cannot move');
    });

    test('should reject move when not your turn', () => {
      const result = engine.makeMove([0, 0], [1, 0]);

      expect(result.success).toBe(false);
      expect(result.error).toContain("It's white's turn");
    });

    test('should handle captures correctly', () => {
      // Set up capture scenario
      engine.makeMove([2, 1], [1, 2]); // White knight
      engine.makeMove([0, 2], [1, 2]); // Black bishop captures

      const state = engine.getGameState();
      expect(state.capturedWhite).toHaveLength(1);
      expect(state.capturedWhite[0]?.type).toBe('knight');
    });
  });

  describe('off-board moves', () => {
    test('should allow rook to move off-board with clear path', () => {
      // Clear path for white rook
      engine.makeMove([2, 0], [1, 0]);
      engine.makeMove([0, 0], [1, 0]); // Black captures
      engine.makeMove([2, 1], [0, 2]); // White knight
      engine.makeMove([1, 0], [0, 0]); // Black rook to edge

      const result = engine.makeMove([0, 0], 'off_board');

      expect(result.success).toBe(true);

      const state = engine.getGameState();
      expect(state.blackCourt).toHaveLength(1);
      expect(state.blackCourt[0]?.type).toBe('rook');
    });

    test('should reject bishop off-board move', () => {
      engine.makeMove([2, 2], [1, 1]);
      engine.makeMove([0, 0], [1, 0]);
      engine.makeMove([1, 1], [0, 2]);

      const result = engine.makeMove([0, 2], 'off_board');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Bishops cannot move off-board');
    });
  });

  describe('victory conditions', () => {
    test('should detect white victory', () => {
      // Simulate game where white gets 2 pieces to black court
      // Black gets 1 piece to white court
      const state = engine.getGameState();
      state.whiteCourt = [
        { type: 'rook', owner: 'white', position: null, moveCount: 3, id: uuid() },
        { type: 'knight', owner: 'white', position: null, moveCount: 2, id: uuid() },
      ];
      state.blackCourt = [
        { type: 'bishop', owner: 'black', position: null, moveCount: 4, id: uuid() },
      ];
      state.board = [[null, null, null], [null, null, null], [null, null, null]];

      const engine2 = new KingsChessEngine(whitePlayer, blackPlayer, state);
      const victory = engine2.checkGameEnd();

      expect(victory.gameOver).toBe(true);
      expect(victory.winner).toBe('white');
      expect(victory.score).toEqual({ white: 2, black: 1 });
    });

    test('should detect draw', () => {
      const state = engine.getGameState();
      state.whiteCourt = [
        { type: 'rook', owner: 'white', position: null, moveCount: 3, id: uuid() },
      ];
      state.blackCourt = [
        { type: 'rook', owner: 'black', position: null, moveCount: 3, id: uuid() },
      ];
      state.board = [[null, null, null], [null, null, null], [null, null, null]];

      const engine2 = new KingsChessEngine(whitePlayer, blackPlayer, state);
      const victory = engine2.checkGameEnd();

      expect(victory.gameOver).toBe(true);
      expect(victory.winner).toBeNull();
      expect(victory.reason).toContain('Draw');
    });
  });

  describe('serialization', () => {
    test('should serialize to JSON', () => {
      const json = engine.toJSON();

      expect(json.version).toBe('1.0.0');
      expect(json.board).toHaveLength(3);
    });

    test('should deserialize from JSON', () => {
      const json = engine.toJSON();
      const engine2 = KingsChessEngine.fromJSON(json);
      const state2 = engine2.getGameState();

      expect(state2.gameId).toBe(json.gameId);
      expect(state2.currentTurn).toBe(json.currentTurn);
    });
  });
});
```

**Additional test coverage:**
- `pieceMovement.test.ts` - 100+ test cases for move generation
- `moveValidation.test.ts` - 80+ test cases for validation logic
- `victoryConditions.test.ts` - 20+ test cases for win/draw detection

**Validation:**
```bash
pnpm test -- --coverage --run
```

Target coverage:
- Statements: 85%+
- Branches: 80%+
- Functions: 85%+
- Lines: 85%+

---

## ✅ VALIDATION LOOP

### Level 1: Type Checking & Linting

**Commands:**
```bash
# TypeScript compilation
pnpm run type-check

# ESLint (zero warnings)
pnpm run lint:check
```

**Expected Output:**
```
✓ TypeScript compilation successful
✓ ESLint: No errors, no warnings
```

**If Errors:** Fix TypeScript/ESLint issues before proceeding

---

### Level 2: Unit Tests

**Commands:**
```bash
# Run all tests
pnpm test

# Run with coverage
pnpm run test:coverage

# Run specific file
pnpm test src/lib/chess/KingsChessEngine.test.ts
```

**Expected Output:**
```
 ✓ src/lib/chess/__tests__/KingsChessEngine.test.ts (25)
 ✓ src/lib/chess/__tests__/pieceMovement.test.ts (42)
 ✓ src/lib/chess/__tests__/moveValidation.test.ts (38)
 ✓ src/lib/chess/__tests__/victoryConditions.test.ts (15)

Test Files  4 passed (4)
     Tests  120 passed (120)

Coverage:
---------------------------------|---------|----------|---------|---------|
File                             | % Stmts | % Branch | % Funcs | % Lines |
---------------------------------|---------|----------|---------|---------|
All files                        |   86.34 |    84.21 |   88.67 |   86.34 |
 lib/chess                       |   90.12 |    87.50 |   92.00 |   90.12 |
  KingsChessEngine.ts            |   91.45 |    88.89 |   94.44 |   91.45 |
  moveValidation.ts              |   89.23 |    86.67 |   90.00 |   89.23 |
  pieceMovement.ts               |   92.00 |    88.00 |   95.00 |   92.00 |
  victoryConditions.ts           |   87.50 |    85.00 |   87.50 |   87.50 |
---------------------------------|---------|----------|---------|---------|
```

**Minimum Requirements:**
- All tests passing (100%)
- Overall coverage ≥ 80%
- Chess engine coverage ≥ 85%

**If Failures:** Fix failing tests and add missing coverage

---

### Level 3: Integration Validation

**Commands:**
```bash
# Full game simulation
pnpm test src/lib/chess/__tests__/integration.test.ts

# Build validation
pnpm run build
```

**Expected Output:**
```
✓ Complete game flow from start to victory
✓ Move history tracking
✓ State serialization round-trip
✓ Production build successful (252KB)
```

**If Failures:** Debug integration issues

---

### Level 4: Manual Verification

**Create test script:**

```typescript
// scripts/test-engine.ts
import { KingsChessEngine } from './src/lib/chess/KingsChessEngine';
import { PlayerIdSchema } from './src/lib/validation/schemas';
import { v4 as uuid } from 'uuid';

const whitePlayer = {
  id: PlayerIdSchema.parse(uuid()),
  name: 'Alice',
};

const blackPlayer = {
  id: PlayerIdSchema.parse(uuid()),
  name: 'Bob',
};

const engine = new KingsChessEngine(whitePlayer, blackPlayer);

console.log('Initial state:', engine.getGameState());

// Make moves
console.log('\n--- Move 1: White rook forward ---');
let result = engine.makeMove([2, 0], [1, 0]);
console.log('Result:', result.success ? 'Success' : result.error);

console.log('\n--- Move 2: Black knight forward ---');
result = engine.makeMove([0, 1], [2, 0]);
console.log('Result:', result.success ? 'Success' : result.error);

console.log('\nFinal state:', engine.getGameState());
console.log('\nVictory check:', engine.checkGameEnd());
```

**Run:**
```bash
npx tsx scripts/test-engine.ts
```

---

## 📊 DEFINITION OF DONE

### Code Complete Checklist

- [ ] All 6 implementation tasks completed
- [ ] All files created with proper structure
- [ ] All functions have JSDoc documentation
- [ ] All exports properly typed
- [ ] Zero `any` types used
- [ ] All Zod schemas used correctly

### Testing Complete Checklist

- [ ] 120+ unit tests written
- [ ] All tests passing
- [ ] 80%+ overall coverage achieved
- [ ] 85%+ chess engine coverage
- [ ] Integration tests passing
- [ ] Manual verification script works

### Validation Complete Checklist

- [ ] Level 1: TypeScript compiles (0 errors)
- [ ] Level 1: ESLint passes (0 warnings)
- [ ] Level 2: All tests pass
- [ ] Level 2: Coverage thresholds met
- [ ] Level 3: Build successful
- [ ] Level 4: Manual verification passes

### Documentation Complete Checklist

- [ ] All functions documented with JSDoc
- [ ] Complex logic has explanatory comments
- [ ] README updated with engine usage
- [ ] API examples provided
- [ ] Gotchas documented

---

## 🚀 NEXT STEPS (After Phase 2)

Once Phase 2 is complete and validated:

**Phase 3: URL Encoding & Security**
- Implement AES encryption with crypto-js
- Add LZ-String compression
- Create URL encoding/decoding utilities
- Write Zod validators for URL parameters

**Phase 4: UI Components**
- Build GameBoard component using chess engine
- Create interactive piece selection
- Implement move confirmation
- Add victory screen

**Phase 5: Game Flow Integration**
- Wire engine to React UI
- Implement hot-seat turn handoff
- Add URL generation on move
- Complete game history tracking

---

## 📝 NOTES FOR IMPLEMENTER

### Working with Phase 1 Foundation

**Already available:**
```typescript
// Import existing schemas
import {
  GameStateSchema,
  PieceSchema,
  type GameState,
  type Piece,
} from '../validation/schemas';

// Import existing storage
import { storage } from '../storage/localStorage';

// Save game state
storage.setGameState(engine.getGameState());

// Load game state
const savedState = storage.getGameState();
if (savedState) {
  const engine = KingsChessEngine.fromJSON(savedState);
}
```

### TypeScript Strict Mode Compliance

**MUST follow these patterns:**
```typescript
// ✅ CORRECT: Explicit return types
public makeMove(from: Position, to: Position): MoveResult {
  return { success: true };
}

// ❌ WRONG: Implicit return type
public makeMove(from, to) {
  return { success: true };
}

// ✅ CORRECT: Zod validation
const validated = GameStateSchema.parse(data);

// ❌ WRONG: Type assertion
const validated = data as GameState;

// ✅ CORRECT: null checks
if (piece.position !== null) {
  const [row, col] = piece.position;
}

// ❌ WRONG: Assuming non-null
const [row, col] = piece.position; // Error if null
```

### Common Implementation Mistakes

1. **Wrong Capture Destination**
   - Captured pieces go to CAPTOR's court, not opponent's

2. **Board Indexing**
   - Rows: 0 (Black), 1 (Middle), 2 (White)
   - Columns: 0, 1, 2

3. **Off-Board Validation**
   - Bishops CANNOT move off-board directly

4. **Victory Counting**
   - Only count `whiteCourt` and `blackCourt` arrays
   - Do NOT count `capturedWhite` or `capturedBlack`

### Performance Notes

- 3x3 board is tiny, don't over-optimize
- Focus on correctness and readability
- Validation is more important than speed
- Tests should run in < 2 seconds

### Testing Strategy

**Test Pyramid:**
- Unit tests (120+): Piece movement, validation, helpers
- Integration tests (10+): Complete game flows
- E2E tests (Phase 5): UI interactions

**Test Data:**
- Use fixed UUIDs in tests for reproducibility
- Create helper functions for common scenarios
- Test edge cases (stalemate, all captures, etc.)

---

## 📚 APPENDIX: Additional Resources

### External Libraries (Reference Only)

- **chess.js**: https://github.com/jhlywa/chess.js
- **chessops**: https://github.com/niklasf/chessops
- **uuid**: https://www.npmjs.com/package/uuid

### Internal Documentation

- **PRD**: `/home/ryankhetlyr/Development/kings-cooking/PRD.md`
- **Schemas**: `/home/ryankhetlyr/Development/kings-cooking/src/lib/validation/schemas.ts`
- **localStorage**: `/home/ryankhetlyr/Development/kings-cooking/src/lib/storage/localStorage.ts`

### Related PRPs

- **Phase 1**: Foundation (COMPLETED)
- **Phase 3**: URL Encoding (NEXT)
- **Phase 4**: UI Components (FUTURE)

---

**END OF PRP**

**Confidence Score:** 9/10
**Reasoning:** Comprehensive context, detailed implementation steps, clear validation gates, and extensive testing requirements. Only concern is the novelty of King's Cooking rules, but detailed examples mitigate this.

**Estimated Time:** 10-15 hours for full implementation and testing
**Complexity:** High (custom chess variant logic)
**Risk Level:** Low (well-defined requirements, existing foundation)
