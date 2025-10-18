/**
 * @fileoverview History storage utilities for Phase 3
 * @module lib/history/storage
 *
 * Provides localStorage integration for game move history.
 * Follows the same validation patterns as src/lib/storage/localStorage.ts
 */

import { getValidatedItem, setValidatedItem } from '@/lib/storage/localStorage';
import {
  GameHistorySchema,
  MoveHistoryEntrySchema,
  type GameHistory,
  type MoveHistoryEntry,
} from './types';

/**
 * localStorage key for game history
 */
export const GAME_HISTORY_KEY = 'kings-cooking:game-history';

/**
 * Get complete game history from localStorage
 *
 * @returns Game history array or null if not found/invalid
 *
 * @example
 * ```typescript
 * const history = getGameHistory();
 * if (history) {
 *   console.log(`Found ${history.length} moves`);
 * }
 * ```
 */
export function getGameHistory(): GameHistory | null {
  return getValidatedItem(GAME_HISTORY_KEY, GameHistorySchema) as GameHistory | null;
}

/**
 * Save complete game history to localStorage
 *
 * @param history - Complete game history
 * @returns true if saved successfully, false otherwise
 *
 * @example
 * ```typescript
 * const success = setGameHistory(moves);
 * if (!success) {
 *   console.error('Failed to save history');
 * }
 * ```
 */
export function setGameHistory(history: GameHistory): boolean {
  return setValidatedItem(GAME_HISTORY_KEY, history, GameHistorySchema);
}

/**
 * Append a single move to game history
 *
 * This is the PRIMARY method for adding moves to history.
 * Called after each successful move in the game engine.
 *
 * @param entry - Move history entry to append
 * @returns true if saved successfully, false otherwise
 *
 * @example
 * ```typescript
 * const entry: MoveHistoryEntry = {
 *   moveNumber: 1,
 *   player: 'light',
 *   from: [2, 0],
 *   to: [1, 0],
 *   piece: movedPiece,
 *   captured: null,
 *   checksum: 'abc123',
 *   timestamp: Date.now(),
 *   synced: false
 * };
 *
 * const success = appendToHistory(entry);
 * ```
 */
export function appendToHistory(entry: MoveHistoryEntry): boolean {
  try {
    // Validate entry before adding
    const validatedEntry = MoveHistoryEntrySchema.parse(entry);

    // Get current history
    const currentHistory = getGameHistory() || [];

    // Append new entry
    const updatedHistory = [...currentHistory, validatedEntry];

    // Save back to localStorage
    return setGameHistory(updatedHistory);
  } catch (error) {
    console.error('Failed to append to history:', error);
    return false;
  }
}

/**
 * Clear all game history from localStorage
 *
 * Used when starting a new game or resetting state.
 *
 * @example
 * ```typescript
 * clearHistory();
 * console.log('History cleared');
 * ```
 */
export function clearHistory(): void {
  localStorage.removeItem(GAME_HISTORY_KEY);
}

/**
 * Mark specific history entry as synced
 *
 * Called after successfully sharing a move via URL.
 * Updates the 'synced' flag for the given move number.
 *
 * @param moveNumber - Move number to mark as synced
 * @returns true if updated successfully, false otherwise
 *
 * @example
 * ```typescript
 * // After generating URL for move 5
 * markHistoryAsSynced(5);
 * ```
 */
export function markHistoryAsSynced(moveNumber: number): boolean {
  try {
    const history = getGameHistory();
    if (!history) {
      console.warn('No history found to mark as synced');
      return false;
    }

    // Find entry with matching move number
    const entryIndex = history.findIndex((entry) => entry.moveNumber === moveNumber);

    if (entryIndex === -1) {
      console.warn(`Move number ${moveNumber} not found in history`);
      return false;
    }

    // Update synced flag
    const updatedHistory = [...history];
    updatedHistory[entryIndex] = {
      ...updatedHistory[entryIndex]!,
      synced: true,
    };

    // Save back to localStorage
    return setGameHistory(updatedHistory);
  } catch (error) {
    console.error('Failed to mark history as synced:', error);
    return false;
  }
}

/**
 * Get the last N moves from history
 *
 * Useful for displaying recent moves in UI without loading full history.
 *
 * @param count - Number of recent moves to retrieve (default: 10)
 * @returns Array of recent moves or empty array
 *
 * @example
 * ```typescript
 * const recentMoves = getRecentHistory(5);
 * // Returns last 5 moves
 * ```
 */
export function getRecentHistory(count: number = 10): GameHistory {
  const history = getGameHistory();
  if (!history) return [];

  return history.slice(-count);
}

/**
 * Get history entry by move number
 *
 * @param moveNumber - Move number to retrieve
 * @returns History entry or null if not found
 *
 * @example
 * ```typescript
 * const move5 = getHistoryByMoveNumber(5);
 * if (move5) {
 *   console.log('Move 5 checksum:', move5.checksum);
 * }
 * ```
 */
export function getHistoryByMoveNumber(moveNumber: number): MoveHistoryEntry | null {
  const history = getGameHistory();
  if (!history) return null;

  return history.find((entry) => entry.moveNumber === moveNumber) ?? null;
}
