/**
 * @fileoverview Victory screen for game end celebration
 * @module components/game/VictoryScreen
 */

import { type ReactElement } from 'react';
import styles from './VictoryScreen.module.css';

interface VictoryScreenProps {
  /** Winner of the game */
  winner: 'white' | 'black' | 'draw';
  /** Winner's player name */
  winnerName?: string;
  /** Loser's player name */
  loserName?: string;
  /** Total number of moves in the game */
  totalMoves: number;
  /** Game duration in seconds */
  gameDuration: number;
  /** White player's captured pieces count */
  whiteCaptured: number;
  /** Black player's captured pieces count */
  blackCaptured: number;
  /** Callback for starting a new game */
  onNewGame: () => void;
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
 *   winner="white"
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
  whiteCaptured,
  blackCaptured,
  onNewGame,
  onShare,
  onReviewMoves,
}: VictoryScreenProps): ReactElement => {
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
    const winnerColor = winner === 'white' ? 'White' : 'Black';
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
    const winnerColor = winner === 'white' ? 'White' : 'Black';
    return `${winnerColor} is victorious!`;
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
            <div className={styles.statItem}>
              <span className={styles.statLabel}>White Captured</span>
              <span className={styles.statValue}>{whiteCaptured}</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Black Captured</span>
              <span className={styles.statValue}>{blackCaptured}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className={styles.actions}>
          <button
            type="button"
            onClick={onNewGame}
            className={`${styles.button} ${styles.primaryButton}`}
            aria-label="Start a new game"
          >
            New Game
          </button>

          {onShare && (
            <button
              type="button"
              onClick={onShare}
              className={`${styles.button} ${styles.secondaryButton}`}
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
      </div>
    </div>
  );
};
