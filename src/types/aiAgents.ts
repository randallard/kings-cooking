/**
 * @fileoverview Types for AI Agents mode (townage.app integration)
 * @module types/aiAgents
 */

/** Skill level identifiers for inference server agents. */
export type AgentSkillLevel = 'scripted_1' | 'scripted_2';

/**
 * Data parsed from the townage.app #lot= hash when launching from an NPC.
 */
export interface LotLaunchData {
  sessionId: string;
  npcId: string;
  npcDisplayName: string;
  agentType: AgentSkillLevel;
  playerName?: string;
  returnUrl: string;
}

/** A move destination: board position or off-board scoring. */
export type MoveTarget = [number, number] | 'off_board';

/** A piece and all of its legal moves (on-board + off-board). */
export interface PieceWithMoves {
  from: [number, number];
  moves: MoveTarget[];
}
