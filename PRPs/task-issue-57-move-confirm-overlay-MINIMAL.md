# Task PRP: Move Confirm Overlay (MINIMAL)

**Issue:** #57
**Type:** Feature Refactor (TDD)
**Priority:** 🔥 Critical
**Estimated Complexity:** 🟢 Simple (4-6 hours)
**Created:** 2025-10-25

---

## DRY Analysis - What's Already Working

### ✅ Existing Implementation (REUSE)

1. **Animation** ✅
   - `GameCell.module.css` line 84: `slideToDestination 750ms ease-out`
   - Already animates piece to destination
   - NO CHANGES NEEDED

2. **Confirm Move Logic** ✅
   - `App.tsx` line 517: `handleConfirmMove()` - Complete implementation
   - Executes move, updates state, generates URLs
   - NO CHANGES NEEDED

3. **Cancel Move Logic** ✅
   - `App.tsx` line 788: `dispatch({ type: 'DESELECT_PIECE' })`
   - Clears pendingMove, returns piece to origin
   - NO CHANGES NEEDED

4. **Pending Move State** ✅
   - Reducer: `STAGE_MOVE` action sets `pendingMove: { from, to }`
   - Reducer: `DESELECT_PIECE` clears `pendingMove: null`
   - NO CHANGES NEEDED

5. **MoveConfirmButton Component** ✅
   - Already has `onConfirm` callback
   - Already has disabled/processing states
   - Already has dark mode support
   - MINIMAL CHANGES: Add `onCancel` prop + Cancel button

6. **GameCell Pending State** ✅
   - Already receives `isPendingDestination` prop
   - Already shows piece at destination with animation
   - MINIMAL CHANGES: Render button inside cell

---

## Goal (MINIMAL)

**Move the existing MoveConfirmButton from below the board into the destination square.**

That's it. No new state, no new actions, no complex focus management.

---

## What Changes (MINIMAL)

### File 1: MoveConfirmButton.tsx (ADD 15 LINES)

**Current:**
```typescript
interface MoveConfirmButtonProps {
  onConfirm: () => void;
  disabled?: boolean;
  isProcessing?: boolean;
  error?: string | null;
}
```

**Change:**
```typescript
interface MoveConfirmButtonProps {
  onConfirm: () => void;
  onCancel?: () => void;        // NEW: Optional cancel callback
  isOverlay?: boolean;           // NEW: Compact overlay layout
  disabled?: boolean;
  isProcessing?: boolean;
  error?: string | null;
}

export const MoveConfirmButton = ({
  onConfirm,
  onCancel,                      // NEW
  isOverlay = false,             // NEW
  disabled,
  isProcessing,
  error,
}: MoveConfirmButtonProps) => {
  // If overlay mode AND onCancel provided, render two buttons
  if (isOverlay && onCancel) {
    return (
      <div className={styles.overlay}>
        <button onClick={onCancel} className={styles.cancelButton}>
          Cancel
        </button>
        <button onClick={onConfirm} disabled={disabled} className={styles.confirmButton}>
          Confirm
        </button>
      </div>
    );
  }

  // Otherwise, render traditional single button (existing code unchanged)
  return (/* existing code */);
};
```

**That's it!** 15 lines added, no existing code changed.

---

### File 2: MoveConfirmButton.module.css (ADD 30 LINES)

**Add:**
```css
/* Overlay container - centered in cell */
.overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  gap: 5px;
  z-index: 10;
  background: rgba(255, 255, 255, 0.95);
  padding: 4px;
  border-radius: 4px;
}

/* Compact buttons for overlay */
.overlay .cancelButton,
.overlay .confirmButton {
  min-height: 36px;
  padding: 6px 12px;
  font-size: 0.875rem;
  font-weight: 600;
  border-radius: 4px;
  cursor: pointer;
}

.cancelButton {
  background-color: #6c757d;
  color: white;
  border: 2px solid #5a6268;
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
  .overlay {
    background: rgba(0, 0, 0, 0.95);
  }
}
```

**That's it!** 30 lines of CSS, reuses existing button styles.

---

### File 3: GameCell.tsx (ADD 15 LINES)

**Current:** Just renders piece and move indicator

**Change:**
```typescript
import { MoveConfirmButton } from './MoveConfirmButton';

interface GameCellProps {
  // ... existing props ...
  onConfirmMove?: () => void;   // NEW
  onCancelMove?: () => void;    // NEW
  isViewingHistory?: boolean;   // NEW
}

export const GameCell = ({
  // ... existing props ...
  onConfirmMove,                // NEW
  onCancelMove,                 // NEW
  isViewingHistory = false,     // NEW
}: GameCellProps) => {
  // ... existing rendering ...

  return (
    <div className={cellClasses} onClick={handleClick}>
      {/* Existing piece rendering */}
      {pieceChar && piece && <span>{pieceChar}</span>}

      {/* Existing legal move indicator */}
      {isLegalMove && <span className={styles.moveIndicator} />}

      {/* NEW: Overlay button in pending destination */}
      {isPendingDestination && !isViewingHistory && onConfirmMove && onCancelMove && (
        <MoveConfirmButton
          isOverlay={true}
          onConfirm={onConfirmMove}
          onCancel={onCancelMove}
        />
      )}
    </div>
  );
};
```

