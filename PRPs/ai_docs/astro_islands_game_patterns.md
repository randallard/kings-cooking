# Astro Islands Architecture for Interactive Chess Games

## Overview
Implementation patterns for building interactive chess games using Astro 5+ Islands Architecture with optimal performance and real-time capabilities.

## Core Islands Strategy

### Hydration Strategy for Chess Game
```typescript
// Critical path - immediate hydration
<ChessBoard client:load />
<GameConnection client:load />

// Secondary features - idle hydration
<GameControls client:idle />
<MoveHistory client:idle />
<ChatInterface client:idle />

// Viewport optimization
<GameAnalysis client:visible />
<PlayerStats client:visible />

// Mobile-specific components
<TouchGameInterface client:media="(max-width: 768px)" />
```

## State Management with Nanostores

### Game State Store Setup
```typescript
// stores/gameState.ts
import { map, atom, computed } from 'nanostores';

interface KingsChessBoard {
  width: number;
  height: number;
  squares: (ChessPiece | null)[][];
}

interface GameState {
  board: KingsChessBoard;
  currentPlayer: 'white' | 'black';
  gamePhase: 'setup' | 'piece_selection' | 'playing' | 'finished';
  moveHistory: ChessMove[];
  capturedPieces: {
    white: ChessPiece[];
    black: ChessPiece[];
  };
  partyGuests: {
    whiteKing: ChessPiece[];
    blackKing: ChessPiece[];
  };
  setupMode: 'random' | 'mirrored' | 'independent';
  gameResult?: {
    winner: 'white' | 'black' | 'draw';
    reason: string;
  };
}

export const gameState = map<GameState>({
  board: { width: 8, height: 6, squares: [] },
  currentPlayer: 'white',
  gamePhase: 'setup',
  moveHistory: [],
  capturedPieces: { white: [], black: [] },
  partyGuests: { whiteKing: [], blackKing: [] },
  setupMode: 'random'
});

export const connectionState = map({
  status: 'disconnected' as 'disconnected' | 'connecting' | 'connected',
  playerId: '',
  opponentId: '',
  latency: 0
});

export const uiState = map({
  selectedSquare: null as [number, number] | null,
  highlightedMoves: [] as [number, number][],
  isMyTurn: false,
  showMoveHistory: false,
  showChat: false
});

// Computed stores
export const isPlayerTurn = computed(
  [gameState, connectionState],
  (game, connection) => {
    const isWhite = connection.playerId === 'white';
    return game.currentPlayer === (isWhite ? 'white' : 'black');
  }
);

export const gameStatus = computed(gameState, (state) => {
  if (state.gamePhase === 'finished' && state.gameResult) {
    return `Game Over: ${state.gameResult.winner} wins by ${state.gameResult.reason}`;
  }
  return `${state.currentPlayer}'s turn`;
});
```

### Cross-Island Communication
```typescript
// lib/gameActions.ts
import { gameState, connectionState, uiState } from '@/stores/gameState';

export function makeMove(from: [number, number], to: [number, number]): boolean {
  const currentState = gameState.get();
  const piece = currentState.board.squares[from[0]]?.[from[1]];

  if (!piece || !isValidMove(from, to, currentState)) {
    return false;
  }

  // Create new state
  const newBoard = structuredClone(currentState.board);
  const capturedPiece = newBoard.squares[to[0]]?.[to[1]];

  // Handle King's Cooking special rules
  if (capturedPiece) {
    const capturer = piece.color;
    const captured = capturedPiece.color;

    // Send captured piece to opponent's king for the party
    if (captured === 'white') {
      currentState.partyGuests.blackKing.push(capturedPiece);
    } else {
      currentState.partyGuests.whiteKing.push(capturedPiece);
    }
  }

  // Handle off-board moves for rooks and queens
  if (isOffBoardMove(to, currentState.board)) {
    if (piece.type === 'rook' || piece.type === 'queen') {
      // Move piece off board (to the party!)
      newBoard.squares[from[0]][from[1]] = null;

      const targetKing = piece.color === 'white' ? 'whiteKing' : 'blackKing';
      currentState.partyGuests[targetKing].push(piece);
    } else {
      return false; // Invalid off-board move
    }
  } else {
    // Normal move
    newBoard.squares[to[0]][to[1]] = piece;
    newBoard.squares[from[0]][from[1]] = null;
  }

  // Update game state
  gameState.setKey('board', newBoard);
  gameState.setKey('currentPlayer', currentState.currentPlayer === 'white' ? 'black' : 'white');
  gameState.setKey('moveHistory', [...currentState.moveHistory, { from, to, piece, timestamp: Date.now() }]);

  // Check for game end
  checkGameEnd();

  return true;
}

