/**
 * @fileoverview Game flow state machine reducer
 * @module lib/gameFlow/reducer
 */

import type { GameFlowState, GameFlowAction } from '../../types/gameFlow';
import type { DeltaPayload, FullStatePayload } from '../urlEncoding/types';
import type { GameState } from '../validation/schemas';
import { KingsChessEngine } from '../chess/KingsChessEngine';
import { storage } from '../storage/localStorage';

/**
 * Creates initial game state for a new game.
 *
 * @returns Initial GameState with Player 1 and Player 2
 */
function createInitialGameState(): GameState {
  const whitePlayer = {
    id: crypto.randomUUID() as never,
    name: 'Player 1'
  };
  const blackPlayer = {
    id: crypto.randomUUID() as never,
    name: 'Player 2'
  };
  const engine = new KingsChessEngine(whitePlayer, blackPlayer);
  return engine.getGameState();
}

/**
 * Handles URL loading for LOAD_FROM_URL action.
 *
 * For full_state: Restores complete game, transitions to playing phase
 * For delta: Applies move to existing state, verifies checksum
 *
 * @param state - Current game flow state
 * @param payload - URL payload (full state or delta)
 * @returns New game flow state
 */
function handleUrlLoad(
  state: GameFlowState,
  payload: FullStatePayload | DeltaPayload
): GameFlowState {
  if (payload.type === 'full_state') {
    // Full state: Restore complete game
    const player1Name = payload.gameState.whitePlayer.name;

    return {
      phase: 'playing',
      mode: 'url',
      player1Name,
      player2Name: payload.playerName || null,
      gameState: payload.gameState,
      selectedPosition: null,
      legalMoves: [],
      pendingMove: null,
    };
  } else {
    // Delta: Apply move to existing state
    const currentState = storage.getGameState();
    if (!currentState) {
      console.error('Cannot apply delta - no current game state in localStorage');
      return state;
    }

    const engine = new KingsChessEngine(
      currentState.whitePlayer,
      currentState.blackPlayer,
      currentState
    );

    // Verify checksum before applying
    const currentChecksum = engine.getChecksum();
    if (currentChecksum !== payload.checksum) {
      console.error('State diverged - checksums do not match');
      // TODO: Show History Comparison Modal (Phase 3 resync flow)
      return state;
    }

    // Apply delta move
    const result = engine.makeMove(payload.move.from, payload.move.to);
    if (!result.success) {
      console.error('Failed to apply delta move:', result.error);
      return state;
    }

    const newGameState = engine.getGameState();
    storage.setGameState(newGameState);

    // Check for game over
    const victoryResult = engine.checkGameEnd();
    if (victoryResult.gameOver) {
      const player1Name = newGameState.whitePlayer.name;
      const player2Name = newGameState.blackPlayer.name;

      return {
        phase: 'victory',
        mode: 'url',
        winner: victoryResult.winner || 'draw',
        gameState: newGameState,
        player1Name,
        player2Name,
      };
    }

    // Transition to playing phase
    return {
      phase: 'playing',
      mode: 'url',
      player1Name: newGameState.whitePlayer.name,
      player2Name: newGameState.blackPlayer.name,
      gameState: newGameState,
      selectedPosition: null,
      legalMoves: [],
      pendingMove: null,
    };
  }
}

/**
 * Game flow reducer - handles all state transitions.
 *
 * Implements a finite state machine with 5 phases and 11 action types.
 * Includes exhaustive checking to ensure all actions are handled.
 *
 * @param state - Current game flow state
 * @param action - Action to process
 * @returns New game flow state
 */
export function gameFlowReducer(
  state: GameFlowState,
  action: GameFlowAction
): GameFlowState {
  switch (action.type) {
    case 'SELECT_MODE':
      if (state.phase !== 'mode-selection') return state;
      return {
        phase: 'setup',
        mode: action.mode,
        player1Name: null,
      };

    case 'SET_PLAYER1_NAME':
      if (state.phase !== 'setup') return state;
      return { ...state, player1Name: action.name };

    case 'START_GAME': {
      if (state.phase !== 'setup' || !state.player1Name) return state;
      const gameState = createInitialGameState();
      return {
        phase: 'playing',
        mode: state.mode,
        player1Name: state.player1Name,
        player2Name: null, // Collected later
        gameState,
        selectedPosition: null,
        legalMoves: [],
        pendingMove: null,
      };
    }

    case 'SELECT_PIECE':
      if (state.phase !== 'playing') return state;
      return {
        ...state,
        selectedPosition: action.position,
        legalMoves: action.legalMoves,
      };

    case 'DESELECT_PIECE':
      if (state.phase !== 'playing') return state;
      return {
        ...state,
        selectedPosition: null,
        legalMoves: [],
        pendingMove: null,
      };

    case 'STAGE_MOVE':
      if (state.phase !== 'playing') return state;
      return {
        ...state,
        pendingMove: { from: action.from, to: action.to },
      };

    case 'CONFIRM_MOVE': {
      if (state.phase !== 'playing' || !state.pendingMove) return state;

      // Check for game over
      const victoryResult = action.result.engine.checkGameEnd();
      if (victoryResult.gameOver) {
        return {
          phase: 'victory',
          mode: state.mode,
          winner: victoryResult.winner || 'draw',
          gameState: action.result.newState,
          player1Name: state.player1Name,
          player2Name: state.player2Name || 'Player 2',
        };
      }

      // Transition to handoff
      return {
        phase: 'handoff',
        mode: state.mode,
        player1Name: state.player1Name,
        player2Name: state.player2Name || '', // Prompt if empty
        gameState: action.result.newState,
        lastMove: state.pendingMove,
        countdown: 3, // Hot-seat countdown
        generatedUrl: null, // URL mode: will be set by URL_GENERATED action
      };
    }

    case 'SET_PLAYER2_NAME':
      // Hot-seat: called from handoff screen if player2Name is empty
      // URL mode: called when Player 2 opens first URL
      if (state.phase === 'handoff') {
        return { ...state, player2Name: action.name };
      }
      if (state.phase === 'playing') {
        return { ...state, player2Name: action.name };
      }
      return state;

    case 'URL_GENERATED':
      // URL mode only
      if (state.phase !== 'handoff' || state.mode !== 'url') return state;
      return { ...state, generatedUrl: action.url };

    case 'COMPLETE_HANDOFF':
      if (state.phase !== 'handoff') return state;
      return {
        phase: 'playing',
        mode: state.mode,
        player1Name: state.player1Name,
        player2Name: state.player2Name,
        gameState: state.gameState,
        selectedPosition: null,
        legalMoves: [],
        pendingMove: null,
      };

    case 'GAME_OVER':
      if (state.phase !== 'playing') return state;
      return {
        phase: 'victory',
        mode: state.mode,
        winner: action.winner,
        gameState: state.gameState,
        player1Name: state.player1Name,
        player2Name: state.player2Name || 'Player 2',
      };

    case 'NEW_GAME':
      return { phase: 'mode-selection' };

    case 'LOAD_FROM_URL':
      // URL mode only: restore game from URL on page load
      return handleUrlLoad(state, action.payload);

    default: {
      // Exhaustive checking: TypeScript ensures all actions are handled
      const _exhaustive: never = action;
      throw new Error(`Unhandled action: ${JSON.stringify(_exhaustive)}`);
    }
  }
}
