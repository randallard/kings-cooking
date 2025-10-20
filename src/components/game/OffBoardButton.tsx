/**
 * @fileoverview Off-board move button ("Party!") for scoring pieces
 * @module components/game/OffBoardButton
 */

import { type ReactElement } from 'react';
import type { PieceType } from '@/lib/validation/schemas';
import styles from './OffBoardButton.module.css';

interface OffBoardButtonProps {
  /** Callback when button clicked */
  onOffBoardMove: () => void;
  /** Is button disabled (no piece selected or cannot move off-board) */
  disabled: boolean;
  /** Type of piece that would move off-board */
  pieceType: PieceType | null;
  /** Owner of the court (light/dark) */
  courtOwner: 'light' | 'dark';
}

/**
 * Off-board move button with enabled/disabled states.
 *
 * Shows "Party! 🎉" button that allows pieces to move off-board to score.
 * Button appears in opponent's king's court when piece can legally move off-board.
 *
 * States:
 * - Disabled: No piece selected or piece cannot move off-board (grey, opacity 0.5)
 * - Enabled: Piece can legally move off-board (green, hover effects)
 *
 * @component
 * @example
 * ```tsx
 * <OffBoardButton
 *   onOffBoardMove={handleOffBoard}
 *   disabled={!canMoveOffBoard}
 *   pieceType="rook"
 *   courtOwner="dark"
 * />
 * ```
 */
export const OffBoardButton = ({
  onOffBoardMove,
  disabled,
  pieceType,
  courtOwner,
}: OffBoardButtonProps): ReactElement => {
  // Determine button classes
  const buttonClasses = [
    styles.offBoardButton,
    disabled ? styles.disabled : styles.enabled,
  ]
    .filter(Boolean)
    .join(' ');

  // ARIA label for screen readers
  const ariaLabel = disabled
    ? 'No piece can move to opponent\'s court'
    : `Move ${pieceType} to ${courtOwner === 'light' ? 'Light' : 'Dark'} King's Court to score`;

  return (
    <button
      type="button"
      className={buttonClasses}
      onClick={onOffBoardMove}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-disabled={disabled}
    >
      <span aria-hidden="true">🎉</span>
      <span>Party!</span>
    </button>
  );
};
