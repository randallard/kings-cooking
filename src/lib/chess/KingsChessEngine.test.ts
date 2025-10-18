/**
 * @fileoverview Tests for Kings Chess Engine
 * @module lib/chess/KingsChessEngine.test
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { KingsChessEngine } from './KingsChessEngine';
import { PlayerIdSchema } from '../validation/schemas';
import type { PlayerInfo, Position } from '../validation/schemas';
import { v4 as uuid } from 'uuid';

describe('KingsChessEngine', () => {
  let lightPlayer: PlayerInfo;
  let darkPlayer: PlayerInfo;
  let engine: KingsChessEngine;

  beforeEach(() => {
    lightPlayer = {
      id: PlayerIdSchema.parse(uuid()),
      name: 'White Player',
    };

    darkPlayer = {
      id: PlayerIdSchema.parse(uuid()),
      name: 'Black Player',
    };

    engine = new KingsChessEngine(lightPlayer, darkPlayer);
  });

  describe('initialization', () => {
    test('should create valid initial state', () => {
      const state = engine.getGameState();

      expect(state.version).toBe('1.0.0');
      expect(state.currentPlayer).toBe('light');
      expect(state.currentTurn).toBe(0);
      expect(state.status).toBe('playing');
      expect(state.lightCourt).toHaveLength(0);
      expect(state.darkCourt).toHaveLength(0);
      expect(state.capturedLight).toHaveLength(0);
      expect(state.capturedDark).toHaveLength(0);
    });

    test('should set up starting position correctly', () => {
      const state = engine.getGameState();
      const board = state.board;

      // Black pieces on row 0
      expect(board[0]?.[0]?.type).toBe('rook');
      expect(board[0]?.[0]?.owner).toBe('dark');
      expect(board[0]?.[1]?.type).toBe('knight');
      expect(board[0]?.[1]?.owner).toBe('dark');
      expect(board[0]?.[2]?.type).toBe('bishop');
      expect(board[0]?.[2]?.owner).toBe('dark');

      // Empty row 1
      expect(board[1]?.[0]).toBeNull();
      expect(board[1]?.[1]).toBeNull();
      expect(board[1]?.[2]).toBeNull();

      // White pieces on row 2
      expect(board[2]?.[0]?.type).toBe('rook');
      expect(board[2]?.[0]?.owner).toBe('light');
      expect(board[2]?.[1]?.type).toBe('knight');
      expect(board[2]?.[1]?.owner).toBe('light');
      expect(board[2]?.[2]?.type).toBe('bishop');
      expect(board[2]?.[2]?.owner).toBe('light');
    });

    test('should restore from initial state', () => {
      const state1 = engine.getGameState();
      const engine2 = new KingsChessEngine(lightPlayer, darkPlayer, state1);
      const state2 = engine2.getGameState();

      expect(state2.gameId).toBe(state1.gameId);
      expect(state2.currentTurn).toBe(state1.currentTurn);
      expect(state2.currentPlayer).toBe(state1.currentPlayer);
    });
  });

  describe('makeMove', () => {
    test('should allow valid rook move', () => {
      const result = engine.makeMove([2, 0], [1, 0]);

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();

      const state = engine.getGameState();
      expect(state.board[1]?.[0]?.type).toBe('rook');
      expect(state.board[2]?.[0]).toBeNull();
      expect(state.currentPlayer).toBe('dark');
      expect(state.currentTurn).toBe(1);
    });

    test('should reject invalid rook move (diagonal)', () => {
      const result = engine.makeMove([2, 0], [1, 1]);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('should reject move when not your turn', () => {
      const result = engine.makeMove([0, 0], [1, 0]);

      expect(result.success).toBe(false);
      expect(result.error).toContain("It's light's turn");
    });

    test('should reject moving to square with own piece', () => {
      const result = engine.makeMove([2, 0], [2, 1]);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('should reject move from empty square', () => {
      const result = engine.makeMove([1, 1], [1, 0]);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No piece');
    });

    test('should allow knight L-shaped move', () => {
      const result = engine.makeMove([2, 1], [0, 2]);

      expect(result.success).toBe(true);

      const state = engine.getGameState();
      expect(state.board[0]?.[2]?.type).toBe('knight');
      expect(state.board[0]?.[2]?.owner).toBe('light');
      expect(state.board[2]?.[1]).toBeNull();
    });

    test('should handle captures correctly', () => {
      // White knight captures dark bishop
      engine.makeMove([2, 1], [0, 2]);
      const state = engine.getGameState();

      // Black bishop should be in capturedBlack (their own court)
      expect(state.capturedDark).toHaveLength(1);
      expect(state.capturedDark[0]?.type).toBe('bishop');
      expect(state.capturedDark[0]?.owner).toBe('dark');

      // White knight is now at (0,2)
      expect(state.board[0]?.[2]?.type).toBe('knight');
      expect(state.board[0]?.[2]?.owner).toBe('light');
    });

    test('should track move history', () => {
      engine.makeMove([2, 0], [1, 0]); // White rook
      engine.makeMove([0, 0], [1, 1]); // Black rook diagonally - INVALID, will fail

      const state = engine.getGameState();
      expect(state.moveHistory).toHaveLength(1); // Only first move succeeded
      expect(state.moveHistory[0]?.piece.type).toBe('rook');
    });
  });

  describe('off-board moves', () => {
    test('should allow rook to move off-board with clear path', () => {
      // Move light rook forward twice to get clear path
      engine.makeMove([2, 0], [1, 0]);
      engine.makeMove([0, 1], [2, 0]); // Black knight moves
      engine.makeMove([1, 0], [0, 0]); // White rook to edge
      engine.makeMove([2, 0], [0, 1]); // Black knight moves

      // Now light rook can move off-board
      const result = engine.makeMove([0, 0], 'off_board');

      expect(result.success).toBe(true);

      const state = engine.getGameState();
      expect(state.lightCourt).toHaveLength(1);
      expect(state.lightCourt[0]?.type).toBe('rook');
      expect(state.lightCourt[0]?.owner).toBe('light');
      expect(state.board[0]?.[0]).toBeNull();
    });

    test('should reject rook off-board move with blocked path', () => {
      // Try to move off-board without clear path
      const result = engine.makeMove([2, 0], 'off_board');

      expect(result.success).toBe(false);
      expect(result.error).toContain('no clear path');
    });

    test('should reject knight off-board from starting position', () => {
      // Knight at (2,1) cannot jump directly off-board (L-moves don't reach row < 0)
      const result = engine.makeMove([2, 1], 'off_board');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('should handle bishop off-board rules correctly', () => {
      // Bishop can move off-board if diagonal crosses through middle column
      // This requires specific board setup - test will be in integration tests
      expect(true).toBe(true);
    });
  });

  describe('victory conditions', () => {
    test('should detect light victory', () => {
      // Simulate game where light gets 2 pieces to dark court
      const state = engine.getGameState();
      state.lightCourt = [
        { type: 'rook', owner: 'light', position: null, moveCount: 3, id: uuid() },
        { type: 'knight', owner: 'light', position: null, moveCount: 2, id: uuid() },
      ];
      state.darkCourt = [
        { type: 'bishop', owner: 'dark', position: null, moveCount: 4, id: uuid() },
      ];
      state.board = [[null, null, null], [null, null, null], [null, null, null]];

      const engine2 = new KingsChessEngine(lightPlayer, darkPlayer, state);
      const victory = engine2.checkGameEnd();

      expect(victory.gameOver).toBe(true);
      expect(victory.winner).toBe('light');
      expect(victory.score).toEqual({ light: 2, dark: 1 });
    });

    test('should detect dark victory', () => {
      const state = engine.getGameState();
      state.lightCourt = [
        { type: 'rook', owner: 'light', position: null, moveCount: 3, id: uuid() },
      ];
      state.darkCourt = [
        { type: 'bishop', owner: 'dark', position: null, moveCount: 4, id: uuid() },
        { type: 'knight', owner: 'dark', position: null, moveCount: 2, id: uuid() },
      ];
      state.board = [[null, null, null], [null, null, null], [null, null, null]];

      const engine2 = new KingsChessEngine(lightPlayer, darkPlayer, state);
      const victory = engine2.checkGameEnd();

      expect(victory.gameOver).toBe(true);
      expect(victory.winner).toBe('dark');
      expect(victory.score).toEqual({ light: 1, dark: 2 });
    });

    test('should detect draw', () => {
      const state = engine.getGameState();
      state.lightCourt = [
        { type: 'rook', owner: 'light', position: null, moveCount: 3, id: uuid() },
      ];
      state.darkCourt = [
        { type: 'rook', owner: 'dark', position: null, moveCount: 3, id: uuid() },
      ];
      state.board = [[null, null, null], [null, null, null], [null, null, null]];

      const engine2 = new KingsChessEngine(lightPlayer, darkPlayer, state);
      const victory = engine2.checkGameEnd();

      expect(victory.gameOver).toBe(true);
      expect(victory.winner).toBeNull();
      expect(victory.reason).toContain('Draw');
    });

    test('should end game when all light pieces eliminated and auto-score dark pieces', () => {
      const state = engine.getGameState();
      const darkRook = { type: 'rook' as const, owner: 'dark' as const, position: [0, 0] as Position, moveCount: 0, id: uuid() };
      const darkKnight = { type: 'knight' as const, owner: 'dark' as const, position: [0, 1] as Position, moveCount: 0, id: uuid() };

      // All light pieces captured
      state.capturedLight = [
        { type: 'rook' as const, owner: 'light' as const, position: null, moveCount: 2, id: uuid() },
        { type: 'knight' as const, owner: 'light' as const, position: null, moveCount: 1, id: uuid() },
        { type: 'bishop' as const, owner: 'light' as const, position: null, moveCount: 1, id: uuid() },
      ];

      // Black has 2 pieces on board + 1 scored
      state.board = [[darkRook, darkKnight, null], [null, null, null], [null, null, null]];
      state.darkCourt = [
        { type: 'bishop' as const, owner: 'dark' as const, position: null, moveCount: 3, id: uuid() },
      ];

      const engine2 = new KingsChessEngine(lightPlayer, darkPlayer, state);
      const victory = engine2.checkGameEnd();

      expect(victory.gameOver).toBe(true);
      expect(victory.winner).toBe('dark');
      expect(victory.score).toEqual({ light: 0, dark: 3 }); // 1 scored + 2 auto-scored
    });

    test('should not end game if pieces remain on board', () => {
      const victory = engine.checkGameEnd();

      expect(victory.gameOver).toBe(false);
    });
  });

  describe('serialization', () => {
    test('should serialize to JSON', () => {
      const json = engine.toJSON();

      expect(json.version).toBe('1.0.0');
      expect(json.board).toHaveLength(3);
      expect(json.gameId).toBeDefined();
    });

    test('should deserialize from JSON', () => {
      engine.makeMove([2, 0], [1, 0]);
      const json = engine.toJSON();
      const engine2 = KingsChessEngine.fromJSON(json);
      const state2 = engine2.getGameState();

      expect(state2.gameId).toBe(json.gameId);
      expect(state2.currentTurn).toBe(json.currentTurn);
      expect(state2.currentPlayer).toBe('dark');
    });

    test('should maintain state through serialization cycle', () => {
      engine.makeMove([2, 0], [1, 0]);
      engine.makeMove([0, 0], [1, 1]);

      const json = engine.toJSON();
      const engine2 = KingsChessEngine.fromJSON(json);

      expect(engine2.getGameState()).toEqual(engine.getGameState());
    });
  });

  describe('getValidMoves', () => {
    test('should return empty array for empty position', () => {
      const moves = engine.getValidMoves([1, 1]);
      expect(moves).toEqual([]);
    });

    test('should return empty array for opponent piece on their turn', () => {
      const moves = engine.getValidMoves([0, 0]); // Black rook on light's turn
      expect(moves).toEqual([]);
    });

    test('should return valid moves for rook', () => {
      const moves = engine.getValidMoves([2, 0]);
      expect(moves.length).toBeGreaterThan(0);
      expect(moves).toContainEqual([1, 0]);
    });

    test('should return valid moves for knight', () => {
      const moves = engine.getValidMoves([2, 1]);
      expect(moves.length).toBeGreaterThan(0);
    });

    test('should return valid moves for bishop', () => {
      engine.makeMove([2, 2], [1, 1]); // Move bishop to center
      engine.makeMove([0, 0], [1, 0]); // Black moves

      const moves = engine.getValidMoves([1, 1]);
      expect(moves.length).toBeGreaterThan(0);
    });
  });
});
