/**
 * @fileoverview History Comparison Modal for resolving divergence
 * @module components/HistoryComparisonModal
 *
 * Displays side-by-side history comparison when game states diverge.
 * Provides four actions to resolve: Send My State, Accept Their State, Review, Cancel.
 */

import { useState, useMemo, useRef, useEffect, type ReactElement } from 'react';
import FocusTrap from 'focus-trap-react';
import type { GameState, Move } from '@/lib/validation/schemas';
import { buildFullStateUrl } from '@/lib/urlEncoding/urlBuilder';

/**
 * Props for HistoryComparisonModal component
 */
interface HistoryComparisonModalProps {
  /** Whether modal is open */
  isOpen: boolean;
  /** Callback to close modal */
  onClose: () => void;
  /** Your game state */
  myState: GameState;
  /** Opponent's move history (from resync_request) */
  theirHistory: Move[];
  /** Callback to replace state with opponent's */
  onAcceptTheirState?: (state: GameState) => Promise<void>;
}

/**
 * History Comparison Modal with divergence resolution.
 *
 * Shows side-by-side history comparison and provides four actions:
 * 1. Send My State - Copy full_state URL to clipboard
 * 2. Accept Their State - Replace local state with opponent's
 * 3. Review Details - Show detailed comparison (future)
 * 4. Cancel - Close modal without action
 *
 * @component
 * @example
 * ```tsx
 * <HistoryComparisonModal
 *   isOpen={showModal}
 *   onClose={() => setShowModal(false)}
 *   myState={gameState}
 *   theirHistory={opponentHistory}
 *   onAcceptTheirState={async (state) => replaceGameState(state)}
 * />
 * ```
 */
