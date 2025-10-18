/**
 * @fileoverview Piece movement calculation for Kings Chess
 * @module lib/chess/pieceMovement
 *
 * Calculates all possible moves for each piece type following
 * standard chess rules within a 3x3 board.
 */

import type { Piece, Position } from '../validation/schemas';
import type { Direction } from './types';

/**
 * Check if position is within board bounds (0-2, 0-2).
 *
 * @param row - Row index
 * @param col - Column index
 * @returns True if position is on board
 */
export function isInBounds(row: number, col: number): boolean {
  return row >= 0 && row < 3 && col >= 0 && col < 3;
}

/**
 * Get all rook moves from position.
 *
 * Rooks move horizontally or vertically any distance.
 * Cannot jump over pieces.
 *
 * @param from - Starting position
 * @param getPiece - Function to get piece at position
 * @param currentPlayer - Current player color
 * @returns Array of valid destination positions
 */
export function getRookMoves(
  from: Position,
  getPiece: (pos: Position) => Piece | null,
  currentPlayer: 'light' | 'dark'
): Position[] {
  if (!from) return [];

  const moves: Position[] = [];
  const directions: Direction[] = [[0, 1], [0, -1], [1, 0], [-1, 0]];

  for (const [dr, dc] of directions) {
    let row = from[0] + dr;
    let col = from[1] + dc;

    while (isInBounds(row, col)) {
      const piece = getPiece([row, col]);

      if (!piece) {
        moves.push([row, col]);
      } else if (piece.owner !== currentPlayer) {
        moves.push([row, col]); // Can capture
        break;
      } else {
        break; // Own piece blocks
      }

      row += dr;
      col += dc;
    }
  }

  return moves;
}

/**
 * Get all knight moves from position.
 *
 * Knights move in L-shape: 2 squares one direction, 1 perpendicular.
 * Can jump over pieces.
 *
 * @param from - Starting position
 * @param getPiece - Function to get piece at position
 * @param currentPlayer - Current player color
 * @returns Array of valid destination positions
 */
export function getKnightMoves(
  from: Position,
  getPiece: (pos: Position) => Piece | null,
  currentPlayer: 'light' | 'dark'
): Position[] {
  if (!from) return [];

  const moves: Position[] = [];
  const offsets: Direction[] = [
    [2, 1], [2, -1], [-2, 1], [-2, -1],
    [1, 2], [1, -2], [-1, 2], [-1, -2],
  ];

  for (const [dr, dc] of offsets) {
    const row = from[0] + dr;
    const col = from[1] + dc;

    if (!isInBounds(row, col)) continue;

    const piece = getPiece([row, col]);
    if (!piece || piece.owner !== currentPlayer) {
      moves.push([row, col]);
    }
  }

  return moves;
}

/**
 * Get all bishop moves from position.
 *
 * Bishops move diagonally any distance.
 * Cannot jump over pieces.
 *
 * @param from - Starting position
 * @param getPiece - Function to get piece at position
 * @param currentPlayer - Current player color
 * @returns Array of valid destination positions
 */
export function getBishopMoves(
  from: Position,
  getPiece: (pos: Position) => Piece | null,
  currentPlayer: 'light' | 'dark'
): Position[] {
  if (!from) return [];

  const moves: Position[] = [];
  const directions: Direction[] = [[1, 1], [1, -1], [-1, 1], [-1, -1]];

  for (const [dr, dc] of directions) {
    let row = from[0] + dr;
    let col = from[1] + dc;

    while (isInBounds(row, col)) {
      const piece = getPiece([row, col]);

      if (!piece) {
        moves.push([row, col]);
      } else if (piece.owner !== currentPlayer) {
        moves.push([row, col]); // Can capture
        break;
      } else {
        break; // Own piece blocks
      }

      row += dr;
      col += dc;
    }
  }

  return moves;
}

/**
 * Check if rook has clear path to opponent's edge.
 *
 * For King's Cooking off-board moves.
 * Rook must have unobstructed path in at least one direction.
 *
 * @param from - Starting position
 * @param piece - Piece to check (must be rook)
 * @param getPiece - Function to get piece at position
 * @returns True if clear path exists to scorable edge
 */
