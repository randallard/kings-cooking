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
  buildFullStateUrl,
} from './urlBuilder';
import { KingsChessEngine } from '@/lib/chess/KingsChessEngine';
import type { PlayerInfo } from '@/lib/validation/schemas';
import { v4 as uuid } from 'uuid';
import { PlayerIdSchema } from '@/lib/validation/schemas';

describe('URL Parser Utilities', () => {
  let lightPlayer: PlayerInfo;
  let darkPlayer: PlayerInfo;
  let engine: KingsChessEngine;

  beforeEach(() => {
    lightPlayer = {
      id: PlayerIdSchema.parse(uuid()),
      name: 'Player 1',
    };

    darkPlayer = {
      id: PlayerIdSchema.parse(uuid()),
      name: 'Player 2',
    };

    engine = new KingsChessEngine(lightPlayer, darkPlayer);
  });

  describe('parseUrlHash', () => {
    it('should parse hash with leading #', () => {
      const gameState = engine.getGameState();
      const url = buildFullStateUrl(gameState);

      const result = parseUrlHash(url);

      expect(result.success).toBe(true);
      expect(result.payload).toBeTruthy();
    });

    it('should parse hash without leading #', () => {
      const gameState = engine.getGameState();
      const url = buildFullStateUrl(gameState);
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
  });

  describe('Integration: Parse and Apply', () => {
    it('should successfully parse and apply complete game flow', () => {
      // Create initial game
      const player1Engine = new KingsChessEngine(lightPlayer, darkPlayer);

      // Player 1 sends initial state to Player 2
      const initialStateUrl = buildFullStateUrl(player1Engine.getGameState());
      const parseResult1 = parseUrlHash(initialStateUrl);
      const applyResult1 = applyPayloadToEngine(parseResult1.payload!);

      expect(applyResult1.success).toBe(true);

      // Player 1 makes a move
      player1Engine.makeMove([2, 0], [1, 0]);
      const moveUrl1 = buildFullStateUrl(player1Engine.getGameState());

      // Player 2 applies the move
      const parseResult2 = parseUrlHash(moveUrl1);
      const applyResult2 = applyPayloadToEngine(parseResult2.payload!);

      expect(applyResult2.success).toBe(true);
      const updatedPlayer2Engine = applyResult2.engine!;

      // Verify both engines have same state
      expect(updatedPlayer2Engine.getChecksum()).toBe(player1Engine.getChecksum());
      expect(updatedPlayer2Engine.getGameState().currentTurn).toBe(1);
    });
  });
});
