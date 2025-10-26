/**
 * @fileoverview Tests for URL builder utilities
 * @module lib/urlEncoding/urlBuilder.test
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  buildFullStateUrl,
  buildCompleteUrl,
} from './urlBuilder';
import { decompressPayload } from './compression';
import type { FullStatePayload } from './types';
import { v4 as uuid } from 'uuid';
import { PlayerIdSchema, GameIdSchema } from '@/lib/validation/schemas';
import type { GameState } from '@/lib/validation/schemas';

describe('URL Builder Utilities', () => {
  describe('buildFullStateUrl', () => {
    let gameState: GameState;

    beforeEach(() => {
      gameState = {
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
    it('should round-trip full state payload', () => {
      const gameState: GameState = {
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
      };

      const url = buildFullStateUrl(gameState);
      const hash = url.slice(1);
      const payload = decompressPayload(hash) as FullStatePayload;

      expect(payload.type).toBe('full_state');
      expect(payload.gameState).toEqual(gameState);
    });
  });
});
