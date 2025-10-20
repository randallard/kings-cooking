/**
 * @fileoverview Move validation for Kings Chess Engine
 * @module lib/chess/moveValidation
 *
 * Validates all moves according to King's Cooking rules:
 * - Standard chess piece movement
 * - Off-board movement restrictions
 * - Capture rules
 */

import type { Piece, Position, Move } from '../validation/schemas';
import type { ValidationResult } from './types';
import {
  getRookMoves,
  getKnightMoves,
  getBishopMoves,
  getQueenMoves,
  getPawnMoves,
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
 * @param lastMove - Last move from history (for en passant)
 * @returns Validation result with success status and error details
 */
export function validateMove(
  from: Position,
  to: Position | 'off_board',
  piece: Piece,
  getPiece: (pos: Position) => Piece | null,
  currentPlayer: 'light' | 'dark',
  lastMove?: Move | null
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
  return validateStandardMove(from, to, piece, getPiece, currentPlayer, lastMove);
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

  if (piece.type === 'queen') {
    if (!from) {
      return {
        valid: false,
        reason: 'Invalid position',
      };
    }

    // Queen can move off-board like rook OR bishop
    // Check rook-like path: straight line to opponent's edge
    let hasRookPath = false;
    const directions: [number, number][] = [[0, 1], [0, -1], [1, 0], [-1, 0]];

    for (const [dr, dc] of directions) {
      let row = from[0] + dr;
      let col = from[1] + dc;
      let pathClear = true;

      while (row >= 0 && row < 3 && col >= 0 && col < 3) {
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
        if (piece.owner === 'light' && exitRow < 0) {
          hasRookPath = true;
          break;
        }
        if (piece.owner === 'dark' && exitRow > 2) {
          hasRookPath = true;
          break;
        }
      }
    }

    // Check bishop-like path: diagonal through middle column
    let hasBishopPath = false;

    // Rule 1: Already on opponent's starting row
    const onOpponentStartingRow =
      (piece.owner === 'light' && from[0] === 0) ||
      (piece.owner === 'dark' && from[0] === 2);

    if (onOpponentStartingRow) {
      hasBishopPath = true;
    } else {
      // Rule 2: Diagonal path through middle column
      const diagonals: [number, number][] = [[1, 1], [1, -1], [-1, 1], [-1, -1]];

      for (const [dr, dc] of diagonals) {
        let row = from[0] + dr;
        let col = from[1] + dc;

        while (row >= 0 && row < 3 && col >= 0 && col < 3) {
          if (getPiece([row, col])) break;
          row += dr;
          col += dc;
        }

        const exitedThroughOpponentEdge =
          piece.owner === 'light' ? row < 0 : row > 2;

        if (!exitedThroughOpponentEdge) continue;

        const crossingColumn = col - dc;
        if (crossingColumn === 1) {
          hasBishopPath = true;
          break;
        }
      }
    }

    if (!hasRookPath && !hasBishopPath) {
      return {
        valid: false,
        reason: 'Queen must have clear straight path OR diagonal through middle column to move off-board',
      };
    }
    return {
      valid: true,
      warnings: [`${piece.owner} queen moves to opponent's court`],
    };
  }

  if (piece.type === 'pawn') {
    // TODO: Issue #25 - Implement pawn promotion instead of blocking off-board
    // Current: Pawns cannot move off-board (King's Cooking variant rule)
    // Future: Pawns should promote to queen/other piece when reaching opposite edge
    // Edge case: En passant should still apply after 2-square jump to promotion row
    return {
      valid: false,
      reason: 'Pawns cannot move off-board. They score by being captured.',
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
 * @param lastMove - Last move from history (for en passant)
 * @returns Validation result
 */
function validateStandardMove(
  from: Position,
  to: Position,
  piece: Piece,
  getPiece: (pos: Position) => Piece | null,
  currentPlayer: 'light' | 'dark',
  lastMove?: Move | null
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
    case 'queen':
      validMoves = getQueenMoves(from, getPiece, currentPlayer);
      break;
    case 'pawn':
      validMoves = getPawnMoves(from, piece, getPiece, currentPlayer, lastMove);
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
 * @param lastMove - Last move from history (for en passant)
 * @returns True if no legal moves exist
 */
export function isStalemate(
  pieces: Piece[],
  getPiece: (pos: Position) => Piece | null,
  currentPlayer: 'light' | 'dark',
  lastMove?: Move | null
): boolean {
  for (const piece of pieces) {
    if (piece.position === null) continue; // Off-board

    const validMoves = getValidMovesForPiece(
      piece.position,
      piece,
      getPiece,
      currentPlayer,
      lastMove
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
  currentPlayer: 'light' | 'dark',
  lastMove?: Move | null
): Position[] {
  switch (piece.type) {
    case 'rook':
      return getRookMoves(from, getPiece, currentPlayer);
    case 'knight':
      return getKnightMoves(from, getPiece, currentPlayer);
    case 'bishop':
      return getBishopMoves(from, getPiece, currentPlayer);
    case 'queen':
      return getQueenMoves(from, getPiece, currentPlayer);
    case 'pawn':
      return getPawnMoves(from, piece, getPiece, currentPlayer, lastMove);
    default:
      return [];
  }
}
