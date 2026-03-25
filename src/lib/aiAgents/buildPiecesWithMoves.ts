/**
 * @fileoverview Build pieces-with-moves payload for inference server
 * @module lib/aiAgents/buildPiecesWithMoves
 *
 * Combines on-board legal moves from the chess engine with off-board eligibility
 * checks to produce the full move list for each AI piece.
 */

import type { GameState, Position, Piece } from '../validation/schemas';
import type { PieceWithMoves } from '../../types/aiAgents';
import { KingsChessEngine } from '../chess/KingsChessEngine';
import { validateMove } from '../chess/moveValidation';

/**
 * Build the pieces_with_moves array for the inference server request.
 *
 * Iterates all AI-owned pieces on the board, collects their on-board legal
 * moves from the engine, then appends "off_board" if the piece can score.
 *
 * Iteration order: from the AI's court side outward so the first piece
 * encountered is most advanced (scripted_1 picks pieces_with_moves[0]).
 *
 * @param engine - Chess engine loaded with current game state
 * @param gameState - Current game state
 * @param aiColor - Color of the AI player
 * @returns Array of pieces with their legal moves (never empty pieces)
 */
export function buildPiecesWithMoves(
  engine: KingsChessEngine,
  gameState: GameState,
  aiColor: 'light' | 'dark'
): PieceWithMoves[] {
  const result: PieceWithMoves[] = [];

  const getPiece = (pos: Position): Piece | null => {
    if (!pos) return null;
    const row = gameState.board[pos[0]];
    return row ? (row[pos[1]] ?? null) : null;
  };

  const lastMove =
    gameState.moveHistory.length > 0
      ? gameState.moveHistory[gameState.moveHistory.length - 1]
      : null;

  // Iterate from AI's starting row toward opponent (most advanced first)
  // Dark starts at row 2, light starts at row 0
  const rowOrder: number[] = aiColor === 'dark' ? [0, 1, 2] : [2, 1, 0];

  for (const row of rowOrder) {
    for (let col = 0; col < 3; col++) {
      const piece = getPiece([row, col]);
      if (!piece || piece.owner !== aiColor) continue;

      const from: [number, number] = [row, col];

      // On-board moves from engine
      const onBoardMoves = engine.getValidMoves([row, col]) as [number, number][];
      const moves: PieceWithMoves['moves'] = [...onBoardMoves];

      // Off-board eligibility (pawns cannot go off-board in King's Cooking)
      if (piece.type !== 'pawn') {
        const offBoardValidation = validateMove(
          from,
          'off_board',
          piece,
          getPiece,
          aiColor,
          lastMove ?? null
        );
        if (offBoardValidation.valid) {
          moves.push('off_board');
        }
      }

      if (moves.length > 0) {
        result.push({ from, moves });
      }
    }
  }

  return result;
}
