/**
 * @fileoverview URL builder utilities for generating shareable game URLs
 * @module lib/urlEncoding/urlBuilder
 *
 * Provides functions to build URLs with full game state payloads.
 */

import { compressPayload } from './compression';
import type { FullStatePayload } from './types';
import type { GameState } from '@/lib/validation/schemas';

/**
 * Build URL for full state payload (complete game state)
 *
 * Used for all URL sharing.
 * Contains complete, self-contained game state.
 *
 * @param gameState - Complete game state
 * @param playerName - Optional player name
 * @returns URL hash fragment
 *
 * @example
 * const url = buildFullStateUrl(gameState, 'Player 1');
 * // Returns: "#N4IgdghgtgpiBcIDaB..." (~1500 chars compressed)
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
 * Build complete shareable URL with base URL
 *
 * @param baseUrl - Base URL (e.g., window.location.origin + window.location.pathname)
 * @param hashFragment - Hash fragment from buildFullStateUrl
 * @returns Complete shareable URL
 *
 * @example
 * const hash = buildFullStateUrl(gameState, playerName);
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
