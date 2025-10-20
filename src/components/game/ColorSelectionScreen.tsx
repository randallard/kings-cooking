/**
 * @fileoverview Color selection screen component
 * @module components/game/ColorSelectionScreen
 */

import { type ReactElement } from 'react';
import type { GameFlowAction } from '@/types/gameFlow';
import styles from './ColorSelectionScreen.module.css';

interface ColorSelectionScreenProps {
  /** Player 1's name */
  player1Name: string;
  /** Dispatch function for game flow actions */
  dispatch: (action: GameFlowAction) => void;
}

/**
 * Color selection screen component.
 *
 * Allows Player 1 to choose which color to play (Light or Dark).
 * Light player goes first, Dark player goes second.
 *
 * @component
 */
export function ColorSelectionScreen({
  player1Name,
  dispatch,
}: ColorSelectionScreenProps): ReactElement {
  const handleColorSelect = (color: 'light' | 'dark'): void => {
    dispatch({ type: 'SET_PLAYER_COLOR', color });
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Choose Your Color</h1>
      <p className={styles.subtitle}>{player1Name}</p>

      <div className={styles.colorButtons}>
        <button
          type="button"
          onClick={() => handleColorSelect('light')}
          className={styles.colorButton}
          aria-label="Choose Light pieces - go first"
        >
          <span className={styles.colorIcon}>☀️</span>
          <span className={styles.colorName}>Light</span>
          <span className={styles.colorNote}>Goes first</span>
        </button>

        <button
          type="button"
          onClick={() => handleColorSelect('dark')}
          className={styles.colorButton}
          aria-label="Choose Dark pieces - go second"
        >
          <span className={styles.colorIcon}>🌙</span>
          <span className={styles.colorName}>Dark</span>
          <span className={styles.colorNote}>Goes second</span>
        </button>
      </div>
    </div>
  );
}
