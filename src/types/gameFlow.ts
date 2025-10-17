/**
 * @fileoverview Game flow state machine types for dual-mode gameplay
 * @module types/gameFlow
 */

import type { GameState, Position } from '../lib/validation/schemas';
import type { FullStatePayload, DeltaPayload } from '../lib/urlEncoding/types';
import type { KingsChessEngine } from '../lib/chess/KingsChessEngine';

/**
 * Game flow state - discriminated union with 5 phases.
 *
 * The state machine transitions through these phases:
 * 1. mode-selection: User chooses hot-seat or URL mode
 * 2. setup: Player 1 enters name
 * 3. playing: Active gameplay with move selection
 * 4. handoff: After move confirmation (mode-specific UI)
 * 5. victory: Game ended, show results
 *
 * Each phase has specific fields and transitions.
 */
export type GameFlowState =
  | ModeSelectionPhase
  | SetupPhase
  | PlayingPhase
  | HandoffPhase
  | VictoryPhase;

/**
 * Phase 1: Mode selection screen.
 * User chooses between hot-seat and URL modes.
 */
export interface ModeSelectionPhase {
  phase: 'mode-selection';
}

/**
 * Phase 2: Setup phase.
 * Player 1 enters their name before game starts.
 */
export interface SetupPhase {
  phase: 'setup';
  /** Selected game mode */
  mode: 'hotseat' | 'url';
  /** Player 1 name (null until entered) */
  player1Name: string | null;
}

/**
 * Phase 3: Playing phase.
 * Active gameplay with move selection and confirmation.
 */
export interface PlayingPhase {
  phase: 'playing';
  /** Selected game mode */
  mode: 'hotseat' | 'url';
  /** Player 1 name */
  player1Name: string;
  /** Player 2 name (null until first handoff in hot-seat, or first URL load in URL mode) */
  player2Name: string | null;
  /** Current game state */
  gameState: GameState;
  /** Currently selected piece position */
  selectedPosition: Position | null;
  /** Legal moves for selected piece */
  legalMoves: Position[];
  /** Pending move awaiting confirmation (can be off-board) */
  pendingMove: { from: Position; to: Position | 'off_board' } | null;
}

/**
 * Phase 4: Handoff phase.
 * After move confirmation, transition between players.
 * Mode-specific UI:
 * - Hot-seat: Privacy screen with "I'm Ready" button
 * - URL: URLSharer with copy button
 */
export interface HandoffPhase {
  phase: 'handoff';
  /** Selected game mode */
  mode: 'hotseat' | 'url';
  /** Player 1 name */
  player1Name: string;
  /** Player 2 name (empty string triggers name prompt in hot-seat) */
  player2Name: string;
  /** Current game state after move */
  gameState: GameState;
  /** The move that was just made (can be off-board) */
  lastMove: { from: Position; to: Position | 'off_board' };
  /** Countdown timer (hot-seat only, 3 seconds) */
  countdown: number;
  /** Generated URL (URL mode only, set after URL_GENERATED action) */
  generatedUrl: string | null;
}

/**
 * Phase 5: Victory phase.
 * Game ended, show winner and statistics.
 */
export interface VictoryPhase {
  phase: 'victory';
  /** Selected game mode */
  mode: 'hotseat' | 'url';
  /** Winner of the game */
  winner: 'white' | 'black' | 'draw';
  /** Final game state */
  gameState: GameState;
  /** Player 1 name */
  player1Name: string;
  /** Player 2 name */
  player2Name: string;
}

/**
 * Game flow actions - discriminated union with 11 action types.
 *
 * Actions trigger state transitions in the game flow reducer.
 * Some actions are mode-specific (hot-seat only or URL only).
 */
export type GameFlowAction =
  | SelectModeAction
  | SetPlayer1NameAction
  | StartGameAction
  | SelectPieceAction
  | DeselectPieceAction
  | StageMoveAction
  | ConfirmMoveAction
  | SetPlayer2NameAction
  | CompleteHandoffAction
  | UrlGeneratedAction
  | GameOverAction
  | NewGameAction
  | LoadFromUrlAction;

/**
 * SELECT_MODE action.
 * Transition from mode-selection to setup phase.
 */
export interface SelectModeAction {
  type: 'SELECT_MODE';
  /** Selected mode: hot-seat or URL */
  mode: 'hotseat' | 'url';
}

/**
 * SET_PLAYER1_NAME action.
 * Player 1 enters their name in setup phase.
 */
export interface SetPlayer1NameAction {
  type: 'SET_PLAYER1_NAME';
  /** Player 1's display name */
  name: string;
}

/**
 * START_GAME action.
 * Transition from setup to playing phase.
 * Requires player1Name to be set.
 */
export interface StartGameAction {
  type: 'START_GAME';
}

/**
 * SELECT_PIECE action.
 * User clicks a piece, show legal moves.
 */
export interface SelectPieceAction {
  type: 'SELECT_PIECE';
  /** Position of selected piece */
  position: Position;
  /** Legal moves for this piece */
  legalMoves: Position[];
}

/**
 * DESELECT_PIECE action.
 * User clicks empty square or same piece, clear selection.
 */
export interface DeselectPieceAction {
  type: 'DESELECT_PIECE';
}

/**
 * STAGE_MOVE action.
 * User clicks destination square or off-board button, stage move for confirmation.
 */
export interface StageMoveAction {
  type: 'STAGE_MOVE';
  /** Source position */
  from: Position;
  /** Destination position or 'off_board' for scoring */
  to: Position | 'off_board';
}

/**
 * CONFIRM_MOVE action.
 * User confirms staged move, apply to game state.
 * Transitions to handoff phase (or victory if game ends).
 */
export interface ConfirmMoveAction {
  type: 'CONFIRM_MOVE';
  /** Result of the move from chess engine */
  result: {
    /** New game state after move */
    newState: GameState;
    /** Chess engine instance (for victory checking) */
    engine: KingsChessEngine;
  };
}

/**
 * SET_PLAYER2_NAME action.
 * Set Player 2's name.
 * - Hot-seat: Called from handoff screen if player2Name is empty
 * - URL mode: Called when Player 2 opens first URL
 */
export interface SetPlayer2NameAction {
  type: 'SET_PLAYER2_NAME';
  /** Player 2's display name */
  name: string;
}

/**
 * COMPLETE_HANDOFF action (hot-seat only).
 * User clicks "I'm Ready" button on privacy screen.
 * Transitions from handoff back to playing phase.
 */
export interface CompleteHandoffAction {
  type: 'COMPLETE_HANDOFF';
}

/**
 * URL_GENERATED action (URL mode only).
 * URL has been generated and is ready to share.
 * Updates handoff phase with generated URL.
 */
export interface UrlGeneratedAction {
  type: 'URL_GENERATED';
  /** Generated URL for opponent to load */
  url: string;
}

/**
 * GAME_OVER action.
 * Game ended, transition to victory phase.
 */
export interface GameOverAction {
  type: 'GAME_OVER';
  /** Winner of the game */
  winner: 'white' | 'black' | 'draw';
}

/**
 * NEW_GAME action.
 * User clicks "New Game" from victory screen.
 * Returns to mode-selection phase.
 */
export interface NewGameAction {
  type: 'NEW_GAME';
}

/**
 * LOAD_FROM_URL action (URL mode only).
 * Load game state from URL hash.
 * Can be full state (first move) or delta (subsequent moves).
 */
export interface LoadFromUrlAction {
  type: 'LOAD_FROM_URL';
  /** URL payload (full state or delta) */
  payload: FullStatePayload | DeltaPayload;
}
