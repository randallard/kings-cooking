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
  /** Is there a pending off-board move awaiting confirmation? */
  isPendingOffBoard?: boolean;
  /** Callback to confirm pending off-board move */
  onConfirmMove?: () => void;
  /** Callback to cancel pending off-board move */
  onCancelMove?: () => void;
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
  isPendingOffBoard = false,
  onConfirmMove,
  onCancelMove,
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

  // If pending off-board move, show Cancel + Party + Confirm buttons
  if (isPendingOffBoard && onConfirmMove && onCancelMove) {
    return (
      <div className={styles.pendingButtonGroup}>
        <button
          type="button"
          className={styles.cancelButton}
          onClick={onCancelMove}
          aria-label="Cancel off-board move"
        >
          Cancel
        </button>
        <button
          type="button"
          className={styles.partyButtonPending}
          disabled
          aria-label="Pending party move"
        >
          <span aria-hidden="true">🎉</span>
          <span>Party!</span>
        </button>
        <button
          type="button"
          className={styles.confirmButton}
          onClick={onConfirmMove}
          aria-label="Confirm off-board move to score"
        >
          Confirm
        </button>
      </div>
    );
  }

  // Default: just show Party button
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
