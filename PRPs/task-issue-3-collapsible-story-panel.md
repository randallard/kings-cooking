# Task PRP: Collapsible Story/Instructions Panel on Game Board

## Metadata
- **Type**: Task PRP (Enhancement)
- **Priority**: High
- **Complexity**: Medium
- **Estimated Time**: 3-4 hours
- **Related Issue**: #3
- **Parent Branch**: `issue-3-add-story-instructions`

## Goal
Add a collapsible story/instructions panel that displays as an overlay on the game board screen. The panel shows expanded on first visit for each player (hot-seat mode) or first device visit (URL mode), then collapses with a toggle to re-open it.

##

 Why
**User Value**: Players need to see the game story and instructions regardless of which mode they're using or when they join the game. Currently, Player 2 in URL mode and players during gameplay don't have access to this crucial context.

**Business Impact**: Improves onboarding, reduces confusion, increases player engagement and retention.

## What (User-Visible Behavior)

### Hot-Seat Mode Flow
1. **Player 1's First Turn**:
   - After entering name and reaching game board, story/instructions panel shows **expanded** as overlay
   - Player 1 reads content and clicks "Close" button to collapse panel
   - `player1-seen-story` flag is set
   - Player 1 makes their move

2. **Player 2's First Turn** (after handoff):
   - After entering name and reaching game board, story/instructions panel shows **expanded** as overlay
   - Player 2 reads content and clicks "Close" button to collapse panel
   - `player2-seen-story` flag is set
   - Panel stays collapsed for all future turns

3. **Subsequent Turns**:
   - Panel is collapsed
   - "Show Story/Instructions" toggle link appears near top of game board screen
   - Clicking toggle expands panel, clicking close collapses it again

### URL Mode Flow
1. **First Device Visit** (either player):
   - After entering name and reaching game board, story/instructions panel shows **expanded** as overlay
   - Player reads content and clicks "Close" button to collapse panel
   - Both `player1-seen-story` and `player2-seen-story` flags are set (per-device)
   - Panel stays collapsed for all future visits on this device

2. **Subsequent Visits**:
   - Panel is collapsed
   - "Show Story/Instructions" toggle link appears near top of game board screen
   - Clicking toggle expands panel, clicking close collapses it again

### Panel Appearance
- **Overlay**: Semi-transparent backdrop covering game board
- **Content**: Same story and instructions as current ModeSelector
- **Styling**: Reuse `.storySection` and `.instructionsSection` CSS from ModeSelector.module.css
- **Close Button**: Accessible button with "Close" or "×" icon
- **Toggle Link**: Small text link near game title: "Show Story/Instructions"

### Accessibility
- WCAG 2.1 AA compliant
- Focus trap when panel is expanded
- ESC key closes panel
- ARIA labels for screen readers
- Keyboard navigation support

### Mobile Responsive
- Panel scales appropriately on mobile devices
- Maintains 44x44px minimum tap targets
- Scrollable content if needed

## All Needed Context

### Documentation References
- **React 19 Patterns**: `/home/ryankhetlyr/Development/kings-cooking/claude_md_files/CLAUDE-REACT.md`
- **localStorage Patterns**: `src/lib/storage/localStorage.ts` (lines 1-204)
- **Game Flow State Machine**: `src/types/gameFlow.ts` (lines 1-273)
- **App Component**: `src/App.tsx` (lines 182-356 for playing phase)

### Existing Code Patterns

#### localStorage Storage Pattern
```typescript
// From src/lib/storage/localStorage.ts

// 1. Add keys to STORAGE_KEYS const
export const STORAGE_KEYS = {
  // ... existing keys ...
  PLAYER1_SEEN_STORY: 'kings-cooking:player1-seen-story',
  PLAYER2_SEEN_STORY: 'kings-cooking:player2-seen-story',
} as const;

// 2. Define schema
const SeenStorySchema = z.boolean();

// 3. Add to storage interface
export const storage = {
  // ... existing methods ...
  getPlayer1SeenStory: (): boolean | null =>
    getValidatedItem(STORAGE_KEYS.PLAYER1_SEEN_STORY, SeenStorySchema),

  setPlayer1SeenStory: (seen: boolean): boolean =>
    setValidatedItem(STORAGE_KEYS.PLAYER1_SEEN_STORY, seen, SeenStorySchema),

  getPlayer2SeenStory: (): boolean | null =>
    getValidatedItem(STORAGE_KEYS.PLAYER2_SEEN_STORY, SeenStorySchema),

  setPlayer2SeenStory: (seen: boolean): boolean =>
    setValidatedItem(STORAGE_KEYS.PLAYER2_SEEN_STORY, seen, SeenStorySchema),
};
```

