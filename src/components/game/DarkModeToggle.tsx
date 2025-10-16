/**
 * @fileoverview Dark mode toggle with system preference detection
 * @module components/game/DarkModeToggle
 */

import { useState, useEffect, type ReactElement } from 'react';
import styles from './DarkModeToggle.module.css';

interface DarkModeToggleProps {
  /** Callback when theme changes */
  onThemeChange?: (theme: 'light' | 'dark') => void;
  /** Storage key for persisting preference (default: 'theme-preference') */
  storageKey?: string;
}

/**
 * Dark mode toggle component.
 *
 * Features:
 * - System preference detection via `prefers-color-scheme`
 * - Manual toggle override
 * - Persistent preference storage in localStorage
 * - Smooth theme transitions
 * - Accessible button with ARIA labels
 * - Sun/Moon icons for visual feedback
 *
 * Theme Priority:
 * 1. User's manual preference (if set)
 * 2. System preference (if no manual preference)
 * 3. Light mode (default fallback)
 *
 * Accessibility:
 * - ARIA label describes current state
 * - Keyboard accessible
 * - Focus visible indicator
 * - Screen reader friendly
 *
 * @component
 * @example
 * ```tsx
 * <DarkModeToggle
 *   onThemeChange={(theme) => console.log('Theme changed to:', theme)}
 * />
 * ```
 */
export const DarkModeToggle = ({
  onThemeChange,
  storageKey = 'theme-preference',
}: DarkModeToggleProps): ReactElement => {
  // Initialize theme from localStorage or system preference
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    // Check localStorage first
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored === 'light' || stored === 'dark') {
        return stored;
      }
    } catch {
      // localStorage might not be available
    }

    // Fall back to system preference
    try {
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    } catch {
      // matchMedia might not be available
    }

    return 'light';
  });

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);

    // Store preference
    try {
      localStorage.setItem(storageKey, theme);
    } catch {
      // localStorage might not be available
    }

    // Notify parent
    onThemeChange?.(theme);
  }, [theme, storageKey, onThemeChange]);

  // Listen for system preference changes
  useEffect(() => {
    try {
      if (!window.matchMedia) {
        return;
      }

      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

      const handleChange = (e: MediaQueryListEvent): void => {
        // Only update if user hasn't set manual preference
        try {
          const stored = localStorage.getItem(storageKey);
          if (!stored) {
            setTheme(e.matches ? 'dark' : 'light');
          }
        } catch {
          // localStorage might not be available
        }
      };

      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } catch {
      // matchMedia might not be available
      return;
    }
  }, [storageKey]);

  const toggleTheme = (): void => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={styles.toggle}
      aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
      title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
    >
      {/* Sun icon for light mode */}
      {theme === 'light' ? (
        <svg
          className={styles.icon}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      ) : (
        /* Moon icon for dark mode */
        <svg
          className={styles.icon}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
};
