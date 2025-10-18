/**
 * @fileoverview Move validation for Kings Chess Engine
 * @module lib/chess/moveValidation
 *
 * Validates all moves according to King's Cooking rules:
 * - Standard chess piece movement
 * - Off-board movement restrictions
 * - Capture rules
 */

import type { Piece, Position } from '../validation/schemas';
import type { ValidationResult } from './types';
import {
  getRookMoves,
  getKnightMoves,
  getBishopMoves,
  hasRookPathToEdge,
  canKnightJumpOffBoard,
  canBishopMoveOffBoard,
} from './pieceMovement';

/**
 * Validate if move is legal.
 *
 * @param from - Starting position
 * @param to - Destination position or 'off_board'
 * @param piece - Piece being moved
 * @param getPiece - Function to get piece at position
 * @param currentPlayer - Current player
 * @returns Validation result with success status and error details
 */
export function validateMove(
  from: Position,
  to: Position | 'off_board',
  piece: Piece,
  getPiece: (pos: Position) => Piece | null,
  currentPlayer: 'light' | 'dark'
): ValidationResult {
  // Check it's this piece's turn
  if (piece.owner !== currentPlayer) {
    return {
      valid: false,
      reason: `It's ${currentPlayer}'s turn, cannot move ${piece.owner} pieces`,
    };
  }

  // Handle off-board moves
  if (to === 'off_board') {
    return validateOffBoardMove(from, piece, getPiece);
  }

  // Handle standard on-board moves
  return validateStandardMove(from, to, piece, getPiece, currentPlayer);
}

/**
 * Validate off-board move.
 *
 * CRITICAL RULES:
 * - Rooks: Can move off if clear path to opponent's edge
 * - Knights: Can jump off to opponent's court
 * - Bishops: Can move off if diagonal crosses through middle column (col 1)
 *
 * @param from - Starting position
 * @param piece - Piece to move off-board
 * @param getPiece - Function to get piece at position
 * @returns Validation result
 */
function validateOffBoardMove(
  from: Position,
  piece: Piece,
  getPiece: (pos: Position) => Piece | null
): ValidationResult {
  if (piece.type === 'rook') {
    const hasPath = hasRookPathToEdge(from, piece, getPiece);
    if (!hasPath) {
      return {
        valid: false,
        reason: 'Rook has no clear path to board edge',
      };
    }
    return {
      valid: true,
      warnings: [`${piece.owner} rook moves to opponent's court`],
    };
  }

  if (piece.type === 'knight') {
    const canJump = canKnightJumpOffBoard(from, piece);
    if (!canJump) {
      return {
        valid: false,
        reason: 'Knight L-move does not land in opponent court',
      };
    }
    return {
      valid: true,
      warnings: [`${piece.owner} knight jumps to opponent's court`],
    };
  }

  if (piece.type === 'bishop') {
    const canMoveOff = canBishopMoveOffBoard(from, piece, getPiece);
    if (!canMoveOff) {
      return {
        valid: false,
        reason: 'Bishop diagonal path must cross through middle column (col 1) of opponent row to move off-board. Corner paths require stopping at edge first.',
      };
    }
    return {
      valid: true,
      warnings: [`${piece.owner} bishop moves diagonally to opponent's court`],
    };
  }

  // Unknown piece type
  return {
    valid: false,
    reason: `Piece cannot move off-board`,
  };
}

/**
 * Validate standard on-board move.
 *
 * @param from - Starting position
 * @param to - Destination position
 * @param piece - Piece being moved
 * @param getPiece - Function to get piece at position
 * @param currentPlayer - Current player
 * @returns Validation result
 */
function validateStandardMove(
  from: Position,
  to: Position,
  piece: Piece,
  getPiece: (pos: Position) => Piece | null,
  currentPlayer: 'light' | 'dark'
): ValidationResult {
  // Ensure to is not null
  if (!to) {
    return {
      valid: false,
      reason: 'Invalid destination position',
    };
  }

  // Get all valid moves for this piece
  let validMoves: Position[];

  switch (piece.type) {
    case 'rook':
      validMoves = getRookMoves(from, getPiece, currentPlayer);
      break;
    case 'knight':
      validMoves = getKnightMoves(from, getPiece, currentPlayer);
      break;
    case 'bishop':
      validMoves = getBishopMoves(from, getPiece, currentPlayer);
      break;
    default:
      return {
        valid: false,
        reason: `Unknown piece type`,
      };
  }

  // Check if destination is in valid moves
  const isValid = validMoves.some((move) => {
    if (!move) return false;
    return move[0] === to[0] && move[1] === to[1];
  });

  if (!isValid) {
    const fromStr = `[${from?.[0] ?? '?'},${from?.[1] ?? '?'}]`;
    const toStr = `[${to[0]},${to[1]}]`;
    return {
      valid: false,
      reason: `${piece.type} cannot move from ${fromStr} to ${toStr}`,
    };
  }

  // Check for capture
  const targetPiece = getPiece(to);
  const warnings: string[] = [];

  if (targetPiece) {
    warnings.push(
      `Captured ${targetPiece.owner} ${targetPiece.type} will return to ${targetPiece.owner} king's court (no points)`
    );
  }

  return { valid: true, warnings };
}

/**
 * Check if player is in stalemate (no legal moves).
 *
 * @param pieces - Array of current player's pieces on board
 * @param getPiece - Function to get piece at position
 * @param currentPlayer - Current player
 * @returns True if no legal moves exist
 */
export function isStalemate(
  pieces: Piece[],
  getPiece: (pos: Position) => Piece | null,
  currentPlayer: 'light' | 'dark'
): boolean {
  for (const piece of pieces) {
    if (piece.position === null) continue; // Off-board

    const validMoves = getValidMovesForPiece(
      piece.position,
      piece,
      getPiece,
      currentPlayer
    );

    if (validMoves.length > 0) return false; // Has moves
  }

  return true; // No legal moves
}

/**
 * Get all valid moves for a piece (helper).
 */
function getValidMovesForPiece(
  from: Position,
  piece: Piece,
  getPiece: (pos: Position) => Piece | null,
  currentPlayer: 'light' | 'dark'
): Position[] {
  switch (piece.type) {
    case 'rook':
      return getRookMoves(from, getPiece, currentPlayer);
    case 'knight':
      return getKnightMoves(from, getPiece, currentPlayer);
    case 'bishop':
      return getBishopMoves(from, getPiece, currentPlayer);
    default:
      return [];
  }
}