#### React Component Pattern
```typescript
// From CLAUDE-REACT.md

/**
 * @fileoverview Story/Instructions overlay panel with toggle
 * @module components/game/StoryPanel
 */

import { ReactElement, useState, useEffect } from 'react';
import styles from './StoryPanel.module.css';

interface StoryPanelProps {
  /** Whether panel is visible */
  isOpen: boolean;
  /** Callback when panel is closed */
  onClose: () => void;
}

export function StoryPanel({ isOpen, onClose }: StoryPanelProps): ReactElement | null {
  // ... implementation
}
```

#### Modal Overlay Pattern (from HandoffScreen)
```tsx
// From src/components/game/HandoffScreen.tsx (lines 112-166)

return (
  <div
    className={styles.overlay}
    role="dialog"
    aria-modal="true"
    aria-labelledby="story-title"
    aria-describedby="story-description"
  >
    <div className={styles.container}>
      {/* Content */}
    </div>

    {/* Privacy blur overlay */}
    <div className={styles.blurOverlay} aria-hidden="true" />
  </div>
);
```

#### Focus Trap Pattern (from HandoffScreen)
```tsx
// From src/components/game/HandoffScreen.tsx (lines 78-107)

// Handle escape key
useEffect(() => {
  const handleEscape = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  document.addEventListener('keydown', handleEscape);
  return () => document.removeEventListener('keydown', handleEscape);
}, [onClose]);

// Trap focus within modal
useEffect(() => {
  const button = document.getElementById('close-button');
  if (button) {
    button.focus();
  }

  const handleTabKey = (e: KeyboardEvent): void => {
    if (e.key === 'Tab') {
      e.preventDefault();
      button?.focus();
    }
  };

  document.addEventListener('keydown', handleTabKey);
  return () => document.removeEventListener('keydown', handleTabKey);
}, []);
```

### Story/Instructions Content
```tsx
// From src/components/game/ModeSelector.tsx (lines 37-65)

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
```

### CSS Styling
```css
/* From src/components/game/ModeSelector.module.css */

/* Reuse these exact styles for the panel */
.storySection {
  max-width: 700px;
  width: 100%;
  margin: 0 auto var(--spacing-lg, 1.5rem);
  padding: var(--spacing-md, 1rem);
  background-color: var(--bg-secondary, #f8f9fa);
  border: 1px solid var(--border-color, #ced4da);
  border-radius: var(--border-radius-md, 0.5rem);
  text-align: left;
}

.instructionsSection {
  max-width: 700px;
  width: 100%;
  margin: 0 auto var(--spacing-xl, 2rem);
  padding: var(--spacing-lg, 1.5rem);
  background-color: var(--bg-secondary, #f8f9fa);
  border: 1px solid var(--border-color, #ced4da);
  border-radius: var(--border-radius-md, 0.5rem);
}

/* Dark mode, mobile, reduced motion, high contrast - all included */
```

### Gotchas and Edge Cases

1. **localStorage Timing in Hot-Seat Mode**:
   - CRITICAL: Do NOT set `player2-seen-story` until Player 2 has actually closed the panel
   - Check `currentPlayer` from `gameState` to know whose turn it is
   - Set `player1-seen-story` when Player 1 closes panel (gameState.currentPlayer === 'white' on first turn)
   - Set `player2-seen-story` when Player 2 closes panel (gameState.currentPlayer === 'black' on first turn)

2. **localStorage Timing in URL Mode**:
   - Set BOTH flags immediately when panel is closed (per-device behavior)
   - Each device tracks independently

3. **New Game Behavior**:
   - Clear both `player1-seen-story` and `player2-seen-story` when NEW_GAME action is dispatched
   - Add to `clearGameStorage()` function

4. **Component Mounting**:
   - Panel logic only runs in `playing` phase (not setup, not handoff, not victory)
   - Check flags on mount to determine initial state

5. **Focus Management**:
   - When panel opens, trap focus inside
   - When panel closes, return focus to toggle button
   - ESC key should close panel

6. **Z-index Layering**:
   - Overlay must be above game board but below any error toasts
   - Use z-index: 100 for overlay backdrop
   - Use z-index: 101 for panel content

7. **Scroll Behavior**:
   - Prevent body scroll when panel is open
   - Restore body scroll when panel is closed

## Implementation Blueprint

### Task 1: Add localStorage Keys and Helpers

**File**: `src/lib/storage/localStorage.ts`

**Actions**:
1. Add keys to `STORAGE_KEYS` constant (line 25):
   ```typescript
   PLAYER1_SEEN_STORY: 'kings-cooking:player1-seen-story',
   PLAYER2_SEEN_STORY: 'kings-cooking:player2-seen-story',
   ```

2. Define schema after line 153:
   ```typescript
   const SeenStorySchema = z.boolean();
   ```

