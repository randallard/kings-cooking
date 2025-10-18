/**
 * @fileoverview History storage type definitions for Phase 3
 * @module lib/history/types
 *
 * Defines MoveHistoryEntry for tracking game moves with checksums
 * and sync status for URL state synchronization.
 */

import { z } from 'zod';
import { PieceSchema, PieceOwnerSchema } from '@/lib/validation/schemas';
import type { Piece } from '@/lib/validation/schemas';

/**
 * Non-nullable position type for move history
 * (moves always have a valid starting position)
 */
export type NonNullPosition = [number, number];

/**
 * Single move in game history
 *
 * Includes all data needed to:
 * - Reconstruct game state at any point
 * - Verify state synchronization via checksum
 * - Track which moves were shared via URL
 *
 * @example
 * ```typescript
 * const entry: MoveHistoryEntry = {
 *   moveNumber: 1,
 *   player: 'light',
 *   from: [2, 0],
 *   to: [1, 0],
 *   piece: { type: 'rook', owner: 'light', ... },
 *   captured: null,
 *   checksum: 'abc123',
 *   timestamp: 1634567890123,
 *   synced: true
 * };
 * ```
 */
export interface MoveHistoryEntry {
  /** Move number (0-indexed) */
  moveNumber: number;

  /** Player who made the move */
  player: 'light' | 'dark';

  /** Starting position (always non-null for valid moves) */
  from: NonNullPosition;

  /** Destination position or off-board */
  to: NonNullPosition | 'off_board';

  /** Piece that was moved */
  piece: Piece;

  /** Piece that was captured (if any) */
  captured: Piece | null;

  /** Game state checksum after this move */
  checksum: string;

  /** Timestamp when move was made */
  timestamp: number;

  /** Whether this move was successfully shared via URL */
  synced: boolean;
}

/**
 * Zod schema for MoveHistoryEntry validation
 *
 * Used for localStorage validation to ensure data integrity.
 * Corrupted data is automatically removed on validation failure.
 */
export const MoveHistoryEntrySchema = z.object({
  moveNumber: z.number().int().min(0),
  player: PieceOwnerSchema,
  from: z.tuple([
    z.number().int().min(0).max(2),
    z.number().int().min(0).max(2),
  ]),
  to: z.union([
    z.tuple([
      z.number().int().min(0).max(2),
      z.number().int().min(0).max(2),
    ]),
    z.literal('off_board'),
  ]),
  piece: PieceSchema,
  captured: PieceSchema.nullable(),
  checksum: z.string(),
  timestamp: z.number(),
  synced: z.boolean(),
});

/**
 * Complete game history as array of moves
 */
export const GameHistorySchema = z.array(MoveHistoryEntrySchema);
export type GameHistory = z.infer<typeof GameHistorySchema>;
