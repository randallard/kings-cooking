/**
 * @fileoverview Player name extraction and storage for Phase 3
 * @module lib/urlEncoding/playerNames
 *
 * Handles extracting opponent names from URL payloads and saving to localStorage.
 * Used in URL mode to automatically discover and save opponent identity.
 */

import type { UrlPayload } from './types';

/**
 * localStorage key for opponent name
 */
export const OPPONENT_NAME_KEY = 'kings-cooking:opponent-name';

/**
 * Extract and save opponent name from URL payload
 *
 * For URL Mode player name discovery flow:
 * 1. Player 1 creates game with their name in gameState.lightPlayer.name
 * 2. Player 2 receives full_state URL → saves Player 1's name as opponent
 * 3. Every move includes complete game state with both player names
 *
 * @param payload - URL payload (full_state only)
 * @param myPlayerId - Current player's UUID (to avoid saving own name)
 *
 * @example
 * ```typescript
 * // Player 2 receives game state from Player 1
 * const payload: FullStatePayload = {
 *   type: 'full_state',
 *   gameState: { lightPlayer: { id: '...', name: 'Alice' }, ... }
 * };
 * extractAndSaveOpponentName(payload, myPlayerId);
 * // Saves 'Alice' to localStorage
 * ```
 */
export function extractAndSaveOpponentName(
  payload: UrlPayload,
  myPlayerId: string
): void {
  try {
    if (payload.type === 'full_state') {
      // Extract opponent name from game state
      const lightPlayerId = payload.gameState.lightPlayer.id;
      const darkPlayerId = payload.gameState.darkPlayer.id;

      let opponentName: string | undefined;

      if (lightPlayerId === myPlayerId) {
        // I'm the light player, opponent is dark player
        opponentName = payload.gameState.darkPlayer.name;
      } else if (darkPlayerId === myPlayerId) {
        // I'm the dark player, opponent is light player
        opponentName = payload.gameState.lightPlayer.name;
      }
      // else: I'm not in this game, don't save anything

      // Save to localStorage if we found an opponent
      if (opponentName) {
        localStorage.setItem(OPPONENT_NAME_KEY, opponentName);
        console.log(`Opponent name saved: ${opponentName}`);
      }
    }
  } catch (error) {
    console.error('Failed to extract and save opponent name:', error);
  }
}

/**
 * Get saved opponent name from localStorage
 *
 * @returns Opponent name or null if not found
 *
 * @example
 * ```typescript
 * const opponentName = getOpponentName();
 * if (opponentName) {
 *   console.log(`Playing against ${opponentName}`);
 * }
 * ```
 */
export function getOpponentName(): string | null {
  try {
    return localStorage.getItem(OPPONENT_NAME_KEY);
  } catch (error) {
    console.error('Failed to get opponent name:', error);
    return null;
  }
}

/**
 * Clear saved opponent name from localStorage
 *
 * Called when starting a new game.
 *
 * @example
 * ```typescript
 * clearOpponentName();
 * ```
 */
export function clearOpponentName(): void {
  localStorage.removeItem(OPPONENT_NAME_KEY);
}
