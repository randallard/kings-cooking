/**
 * @fileoverview Integration tests for URL encoding/decoding system
 * @module lib/urlEncoding/integration.test
 *
 * Tests the complete flow:
 * 1. Compress payload → URL hash
 * 2. Parse URL hash → decompress → validate
 * 3. Error handling for corrupted data
 * 4. Round-trip data integrity
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { compressPayload, decompressPayload } from './compression';
import type { FullStatePayload } from './types';
import type { GameState } from '@/lib/validation/schemas';
import { GameIdSchema, PlayerIdSchema } from '@/lib/validation/schemas';

/**
 * Helper function to create a valid mock GameState for testing
 */
function createMockGameState(): GameState {
  return {
    version: '1.0.0',
    gameId: GameIdSchema.parse('00000000-0000-0000-0000-000000000000'),
    board: [
      [
        { type: 'rook', owner: 'light', position: [0, 0], moveCount: 0, id: '00000000-0000-0000-0000-000000000001' },
        { type: 'knight', owner: 'light', position: [0, 1], moveCount: 0, id: '00000000-0000-0000-0000-000000000002' },
        { type: 'bishop', owner: 'light', position: [0, 2], moveCount: 0, id: '00000000-0000-0000-0000-000000000003' },
      ],
      [
        null,
        null,
        null,
      ],
      [
        { type: 'rook', owner: 'dark', position: [2, 0], moveCount: 0, id: '00000000-0000-0000-0000-000000000007' },
        { type: 'knight', owner: 'dark', position: [2, 1], moveCount: 0, id: '00000000-0000-0000-0000-000000000008' },
        { type: 'bishop', owner: 'dark', position: [2, 2], moveCount: 0, id: '00000000-0000-0000-0000-000000000009' },
      ],
    ],
    lightCourt: [],
    darkCourt: [],
    capturedLight: [],
    capturedDark: [],
    currentTurn: 0,
    currentPlayer: 'light',
    lightPlayer: {
      id: PlayerIdSchema.parse('00000000-0000-0000-0000-000000000010'),
      name: 'Player1',
    },
    darkPlayer: {
      id: PlayerIdSchema.parse('00000000-0000-0000-0000-000000000011'),
      name: 'Player2',
    },
    status: 'playing',
    winner: null,
    moveHistory: [],
    checksum: 'mock-checksum-123',
  };
}

