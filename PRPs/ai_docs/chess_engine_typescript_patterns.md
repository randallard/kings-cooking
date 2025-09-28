# TypeScript Chess Engine Implementation Patterns

## Overview
Comprehensive patterns for implementing custom chess variants in TypeScript, specifically designed for King's Cooking chess variant with variable board sizes and custom rules.

## Core Chess Engine Setup

### Primary Dependencies
```json
{
  "chess.js": "^1.4.0",
  "nanostores": "^0.10.0"
}
```

### Custom Chess Engine Architecture
```typescript
// lib/chess/KingsChessEngine.ts
import { Chess } from 'chess.js';

interface ChessPiece {
  type: 'pawn' | 'rook' | 'knight' | 'bishop' | 'queen' | 'king';
  color: 'white' | 'black';
  position?: [number, number];
  moveCount: number;
}

interface KingsChessBoard {
  width: number;
  height: number;
  squares: (ChessPiece | null)[][];
}

interface KingsChessMove {
  from: [number, number];
  to: [number, number] | 'off_board';
  piece: ChessPiece;
  captured?: ChessPiece;
  isSpecial?: boolean;
  timestamp: number;
}

interface PartyState {
  whiteKingGuests: ChessPiece[];
  blackKingGuests: ChessPiece[];
}

class KingsChessEngine {
  private board: KingsChessBoard;
  private currentPlayer: 'white' | 'black' = 'white';
  private moveHistory: KingsChessMove[] = [];
  private partyState: PartyState = { whiteKingGuests: [], blackKingGuests: [] };

  constructor(width: number = 8, height: number = 6) {
    this.board = {
      width,
      height,
      squares: Array(height).fill(null).map(() => Array(width).fill(null))
    };
  }

  // Standard chess move validation with custom board size
  isValidMove(from: [number, number], to: [number, number] | 'off_board'): boolean {
    const piece = this.getPieceAt(from);
    if (!piece || piece.color !== this.currentPlayer) {
      return false;
    }

    if (to === 'off_board') {
      return this.isValidOffBoardMove(from, piece);
    }

    // Standard move validation
    return this.isValidStandardMove(from, to as [number, number], piece);
  }

  private isValidOffBoardMove(from: [number, number], piece: ChessPiece): boolean {
    // Only rooks and queens can move off-board
    if (piece.type !== 'rook' && piece.type !== 'queen') {
      return false;
    }

    // Must have clear path to board edge
    return this.hasValidOffBoardPath(from, piece);
  }

  private hasValidOffBoardPath(from: [number, number], piece: ChessPiece): boolean {
    const [row, col] = from;

    // Check all four directions for rooks/queens
    const directions = piece.type === 'queen'
      ? [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]]
      : [[0, 1], [0, -1], [1, 0], [-1, 0]]; // Rook moves only

    for (const [dRow, dCol] of directions) {
      if (this.canReachBoardEdge(row, col, dRow, dCol)) {
        return true;
      }
    }

    return false;
  }

  private canReachBoardEdge(row: number, col: number, dRow: number, dCol: number): boolean {
    let currentRow = row + dRow;
    let currentCol = col + dCol;

    // Check path until board edge
    while (this.isInBounds(currentRow, currentCol)) {
      if (this.getPieceAt([currentRow, currentCol])) {
        return false; // Path blocked
      }
      currentRow += dRow;
      currentCol += dCol;
    }

    return true; // Clear path to edge
  }

  makeMove(from: [number, number], to: [number, number] | 'off_board'): boolean {
    if (!this.isValidMove(from, to)) {
      return false;
    }

    const piece = this.getPieceAt(from)!;
    const move: KingsChessMove = {
      from,
      to,
      piece: { ...piece },
      timestamp: Date.now()
    };

    if (to === 'off_board') {
      // Handle off-board move
      this.handleOffBoardMove(from, piece, move);
    } else {
      // Handle standard move
      this.handleStandardMove(from, to, piece, move);
    }

    this.moveHistory.push(move);
    this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white';

    return true;
  }

  private handleOffBoardMove(from: [number, number], piece: ChessPiece, move: KingsChessMove): void {
    // Remove piece from board
    this.board.squares[from[0]][from[1]] = null;

    // Send piece to the party (their own king's side)
    if (piece.color === 'white') {
      this.partyState.whiteKingGuests.push(piece);
    } else {
      this.partyState.blackKingGuests.push(piece);
    }

    move.isSpecial = true;
  }

  private handleStandardMove(
    from: [number, number],
    to: [number, number],
    piece: ChessPiece,
    move: KingsChessMove
  ): void {
    const capturedPiece = this.getPieceAt(to);

    if (capturedPiece) {
      move.captured = { ...capturedPiece };

      // King's Cooking: captured pieces go to opponent's king for the party
      if (capturedPiece.color === 'white') {
        this.partyState.blackKingGuests.push(capturedPiece);
      } else {
        this.partyState.whiteKingGuests.push(capturedPiece);
      }
    }

    // Move piece
    this.board.squares[to[0]][to[1]] = piece;
    this.board.squares[from[0]][from[1]] = null;
    piece.position = to;
    piece.moveCount++;
  }

  // King's Cooking victory condition
  checkGameEnd(): { winner: 'white' | 'black' | null, reason?: string } {
    const whiteGuests = this.partyState.whiteKingGuests.length;
    const blackGuests = this.partyState.blackKingGuests.length;

    // Victory: king with most guests hosts the party
    if (whiteGuests > blackGuests && whiteGuests >= 3) {
      return {
        winner: 'white',
        reason: `White King hosts the party with ${whiteGuests} guests!`
      };
    }

    if (blackGuests > whiteGuests && blackGuests >= 3) {
      return {
        winner: 'black',
        reason: `Black King hosts the party with ${blackGuests} guests!`
      };
    }

    return { winner: null };
  }

  // Helper methods
  private isInBounds(row: number, col: number): boolean {
    return row >= 0 && row < this.board.height && col >= 0 && col < this.board.width;
  }

  private getPieceAt([row, col]: [number, number]): ChessPiece | null {
    if (!this.isInBounds(row, col)) return null;
    return this.board.squares[row][col];
  }

  // Standard chess move validation (simplified)
  private isValidStandardMove(
    from: [number, number],
    to: [number, number],
    piece: ChessPiece
  ): boolean {
    if (!this.isInBounds(to[0], to[1])) return false;

    const targetPiece = this.getPieceAt(to);
    if (targetPiece && targetPiece.color === piece.color) {
      return false; // Can't capture own piece
    }

    // Piece-specific movement rules
    switch (piece.type) {
      case 'pawn':
        return this.isValidPawnMove(from, to, piece);
      case 'rook':
        return this.isValidRookMove(from, to);
      case 'knight':
        return this.isValidKnightMove(from, to);
      case 'bishop':
        return this.isValidBishopMove(from, to);
      case 'queen':
        return this.isValidQueenMove(from, to);
      default:
        return false;
    }
  }

  private isValidPawnMove([fromRow, fromCol]: [number, number], [toRow, toCol]: [number, number], piece: ChessPiece): boolean {
    const direction = piece.color === 'white' ? -1 : 1;
    const startRow = piece.color === 'white' ? this.board.height - 2 : 1;

    // Forward move
    if (fromCol === toCol) {
      if (toRow === fromRow + direction && !this.getPieceAt([toRow, toCol])) {
        return true; // One square forward
      }
      if (fromRow === startRow && toRow === fromRow + 2 * direction && !this.getPieceAt([toRow, toCol])) {
        return true; // Two squares forward from start
      }
    }

    // Diagonal capture
    if (Math.abs(fromCol - toCol) === 1 && toRow === fromRow + direction) {
      return !!this.getPieceAt([toRow, toCol]); // Must capture
    }

    return false;
  }

  private isValidRookMove([fromRow, fromCol]: [number, number], [toRow, toCol]: [number, number]): boolean {
    if (fromRow !== toRow && fromCol !== toCol) return false;
    return this.isPathClear([fromRow, fromCol], [toRow, toCol]);
  }

  private isValidBishopMove([fromRow, fromCol]: [number, number], [toRow, toCol]: [number, number]): boolean {
    if (Math.abs(fromRow - toRow) !== Math.abs(fromCol - toCol)) return false;
    return this.isPathClear([fromRow, fromCol], [toRow, toCol]);
  }

  private isValidKnightMove([fromRow, fromCol]: [number, number], [toRow, toCol]: [number, number]): boolean {
    const rowDiff = Math.abs(fromRow - toRow);
    const colDiff = Math.abs(fromCol - toCol);
    return (rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2);
  }

  private isValidQueenMove(from: [number, number], to: [number, number]): boolean {
    return this.isValidRookMove(from, to) || this.isValidBishopMove(from, to);
  }

  private isPathClear([fromRow, fromCol]: [number, number], [toRow, toCol]: [number, number]): boolean {
    const rowStep = toRow > fromRow ? 1 : toRow < fromRow ? -1 : 0;
    const colStep = toCol > fromCol ? 1 : toCol < fromCol ? -1 : 0;

    let currentRow = fromRow + rowStep;
    let currentCol = fromCol + colStep;

    while (currentRow !== toRow || currentCol !== toCol) {
      if (this.getPieceAt([currentRow, currentCol])) {
        return false; // Path blocked
      }
      currentRow += rowStep;
      currentCol += colStep;
    }

    return true;
  }

  // Public getters
  getBoard(): KingsChessBoard { return { ...this.board }; }
  getCurrentPlayer(): 'white' | 'black' { return this.currentPlayer; }
  getMoveHistory(): KingsChessMove[] { return [...this.moveHistory]; }
  getPartyState(): PartyState { return { ...this.partyState }; }

  // Serialization
  toFEN(): string {
    // Custom FEN for variable board sizes
    const rows = this.board.squares.map(row => {
      let fen = '';
      let emptyCount = 0;

      for (const piece of row) {
        if (!piece) {
          emptyCount++;
        } else {
          if (emptyCount > 0) {
            fen += emptyCount;
            emptyCount = 0;
          }
          fen += this.pieceToFEN(piece);
        }
      }

      if (emptyCount > 0) fen += emptyCount;
      return fen;
    }).join('/');

    const turn = this.currentPlayer === 'white' ? 'w' : 'b';
    const party = `${this.partyState.whiteKingGuests.length}-${this.partyState.blackKingGuests.length}`;

    return `${rows} ${turn} - - 0 ${this.moveHistory.length} ${this.board.width}x${this.board.height} ${party}`;
  }

  private pieceToFEN(piece: ChessPiece): string {
    const symbols = {
      pawn: 'p', rook: 'r', knight: 'n',
      bishop: 'b', queen: 'q', king: 'k'
    };
    const symbol = symbols[piece.type];
    return piece.color === 'white' ? symbol.toUpperCase() : symbol;
  }
}

export { KingsChessEngine, type ChessPiece, type KingsChessMove, type KingsChessBoard };
```

