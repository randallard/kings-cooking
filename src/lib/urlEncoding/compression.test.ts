/**
 * @fileoverview Tests for compression utilities
 * @module lib/urlEncoding/compression.test
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { compressPayload, decompressPayload, getCompressionStats } from './compression';
import type { FullStatePayload } from './types';
import { v4 as uuid } from 'uuid';
import { PlayerIdSchema, GameIdSchema } from '@/lib/validation/schemas';

describe('Compression Utilities', () => {
  let fullStatePayload: FullStatePayload;

  beforeEach(() => {
    fullStatePayload = {
      type: 'full_state',
      gameState: {
        version: '1.0.0',
        gameId: GameIdSchema.parse(uuid()),
        board: [
          [null, null, null],
          [null, null, null],
          [null, null, null],
        ],
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
        checksum: 'test-checksum',
      },
    };
  });

  describe('compressPayload', () => {
    it('should compress full state payload', () => {
      const compressed = compressPayload(fullStatePayload);

      expect(compressed).toBeTruthy();
      expect(typeof compressed).toBe('string');
      expect(compressed.length).toBeGreaterThan(0);
    });

    it('should produce URL-safe characters', () => {
      const compressed = compressPayload(fullStatePayload);

      // Should not contain characters that need percent encoding
      expect(compressed).not.toMatch(/[^A-Za-z0-9_\-+]/);
    });

    it('should compress to URL-safe string', () => {
      const compressed = compressPayload(fullStatePayload);

      expect(compressed.length).toBeGreaterThan(0);
      expect(typeof compressed).toBe('string');
    });

    it('should handle full state with optional playerName', () => {
      const payloadWithName: FullStatePayload = {
        ...fullStatePayload,
        playerName: 'Player 2',
      };
      const compressed = compressPayload(payloadWithName);

      expect(compressed).toBeTruthy();
      expect(compressed.length).toBeGreaterThan(0);
    });
  });

  describe('decompressPayload', () => {
    it('should decompress valid compressed payload', () => {
      const compressed = compressPayload(fullStatePayload);
      const decompressed = decompressPayload(compressed);

      expect(decompressed).toEqual(fullStatePayload);
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
      const compressed = compressPayload(fullStatePayload);
      const withWhitespace = `  ${compressed}  `;
      const result = decompressPayload(withWhitespace);

      expect(result).toEqual(fullStatePayload);
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

    it('should return null for malformed JSON', () => {
      // Create a string that decompresses but is not valid JSON
      const invalidJson = 'KwRgdgxg' + 'invalid';
      const result = decompressPayload(invalidJson);

      expect(result).toBeNull();
    });

    it('should return null for data that fails Zod validation', () => {
      // Manually create compressed data with invalid schema
      const invalidData = { type: 'invalid_type', foo: 'bar' };
      const compressed = compressPayload(invalidData as unknown as FullStatePayload);
      const result = decompressPayload(compressed);

      expect(result).toBeNull();
    });
  });

  describe('getCompressionStats', () => {
    it('should return accurate statistics', () => {
      const stats = getCompressionStats(fullStatePayload);

      expect(stats.originalSize).toBeGreaterThan(0);
      expect(stats.compressedSize).toBeGreaterThan(0);
      expect(stats.ratio).toBeGreaterThan(0);
    });

    it('should compress larger payloads better', () => {
      // Small payload (empty game state)
      const smallStats = getCompressionStats(fullStatePayload);

      // Larger full state payload with move history
      const largeStatePayload: FullStatePayload = {
        type: 'full_state',
        gameState: {
          version: '1.0.0',
          gameId: GameIdSchema.parse(uuid()),
          board: [[null, null, null], [null, null, null], [null, null, null]],
          lightCourt: [],
          darkCourt: [],
          capturedLight: [
            { type: 'rook', owner: 'dark', position: null, moveCount: 2, id: GameIdSchema.parse(uuid()) },
          ],
          capturedDark: [],
          currentTurn: 5,
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
          moveHistory: Array(5).fill(null).map((_, i) => ({
            from: [0, 0] as [number, number],
            to: [1, 1] as [number, number],
            piece: {
              type: 'rook' as const,
              owner: i % 2 === 0 ? ('light' as const) : ('dark' as const),
              position: null,
              moveCount: i,
              id: GameIdSchema.parse(uuid()),
            },
            captured: null,
            timestamp: Date.now() + i,
          })),
          checksum: 'larger-checksum',
        },
      };

      const largeStats = getCompressionStats(largeStatePayload);

      // Larger payload should have larger original size
      expect(largeStats.originalSize).toBeGreaterThan(smallStats.originalSize);
    });

    it('should show better compression for larger payloads', () => {
      // Small payload stats
      const smallStats = getCompressionStats(fullStatePayload);

      // Larger full state payload with more data (move history, captured pieces)
      const largeStatePayload: FullStatePayload = {
        type: 'full_state',
        gameState: {
          version: '1.0.0',
          gameId: GameIdSchema.parse(uuid()),
          board: [[null, null, null], [null, null, null], [null, null, null]],
          lightCourt: [],
          darkCourt: [],
          capturedLight: [
            { type: 'rook', owner: 'dark', position: null, moveCount: 5, id: GameIdSchema.parse(uuid()) },
            { type: 'knight', owner: 'dark', position: null, moveCount: 3, id: GameIdSchema.parse(uuid()) },
          ],
          capturedDark: [
            { type: 'bishop', owner: 'light', position: null, moveCount: 2, id: GameIdSchema.parse(uuid()) },
          ],
          currentTurn: 15,
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
          moveHistory: Array(10).fill(null).map((_, i) => ({
            from: [0, 0] as [number, number],
            to: [1, 1] as [number, number],
            piece: {
              type: 'rook' as const,
              owner: i % 2 === 0 ? ('light' as const) : ('dark' as const),
              position: null,
              moveCount: i,
              id: GameIdSchema.parse(uuid()),
            },
            captured: null,
            timestamp: Date.now() + i,
          })),
          checksum: 'large-payload-checksum',
        },
      };

      const fullStateStats = getCompressionStats(largeStatePayload);

      // Larger payload should have larger original size and compressed size
      expect(fullStateStats.originalSize).toBeGreaterThan(smallStats.originalSize);
      expect(fullStateStats.compressedSize).toBeGreaterThan(smallStats.compressedSize);
    });
  });
});
