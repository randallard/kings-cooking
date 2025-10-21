/**
 * @fileoverview Playback controls for history navigation
 * @module components/game/PlaybackControls
 */

import { type ReactElement } from 'react';
import styles from './PlaybackControls.module.css';

interface PlaybackControlsProps {
  /** Callback to step back one move */
  onStepBack: () => void;
  /** Callback to step forward one move */
  onStepForward: () => void;
  /** Callback to return to current/latest move */
  onReturnToCurrent: () => void;
  /** Can step back? (disabled at move 0) */
  canStepBack: boolean;
  /** Can step forward? (disabled at latest) */
  canStepForward: boolean;
  /** Is at latest move? (hide return button) */
  isAtLatest: boolean;
  /** Current move index being viewed */
  currentMoveIndex: number;
  /** Total number of moves in history */
  totalMoves: number;
}

/**
 * Playback controls for reviewing game history.
 *
 * Layout: [← Back] [Forward →] [Return ↻]
 * (Confirm button is separate, rendered in parent)
 *
 * @component
 * @example
 * ```tsx
 * <PlaybackControls
 *   onStepBack={handleStepBack}
 *   onStepForward={handleStepForward}
 *   onReturnToCurrent={handleReturn}
 *   canStepBack={historyIndex > 0}
 *   canStepForward={historyIndex < totalMoves}
 *   isAtLatest={historyIndex === null}
 *   currentMoveIndex={historyIndex ?? totalMoves}
 *   totalMoves={gameState.moveHistory.length}
 * />
 * ```
 */
export const PlaybackControls = ({
  onStepBack,
  onStepForward,
  onReturnToCurrent,
  canStepBack,
  canStepForward,
  isAtLatest,
  currentMoveIndex,
  totalMoves,
}: PlaybackControlsProps): ReactElement => {
  return (
    <div className={styles.container}>
      {/* History indicator */}
      {!isAtLatest && (
        <div className={styles.indicator} aria-live="polite">
          Viewing move {currentMoveIndex} of {totalMoves}
        </div>
      )}

      {/* Playback controls */}
      <div className={styles.controls}>
        <span className={styles.label}>View history:</span>

        {/* Back button */}
        <button
          onClick={onStepBack}
          disabled={!canStepBack}
          className={styles.button}
          aria-label="Step back to previous move"
        >
          ← Back
        </button>

        {/* Forward button */}
        <button
          onClick={onStepForward}
          disabled={!canStepForward}
          className={styles.button}
          aria-label="Step forward to next move"
        >
          Forward →
        </button>

        {/* Reset button - always visible, disabled when at latest */}
        <button
          onClick={onReturnToCurrent}
          disabled={isAtLatest}
          className={styles.button}
          aria-label="Return to current move"
          title="Return to current move"
        >
          Reset
        </button>
      </div>
    </div>
  );
};