3. Add methods to `storage` object before `clearAll` (line 201):
   ```typescript
   // Story/instructions panel flags
   getPlayer1SeenStory: (): boolean | null =>
     getValidatedItem(STORAGE_KEYS.PLAYER1_SEEN_STORY, SeenStorySchema),

   setPlayer1SeenStory: (seen: boolean): boolean =>
     setValidatedItem(STORAGE_KEYS.PLAYER1_SEEN_STORY, seen, SeenStorySchema),

   getPlayer2SeenStory: (): boolean | null =>
     getValidatedItem(STORAGE_KEYS.PLAYER2_SEEN_STORY, SeenStorySchema),

   setPlayer2SeenStory: (seen: boolean): boolean =>
     setValidatedItem(STORAGE_KEYS.PLAYER2_SEEN_STORY, seen, SeenStorySchema),
   ```

4. Update `clearGameStorage()` to include new keys

**Validation**:
```bash
pnpm run check  # TypeScript validation
pnpm test src/lib/storage/localStorage.test.ts  # Run storage tests
```

**Tests to Add** (`src/lib/storage/localStorage.test.ts`):
```typescript
describe('Story/Instructions Flags', () => {
  it('should get/set player1SeenStory', () => {
    expect(storage.setPlayer1SeenStory(true)).toBe(true);
    expect(storage.getPlayer1SeenStory()).toBe(true);
  });

  it('should get/set player2SeenStory', () => {
    expect(storage.setPlayer2SeenStory(true)).toBe(true);
    expect(storage.getPlayer2SeenStory()).toBe(true);
  });

  it('should return null for unset flags', () => {
    expect(storage.getPlayer1SeenStory()).toBe(null);
    expect(storage.getPlayer2SeenStory()).toBe(null);
  });

  it('should clear story flags with clearAll', () => {
    storage.setPlayer1SeenStory(true);
    storage.setPlayer2SeenStory(true);
    storage.clearAll();
    expect(storage.getPlayer1SeenStory()).toBe(null);
    expect(storage.getPlayer2SeenStory()).toBe(null);
  });
});
```

**Rollback**: Remove added keys and methods, restore original `clearGameStorage()`

---

### Task 2: Create StoryPanel Component

**File**: `src/components/game/StoryPanel.tsx` (NEW)

**Actions**:
1. Create new component with overlay structure
2. Include story and instructions content (extracted from ModeSelector)
3. Add close button with accessible label
4. Implement focus trap and ESC key handling
5. Prevent body scroll when open

**Implementation**:
```tsx
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

  // Don't render if not open
  if (!isOpen) return null;

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Focus management
  useEffect(() => {
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
            <li>Or play with someone on the same device (hot-seat mode)</li>
          </ul>
        </section>
      </div>

      {/* Backdrop overlay */}
      <div className={styles.backdrop} aria-hidden="true" onClick={onClose} />
    </div>
  );
}
```

**Validation**:
```bash
pnpm run check  # TypeScript validation
pnpm run lint  # ESLint validation
```

**Rollback**: Delete `src/components/game/StoryPanel.tsx`

---

### Task 3: Create StoryPanel CSS Module

**File**: `src/components/game/StoryPanel.module.css` (NEW)

**Actions**:
1. Create overlay styles (z-index, backdrop)
2. Import/reuse story and instructions section styles from ModeSelector
3. Add close button styles
4. Mobile responsiveness
5. Dark mode support