function checkGameEnd(): void {
  const state = gameState.get();
  const whiteGuests = state.partyGuests.whiteKing.length;
  const blackGuests = state.partyGuests.blackKing.length;

  // King's Cooking victory condition: king with most guests hosts the party
  if (whiteGuests > blackGuests && whiteGuests >= 3) {
    gameState.setKey('gamePhase', 'finished');
    gameState.setKey('gameResult', {
      winner: 'white',
      reason: `White King hosts the party with ${whiteGuests} guests!`
    });
  } else if (blackGuests > whiteGuests && blackGuests >= 3) {
    gameState.setKey('gamePhase', 'finished');
    gameState.setKey('gameResult', {
      winner: 'black',
      reason: `Black King hosts the party with ${blackGuests} guests!`
    });
  }
}
```

## Component Architecture

### Main Game Board Island
```astro
---
// components/islands/ChessBoard.astro
export interface Props {
  width: number;
  height: number;
}

const { width = 8, height = 6 } = Astro.props;
---

<div class="chess-board-container">
  <div id="chess-board" data-width={width} data-height={height}></div>
  <div id="party-area">
    <div class="king-party white-party">
      <h3>White King's Party</h3>
      <div id="white-guests"></div>
    </div>
    <div class="king-party black-party">
      <h3>Black King's Party</h3>
      <div id="black-guests"></div>
    </div>
  </div>
</div>

<script>
  import { useStore } from '@nanostores/vanilla';
  import { gameState, makeMove, selectSquare } from '@/lib/gameActions';

  class ChessBoardController {
    private boardElement: HTMLElement;
    private selectedSquare: [number, number] | null = null;

    constructor() {
      this.boardElement = document.getElementById('chess-board')!;
      this.initializeBoard();
      this.setupEventListeners();
      this.subscribeToState();
    }

    private initializeBoard(): void {
      const width = parseInt(this.boardElement.dataset.width!);
      const height = parseInt(this.boardElement.dataset.height!);

      // Create board grid
      this.boardElement.style.display = 'grid';
      this.boardElement.style.gridTemplateColumns = `repeat(${width}, 1fr)`;
      this.boardElement.style.gridTemplateRows = `repeat(${height}, 1fr)`;

      // Create squares
      for (let row = 0; row < height; row++) {
        for (let col = 0; col < width; col++) {
          const square = document.createElement('div');
          square.className = `chess-square ${(row + col) % 2 === 0 ? 'light' : 'dark'}`;
          square.dataset.row = row.toString();
          square.dataset.col = col.toString();
          square.addEventListener('click', () => this.handleSquareClick(row, col));
          this.boardElement.appendChild(square);
        }
      }
    }

    private handleSquareClick(row: number, col: number): void {
      if (this.selectedSquare) {
        // Attempt move
        const success = makeMove(this.selectedSquare, [row, col]);
        if (success) {
          this.selectedSquare = null;
          this.updateHighlights();
        }
      } else {
        // Select square
        this.selectedSquare = [row, col];
        this.updateHighlights();
      }
    }

    private subscribeToState(): void {
      useStore(gameState, (state) => {
        this.renderBoard(state.board);
        this.renderParties(state.partyGuests);
      });
    }

    private renderBoard(board: KingsChessBoard): void {
      const squares = this.boardElement.querySelectorAll('.chess-square');

      squares.forEach((square, index) => {
        const row = Math.floor(index / board.width);
        const col = index % board.width;
        const piece = board.squares[row]?.[col];

        square.textContent = piece ? this.getPieceSymbol(piece) : '';
        square.className = `chess-square ${(row + col) % 2 === 0 ? 'light' : 'dark'}`;

        if (piece) {
          square.classList.add(`piece-${piece.color}`);
        }
      });
    }

    private renderParties(parties: GameState['partyGuests']): void {
      const whiteGuestsEl = document.getElementById('white-guests')!;
      const blackGuestsEl = document.getElementById('black-guests')!;

      whiteGuestsEl.innerHTML = parties.whiteKing
        .map(piece => `<span class="party-guest">${this.getPieceSymbol(piece)}</span>`)
        .join('');

      blackGuestsEl.innerHTML = parties.blackKing
        .map(piece => `<span class="party-guest">${this.getPieceSymbol(piece)}</span>`)
        .join('');
    }

    private getPieceSymbol(piece: ChessPiece): string {
      const symbols = {
        white: { pawn: '♙', rook: '♖', knight: '♘', bishop: '♗', queen: '♕', king: '♔' },
        black: { pawn: '♟', rook: '♜', knight: '♞', bishop: '♝', queen: '♛', king: '♚' }
      };
      return symbols[piece.color][piece.type];
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new ChessBoardController());
  } else {
    new ChessBoardController();
  }
