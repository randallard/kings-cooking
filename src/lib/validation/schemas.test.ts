/**
 * @fileoverview Tests for Zod validation schemas
 * @module lib/validation/schemas.test
 *
 * Tests ensure all schemas properly validate expected data
 * and reject invalid data.
 */

import { describe, it, expect } from 'vitest';
import {
  PieceTypeSchema,
  PieceOwnerSchema,
  PieceSchema,
  PlayerInfoSchema,
  GameStateSchema,
  validateGameState,
  safeValidateGameState,
  type GameState,
  type PlayerId,
  type GameId,
} from './schemas';

describe('Zod Schemas', () => {
  describe('PieceTypeSchema', () => {
    it('should accept valid piece types', () => {
      expect(PieceTypeSchema.parse('rook')).toBe('rook');
      expect(PieceTypeSchema.parse('knight')).toBe('knight');
      expect(PieceTypeSchema.parse('bishop')).toBe('bishop');
      expect(PieceTypeSchema.parse('queen')).toBe('queen');
      expect(PieceTypeSchema.parse('pawn')).toBe('pawn');
    });

    it('should reject invalid piece types', () => {
      expect(() => PieceTypeSchema.parse('king')).toThrow();
      expect(() => PieceTypeSchema.parse('wizard')).toThrow();
      expect(() => PieceTypeSchema.parse('')).toThrow();
    });
  });

  describe('PieceOwnerSchema', () => {
    it('should accept light and dark', () => {
      expect(PieceOwnerSchema.parse('light')).toBe('light');
      expect(PieceOwnerSchema.parse('dark')).toBe('dark');
    });

    it('should reject other values', () => {
      expect(() => PieceOwnerSchema.parse('red')).toThrow();
      expect(() => PieceOwnerSchema.parse('')).toThrow();
    });
  });

  describe('PieceSchema', () => {
    it('should validate correct piece structure', () => {
      const piece = {
        type: 'rook',
        owner: 'light',
        position: [0, 0] as [number, number],
        moveCount: 0,
        id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = PieceSchema.safeParse(piece);
      expect(result.success).toBe(true);
    });

    it('should accept null position (off-board)', () => {
      const piece = {
        type: 'knight',
        owner: 'dark',
        position: null,
        moveCount: 5,
        id: '123e4567-e89b-12d3-a456-426614174001',
      };

      const result = PieceSchema.safeParse(piece);
      expect(result.success).toBe(true);
    });

    it('should reject invalid piece structure', () => {
      const badPiece = {
        type: 'rook',
        owner: 'light',
        // Missing required fields
      };

      const result = PieceSchema.safeParse(badPiece);
      expect(result.success).toBe(false);
    });

    it('should reject negative moveCount', () => {
      const piece = {
        type: 'bishop',
        owner: 'light',
        position: [1, 1] as [number, number],
        moveCount: -1, // Invalid
        id: '123e4567-e89b-12d3-a456-426614174002',
      };

      const result = PieceSchema.safeParse(piece);
      expect(result.success).toBe(false);
    });
  });

  describe('PlayerInfoSchema', () => {
    it('should validate correct player info', () => {
      const player = {
        id: '123e4567-e89b-12d3-a456-426614174003',
        name: 'Alice',
      };

      const result = PlayerInfoSchema.safeParse(player);
      expect(result.success).toBe(true);
    });

    it('should reject name too short', () => {
      const player = {
        id: '123e4567-e89b-12d3-a456-426614174004',
        name: '',
      };

      const result = PlayerInfoSchema.safeParse(player);
      expect(result.success).toBe(false);
    });

    it('should reject name too long', () => {
      const player = {
        id: '123e4567-e89b-12d3-a456-426614174005',
        name: 'A'.repeat(21), // 21 characters (max is 20)
      };

      const result = PlayerInfoSchema.safeParse(player);
      expect(result.success).toBe(false);
    });

    it('should reject invalid UUID', () => {
      const player = {
        id: 'not-a-uuid',
        name: 'Bob',
      };

      const result = PlayerInfoSchema.safeParse(player);
      expect(result.success).toBe(false);
    });
  });

  describe('GameStateSchema', () => {
    it('should validate minimal game state', () => {
      const minimalState: GameState = {
        version: '1.0.0',
        gameId: '123e4567-e89b-12d3-a456-426614174006' as GameId,
        board: [
          [null, null, null],
          [null, null, null],
          [null, null, null],
        ],
        lightCourt: [],
        darkCourt: [],
        capturedLight: [],
        capturedDark: [],
        currentTurn: 0,
        currentPlayer: 'light',
        lightPlayer: {
          id: '123e4567-e89b-12d3-a456-426614174007' as PlayerId,
          name: 'Player 1',
        },
        darkPlayer: {
          id: '123e4567-e89b-12d3-a456-426614174008' as PlayerId,
          name: 'Player 2',
        },
        status: 'playing',
        winner: null,
        moveHistory: [],
        checksum: 'abc123',
      };

      const result = GameStateSchema.safeParse(minimalState);
      expect(result.success).toBe(true);
    });

    it('should reject wrong board dimensions', () => {
      const badState = {
        version: '1.0.0',
        gameId: '123e4567-e89b-12d3-a456-426614174009',
        board: [
          [null, null], // Only 2 columns, should be 3
          [null, null],
          [null, null],
        ],
        lightCourt: [],
        darkCourt: [],
        capturedLight: [],
        capturedDark: [],
        currentTurn: 0,
        currentPlayer: 'light',
        lightPlayer: {
          id: '123e4567-e89b-12d3-a456-426614174010',
          name: 'Player 1',
        },
        darkPlayer: {
          id: '123e4567-e89b-12d3-a456-426614174011',
          name: 'Player 2',
        },
        status: 'playing',
        winner: null,
        moveHistory: [],
        checksum: 'abc',
      };

      const result = GameStateSchema.safeParse(badState);
      expect(result.success).toBe(false);
    });

    it('should reject invalid version', () => {
      const badState = {
        version: '2.0.0', // Not 1.0.0
        gameId: '123e4567-e89b-12d3-a456-426614174012',
        board: [
          [null, null, null],
          [null, null, null],
          [null, null, null],
        ],
        lightCourt: [],
        darkCourt: [],
        capturedLight: [],
        capturedDark: [],
        currentTurn: 0,
        currentPlayer: 'light',
        lightPlayer: {
          id: '123e4567-e89b-12d3-a456-426614174013',
          name: 'Player 1',
        },
        darkPlayer: {
          id: '123e4567-e89b-12d3-a456-426614174014',
          name: 'Player 2',
        },
        status: 'playing',
        winner: null,
        moveHistory: [],
        checksum: 'test',
      };

      const result = GameStateSchema.safeParse(badState);
      expect(result.success).toBe(false);
    });
  });

  describe('Validation helpers', () => {
    it('validateGameState throws on invalid data', () => {
      expect(() => validateGameState({})).toThrow();
      expect(() => validateGameState(null)).toThrow();
      expect(() => validateGameState('invalid')).toThrow();
    });

    it('safeValidateGameState returns result object', () => {
      const result = safeValidateGameState({});
      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error).toBeDefined();
        expect(result.error.issues.length).toBeGreaterThan(0);
      }
    });

    it('safeValidateGameState succeeds with valid data', () => {
      const validState: GameState = {
        version: '1.0.0',
        gameId: '123e4567-e89b-12d3-a456-426614174011' as GameId,
        board: [
          [null, null, null],
          [null, null, null],
          [null, null, null],
        ],
        lightCourt: [],
        darkCourt: [],
        capturedLight: [],
        capturedDark: [],
        currentTurn: 0,
        currentPlayer: 'light',
        lightPlayer: {
          id: '123e4567-e89b-12d3-a456-426614174012' as PlayerId,
          name: 'Alice',
        },
        darkPlayer: {
          id: '123e4567-e89b-12d3-a456-426614174013' as PlayerId,
          name: 'Bob',
        },
        status: 'playing',
        winner: null,
        moveHistory: [],
        checksum: 'test123',
      };

      const result = safeValidateGameState(validState);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.gameId).toBe(validState.gameId);
        expect(result.data.lightPlayer.name).toBe('Alice');
      }
    });
  });
});
