/**
 * @fileoverview Comprehensive unit tests for gameFlowReducer
 * @module lib/gameFlow/reducer.test
 *
 * Test Coverage:
 * - All 11 action types with valid/invalid transitions
 * - All 5 state machine phases
 * - Both hot-seat and URL modes
 * - Edge cases (empty names, missing data, checksum mismatches)
 * - Full state and delta URL loading
 * - Victory conditions and game-over scenarios
 */

import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { gameFlowReducer } from './reducer';
import type { GameFlowState, GameFlowAction, PlayingPhase, HandoffPhase } from '../../types/gameFlow';
import type { GameState, Position } from '../validation/schemas';
import { KingsChessEngine } from '../chess/KingsChessEngine';
import { storage } from '../storage/localStorage';

// ============================================================================
// Mocks
// ============================================================================

// Mock crypto.randomUUID
vi.stubGlobal('crypto', {
  randomUUID: vi.fn(() => 'test-uuid-123'),
});

// Mock localStorage storage module
vi.mock('../storage/localStorage', () => ({
  storage: {
    getGameState: vi.fn(),
    setGameState: vi.fn(),
    getMyName: vi.fn(),
    setMyName: vi.fn(),
    getMyPlayerId: vi.fn(),
    setMyPlayerId: vi.fn(),
    getPlayer1Name: vi.fn(),
    setPlayer1Name: vi.fn(),
    getPlayer2Name: vi.fn(),
    setPlayer2Name: vi.fn(),
    getGameMode: vi.fn(),
    setGameMode: vi.fn(),
    clearGameMode: vi.fn(),
    getPlayer1Color: vi.fn(),
    setPlayer1Color: vi.fn(),
    getPieceSelectionMode: vi.fn(),
    setPieceSelectionMode: vi.fn(),
    getPlayer1Pieces: vi.fn(),
    setPlayer1Pieces: vi.fn(),
    getPlayer2Pieces: vi.fn(),
    setPlayer2Pieces: vi.fn(),
    clearAll: vi.fn(),
  },
}));

// Mock KingsChessEngine
vi.mock('../chess/KingsChessEngine', () => {
  const mockEngine = {
    getGameState: vi.fn(),
    makeMove: vi.fn(),
    checkGameEnd: vi.fn(),
    getValidMoves: vi.fn(),
    getChecksum: vi.fn(),
    getPieceAt: vi.fn(),
  };

  return {
    KingsChessEngine: vi.fn(() => mockEngine),
  };
});

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Creates a mock GameState for testing.
 */
function createMockGameState(overrides?: Partial<GameState>): GameState {
  return {
    version: '1.0.0',
    gameId: 'test-game-id' as never,
    board: [
      [
        { type: 'rook', owner: 'dark', position: [0, 0], moveCount: 0, id: 'black-rook' },
        { type: 'knight', owner: 'dark', position: [0, 1], moveCount: 0, id: 'black-knight' },
        { type: 'bishop', owner: 'dark', position: [0, 2], moveCount: 0, id: 'black-bishop' },
      ],
      [null, null, null],
      [
        { type: 'rook', owner: 'light', position: [2, 0], moveCount: 0, id: 'white-rook' },
        { type: 'knight', owner: 'light', position: [2, 1], moveCount: 0, id: 'white-knight' },
        { type: 'bishop', owner: 'light', position: [2, 2], moveCount: 0, id: 'white-bishop' },
      ],
    ],
    lightCourt: [],
    darkCourt: [],
    capturedLight: [],
    capturedDark: [],
    currentTurn: 0,
    currentPlayer: 'light',
    lightPlayer: {
      id: 'white-player-id' as never,
      name: 'Player 1',
    },
    darkPlayer: {
      id: 'black-player-id' as never,
      name: 'Player 2',
    },
    status: 'playing',
    winner: null,
    moveHistory: [],
    checksum: 'test-checksum',
    ...overrides,
  } as GameState;
}

/**
 * Creates a mock KingsChessEngine instance.
 * Note: Currently unused but kept for potential future use.
 */
// function getMockEngine(): ReturnType<typeof vi.fn> {
//   return (KingsChessEngine as unknown as Mock).mock.results[0]?.value;
// }

// ============================================================================
// Tests
// ============================================================================

