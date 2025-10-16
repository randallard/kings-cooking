/**
 * @fileoverview Tests for URL parser utilities
 * @module lib/urlEncoding/urlParser.test
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  parseUrlHash,
  applyPayloadToEngine,
  extractOpponentName,
} from './urlParser';
import {
  buildDeltaUrl,
  buildFullStateUrl,
  buildResyncRequestUrl,
} from './urlBuilder';
import { KingsChessEngine } from '@/lib/chess/KingsChessEngine';
import type { PlayerInfo } from '@/lib/validation/schemas';
import { v4 as uuid } from 'uuid';
import { PlayerIdSchema } from '@/lib/validation/schemas';

describe('URL Parser Utilities', () => {
  let whitePlayer: PlayerInfo;
  let blackPlayer: PlayerInfo;
  let engine: KingsChessEngine;

  beforeEach(() => {
    whitePlayer = {
      id: PlayerIdSchema.parse(uuid()),
      name: 'Player 1',
    };

    blackPlayer = {
      id: PlayerIdSchema.parse(uuid()),
      name: 'Player 2',
    };

    engine = new KingsChessEngine(whitePlayer, blackPlayer);
  });

  describe('parseUrlHash', () => {
    it('should parse valid delta URL', () => {
      const url = buildDeltaUrl(
        { from: [2, 0], to: [1, 0] },
        0,
        engine.getChecksum()
      );

      const result = parseUrlHash(url);

      expect(result.success).toBe(true);
      expect(result.payload?.type).toBe('delta');
    });

    it('should parse hash with leading #', () => {
      const url = buildDeltaUrl(
        { from: [2, 0], to: [1, 0] },
        0,
        'abc123'
      );

      const result = parseUrlHash(url);

      expect(result.success).toBe(true);
      expect(result.payload).toBeTruthy();
    });

    it('should parse hash without leading #', () => {
      const url = buildDeltaUrl(
        { from: [2, 0], to: [1, 0] },
        0,
        'abc123'
      );
      const hashWithoutPound = url.slice(1);

      const result = parseUrlHash(hashWithoutPound);

      expect(result.success).toBe(true);
      expect(result.payload).toBeTruthy();
    });

    it('should return error for empty hash', () => {
      const result = parseUrlHash('');

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('should return error for corrupted data', () => {
      const result = parseUrlHash('#corrupted-data-123');

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('should parse full state URL', () => {
      const gameState = engine.getGameState();
      const url = buildFullStateUrl(gameState);

      const result = parseUrlHash(url);

      expect(result.success).toBe(true);
      expect(result.payload?.type).toBe('full_state');
    });

    it('should parse resync request URL', () => {
      const url = buildResyncRequestUrl(
        { from: [1, 1], to: [2, 2] },
        3,
        'mismatch123',
        'Player 2'
      );

      const result = parseUrlHash(url);

      expect(result.success).toBe(true);
      expect(result.payload?.type).toBe('resync_request');
    });
  });

  describe('applyPayloadToEngine - Delta', () => {
    it('should apply valid delta move', () => {
      // Get initial state from engine
      const initialState = engine.getGameState();

      // Create a new engine from the SAME initial state (same gameId)
      const newEngine = KingsChessEngine.fromJSON(initialState);

      // Apply move to original engine to get expected checksum
      const moveResult = engine.makeMove([2, 0], [1, 0]);
      expect(moveResult.success).toBe(true);

      const expectedChecksum = engine.getChecksum();

      // Parse and apply delta to the new engine
      const url = buildDeltaUrl({ from: [2, 0], to: [1, 0] }, 0, expectedChecksum);
      const parseResult = parseUrlHash(url);

      expect(parseResult.success).toBe(true);
      expect(parseResult.payload).toBeTruthy();

      const applyResult = applyPayloadToEngine(parseResult.payload!, newEngine);

      expect(applyResult.success).toBe(true);
      expect(applyResult.engine).toBeTruthy();
      expect(applyResult.engine?.getChecksum()).toBe(expectedChecksum);
    });

    it('should reject delta without current engine', () => {
      const url = buildDeltaUrl({ from: [2, 0], to: [1, 0] }, 0, 'abc123');
      const parseResult = parseUrlHash(url);

      const applyResult = applyPayloadToEngine(parseResult.payload!);

      expect(applyResult.success).toBe(false);
      expect(applyResult.error).toContain('No current engine');
    });

    it('should reject delta with turn mismatch', () => {
      // Try to apply move for turn 5 when we're at turn 0
      const url = buildDeltaUrl({ from: [2, 0], to: [1, 0] }, 5, 'abc123');
      const parseResult = parseUrlHash(url);

      const applyResult = applyPayloadToEngine(parseResult.payload!, engine);

      expect(applyResult.success).toBe(false);
      expect(applyResult.error).toContain('Turn mismatch');
    });

    it('should reject invalid move', () => {
      // Try an invalid move (knight can't move straight)
      const url = buildDeltaUrl({ from: [2, 1], to: [2, 0] }, 0, 'wrong');
      const parseResult = parseUrlHash(url);

      const applyResult = applyPayloadToEngine(parseResult.payload!, engine);

      expect(applyResult.success).toBe(false);
      expect(applyResult.error).toContain('Invalid move');
    });

    it('should extract player name from delta', () => {
      // Get initial state to ensure same gameId
      const initialState = engine.getGameState();
      const newEngine = KingsChessEngine.fromJSON(initialState);

      // Apply move to get expected checksum
      engine.makeMove([2, 0], [1, 0]);
      const checksum = engine.getChecksum();

      const url = buildDeltaUrl(
        { from: [2, 0], to: [1, 0] },
        0,
        checksum,
        'Player 2'
      );
      const parseResult = parseUrlHash(url);

      const applyResult = applyPayloadToEngine(parseResult.payload!, newEngine);

      expect(applyResult.success).toBe(true);
      expect(applyResult.warnings).toBeTruthy();
      expect(applyResult.warnings?.[0]).toContain('Player 2');
    });
  });

  describe('applyPayloadToEngine - Full State', () => {
    it('should apply valid full state', () => {
      const gameState = engine.getGameState();
      const url = buildFullStateUrl(gameState);
      const parseResult = parseUrlHash(url);

      const applyResult = applyPayloadToEngine(parseResult.payload!);

      expect(applyResult.success).toBe(true);
      expect(applyResult.engine).toBeTruthy();
      expect(applyResult.engine?.getChecksum()).toBe(engine.getChecksum());
    });

    it('should extract player name from full state', () => {
      const gameState = engine.getGameState();
      const url = buildFullStateUrl(gameState, 'Player 1');
      const parseResult = parseUrlHash(url);

      const applyResult = applyPayloadToEngine(parseResult.payload!);

      expect(applyResult.success).toBe(true);
      expect(applyResult.warnings).toBeTruthy();
      expect(applyResult.warnings?.[0]).toContain('Player 1');
    });

    it('should detect checksum mismatch when state is tampered', () => {
      // Get current valid state
      const gameState = engine.getGameState();
      const originalChecksum = gameState.checksum;

      // Tamper with the board but keep the original checksum
      // This simulates someone modifying the state without updating the checksum
      const tamperedState: typeof gameState = {
        ...gameState,
        board: [
          [null, null, null],
          [null, null, null],
          [null, null, null],
        ],
        // Keep original checksum - this will be wrong for the empty board
        checksum: originalChecksum,
      };

      const payload = {
        type: 'full_state' as const,
        gameState: tamperedState,
      };

      const applyResult = applyPayloadToEngine(payload);

      expect(applyResult.success).toBe(false);
      expect(applyResult.error).toContain('Checksum mismatch');
    });
  });

  describe('applyPayloadToEngine - Resync Request', () => {
    it('should return error for resync request', () => {
      const url = buildResyncRequestUrl(
        { from: [1, 1], to: [2, 2] },
        3,
        'mismatch123',
        'Player 2'
      );
      const parseResult = parseUrlHash(url);

      const applyResult = applyPayloadToEngine(parseResult.payload!);

      expect(applyResult.success).toBe(false);
      expect(applyResult.error).toContain('Resync request');
    });

    it('should include player name in resync error', () => {
      const url = buildResyncRequestUrl(
        { from: [1, 1], to: [2, 2] },
        3,
        'mismatch123',
        'Player 2'
      );
      const parseResult = parseUrlHash(url);

      const applyResult = applyPayloadToEngine(parseResult.payload!);

      expect(applyResult.error).toContain('Player 2');
    });

    it('should include custom message in resync error', () => {
      const url = buildResyncRequestUrl(
        { from: [1, 1], to: [2, 2] },
        3,
        'mismatch123',
        'Player 2',
        'Custom sync message'
      );
      const parseResult = parseUrlHash(url);

      const applyResult = applyPayloadToEngine(parseResult.payload!);

      expect(applyResult.error).toContain('Custom sync message');
    });
  });

  describe('extractOpponentName', () => {
    it('should extract name from full state payload', () => {
      const gameState = engine.getGameState();
      const payload = {
        type: 'full_state' as const,
        gameState,
      };

      const name = extractOpponentName(payload);

      expect(name).toBe('Player 1');
    });

    it('should extract name from delta payload', () => {
      const payload = {
        type: 'delta' as const,
        move: { from: [2, 0] as [number, number], to: [1, 0] as [number, number] },
        turn: 1,
        checksum: 'abc123',
        playerName: 'Player 2',
      };

      const name = extractOpponentName(payload);

      expect(name).toBe('Player 2');
    });

    it('should return null for delta without playerName', () => {
      const payload = {
        type: 'delta' as const,
        move: { from: [2, 0] as [number, number], to: [1, 0] as [number, number] },
        turn: 1,
        checksum: 'abc123',
      };

      const name = extractOpponentName(payload);

      expect(name).toBeNull();
    });

    it('should extract name from resync request', () => {
      const payload = {
        type: 'resync_request' as const,
        move: { from: [1, 1] as [number, number], to: [2, 2] as [number, number] },
        turn: 3,
        checksum: 'mismatch123',
        playerName: 'Player 2',
      };

      const name = extractOpponentName(payload);

      expect(name).toBe('Player 2');
    });
  });

  describe('Integration: Parse and Apply', () => {
    it('should successfully parse and apply complete game flow', () => {
      // Create initial game
      const player1Engine = new KingsChessEngine(whitePlayer, blackPlayer);

      // Player 1 sends initial state to Player 2
      const initialStateUrl = buildFullStateUrl(player1Engine.getGameState());
      const parseResult1 = parseUrlHash(initialStateUrl);
      const applyResult1 = applyPayloadToEngine(parseResult1.payload!);

      expect(applyResult1.success).toBe(true);
      const player2Engine = applyResult1.engine!;

      // Player 1 makes a move
      player1Engine.makeMove([2, 0], [1, 0]);
      const moveUrl1 = buildDeltaUrl(
        { from: [2, 0], to: [1, 0] },
        0,
        player1Engine.getChecksum()
      );

      // Player 2 applies the move
      const parseResult2 = parseUrlHash(moveUrl1);
      const applyResult2 = applyPayloadToEngine(parseResult2.payload!, player2Engine);

      expect(applyResult2.success).toBe(true);
      const updatedPlayer2Engine = applyResult2.engine!;

      // Verify both engines have same state
      expect(updatedPlayer2Engine.getChecksum()).toBe(player1Engine.getChecksum());
      expect(updatedPlayer2Engine.getGameState().currentTurn).toBe(1);
    });
  });
});
