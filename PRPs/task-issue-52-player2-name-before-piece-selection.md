# TASK PRP: Fix Independent Mode Piece Selection - Collect Player 2 Name Before Piece Picking

**Issue:** #52
**Branch:** issue-52-player2-name-before-piece-selection
**Severity:** 🔥 Critical
**Mode:** TDD (Red → Green → Refactor)

## Goal

Fix independent piece selection mode to collect Player 2's name BEFORE they pick their pieces, with proper handoff screen message.

## Why

Currently in independent mode, after Player 1 finishes piece selection, the app skips Player 2 name collection and goes straight to piece picking. This creates confusion about whose turn it is and results in Player 2's name being "Player 2" throughout the game.

## What (User-Visible Behavior)

### Before (Broken)
1. Player 1 completes piece selection
2. Handoff screen shows: "Light (Player 1) made their move" ❌
3. Piece selection modal appears immediately ❌
4. Player 2 name is never collected, shows as "Player 2" ❌

### After (Fixed)
1. Player 1 completes piece selection
2. Handoff screen shows: "[Player1Name] finished picking. Player two's turn to pick pieces" ✅
3. Name form appears (pre-filled from localStorage if available, editable) ✅
4. After Player 2 submits name, piece selection modal appears with correct row ✅
   - Row 0 if Player 2 is dark (Player 1 chose light)
   - Row 2 if Player 2 is light (Player 1 chose dark)

## All Needed Context

### Affected Files
- **src/components/game/PieceSelectionScreen.tsx** - Main component to modify
- **src/components/game/PieceSelectionScreen.test.tsx** - Tests to update/add
- **src/components/game/HandoffScreen.tsx** - Already supports custom messages (no changes)
- **src/components/game/NameForm.tsx** - Reusable component (no changes needed)

### Current Code Analysis

**Location:** `src/components/game/PieceSelectionScreen.tsx:126-143`

```tsx
// CURRENT BROKEN FLOW:
if (allPiecesSelected && state.selectionMode === 'independent') {
  if (currentSelector === 'player1') {
    setShowHandoff(true); // Shows handoff
  }
}

const handleHandoffContinue = (): void => {
  setShowHandoff(false);
  setCurrentSelector('player2'); // ❌ Goes straight to piece selection
};
```

**Location:** `src/components/game/PieceSelectionScreen.tsx:425-434`

```tsx
// CURRENT HANDOFF RENDERING:
{showHandoff && state.selectionMode === 'independent' && (
  <HandoffScreen
    nextPlayer="dark"  // ❌ HARDCODED - should use state.player1Color
    nextPlayerName={state.player2Name || 'Player 2'}
    previousPlayer="light"  // ❌ HARDCODED
    previousPlayerName={state.player1Name}
    onContinue={handleHandoffContinue}  // ❌ Goes straight to pieces
    countdownSeconds={3}
  />
)}
```

### Key Patterns from Codebase

#### NameForm Component (Already Implemented)
**Location:** `src/components/game/NameForm.tsx`

Usage pattern:
```tsx
<NameForm
  player={1 | 2}  // Which player
  value={state.player1Name || ''}  // Pre-fill from localStorage
  onNameChange={(name) => dispatch({ type: 'SET_PLAYER1_NAME', name })}
  autoFocus={true}
/>
```

#### HandoffScreen Message Customization
**Location:** `src/components/game/HandoffScreen.tsx:115-122`

The component supports custom messages via `isGameStart` prop, but for piece selection we need a NEW message type. Looking at the implementation, HandoffScreen uses:
- `previousPlayerName` and `previousPlayer` for "X made their move"
- `nextPlayerName` and `nextPlayer` for "X's turn"

**Solution:** We can override the message by using a NEW prop or by setting specific values that produce the right message.

**Actually**, looking at HandoffScreen more carefully, we need to pass a custom message. The current implementation doesn't support "finished picking" messages. We have two options:

1. Add a new prop `customMessage?: string` to HandoffScreen
2. Work around by setting `isGameStart=true` which changes the message format

**Decision:** Use a workaround for now - we can set `isGameStart=true` to get "gets the first move" message, but that's not exactly right either. Better to add proper support.

**WAIT** - Looking at the issue requirements again: "[Player1Name] finished picking. Player two's turn to pick pieces"

