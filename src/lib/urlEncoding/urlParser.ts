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
import type { UrlPayload, DeltaPayload, FullStatePayload, ResyncRequestPayload } from './types';
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
 *   if (result.payload.type === 'delta') {
 *     // Handle delta payload
 *   }
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
 * Handles three payload types:
 * - delta: Apply single move to existing engine
 * - full_state: Create new engine from complete state
 * - resync_request: Return error, requires manual handling
 *
 * @param payload - Validated URL payload
 * @param currentEngine - Current game engine (required for delta)
 * @returns Apply result with updated engine or error
 *
 * @example
 * const parseResult = parseUrlHash(hash);
 * if (parseResult.success && parseResult.payload) {
 *   const applyResult = applyPayloadToEngine(parseResult.payload, engine);
 *   if (applyResult.success && applyResult.engine) {
 *     // Update game with new engine
 *     setEngine(applyResult.engine);
 *   }
 * }
 */
export function applyPayloadToEngine(
  payload: UrlPayload,
  currentEngine?: KingsChessEngine
): ApplyResult {
  switch (payload.type) {
    case 'delta':
      return applyDeltaPayload(payload, currentEngine);

    case 'full_state':
      return applyFullStatePayload(payload);

    case 'resync_request':
      return handleResyncRequest(payload);

    default:
      return {
        success: false,
        error: 'Unknown payload type',
      };
  }
}

/**
 * Apply delta payload to existing engine
 *
 * Validates:
 * - Engine exists
 * - Turn numbers match
 * - Move is legal
 * - Checksums match after move
 *
 * @param payload - Delta payload
 * @param currentEngine - Current game engine
 * @returns Apply result
 */
function applyDeltaPayload(
  payload: DeltaPayload,
  currentEngine?: KingsChessEngine
): ApplyResult {
  if (!currentEngine) {
    return {
      success: false,
      error: 'No current engine. Use full_state payload to initialize game.',
    };
  }

  const warnings: string[] = [];

  // Check turn number
  const currentState = currentEngine.getGameState();
  if (payload.turn !== currentState.currentTurn) {
    return {
      success: false,
      error: `Turn mismatch. Expected turn ${currentState.currentTurn}, received turn ${payload.turn}.`,
    };
  }

  // Create a copy of engine to test move
  const testEngine = KingsChessEngine.fromJSON(currentState);

  // Attempt move
  const moveResult = testEngine.makeMove(payload.move.from, payload.move.to);

  if (!moveResult.success) {
    return {
      success: false,
      error: `Invalid move: ${moveResult.error}`,
    };
  }

  // Verify checksum after move
  const checksumAfterMove = testEngine.getChecksum();
  if (checksumAfterMove !== payload.checksum) {
    return {
      success: false,
      error: `Checksum mismatch after move. Expected ${payload.checksum}, got ${checksumAfterMove}. Game states have diverged.`,
    };
  }

  // Save opponent name if provided
  if (payload.playerName) {
    warnings.push(`Opponent name: ${payload.playerName}`);
  }

  if (warnings.length > 0) {
    return {
      success: true,
      engine: testEngine,
      warnings,
    };
  }

  return {
    success: true,
    engine: testEngine,
  };
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
 * Handle resync request payload
 *
 * Resync requests require manual handling:
 * - User should send their full_state to opponent
 * - Opponent will apply their attempted move if legal
 *
 * @param payload - Resync request payload
 * @returns Error result (requires manual handling)
 */
function handleResyncRequest(payload: ResyncRequestPayload): ApplyResult {
  const message = payload.message || 'Opponent requested full state resync';
  const playerInfo = payload.playerName ? ` from ${payload.playerName}` : '';

  return {
    success: false,
    error: `Resync request received${playerInfo}: ${message}. Please send your full game state to opponent.`,
  };
}

/**
 * Extract opponent name from payload
 *
 * Helper function to get opponent name from any payload type.
 * Returns null if no name is present.
 *
 * @param payload - Any URL payload
 * @returns Opponent name or null
 */
export function extractOpponentName(payload: UrlPayload): string | null {
  if (payload.type === 'full_state') {
    // For full_state, opponent is the white player (game creator)
    return payload.gameState.whitePlayer.name;
  }

  if (payload.type === 'delta' || payload.type === 'resync_request') {
    return payload.playerName || null;
  }

  return null;
}