**Implementation**:
```css
/* Overlay container - covers entire viewport */
.overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-lg, 1.5rem);
}

/* Panel container */
.container {
  position: relative;
  z-index: 101;
  max-width: 800px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  background-color: var(--bg-primary, #ffffff);
  border-radius: var(--border-radius-lg, 1rem);
  padding: var(--spacing-xl, 2rem);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
}

/* Backdrop - semi-transparent dark overlay */
.backdrop {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 100;
}

/* Close button */
.closeButton {
  position: absolute;
  top: var(--spacing-md, 1rem);
  right: var(--spacing-md, 1rem);
  width: 44px;
  height: 44px;
  padding: 0;
  background: none;
  border: 2px solid var(--border-color, #ced4da);
  border-radius: var(--border-radius-md, 0.5rem);
  font-size: 2rem;
  line-height: 1;
  cursor: pointer;
  color: var(--text-secondary, #6c757d);
  transition: all 0.2s ease-in-out;
}

.closeButton:hover {
  background-color: var(--bg-hover, #e9ecef);
  border-color: var(--border-hover, #adb5bd);
  color: var(--text-primary, #212529);
}

.closeButton:focus-visible {
  outline: 3px solid var(--focus-color, #0056b3);
  outline-offset: 3px;
}

/* Story and instructions sections - REUSE from ModeSelector */
.storySection {
  max-width: 700px;
  width: 100%;
  margin: 0 auto var(--spacing-lg, 1.5rem);
  padding: var(--spacing-md, 1rem);
  background-color: var(--bg-secondary, #f8f9fa);
  border: 1px solid var(--border-color, #ced4da);
  border-radius: var(--border-radius-md, 0.5rem);
  text-align: left;
}

.stageDirection {
  font-style: italic;
  color: var(--text-secondary, #6c757d);
  font-size: var(--font-size-sm, 0.875rem);
  margin: var(--spacing-xs, 0.25rem) 0;
}

.dialogue {
  color: var(--text-primary, #212529);
  font-size: var(--font-size-md, 1rem);
  margin: var(--spacing-sm, 0.5rem) 0;
  line-height: 1.5;
}

.dialogue strong {
  color: var(--text-primary, #212529);
  font-weight: 700;
}

.scrollSignature {
  display: inline-block;
  margin-left: var(--spacing-md, 1rem);
  font-style: italic;
}

.instructionsSection {
  max-width: 700px;
  width: 100%;
  margin: 0 auto var(--spacing-xl, 2rem);
  padding: var(--spacing-lg, 1.5rem);
  background-color: var(--bg-secondary, #f8f9fa);
  border: 1px solid var(--border-color, #ced4da);
  border-radius: var(--border-radius-md, 0.5rem);
}

.instructionsTitle {
  font-size: var(--font-size-lg, 1.25rem);
  font-weight: 600;
  margin: 0 0 var(--spacing-md, 1rem) 0;
  color: var(--text-primary, #212529);
  text-align: center;
}

.instructionsList {
  list-style: disc inside;
  padding: 0;
  margin: 0;
  font-size: var(--font-size-md, 1rem);
  color: var(--text-primary, #212529);
  text-align: left;
  line-height: 1.6;
}

.instructionsList li {
  padding: var(--spacing-xs, 0.25rem) 0;
  margin-left: var(--spacing-md, 1rem);
}

/* Dark mode - system preference */
@media (prefers-color-scheme: dark) {
  :global(:root:not([data-theme='light'])) .container {
    --bg-primary: #212529;
    --text-primary: #f8f9fa;
    --text-secondary: #adb5bd;
    --bg-secondary: #343a40;
    --border-color: #495057;
    --bg-hover: #495057;
    --border-hover: #6c757d;
    --focus-color: #4da3ff;
  }

  :global(:root:not([data-theme='light'])) .storySection,
  :global(:root:not([data-theme='light'])) .instructionsSection {
    --bg-secondary: #343a40;
    --border-color: #495057;
    --text-primary: #f8f9fa;
    --text-secondary: #adb5bd;
  }
}

/* Dark mode - manual toggle */
:global([data-theme='dark']) .container {
  --bg-primary: #212529;
  --text-primary: #f8f9fa;
  --text-secondary: #adb5bd;
  --bg-secondary: #343a40;
  --border-color: #495057;
  --bg-hover: #495057;
  --border-hover: #6c757d;
  --focus-color: #4da3ff;
}

:global([data-theme='dark']) .storySection,
:global([data-theme='dark']) .instructionsSection {
  --bg-secondary: #343a40;
  --border-color: #495057;
  --text-primary: #f8f9fa;
  --text-secondary: #adb5bd;
}

/* Mobile optimization */
@media (max-width: 768px) {
  .container {
    padding: var(--spacing-md, 1rem);
    max-height: 95vh;
  }

  .closeButton {
    width: 40px;
    height: 40px;
    font-size: 1.5rem;
  }

  .storySection {
    padding: var(--spacing-sm, 0.5rem);
    margin-bottom: var(--spacing-md, 1rem);
  }

  .dialogue,
  .stageDirection {
    font-size: var(--font-size-sm, 0.875rem);
  }

  .instructionsSection {
    padding: var(--spacing-md, 1rem);
    margin-bottom: var(--spacing-lg, 1.5rem);
  }

  .instructionsTitle {
    font-size: var(--font-size-md, 1rem);
  }

  .instructionsList {
    font-size: var(--font-size-sm, 0.875rem);
  }

  .instructionsList li {
    margin-left: var(--spacing-sm, 0.5rem);
  }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .closeButton {
    transition: none;
  }
}

/* High contrast mode */
@media (prefers-contrast: high) {
  .closeButton {
    border-width: 3px;
  }

  .closeButton:focus-visible {
    outline-width: 4px;
  }
}
```

**Validation**:
```bash
pnpm run check  # Verify no style issues
```

**Rollback**: Delete `src/components/game/StoryPanel.module.css`

---

### Task 4: Add Tests for StoryPanel Component

**File**: `src/components/game/StoryPanel.test.tsx` (NEW)

