/**
 * @fileoverview Player name extraction and storage for Phase 3
 * @module lib/urlEncoding/playerNames
 *
 * Handles extracting opponent names from URL payloads and saving to localStorage.
 * Used in URL mode to automatically discover and save opponent identity.
 */

import type { UrlPayload } from './types';
import type { GameState } from '@/lib/validation/schemas';

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
 * 3. Player 2 makes first move → includes their name in delta.playerName
 * 4. Player 1 receives delta → saves Player 2's name as opponent
 * 5. If localStorage lost, resync_request includes playerName
 *
 * @param payload - URL payload (delta, full_state, or resync_request)
 * @param myPlayerId - Current player's UUID (to avoid saving own name)
 *
 * @example
 * ```typescript
 * // Player 2 receives initial game from Player 1
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
    let opponentName: string | undefined;

    if (payload.type === 'full_state') {
      // Receiving initial game state from Player 1
      // Opponent is always the white player (game creator)
      const lightPlayerId = payload.gameState.lightPlayer.id;

      if (lightPlayerId !== myPlayerId) {
        opponentName = payload.gameState.lightPlayer.name;
      }
    } else if (payload.type === 'delta' && payload.playerName) {
      // Receiving first move from opponent with their name
      opponentName = payload.playerName;
    } else if (payload.type === 'resync_request' && payload.playerName) {
      // Receiving resync request (localStorage may have been lost)
      opponentName = payload.playerName;
    }

    // Save to localStorage if we found a name
    if (opponentName) {
      localStorage.setItem(OPPONENT_NAME_KEY, opponentName);
      console.log(`Opponent name saved: ${opponentName}`);
    }
  } catch (error) {
    console.error('Failed to extract and save opponent name:', error);
  }
}

/**
 * Determine if we should include playerName in outgoing payload
 *
 * Include playerName when:
 * - Delta payload: First move as black player (turn 1)
 * - Resync request: Always (opponent may have lost localStorage)
 *
 * @param gameState - Current game state
 * @param payloadType - Type of payload being created
 * @returns true if we should include playerName field
 *
 * @example
 * ```typescript
 * const gameState = engine.getGameState();
 * const shouldInclude = shouldIncludePlayerName(
 *   gameState,
 *   'delta'
 * );
 *
 * if (shouldInclude) {
 *   payload.playerName = myName;
 * }
 * ```
 */
export function shouldIncludePlayerName(
  gameState: GameState,
  payloadType: 'delta' | 'resync_request'
): boolean {
  // For delta payloads: Include if we're black player on first move (turn 1)
  if (payloadType === 'delta') {
    // Turn 1 is when black player makes their first move (turn 0 is white's first move)
    // Dark player needs to send their name so white player knows who they are
    if (gameState.currentPlayer === 'dark' && gameState.currentTurn === 1) {
      return true;
    }
  }

  // For resync requests: Always include (opponent may have lost localStorage)
  if (payloadType === 'resync_request') {
    return true;
  }

  return false;
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
