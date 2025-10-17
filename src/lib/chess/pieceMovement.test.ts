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
  hasRookPathToEdge,
  canKnightJumpOffBoard,
  canBishopMoveOffBoard,
} from './pieceMovement';
import type { Piece, Position } from '../validation/schemas';
import { v4 as uuid } from 'uuid';

describe('pieceMovement', () => {
  const createMockPiece = (type: 'rook' | 'knight' | 'bishop', owner: 'white' | 'black', position: Position): Piece => ({
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
      const moves = getRookMoves([1, 1], emptyBoard(), 'white');

      expect(moves).toContainEqual([0, 1]); // Up
      expect(moves).toContainEqual([2, 1]); // Down
      expect(moves).toContainEqual([1, 0]); // Left
      expect(moves).toContainEqual([1, 2]); // Right
      expect(moves).toHaveLength(4);
    });

    test('should stop at board edges', () => {
      const moves = getRookMoves([0, 0], emptyBoard(), 'white');

      expect(moves).toContainEqual([0, 1]);
      expect(moves).toContainEqual([0, 2]);
      expect(moves).toContainEqual([1, 0]);
      expect(moves).toContainEqual([2, 0]);
      expect(moves).toHaveLength(4);
    });

    test('should stop at own pieces', () => {
      const ownPiece = createMockPiece('knight', 'white', [1, 0]);
      const getPiece = boardWithPieces([{ pos: [1, 0], piece: ownPiece }]);

      const moves = getRookMoves([2, 0], getPiece, 'white');

      expect(moves).not.toContainEqual([1, 0]);
      expect(moves).not.toContainEqual([0, 0]);
    });

    test('should include opponent pieces (capture)', () => {
      const opponentPiece = createMockPiece('knight', 'black', [1, 0]);
      const getPiece = boardWithPieces([{ pos: [1, 0], piece: opponentPiece }]);

      const moves = getRookMoves([2, 0], getPiece, 'white');

      expect(moves).toContainEqual([1, 0]);
      expect(moves).not.toContainEqual([0, 0]); // Can't jump over
    });

    test('should return empty array for null position', () => {
      const moves = getRookMoves(null, emptyBoard(), 'white');
      expect(moves).toEqual([]);
    });
  });

  describe('getKnightMoves', () => {
    test('should return L-shaped moves on empty board', () => {
      const moves = getKnightMoves([1, 0], emptyBoard(), 'white');

      // L-moves from (1,0) - some will be valid on 3x3 board
      expect(moves.length).toBeGreaterThan(0);
    });

    test('should only return in-bounds moves', () => {
      const moves = getKnightMoves([0, 0], emptyBoard(), 'white');

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
      const ownPiece = createMockPiece('rook', 'white', [2, 2]);
      const getPiece = boardWithPieces([{ pos: [2, 2], piece: ownPiece }]);

      const moves = getKnightMoves([1, 0], getPiece, 'white');

      expect(moves).not.toContainEqual([2, 2]);
    });

    test('should include opponent pieces (capture)', () => {
      const opponentPiece = createMockPiece('rook', 'black', [2, 2]);
      const getPiece = boardWithPieces([{ pos: [2, 2], piece: opponentPiece }]);

      const moves = getKnightMoves([1, 0], getPiece, 'white');

      expect(moves).toContainEqual([2, 2]);
    });

    test('should return empty array for null position', () => {
      const moves = getKnightMoves(null, emptyBoard(), 'white');
      expect(moves).toEqual([]);
    });
  });

  describe('getBishopMoves', () => {
    test('should return diagonal moves on empty board', () => {
      const moves = getBishopMoves([1, 1], emptyBoard(), 'white');

      expect(moves).toContainEqual([0, 0]); // Up-left
      expect(moves).toContainEqual([0, 2]); // Up-right
      expect(moves).toContainEqual([2, 0]); // Down-left
      expect(moves).toContainEqual([2, 2]); // Down-right
      expect(moves).toHaveLength(4);
    });

    test('should stop at board edges', () => {
      const moves = getBishopMoves([0, 0], emptyBoard(), 'white');

      expect(moves).toContainEqual([1, 1]);
      expect(moves).toContainEqual([2, 2]);
      expect(moves).toHaveLength(2);
    });

    test('should stop at own pieces', () => {
      const ownPiece = createMockPiece('rook', 'white', [1, 1]);
      const getPiece = boardWithPieces([{ pos: [1, 1], piece: ownPiece }]);

      const moves = getBishopMoves([0, 0], getPiece, 'white');

      expect(moves).not.toContainEqual([1, 1]);
      expect(moves).not.toContainEqual([2, 2]);
    });

    test('should include opponent pieces (capture)', () => {
      const opponentPiece = createMockPiece('rook', 'black', [1, 1]);
      const getPiece = boardWithPieces([{ pos: [1, 1], piece: opponentPiece }]);

      const moves = getBishopMoves([0, 0], getPiece, 'white');

      expect(moves).toContainEqual([1, 1]);
      expect(moves).not.toContainEqual([2, 2]); // Can't jump over
    });

    test('should return empty array for null position', () => {
      const moves = getBishopMoves(null, emptyBoard(), 'white');
      expect(moves).toEqual([]);
    });
  });

  describe('hasRookPathToEdge', () => {
    test('should return true for clear path to opponent edge (white)', () => {
      const rook = createMockPiece('rook', 'white', [1, 0]);
      const result = hasRookPathToEdge([1, 0], rook, emptyBoard());

      expect(result).toBe(true);
    });

    test('should return true for clear path to opponent edge (black)', () => {
      const rook = createMockPiece('rook', 'black', [1, 0]);
      const result = hasRookPathToEdge([1, 0], rook, emptyBoard());

      expect(result).toBe(true);
    });

    test('should return false for blocked path', () => {
      const rook = createMockPiece('rook', 'white', [2, 0]);
      const blockingPiece = createMockPiece('knight', 'black', [1, 0]);
      const getPiece = boardWithPieces([{ pos: [1, 0], piece: blockingPiece }]);

      const result = hasRookPathToEdge([2, 0], rook, getPiece);

      expect(result).toBe(false);
    });

    test('should return false for non-rook piece', () => {
      const knight = createMockPiece('knight', 'white', [1, 0]);
      const result = hasRookPathToEdge([1, 0], knight, emptyBoard());

      expect(result).toBe(false);
    });

    test('should return false for null position', () => {
      const rook = createMockPiece('rook', 'white', [1, 0]);
      const result = hasRookPathToEdge(null, rook, emptyBoard());

      expect(result).toBe(false);
    });
  });

  describe('canKnightJumpOffBoard', () => {
    test('should return true for white knight that can jump off to black court', () => {
      const knight = createMockPiece('knight', 'white', [1, 1]);
      const result = canKnightJumpOffBoard([1, 1], knight);

      expect(result).toBe(true); // Can jump to row -1
    });

    test('should return true for black knight that can jump off to white court', () => {
      const knight = createMockPiece('knight', 'black', [1, 1]);
      const result = canKnightJumpOffBoard([1, 1], knight);

      expect(result).toBe(true); // Can jump to row 3
    });

    test('should return true for knight that can jump off from edge', () => {
      const knight = createMockPiece('knight', 'white', [1, 1]);
      const result = canKnightJumpOffBoard([1, 1], knight);

      expect(result).toBe(true); // 1 + (-2) = -1 (off board)
    });

    test('should return false for non-knight piece', () => {
      const rook = createMockPiece('rook', 'white', [1, 1]);
      const result = canKnightJumpOffBoard([1, 1], rook);

      expect(result).toBe(false);
    });

    test('should return false for null position', () => {
      const knight = createMockPiece('knight', 'white', [1, 1]);
      const result = canKnightJumpOffBoard(null, knight);

      expect(result).toBe(false);
    });
  });

  describe('canBishopMoveOffBoard', () => {
    test('should return true if diagonal crosses through middle column', () => {
      const bishop = createMockPiece('bishop', 'white', [1, 0]);
      const result = canBishopMoveOffBoard([1, 0], bishop, emptyBoard());

      // Diagonal from (1,0) goes through (0,1) which is middle column
      expect(result).toBe(true);
    });

    test('should return false if diagonal crosses through corner column', () => {
      const bishop = createMockPiece('bishop', 'white', [1, 1]);
      const result = canBishopMoveOffBoard([1, 1], bishop, emptyBoard());

      // Diagonals from (1,1) go through corners (0,0) or (0,2)
      expect(result).toBe(false);
    });

    test('should return false if path is blocked', () => {
      const bishop = createMockPiece('bishop', 'white', [1, 0]);
      const blockingPiece = createMockPiece('knight', 'black', [0, 1]);
      const getPiece = boardWithPieces([{ pos: [0, 1], piece: blockingPiece }]);

      const result = canBishopMoveOffBoard([1, 0], bishop, getPiece);

      expect(result).toBe(false);
    });

    test('should return false for non-bishop piece', () => {
      const rook = createMockPiece('rook', 'white', [1, 0]);
      const result = canBishopMoveOffBoard([1, 0], rook, emptyBoard());

      expect(result).toBe(false);
    });

    test('should return false for null position', () => {
      const bishop = createMockPiece('bishop', 'white', [1, 0]);
      const result = canBishopMoveOffBoard(null, bishop, emptyBoard());

      expect(result).toBe(false);
    });

    // Rule 1: Bishop on opponent's starting row tests
    describe('edge position rule', () => {
      test('white bishop at [0, 0] (black starting row, left corner) can move off-board', () => {
        const whiteBishop = createMockPiece('bishop', 'white', [0, 0]);
        const result = canBishopMoveOffBoard([0, 0], whiteBishop, emptyBoard());

        expect(result).toBe(true);
      });

      test('white bishop at [0, 1] (black starting row, middle) can move off-board', () => {
        const whiteBishop = createMockPiece('bishop', 'white', [0, 1]);
        const result = canBishopMoveOffBoard([0, 1], whiteBishop, emptyBoard());

        expect(result).toBe(true);
      });

      test('white bishop at [0, 2] (black starting row, right corner) can move off-board', () => {
        const whiteBishop = createMockPiece('bishop', 'white', [0, 2]);
        const result = canBishopMoveOffBoard([0, 2], whiteBishop, emptyBoard());

        expect(result).toBe(true);
      });

      test('black bishop at [2, 0] (white starting row, left corner) can move off-board', () => {
        const blackBishop = createMockPiece('bishop', 'black', [2, 0]);
        const result = canBishopMoveOffBoard([2, 0], blackBishop, emptyBoard());

        expect(result).toBe(true);
      });

      test('black bishop at [2, 1] (white starting row, middle) can move off-board', () => {
        const blackBishop = createMockPiece('bishop', 'black', [2, 1]);
        const result = canBishopMoveOffBoard([2, 1], blackBishop, emptyBoard());

        expect(result).toBe(true);
      });

      test('black bishop at [2, 2] (white starting row, right corner) can move off-board', () => {
        const blackBishop = createMockPiece('bishop', 'black', [2, 2]);
        const result = canBishopMoveOffBoard([2, 2], blackBishop, emptyBoard());

        expect(result).toBe(true);
      });

      test('white bishop at [2, 0] (own starting row) cannot move off-board', () => {
        const whiteBishop = createMockPiece('bishop', 'white', [2, 0]);
        const result = canBishopMoveOffBoard([2, 0], whiteBishop, emptyBoard());

        expect(result).toBe(false);
      });

      test('black bishop at [0, 0] (own starting row) cannot move off-board', () => {
        const blackBishop = createMockPiece('bishop', 'black', [0, 0]);
        const result = canBishopMoveOffBoard([0, 0], blackBishop, emptyBoard());

        expect(result).toBe(false);
      });
    });
  });
});
