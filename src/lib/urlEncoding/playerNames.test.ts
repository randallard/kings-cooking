/**
 * @fileoverview Tests for player name extraction and storage
 * @module lib/urlEncoding/playerNames.test
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  extractAndSaveOpponentName,
  getOpponentName,
  clearOpponentName,
  OPPONENT_NAME_KEY,
} from './playerNames';
import type { UrlPayload, FullStatePayload } from './types';
import type { GameState } from '@/lib/validation/schemas';
import { GameIdSchema, PlayerIdSchema } from '@/lib/validation/schemas';

// Mock game state helper
const createMockGameState = (
  currentTurn: number = 0,
  currentPlayer: 'light' | 'dark' = 'light'
): GameState => ({
  version: '1.0.0',
  gameId: GameIdSchema.parse('550e8400-e29b-41d4-a716-446655440000'),
  board: [
    [null, null, null],
    [null, null, null],
    [null, null, null],
  ],
  lightCourt: [],
  darkCourt: [],
  capturedLight: [],
  capturedDark: [],
  currentTurn,
  currentPlayer,
  lightPlayer: {
    id: PlayerIdSchema.parse('550e8400-e29b-41d4-a716-446655440001'),
    name: 'Alice'
  },
  darkPlayer: {
    id: PlayerIdSchema.parse('550e8400-e29b-41d4-a716-446655440002'),
    name: 'Bob'
  },
  status: 'playing',
  winner: null,
  moveHistory: [],
  checksum: 'test-checksum',
});

describe('Player Names Integration', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('extractAndSaveOpponentName', () => {
    describe('full_state payload', () => {
      it('should extract and save opponent name from full_state payload', () => {
        const gameState = createMockGameState();
        const payload: FullStatePayload = {
          type: 'full_state',
          gameState,
        };

        const myPlayerId = gameState.darkPlayer.id;
        extractAndSaveOpponentName(payload, myPlayerId);

        const saved = localStorage.getItem(OPPONENT_NAME_KEY);
        expect(saved).toBe('Alice');
      });

      it('should save opponent name, not own name from full_state payload', () => {
        const gameState = createMockGameState();
        const payload: FullStatePayload = {
          type: 'full_state',
          gameState,
        };

        const myPlayerId = gameState.lightPlayer.id; // Alice (light player)
        extractAndSaveOpponentName(payload, myPlayerId);

        const saved = localStorage.getItem(OPPONENT_NAME_KEY);
        expect(saved).toBe('Bob'); // Should save opponent (Bob), not own name (Alice)
      });

      it('should handle full_state with playerName field', () => {
        const gameState = createMockGameState();
        const payload: FullStatePayload = {
          type: 'full_state',
          gameState,
          playerName: 'Charlie',
        };

        const myPlayerId = gameState.darkPlayer.id;
        extractAndSaveOpponentName(payload, myPlayerId);

        // Should extract from gameState.lightPlayer.name, not playerName field
        const saved = localStorage.getItem(OPPONENT_NAME_KEY);
        expect(saved).toBe('Alice');
      });
    });

    describe('error handling', () => {
      it('should handle malformed payload gracefully', () => {
        const payload = {
          type: 'unknown',
        } as unknown as UrlPayload;

        expect(() => {
          extractAndSaveOpponentName(payload, 'test-id');
        }).not.toThrow();

        const saved = localStorage.getItem(OPPONENT_NAME_KEY);
        expect(saved).toBeNull();
      });
    });
  });

  describe('getOpponentName', () => {
    it('should return null when no name is saved', () => {
      const result = getOpponentName();
      expect(result).toBeNull();
    });

    it('should return saved opponent name', () => {
      localStorage.setItem(OPPONENT_NAME_KEY, 'TestPlayer');
      const result = getOpponentName();
      expect(result).toBe('TestPlayer');
    });

    it('should return latest saved name', () => {
      localStorage.setItem(OPPONENT_NAME_KEY, 'FirstPlayer');
      localStorage.setItem(OPPONENT_NAME_KEY, 'SecondPlayer');
      const result = getOpponentName();
      expect(result).toBe('SecondPlayer');
    });
  });

  describe('clearOpponentName', () => {
    it('should remove opponent name from localStorage', () => {
      localStorage.setItem(OPPONENT_NAME_KEY, 'TestPlayer');
      clearOpponentName();

      const result = localStorage.getItem(OPPONENT_NAME_KEY);
      expect(result).toBeNull();
    });

    it('should handle clearing when no name exists', () => {
      clearOpponentName();
      const result = localStorage.getItem(OPPONENT_NAME_KEY);
      expect(result).toBeNull();
    });

    it('should clear name set by extractAndSaveOpponentName', () => {
      const gameState = createMockGameState();
      const payload: FullStatePayload = {
        type: 'full_state',
        gameState,
      };

      extractAndSaveOpponentName(payload, gameState.darkPlayer.id);
      expect(getOpponentName()).toBe('Alice'); // Light player is Alice

      clearOpponentName();
      expect(getOpponentName()).toBeNull();
    });
  });

  describe('integration scenarios', () => {
    it('should handle Player 2 receiving initial game from Player 1', () => {
      const gameState = createMockGameState();
      // Player 2 receives full_state from Player 1
      const payload: FullStatePayload = {
        type: 'full_state',
        gameState,
      };

      extractAndSaveOpponentName(payload, gameState.darkPlayer.id);

      expect(getOpponentName()).toBe('Alice');
    });
  });
});
