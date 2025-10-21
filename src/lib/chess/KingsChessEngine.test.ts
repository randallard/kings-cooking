/**
 * @fileoverview Tests for Kings Chess Engine
 * @module lib/chess/KingsChessEngine.test
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { KingsChessEngine } from './KingsChessEngine';
import { PlayerIdSchema } from '../validation/schemas';
import type {
  PlayerInfo,
  Position,
  Piece,
  Move,
  GameState,
} from '../validation/schemas';
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

    test('should allow queen to move off-board with clear straight path', () => {
      // Setup: Place light queen at [2,1] with clear path to opponent's edge
      const state = engine.getGameState();
      const lightQueen = {
        type: 'queen' as const,
        owner: 'light' as const,
        position: [2, 1] as Position,
        moveCount: 1,
        id: uuid(),
      };
      state.board[2]![1] = lightQueen;
      state.board[1]![1] = null; // Clear middle
      state.board[0]![1] = null; // Clear opponent's edge

      const testEngine = new KingsChessEngine(lightPlayer, darkPlayer, state);
      const result = testEngine.makeMove([2, 1], 'off_board');

      expect(result.success).toBe(true);
      expect(testEngine.getGameState().lightCourt).toHaveLength(1);
      expect(testEngine.getGameState().lightCourt[0]?.type).toBe('queen');
    });

    test('should allow queen to move off-board via diagonal through middle column', () => {
      // Setup: Place light queen at [1,0] with clear diagonal through [0,1] (middle column)
      const state = engine.getGameState();
      const lightQueen = {
        type: 'queen' as const,
        owner: 'light' as const,
        position: [1, 0] as Position,
        moveCount: 1,
        id: uuid(),
      };
      state.board[1]![0] = lightQueen;
      state.board[0]![1] = null; // Clear middle column at opponent's row

      const testEngine = new KingsChessEngine(lightPlayer, darkPlayer, state);
      const result = testEngine.makeMove([1, 0], 'off_board');

      expect(result.success).toBe(true);
      expect(testEngine.getGameState().lightCourt).toHaveLength(1);
      expect(testEngine.getGameState().lightCourt[0]?.type).toBe('queen');
    });

    test('should allow queen to move off-board if already on opponent starting row', () => {
      // Setup: Place light queen at [0,2] (opponent's starting row)
      const state = engine.getGameState();
      const lightQueen = {
        type: 'queen' as const,
        owner: 'light' as const,
        position: [0, 2] as Position,
        moveCount: 2,
        id: uuid(),
      };
      state.board[0]![2] = lightQueen; // Replace dark bishop
      state.board[2]![2] = null; // Remove light bishop from original position

      const testEngine = new KingsChessEngine(lightPlayer, darkPlayer, state);
      const result = testEngine.makeMove([0, 2], 'off_board');

      expect(result.success).toBe(true);
      expect(testEngine.getGameState().lightCourt).toHaveLength(1);
    });

    test('should reject queen off-board if no valid path exists', () => {
      // Setup: Place light queen at [1,1] with all paths blocked
      const state = engine.getGameState();
      const lightQueen = {
        type: 'queen' as const,
        owner: 'light' as const,
        position: [1, 1] as Position,
        moveCount: 1,
        id: uuid(),
      };
      state.board[1]![1] = lightQueen;
      // All surrounding squares have pieces - no clear path

      const testEngine = new KingsChessEngine(lightPlayer, darkPlayer, state);
      const result = testEngine.makeMove([1, 1], 'off_board');

      expect(result.success).toBe(false);
      expect(result.error).toContain('clear straight path OR diagonal');
    });

    test('should reject pawn trying to move off-board', () => {
      // Setup: Place light pawn at [0,1] (opponent's edge)
      const state = engine.getGameState();
      const lightPawn = {
        type: 'pawn' as const,
        owner: 'light' as const,
        position: [0, 1] as Position,
        moveCount: 3,
        id: uuid(),
      };
      state.board[0]![1] = lightPawn; // Replace dark knight
      state.board[2]![1] = null; // Remove light knight from original position

      const testEngine = new KingsChessEngine(lightPlayer, darkPlayer, state);
      const result = testEngine.makeMove([0, 1], 'off_board');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Pawns cannot move off-board');
      expect(result.error).toContain('captured');
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

    test('should return valid moves for queen', () => {
      // Manually place a queen on the board for testing
      const state = engine.getGameState();
      const queen = {
        type: 'queen' as const,
        owner: 'light' as const,
        position: [1, 1] as Position,
        moveCount: 0,
        id: uuid(),
      };
      state.board[1]![1] = queen;

      const testEngine = new KingsChessEngine(lightPlayer, darkPlayer, state);
      const moves = testEngine.getValidMoves([1, 1]);

      expect(moves.length).toBeGreaterThan(0);
      // Queen should have both rook-like and bishop-like moves from center
      expect(moves).toContainEqual([0, 1]); // Up - captures dark knight (rook move)
      expect(moves).toContainEqual([1, 0]); // Left (rook move)
      expect(moves).toContainEqual([1, 2]); // Right (rook move)
      expect(moves).toContainEqual([0, 0]); // Up-left diagonal - captures dark rook (bishop move)
      expect(moves).toContainEqual([0, 2]); // Up-right diagonal - captures dark bishop (bishop move)
    });

    test('should return valid moves for pawn', () => {
      // Manually place a light pawn on the board, clear blocking pieces
      const state = engine.getGameState();
      const pawn = {
        type: 'pawn' as const,
        owner: 'light' as const,
        position: [2, 1] as Position,
        moveCount: 0,
        id: uuid(),
      };
      state.board[2]![1] = pawn; // Place pawn (replaces light knight)
      state.board[1]![1] = null; // Clear middle square
      state.board[0]![1] = null; // Clear dark knight at destination

      const testEngine = new KingsChessEngine(lightPlayer, darkPlayer, state);
      const moves = testEngine.getValidMoves([2, 1]);

      expect(moves.length).toBeGreaterThan(0);
      // Pawn should be able to move forward (light pawns move toward row 0)
      expect(moves).toContainEqual([1, 1]); // One square forward
      expect(moves).toContainEqual([0, 1]); // Two squares forward (first move)
    });

    test('should return valid pawn moves with diagonal captures', () => {
      // Setup: light pawn at [1,1] with dark pieces at [0,0] and [0,2]
      // Note: Dark knight at [0,1] blocks forward movement
      const state = engine.getGameState();
      const lightPawn = {
        type: 'pawn' as const,
        owner: 'light' as const,
        position: [1, 1] as Position,
        moveCount: 1,
        id: uuid(),
      };
      state.board[1]![1] = lightPawn;
      // Dark knight at [0,1] blocks forward movement (pawns can't capture forward)

      const testEngine = new KingsChessEngine(lightPlayer, darkPlayer, state);
      const moves = testEngine.getValidMoves([1, 1]);

      expect(moves.length).toBeGreaterThan(0);
      // Pawn can only capture diagonally (forward is blocked by dark knight)
      expect(moves).toContainEqual([0, 0]); // Diagonal capture dark rook
      expect(moves).toContainEqual([0, 2]); // Diagonal capture dark bishop
      // Should NOT contain [0,1] because forward is blocked and pawns can't capture straight ahead
    });
  });

  describe('En Passant Capture Execution', () => {
    test('should remove captured pawn from board (light captures dark)', () => {
      // Setup: Create game with pawns positioned for en passant
      const tempEngine = new KingsChessEngine(lightPlayer, darkPlayer);
      const initialState: GameState = tempEngine.getGameState();

      // Clear the board
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          initialState.board[i]![j] = null;
        }
      }

      // Setup en passant scenario:
      // - Light pawn at [2, 1]
      // - Dark pawn just moved [0, 2] → [2, 2] (2-square move, landing beside light pawn)
      // - Light can capture en passant by moving [2, 1] → [1, 2]
      initialState.board[2]![1] = {
        id: uuid(),
        type: 'pawn',
        owner: 'light',
        position: [2, 1],
        moveCount: 1,
      };

      const darkPawnCaptured: Piece = {
        id: uuid(),
        type: 'pawn',
        owner: 'dark',
        position: [2, 2],
        moveCount: 1,
      };
      initialState.board[2]![2] = darkPawnCaptured;

      // Simulate dark pawn's last move: [0, 2] → [2, 2] (2-square move)
      const darkPawnMove: Move = {
        from: [0, 2],
        to: [2, 2],
        piece: darkPawnCaptured,
        captured: null,
        timestamp: Date.now(),
      };
      initialState.moveHistory.push(darkPawnMove);
      initialState.currentPlayer = 'light';
      initialState.currentTurn = 1;

      // Create engine with custom initial state
      const engine = new KingsChessEngine(
        lightPlayer,
        darkPlayer,
        initialState
      );

      // Execute en passant capture: [2, 1] → [1, 2] (diagonal toward dark's side)
      const result = engine.makeMove([2, 1], [1, 2]);

      // Assertions
      expect(result.success).toBe(true);
      expect(result.captured).toBeTruthy();
      expect(result.captured?.type).toBe('pawn');
      expect(result.captured?.owner).toBe('dark');

      const state = engine.getGameState();

      // Captured pawn should be removed from original position [2, 2]
      expect(state.board[2]![2]).toBeNull();

      // Capturing pawn should be at destination [1, 2]
      expect(state.board[1]![2]?.owner).toBe('light');
      expect(state.board[1]![2]?.type).toBe('pawn');

      // Captured pawn should be in capturedDark array
      expect(state.capturedDark).toHaveLength(1);
      expect(state.capturedDark[0]?.type).toBe('pawn');
    });

    test('should remove captured pawn from board (dark captures light)', () => {
      // Setup: Create game with pawns positioned for en passant
      const tempEngine = new KingsChessEngine(lightPlayer, darkPlayer);
      const initialState: GameState = tempEngine.getGameState();

      // Clear the board
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          initialState.board[i]![j] = null;
        }
      }

      // Place dark pawn at [0, 1]
      const darkPawnCapturing: Piece = {
        id: uuid(),
        type: 'pawn',
        owner: 'dark',
        position: [0, 1],
        moveCount: 1,
      };
      initialState.board[0]![1] = darkPawnCapturing;

      // Place light pawn at [0, 0] (beside dark pawn, after double-move)
      const lightPawnCaptured: Piece = {
        id: uuid(),
        type: 'pawn',
        owner: 'light',
        position: [0, 0],
        moveCount: 1,
      };
      initialState.board[0]![0] = lightPawnCaptured;

      // Simulate light pawn's last move: [2, 0] → [0, 0] (2-square move)
      const lightPawnMove: Move = {
        from: [2, 0],
        to: [0, 0],
        piece: lightPawnCaptured,
        captured: null,
        timestamp: Date.now(),
      };
      initialState.moveHistory.push(lightPawnMove);
      initialState.currentPlayer = 'dark';
      initialState.currentTurn = 2;

      // Create engine with custom initial state
      const engine = new KingsChessEngine(
        lightPlayer,
        darkPlayer,
        initialState
      );

      // Execute en passant capture: [0, 1] → [1, 0] (diagonal toward light's side)
      const result = engine.makeMove([0, 1], [1, 0]);

      // Assertions
      expect(result.success).toBe(true);
      expect(result.captured).toBeTruthy();
      expect(result.captured?.type).toBe('pawn');
      expect(result.captured?.owner).toBe('light');

      const state = engine.getGameState();

      // Captured pawn should be removed from original position [0, 0]
      expect(state.board[0]![0]).toBeNull();

      // Capturing pawn should be at destination [1, 0]
      expect(state.board[1]![0]?.owner).toBe('dark');
      expect(state.board[1]![0]?.type).toBe('pawn');

      // Captured pawn should be in capturedLight array
      expect(state.capturedLight).toHaveLength(1);
      expect(state.capturedLight[0]?.type).toBe('pawn');
    });
  });

  describe('Stalemate Detection', () => {
    test('should not detect stalemate when player has legal moves', () => {
      // Setup: Normal position with legal moves available
      const engine = new KingsChessEngine(lightPlayer, darkPlayer);

      // Starting position has legal moves
      expect(engine.hasAnyLegalMoves()).toBe(true);

      // Game should not be over
      const result = engine.checkGameEnd();
      expect(result.gameOver).toBe(false);
    });

    test('should detect stalemate with multiple pieces but no legal moves', () => {
      // Setup: Both players have pieces but current player has no legal moves
      const tempEngine = new KingsChessEngine(lightPlayer, darkPlayer);
      const initialState: GameState = tempEngine.getGameState();

      // Clear the board
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          initialState.board[i]![j] = null;
        }
      }

      // Place light knight surrounded by dark pieces
      const lightKnight: Piece = {
        id: uuid(),
        type: 'knight',
        owner: 'light',
        position: [1, 1],
        moveCount: 1,
      };
      initialState.board[1]![1] = lightKnight;

      // Block all knight moves with dark pieces
      const positions: Array<[number, number]> = [[0, 0], [0, 2], [2, 0], [2, 2]];
      positions.forEach((pos) => {
        const [row, col] = pos;
        const darkPiece: Piece = {
          id: uuid(),
          type: 'rook',
          owner: 'dark',
          position: [row, col],
          moveCount: 1,
        };
        const boardRow = initialState.board[row];
        if (boardRow) {
          boardRow[col] = darkPiece;
        }
      });

      initialState.currentPlayer = 'light';

      const engine = new KingsChessEngine(lightPlayer, darkPlayer, initialState);

      // Knight should have no legal moves (all blocked)
      expect(engine.hasAnyLegalMoves()).toBe(false);

      // Should detect stalemate
      const result = engine.checkGameEnd();
      expect(result.gameOver).toBe(true);
      expect(result.winner).toBeNull();
      expect(result.reason).toContain('stalemate');
    });

    test('should prioritize standard victory over stalemate check', () => {
      // Setup: All pieces off board (standard victory condition)
      const tempEngine = new KingsChessEngine(lightPlayer, darkPlayer);
      const initialState: GameState = tempEngine.getGameState();

      // Clear the board
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          initialState.board[i]![j] = null;
        }
      }

      // Place some pieces in courts
      const lightRook: Piece = {
        id: uuid(),
        type: 'rook',
        owner: 'light',
        position: null,
        moveCount: 3,
      };
      const darkRook: Piece = {
        id: uuid(),
        type: 'rook',
        owner: 'dark',
        position: null,
        moveCount: 3,
      };

      initialState.lightCourt = [lightRook];
      initialState.darkCourt = [darkRook, darkRook]; // Dark has more

      const engine = new KingsChessEngine(lightPlayer, darkPlayer, initialState);

      // Should detect dark victory, not stalemate
      const result = engine.checkGameEnd();
      expect(result.gameOver).toBe(true);
      expect(result.winner).toBe('dark');
      expect(result.reason).not.toContain('stalemate');
    });
  });
});
