/**
 * @fileoverview URL payload type definitions for Phase 3
 * @module lib/urlEncoding/types
 *
 * Three payload types:
 * - delta: One move + metadata (most common, ~80 chars compressed)
 * - full_state: Complete game state (initial game or resync, ~1500 chars)
 * - resync_request: Request full state with attempted move
 */

import { z } from 'zod';
import { GameStateSchema } from '@/lib/validation/schemas';

/**
 * Delta payload: One move with turn number and checksum
 *
 * Used for normal gameplay after initial game setup.
 * Smallest payload type (~80 chars compressed).
 */
export const DeltaPayloadSchema = z.object({
  type: z.literal('delta'),
  move: z.object({
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
  }),
  turn: z.number().int().min(0),
  checksum: z.string(),
  playerName: z.string().min(2).max(20).optional(),
});

export type DeltaPayload = z.infer<typeof DeltaPayloadSchema>;

/**
 * Full state payload: Complete game state
 *
 * Used for:
 * 1. Initial game setup (Player 1 → Player 2)
 * 2. Resync after divergence
 * 3. Manual state sharing
 */
export const FullStatePayloadSchema = z.object({
  type: z.literal('full_state'),
  gameState: GameStateSchema,
  playerName: z.string().min(2).max(20).optional(),
});

export type FullStatePayload = z.infer<typeof FullStatePayloadSchema>;

/**
 * Resync request payload: Request full state with attempted move
 *
 * Sent when checksum mismatch detected.
 * Includes the move player wanted to make so it can be applied
 * to synced state if legal.
 */
export const ResyncRequestPayloadSchema = z.object({
  type: z.literal('resync_request'),
  move: z.object({
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
  }),
  turn: z.number().int().min(0),
  checksum: z.string(),
  playerName: z.string().min(2).max(20).optional(),
  message: z.string().optional(),
});

export type ResyncRequestPayload = z.infer<typeof ResyncRequestPayloadSchema>;

/**
 * Discriminated union of all payload types
 *
 * Performance: 3x faster than regular union due to discriminator field.
 * TypeScript automatically narrows type based on 'type' field.
 */
export const UrlPayloadSchema = z.discriminatedUnion('type', [
  DeltaPayloadSchema,
  FullStatePayloadSchema,
  ResyncRequestPayloadSchema,
]);

export type UrlPayload = z.infer<typeof UrlPayloadSchema>;

/**
 * Type guard for delta payload
 */
export function isDeltaPayload(payload: UrlPayload): payload is DeltaPayload {
  return payload.type === 'delta';
}

/**
 * Type guard for full state payload
 */
export function isFullStatePayload(payload: UrlPayload): payload is FullStatePayload {
  return payload.type === 'full_state';
}

/**
 * Type guard for resync request payload
 */
export function isResyncRequestPayload(payload: UrlPayload): payload is ResyncRequestPayload {
  return payload.type === 'resync_request';
}
