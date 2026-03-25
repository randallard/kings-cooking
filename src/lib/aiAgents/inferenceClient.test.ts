/**
 * @fileoverview Tests for inferenceClient
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { selectMove } from './inferenceClient';
import type { PieceWithMoves } from '../../types/aiAgents';
import type { GameState } from '../validation/schemas';

const UUID_LIGHT = '00000000-0000-0000-0000-000000000001';
const UUID_DARK  = '00000000-0000-0000-0000-000000000002';

function makeMinimalGameState(): GameState {
  return {
    version: '1.0.0',
    gameId: '00000000-0000-0000-0000-000000000099' as never,
    board: [[null, null, null], [null, null, null], [null, null, null]],
    lightCourt: [],
    darkCourt: [],
    capturedLight: [],
    capturedDark: [],
    currentTurn: 0,
    currentPlayer: 'dark',
    lightPlayer: { id: UUID_LIGHT as never, name: 'Light' },
    darkPlayer: { id: UUID_DARK as never, name: 'Dark' },
    status: 'playing',
    winner: null,
    moveHistory: [],
    checksum: '',
  };
}

const PIECES: PieceWithMoves[] = [
  { from: [0, 0], moves: [[1, 0]] },
];

describe('inferenceClient – selectMove', () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    // Note: do NOT call vi.unstubAllGlobals() — it would undo the localStorage
    // stub set up in src/test/setup.ts, breaking the afterEach cleanup.
  });

  it('throws when VITE_KC_INFERENCE_API_URL is not set', async () => {
    vi.stubEnv('VITE_KC_INFERENCE_API_URL', '');
    await expect(
      selectMove(PIECES, 'scripted_1', makeMinimalGameState(), 'dark')
    ).rejects.toThrow('VITE_KC_INFERENCE_API_URL is not configured');
  });

  it('returns the move from the server response', async () => {
    vi.stubEnv('VITE_KC_INFERENCE_API_URL', 'http://localhost:8000');

    const mockResponse = {
      move: { from: [0, 0], to: [1, 0] },
      agent: 'scripted_1',
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    } as Response);

    const result = await selectMove(PIECES, 'scripted_1', makeMinimalGameState(), 'dark');
    expect(result.move.from).toEqual([0, 0]);
    expect(result.move.to).toEqual([1, 0]);
    expect(result.agent).toBe('scripted_1');
  });

  it('throws when server responds with non-ok status', async () => {
    vi.stubEnv('VITE_KC_INFERENCE_API_URL', 'http://localhost:8000');

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      statusText: 'Unprocessable Entity',
    } as Response);

    await expect(
      selectMove(PIECES, 'scripted_1', makeMinimalGameState(), 'dark')
    ).rejects.toThrow('422');
  });

  it('sends correct JSON body to the server', async () => {
    vi.stubEnv('VITE_KC_INFERENCE_API_URL', 'http://localhost:8000');

    const capturedOptions: RequestInit[] = [];
    global.fetch = vi.fn().mockImplementation((_url: string, opts: RequestInit) => {
      capturedOptions.push(opts);
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ move: { from: [0, 0], to: [1, 0] }, agent: 'scripted_1' }),
      } as Response);
    });

    await selectMove(PIECES, 'scripted_1', makeMinimalGameState(), 'dark');

    const body = JSON.parse(capturedOptions[0]!.body as string) as Record<string, unknown>;
    expect(body['agent']).toBe('scripted_1');
    expect(body['current_player']).toBe('dark');
    expect(Array.isArray(body['pieces_with_moves'])).toBe(true);
  });
});
