/**
 * @fileoverview Player 2 Name Entry Screen for hot-seat mode
 * @module components/game/Player2NameEntryScreen
 */

import { useState, type ReactElement } from 'react';
import { NameForm } from './NameForm';
import { storage } from '@/lib/storage/localStorage';
import type { GameFlowAction } from '@/types/gameFlow';

interface Player2NameEntryScreenProps {
  /** Dispatch function for game flow actions (optional if using onContinue) */
  dispatch?: React.Dispatch<GameFlowAction>;
  /** Description text to show above the name form */
  description?: string;
  /** Button text (defaults to "Continue to Game") */
  buttonText?: string;
  /** Custom callback when continue is clicked with valid name (overrides default dispatch behavior) */
  onContinue?: (name: string) => void;
}

/**
 * Player 2 Name Entry Screen Component.
 *
 * Shown in hot-seat mode when Player 2 needs to enter their name
 * after piece selection and Player 1's first move.
 *
 * Features:
 * - Name validation via NameForm
 * - localStorage persistence
 * - Dispatches SET_PLAYER2_NAME and COMPLETE_HANDOFF actions
 *
 * @component
 * @example
 * ```tsx
 * <Player2NameEntryScreen dispatch={dispatch} />
 * ```
 */
export const Player2NameEntryScreen = ({
  dispatch,
  description = 'Before we continue, Player 2 needs to enter their name.',
  buttonText = 'Continue to Game',
  onContinue,
}: Player2NameEntryScreenProps): ReactElement => {
  const [isNameValid, setIsNameValid] = useState(false);

  const handleContinue = (): void => {
    // Get the saved name from localStorage
    const player2Name = storage.getPlayer2Name();
    if (player2Name && player2Name.trim().length > 0) {
      if (onContinue) {
        // Use custom callback if provided
        onContinue(player2Name);
      } else if (dispatch) {
        // Use default dispatch behavior
        dispatch({ type: 'SET_PLAYER2_NAME', name: player2Name });
        dispatch({ type: 'COMPLETE_HANDOFF' });
      }
    }
  };

  return (
    <div style={{
      maxWidth: '600px',
      margin: '0 auto',
      padding: 'var(--spacing-xl)',
    }}>
      <h1 style={{ textAlign: 'center', marginBottom: 'var(--spacing-lg)' }}>
        Player 2's Turn
      </h1>
      <div className="card">
        <h2 style={{ marginBottom: 'var(--spacing-md)' }}>Enter Your Name</h2>
        <p style={{ marginBottom: 'var(--spacing-md)', color: 'var(--text-secondary)' }}>
          {description}
        </p>
        <NameForm
          storageKey="player2"
          onNameChange={(name) => {
            // Name is saved to localStorage by NameForm
            // Just track validation state for button
            setIsNameValid(name.trim().length > 0);
          }}
        />
        <button
          onClick={handleContinue}
          disabled={!isNameValid}
          style={{ marginTop: 'var(--spacing-md)', width: '100%' }}
        >
          {buttonText}
        </button>
      </div>
    </div>
  );
};
