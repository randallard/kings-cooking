/**
 * @fileoverview Mode selector for choosing between hot-seat and URL modes
 * @module components/game/ModeSelector
 */

import { ReactElement } from 'react';
import styles from './ModeSelector.module.css';

interface ModeSelectorProps {
  /** Callback when a mode is selected */
  onModeSelected: (mode: 'hotseat' | 'url') => void;
}

/**
 * Mode selector component allowing users to choose between hot-seat and URL modes.
 *
 * Features:
 * - Two clear mode options with descriptions
 * - Accessible buttons with ARIA labels
 * - 44x44px minimum tap targets for mobile
 * - Keyboard navigation support
 * - Visual feedback on hover/focus
 *
 * @component
 * @example
 * ```tsx
 * <ModeSelector
 *   onModeSelected={(mode) => console.log('Selected:', mode)}
 * />
 * ```
 */
export function ModeSelector({ onModeSelected }: ModeSelectorProps): ReactElement {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>King's Cooking Chess</h1>
      <h2 className={styles.subtitle}>Choose Your Game Mode:</h2>

      <div className={styles.buttonContainer}>
        <button
          onClick={() => onModeSelected('hotseat')}
          className={styles.modeButton}
          aria-label="Play hot-seat mode on this device"
          data-testid="mode-hotseat"
        >
          <span className={styles.modeIcon} aria-hidden="true">🏠</span>
          <h3 className={styles.modeTitle}>Hot-Seat Mode</h3>
          <p className={styles.modeDescription}>Play with someone on this device</p>
          <ul className={styles.featureList}>
            <li>Pass device back and forth</li>
            <li>Privacy screen between turns</li>
            <li>Works offline</li>
          </ul>
        </button>

        <button
          onClick={() => onModeSelected('url')}
          className={styles.modeButton}
          aria-label="Play URL mode across devices"
          data-testid="mode-url"
        >
          <span className={styles.modeIcon} aria-hidden="true">🔗</span>
          <h3 className={styles.modeTitle}>URL Mode</h3>
          <p className={styles.modeDescription}>Share game via URL remotely</p>
          <ul className={styles.featureList}>
            <li>Each player on their own device</li>
            <li>Share URL after each move</li>
            <li>Play at your own pace</li>
          </ul>
        </button>
      </div>
    </div>
  );
}