</script>

<style>
  .chess-board-container {
    display: flex;
    gap: 2rem;
    max-width: 1200px;
    margin: 0 auto;
  }

  #chess-board {
    aspect-ratio: 4/3; /* Default 8x6 board */
    max-width: 600px;
    border: 2px solid #8B4513;
    box-shadow: 0 4px 8px rgba(0,0,0,0.3);
  }

  .chess-square {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2rem;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .chess-square.light {
    background-color: #F5F5DC;
  }

  .chess-square.dark {
    background-color: #D2B48C;
  }

  .chess-square:hover {
    background-color: #FFE4B5;
  }

  .chess-square.selected {
    background-color: #87CEEB;
  }

  .chess-square.highlighted {
    background-color: #98FB98;
  }

  .party-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .king-party {
    border: 2px solid #DAA520;
    border-radius: 8px;
    padding: 1rem;
    background: linear-gradient(145deg, #FFF8DC, #F0E68C);
  }

  .king-party h3 {
    margin: 0 0 0.5rem 0;
    color: #8B4513;
    text-align: center;
  }

  .party-guest {
    display: inline-block;
    margin: 0.2rem;
    padding: 0.2rem;
    background: rgba(255,255,255,0.7);
    border-radius: 4px;
    font-size: 1.5rem;
  }

  @media (max-width: 768px) {
    .chess-board-container {
      flex-direction: column;
    }

    .chess-square {
      font-size: 1.5rem;
    }
  }
</style>
```

### Game Setup Island
```astro
---
// components/islands/GameSetup.astro
export interface Props {
  isHost: boolean;
}

const { isHost } = Astro.props;
---

<div class="game-setup" data-is-host={isHost}>
  <div class="setup-controls">
    {isHost && (
      <div class="board-size-selector">
        <label for="board-width">Board Width:</label>
        <input type="range" id="board-width" min="4" max="12" value="8" />
        <span id="width-display">8</span>

        <label for="board-height">Board Height:</label>
        <input type="range" id="board-height" min="4" max="12" value="6" />
        <span id="height-display">6</span>
      </div>
    )}

    {!isHost && (
      <div class="setup-mode-selector">
        <h3>Choose Setup Mode:</h3>
        <button data-mode="random">🎲 Random Pieces</button>
        <button data-mode="mirrored">🪞 Mirrored Selection</button>
        <button data-mode="independent">🆓 Independent Choice</button>
      </div>
    )}
  </div>

  <div class="piece-selection" style="display: none;">
    <h3>Select Your Pieces:</h3>
    <div class="available-pieces">
      <button data-piece="queen">♕ Queen</button>
      <button data-piece="rook">♖ Rook</button>
      <button data-piece="bishop">♗ Bishop</button>
      <button data-piece="knight">♘ Knight</button>
      <button data-piece="pawn">♙ Pawn</button>
    </div>
    <div class="board-preview"></div>
  </div>
</div>

<script>
  import { gameState } from '@/stores/gameState';
  import { sendSetupChoice } from '@/lib/webrtc/gameConnection';

  class GameSetupController {
    private isHost: boolean;

    constructor() {
      const container = document.querySelector('.game-setup') as HTMLElement;
      this.isHost = container.dataset.isHost === 'true';
      this.initializeControls();
    }

    private initializeControls(): void {
      if (this.isHost) {
        this.setupBoardSizeControls();
      } else {
        this.setupModeSelector();
      }
    }

    private setupBoardSizeControls(): void {
      const widthSlider = document.getElementById('board-width') as HTMLInputElement;
      const heightSlider = document.getElementById('board-height') as HTMLInputElement;
      const widthDisplay = document.getElementById('width-display')!;
      const heightDisplay = document.getElementById('height-display')!;

      widthSlider.addEventListener('input', (e) => {
        const value = (e.target as HTMLInputElement).value;
        widthDisplay.textContent = value;
        this.updateBoardPreview();
      });

      heightSlider.addEventListener('input', (e) => {
        const value = (e.target as HTMLInputElement).value;
        heightDisplay.textContent = value;
        this.updateBoardPreview();
      });
    }

    private setupModeSelector(): void {
      const buttons = document.querySelectorAll('[data-mode]');

      buttons.forEach(button => {
        button.addEventListener('click', (e) => {
          const mode = (e.target as HTMLElement).dataset.mode!;
          this.selectSetupMode(mode as 'random' | 'mirrored' | 'independent');
        });
      });
    }

    private selectSetupMode(mode: 'random' | 'mirrored' | 'independent'): void {
      gameState.setKey('setupMode', mode);
      sendSetupChoice({ setupMode: mode });

      // Show piece selection if needed
      if (mode === 'mirrored' || mode === 'independent') {
        this.showPieceSelection();
      } else {
        this.generateRandomSetup();
      }
    }

    private showPieceSelection(): void {
      const pieceSelection = document.querySelector('.piece-selection') as HTMLElement;
      pieceSelection.style.display = 'block';

      const buttons = pieceSelection.querySelectorAll('[data-piece]');
      buttons.forEach(button => {
        button.addEventListener('click', (e) => {
          const piece = (e.target as HTMLElement).dataset.piece!;
          this.selectPiece(piece);
        });
      });
    }

    private selectPiece(pieceType: string): void {
      // Implementation for piece selection logic
      console.log(`Selected piece: ${pieceType}`);
    }

    private updateBoardPreview(): void {
      // Update visual preview of board size
    }

    private generateRandomSetup(): void {
      // Generate random piece placement
      const pieces = ['queen', 'rook', 'rook', 'bishop', 'bishop', 'knight', 'knight'];
      const boardWidth = parseInt((document.getElementById('board-width') as HTMLInputElement)?.value || '8');

      // Fill remaining slots with pawns if needed
      while (pieces.length < boardWidth) {
        pieces.push('pawn');
      }

      // Shuffle pieces
      for (let i = pieces.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
      }

      console.log('Random setup:', pieces);
    }
  }

  new GameSetupController();
</script>
```

## Performance Optimization

### Bundle Splitting Strategy
```typescript
// astro.config.mjs manual chunks
export default defineConfig({
  vite: {
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'chess-engine': ['chess.js', '@/lib/chess/'],
            'webrtc-utils': ['peerjs', '@/lib/webrtc/'],
            'game-ui': ['@/components/islands/'],
            'state-management': ['nanostores', '@nanostores/vanilla', '@nanostores/react']
          }
        }
      }
    }
  }
});
```

### Lazy Loading Patterns
```astro
<!-- Load heavy components only when needed -->
<GameAnalysis client:visible />
<ReplayViewer client:idle />
<AdvancedSettings client:media="(min-width: 1024px)" />
```

## Testing Islands Components

### Component Testing with Container API
```typescript
// src/test/islands/ChessBoard.test.ts
import { test, expect } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import ChessBoard from '@/components/islands/ChessBoard.astro';

