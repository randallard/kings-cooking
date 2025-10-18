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
 * - lightCourt = white pieces in BLACK's court (white scores)
 * - darkCourt = black pieces in WHITE's court (black scores)
 * - capturedLight = white pieces captured (no score)
 * - capturedDark = black pieces captured (no score)
 * - AUTO-SCORING: When one team eliminated, remaining opponent pieces auto-score
 *
 * @param gameState - Current game state
 * @returns Victory result with winner and scores
 */
export function checkGameEnd(gameState: GameState): VictoryResult {
  // Count pieces still on board for each team
  const whitePiecesOnBoard = countPiecesOnBoard(gameState, 'light');
  const blackPiecesOnBoard = countPiecesOnBoard(gameState, 'dark');

  // Check if one team has been eliminated (all pieces off-board)
  if (whitePiecesOnBoard === 0 || blackPiecesOnBoard === 0) {
    // Auto-score remaining pieces
    const whiteScore = gameState.lightCourt.length + whitePiecesOnBoard;
    const blackScore = gameState.darkCourt.length + blackPiecesOnBoard;

    if (whiteScore > blackScore) {
      return {
        gameOver: true,
        winner: 'light',
        score: { light: whiteScore, dark: blackScore },
        reason: `Light wins ${whiteScore}-${blackScore} (${whitePiecesOnBoard === 0 ? 'eliminated' : 'dominating'})`,
      };
    }

    if (blackScore > whiteScore) {
      return {
        gameOver: true,
        winner: 'dark',
        score: { light: whiteScore, dark: blackScore },
        reason: `Dark wins ${blackScore}-${whiteScore} (${blackPiecesOnBoard === 0 ? 'eliminated' : 'dominating'})`,
      };
    }

    return {
      gameOver: true,
      winner: null,
      score: { light: whiteScore, dark: blackScore },
      reason: 'Draw! Both kings serve together.',
    };
  }

  // Check if all pieces are off-board (normal game end)
  const allOffBoard = areAllPiecesOffBoard(gameState);

  if (!allOffBoard) {
    return { gameOver: false };
  }

  // Count scored pieces (in opponent's courts)
  const whiteScore = gameState.lightCourt.length; // Light in Dark's court
  const blackScore = gameState.darkCourt.length; // Dark in Light's court

  if (whiteScore > blackScore) {
    return {
      gameOver: true,
      winner: 'light',
      score: { light: whiteScore, dark: blackScore },
      reason: `Light wins with ${whiteScore} pieces in Dark's court!`,
    };
  }

  if (blackScore > whiteScore) {
    return {
      gameOver: true,
      winner: 'dark',
      score: { light: whiteScore, dark: blackScore },
      reason: `Dark wins with ${blackScore} pieces in Light's court!`,
    };
  }

  return {
    gameOver: true,
    winner: null,
    score: { light: whiteScore, dark: blackScore },
    reason: 'Draw! Both kings serve together.',
  };
}

/**
 * Count pieces still on board for a specific team.
 *
 * @param gameState - Current game state
 * @param owner - Team to count ('light' or 'dark')
 * @returns Number of pieces on board
 */
function countPiecesOnBoard(
  gameState: GameState,
  owner: 'light' | 'dark'
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
  light: number;
  dark: number;
} {
  return {
    light: gameState.lightCourt.length,
    dark: gameState.darkCourt.length,
  };
}