**That's it!** 15 lines, button renders in cell when pending.

---

### File 4: GameBoard.tsx (CHANGE 2 LINES)

**Current:**
```typescript
<GameCell
  position={position}
  piece={displayedPiece}
  onClick={handleCellClick}
  // ... other props ...
/>
```

**Change:**
```typescript
<GameCell
  position={position}
  piece={displayedPiece}
  onClick={handleCellClick}
  // ... other props ...
  onConfirmMove={isPendingDest ? () => onMove(pendingMove!.from, pendingMove!.to) : undefined}
  onCancelMove={isPendingDest ? onCancelMove : undefined}
  isViewingHistory={false}  // TODO: Pass from App if needed
/>
```

**That's it!** 3 props added to existing component call.

---

### File 5: App.tsx (DELETE 7 LINES)

**Current:**
```typescript
<div style={{ marginTop: 'var(--spacing-sm)' }}>
  <MoveConfirmButton
    onConfirm={handleConfirmMove}
    disabled={!state.pendingMove || isViewingHistory}
    isProcessing={false}
  />
</div>
```

**Change:**
```typescript
// DELETE ENTIRE BLOCK - button now renders inside GameCell
```

**That's it!** Just delete the old button location.

---

## Implementation Steps (MINIMAL)

### Step 1: Add Cancel Button to MoveConfirmButton (15 min)

```bash
# Edit src/components/game/MoveConfirmButton.tsx
# Add onCancel prop
# Add isOverlay prop
# Add overlay rendering mode
```

**Test:**
```bash
pnpm run check  # Should pass
```

---

### Step 2: Add Overlay CSS (10 min)

```bash
# Edit src/components/game/MoveConfirmButton.module.css
# Add .overlay styles
# Add .cancelButton styles
```

**Test:**
```bash
# Visual check in browser
pnpm dev
```

---

### Step 3: Render Button in GameCell (15 min)

```bash
# Edit src/components/game/GameCell.tsx
# Import MoveConfirmButton
# Add new props (onConfirmMove, onCancelMove, isViewingHistory)
# Render MoveConfirmButton when isPendingDestination
```

**Test:**
```bash
pnpm run check  # Should pass
```

---

### Step 4: Pass Callbacks from GameBoard (10 min)

```bash
# Edit src/components/game/GameBoard.tsx
# Pass onConfirmMove and onCancelMove to GameCell
# Only when isPendingDest is true
```

**Test:**
```bash
pnpm run check  # Should pass
pnpm test GameBoard.test.tsx  # Existing tests should pass
```

---

### Step 5: Remove Old Button from App.tsx (5 min)

```bash
# Edit src/App.tsx
# Delete lines 772-778 (MoveConfirmButton below board)
```

**Test:**
```bash
pnpm run check  # Should pass
pnpm dev  # Manual test: make a move, see overlay in cell
```

---

### Step 6: Update Tests (30 min)

**Add minimal tests:**

```typescript
// MoveConfirmButton.test.tsx
describe('Overlay Mode', () => {
  it('renders Cancel and Confirm in overlay mode', () => {
    render(<MoveConfirmButton isOverlay onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Confirm')).toBeInTheDocument();
  });

  it('calls onCancel when Cancel clicked', async () => {
    const onCancel = vi.fn();
    render(<MoveConfirmButton isOverlay onConfirm={vi.fn()} onCancel={onCancel} />);
    await userEvent.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalled();
  });
});

// GameCell.test.tsx
describe('Overlay Integration', () => {
  it('renders MoveConfirmButton when isPendingDestination', () => {
    render(
      <GameCell
        isPendingDestination={true}
        onConfirmMove={vi.fn()}
        onCancelMove={vi.fn()}
        // ... other required props
      />
    );
    expect(screen.getByText('Confirm')).toBeInTheDocument();
  });

  it('does not render overlay during history playback', () => {
    render(
      <GameCell
        isPendingDestination={true}
        isViewingHistory={true}
        onConfirmMove={vi.fn()}
        onCancelMove={vi.fn()}
      />
    );
    expect(screen.queryByText('Confirm')).not.toBeInTheDocument();
  });
});
```

**Test:**
```bash
pnpm test:coverage  # Should maintain 80%+
```

---

## Total Changes Summary