This is piece-selection-specific. Let's add a simple text display instead of complicating HandoffScreen.

### Gotchas

1. **Player Color Logic**: Player 2's color is OPPOSITE of Player 1's color
   - If `state.player1Color === 'light'` → Player 2 is dark → selects row 0
   - If `state.player1Color === 'dark'` → Player 2 is light → selects row 2

2. **localStorage**: NameForm already handles pre-filling from localStorage via `storage.getPlayer2Name()`

3. **State Management**: PieceSelectionScreen uses local state (`useState`) not reducer actions for UI flow

4. **Both Modes**: Fix must work for both hot-seat AND URL modes (same component)

## Implementation Blueprint

### PHASE 1: Add Name Collection State (TDD Red)

**TASK 1.1: Write failing test for Player 2 name collection flow**

File: `src/components/game/PieceSelectionScreen.test.tsx`

```typescript
describe('Independent Mode - Player 2 Name Collection', () => {
  it('should show name form after Player 1 completes piece selection', async () => {
    const dispatch = vi.fn();
    const state: PieceSelectionPhase = {
      phase: 'piece-selection',
      mode: 'hotseat',
      player1Name: 'Alice',
      player2Name: '',
      selectionMode: 'independent',
      player1Pieces: ['pawn', 'knight', 'rook'], // Complete
      player2Pieces: [null, null, null],
      player1Color: 'light',
    };

    render(<PieceSelectionScreen state={state} dispatch={dispatch} />);

    // Handoff should show initially (Player 1 done)
    expect(screen.getByText(/Alice finished picking/i)).toBeInTheDocument();
    expect(screen.getByText(/Player two's turn to pick pieces/i)).toBeInTheDocument();

    // Click continue on handoff
    const continueButton = screen.getByRole('button', { name: /skip countdown/i });
    fireEvent.click(continueButton);

    // Name form should appear
    await waitFor(() => {
      expect(screen.getByLabelText(/Player 2.*name/i)).toBeInTheDocument();
    });

    // Piece selection modal should NOT appear yet
    expect(screen.queryByText(/Choose a piece/i)).not.toBeInTheDocument();
  });

  it('should show piece selection after Player 2 submits name', async () => {
    // ... test that after name submission, piece modal appears with correct row
  });
});
```

**VALIDATE:**
```bash
pnpm test src/components/game/PieceSelectionScreen.test.tsx
# Should FAIL - name form not implemented yet
```

**IF_FAIL:** If test doesn't fail, the test isn't correctly checking for name form

**ROLLBACK:** `git checkout src/components/game/PieceSelectionScreen.test.tsx`

---

### PHASE 2: Implement Name Collection UI (TDD Green)

**TASK 2.1: Add state for name form visibility**

File: `src/components/game/PieceSelectionScreen.tsx`

Add after line 45:
```typescript
// Track handoff screen visibility (independent mode only)
const [showHandoff, setShowHandoff] = useState(false);
// ADD THIS:
const [showNameForm, setShowNameForm] = useState(false);
```

**VALIDATE:**
```bash
pnpm run check  # TypeScript check
```

---

**TASK 2.2: Modify handoff continue handler**

File: `src/components/game/PieceSelectionScreen.tsx:140-143`

Replace:
```typescript
const handleHandoffContinue = (): void => {
  setShowHandoff(false);
  setCurrentSelector('player2');
};
```

With:
```typescript
const handleHandoffContinue = (): void => {
  setShowHandoff(false);
  setShowNameForm(true); // Show name form instead of going straight to pieces
};
```

**VALIDATE:**
```bash
pnpm run check
```

---

**TASK 2.3: Add handler for name form submission**

File: `src/components/game/PieceSelectionScreen.tsx`

Add after `handleHandoffContinue`:
```typescript
const handlePlayer2NameSubmit = (name: string): void => {
  // Dispatch SET_PLAYER2_NAME action
  dispatch({ type: 'SET_PLAYER2_NAME', name });

  // Hide name form and proceed to piece selection
  setShowNameForm(false);
  setCurrentSelector('player2');
};
```

**VALIDATE:**
```bash
pnpm run check
```

---

**TASK 2.4: Add NameForm import and rendering**

File: `src/components/game/PieceSelectionScreen.tsx`

Add import at top:
```typescript
import { NameForm } from './NameForm';
```

