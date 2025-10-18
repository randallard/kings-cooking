/**
 * @fileoverview Victory screen for game end celebration
 * @module components/game/VictoryScreen
 */

import { useState, type ReactElement } from 'react';
import type { Piece } from '@/lib/validation/schemas';
import { URLSharer } from './URLSharer';
import styles from './VictoryScreen.module.css';

interface VictoryScreenProps {
  /** Winner of the game */
  winner: 'light' | 'dark' | 'draw';
  /** Winner's player name */
  winnerName?: string;
  /** Loser's player name */
  loserName?: string;
  /** Total number of moves in the game */
  totalMoves: number;
  /** Game duration in seconds */
  gameDuration: number;
  /** Light pieces in Dark's court (scored by light) */
  lightCourt: Piece[];
  /** Dark pieces in Light's court (scored by dark) */
  darkCourt: Piece[];
  /** Light player's captured pieces */
  capturedLight: Piece[];
  /** Dark player's captured pieces */
  capturedDark: Piece[];
  /** Game board to check for auto-scored pieces */
  board: (Piece | null)[][];
  /** Shareable URL for game result */
  shareUrl?: string;
  /** Callback for sharing the result */
  onShare?: () => void;
  /** Callback for reviewing moves */
  onReviewMoves?: () => void;
}

/**
 * Victory screen component for game end celebration.
 *
 * Features:
 * - Winner announcement with celebration message
 * - Game statistics (moves, duration, captures)
 * - CSS confetti animation
 * - Action buttons (New Game, Share Result, Review Moves)
 * - Accessibility support
 * - Dark mode support
 *
 * Accessibility:
 * - ARIA role="dialog" for modal overlay
 * - Semantic heading structure
 * - Clear focus indicators
 * - Keyboard navigation
 *
 * @component
 * @example
 * ```tsx
 * <VictoryScreen
 *   winner="light"
 *   winnerName="Alice"
 *   loserName="Bob"
 *   totalMoves={42}
 *   gameDuration={1234}
 *   whiteCaptured={5}
 *   blackCaptured={3}
 *   onNewGame={() => startNewGame()}
 *   onShare={() => shareResult()}
 *   onReviewMoves={() => showMoveHistory()}
 * />
 * ```
 */
