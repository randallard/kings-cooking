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
  const lightPlayer = {
    id: crypto.randomUUID() as never,
    name: 'Player 1'
  };
  const darkPlayer = {
    id: crypto.randomUUID() as never,
    name: 'Player 2'
  };
  const engine = new KingsChessEngine(lightPlayer, darkPlayer);
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
  // Localhost debugging
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    console.log('🔄 LOAD_FROM_URL Action:', {
      payloadType: payload.type,
      currentPhase: state.phase,
    });
  }

  if (payload.type === 'full_state') {
    // Full state: Restore complete game (Player 2 receiving first URL, or Player 1 returning)
    let player1Name = payload.gameState.lightPlayer.name;
    let player2Name = payload.gameState.darkPlayer.name;

    // Check localStorage for saved name
    const myName = storage.getMyName();

    // Localhost debugging
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      console.log('📥 Received FULL_STATE:', {
        playerName: payload.playerName,
        myName: myName,
        player1Name: player1Name,
        player2Name: player2Name,
        currentTurn: payload.gameState.currentTurn,
        checksum: payload.gameState.checksum,
        board: payload.gameState.board,
      });
    }

    // CRITICAL: If payload has playerName AND it's different from myName,
    // it's from the OTHER player sending us their move
    // We need to update the gameState with the correct player name
    if (payload.playerName && payload.playerName !== myName) {
      // The playerName in the payload is from the OTHER player
      // Check if we are Player 1 (white) or Player 2 (black)
      if (myName === player1Name) {
        // We are Player 1, so the playerName is Player 2's name
        player2Name = payload.playerName;
        // Update the gameState to have Player 2's correct name
        payload.gameState.darkPlayer.name = payload.playerName;

        if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
          console.log('  ✅ Identified as Player 1 receiving Player 2 name:', payload.playerName);
        }
      } else {
        // We are Player 2, so the playerName is Player 1's name
        player1Name = payload.playerName;
        payload.gameState.lightPlayer.name = payload.playerName;

        if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
          console.log('  ✅ Identified as Player 2 receiving Player 1 name:', payload.playerName);
        }
      }
    }

    // Check if game is over
    const engine = new KingsChessEngine(
      payload.gameState.lightPlayer,
      payload.gameState.darkPlayer,
      payload.gameState
    );
    const victoryResult = engine.checkGameEnd();

    if (victoryResult && victoryResult.gameOver) {
      // Clear game mode when loading completed game (Issue #7 fix)
      storage.clearGameMode();

      // Game is over - go to victory phase
      return {
        phase: 'victory',
        mode: 'url',
        winner: victoryResult.winner || 'draw',
        gameState: payload.gameState,
        player1Name,
        player2Name: player2Name || myName || 'Player 2',
      };
    }

    if (myName) {
      // Check if saved name matches Player 1 (white)
      if (myName === player1Name) {
        // This is Player 1 returning to the game - go directly to playing
        return {
          phase: 'playing',
          mode: 'url',
          player1Name,
          player2Name,
          gameState: payload.gameState,
          selectedPosition: null,
          legalMoves: [],
          pendingMove: null,
        };
      } else {
        // This is Player 2 with a saved name - go directly to playing
        return {
          phase: 'playing',
          mode: 'url',
          player1Name,
          player2Name: myName,
          gameState: payload.gameState,
          selectedPosition: null,
          legalMoves: [],
          pendingMove: null,
        };
      }
    } else {
      // No saved name - must be Player 2's first time - go to handoff phase
      return {
        phase: 'handoff',
        mode: 'url',
        player1Name,
        player2Name: '', // Empty triggers name collection in App.tsx
        gameState: payload.gameState,
        lastMove: { from: [0, 0], to: [0, 1] }, // Placeholder for "Player 1 just moved"
        countdown: 0, // No countdown in URL mode
        generatedUrl: null, // Player 2 doesn't generate URL yet
      };
    }
  } else {
    // Delta: Apply move to existing state
    const currentState = storage.getGameState();
    if (!currentState) {
      console.error('Cannot apply delta - no current game state in localStorage');
      return state;
    }

    const engine = new KingsChessEngine(
      currentState.lightPlayer,
      currentState.darkPlayer,
      currentState
    );

    // Get current checksum
    const currentChecksum = engine.getChecksum();

    // Localhost debugging
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      console.log('📥 Received DELTA:', {
        playerName: payload.playerName,
        move: payload.move,
        turn: payload.turn,
        checksumInPayload: payload.checksum,
        myCurrentChecksum: currentChecksum,
        myCurrentTurn: currentState.currentTurn,
        myCurrentPlayer: currentState.currentPlayer,
        myLightPlayer: currentState.lightPlayer.name,
        myDarkPlayer: currentState.darkPlayer.name,
        myBoard: currentState.board,
      });
    }

    // CRITICAL: Check if this delta has already been applied
    // If our current turn equals the payload turn, the move was already applied
    if (currentState.currentTurn === payload.turn) {
      if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        console.log('  ⏭️ Delta already applied (turn matches), skipping...');
      }
      // Delta already applied - transition to playing phase with current state
      return {
        phase: 'playing',
        mode: 'url',
        player1Name: currentState.lightPlayer.name,
        player2Name: currentState.darkPlayer.name,
        gameState: currentState,
        selectedPosition: null,
        legalMoves: [],
        pendingMove: null,
      };
    }

    // Verify checksum before applying
    if (currentChecksum !== payload.checksum) {
      console.error('❌ State diverged - checksums do not match');
      console.error('  Expected (from payload):', payload.checksum);
      console.error('  Actual (my current state):', currentChecksum);
      console.error('  My current turn:', currentState.currentTurn);
      console.error('  Payload turn:', payload.turn);
      // TODO: Show History Comparison Modal (Phase 3 resync flow)
      return state;
    }

    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      console.log('  ✅ Checksum verified! Applying move...');
    }

    // Apply delta move
    const result = engine.makeMove(payload.move.from, payload.move.to);
    if (!result.success) {
      console.error('Failed to apply delta move:', result.error);
      return state;
    }

    const newGameState = engine.getGameState();
    storage.setGameState(newGameState);

    // Localhost debugging
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      console.log('  ✅ Move applied successfully:', {
        newTurn: newGameState.currentTurn,
        newChecksum: newGameState.checksum,
        newCurrentPlayer: newGameState.currentPlayer,
      });
    }

    // CRITICAL: Clear the URL hash after successfully applying a delta
    // This prevents the same delta from being applied twice
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      if (window.location.hostname === 'localhost') {
        console.log('  🧹 Cleared URL hash to prevent duplicate application');
      }
    }

    // Check for game over
    const victoryResult = engine.checkGameEnd();
    if (victoryResult.gameOver) {
      const player1Name = newGameState.lightPlayer.name;
      const player2Name = newGameState.darkPlayer.name;

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
      player1Name: newGameState.lightPlayer.name,
      player2Name: newGameState.darkPlayer.name,
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
        // Clear game mode when transitioning to victory (Issue #7 fix)
        storage.clearGameMode();

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

      // Clear game mode when transitioning to victory (Issue #7 fix)
      storage.clearGameMode();

      return {
        phase: 'victory',
        mode: state.mode,
        winner: action.winner,
        gameState: state.gameState,
        player1Name: state.player1Name,
        player2Name: state.player2Name || 'Player 2',
      };

    case 'NEW_GAME':
      // Clear all localStorage including story flags
      storage.clearAll();
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
