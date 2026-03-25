/**
 * @fileoverview Mid-game save/restore for townage.app AI Agents sessions
 * @module lib/townage/midGameSave
 *
 * Persists in-progress AI Agents games to localStorage so the player can
 * return to townage.app and resume later.
 */

import type { GameState } from '../validation/schemas';
import type { AgentSkillLevel } from '../../types/aiAgents';

interface MidGameSave {
  gameState: GameState;
  playerColor: 'light' | 'dark';
  agentType: AgentSkillLevel;
}

function getMidGameKey(npcId: string): string {
  return `townage-kings-cooking-game-${npcId}`;
}

export function saveMidGame(npcId: string, save: MidGameSave): void {
  try {
    localStorage.setItem(getMidGameKey(npcId), JSON.stringify(save));
  } catch {
    // Ignore storage errors (e.g. private browsing quota)
  }
}

export function loadMidGame(npcId: string): MidGameSave | null {
  try {
    const raw = localStorage.getItem(getMidGameKey(npcId));
    if (!raw) return null;
    return JSON.parse(raw) as MidGameSave;
  } catch {
    return null;
  }
}

export function clearMidGame(npcId: string): void {
  localStorage.removeItem(getMidGameKey(npcId));
}
