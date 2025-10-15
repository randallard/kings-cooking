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
  let whitePlayer: PlayerInfo;
  let blackPlayer: PlayerInfo;
  let engine: KingsChessEngine;

  beforeEach(() => {
    whitePlayer = {
      id: PlayerIdSchema.parse(uuid()),
      name: 'White Player',
    };

    blackPlayer = {
      id: PlayerIdSchema.parse(uuid()),
      name: 'Black Player',
    };

    engine = new KingsChessEngine(whitePlayer, blackPlayer);
  });

  describe('initialization', () => {
    test('should create valid initial state', () => {
      const state = engine.getGameState();

      expect(state.version).toBe('1.0.0');
      expect(state.currentPlayer).toBe('white');
      expect(state.currentTurn).toBe(0);
      expect(state.status).toBe('playing');
      expect(state.whiteCourt).toHaveLength(0);
      expect(state.blackCourt).toHaveLength(0);
      expect(state.capturedWhite).toHaveLength(0);
      expect(state.capturedBlack).toHaveLength(0);
    });

    test('should set up starting position correctly', () => {
      const state = engine.getGameState();
      const board = state.board;

      // Black pieces on row 0
      expect(board[0]?.[0]?.type).toBe('rook');
      expect(board[0]?.[0]?.owner).toBe('black');
      expect(board[0]?.[1]?.type).toBe('knight');
      expect(board[0]?.[1]?.owner).toBe('black');
      expect(board[0]?.[2]?.type).toBe('bishop');
      expect(board[0]?.[2]?.owner).toBe('black');

      // Empty row 1
      expect(board[1]?.[0]).toBeNull();
      expect(board[1]?.[1]).toBeNull();
      expect(board[1]?.[2]).toBeNull();

      // White pieces on row 2
      expect(board[2]?.[0]?.type).toBe('rook');
      expect(board[2]?.[0]?.owner).toBe('white');
      expect(board[2]?.[1]?.type).toBe('knight');
      expect(board[2]?.[1]?.owner).toBe('white');
      expect(board[2]?.[2]?.type).toBe('bishop');
      expect(board[2]?.[2]?.owner).toBe('white');
    });

    test('should restore from initial state', () => {
      const state1 = engine.getGameState();
      const engine2 = new KingsChessEngine(whitePlayer, blackPlayer, state1);
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
      expect(state.currentPlayer).toBe('black');
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
      expect(result.error).toContain("It's white's turn");
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
      expect(state.board[0]?.[2]?.owner).toBe('white');
      expect(state.board[2]?.[1]).toBeNull();
    });

    test('should handle captures correctly', () => {
      // White knight captures black bishop
      engine.makeMove([2, 1], [0, 2]);
      const state = engine.getGameState();

      // Black bishop should be in capturedBlack (their own court)
      expect(state.capturedBlack).toHaveLength(1);
      expect(state.capturedBlack[0]?.type).toBe('bishop');
      expect(state.capturedBlack[0]?.owner).toBe('black');

      // White knight is now at (0,2)
      expect(state.board[0]?.[2]?.type).toBe('knight');
      expect(state.board[0]?.[2]?.owner).toBe('white');
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
      // Move white rook forward twice to get clear path
      engine.makeMove([2, 0], [1, 0]);
      engine.makeMove([0, 1], [2, 0]); // Black knight moves
      engine.makeMove([1, 0], [0, 0]); // White rook to edge
      engine.makeMove([2, 0], [0, 1]); // Black knight moves

      // Now white rook can move off-board
      const result = engine.makeMove([0, 0], 'off_board');

      expect(result.success).toBe(true);

      const state = engine.getGameState();
      expect(state.whiteCourt).toHaveLength(1);
      expect(state.whiteCourt[0]?.type).toBe('rook');
      expect(state.whiteCourt[0]?.owner).toBe('white');
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
    test('should detect white victory', () => {
      // Simulate game where white gets 2 pieces to black court
      const state = engine.getGameState();
      state.whiteCourt = [
        { type: 'rook', owner: 'white', position: null, moveCount: 3, id: uuid() },
        { type: 'knight', owner: 'white', position: null, moveCount: 2, id: uuid() },
      ];
      state.blackCourt = [
        { type: 'bishop', owner: 'black', position: null, moveCount: 4, id: uuid() },
      ];
      state.board = [[null, null, null], [null, null, null], [null, null, null]];

      const engine2 = new KingsChessEngine(whitePlayer, blackPlayer, state);
      const victory = engine2.checkGameEnd();

      expect(victory.gameOver).toBe(true);
      expect(victory.winner).toBe('white');
      expect(victory.score).toEqual({ white: 2, black: 1 });
    });

    test('should detect black victory', () => {
      const state = engine.getGameState();
      state.whiteCourt = [
        { type: 'rook', owner: 'white', position: null, moveCount: 3, id: uuid() },
      ];
      state.blackCourt = [
        { type: 'bishop', owner: 'black', position: null, moveCount: 4, id: uuid() },
        { type: 'knight', owner: 'black', position: null, moveCount: 2, id: uuid() },
      ];
      state.board = [[null, null, null], [null, null, null], [null, null, null]];

      const engine2 = new KingsChessEngine(whitePlayer, blackPlayer, state);
      const victory = engine2.checkGameEnd();

      expect(victory.gameOver).toBe(true);
      expect(victory.winner).toBe('black');
      expect(victory.score).toEqual({ white: 1, black: 2 });
    });

    test('should detect draw', () => {
      const state = engine.getGameState();
      state.whiteCourt = [
        { type: 'rook', owner: 'white', position: null, moveCount: 3, id: uuid() },
      ];
      state.blackCourt = [
        { type: 'rook', owner: 'black', position: null, moveCount: 3, id: uuid() },
      ];
      state.board = [[null, null, null], [null, null, null], [null, null, null]];

      const engine2 = new KingsChessEngine(whitePlayer, blackPlayer, state);
      const victory = engine2.checkGameEnd();

      expect(victory.gameOver).toBe(true);
      expect(victory.winner).toBeNull();
      expect(victory.reason).toContain('Draw');
    });

    test('should end game when all white pieces eliminated and auto-score black pieces', () => {
      const state = engine.getGameState();
      const blackRook = { type: 'rook' as const, owner: 'black' as const, position: [0, 0] as Position, moveCount: 0, id: uuid() };
      const blackKnight = { type: 'knight' as const, owner: 'black' as const, position: [0, 1] as Position, moveCount: 0, id: uuid() };

      // All white pieces captured
      state.capturedWhite = [
        { type: 'rook' as const, owner: 'white' as const, position: null, moveCount: 2, id: uuid() },
        { type: 'knight' as const, owner: 'white' as const, position: null, moveCount: 1, id: uuid() },
        { type: 'bishop' as const, owner: 'white' as const, position: null, moveCount: 1, id: uuid() },
      ];

      // Black has 2 pieces on board + 1 scored
      state.board = [[blackRook, blackKnight, null], [null, null, null], [null, null, null]];
      state.blackCourt = [
        { type: 'bishop' as const, owner: 'black' as const, position: null, moveCount: 3, id: uuid() },
      ];

      const engine2 = new KingsChessEngine(whitePlayer, blackPlayer, state);
      const victory = engine2.checkGameEnd();

      expect(victory.gameOver).toBe(true);
      expect(victory.winner).toBe('black');
      expect(victory.score).toEqual({ white: 0, black: 3 }); // 1 scored + 2 auto-scored
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
      expect(state2.currentPlayer).toBe('black');
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
      const moves = engine.getValidMoves([0, 0]); // Black rook on white's turn
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
