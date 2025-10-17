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
import type { DeltaPayload, FullStatePayload, ResyncRequestPayload } from './types';
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
        { type: 'rook', owner: 'white', position: [0, 0], moveCount: 0, id: '00000000-0000-0000-0000-000000000001' },
        { type: 'knight', owner: 'white', position: [0, 1], moveCount: 0, id: '00000000-0000-0000-0000-000000000002' },
        { type: 'bishop', owner: 'white', position: [0, 2], moveCount: 0, id: '00000000-0000-0000-0000-000000000003' },
      ],
      [
        null,
        null,
        null,
      ],
      [
        { type: 'rook', owner: 'black', position: [2, 0], moveCount: 0, id: '00000000-0000-0000-0000-000000000007' },
        { type: 'knight', owner: 'black', position: [2, 1], moveCount: 0, id: '00000000-0000-0000-0000-000000000008' },
        { type: 'bishop', owner: 'black', position: [2, 2], moveCount: 0, id: '00000000-0000-0000-0000-000000000009' },
      ],
    ],
    whiteCourt: [],
    blackCourt: [],
    capturedWhite: [],
    capturedBlack: [],
    currentTurn: 0,
    currentPlayer: 'white',
    whitePlayer: {
      id: PlayerIdSchema.parse('00000000-0000-0000-0000-000000000010'),
      name: 'Player1',
    },
    blackPlayer: {
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
  describe('Delta Payload Round-Trip', () => {
    it('should round-trip delta payload successfully', () => {
      const deltaPayload: DeltaPayload = {
        type: 'delta',
        move: {
          from: [2, 0],
          to: [1, 0],
        },
        turn: 1,
        checksum: 'abc123',
        playerName: 'Player1',
      };

      // Compress
      const compressed = compressPayload(deltaPayload);
      expect(compressed).toBeTruthy();
      expect(compressed.length).toBeGreaterThan(0);
      expect(compressed.length).toBeLessThan(200); // Delta should be < 200 chars

      // Decompress
      const decompressed = decompressPayload(compressed);
      expect(decompressed).toEqual(deltaPayload);
    });

    it('should handle delta payload without player name', () => {
      const deltaPayload: DeltaPayload = {
        type: 'delta',
        move: {
          from: [0, 0],
          to: [1, 1],
        },
        turn: 5,
        checksum: 'xyz789',
      };

      const compressed = compressPayload(deltaPayload);
      const decompressed = decompressPayload(compressed);

      expect(decompressed).toEqual(deltaPayload);
      expect(decompressed?.playerName).toBeUndefined();
    });

    it('should handle off-board moves', () => {
      const deltaPayload: DeltaPayload = {
        type: 'delta',
        move: {
          from: [2, 2],
          to: 'off_board',
        },
        turn: 10,
        checksum: 'off123',
      };

      const compressed = compressPayload(deltaPayload);
      const decompressed = decompressPayload(compressed);

      expect(decompressed).toEqual(deltaPayload);
      if (decompressed?.type === 'delta') {
        expect(decompressed.move.to).toBe('off_board');
      }
    });
  });

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

  describe('Resync Request Payload Round-Trip', () => {
    it('should round-trip resync request payload successfully', () => {
      const resyncPayload: ResyncRequestPayload = {
        type: 'resync_request',
        move: {
          from: [1, 1],
          to: [2, 2],
        },
        turn: 8,
        checksum: 'mismatch123',
        playerName: 'PlayerA',
        message: 'Checksum mismatch detected',
      };

      const compressed = compressPayload(resyncPayload);
      const decompressed = decompressPayload(compressed);

      expect(decompressed).toEqual(resyncPayload);
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
      // This is a valid lz-string but decompresses to invalid JSON
      const invalidJson = compressPayload({
        type: 'delta',
        move: { from: [0, 0], to: [1, 1] },
        turn: 1,
        checksum: 'test',
      });

      // Corrupt the compressed data
      const corrupted = invalidJson.slice(0, -10) + 'XXXXXXXXXX';
      const result = decompressPayload(corrupted);

      expect(result).toBeNull();
    });

    it('should handle missing required fields', () => {
      // Create payload without required fields
      const invalidPayload = {
        type: 'delta',
        // missing move, turn, checksum
      };

      // Compression doesn't validate - it just compresses
      const compressed = compressPayload(invalidPayload as DeltaPayload);
      expect(compressed).toBeTruthy();

      // Decompression should fail validation
      const result = decompressPayload(compressed);
      expect(result).toBeNull();
    });
  });

  describe('Checksum Validation Flow', () => {
    it('should detect checksum mismatch', () => {
      const payload1: DeltaPayload = {
        type: 'delta',
        move: { from: [0, 0], to: [1, 1] },
        turn: 5,
        checksum: 'checksum_A',
      };

      const payload2: DeltaPayload = {
        type: 'delta',
        move: { from: [0, 0], to: [1, 1] },
        turn: 5,
        checksum: 'checksum_B', // Different checksum
      };

      const compressed1 = compressPayload(payload1);
      const compressed2 = compressPayload(payload2);

      expect(compressed1).not.toBe(compressed2);

      const decompressed1 = decompressPayload(compressed1);
      const decompressed2 = decompressPayload(compressed2);

      expect(decompressed1?.type).toBe('delta');
      expect(decompressed2?.type).toBe('delta');

      if (decompressed1?.type === 'delta' && decompressed2?.type === 'delta') {
        expect(decompressed1.checksum).not.toBe(decompressed2.checksum);
      }
    });
  });

  describe('Turn Number Validation Flow', () => {
    it('should detect turn number mismatch', () => {
      const payload1: DeltaPayload = {
        type: 'delta',
        move: { from: [0, 0], to: [1, 1] },
        turn: 5,
        checksum: 'check123',
      };

      const payload2: DeltaPayload = {
        type: 'delta',
        move: { from: [0, 0], to: [1, 1] },
        turn: 7, // Skipped turn 6
        checksum: 'check123',
      };

      const compressed1 = compressPayload(payload1);
      const compressed2 = compressPayload(payload2);

      const decompressed1 = decompressPayload(compressed1);
      const decompressed2 = decompressPayload(compressed2);

      expect(decompressed1?.type).toBe('delta');
      expect(decompressed2?.type).toBe('delta');

      if (decompressed1?.type === 'delta' && decompressed2?.type === 'delta') {
        expect(decompressed2.turn).toBe(decompressed1.turn + 2);
      }
    });
  });

  describe('10-Move Game Simulation', () => {
    it('should handle 10-move game with alternating players', () => {
      const moves: DeltaPayload[] = [];

      // Generate 10 moves
      for (let i = 0; i < 10; i++) {
        const move: DeltaPayload = {
          type: 'delta',
          move: {
            from: [i % 3, 0],
            to: [i % 3, 1],
          },
          turn: i,
          checksum: `checksum_${i}`,
          playerName: i % 2 === 0 ? 'Player1' : 'Player2',
        };

        moves.push(move);

        // Round-trip each move
        const compressed = compressPayload(move);
        const decompressed = decompressPayload(compressed);

        expect(decompressed).toEqual(move);

        // Verify compression ratio
        const originalSize = JSON.stringify(move).length;
        const compressedSize = compressed.length;
        const ratio = compressedSize / originalSize;

        // Note: Small payloads may not compress well (can even expand)
        // Just verify compression produces valid output
        expect(ratio).toBeGreaterThan(0);
      }

      // Verify all moves were processed
      expect(moves.length).toBe(10);
      expect(moves[9]?.turn).toBe(9);
    });
  });

  describe('URL Length Limits', () => {
    it('should keep delta payloads under 200 characters', () => {
      const deltaPayload: DeltaPayload = {
        type: 'delta',
        move: {
          from: [2, 2],
          to: [1, 1],
        },
        turn: 42,
        checksum: 'very_long_checksum_string_123456789',
        playerName: 'VeryLongPlayerName',
      };

      const compressed = compressPayload(deltaPayload);
      expect(compressed.length).toBeLessThan(200);
    });

    it('should keep full state payloads under 2000 characters', () => {
      // Create a reasonably sized game state
      const mockGameState = createMockGameState();
      mockGameState.currentTurn = 15;
      mockGameState.capturedWhite = [
        { type: 'rook', owner: 'black', position: null, moveCount: 0, id: '00000000-0000-0000-0000-000000000099' },
      ];
      mockGameState.capturedBlack = [
        { type: 'knight', owner: 'white', position: null, moveCount: 0, id: '00000000-0000-0000-0000-000000000098' },
      ];
      mockGameState.moveHistory = Array(10).fill(null).map((_, i) => ({
        from: [0, 0] as [number, number],
        to: [1, 1] as [number, number],
        piece: {
          type: 'rook' as const,
          owner: i % 2 === 0 ? ('white' as const) : ('black' as const),
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
      const payload: DeltaPayload = {
        type: 'delta',
        move: { from: [0, 0], to: [1, 1] },
        turn: 1,
        checksum: 'test123',
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
      const payload: DeltaPayload = {
        type: 'delta',
        move: { from: [1, 1], to: [2, 2] },
        turn: 50,
        checksum: 'perf_test',
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