export const HistoryComparisonModal = ({
  isOpen,
  onClose,
  myState,
  theirHistory,
  onAcceptTheirState,
}: HistoryComparisonModalProps): ReactElement | null => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionStatus, setActionStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const myHistory = myState.moveHistory;

  /**
   * Find index where histories diverge based on checksums
   */
  const divergenceIndex = useMemo(() => {
    const minLength = Math.min(myHistory.length, theirHistory.length);

    for (let i = 0; i < minLength; i++) {
      // Compare move positions as checksum equivalent
      const myMove = myHistory[i];
      const theirMove = theirHistory[i];

      if (
        myMove &&
        theirMove &&
        (myMove.from[0] !== theirMove.from[0] ||
          myMove.from[1] !== theirMove.from[1] ||
          (myMove.to !== 'off_board' &&
            theirMove.to !== 'off_board' &&
            (myMove.to[0] !== theirMove.to[0] || myMove.to[1] !== theirMove.to[1])))
      ) {
        return i;
      }
    }

    // If all moves match but lengths differ
    return minLength;
  }, [myHistory, theirHistory]);

  /**
   * Handle "Send My State" action
   * Generates full_state URL and copies to clipboard
   */
  const handleSendMyState = async (): Promise<void> => {
    setIsProcessing(true);
    setActionStatus(null);

    try {
      // Generate full_state URL
      const urlHash = buildFullStateUrl(myState, myState.lightPlayer.name);
      const fullUrl = `${window.location.origin}${window.location.pathname}#${urlHash}`;

      // Copy to clipboard
      await navigator.clipboard.writeText(fullUrl);

      setActionStatus({
        type: 'success',
        message: 'Full state URL copied! Send to your opponent.',
      });

      // Auto-close after success
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Failed to send state:', error);
      setActionStatus({
        type: 'error',
        message: 'Failed to copy URL. Please try again.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Handle "Accept Their State" action
   * Replaces local state with opponent's state
   */
  const handleAcceptTheirState = (): void => {
    if (!onAcceptTheirState) {
      setActionStatus({
        type: 'error',
        message: 'Accept state handler not provided.',
      });
      return;
    }

    setIsProcessing(true);
    setActionStatus(null);

    try {
      // Request opponent to send full_state
      // For now, show message that they need to send their state
      setActionStatus({
        type: 'success',
        message: 'Ask your opponent to send their full state URL.',
      });

      // Close modal after short delay
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Failed to accept state:', error);
      setActionStatus({
        type: 'error',
        message: 'Failed to accept state. Please try again.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Handle "Review" action
   * Shows detailed comparison (placeholder for Phase 6)
   */
  const handleReview = (): void => {
    setActionStatus({
      type: 'success',
      message: 'Detailed review will be available in Phase 6 (Board Visualization).',
    });
  };

  /**
   * Prevent body scroll when modal is open
   */
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }

    return undefined;
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <FocusTrap
      focusTrapOptions={{
        initialFocus: '#modal-close',
        fallbackFocus: '#modal-dialog',
        clickOutsideDeactivates: true,
        escapeDeactivates: true,
        allowOutsideClick: true,
        onDeactivate: onClose,
      }}
    >
      <div className="modal-backdrop" onClick={onClose}>
        <div
          id="modal-dialog"
          className="modal-dialog comparison-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-header">
            <h2 id="modal-title">Timeline Divergence Detected</h2>
            <button
              id="modal-close"
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="close-button"
              disabled={isProcessing}
            >
              ✕
            </button>
          </div>

          <div className="modal-body">
            <p className="divergence-message">
              Your game state and your opponent's state have diverged. Choose how to resolve this:
            </p>

            <HistoryComparison
              myHistory={myHistory}
              theirHistory={theirHistory}
              divergenceIndex={divergenceIndex}
            />

            {actionStatus && (
              <div
                className={`action-status status-${actionStatus.type}`}
                role="alert"
                aria-live="polite"
              >
                {actionStatus.message}
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button
              type="button"
              onClick={() => void handleSendMyState()}
              disabled={isProcessing}
              className="btn-primary"
              aria-label="Send your state to opponent"
            >
              {isProcessing ? (
                <>
                  <span className="spinner" aria-hidden="true" />
                  Sending...
                </>
              ) : (
                'Send My State'
              )}
            </button>

            <button
              type="button"
              onClick={handleAcceptTheirState}
              disabled={isProcessing || !onAcceptTheirState}
              className="btn-primary"
              aria-label="Accept opponent's state"
            >
              Accept Their State
            </button>

            <button
              type="button"
              onClick={handleReview}
              disabled={isProcessing}
              className="btn-secondary"
              aria-label="Review detailed comparison"
            >
              Review Details
            </button>

            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="btn-secondary"
              aria-label="Cancel and close modal"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </FocusTrap>
  );
};

/**
 * Props for HistoryComparison component
 */
interface HistoryComparisonProps {
  /** Your move history */
  myHistory: Move[];
  /** Opponent's move history */
  theirHistory: Move[];
  /** Index where divergence occurs */
  divergenceIndex: number;
}

/**
 * Side-by-side history comparison component.
 *
 * Displays two move histories with divergence point highlighted.
 * Auto-scrolls to divergence point when rendered.
 *
 * @component
 */
const HistoryComparison = ({
  myHistory,
  theirHistory,
  divergenceIndex,
}: HistoryComparisonProps): ReactElement => {
  const divergenceRef = useRef<HTMLDivElement>(null);

  /**
   * Scroll to divergence point when component mounts
   */
  useEffect(() => {
    if (divergenceRef.current) {
      setTimeout(() => {
        divergenceRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }, 100);
    }
  }, []);

  /**
   * Format position for display
   */
  const formatPosition = (pos: [number, number] | 'off_board'): string => {
    if (pos === 'off_board') return 'Off Board';
    const [row, col] = pos;
    const colLetter = String.fromCharCode(65 + col); // A, B, C
    return `${colLetter}${row + 1}`;
  };

  /**
   * Render move entry with divergence indicator
   */
  const renderMoveEntry = (
    move: Move,
    index: number,
    isDivergent: boolean,
    side: 'left' | 'right'
  ): ReactElement => (
    <div
      ref={index === divergenceIndex && side === 'left' ? divergenceRef : null}
      className={`move-entry ${isDivergent ? 'divergent' : ''}`}
      key={move.timestamp}
      role="listitem"
    >
      <span className="move-number">{index + 1}.</span>
      <span className="move-notation">
        {formatPosition(move.from)} → {formatPosition(move.to)}
      </span>
      <span className="move-player">({move.piece.owner})</span>
    </div>
  );

  return (
    <div className="history-comparison">
      <div className="comparison-columns">
        {/* Your history */}
        <div className="comparison-column">
          <h3 className="column-header">Your History</h3>
          <div className="move-list" role="list">
            {myHistory.map((move, index) => {
              const isDivergent = index >= divergenceIndex;
              return renderMoveEntry(move, index, isDivergent, 'left');
            })}
            {myHistory.length === 0 && (
              <p className="empty-message">No moves yet</p>
            )}
          </div>
        </div>

        {/* Divergence indicator */}
        <div className="comparison-divider" aria-hidden="true">
          <div className="divergence-marker">
            <span className="icon">⚡</span>
            <span className="label">Diverged at move {divergenceIndex + 1}</span>
          </div>
        </div>

        {/* Opponent's history */}
        <div className="comparison-column">
          <h3 className="column-header">Opponent's History</h3>
          <div className="move-list" role="list">
            {theirHistory.map((move, index) => {
              const isDivergent = index >= divergenceIndex;
              return renderMoveEntry(move, index, isDivergent, 'right');
            })}
            {theirHistory.length === 0 && (
              <p className="empty-message">No moves yet</p>
            )}
          </div>
        </div>
      </div>

      <div className="comparison-summary">
        <p>
          Your history: <strong>{myHistory.length}</strong> moves
        </p>
        <p>
          Opponent's history: <strong>{theirHistory.length}</strong> moves
        </p>
        <p>
          Divergence at move: <strong>{divergenceIndex + 1}</strong>
        </p>
      </div>
    </div>
  );
};
