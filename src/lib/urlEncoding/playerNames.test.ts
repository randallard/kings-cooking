/**
 * @fileoverview Tests for player name extraction and storage
 * @module lib/urlEncoding/playerNames.test
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  extractAndSaveOpponentName,
  shouldIncludePlayerName,
  getOpponentName,
  clearOpponentName,
  OPPONENT_NAME_KEY,
} from './playerNames';
import type { UrlPayload, FullStatePayload, DeltaPayload, ResyncRequestPayload } from './types';
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

      it('should not save own name from full_state payload', () => {
        const gameState = createMockGameState();
        const payload: FullStatePayload = {
          type: 'full_state',
          gameState,
        };

        const myPlayerId = gameState.lightPlayer.id;
        extractAndSaveOpponentName(payload, myPlayerId);

        const saved = localStorage.getItem(OPPONENT_NAME_KEY);
        expect(saved).toBeNull();
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

    describe('delta payload', () => {
      it('should extract and save opponent name from delta payload', () => {
        const gameState = createMockGameState();
        const payload: DeltaPayload = {
          type: 'delta',
          move: {
            from: [2, 0],
            to: [1, 0],
          },
          turn: 1,
          checksum: 'test-checksum',
          playerName: 'Bob',
        };

        const myPlayerId = gameState.lightPlayer.id;
        extractAndSaveOpponentName(payload, myPlayerId);

        const saved = localStorage.getItem(OPPONENT_NAME_KEY);
        expect(saved).toBe('Bob');
      });

      it('should not save when delta payload has no playerName', () => {
        const gameState = createMockGameState();
        const payload: DeltaPayload = {
          type: 'delta',
          move: {
            from: [2, 0],
            to: [1, 0],
          },
          turn: 2,
          checksum: 'test-checksum',
        };

        const myPlayerId = gameState.lightPlayer.id;
        extractAndSaveOpponentName(payload, myPlayerId);

        const saved = localStorage.getItem(OPPONENT_NAME_KEY);
        expect(saved).toBeNull();
      });

      it('should overwrite existing opponent name', () => {
        const gameState = createMockGameState();
        localStorage.setItem(OPPONENT_NAME_KEY, 'OldName');

        const payload: DeltaPayload = {
          type: 'delta',
          move: {
            from: [2, 0],
            to: [1, 0],
          },
          turn: 1,
          checksum: 'test-checksum',
          playerName: 'NewName',
        };

        const myPlayerId = gameState.lightPlayer.id;
        extractAndSaveOpponentName(payload, myPlayerId);

        const saved = localStorage.getItem(OPPONENT_NAME_KEY);
        expect(saved).toBe('NewName');
      });
    });

    describe('resync_request payload', () => {
      it('should extract and save opponent name from resync_request', () => {
        const gameState = createMockGameState();
        const payload: ResyncRequestPayload = {
          type: 'resync_request',
          move: {
            from: [2, 0],
            to: [1, 0],
          },
          turn: 5,
          checksum: 'test-checksum',
          playerName: 'Dave',
        };

        const myPlayerId = gameState.lightPlayer.id;
        extractAndSaveOpponentName(payload, myPlayerId);

        const saved = localStorage.getItem(OPPONENT_NAME_KEY);
        expect(saved).toBe('Dave');
      });

      it('should not save when resync_request has no playerName', () => {
        const gameState = createMockGameState();
        const payload: ResyncRequestPayload = {
          type: 'resync_request',
          move: {
            from: [2, 0],
            to: [1, 0],
          },
          turn: 5,
          checksum: 'test-checksum',
        };

        const myPlayerId = gameState.lightPlayer.id;
        extractAndSaveOpponentName(payload, myPlayerId);

        const saved = localStorage.getItem(OPPONENT_NAME_KEY);
        expect(saved).toBeNull();
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

  describe('shouldIncludePlayerName', () => {
    describe('delta payloads', () => {
      it('should return true for black player on turn 1', () => {
        const gameState = createMockGameState(1, 'dark');
        const result = shouldIncludePlayerName(gameState, 'delta');
        expect(result).toBe(true);
      });

      it('should return false for white player on turn 0', () => {
        const gameState = createMockGameState(0, 'light');
        const result = shouldIncludePlayerName(gameState, 'delta');
        expect(result).toBe(false);
      });

      it('should return false for white player on turn 2', () => {
        const gameState = createMockGameState(2, 'light');
        const result = shouldIncludePlayerName(gameState, 'delta');
        expect(result).toBe(false);
      });

      it('should return false for black player on turn 3', () => {
        const gameState = createMockGameState(3, 'dark');
        const result = shouldIncludePlayerName(gameState, 'delta');
        expect(result).toBe(false);
      });

      it('should return false for black player on turn 0 (edge case)', () => {
        const gameState = createMockGameState(0, 'dark');
        const result = shouldIncludePlayerName(gameState, 'delta');
        expect(result).toBe(false);
      });
    });

    describe('resync_request payloads', () => {
      it('should always return true for resync_request', () => {
        const gameState = createMockGameState(0, 'light');
        const result = shouldIncludePlayerName(gameState, 'resync_request');
        expect(result).toBe(true);
      });

      it('should return true for resync_request regardless of turn', () => {
        const gameState = createMockGameState(10, 'dark');
        const result = shouldIncludePlayerName(gameState, 'resync_request');
        expect(result).toBe(true);
      });

      it('should return true for resync_request on turn 1', () => {
        const gameState = createMockGameState(1, 'dark');
        const result = shouldIncludePlayerName(gameState, 'resync_request');
        expect(result).toBe(true);
      });
    });

    describe('edge cases', () => {
      it('should handle turn 1 with white player correctly', () => {
        const gameState = createMockGameState(1, 'light');
        const result = shouldIncludePlayerName(gameState, 'delta');
        expect(result).toBe(false);
      });

      it('should handle large turn numbers', () => {
        const gameState = createMockGameState(100, 'dark');
        const result = shouldIncludePlayerName(gameState, 'delta');
        expect(result).toBe(false);
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
      const payload: DeltaPayload = {
        type: 'delta',
        move: {
          from: [2, 0],
          to: [1, 0],
        },
        turn: 1,
        checksum: 'test-checksum',
        playerName: 'Bob',
      };

      extractAndSaveOpponentName(payload, 'white-player-id');
      expect(getOpponentName()).toBe('Bob');

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

    it('should handle Player 1 receiving first move from Player 2', () => {
      const gameState = createMockGameState();
      // Player 1 receives delta with Player 2's name
      const payload: DeltaPayload = {
        type: 'delta',
        move: {
          from: [0, 0],
          to: [1, 0],
        },
        turn: 1,
        checksum: 'test-checksum',
        playerName: 'Bob',
      };

      extractAndSaveOpponentName(payload, gameState.lightPlayer.id);

      expect(getOpponentName()).toBe('Bob');
    });

    it('should handle localStorage recovery via resync_request', () => {
      const gameState = createMockGameState();
      // Simulate localStorage loss
      clearOpponentName();
      expect(getOpponentName()).toBeNull();

      // Receive resync_request with opponent name
      const payload: ResyncRequestPayload = {
        type: 'resync_request',
        move: {
          from: [2, 0],
          to: [1, 0],
        },
        turn: 5,
        checksum: 'test-checksum',
        playerName: 'RecoveredName',
      };

      extractAndSaveOpponentName(payload, gameState.lightPlayer.id);

      expect(getOpponentName()).toBe('RecoveredName');
    });

    it('should determine when to include playerName in delta for black player turn 1', () => {
      const gameState = createMockGameState(1, 'dark');
      const shouldInclude = shouldIncludePlayerName(gameState, 'delta');

      expect(shouldInclude).toBe(true);
    });

    it('should not include playerName in delta for subsequent moves', () => {
      const gameState = createMockGameState(5, 'light');
      const shouldInclude = shouldIncludePlayerName(gameState, 'delta');

      expect(shouldInclude).toBe(false);
    });
  });
});