## Setup Mode Implementations

### Random Setup Generator
```typescript
// lib/chess/setupModes.ts
interface PieceDistribution {
  queen: number;
  rook: number;
  bishop: number;
  knight: number;
  pawn: number;
}

class RandomSetupGenerator {
  private maxPieces: PieceDistribution = {
    queen: 1,
    rook: 2,
    bishop: 2,
    knight: 2,
    pawn: Infinity
  };

  generateRandomSetup(boardWidth: number, includePawns: boolean = true): ChessPiece[] {
    const pieces: ChessPiece[] = [];
    const available = { ...this.maxPieces };

    // Always include one of each major piece if possible
    const majorPieces = ['queen', 'rook', 'bishop', 'knight'] as const;

    for (const pieceType of majorPieces) {
      if (pieces.length < boardWidth && available[pieceType] > 0) {
        pieces.push({
          type: pieceType,
          color: 'white', // Color set later
          moveCount: 0
        });
        available[pieceType]--;
      }
    }

    // Fill remaining slots
    while (pieces.length < boardWidth) {
      const remainingPieces = this.getAvailablePieces(available, includePawns);

      if (remainingPieces.length === 0) break;

      const randomPiece = remainingPieces[Math.floor(Math.random() * remainingPieces.length)];
      pieces.push({
        type: randomPiece,
        color: 'white',
        moveCount: 0
      });

      if (randomPiece !== 'pawn') {
        available[randomPiece]--;
      }
    }

    // Shuffle the pieces
    for (let i = pieces.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
    }

    return pieces;
  }

  private getAvailablePieces(available: PieceDistribution, includePawns: boolean): ChessPiece['type'][] {
    const pieces: ChessPiece['type'][] = [];

    for (const [piece, count] of Object.entries(available)) {
      if (piece === 'pawn' && !includePawns) continue;
      if (count > 0) {
        pieces.push(piece as ChessPiece['type']);
      }
    }

    return pieces;
  }
}

// Mirrored setup mode
class MirroredSetupManager {
  private selectedPieces: { piece: ChessPiece['type'], position: number }[] = [];
  private currentPlayer: 'player1' | 'player2' = 'player2'; // Player 2 starts

  selectPiece(piece: ChessPiece['type'], position: number): boolean {
    if (!this.isValidSelection(piece, position)) {
      return false;
    }

    this.selectedPieces.push({ piece, position });
    this.currentPlayer = this.currentPlayer === 'player1' ? 'player2' : 'player1';

    return true;
  }

  private isValidSelection(piece: ChessPiece['type'], position: number): boolean {
    // Check if piece is still available
    const usedPieces = this.selectedPieces.reduce((acc, { piece: p }) => {
      acc[p] = (acc[p] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const maxCounts = { queen: 1, rook: 2, bishop: 2, knight: 2, pawn: Infinity };

    return (usedPieces[piece] || 0) < maxCounts[piece];
  }

  getCurrentPlayer(): 'player1' | 'player2' {
    return this.currentPlayer;
  }

  isSetupComplete(boardWidth: number): boolean {
    return this.selectedPieces.length === boardWidth;
  }

  getSetup(): { piece: ChessPiece['type'], position: number }[] {
    return [...this.selectedPieces];
  }
}

export { RandomSetupGenerator, MirroredSetupManager };
```