**5 files modified:**
1. `MoveConfirmButton.tsx` - **+15 lines** (add Cancel button + overlay mode)
2. `MoveConfirmButton.module.css` - **+30 lines** (overlay styles)
3. `GameCell.tsx` - **+15 lines** (render button in cell)
4. `GameBoard.tsx` - **+3 lines** (pass callbacks)
5. `App.tsx` - **-7 lines** (delete old button)

**Total: ~56 lines of code changed**

Compare to complex version: **~500 lines**

---

## What We're NOT Doing (Keep It Simple)

❌ ~~FocusTrap~~ - Nice-to-have, not required
❌ ~~Animation event listener~~ - Button just appears with piece (simpler)
❌ ~~New state management~~ - Reuse existing pendingMove
❌ ~~New components~~ - Modify existing MoveConfirmButton
❌ ~~Complex accessibility~~ - Basic buttons work fine, add ARIA later if needed
❌ ~~E2E tests~~ - Add later if needed, unit tests sufficient

---

## Validation (MINIMAL)

### Level 1: Type Check + Lint
```bash
pnpm run check  # 0 errors
pnpm run lint   # 0 warnings
```

### Level 2: Unit Tests
```bash
pnpm test MoveConfirmButton.test.tsx  # +2 tests
pnpm test GameCell.test.tsx           # +2 tests
pnpm test:coverage                    # 80%+ maintained
```

### Level 3: Manual Test
```bash
pnpm dev
# Make a move → verify overlay appears in cell
# Click Cancel → verify piece returns
# Click Confirm → verify move completes
# Test in dark mode
# Test on mobile (Chrome DevTools)
```

### Level 4: Build
```bash
pnpm build  # Should succeed
```

---

## Rollback (MINIMAL)

**If anything breaks:**
```bash
# Individual files
git checkout src/components/game/MoveConfirmButton.tsx
git checkout src/components/game/MoveConfirmButton.module.css
git checkout src/components/game/GameCell.tsx
git checkout src/components/game/GameBoard.tsx
git checkout src/App.tsx

# Or full rollback
git checkout issue-57-move-confirm-overlay -- .
```

---

## Timeline (MINIMAL)

**Total: 4-6 hours**

- Step 1-2 (Button changes): 25 min
- Step 3-4 (Integration): 25 min
- Step 5 (Cleanup): 5 min
- Step 6 (Tests): 30 min
- Manual testing: 30 min
- Buffer for issues: 2-3 hours

Compare to complex version: **12-14 hours**

---

## Why This Is Better

### DRY Principles ✅
- **Reuses** existing `handleConfirmMove` (60 lines)
- **Reuses** existing `DESELECT_PIECE` action
- **Reuses** existing `pendingMove` state
- **Reuses** existing animation (no new event listeners)
- **Reuses** existing MoveConfirmButton component (just extends it)

### KISS Principles ✅
- **No** new state management
- **No** complex focus trapping
- **No** animation event handling
- **No** new components
- **Just** move the button location + add Cancel

### YAGNI Principles ✅
- **Skip** FocusTrap until user complains
- **Skip** complex accessibility until needed
- **Skip** E2E tests until pattern stabilizes
- **Focus** on core functionality first

---

## Accessibility Notes (Future Enhancement)

**Current:** Basic keyboard support (buttons are focusable)

**Future Enhancements (if needed):**
- Add FocusTrap for overlay
- Add Escape key handler
- Add ARIA dialog attributes
- Add screen reader announcements

**Decision:** Start simple, enhance based on user feedback.

---

## Comparison to Complex Version

| Aspect | Complex PRP | Minimal PRP |
|--------|-------------|-------------|
| **Lines Changed** | ~500 | ~56 |
| **New Components** | 1 (MoveConfirmOverlay) | 0 |
| **New State** | Animation timing state | 0 |
| **Dependencies** | focus-trap-react | 0 (already installed) |
| **Test Cases** | ~25 | ~4 |
| **Implementation Time** | 12-14 hours | 4-6 hours |
| **Complexity** | High | Low |
| **Maintenance** | More surface area | Less surface area |

---

## Success Criteria (MINIMAL)

✅ Overlay appears in destination square
✅ Cancel and Confirm buttons visible
✅ Clicking Cancel returns piece
✅ Clicking Confirm completes move
✅ Works in light and dark mode
✅ No TypeScript errors
✅ No ESLint warnings
✅ Existing tests pass
✅ Build succeeds

**Nice-to-haves (add later if needed):**
- Focus trap
- Escape key handler
- Animation timing
- E2E tests

---

## Notes

**Start with this minimal version.** If users request additional features (focus trap, escape key, etc.), we can add them incrementally. This follows YAGNI - implement what's needed now, not what might be needed later.

**The existing implementation already does 90% of the work.** We're just moving the button location and adding a Cancel option.

---

**Created:** 2025-10-25
**Author:** Claude Code (AI Assistant)
**Methodology:** DRY + KISS + YAGNI + TDD
**Comparison:** See `task-issue-57-move-confirm-overlay.md` for comprehensive version
