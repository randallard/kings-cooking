/**
 * @fileoverview Move confirmation button with loading and error states
 * @module components/game/MoveConfirmButton
 */

import { type ReactElement } from 'react';
import styles from './MoveConfirmButton.module.css';

interface MoveConfirmButtonProps {
  /** Callback when user confirms move */
  onConfirm: () => void;
  /** Callback when user cancels move (overlay mode only) */
  onCancel?: () => void;
  /** Render as compact overlay (two buttons side-by-side) */
  isOverlay?: boolean;
  /** Is button disabled (no move selected) */
  disabled?: boolean;
  /** Is move currently being processed */
  isProcessing?: boolean;
  /** Error message to display (if any) */
  error?: string | null;
}

/**
 * Confirm move button with loading and error states.
 *
 * States:
 * - Disabled: No move selected (grey, opacity 0.5)
 * - Ready: Move selected (green, #28a745)
 * - Processing: Move being validated (spinner, "Confirming...")
 * - Error: Invalid move (red, #dc3545, shake animation)
 *
 * @component
 * @example
 * ```tsx
 * <MoveConfirmButton
 *   onConfirm={handleConfirm}
 *   disabled={!selectedMove}
 *   isProcessing={isValidating}
 *   error={validationError}
 * />
 * ```
 */
export const MoveConfirmButton = ({
  onConfirm,
  onCancel,
  isOverlay = false,
  disabled = false,
  isProcessing = false,
  error = null,
}: MoveConfirmButtonProps): ReactElement => {
  // Overlay mode: render Cancel + Confirm buttons side-by-side
  if (isOverlay && onCancel) {
    return (
      <div className={styles.overlay}>
        <button
          type="button"
          onClick={onCancel}
          className={styles.cancelButton}
          aria-label="Cancel move and return piece to original position"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={disabled}
          className={styles.confirmButton}
          aria-label="Confirm move"
        >
          Confirm
        </button>
      </div>
    );
  }

  // Traditional mode: single Confirm button (existing implementation)
  // Determine button classes
  const buttonClasses = [
    styles.confirmButton,
    error && styles.error,
    isProcessing && styles.processing,
  ]
    .filter(Boolean)
    .join(' ');

  // Button text based on state
  const buttonText = isProcessing
    ? 'Confirming...'
    : error
      ? 'Try Again'
      : 'Confirm Move';

  return (
    <div className={styles.container}>
      <button
        type="button"
        className={buttonClasses}
        onClick={onConfirm}
        disabled={disabled || isProcessing}
        aria-label={
          disabled
            ? 'Select a move to confirm'
            : isProcessing
              ? 'Move is being confirmed'
              : 'Confirm selected move'
        }
        aria-busy={isProcessing}
      >
        {isProcessing && (
          <span className={styles.spinner} aria-hidden="true">
            ⏳
          </span>
        )}
        <span>{buttonText}</span>
      </button>

      {error && (
        <div
          className={styles.errorMessage}
          role="alert"
          aria-live="assertive"
        >
          {error}
        </div>
      )}
    </div>
  );
};
