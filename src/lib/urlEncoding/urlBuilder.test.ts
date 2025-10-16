/**
 * @fileoverview Tests for URL builder utilities
 * @module lib/urlEncoding/urlBuilder.test
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  buildDeltaUrl,
  buildFullStateUrl,
  buildResyncRequestUrl,
  buildCompleteUrl,
} from './urlBuilder';
import { decompressPayload } from './compression';
import type { DeltaPayload, FullStatePayload, ResyncRequestPayload } from './types';
import { v4 as uuid } from 'uuid';
import { PlayerIdSchema, GameIdSchema } from '@/lib/validation/schemas';
import type { GameState } from '@/lib/validation/schemas';

describe('URL Builder Utilities', () => {
  describe('buildDeltaUrl', () => {
    it('should build valid delta URL', () => {
      const move = { from: [2, 0] as [number, number], to: [1, 0] as [number, number] };
      const turn = 1;
      const checksum = 'abc123';

      const url = buildDeltaUrl(move, turn, checksum);

      expect(url).toBeTruthy();
      expect(url.startsWith('#')).toBe(true);
      expect(url.length).toBeGreaterThan(1);
    });

    it('should encode move correctly', () => {
      const move = { from: [2, 0] as [number, number], to: [1, 0] as [number, number] };
      const turn = 1;
      const checksum = 'abc123';

      const url = buildDeltaUrl(move, turn, checksum);
      const hash = url.slice(1); // Remove #

      const payload = decompressPayload(hash);
      expect(payload).not.toBeNull();
      expect(payload?.type).toBe('delta');

      if (payload?.type === 'delta') {
        expect(payload.move.from).toEqual([2, 0]);
        expect(payload.move.to).toEqual([1, 0]);
        expect(payload.turn).toBe(1);
        expect(payload.checksum).toBe('abc123');
      }
    });

    it('should include optional player name', () => {
      const move = { from: [2, 0] as [number, number], to: [1, 0] as [number, number] };
      const turn = 1;
      const checksum = 'abc123';
      const playerName = 'Player 2';

      const url = buildDeltaUrl(move, turn, checksum, playerName);
      const hash = url.slice(1);

      const payload = decompressPayload(hash) as DeltaPayload;
      expect(payload?.playerName).toBe('Player 2');
    });

    it('should handle off_board moves', () => {
      const move = { from: [0, 2] as [number, number], to: 'off_board' as const };
      const turn = 5;
      const checksum = 'xyz789';

      const url = buildDeltaUrl(move, turn, checksum);
      const hash = url.slice(1);

      const payload = decompressPayload(hash) as DeltaPayload;
      expect(payload?.move.to).toBe('off_board');
    });

    it('should omit playerName when not provided', () => {
      const move = { from: [2, 0] as [number, number], to: [1, 0] as [number, number] };
      const turn = 2;
      const checksum = 'def456';

      const url = buildDeltaUrl(move, turn, checksum);
      const hash = url.slice(1);

      const payload = decompressPayload(hash) as DeltaPayload;
      expect(payload?.playerName).toBeUndefined();
    });
  });

  describe('buildFullStateUrl', () => {
    let gameState: GameState;

    beforeEach(() => {
      gameState = {
        version: '1.0.0',
        gameId: GameIdSchema.parse(uuid()),
        board: [[null, null, null], [null, null, null], [null, null, null]],
        whiteCourt: [],
        blackCourt: [],
        capturedWhite: [],
        capturedBlack: [],
        currentTurn: 0,
        currentPlayer: 'white',
        whitePlayer: {
          id: PlayerIdSchema.parse(uuid()),
          name: 'Player 1',
        },
        blackPlayer: {
          id: PlayerIdSchema.parse(uuid()),
          name: 'Player 2',
        },
        status: 'playing',
        winner: null,
        moveHistory: [],
        checksum: 'initial',
      };
    });

    it('should build valid full state URL', () => {
      const url = buildFullStateUrl(gameState);

      expect(url).toBeTruthy();
      expect(url.startsWith('#')).toBe(true);
      expect(url.length).toBeGreaterThan(1);
    });

    it('should encode complete game state', () => {
      const url = buildFullStateUrl(gameState);
      const hash = url.slice(1);

      const payload = decompressPayload(hash) as FullStatePayload;
      expect(payload?.type).toBe('full_state');
      expect(payload?.gameState).toEqual(gameState);
    });

    it('should include optional player name', () => {
      const playerName = 'Player 1';
      const url = buildFullStateUrl(gameState, playerName);
      const hash = url.slice(1);

      const payload = decompressPayload(hash) as FullStatePayload;
      expect(payload?.playerName).toBe('Player 1');
    });

    it('should be larger than delta URL', () => {
      const fullStateUrl = buildFullStateUrl(gameState);
      const deltaUrl = buildDeltaUrl(
        { from: [2, 0], to: [1, 0] },
        1,
        'abc123'
      );

      // Full state should be significantly larger
      expect(fullStateUrl.length).toBeGreaterThan(deltaUrl.length);
    });
  });

  describe('buildResyncRequestUrl', () => {
    it('should build valid resync request URL', () => {
      const move = { from: [1, 1] as [number, number], to: [2, 2] as [number, number] };
      const turn = 3;
      const checksum = 'mismatch123';
      const playerName = 'Player 2';

      const url = buildResyncRequestUrl(move, turn, checksum, playerName);

      expect(url).toBeTruthy();
      expect(url.startsWith('#')).toBe(true);
      expect(url.length).toBeGreaterThan(1);
    });

    it('should encode resync request correctly', () => {
      const move = { from: [1, 1] as [number, number], to: [2, 2] as [number, number] };
      const turn = 3;
      const checksum = 'mismatch123';
      const playerName = 'Player 2';

      const url = buildResyncRequestUrl(move, turn, checksum, playerName);
      const hash = url.slice(1);

      const payload = decompressPayload(hash) as ResyncRequestPayload;
      expect(payload?.type).toBe('resync_request');
      expect(payload?.move.from).toEqual([1, 1]);
      expect(payload?.move.to).toEqual([2, 2]);
      expect(payload?.turn).toBe(3);
      expect(payload?.checksum).toBe('mismatch123');
      expect(payload?.playerName).toBe('Player 2');
    });

    it('should include optional message', () => {
      const move = { from: [1, 1] as [number, number], to: [2, 2] as [number, number] };
      const turn = 3;
      const checksum = 'mismatch123';
      const playerName = 'Player 2';
      const message = 'Checksums do not match';

      const url = buildResyncRequestUrl(move, turn, checksum, playerName, message);
      const hash = url.slice(1);

      const payload = decompressPayload(hash) as ResyncRequestPayload;
      expect(payload?.message).toBe('Checksums do not match');
    });

    it('should omit message when not provided', () => {
      const move = { from: [1, 1] as [number, number], to: [2, 2] as [number, number] };
      const turn = 3;
      const checksum = 'mismatch123';
      const playerName = 'Player 2';

      const url = buildResyncRequestUrl(move, turn, checksum, playerName);
      const hash = url.slice(1);

      const payload = decompressPayload(hash) as ResyncRequestPayload;
      expect(payload?.message).toBeUndefined();
    });
  });

  describe('buildCompleteUrl', () => {
    it('should combine base URL and hash fragment', () => {
      const baseUrl = 'https://example.com/game';
      const hash = '#N4IgdghgtgpiBcIDaB';

      const url = buildCompleteUrl(baseUrl, hash);

      expect(url).toBe('https://example.com/game#N4IgdghgtgpiBcIDaB');
    });

    it('should remove trailing slash from base URL', () => {
      const baseUrl = 'https://example.com/game/';
      const hash = '#N4IgdghgtgpiBcIDaB';

      const url = buildCompleteUrl(baseUrl, hash);

      expect(url).toBe('https://example.com/game#N4IgdghgtgpiBcIDaB');
    });

    it('should add # to hash if missing', () => {
      const baseUrl = 'https://example.com/game';
      const hash = 'N4IgdghgtgpiBcIDaB';

      const url = buildCompleteUrl(baseUrl, hash);

      expect(url).toBe('https://example.com/game#N4IgdghgtgpiBcIDaB');
    });

    it('should work with localhost URLs', () => {
      const baseUrl = 'http://localhost:4321/game';
      const hash = '#N4IgdghgtgpiBcIDaB';

      const url = buildCompleteUrl(baseUrl, hash);

      expect(url).toBe('http://localhost:4321/game#N4IgdghgtgpiBcIDaB');
    });
  });

  describe('Integration: Round-trip encoding/decoding', () => {
    it('should round-trip delta payload', () => {
      const move = { from: [2, 1] as [number, number], to: [1, 1] as [number, number] };
      const turn = 2;
      const checksum = 'test123';
      const playerName = 'Test Player';

      const url = buildDeltaUrl(move, turn, checksum, playerName);
      const hash = url.slice(1);
      const payload = decompressPayload(hash) as DeltaPayload;

      expect(payload.type).toBe('delta');
      expect(payload.move).toEqual(move);
      expect(payload.turn).toBe(turn);
      expect(payload.checksum).toBe(checksum);
      expect(payload.playerName).toBe(playerName);
    });

    it('should round-trip full state payload', () => {
      const gameState: GameState = {
        version: '1.0.0',
        gameId: GameIdSchema.parse(uuid()),
        board: [[null, null, null], [null, null, null], [null, null, null]],
        whiteCourt: [],
        blackCourt: [],
        capturedWhite: [],
        capturedBlack: [],
        currentTurn: 0,
        currentPlayer: 'white',
        whitePlayer: {
          id: PlayerIdSchema.parse(uuid()),
          name: 'Player 1',
        },
        blackPlayer: {
          id: PlayerIdSchema.parse(uuid()),
          name: 'Player 2',
        },
        status: 'playing',
        winner: null,
        moveHistory: [],
        checksum: 'initial',
      };

      const url = buildFullStateUrl(gameState);
      const hash = url.slice(1);
      const payload = decompressPayload(hash) as FullStatePayload;

      expect(payload.type).toBe('full_state');
      expect(payload.gameState).toEqual(gameState);
    });

    it('should round-trip resync request payload', () => {
      const move = { from: [0, 0] as [number, number], to: [1, 1] as [number, number] };
      const turn = 4;
      const checksum = 'resync456';
      const playerName = 'Resync Player';
      const message = 'State divergence detected';

      const url = buildResyncRequestUrl(move, turn, checksum, playerName, message);
      const hash = url.slice(1);
      const payload = decompressPayload(hash) as ResyncRequestPayload;

      expect(payload.type).toBe('resync_request');
      expect(payload.move).toEqual(move);
      expect(payload.turn).toBe(turn);
      expect(payload.checksum).toBe(checksum);
      expect(payload.playerName).toBe(playerName);
      expect(payload.message).toBe(message);
    });
  });
});
