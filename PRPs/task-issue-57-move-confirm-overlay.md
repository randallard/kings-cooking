# Task PRP: Move Confirm Overlay

**Issue:** #57
**Type:** Feature Refactor (TDD)
**Priority:** 🔥 Critical
**Estimated Complexity:** 🟢 Simple (1-2 days)
**Created:** 2025-10-25

---

## Goal

Refactor the existing `MoveConfirmButton` component to display as an overlay centered on the destination square after the piece animation completes, showing both Confirm and Cancel buttons for improved user experience.

**Success Criteria:**
- ✅ Buttons appear in destination square after 750ms animation
- ✅ Full keyboard accessibility with focus trap
- ✅ Clicking anywhere else cancels the move
- ✅ All existing tests pass
- ✅ 80%+ test coverage maintained
- ✅ No regressions in existing functionality

---

## Why

**User Value:**
- **Contextual Confirmation**: Buttons appear right where the piece moved, reducing eye movement and cognitive load
- **Clear Cancellation**: Explicit Cancel button provides better affordance than implicit cancellation
- **Improved UX**: Overlay clearly indicates pending state and available actions

**Business Value:**
- Reduces user errors by making confirmation/cancellation more intuitive
- Improves accessibility with explicit Cancel button
- Aligns with modern game UX patterns

---

## What

### User-Visible Behavior

**Current Flow:**
1. User clicks piece → highlights legal moves
2. User clicks destination → piece moves immediately
3. "Confirm Move" button appears below board
4. User clicks "Confirm Move" to complete

**New Flow:**
1. User clicks piece → highlights legal moves
2. User clicks destination → piece animates to new square (750ms)
3. **After animation:** Overlay appears centered in destination square showing:
   - **Cancel** button (gray) on left
   - **Confirm** button (green) on right
   - 5px gap between buttons
4. User can:
   - Click **Confirm** → move completes
   - Click **Cancel** → piece returns to origin
   - Click **elsewhere** on board → cancels (piece returns)
   - Press **Escape** → cancels (piece returns)
   - Press **Tab** → cycles between Cancel/Confirm
   - Press **Enter** → activates focused button

