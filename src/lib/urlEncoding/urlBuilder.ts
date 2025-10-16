/**
 * @fileoverview URL builder utilities for generating shareable game URLs
 * @module lib/urlEncoding/urlBuilder
 *
 * Provides functions to build URLs for different payload types:
 * - Delta URLs: Share a single move (~80 chars compressed)
 * - Full state URLs: Share complete game state (~1500 chars compressed)
 * - Resync request URLs: Request opponent's full state
 */

import { compressPayload } from './compression';
import type { DeltaPayload, FullStatePayload, ResyncRequestPayload } from './types';
import type { GameState } from '@/lib/validation/schemas';

/**
 * Build URL for delta payload (single move)
 *
 * @param move - Move to encode { from, to }
 * @param turn - Current turn number
 * @param checksum - Checksum after this move
 * @param playerName - Optional player name (for first move by black player)
 * @returns URL hash fragment
 *
 * @example
 * const url = buildDeltaUrl(
 *   { from: [2, 0], to: [1, 0] },
 *   1,
 *   'abc123',
 *   'Player 2'
 * );
 * // Returns: "#N4IgdghgtgpiBcIDaB..."
 */
export function buildDeltaUrl(
  move: { from: [number, number]; to: [number, number] | 'off_board' },
  turn: number,
  checksum: string,
  playerName?: string
): string {
  const payload: DeltaPayload = {
    type: 'delta',
    move,
    turn,
    checksum,
    ...(playerName && { playerName }),
  };

  const compressed = compressPayload(payload);
  if (!compressed) {
    console.error('Failed to compress delta payload');
    return '';
  }

  return `#${compressed}`;
}

/**
 * Build URL for full state payload (complete game state)
 *
 * Used for:
 * - Initial game setup (Player 1 → Player 2)
 * - Resync after divergence
 * - Manual state sharing
 *
 * @param gameState - Complete game state
 * @param playerName - Optional player name
 * @returns URL hash fragment
 *
 * @example
 * const url = buildFullStateUrl(gameState, 'Player 1');
 * // Returns: "#N4IgdghgtgpiBcIDaB..." (longer than delta)
 */
export function buildFullStateUrl(
  gameState: GameState,
  playerName?: string
): string {
  const payload: FullStatePayload = {
    type: 'full_state',
    gameState,
    ...(playerName && { playerName }),
  };

  const compressed = compressPayload(payload);
  if (!compressed) {
    console.error('Failed to compress full state payload');
    return '';
  }

  return `#${compressed}`;
}

/**
 * Build URL for resync request payload
 *
 * Sent when checksum mismatch detected.
 * Includes the move player wanted to make so it can be applied
 * to synced state if legal.
 *
 * @param move - Move that triggered the resync request
 * @param turn - Turn number when mismatch was detected
 * @param checksum - Player's checksum before the attempted move
 * @param playerName - Player name (always included in resync)
 * @param message - Optional explanation message
 * @returns URL hash fragment
 *
 * @example
 * const url = buildResyncRequestUrl(
 *   { from: [1, 1], to: [2, 2] },
 *   5,
 *   'mismatch123',
 *   'Player 2',
 *   'Checksums do not match'
 * );
 * // Returns: "#N4IgdghgtgpiBcIDaB..."
 */
export function buildResyncRequestUrl(
  move: { from: [number, number]; to: [number, number] | 'off_board' },
  turn: number,
  checksum: string,
  playerName: string,
  message?: string
): string {
  const payload: ResyncRequestPayload = {
    type: 'resync_request',
    move,
    turn,
    checksum,
    playerName,
    ...(message && { message }),
  };

  const compressed = compressPayload(payload);
  if (!compressed) {
    console.error('Failed to compress resync request payload');
    return '';
  }

  return `#${compressed}`;
}

/**
 * Build complete shareable URL with base URL
 *
 * @param baseUrl - Base URL (e.g., window.location.origin + window.location.pathname)
 * @param hashFragment - Hash fragment from build*Url functions
 * @returns Complete shareable URL
 *
 * @example
 * const hash = buildDeltaUrl(move, turn, checksum);
 * const fullUrl = buildCompleteUrl('https://example.com/game', hash);
 * // Returns: "https://example.com/game#N4IgdghgtgpiBcIDaB..."
 */
export function buildCompleteUrl(baseUrl: string, hashFragment: string): string {
  // Remove trailing slash from base URL
  const cleanBase = baseUrl.replace(/\/$/, '');

  // Remove leading # from hash if present
  const cleanHash = hashFragment.startsWith('#') ? hashFragment : `#${hashFragment}`;

  return `${cleanBase}${cleanHash}`;
}