Add rendering after the HandoffScreen (around line 434):
```tsx
{/* Name Form (Independent Mode - Player 2) */}
{showNameForm && state.selectionMode === 'independent' && (
  <div className={styles.nameFormOverlay}>
    <div className={styles.nameFormContainer}>
      <h2>Player 2, enter your name</h2>
      <NameForm
        player={2}
        value={state.player2Name || ''}
        onNameChange={handlePlayer2NameSubmit}
        autoFocus={true}
      />
    </div>
  </div>
)}
```

**VALIDATE:**
```bash
pnpm run check
pnpm test src/components/game/PieceSelectionScreen.test.tsx
# Should PASS now
```

**IF_FAIL:** Check that NameForm is receiving correct props and handler is wired correctly

---

### PHASE 3: Fix Handoff Screen Message (TDD Green Continued)

**TASK 3.1: Fix handoff screen player colors**

File: `src/components/game/PieceSelectionScreen.tsx:425-434`

Replace hardcoded values with correct logic:
```tsx
{showHandoff && state.selectionMode === 'independent' && state.player1Color && (
  <div className={styles.handoffOverlay}>
    <div className={styles.handoffContainer}>
      <h2>{state.player1Name} finished picking pieces</h2>
      <p>Player two's turn to pick pieces</p>
      <button onClick={handleHandoffContinue} className={styles.continueButton}>
        Continue
      </button>
    </div>
  </div>
)}
```

OR if we want to reuse HandoffScreen with proper values:
```tsx
{showHandoff && state.selectionMode === 'independent' && state.player1Color && (() => {
  // Determine player colors based on player1Color
  const player1Player = state.player1Color; // 'light' or 'dark'
  const player2Player = state.player1Color === 'light' ? 'dark' : 'light';

  return (
    <div className={styles.customHandoff}>
      <h2>{state.player1Name} finished picking pieces</h2>
      <p>Player two's turn to pick pieces</p>
      <button onClick={handleHandoffContinue}>Continue</button>
    </div>
  );
})()}
```

**Decision:** Create a simple custom handoff UI for piece selection instead of overcomplicating HandoffScreen component.

**VALIDATE:**
```bash
pnpm run check
pnpm test
```

---

### PHASE 4: Add CSS Styling (TDD Green Continued)

**TASK 4.1: Add styles for name form overlay**

File: `src/components/game/PieceSelectionScreen.module.css`

Add at end:
```css
.nameFormOverlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.nameFormContainer {
  background: var(--color-background);
  padding: 2rem;
  border-radius: 8px;
  max-width: 500px;
  width: 90%;
  text-align: center;
}

.nameFormContainer h2 {
  margin-bottom: 1.5rem;
  color: var(--color-text);
}

.handoffOverlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.handoffContainer {
  background: var(--color-background);
  padding: 2rem;
  border-radius: 8px;
  max-width: 500px;
  width: 90%;
  text-align: center;
}

.handoffContainer h2 {
  margin-bottom: 1rem;
  color: var(--color-text);
}

.handoffContainer p {
  margin-bottom: 1.5rem;
  font-size: 1.1rem;
  color: var(--color-text-secondary);
}

.continueButton {
  padding: 0.75rem 2rem;
  font-size: 1rem;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.continueButton:hover {
  background: var(--color-primary-dark);
}
```

**VALIDATE:**
```bash
pnpm run lint
pnpm run check
```

---

### PHASE 5: Integration Tests (TDD)

**TASK 5.1: Write integration test for complete flow**

File: `src/components/game/PieceSelectionScreen.test.tsx`

