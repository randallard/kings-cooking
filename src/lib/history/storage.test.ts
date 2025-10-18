/**
 * @fileoverview Tests for history storage utilities
 * @module lib/history/storage.test
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { v4 as uuid } from 'uuid';
import {
  getGameHistory,
  setGameHistory,
  appendToHistory,
  clearHistory,
  markHistoryAsSynced,
  getRecentHistory,
  getHistoryByMoveNumber,
  GAME_HISTORY_KEY,
} from './storage';
import type { MoveHistoryEntry, GameHistory } from './types';

// Mock piece for tests
const mockPiece = {
  type: 'rook' as const,
  owner: 'light' as const,
  position: [2, 0] as [number, number],
  moveCount: 1,
  id: uuid(),
};

// Mock history entry
const createMockEntry = (moveNumber: number, synced: boolean = false): MoveHistoryEntry => ({
  moveNumber,
  player: moveNumber % 2 === 0 ? 'light' : 'dark',
  from: [2, 0],
  to: [1, 0],
  piece: mockPiece,
  captured: null,
  checksum: `checksum-${moveNumber}`,
  timestamp: Date.now() + moveNumber * 1000,
  synced,
});

describe('History Storage', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    // Clean up after each test
    localStorage.clear();
  });

  describe('getGameHistory', () => {
    it('should return null when no history exists', () => {
      const result = getGameHistory();
      expect(result).toBeNull();
    });

    it('should return empty array when localStorage contains empty array', () => {
      localStorage.setItem(GAME_HISTORY_KEY, JSON.stringify([]));
      const result = getGameHistory();
      expect(result).toEqual([]);
    });

    it('should return validated history from localStorage', () => {
      const history: GameHistory = [createMockEntry(0), createMockEntry(1)];
      localStorage.setItem(GAME_HISTORY_KEY, JSON.stringify(history));

      const result = getGameHistory();
      expect(result).toEqual(history);
    });

    it('should return null and remove corrupted data', () => {
      localStorage.setItem(GAME_HISTORY_KEY, 'invalid-json');
      const result = getGameHistory();
      expect(result).toBeNull();
      expect(localStorage.getItem(GAME_HISTORY_KEY)).toBeNull();
    });

    it('should return null for invalid schema and remove data', () => {
      const invalid = [{ invalid: 'data' }];
      localStorage.setItem(GAME_HISTORY_KEY, JSON.stringify(invalid));

      const result = getGameHistory();
      expect(result).toBeNull();
      expect(localStorage.getItem(GAME_HISTORY_KEY)).toBeNull();
    });
  });

  describe('setGameHistory', () => {
    it('should save valid history to localStorage', () => {
      const history: GameHistory = [createMockEntry(0)];
      const success = setGameHistory(history);

      expect(success).toBe(true);
      const stored = localStorage.getItem(GAME_HISTORY_KEY);
      expect(stored).toBeTruthy();
      expect(JSON.parse(stored!)).toEqual(history);
    });

    it('should save empty array', () => {
      const success = setGameHistory([]);
      expect(success).toBe(true);

      const result = getGameHistory();
      expect(result).toEqual([]);
    });

    it('should handle multiple entries', () => {
      const history: GameHistory = [
        createMockEntry(0),
        createMockEntry(1),
        createMockEntry(2),
      ];

      const success = setGameHistory(history);
      expect(success).toBe(true);

      const result = getGameHistory();
      expect(result).toEqual(history);
    });
  });

  describe('appendToHistory', () => {
    it('should append to empty history', () => {
      const entry = createMockEntry(0);
      const success = appendToHistory(entry);

      expect(success).toBe(true);

      const result = getGameHistory();
      expect(result).toEqual([entry]);
    });

    it('should append to existing history', () => {
      const entry1 = createMockEntry(0);
      const entry2 = createMockEntry(1);

      appendToHistory(entry1);
      const success = appendToHistory(entry2);

      expect(success).toBe(true);

      const result = getGameHistory();
      expect(result).toEqual([entry1, entry2]);
    });

    it('should preserve existing entries when appending', () => {
      const entries = [
        createMockEntry(0),
        createMockEntry(1),
        createMockEntry(2),
      ];

      entries.forEach((entry) => appendToHistory(entry));

      const result = getGameHistory();
      expect(result).toHaveLength(3);
      expect(result).toEqual(entries);
    });

    it('should validate entry before appending', () => {
      const invalidEntry = { invalid: 'data' } as unknown as MoveHistoryEntry;
      const success = appendToHistory(invalidEntry);

      expect(success).toBe(false);

      const result = getGameHistory();
      expect(result).toBeNull();
    });
  });

  describe('clearHistory', () => {
    it('should remove history from localStorage', () => {
      const history: GameHistory = [createMockEntry(0)];
      setGameHistory(history);

      clearHistory();

      expect(localStorage.getItem(GAME_HISTORY_KEY)).toBeNull();
      expect(getGameHistory()).toBeNull();
    });

    it('should handle clearing when no history exists', () => {
      clearHistory();
      expect(localStorage.getItem(GAME_HISTORY_KEY)).toBeNull();
    });
  });

  describe('markHistoryAsSynced', () => {
    it('should mark specific move as synced', () => {
      const history: GameHistory = [
        createMockEntry(0, false),
        createMockEntry(1, false),
        createMockEntry(2, false),
      ];
      setGameHistory(history);

      const success = markHistoryAsSynced(1);
      expect(success).toBe(true);

      const result = getGameHistory();
      expect(result![0]!.synced).toBe(false);
      expect(result![1]!.synced).toBe(true);
      expect(result![2]!.synced).toBe(false);
    });

    it('should return false when no history exists', () => {
      const success = markHistoryAsSynced(0);
      expect(success).toBe(false);
    });

    it('should return false when move number not found', () => {
      const history: GameHistory = [createMockEntry(0)];
      setGameHistory(history);

      const success = markHistoryAsSynced(999);
      expect(success).toBe(false);
    });

    it('should preserve other entry properties', () => {
      const entry = createMockEntry(0, false);
      setGameHistory([entry]);

      markHistoryAsSynced(0);

      const result = getGameHistory();
      expect(result![0]).toMatchObject({
        ...entry,
        synced: true,
      });
    });
  });

  describe('getRecentHistory', () => {
    it('should return empty array when no history exists', () => {
      const result = getRecentHistory();
      expect(result).toEqual([]);
    });

    it('should return all entries when fewer than limit', () => {
      const history: GameHistory = [
        createMockEntry(0),
        createMockEntry(1),
        createMockEntry(2),
      ];
      setGameHistory(history);

      const result = getRecentHistory(10);
      expect(result).toEqual(history);
    });

    it('should return last N entries when more than limit', () => {
      const history: GameHistory = Array.from({ length: 20 }, (_, i) =>
        createMockEntry(i)
      );
      setGameHistory(history);

      const result = getRecentHistory(5);
      expect(result).toHaveLength(5);
      expect(result[0]!.moveNumber).toBe(15);
      expect(result[4]!.moveNumber).toBe(19);
    });

    it('should default to 10 entries', () => {
      const history: GameHistory = Array.from({ length: 20 }, (_, i) =>
        createMockEntry(i)
      );
      setGameHistory(history);

      const result = getRecentHistory();
      expect(result).toHaveLength(10);
      expect(result[0]!.moveNumber).toBe(10);
    });
  });

  describe('getHistoryByMoveNumber', () => {
    it('should return null when no history exists', () => {
      const result = getHistoryByMoveNumber(0);
      expect(result).toBeNull();
    });

    it('should return entry with matching move number', () => {
      const history: GameHistory = [
        createMockEntry(0),
        createMockEntry(1),
        createMockEntry(2),
      ];
      setGameHistory(history);

      const result = getHistoryByMoveNumber(1);
      expect(result).toEqual(history[1]);
    });

    it('should return null when move number not found', () => {
      const history: GameHistory = [createMockEntry(0)];
      setGameHistory(history);

      const result = getHistoryByMoveNumber(999);
      expect(result).toBeNull();
    });

    it('should return first matching entry if duplicates exist', () => {
      const entry1 = createMockEntry(1);
      const entry2 = { ...createMockEntry(1), timestamp: Date.now() + 5000 };
      const history: GameHistory = [entry1, entry2];
      setGameHistory(history);

      const result = getHistoryByMoveNumber(1);
      expect(result).toEqual(entry1);
    });
  });

  describe('localStorage persistence', () => {
    it('should persist history across multiple operations', () => {
      appendToHistory(createMockEntry(0));
      appendToHistory(createMockEntry(1));
      markHistoryAsSynced(0);
      appendToHistory(createMockEntry(2));

      const result = getGameHistory();
      expect(result).toHaveLength(3);
      expect(result![0]!.synced).toBe(true);
      expect(result![1]!.synced).toBe(false);
      expect(result![2]!.synced).toBe(false);
    });

    it('should handle round-trip with off_board move', () => {
      const entry: MoveHistoryEntry = {
        ...createMockEntry(0),
        to: 'off_board',
      };

      appendToHistory(entry);

      const result = getGameHistory();
      expect(result![0]!.to).toBe('off_board');
    });

    it('should handle round-trip with captured piece', () => {
      const capturedPiece = {
        type: 'knight' as const,
        owner: 'dark' as const,
        position: null,
        moveCount: 0,
        id: uuid(),
      };

      const entry: MoveHistoryEntry = {
        ...createMockEntry(0),
        captured: capturedPiece,
      };

      appendToHistory(entry);

      const result = getGameHistory();
      expect(result![0]!.captured).toEqual(capturedPiece);
    });
  });
});
