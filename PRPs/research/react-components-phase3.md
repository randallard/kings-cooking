# React Component Patterns for Phase 3: History Viewer & Comparison Modal

**Version:** 1.0.0
**Date:** October 15, 2025
**Phase:** 3 of 7 (URL State Synchronization)
**Target Tasks:** 15-24 (History Viewer UI and History Comparison Modal)

---

## Executive Summary

This research document provides comprehensive React component patterns for implementing Tasks 15-24 of Phase 3, focusing on the **History Viewer UI** and **History Comparison Modal**. These components are critical for the async multiplayer experience, providing transparency, debugging capabilities, and divergence resolution.

**Key Components:**
1. **History Viewer** (Tasks 15-19) - Always-visible collapsible panel showing move history
2. **History Comparison Modal** (Tasks 20-24) - Divergence resolution UI with side-by-side comparison

**React 19 Requirements:**
- Use `ReactElement` for return types (NOT `JSX.Element`)
- Strict TypeScript with no `any` types
- 80%+ test coverage with React Testing Library
- Complete accessibility (ARIA, keyboard navigation, focus management)
- JSDoc documentation on all components

**Research Scope:**
- Collapsible component patterns with animations
- Modal accessibility with focus-trap-react
- Side-by-side comparison layouts
- File download patterns for JSON export
- Comprehensive testing strategies

---

## Table of Contents

