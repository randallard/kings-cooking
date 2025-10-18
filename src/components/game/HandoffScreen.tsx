/**
 * @fileoverview Handoff screen for hot-seat mode with privacy and countdown
 * @module components/game/HandoffScreen
 */

import { useState, useEffect, useRef, type ReactElement } from 'react';
import styles from './HandoffScreen.module.css';

interface HandoffScreenProps {
  /** Which player's turn is next */
  nextPlayer: 'light' | 'dark';
  /** Player name for next player */
  nextPlayerName: string;
  /** Previous player who just moved */
  previousPlayer: 'light' | 'dark';
  /** Previous player's name */
  previousPlayerName: string;
  /** Callback when countdown finishes or user skips */
  onContinue: () => void;
  /** Optional countdown duration in seconds (default: 3) */
  countdownSeconds?: number;
}

/**
 * Handoff screen for hot-seat mode.
 *
 * Features:
 * - Privacy blur screen between turns
 * - Countdown timer (3 seconds default)
 * - Skip button to bypass countdown
 * - Focus trap for accessibility
 * - Escape key to skip
 * - Friendly handoff message
 *
 * Accessibility:
 * - Focus trapped within modal
 * - Esc key closes/skips
 * - ARIA labels for screen readers
 * - High contrast for visibility
 *
 * @component
 * @example
 * ```tsx
 * <HandoffScreen
 *   nextPlayer="dark"
 *   nextPlayerName="Alice"
 *   previousPlayer="light"
 *   previousPlayerName="Bob"
 *   onContinue={() => setShowHandoff(false)}
 * />
 * ```
 */
export const HandoffScreen = ({
  nextPlayer,
  nextPlayerName,
  previousPlayer,
  previousPlayerName,
  onContinue,
  countdownSeconds = 3,
}: HandoffScreenProps): ReactElement => {
  const [countdown, setCountdown] = useState(countdownSeconds);
  const containerRef = useRef<HTMLDivElement>(null);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) {
      onContinue();
      return;
    }

    const timer = setTimeout(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, onContinue]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        onContinue();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onContinue]);

  // Manual focus management for accessibility
  useEffect(() => {
    const button = document.getElementById('skip-button');
    if (button) {
      button.focus();
    }

    // Trap focus within modal
    const handleTabKey = (e: KeyboardEvent): void => {
      if (e.key === 'Tab') {
        e.preventDefault();
        button?.focus();
      }
    };

    document.addEventListener('keydown', handleTabKey);
    return () => document.removeEventListener('keydown', handleTabKey);
  }, []);

  const nextPlayerColor = nextPlayer === 'light' ? 'Light' : 'Dark';
  const previousPlayerColor = previousPlayer === 'light' ? 'Light' : 'Dark';

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="handoff-title"
      aria-describedby="handoff-description"
    >
      <div ref={containerRef} className={styles.container}>
        {/* Title */}
        <h2 id="handoff-title" className={styles.title}>
          {nextPlayerColor}'s Turn
        </h2>

        {/* Description */}
        <p id="handoff-description" className={styles.description}>
          {previousPlayerColor} ({previousPlayerName}) made their move.
          <br />
          Pass the device to {nextPlayerName}.
        </p>

        {/* Countdown */}
        <div className={styles.countdown} aria-live="polite" aria-atomic="true">
          {countdown > 0 ? (
            <>
              <span className={styles.countdownNumber}>{countdown}</span>
              <span className={styles.countdownLabel}>
                {countdown === 1 ? 'second' : 'seconds'}
              </span>
            </>
          ) : (
            <span className={styles.countdownLabel}>Starting...</span>
          )}
        </div>

        {/* Skip button */}
        <button
          id="skip-button"
          type="button"
          onClick={onContinue}
          className={styles.skipButton}
          aria-label="Skip countdown and continue to game"
        >
          Skip Countdown
        </button>

        {/* Keyboard hint */}
        <p className={styles.hint}>
          Press <kbd>Esc</kbd> to skip
        </p>
      </div>

      {/* Privacy blur overlay */}
      <div className={styles.blurOverlay} aria-hidden="true" />
    </div>
  );
};
