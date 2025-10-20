/**
 * @fileoverview Business logic for piece selection
 * @module lib/pieceSelection/logic
 */

import { PIECE_POOL } from './types';
import type { PieceType, SelectedPieces } from './types';
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
 * Places pieces based on player1's color choice.
 *
 * @param player1Pieces - Player 1's selected pieces
 * @param player2Pieces - Player 2's selected pieces
 * @param player1Color - Player 1's color choice (light or dark)
 * @returns 3x3 board with pieces placed
 */
export function createBoardWithPieces(
  player1Pieces: SelectedPieces,
  player2Pieces: SelectedPieces,
  player1Color: 'light' | 'dark'
): GameState['board'] {
  // Empty 3x3 board
  const board: GameState['board'] = [
    [null, null, null],
    [null, null, null],
    [null, null, null],
  ];

  // Determine piece placement based on player1's color choice
  // Light pieces go on row 2 (bottom), dark pieces on row 0 (top)
  const p1Row = player1Color === 'light' ? 2 : 0;
  const p2Row = player1Color === 'light' ? 0 : 2;
  const p2Color = player1Color === 'light' ? 'dark' : 'light';

  // Place Player 1's pieces
  player1Pieces.forEach((type, col) => {
    board[p1Row]![col] = {
      type,
      owner: player1Color,
      position: [p1Row, col],
      moveCount: 0,
      id: crypto.randomUUID(),
    };
  });

  // Place Player 2's pieces
  player2Pieces.forEach((type, col) => {
    board[p2Row]![col] = {
      type,
      owner: p2Color,
      position: [p2Row, col],
      moveCount: 0,
      id: crypto.randomUUID(),
    };
  });

  return board;
}
