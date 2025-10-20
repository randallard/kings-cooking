/**
 * @fileoverview Tests for piece selection logic functions
 * @module lib/pieceSelection/logic.test
 */

import { describe, it, expect } from 'vitest';
import { getAvailablePieces, generateRandomPieces, createBoardWithPieces } from './logic';

describe('Piece Selection Logic', () => {
  describe('getAvailablePieces', () => {
    it('should return all pieces when none selected', () => {
      const available = getAvailablePieces([]);
      expect(available).toContain('rook');
      expect(available).toContain('knight');
      expect(available).toContain('bishop');
      expect(available).toContain('queen');
      expect(available).toContain('pawn');
      expect(available.length).toBe(5);
    });

    it('should remove rook after 2 selected', () => {
      const available = getAvailablePieces(['rook', 'rook']);
      expect(available).not.toContain('rook');
      expect(available).toContain('knight');
      expect(available).toContain('bishop');
    });

    it('should remove queen after 1 selected', () => {
      const available = getAvailablePieces(['queen']);
      expect(available).not.toContain('queen');
      expect(available.length).toBe(4);
    });

    it('should handle mixed selections', () => {
      const available = getAvailablePieces(['rook', 'knight', 'bishop']);
      expect(available).toContain('rook'); // only 1 rook used, 1 left
      expect(available).toContain('knight'); // only 1 knight used, 1 left
      expect(available).toContain('bishop'); // only 1 bishop used, 1 left
    });

    it('should allow multiple pawns', () => {
      const available = getAvailablePieces(['pawn', 'pawn', 'pawn']);
      expect(available).toContain('pawn'); // 8 max, only 3 used
    });
  });

  describe('generateRandomPieces', () => {
    it('should generate exactly 3 pieces', () => {
      const pieces = generateRandomPieces('test-seed');
      expect(pieces).toHaveLength(3);
    });

    it('should respect piece limits', () => {
      const pieces = generateRandomPieces('test-seed');
      const rookCount = pieces.filter((p) => p === 'rook').length;
      const queenCount = pieces.filter((p) => p === 'queen').length;
      expect(rookCount).toBeLessThanOrEqual(2);
      expect(queenCount).toBeLessThanOrEqual(1);
    });

    it('should be deterministic with same seed', () => {
      const pieces1 = generateRandomPieces('seed1');
      const pieces2 = generateRandomPieces('seed1');
      expect(pieces1).toEqual(pieces2);
    });

    it('should produce different results with different seeds', () => {
      const pieces1 = generateRandomPieces('seed1');
      const pieces2 = generateRandomPieces('seed2');
      // Very unlikely to be the same
      const isDifferent = pieces1.some((piece, idx) => piece !== pieces2[idx]);
      expect(isDifferent).toBe(true);
    });
  });

  describe('createBoardWithPieces', () => {
    it('should create 3x3 board', () => {
      const board = createBoardWithPieces(
        ['rook', 'knight', 'bishop'],
        ['rook', 'knight', 'bishop'],
        'light'
      );

      expect(board.length).toBe(3);
      expect(board[0]!.length).toBe(3);
      expect(board[1]!.length).toBe(3);
      expect(board[2]!.length).toBe(3);
    });

    it('should place player1 pieces as light on row 2 (bottom)', () => {
      const board = createBoardWithPieces(
        ['rook', 'knight', 'bishop'],
        ['queen', 'pawn', 'pawn'],
        'light'
      );

      // Player1 chose light = row 2 (bottom)
      expect(board[2]![0]?.type).toBe('rook');
      expect(board[2]![1]?.type).toBe('knight');
      expect(board[2]![2]?.type).toBe('bishop');
      expect(board[2]![0]?.owner).toBe('light');
      expect(board[2]![1]?.owner).toBe('light');
      expect(board[2]![2]?.owner).toBe('light');

      // Player2 = dark = row 0 (top)
      expect(board[0]![0]?.type).toBe('queen');
      expect(board[0]![1]?.type).toBe('pawn');
      expect(board[0]![2]?.type).toBe('pawn');
      expect(board[0]![0]?.owner).toBe('dark');
    });

    it('should place player1 pieces as dark on row 0 (top)', () => {
      const board = createBoardWithPieces(
        ['rook', 'knight', 'bishop'],
        ['bishop', 'knight', 'rook'],
        'dark'
      );

      // Player1 chose dark = row 0 (top)
      expect(board[0]![0]?.type).toBe('rook');
      expect(board[0]![1]?.type).toBe('knight');
      expect(board[0]![2]?.type).toBe('bishop');
      expect(board[0]![0]?.owner).toBe('dark');

      // Player2 = light = row 2 (bottom)
      expect(board[2]![0]?.type).toBe('bishop');
      expect(board[2]![1]?.type).toBe('knight');
      expect(board[2]![2]?.type).toBe('rook');
      expect(board[2]![0]?.owner).toBe('light');
    });

    it('should have empty middle row', () => {
      const board = createBoardWithPieces(
        ['rook', 'knight', 'bishop'],
        ['rook', 'knight', 'bishop'],
        'light'
      );

      expect(board[1]![0]).toBeNull();
      expect(board[1]![1]).toBeNull();
      expect(board[1]![2]).toBeNull();
    });

    it('should set correct piece positions', () => {
      const board = createBoardWithPieces(
        ['rook', 'knight', 'bishop'],
        ['rook', 'knight', 'bishop'],
        'light'
      );

      expect(board[0]![0]?.position).toEqual([0, 0]);
      expect(board[0]![1]?.position).toEqual([0, 1]);
      expect(board[0]![2]?.position).toEqual([0, 2]);
      expect(board[2]![0]?.position).toEqual([2, 0]);
      expect(board[2]![1]?.position).toEqual([2, 1]);
      expect(board[2]![2]?.position).toEqual([2, 2]);
    });

    it('should set moveCount to 0 for all pieces', () => {
      const board = createBoardWithPieces(
        ['rook', 'knight', 'bishop'],
        ['rook', 'knight', 'bishop'],
        'light'
      );

      expect(board[0]![0]?.moveCount).toBe(0);
      expect(board[2]![0]?.moveCount).toBe(0);
    });
  });
});