**Visual Design:**
- Buttons positioned vertically + horizontally centered in destination square
- Buttons take up one horizontal line with padding (don't cover piece entirely)
- Responsive sizing based on square size
- Match existing MoveConfirmButton green/gray color scheme
- Dark mode support via OS settings

---

## All Needed Context

### Documentation

- **React 19 Patterns**: `/home/ryankhetlyr/Development/kings-cooking/claude_md_files/CLAUDE-REACT.md`
  - Focus: Component composition, TypeScript strict mode, TDD methodology
- **FocusTrap Pattern**: `src/components/HistoryComparisonModal.tsx` lines 196-249
  - Focus: `focus-trap-react` usage with `initialFocus`, `escapeDeactivates`
- **Current Animation**: `src/components/game/GameCell.module.css` lines 84-96
  - Focus: `slideToDestination 750ms ease-out` animation timing
- **Existing Button Styles**: `src/components/game/MoveConfirmButton.module.css`
  - Focus: Color scheme, dark mode, accessibility patterns

### Code Examples

**FocusTrap Pattern (from HistoryComparisonModal.tsx):**
```typescript
import FocusTrap from 'focus-trap-react';

<FocusTrap
  active={isOpen}
  focusTrapOptions={{
    initialFocus: confirmButtonRef.current ?? undefined,
    fallbackFocus: '#move-overlay',
    clickOutsideDeactivates: true,
    escapeDeactivates: true,
    allowOutsideClick: true,
    onDeactivate: onCancel,
  }}
>
  <div
    id="move-overlay"
    role="dialog"
    aria-modal="true"
    aria-labelledby="overlay-title"
    aria-describedby="overlay-desc"
  >
    <h2 id="overlay-title" className="sr-only">Confirm Move</h2>
    <p id="overlay-desc" className="sr-only">
      Click confirm to complete the move or cancel to undo
    </p>
    <button ref={cancelButtonRef}>Cancel</button>
    <button ref={confirmButtonRef}>Confirm</button>
  </div>
</FocusTrap>
```

**AnimationEnd Event Pattern:**
```typescript
// In GameCell component
const [showOverlay, setShowOverlay] = useState(false);

const handleAnimationEnd = (e: React.AnimationEvent) => {
  if (e.animationName === 'slideToDestination' && isPendingDestination) {
    setShowOverlay(true);
  }
};

<span
  className={isPendingDestination ? styles.animatedPiece : ''}
  onAnimationEnd={handleAnimationEnd}
>
  {pieceChar}
</span>
```

**Cancel Action Pattern (from App.tsx):**
```typescript
// Existing pattern - preserve this
const handleCancelMove = (): void => {
  dispatch({ type: 'DESELECT_PIECE' });
};

// Effect in reducer.ts (lines 456-463):
case 'DESELECT_PIECE':
  if (state.phase !== 'playing') return state;
  return {
    ...state,
    selectedPosition: null,
    legalMoves: [],
    pendingMove: null, // ← Clears pending move, piece returns to origin
  };
```

### Gotchas

1. **Animation Timing**
   - **Issue**: Overlay appears before animation completes
   - **Fix**: Use `onAnimationEnd` event listener, check `e.animationName === 'slideToDestination'`
   - **Validation**: Test with `waitFor(() => expect(overlay).toBeInTheDocument())`

2. **Focus Trap Activation**
   - **Issue**: Focus trap activates before overlay is visible
   - **Fix**: Only activate FocusTrap when `showOverlay === true`
   - **Pattern**: `<FocusTrap active={showOverlay && isPendingDestination}>`

3. **Off-Board Moves**
   - **Issue**: No square to overlay on when moving off-board
   - **Fix**: Don't show overlay for `pendingMove.to === 'off_board'`, keep existing button behavior
   - **Pattern**: `if (pendingMove?.to === 'off_board') return <MoveConfirmButton />`

4. **Mobile Touch Targets**
   - **Issue**: 44px minimum target may not fit in small squares
   - **Fix**: Use responsive sizing, prioritize fitting in square over exact 44px
   - **Pattern**: `min-height: max(36px, 80%); /* Get close to 44px */`

5. **Dark Mode Testing**
   - **Issue**: CSS custom properties may not apply in test environment
   - **Fix**: Test color application via className, not computed styles
   - **Pattern**: `expect(button).toHaveClass('confirmButton')` not color values

6. **Prevent Re-selection During Overlay**
   - **Issue**: User might click piece while overlay is showing
   - **Fix**: GameBoard should ignore clicks when `pendingMove !== null`
   - **Pattern**: Already implemented in `GameBoard.tsx` lines 197-199

7. **Screen Reader Announcements**
   - **Issue**: Overlay appearance not announced
   - **Fix**: Use `aria-live="polite"` on overlay container OR focus Confirm button automatically
   - **Pattern**: Auto-focus is preferred (better UX) - `initialFocus: confirmButtonRef`

8. **History Playback Mode**
   - **Issue**: Overlay might show during history review
   - **Fix**: Pass `isViewingHistory` prop, don't render overlay if true
   - **Pattern**: `if (isViewingHistory) return null;` (GameCell overlay logic)

### Patterns to Follow

**Component Structure:**
```typescript
// MoveConfirmButton.tsx (Refactored)
interface MoveConfirmButtonProps {
  onConfirm: () => void;
  onCancel: () => void;
  position: Position | 'off_board'; // NEW: where to render overlay
  isOverlay: boolean; // NEW: render as overlay or traditional button
  disabled?: boolean;
  isProcessing?: boolean;
  error?: string | null;
}

// Two render modes:
// 1. Overlay mode (isOverlay=true): Render in-square with FocusTrap
// 2. Traditional mode (isOverlay=false): Render as standalone button (preserve existing)
```

**CSS Module Pattern:**
```css
/* MoveConfirmButton.module.css */
.overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  gap: 5px;
  z-index: 10; /* Above piece */
  padding: 4px;
  background: rgba(255, 255, 255, 0.95); /* Slight transparency */
  border-radius: 4px;
}

@media (prefers-color-scheme: dark) {
  .overlay {
    background: rgba(0, 0, 0, 0.95);
  }
}

.overlayButton {
  /* Responsive sizing based on container */
  min-height: 36px; /* Compromise for small squares */
  padding: 6px 12px;
  font-size: 0.875rem;
  font-weight: 600;
  flex: 1; /* Equal width */
}

.cancelButton {
  background-color: var(--btn-cancel-bg, #6c757d);
  color: white;
}

.confirmButton {
  background-color: var(--btn-confirm-bg, #28a745);
  color: white;
}
```

**Test Pattern (TDD Red-Green-Refactor):**
```typescript
// RED: Write failing test first
describe('MoveConfirmButton Overlay', () => {
  it('should render overlay in destination square after animation', async () => {
    const { container } = render(
      <GameCell
        position={[0, 0]}
        piece={testPiece}
        isPendingDestination={true}
        // ...
      />
    );

    // Overlay should NOT appear immediately
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // Trigger animation end
    const piece = container.querySelector('.animatedPiece');
    fireEvent.animationEnd(piece!, { animationName: 'slideToDestination' });

    // Overlay should appear
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });
});

// GREEN: Implement minimal code to pass
// REFACTOR: Clean up, extract helpers, improve readability
```

---

## Implementation Blueprint

### Phase 1: Setup & Red Tests (TDD)

#### Task 1.1: Write Failing Unit Tests
**File:** `src/components/game/MoveConfirmButton.test.tsx`

**Actions:**
```typescript
// ADD: New test suite for overlay mode
describe('Overlay Mode', () => {
  it('should render Cancel and Confirm buttons in overlay mode', () => {
    // Test overlay rendering
  });

  it('should auto-focus Confirm button when overlay appears', () => {
    // Test initialFocus
  });

  it('should call onCancel when Cancel button clicked', () => {
    // Test Cancel callback
  });

  it('should call onCancel when Escape pressed', () => {
    // Test keyboard cancellation
  });

  it('should trap focus between Cancel and Confirm', () => {
    // Test focus trap
  });

  it('should call onCancel when clicking outside', () => {
    // Test clickOutsideDeactivates
  });

  it('should position buttons side-by-side with 5px gap', () => {
    // Test layout
  });

  it('should not render overlay for off-board moves', () => {
    // Test off-board edge case
  });

  it('should apply dark mode styles in overlay', () => {
    // Test dark mode
  });
});
```

**Validation:**
```bash
pnpm test MoveConfirmButton.test.tsx
# Expected: ~9 failing tests (RED phase)
```

**Rollback:** `git checkout src/components/game/MoveConfirmButton.test.tsx`

---

#### Task 1.2: Write Failing Integration Tests
**File:** `src/components/game/GameCell.test.tsx`

**Actions:**
```typescript
// ADD: New test suite for animation + overlay integration
describe('Overlay Integration', () => {
  it('should not show overlay before animation completes', () => {
    // Test timing
  });

  it('should show overlay after slideToDestination animation ends', () => {
    // Test animationend event
  });

  it('should hide overlay when pendingMove is cleared', () => {
    // Test cleanup
  });

  it('should not show overlay during history playback', () => {
    // Test edge case
  });

  it('should render overlay with correct position prop', () => {
    // Test prop passing
  });
});
```

**Validation:**
```bash
pnpm test GameCell.test.tsx
# Expected: ~5 failing tests (RED phase)
```

**Rollback:** `git checkout src/components/game/GameCell.test.tsx`

---

#### Task 1.3: Write E2E Test Scenarios
**File:** `src/test/e2e/move-confirmation.spec.ts` (NEW)

**Actions:**
```typescript
import { test, expect } from '@playwright/test';

test.describe('Move Confirmation Overlay', () => {
  test('should show overlay after piece animation', async ({ page }) => {
    await page.goto('/');
    // Start game, make move
    await page.click('[data-testid="piece-0-0"]');
    await page.click('[data-testid="cell-1-0"]');

    // Wait for animation
    await page.waitForTimeout(800); // 750ms + buffer

    // Verify overlay appears
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await expect(page.locator('button:has-text("Cancel")')).toBeVisible();
    await expect(page.locator('button:has-text("Confirm")')).toBeVisible();
  });

  test('should cancel move when clicking outside overlay', async ({ page }) => {
    // ... test click outside behavior
  });

  test('should cancel move when pressing Escape', async ({ page }) => {
    // ... test keyboard behavior
  });

  test('should focus Confirm button automatically', async ({ page }) => {
    // ... test focus management
  });
});
```

**Validation:**
```bash
pnpm test:e2e move-confirmation.spec.ts
# Expected: All tests failing (RED phase)
```

**Rollback:** `rm src/test/e2e/move-confirmation.spec.ts`

---

### Phase 2: Implementation (GREEN)

#### Task 2.1: Refactor MoveConfirmButton Component
**File:** `src/components/game/MoveConfirmButton.tsx`

**Actions:**
```typescript
// MODIFY: Add overlay mode support
import { useRef, useEffect, type ReactElement } from 'react';
import FocusTrap from 'focus-trap-react';
import type { Position } from '@/lib/validation/schemas';
import styles from './MoveConfirmButton.module.css';

interface MoveConfirmButtonProps {
  onConfirm: () => void;
  onCancel?: () => void; // NEW: optional cancel callback
  position?: Position | 'off_board'; // NEW: overlay position
  isOverlay?: boolean; // NEW: overlay mode flag
  disabled?: boolean;
  isProcessing?: boolean;
  error?: string | null;
}

export const MoveConfirmButton = ({
  onConfirm,
  onCancel,
  position,
  isOverlay = false,
  disabled = false,
  isProcessing = false,
  error = null,
}: MoveConfirmButtonProps): ReactElement => {
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  // Overlay mode: render two buttons with FocusTrap
  if (isOverlay && position !== 'off_board' && onCancel) {
    return (
      <FocusTrap
        active={true}
        focusTrapOptions={{
          initialFocus: confirmButtonRef.current ?? undefined,
          fallbackFocus: '#move-overlay',
          clickOutsideDeactivates: true,
          escapeDeactivates: true,
          allowOutsideClick: true,
          onDeactivate: onCancel,
        }}
      >
        <div
          id="move-overlay"
          className={styles.overlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="overlay-title"
          aria-describedby="overlay-desc"
        >
          <h2 id="overlay-title" className={styles.srOnly}>
            Confirm Move
          </h2>
          <p id="overlay-desc" className={styles.srOnly}>
            Click confirm to complete the move or cancel to undo
          </p>

          <button
            ref={cancelButtonRef}
            type="button"
            className={`${styles.overlayButton} ${styles.cancelButton}`}
            onClick={onCancel}
            aria-label="Cancel move and return piece to original position"
          >
            Cancel
          </button>

          <button
            ref={confirmButtonRef}
            type="button"
            className={`${styles.overlayButton} ${styles.confirmButton}`}
            onClick={onConfirm}
            disabled={disabled || isProcessing}
            aria-label="Confirm move"
          >
            Confirm
          </button>
        </div>
      </FocusTrap>
    );
  }

  // Traditional mode: render single Confirm button (preserve existing)
  // ... existing implementation unchanged ...
};
```

**Validation:**
```bash
pnpm run check # TypeScript
pnpm test MoveConfirmButton.test.tsx # Unit tests should pass
```

**IF_FAIL:**
- Check FocusTrap import: `pnpm list focus-trap-react`
- Verify ref types match React 19: `RefObject<HTMLButtonElement>`
- Check CSS module imports

**Rollback:** `git checkout src/components/game/MoveConfirmButton.tsx`

---

#### Task 2.2: Add Overlay Styles
**File:** `src/components/game/MoveConfirmButton.module.css`

**Actions:**
```css
/* ADD: Overlay container styles */
.overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);

  display: flex;
  gap: 5px;

  /* Layering */
  z-index: 10;

  /* Visual design */
  padding: 4px 6px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);

  /* Ensure visibility */
  pointer-events: auto;
}

/* ADD: Overlay button base styles */
.overlayButton {
  /* Sizing - responsive to container */
  min-height: 36px; /* Compromise for small squares */
  min-width: 60px;
  padding: 6px 12px;

  /* Typography */
  font-size: 0.875rem;
  font-weight: 600;

  /* Layout */
  flex: 1; /* Equal width distribution */

  /* Styling */
  border: 2px solid transparent;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
}

.overlayButton:focus-visible {
  outline: 3px solid var(--focus-color, #0056b3);
  outline-offset: 2px;
}

/* ADD: Cancel button styles */
.cancelButton {
  background-color: var(--btn-cancel-bg, #6c757d);
  border-color: var(--btn-cancel-border, #5a6268);
  color: white;
}

.cancelButton:hover {
  background-color: var(--btn-cancel-hover, #5a6268);
  transform: translateY(-1px);
}

.cancelButton:active {
  transform: translateY(0);
}

/* Confirm button uses existing .confirmButton styles */

/* ADD: Screen reader only class */
.srOnly {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* ADD: Dark mode support for overlay */
@media (prefers-color-scheme: dark) {
  .overlay {
    background: rgba(0, 0, 0, 0.95);
    box-shadow: 0 2px 8px rgba(255, 255, 255, 0.1);
  }

  .cancelButton {
    --btn-cancel-bg: #495057;
    --btn-cancel-border: #343a40;
    --btn-cancel-hover: #343a40;
  }

  .overlayButton:focus-visible {
    --focus-color: #4da3ff;
  }
}

/* ADD: Manual dark mode toggle */
:global([data-theme='dark']) .overlay {
  background: rgba(0, 0, 0, 0.95);
  box-shadow: 0 2px 8px rgba(255, 255, 255, 0.1);
}

:global([data-theme='dark']) .cancelButton {
  --btn-cancel-bg: #495057;
  --btn-cancel-border: #343a40;
  --btn-cancel-hover: #343a40;
}

/* ADD: Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .overlayButton {
    transition: none;
  }
}

/* ADD: Mobile responsive sizing */
@media (max-width: 640px) {
  .overlayButton {
    font-size: 0.75rem;
    padding: 4px 8px;
    min-width: 50px;
  }
}
```

**Validation:**
```bash
# Visual check in browser
pnpm dev
# Open http://localhost:5173, test overlay appearance
```

**IF_FAIL:**
- Check CSS syntax with VSCode CSS validator
- Verify custom properties fallback correctly
- Test in light/dark mode

**Rollback:** `git checkout src/components/game/MoveConfirmButton.module.css`

---

#### Task 2.3: Integrate Overlay into GameCell
**File:** `src/components/game/GameCell.tsx`

**Actions:**
```typescript
// MODIFY: Import MoveConfirmButton
import { MoveConfirmButton } from './MoveConfirmButton';
import { useState, type ReactElement } from 'react';

// MODIFY: Add new props
interface GameCellProps {
  position: Position;
  piece: Piece | null;
  isSelected: boolean;
  isLegalMove: boolean;
  isLastMove: boolean;
  isPendingSource?: boolean;
  isPendingDestination?: boolean;
  onClick: (position: Position) => void;
  disabled?: boolean;
  // NEW: Overlay props
  onConfirmMove?: () => void;
  onCancelMove?: () => void;
  isViewingHistory?: boolean;
}

export const GameCell = ({
  position,
  piece,
  isSelected,
  isLegalMove,
  isLastMove,
  isPendingSource = false,
  isPendingDestination = false,
  onClick,
  disabled = false,
  onConfirmMove,
  onCancelMove,
  isViewingHistory = false,
}: GameCellProps): ReactElement => {
  // NEW: Track overlay visibility
  const [showOverlay, setShowOverlay] = useState(false);

  // NEW: Handle animation end
  const handleAnimationEnd = (e: React.AnimationEvent<HTMLSpanElement>): void => {
    // Only show overlay if:
    // 1. Animation is slideToDestination
    // 2. This cell is pending destination
    // 3. Not viewing history
    // 4. Callbacks are provided
    if (
      e.animationName === 'slideToDestination' &&
      isPendingDestination &&
      !isViewingHistory &&
      onConfirmMove &&
      onCancelMove
    ) {
      setShowOverlay(true);
    }
  };

  // NEW: Reset overlay when isPendingDestination changes
  useEffect(() => {
    if (!isPendingDestination) {
      setShowOverlay(false);
    }
  }, [isPendingDestination]);

  // ... existing cell rendering logic ...

  return (
    <div
      role="gridcell"
      className={cellClasses}
      aria-label={ariaLabel}
      aria-pressed={isSelected}
      onClick={handleClick}
      tabIndex={isSelected ? 0 : -1}
    >
      {/* Piece rendering */}
      {pieceChar && piece && (
        <span
          key={isPendingDestination ? `animated-${piece.id || 'piece'}` : `static-${piece.id || 'piece'}`}
          className={`${styles.piece} ${isPendingDestination ? styles.animatedPiece : ''}`}
          aria-hidden="true"
          onAnimationEnd={handleAnimationEnd} // NEW
        >
          {pieceChar}
        </span>
      )}

      {/* Legal move indicator */}
      {isLegalMove && <span className={styles.moveIndicator} aria-hidden="true" />}

      {/* NEW: Overlay rendering */}
      {showOverlay && isPendingDestination && onConfirmMove && onCancelMove && (
        <MoveConfirmButton
          isOverlay={true}
          position={position}
          onConfirm={onConfirmMove}
          onCancel={onCancelMove}
        />
      )}
    </div>
  );
};
```

**Validation:**
```bash
pnpm run check # TypeScript
pnpm test GameCell.test.tsx # Unit tests
```

**IF_FAIL:**
- Check event type: `React.AnimationEvent<HTMLSpanElement>`
- Verify animationName matches CSS: `slideToDestination`
- Check useEffect import

**Rollback:** `git checkout src/components/game/GameCell.tsx`

---

#### Task 2.4: Wire Up GameBoard to Pass Callbacks
**File:** `src/components/game/GameBoard.tsx`

**Actions:**
```typescript
// MODIFY: Pass overlay callbacks to GameCell
<GameCell
  key={`${rowIndex}-${colIndex}`}
  position={position}
  piece={displayedPiece}
  isSelected={Boolean(isSelected)}
  isLegalMove={isLegalMove(position)}
  isLastMove={isLastMovePosition(position)}
  isPendingSource={isPendingSource}
  isPendingDestination={isPendingDest}
  onClick={handleCellClick}
  disabled={!isPlayerTurn}
  // NEW: Overlay integration
  onConfirmMove={isPendingDest ? () => onMove(pendingMove!.from, pendingMove!.to) : undefined}
  onCancelMove={isPendingDest ? onCancelMove : undefined}
  isViewingHistory={false} // TODO: Pass from App.tsx if applicable
/>
```

**Validation:**
```bash
pnpm run check # TypeScript
pnpm test GameBoard.test.tsx # Unit tests
```

**IF_FAIL:**
- Check pendingMove type guards: `pendingMove!.from`
- Verify onMove callback signature
- Add optional chaining if needed: `onCancelMove?.()`

**Rollback:** `git checkout src/components/game/GameBoard.tsx`

---

#### Task 2.5: Update App.tsx to Remove Old Button (After Overlay Works)
**File:** `src/App.tsx`

**Actions:**
```typescript
// REMOVE: Old MoveConfirmButton rendering (lines 772-778)
// This should be removed AFTER verifying overlay works

// Before:
// <div style={{ marginTop: 'var(--spacing-sm)' }}>
//   <MoveConfirmButton
//     onConfirm={handleConfirmMove}
//     disabled={!state.pendingMove || isViewingHistory}
//     isProcessing={false}
//   />
// </div>

// After: Deleted (overlay handles this now)

// MODIFY: Add isViewingHistory prop to GameBoard
<GameBoard
  gameState={displayedGameState}
  onMove={handleStageMove}
  onCancelMove={() => {
    dispatch({ type: 'DESELECT_PIECE' });
  }}
  isPlayerTurn={!isViewingHistory}
  pendingMove={state.pendingMove}
  realCurrentPlayer={state.gameState.currentPlayer}
  isViewingHistory={isViewingHistory} // NEW
/>
```

**Validation:**
```bash
pnpm run check
pnpm test App.test.tsx
pnpm dev # Manual testing
```

**IF_FAIL:**
- Revert removal if overlay not working
- Check dispatch action type: `DESELECT_PIECE`
- Verify pendingMove state clears correctly

**Rollback:** `git checkout src/App.tsx`

---

### Phase 3: Refactoring & Polish

#### Task 3.1: Extract Overlay Component (Optional Refactor)
**File:** `src/components/game/MoveConfirmOverlay.tsx` (NEW - if component gets too large)

**Actions:**
```typescript
// OPTIONAL: Extract overlay logic if MoveConfirmButton becomes >200 lines
// Keep existing MoveConfirmButton for traditional mode
// Create new MoveConfirmOverlay for overlay mode
// Use composition in GameCell
```

**Decision Point:** Skip if MoveConfirmButton stays under 200 lines

**Validation:**
```bash
pnpm run check
pnpm test # All tests still pass
```

**Rollback:** Not applicable (optional task)

---

#### Task 3.2: Performance Optimization
**File:** Various

**Actions:**
- ✅ Verify no unnecessary re-renders with React DevTools
- ✅ Check animation performance (should be 60fps)
- ✅ Test on mobile devices (iOS Safari, Android Chrome)
- ✅ Verify memory leaks (cleanup useEffect listeners)

**Validation:**
```bash
pnpm build
pnpm preview
# Test in production mode for performance
```

---

#### Task 3.3: Accessibility Audit
**Actions:**
- ✅ Test with screen reader (NVDA on Windows, VoiceOver on Mac)
- ✅ Test keyboard-only navigation (Tab, Enter, Escape)
- ✅ Verify focus visible indicators
- ✅ Check color contrast (WCAG AA minimum 4.5:1)
- ✅ Test with browser zoom (200%, 300%)

**Tools:**
```bash
# Lighthouse accessibility score
pnpm build && pnpm preview
# Open Chrome DevTools → Lighthouse → Accessibility
# Target: 95+ score

# axe DevTools
# Install browser extension, run audit
# Target: 0 violations
```

---

### Phase 4: Comprehensive Testing

#### Task 4.1: Run Full Test Suite
**Actions:**
```bash
# Level 1: Type checking
pnpm run check
# Expected: 0 errors

# Level 2: Linting
pnpm run lint
# Expected: 0 warnings, 0 errors

# Level 3: Unit tests with coverage
pnpm test:coverage
# Expected: 80%+ coverage, all tests passing

# Level 4: Integration tests
pnpm test:integration
# Expected: All integration tests passing

# Level 5: E2E tests
pnpm test:e2e
# Expected: All E2E tests passing

# Level 6: Build
pnpm build
# Expected: Successful build, no errors
```

**Success Criteria:**
- ✅ All validation levels pass
- ✅ No regressions in existing tests
- ✅ New tests cover overlay functionality
- ✅ 80%+ code coverage maintained

**IF_FAIL:**
- Review test failures, fix implementation
- Check for race conditions in animation tests
- Verify mock setup for FocusTrap

---

#### Task 4.2: Manual Testing Checklist

**Actions:**
```markdown
## Manual Test Cases

### Basic Functionality
- [ ] Start new game (hot-seat mode)
- [ ] Select a piece → click destination
- [ ] Verify piece animates to destination (750ms)
- [ ] Verify overlay appears after animation
- [ ] Verify Cancel and Confirm buttons visible
- [ ] Click Confirm → move completes
- [ ] Make another move
- [ ] Click Cancel → piece returns to origin

### Keyboard Navigation
- [ ] Make a move
- [ ] Verify focus auto-goes to Confirm button
- [ ] Press Tab → focus moves to Cancel
- [ ] Press Tab → focus returns to Confirm (trapped)
- [ ] Press Escape → move cancels
- [ ] Press Enter on Confirm → move completes

### Click Outside
- [ ] Make a move
- [ ] Click empty square → move cancels
- [ ] Make a move
- [ ] Click opponent piece → move cancels
- [ ] Make a move
- [ ] Click same piece → move cancels

### Edge Cases
- [ ] Move piece off-board → traditional button shows (not overlay)
- [ ] Enter history playback mode → overlay doesn't show
- [ ] Make move that ends game → overlay shows, then victory screen

### Visual Design
- [ ] Overlay centered in destination square
- [ ] Buttons don't completely cover piece
- [ ] Buttons side-by-side with 5px gap
- [ ] Cancel button is gray
- [ ] Confirm button is green
- [ ] Match existing button styles

### Dark Mode
- [ ] Switch OS to dark mode
- [ ] Verify overlay background is dark
- [ ] Verify button colors appropriate for dark mode
- [ ] Switch back to light mode → verify light colors

### Mobile/Responsive
- [ ] Test on mobile device (or Chrome DevTools mobile view)
- [ ] Verify buttons fit in square
- [ ] Verify buttons are tappable (close to 44px if possible)
- [ ] Test on tablet size
- [ ] Test on desktop size

### Accessibility
- [ ] Enable screen reader
- [ ] Verify dialog announced when overlay appears
- [ ] Verify button labels read correctly
- [ ] Verify Cancel action announced
- [ ] Verify Confirm action announced
- [ ] Test keyboard-only flow (no mouse)
```

**Success Criteria:**
- ✅ All manual test cases pass
- ✅ No visual glitches or bugs
- ✅ Smooth user experience

---

### Phase 5: Documentation & Cleanup

#### Task 5.1: Update Component Documentation
**File:** `src/components/game/MoveConfirmButton.tsx`

**Actions:**
```typescript
/**
 * @fileoverview Move confirmation button with overlay and traditional modes
 * @module components/game/MoveConfirmButton
 *
 * Displays move confirmation UI in two modes:
 * 1. Overlay mode: Shows Cancel + Confirm buttons overlaid on destination square (NEW)
 * 2. Traditional mode: Shows single Confirm button below board (preserved)
 *
 * Overlay mode features:
 * - Appears after piece animation completes (750ms)
 * - Focus trap between Cancel and Confirm buttons
 * - Auto-focus on Confirm button
 * - Escape key or click outside to cancel
 * - Responsive sizing based on square size
 * - Dark mode support
 * - Full accessibility (ARIA, keyboard nav)
 */
```

**Validation:** Review JSDoc comments are accurate

---

#### Task 5.2: Update Tests Documentation
**File:** `src/components/game/MoveConfirmButton.test.tsx`

**Actions:**
```typescript
/**
 * @fileoverview Tests for MoveConfirmButton component
 * @module components/game/MoveConfirmButton.test
 *
 * Test coverage:
 * - Traditional mode: Single Confirm button (existing)
 * - Overlay mode: Cancel + Confirm buttons with FocusTrap (NEW)
 * - Animation integration: Appears after slideToDestination (NEW)
 * - Keyboard accessibility: Tab, Enter, Escape (NEW)
 * - Edge cases: Off-board moves, history playback (NEW)
 *
 * Coverage: 95%+ (target)
 */
```

---

#### Task 5.3: Clean Up Dead Code
**Actions:**
- ✅ Remove console.log statements (if any added during debugging)
- ✅ Remove commented-out code
- ✅ Remove unused imports
- ✅ Remove old MoveConfirmButton rendering from App.tsx (verified working)

**Validation:**
```bash
pnpm run lint # Should catch unused imports
pnpm run check # TypeScript check
```

---

## Validation Loop

### Level 1: Syntax & Style
```bash
# Type checking
pnpm run check
# Expected: 0 errors

# Linting
pnpm run lint
# Expected: 0 warnings, 0 errors

# Code formatting
pnpm run format
# Expected: All files formatted
```

### Level 2: Unit Tests
```bash
# Run unit tests with coverage
pnpm test:coverage

# Expected results:
# - MoveConfirmButton.test.tsx: 25+ tests passing
# - GameCell.test.tsx: 35+ tests passing
# - GameBoard.test.tsx: 30+ tests passing
# - Overall coverage: 80%+ (target: 90%+)
```

### Level 3: Integration Tests
```bash
# Run integration tests
pnpm test:integration

# Expected:
# - Overlay appears after animation
# - Focus trap works correctly
# - Cancel/Confirm actions integrate with reducer
```

### Level 4: E2E Tests
```bash
# Run E2E tests
pnpm test:e2e move-confirmation.spec.ts

# Expected:
# - Full user flow works in browser
# - Overlay appears visually correct
# - Keyboard navigation functional
# - Click outside cancels
```

### Level 5: Build & Deploy
```bash
# Production build
pnpm build

# Expected:
# - Build succeeds
# - No bundle size warnings
# - Dist folder created

# Preview build
pnpm preview
# Manual verification in production mode
```

---

## Rollback Strategy

### Per-Task Rollback
Each task has individual rollback commands:
```bash
git checkout src/components/game/MoveConfirmButton.tsx
git checkout src/components/game/MoveConfirmButton.module.css
git checkout src/components/game/MoveConfirmButton.test.tsx
git checkout src/components/game/GameCell.tsx
git checkout src/components/game/GameCell.test.tsx
git checkout src/components/game/GameBoard.tsx
git checkout src/App.tsx
rm src/test/e2e/move-confirmation.spec.ts
```

### Full Rollback
If entire feature needs to be reverted:
```bash
git checkout issue-57-move-confirm-overlay -- .
git clean -fd
pnpm install
pnpm test # Verify everything works
```

### Partial Rollback
If overlay works but has issues:
1. Keep overlay implementation
2. Re-add traditional button in App.tsx temporarily
3. Debug overlay issues
4. Remove traditional button when fixed

---

## Debug Strategies

### Animation Not Triggering Overlay
**Symptoms:** Overlay never appears after piece moves

**Debug Steps:**
1. Check `onAnimationEnd` fires:
   ```typescript
   console.log('Animation ended:', e.animationName);
   ```
2. Verify `isPendingDestination` is true
3. Check animation name matches: `slideToDestination`
4. Verify callbacks are passed: `onConfirmMove`, `onCancelMove`

**Fix:** Ensure GameBoard passes callbacks only when `isPendingDest === true`

---

### Focus Trap Not Working
**Symptoms:** Tab escapes overlay, Escape doesn't work

**Debug Steps:**
1. Check FocusTrap `active` prop:
   ```typescript
   console.log('FocusTrap active:', showOverlay && isPendingDestination);
   ```
2. Verify refs are set: `confirmButtonRef.current !== null`
3. Check `focusTrapOptions` configuration

**Fix:** Ensure FocusTrap activates after overlay renders (not before)

---

### Overlay Positioning Wrong
**Symptoms:** Overlay not centered, overlaps piece completely

**Debug Steps:**
1. Check CSS `position: absolute` on `.overlay`
2. Verify parent cell has `position: relative` (GameCell)
3. Test transform calculation: `translate(-50%, -50%)`
4. Check z-index stacking

**Fix:** Add `position: relative` to `.gameCell` in GameCell.module.css

---

### Mobile Touch Targets Too Small
**Symptoms:** Buttons hard to tap on mobile

**Debug Steps:**
1. Check computed button height: DevTools → Elements → Computed
2. Test on actual device (not just DevTools)
3. Verify `min-height` applies

**Fix:** Adjust `min-height` and `padding` in responsive breakpoints

---

### Dark Mode Not Working
**Symptoms:** Overlay stays light in dark mode

**Debug Steps:**
1. Check `prefers-color-scheme` in DevTools
2. Verify CSS custom properties apply
3. Test with manual dark mode toggle: `[data-theme='dark']`

**Fix:** Ensure both `@media (prefers-color-scheme: dark)` and `:global([data-theme='dark'])` rules exist

---

## Performance Considerations

### Animation Performance
- **Target:** 60fps during slideToDestination animation
- **Metric:** Chrome DevTools → Performance → Record during move
- **Optimization:** Avoid layout thrashing, use `transform` not `top/left`

### Bundle Size Impact
- **Current:** ~320KB total bundle
- **Expected Change:** +2KB (FocusTrap already in bundle)
- **Monitor:** `pnpm build` → check dist/ sizes

### Re-render Frequency
- **Watch:** Overlay shouldn't cause unnecessary GameBoard re-renders
- **Tool:** React DevTools → Profiler
- **Fix:** Memoize callbacks if needed (though React 19 compiler should handle)

---

## Security Considerations

### XSS Prevention
- ✅ No `dangerouslySetInnerHTML` used
- ✅ All text content properly escaped (React default)
- ✅ ARIA labels don't include user input

### Focus Trap Escape
- ✅ Escape key always works (escape hatch)
- ✅ Click outside allowed (not a true modal trap)
- ✅ Browser back button doesn't break trap

---

## Success Metrics

### Quantitative
- ✅ 0 TypeScript errors
- ✅ 0 ESLint warnings
- ✅ 80%+ test coverage (target: 90%+)
- ✅ 95+ Lighthouse accessibility score
- ✅ 60fps animation performance
- ✅ <400KB total bundle size

### Qualitative
- ✅ User testing: "Easier to confirm/cancel moves"
- ✅ No regression reports in related functionality
- ✅ Positive accessibility feedback
- ✅ Code review approval

---

## Dependencies

### Existing
- `focus-trap-react: ^11.0.4` ✅ Already installed

### New
- None

---

## Estimated Timeline

### Day 1: TDD Red Phase + Green Implementation
- **Morning (2-3 hours):**
  - Task 1.1: Write failing unit tests
  - Task 1.2: Write failing integration tests
  - Task 1.3: Write E2E test scenarios

- **Afternoon (3-4 hours):**
  - Task 2.1: Refactor MoveConfirmButton
  - Task 2.2: Add overlay styles
  - Task 2.3: Integrate into GameCell
  - Task 2.4: Wire up GameBoard

### Day 2: Completion + Polish
- **Morning (2-3 hours):**
  - Task 2.5: Update App.tsx
  - Task 3.1-3.3: Refactoring & polish
  - Task 4.1: Run full test suite

- **Afternoon (2-3 hours):**
  - Task 4.2: Manual testing
  - Task 5.1-5.3: Documentation & cleanup
  - Final validation and PR prep

**Total:** 1-2 days (as estimated)

---

## Completion Checklist

### Implementation
- [ ] All unit tests pass (RED → GREEN)
- [ ] All integration tests pass
- [ ] All E2E tests pass
- [ ] TypeScript: 0 errors
- [ ] ESLint: 0 warnings
- [ ] 80%+ test coverage maintained

### Functionality
- [ ] Overlay appears after 750ms animation
- [ ] Cancel and Confirm buttons work
- [ ] Keyboard navigation functional
- [ ] Click outside cancels
- [ ] Escape key cancels
- [ ] Focus trap works
- [ ] Off-board moves use traditional button
- [ ] History playback disables overlay

### Quality
- [ ] Dark mode works
- [ ] Mobile responsive
- [ ] Accessibility tested
- [ ] Performance verified
- [ ] No console errors
- [ ] No memory leaks

### Documentation
- [ ] Component JSDoc updated
- [ ] Test documentation updated
- [ ] Dead code removed
- [ ] README updated (if applicable)

---

## Notes

- **React 19 Compiler:** No need for `useCallback`/`useMemo` - compiler handles it
- **Focus Management:** FocusTrap library handles all edge cases (tried and tested)
- **Animation Timing:** 750ms is fixed in CSS, no need to make configurable
- **Off-Board Moves:** Explicitly excluded from overlay mode (no destination square)
- **State Management:** Uses existing `DESELECT_PIECE` action (no new actions needed)

---

## References

- **Issue:** https://github.com/randallard/kings-cooking/issues/57
- **CLAUDE-REACT.md:** `/home/ryankhetlyr/Development/kings-cooking/claude_md_files/CLAUDE-REACT.md`
- **PRP Framework:** `/home/ryankhetlyr/Development/kings-cooking/CLAUDE.md`
- **focus-trap-react:** https://github.com/focus-trap/focus-trap-react

---

**Created:** 2025-10-25
**Author:** Claude Code (AI Assistant)
**Methodology:** PRP Framework + TDD (Red-Green-Refactor)
