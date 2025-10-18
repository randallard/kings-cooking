/**
 * @fileoverview Type-safe localStorage utilities with Zod validation
 * @module lib/storage/localStorage
 *
 * All localStorage operations MUST go through these utilities to ensure:
 * - Runtime validation with Zod
 * - Automatic corruption handling
 * - Type safety
 *
 * @see localStorage-react-patterns-2024-2025.md
 * @see ZOD_VALIDATION_PATTERNS_RESEARCH.md Section 4
 */

import { z } from 'zod';
import { GameStateSchema, type GameState } from '../validation/schemas';

// ============================================================================
// Storage Keys
// ============================================================================

/**
 * localStorage keys used by King's Cooking.
 * Namespaced with 'kings-cooking:' to avoid conflicts.
 */
export const STORAGE_KEYS = {
  /** Current player's name (used in both modes) */
  MY_NAME: 'kings-cooking:my-name',

  /** Current player's persistent UUID (URL mode) */
  MY_PLAYER_ID: 'kings-cooking:my-player-id',

  /** Player 1 name (hot-seat mode only) */
  PLAYER1_NAME: 'kings-cooking:player1-name',

  /** Player 2 name (hot-seat mode only) */
  PLAYER2_NAME: 'kings-cooking:player2-name',

  /** Current game state */
  GAME_STATE: 'kings-cooking:game-state',

  /** Selected game mode */
  GAME_MODE: 'kings-cooking:game-mode',

  /** Player 1 has seen story/instructions */
  PLAYER1_SEEN_STORY: 'kings-cooking:player1-seen-story',

  /** Player 2 has seen story/instructions */
  PLAYER2_SEEN_STORY: 'kings-cooking:player2-seen-story',
} as const;

// ============================================================================
// Generic Validation Utilities
// ============================================================================

/**
 * Safely retrieves and validates data from localStorage.
 *
 * CRITICAL: This is the PRIMARY method for loading data from localStorage.
 * It ensures all external data is validated before use.
 *
 * @param key - localStorage key
 * @param schema - Zod schema to validate against
 * @returns Validated data or null if missing/invalid
 *
 * @example
 * ```typescript
 * const name = getValidatedItem(STORAGE_KEYS.MY_NAME, z.string());
 * if (name) {
 *   console.log('Player name:', name);
 * }
 * ```
 *
 * @see ZOD_VALIDATION_PATTERNS_RESEARCH.md lines 296-335
 */
export function getValidatedItem<T>(
  key: string,
  schema: z.ZodType<T>
): T | null {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return null;

    const parsed: unknown = JSON.parse(stored);
    const result = schema.safeParse(parsed);

    if (result.success) {
      return result.data;
    } else {
      console.error(`Invalid localStorage data for key "${key}":`, result.error.format());
      // CRITICAL: Remove corrupted data (ZOD_VALIDATION_PATTERNS_RESEARCH.md lines 337-354)
      localStorage.removeItem(key);
      return null;
    }
  } catch (error) {
    console.error(`Failed to load localStorage key "${key}":`, error);
    localStorage.removeItem(key);
    return null;
  }
}

/**
 * Safely saves and validates data to localStorage.
 *
 * @param key - localStorage key
 * @param value - Data to save
 * @param schema - Zod schema to validate against
 * @returns true if saved successfully, false otherwise
 *
 * @example
 * ```typescript
 * const success = setValidatedItem(
 *   STORAGE_KEYS.MY_NAME,
 *   'Alice',
 *   z.string().min(1).max(20)
 * );
 * ```
 */
export function setValidatedItem<T>(
  key: string,
  value: T,
  schema: z.ZodType<T>
): boolean {
  try {
    // Validate before saving
    const validated = schema.parse(value);
    localStorage.setItem(key, JSON.stringify(validated));
    return true;
  } catch (error) {
    console.error(`Failed to save localStorage key "${key}":`, error);
    return false;
  }
}

/**
 * Removes an item from localStorage.
 *
 * @param key - localStorage key to remove
 */
export function removeItem(key: string): void {
  localStorage.removeItem(key);
}

/**
 * Clears all King's Cooking data from localStorage.
 * Useful for testing or "reset game" functionality.
 */
export function clearGameStorage(): void {
  Object.values(STORAGE_KEYS).forEach((key) => {
    localStorage.removeItem(key);
  });
}

// ============================================================================
// Specific Storage Helpers
// ============================================================================

const NameSchema = z.string().min(1).max(20);
const PlayerIdSchema = z.string().uuid();
const GameModeSchema = z.enum(['hotseat', 'url']);
const SeenStorySchema = z.boolean();

/**
 * Typed storage interface with validation.
 * Provides convenience methods for specific data types.
 */
export const storage = {
  // Player name (URL mode - current player)
  getMyName: (): string | null =>
    getValidatedItem(STORAGE_KEYS.MY_NAME, NameSchema),

  setMyName: (name: string): boolean =>
    setValidatedItem(STORAGE_KEYS.MY_NAME, name, NameSchema),

  // Player ID (URL mode - persistent identity)
  getMyPlayerId: (): string | null =>
    getValidatedItem(STORAGE_KEYS.MY_PLAYER_ID, PlayerIdSchema),

  setMyPlayerId: (id: string): boolean =>
    setValidatedItem(STORAGE_KEYS.MY_PLAYER_ID, id, PlayerIdSchema),

  // Player names (hot-seat mode)
  getPlayer1Name: (): string | null =>
    getValidatedItem(STORAGE_KEYS.PLAYER1_NAME, NameSchema),

  setPlayer1Name: (name: string): boolean =>
    setValidatedItem(STORAGE_KEYS.PLAYER1_NAME, name, NameSchema),

  getPlayer2Name: (): string | null =>
    getValidatedItem(STORAGE_KEYS.PLAYER2_NAME, NameSchema),

  setPlayer2Name: (name: string): boolean =>
    setValidatedItem(STORAGE_KEYS.PLAYER2_NAME, name, NameSchema),

  // Game mode
  getGameMode: (): 'hotseat' | 'url' | null =>
    getValidatedItem(STORAGE_KEYS.GAME_MODE, GameModeSchema),

  setGameMode: (mode: 'hotseat' | 'url'): boolean =>
    setValidatedItem(STORAGE_KEYS.GAME_MODE, mode, GameModeSchema),

  // Game state (with full validation)
  getGameState: (): GameState | null =>
    getValidatedItem(STORAGE_KEYS.GAME_STATE, GameStateSchema) as GameState | null,

  setGameState: (state: GameState): boolean =>
    setValidatedItem(STORAGE_KEYS.GAME_STATE, state, GameStateSchema),

  // Story/instructions panel flags
  getPlayer1SeenStory: (): boolean | null =>
    getValidatedItem(STORAGE_KEYS.PLAYER1_SEEN_STORY, SeenStorySchema),

  setPlayer1SeenStory: (seen: boolean): boolean =>
    setValidatedItem(STORAGE_KEYS.PLAYER1_SEEN_STORY, seen, SeenStorySchema),

  getPlayer2SeenStory: (): boolean | null =>
    getValidatedItem(STORAGE_KEYS.PLAYER2_SEEN_STORY, SeenStorySchema),

  setPlayer2SeenStory: (seen: boolean): boolean =>
    setValidatedItem(STORAGE_KEYS.PLAYER2_SEEN_STORY, seen, SeenStorySchema),

  // Clear all
  clearAll: clearGameStorage,
};
