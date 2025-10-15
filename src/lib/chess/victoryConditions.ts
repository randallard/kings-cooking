/**
 * @fileoverview Victory condition detection for Kings Chess
 * @module lib/chess/victoryConditions
 *
 * Implements King's Cooking victory rules:
 * - Winner = player with most pieces in OPPONENT'S court
 * - Draw = equal pieces in each court
 * - Game ends when all pieces captured or scored
 * - Auto-scoring when one team eliminated
 */

import type { GameState } from '../validation/schemas';
import type { VictoryResult } from './types';

/**
 * Check if game has ended and determine winner.
 *
 * CRITICAL RULES:
 * - whiteCourt = white pieces in BLACK's court (white scores)
 * - blackCourt = black pieces in WHITE's court (black scores)
 * - capturedWhite = white pieces captured (no score)
 * - capturedBlack = black pieces captured (no score)
 * - AUTO-SCORING: When one team eliminated, remaining opponent pieces auto-score
 *
 * @param gameState - Current game state
 * @returns Victory result with winner and scores
 */
export function checkGameEnd(gameState: GameState): VictoryResult {
  // Count pieces still on board for each team
  const whitePiecesOnBoard = countPiecesOnBoard(gameState, 'white');
  const blackPiecesOnBoard = countPiecesOnBoard(gameState, 'black');

  // Check if one team has been eliminated (all pieces off-board)
  if (whitePiecesOnBoard === 0 || blackPiecesOnBoard === 0) {
    // Auto-score remaining pieces
    const whiteScore = gameState.whiteCourt.length + whitePiecesOnBoard;
    const blackScore = gameState.blackCourt.length + blackPiecesOnBoard;

    if (whiteScore > blackScore) {
      return {
        gameOver: true,
        winner: 'white',
        score: { white: whiteScore, black: blackScore },
        reason: `White wins ${whiteScore}-${blackScore} (${whitePiecesOnBoard === 0 ? 'eliminated' : 'dominating'})`,
      };
    }

    if (blackScore > whiteScore) {
      return {
        gameOver: true,
        winner: 'black',
        score: { white: whiteScore, black: blackScore },
        reason: `Black wins ${blackScore}-${whiteScore} (${blackPiecesOnBoard === 0 ? 'eliminated' : 'dominating'})`,
      };
    }

    return {
      gameOver: true,
      winner: null,
      score: { white: whiteScore, black: blackScore },
      reason: 'Draw! Both kings serve together.',
    };
  }

  // Check if all pieces are off-board (normal game end)
  const allOffBoard = areAllPiecesOffBoard(gameState);

  if (!allOffBoard) {
    return { gameOver: false };
  }

  // Count scored pieces (in opponent's courts)
  const whiteScore = gameState.whiteCourt.length; // White in Black's court
  const blackScore = gameState.blackCourt.length; // Black in White's court

  if (whiteScore > blackScore) {
    return {
      gameOver: true,
      winner: 'white',
      score: { white: whiteScore, black: blackScore },
      reason: `White wins with ${whiteScore} pieces in Black's court!`,
    };
  }

  if (blackScore > whiteScore) {
    return {
      gameOver: true,
      winner: 'black',
      score: { white: whiteScore, black: blackScore },
      reason: `Black wins with ${blackScore} pieces in White's court!`,
    };
  }

  return {
    gameOver: true,
    winner: null,
    score: { white: whiteScore, black: blackScore },
    reason: 'Draw! Both kings serve together.',
  };
}

/**
 * Count pieces still on board for a specific team.
 *
 * @param gameState - Current game state
 * @param owner - Team to count ('white' or 'black')
 * @returns Number of pieces on board
 */
function countPiecesOnBoard(
  gameState: GameState,
  owner: 'white' | 'black'
): number {
  let count = 0;

  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const piece = gameState.board[row]?.[col];
      if (piece && piece.owner === owner) {
        count++;
      }
    }
  }

  return count;
}

/**
 * Check if all pieces are off-board (captured or scored).
 *
 * @param gameState - Current game state
 * @returns True if no pieces remain on board
 */
function areAllPiecesOffBoard(gameState: GameState): boolean {
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      if (gameState.board[row]?.[col] !== null) {
        return false; // Found piece on board
      }
    }
  }
  return true;
}

/**
 * Get current score breakdown.
 *
 * @param gameState - Current game state
 * @returns Score for each player
 */
export function getCurrentScore(gameState: GameState): {
  white: number;
  black: number;
} {
  return {
    white: gameState.whiteCourt.length,
    black: gameState.blackCourt.length,
  };
}
