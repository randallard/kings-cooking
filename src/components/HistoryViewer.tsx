/**
 * @fileoverview History Viewer component with collapsible panel and full history modal
 * @module components/HistoryViewer
 *
 * Displays the last 10 moves of the game with sync status indicators.
 * Includes collapsible panel with ARIA support and a "Show Full History" button
 * that opens a modal for complete game history.
 */

import { useState, useRef, useEffect, type ReactElement } from 'react';
import FocusTrap from 'focus-trap-react';
import type { Move } from '@/lib/validation/schemas';

/**
 * Props for HistoryViewer component
 */
interface HistoryViewerProps {
  /** Complete move history */
  history: Move[];
  /** Index of current move for highlighting */
  currentMoveIndex?: number;
  /** Callback when Export JSON is clicked */
  onExportJSON?: () => void;
  /** Initially expanded state @default true */
  defaultExpanded?: boolean;
}

/**
 * History Viewer with collapsible panel and auto-scroll.
 *
 * Shows the last 10 moves by default with sync status indicators.
 * Provides "Show Full History" button for games with 10+ moves.
 * Automatically scrolls to current move when it changes.
 *
 * @component
 * @example
 * ```tsx
 * <HistoryViewer
 *   history={gameState.moveHistory}
 *   currentMoveIndex={gameState.currentTurn}
 *   onExportJSON={() => exportGameAsJSON(gameState, history)}
 * />
 * ```
 */
export const HistoryViewer = ({
  history,
  currentMoveIndex = 0,
  onExportJSON,
  defaultExpanded = true,
}: HistoryViewerProps): ReactElement => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [showFullHistoryModal, setShowFullHistoryModal] = useState(false);
  const currentMoveRef = useRef<HTMLDivElement>(null);

  /**
   * Auto-scroll to current move when index changes
   */
  useEffect(() => {
    if (currentMoveRef.current && isExpanded) {
      currentMoveRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest', // Don't scroll entire page
        inline: 'nearest',
      });
    }
  }, [currentMoveIndex, isExpanded]);

  /**
   * Handle keyboard events for collapsible panel
   */
  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault(); // Prevent page scroll on Space
      setIsExpanded(!isExpanded);
    }
  };

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
   * Format move notation
   */
  const formatMoveNotation = (move: Move): string => {
    return `${formatPosition(move.from)} → ${formatPosition(move.to)}`;
  };

  // Get last 10 moves for default display
  const recentMoves = history.slice(-10);
  const hasMoreMoves = history.length > 10;

  return (
    <div className="history-viewer">
      {/* Collapsible Header */}
      <button
        type="button"
        className="panel-header"
        aria-expanded={isExpanded}
        aria-controls="history-content"
        onClick={() => setIsExpanded(!isExpanded)}
        onKeyDown={handleKeyDown}
      >
        <h2 id="history-title" className="panel-title">
          Move History ({history.length})
        </h2>
        <span aria-hidden="true" className="expand-icon">
          {isExpanded ? '▼' : '▶'}
        </span>
      </button>

      {/* Panel Content */}
      <div
        id="history-content"
        hidden={!isExpanded}
        aria-labelledby="history-title"
        className={`panel-content ${isExpanded ? 'expanded' : 'collapsed'}`}
      >
        {history.length === 0 ? (
          <p className="empty-message">No moves yet. Start playing!</p>
        ) : (
          <>
            {/* Move List */}
            <div className="move-list" role="log" aria-live="polite">
              {recentMoves.map((move, index) => {
                const actualIndex = history.length - recentMoves.length + index;
                const isCurrentMove = actualIndex === currentMoveIndex;

                return (
                  <div
                    key={move.timestamp}
                    ref={isCurrentMove ? currentMoveRef : null}
                    className={`move-entry ${isCurrentMove ? 'current' : ''}`}
                    role="listitem"
                    aria-current={isCurrentMove ? 'step' : undefined}
                  >
                    <span className="move-number">{actualIndex + 1}.</span>
                    <span className="move-notation">
                      {formatMoveNotation(move)}
                    </span>
                    <span className="move-player">
                      ({move.piece.owner})
                    </span>
                    {move.captured && (
                      <span
                        className="capture-indicator"
                        aria-label="Captured piece"
                        title={`Captured ${move.captured.owner} ${move.captured.type}`}
                      >
                        ×
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Action Buttons */}
            <div className="history-actions">
              {hasMoreMoves && (
                <button
                  type="button"
                  onClick={() => setShowFullHistoryModal(true)}
                  className="btn-secondary"
                  aria-label="Show complete game history"
                >
                  Show Full History
                </button>
              )}

              {onExportJSON && (
                <button
                  type="button"
                  onClick={onExportJSON}
                  className="btn-secondary"
                  aria-label="Export game as JSON"
                >
                  Export JSON
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Full History Modal */}
      {showFullHistoryModal && (
        <FullHistoryModal
          isOpen={showFullHistoryModal}
          onClose={() => setShowFullHistoryModal(false)}
          history={history}
          currentMoveIndex={currentMoveIndex}
          formatMoveNotation={formatMoveNotation}
        />
      )}
    </div>
  );
};

/**
 * Props for FullHistoryModal component
 */
interface FullHistoryModalProps {
  /** Whether modal is open */
  isOpen: boolean;
  /** Callback to close modal */
  onClose: () => void;
  /** Complete game history */
  history: Move[];
  /** Currently selected move index */
  currentMoveIndex: number;
  /** Function to format move notation */
  formatMoveNotation: (move: Move) => string;
}

/**
 * Modal displaying complete game history.
 *
 * Uses focus-trap-react for accessibility. Scrolls to current move
 * when opened. Closes on ESC key or backdrop click.
 *
 * @component
 */
const FullHistoryModal = ({
  isOpen,
  onClose,
  history,
  currentMoveIndex,
  formatMoveNotation,
}: FullHistoryModalProps): ReactElement | null => {
  const currentMoveRef = useRef<HTMLDivElement>(null);

  /**
   * Scroll to current move when modal opens
   */
  useEffect(() => {
    if (isOpen && currentMoveRef.current) {
      // Delay to ensure modal is rendered
      setTimeout(() => {
        currentMoveRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }, 100);
    }
  }, [isOpen]);

  /**
   * Close modal on ESC key
   */
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }

    return undefined;
  }, [isOpen, onClose]);

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
          className="modal-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-header">
            <h2 id="modal-title">Full Game History</h2>
            <button
              id="modal-close"
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="close-button"
            >
              ✕
            </button>
          </div>

          <div className="modal-body">
            <p className="history-count">
              Total moves: {history.length}
            </p>
            <div className="scrollable-history">
              {history.map((move, index) => {
                const isCurrentMove = index === currentMoveIndex;

                return (
                  <div
                    key={move.timestamp}
                    ref={isCurrentMove ? currentMoveRef : null}
                    className={`move-entry ${isCurrentMove ? 'current' : ''}`}
                    role="listitem"
                    aria-current={isCurrentMove ? 'step' : undefined}
                  >
                    <span className="move-number">{index + 1}.</span>
                    <span className="move-notation">
                      {formatMoveNotation(move)}
                    </span>
                    <span className="move-player">
                      ({move.piece.owner})
                    </span>
                    {move.captured && (
                      <span
                        className="capture-indicator"
                        aria-label="Captured piece"
                        title={`Captured ${move.captured.owner} ${move.captured.type}`}
                      >
                        ×
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn-primary">
              Close
            </button>
          </div>
        </div>
      </div>
    </FocusTrap>
  );
};
