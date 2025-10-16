/**
 * @fileoverview Move confirmation button with loading and error states
 * @module components/game/MoveConfirmButton
 */

import { type ReactElement } from 'react';
import styles from './MoveConfirmButton.module.css';

interface MoveConfirmButtonProps {
  /** Callback when user confirms move */
  onConfirm: () => void;
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
  disabled = false,
  isProcessing = false,
  error = null,
}: MoveConfirmButtonProps): ReactElement => {
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