describe('URL Encoding Integration Tests', () => {
  describe('Full State Payload Round-Trip', () => {
    it('should round-trip full state payload successfully', () => {
      const mockGameState = createMockGameState();

      const fullStatePayload: FullStatePayload = {
        type: 'full_state',
        gameState: mockGameState,
        playerName: 'Player2',
      };

      const compressed = compressPayload(fullStatePayload);
      expect(compressed).toBeTruthy();
      expect(compressed.length).toBeGreaterThan(0);
      // Full state is larger but should still be < 2000 chars
      expect(compressed.length).toBeLessThan(2000);

      const decompressed = decompressPayload(compressed);
      expect(decompressed).toEqual(fullStatePayload);
    });
  });

  describe('Error Handling', () => {
    it('should handle corrupted URL gracefully', () => {
      const corruptedUrl = 'CORRUPTED_BASE64_DATA!!!';
      const result = decompressPayload(corruptedUrl);

      expect(result).toBeNull();
    });

    it('should handle empty string', () => {
      const result = decompressPayload('');
      expect(result).toBeNull();
    });

    it('should handle whitespace', () => {
      const result = decompressPayload('   ');
      expect(result).toBeNull();
    });

    it('should handle invalid JSON', () => {
      const mockGameState = createMockGameState();
      // This is a valid lz-string but decompresses to invalid JSON
      const invalidJson = compressPayload({
        type: 'full_state',
        gameState: mockGameState,
      });

      // Corrupt the compressed data
      const corrupted = invalidJson.slice(0, -10) + 'XXXXXXXXXX';
      const result = decompressPayload(corrupted);

      expect(result).toBeNull();
    });

    it('should handle missing required fields', () => {
      // Create payload without required fields
      const invalidPayload = {
        type: 'full_state',
        // missing gameState
      };

      // Compression doesn't validate - it just compresses
      const compressed = compressPayload(invalidPayload as FullStatePayload);
      expect(compressed).toBeTruthy();

      // Decompression should fail validation
      const result = decompressPayload(compressed);
      expect(result).toBeNull();
    });
  });

  describe('Multiple Round-Trips', () => {
    it('should handle multiple full state compressions', () => {
      const mockGameState = createMockGameState();

      // Test 10 round-trips to ensure stability
      for (let i = 0; i < 10; i++) {
        const payload: FullStatePayload = {
          type: 'full_state',
          gameState: {
            ...mockGameState,
            currentTurn: i,
          },
        };

        // Round-trip
        const compressed = compressPayload(payload);
        const decompressed = decompressPayload(compressed);

        expect(decompressed).toEqual(payload);

        // Verify compression produces valid output
        expect(compressed.length).toBeGreaterThan(0);
      }
    });
  });

  describe('URL Length Limits', () => {
    it('should keep full state payloads under 2000 characters', () => {
      // Create a reasonably sized game state
      const mockGameState = createMockGameState();
      mockGameState.currentTurn = 15;
      mockGameState.capturedLight = [
        { type: 'rook', owner: 'dark', position: null, moveCount: 0, id: '00000000-0000-0000-0000-000000000099' },
      ];
      mockGameState.capturedDark = [
        { type: 'knight', owner: 'light', position: null, moveCount: 0, id: '00000000-0000-0000-0000-000000000098' },
      ];
      mockGameState.moveHistory = Array(10).fill(null).map((_, i) => ({
        from: [0, 0] as [number, number],
        to: [1, 1] as [number, number],
        piece: {
          type: 'rook' as const,
          owner: i % 2 === 0 ? ('light' as const) : ('dark' as const),
          position: null,
          moveCount: i,
          id: `00000000-0000-0000-0000-${String(i).padStart(12, '0')}`,
        },
        captured: null,
        timestamp: Date.now() + i,
      }));

      const fullStatePayload: FullStatePayload = {
        type: 'full_state',
        gameState: mockGameState,
        playerName: 'Player1',
      };

      const compressed = compressPayload(fullStatePayload);
      expect(compressed.length).toBeLessThan(2000);
    });
  });

  describe('Browser Environment Simulation', () => {
    beforeEach(() => {
      // Mock window.location for testing
      Object.defineProperty(window, 'location', {
        value: {
          hash: '',
          href: 'http://localhost:5173/',
        },
        writable: true,
      });
    });

    it('should simulate URL update flow', () => {
      const mockGameState = createMockGameState();
      const payload: FullStatePayload = {
        type: 'full_state',
        gameState: mockGameState,
      };

      // Simulate encoding
      const compressed = compressPayload(payload);

      // Simulate setting URL hash
      window.location.hash = `#${compressed}`;

      // Simulate reading URL hash
      const hash = window.location.hash.slice(1);

      // Simulate decoding
      const decoded = decompressPayload(hash);

      expect(decoded).toEqual(payload);
    });
  });

  describe('Performance Tests', () => {
    it('should compress and decompress within reasonable time', () => {
      const mockGameState = createMockGameState();
      const payload: FullStatePayload = {
        type: 'full_state',
        gameState: mockGameState,
      };

      const startCompress = performance.now();
      const compressed = compressPayload(payload);
      const compressTime = performance.now() - startCompress;

      const startDecompress = performance.now();
      const decompressed = decompressPayload(compressed);
      const decompressTime = performance.now() - startDecompress;

      // Compression should be fast (< 10ms)
      expect(compressTime).toBeLessThan(10);
      expect(decompressTime).toBeLessThan(10);

      expect(decompressed).toEqual(payload);
    });
  });
});
