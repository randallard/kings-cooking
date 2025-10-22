/**
 * @fileoverview Type definitions for Kings Chess Engine
 * @module lib/chess/types
 */

import type { Piece, GameState, Position } from '../validation/schemas';

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
  /** True if pawn reached promotion row and requires promotion piece selection */
  requiresPromotion?: boolean;
  /** True if promotion was executed successfully */
  promoted?: boolean;
  /** Type of piece that was promoted to */
  promotionPiece?: 'queen' | 'rook' | 'bishop' | 'knight';
  /** Original position (for promotion flow continuation) */
  from?: Position;
  /** Destination position (for promotion flow continuation) */
  to?: Position | 'off_board';
  /** Piece being moved (for promotion flow continuation) */
  piece?: Piece;
}

/**
 * Result of checking for game end.
 */
export interface VictoryResult {
  /** Whether game is over */
  gameOver: boolean;
  /** Winner if game over */
  winner?: 'light' | 'dark' | null;
  /** Score breakdown */
  score?: {
    light: number;
    dark: number;
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
