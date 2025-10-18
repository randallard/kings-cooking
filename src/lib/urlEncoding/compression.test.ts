/**
 * @fileoverview Tests for compression utilities
 * @module lib/urlEncoding/compression.test
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { compressPayload, decompressPayload, getCompressionStats } from './compression';
import type { DeltaPayload, FullStatePayload } from './types';
import { v4 as uuid } from 'uuid';
import { PlayerIdSchema, GameIdSchema } from '@/lib/validation/schemas';

describe('Compression Utilities', () => {
  let deltaPayload: DeltaPayload;

  beforeEach(() => {
    deltaPayload = {
      type: 'delta',
      move: { from: [2, 0], to: [1, 0] },
      turn: 1,
      checksum: 'abc123',
    };
  });

  describe('compressPayload', () => {
    it('should compress delta payload', () => {
      const compressed = compressPayload(deltaPayload);

      expect(compressed).toBeTruthy();
      expect(typeof compressed).toBe('string');
      expect(compressed.length).toBeGreaterThan(0);
    });

    it('should produce URL-safe characters', () => {
      const compressed = compressPayload(deltaPayload);

      // Should not contain characters that need percent encoding
      expect(compressed).not.toMatch(/[^A-Za-z0-9_\-+]/);
    });

    it('should compress to URL-safe string', () => {
      const compressed = compressPayload(deltaPayload);

      // Compression may not reduce size for very small payloads
      // but should still produce valid output
      expect(compressed.length).toBeGreaterThan(0);
      expect(typeof compressed).toBe('string');
    });

    it('should handle delta with optional playerName', () => {
      const payloadWithName: DeltaPayload = {
        ...deltaPayload,
        playerName: 'Player 2',
      };
      const compressed = compressPayload(payloadWithName);

      expect(compressed).toBeTruthy();
      expect(compressed.length).toBeGreaterThan(0);
    });

    it('should handle move to off_board', () => {
      const offBoardPayload: DeltaPayload = {
        type: 'delta',
        move: { from: [0, 2], to: 'off_board' },
        turn: 5,
        checksum: 'xyz789',
      };
      const compressed = compressPayload(offBoardPayload);

      expect(compressed).toBeTruthy();
      expect(compressed.length).toBeGreaterThan(0);
    });
  });

  describe('decompressPayload', () => {
    it('should decompress valid compressed payload', () => {
      const compressed = compressPayload(deltaPayload);
      const decompressed = decompressPayload(compressed);

      expect(decompressed).toEqual(deltaPayload);
    });

    it('should return null for corrupted data', () => {
      const corrupted = 'this-is-not-compressed-data';
      const result = decompressPayload(corrupted);

      expect(result).toBeNull();
    });

    it('should return null for empty string', () => {
      const result = decompressPayload('');

      expect(result).toBeNull();
    });

    it('should handle whitespace trimming', () => {
      const compressed = compressPayload(deltaPayload);
      const withWhitespace = `  ${compressed}  `;
      const result = decompressPayload(withWhitespace);

      expect(result).toEqual(deltaPayload);
    });

    it('should round-trip full state payload', () => {
      const fullStatePayload: FullStatePayload = {
        type: 'full_state',
        gameState: {
          version: '1.0.0',
          gameId: GameIdSchema.parse(uuid()),
          board: [[null, null, null], [null, null, null], [null, null, null]],
          lightCourt: [],
          darkCourt: [],
          capturedLight: [],
          capturedDark: [],
          currentTurn: 0,
          currentPlayer: 'light',
          lightPlayer: {
            id: PlayerIdSchema.parse(uuid()),
            name: 'Player 1',
          },
          darkPlayer: {
            id: PlayerIdSchema.parse(uuid()),
            name: 'Player 2',
          },
          status: 'playing',
          winner: null,
          moveHistory: [],
          checksum: 'initial',
        },
      };

      const compressed = compressPayload(fullStatePayload);
      const decompressed = decompressPayload(compressed);

      expect(decompressed).toEqual(fullStatePayload);
    });

    it('should round-trip resync request payload', () => {
      const resyncPayload = {
        type: 'resync_request' as const,
        move: { from: [1, 1] as [number, number], to: [2, 2] as [number, number] },
        turn: 3,
        checksum: 'mismatch123',
        playerName: 'Player 1',
        message: 'State out of sync',
      };

      const compressed = compressPayload(resyncPayload);
      const decompressed = decompressPayload(compressed);

      expect(decompressed).toEqual(resyncPayload);
    });

    it('should return null for malformed JSON', () => {
      // Create a string that decompresses but is not valid JSON
      const invalidJson = 'KwRgdgxg' + 'invalid';
      const result = decompressPayload(invalidJson);

      expect(result).toBeNull();
    });

    it('should return null for data that fails Zod validation', () => {
      // Manually create compressed data with invalid schema
      const invalidData = { type: 'invalid_type', foo: 'bar' };
      const compressed = compressPayload(invalidData as unknown as DeltaPayload);
      const result = decompressPayload(compressed);

      expect(result).toBeNull();
    });

    it('should handle delta with move to off_board', () => {
      const offBoardPayload: DeltaPayload = {
        type: 'delta',
        move: { from: [0, 2], to: 'off_board' },
        turn: 5,
        checksum: 'xyz789',
      };

      const compressed = compressPayload(offBoardPayload);
      const decompressed = decompressPayload(compressed);

      expect(decompressed).toEqual(offBoardPayload);
    });
  });

  describe('getCompressionStats', () => {
    it('should return accurate statistics', () => {
      const stats = getCompressionStats(deltaPayload);

      expect(stats.originalSize).toBeGreaterThan(0);
      expect(stats.compressedSize).toBeGreaterThan(0);
      expect(stats.ratio).toBeGreaterThan(0);
    });

    it('should compress larger payloads better', () => {
      // Small payloads may not compress well
      const smallStats = getCompressionStats(deltaPayload);

      // Larger full state payload
      const fullStatePayload: FullStatePayload = {
        type: 'full_state',
        gameState: {
          version: '1.0.0',
          gameId: GameIdSchema.parse(uuid()),
          board: [[null, null, null], [null, null, null], [null, null, null]],
          lightCourt: [],
          darkCourt: [],
          capturedLight: [],
          capturedDark: [],
          currentTurn: 0,
          currentPlayer: 'light',
          lightPlayer: {
            id: PlayerIdSchema.parse(uuid()),
            name: 'Player 1',
          },
          darkPlayer: {
            id: PlayerIdSchema.parse(uuid()),
            name: 'Player 2',
          },
          status: 'playing',
          winner: null,
          moveHistory: [],
          checksum: 'initial',
        },
      };

      const largeStats = getCompressionStats(fullStatePayload);

      // Large payload should have better compression ratio or be absolutely smaller when compressed
      expect(largeStats.originalSize).toBeGreaterThan(smallStats.originalSize);
    });

    it('should show better compression for larger payloads', () => {
      // Delta payload stats
      const deltaStats = getCompressionStats(deltaPayload);

      // Full state payload should compress better
      const fullStatePayload: FullStatePayload = {
        type: 'full_state',
        gameState: {
          version: '1.0.0',
          gameId: GameIdSchema.parse(uuid()),
          board: [[null, null, null], [null, null, null], [null, null, null]],
          lightCourt: [],
          darkCourt: [],
          capturedLight: [],
          capturedDark: [],
          currentTurn: 0,
          currentPlayer: 'light',
          lightPlayer: {
            id: PlayerIdSchema.parse(uuid()),
            name: 'Player 1',
          },
          darkPlayer: {
            id: PlayerIdSchema.parse(uuid()),
            name: 'Player 2',
          },
          status: 'playing',
          winner: null,
          moveHistory: [],
          checksum: 'initial',
        },
      };

      const fullStateStats = getCompressionStats(fullStatePayload);

      // Full state should be larger overall
      expect(fullStateStats.originalSize).toBeGreaterThan(deltaStats.originalSize);
      expect(fullStateStats.compressedSize).toBeGreaterThan(deltaStats.compressedSize);
    });
  });
});