export const VictoryScreen = ({
  winner,
  winnerName,
  loserName,
  totalMoves,
  gameDuration,
  lightCourt,
  darkCourt,
  capturedLight,
  capturedDark,
  board,
  shareUrl,
  onShare,
  onReviewMoves,
}: VictoryScreenProps): ReactElement => {
  // URL sharing state
  const [showUrlSharer, setShowUrlSharer] = useState(false);

  // Extract auto-scored pieces (pieces still on board when game ended)
  const getAutoScoredPieces = (owner: 'light' | 'dark'): Piece[] => {
    const pieces: Piece[] = [];
    for (let row = 0; row < board.length; row++) {
      const boardRow = board[row];
      if (!boardRow) continue;
      for (let col = 0; col < boardRow.length; col++) {
        const piece = boardRow[col];
        if (piece && piece.owner === owner) {
          pieces.push(piece);
        }
      }
    }
    return pieces;
  };

  const whiteAutoScored = getAutoScoredPieces('light');
  const blackAutoScored = getAutoScoredPieces('dark');

  // Format duration from seconds to MM:SS
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get celebration message based on winner
  const getCelebrationMessage = (): string => {
    if (winner === 'draw') {
      return "It's a Draw!";
    }
    const winnerColor = winner === 'light' ? 'Light' : 'Dark';
    return `${winnerColor} Wins!`;
  };

  // Get subtitle message
  const getSubtitle = (): string => {
    if (winner === 'draw') {
      return 'Both players played exceptionally well!';
    }
    if (winnerName && loserName) {
      return `${winnerName} defeated ${loserName}`;
    }
    const winnerColor = winner === 'light' ? 'Light' : 'Dark';
    return `${winnerColor} is victorious!`;
  };

  // Get piece symbol for display
  const getPieceSymbol = (piece: Piece): string => {
    const symbols: Record<string, string> = {
      king: '♔',
      queen: '♕',
      rook: '♖',
      bishop: '♗',
      knight: '♘',
      pawn: '♙',
    };
    return symbols[piece.type] || '?';
  };

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="victory-title"
      aria-describedby="victory-subtitle"
    >
      {/* Confetti animation */}
      {winner !== 'draw' && (
        <div className={styles.confetti} aria-hidden="true">
          {Array.from({ length: 50 }).map((_, i) => (
            <div key={i} className={styles.confettiPiece} />
          ))}
        </div>
      )}

      <div className={styles.container}>
        {/* Title */}
        <h1 id="victory-title" className={styles.title}>
          {getCelebrationMessage()}
        </h1>

        {/* Subtitle */}
        <p id="victory-subtitle" className={styles.subtitle}>
          {getSubtitle()}
        </p>

        {/* Game Statistics */}
        <div className={styles.stats}>
          <h2 className={styles.statsTitle}>Game Statistics</h2>
          <div className={styles.statsGrid}>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Total Moves</span>
              <span className={styles.statValue}>{totalMoves}</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Duration</span>
              <span className={styles.statValue}>{formatDuration(gameDuration)}</span>
            </div>
          </div>

          {/* Light Player Stats */}
          <div className={styles.playerStats}>
            <h3 className={styles.playerStatsTitle}>Light Player (Player 1)</h3>
            <div className={styles.courtSection}>
              <div className={styles.courtLabel}>
                <strong>Scored in Dark's Court:</strong> {lightCourt.length} piece{lightCourt.length !== 1 ? 's' : ''}
              </div>
              {lightCourt.length > 0 && (
                <div className={styles.piecesList}>
                  {lightCourt.map((piece, idx) => (
                    <span key={`light-court-${idx}`} className={styles.piece} title={piece.type}>
                      {getPieceSymbol(piece)}
                    </span>
                  ))}
                </div>
              )}
            </div>
            {whiteAutoScored.length > 0 && (
              <div className={styles.autoScoredSection}>
                <div className={styles.autoScoredLabel}>
                  <strong>Auto-scored (on board at game end):</strong> {whiteAutoScored.length} piece{whiteAutoScored.length !== 1 ? 's' : ''}
                </div>
                <div className={styles.piecesList}>
                  {whiteAutoScored.map((piece, idx) => (
                    <span key={`light-auto-${idx}`} className={styles.piece} title={piece.type}>
                      {getPieceSymbol(piece)}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className={styles.capturedSection}>
              <div className={styles.capturedLabel}>
                <strong>Captured:</strong> {capturedLight.length} piece{capturedLight.length !== 1 ? 's' : ''}
              </div>
              {capturedLight.length > 0 && (
                <div className={styles.piecesList}>
                  {capturedLight.map((piece, idx) => (
                    <span key={`light-captured-${idx}`} className={styles.piece} title={piece.type}>
                      {getPieceSymbol(piece)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Dark Player Stats */}
          <div className={styles.playerStats}>
            <h3 className={styles.playerStatsTitle}>Dark Player (Player 2)</h3>
            <div className={styles.courtSection}>
              <div className={styles.courtLabel}>
                <strong>Scored in Light's Court:</strong> {darkCourt.length} piece{darkCourt.length !== 1 ? 's' : ''}
              </div>
              {darkCourt.length > 0 && (
                <div className={styles.piecesList}>
                  {darkCourt.map((piece, idx) => (
                    <span key={`dark-court-${idx}`} className={styles.piece} title={piece.type}>
                      {getPieceSymbol(piece)}
                    </span>
                  ))}
                </div>
              )}
            </div>
            {blackAutoScored.length > 0 && (
              <div className={styles.autoScoredSection}>
                <div className={styles.autoScoredLabel}>
                  <strong>Auto-scored (on board at game end):</strong> {blackAutoScored.length} piece{blackAutoScored.length !== 1 ? 's' : ''}
                </div>
                <div className={styles.piecesList}>
                  {blackAutoScored.map((piece, idx) => (
                    <span key={`dark-auto-${idx}`} className={styles.piece} title={piece.type}>
                      {getPieceSymbol(piece)}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className={styles.capturedSection}>
              <div className={styles.capturedLabel}>
                <strong>Captured:</strong> {capturedDark.length} piece{capturedDark.length !== 1 ? 's' : ''}
              </div>
              {capturedDark.length > 0 && (
                <div className={styles.piecesList}>
                  {capturedDark.map((piece, idx) => (
                    <span key={`dark-captured-${idx}`} className={styles.piece} title={piece.type}>
                      {getPieceSymbol(piece)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className={styles.actions}>
          {onShare && shareUrl && (
            <button
              type="button"
              onClick={() => {
                onShare();  // Call parent callback if provided
                setShowUrlSharer(true);  // Show URLSharer
              }}
              className={`${styles.button} ${styles.primaryButton}`}
              aria-label="Share game result"
            >
              Share Result
            </button>
          )}

          {onReviewMoves && (
            <button
              type="button"
              onClick={onReviewMoves}
              className={`${styles.button} ${styles.secondaryButton}`}
              aria-label="Review game moves"
            >
              Review Moves
            </button>
          )}
        </div>

        {/* URL Sharing */}
        {showUrlSharer && shareUrl && (
          <div style={{ marginTop: 'var(--spacing-lg)' }}>
            <URLSharer
              url={shareUrl}
              onCopy={() => {
                console.log('Victory URL copied successfully');
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};