test('ChessBoard renders with correct dimensions', async () => {
  const container = await AstroContainer.create();
  const result = await container.renderToString(ChessBoard, {
    props: { width: 10, height: 8 }
  });

  expect(result).toContain('data-width="10"');
  expect(result).toContain('data-height="8"');
  expect(result).toContain('chess-board-container');
});
```

### E2E Testing with Playwright
```typescript
// src/test/e2e/gameFlow.spec.ts
import { test, expect } from '@playwright/test';

test('complete game setup and play flow', async ({ page, context }) => {
  await page.goto('/game/new');

  // Test island hydration
  await expect(page.locator('[data-testid="chess-board"]')).toBeVisible();

  // Test board size selection
  await page.fill('#board-width', '10');
  await expect(page.locator('#width-display')).toContainText('10');

  // Test piece selection
  await page.click('[data-mode="random"]');
  await expect(page.locator('.chess-square')).toHaveCount(60); // 10x6 board

  // Test game state persistence
  await page.reload();
  await expect(page.locator('#width-display')).toContainText('10');
});
```

## Mobile Optimization

### Touch-Friendly Chess Interface
```astro
<ChessBoardMobile client:media="(max-width: 768px)" />
<ChessBoardDesktop client:media="(min-width: 769px)" />

<script>
  // Touch gestures for mobile
  class MobileChessController {
    private touchStartPos: [number, number] | null = null;

    handleTouchStart(e: TouchEvent): void {
      const touch = e.touches[0];
      const square = this.getSquareFromTouch(touch);
      this.touchStartPos = square;
    }

    handleTouchEnd(e: TouchEvent): void {
      const touch = e.changedTouches[0];
      const square = this.getSquareFromTouch(touch);

      if (this.touchStartPos && square) {
        makeMove(this.touchStartPos, square);
      }
    }

    private getSquareFromTouch(touch: Touch): [number, number] | null {
      const element = document.elementFromPoint(touch.clientX, touch.clientY);
      if (element?.classList.contains('chess-square')) {
        const row = parseInt(element.dataset.row!);
        const col = parseInt(element.dataset.col!);
        return [row, col];
      }
      return null;
    }
  }
</script>
```

## Memory Management

### Cleanup Patterns
```typescript
// Proper cleanup for islands
class IslandController {
  private unsubscribers: Array<() => void> = [];
  private timeouts: number[] = [];

  constructor() {
    // Subscribe to stores
    this.unsubscribers.push(
      gameState.subscribe(this.handleGameStateChange.bind(this)),
      connectionState.subscribe(this.handleConnectionChange.bind(this))
    );

    // Setup cleanup on page unload
    window.addEventListener('beforeunload', this.cleanup.bind(this));
  }

  private cleanup(): void {
    // Unsubscribe from stores
    this.unsubscribers.forEach(unsub => unsub());

    // Clear timeouts
    this.timeouts.forEach(timeout => clearTimeout(timeout));

    // Clean up WebRTC connections
    if (this.gameConnection) {
      this.gameConnection.disconnect();
    }
  }
}
```

This guide provides a comprehensive foundation for implementing interactive chess games with Astro Islands Architecture, ensuring optimal performance, proper state management, and excellent user experience across all devices.