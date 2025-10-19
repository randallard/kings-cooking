/**
 * @fileoverview Business logic for piece selection
 * @module lib/pieceSelection/logic
 */

import { PIECE_POOL } from './types';
import type { PieceType, SelectedPieces, FirstMover } from './types';
import type { GameState } from '@/lib/validation/schemas';

/**
 * Get available pieces based on current selection.
 * Respects PIECE_POOL limits (e.g., max 2 rooks, max 1 queen).
 *
 * @param selected - Currently selected pieces
 * @returns Array of piece types still available for selection
 */
export function getAvailablePieces(selected: PieceType[]): PieceType[] {
  const counts: Record<PieceType, number> = {
    rook: 0,
    knight: 0,
    bishop: 0,
    queen: 0,
    pawn: 0,
  };

  // Count selected pieces
  selected.forEach((piece) => {
    counts[piece]++;
  });

  // Filter to available pieces (not at max limit)
  return Object.entries(PIECE_POOL)
    .filter(([piece, { max }]) => counts[piece as PieceType] < max)
    .map(([piece]) => piece as PieceType);
}

/**
 * Generate random pieces (deterministic with seed).
 * Uses djb2 hash algorithm for seeded randomness.
 *
 * @param seed - Seed string for deterministic generation
 * @returns Tuple of 3 randomly selected pieces
 */
export function generateRandomPieces(seed: string): SelectedPieces {
  // Simple seeded random using djb2 hash
  let hash = 5381;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 33) ^ seed.charCodeAt(i);
  }

  const seededRandom = (): number => {
    hash = (hash * 1103515245 + 12345) & 0x7fffffff;
    return hash / 0x7fffffff;
  };

  const selected: PieceType[] = [];

  for (let i = 0; i < 3; i++) {
    const available = getAvailablePieces(selected);
    const index = Math.floor(seededRandom() * available.length);
    selected.push(available[index]!);
  }

  return selected as SelectedPieces;
}

/**
 * Create initial board with selected pieces.
 * Places pieces in row 0 (light) and row 2 (dark) based on firstMover.
 *
 * @param player1Pieces - Player 1's selected pieces
 * @param player2Pieces - Player 2's selected pieces
 * @param firstMover - Who goes first (determines light/dark assignment)
 * @returns 3x3 board with pieces placed
 */
export function createBoardWithPieces(
  player1Pieces: SelectedPieces,
  player2Pieces: SelectedPieces,
  firstMover: FirstMover
): GameState['board'] {
  // Empty 3x3 board
  const board: GameState['board'] = [
    [null, null, null],
    [null, null, null],
    [null, null, null],
  ];

  // Determine which player is light (goes first)
  const lightPieces = firstMover === 'player1' ? player1Pieces : player2Pieces;
  const darkPieces = firstMover === 'player1' ? player2Pieces : player1Pieces;

  // Place light pieces (row 0)
  lightPieces.forEach((type, col) => {
    board[0]![col] = {
      type,
      owner: 'light',
      position: [0, col],
      moveCount: 0,
      id: crypto.randomUUID(),
    };
  });

  // Place dark pieces (row 2)
  darkPieces.forEach((type, col) => {
    board[2]![col] = {
      type,
      owner: 'dark',
      position: [2, col],
      moveCount: 0,
      id: crypto.randomUUID(),
    };
  });

  return board;
}