**Actions**:
1. Test rendering when open/closed
2. Test close button functionality
3. Test ESC key handling
4. Test focus trap
5. Test accessibility (ARIA labels, roles)
6. Test body scroll prevention

**Implementation**:
```tsx
/**
 * @fileoverview Tests for StoryPanel component
 * @module components/game/StoryPanel.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StoryPanel } from './StoryPanel';

describe('StoryPanel', () => {
  beforeEach(() => {
    // Reset body overflow
    document.body.style.overflow = '';
  });

  afterEach(() => {
    document.body.style.overflow = '';
  });

  describe('Rendering', () => {
    it('should not render when isOpen is false', () => {
      const { container } = render(<StoryPanel isOpen={false} onClose={vi.fn()} />);
      expect(container.firstChild).toBeNull();
    });

    it('should render when isOpen is true', () => {
      render(<StoryPanel isOpen={true} onClose={vi.fn()} />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should render story content', () => {
      render(<StoryPanel isOpen={true} onClose={vi.fn()} />);
      expect(screen.getByText(/A pigeon\.\.\. what's up Glinda/i)).toBeInTheDocument();
      expect(screen.getByText(/HA! Not if we get there first!/i)).toBeInTheDocument();
    });

    it('should render instructions content', () => {
      render(<StoryPanel isOpen={true} onClose={vi.fn()} />);
      expect(screen.getByText(/Most pieces to make it to the opponent's castle wins!/i)).toBeInTheDocument();
      expect(screen.getByText(/click confirm to lock in your move/i)).toBeInTheDocument();
    });

    it('should render close button', () => {
      render(<StoryPanel isOpen={true} onClose={vi.fn()} />);
      const closeButton = screen.getByRole('button', { name: /close story and instructions panel/i });
      expect(closeButton).toBeInTheDocument();
    });
  });

  describe('Close Functionality', () => {
    it('should call onClose when close button is clicked', () => {
      const onClose = vi.fn();
      render(<StoryPanel isOpen={true} onClose={onClose} />);

      const closeButton = screen.getByRole('button', { name: /close story and instructions panel/i });
      fireEvent.click(closeButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when backdrop is clicked', () => {
      const onClose = vi.fn();
      const { container } = render(<StoryPanel isOpen={true} onClose={onClose} />);

      const backdrop = container.querySelector('[aria-hidden="true"]');
      expect(backdrop).toBeInTheDocument();

      fireEvent.click(backdrop!);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when ESC key is pressed', () => {
      const onClose = vi.fn();
      render(<StoryPanel isOpen={true} onClose={onClose} />);

      fireEvent.keyDown(document, { key: 'Escape' });
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Focus Management', () => {
    it('should focus close button when opened', () => {
      render(<StoryPanel isOpen={true} onClose={vi.fn()} />);

      const closeButton = screen.getByRole('button', { name: /close story and instructions panel/i });
      expect(closeButton).toHaveFocus();
    });

    it('should trap focus within panel on Tab', () => {
      render(<StoryPanel isOpen={true} onClose={vi.fn()} />);

      const closeButton = screen.getByRole('button', { name: /close story and instructions panel/i });

      // Simulate Tab key
      fireEvent.keyDown(document, { key: 'Tab' });

      // Focus should still be on close button (trapped)
      expect(closeButton).toHaveFocus();
    });
  });

  describe('Body Scroll Prevention', () => {
    it('should prevent body scroll when open', () => {
      render(<StoryPanel isOpen={true} onClose={vi.fn()} />);
      expect(document.body.style.overflow).toBe('hidden');
    });

    it('should restore body scroll when closed', () => {
      const { rerender } = render(<StoryPanel isOpen={true} onClose={vi.fn()} />);
      expect(document.body.style.overflow).toBe('hidden');

      rerender(<StoryPanel isOpen={false} onClose={vi.fn()} />);
      expect(document.body.style.overflow).toBe('');
    });

    it('should restore body scroll on unmount', () => {
      const { unmount } = render(<StoryPanel isOpen={true} onClose={vi.fn()} />);
      expect(document.body.style.overflow).toBe('hidden');

      unmount();
      expect(document.body.style.overflow).toBe('');
    });
  });

  describe('Accessibility', () => {
    it('should have dialog role', () => {
      render(<StoryPanel isOpen={true} onClose={vi.fn()} />);
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
    });

    it('should have aria-modal attribute', () => {
      render(<StoryPanel isOpen={true} onClose={vi.fn()} />);
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('should have aria-labelledby pointing to title', () => {
      render(<StoryPanel isOpen={true} onClose={vi.fn()} />);
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-labelledby', 'story-panel-title');
    });

    it('should have aria-describedby pointing to description', () => {
      render(<StoryPanel isOpen={true} onClose={vi.fn()} />);
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-describedby', 'story-panel-description');
    });

    it('should hide backdrop from screen readers', () => {
      const { container } = render(<StoryPanel isOpen={true} onClose={vi.fn()} />);
      const backdrop = container.querySelector('[aria-hidden="true"]');
      expect(backdrop).toBeInTheDocument();
    });
  });

  describe('Story Section', () => {
    it('should render story section with ARIA label', () => {
      render(<StoryPanel isOpen={true} onClose={vi.fn()} />);
      const storySection = screen.getByRole('region', { name: /game story/i });
      expect(storySection).toBeInTheDocument();
    });

    it('should display Dark King dialogue', () => {
      render(<StoryPanel isOpen={true} onClose={vi.fn()} />);
      expect(screen.getByText(/A pigeon\.\.\. what's up Glinda/i)).toBeInTheDocument();
    });

    it('should display Light King scroll message', () => {
      render(<StoryPanel isOpen={true} onClose={vi.fn()} />);
      expect(screen.getByText(/we're coming over! you're cooking!/i)).toBeInTheDocument();
      expect(screen.getByText(/- Light King/i)).toBeInTheDocument();
    });
  });

  describe('Instructions Section', () => {
    it('should render instructions section with ARIA label', () => {
      render(<StoryPanel isOpen={true} onClose={vi.fn()} />);
      const instructionsSection = screen.getByRole('region', { name: /how to play/i });
      expect(instructionsSection).toBeInTheDocument();
    });

    it('should display win condition', () => {
      render(<StoryPanel isOpen={true} onClose={vi.fn()} />);
      expect(screen.getByText(/Most pieces to make it to the opponent's castle wins!/i)).toBeInTheDocument();
    });

    it('should display move confirmation instruction', () => {
      render(<StoryPanel isOpen={true} onClose={vi.fn()} />);
      expect(screen.getByText(/click confirm to lock in your move/i)).toBeInTheDocument();
    });
  });
});
```

