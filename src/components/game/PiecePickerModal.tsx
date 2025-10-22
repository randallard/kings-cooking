/**
 * @fileoverview Modal for selecting a piece to place on the board
 * @module components/game/PiecePickerModal
 */

import { type ReactElement, useEffect, useRef } from 'react';
import type { PieceType } from '@/lib/validation/schemas';
import { PIECE_POOL } from '@/lib/pieceSelection/types';
import styles from './PiecePickerModal.module.css';

interface PiecePickerModalProps {
  /** Whether modal is open */
  isOpen: boolean;
  /** Available pieces to choose from (respects PIECE_POOL limits) */
  availablePieces: PieceType[];
  /** Callback when piece is selected */
  onSelect: (piece: PieceType) => void;
  /** Callback when modal is closed */
  onClose: () => void;
  /** Position index (0-2) for display (optional for promotion mode) */
  position?: number;
  /** Mode: 'selection' for piece setup, 'promotion' for pawn promotion */
  mode?: 'selection' | 'promotion';
}

/**
 * Modal for selecting a chess piece.
 *
 * Features:
 * - Shows only available pieces (respecting PIECE_POOL limits)
 * - Unicode piece icons
 * - Keyboard navigation (Tab, Escape)
 * - Focus trapping
 * - Accessible (ARIA labels, role="dialog")
 *
 * @component
 * @example
 * ```tsx
 * <PiecePickerModal
 *   isOpen={true}
 *   availablePieces={['rook', 'knight', 'bishop']}
 *   onSelect={(piece) => console.log(piece)}
 *   onClose={() => setIsOpen(false)}
 *   position={0}
 * />
 * ```
 */
export function PiecePickerModal({
  isOpen,
  availablePieces,
  onSelect,
  onClose,
  position,
  mode = 'selection',
}: PiecePickerModalProps): ReactElement | null {
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstButtonRef = useRef<HTMLButtonElement>(null);

  // Focus first button when modal opens
  useEffect((): void => {
    if (isOpen && firstButtonRef.current) {
      firstButtonRef.current.focus();
    }
  }, [isOpen]);

  // Handle Escape key
  useEffect((): (() => void) | void => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return (): void => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Handle focus trapping
  useEffect((): (() => void) | void => {
    if (!isOpen || !dialogRef.current) return;

    const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(
      'button:not([disabled])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTabKey = (e: KeyboardEvent): void => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        // Shift+Tab: if on first element, cycle to last
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab: if on last element, cycle to first
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleTabKey);
    return (): void => document.removeEventListener('keydown', handleTabKey);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent): void => {
    // Only close if clicking the backdrop itself, not the dialog
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handlePieceClick = (piece: PieceType): void => {
    onSelect(piece);
  };

  return (
    <div className={styles.backdrop} onClick={handleBackdropClick}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="piece-picker-title"
        className={styles.modal}
      >
        <div className={styles.header}>
          <h2 id="piece-picker-title" className={styles.title}>
            {mode === 'promotion'
              ? 'Choose a piece to confirm and promote'
              : `Choose Piece for Position ${(position ?? 0) + 1}`}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className={mode === 'promotion' ? styles.cancelButton : styles.closeButton}
            aria-label={mode === 'promotion' ? 'Cancel promotion' : 'Close modal'}
          >
            {mode === 'promotion' ? 'Cancel' : '✕'}
          </button>
        </div>

        <div className={styles.pieceGrid}>
          {availablePieces.map((piece, index) => {
            const pieceData = PIECE_POOL[piece];
            return (
              <button
                key={piece}
                ref={index === 0 ? firstButtonRef : undefined}
                type="button"
                onClick={() => handlePieceClick(piece)}
                className={styles.pieceButton}
                aria-label={`Select ${piece}`}
              >
                <span className={styles.pieceIcon} aria-hidden="true">
                  {pieceData.unicode.light}
                </span>
                <span className={styles.pieceName}>{piece}</span>
              </button>
            );
          })}
        </div>

        {availablePieces.length === 0 && (
          <p className={styles.emptyMessage}>No pieces available</p>
        )}
      </div>
    </div>
  );
}