## Move Validation and Game Logic

### Advanced Move Validation
```typescript
// lib/chess/moveValidation.ts
import { KingsChessEngine, ChessPiece, KingsChessBoard } from './KingsChessEngine';

class MoveValidator {
  constructor(private engine: KingsChessEngine) {}

  validateMove(from: [number, number], to: [number, number] | 'off_board'): {
    valid: boolean;
    reason?: string;
    warnings?: string[];
  } {
    const piece = this.engine.getPieceAt(from);

    if (!piece) {
      return { valid: false, reason: 'No piece at source position' };
    }

    if (piece.color !== this.engine.getCurrentPlayer()) {
      return { valid: false, reason: 'Not your turn' };
    }

    if (to === 'off_board') {
      return this.validateOffBoardMove(from, piece);
    }

    return this.validateStandardMove(from, to, piece);
  }

  private validateOffBoardMove(from: [number, number], piece: ChessPiece): {
    valid: boolean;
    reason?: string;
    warnings?: string[];
  } {
    // Only rooks and queens can exit off-board
    if (piece.type !== 'rook' && piece.type !== 'queen') {
      return {
        valid: false,
        reason: `${piece.type} cannot move off the board. Only rooks and queens can join the party directly!`
      };
    }

    // Check if there's a clear path to any board edge
    const pathExists = this.hasPathToBoardEdge(from, piece);

    if (!pathExists) {
      return {
        valid: false,
        reason: 'No clear path to board edge. The path must be unobstructed!'
      };
    }

    return {
      valid: true,
      warnings: [`${piece.type} will join the ${piece.color} king's party!`]
    };
  }

  private validateStandardMove(
    from: [number, number],
    to: [number, number],
    piece: ChessPiece
  ): { valid: boolean; reason?: string; warnings?: string[] } {
    const board = this.engine.getBoard();

    // Check bounds
    if (!this.isInBounds(to, board)) {
      return { valid: false, reason: 'Move is outside the board' };
    }

    // Check if target square has own piece
    const targetPiece = this.engine.getPieceAt(to);
    if (targetPiece && targetPiece.color === piece.color) {
      return { valid: false, reason: 'Cannot capture your own piece' };
    }

    // Piece-specific validation
    const pieceValidation = this.validatePieceMovement(from, to, piece, board);
    if (!pieceValidation.valid) {
      return pieceValidation;
    }

    const warnings: string[] = [];

    // Add capture warning
    if (targetPiece) {
      warnings.push(
        `Captured ${targetPiece.type} will join the ${piece.color} king's party!`
      );
    }

    return { valid: true, warnings };
  }

  private hasPathToBoardEdge(from: [number, number], piece: ChessPiece): boolean {
    const [row, col] = from;
    const board = this.engine.getBoard();

    // Get possible directions based on piece type
    const directions = piece.type === 'queen'
      ? [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]]
      : [[0, 1], [0, -1], [1, 0], [-1, 0]]; // Rook

    for (const [dRow, dCol] of directions) {
      let currentRow = row + dRow;
      let currentCol = col + dCol;
      let pathClear = true;

      // Check path until board edge
      while (this.isInBounds([currentRow, currentCol], board)) {
        if (this.engine.getPieceAt([currentRow, currentCol])) {
          pathClear = false;
          break;
        }
        currentRow += dRow;
        currentCol += dCol;
      }

      if (pathClear) {
        return true; // Found clear path to edge
      }
    }

    return false;
  }

  private validatePieceMovement(
    from: [number, number],
    to: [number, number],
    piece: ChessPiece,
    board: KingsChessBoard
  ): { valid: boolean; reason?: string } {
    switch (piece.type) {
      case 'pawn':
        return this.validatePawnMove(from, to, piece, board);
      case 'rook':
        return this.validateRookMove(from, to, board);
      case 'knight':
        return this.validateKnightMove(from, to);
      case 'bishop':
        return this.validateBishopMove(from, to, board);
      case 'queen':
        return this.validateQueenMove(from, to, board);
      default:
        return { valid: false, reason: 'Unknown piece type' };
    }
  }

  // Piece-specific validation methods...
  private validatePawnMove(
    [fromRow, fromCol]: [number, number],
    [toRow, toCol]: [number, number],
    piece: ChessPiece,
    board: KingsChessBoard
  ): { valid: boolean; reason?: string } {
    const direction = piece.color === 'white' ? -1 : 1;
    const startRow = piece.color === 'white' ? board.height - 2 : 1;

    // Forward moves
    if (fromCol === toCol) {
      if (toRow === fromRow + direction) {
        return this.engine.getPieceAt([toRow, toCol])
          ? { valid: false, reason: 'Pawn cannot capture forward' }
          : { valid: true };
      }

      if (fromRow === startRow && toRow === fromRow + 2 * direction) {
        return this.engine.getPieceAt([toRow, toCol])
          ? { valid: false, reason: 'Path blocked for two-square pawn move' }
          : { valid: true };
      }
    }

    // Diagonal captures
    if (Math.abs(fromCol - toCol) === 1 && toRow === fromRow + direction) {
      return this.engine.getPieceAt([toRow, toCol])
        ? { valid: true }
        : { valid: false, reason: 'Pawn can only move diagonally to capture' };
    }

    return { valid: false, reason: 'Invalid pawn move' };
  }

  // Additional validation methods for other pieces...
  // (Implementation similar to engine methods but with detailed error messages)

  private isInBounds([row, col]: [number, number], board: KingsChessBoard): boolean {
    return row >= 0 && row < board.height && col >= 0 && col < board.width;
  }
}

