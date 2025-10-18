/**
 * @fileoverview Tests for victory condition detection
 * @module lib/chess/victoryConditions.test
 */

import { describe, test, expect } from 'vitest';
import { checkGameEnd, getCurrentScore } from './victoryConditions';
import { GameIdSchema, PlayerIdSchema } from '../validation/schemas';
import type { GameState, Position } from '../validation/schemas';
import { v4 as uuid } from 'uuid';

describe('victoryConditions', () => {
  const createGameState = (overrides: Partial<GameState> = {}): GameState => {
    const defaultState: GameState = {
      version: '1.0.0',
      gameId: GameIdSchema.parse(uuid()),
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
        id: PlayerIdSchema.parse(uuid()),
        name: 'White',
      },
      darkPlayer: {
        id: PlayerIdSchema.parse(uuid()),
        name: 'Black',
      },
      status: 'playing',
      winner: null,
      moveHistory: [],
      checksum: 'test',
    };

    return { ...defaultState, ...overrides };
  };

  describe('checkGameEnd', () => {
    test('should return gameOver=false when pieces remain on board', () => {
      const state = createGameState({
        board: [
          [{ type: 'rook', owner: 'dark', position: [0, 0], moveCount: 0, id: uuid() }, null, null],
          [null, null, null],
          [{ type: 'rook', owner: 'light', position: [2, 0], moveCount: 0, id: uuid() }, null, null],
        ],
      });

      const result = checkGameEnd(state);

      expect(result.gameOver).toBe(false);
    });

    test('should detect light victory (more pieces in opponent court)', () => {
      const state = createGameState({
        lightCourt: [
          { type: 'rook', owner: 'light', position: null, moveCount: 3, id: uuid() },
          { type: 'knight', owner: 'light', position: null, moveCount: 2, id: uuid() },
        ],
        darkCourt: [
          { type: 'bishop', owner: 'dark', position: null, moveCount: 4, id: uuid() },
        ],
      });

      const result = checkGameEnd(state);

      expect(result.gameOver).toBe(true);
      expect(result.winner).toBe('light');
      expect(result.score).toEqual({ light: 2, dark: 1 });
      expect(result.reason).toContain('Light wins');
    });

    test('should detect dark victory (more pieces in opponent court)', () => {
      const state = createGameState({
        lightCourt: [
          { type: 'rook', owner: 'light', position: null, moveCount: 3, id: uuid() },
        ],
        darkCourt: [
          { type: 'bishop', owner: 'dark', position: null, moveCount: 4, id: uuid() },
          { type: 'knight', owner: 'dark', position: null, moveCount: 2, id: uuid() },
        ],
      });

      const result = checkGameEnd(state);

      expect(result.gameOver).toBe(true);
      expect(result.winner).toBe('dark');
      expect(result.score).toEqual({ light: 1, dark: 2 });
      expect(result.reason).toContain('Dark wins');
    });

    test('should detect draw (equal pieces in courts)', () => {
      const state = createGameState({
        lightCourt: [
          { type: 'rook', owner: 'light', position: null, moveCount: 3, id: uuid() },
        ],
        darkCourt: [
          { type: 'rook', owner: 'dark', position: null, moveCount: 3, id: uuid() },
        ],
      });

      const result = checkGameEnd(state);

      expect(result.gameOver).toBe(true);
      expect(result.winner).toBeNull();
      expect(result.score).toEqual({ light: 1, dark: 1 });
      expect(result.reason).toContain('Draw');
    });

    test('should auto-score remaining pieces when light eliminated', () => {
      const state = createGameState({
        board: [
          [{ type: 'rook', owner: 'dark', position: [0, 0] as Position, moveCount: 0, id: uuid() }, null, null],
          [null, { type: 'knight', owner: 'dark', position: [1, 1] as Position, moveCount: 0, id: uuid() }, null],
          [null, null, null],
        ],
        capturedLight: [
          { type: 'rook', owner: 'light', position: null, moveCount: 2, id: uuid() },
          { type: 'knight', owner: 'light', position: null, moveCount: 1, id: uuid() },
          { type: 'bishop', owner: 'light', position: null, moveCount: 1, id: uuid() },
        ],
        darkCourt: [
          { type: 'bishop', owner: 'dark', position: null, moveCount: 3, id: uuid() },
        ],
      });

      const result = checkGameEnd(state);

      expect(result.gameOver).toBe(true);
      expect(result.winner).toBe('dark');
      // 1 in darkCourt + 2 on board auto-scored
      expect(result.score).toEqual({ light: 0, dark: 3 });
      expect(result.reason).toContain('dominating');
    });

    test('should auto-score remaining pieces when dark eliminated', () => {
      const state = createGameState({
        board: [
          [null, null, null],
          [null, null, null],
          [{ type: 'rook', owner: 'light', position: [2, 0] as Position, moveCount: 0, id: uuid() }, null, null],
        ],
        capturedDark: [
          { type: 'rook', owner: 'dark', position: null, moveCount: 2, id: uuid() },
          { type: 'knight', owner: 'dark', position: null, moveCount: 1, id: uuid() },
          { type: 'bishop', owner: 'dark', position: null, moveCount: 1, id: uuid() },
        ],
        lightCourt: [
          { type: 'bishop', owner: 'light', position: null, moveCount: 3, id: uuid() },
        ],
      });

      const result = checkGameEnd(state);

      expect(result.gameOver).toBe(true);
      expect(result.winner).toBe('light');
      // 1 in lightCourt + 1 on board auto-scored
      expect(result.score).toEqual({ light: 2, dark: 0 });
    });

    test('should not count captured pieces in score', () => {
      const state = createGameState({
        lightCourt: [
          { type: 'rook', owner: 'light', position: null, moveCount: 3, id: uuid() },
        ],
        darkCourt: [
          { type: 'knight', owner: 'dark', position: null, moveCount: 2, id: uuid() },
        ],
        capturedLight: [
          { type: 'knight', owner: 'light', position: null, moveCount: 1, id: uuid() },
          { type: 'bishop', owner: 'light', position: null, moveCount: 1, id: uuid() },
        ],
        capturedDark: [
          { type: 'bishop', owner: 'dark', position: null, moveCount: 1, id: uuid() },
        ],
      });

      const result = checkGameEnd(state);

      expect(result.gameOver).toBe(true);
      expect(result.score).toEqual({ light: 1, dark: 1 }); // Only court pieces count
    });
  });

  describe('getCurrentScore', () => {
    test('should return correct scores from courts', () => {
      const state = createGameState({
        lightCourt: [
          { type: 'rook', owner: 'light', position: null, moveCount: 3, id: uuid() },
          { type: 'knight', owner: 'light', position: null, moveCount: 2, id: uuid() },
        ],
        darkCourt: [
          { type: 'bishop', owner: 'dark', position: null, moveCount: 4, id: uuid() },
        ],
      });

      const score = getCurrentScore(state);

      expect(score).toEqual({ light: 2, dark: 1 });
    });

    test('should return 0-0 for empty courts', () => {
      const state = createGameState();

      const score = getCurrentScore(state);

      expect(score).toEqual({ light: 0, dark: 0 });
    });

    test('should not include captured pieces in score', () => {
      const state = createGameState({
        lightCourt: [
          { type: 'rook', owner: 'light', position: null, moveCount: 3, id: uuid() },
        ],
        capturedLight: [
          { type: 'knight', owner: 'light', position: null, moveCount: 1, id: uuid() },
        ],
        capturedDark: [
          { type: 'bishop', owner: 'dark', position: null, moveCount: 1, id: uuid() },
        ],
      });

      const score = getCurrentScore(state);

      expect(score).toEqual({ light: 1, dark: 0 });
    });
  });
});
