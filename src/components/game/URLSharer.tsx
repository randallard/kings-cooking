/**
 * @fileoverview URL sharing component with clipboard API support
 * @module components/game/URLSharer
 */

import { useState, useRef, type ReactElement } from 'react';
import styles from './URLSharer.module.css';

interface URLSharerProps {
  /** The game URL to share */
  url: string;
  /** Optional callback when URL is copied */
  onCopy?: () => void;
}

/**
 * URL sharing component with copy-to-clipboard functionality.
 *
 * Features:
 * - Read-only input displaying game URL
 * - Copy button with Clipboard API
 * - Success toast notification
 * - Fallback for browsers without Clipboard API
 * - Full keyboard and screen reader support
 *
 * @component
 * @example
 * ```tsx
 * <URLSharer
 *   url={window.location.href}
 *   onCopy={() => console.log('URL copied!')}
 * />
 * ```
 */
export const URLSharer = ({
  url,
  onCopy,
}: URLSharerProps): ReactElement => {
  const [copyStatus, setCopyStatus] = useState<
    'idle' | 'success' | 'error'
  >('idle');
  const inputRef = useRef<HTMLInputElement>(null);

  /**
   * Copy URL to clipboard using Clipboard API with fallback.
   */
  const handleCopy = async (): Promise<void> => {
    try {
      // Modern Clipboard API (preferred)
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
        setCopyStatus('success');
        onCopy?.();

        // Clear success message after 3 seconds
        setTimeout(() => setCopyStatus('idle'), 3000);
      } else {
        // Fallback: Select text and use execCommand
        if (inputRef.current && document.execCommand) {
          inputRef.current.select();
          inputRef.current.setSelectionRange(0, 99999); // Mobile support

          const success = document.execCommand('copy');
          if (success) {
            setCopyStatus('success');
            onCopy?.();

            // Clear success message after 3 seconds
            setTimeout(() => setCopyStatus('idle'), 3000);
          } else {
            setCopyStatus('error');
            setTimeout(() => setCopyStatus('idle'), 3000);
          }

          // Clear selection
          window.getSelection()?.removeAllRanges();
        } else {
          setCopyStatus('error');
          setTimeout(() => setCopyStatus('idle'), 3000);
        }
      }
    } catch (error) {
      console.error('Failed to copy URL:', error);
      setCopyStatus('error');

      // Clear error message after 3 seconds
      setTimeout(() => setCopyStatus('idle'), 3000);
    }
  };

  return (
    <div className={styles.container}>
      <label htmlFor="share-url" className={styles.label}>
        Share this game:
      </label>

      <div className={styles.inputGroup}>
        <input
          ref={inputRef}
          id="share-url"
          type="text"
          value={url}
          readOnly
          className={styles.urlInput}
          aria-label="Game share URL"
          onClick={(e) => e.currentTarget.select()}
        />

        <button
          type="button"
          onClick={() => { void handleCopy(); }}
          className={styles.copyButton}
          aria-label="Copy game link to clipboard"
        >
          {copyStatus === 'success' ? '✓ Copied!' : 'Copy'}
        </button>
      </div>

      {/* Success/Error toast */}
      {copyStatus !== 'idle' && (
        <div
          className={
            copyStatus === 'success' ? styles.successToast : styles.errorToast
          }
          role="status"
          aria-live="polite"
        >
          {copyStatus === 'success'
            ? 'Link copied to clipboard!'
            : 'Failed to copy. Please select and copy manually.'}
        </div>
      )}
    </div>
  );
};
