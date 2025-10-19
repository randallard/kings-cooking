/**
 * @fileoverview Name input form with validation and localStorage persistence
 * @module components/game/NameForm
 */

import { useState, useEffect, useRef, type ReactElement, type ChangeEvent } from 'react';
import { storage } from '@/lib/storage/localStorage';
import styles from './NameForm.module.css';

interface NameFormProps {
  /** Which storage key to use for persistence */
  storageKey: 'my-name' | 'player1' | 'player2';
  /** Optional label text (defaults to "Your name:" or "Player X name:") */
  label?: string;
  /** Optional callback when name changes and is valid */
  onNameChange?: (name: string) => void;
}

/**
 * Name input form with validation and localStorage persistence.
 *
 * Features:
 * - Real-time validation (1-20 chars, alphanumeric + dash/underscore only)
 * - Debounced localStorage persistence (300ms)
 * - XSS protection via regex validation
 * - Success/error states with visual feedback
 * - Full keyboard and screen reader support
 * - Auto-loads saved name on mount
 *
 * Validation Rules:
 * - Length: 1-20 characters
 * - Allowed: letters, numbers, dash (-), underscore (_), spaces
 * - No leading/trailing spaces
 * - No special characters (prevents XSS)
 *
 * @component
 * @example
 * ```tsx
 * <NameForm
 *   storageKey="my-name"
 *   onNameChange={(name) => console.log('Name changed:', name)}
 * />
 * ```
 */
export const NameForm = ({
  storageKey,
  label,
  onNameChange,
}: NameFormProps): ReactElement => {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isValid, setIsValid] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Load saved name from localStorage on mount.
   * Calls onNameChange callback to notify parent of pre-filled valid name.
   */
  useEffect(() => {
    let savedName: string | null = null;

    if (storageKey === 'my-name') {
      savedName = storage.getMyName();
    } else if (storageKey === 'player1') {
      savedName = storage.getPlayer1Name();
    } else if (storageKey === 'player2') {
      savedName = storage.getPlayer2Name();
    }

    if (savedName) {
      setName(savedName);
      setIsValid(true);

      // Notify parent that valid name was loaded from storage
      onNameChange?.(savedName);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- onNameChange intentionally omitted to prevent re-running on parent re-renders
  }, [storageKey]);

  // Validate name
  const validateName = (value: string): string | null => {
    // Empty name is allowed (user can clear)
    if (value === '') {
      return null;
    }

    // Length validation
    if (value.length > 20) {
      return 'Name must be 20 characters or less';
    }

    // Character validation (alphanumeric + dash + underscore + spaces)
    // This prevents XSS by blocking special characters
    const validCharPattern = /^[a-zA-Z0-9\s_-]+$/;
    if (!validCharPattern.test(value)) {
      return 'Only letters, numbers, spaces, dash (-), and underscore (_) allowed';
    }

    // No leading/trailing spaces
    if (value !== value.trim()) {
      return 'Name cannot start or end with spaces';
    }

    return null;
  };

  // Handle input change with debounced localStorage save
  const handleChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const newValue = e.target.value;
    setName(newValue);

    // Reset isDirty to false if input is cleared
    if (newValue === '') {
      setIsDirty(false);
      setError(null);
      setIsValid(false);
    } else {
      setIsDirty(true);
    }

    // Validate immediately for UI feedback
    const validationError = validateName(newValue);
    setError(validationError);
    setIsValid(validationError === null && newValue !== '');

    // Clear existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Debounce localStorage save (300ms)
    debounceTimerRef.current = setTimeout(() => {
      if (validationError === null && newValue !== '') {
        // Save to localStorage
        let saveSuccess = false;

        if (storageKey === 'my-name') {
          saveSuccess = storage.setMyName(newValue);
        } else if (storageKey === 'player1') {
          saveSuccess = storage.setPlayer1Name(newValue);
        } else if (storageKey === 'player2') {
          saveSuccess = storage.setPlayer2Name(newValue);
        }

        if (saveSuccess) {
          // Call callback on successful save
          onNameChange?.(newValue);
        } else {
          setError('Failed to save name. Please try again.');
        }
      }
    }, 300);
  };

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Generate default label based on storage key
  const defaultLabel = storageKey === 'my-name'
    ? 'Your name:'
    : storageKey === 'player1'
      ? 'Player 1 name:'
      : 'Player 2 name:';

  const displayLabel = label ?? defaultLabel;

  // Input classes based on state
  const inputClasses = [
    styles.input,
    isDirty && isValid && styles.valid,
    isDirty && error && styles.invalid,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={styles.container}>
      <label htmlFor={`name-input-${storageKey}`} className={styles.label}>
        {displayLabel}
      </label>

      <div className={styles.inputWrapper}>
        <input
          id={`name-input-${storageKey}`}
          type="text"
          value={name}
          onChange={handleChange}
          className={inputClasses}
          placeholder="Enter your name"
          aria-label={displayLabel}
          aria-invalid={isDirty && error !== null}
          aria-describedby={error ? `name-error-${storageKey}` : undefined}
          maxLength={20}
        />

        {/* Success indicator */}
        {isDirty && isValid && (
          <span className={styles.successIcon} aria-hidden="true">
            ✓
          </span>
        )}

        {/* Error indicator */}
        {isDirty && error && (
          <span className={styles.errorIcon} aria-hidden="true">
            ✗
          </span>
        )}
      </div>

      {/* Error message */}
      {isDirty && error && (
        <div
          id={`name-error-${storageKey}`}
          className={styles.errorMessage}
          role="alert"
          aria-live="assertive"
        >
          {error}
        </div>
      )}

      {/* Helper text */}
      {!isDirty && (
        <div className={styles.helperText}>
          1-20 characters: letters, numbers, spaces, dash, underscore
        </div>
      )}
    </div>
  );
};
