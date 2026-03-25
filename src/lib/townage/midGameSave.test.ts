/**
 * @fileoverview Tests for midGameSave
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { saveMidGame, loadMidGame, clearMidGame } from './midGameSave';
import type { GameState } from '../validation/schemas';

function makeMockGameState(): GameState {
  return {
    version: '1.0.0',
    gameId: 'test-game' as never,
    board: [[null, null, null], [null, null, null], [null, null, null]],
    lightCourt: [],
    darkCourt: [],
    capturedLight: [],
    capturedDark: [],
    currentTurn: 0,
    currentPlayer: 'light',
    lightPlayer: { id: 'lp' as never, name: 'Alice' },
    darkPlayer: { id: 'dp' as never, name: 'NPC' },
    status: 'playing',
    winner: null,
    moveHistory: [],
    checksum: 'abc',
  };
}

describe('midGameSave', () => {
  const npcId = 'npc-test-999';

  beforeEach(() => {
    localStorage.clear();
  });

  it('returns null when no save exists', () => {
    expect(loadMidGame(npcId)).toBeNull();
  });

  it('saves and loads a mid-game state', () => {
    const save = { gameState: makeMockGameState(), playerColor: 'light' as const, agentType: 'scripted_1' as const };
    saveMidGame(npcId, save);

    const loaded = loadMidGame(npcId);
    expect(loaded?.playerColor).toBe('light');
    expect(loaded?.agentType).toBe('scripted_1');
    expect(loaded?.gameState.gameId).toBe('test-game');
  });

  it('returns null after clearMidGame', () => {
    const save = { gameState: makeMockGameState(), playerColor: 'dark' as const, agentType: 'scripted_1' as const };
    saveMidGame(npcId, save);
    clearMidGame(npcId);

    expect(loadMidGame(npcId)).toBeNull();
  });

  it('each npcId gets its own save slot', () => {
    const save1 = { gameState: makeMockGameState(), playerColor: 'light' as const, agentType: 'scripted_1' as const };
    const save2 = { gameState: { ...makeMockGameState(), gameId: 'other-game' as never }, playerColor: 'dark' as const, agentType: 'scripted_1' as const };

    saveMidGame('npc-A', save1);
    saveMidGame('npc-B', save2);

    expect(loadMidGame('npc-A')?.playerColor).toBe('light');
    expect(loadMidGame('npc-B')?.playerColor).toBe('dark');
  });

  it('returns null for corrupted localStorage data', () => {
    localStorage.setItem('townage-kings-cooking-game-bad-npc', 'not-valid-json!!!');
    expect(loadMidGame('bad-npc')).toBeNull();
  });
});