**Validation**:
```bash
pnpm test src/components/game/StoryPanel.test.tsx
```

**Rollback**: Delete `src/components/game/StoryPanel.test.tsx`

---

### Task 5: Integrate StoryPanel into App.tsx (Playing Phase)

**File**: `src/App.tsx`

**Actions**:
1. Import StoryPanel and storage helpers
2. Add state for panel visibility
3. Check localStorage flags on mount to determine initial visibility
4. Add toggle button to playing phase UI
5. Handle close behavior (set appropriate flags based on mode and current player)

**Changes**:

1. Add imports (after line 13):
```tsx
import { StoryPanel } from './components/game/StoryPanel';
```

2. Add state management inside App component (after line 32):
```tsx
// Story panel visibility state
const [showStoryPanel, setShowStoryPanel] = useState(false);
```

3. Add useEffect to check flags and set initial visibility (after line 91):
```tsx
// Task: Check story panel flags and show if needed
useEffect(() => {
  if (state.phase === 'playing') {
    const player1Seen = storage.getPlayer1SeenStory();
    const player2Seen = storage.getPlayer2SeenStory();
    const currentPlayer = state.gameState.currentPlayer;
    const mode = state.mode;

    // URL mode: Show if BOTH flags are false (first visit on this device)
    if (mode === 'url' && !player1Seen && !player2Seen) {
      setShowStoryPanel(true);
    }
    // Hot-seat mode: Show if current player hasn't seen it yet
    else if (mode === 'hotseat') {
      if (currentPlayer === 'white' && !player1Seen) {
        setShowStoryPanel(true);
      } else if (currentPlayer === 'black' && !player2Seen) {
        setShowStoryPanel(true);
      }
    }
  }
}, [state.phase, state.gameState?.currentPlayer, state.mode]);
```

4. Add handleCloseStoryPanel function (before handleConfirmMove, around line 186):
```tsx
const handleCloseStoryPanel = (): void => {
  setShowStoryPanel(false);

  if (state.phase === 'playing') {
    const currentPlayer = state.gameState.currentPlayer;
    const mode = state.mode;

    if (mode === 'url') {
      // URL mode: Set both flags (per-device behavior)
      storage.setPlayer1SeenStory(true);
      storage.setPlayer2SeenStory(true);
    } else if (mode === 'hotseat') {
      // Hot-seat mode: Set flag for current player only
      if (currentPlayer === 'white') {
        storage.setPlayer1SeenStory(true);
      } else if (currentPlayer === 'black') {
        storage.setPlayer2SeenStory(true);
      }
    }
  }
};
```