export function hasRookPathToEdge(
  from: Position,
  piece: Piece,
  getPiece: (pos: Position) => Piece | null
): boolean {
  if (!from || piece.type !== 'rook') return false;

  const directions: Direction[] = [[0, 1], [0, -1], [1, 0], [-1, 0]];

  for (const [dr, dc] of directions) {
    let row = from[0] + dr;
    let col = from[1] + dc;
    let pathClear = true;

    while (isInBounds(row, col)) {
      if (getPiece([row, col])) {
        pathClear = false;
        break;
      }
      row += dr;
      col += dc;
    }

    if (pathClear) {
      // Check if we exited through opponent's edge
      const exitRow = row;
      if (piece.owner === 'light' && exitRow < 0) return true;
      if (piece.owner === 'dark' && exitRow > 2) return true;
    }
  }

  return false;
}

/**
 * Check if knight can jump off board to opponent's court.
 *
 * For King's Cooking off-board moves.
 * Knight L-shaped move must land beyond opponent's edge.
 *
 * @param from - Starting position
 * @param piece - Piece to check (must be knight)
 * @returns True if knight can jump to opponent's court
 */
export function canKnightJumpOffBoard(
  from: Position,
  piece: Piece
): boolean {
  if (!from || piece.type !== 'knight') return false;

  const offsets: Direction[] = [
    [2, 1], [2, -1], [-2, 1], [-2, -1],
    [1, 2], [1, -2], [-1, 2], [-1, -2],
  ];

  for (const [dr] of offsets) {
    const row = from[0] + dr;

    // Check if L-move lands off-board through opponent's edge
    if (piece.owner === 'light' && row < 0) return true;
    if (piece.owner === 'dark' && row > 2) return true;
  }

  return false;
}

/**
 * Check if bishop can move off-board based on position or diagonal trajectory.
 *
 * KING'S COOKING RULES:
 * 1. Bishops already on opponent's starting row can move off-board
 * 2. Bishops can move off-board if diagonal path crosses MIDDLE column (col 1) of opponent's row
 *
 * @param from - Starting position
 * @param piece - Piece to check (must be bishop)
 * @param getPiece - Function to get piece at position
 * @returns True if bishop can move off-board
 *
 * @example
 * // Rule 1: Bishop on opponent's starting row
 * canBishopMoveOffBoard([0, 0], whiteBishop, getPiece); // true
 *
 * @example
 * // Rule 2: Diagonal through middle column
 * // Light bishop at (1,0) with clear path through (0,1)
 * canBishopMoveOffBoard([1, 0], whiteBishop, getPiece); // true if path clear
 */
export function canBishopMoveOffBoard(
  from: Position,
  piece: Piece,
  getPiece: (pos: Position) => Piece | null
): boolean {
  if (!from || piece.type !== 'bishop') return false;

  // Rule 1: Bishop already on opponent's starting row
  // Light bishops score on row 0 (black's starting row)
  // Dark bishops score on row 2 (white's starting row)
  const onOpponentStartingRow =
    (piece.owner === 'light' && from[0] === 0) ||
    (piece.owner === 'dark' && from[0] === 2);

  if (onOpponentStartingRow) return true;

  // Rule 2: Diagonal path through middle column
  const diagonals: Direction[] = [[1, 1], [1, -1], [-1, 1], [-1, -1]];

  for (const [dr, dc] of diagonals) {
    let row = from[0] + dr;
    let col = from[1] + dc;

    // Follow diagonal path until reaching edge or blocked
    while (isInBounds(row, col)) {
      if (getPiece([row, col])) break; // Path blocked

      row += dr;
      col += dc;
    }

    // Check if we exited through opponent's edge (not side edge)
    const exitedThroughOpponentEdge =
      piece.owner === 'light' ? row < 0 : row > 2;

    if (!exitedThroughOpponentEdge) continue; // Wrong edge

    // Check which column the diagonal crosses through opponent's row
    // Step back to last valid column before going off-board
    const crossingColumn = col - dc;

    // Can move off-board if crossing through MIDDLE column (1)
    // Must stop if crossing through CORNER columns (0 or 2)
    if (crossingColumn === 1) return true;
  }

  return false; // No valid diagonal path to move off-board
}