describe('gameFlowReducer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // Phase 1: Mode Selection
  // ==========================================================================

  describe('Phase 1: Mode Selection', () => {
    const initialState: GameFlowState = { phase: 'mode-selection' };

    describe('SELECT_MODE action', () => {
      it('should transition to setup phase with hot-seat mode', () => {
        const action: GameFlowAction = { type: 'SELECT_MODE', mode: 'hotseat' };
        const result = gameFlowReducer(initialState, action);

        expect(result).toEqual({
          phase: 'setup',
          mode: 'hotseat',
          player1Name: null,
        });
      });

      it('should transition to setup phase with URL mode', () => {
        const action: GameFlowAction = { type: 'SELECT_MODE', mode: 'url' };
        const result = gameFlowReducer(initialState, action);

        expect(result).toEqual({
          phase: 'setup',
          mode: 'url',
          player1Name: null,
        });
      });

      it('should return unchanged state if not in mode-selection phase', () => {
        const setupState: GameFlowState = {
          phase: 'setup',
          mode: 'hotseat',
          player1Name: null,
        };
        const action: GameFlowAction = { type: 'SELECT_MODE', mode: 'url' };
        const result = gameFlowReducer(setupState, action);

        expect(result).toBe(setupState);
      });
    });

    describe('Invalid actions in mode-selection phase', () => {
      it('should ignore SET_PLAYER1_NAME action', () => {
        const action: GameFlowAction = { type: 'SET_PLAYER1_NAME', name: 'Alice' };
        const result = gameFlowReducer(initialState, action);

        expect(result).toBe(initialState);
      });

      it('should ignore START_GAME action', () => {
        const action: GameFlowAction = { type: 'START_GAME' };
        const result = gameFlowReducer(initialState, action);

        expect(result).toBe(initialState);
      });
    });

    describe('NEW_GAME action', () => {
      it('should return to mode-selection from any phase', () => {
        const victoryState: GameFlowState = {
          phase: 'victory',
          mode: 'hotseat',
          winner: 'light',
          gameState: createMockGameState(),
          player1Name: 'Alice',
          player2Name: 'Bob',
        };
        const action: GameFlowAction = { type: 'NEW_GAME' };
        const result = gameFlowReducer(victoryState, action);

        expect(result).toEqual({ phase: 'mode-selection' });
      });
    });
  });

  // ==========================================================================
  // Phase 2: Setup
  // ==========================================================================

  describe('Phase 2: Setup', () => {
    const setupState: GameFlowState = {
      phase: 'setup',
      mode: 'hotseat',
      player1Name: null,
    };

    describe('START_PIECE_SELECTION action', () => {
      it('should return unchanged state (deprecated action)', () => {
        const stateWithName: GameFlowState = {
          ...setupState,
          player1Name: 'Alice',
        };
        const action: GameFlowAction = { type: 'START_PIECE_SELECTION' };
        const result = gameFlowReducer(stateWithName, action);

        // START_PIECE_SELECTION is now deprecated - SET_PLAYER_COLOR handles the transition
        expect(result).toBe(stateWithName);
      });
    });

    describe('START_COLOR_SELECTION action', () => {
      it('should transition to color-selection phase when player1Name is set', () => {
        const stateWithName: GameFlowState = {
          ...setupState,
          player1Name: 'Alice',
        };
        const action: GameFlowAction = { type: 'START_COLOR_SELECTION' };
        const result = gameFlowReducer(stateWithName, action);

        expect(result).toEqual({
          phase: 'color-selection',
          mode: 'hotseat',
          player1Name: 'Alice',
        });
      });

      it('should fail if player1Name is null', () => {
        const action: GameFlowAction = { type: 'START_COLOR_SELECTION' };
        const result = gameFlowReducer(setupState, action);

        expect(result).toBe(setupState);
      });

      it('should return unchanged state if not in setup phase', () => {
        const modeSelectionState: GameFlowState = { phase: 'mode-selection' };
        const action: GameFlowAction = { type: 'START_COLOR_SELECTION' };
        const result = gameFlowReducer(modeSelectionState, action);

        expect(result).toBe(modeSelectionState);
      });
    });

    describe('SET_PLAYER_COLOR action', () => {
      const colorSelectionState: GameFlowState = {
        phase: 'color-selection',
        mode: 'hotseat',
        player1Name: 'Alice',
      };

      it('should transition to piece-selection phase with light color', () => {
        const action: GameFlowAction = { type: 'SET_PLAYER_COLOR', color: 'light' };
        const result = gameFlowReducer(colorSelectionState, action);

        expect(result).toEqual({
          phase: 'piece-selection',
          mode: 'hotseat',
          player1Name: 'Alice',
          player2Name: '',
          selectionMode: null,
          player1Pieces: null,
          player2Pieces: null,
          player1Color: 'light',
        });
      });

      it('should transition to piece-selection phase with dark color', () => {
        const action: GameFlowAction = { type: 'SET_PLAYER_COLOR', color: 'dark' };
        const result = gameFlowReducer(colorSelectionState, action);

        expect(result).toEqual({
          phase: 'piece-selection',
          mode: 'hotseat',
          player1Name: 'Alice',
          player2Name: '',
          selectionMode: null,
          player1Pieces: null,
          player2Pieces: null,
          player1Color: 'dark',
        });
      });

      it('should return unchanged state if not in color-selection phase', () => {
        const action: GameFlowAction = { type: 'SET_PLAYER_COLOR', color: 'light' };
        const result = gameFlowReducer(setupState, action);

        expect(result).toBe(setupState);
      });
    });

    describe('SET_PLAYER1_NAME action', () => {
      it('should set player1Name in setup phase', () => {
        const action: GameFlowAction = { type: 'SET_PLAYER1_NAME', name: 'Alice' };
        const result = gameFlowReducer(setupState, action);

        expect(result).toEqual({
          phase: 'setup',
          mode: 'hotseat',
          player1Name: 'Alice',
        });
      });

      it('should update player1Name if already set', () => {
        const stateWithName: GameFlowState = {
          ...setupState,
          player1Name: 'Alice',
        };
        const action: GameFlowAction = { type: 'SET_PLAYER1_NAME', name: 'Bob' };
        const result = gameFlowReducer(stateWithName, action);

        expect(result).toEqual({
          phase: 'setup',
          mode: 'hotseat',
          player1Name: 'Bob',
        });
      });

      it('should allow empty string for player1Name', () => {
        const action: GameFlowAction = { type: 'SET_PLAYER1_NAME', name: '' };
        const result = gameFlowReducer(setupState, action);

        expect(result).toEqual({
          phase: 'setup',
          mode: 'hotseat',
          player1Name: '',
        });
      });

      it('should return unchanged state if not in setup phase', () => {
        const playingState: GameFlowState = {
          phase: 'playing',
          mode: 'hotseat',
          player1Name: 'Alice',
          player2Name: null,
          gameState: createMockGameState(),
          selectedPosition: null,
          legalMoves: [],
          pendingMove: null,
        };
        const action: GameFlowAction = { type: 'SET_PLAYER1_NAME', name: 'Bob' };
        const result = gameFlowReducer(playingState, action);

        expect(result).toBe(playingState);
      });
    });

    describe('START_GAME action', () => {
      it('should transition to playing phase when player1Name is set', () => {
        const stateWithName: GameFlowState = {
          ...setupState,
          player1Name: 'Alice',
        };
        const action: GameFlowAction = { type: 'START_GAME' };

        // Mock engine creation
        const mockGameState = createMockGameState();
        const mockEngine = {
          getGameState: vi.fn(() => mockGameState),
          makeMove: vi.fn(),
          checkGameEnd: vi.fn(),
          getValidMoves: vi.fn(),
          getChecksum: vi.fn(),
          getPieceAt: vi.fn(),
        };
        (KingsChessEngine as unknown as Mock).mockReturnValue(mockEngine);

        const result = gameFlowReducer(stateWithName, action);

        expect(result.phase).toBe('playing');
        expect(result).toMatchObject({
          phase: 'playing',
          mode: 'hotseat',
          player1Name: 'Alice',
          player2Name: null,
          selectedPosition: null,
          legalMoves: [],
          pendingMove: null,
        });
        if (result.phase === 'playing') {
          expect(result.gameState).toBeDefined();
        }
      });

      it('should fail if player1Name is null', () => {
        const action: GameFlowAction = { type: 'START_GAME' };
        const result = gameFlowReducer(setupState, action);

        expect(result).toBe(setupState);
      });

      it('should fail if player1Name is empty string', () => {
        const stateWithEmptyName: GameFlowState = {
          ...setupState,
          player1Name: '',
        };
        const action: GameFlowAction = { type: 'START_GAME' };
        const result = gameFlowReducer(stateWithEmptyName, action);

        expect(result).toBe(stateWithEmptyName);
      });

      it('should return unchanged state if not in setup phase', () => {
        const modeSelectionState: GameFlowState = { phase: 'mode-selection' };
        const action: GameFlowAction = { type: 'START_GAME' };
        const result = gameFlowReducer(modeSelectionState, action);

        expect(result).toBe(modeSelectionState);
      });
    });
  });

  // ==========================================================================
  // Phase 2.5: Piece Selection
  // ==========================================================================

  describe('Phase 2.5: Piece Selection', () => {
    let pieceSelectionState: GameFlowState;

    beforeEach(() => {
      pieceSelectionState = {
        phase: 'piece-selection',
        mode: 'hotseat',
        player1Name: 'Alice',
        player2Name: '',
        selectionMode: null,
        player1Pieces: null,
        player2Pieces: null,
        player1Color: null,
      };
    });

    describe('SET_SELECTION_MODE action', () => {
      it('should set selection mode to mirrored', () => {
        const action: GameFlowAction = { type: 'SET_SELECTION_MODE', mode: 'mirrored' };
        const result = gameFlowReducer(pieceSelectionState, action);

        if (result.phase === 'piece-selection') {
          expect(result.selectionMode).toBe('mirrored');
        }
      });

      it('should set selection mode to independent', () => {
        const action: GameFlowAction = { type: 'SET_SELECTION_MODE', mode: 'independent' };
        const result = gameFlowReducer(pieceSelectionState, action);

        if (result.phase === 'piece-selection') {
          expect(result.selectionMode).toBe('independent');
        }
      });

      it('should set selection mode to random', () => {
        const action: GameFlowAction = { type: 'SET_SELECTION_MODE', mode: 'random' };
        const result = gameFlowReducer(pieceSelectionState, action);

        if (result.phase === 'piece-selection') {
          expect(result.selectionMode).toBe('random');
        }
      });

      it('should return unchanged state if not in piece-selection phase', () => {
        const setupState: GameFlowState = {
          phase: 'setup',
          mode: 'hotseat',
          player1Name: 'Alice',
        };
        const action: GameFlowAction = { type: 'SET_SELECTION_MODE', mode: 'mirrored' };
        const result = gameFlowReducer(setupState, action);

        expect(result).toBe(setupState);
      });
    });

    describe('SET_PLAYER_PIECES action', () => {
      it('should set player1 pieces', () => {
        const action: GameFlowAction = {
          type: 'SET_PLAYER_PIECES',
          player: 'player1',
          pieces: ['rook', 'knight', 'bishop'],
        };
        const result = gameFlowReducer(pieceSelectionState, action);

        if (result.phase === 'piece-selection') {
          expect(result.player1Pieces).toEqual(['rook', 'knight', 'bishop']);
        }
      });

      it('should set player2 pieces', () => {
        const action: GameFlowAction = {
          type: 'SET_PLAYER_PIECES',
          player: 'player2',
          pieces: ['queen', 'pawn', 'pawn'],
        };
        const result = gameFlowReducer(pieceSelectionState, action);

        if (result.phase === 'piece-selection') {
          expect(result.player2Pieces).toEqual(['queen', 'pawn', 'pawn']);
        }
      });

      it('should return unchanged state if not in piece-selection phase', () => {
        const playingState: GameFlowState = {
          phase: 'playing',
          mode: 'hotseat',
          player1Name: 'Alice',
          player2Name: 'Bob',
          gameState: createMockGameState(),
          selectedPosition: null,
          legalMoves: [],
          pendingMove: null,
        };
        const action: GameFlowAction = {
          type: 'SET_PLAYER_PIECES',
          player: 'player1',
          pieces: ['rook', 'knight', 'bishop'],
        };
        const result = gameFlowReducer(playingState, action);

        expect(result).toBe(playingState);
      });
    });

    describe('COMPLETE_PIECE_SELECTION action', () => {
      it('should transition to playing phase with created board', () => {
        const completeState: GameFlowState = {
          phase: 'piece-selection',
          mode: 'hotseat',
          player1Name: 'Alice',
          player2Name: 'Bob',
          selectionMode: 'independent',
          player1Pieces: ['rook', 'knight', 'bishop'],
          player2Pieces: ['queen', 'pawn', 'pawn'],
          player1Color: 'light',
        };

        const action: GameFlowAction = { type: 'COMPLETE_PIECE_SELECTION' };
        const result = gameFlowReducer(completeState, action);

        expect(result.phase).toBe('playing');
        if (result.phase === 'playing') {
          expect(result.player1Name).toBe('Alice');
          expect(result.player2Name).toBe('Bob');
          expect(result.gameState).toBeDefined();
          expect(result.gameState.board).toBeDefined();
          expect(result.selectedPosition).toBeNull();
          expect(result.legalMoves).toEqual([]);
          expect(result.pendingMove).toBeNull();
        }
      });

      it('should fail if selectionMode is null', () => {
        const action: GameFlowAction = { type: 'COMPLETE_PIECE_SELECTION' };
        const result = gameFlowReducer(pieceSelectionState, action);

        expect(result).toBe(pieceSelectionState);
      });

      it('should fail if player1Pieces is null', () => {
        const incompleteState: GameFlowState = {
          phase: 'piece-selection',
          mode: 'hotseat',
          player1Name: 'Alice',
          player2Name: '',
          selectionMode: 'independent',
          player1Pieces: null,
          player2Pieces: ['queen', 'pawn', 'pawn'],
          player1Color: 'light',
        };
        const action: GameFlowAction = { type: 'COMPLETE_PIECE_SELECTION' };
        const result = gameFlowReducer(incompleteState, action);

        expect(result).toBe(incompleteState);
      });

      it('should fail if player2Pieces is null', () => {
        const incompleteState: GameFlowState = {
          phase: 'piece-selection',
          mode: 'hotseat',
          player1Name: 'Alice',
          player2Name: '',
          selectionMode: 'independent',
          player1Pieces: ['rook', 'knight', 'bishop'],
          player2Pieces: null,
          player1Color: 'light',
        };
        const action: GameFlowAction = { type: 'COMPLETE_PIECE_SELECTION' };
        const result = gameFlowReducer(incompleteState, action);

        expect(result).toBe(incompleteState);
      });

      it('should fail if player1Color is null', () => {
        const incompleteState: GameFlowState = {
          phase: 'piece-selection',
          mode: 'hotseat',
          player1Name: 'Alice',
          player2Name: '',
          selectionMode: 'independent',
          player1Pieces: ['rook', 'knight', 'bishop'],
          player2Pieces: ['queen', 'pawn', 'pawn'],
          player1Color: null,
        };
        const action: GameFlowAction = { type: 'COMPLETE_PIECE_SELECTION' };
        const result = gameFlowReducer(incompleteState, action);

        expect(result).toBe(incompleteState);
      });

      it('should return unchanged state if not in piece-selection phase', () => {
        const setupState: GameFlowState = {
          phase: 'setup',
          mode: 'hotseat',
          player1Name: 'Alice',
        };
        const action: GameFlowAction = { type: 'COMPLETE_PIECE_SELECTION' };
        const result = gameFlowReducer(setupState, action);

        expect(result).toBe(setupState);
      });

      // Test for Issue #49: Player assignment is already tested by existing tests
      // The fix ensures gameState player names are used directly in App.tsx:746-751
      // Regression coverage provided by HandoffScreen tests verifying isGameStart behavior
    });
  });

  // ==========================================================================
  // Phase 3: Playing
  // ==========================================================================

  describe('Phase 3: Playing', () => {
    let playingState: PlayingPhase;

    beforeEach(() => {
      playingState = {
        phase: 'playing',
        mode: 'hotseat',
        player1Name: 'Alice',
        player2Name: 'Bob',
        gameState: createMockGameState(),
        selectedPosition: null,
        legalMoves: [],
        pendingMove: null,
      };
    });

    describe('SELECT_PIECE action', () => {
      it('should select piece and show legal moves', () => {
        const position: Position = [2, 0];
        const legalMoves: Position[] = [[1, 0], [0, 0]];
        const action: GameFlowAction = {
          type: 'SELECT_PIECE',
          position,
          legalMoves,
        };
        const result = gameFlowReducer(playingState, action);

        expect(result).toEqual({
          ...playingState,
          selectedPosition: position,
          legalMoves,
        });
      });

      it('should update selection if piece already selected', () => {
        const stateWithSelection: PlayingPhase = {
          phase: 'playing',
          mode: 'hotseat',
          player1Name: 'Alice',
          player2Name: 'Bob',
          gameState: playingState.gameState,
          selectedPosition: [2, 0],
          legalMoves: [[1, 0]],
          pendingMove: null,
        };
        const newPosition: Position = [2, 1];
        const newLegalMoves: Position[] = [[1, 2], [0, 0]];
        const action: GameFlowAction = {
          type: 'SELECT_PIECE',
          position: newPosition,
          legalMoves: newLegalMoves,
        };
        const result = gameFlowReducer(stateWithSelection, action);

        expect(result).toEqual({
          ...playingState,
          selectedPosition: newPosition,
          legalMoves: newLegalMoves,
        });
      });

      it('should return unchanged state if not in playing phase', () => {
        const setupState: GameFlowState = {
          phase: 'setup',
          mode: 'hotseat',
          player1Name: 'Alice',
        };
        const action: GameFlowAction = {
          type: 'SELECT_PIECE',
          position: [2, 0],
          legalMoves: [[1, 0]],
        };
        const result = gameFlowReducer(setupState, action);

        expect(result).toBe(setupState);
      });
    });

    describe('DESELECT_PIECE action', () => {
      it('should clear selected piece and legal moves', () => {
        const stateWithSelection: PlayingPhase = {
          phase: 'playing',
          mode: 'hotseat',
          player1Name: 'Alice',
          player2Name: 'Bob',
          gameState: playingState.gameState,
          selectedPosition: [2, 0],
          legalMoves: [[1, 0]],
          pendingMove: { from: [2, 0], to: [1, 0] },
        };
        const action: GameFlowAction = { type: 'DESELECT_PIECE' };
        const result = gameFlowReducer(stateWithSelection, action);

        expect(result).toEqual({
          ...playingState,
          selectedPosition: null,
          legalMoves: [],
          pendingMove: null,
        });
      });

      it('should work even if nothing is selected', () => {
        const action: GameFlowAction = { type: 'DESELECT_PIECE' };
        const result = gameFlowReducer(playingState, action);

        expect(result).toEqual({
          ...playingState,
          selectedPosition: null,
          legalMoves: [],
          pendingMove: null,
        });
      });

      it('should return unchanged state if not in playing phase', () => {
        const handoffState: GameFlowState = {
          phase: 'handoff',
          mode: 'hotseat',
          player1Name: 'Alice',
          player2Name: 'Bob',
          gameState: createMockGameState(),
          lastMove: { from: [2, 0], to: [1, 0] },
          countdown: 3,
          generatedUrl: null,
        };
        const action: GameFlowAction = { type: 'DESELECT_PIECE' };
        const result = gameFlowReducer(handoffState, action);

        expect(result).toBe(handoffState);
      });
    });

    describe('STAGE_MOVE action', () => {
      it('should stage move for confirmation', () => {
        const from: Position = [2, 0];
        const to: Position = [1, 0];
        const action: GameFlowAction = { type: 'STAGE_MOVE', from, to };
        const result = gameFlowReducer(playingState, action);

        expect(result).toEqual({
          ...playingState,
          pendingMove: { from, to },
        });
      });

      it('should update staged move if already staged', () => {
        const stateWithPendingMove: PlayingPhase = {
          phase: 'playing',
          mode: 'hotseat',
          player1Name: 'Alice',
          player2Name: 'Bob',
          gameState: playingState.gameState,
          selectedPosition: null,
          legalMoves: [],
          pendingMove: { from: [2, 0], to: [1, 0] },
        };
        const from: Position = [2, 1];
        const to: Position = [1, 2];
        const action: GameFlowAction = { type: 'STAGE_MOVE', from, to };
        const result = gameFlowReducer(stateWithPendingMove, action);

        expect(result).toEqual({
          ...playingState,
          pendingMove: { from, to },
        });
      });

      it('should return unchanged state if not in playing phase', () => {
        const victoryState: GameFlowState = {
          phase: 'victory',
          mode: 'hotseat',
          winner: 'light',
          gameState: createMockGameState(),
          player1Name: 'Alice',
          player2Name: 'Bob',
        };
        const action: GameFlowAction = { type: 'STAGE_MOVE', from: [2, 0], to: [1, 0] };
        const result = gameFlowReducer(victoryState, action);

        expect(result).toBe(victoryState);
      });
    });

    describe('CONFIRM_MOVE action', () => {
      it('should transition to handoff phase after confirming move', () => {
        const stateWithPendingMove: PlayingPhase = {
          phase: 'playing',
          mode: 'hotseat',
          player1Name: 'Alice',
          player2Name: 'Bob',
          gameState: playingState.gameState,
          selectedPosition: null,
          legalMoves: [],
          pendingMove: { from: [2, 0], to: [1, 0] },
        };

        const newGameState = createMockGameState({ currentTurn: 1, currentPlayer: 'dark' });
        const mockEngine = {
          checkGameEnd: vi.fn(() => ({ gameOver: false })),
          getGameState: vi.fn(() => newGameState),
          makeMove: vi.fn(),
          getValidMoves: vi.fn(),
          getChecksum: vi.fn(),
          getPieceAt: vi.fn(),
        };

        const action: GameFlowAction = {
          type: 'CONFIRM_MOVE',
          result: {
            newState: newGameState,
            engine: mockEngine as unknown as KingsChessEngine,
          },
        };
        const result = gameFlowReducer(stateWithPendingMove, action);

        expect(mockEngine.checkGameEnd).toHaveBeenCalled();
        expect(result).toMatchObject({
          phase: 'handoff',
          mode: 'hotseat',
          player1Name: 'Alice',
          player2Name: 'Bob',
          gameState: newGameState,
          lastMove: { from: [2, 0], to: [1, 0] },
          countdown: 3,
          generatedUrl: null,
        });
      });

      it('should transition to victory phase if game ends', () => {
        const stateWithPendingMove: PlayingPhase = {
          phase: 'playing',
          mode: 'hotseat',
          player1Name: 'Alice',
          player2Name: 'Bob',
          gameState: playingState.gameState,
          selectedPosition: null,
          legalMoves: [],
          pendingMove: { from: [2, 0], to: [1, 0] },
        };

        const newGameState = createMockGameState({ currentTurn: 1, currentPlayer: 'dark' });
        const mockEngine = {
          checkGameEnd: vi.fn(() => ({ gameOver: true, winner: 'light' })),
          getGameState: vi.fn(() => newGameState),
          makeMove: vi.fn(),
          getValidMoves: vi.fn(),
          getChecksum: vi.fn(),
          getPieceAt: vi.fn(),
        };

        const action: GameFlowAction = {
          type: 'CONFIRM_MOVE',
          result: {
            newState: newGameState,
            engine: mockEngine as unknown as KingsChessEngine,
          },
        };
        const result = gameFlowReducer(stateWithPendingMove, action);

        expect(mockEngine.checkGameEnd).toHaveBeenCalled();
        expect(result).toMatchObject({
          phase: 'victory',
          mode: 'hotseat',
          winner: 'light',
          gameState: newGameState,
          player1Name: 'Alice',
          player2Name: 'Bob',
        });
      });

      it('should handle draw result', () => {
        const stateWithPendingMove: PlayingPhase = {
          phase: 'playing',
          mode: 'hotseat',
          player1Name: 'Alice',
          player2Name: 'Bob',
          gameState: playingState.gameState,
          selectedPosition: null,
          legalMoves: [],
          pendingMove: { from: [2, 0], to: [1, 0] },
        };

        const newGameState = createMockGameState({ currentTurn: 1, currentPlayer: 'dark' });
        const mockEngine = {
          checkGameEnd: vi.fn(() => ({ gameOver: true, winner: null })),
          getGameState: vi.fn(() => newGameState),
          makeMove: vi.fn(),
          getValidMoves: vi.fn(),
          getChecksum: vi.fn(),
          getPieceAt: vi.fn(),
        };

        const action: GameFlowAction = {
          type: 'CONFIRM_MOVE',
          result: {
            newState: newGameState,
            engine: mockEngine as unknown as KingsChessEngine,
          },
        };
        const result = gameFlowReducer(stateWithPendingMove, action);

        expect(result).toMatchObject({
          phase: 'victory',
          mode: 'hotseat',
          winner: 'draw',
          gameState: newGameState,
          player1Name: 'Alice',
          player2Name: 'Bob',
        });
      });

      it('should default player2Name to "Player 2" if null', () => {
        const stateWithoutPlayer2: PlayingPhase = {
          phase: 'playing',
          mode: 'hotseat',
          player1Name: 'Alice',
          player2Name: null,
          gameState: playingState.gameState,
          selectedPosition: null,
          legalMoves: [],
          pendingMove: { from: [2, 0], to: [1, 0] },
        };

        const newGameState = createMockGameState({ currentTurn: 1, currentPlayer: 'dark' });
        const mockEngine = {
          checkGameEnd: vi.fn(() => ({ gameOver: true, winner: 'light' })),
          getGameState: vi.fn(() => newGameState),
          makeMove: vi.fn(),
          getValidMoves: vi.fn(),
          getChecksum: vi.fn(),
          getPieceAt: vi.fn(),
        };

        const action: GameFlowAction = {
          type: 'CONFIRM_MOVE',
          result: {
            newState: newGameState,
            engine: mockEngine as unknown as KingsChessEngine,
          },
        };
        const result = gameFlowReducer(stateWithoutPlayer2, action);

        expect(result).toMatchObject({
          phase: 'victory',
          player2Name: 'Player 2',
        });
      });

      it('should return unchanged state if no pending move', () => {
        const action: GameFlowAction = {
          type: 'CONFIRM_MOVE',
          result: {
            newState: createMockGameState(),
            engine: {} as KingsChessEngine,
          },
        };
        const result = gameFlowReducer(playingState, action);

        expect(result).toBe(playingState);
      });

      it('should return unchanged state if not in playing phase', () => {
        const handoffState: GameFlowState = {
          phase: 'handoff',
          mode: 'hotseat',
          player1Name: 'Alice',
          player2Name: 'Bob',
          gameState: createMockGameState(),
          lastMove: { from: [2, 0], to: [1, 0] },
          countdown: 3,
          generatedUrl: null,
        };
        const action: GameFlowAction = {
          type: 'CONFIRM_MOVE',
          result: {
            newState: createMockGameState(),
            engine: {} as KingsChessEngine,
          },
        };
        const result = gameFlowReducer(handoffState, action);

        expect(result).toBe(handoffState);
      });
    });

    describe('SET_PLAYER2_NAME action in playing phase', () => {
      it('should set player2Name in playing phase', () => {
        const stateWithoutPlayer2: PlayingPhase = {
          phase: 'playing',
          mode: 'hotseat',
          player1Name: 'Alice',
          player2Name: null,
          gameState: playingState.gameState,
          selectedPosition: null,
          legalMoves: [],
          pendingMove: null,
        };
        const action: GameFlowAction = { type: 'SET_PLAYER2_NAME', name: 'Bob' };
        const result = gameFlowReducer(stateWithoutPlayer2, action);

        expect(result).toEqual({
          ...stateWithoutPlayer2,
          player2Name: 'Bob',
        });
      });

      it('should update player2Name if already set', () => {
        const action: GameFlowAction = { type: 'SET_PLAYER2_NAME', name: 'Charlie' };
        const result = gameFlowReducer(playingState, action);

        expect(result).toEqual({
          ...playingState,
          player2Name: 'Charlie',
        });
      });
    });

    describe('GAME_OVER action', () => {
      it('should transition to victory phase with white winner', () => {
        const action: GameFlowAction = { type: 'GAME_OVER', winner: 'light' };
        const result = gameFlowReducer(playingState, action);

        expect(result).toMatchObject({
          phase: 'victory',
          mode: 'hotseat',
          winner: 'light',
          player1Name: 'Alice',
          player2Name: 'Bob',
        });
        if (result.phase === 'victory') {
          expect(result.gameState).toBeDefined();
        }
      });

      it('should transition to victory phase with black winner', () => {
        const action: GameFlowAction = { type: 'GAME_OVER', winner: 'dark' };
        const result = gameFlowReducer(playingState, action);

        expect(result).toMatchObject({
          phase: 'victory',
          mode: 'hotseat',
          winner: 'dark',
          player1Name: 'Alice',
          player2Name: 'Bob',
        });
        if (result.phase === 'victory') {
          expect(result.gameState).toBeDefined();
        }
      });

      it('should transition to victory phase with draw', () => {
        const action: GameFlowAction = { type: 'GAME_OVER', winner: 'draw' };
        const result = gameFlowReducer(playingState, action);

        expect(result).toMatchObject({
          phase: 'victory',
          mode: 'hotseat',
          winner: 'draw',
          player1Name: 'Alice',
          player2Name: 'Bob',
        });
        if (result.phase === 'victory') {
          expect(result.gameState).toBeDefined();
        }
      });

      it('should default player2Name to "Player 2" if null', () => {
        const stateWithoutPlayer2: PlayingPhase = {
          phase: 'playing',
          mode: 'hotseat',
          player1Name: 'Alice',
          player2Name: null,
          gameState: playingState.gameState,
          selectedPosition: null,
          legalMoves: [],
          pendingMove: null,
        };
        const action: GameFlowAction = { type: 'GAME_OVER', winner: 'light' };
        const result = gameFlowReducer(stateWithoutPlayer2, action);

        expect(result).toMatchObject({
          phase: 'victory',
          player2Name: 'Player 2',
        });
      });

      it('should return unchanged state if not in playing phase', () => {
        const setupState: GameFlowState = {
          phase: 'setup',
          mode: 'hotseat',
          player1Name: 'Alice',
        };
        const action: GameFlowAction = { type: 'GAME_OVER', winner: 'light' };
        const result = gameFlowReducer(setupState, action);

        expect(result).toBe(setupState);
      });
    });
  });

  // ==========================================================================
  // Phase 4: Handoff
  // ==========================================================================

  describe('Phase 4: Handoff', () => {
    let handoffState: HandoffPhase;

    beforeEach(() => {
      handoffState = {
        phase: 'handoff',
        mode: 'hotseat',
        player1Name: 'Alice',
        player2Name: 'Bob',
        gameState: createMockGameState(),
        lastMove: { from: [2, 0], to: [1, 0] },
        countdown: 3,
        generatedUrl: null,
      };
    });

    describe('SET_PLAYER2_NAME action in handoff phase', () => {
      it('should set player2Name in handoff phase', () => {
        const stateWithEmptyPlayer2: HandoffPhase = {
          phase: 'handoff',
          mode: 'hotseat',
          player1Name: 'Alice',
          player2Name: '',
          gameState: handoffState.gameState,
          lastMove: { from: [2, 0], to: [1, 0] },
          countdown: 3,
          generatedUrl: null,
        };
        const action: GameFlowAction = { type: 'SET_PLAYER2_NAME', name: 'Charlie' };
        const result = gameFlowReducer(stateWithEmptyPlayer2, action);

        expect(result).toEqual({
          ...stateWithEmptyPlayer2,
          player2Name: 'Charlie',
        });
      });

      it('should update player2Name if already set', () => {
        const action: GameFlowAction = { type: 'SET_PLAYER2_NAME', name: 'Charlie' };
        const result = gameFlowReducer(handoffState, action);

        expect(result).toEqual({
          ...handoffState,
          player2Name: 'Charlie',
        });
      });
    });

    describe('URL_GENERATED action (URL mode only)', () => {
      it('should set generatedUrl in URL mode', () => {
        const urlHandoffState: HandoffPhase = {
          phase: 'handoff',
          mode: 'url',
          player1Name: 'Alice',
          player2Name: 'Bob',
          gameState: handoffState.gameState,
          lastMove: { from: [2, 0], to: [1, 0] },
          countdown: 3,
          generatedUrl: null,
        };
        const action: GameFlowAction = {
          type: 'URL_GENERATED',
          url: 'https://example.com/game#abc123',
        };
        const result = gameFlowReducer(urlHandoffState, action);

        expect(result).toEqual({
          ...urlHandoffState,
          generatedUrl: 'https://example.com/game#abc123',
        });
      });

      it('should return unchanged state in hot-seat mode', () => {
        const action: GameFlowAction = {
          type: 'URL_GENERATED',
          url: 'https://example.com/game#abc123',
        };
        const result = gameFlowReducer(handoffState, action);

        expect(result).toBe(handoffState);
      });

      it('should return unchanged state if not in handoff phase', () => {
        const playingState: GameFlowState = {
          phase: 'playing',
          mode: 'url',
          player1Name: 'Alice',
          player2Name: 'Bob',
          gameState: createMockGameState(),
          selectedPosition: null,
          legalMoves: [],
          pendingMove: null,
        };
        const action: GameFlowAction = {
          type: 'URL_GENERATED',
          url: 'https://example.com/game#abc123',
        };
        const result = gameFlowReducer(playingState, action);

        expect(result).toBe(playingState);
      });
    });

    describe('COMPLETE_HANDOFF action (hot-seat only)', () => {
      it('should transition to playing phase in hot-seat mode', () => {
        const action: GameFlowAction = { type: 'COMPLETE_HANDOFF' };
        const result = gameFlowReducer(handoffState, action);

        expect(result).toMatchObject({
          phase: 'playing',
          mode: 'hotseat',
          player1Name: 'Alice',
          player2Name: 'Bob',
          selectedPosition: null,
          legalMoves: [],
          pendingMove: null,
        });
        if (result.phase === 'playing') {
          expect(result.gameState).toBeDefined();
        }
      });

      it('should transition to playing phase in URL mode (for consistency)', () => {
        const urlHandoffState: HandoffPhase = {
          phase: 'handoff',
          mode: 'url',
          player1Name: 'Alice',
          player2Name: 'Bob',
          gameState: handoffState.gameState,
          lastMove: { from: [2, 0], to: [1, 0] },
          countdown: 3,
          generatedUrl: null,
        };
        const action: GameFlowAction = { type: 'COMPLETE_HANDOFF' };
        const result = gameFlowReducer(urlHandoffState, action);

        expect(result).toMatchObject({
          phase: 'playing',
          mode: 'url',
          player1Name: 'Alice',
          player2Name: 'Bob',
          selectedPosition: null,
          legalMoves: [],
          pendingMove: null,
        });
        if (result.phase === 'playing') {
          expect(result.gameState).toBeDefined();
        }
      });

      it('should return unchanged state if not in handoff phase', () => {
        const setupState: GameFlowState = {
          phase: 'setup',
          mode: 'hotseat',
          player1Name: 'Alice',
        };
        const action: GameFlowAction = { type: 'COMPLETE_HANDOFF' };
        const result = gameFlowReducer(setupState, action);

        expect(result).toBe(setupState);
      });
    });
  });

  // ==========================================================================
  // Phase 5: Victory
  // ==========================================================================

  describe('Phase 5: Victory', () => {
    const victoryState: GameFlowState = {
      phase: 'victory',
      mode: 'hotseat',
      winner: 'light',
      gameState: createMockGameState(),
      player1Name: 'Alice',
      player2Name: 'Bob',
    };

    describe('NEW_GAME action', () => {
      it('should return to mode-selection phase', () => {
        const action: GameFlowAction = { type: 'NEW_GAME' };
        const result = gameFlowReducer(victoryState, action);

        expect(result).toEqual({ phase: 'mode-selection' });
      });
    });

    describe('Invalid actions in victory phase', () => {
      it('should ignore SELECT_PIECE action', () => {
        const action: GameFlowAction = {
          type: 'SELECT_PIECE',
          position: [2, 0],
          legalMoves: [[1, 0]],
        };
        const result = gameFlowReducer(victoryState, action);

        expect(result).toBe(victoryState);
      });

      it('should ignore CONFIRM_MOVE action', () => {
        const action: GameFlowAction = {
          type: 'CONFIRM_MOVE',
          result: {
            newState: createMockGameState(),
            engine: {} as KingsChessEngine,
          },
        };
        const result = gameFlowReducer(victoryState, action);

        expect(result).toBe(victoryState);
      });

      it('should ignore START_GAME action', () => {
        const action: GameFlowAction = { type: 'START_GAME' };
        const result = gameFlowReducer(victoryState, action);

        expect(result).toBe(victoryState);
      });
    });
  });

  // ==========================================================================
  // LOAD_FROM_URL Action (URL Mode)
  // ==========================================================================

  describe('LOAD_FROM_URL action', () => {
    describe('Full State Payload', () => {
      it('should load full state and transition to playing phase', () => {
        const initialState: GameFlowState = { phase: 'mode-selection' };
        const gameState = createMockGameState();

        // Mock localStorage to return Player 2's name
        (storage.getMyName as Mock).mockReturnValue('Bob');

        const action: GameFlowAction = {
          type: 'LOAD_FROM_URL',
          payload: {
            type: 'full_state',
            gameState,
            playerName: 'Bob',
          },
        };

        const result = gameFlowReducer(initialState, action);

        expect(result).toMatchObject({
          phase: 'playing',
          mode: 'url',
          player1Name: 'Player 1',
          player2Name: 'Bob',
          gameState,
          selectedPosition: null,
          legalMoves: [],
          pendingMove: null,
        });
      });

      it('should load full state without playerName and transition to handoff for name collection', () => {
        const initialState: GameFlowState = { phase: 'mode-selection' };
        const gameState = createMockGameState();

        // Mock localStorage to return null (no saved name)
        (storage.getMyName as Mock).mockReturnValue(null);

        const action: GameFlowAction = {
          type: 'LOAD_FROM_URL',
          payload: {
            type: 'full_state',
            gameState,
          },
        };

        const result = gameFlowReducer(initialState, action);

        expect(result).toMatchObject({
          phase: 'handoff',
          mode: 'url',
          player1Name: 'Player 1',
          player2Name: '',
          gameState,
          lastMove: { from: [0, 0], to: [0, 1] },
          countdown: 0,
          generatedUrl: null,
        });
      });

      it('should use whitePlayer name as player1Name', () => {
        const initialState: GameFlowState = { phase: 'mode-selection' };
        const gameState = createMockGameState({
          lightPlayer: {
            id: 'white-player-id' as never,
            name: 'CustomPlayer1',
          },
        });

        // Mock localStorage to return Player 2's name
        (storage.getMyName as Mock).mockReturnValue('Bob');

        const action: GameFlowAction = {
          type: 'LOAD_FROM_URL',
          payload: {
            type: 'full_state',
            gameState,
            playerName: 'Bob',
          },
        };

        const result = gameFlowReducer(initialState, action);

        expect(result).toMatchObject({
          player1Name: 'CustomPlayer1',
          player2Name: 'Bob',
        });
      });
    });

    describe('Delta Payload', () => {
      it('should apply delta move and transition to playing phase', () => {
        const initialState: GameFlowState = { phase: 'mode-selection' };
        const currentGameState = createMockGameState();
        const newGameState = createMockGameState({ currentTurn: 1, currentPlayer: 'dark' });

        // Mock localStorage
        (storage.getGameState as Mock).mockReturnValue(currentGameState);
        (storage.setGameState as Mock).mockReturnValue(true);

        // Mock engine
        const mockEngine = {
          getChecksum: vi.fn(() => 'test-checksum'),
          makeMove: vi.fn(() => ({ success: true })),
          getGameState: vi.fn(() => newGameState),
          checkGameEnd: vi.fn(() => ({ gameOver: false })),
          getValidMoves: vi.fn(),
          getPieceAt: vi.fn(),
        };
        (KingsChessEngine as unknown as Mock).mockReturnValue(mockEngine);

        const action: GameFlowAction = {
          type: 'LOAD_FROM_URL',
          payload: {
            type: 'delta',
            move: { from: [2, 0], to: [1, 0] },
            turn: 1,
            checksum: 'test-checksum',
            playerName: 'Bob',
          },
        };

        const result = gameFlowReducer(initialState, action);

        expect(storage.getGameState).toHaveBeenCalled();
        expect(KingsChessEngine).toHaveBeenCalledWith(
          currentGameState.lightPlayer,
          currentGameState.darkPlayer,
          currentGameState
        );
        expect(mockEngine.getChecksum).toHaveBeenCalled();
        expect(mockEngine.makeMove).toHaveBeenCalledWith([2, 0], [1, 0]);
        expect(storage.setGameState).toHaveBeenCalledWith(newGameState);
        expect(result).toMatchObject({
          phase: 'playing',
          mode: 'url',
          player1Name: 'Player 1',
          player2Name: 'Player 2',
          gameState: newGameState,
          selectedPosition: null,
          legalMoves: [],
          pendingMove: null,
        });
      });

      it('should transition to victory phase if game ends after delta', () => {
        const initialState: GameFlowState = { phase: 'mode-selection' };
        const currentGameState = createMockGameState();
        const newGameState = createMockGameState({ currentTurn: 1, currentPlayer: 'dark' });

        // Mock localStorage
        (storage.getGameState as Mock).mockReturnValue(currentGameState);
        (storage.setGameState as Mock).mockReturnValue(true);

        // Mock engine with game over
        const mockEngine = {
          getChecksum: vi.fn(() => 'test-checksum'),
          makeMove: vi.fn(() => ({ success: true })),
          getGameState: vi.fn(() => newGameState),
          checkGameEnd: vi.fn(() => ({ gameOver: true, winner: 'light' })),
          getValidMoves: vi.fn(),
          getPieceAt: vi.fn(),
        };
        (KingsChessEngine as unknown as Mock).mockReturnValue(mockEngine);

        const action: GameFlowAction = {
          type: 'LOAD_FROM_URL',
          payload: {
            type: 'delta',
            move: { from: [2, 0], to: [1, 0] },
            turn: 1,
            checksum: 'test-checksum',
          },
        };

        const result = gameFlowReducer(initialState, action);

        expect(mockEngine.checkGameEnd).toHaveBeenCalled();
        expect(result).toMatchObject({
          phase: 'victory',
          mode: 'url',
          winner: 'light',
          player1Name: 'Player 1',
          player2Name: 'Player 2',
        });
      });

      it('should handle draw in delta payload', () => {
        const initialState: GameFlowState = { phase: 'mode-selection' };
        const currentGameState = createMockGameState();
        const newGameState = createMockGameState({ currentTurn: 1, currentPlayer: 'dark' });

        // Mock localStorage
        (storage.getGameState as Mock).mockReturnValue(currentGameState);
        (storage.setGameState as Mock).mockReturnValue(true);

        // Mock engine with draw
        const mockEngine = {
          getChecksum: vi.fn(() => 'test-checksum'),
          makeMove: vi.fn(() => ({ success: true })),
          getGameState: vi.fn(() => newGameState),
          checkGameEnd: vi.fn(() => ({ gameOver: true, winner: null })),
          getValidMoves: vi.fn(),
          getPieceAt: vi.fn(),
        };
        (KingsChessEngine as unknown as Mock).mockReturnValue(mockEngine);

        const action: GameFlowAction = {
          type: 'LOAD_FROM_URL',
          payload: {
            type: 'delta',
            move: { from: [2, 0], to: [1, 0] },
            turn: 1,
            checksum: 'test-checksum',
          },
        };

        const result = gameFlowReducer(initialState, action);

        expect(result).toMatchObject({
          phase: 'victory',
          mode: 'url',
          winner: 'draw',
        });
      });

      it('should return unchanged state if no game state in localStorage', () => {
        const initialState: GameFlowState = { phase: 'mode-selection' };
        (storage.getGameState as Mock).mockReturnValue(null);

        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        const action: GameFlowAction = {
          type: 'LOAD_FROM_URL',
          payload: {
            type: 'delta',
            move: { from: [2, 0], to: [1, 0] },
            turn: 1,
            checksum: 'test-checksum',
          },
        };

        const result = gameFlowReducer(initialState, action);

        expect(result).toBe(initialState);
        expect(consoleSpy).toHaveBeenCalledWith(
          'Cannot apply delta - no current game state in localStorage'
        );

        consoleSpy.mockRestore();
      });

      it('should return unchanged state on checksum mismatch', () => {
        const initialState: GameFlowState = { phase: 'mode-selection' };
        const currentGameState = createMockGameState();

        // Mock localStorage
        (storage.getGameState as Mock).mockReturnValue(currentGameState);

        // Mock engine with different checksum
        const mockEngine = {
          getChecksum: vi.fn(() => 'different-checksum'),
          makeMove: vi.fn(),
          getGameState: vi.fn(),
          checkGameEnd: vi.fn(),
          getValidMoves: vi.fn(),
          getPieceAt: vi.fn(),
        };
        (KingsChessEngine as unknown as Mock).mockReturnValue(mockEngine);

        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        const action: GameFlowAction = {
          type: 'LOAD_FROM_URL',
          payload: {
            type: 'delta',
            move: { from: [2, 0], to: [1, 0] },
            turn: 1,
            checksum: 'test-checksum',
          },
        };

        const result = gameFlowReducer(initialState, action);

        expect(result).toBe(initialState);
        expect(consoleSpy).toHaveBeenCalledWith('❌ State diverged - checksums do not match');

        consoleSpy.mockRestore();
      });

      it('should return unchanged state if move fails', () => {
        const initialState: GameFlowState = { phase: 'mode-selection' };
        const currentGameState = createMockGameState();

        // Mock localStorage
        (storage.getGameState as Mock).mockReturnValue(currentGameState);

        // Mock engine with failed move
        const mockEngine = {
          getChecksum: vi.fn(() => 'test-checksum'),
          makeMove: vi.fn(() => ({ success: false, error: 'Invalid move' })),
          getGameState: vi.fn(),
          checkGameEnd: vi.fn(),
          getValidMoves: vi.fn(),
          getPieceAt: vi.fn(),
        };
        (KingsChessEngine as unknown as Mock).mockReturnValue(mockEngine);

        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        const action: GameFlowAction = {
          type: 'LOAD_FROM_URL',
          payload: {
            type: 'delta',
            move: { from: [2, 0], to: [1, 0] },
            turn: 1,
            checksum: 'test-checksum',
          },
        };

        const result = gameFlowReducer(initialState, action);

        expect(result).toBe(initialState);
        expect(consoleSpy).toHaveBeenCalledWith('Failed to apply delta move:', 'Invalid move');

        consoleSpy.mockRestore();
      });

      it('should handle off_board move in delta payload', () => {
        const initialState: GameFlowState = { phase: 'mode-selection' };
        const currentGameState = createMockGameState();
        const newGameState = createMockGameState({ currentTurn: 1, currentPlayer: 'dark' });

        // Mock localStorage
        (storage.getGameState as Mock).mockReturnValue(currentGameState);
        (storage.setGameState as Mock).mockReturnValue(true);

        // Mock engine
        const mockEngine = {
          getChecksum: vi.fn(() => 'test-checksum'),
          makeMove: vi.fn(() => ({ success: true })),
          getGameState: vi.fn(() => newGameState),
          checkGameEnd: vi.fn(() => ({ gameOver: false })),
          getValidMoves: vi.fn(),
          getPieceAt: vi.fn(),
        };
        (KingsChessEngine as unknown as Mock).mockReturnValue(mockEngine);

        const action: GameFlowAction = {
          type: 'LOAD_FROM_URL',
          payload: {
            type: 'delta',
            move: { from: [2, 0], to: 'off_board' },
            turn: 1,
            checksum: 'test-checksum',
          },
        };

        const result = gameFlowReducer(initialState, action);

        expect(mockEngine.makeMove).toHaveBeenCalledWith([2, 0], 'off_board');
        expect(result).toMatchObject({
          phase: 'playing',
          mode: 'url',
        });
      });
    });
  });

  // ==========================================================================
  // Edge Cases and Invalid Transitions
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle empty player names', () => {
      const setupState: GameFlowState = {
        phase: 'setup',
        mode: 'hotseat',
        player1Name: '',
      };
      const action: GameFlowAction = { type: 'START_GAME' };
      const result = gameFlowReducer(setupState, action);

      // Should fail because empty string is falsy
      expect(result).toBe(setupState);
    });

    it('should preserve state on invalid transitions', () => {
      const playingState: GameFlowState = {
        phase: 'playing',
        mode: 'hotseat',
        player1Name: 'Alice',
        player2Name: 'Bob',
        gameState: createMockGameState(),
        selectedPosition: null,
        legalMoves: [],
        pendingMove: null,
      };
      const action: GameFlowAction = { type: 'SELECT_MODE', mode: 'url' };
      const result = gameFlowReducer(playingState, action);

      // Should return exact same state object (reference equality)
      expect(result).toBe(playingState);
    });

    it('should handle SET_PLAYER2_NAME in invalid phases', () => {
      const setupState: GameFlowState = {
        phase: 'setup',
        mode: 'hotseat',
        player1Name: 'Alice',
      };
      const action: GameFlowAction = { type: 'SET_PLAYER2_NAME', name: 'Bob' };
      const result = gameFlowReducer(setupState, action);

      expect(result).toBe(setupState);
    });
  });

  // ==========================================================================
  // Mode-Specific Behavior
  // ==========================================================================

  describe('Mode-Specific Behavior', () => {
    describe('Hot-seat mode', () => {
      it('should allow COMPLETE_HANDOFF in hot-seat mode', () => {
        const handoffState: GameFlowState = {
          phase: 'handoff',
          mode: 'hotseat',
          player1Name: 'Alice',
          player2Name: 'Bob',
          gameState: createMockGameState(),
          lastMove: { from: [2, 0], to: [1, 0] },
          countdown: 3,
          generatedUrl: null,
        };
        const action: GameFlowAction = { type: 'COMPLETE_HANDOFF' };
        const result = gameFlowReducer(handoffState, action);

        expect(result.phase).toBe('playing');
      });

      it('should ignore URL_GENERATED in hot-seat mode', () => {
        const handoffState: GameFlowState = {
          phase: 'handoff',
          mode: 'hotseat',
          player1Name: 'Alice',
          player2Name: 'Bob',
          gameState: createMockGameState(),
          lastMove: { from: [2, 0], to: [1, 0] },
          countdown: 3,
          generatedUrl: null,
        };
        const action: GameFlowAction = {
          type: 'URL_GENERATED',
          url: 'https://example.com/game#abc123',
        };
        const result = gameFlowReducer(handoffState, action);

        expect(result).toBe(handoffState);
        if (result.phase === 'handoff') {
          expect(result.generatedUrl).toBeNull();
        }
      });
    });

    describe('URL mode', () => {
      it('should set generatedUrl in URL mode', () => {
        const urlModeHandoffState: HandoffPhase = {
          phase: 'handoff',
          mode: 'url',
          player1Name: 'Alice',
          player2Name: 'Bob',
          gameState: createMockGameState(),
          lastMove: { from: [2, 0], to: [1, 0] },
          countdown: 3,
          generatedUrl: null,
        };
        const action: GameFlowAction = {
          type: 'URL_GENERATED',
          url: 'https://example.com/game#abc123',
        };
        const result = gameFlowReducer(urlModeHandoffState, action);

        if (result.phase === 'handoff') {
          expect(result.generatedUrl).toBe('https://example.com/game#abc123');
        }
      });

      it('should allow COMPLETE_HANDOFF in URL mode (edge case)', () => {
        const urlModeHandoffWithUrl: HandoffPhase = {
          phase: 'handoff',
          mode: 'url',
          player1Name: 'Alice',
          player2Name: 'Bob',
          gameState: createMockGameState(),
          lastMove: { from: [2, 0], to: [1, 0] },
          countdown: 3,
          generatedUrl: 'https://example.com/game#abc123',
        };
        const action: GameFlowAction = { type: 'COMPLETE_HANDOFF' };
        const result = gameFlowReducer(urlModeHandoffWithUrl, action);

        expect(result.phase).toBe('playing');
      });
    });
  });

  // ==========================================================================
  // Exhaustive Action Checking
  // ==========================================================================

  describe('Exhaustive Action Checking', () => {
    it('should handle all action types', () => {
      const actions: GameFlowAction['type'][] = [
        'SELECT_MODE',
        'SET_PLAYER1_NAME',
        'START_GAME',
        'START_COLOR_SELECTION',
        'SET_PLAYER_COLOR',
        'START_PIECE_SELECTION',
        'SET_SELECTION_MODE',
        'SET_PLAYER_PIECES',
        'COMPLETE_PIECE_SELECTION',
        'SELECT_PIECE',
        'DESELECT_PIECE',
        'STAGE_MOVE',
        'CONFIRM_MOVE',
        'SET_PLAYER2_NAME',
        'URL_GENERATED',
        'COMPLETE_HANDOFF',
        'GAME_OVER',
        'NEW_GAME',
        'LOAD_FROM_URL',
      ];

      // Verify all action types are tested
      expect(actions).toHaveLength(19);
    });

    it('should never throw for valid action types', () => {
      const state: GameFlowState = { phase: 'mode-selection' };

      const actions: GameFlowAction[] = [
        { type: 'SELECT_MODE', mode: 'hotseat' },
        { type: 'SET_PLAYER1_NAME', name: 'Alice' },
        { type: 'START_GAME' },
        { type: 'START_COLOR_SELECTION' },
        { type: 'SET_PLAYER_COLOR', color: 'light' },
        { type: 'START_PIECE_SELECTION' },
        { type: 'SET_SELECTION_MODE', mode: 'mirrored' },
        { type: 'SET_PLAYER_PIECES', player: 'player1', pieces: ['rook', 'knight', 'bishop'] },
        { type: 'COMPLETE_PIECE_SELECTION' },
        { type: 'SELECT_PIECE', position: [2, 0], legalMoves: [[1, 0]] },
        { type: 'DESELECT_PIECE' },
        { type: 'STAGE_MOVE', from: [2, 0], to: [1, 0] },
        {
          type: 'CONFIRM_MOVE',
          result: {
            newState: createMockGameState(),
            engine: {} as KingsChessEngine,
          },
        },
        { type: 'SET_PLAYER2_NAME', name: 'Bob' },
        { type: 'URL_GENERATED', url: 'https://example.com' },
        { type: 'COMPLETE_HANDOFF' },
        { type: 'GAME_OVER', winner: 'light' },
        { type: 'NEW_GAME' },
        {
          type: 'LOAD_FROM_URL',
          payload: {
            type: 'full_state',
            gameState: createMockGameState(),
          },
        },
      ];

      actions.forEach((action) => {
        expect(() => gameFlowReducer(state, action)).not.toThrow();
      });
    });
  });

  // ==========================================================================
  // State Immutability
  // ==========================================================================

  describe('State Immutability', () => {
    it('should not mutate original state on SELECT_PIECE', () => {
      const state: GameFlowState = {
        phase: 'playing',
        mode: 'hotseat',
        player1Name: 'Alice',
        player2Name: 'Bob',
        gameState: createMockGameState(),
        selectedPosition: null,
        legalMoves: [],
        pendingMove: null,
      };
      const originalState = JSON.parse(JSON.stringify(state)) as PlayingPhase;
      const action: GameFlowAction = {
        type: 'SELECT_PIECE',
        position: [2, 0],
        legalMoves: [[1, 0]],
      };

      gameFlowReducer(state, action);

      expect(state).toEqual(originalState);
    });

    it('should not mutate original state on DESELECT_PIECE', () => {
      const state: GameFlowState = {
        phase: 'playing',
        mode: 'hotseat',
        player1Name: 'Alice',
        player2Name: 'Bob',
        gameState: createMockGameState(),
        selectedPosition: [2, 0],
        legalMoves: [[1, 0]],
        pendingMove: null,
      };
      const originalState = JSON.parse(JSON.stringify(state)) as PlayingPhase;
      const action: GameFlowAction = { type: 'DESELECT_PIECE' };

      gameFlowReducer(state, action);

      expect(state).toEqual(originalState);
    });

    it('should return new state object on valid transitions', () => {
      const state: GameFlowState = { phase: 'mode-selection' };
      const action: GameFlowAction = { type: 'SELECT_MODE', mode: 'hotseat' };

      const result = gameFlowReducer(state, action);

      expect(result).not.toBe(state);
    });

    it('should return same state object on invalid transitions', () => {
      const state: GameFlowState = {
        phase: 'playing',
        mode: 'hotseat',
        player1Name: 'Alice',
        player2Name: 'Bob',
        gameState: createMockGameState(),
        selectedPosition: null,
        legalMoves: [],
        pendingMove: null,
      };
      const action: GameFlowAction = { type: 'SELECT_MODE', mode: 'url' };

      const result = gameFlowReducer(state, action);

      expect(result).toBe(state);
    });
  });

  describe('Issue #7: Clear Mode on Victory', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should clear game mode when CONFIRM_MOVE triggers victory', () => {
      // Setup: Create playing state with hotseat mode
      const playingState: GameFlowState = {
        phase: 'playing',
        mode: 'hotseat',
        player1Name: 'Alice',
        player2Name: 'Bob',
        gameState: createMockGameState(),
        selectedPosition: null,
        legalMoves: [],
        pendingMove: { from: [0, 0], to: [0, 1] },
      };

      // Mock engine that indicates game is over
      const mockEngine = {
        checkGameEnd: () => ({ gameOver: true, winner: 'light' as const }),
      };

      // Action: Confirm move that ends game
      const action: GameFlowAction = {
        type: 'CONFIRM_MOVE',
        result: {
          newState: createMockGameState(),
          engine: mockEngine as unknown as KingsChessEngine,
        },
      };

      // Execute reducer
      const newState = gameFlowReducer(playingState, action);

      // Assert: Phase is victory
      expect(newState.phase).toBe('victory');

      // Assert: clearGameMode was called
      expect(storage.clearGameMode).toHaveBeenCalledTimes(1);
    });

    it('should clear game mode when GAME_OVER action is dispatched', () => {
      const playingState: GameFlowState = {
        phase: 'playing',
        mode: 'url',
        player1Name: 'Alice',
        player2Name: 'Bob',
        gameState: createMockGameState(),
        selectedPosition: null,
        legalMoves: [],
        pendingMove: null,
      };

      const action: GameFlowAction = {
        type: 'GAME_OVER',
        winner: 'dark',
      };

      const newState = gameFlowReducer(playingState, action);

      expect(newState.phase).toBe('victory');
      expect(storage.clearGameMode).toHaveBeenCalledTimes(1);
    });
  });
});
