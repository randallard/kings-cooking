/**
 * @fileoverview Tests for localStorage utilities
 * @module lib/storage/localStorage.test
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import {
  getValidatedItem,
  setValidatedItem,
  storage,
} from './localStorage';

describe('localStorage utilities', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('getValidatedItem', () => {
    it('should return null for missing key', () => {
      const schema = z.string();
      const result = getValidatedItem('test-key', schema);
      expect(result).toBeNull();
    });

    it('should return validated data for valid stored value', () => {
      const schema = z.object({ name: z.string() });
      const data = { name: 'Test' };

      localStorage.setItem('test-key', JSON.stringify(data));

      const result = getValidatedItem('test-key', schema);
      expect(result).toEqual(data);
    });

    it('should remove corrupted data and return null', () => {
      localStorage.setItem('test-key', 'invalid json');

      const schema = z.object({ name: z.string() });
      const result = getValidatedItem('test-key', schema);

      expect(result).toBeNull();
      expect(localStorage.getItem('test-key')).toBeNull();
    });

    it('should remove data that fails validation', () => {
      const schema = z.object({ name: z.string() });
      const badData = { name: 123 }; // Wrong type

      localStorage.setItem('test-key', JSON.stringify(badData));

      const result = getValidatedItem('test-key', schema);

      expect(result).toBeNull();
      expect(localStorage.getItem('test-key')).toBeNull();
    });
  });

  describe('setValidatedItem', () => {
    it('should save valid data', () => {
      const schema = z.string();
      const result = setValidatedItem('test-key', 'test-value', schema);

      expect(result).toBe(true);
      expect(localStorage.getItem('test-key')).toBe('"test-value"');
    });

    it('should reject invalid data', () => {
      const schema = z.string();
      // @ts-expect-error Testing runtime validation
      const result = setValidatedItem('test-key', 123, schema);

      expect(result).toBe(false);
      expect(localStorage.getItem('test-key')).toBeNull();
    });
  });

  describe('storage helpers', () => {
    it('should store and retrieve player name', () => {
      storage.setMyName('Alice');
      expect(storage.getMyName()).toBe('Alice');
    });

    it('should store and retrieve player ID', () => {
      const id = '123e4567-e89b-12d3-a456-426614174000';
      storage.setMyPlayerId(id);
      expect(storage.getMyPlayerId()).toBe(id);
    });

    it('should store and retrieve game mode', () => {
      storage.setGameMode('hotseat');
      expect(storage.getGameMode()).toBe('hotseat');
    });

    it('should reject invalid game mode', () => {
      // @ts-expect-error Testing runtime validation
      const result = storage.setGameMode('invalid');
      expect(result).toBe(false);
    });

    it('should clear all game storage', () => {
      storage.setMyName('Alice');
      storage.setGameMode('hotseat');
      storage.setPlayer1Name('Bob');

      storage.clearAll();

      expect(storage.getMyName()).toBeNull();
      expect(storage.getGameMode()).toBeNull();
      expect(storage.getPlayer1Name()).toBeNull();
    });
  });
});