export { MoveValidator };
```

## Game State Serialization

### Save/Load Game State
```typescript
// lib/chess/gameSerializer.ts
interface SerializedGameState {
  board: KingsChessBoard;
  currentPlayer: 'white' | 'black';
  moveHistory: KingsChessMove[];
  partyState: PartyState;
  gamePhase: 'setup' | 'playing' | 'finished';
  timestamp: number;
  gameId: string;
}

class GameStateSerializer {
  serialize(engine: KingsChessEngine, gameId: string): string {
    const state: SerializedGameState = {
      board: engine.getBoard(),
      currentPlayer: engine.getCurrentPlayer(),
      moveHistory: engine.getMoveHistory(),
      partyState: engine.getPartyState(),
      gamePhase: 'playing', // Would be tracked separately
      timestamp: Date.now(),
      gameId
    };

    return JSON.stringify(state);
  }

  deserialize(data: string): SerializedGameState {
    return JSON.parse(data);
  }

  saveToLocalStorage(engine: KingsChessEngine, gameId: string): void {
    const serialized = this.serialize(engine, gameId);
    localStorage.setItem(`kings-chess-${gameId}`, serialized);
  }

  loadFromLocalStorage(gameId: string): SerializedGameState | null {
    const data = localStorage.getItem(`kings-chess-${gameId}`);
    return data ? this.deserialize(data) : null;
  }

