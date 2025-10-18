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

      <section className={styles.storySection} aria-label="Game story">
        <p className={styles.stageDirection}>(flapping)</p>
        <p className={styles.dialogue}>
          <strong>Dark King:</strong> A pigeon... what's up Glinda?
        </p>
        <p className={styles.stageDirection}>
          (scroll reads: we're coming over! you're cooking!<br />
          <span className={styles.scrollSignature}>- Light King</span>)
        </p>
        <p className={styles.dialogue}>
          <strong>Dark King:</strong> HA! Not if we get there first!
        </p>
        <p className={styles.stageDirection}>(shouting)</p>
        <p className={styles.dialogue}>
          We're off! Dinner at the Light King's Castle!
        </p>
      </section>

      <section className={styles.instructionsSection} aria-label="How to play">
        <h2 className={styles.instructionsTitle}>How to Play</h2>
        <ul className={styles.instructionsList}>
          <li>Most pieces to make it to the opponent's castle wins!</li>
          <li>Captured pieces are sent home to prepare the feast</li>
          <li>Click a piece to select, then click the desired square you want them to move to</li>
          <li>Then click confirm to lock in your move</li>
          <li>For URL game: you'll be given a URL to share with your opponent via text or email</li>
          <li>Or play with someone on the same device (hot-seat mode)</li>
        </ul>
      </section>

      <h3 className={styles.subtitle}>Choose Your Game Mode:</h3>

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
