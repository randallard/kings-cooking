/**
 * @fileoverview URL payload type definitions
 * @module lib/urlEncoding/types
 *
 * Single payload type:
 * - full_state: Complete game state (~1500 chars compressed)
 */

import { z } from 'zod';
import { GameStateSchema } from '@/lib/validation/schemas';

/**
 * Full state payload: Complete game state
 *
 * Used for all URL sharing.
 * Contains complete, self-contained game state.
 */
export const FullStatePayloadSchema = z.object({
  type: z.literal('full_state'),
  gameState: GameStateSchema,
  playerName: z.string().min(2).max(20).optional(),
});

export type FullStatePayload = z.infer<typeof FullStatePayloadSchema>;

/**
 * URL payload schema (currently only full_state)
 */
export const UrlPayloadSchema = FullStatePayloadSchema;

export type UrlPayload = FullStatePayload;

/**
 * Type guard for full state payload
 */
export function isFullStatePayload(payload: UrlPayload): payload is FullStatePayload {
  return payload.type === 'full_state';
}
