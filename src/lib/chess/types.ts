/**
 * @fileoverview Type definitions for Kings Chess Engine
 * @module lib/chess/types
 */

import type { Piece, GameState } from '../validation/schemas';

/**
 * Result of attempting a move.
 */
export interface MoveResult {
  /** Whether move was successful */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Updated game state if successful */
  gameState?: GameState;
  /** Piece that was captured, if any */
  captured?: Piece;
}

/**
 * Result of checking for game end.
 */
export interface VictoryResult {
  /** Whether game is over */
  gameOver: boolean;
  /** Winner if game over */
  winner?: 'white' | 'black' | null;
  /** Score breakdown */
  score?: {
    white: number;
    black: number;
  };
  /** Reason for game end */
  reason?: string;
}

/**
 * Direction vectors for piece movement.
 */
export type Direction = [number, number];

/**
 * Validation result with detailed feedback.
 */
export interface ValidationResult {
  valid: boolean;
  reason?: string;
  warnings?: string[];
}
