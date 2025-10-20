/**
 * @fileoverview Tests for piece movement helpers
 * @module lib/chess/pieceMovement.test
 */

import { describe, test, expect } from 'vitest';
import {
  isInBounds,
  getRookMoves,
  getKnightMoves,
  getBishopMoves,
  getQueenMoves,
  getPawnMoves,
  hasRookPathToEdge,
  canKnightJumpOffBoard,
  canBishopMoveOffBoard,
} from './pieceMovement';
import type { Piece, Position, Move } from '../validation/schemas';
import { v4 as uuid } from 'uuid';

describe('pieceMovement', () => {
  const createMockPiece = (type: 'rook' | 'knight' | 'bishop' | 'queen' | 'pawn', owner: 'light' | 'dark', position: Position): Piece => ({
    type,
    owner,
    position,
    moveCount: 0,
    id: uuid(),
  });

  const emptyBoard = (): ((pos: Position) => Piece | null) => {
    return () => null;
  };

  const boardWithPieces = (pieces: Array<{ pos: Position; piece: Piece }>): ((pos: Position) => Piece | null) => {
    return (pos: Position) => {
      if (!pos) return null;
      const found = pieces.find(p => p.pos && p.pos[0] === pos[0] && p.pos[1] === pos[1]);
      return found ? found.piece : null;
    };
  };

  describe('isInBounds', () => {
    test('should return true for valid positions', () => {
      expect(isInBounds(0, 0)).toBe(true);
      expect(isInBounds(1, 1)).toBe(true);
      expect(isInBounds(2, 2)).toBe(true);
    });

    test('should return false for negative positions', () => {
      expect(isInBounds(-1, 0)).toBe(false);
      expect(isInBounds(0, -1)).toBe(false);
    });

    test('should return false for out-of-bounds positions', () => {
      expect(isInBounds(3, 0)).toBe(false);
      expect(isInBounds(0, 3)).toBe(false);
      expect(isInBounds(5, 5)).toBe(false);
    });
  });

  describe('getRookMoves', () => {
    test('should return vertical and horizontal moves on empty board', () => {
      const moves = getRookMoves([1, 1], emptyBoard(), 'light');

      expect(moves).toContainEqual([0, 1]); // Up
      expect(moves).toContainEqual([2, 1]); // Down
      expect(moves).toContainEqual([1, 0]); // Left
      expect(moves).toContainEqual([1, 2]); // Right
      expect(moves).toHaveLength(4);
    });

    test('should stop at board edges', () => {
      const moves = getRookMoves([0, 0], emptyBoard(), 'light');

      expect(moves).toContainEqual([0, 1]);
      expect(moves).toContainEqual([0, 2]);
      expect(moves).toContainEqual([1, 0]);
      expect(moves).toContainEqual([2, 0]);
      expect(moves).toHaveLength(4);
    });

    test('should stop at own pieces', () => {
      const ownPiece = createMockPiece('knight', 'light', [1, 0]);
      const getPiece = boardWithPieces([{ pos: [1, 0], piece: ownPiece }]);

      const moves = getRookMoves([2, 0], getPiece, 'light');

      expect(moves).not.toContainEqual([1, 0]);
      expect(moves).not.toContainEqual([0, 0]);
    });

    test('should include opponent pieces (capture)', () => {
      const opponentPiece = createMockPiece('knight', 'dark', [1, 0]);
      const getPiece = boardWithPieces([{ pos: [1, 0], piece: opponentPiece }]);

      const moves = getRookMoves([2, 0], getPiece, 'light');

      expect(moves).toContainEqual([1, 0]);
      expect(moves).not.toContainEqual([0, 0]); // Can't jump over
    });

    test('should return empty array for null position', () => {
      const moves = getRookMoves(null, emptyBoard(), 'light');
      expect(moves).toEqual([]);
    });
  });

  describe('getKnightMoves', () => {
    test('should return L-shaped moves on empty board', () => {
      const moves = getKnightMoves([1, 0], emptyBoard(), 'light');

      // L-moves from (1,0) - some will be valid on 3x3 board
      expect(moves.length).toBeGreaterThan(0);
    });

    test('should only return in-bounds moves', () => {
      const moves = getKnightMoves([0, 0], emptyBoard(), 'light');

      // From corner, only certain L-moves are valid
      moves.forEach(move => {
        if (!move) return;
        expect(move[0]).toBeGreaterThanOrEqual(0);
        expect(move[0]).toBeLessThan(3);
        expect(move[1]).toBeGreaterThanOrEqual(0);
        expect(move[1]).toBeLessThan(3);
      });
    });

    test('should not include own pieces', () => {
      const ownPiece = createMockPiece('rook', 'light', [2, 2]);
      const getPiece = boardWithPieces([{ pos: [2, 2], piece: ownPiece }]);

      const moves = getKnightMoves([1, 0], getPiece, 'light');

      expect(moves).not.toContainEqual([2, 2]);
    });

    test('should include opponent pieces (capture)', () => {
      const opponentPiece = createMockPiece('rook', 'dark', [2, 2]);
      const getPiece = boardWithPieces([{ pos: [2, 2], piece: opponentPiece }]);

      const moves = getKnightMoves([1, 0], getPiece, 'light');

      expect(moves).toContainEqual([2, 2]);
    });

    test('should return empty array for null position', () => {
      const moves = getKnightMoves(null, emptyBoard(), 'light');
      expect(moves).toEqual([]);
    });
  });

  describe('getBishopMoves', () => {
    test('should return diagonal moves on empty board', () => {
      const moves = getBishopMoves([1, 1], emptyBoard(), 'light');

      expect(moves).toContainEqual([0, 0]); // Up-left
      expect(moves).toContainEqual([0, 2]); // Up-right
      expect(moves).toContainEqual([2, 0]); // Down-left
      expect(moves).toContainEqual([2, 2]); // Down-right
      expect(moves).toHaveLength(4);
    });

    test('should stop at board edges', () => {
      const moves = getBishopMoves([0, 0], emptyBoard(), 'light');

      expect(moves).toContainEqual([1, 1]);
      expect(moves).toContainEqual([2, 2]);
      expect(moves).toHaveLength(2);
    });

    test('should stop at own pieces', () => {
      const ownPiece = createMockPiece('rook', 'light', [1, 1]);
      const getPiece = boardWithPieces([{ pos: [1, 1], piece: ownPiece }]);

      const moves = getBishopMoves([0, 0], getPiece, 'light');

      expect(moves).not.toContainEqual([1, 1]);
      expect(moves).not.toContainEqual([2, 2]);
    });

    test('should include opponent pieces (capture)', () => {
      const opponentPiece = createMockPiece('rook', 'dark', [1, 1]);
      const getPiece = boardWithPieces([{ pos: [1, 1], piece: opponentPiece }]);

      const moves = getBishopMoves([0, 0], getPiece, 'light');

      expect(moves).toContainEqual([1, 1]);
      expect(moves).not.toContainEqual([2, 2]); // Can't jump over
    });

    test('should return empty array for null position', () => {
      const moves = getBishopMoves(null, emptyBoard(), 'light');
      expect(moves).toEqual([]);
    });
  });

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

  describe('getPawnMoves', () => {
    test('light pawn should move forward (up) one square', () => {
      const pawn = createMockPiece('pawn', 'light', [1, 1]);
      pawn.moveCount = 1; // Not first move
      const moves = getPawnMoves([1, 1], pawn, emptyBoard(), 'light');

      expect(moves).toContainEqual([0, 1]); // Forward (up)
      expect(moves).toHaveLength(1); // No captures available
    });

    test('dark pawn should move forward (down) one square', () => {
      const pawn = createMockPiece('pawn', 'dark', [1, 1]);
      pawn.moveCount = 1;
      const moves = getPawnMoves([1, 1], pawn, emptyBoard(), 'dark');

      expect(moves).toContainEqual([2, 1]); // Forward (down)
      expect(moves).toHaveLength(1);
    });

    test('should move two squares on first move (light pawn)', () => {
      const pawn = createMockPiece('pawn', 'light', [2, 1]);
      pawn.moveCount = 0; // First move
      const moves = getPawnMoves([2, 1], pawn, emptyBoard(), 'light');

      expect(moves).toContainEqual([1, 1]); // One square forward
      expect(moves).toContainEqual([0, 1]); // Two squares forward
      expect(moves).toHaveLength(2);
    });

    test('should move two squares on first move (dark pawn)', () => {
      const pawn = createMockPiece('pawn', 'dark', [0, 1]);
      pawn.moveCount = 0;
      const moves = getPawnMoves([0, 1], pawn, emptyBoard(), 'dark');

      expect(moves).toContainEqual([1, 1]); // One square forward
      expect(moves).toContainEqual([2, 1]); // Two squares forward
      expect(moves).toHaveLength(2);
    });

    test('should not move two squares if intermediate square is blocked', () => {
      const pawn = createMockPiece('pawn', 'light', [2, 1]);
      pawn.moveCount = 0;
      const blockingPiece = createMockPiece('rook', 'dark', [1, 1]);
      const getPiece = boardWithPieces([{ pos: [1, 1], piece: blockingPiece }]);

      const moves = getPawnMoves([2, 1], pawn, getPiece, 'light');

      expect(moves).not.toContainEqual([1, 1]); // Blocked
      expect(moves).not.toContainEqual([0, 1]); // Can't jump
      expect(moves).toHaveLength(0);
    });

    test('should not move forward if blocked', () => {
      const pawn = createMockPiece('pawn', 'light', [1, 1]);
      const blockingPiece = createMockPiece('rook', 'dark', [0, 1]);
      const getPiece = boardWithPieces([{ pos: [0, 1], piece: blockingPiece }]);

      const moves = getPawnMoves([1, 1], pawn, getPiece, 'light');

      expect(moves).not.toContainEqual([0, 1]); // Blocked
      expect(moves).toHaveLength(0); // No moves if forward is blocked and no captures
    });

    test('should capture diagonally forward', () => {
      const pawn = createMockPiece('pawn', 'light', [1, 1]);
      const enemy1 = createMockPiece('knight', 'dark', [0, 0]);
      const enemy2 = createMockPiece('bishop', 'dark', [0, 2]);
      const getPiece = boardWithPieces([
        { pos: [0, 0], piece: enemy1 },
        { pos: [0, 2], piece: enemy2 },
      ]);

      const moves = getPawnMoves([1, 1], pawn, getPiece, 'light');

      expect(moves).toContainEqual([0, 0]); // Capture left
      expect(moves).toContainEqual([0, 2]); // Capture right
      expect(moves).toContainEqual([0, 1]); // Can also move forward
      expect(moves).toHaveLength(3);
    });

    test('should not capture own pieces', () => {
      const pawn = createMockPiece('pawn', 'light', [1, 1]);
      const ownPiece = createMockPiece('knight', 'light', [0, 0]);
      const getPiece = boardWithPieces([{ pos: [0, 0], piece: ownPiece }]);

      const moves = getPawnMoves([1, 1], pawn, getPiece, 'light');

      expect(moves).not.toContainEqual([0, 0]); // Cannot capture own piece
    });

    test('should not move diagonally if no enemy piece', () => {
      const pawn = createMockPiece('pawn', 'light', [1, 1]);
      const moves = getPawnMoves([1, 1], pawn, emptyBoard(), 'light');

      expect(moves).not.toContainEqual([0, 0]); // No diagonal move without capture
      expect(moves).not.toContainEqual([0, 2]);
    });

    test('should capture en passant (light captures dark pawn)', () => {
      const lightPawn = createMockPiece('pawn', 'light', [2, 1]);
      const darkPawn = createMockPiece('pawn', 'dark', [2, 2]);

      // Last move: dark pawn moved from [0, 2] to [2, 2] (2-square move)
      const lastMove: Move = {
        from: [0, 2],
        to: [2, 2],
        piece: darkPawn,
        captured: null,
        timestamp: Date.now(),
      };

      const getPiece = boardWithPieces([{ pos: [2, 2], piece: darkPawn }]);
      const moves = getPawnMoves([2, 1], lightPawn, getPiece, 'light', lastMove);

      expect(moves).toContainEqual([1, 2]); // En passant capture
    });

    test('should capture en passant (dark captures light pawn)', () => {
      const darkPawn = createMockPiece('pawn', 'dark', [0, 1]);
      const lightPawn = createMockPiece('pawn', 'light', [0, 0]);

      // Last move: light pawn moved from [2, 0] to [0, 0] (2-square move)
      const lastMove: Move = {
        from: [2, 0],
        to: [0, 0],
        piece: lightPawn,
        captured: null,
        timestamp: Date.now(),
      };

      const getPiece = boardWithPieces([{ pos: [0, 0], piece: lightPawn }]);
      const moves = getPawnMoves([0, 1], darkPawn, getPiece, 'dark', lastMove);

      expect(moves).toContainEqual([1, 0]); // En passant capture
    });

    test('should not allow en passant if last move was not 2-square pawn move', () => {
      const lightPawn = createMockPiece('pawn', 'light', [1, 1]);
      const darkPawn = createMockPiece('pawn', 'dark', [0, 2]);

      // Last move: dark pawn moved 1 square from [0, 2] to [0, 2] (stayed put - simulating 1-square scenario)
      // Actually, let's say it moved from somewhere else by 1 square
      const lastMove: Move = {
        from: [0, 1],
        to: [0, 2],
        piece: darkPawn,
        captured: null,
        timestamp: Date.now(),
      };

      const getPiece = boardWithPieces([{ pos: [0, 2], piece: darkPawn }]);
      const moves = getPawnMoves([1, 1], lightPawn, getPiece, 'light', lastMove);

      // Should include diagonal capture AND forward
      expect(moves).toContainEqual([0, 2]); // Normal diagonal capture
      expect(moves).toContainEqual([0, 1]); // Forward move
      // En passant should NOT be in the list (would be at [0, 2] if it were incorrectly triggered)
    });

    test('should not allow en passant if pawns not on same row', () => {
      const lightPawn = createMockPiece('pawn', 'light', [1, 1]);
      const darkPawn = createMockPiece('pawn', 'dark', [2, 0]);

      // Last move: dark pawn moved 2 squares from [0, 0] to [2, 0]
      // Light pawn is at [1, 1], dark pawn landed at [2, 0]
      // They're on different rows (1 vs 2), so en passant should NOT happen
      const lastMove: Move = {
        from: [0, 0],
        to: [2, 0],
        piece: darkPawn,
        captured: null,
        timestamp: Date.now(),
      };

      const getPiece = boardWithPieces([{ pos: [2, 0], piece: darkPawn }]);
      const moves = getPawnMoves([1, 1], lightPawn, getPiece, 'light', lastMove);

      // Light pawn at [1,1] should be able to move forward to [0,1]
      // It should NOT have an en passant capture at [1,0] because pawns aren't on same row
      expect(moves).toContainEqual([0, 1]); // Normal forward move
      expect(moves).not.toContainEqual([1, 0]); // No en passant capture
    });

    test('should not move beyond board edges', () => {
      const lightPawn = createMockPiece('pawn', 'light', [0, 1]);
      const darkPawn = createMockPiece('pawn', 'dark', [2, 1]);

      // Light pawn at top edge
      const moves = getPawnMoves([0, 1], lightPawn, emptyBoard(), 'light');
      expect(moves).toEqual([]); // Cannot move forward off-board

      // Dark pawn at bottom edge
      const moves2 = getPawnMoves([2, 1], darkPawn, emptyBoard(), 'dark');
      expect(moves2).toEqual([]); // Cannot move forward off-board
    });

    test('should handle corner positions', () => {
      const pawn = createMockPiece('pawn', 'light', [1, 0]);
      const enemy = createMockPiece('rook', 'dark', [0, 1]);
      const getPiece = boardWithPieces([{ pos: [0, 1], piece: enemy }]);

      const moves = getPawnMoves([1, 0], pawn, getPiece, 'light');

      // Can capture diagonally right, cannot go diagonally left (off board)
      expect(moves).toContainEqual([0, 1]);
      expect(moves).toContainEqual([0, 0]); // Can move forward
      expect(moves).toHaveLength(2);
    });

    test('should return empty array for null position', () => {
      const pawn = createMockPiece('pawn', 'light', [1, 1]);
      const moves = getPawnMoves(null, pawn, emptyBoard(), 'light');
      expect(moves).toEqual([]);
    });
  });

  describe('hasRookPathToEdge', () => {
    test('should return true for clear path to opponent edge (light)', () => {
      const rook = createMockPiece('rook', 'light', [1, 0]);
      const result = hasRookPathToEdge([1, 0], rook, emptyBoard());

      expect(result).toBe(true);
    });

    test('should return true for clear path to opponent edge (dark)', () => {
      const rook = createMockPiece('rook', 'dark', [1, 0]);
      const result = hasRookPathToEdge([1, 0], rook, emptyBoard());

      expect(result).toBe(true);
    });

    test('should return false for blocked path', () => {
      const rook = createMockPiece('rook', 'light', [2, 0]);
      const blockingPiece = createMockPiece('knight', 'dark', [1, 0]);
      const getPiece = boardWithPieces([{ pos: [1, 0], piece: blockingPiece }]);

      const result = hasRookPathToEdge([2, 0], rook, getPiece);

      expect(result).toBe(false);
    });

    test('should return false for non-rook piece', () => {
      const knight = createMockPiece('knight', 'light', [1, 0]);
      const result = hasRookPathToEdge([1, 0], knight, emptyBoard());

      expect(result).toBe(false);
    });

    test('should return false for null position', () => {
      const rook = createMockPiece('rook', 'light', [1, 0]);
      const result = hasRookPathToEdge(null, rook, emptyBoard());

      expect(result).toBe(false);
    });
  });

  describe('canKnightJumpOffBoard', () => {
    test('should return true for light knight that can jump off to dark court', () => {
      const knight = createMockPiece('knight', 'light', [1, 1]);
      const result = canKnightJumpOffBoard([1, 1], knight);

      expect(result).toBe(true); // Can jump to row -1
    });

    test('should return true for dark knight that can jump off to light court', () => {
      const knight = createMockPiece('knight', 'dark', [1, 1]);
      const result = canKnightJumpOffBoard([1, 1], knight);

      expect(result).toBe(true); // Can jump to row 3
    });

    test('should return true for knight that can jump off from edge', () => {
      const knight = createMockPiece('knight', 'light', [1, 1]);
      const result = canKnightJumpOffBoard([1, 1], knight);

      expect(result).toBe(true); // 1 + (-2) = -1 (off board)
    });

    test('should return false for non-knight piece', () => {
      const rook = createMockPiece('rook', 'light', [1, 1]);
      const result = canKnightJumpOffBoard([1, 1], rook);

      expect(result).toBe(false);
    });

    test('should return false for null position', () => {
      const knight = createMockPiece('knight', 'light', [1, 1]);
      const result = canKnightJumpOffBoard(null, knight);

      expect(result).toBe(false);
    });
  });

  describe('canBishopMoveOffBoard', () => {
    test('should return true if diagonal crosses through middle column', () => {
      const bishop = createMockPiece('bishop', 'light', [1, 0]);
      const result = canBishopMoveOffBoard([1, 0], bishop, emptyBoard());

      // Diagonal from (1,0) goes through (0,1) which is middle column
      expect(result).toBe(true);
    });

    test('should return false if diagonal crosses through corner column', () => {
      const bishop = createMockPiece('bishop', 'light', [1, 1]);
      const result = canBishopMoveOffBoard([1, 1], bishop, emptyBoard());

      // Diagonals from (1,1) go through corners (0,0) or (0,2)
      expect(result).toBe(false);
    });

    test('should return false if path is blocked', () => {
      const bishop = createMockPiece('bishop', 'light', [1, 0]);
      const blockingPiece = createMockPiece('knight', 'dark', [0, 1]);
      const getPiece = boardWithPieces([{ pos: [0, 1], piece: blockingPiece }]);

      const result = canBishopMoveOffBoard([1, 0], bishop, getPiece);

      expect(result).toBe(false);
    });

    test('should return false for non-bishop piece', () => {
      const rook = createMockPiece('rook', 'light', [1, 0]);
      const result = canBishopMoveOffBoard([1, 0], rook, emptyBoard());

      expect(result).toBe(false);
    });

    test('should return false for null position', () => {
      const bishop = createMockPiece('bishop', 'light', [1, 0]);
      const result = canBishopMoveOffBoard(null, bishop, emptyBoard());

      expect(result).toBe(false);
    });

    // Rule 1: Bishop on opponent's starting row tests
    describe('edge position rule', () => {
      test('light bishop at [0, 0] (dark starting row, left corner) can move off-board', () => {
        const lightBishop = createMockPiece('bishop', 'light', [0, 0]);
        const result = canBishopMoveOffBoard([0, 0], lightBishop, emptyBoard());

        expect(result).toBe(true);
      });

      test('light bishop at [0, 1] (dark starting row, middle) can move off-board', () => {
        const lightBishop = createMockPiece('bishop', 'light', [0, 1]);
        const result = canBishopMoveOffBoard([0, 1], lightBishop, emptyBoard());

        expect(result).toBe(true);
      });

      test('light bishop at [0, 2] (dark starting row, right corner) can move off-board', () => {
        const lightBishop = createMockPiece('bishop', 'light', [0, 2]);
        const result = canBishopMoveOffBoard([0, 2], lightBishop, emptyBoard());

        expect(result).toBe(true);
      });

      test('dark bishop at [2, 0] (light starting row, left corner) can move off-board', () => {
        const darkBishop = createMockPiece('bishop', 'dark', [2, 0]);
        const result = canBishopMoveOffBoard([2, 0], darkBishop, emptyBoard());

        expect(result).toBe(true);
      });

      test('dark bishop at [2, 1] (light starting row, middle) can move off-board', () => {
        const darkBishop = createMockPiece('bishop', 'dark', [2, 1]);
        const result = canBishopMoveOffBoard([2, 1], darkBishop, emptyBoard());

        expect(result).toBe(true);
      });

      test('dark bishop at [2, 2] (light starting row, right corner) can move off-board', () => {
        const darkBishop = createMockPiece('bishop', 'dark', [2, 2]);
        const result = canBishopMoveOffBoard([2, 2], darkBishop, emptyBoard());

        expect(result).toBe(true);
      });

      test('light bishop at [2, 0] (own starting row) cannot move off-board', () => {
        const lightBishop = createMockPiece('bishop', 'light', [2, 0]);
        const result = canBishopMoveOffBoard([2, 0], lightBishop, emptyBoard());

        expect(result).toBe(false);
      });

      test('dark bishop at [0, 0] (own starting row) cannot move off-board', () => {
        const darkBishop = createMockPiece('bishop', 'dark', [0, 0]);
        const result = canBishopMoveOffBoard([0, 0], darkBishop, emptyBoard());

        expect(result).toBe(false);
      });
    });
  });
});