5. Add toggle button in playing phase (after h1, around line 305):
```tsx
{/* Story/Instructions toggle */}
{!showStoryPanel && (
  <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-sm)' }}>
    <button
      onClick={() => setShowStoryPanel(true)}
      style={{
        background: 'none',
        border: 'none',
        color: 'var(--text-secondary)',
        textDecoration: 'underline',
        cursor: 'pointer',
        fontSize: 'var(--font-size-sm)',
        padding: 'var(--spacing-xs)',
      }}
      aria-label="Show game story and instructions"
    >
      Show Story/Instructions
    </button>
  </div>
)}
```

6. Add StoryPanel component at end of playing phase return (before closing div, around line 354):
```tsx
{/* Story/Instructions Panel */}
<StoryPanel
  isOpen={showStoryPanel}
  onClose={handleCloseStoryPanel}
/>
```

**Validation**:
```bash
pnpm run check  # TypeScript validation
pnpm run lint  # ESLint validation
pnpm test src/App.test.tsx  # Ensure App tests pass
```

**Tests to Update** (`src/App.test.tsx`):
```typescript
describe('Story Panel Integration', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should show story panel on Player 1 first turn in hot-seat mode', () => {
    // Set up hot-seat mode game
    localStorage.setItem('kings-cooking:game-mode', JSON.stringify('hotseat'));
    localStorage.setItem('kings-cooking:player1-name', JSON.stringify('Alice'));

    // Create game state for Player 1's turn
    const gameState = {
      status: 'playing',
      currentPlayer: 'white',
      currentTurn: 0,
      // ... minimal valid game state
    };
    localStorage.setItem('kings-cooking:game-state', JSON.stringify(gameState));

    render(<App />);

    // Story panel should be visible
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/A pigeon/i)).toBeInTheDocument();
  });

  it('should not show story panel if player has already seen it', () => {
    localStorage.setItem('kings-cooking:game-mode', JSON.stringify('hotseat'));
    localStorage.setItem('kings-cooking:player1-seen-story', JSON.stringify(true));
    localStorage.setItem('kings-cooking:player2-seen-story', JSON.stringify(true));

    render(<App />);

    // Story panel should not be visible
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should show toggle button when panel is closed', () => {
    localStorage.setItem('kings-cooking:player1-seen-story', JSON.stringify(true));
    localStorage.setItem('kings-cooking:player2-seen-story', JSON.stringify(true));

    render(<App />);

    const toggleButton = screen.getByRole('button', { name: /show game story and instructions/i });
    expect(toggleButton).toBeInTheDocument();
  });

  it('should set player1-seen-story flag when Player 1 closes panel in hot-seat mode', () => {
    localStorage.setItem('kings-cooking:game-mode', JSON.stringify('hotseat'));

    render(<App />);

    // Close panel
    const closeButton = screen.getByRole('button', { name: /close story and instructions panel/i });
    fireEvent.click(closeButton);

    // Check flag
    expect(storage.getPlayer1SeenStory()).toBe(true);
    expect(storage.getPlayer2SeenStory()).toBe(null);
  });

  it('should set both flags when closed in URL mode', () => {
    localStorage.setItem('kings-cooking:game-mode', JSON.stringify('url'));

    render(<App />);

    // Close panel
    const closeButton = screen.getByRole('button', { name: /close story and instructions panel/i });
    fireEvent.click(closeButton);

    // Check both flags
    expect(storage.getPlayer1SeenStory()).toBe(true);
    expect(storage.getPlayer2SeenStory()).toBe(true);
  });
});
```

**Rollback**: Remove imports, state, useEffect, handler, toggle button, and StoryPanel component

---

### Task 6: Update NEW_GAME Action to Clear Story Flags

**File**: `src/lib/gameFlow/reducer.ts`

**Actions**:
1. Import storage helpers
2. Clear story flags when NEW_GAME is dispatched

**Changes**:

Add to NEW_GAME case (find around line 280-290):
```typescript
case 'NEW_GAME': {
  // Clear all localStorage including story flags
  storage.clearAll();

  return { phase: 'mode-selection' };
}
```

**Validation**:
```bash
pnpm run check
pnpm test src/lib/gameFlow/reducer.test.ts
```

**Tests to Add** (`src/lib/gameFlow/reducer.test.ts`):
```typescript
it('should clear story flags on NEW_GAME action', () => {
  // Set flags
  storage.setPlayer1SeenStory(true);
  storage.setPlayer2SeenStory(true);

  const state: VictoryPhase = {
    phase: 'victory',
    mode: 'hotseat',
    winner: 'white',
    gameState: mockGameState,
    player1Name: 'Alice',
    player2Name: 'Bob',
  };

  const action: NewGameAction = { type: 'NEW_GAME' };
  const newState = gameFlowReducer(state, action);

  expect(newState.phase).toBe('mode-selection');
  expect(storage.getPlayer1SeenStory()).toBe(null);
  expect(storage.getPlayer2SeenStory()).toBe(null);
});
```

