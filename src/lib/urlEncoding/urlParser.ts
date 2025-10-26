/**
 * @fileoverview URL parser utilities for processing shareable game URLs
 * @module lib/urlEncoding/urlParser
 *
 * Multi-layer validation pipeline:
 * 1. Decompression (lz-string)
 * 2. JSON parsing
 * 3. Zod schema validation
 * 4. Game engine validation
 */

import { decompressPayload } from './compression';
import type { UrlPayload, FullStatePayload } from './types';
import { KingsChessEngine } from '@/lib/chess/KingsChessEngine';
import type { GameId, Piece } from '@/lib/validation/schemas';

/**
 * Compute checksum for game state validation
 *
 * This duplicates the logic from KingsChessEngine.generateChecksum()
 * to allow validation without creating an engine instance.
 *
 * @param gameId - Game ID
 * @param turn - Turn number
 * @param board - Board state
 * @returns Checksum string
 */
function computeChecksum(
  gameId: GameId,
  turn: number,
  board: (Piece | null)[][]
): string {
  const data = `${gameId}-${turn}-${JSON.stringify(board)}`;
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(36);
}

/**
 * Parse result interface
 */
export interface ParseResult {
  success: boolean;
  payload?: UrlPayload;
  error?: string;
}

/**
 * Apply result interface
 */
export interface ApplyResult {
  success: boolean;
  engine?: KingsChessEngine;
  error?: string;
  warnings?: string[];
}

/**
 * Parse URL hash fragment to validated payload
 *
 * Multi-layer validation:
 * - Decompression check
 * - JSON parsing check
 * - Zod schema validation
 *
 * @param hash - URL hash fragment (with or without leading #)
 * @returns Parse result with payload or error
 *
 * @example
 * const hash = window.location.hash;
 * const result = parseUrlHash(hash);
 *
 * if (result.success && result.payload) {
 *   // Handle full state payload
 * }
 */
export function parseUrlHash(hash: string): ParseResult {
  // Remove leading # if present
  const cleanHash = hash.startsWith('#') ? hash.slice(1) : hash;

  if (!cleanHash.trim()) {
    return {
      success: false,
      error: 'Empty hash fragment',
    };
  }

  // Decompress and validate
  const payload = decompressPayload(cleanHash);

  if (!payload) {
    return {
      success: false,
      error: 'Failed to decompress or validate payload. The URL may be corrupted.',
    };
  }

  return {
    success: true,
    payload,
  };
}

/**
 * Apply payload to game engine
 *
 * Creates new engine from complete game state.
 * All URLs now contain full state payloads.
 *
 * @param payload - Validated URL payload (always full_state)
 * @param currentEngine - Unused (kept for backward compatibility)
 * @returns Apply result with updated engine or error
 *
 * @example
 * const parseResult = parseUrlHash(hash);
 * if (parseResult.success && parseResult.payload) {
 *   const applyResult = applyPayloadToEngine(parseResult.payload);
 *   if (applyResult.success && applyResult.engine) {
 *     // Update game with new engine
 *     setEngine(applyResult.engine);
 *   }
 * }
 */
export function applyPayloadToEngine(
  payload: UrlPayload
): ApplyResult {
  // Payload is always FullStatePayload now
  return applyFullStatePayload(payload);
}

/**
 * Apply full state payload
 *
 * Creates new engine from complete game state.
 * Validates state with Zod schema.
 *
 * @param payload - Full state payload
 * @returns Apply result
 */
function applyFullStatePayload(payload: FullStatePayload): ApplyResult {
  const warnings: string[] = [];

  try {
    // First, compute what the checksum SHOULD be for this state
    // This prevents accepting tampered states with matching but incorrect checksums
    const expectedChecksum = computeChecksum(
      payload.gameState.gameId,
      payload.gameState.currentTurn,
      payload.gameState.board
    );

    // Verify the payload's checksum matches the computed one
    if (expectedChecksum !== payload.gameState.checksum) {
      return {
        success: false,
        error: `Checksum mismatch in full state. Expected ${expectedChecksum}, got ${payload.gameState.checksum}. State may have been tampered with.`,
      };
    }

    // Create engine from state (validates with Zod)
    const engine = KingsChessEngine.fromJSON(payload.gameState);

    // Save opponent name if provided
    if (payload.playerName) {
      warnings.push(`Opponent name: ${payload.playerName}`);
    }

    if (warnings.length > 0) {
      return {
        success: true,
        engine,
        warnings,
      };
    }

    return {
      success: true,
      engine,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to create engine from state: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Extract opponent name from payload
 *
 * Returns the light player name from the game state.
 *
 * @param payload - Full state URL payload
 * @returns Opponent name (light player)
 */
export function extractOpponentName(payload: UrlPayload): string | null {
  // For full_state, opponent is the light player (game creator)
  return payload.gameState.lightPlayer.name;
}