```typescript
describe('Independent Mode - Complete Flow', () => {
  it('should complete full Player 2 setup flow', async () => {
    const dispatch = vi.fn();
    const state: PieceSelectionPhase = {
      phase: 'piece-selection',
      mode: 'hotseat',
      player1Name: 'Alice',
      player2Name: '',
      selectionMode: 'independent',
      player1Pieces: ['pawn', 'knight', 'rook'],
      player2Pieces: [null, null, null],
      player1Color: 'light',
    };

    const { rerender } = render(<PieceSelectionScreen state={state} dispatch={dispatch} />);

    // 1. Handoff screen
    expect(screen.getByText(/Alice finished picking/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    // 2. Name form appears
    await waitFor(() => {
      expect(screen.getByLabelText(/Player 2.*name/i)).toBeInTheDocument();
    });

    // 3. Submit name
    const nameInput = screen.getByLabelText(/Player 2.*name/i);
    fireEvent.change(nameInput, { target: { value: 'Bob' } });
    fireEvent.submit(nameInput.closest('form')!);

    // 4. Verify SET_PLAYER2_NAME dispatched
    await waitFor(() => {
      expect(dispatch).toHaveBeenCalledWith({
        type: 'SET_PLAYER2_NAME',
        name: 'Bob',
      });
    });

    // 5. Rerender with updated state
    const updatedState = { ...state, player2Name: 'Bob' };
    rerender(<PieceSelectionScreen state={updatedState} dispatch={dispatch} />);

    // 6. Now piece selection should be available
    // Player 2 is dark (Player 1 chose light), so row 0 should be clickable
    // This test verifies the UI is ready for piece selection
  });
});
```

**VALIDATE:**
```bash
pnpm test src/components/game/PieceSelectionScreen.test.tsx
```

---

### PHASE 6: Refactor & Edge Cases (TDD Refactor)

**TASK 6.1: Handle localStorage pre-fill**

Verify that NameForm correctly pre-fills from localStorage:
- NameForm already handles this via `value={state.player2Name || ''}`
- State is restored from localStorage in App.tsx
- No additional code needed ✅

**TASK 6.2: Handle both game modes**

Verify fix works for both hot-seat and URL modes:
- Component doesn't have mode-specific logic
- Works the same for both modes ✅

**TASK 6.3: Add test for URL mode**

File: `src/components/game/PieceSelectionScreen.test.tsx`

```typescript
it('should work in URL mode', async () => {
  const state: PieceSelectionPhase = {
    phase: 'piece-selection',
    mode: 'url', // URL MODE
    player1Name: 'Alice',
    player2Name: '',
    selectionMode: 'independent',
    player1Pieces: ['pawn', 'knight', 'rook'],
    player2Pieces: [null, null, null],
    player1Color: 'dark', // Test dark color too
  };

  // Same flow should work
});
```

---

## Validation Loop

### Level 1: Type Checking & Linting
```bash
pnpm run check      # TypeScript
pnpm run lint       # ESLint
```

**Pass Criteria:** Zero errors

**Debug Strategy:** If TypeScript errors about NameForm, check import path

---

### Level 2: Unit Tests
```bash
pnpm test src/components/game/PieceSelectionScreen.test.tsx
```

**Pass Criteria:** All tests green

**Debug Strategy:**
- If name form doesn't appear: Check `showNameForm` state logic
- If dispatch not called: Verify `handlePlayer2NameSubmit` is wired to NameForm
- If wrong row clickable: Check `player1Color` logic

---

### Level 3: Integration Tests
```bash
pnpm test:integration
```

**Pass Criteria:** All integration tests pass

---

### Level 4: Build
```bash
pnpm build
```

**Pass Criteria:** Build succeeds with no errors

---

## Rollback Strategy

Each task can be individually rolled back:
```bash
git checkout src/components/game/PieceSelectionScreen.tsx
git checkout src/components/game/PieceSelectionScreen.test.tsx
git checkout src/components/game/PieceSelectionScreen.module.css
```

Full rollback:
```bash
git reset --hard HEAD
```

## Success Criteria

- [ ] After Player 1 completes pieces, handoff shows "[Player1Name] finished picking. Player two's turn to pick pieces"
- [ ] After handoff, name form appears for Player 2
- [ ] Name form is pre-filled from localStorage if available
- [ ] Player 2 can edit the name
- [ ] After name submission, SET_PLAYER2_NAME is dispatched
- [ ] After name submission, piece selection modal appears with correct row
- [ ] Row 0 clickable if Player 2 is dark (Player 1 chose light)
- [ ] Row 2 clickable if Player 2 is light (Player 1 chose dark)
- [ ] Works in both hot-seat and URL modes
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] TypeScript check passes
- [ ] Linting passes
- [ ] Build succeeds

## Performance & Security Notes

- **Performance:** No concerns - adding one additional UI state
- **Security:** NameForm already sanitizes input
- **Accessibility:** NameForm already has ARIA labels and keyboard navigation

## Estimated Complexity

**Time:** ~2 hours
**Risk:** Low - isolated to one component, well-tested
**Dependencies:** None - uses existing NameForm component