**Rollback**: Remove clearAll() call from NEW_GAME case

---

### Task 7: Manual Testing Checklist

**Hot-Seat Mode**:
- [ ] Player 1 enters name, sees expanded panel on game board
- [ ] Player 1 closes panel, flag is set, makes move
- [ ] Player 2 enters name (if first time), sees expanded panel on game board
- [ ] Player 2 closes panel, both flags are set, makes move
- [ ] On subsequent turns, panel is collapsed, toggle button is visible
- [ ] Clicking toggle button expands panel
- [ ] Clicking close button collapses panel
- [ ] ESC key closes panel
- [ ] Focus is trapped in panel when open
- [ ] Body scroll is prevented when panel is open
- [ ] New game clears flags, panel shows again for Player 1

**URL Mode**:
- [ ] Player 1 enters name, sees expanded panel on game board
- [ ] Player 1 closes panel, both flags are set
- [ ] Player 1 makes move, shares URL
- [ ] Player 2 opens URL on different device, panel shows expanded (their device hasn't seen it)
- [ ] Player 2 closes panel, both flags are set on their device
- [ ] On same device, panel stays collapsed (flags are set)
- [ ] Toggle button works to expand/collapse panel
- [ ] ESC key closes panel
- [ ] New game clears flags

**Accessibility**:
- [ ] Screen reader announces dialog when opened
- [ ] Close button is focusable and has accessible label
- [ ] Tab key traps focus within panel
- [ ] ESC key closes panel
- [ ] ARIA labels are correct
- [ ] Color contrast meets WCAG 2.1 AA

**Mobile**:
- [ ] Panel is responsive on mobile (< 768px)
- [ ] Close button is at least 44x44px
- [ ] Content is scrollable if needed
- [ ] Backdrop click closes panel

---

## Validation Loop

### Level 1: Syntax & Type Checking
```bash
pnpm run check         # TypeScript + Astro validation
pnpm run lint          # ESLint with max-warnings 0
```

### Level 2: Unit Tests
```bash
pnpm test src/lib/storage/localStorage.test.ts
pnpm test src/components/game/StoryPanel.test.tsx
pnpm test src/App.test.tsx
pnpm test src/lib/gameFlow/reducer.test.ts
```

### Level 3: Coverage Check
```bash
pnpm test:coverage
# Ensure new code has >= 80% coverage
```

### Level 4: Build Validation
```bash
pnpm build
# Ensure production build succeeds
```

### Level 5: Manual Testing
- Follow manual testing checklist above
- Test on mobile device or responsive mode
- Test with screen reader (NVDA or VoiceOver)

## Success Criteria

- [ ] localStorage keys added and tested
- [ ] StoryPanel component created with tests (100% coverage)
- [ ] StoryPanel CSS created with dark mode and mobile support
- [ ] App.tsx integration complete with state management
- [ ] Hot-seat mode: Panel shows for Player 1, then Player 2, then collapses
- [ ] URL mode: Panel shows once per device, both flags set
- [ ] Toggle button works to expand/collapse panel
- [ ] NEW_GAME clears flags
- [ ] All tests passing (656+ tests)
- [ ] TypeScript strict mode: 0 errors
- [ ] ESLint: 0 warnings
- [ ] Build successful
- [ ] WCAG 2.1 AA compliance verified
- [ ] Mobile responsive verified

## Rollback Strategy

### If Tests Fail
1. Identify failing test
2. Review test output for clues
3. Fix implementation
4. Re-run tests
5. If blocked, rollback specific task and debug

### If Build Fails
1. Check TypeScript errors
2. Check missing imports
3. Check CSS syntax
4. Rollback to last working commit

### Complete Rollback
```bash
git checkout issue-3-add-story-instructions
git reset --hard HEAD~1  # Remove PRP commit
# Or rollback specific files:
git checkout HEAD -- src/lib/storage/localStorage.ts
git checkout HEAD -- src/components/game/StoryPanel.tsx
git checkout HEAD -- src/components/game/StoryPanel.module.css
git checkout HEAD -- src/components/game/StoryPanel.test.tsx
git checkout HEAD -- src/App.tsx
git checkout HEAD -- src/lib/gameFlow/reducer.ts
```

## Dependencies
- React 19 (useEffect, useState, useRef)
- Zod (validation schemas)
- Vitest (@testing-library/react)
- Existing game flow reducer
- Existing localStorage utilities

## Notes
- This is an enhancement to Issue #3, building on the existing story/instructions work
- Content is extracted from ModeSelector.tsx for reusability
- CSS is reused from ModeSelector.module.css for consistency
- Two-flag approach chosen for reliability and explicitness
- Per-device behavior in URL mode, per-player behavior in hot-seat mode
