/**
 * @fileoverview HTTP client for the kings-cooking-python inference server
 * @module lib/aiAgents/inferenceClient
 */

import type { GameState } from '../validation/schemas';
import type { AgentSkillLevel, PieceWithMoves, MoveTarget } from '../../types/aiAgents';

interface SelectMoveResponse {
  move: { from: [number, number]; to: MoveTarget };
  agent: AgentSkillLevel;
}

/**
 * Call the inference server to select a move.
 *
 * @param piecesWithMoves - All legal moves for the AI player's pieces
 * @param agent - Agent skill level identifier
 * @param gameState - Current board state (sent as context for future trained agents)
 * @param currentPlayer - AI player's color
 * @returns Selected move from the inference server
 * @throws Error if the request fails or the API URL is not configured
 */
export async function selectMove(
  piecesWithMoves: PieceWithMoves[],
  agent: AgentSkillLevel,
  gameState: GameState,
  currentPlayer: 'light' | 'dark'
): Promise<SelectMoveResponse> {
  const baseUrl = import.meta.env.VITE_KC_INFERENCE_API_URL as string | undefined;
  if (!baseUrl) {
    throw new Error('VITE_KC_INFERENCE_API_URL is not configured');
  }

  const body = {
    agent,
    current_player: currentPlayer,
    board: gameState.board,
    pieces_with_moves: piecesWithMoves,
  };

  const response = await fetch(`${baseUrl}/select-move`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Inference server error: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as SelectMoveResponse;
}