1. [Collapsible Component Patterns (Task 15)](#1-collapsible-component-patterns-task-15)
2. [History List Display (Tasks 16-17)](#2-history-list-display-tasks-16-17)
3. [JSON Export Functionality (Task 18)](#3-json-export-functionality-task-18)
4. [Modal Accessibility with focus-trap-react (Task 20)](#4-modal-accessibility-with-focus-trap-react-task-20)
5. [Side-by-Side Comparison UI (Task 21)](#5-side-by-side-comparison-ui-task-21)
6. [Button Action Handlers (Tasks 22-23)](#6-button-action-handlers-tasks-22-23)
7. [React Testing Library Patterns (Tasks 19, 24)](#7-react-testing-library-patterns-tasks-19-24)
8. [Complete Code Templates](#8-complete-code-templates)
9. [Common Pitfalls & Solutions](#9-common-pitfalls--solutions)

---

## 1. Collapsible Component Patterns (Task 15)

### Overview

Collapsible components provide a space-efficient way to show/hide content with smooth animations and full keyboard accessibility.

**Key Requirements:**
- ✅ ARIA attributes for screen readers
- ✅ Keyboard navigation (Enter/Space to toggle)
- ✅ Smooth CSS transitions
- ✅ Auto-scroll to current move
- ✅ Maintain collapsed state in React state

---

### Basic Collapsible Pattern

```typescript
/**
 * @fileoverview Basic collapsible panel component
 * @module components/CollapsiblePanel
 */

import { useState, type ReactElement } from 'react';

/**
 * Props for CollapsiblePanel component
 */
interface CollapsiblePanelProps {
  /** Panel title shown in header */
  title: string;
  /** Panel content (shown when expanded) */
  children: React.ReactNode;
  /** Initially expanded state @default false */
  defaultExpanded?: boolean;
  /** Optional ID for ARIA labeling */
  id?: string;
}

/**
 * Collapsible panel with accessibility support.
 *
 * Provides keyboard navigation and screen reader support through
 * ARIA attributes. Uses CSS transitions for smooth animation.
 *
 * @component
 * @example
 * ```tsx
 * <CollapsiblePanel title="Move History" defaultExpanded={true}>
 *   <MoveList moves={history} />
 * </CollapsiblePanel>
 * ```
 */
export const CollapsiblePanel = ({
  title,
  children,
  defaultExpanded = false,
  id = 'collapsible-panel',
}: CollapsiblePanelProps): ReactElement => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const contentId = `${id}-content`;
  const titleId = `${id}-title`;

  /**
   * Handle keyboard events for accessibility
   * Enter or Space toggles the panel
   */
  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <div className="collapsible-panel">
      <button
        type="button"
        className="panel-header"
        aria-expanded={isExpanded}
        aria-controls={contentId}
        onClick={() => setIsExpanded(!isExpanded)}
        onKeyDown={handleKeyDown}
      >
        <h2 id={titleId} className="panel-title">
          {title}
        </h2>
        <span aria-hidden="true" className="expand-icon">
          {isExpanded ? '▼' : '▶'}
        </span>
      </button>

      <div
        id={contentId}
        hidden={!isExpanded}
        aria-labelledby={titleId}
        className={`panel-content ${isExpanded ? 'expanded' : 'collapsed'}`}
      >
        {children}
      </div>
    </div>
  );
};
```

---

### CSS Transitions for Smooth Animation

```css
/**
 * Collapsible panel styles with smooth transitions
 */
.collapsible-panel {
  border: 1px solid var(--border-color);
  border-radius: 4px;
  overflow: hidden;
}

.panel-header {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background-color: var(--header-bg);
  border: none;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.panel-header:hover {
  background-color: var(--header-hover-bg);
}

.panel-header:focus {
  outline: 2px solid var(--focus-color);
  outline-offset: -2px;
}

.panel-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}

.expand-icon {
  transition: transform 0.3s ease;
  font-size: 0.875rem;
}

.panel-content {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s ease, padding 0.3s ease;
}

.panel-content.expanded {
  max-height: 500px; /* Adjust based on content */
  padding: 16px;
}

.panel-content.collapsed {
  max-height: 0;
  padding: 0 16px;
}

/* Alternative: Use CSS Grid for smoother animation */
.panel-content-grid {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.3s ease;
}

.panel-content-grid.expanded {
  grid-template-rows: 1fr;
}

.panel-content-grid > div {
  overflow: hidden;
}
```

---

### Auto-Scroll to Current Move

```typescript
/**
 * @fileoverview History Viewer with auto-scroll
 * @module components/HistoryViewer
 */

import { useState, useRef, useEffect, type ReactElement } from 'react';

interface MoveHistoryEntry {
  moveNumber: number;
  player: 'white' | 'black';
  notation: string;
  synced: boolean;
}

interface HistoryViewerProps {
  /** Full game history */
  history: MoveHistoryEntry[];
  /** Index of current move for highlighting */
  currentMoveIndex: number;
}

/**
 * History viewer with auto-scroll to current move.
 *
 * Automatically scrolls the current move into view when it changes.
 * Uses smooth scrolling for better UX.
 *
 * @component
 */
export const HistoryViewer = ({
  history,
  currentMoveIndex,
}: HistoryViewerProps): ReactElement => {
  const [isExpanded, setIsExpanded] = useState(true);
  const currentMoveRef = useRef<HTMLDivElement>(null);

  /**
   * Auto-scroll to current move when index changes
   */
  useEffect(() => {
    if (currentMoveRef.current && isExpanded) {
      currentMoveRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest', // CRITICAL: Don't scroll entire page
        inline: 'nearest',
      });
    }
  }, [currentMoveIndex, isExpanded]);

  return (
    <div className="history-viewer">
      <button
        type="button"
        className="panel-header"
        aria-expanded={isExpanded}
        aria-controls="history-content"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h2 id="history-title">Move History</h2>
        <span aria-hidden="true">{isExpanded ? '▼' : '▶'}</span>
      </button>

      <div
        id="history-content"
        hidden={!isExpanded}
        aria-labelledby="history-title"
        className="history-panel"
      >
        <div className="move-list" role="log" aria-live="polite">
          {history.map((move, index) => (
            <div
              key={index}
              ref={index === currentMoveIndex ? currentMoveRef : null}
              className={`move-entry ${index === currentMoveIndex ? 'current' : ''}`}
            >
              <span className="move-number">{move.moveNumber}.</span>
              <span className="move-notation">{move.notation}</span>
              {move.synced && (
                <span className="sync-indicator" aria-label="Synced">
                  ✓
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
```

---

### Accessibility Best Practices

**ARIA Attributes for Collapsible Components:**

| Attribute | Purpose | Required |
|-----------|---------|----------|
| `aria-expanded` | Indicates expanded/collapsed state | ✅ Yes |
| `aria-controls` | References controlled content ID | ✅ Yes |
| `aria-labelledby` | Labels content with header ID | ✅ Yes |
| `hidden` | Hides content from screen readers when collapsed | ✅ Yes |
| `role="button"` | Implicit on `<button>` element | Auto |

**Keyboard Navigation Requirements:**

```typescript
/**
 * Handle keyboard events for collapsible panel
 */
const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>): void => {
  // Enter or Space toggles panel
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault(); // Prevent page scroll on Space
    setIsExpanded(!isExpanded);
  }

  // Optional: Arrow keys to expand/collapse
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    setIsExpanded(true);
  }
  if (event.key === 'ArrowUp') {
    event.preventDefault();
    setIsExpanded(false);
  }
};
```

---

### Common Pitfalls

#### ❌ PITFALL #1: Using max-height with large values

```css
/* ❌ WRONG: Transition delayed by large max-height */
.panel-content.expanded {
  max-height: 9999px; /* Animation takes forever */
  transition: max-height 0.3s ease;
}
```

**Problem:** Transition duration is proportional to max-height change, not actual content height.

**Solution:** Use reasonable max-height or CSS Grid approach

```css
/* ✅ CORRECT: Reasonable max-height */
.panel-content.expanded {
  max-height: 500px; /* Adjust based on actual content */
  transition: max-height 0.3s ease;
}

/* ✅ ALTERNATIVE: CSS Grid (smooth with any height) */
.panel-content-grid {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.3s ease;
}

.panel-content-grid.expanded {
  grid-template-rows: 1fr;
}
```

---

#### ❌ PITFALL #2: Not preventing Space key scroll

```typescript
// ❌ WRONG: Space key scrolls page when toggling
<button onClick={() => setIsExpanded(!isExpanded)}>
  {title}
</button>
```

**Solution:** Prevent default on Space key

```typescript
// ✅ CORRECT: Prevent page scroll
const handleKeyDown = (event: React.KeyboardEvent): void => {
  if (event.key === ' ') {
    event.preventDefault();
    setIsExpanded(!isExpanded);
  }
};

<button
  onClick={() => setIsExpanded(!isExpanded)}
  onKeyDown={handleKeyDown}
>
  {title}
</button>
```

---

#### ❌ PITFALL #3: scrollIntoView scrolls entire page

```typescript
// ❌ WRONG: Scrolls entire page, disrupting user
currentMoveRef.current.scrollIntoView({ behavior: 'smooth' });
```

**Solution:** Use `block: 'nearest'`

```typescript
// ✅ CORRECT: Only scrolls within container
currentMoveRef.current.scrollIntoView({
  behavior: 'smooth',
  block: 'nearest', // Don't scroll entire page
  inline: 'nearest',
});
```

---

## 2. History List Display (Tasks 16-17)

### Overview

The History Viewer displays the last 10 moves with turn numbers and sync status. A "Show Full History" button opens a modal with complete game history.

**Requirements:**
- ✅ Show last 10 moves by default
- ✅ Turn numbers and move notation
- ✅ Sync status indicators (checkmarks)
- ✅ "Show Full History" modal for games with 10+ moves
- ✅ Scrollable list for long games
- ✅ Keyboard navigation for move selection

---

### Move List Component

```typescript
/**
 * @fileoverview Move list with sync status indicators
 * @module components/MoveList
 */

import { type ReactElement } from 'react';

interface Move {
  moveNumber: number;
  player: 'white' | 'black';
  from: [number, number];
  to: [number, number] | 'off_board';
  notation: string;
  synced: boolean;
}

interface MoveListProps {
  /** Array of moves to display */
  moves: Move[];
  /** Currently selected move index */
  currentMoveIndex?: number;
  /** Callback when move is selected */
  onSelectMove?: (index: number) => void;
}

/**
 * Displays a list of moves with sync status.
 *
 * Each move shows turn number, notation, and sync indicator.
 * Keyboard navigable with arrow keys.
 *
 * @component
 * @example
 * ```tsx
 * <MoveList
 *   moves={gameHistory}
 *   currentMoveIndex={5}
 *   onSelectMove={(index) => jumpToMove(index)}
 * />
 * ```
 */
export const MoveList = ({
  moves,
  currentMoveIndex,
  onSelectMove,
}: MoveListProps): ReactElement => {
  /**
   * Format position for display
   */
  const formatPosition = (pos: [number, number] | 'off_board'): string => {
    if (pos === 'off_board') return 'Off Board';
    const [row, col] = pos;
    const colLetter = String.fromCharCode(65 + col); // A, B, C
    return `${colLetter}${row + 1}`;
  };

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number
  ): void => {
    if (!onSelectMove) return;

    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        onSelectMove(index);
        break;
      case 'ArrowDown':
        event.preventDefault();
        if (index < moves.length - 1) {
          onSelectMove(index + 1);
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (index > 0) {
          onSelectMove(index - 1);
        }
        break;
    }
  };

  return (
    <div className="move-list" role="list">
      {moves.map((move, index) => (
        <div
          key={index}
          className={`move-entry ${index === currentMoveIndex ? 'current' : ''}`}
          role="listitem"
        >
          <span className="move-number">{move.moveNumber}.</span>

          {onSelectMove ? (
            <button
              type="button"
              className="move-button"
              onClick={() => onSelectMove(index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              aria-label={`Jump to move ${move.moveNumber}`}
              aria-current={index === currentMoveIndex ? 'step' : undefined}
            >
              <span className="move-notation">
                {formatPosition(move.from)} → {formatPosition(move.to)}
              </span>
            </button>
          ) : (
            <span className="move-notation">
              {formatPosition(move.from)} → {formatPosition(move.to)}
            </span>
          )}

          {move.synced && (
            <span
              className="sync-indicator"
              aria-label="Move synced"
              title="This move was successfully shared via URL"
            >
              ✓
            </span>
          )}
        </div>
      ))}
    </div>
  );
};
```

---

### Full History Modal

```typescript
/**
 * @fileoverview Modal for displaying complete game history
 * @module components/FullHistoryModal
 */

import { useEffect, useRef, type ReactElement } from 'react';
import FocusTrap from 'focus-trap-react';

interface FullHistoryModalProps {
  /** Whether modal is open */
  isOpen: boolean;
  /** Callback to close modal */
  onClose: () => void;
  /** Complete game history */
  history: Move[];
  /** Currently selected move index */
  currentMoveIndex?: number;
  /** Callback when move is selected */
  onSelectMove?: (index: number) => void;
}

/**
 * Modal displaying complete game history.
 *
 * Uses focus-trap-react for accessibility. Scrolls to current move
 * when opened. Closes on ESC key or backdrop click.
 *
 * @component
 */
export const FullHistoryModal = ({
  isOpen,
  onClose,
  history,
  currentMoveIndex,
  onSelectMove,
}: FullHistoryModalProps): ReactElement | null => {
  const currentMoveRef = useRef<HTMLDivElement>(null);

  /**
   * Scroll to current move when modal opens
   */
  useEffect(() => {
    if (isOpen && currentMoveRef.current) {
      // Delay to ensure modal is rendered
      setTimeout(() => {
        currentMoveRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }, 100);
    }
  }, [isOpen]);

  /**
   * Close modal on ESC key
   */
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <FocusTrap
      focusTrapOptions={{
        initialFocus: '#modal-close',
        clickOutsideDeactivates: true,
        escapeDeactivates: true,
        onDeactivate: onClose,
      }}
    >
      <div className="modal-backdrop" onClick={onClose}>
        <div
          className="modal-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-header">
            <h2 id="modal-title">Full Game History</h2>
            <button
              id="modal-close"
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="close-button"
            >
              ✕
            </button>
          </div>

          <div className="modal-body">
            <p className="history-count">
              Total moves: {history.length}
            </p>
            <div className="scrollable-history">
              {history.map((move, index) => (
                <div
                  key={index}
                  ref={index === currentMoveIndex ? currentMoveRef : null}
                  className={`move-entry ${
                    index === currentMoveIndex ? 'current' : ''
                  }`}
                >
                  <span className="move-number">{move.moveNumber}.</span>
                  <span className="move-notation">{move.notation}</span>
                  {move.synced && (
                    <span className="sync-indicator" aria-label="Synced">
                      ✓
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn-primary">
              Close
            </button>
          </div>
        </div>
      </div>
    </FocusTrap>
  );
};
```

---

### CSS Styling

```css
/**
 * Move list styles
 */
.move-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 300px;
  overflow-y: auto;
}

.move-entry {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border-radius: 4px;
  transition: background-color 0.2s ease;
}

.move-entry:hover {
  background-color: var(--hover-bg);
}

.move-entry.current {
  background-color: var(--current-move-bg);
  font-weight: 600;
  border-left: 3px solid var(--accent-color);
}

.move-number {
  min-width: 32px;
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.move-notation {
  flex: 1;
  font-family: 'Monaco', 'Courier New', monospace;
  font-size: 0.875rem;
}

.move-button {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  text-align: left;
  flex: 1;
}

.move-button:focus {
  outline: 2px solid var(--focus-color);
  outline-offset: 2px;
  border-radius: 2px;
}

.sync-indicator {
  color: var(--success-color);
  font-size: 1rem;
  margin-left: auto;
}

/**
 * Full history modal styles
 */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-dialog {
  background-color: var(--modal-bg);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  max-width: 600px;
  max-height: 80vh;
  width: 90%;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid var(--border-color);
}

.modal-body {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}

.scrollable-history {
  max-height: 400px;
  overflow-y: auto;
}

.modal-footer {
  padding: 16px 24px;
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.close-button {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--text-secondary);
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.close-button:hover {
  background-color: var(--hover-bg);
  color: var(--text-primary);
}

.close-button:focus {
  outline: 2px solid var(--focus-color);
  outline-offset: 2px;
}
```

---

### Common Pitfalls

#### ❌ PITFALL #4: Not using aria-current for current move

```typescript
// ❌ WRONG: Only visual indicator
<div className={index === currentMoveIndex ? 'current' : ''}>
  {move.notation}
</div>
```

**Solution:** Add `aria-current` attribute

```typescript
// ✅ CORRECT: Accessible to screen readers
<button
  aria-current={index === currentMoveIndex ? 'step' : undefined}
  className={index === currentMoveIndex ? 'current' : ''}
>
  {move.notation}
</button>
```

---

## 3. JSON Export Functionality (Task 18)

### Overview

The "Export JSON" button downloads the complete game history as a timestamped JSON file for debugging and sharing.

**Requirements:**
- ✅ Blob creation and download
- ✅ Timestamp-based file naming
- ✅ User feedback (toast/notification)
- ✅ Error handling for failed downloads
- ✅ Include game metadata (players, board size, etc.)

---

### Export JSON Implementation

```typescript
/**
 * @fileoverview JSON export utilities
 * @module lib/export/jsonExport
 */

import type { GameState } from '@/lib/validation/schemas';
import type { GameHistory } from '@/lib/history/types';

/**
 * Exportable game data structure
 */
interface ExportedGame {
  version: string;
  exportDate: string;
  gameId: string;
  players: {
    white: string;
    black: string;
  };
  board: {
    width: number;
    height: number;
  };
  gameStatus: string;
  winner: string | null;
  moveHistory: GameHistory;
  finalState: GameState;
}

/**
 * Export game history as JSON file.
 *
 * Creates a downloadable JSON file with complete game data including
 * metadata, move history, and final state. File is named with timestamp.
 *
 * @param gameState - Current game state
 * @param history - Complete move history
 * @returns true if export succeeded, false otherwise
 *
 * @example
 * ```typescript
 * const success = exportGameAsJSON(gameState, moveHistory);
 * if (success) {
 *   showToast('Game exported successfully!');
 * } else {
 *   showError('Failed to export game');
 * }
 * ```
 */
export function exportGameAsJSON(
  gameState: GameState,
  history: GameHistory
): boolean {
  try {
    // Build export data structure
    const exportData: ExportedGame = {
      version: '1.0.0',
      exportDate: new Date().toISOString(),
      gameId: gameState.gameId,
      players: {
        white: gameState.whitePlayer.name,
        black: gameState.blackPlayer.name,
      },
      board: {
        width: gameState.board[0]?.length ?? 0,
        height: gameState.board.length,
      },
      gameStatus: gameState.status,
      winner: gameState.winner,
      moveHistory: history,
      finalState: gameState,
    };

    // Convert to formatted JSON string
    const jsonString = JSON.stringify(exportData, null, 2);

    // Create Blob with proper MIME type
    const blob = new Blob([jsonString], {
      type: 'application/json;charset=utf-8',
    });

    // Generate timestamp-based filename
    const timestamp = new Date()
      .toISOString()
      .slice(0, 19)
      .replace(/:/g, '-');
    const filename = `kings-cooking-${timestamp}.json`;

    // Create download link and trigger download
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;

    // Append to body (required for Firefox)
    document.body.appendChild(link);
    link.click();

    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return true;
  } catch (error) {
    console.error('Failed to export game as JSON:', error);
    return false;
  }
}

/**
 * Validate exported JSON file (for re-import).
 *
 * Verifies JSON structure and required fields.
 *
 * @param jsonString - JSON string to validate
 * @returns Parsed data if valid, null otherwise
 */
export function validateImportedJSON(
  jsonString: string
): ExportedGame | null {
  try {
    const parsed: unknown = JSON.parse(jsonString);

    // Basic structure validation
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !('version' in parsed) ||
      !('gameId' in parsed) ||
      !('moveHistory' in parsed)
    ) {
      console.error('Invalid JSON structure');
      return null;
    }

    // TODO: Add Zod schema validation for complete type safety
    return parsed as ExportedGame;
  } catch (error) {
    console.error('Failed to parse JSON:', error);
    return null;
  }
}
```

---

### Export Button Component

```typescript
/**
 * @fileoverview Export button component with loading state
 * @module components/ExportButton
 */

import { useState, type ReactElement } from 'react';
import { exportGameAsJSON } from '@/lib/export/jsonExport';
import type { GameState } from '@/lib/validation/schemas';
import type { GameHistory } from '@/lib/history/types';

interface ExportButtonProps {
  /** Current game state */
  gameState: GameState;
  /** Complete move history */
  history: GameHistory;
  /** Success callback */
  onSuccess?: () => void;
  /** Error callback */
  onError?: (error: string) => void;
}

/**
 * Button to export game history as JSON.
 *
 * Shows loading state during export and provides user feedback
 * via callbacks. Handles errors gracefully.
 *
 * @component
 */
export const ExportButton = ({
  gameState,
  history,
  onSuccess,
  onError,
}: ExportButtonProps): ReactElement => {
  const [isExporting, setIsExporting] = useState(false);

  /**
   * Handle export button click
   */
  const handleExport = async (): Promise<void> => {
    setIsExporting(true);

    try {
      // Simulate async operation (in case we add API upload later)
      await new Promise((resolve) => setTimeout(resolve, 100));

      const success = exportGameAsJSON(gameState, history);

      if (success) {
        onSuccess?.();
      } else {
        onError?.('Failed to export game. Please try again.');
      }
    } catch (error) {
      console.error('Export error:', error);
      onError?.(
        error instanceof Error
          ? error.message
          : 'An unexpected error occurred'
      );
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={isExporting}
      className="btn-export"
      aria-label="Export game as JSON"
    >
      {isExporting ? (
        <>
          <span className="spinner" aria-hidden="true" />
          Exporting...
        </>
      ) : (
        <>
          <span className="icon" aria-hidden="true">
            📥
          </span>
          Export JSON
        </>
      )}
    </button>
  );
};
```

---

### Toast Notification Component

```typescript
/**
 * @fileoverview Simple toast notification component
 * @module components/Toast
 */

import { useEffect, useState, type ReactElement } from 'react';

type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  /** Toast message */
  message: string;
  /** Toast type (determines styling) */
  type: ToastType;
  /** Duration in ms before auto-dismiss @default 3000 */
  duration?: number;
  /** Callback when toast is dismissed */
  onDismiss: () => void;
}

/**
 * Toast notification component.
 *
 * Displays temporary messages with auto-dismiss.
 * Supports success, error, and info types.
 *
 * @component
 */
export const Toast = ({
  message,
  type,
  duration = 3000,
  onDismiss,
}: ToastProps): ReactElement => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      // Delay callback to allow fade-out animation
      setTimeout(onDismiss, 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onDismiss]);

  const iconMap: Record<ToastType, string> = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
  };

  return (
    <div
      className={`toast toast-${type} ${isVisible ? 'visible' : 'hidden'}`}
      role="alert"
      aria-live="polite"
    >
      <span className="toast-icon" aria-hidden="true">
        {iconMap[type]}
      </span>
      <span className="toast-message">{message}</span>
      <button
        type="button"
        onClick={() => {
          setIsVisible(false);
          setTimeout(onDismiss, 300);
        }}
        aria-label="Dismiss notification"
        className="toast-close"
      >
        ✕
      </button>
    </div>
  );
};
```

---

### CSS Styling

```css
/**
 * Export button styles
 */
.btn-export {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background-color: var(--secondary-color);
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.btn-export:hover:not(:disabled) {
  background-color: var(--secondary-color-hover);
}

.btn-export:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-export:focus {
  outline: 2px solid var(--focus-color);
  outline-offset: 2px;
}

.spinner {
  display: inline-block;
  width: 12px;
  height: 12px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/**
 * Toast notification styles
 */
.toast {
  position: fixed;
  bottom: 24px;
  right: 24px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background-color: var(--toast-bg);
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 2000;
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.toast.visible {
  opacity: 1;
  transform: translateY(0);
}

.toast.hidden {
  opacity: 0;
  transform: translateY(20px);
}

.toast-success {
  background-color: var(--success-bg);
  color: var(--success-text);
}

.toast-error {
  background-color: var(--error-bg);
  color: var(--error-text);
}

.toast-info {
  background-color: var(--info-bg);
  color: var(--info-text);
}

.toast-icon {
  font-size: 1.25rem;
  font-weight: bold;
}

.toast-message {
  flex: 1;
  font-size: 0.875rem;
}

.toast-close {
  background: none;
  border: none;
  font-size: 1.25rem;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  opacity: 0.7;
}

.toast-close:hover {
  opacity: 1;
  background-color: rgba(0, 0, 0, 0.1);
}
```

---

### Common Pitfalls

#### ❌ PITFALL #5: Not revoking object URLs

```typescript
// ❌ WRONG: Memory leak from unreleased URLs
const url = URL.createObjectURL(blob);
link.href = url;
link.click();
// URL never released
```

**Solution:** Always revoke object URLs after use

```typescript
// ✅ CORRECT: Clean up object URLs
const url = URL.createObjectURL(blob);
link.href = url;
link.click();
URL.revokeObjectURL(url); // Free memory
```

---

#### ❌ PITFALL #6: Not appending link to body (Firefox)

```typescript
// ❌ WRONG: Doesn't work in Firefox
const link = document.createElement('a');
link.href = url;
link.download = filename;
link.click(); // Firefox requires link to be in DOM
```

**Solution:** Append link to body before click

```typescript
// ✅ CORRECT: Works in all browsers
const link = document.createElement('a');
link.href = url;
link.download = filename;
document.body.appendChild(link);
link.click();
document.body.removeChild(link);
```

---

## 4. Modal Accessibility with focus-trap-react (Task 20)

### Overview

The History Comparison Modal must be fully accessible with proper focus management, keyboard navigation, and screen reader support.

**Key Requirements:**
- ✅ Focus trap inside modal (Tab cycles within modal)
- ✅ ESC key closes modal
- ✅ Focus restoration on close
- ✅ ARIA attributes (role="dialog", aria-modal)
- ✅ Click outside to close

---

### Installation

```bash
pnpm add focus-trap-react
pnpm add --save-dev @types/focus-trap-react
```

---

### Basic Modal with Focus Trap

```typescript
/**
 * @fileoverview Accessible modal component with focus trap
 * @module components/Modal
 */

import { useEffect, type ReactElement } from 'react';
import FocusTrap from 'focus-trap-react';

interface ModalProps {
  /** Whether modal is open */
  isOpen: boolean;
  /** Callback to close modal */
  onClose: () => void;
  /** Modal title (required for accessibility) */
  title: string;
  /** Modal content */
  children: React.ReactNode;
  /** ID for ARIA labeling @default 'modal' */
  id?: string;
}

/**
 * Accessible modal component with focus trap.
 *
 * Traps focus within modal, closes on ESC key, and restores focus
 * to trigger element when closed. Follows ARIA authoring practices.
 *
 * @component
 * @example
 * ```tsx
 * <Modal
 *   isOpen={isModalOpen}
 *   onClose={() => setIsModalOpen(false)}
 *   title="Confirm Action"
 * >
 *   <p>Are you sure?</p>
 *   <button onClick={handleConfirm}>Yes</button>
 * </Modal>
 * ```
 */
export const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  id = 'modal',
}: ModalProps): ReactElement | null => {
  const titleId = `${id}-title`;

  /**
   * Close modal on ESC key press
   */
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  /**
   * Prevent body scroll when modal is open
   */
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <FocusTrap
      focusTrapOptions={{
        initialFocus: '#modal-close', // Focus close button first
        clickOutsideDeactivates: true, // Click outside closes modal
        escapeDeactivates: true, // ESC closes modal
        returnFocusOnDeactivate: true, // Restore focus to trigger
        onDeactivate: onClose,
      }}
    >
      <div className="modal-backdrop" onClick={onClose} aria-hidden="true">
        <div
          className="modal-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          onClick={(e) => e.stopPropagation()} // Prevent backdrop click
        >
          <div className="modal-header">
            <h2 id={titleId}>{title}</h2>
            <button
              id="modal-close"
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="close-button"
            >
              ✕
            </button>
          </div>

          <div className="modal-body">{children}</div>
        </div>
      </div>
    </FocusTrap>
  );
};
```

---

### focus-trap-react Options

```typescript
/**
 * Focus trap configuration options
 */
interface FocusTrapOptions {
  /**
   * Element or selector to receive initial focus
   * @default undefined (first tabbable element)
   */
  initialFocus?: string | HTMLElement | (() => HTMLElement);

  /**
   * Element or selector to fallback if initialFocus fails
   */
  fallbackFocus?: string | HTMLElement | (() => HTMLElement);

  /**
   * Allow clicking outside to deactivate trap
   * @default false
   */
  clickOutsideDeactivates?: boolean;

  /**
   * Allow ESC key to deactivate trap
   * @default true
   */
  escapeDeactivates?: boolean;

  /**
   * Return focus to trigger element on deactivate
   * @default true
   */
  returnFocusOnDeactivate?: boolean;

  /**
   * Set focus when trap is activated
   * @default true
   */
  setReturnFocus?: boolean;

  /**
   * Callback when trap is activated
   */
  onActivate?: () => void;

  /**
   * Callback when trap is deactivated
   */
  onDeactivate?: () => void;

  /**
   * Allow clicking on specific elements without deactivating
   */
  allowOutsideClick?: boolean | ((event: MouseEvent) => boolean);
}
```

---

### Advanced: Multiple Modals (Stacking)

```typescript
/**
 * @fileoverview Modal manager for stacked modals
 * @module components/ModalManager
 */

import { createContext, useContext, useState, type ReactElement } from 'react';

interface ModalContextType {
  activeModals: string[];
  openModal: (id: string) => void;
  closeModal: (id: string) => void;
  closeAllModals: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

/**
 * Hook to access modal manager
 */
export const useModalManager = (): ModalContextType => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModalManager must be used within ModalProvider');
  }
  return context;
};

/**
 * Provider for managing multiple stacked modals
 */
export const ModalProvider = ({
  children,
}: {
  children: React.ReactNode;
}): ReactElement => {
  const [activeModals, setActiveModals] = useState<string[]>([]);

  const openModal = (id: string): void => {
    setActiveModals((prev) => [...prev, id]);
  };

  const closeModal = (id: string): void => {
    setActiveModals((prev) => prev.filter((modalId) => modalId !== id));
  };

  const closeAllModals = (): void => {
    setActiveModals([]);
  };

  return (
    <ModalContext.Provider
      value={{ activeModals, openModal, closeModal, closeAllModals }}
    >
      {children}
    </ModalContext.Provider>
  );
};

/**
 * Managed modal component that integrates with ModalProvider
 */
interface ManagedModalProps extends Omit<ModalProps, 'isOpen' | 'onClose'> {
  /** Unique modal ID */
  modalId: string;
  /** Callback when modal closes */
  onClose?: () => void;
}

export const ManagedModal = ({
  modalId,
  onClose,
  ...props
}: ManagedModalProps): ReactElement | null => {
  const { activeModals, closeModal } = useModalManager();
  const isOpen = activeModals.includes(modalId);

  const handleClose = (): void => {
    closeModal(modalId);
    onClose?.();
  };

  return <Modal isOpen={isOpen} onClose={handleClose} {...props} />;
};
```

---

### Common Pitfalls

#### ❌ PITFALL #7: Not preventing body scroll

```typescript
// ❌ WRONG: Page scrolls behind modal
<FocusTrap>
  <div className="modal">
    {/* Modal content */}
  </div>
</FocusTrap>
```

**Solution:** Disable body scroll when modal opens

```typescript
// ✅ CORRECT: Prevent body scroll
useEffect(() => {
  if (isOpen) {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }
}, [isOpen]);
```

---

#### ❌ PITFALL #8: Backdrop click closes modal incorrectly

```typescript
// ❌ WRONG: Clicking modal content closes modal
<div className="modal-backdrop" onClick={onClose}>
  <div className="modal-dialog">
    {/* Clicks here also trigger onClose */}
  </div>
</div>
```

**Solution:** Stop propagation on modal content

```typescript
// ✅ CORRECT: Only backdrop clicks close modal
<div className="modal-backdrop" onClick={onClose}>
  <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
    {/* Clicks here don't trigger onClose */}
  </div>
</div>
```

---

#### ❌ PITFALL #9: Not handling initialFocus properly

```typescript
// ❌ WRONG: String selector may not exist yet
<FocusTrap focusTrapOptions={{ initialFocus: '#submit-button' }}>
  {/* Modal content rendered after trap activates */}
</FocusTrap>
```

**Solution:** Use function or fallback

```typescript
// ✅ CORRECT: Fallback if initialFocus fails
<FocusTrap
  focusTrapOptions={{
    initialFocus: '#submit-button',
    fallbackFocus: '#modal-close', // Always exists
  }}
>
  {/* Modal content */}
</FocusTrap>
```

---

## 5. Side-by-Side Comparison UI (Task 21)

### Overview

The History Comparison Modal displays two move histories side-by-side with divergence point highlighting.

**Requirements:**
- ✅ Two-column layout (yours vs opponent's)
- ✅ Highlight divergence point
- ✅ Synchronized scrolling (optional)
- ✅ Responsive design (stack on mobile)

---

### Side-by-Side Comparison Component

```typescript
/**
 * @fileoverview Side-by-side history comparison component
 * @module components/HistoryComparison
 */

import { useMemo, useRef, useEffect, type ReactElement } from 'react';
import type { GameHistory } from '@/lib/history/types';

interface HistoryComparisonProps {
  /** Your move history */
  myHistory: GameHistory;
  /** Opponent's move history */
  theirHistory: GameHistory;
  /** Whether to enable synchronized scrolling @default false */
  syncScroll?: boolean;
}

/**
 * Side-by-side history comparison component.
 *
 * Displays two move histories with divergence point highlighted.
 * Optionally synchronizes scrolling between columns.
 *
 * @component
 */
export const HistoryComparison = ({
  myHistory,
  theirHistory,
  syncScroll = false,
}: HistoryComparisonProps): ReactElement => {
  const leftColumnRef = useRef<HTMLDivElement>(null);
  const rightColumnRef = useRef<HTMLDivElement>(null);
  const divergenceRef = useRef<HTMLDivElement>(null);

  /**
   * Find index where histories diverge
   */
  const divergenceIndex = useMemo(() => {
    const minLength = Math.min(myHistory.length, theirHistory.length);

    for (let i = 0; i < minLength; i++) {
      if (myHistory[i]?.checksum !== theirHistory[i]?.checksum) {
        return i;
      }
    }

    // If all checksums match but lengths differ
    return minLength;
  }, [myHistory, theirHistory]);

  /**
   * Scroll to divergence point when component mounts
   */
  useEffect(() => {
    if (divergenceRef.current) {
      setTimeout(() => {
        divergenceRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }, 100);
    }
  }, []);

  /**
   * Synchronize scrolling between columns
   */
  useEffect(() => {
    if (!syncScroll) return;

    const leftColumn = leftColumnRef.current;
    const rightColumn = rightColumnRef.current;
    if (!leftColumn || !rightColumn) return;

    let isScrolling = false;

    const handleLeftScroll = (): void => {
      if (isScrolling) return;
      isScrolling = true;
      rightColumn.scrollTop = leftColumn.scrollTop;
      requestAnimationFrame(() => {
        isScrolling = false;
      });
    };

    const handleRightScroll = (): void => {
      if (isScrolling) return;
      isScrolling = true;
      leftColumn.scrollTop = rightColumn.scrollTop;
      requestAnimationFrame(() => {
        isScrolling = false;
      });
    };

    leftColumn.addEventListener('scroll', handleLeftScroll);
    rightColumn.addEventListener('scroll', handleRightScroll);

    return () => {
      leftColumn.removeEventListener('scroll', handleLeftScroll);
      rightColumn.removeEventListener('scroll', handleRightScroll);
    };
  }, [syncScroll]);

  /**
   * Render move entry with divergence indicator
   */
  const renderMoveEntry = (
    move: typeof myHistory[0],
    index: number,
    isDivergent: boolean
  ): ReactElement => (
    <div
      ref={index === divergenceIndex ? divergenceRef : null}
      className={`move-entry ${isDivergent ? 'divergent' : ''}`}
      key={index}
    >
      <span className="move-number">{move.moveNumber}.</span>
      <span className="move-notation">{move.notation}</span>
      <span className="move-checksum" title={move.checksum}>
        {move.checksum.slice(0, 6)}...
      </span>
    </div>
  );

  return (
    <div className="history-comparison">
      <div className="comparison-columns">
        {/* Your history */}
        <div className="comparison-column">
          <h3 className="column-header">Your History</h3>
          <div className="move-list" ref={leftColumnRef}>
            {myHistory.map((move, index) => {
              const isDivergent = index >= divergenceIndex;
              return renderMoveEntry(move, index, isDivergent);
            })}
            {myHistory.length === 0 && (
              <p className="empty-message">No moves yet</p>
            )}
          </div>
        </div>

        {/* Divergence indicator */}
        <div className="comparison-divider" aria-hidden="true">
          <div className="divergence-marker">
            <span className="icon">⚡</span>
            <span className="label">Diverged at move {divergenceIndex + 1}</span>
          </div>
        </div>

        {/* Opponent's history */}
        <div className="comparison-column">
          <h3 className="column-header">Opponent's History</h3>
          <div className="move-list" ref={rightColumnRef}>
            {theirHistory.map((move, index) => {
              const isDivergent = index >= divergenceIndex;
              return renderMoveEntry(move, index, isDivergent);
            })}
            {theirHistory.length === 0 && (
              <p className="empty-message">No moves yet</p>
            )}
          </div>
        </div>
      </div>

      <div className="comparison-summary">
        <p>
          Your history: <strong>{myHistory.length}</strong> moves
        </p>
        <p>
          Opponent's history: <strong>{theirHistory.length}</strong> moves
        </p>
        <p>
          Divergence at move: <strong>{divergenceIndex + 1}</strong>
        </p>
      </div>
    </div>
  );
};
```

---

### CSS Styling

```css
/**
 * History comparison styles
 */
.history-comparison {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
}

.comparison-columns {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 16px;
  align-items: start;
}

.comparison-column {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.column-header {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  padding: 8px 12px;
  background-color: var(--column-header-bg);
  border-radius: 4px;
  text-align: center;
}

.comparison-column .move-list {
  max-height: 400px;
  overflow-y: auto;
  padding: 8px;
  background-color: var(--list-bg);
  border: 1px solid var(--border-color);
  border-radius: 4px;
}

.comparison-column .move-entry {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 4px;
  transition: background-color 0.2s ease;
}

.comparison-column .move-entry:hover {
  background-color: var(--hover-bg);
}

.comparison-column .move-entry.divergent {
  background-color: var(--divergent-bg);
  border-left: 3px solid var(--error-color);
}

.move-checksum {
  margin-left: auto;
  font-family: 'Monaco', 'Courier New', monospace;
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.comparison-divider {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px 0;
  position: relative;
}

.comparison-divider::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  width: 2px;
  background: linear-gradient(
    to bottom,
    var(--border-color) 0%,
    var(--error-color) 40%,
    var(--error-color) 60%,
    var(--border-color) 100%
  );
}

.divergence-marker {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background-color: var(--modal-bg);
  border: 2px solid var(--error-color);
  border-radius: 8px;
}

.divergence-marker .icon {
  font-size: 2rem;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.7;
    transform: scale(1.1);
  }
}

.divergence-marker .label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--error-color);
  text-align: center;
  white-space: nowrap;
}

.comparison-summary {
  display: flex;
  justify-content: space-around;
  padding: 12px;
  background-color: var(--summary-bg);
  border-radius: 4px;
  font-size: 0.875rem;
}

.comparison-summary p {
  margin: 0;
}

.empty-message {
  text-align: center;
  padding: 24px;
  color: var(--text-secondary);
  font-style: italic;
}

/* Responsive: stack on mobile */
@media (max-width: 768px) {
  .comparison-columns {
    grid-template-columns: 1fr;
  }

  .comparison-divider {
    padding: 16px 0;
  }

  .comparison-divider::before {
    top: 0;
    bottom: auto;
    left: 0;
    right: 0;
    width: 100%;
    height: 2px;
  }

  .divergence-marker {
    flex-direction: row;
  }

  .divergence-marker .label {
    white-space: normal;
  }
}
```

---

### Common Pitfalls

#### ❌ PITFALL #10: Synchronized scrolling creates infinite loop

```typescript
// ❌ WRONG: Infinite scroll loop
const handleLeftScroll = (): void => {
  rightColumn.scrollTop = leftColumn.scrollTop; // Triggers right scroll
};

const handleRightScroll = (): void => {
  leftColumn.scrollTop = rightColumn.scrollTop; // Triggers left scroll
};
```

**Solution:** Use debouncing flag

```typescript
// ✅ CORRECT: Prevent infinite loop
let isScrolling = false;

const handleLeftScroll = (): void => {
  if (isScrolling) return;
  isScrolling = true;
  rightColumn.scrollTop = leftColumn.scrollTop;
  requestAnimationFrame(() => {
    isScrolling = false;
  });
};
```

---

## 6. Button Action Handlers (Tasks 22-23)

### Overview

The History Comparison Modal has four action buttons with specific behaviors:
1. **Send My State** - Generate and copy full_state URL
2. **Accept Their State** - Replace local state with opponent's
3. **Review** - Show detailed comparison (future: board view)
4. **Cancel** - Close modal without action

**Requirements:**
- ✅ Button group patterns
- ✅ Disabled states during actions
- ✅ Loading indicators
- ✅ Success/error feedback

---

### Button Action Handlers Component

```typescript
/**
 * @fileoverview History Comparison Modal with action handlers
 * @module components/HistoryComparisonModal
 */

import { useState, type ReactElement } from 'react';
import FocusTrap from 'focus-trap-react';
import { HistoryComparison } from './HistoryComparison';
import { buildFullStateUrl } from '@/lib/urlEncoding/urlBuilder';
import type { GameState } from '@/lib/validation/schemas';
import type { GameHistory } from '@/lib/history/types';

interface HistoryComparisonModalProps {
  /** Whether modal is open */
  isOpen: boolean;
  /** Callback to close modal */
  onClose: () => void;
  /** Your game state */
  myState: GameState;
  /** Your move history */
  myHistory: GameHistory;
  /** Opponent's move history (from resync_request payload) */
  theirHistory: GameHistory;
  /** Callback to replace state with opponent's */
  onAcceptTheirState: (state: GameState) => void;
}

/**
 * History Comparison Modal with action handlers.
 *
 * Shows side-by-side history comparison and provides four actions
 * to resolve divergence: Send My State, Accept Their State, Review, Cancel.
 *
 * @component
 */
export const HistoryComparisonModal = ({
  isOpen,
  onClose,
  myState,
  myHistory,
  theirHistory,
  onAcceptTheirState,
}: HistoryComparisonModalProps): ReactElement | null => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionStatus, setActionStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  /**
   * Handle "Send My State" action
   * Generates full_state URL and copies to clipboard
   */
  const handleSendMyState = async (): Promise<void> => {
    setIsProcessing(true);
    setActionStatus(null);

    try {
      // Generate full_state URL
      const url = buildFullStateUrl(myState, myState.whitePlayer.name);
      const fullUrl = `${window.location.origin}${window.location.pathname}#${url}`;

      // Copy to clipboard
      await navigator.clipboard.writeText(fullUrl);

      setActionStatus({
        type: 'success',
        message: 'Full state URL copied! Send to your opponent.',
      });

      // Auto-close after success
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Failed to send state:', error);
      setActionStatus({
        type: 'error',
        message: 'Failed to copy URL. Please try again.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Handle "Accept Their State" action
   * Replaces local state with opponent's state
   */
  const handleAcceptTheirState = (): void => {
    setIsProcessing(true);
    setActionStatus(null);

    try {
      // TODO: Reconstruct GameState from theirHistory
      // For now, this is a placeholder
      // const reconstructedState = reconstructStateFromHistory(theirHistory);
      // onAcceptTheirState(reconstructedState);

      setActionStatus({
        type: 'success',
        message: 'State accepted. Reloading game...',
      });

      // Reload game after short delay
      setTimeout(() => {
        onClose();
        // Trigger full page reload or state reset
      }, 1500);
    } catch (error) {
      console.error('Failed to accept state:', error);
      setActionStatus({
        type: 'error',
        message: 'Failed to apply opponent state. Please try again.',
      });
      setIsProcessing(false);
    }
  };

  /**
   * Handle "Review" action
   * Shows detailed comparison (future: board view)
   */
  const handleReview = (): void => {
    // TODO: Implement detailed review view
    // For Phase 3, just show alert
    alert('Detailed review coming in Phase 6!');
  };

  if (!isOpen) return null;

  return (
    <FocusTrap
      focusTrapOptions={{
        initialFocus: '#modal-close',
        clickOutsideDeactivates: true,
        escapeDeactivates: true,
        onDeactivate: onClose,
      }}
    >
      <div className="modal-backdrop" onClick={onClose}>
        <div
          className="modal-dialog comparison-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-header">
            <h2 id="modal-title">Timeline Divergence Detected</h2>
            <button
              id="modal-close"
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="close-button"
            >
              ✕
            </button>
          </div>

          <div className="modal-body">
            <p className="divergence-message">
              Your game state and your opponent's state have diverged.
              Choose how to resolve this:
            </p>

            <HistoryComparison
              myHistory={myHistory}
              theirHistory={theirHistory}
            />

            {actionStatus && (
              <div
                className={`action-status status-${actionStatus.type}`}
                role="alert"
                aria-live="polite"
              >
                {actionStatus.message}
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button
              type="button"
              onClick={handleSendMyState}
              disabled={isProcessing}
              className="btn-primary"
            >
              {isProcessing ? (
                <>
                  <span className="spinner" aria-hidden="true" />
                  Sending...
                </>
              ) : (
                'Send My State'
              )}
            </button>

            <button
              type="button"
              onClick={handleAcceptTheirState}
              disabled={isProcessing}
              className="btn-primary"
            >
              {isProcessing ? (
                <>
                  <span className="spinner" aria-hidden="true" />
                  Accepting...
                </>
              ) : (
                'Accept Their State'
              )}
            </button>

            <button
              type="button"
              onClick={handleReview}
              disabled={isProcessing}
              className="btn-secondary"
            >
              Review Details
            </button>

            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="btn-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </FocusTrap>
  );
};
```

---

### CSS Styling

```css
/**
 * Button group styles
 */
.modal-footer {
  display: flex;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid var(--border-color);
  justify-content: flex-end;
  flex-wrap: wrap;
}

.btn-primary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background-color: var(--primary-color);
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s ease, opacity 0.2s ease;
  min-width: 120px;
  justify-content: center;
}

.btn-primary:hover:not(:disabled) {
  background-color: var(--primary-color-hover);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary:focus {
  outline: 2px solid var(--focus-color);
  outline-offset: 2px;
}

.btn-secondary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background-color: transparent;
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s ease, border-color 0.2s ease;
  min-width: 120px;
  justify-content: center;
}

.btn-secondary:hover:not(:disabled) {
  background-color: var(--hover-bg);
  border-color: var(--primary-color);
}

.btn-secondary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary:focus {
  outline: 2px solid var(--focus-color);
  outline-offset: 2px;
}

/**
 * Action status styles
 */
.action-status {
  margin-top: 16px;
  padding: 12px 16px;
  border-radius: 4px;
  font-size: 0.875rem;
  text-align: center;
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.status-success {
  background-color: var(--success-bg);
  color: var(--success-text);
  border: 1px solid var(--success-border);
}

.status-error {
  background-color: var(--error-bg);
  color: var(--error-text);
  border: 1px solid var(--error-border);
}

/* Responsive: stack buttons on mobile */
@media (max-width: 768px) {
  .modal-footer {
    flex-direction: column;
  }

  .btn-primary,
  .btn-secondary {
    width: 100%;
  }
}
```

---

### Common Pitfalls

#### ❌ PITFALL #11: Not disabling buttons during async operations

```typescript
// ❌ WRONG: User can click multiple times
<button onClick={handleSendMyState}>
  Send My State
</button>
```

**Solution:** Disable during processing

```typescript
// ✅ CORRECT: Prevent duplicate actions
<button
  onClick={handleSendMyState}
  disabled={isProcessing}
>
  {isProcessing ? 'Sending...' : 'Send My State'}
</button>
```

---

#### ❌ PITFALL #12: Not handling clipboard API failures

```typescript
// ❌ WRONG: Assumes clipboard API always works
await navigator.clipboard.writeText(url);
showSuccess('URL copied!');
```

**Solution:** Handle failures gracefully

```typescript
// ✅ CORRECT: Fallback for clipboard failures
try {
  await navigator.clipboard.writeText(url);
  showSuccess('URL copied!');
} catch (error) {
  // Fallback: Show URL in modal for manual copy
  showModal({
    title: 'Copy URL',
    content: <input value={url} readOnly onFocus={(e) => e.target.select()} />,
  });
}
```

---

## 7. React Testing Library Patterns (Tasks 19, 24)

### Overview

Comprehensive testing patterns for History Viewer and History Comparison Modal components using React Testing Library.

**Key Principles:**
- ✅ Test user behavior, not implementation
- ✅ Use accessible queries (getByRole, getByLabelText)
- ✅ Test keyboard interactions
- ✅ Mock browser APIs (Blob, clipboard)
- ✅ Test focus trap behavior

---

### Testing Collapsible Components

```typescript
/**
 * @fileoverview Tests for HistoryViewer component
 * @module components/__tests__/HistoryViewer.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HistoryViewer } from '../HistoryViewer';
import type { GameHistory } from '@/lib/history/types';

describe('HistoryViewer', () => {
  let mockHistory: GameHistory;
  let mockOnJumpToMove: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockHistory = [
      {
        moveNumber: 1,
        player: 'white',
        from: [2, 0],
        to: [1, 0],
        piece: { type: 'rook', owner: 'white' },
        captured: null,
        checksum: 'abc123',
        timestamp: Date.now(),
        synced: true,
      },
      {
        moveNumber: 2,
        player: 'black',
        from: [0, 2],
        to: [1, 2],
        piece: { type: 'queen', owner: 'black' },
        captured: null,
        checksum: 'def456',
        timestamp: Date.now(),
        synced: true,
      },
    ];

    mockOnJumpToMove = vi.fn();
  });

  describe('Expand/Collapse', () => {
    it('should start expanded by default', () => {
      render(
        <HistoryViewer
          history={mockHistory}
          currentMoveIndex={0}
          onJumpToMove={mockOnJumpToMove}
        />
      );

      const header = screen.getByRole('button', { name: /move history/i });
      expect(header).toHaveAttribute('aria-expanded', 'true');
    });

    it('should collapse when header is clicked', async () => {
      const user = userEvent.setup();

      render(
        <HistoryViewer
          history={mockHistory}
          currentMoveIndex={0}
          onJumpToMove={mockOnJumpToMove}
        />
      );

      const header = screen.getByRole('button', { name: /move history/i });

      await user.click(header);

      expect(header).toHaveAttribute('aria-expanded', 'false');

      // Content should be hidden
      const content = screen.getByLabelText(/move history/i);
      expect(content).toHaveAttribute('hidden');
    });

    it('should expand when collapsed header is clicked', async () => {
      const user = userEvent.setup();

      render(
        <HistoryViewer
          history={mockHistory}
          currentMoveIndex={0}
          onJumpToMove={mockOnJumpToMove}
        />
      );

      const header = screen.getByRole('button', { name: /move history/i });

      // Collapse
      await user.click(header);
      expect(header).toHaveAttribute('aria-expanded', 'false');

      // Expand
      await user.click(header);
      expect(header).toHaveAttribute('aria-expanded', 'true');
    });

    it('should toggle on Enter key', async () => {
      const user = userEvent.setup();

      render(
        <HistoryViewer
          history={mockHistory}
          currentMoveIndex={0}
          onJumpToMove={mockOnJumpToMove}
        />
      );

      const header = screen.getByRole('button', { name: /move history/i });
      header.focus();

      await user.keyboard('{Enter}');
      expect(header).toHaveAttribute('aria-expanded', 'false');

      await user.keyboard('{Enter}');
      expect(header).toHaveAttribute('aria-expanded', 'true');
    });

    it('should toggle on Space key', async () => {
      const user = userEvent.setup();

      render(
        <HistoryViewer
          history={mockHistory}
          currentMoveIndex={0}
          onJumpToMove={mockOnJumpToMove}
        />
      );

      const header = screen.getByRole('button', { name: /move history/i });
      header.focus();

      await user.keyboard('{ }'); // Space key
      expect(header).toHaveAttribute('aria-expanded', 'false');
    });
  });

  describe('Move List Display', () => {
    it('should display all moves', () => {
      render(
        <HistoryViewer
          history={mockHistory}
          currentMoveIndex={0}
          onJumpToMove={mockOnJumpToMove}
        />
      );

      expect(screen.getByText('1.')).toBeInTheDocument();
      expect(screen.getByText('2.')).toBeInTheDocument();
    });

    it('should show sync indicators for synced moves', () => {
      render(
        <HistoryViewer
          history={mockHistory}
          currentMoveIndex={0}
          onJumpToMove={mockOnJumpToMove}
        />
      );

      const syncIndicators = screen.getAllByLabelText(/synced/i);
      expect(syncIndicators).toHaveLength(2);
    });

    it('should highlight current move', () => {
      render(
        <HistoryViewer
          history={mockHistory}
          currentMoveIndex={1}
          onJumpToMove={mockOnJumpToMove}
        />
      );

      const moveEntries = screen.getAllByRole('listitem');
      expect(moveEntries[1]).toHaveClass('current');
    });

    it('should call onJumpToMove when move is clicked', async () => {
      const user = userEvent.setup();

      render(
        <HistoryViewer
          history={mockHistory}
          currentMoveIndex={0}
          onJumpToMove={mockOnJumpToMove}
        />
      );

      const moveButton = screen.getByRole('button', { name: /jump to move 2/i });
      await user.click(moveButton);

      expect(mockOnJumpToMove).toHaveBeenCalledWith(1);
    });
  });

  describe('Auto-scroll', () => {
    it('should scroll current move into view', () => {
      const mockScrollIntoView = vi.fn();
      HTMLElement.prototype.scrollIntoView = mockScrollIntoView;

      const { rerender } = render(
        <HistoryViewer
          history={mockHistory}
          currentMoveIndex={0}
          onJumpToMove={mockOnJumpToMove}
        />
      );

      // Change current move
      rerender(
        <HistoryViewer
          history={mockHistory}
          currentMoveIndex={1}
          onJumpToMove={mockOnJumpToMove}
        />
      );

      expect(mockScrollIntoView).toHaveBeenCalledWith({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest',
      });
    });
  });
});
```

---

### Testing Modals with Focus Trap

```typescript
/**
 * @fileoverview Tests for HistoryComparisonModal component
 * @module components/__tests__/HistoryComparisonModal.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HistoryComparisonModal } from '../HistoryComparisonModal';
import type { GameState } from '@/lib/validation/schemas';
import type { GameHistory } from '@/lib/history/types';

describe('HistoryComparisonModal', () => {
  let mockMyState: GameState;
  let mockMyHistory: GameHistory;
  let mockTheirHistory: GameHistory;
  let mockOnClose: ReturnType<typeof vi.fn>;
  let mockOnAcceptTheirState: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Setup mock data
    mockMyState = {
      // ... (full GameState object)
    } as GameState;

    mockMyHistory = [
      // ... (mock history)
    ];

    mockTheirHistory = [
      // ... (mock history with divergence)
    ];

    mockOnClose = vi.fn();
    mockOnAcceptTheirState = vi.fn();
  });

  describe('Modal Visibility', () => {
    it('should render when isOpen is true', () => {
      render(
        <HistoryComparisonModal
          isOpen={true}
          onClose={mockOnClose}
          myState={mockMyState}
          myHistory={mockMyHistory}
          theirHistory={mockTheirHistory}
          onAcceptTheirState={mockOnAcceptTheirState}
        />
      );

      expect(
        screen.getByRole('dialog', { name: /timeline divergence/i })
      ).toBeInTheDocument();
    });

    it('should not render when isOpen is false', () => {
      render(
        <HistoryComparisonModal
          isOpen={false}
          onClose={mockOnClose}
          myState={mockMyState}
          myHistory={mockMyHistory}
          theirHistory={mockTheirHistory}
          onAcceptTheirState={mockOnAcceptTheirState}
        />
      );

      expect(
        screen.queryByRole('dialog', { name: /timeline divergence/i })
      ).not.toBeInTheDocument();
    });
  });

  describe('Modal Accessibility', () => {
    it('should have aria-modal="true"', () => {
      render(
        <HistoryComparisonModal
          isOpen={true}
          onClose={mockOnClose}
          myState={mockMyState}
          myHistory={mockMyHistory}
          theirHistory={mockTheirHistory}
          onAcceptTheirState={mockOnAcceptTheirState}
        />
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('should focus close button initially', async () => {
      render(
        <HistoryComparisonModal
          isOpen={true}
          onClose={mockOnClose}
          myState={mockMyState}
          myHistory={mockMyHistory}
          theirHistory={mockTheirHistory}
          onAcceptTheirState={mockOnAcceptTheirState}
        />
      );

      await waitFor(() => {
        const closeButton = screen.getByLabelText(/close modal/i);
        expect(closeButton).toHaveFocus();
      });
    });

    it('should trap focus within modal', async () => {
      const user = userEvent.setup();

      render(
        <HistoryComparisonModal
          isOpen={true}
          onClose={mockOnClose}
          myState={mockMyState}
          myHistory={mockMyHistory}
          theirHistory={mockTheirHistory}
          onAcceptTheirState={mockOnAcceptTheirState}
        />
      );

      const closeButton = screen.getByLabelText(/close modal/i);
      const actionButtons = screen.getAllByRole('button');
      const lastButton = actionButtons[actionButtons.length - 1];

      // Tab through all buttons
      lastButton?.focus();

      await user.keyboard('{Tab}');

      // Should cycle back to close button
      expect(closeButton).toHaveFocus();
    });

    it('should close on ESC key', async () => {
      const user = userEvent.setup();

      render(
        <HistoryComparisonModal
          isOpen={true}
          onClose={mockOnClose}
          myState={mockMyState}
          myHistory={mockMyHistory}
          theirHistory={mockTheirHistory}
          onAcceptTheirState={mockOnAcceptTheirState}
        />
      );

      await user.keyboard('{Escape}');

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should close on backdrop click', async () => {
      const user = userEvent.setup();

      render(
        <HistoryComparisonModal
          isOpen={true}
          onClose={mockOnClose}
          myState={mockMyState}
          myHistory={mockMyHistory}
          theirHistory={mockTheirHistory}
          onAcceptTheirState={mockOnAcceptTheirState}
        />
      );

      const backdrop = screen.getByRole('dialog').parentElement;
      if (backdrop) {
        await user.click(backdrop);
        expect(mockOnClose).toHaveBeenCalled();
      }
    });

    it('should NOT close on dialog click', async () => {
      const user = userEvent.setup();

      render(
        <HistoryComparisonModal
          isOpen={true}
          onClose={mockOnClose}
          myState={mockMyState}
          myHistory={mockMyHistory}
          theirHistory={mockTheirHistory}
          onAcceptTheirState={mockOnAcceptTheirState}
        />
      );

      const dialog = screen.getByRole('dialog');
      await user.click(dialog);

      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('Action Buttons', () => {
    it('should render all four action buttons', () => {
      render(
        <HistoryComparisonModal
          isOpen={true}
          onClose={mockOnClose}
          myState={mockMyState}
          myHistory={mockMyHistory}
          theirHistory={mockTheirHistory}
          onAcceptTheirState={mockOnAcceptTheirState}
        />
      );

      expect(
        screen.getByRole('button', { name: /send my state/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /accept their state/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /review/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /cancel/i })
      ).toBeInTheDocument();
    });

    it('should disable buttons during processing', async () => {
      const user = userEvent.setup();

      // Mock clipboard API
      Object.assign(navigator, {
        clipboard: {
          writeText: vi.fn().mockResolvedValue(undefined),
        },
      });

      render(
        <HistoryComparisonModal
          isOpen={true}
          onClose={mockOnClose}
          myState={mockMyState}
          myHistory={mockMyHistory}
          theirHistory={mockTheirHistory}
          onAcceptTheirState={mockOnAcceptTheirState}
        />
      );

      const sendButton = screen.getByRole('button', { name: /send my state/i });

      await user.click(sendButton);

      // Button should be disabled during processing
      expect(sendButton).toBeDisabled();
    });

    it('should show loading state during action', async () => {
      const user = userEvent.setup();

      // Mock clipboard API with delay
      Object.assign(navigator, {
        clipboard: {
          writeText: vi.fn().mockImplementation(() =>
            new Promise((resolve) => setTimeout(resolve, 100))
          ),
        },
      });

      render(
        <HistoryComparisonModal
          isOpen={true}
          onClose={mockOnClose}
          myState={mockMyState}
          myHistory={mockMyHistory}
          theirHistory={mockTheirHistory}
          onAcceptTheirState={mockOnAcceptTheirState}
        />
      );

      const sendButton = screen.getByRole('button', { name: /send my state/i });

      await user.click(sendButton);

      // Should show loading text
      expect(screen.getByText(/sending/i)).toBeInTheDocument();
    });
  });

  describe('Send My State Action', () => {
    it('should copy URL to clipboard', async () => {
      const user = userEvent.setup();

      const mockWriteText = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: { writeText: mockWriteText },
      });

      render(
        <HistoryComparisonModal
          isOpen={true}
          onClose={mockOnClose}
          myState={mockMyState}
          myHistory={mockMyHistory}
          theirHistory={mockTheirHistory}
          onAcceptTheirState={mockOnAcceptTheirState}
        />
      );

      const sendButton = screen.getByRole('button', { name: /send my state/i });
      await user.click(sendButton);

      await waitFor(() => {
        expect(mockWriteText).toHaveBeenCalledWith(
          expect.stringContaining('#')
        );
      });
    });

    it('should show success message after copying', async () => {
      const user = userEvent.setup();

      Object.assign(navigator, {
        clipboard: {
          writeText: vi.fn().mockResolvedValue(undefined),
        },
      });

      render(
        <HistoryComparisonModal
          isOpen={true}
          onClose={mockOnClose}
          myState={mockMyState}
          myHistory={mockMyHistory}
          theirHistory={mockTheirHistory}
          onAcceptTheirState={mockOnAcceptTheirState}
        />
      );

      const sendButton = screen.getByRole('button', { name: /send my state/i });
      await user.click(sendButton);

      await waitFor(() => {
        expect(
          screen.getByText(/full state url copied/i)
        ).toBeInTheDocument();
      });
    });

    it('should handle clipboard API failure', async () => {
      const user = userEvent.setup();

      Object.assign(navigator, {
        clipboard: {
          writeText: vi.fn().mockRejectedValue(new Error('Clipboard error')),
        },
      });

      render(
        <HistoryComparisonModal
          isOpen={true}
          onClose={mockOnClose}
          myState={mockMyState}
          myHistory={mockMyHistory}
          theirHistory={mockTheirHistory}
          onAcceptTheirState={mockOnAcceptTheirState}
        />
      );

      const sendButton = screen.getByRole('button', { name: /send my state/i });
      await user.click(sendButton);

      await waitFor(() => {
        expect(
          screen.getByText(/failed to copy url/i)
        ).toBeInTheDocument();
      });
    });
  });
});
```

---

### Testing JSON Export

```typescript
/**
 * @fileoverview Tests for JSON export functionality
 * @module lib/export/__tests__/jsonExport.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { exportGameAsJSON } from '../jsonExport';
import type { GameState } from '@/lib/validation/schemas';
import type { GameHistory } from '@/lib/history/types';

describe('exportGameAsJSON', () => {
  let mockGameState: GameState;
  let mockHistory: GameHistory;
  let mockCreateElement: ReturnType<typeof vi.fn>;
  let mockClick: ReturnType<typeof vi.fn>;
  let mockAppendChild: ReturnType<typeof vi.fn>;
  let mockRemoveChild: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockGameState = {
      // ... (full GameState)
    } as GameState;

    mockHistory = [
      // ... (mock history)
    ];

    // Mock DOM methods
    mockClick = vi.fn();
    mockAppendChild = vi.fn();
    mockRemoveChild = vi.fn();

    mockCreateElement = vi.fn(() => ({
      click: mockClick,
      href: '',
      download: '',
    }));

    document.createElement = mockCreateElement as unknown as typeof document.createElement;
    document.body.appendChild = mockAppendChild;
    document.body.removeChild = mockRemoveChild;

    // Mock URL.createObjectURL
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    globalThis.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create blob with correct MIME type', () => {
    const mockBlob = vi.fn();
    globalThis.Blob = mockBlob as unknown as typeof Blob;

    exportGameAsJSON(mockGameState, mockHistory);

    expect(mockBlob).toHaveBeenCalledWith(
      [expect.any(String)],
      { type: 'application/json;charset=utf-8' }
    );
  });

  it('should generate filename with timestamp', () => {
    const link = { href: '', download: '', click: mockClick };
    mockCreateElement.mockReturnValue(link);

    exportGameAsJSON(mockGameState, mockHistory);

    expect(link.download).toMatch(/^kings-cooking-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.json$/);
  });

  it('should trigger download', () => {
    exportGameAsJSON(mockGameState, mockHistory);

    expect(mockAppendChild).toHaveBeenCalled();
    expect(mockClick).toHaveBeenCalled();
    expect(mockRemoveChild).toHaveBeenCalled();
  });

  it('should revoke object URL after download', () => {
    exportGameAsJSON(mockGameState, mockHistory);

    expect(globalThis.URL.revokeObjectURL).toHaveBeenCalled();
  });

  it('should return true on success', () => {
    const result = exportGameAsJSON(mockGameState, mockHistory);

    expect(result).toBe(true);
  });

  it('should return false on error', () => {
    // Cause error by making JSON.stringify fail
    const circularRef: Record<string, unknown> = {};
    circularRef.self = circularRef;

    const result = exportGameAsJSON(circularRef as GameState, mockHistory);

    expect(result).toBe(false);
  });

  it('should include all required fields in export', () => {
    let capturedJson = '';
    globalThis.Blob = vi.fn((content) => {
      capturedJson = content[0] as string;
      return {} as Blob;
    }) as unknown as typeof Blob;

    exportGameAsJSON(mockGameState, mockHistory);

    const exported = JSON.parse(capturedJson);
    expect(exported).toHaveProperty('version');
    expect(exported).toHaveProperty('exportDate');
    expect(exported).toHaveProperty('gameId');
    expect(exported).toHaveProperty('players');
    expect(exported).toHaveProperty('moveHistory');
    expect(exported).toHaveProperty('finalState');
  });
});
```

---

### Common Testing Pitfalls

#### ❌ PITFALL #13: Not using accessible queries

```typescript
// ❌ WRONG: Fragile, not accessible
const button = container.querySelector('.btn-primary');
```

**Solution:** Use accessible queries

```typescript
// ✅ CORRECT: Accessible and robust
const button = screen.getByRole('button', { name: /send my state/i });
```

---

#### ❌ PITFALL #14: Not waiting for async operations

```typescript
// ❌ WRONG: Assertion runs before async operation completes
await user.click(button);
expect(mockOnClose).toHaveBeenCalled(); // May fail
```

**Solution:** Use waitFor

```typescript
// ✅ CORRECT: Wait for async operation
await user.click(button);

await waitFor(() => {
  expect(mockOnClose).toHaveBeenCalled();
});
```

---

#### ❌ PITFALL #15: Not mocking browser APIs

```typescript
// ❌ WRONG: Test fails because clipboard API doesn't exist in test environment
await user.click(exportButton);
// navigator.clipboard.writeText is undefined
```

**Solution:** Mock browser APIs

```typescript
// ✅ CORRECT: Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined),
  },
});

await user.click(exportButton);
expect(navigator.clipboard.writeText).toHaveBeenCalled();
```

---

## 8. Complete Code Templates

### Full History Viewer Component

```typescript
/**
 * @fileoverview Complete History Viewer component
 * @module components/HistoryViewer
 */

import { useState, useRef, useEffect, type ReactElement } from 'react';
import { exportGameAsJSON } from '@/lib/export/jsonExport';
import type { GameState } from '@/lib/validation/schemas';
import type { GameHistory, MoveHistoryEntry } from '@/lib/history/types';

interface HistoryViewerProps {
  /** Current game state */
  gameState: GameState;
  /** Complete game history */
  history: GameHistory;
  /** Index of current move for highlighting */
  currentMoveIndex: number;
  /** Callback when move is selected */
  onJumpToMove?: (index: number) => void;
  /** Success toast callback */
  onExportSuccess?: () => void;
  /** Error toast callback */
  onExportError?: (error: string) => void;
}

/**
 * History Viewer component with export functionality.
 *
 * Displays move history with sync status, supports jump-to-move,
 * and exports game as JSON. Always visible during gameplay.
 *
 * @component
 * @example
 * ```tsx
 * <HistoryViewer
 *   gameState={currentGameState}
 *   history={moveHistory}
 *   currentMoveIndex={5}
 *   onJumpToMove={(index) => replayToMove(index)}
 *   onExportSuccess={() => showToast('Export successful!')}
 * />
 * ```
 */
export const HistoryViewer = ({
  gameState,
  history,
  currentMoveIndex,
  onJumpToMove,
  onExportSuccess,
  onExportError,
}: HistoryViewerProps): ReactElement => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showFullHistory, setShowFullHistory] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const currentMoveRef = useRef<HTMLDivElement>(null);

  /**
   * Auto-scroll to current move when it changes
   */
  useEffect(() => {
    if (currentMoveRef.current && isExpanded) {
      currentMoveRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest',
      });
    }
  }, [currentMoveIndex, isExpanded]);

  /**
   * Format position for display
   */
  const formatPosition = (pos: [number, number] | 'off_board'): string => {
    if (pos === 'off_board') return 'Off Board';
    const [row, col] = pos;
    const colLetter = String.fromCharCode(65 + col);
    return `${colLetter}${row + 1}`;
  };

  /**
   * Handle export JSON button click
   */
  const handleExport = async (): Promise<void> => {
    setIsExporting(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 100));

      const success = exportGameAsJSON(gameState, history);

      if (success) {
        onExportSuccess?.();
      } else {
        onExportError?.('Failed to export game. Please try again.');
      }
    } catch (error) {
      console.error('Export error:', error);
      onExportError?.(
        error instanceof Error ? error.message : 'An unexpected error occurred'
      );
    } finally {
      setIsExporting(false);
    }
  };

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setIsExpanded(!isExpanded);
    }
  };

  const displayedMoves = showFullHistory ? history : history.slice(-10);

  return (
    <div className="history-viewer">
      <button
        type="button"
        className="panel-header"
        aria-expanded={isExpanded}
        aria-controls="history-content"
        onClick={() => setIsExpanded(!isExpanded)}
        onKeyDown={handleKeyDown}
      >
        <h2 id="history-title">Move History</h2>
        <span aria-hidden="true" className="expand-icon">
          {isExpanded ? '▼' : '▶'}
        </span>
      </button>

      <div
        id="history-content"
        hidden={!isExpanded}
        aria-labelledby="history-title"
        className={`history-panel ${isExpanded ? 'expanded' : 'collapsed'}`}
      >
        <div className="move-list" role="log" aria-live="polite">
          {displayedMoves.length === 0 ? (
            <p className="empty-message">No moves yet</p>
          ) : (
            displayedMoves.map((move, index) => {
              // Calculate actual index in full history
              const actualIndex = showFullHistory
                ? index
                : history.length - 10 + index;

              return (
                <div
                  key={actualIndex}
                  ref={actualIndex === currentMoveIndex ? currentMoveRef : null}
                  className={`move-entry ${
                    actualIndex === currentMoveIndex ? 'current' : ''
                  }`}
                  role="listitem"
                >
                  <span className="move-number">{move.moveNumber}.</span>
                  {onJumpToMove ? (
                    <button
                      type="button"
                      onClick={() => onJumpToMove(actualIndex)}
                      className="move-button"
                      aria-label={`Jump to move ${move.moveNumber}`}
                      aria-current={
                        actualIndex === currentMoveIndex ? 'step' : undefined
                      }
                    >
                      <span className="move-notation">
                        {formatPosition(move.from)} → {formatPosition(move.to)}
                      </span>
                    </button>
                  ) : (
                    <span className="move-notation">
                      {formatPosition(move.from)} → {formatPosition(move.to)}
                    </span>
                  )}
                  {move.synced && (
                    <span
                      className="sync-indicator"
                      aria-label="Move synced"
                      title="This move was successfully shared via URL"
                    >
                      ✓
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="history-actions">
          {!showFullHistory && history.length > 10 && (
            <button
              type="button"
              onClick={() => setShowFullHistory(true)}
              className="btn-show-full"
            >
              Show Full History ({history.length} moves)
            </button>
          )}
          {showFullHistory && (
            <button
              type="button"
              onClick={() => setShowFullHistory(false)}
              className="btn-show-full"
            >
              Show Last 10 Moves
            </button>
          )}
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting || history.length === 0}
            className="btn-export"
            aria-label="Export game as JSON"
          >
            {isExporting ? (
              <>
                <span className="spinner" aria-hidden="true" />
                Exporting...
              </>
            ) : (
              <>
                <span className="icon" aria-hidden="true">
                  📥
                </span>
                Export JSON
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
```

---

## 9. Common Pitfalls & Solutions

### Summary of All Pitfalls

| # | Pitfall | Solution |
|---|---------|----------|
| 1 | Using max-height with large values | Use reasonable max-height or CSS Grid |
| 2 | Not preventing Space key scroll | Prevent default on Space key |
| 3 | scrollIntoView scrolls entire page | Use `block: 'nearest'` |
| 4 | Not using aria-current for current move | Add `aria-current="step"` |
| 5 | Not revoking object URLs | Always call `URL.revokeObjectURL()` |
| 6 | Not appending link to body (Firefox) | Append before click, remove after |
| 7 | Not preventing body scroll | Set `body { overflow: hidden }` |
| 8 | Backdrop click closes modal incorrectly | Stop propagation on modal content |
| 9 | Not handling initialFocus properly | Use fallback focus option |
| 10 | Synchronized scrolling creates infinite loop | Use debouncing flag |
| 11 | Not disabling buttons during async | Disable with `isProcessing` state |
| 12 | Not handling clipboard API failures | Try/catch with fallback |
| 13 | Not using accessible queries | Use `getByRole`, `getByLabelText` |
| 14 | Not waiting for async operations | Use `waitFor` from Testing Library |
| 15 | Not mocking browser APIs | Mock `navigator.clipboard`, `Blob`, etc. |

---

## Conclusion

This research document provides comprehensive patterns for implementing the History Viewer UI and History Comparison Modal in Phase 3. All code examples follow React 19 standards, strict TypeScript requirements, and accessibility best practices.

**Key Takeaways:**

1. **Accessibility First** - ARIA attributes, keyboard navigation, and focus management are non-negotiable
2. **Test User Behavior** - Use React Testing Library's accessible queries and test real user interactions
3. **Handle Edge Cases** - Browser API failures, async operations, and focus trap edge cases must be handled
4. **Performance Matters** - Debounce URL updates, use reasonable CSS transitions, prevent infinite loops
5. **Documentation Required** - JSDoc on all components and functions with examples

**Next Steps:**

1. Use these patterns to implement Tasks 15-24
2. Run validation loop after each task (type-check → lint → test)
3. Achieve 80%+ test coverage before moving to next phase
4. Manual two-browser testing to verify real-world behavior

---

**Document Metadata:**
- **Lines:** ~1,500
- **Code Examples:** 25+
- **Test Examples:** 10+
- **Pitfalls Documented:** 15
- **Accessibility Patterns:** Complete
- **Testing Patterns:** Comprehensive
- **Ready for Implementation:** ✅

---

**References:**

- React 19 Documentation: https://react.dev/
- React Testing Library: https://testing-library.com/react
- focus-trap-react: https://github.com/focus-trap/focus-trap-react
- ARIA Authoring Practices: https://www.w3.org/WAI/ARIA/apg/
- King's Cooking CLAUDE-REACT.md: `/home/ryankhetlyr/Development/kings-cooking/claude_md_files/CLAUDE-REACT.md`
- Phase 3 PRP: `/home/ryankhetlyr/Development/kings-cooking/PRPs/phase-3-url-state-synchronization.md`
