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
      whiteCourt: [],
      blackCourt: [],
      capturedWhite: [],
      capturedBlack: [],
      currentTurn: 0,
      currentPlayer: 'white',
      whitePlayer: {
        id: PlayerIdSchema.parse(uuid()),
        name: 'White',
      },
      blackPlayer: {
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
          [{ type: 'rook', owner: 'black', position: [0, 0], moveCount: 0, id: uuid() }, null, null],
          [null, null, null],
          [{ type: 'rook', owner: 'white', position: [2, 0], moveCount: 0, id: uuid() }, null, null],
        ],
      });

      const result = checkGameEnd(state);

      expect(result.gameOver).toBe(false);
    });

    test('should detect white victory (more pieces in opponent court)', () => {
      const state = createGameState({
        whiteCourt: [
          { type: 'rook', owner: 'white', position: null, moveCount: 3, id: uuid() },
          { type: 'knight', owner: 'white', position: null, moveCount: 2, id: uuid() },
        ],
        blackCourt: [
          { type: 'bishop', owner: 'black', position: null, moveCount: 4, id: uuid() },
        ],
      });

      const result = checkGameEnd(state);

      expect(result.gameOver).toBe(true);
      expect(result.winner).toBe('white');
      expect(result.score).toEqual({ white: 2, black: 1 });
      expect(result.reason).toContain('White wins');
    });

    test('should detect black victory (more pieces in opponent court)', () => {
      const state = createGameState({
        whiteCourt: [
          { type: 'rook', owner: 'white', position: null, moveCount: 3, id: uuid() },
        ],
        blackCourt: [
          { type: 'bishop', owner: 'black', position: null, moveCount: 4, id: uuid() },
          { type: 'knight', owner: 'black', position: null, moveCount: 2, id: uuid() },
        ],
      });

      const result = checkGameEnd(state);

      expect(result.gameOver).toBe(true);
      expect(result.winner).toBe('black');
      expect(result.score).toEqual({ white: 1, black: 2 });
      expect(result.reason).toContain('Black wins');
    });

    test('should detect draw (equal pieces in courts)', () => {
      const state = createGameState({
        whiteCourt: [
          { type: 'rook', owner: 'white', position: null, moveCount: 3, id: uuid() },
        ],
        blackCourt: [
          { type: 'rook', owner: 'black', position: null, moveCount: 3, id: uuid() },
        ],
      });

      const result = checkGameEnd(state);

      expect(result.gameOver).toBe(true);
      expect(result.winner).toBeNull();
      expect(result.score).toEqual({ white: 1, black: 1 });
      expect(result.reason).toContain('Draw');
    });

    test('should auto-score remaining pieces when white eliminated', () => {
      const state = createGameState({
        board: [
          [{ type: 'rook', owner: 'black', position: [0, 0] as Position, moveCount: 0, id: uuid() }, null, null],
          [null, { type: 'knight', owner: 'black', position: [1, 1] as Position, moveCount: 0, id: uuid() }, null],
          [null, null, null],
        ],
        capturedWhite: [
          { type: 'rook', owner: 'white', position: null, moveCount: 2, id: uuid() },
          { type: 'knight', owner: 'white', position: null, moveCount: 1, id: uuid() },
          { type: 'bishop', owner: 'white', position: null, moveCount: 1, id: uuid() },
        ],
        blackCourt: [
          { type: 'bishop', owner: 'black', position: null, moveCount: 3, id: uuid() },
        ],
      });

      const result = checkGameEnd(state);

      expect(result.gameOver).toBe(true);
      expect(result.winner).toBe('black');
      // 1 in blackCourt + 2 on board auto-scored
      expect(result.score).toEqual({ white: 0, black: 3 });
      expect(result.reason).toContain('dominating');
    });

    test('should auto-score remaining pieces when black eliminated', () => {
      const state = createGameState({
        board: [
          [null, null, null],
          [null, null, null],
          [{ type: 'rook', owner: 'white', position: [2, 0] as Position, moveCount: 0, id: uuid() }, null, null],
        ],
        capturedBlack: [
          { type: 'rook', owner: 'black', position: null, moveCount: 2, id: uuid() },
          { type: 'knight', owner: 'black', position: null, moveCount: 1, id: uuid() },
          { type: 'bishop', owner: 'black', position: null, moveCount: 1, id: uuid() },
        ],
        whiteCourt: [
          { type: 'bishop', owner: 'white', position: null, moveCount: 3, id: uuid() },
        ],
      });

      const result = checkGameEnd(state);

      expect(result.gameOver).toBe(true);
      expect(result.winner).toBe('white');
      // 1 in whiteCourt + 1 on board auto-scored
      expect(result.score).toEqual({ white: 2, black: 0 });
    });

    test('should not count captured pieces in score', () => {
      const state = createGameState({
        whiteCourt: [
          { type: 'rook', owner: 'white', position: null, moveCount: 3, id: uuid() },
        ],
        blackCourt: [
          { type: 'knight', owner: 'black', position: null, moveCount: 2, id: uuid() },
        ],
        capturedWhite: [
          { type: 'knight', owner: 'white', position: null, moveCount: 1, id: uuid() },
          { type: 'bishop', owner: 'white', position: null, moveCount: 1, id: uuid() },
        ],
        capturedBlack: [
          { type: 'bishop', owner: 'black', position: null, moveCount: 1, id: uuid() },
        ],
      });

      const result = checkGameEnd(state);

      expect(result.gameOver).toBe(true);
      expect(result.score).toEqual({ white: 1, black: 1 }); // Only court pieces count
    });
  });

  describe('getCurrentScore', () => {
    test('should return correct scores from courts', () => {
      const state = createGameState({
        whiteCourt: [
          { type: 'rook', owner: 'white', position: null, moveCount: 3, id: uuid() },
          { type: 'knight', owner: 'white', position: null, moveCount: 2, id: uuid() },
        ],
        blackCourt: [
          { type: 'bishop', owner: 'black', position: null, moveCount: 4, id: uuid() },
        ],
      });

      const score = getCurrentScore(state);

      expect(score).toEqual({ white: 2, black: 1 });
    });

    test('should return 0-0 for empty courts', () => {
      const state = createGameState();

      const score = getCurrentScore(state);

      expect(score).toEqual({ white: 0, black: 0 });
    });

    test('should not include captured pieces in score', () => {
      const state = createGameState({
        whiteCourt: [
          { type: 'rook', owner: 'white', position: null, moveCount: 3, id: uuid() },
        ],
        capturedWhite: [
          { type: 'knight', owner: 'white', position: null, moveCount: 1, id: uuid() },
        ],
        capturedBlack: [
          { type: 'bishop', owner: 'black', position: null, moveCount: 1, id: uuid() },
        ],
      });

      const score = getCurrentScore(state);

      expect(score).toEqual({ white: 1, black: 0 });
    });
  });
});