  createEngineFromSerialized(state: SerializedGameState): KingsChessEngine {
    const engine = new KingsChessEngine(state.board.width, state.board.height);

    // Restore board state
    for (let row = 0; row < state.board.height; row++) {
      for (let col = 0; col < state.board.width; col++) {
        const piece = state.board.squares[row][col];
        if (piece) {
          engine.placePiece(piece, [row, col]);
        }
      }
    }

    // Restore other state
    engine.setCurrentPlayer(state.currentPlayer);
    engine.setMoveHistory(state.moveHistory);
    engine.setPartyState(state.partyState);

    return engine;
  }
}

export { GameStateSerializer, type SerializedGameState };
```

## Testing Patterns

### Unit Tests for Chess Logic
```typescript
// src/test/chess/KingsChessEngine.test.ts
import { describe, test, expect, beforeEach } from 'vitest';
import { KingsChessEngine } from '@/lib/chess/KingsChessEngine';

describe('KingsChessEngine', () => {
  let engine: KingsChessEngine;

  beforeEach(() => {
    engine = new KingsChessEngine(8, 6);
    // Set up test position
    engine.placePiece({ type: 'rook', color: 'white', moveCount: 0 }, [5, 0]);
    engine.placePiece({ type: 'queen', color: 'black', moveCount: 0 }, [2, 3]);
  });

  describe('off-board moves', () => {
    test('rook can move off-board with clear path', () => {
      // Clear path to left edge
      const result = engine.makeMove([5, 0], 'off_board');
      expect(result).toBe(true);

      const partyState = engine.getPartyState();
      expect(partyState.whiteKingGuests).toHaveLength(1);
      expect(partyState.whiteKingGuests[0].type).toBe('rook');
    });

    test('rook cannot move off-board with blocked path', () => {
      // Block path with another piece
      engine.placePiece({ type: 'pawn', color: 'black', moveCount: 0 }, [5, 1]);

      const result = engine.makeMove([5, 0], 'off_board');
      expect(result).toBe(false);
    });

    test('pawn cannot move off-board', () => {
      engine.placePiece({ type: 'pawn', color: 'white', moveCount: 0 }, [5, 7]);

      const result = engine.makeMove([5, 7], 'off_board');
      expect(result).toBe(false);
    });
  });

  describe('capture mechanics', () => {
    test('captured piece joins opponent king party', () => {
      engine.placePiece({ type: 'pawn', color: 'black', moveCount: 0 }, [4, 1]);

      const result = engine.makeMove([5, 0], [4, 0]);
      expect(result).toBe(true);

      // Now capture the pawn
      const captureResult = engine.makeMove([4, 0], [4, 1]);
      expect(captureResult).toBe(true);

      const partyState = engine.getPartyState();
      expect(partyState.whiteKingGuests).toHaveLength(1);
      expect(partyState.whiteKingGuests[0].type).toBe('pawn');
      expect(partyState.whiteKingGuests[0].color).toBe('black');
    });
  });

  describe('victory conditions', () => {
    test('white wins with more party guests', () => {
      const partyState = engine.getPartyState();

      // Add guests to white king's party
      partyState.whiteKingGuests.push(
        { type: 'pawn', color: 'black', moveCount: 0 },
        { type: 'knight', color: 'black', moveCount: 0 },
        { type: 'bishop', color: 'black', moveCount: 0 },
        { type: 'rook', color: 'black', moveCount: 0 }
      );

      const result = engine.checkGameEnd();
      expect(result.winner).toBe('white');
      expect(result.reason).toContain('White King hosts the party with 4 guests');
    });
  });

  describe('custom board sizes', () => {
    test('works with 10x8 board', () => {
      const largeEngine = new KingsChessEngine(10, 8);
      largeEngine.placePiece({ type: 'queen', color: 'white', moveCount: 0 }, [7, 5]);

      // Test move within larger board
      const result = largeEngine.makeMove([7, 5], [7, 9]);
      expect(result).toBe(true);
    });

    test('respects board boundaries', () => {
      const smallEngine = new KingsChessEngine(4, 4);
      smallEngine.placePiece({ type: 'rook', color: 'white', moveCount: 0 }, [0, 0]);

      // Try to move outside 4x4 board
      const result = smallEngine.isValidMove([0, 0], [0, 5]);
      expect(result).toBe(false);
    });
  });
});
```

### Performance Testing
```typescript
// src/test/chess/performance.test.ts
import { describe, test, expect } from 'vitest';
import { KingsChessEngine } from '@/lib/chess/KingsChessEngine';

describe('Chess Engine Performance', () => {
  test('move validation performance', () => {
    const engine = new KingsChessEngine(12, 12); // Large board

    // Fill board with pieces
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 12; col++) {
        const piece = { type: 'pawn', color: row < 2 ? 'white' : 'black', moveCount: 0 };
        engine.placePiece(piece, [row, col]);
      }
    }

    const startTime = performance.now();

    // Test 1000 move validations
    for (let i = 0; i < 1000; i++) {
      engine.isValidMove([1, i % 12], [2, i % 12]);
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    expect(duration).toBeLessThan(100); // Should complete in under 100ms
  });

  test('large game state serialization', () => {
    const engine = new KingsChessEngine(12, 12);

    // Create complex game state
    for (let i = 0; i < 50; i++) {
      engine.makeMove([1, i % 12], [2, i % 12]);
    }

    const startTime = performance.now();
    const fen = engine.toFEN();
    const endTime = performance.now();

    expect(endTime - startTime).toBeLessThan(10); // Fast serialization
    expect(fen).toBeTruthy();
  });
});
```

This comprehensive chess engine pattern provides a robust foundation for implementing the King's Cooking chess variant with TypeScript, including custom board sizes, special off-board moves, capture mechanics, and comprehensive testing strategies.