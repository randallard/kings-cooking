# King's Cooking - Product Requirements Document (PRD)

**Version:** 1.0.0
**Date:** October 13, 2025
**Status:** Draft for Review
**Project Type:** Chess Variant Web Game
**Framework:** PRP (Product Requirement Prompt) Methodology

---

## Executive Summary

**King's Cooking** is a fast-paced chess variant where players race to get their pieces to the opponent's king's court for a royal feast. Built with Vite + React + TypeScript for GitHub Pages deployment, the game features both hot-seat and URL-based correspondence play modes with encrypted state management.

### Core Value Proposition
- **Quick gameplay**: 3x3 board with 3 pieces each = 5-10 minute games
- **Strategic depth**: Standard chess movement with invasion-focused objectives
- **Flexible play**: Pass-and-play OR async URL sharing
- **Accessible**: No chess king mechanics, simpler win condition
- **Modern UX**: Dark mode, mobile-first, type-safe architecture

---

## Table of Contents

1. [Game Rules Specification](#game-rules-specification)
2. [Technical Architecture](#technical-architecture)
3. [Development Methodology](#development-methodology)
4. [User Stories & Acceptance Criteria](#user-stories--acceptance-criteria)
5. [Implementation Phases](#implementation-phases)
6. [Testing Strategy](#testing-strategy)
7. [Success Metrics](#success-metrics)
8. [Risk Assessment](#risk-assessment)

---

## Game Rules Specification

### 1.1 Game Objective

**Win Condition:** Get more of YOUR pieces to YOUR OPPONENT'S king's court than they get to yours.

**Example:**
- White gets 2 pieces to Black's court
- Black gets 1 piece to White's court
- White wins!

### 1.2 Board Setup

**Board Dimensions:** 3x3 playable grid with goal zones beyond each end

```
[Black King's Court] ← Goal zone (off-board)
[♜][♞][♝]            ← Black's starting row (row 0)
[ ][ ][ ]            ← Middle row (row 1)
[♖][♘][♗]            ← White's starting row (row 2)
[White King's Court] ← Goal zone (off-board)
```

**Starting Pieces (each player):**
- 1 Rook (♜/♖)
- 1 Knight (♞/♘)
- 1 Bishop (♝/♗)

**Piece Placement:** Mirrored - both teams get same pieces in same positions
- Position order: Rook, Knight, Bishop (left to right)
- White starts on row 2, Black starts on row 0

**First Move:** White always starts

### 1.3 Movement Rules

**Standard Chess Movement:** All pieces follow traditional chess rules within the 3x3 grid

**Rook:**
- Moves any number of squares horizontally or vertically
- Cannot jump over pieces

**Knight:**
- Moves in "L" shape: 2 squares one direction, 1 square perpendicular
- Can jump over pieces

**Bishop:**
- Moves any number of squares diagonally
- Cannot jump over pieces

**Board Edge Rules:**
1. **Opponent's Court Edge (scoring edge):** Pieces CAN move off this edge to score
2. **Own Court Edge (home edge):** Pieces CANNOT move backward off toward their own court
3. **Side Edges (left/right):** Pieces CANNOT move off these edges - must stop at boundary

### 1.4 Special Movement Cases

**Moving into Opponent's Court (Scoring):**

1. **Rook:** Can move straight off the opponent's edge if path is clear (one move)
2. **Knight:** Can jump directly into opponent's court if L-shaped move lands in goal zone
3. **Bishop:** MUST stop at board edge, then move off into opponent's court on next turn
   - Example: Bishop at (1,1) can move to edge at (0,0), then next turn move off into Black's court

**Why bishop can't move diagonally off-board:**
- The landing square would be "beyond" the board diagonally
- No valid destination square exists in that direction
- Must approach from the edge first

### 1.5 Capture Mechanics

**Standard Captures:** Pieces capture opponent pieces by moving to their square

**What Happens to Captured Pieces:**
- Captured pieces return to their own king's court
- They do NOT count toward either player's score
- They are removed from play

**Example:**
- White rook captures Black knight
- Black knight goes to Black king's court (no points for either player)
- Black knight is out of the game

### 1.6 Victory Conditions

**Primary Win Condition:**
When all pieces are either captured or have reached a king's court:
1. Count white pieces in Black's court
2. Count black pieces in White's court
3. Player with MORE pieces in opponent's court WINS

**Tie Condition:**
If equal pieces in each court, it's a DRAW - "Both kings serve together in the center of the field"

**Game End Triggers:**
- All 6 pieces are either captured or in a king's court
- Stalemate (no legal moves available)

**Stalemate Resolution:**
- If both teams have pieces but no legal moves:
  - Count remaining pieces on board
  - Team with more pieces gets points equal to the difference
  - If equal pieces remain, declare tie

### 1.7 Example Game Flow

**Starting Position:**
```
Black: [♜][♞][♝]
Middle: [ ][ ][ ]
White: [♖][♘][♗]
```

**Move 1:** White knight moves to center (2,1) → (1,1)
```
Black: [♜][♞][♝]
Middle: [ ][♘][ ]
White: [♖][ ][♗]
```

**Move 2:** Black rook captures white knight at (1,1)
- White knight returns to White's court (no points)
```
Black: [♜][♞][♝]
Middle: [ ][♜][ ]
White: [♖][ ][♗]
```

**Move 3:** White rook moves to edge (0,0), captures black rook
- Black rook returns to Black's court (no points)
```
Black: [ ][♞][♝]
Middle: [ ][ ][ ]
White: [♖][ ][♗]  (White rook at 0,0)
```

**Move 4:** White rook moves OFF BOARD into Black's court
- **Score: White 1, Black 0**

(Game continues until all pieces captured or scored)

---

## Technical Architecture

### 2.1 Technology Stack

**Core Technologies:**
- **Vite** - Fast development and build tooling
- **React 18** - Component-based UI with hooks
- **TypeScript** - Type safety and developer experience
- **CSS Modules** - Scoped styling with dark mode support
- **GitHub Pages** - Static hosting
- **GitHub Actions** - Automated deployment

**Key Libraries:**
- **Zod 3.22+** - Runtime validation for game state and URL parameters
- **crypto-js** - AES encryption for URL mode
- **lz-string** - Compression for URL state
- **uuid** - Player ID generation

**Development Tools:**
- **Vitest** - Unit and integration testing
- **Playwright** - E2E testing
- **ESLint** - Code quality
- **Prettier** - Code formatting

### 2.2 Component Architecture

```
src/
├── components/
│   ├── game/
│   │   ├── GameBoard.tsx          # 3x3 grid display
│   │   ├── GameCell.tsx           # Individual cell with piece
│   │   ├── PieceIcon.tsx          # SVG piece rendering
│   │   ├── MoveConfirmButton.tsx  # Confirm move UI
│   │   └── GameStatus.tsx         # Turn indicator, score
│   ├── ui/
│   │   ├── NameForm.tsx           # Player name collection
│   │   ├── ModeSelector.tsx       # Hot-seat vs URL choice
│   │   ├── URLSharer.tsx          # Copy/share URL interface
│   │   ├── HandoffScreen.tsx      # Pass device prompt
│   │   └── VictoryScreen.tsx      # End game celebration
│   └── Rules.tsx                  # In-game rules reference
├── lib/
│   ├── chess/
│   │   ├── KingsChessEngine.ts    # Core game logic
│   │   ├── moveValidation.ts      # Movement rules
│   │   ├── pieceMovement.ts       # Piece-specific moves
│   │   └── victoryConditions.ts   # Win/draw detection
│   ├── state/
│   │   ├── gameState.ts           # State management
│   │   ├── urlEncoding.ts         # Encrypt/decrypt for URLs
│   │   └── localStorage.ts        # Persistent storage
│   └── utils/
│       ├── validation.ts          # Zod schemas
│       └── constants.ts           # Game constants
├── types/
│   └── game.ts                    # TypeScript interfaces
└── App.tsx                        # Main app with routing
```

### 2.3 Data Structures

**Game State Interface:**
```typescript
import { z } from 'zod';

// Branded types for type safety
export const PlayerIdSchema = z.string().uuid().brand<'PlayerId'>();
export const GameIdSchema = z.string().uuid().brand<'GameId'>();

export type PlayerId = z.infer<typeof PlayerIdSchema>;
export type GameId = z.infer<typeof GameIdSchema>;

// Piece types
export const PieceTypeSchema = z.enum(['rook', 'knight', 'bishop']);
export type PieceType = z.infer<typeof PieceTypeSchema>;

// Piece with owner and position
export const PieceSchema = z.object({
  type: PieceTypeSchema,
  owner: z.enum(['white', 'black']),
  position: z.tuple([z.number(), z.number()]).nullable(), // null = in court
  moveCount: z.number().int().min(0),
  id: z.string().uuid(), // Unique piece identifier
});

export type Piece = z.infer<typeof PieceSchema>;

// Game state
export const GameStateSchema = z.object({
  version: z.literal('1.0.0'),
  gameId: GameIdSchema,

  // Board state (3x3 grid)
  board: z.array(z.array(PieceSchema.nullable())).length(3),

  // Pieces in courts
  whiteCourt: z.array(PieceSchema), // White pieces in Black's court (white scores)
  blackCourt: z.array(PieceSchema), // Black pieces in White's court (black scores)

  // Captured pieces (removed from play, no score)
  capturedWhite: z.array(PieceSchema), // White pieces captured
  capturedBlack: z.array(PieceSchema), // Black pieces captured

  // Turn management
  currentTurn: z.number().int().min(0),
  currentPlayer: z.enum(['white', 'black']),

  // Player info
  whitePlayer: z.object({
    id: PlayerIdSchema,
    name: z.string().min(1).max(20),
  }),
  blackPlayer: z.object({
    id: PlayerIdSchema,
    name: z.string().min(1).max(20),
  }),

  // Game status
  status: z.enum(['playing', 'white_wins', 'black_wins', 'draw']),
  winner: z.enum(['white', 'black']).nullable(),

  // Move history
  moveHistory: z.array(z.object({
    from: z.tuple([z.number(), z.number()]),
    to: z.tuple([z.number(), z.number()]).or(z.literal('off_board')),
    piece: PieceSchema,
    captured: PieceSchema.nullable(),
    timestamp: z.number(),
  })),

  // Checksum for validation
  checksum: z.string(),
});

export type GameState = z.infer<typeof GameStateSchema>;
```

**React State:**
```typescript
// Player identity
const [player1Name, setPlayer1Name] = useState<string | null>(null);
const [player2Name, setPlayer2Name] = useState<string | null>(null);
const [myPlayerId, setMyPlayerId] = useState<PlayerId | null>(null);
const [myPlayerNumber, setMyPlayerNumber] = useState<1 | 2 | null>(null);

// Game mode
const [gameMode, setGameMode] = useState<'hotseat' | 'url' | null>(null);

// Game state
const [gameState, setGameState] = useState<GameState | null>(null);

// Move selection
const [selectedCell, setSelectedCell] = useState<[number, number] | null>(null);
const [validMoves, setValidMoves] = useState<Position[]>([]);

// URL sharing
const [shareUrl, setShareUrl] = useState<string>('');
```

### 2.4 State Management Flow

**Unified Flow (Both Modes):**

```
Player1Name → ModeSelection → PreGame → MyTurn → MoveSelected
→ Handoff → Player2NamePrompt (first time) → TheirTurn → MyTurn
→ ... → GameOver
```

**Mode-Specific UI Differences:**

| State | Hot-Seat UI | URL Mode UI |
|-------|------------|-------------|
| PreGame | No warning | ⚠️ Browser memory warning |
| MoveSelected | "Confirm & Hand Off" | "Confirm & Generate URL" |
| Handoff | "Pass to Player 2" | Share URL + Copy button |
| Player2NamePrompt | No warning | ⚠️ Browser memory warning |
| TheirTurn | "I'm Ready" button | "⏳ Waiting..." (passive) |

### 2.5 URL State Management

**Encryption Flow:**
```
GameState → JSON → LZ-String compress → AES encrypt → Base64 → URL
```

**URL Structure:**
```
https://username.github.io/kings-cooking/?s=base64_encrypted_state
```

**Implementation:**
```typescript
import CryptoJS from 'crypto-js';
import LZString from 'lz-string';

const GAME_SECRET = import.meta.env.VITE_GAME_SECRET || 'default-secret';

export function encryptGameState(gameState: GameState): string {
  // Validate before encoding
  const validated = GameStateSchema.parse(gameState);

  const json = JSON.stringify(validated);
  const compressed = LZString.compressToEncodedURIComponent(json);
  const encrypted = CryptoJS.AES.encrypt(compressed, GAME_SECRET).toString();
  const encoded = btoa(encrypted);

  return encoded;
}

export function decryptGameState(encoded: string): GameState {
  try {
    const encrypted = atob(encoded);
    const decrypted = CryptoJS.AES.decrypt(encrypted, GAME_SECRET)
      .toString(CryptoJS.enc.Utf8);
    const json = LZString.decompressFromEncodedURIComponent(decrypted);

    if (!json) throw new Error('Decompression failed');

    const parsed = JSON.parse(json);

    // CRITICAL: Validate untrusted data
    const validated = GameStateSchema.parse(parsed);

    return validated;
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError('Invalid game state format', error);
    }
    throw new DecryptionError('Failed to decrypt game state', error);
  }
}
```

### 2.6 Chess Engine Architecture

**Core Engine Class:**
```typescript
class KingsChessEngine {
  private board: (Piece | null)[][];
  private whiteCourt: Piece[];
  private blackCourt: Piece[];
  private capturedWhite: Piece[];
  private capturedBlack: Piece[];

  constructor(initialState?: GameState) {
    if (initialState) {
      this.loadState(initialState);
    } else {
      this.initializeBoard();
    }
  }

  // Initialize starting position
  private initializeBoard(): void {
    this.board = [
      [createRook('black'), createKnight('black'), createBishop('black')],
      [null, null, null],
      [createRook('white'), createKnight('white'), createBishop('white')],
    ];
    this.whiteCourt = [];
    this.blackCourt = [];
    this.capturedWhite = [];
    this.capturedBlack = [];
  }

  // Validate and execute move
  public makeMove(
    from: [number, number],
    to: [number, number] | 'off_board'
  ): MoveResult {
    const piece = this.getPieceAt(from);

    if (!piece) {
      return { success: false, error: 'No piece at source' };
    }

    // Validate move
    const validation = this.validateMove(from, to, piece);
    if (!validation.valid) {
      return { success: false, error: validation.reason };
    }

    // Execute move
    if (to === 'off_board') {
      return this.moveToOpponentCourt(from, piece);
    } else {
      return this.moveOnBoard(from, to, piece);
    }
  }

  // Get valid moves for piece
  public getValidMoves(position: [number, number]): Position[] {
    const piece = this.getPieceAt(position);
    if (!piece) return [];

    switch (piece.type) {
      case 'rook':
        return this.getRookMoves(position, piece);
      case 'knight':
        return this.getKnightMoves(position, piece);
      case 'bishop':
        return this.getBishopMoves(position, piece);
    }
  }

  // Check victory conditions
  public checkGameEnd(): VictoryResult {
    const allPiecesOffBoard = this.areAllPiecesOffBoard();

    if (!allPiecesOffBoard) {
      return { gameOver: false };
    }

    // Count pieces in opponent's courts
    const whiteScore = this.whiteCourt.length; // White pieces in Black's court
    const blackScore = this.blackCourt.length; // Black pieces in White's court

    if (whiteScore > blackScore) {
      return {
        gameOver: true,
        winner: 'white',
        score: { white: whiteScore, black: blackScore },
        reason: `White wins with ${whiteScore} pieces at Black's court!`,
      };
    } else if (blackScore > whiteScore) {
      return {
        gameOver: true,
        winner: 'black',
        score: { white: whiteScore, black: blackScore },
        reason: `Black wins with ${blackScore} pieces at White's court!`,
      };
    } else {
      return {
        gameOver: true,
        winner: null,
        score: { white: whiteScore, black: blackScore },
        reason: 'Draw! Both kings serve together.',
      };
    }
  }

  // Private helper methods...
  private validateMove(/* ... */): ValidationResult { /* ... */ }
  private getRookMoves(/* ... */): Position[] { /* ... */ }
  private getKnightMoves(/* ... */): Position[] { /* ... */ }
  private getBishopMoves(/* ... */): Position[] { /* ... */ }
  private moveToOpponentCourt(/* ... */): MoveResult { /* ... */ }
  private moveOnBoard(/* ... */): MoveResult { /* ... */ }
  private areAllPiecesOffBoard(): boolean { /* ... */ }
}
```

### 2.7 localStorage Strategy

**Storage Keys:**
```typescript
const STORAGE_KEYS = {
  MY_NAME: 'kings-cooking:my-name',
  MY_PLAYER_ID: 'kings-cooking:my-player-id',
  PLAYER1_NAME: 'kings-cooking:player1-name', // Hot-seat only
  PLAYER2_NAME: 'kings-cooking:player2-name', // Hot-seat only
  GAME_STATE: 'kings-cooking:game-state',
} as const;
```

**Validated Storage Access:**
```typescript
import { z } from 'zod';

const GameHistorySchema = z.object({
  playerName: z.string(),
  sessionId: z.string().uuid(),
  games: z.array(z.object({
    gameId: GameIdSchema,
    opponent: z.string(),
    result: z.enum(['win', 'loss', 'draw']),
    score: z.object({
      me: z.number().int().min(0).max(3),
      opponent: z.number().int().min(0).max(3),
    }),
    completedAt: z.string().datetime(),
  })),
});

export function loadGameHistory(): GameHistory | null {
  try {
    const stored = localStorage.getItem('kings-cooking:history');
    if (!stored) return null;

    const parsed = JSON.parse(stored);
    const result = GameHistorySchema.safeParse(parsed);

    if (result.success) {
      return result.data;
    } else {
      console.error('Invalid game history:', result.error);
      localStorage.removeItem('kings-cooking:history');
      return null;
    }
  } catch (error) {
    console.error('Failed to load game history:', error);
    localStorage.removeItem('kings-cooking:history');
    return null;
  }
}
```

### 2.8 Dark Mode Support

**CSS Setup:**
```css
@import '@correspondence-games/core/src/styles/correspondence-games.css';

:root {
  color-scheme: light dark;
}

/* Use framework CSS variables */
.game-board {
  background: var(--cg-color-bg-secondary);
  padding: var(--cg-spacing-md);
  border-radius: var(--cg-radius-lg);
}

.game-cell {
  background: var(--cg-color-bg-primary);
  color: var(--cg-color-text-primary);
  border: 1px solid var(--cg-color-border);
}

.game-cell:hover {
  background: var(--cg-color-cell-hover);
  box-shadow: var(--cg-shadow-md);
}

@media (prefers-color-scheme: dark) {
  .game-cell:hover {
    box-shadow: var(--cg-shadow-md-dark);
  }
}
```

---

## Development Methodology

### 3.1 PRP Framework

**PRP = PRD + Curated Codebase Intelligence + Agent/Runbook**

This project follows the PRP (Product Requirement Prompt) methodology for AI-assisted development:

1. **Context-Rich Documentation**: Every PRP must include comprehensive docs, examples, gotchas
2. **Validation Loops**: Provide executable tests/lints the AI can run and fix
3. **Progressive Success**: Start simple, validate, then enhance
4. **One-Pass Implementation**: Complete context enables working code in single pass

**PRP Structure:**
- **Goal**: Specific end state and desires
- **Why**: Business value and user impact
- **What**: User-visible behavior and technical requirements
- **All Needed Context**: Documentation URLs, code examples, gotchas, patterns
- **Implementation Blueprint**: Pseudocode with critical details and task lists
- **Validation Loop**: Executable commands for syntax, tests, integration

### 3.2 Test-Driven Development (TDD)

**MANDATORY Red-Green-Refactor Cycle:**

1. **Red**: Write failing test first
2. **Green**: Write minimal code to pass test
3. **Refactor**: Improve code while keeping tests green

**Testing Stack:**
- **Vitest** - Unit testing for game logic, move validation, state management
- **Playwright** - Integration and E2E testing for full game flows
- **Coverage Requirement**: Minimum 80% code coverage

**Test Categories:**

1. **Unit Tests** (`*.test.ts`):
   - Piece movement validation
   - Victory condition detection
   - Game state serialization
   - Encryption/decryption
   - Zod schema validation

2. **Integration Tests** (`*.integration.test.ts`):
   - Complete game flows
   - URL encoding/decoding with real crypto
   - localStorage persistence
   - Cross-tab synchronization (URL mode)

3. **E2E Tests** (`*.e2e.ts`):
   - Full user journeys (both modes)
   - Mobile responsiveness
   - Dark mode switching
   - Error handling

### 3.3 Code Quality Standards

**TypeScript:**
- Strict mode enabled
- No implicit any
- Strict null checks
- No unchecked indexed access

**Validation Gates (Must Pass):**
```bash
# Level 1: Syntax & Style
npm run type-check && npm run lint

# Level 2: Unit Tests
npm test

# Level 3: Integration Tests
npm run test:integration

# Level 4: E2E Testing
npm run test:e2e

# Level 5: Build & Deploy
npm run build && npm run preview
```

**Commit Standards:**
- Conventional Commits format enforced
- All validation gates must pass
- GitHub Actions CI/CD pipeline

---

## User Stories & Acceptance Criteria

### Epic 1: Player Onboarding

**US-1.1: First-Time Player Name Collection**
```
AS A new player
I WANT to enter my name when I first start the game
SO THAT my games are personalized
```

**Acceptance Criteria:**
- [ ] Form appears on app load if no name in localStorage
- [ ] Input is auto-focused and required
- [ ] Name is validated (1-20 characters)
- [ ] Name is saved to localStorage after submission
- [ ] Form uses framework CSS classes
- [ ] Dark mode supported
- [ ] Enter key submits form

**US-1.2: Game Mode Selection**
```
AS A player with a name
I WANT to choose between hot-seat and URL modes
SO THAT I can play the way I prefer
```

**Acceptance Criteria:**
- [ ] Two clear mode options displayed
- [ ] Hot-Seat description: "Play with someone on this device"
- [ ] URL Mode description: "Share game via URL to play remotely"
- [ ] Selection triggers appropriate game flow
- [ ] Can return to mode selection from pre-game
- [ ] Mobile-friendly tap targets

### Epic 2: Game Setup

**US-2.1: Hot-Seat Game Initialization**
```
AS A player in hot-seat mode
I WANT to see the starting board immediately
SO THAT I can begin playing quickly
```

**Acceptance Criteria:**
- [ ] Board shows after mode selection
- [ ] 3 pieces per side (rook, knight, bishop)
- [ ] Pieces in correct starting positions (mirrored)
- [ ] White's turn is clearly indicated
- [ ] Player names shown if available
- [ ] "Start Game" or "Play" button visible

**US-2.2: URL Mode Game Initialization**
```
AS A player in URL mode
I WANT to be warned about browser requirements
SO THAT I don't lose my game
```

**Acceptance Criteria:**
- [ ] Warning shown: "⚠️ Keep this browser tab open and don't clear cache during the game"
- [ ] Warning appears before game starts
- [ ] Can proceed after reading warning
- [ ] Warning styled to stand out
- [ ] Only shown in URL mode, not hot-seat

### Epic 3: Core Gameplay

**US-3.1: Make a Move**
```
AS A player on my turn
I WANT to select a piece and see valid moves
SO THAT I know where I can move
```

**Acceptance Criteria:**
- [ ] Can tap/click my piece to select it
- [ ] Selected piece is highlighted
- [ ] Valid destination squares are indicated
- [ ] Invalid moves are not shown/disabled
- [ ] Can deselect by tapping same piece
- [ ] Can change selection by tapping different piece
- [ ] Only my pieces are selectable on my turn

**US-3.2: Confirm Move**
```
AS A player with a piece selected
I WANT to confirm my move before it's final
SO THAT I don't make accidental moves
```

**Acceptance Criteria:**
- [ ] Confirm button appears when piece selected
- [ ] Button text: "Confirm & Hand Off" (hot-seat) or "Confirm & Generate URL" (URL mode)
- [ ] Move preview shown before confirmation
- [ ] Move only executes after confirmation
- [ ] Can cancel by deselecting piece
- [ ] Button is prominent and hard to miss

**US-3.3: Piece Capture**
```
AS A player making a capture
I WANT to see what happens to captured pieces
SO THAT I understand the game state
```

**Acceptance Criteria:**
- [ ] Captured piece is removed from board
- [ ] Visual feedback shows capture occurred
- [ ] Captured pieces don't count toward score
- [ ] Game state correctly updates
- [ ] Move history records capture

**US-3.4: Moving Off-Board**
```
AS A player with a piece at the opponent's edge
I WANT to move it off-board to score
SO THAT I can win the game
```

**Acceptance Criteria:**
- [ ] Rook can move straight off if path clear
- [ ] Knight can jump off directly
- [ ] Bishop must stop at edge, move off next turn
- [ ] Off-board moves clearly indicated
- [ ] Piece added to correct court
- [ ] Score updates immediately
- [ ] Visual feedback shows piece scored

### Epic 4: Turn Management

**US-4.1: Hot-Seat Turn Handoff**
```
AS A player in hot-seat mode who just moved
I WANT to pass the device to my opponent
SO THAT they can take their turn
```

**Acceptance Criteria:**
- [ ] "Pass to [Opponent Name]" screen appears after move
- [ ] Shows last move made
- [ ] "I'm Ready" button for opponent to click
- [ ] Board hidden until opponent ready
- [ ] Opponent's turn loads after button click
- [ ] Privacy preserved (can't see opponent's view prematurely)

**US-4.2: URL Generation**
```
AS A player in URL mode who just moved
I WANT to get a shareable URL
SO THAT my opponent can take their turn
```

**Acceptance Criteria:**
- [ ] URL generated after move confirmation
- [ ] URL contains encrypted game state
- [ ] "Copy URL" button works
- [ ] Visual confirmation of copy
- [ ] Instructions to send to opponent
- [ ] URL is not generated until move confirmed
- [ ] Delta encoding for subsequent moves

**US-4.3: URL Loading**
```
AS A player receiving a URL
I WANT to load my opponent's move
SO THAT I can continue the game
```

**Acceptance Criteria:**
- [ ] URL parameter detected on page load
- [ ] Game state decrypted successfully
- [ ] Board shows opponent's last move
- [ ] My turn starts immediately
- [ ] Player 2 name collected on first load
- [ ] Invalid URL shows clear error
- [ ] Corrupted data handled gracefully

**US-4.4: Player 2 Name Collection**
```
AS Player 2 receiving my first URL
I WANT to enter my name
SO THAT the game knows who I am
```

**Acceptance Criteria:**
- [ ] Name form appears on first URL load
- [ ] Same form style as Player 1
- [ ] Warning shown (URL mode only)
- [ ] Name saved to localStorage
- [ ] Game continues after name entry
- [ ] Appears only once (first handoff)
- [ ] In hot-seat mode, collected after first move

### Epic 5: Game Completion

**US-5.1: Victory Detection**
```
AS A player when all pieces are off-board
I WANT to see who won
SO THAT I know the outcome
```

**Acceptance Criteria:**
- [ ] Game ends when all pieces captured or scored
- [ ] Winner determined by court counts
- [ ] Victory screen shows final score
- [ ] Winner's name displayed prominently
- [ ] Winning pieces shown
- [ ] Tie condition handled correctly
- [ ] "Play Again" and "Main Menu" buttons available

**US-5.2: Victory Screen (Hot-Seat)**
```
AS A winner in hot-seat mode
I WANT to see a celebration screen
SO THAT we can enjoy the moment together
```

**Acceptance Criteria:**
- [ ] Shows "🎉 [Winner] Wins!"
- [ ] Displays final board state
- [ ] Shows court piece counts
- [ ] No URL sharing section
- [ ] Both players can see result
- [ ] Options to play again or exit

**US-5.3: Victory Screen (URL Mode)**
```
AS A player in URL mode when game ends
I WANT to see the results independently
SO THAT I know the outcome
```

**Acceptance Criteria:**
- [ ] Each player sees result in their own browser
- [ ] No URL generation needed (game over)
- [ ] Final state shown clearly
- [ ] Court counts displayed
- [ ] Option to play again (new game)
- [ ] Game history saved to localStorage

### Epic 6: User Experience

**US-6.1: Dark Mode**
```
AS A player in low-light environment
I WANT automatic dark mode
SO THAT my eyes don't hurt
```

**Acceptance Criteria:**
- [ ] Respects OS dark mode preference
- [ ] All text readable in both modes
- [ ] Buttons visible and styled
- [ ] Game board adapts to mode
- [ ] Sufficient contrast maintained
- [ ] No pure white/black (too harsh)
- [ ] Smooth transitions

**US-6.2: Mobile Responsive**
```
AS A mobile player
I WANT the game to work on my phone
SO THAT I can play anywhere
```

**Acceptance Criteria:**
- [ ] Touch-friendly tap targets (44x44px minimum)
- [ ] Board scales to screen size
- [ ] Forms are mobile-friendly
- [ ] URLs are copyable on mobile
- [ ] Dark mode works on mobile
- [ ] Portrait orientation supported
- [ ] Landscape works but not required

**US-6.3: Error Handling**
```
AS A player experiencing an error
I WANT clear error messages
SO THAT I know what to do
```

**Acceptance Criteria:**
- [ ] Invalid URL shows friendly error
- [ ] Decryption failure explained
- [ ] localStorage cleared shows recovery options
- [ ] Validation errors are specific
- [ ] Error messages use zod-validation-error
- [ ] Corrupted data offers "New Game" option
- [ ] Network errors handled gracefully

**US-6.4: Game History**
```
AS A returning player
I WANT to see my past games
SO THAT I can track my progress
```

**Acceptance Criteria:**
- [ ] Game history saved to localStorage
- [ ] Shows past opponents
- [ ] Displays win/loss/draw record
- [ ] Shows final scores
- [ ] Can export history as JSON
- [ ] Can clear history
- [ ] Validated with Zod on load

---

## Implementation Phases

### Phase 1: Foundation (Week 1)

**Goal:** Basic project setup and core architecture

**Tasks:**
1. Initialize Vite + React + TypeScript project
2. Configure GitHub repository and Pages
3. Set up testing infrastructure (Vitest, Playwright)
4. Implement Zod schemas for game state
5. Create localStorage utilities with validation
6. Set up dark mode CSS framework
7. Configure CI/CD pipeline
8. Write initial E2E test skeleton

**Deliverables:**
- [ ] Project builds successfully
- [ ] Tests run and pass (even if minimal)
- [ ] Dark mode works
- [ ] GitHub Pages deployment functional
- [ ] All validation gates pass

**Validation:**
```bash
npm run build && npm run preview
npm test -- --coverage --run
npm run lint
```

### Phase 2: Chess Engine (Week 1-2)

**Goal:** Core game logic with comprehensive tests

**Tasks:**
1. Implement `KingsChessEngine` class
2. Write piece movement validators (rook, knight, bishop)
3. Implement capture mechanics
4. Create off-board movement logic
5. Write victory condition detector
6. Add move history tracking
7. Implement FEN/serialization
8. Write comprehensive unit tests (80%+ coverage)

**Test Requirements:**
- [ ] All piece movements validated correctly
- [ ] Edge cases tested (board boundaries, obstacles)
- [ ] Capture mechanics work as specified
- [ ] Off-board moves follow rules
- [ ] Victory conditions detect correctly
- [ ] State serialization round-trips

**Deliverables:**
- [ ] Chess engine fully functional
- [ ] 80%+ test coverage
- [ ] All unit tests passing
- [ ] Move validation complete

**Validation:**
```bash
npm test -- src/lib/chess/ --coverage
```

### Phase 3: URL Encoding & Security (Week 2)

**Goal:** Secure state encryption and URL handling

**Tasks:**
1. Implement AES encryption with crypto-js
2. Add LZ-String compression
3. Create URL encoding/decoding utilities
4. Write Zod validators for URL parameters
5. Implement checksum validation
6. Add error handling for corrupted data
7. Write integration tests for full encode/decode cycle
8. Test with malformed/malicious inputs

**Security Requirements:**
- [ ] Game state encrypted with AES
- [ ] Compressed before encryption
- [ ] Validated with Zod after decryption
- [ ] Checksum prevents tampering
- [ ] Errors handled gracefully
- [ ] No sensitive data in URLs

**Deliverables:**
- [ ] URL encoding/decoding works
- [ ] Security tests pass
- [ ] Error handling comprehensive
- [ ] Validation prevents bad data

**Validation:**
```bash
npm test -- src/lib/state/ --coverage
```

### Phase 4: UI Components (Week 2-3)

**Goal:** Build all UI components with tests

**Tasks:**
1. Create `GameBoard` component
2. Build `GameCell` with piece rendering
3. Implement `MoveConfirmButton`
4. Create `NameForm` component
5. Build `ModeSelector`
6. Implement `URLSharer` with copy functionality
7. Create `HandoffScreen` for hot-seat
8. Build `VictoryScreen`
9. Add dark mode to all components
10. Write Playwright component tests

**Component Requirements:**
- [ ] All components use framework CSS
- [ ] Dark mode works in all components
- [ ] Mobile-responsive (320px minimum)
- [ ] Accessible (keyboard navigation, ARIA)
- [ ] Touch-friendly (44x44px tap targets)
- [ ] Loading states handled

**Deliverables:**
- [ ] All components functional
- [ ] Storybook or preview available
- [ ] Dark mode verified
- [ ] Mobile responsive
- [ ] Playwright tests pass

**Validation:**
```bash
npm run test:component
npm run test:e2e -- --headed
```

### Phase 5: Game Flow Integration (Week 3)

**Goal:** Wire up unified state machine

**Tasks:**
1. Implement state machine in `App.tsx`
2. Connect chess engine to UI
3. Add move selection logic
4. Implement hot-seat turn handoff
5. Add URL generation on move
6. Implement Player 2 name collection
7. Create game history tracking
8. Add localStorage persistence
9. Write full E2E game flow tests

**Flow Requirements:**
- [ ] Both modes share same state flow
- [ ] UI differences only where specified
- [ ] P2 name collected on first handoff
- [ ] URLs generated after confirmation only
- [ ] History saved on game end
- [ ] Can refresh page without losing state

**Deliverables:**
- [ ] Complete game playable (both modes)
- [ ] All user stories implemented
- [ ] E2E tests for full journeys pass
- [ ] State persists correctly

**Validation:**
```bash
npm run test:e2e -- --project=chromium
npm run test:e2e -- --project=mobile
```

### Phase 6: Polish & Optimization (Week 3-4)

**Goal:** Production-ready quality

**Tasks:**
1. Performance optimization
2. Bundle size reduction
3. Accessibility audit (WCAG AA)
4. Error message improvements
5. Animation polish
6. Loading state improvements
7. Documentation completion
8. User testing feedback incorporation

**Quality Gates:**
- [ ] Lighthouse score 90+ (Performance, A11y, Best Practices)
- [ ] Bundle size < 500KB
- [ ] Load time < 2s on 3G
- [ ] Zero console errors
- [ ] All validation gates pass
- [ ] Documentation complete

**Deliverables:**
- [ ] Production-ready build
- [ ] All quality metrics met
- [ ] User testing completed
- [ ] Documentation finalized

**Validation:**
```bash
npm run build
npm run lighthouse
npm run test:all
```

### Phase 7: Deployment (Week 4)

**Goal:** Live on GitHub Pages

**Tasks:**
1. Configure GitHub Pages deployment
2. Set up custom domain (optional)
3. Enable HTTPS
4. Configure Vite base path
5. Test deployed version
6. Set up analytics (optional)
7. Create project README
8. Publish release v1.0.0

**Deployment Checklist:**
- [ ] GitHub Actions workflow passing
- [ ] Deployed to GitHub Pages
- [ ] HTTPS enabled
- [ ] All features work in production
- [ ] URLs shareable across browsers/devices
- [ ] Mobile testing on real devices
- [ ] Cross-browser testing (Chrome, Firefox, Safari)

**Deliverables:**
- [ ] Live game at github.io URL
- [ ] README with play link
- [ ] Release notes published
- [ ] Monitoring in place

---

## Testing Strategy

### 6.1 Test-Driven Development Workflow

**For Every Feature:**

1. **Write Test First (Red)**
   ```typescript
   describe('Rook movement', () => {
     it('should move horizontally if path is clear', () => {
       const engine = new KingsChessEngine();
       const result = engine.makeMove([2, 0], [2, 2]);
       expect(result.success).toBe(true);
     });
   });
   ```

2. **Implement Feature (Green)**
   ```typescript
   public makeMove(from: Position, to: Position): MoveResult {
     // Minimal implementation to pass test
   }
   ```

3. **Refactor (Keep Green)**
   ```typescript
   // Improve code structure while tests stay green
   ```

### 6.2 Unit Test Coverage

**Chess Engine (`lib/chess/`):**
```typescript
describe('KingsChessEngine', () => {
  describe('Piece Movement', () => {
    it('rook moves horizontally');
    it('rook moves vertically');
    it('rook cannot jump pieces');
    it('rook can move off-board if path clear');
    it('rook cannot move diagonally');

    it('knight moves in L-shape');
    it('knight can jump pieces');
    it('knight can jump off-board directly');

    it('bishop moves diagonally');
    it('bishop cannot jump pieces');
    it('bishop must stop at edge before moving off');
    it('bishop cannot move straight');
  });

  describe('Captures', () => {
    it('captured piece removed from board');
    it('captured piece added to captor\'s king\'s court');
    it('captured pieces do not count toward score');
    it('capturing own piece is invalid');
  });

  describe('Board Edges', () => {
    it('cannot move off side edges');
    it('cannot move off own court edge');
    it('can move off opponent court edge to score');
  });

  describe('Victory Conditions', () => {
    it('detects winner with most pieces in opponent court');
    it('detects draw when equal pieces in courts');
    it('game ends when all pieces off board');
    it('handles stalemate correctly');
  });

  describe('State Management', () => {
    it('tracks move history');
    it('serializes to JSON');
    it('deserializes from JSON');
    it('validates with Zod schema');
    it('generates correct checksum');
  });
});
```

**URL Encoding (`lib/state/`):**
```typescript
describe('URL Encoding', () => {
  it('encrypts game state');
  it('compresses before encryption');
  it('decrypts successfully');
  it('validates decrypted data with Zod');
  it('handles corrupted data gracefully');
  it('rejects malformed URLs');
  it('rejects tampered checksums');
});
```

**localStorage (`lib/state/localStorage.ts`):**
```typescript
describe('localStorage utilities', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('saves game state');
  it('loads game state with validation');
  it('handles missing data');
  it('handles corrupted data');
  it('validates with Zod');
  it('clears corrupted data automatically');
});
```

### 6.3 Integration Tests

**Full Game Flow (Hot-Seat):**
```typescript
describe('Hot-Seat Game Flow', () => {
  it('collects Player 1 name');
  it('chooses hot-seat mode');
  it('starts game with correct setup');
  it('Player 1 makes first move');
  it('collects Player 2 name on first handoff');
  it('Player 2 makes move');
  it('alternates turns correctly');
  it('detects victory');
  it('shows victory screen');
  it('can play again');
});
```

**Full Game Flow (URL Mode):**
```typescript
describe('URL Mode Game Flow', () => {
  it('collects Player 1 name');
  it('chooses URL mode');
  it('shows browser warning');
  it('starts game');
  it('Player 1 makes move');
  it('generates URL after move');
  it('Player 2 loads URL in new browser');
  it('collects Player 2 name');
  it('Player 2 makes move');
  it('generates new URL with delta');
  it('Player 1 loads new URL');
  it('game continues correctly');
  it('detects victory');
  it('no URL on game over screen');
});
```

### 6.4 E2E Tests (Playwright)

**Test Scenarios:**

1. **Happy Path - Hot-Seat**
   - Enter name → Choose hot-seat → Play full game → Win

2. **Happy Path - URL Mode**
   - Two browser contexts simulating two players
   - Share URLs back and forth
   - Complete game

3. **Error Scenarios**
   - Load invalid URL
   - Clear localStorage mid-game
   - Refresh page during game
   - Corrupted URL data

4. **Mobile Tests**
   - Touch interactions
   - Portrait orientation
   - Copy URL on mobile
   - All features work on small screens

5. **Dark Mode Tests**
   - Toggle dark mode during game
   - All elements visible
   - Sufficient contrast

### 6.5 Coverage Requirements

**Minimum Coverage:**
- **Overall**: 80%
- **Chess Engine**: 90%
- **URL Encoding**: 90%
- **State Management**: 85%
- **Components**: 75%

**Coverage Command:**
```bash
npm test -- --coverage --run
```

**Coverage Report:**
```
----------------------------|---------|----------|---------|---------|
File                        | % Stmts | % Branch | % Funcs | % Lines |
----------------------------|---------|----------|---------|---------|
All files                   |   82.45 |    78.33 |   84.62 |   82.45 |
 lib/chess                  |   92.11 |    88.89 |   95.00 |   92.11 |
  KingsChessEngine.ts       |   94.23 |    90.00 |  100.00 |   94.23 |
  moveValidation.ts         |   90.00 |    87.50 |   90.00 |   90.00 |
 lib/state                  |   88.89 |    85.71 |   87.50 |   88.89 |
  urlEncoding.ts            |   92.31 |    90.00 |   90.91 |   92.31 |
  localStorage.ts           |   85.71 |    80.00 |   83.33 |   85.71 |
 components                 |   76.47 |    70.59 |   78.57 |   76.47 |
----------------------------|---------|----------|---------|---------|
```

---

## Success Metrics

### 7.1 Technical Metrics

**Performance:**
- [ ] Load time < 2 seconds (3G network)
- [ ] First Contentful Paint < 1s
- [ ] Time to Interactive < 2s
- [ ] Bundle size < 500KB (gzipped)
- [ ] Lighthouse Performance score ≥ 90

**Reliability:**
- [ ] 99% uptime on GitHub Pages
- [ ] Zero critical bugs in production
- [ ] All validation gates pass
- [ ] Zero console errors
- [ ] Cross-browser compatibility (Chrome, Firefox, Safari, Edge)

**Code Quality:**
- [ ] 80%+ test coverage
- [ ] TypeScript strict mode with zero errors
- [ ] ESLint with zero warnings
- [ ] All PRPs validate on first pass
- [ ] Documentation complete and accurate

### 7.2 User Experience Metrics

**Usability:**
- [ ] Tutorial completion rate > 80%
- [ ] Game completion rate > 90%
- [ ] URL sharing success rate > 95%
- [ ] Mobile usability (works on 320px+ screens)
- [ ] Accessible (WCAG AA compliance)

**Engagement:**
- [ ] Average game duration: 5-10 minutes
- [ ] Replay rate > 50% (players play multiple games)
- [ ] URL mode adoption > 30%
- [ ] Dark mode usage tracked
- [ ] Error recovery rate > 90%

### 7.3 Success Criteria

**MVP Complete When:**
1. All user stories implemented
2. Both modes fully functional
3. 80%+ test coverage achieved
4. All validation gates passing
5. Deployed to GitHub Pages
6. Documentation complete
7. Zero known critical bugs
8. Mobile responsive verified
9. Dark mode working
10. User testing feedback positive

---

## Risk Assessment

### 8.1 Technical Risks

**Risk: URL Size Limit**
- **Probability:** Medium
- **Impact:** High
- **Mitigation:**
  - Use LZ-String compression
  - Test with max-size game states
  - Implement delta encoding for moves
  - Browser URL limit is ~2000 chars (we should be well under)

**Risk: localStorage Cleared**
- **Probability:** Medium
- **Impact:** High (URL mode only)
- **Mitigation:**
  - Clear warnings to users
  - Graceful error handling
  - Option to export/import game state
  - Consider IndexedDB as backup

**Risk: Encryption Performance**
- **Probability:** Low
- **Impact:** Medium
- **Mitigation:**
  - Profile encryption/decryption time
  - Use Web Workers if needed
  - Optimize with smaller state representation

**Risk: Browser Compatibility**
- **Probability:** Low
- **Impact:** Medium
- **Mitigation:**
  - Test on all major browsers
  - Polyfills for older browsers
  - Feature detection
  - Clear browser requirements

### 8.2 User Experience Risks

**Risk: Users Don't Understand Rules**
- **Probability:** Medium
- **Impact:** Medium
- **Mitigation:**
  - Clear tutorial/rules section
  - Visual guides for piece movement
  - In-game hints
  - Example game walkthrough

**Risk: URL Sharing Confusion**
- **Probability:** Medium
- **Impact:** Medium
- **Mitigation:**
  - Clear copy button with feedback
  - Instructions on what to do with URL
  - Test with non-technical users
  - Fallback to hot-seat if confused

**Risk: Mobile Usability Issues**
- **Probability:** Low
- **Impact:** High
- **Mitigation:**
  - Mobile-first design
  - Touch-friendly tap targets (44x44px)
  - Test on real devices
  - Portrait orientation prioritized

### 8.3 Security Risks

**Risk: URL Tampering**
- **Probability:** Low
- **Impact:** Medium
- **Mitigation:**
  - Checksum validation
  - Zod schema validation after decrypt
  - Reject invalid/corrupted data
  - No sensitive data in URLs

**Risk: XSS via Player Names**
- **Probability:** Low
- **Impact:** Medium
- **Mitigation:**
  - Sanitize all user input
  - React's built-in XSS protection
  - Validate with Zod (max 20 chars)
  - Content Security Policy headers

---

## Appendix A: Technology Justification

### Why Vite?
- Extremely fast dev server (ESM-based)
- Simple configuration
- Built-in TypeScript support
- Optimized production builds
- Perfect for GitHub Pages static hosting

### Why React 18?
- Modern hooks API (useState, useEffect, etc.)
- Excellent TypeScript support
- Large ecosystem and community
- Well-documented patterns for this use case
- Lightweight for a game like this

### Why Zod?
- Runtime validation (TypeScript only checks at build time)
- Automatic type inference (single source of truth)
- Excellent error messages
- Validation at API boundaries (localStorage, URLs)
- Prevents corrupted data issues

### Why crypto-js + lz-string?
- Mature, well-tested libraries
- AES encryption prevents casual tampering
- LZ-String specifically designed for URLs
- Good compression ratio for JSON
- Small bundle size impact

---

## Appendix B: Alternative Approaches Considered

### WebRTC Real-Time Mode (Deferred)
**Considered:** Peer-to-peer real-time multiplayer with WebRTC
**Decision:** Defer to v2.0
**Reasoning:**
- Adds significant complexity
- Requires STUN/TURN servers
- Connection reliability issues
- URL mode provides async play without infrastructure
- Can add later without breaking existing architecture

### Server-Based Multiplayer (Rejected)
**Considered:** Traditional client-server with websockets
**Decision:** Not pursuing
**Reasoning:**
- Requires backend infrastructure (cost, maintenance)
- Against "zero-infrastructure" project goal
- GitHub Pages is free, servers are not
- URL mode achieves async play without servers

### IndexedDB Instead of localStorage (Deferred)
**Considered:** Use IndexedDB for game state storage
**Decision:** Start with localStorage, add IndexedDB later if needed
**Reasoning:**
- localStorage simpler API for small data
- Game state is small (<10KB)
- IndexedDB adds complexity
- Can migrate later if needed
- localStorage has better browser support

---

## Appendix C: Future Enhancements (v2.0+)

### Variable Board Sizes
- Let Player 1 choose dimensions (4x4, 5x5, etc.)
- Dynamic piece counts based on board size
- Algorithmic starting positions

### Multiple Setup Modes
- **Random:** Both get same random pieces and positions
- **Playground Mirrored:** Take turns choosing pieces
- **Playground Independent:** Choose own pieces separately

### Additional Pieces
- Add pawns with promotion rules
- Queen (combination of rook+bishop)
- All standard chess pieces

### Advanced Features
- Game replays with move navigation
- AI opponent (computer player)
- Tournament mode (bracket system)
- Leaderboards (requires backend)
- Statistics dashboard
- Custom piece skins/themes
- Sound effects and music
- Animations for piece movement

### WebRTC Real-Time Mode
- Live multiplayer with video/audio chat
- Connection via peer ID or QR code
- Presence indicators
- Move synchronization

---

## Appendix D: References

**Game Design:**
- kings-cooking-docs/kings-cooking.md - Original game spec
- kings-cooking-docs/STATE_DIAGRAM_TEMPLATE.md - State flow patterns

**Technical Patterns:**
- kings-cooking-docs/chess_engine_typescript_patterns.md - Engine architecture
- kings-cooking-docs/ZOD_VALIDATION_PATTERNS_RESEARCH.md - Validation best practices
- kings-cooking-docs/localStorage-react-patterns-2024-2025.md - Storage patterns
- kings-cooking-docs/NAME_COLLECTION_PATTERN.md - UI patterns
- kings-cooking-docs/DARK_MODE_GUIDE.md - Dark mode implementation

**Methodology:**
- CLAUDE.md - PRP framework and development approach
- PRPs/templates/ - PRP templates for implementation

---

## Document Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-10-13 | AI Assistant | Initial PRD creation based on user requirements |

---

**END OF DOCUMENT**
