/**
 * @fileoverview Story/Instructions overlay panel with collapsible toggle
 * @module components/game/StoryPanel
 */

import { ReactElement, useEffect, useRef } from 'react';
import styles from './StoryPanel.module.css';

interface StoryPanelProps {
  /** Whether panel is visible */
  isOpen: boolean;
  /** Callback when panel is closed */
  onClose: () => void;
}

/**
 * Story/Instructions overlay panel.
 *
 * Features:
 * - Modal overlay with semi-transparent backdrop
 * - Close button and ESC key support
 * - Focus trap for accessibility
 * - Prevent body scroll when open
 * - Same content as ModeSelector story/instructions
 *
 * Accessibility:
 * - ARIA dialog with labels
 * - Focus management
 * - Keyboard navigation
 * - Screen reader support
 *
 * @component
 * @example
 * ```tsx
 * <StoryPanel
 *   isOpen={showPanel}
 *   onClose={() => setShowPanel(false)}
 * />
 * ```
 */
export function StoryPanel({ isOpen, onClose }: StoryPanelProps): ReactElement | null {
  const containerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Focus management
  useEffect(() => {
    if (!isOpen) return;

    if (isOpen && closeButtonRef.current) {
      closeButtonRef.current.focus();
    }

    // Trap focus within panel
    const handleTabKey = (e: KeyboardEvent): void => {
      if (e.key === 'Tab' && closeButtonRef.current) {
        e.preventDefault();
        closeButtonRef.current.focus();
      }
    };

    document.addEventListener('keydown', handleTabKey);
    return () => document.removeEventListener('keydown', handleTabKey);
  }, [isOpen]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Don't render DOM if not open
  if (!isOpen) return null;

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="story-panel-title"
      aria-describedby="story-panel-description"
    >
      <div ref={containerRef} className={styles.container}>
        {/* Close button */}
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          className={styles.closeButton}
          aria-label="Close story and instructions panel"
        >
          ×
        </button>

        {/* Story section */}
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

        {/* Instructions section */}
        <section className={styles.instructionsSection} aria-label="How to play">
          <h2 id="story-panel-title" className={styles.instructionsTitle}>
            How to Play
          </h2>
          <ul id="story-panel-description" className={styles.instructionsList}>
            <li>Most pieces to make it to the opponent's castle wins!</li>
            <li>Captured pieces are sent home to prepare the feast</li>
            <li>Click a piece to select, then click the desired square you want them to move to</li>
            <li>Then click confirm to lock in your move</li>
            <li>For URL game: you'll be given a URL to share with your opponent via text or email</li>
            <li>Or choose hot-seat to play with someone on the same device, no url sharing needed</li>
          </ul>
        </section>
      </div>

      {/* Backdrop overlay */}
      <div className={styles.backdrop} aria-hidden="true" onClick={onClose} />
    </div>
  );
}
