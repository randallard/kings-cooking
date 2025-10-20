/**
 * @fileoverview Type definitions and schemas for piece selection phase
 * @module lib/pieceSelection/types
 */

import { z } from 'zod';

/**
 * Valid chess piece types for King's Cooking.
 * Note: King is not included as kings are off-board.
 */
export const PieceTypeSchema = z.enum(['rook', 'knight', 'bishop', 'queen', 'pawn']);
export type PieceType = z.infer<typeof PieceTypeSchema>;

/**
 * Piece selection modes.
 * - mirrored: Player 1 selects, Player 2 gets identical pieces
 * - independent: Both players select separately
 * - random: Random pieces for both (mirrored)
 */
export const SelectionModeSchema = z.enum(['mirrored', 'independent', 'random']);
export type SelectionMode = z.infer<typeof SelectionModeSchema>;

/**
 * Exactly 3 selected pieces (tuple).
 * Players must select exactly 3 pieces for their starting row.
 */
export const SelectedPiecesSchema = z.tuple([
  PieceTypeSchema,
  PieceTypeSchema,
  PieceTypeSchema,
]);
export type SelectedPieces = z.infer<typeof SelectedPiecesSchema>;

/**
 * Complete piece selection data.
 * Includes mode, both players' pieces, and player 1's color choice.
 */
export const PieceSelectionDataSchema = z.object({
  mode: SelectionModeSchema,
  player1Pieces: SelectedPiecesSchema,
  player2Pieces: SelectedPiecesSchema,
  player1Color: z.enum(['light', 'dark']),
});
export type PieceSelectionData = z.infer<typeof PieceSelectionDataSchema>;

/**
 * Available piece pool with max counts and unicode characters.
 * Based on standard chess set limits.
 */
export const PIECE_POOL = {
  rook: { max: 2, unicode: { light: '♜', dark: '♖' } },
  knight: { max: 2, unicode: { light: '♞', dark: '♘' } },
  bishop: { max: 2, unicode: { light: '♝', dark: '♗' } },
  queen: { max: 1, unicode: { light: '♛', dark: '♕' } },
  pawn: { max: 8, unicode: { light: '♟', dark: '♙' } },
} as const;

export type PiecePoolType = typeof PIECE_POOL;
