/**
 * @fileoverview Individual chess board cell with piece rendering
 * @module components/game/GameCell
 */

import { type ReactElement } from 'react';
import type { Piece, Position } from '@/lib/validation/schemas';
import styles from './GameCell.module.css';

interface GameCellProps {
  /** Position on board [row, col] */
  position: Position;
  /** Piece occupying this cell (null if empty) */
  piece: Piece | null;
  /** Is this cell selected? */
  isSelected: boolean;
  /** Is this a legal move destination? */
  isLegalMove: boolean;
  /** Was this cell part of the last move? */
  isLastMove: boolean;
  /** Is this the source of a pending move? */
  isPendingSource?: boolean;
  /** Is this the destination of a pending move? */
  isPendingDestination?: boolean;
  /** Ghost piece to show at source during pending move */
  ghostPiece?: Piece | null;
  /** Click handler */
  onClick: (position: Position) => void;
  /** Is it this player's turn? */
  disabled?: boolean;
}

/**
 * Renders a single chess board cell.
 *
 * States: empty, occupied, selected, legal move, last move
 * Interactions: click to select/move
 * Accessibility: role="gridcell", aria-label, keyboard navigation
 *
 * @component
 * @example
 * ```tsx
 * <GameCell
 *   position={[0, 0]}
 *   piece={whitePiece}
 *   isSelected={false}
 *   isLegalMove={false}
 *   isLastMove={false}
 *   onClick={handleClick}
 * />
 * ```
 */
export const GameCell = ({
  position,
  piece,
  isSelected,
  isLegalMove,
  isLastMove,
  isPendingSource = false,
  isPendingDestination = false,
  ghostPiece = null,
  onClick,
  disabled = false,
}: GameCellProps): ReactElement => {
  // 1. Determine cell color (light/dark square)
  if (!position) {
    return <div>Error: Invalid position</div>;
  }
  const [row, col] = position;
  const isLightSquare = (row + col) % 2 === 0;

  // 2. Build CSS classes
  const cellClasses = [
    styles.gameCell,
    isLightSquare ? styles.lightSquare : styles.darkSquare,
    isSelected && styles.selected,
    isLegalMove && styles.legalMove,
    isLastMove && styles.lastMove,
    isPendingSource && styles.pendingSource,
    isPendingDestination && styles.pendingDestination,
    disabled && styles.disabled,
  ].filter(Boolean).join(' ');

  // 3. Format position notation (A1, B2, C3)
  const notation = `${String.fromCharCode(65 + col)}${row + 1}`;

  // 4. Build ARIA label
  const ariaLabel = piece
    ? `${piece.owner} ${piece.type} at ${notation}`
    : `Empty square ${notation}`;

  // 5. Handle click
  const handleClick = (): void => {
    if (!disabled) {
      onClick(position);
    }
  };

  // 6. Get piece unicode
  const pieceChar = piece ? getPieceUnicode(piece) : '';

  return (
    <div
      role="gridcell"
      className={cellClasses}
      aria-label={ariaLabel}
      aria-pressed={isSelected}
      onClick={handleClick}
      tabIndex={isSelected ? 0 : -1}
    >
      {/* Ghost piece at source during pending move */}
      {ghostPiece && (
        <span
          className={styles.ghostPiece}
          aria-hidden="true"
        >
          {getPieceUnicode(ghostPiece)}
        </span>
      )}

      {/* Actual piece (or moved piece at destination) */}
      {pieceChar && piece && (
        <span
          key={isPendingDestination ? `animated-${piece.id || 'piece'}` : `static-${piece.id || 'piece'}`}
          className={`${styles.piece} ${isPendingDestination ? styles.animatedPiece : ''}`}
          aria-hidden="true"
        >
          {pieceChar}
        </span>
      )}

      {/* Legal move indicator */}
      {isLegalMove && <span className={styles.moveIndicator} aria-hidden="true" />}
    </div>
  );
};

/**
 * Unicode chess piece symbols.
 * Light pieces use OUTLINED symbols, dark pieces use FILLED symbols.
 */
const PIECE_UNICODE: Record<string, { light: string; dark: string }> = {
  rook: { light: '♖', dark: '♜' },
  knight: { light: '♘', dark: '♞' },
  bishop: { light: '♗', dark: '♝' },
  queen: { light: '♕', dark: '♛' },
  pawn: { light: '♙', dark: '♟' },
  king: { light: '♔', dark: '♚' },
};

/**
 * Get Unicode character for piece.
 * Returns different symbols for light (outlined) vs dark (filled) pieces.
 *
 * @param piece - Piece to get unicode for
 * @returns Unicode chess piece character
 */
function getPieceUnicode(piece: Piece): string {
  const symbols = PIECE_UNICODE[piece.type];
  if (!symbols) return '?';
  return piece.owner === 'light' ? symbols.light : symbols.dark;
}
