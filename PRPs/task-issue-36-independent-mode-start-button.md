# Task PRP: Fix Independent Mode Piece Selection (#36)

**Issue**: https://github.com/randallard/kings-cooking/issues/36
**Branch**: `issue-36-independent-mode-start-button`
**Type**: 🐛 Bug Fix (critical - app unusable in independent mode)
**Complexity**: Medium (affects piece selection flow, state management)

---

## Goal

Fix independent mode piece selection to allow both players to select their own pieces independently with blind selection (Player 2 cannot see Player 1's choices) and proper handoff between players.

**Success Criteria**:
- Player 1 selects 3 pieces
- Handoff screen appears (reuse existing HandoffScreen component)
- Player 2 selects their own 3 pieces (blind - cannot see Player 1's selections)
- Start Game button appears when both players complete selection
- Remove temporary workaround that copies Player 1's pieces to Player 2
- All tests pass with 80%+ coverage
- WCAG 2.1 AA accessibility maintained

---

## Why

**User Value**:
- Unlocks independent mode as described in game features
- Allows players to choose different pieces for asymmetric gameplay
- Prevents Player 2 from seeing Player 1's choices (strategic advantage)

**Technical Debt**:
- Current workaround (lines 92-98 in PieceSelectionScreen.tsx) copies Player 1's pieces to Player 2
- Independent mode is essentially broken - cannot progress past piece selection
- START_GAME action never triggers in independent mode

**User Reported Issue**:
- "there's no transition out of player 1 choosing pieces"
- "no console log messages, no button appears, pieces selected fine"

---

## What (User-Visible Behavior)

### Independent Mode Flow (Fixed)

**Before Fix**:
1. Player 1 selects 3 pieces
2. ❌ STUCK - no Start Game button appears
3. ❌ Cannot progress

**After Fix**:
1. Player 1 selects 3 pieces (positions 0, 1, 2)
2. **Handoff screen appears**: "Pass device to [Player 2 Name]"
3. Countdown (3 seconds) or skip button
4. **Handoff completes** → Player 2's selection screen
5. Player 2 sees: Empty board (blind selection) + piece picker
6. Player 2 selects THEIR 3 pieces (can be different from Player 1)
7. **Start Game button appears**
8. Game begins with both players' independently chosen pieces

### Comparison with Other Modes

**Mirrored Mode**:
- Player 1 selects 3 pieces
- Player 2 automatically gets SAME pieces
- Start Game button appears immediately

**Random Mode**:
- Both players get identical random pieces
- Start Game button appears immediately

**Independent Mode** (NEW):
- Player 1 selects → Handoff → Player 2 selects (different pieces allowed)
- Start Game button appears after both complete

---

## All Needed Context

### Documentation

**React 19 Patterns**:
- File: `/home/ryankhetlyr/Development/kings-cooking/claude_md_files/CLAUDE-REACT.md`
- Focus: Component state management, conditional rendering, focus management

**Existing Handoff Implementation**:
- Component: `src/components/game/HandoffScreen.tsx`
- Already has: privacy blur, countdown, skip button, accessibility
- Props needed: nextPlayer, nextPlayerName, previousPlayer, previousPlayerName, onContinue

### Codebase Patterns

**HandoffScreen Component** (`src/components/game/HandoffScreen.tsx:9-22`):
```typescript
interface HandoffScreenProps {
  nextPlayer: 'light' | 'dark';
  nextPlayerName: string;
  previousPlayer: 'light' | 'dark';
  previousPlayerName: string;
  onContinue: () => void;
  countdownSeconds?: number;
}
```

**Features**:
- Privacy blur screen between turns
- Countdown timer (3 seconds default)
- Skip button to bypass countdown
- Escape key support
- ARIA labels and focus trap

**PieceSelectionScreen Current Structure** (`src/components/game/PieceSelectionScreen.tsx`):
- Lines 89-98: Temporary workaround copying Player 1 → Player 2 pieces
- Lines 121-126: `isComplete` check requires both player1Pieces AND player2Pieces non-null
- Lines 67-100: `handlePieceSelect` updates pieces

**Current Bug** (`src/components/game/PieceSelectionScreen.tsx:92-98`):
```typescript
// In mirrored and independent mode, also set player2 pieces
// TODO: Issue #36 - Independent mode should let player 2 choose their own pieces
// For now, copying player 1's pieces to unblock game start
if (state.selectionMode === 'mirrored' || state.selectionMode === 'independent') {
  dispatch({
    type: 'SET_PLAYER_PIECES',
    player: 'player2',
    pieces: newPieces,
  });
}
```

### Gotchas and Pitfalls

1. **Blind Selection Requirement**
   - Issue: Player 2 should NOT see Player 1's selected pieces
   - Fix: During Player 2's turn, hide/mask Player 1's piece row
   - Validation: Visual test - Player 2 screen shows empty top row

2. **State Tracking - Which Player is Selecting**
   - Issue: Need to track if we're in Player 1 or Player 2's selection phase
   - Fix: Add local state `currentSelector: 'player1' | 'player2' | 'complete'`
   - Validation: Handoff only shows after Player 1 completes, not Player 2

3. **Handoff Screen Positioning**
   - Issue: When to show handoff screen
   - Fix: Show when Player 1 completes (all 3 pieces selected) AND selection mode is 'independent'
   - Validation: Handoff appears immediately after Player 1's last piece selection

4. **Start Game Button Timing**
   - Issue: Button should only appear after BOTH players select
   - Fix: Update `isComplete` check to verify `currentSelector === 'complete'`
   - Validation: Button appears after Player 2's last piece, not before

5. **Mirrored Mode Regression**
   - Issue: Don't break existing mirrored mode behavior
   - Fix: Only apply new flow if `selectionMode === 'independent'`
   - Validation: Test mirrored mode still copies Player 1 → Player 2 automatically

6. **Random Mode Regression**
   - Issue: Don't break random mode
   - Fix: Random mode sets both players at once in useEffect (no handoff needed)
   - Validation: Test random mode generates identical pieces for both players

7. **Accessibility During Handoff**
   - Issue: Focus management during handoff
   - Fix: HandoffScreen already handles focus trap
   - Validation: Tab key stays within handoff screen, Escape skips

### Dependencies

**Files to modify**:
- `src/components/game/PieceSelectionScreen.tsx` (main changes)
  - Add state: `currentSelector`
  - Add state: `showHandoff`
  - Modify: `handlePieceSelect` to track completion
  - Add: `handleHandoffContinue` callback
  - Modify: Render logic to show/hide Player 1 pieces during Player 2's turn
  - Remove: Temporary workaround (lines 90-98)
  - Update: `isComplete` logic

**Files to create tests**:
- `src/components/game/PieceSelectionScreen.test.tsx` (update existing)
  - Add: Independent mode Player 1 selection test
  - Add: Handoff screen appearance test
  - Add: Independent mode Player 2 selection test (blind)
  - Add: Start Game button appearance test
  - Add: Regression tests for mirrored/random modes

---

## Implementation Blueprint

### Phase 1: Add State Management (TDD - Red)

#### Task 1.1: Write Failing Test for Handoff Appearance

**File**: `src/components/game/PieceSelectionScreen.test.tsx`

**Test**:
```typescript
describe('Independent Mode', () => {
  test('should show handoff screen after Player 1 completes selection', async () => {
    const mockDispatch = vi.fn();
    const state: PieceSelectionPhase = {
      phase: 'piece-selection',
      mode: 'hotseat',
      player1Name: 'Alice',
      player2Name: 'Bob',
      selectionMode: 'independent',
      player1Pieces: null,
      player2Pieces: null,
      player1Color: null,
    };

    render(<PieceSelectionScreen state={state} dispatch={mockDispatch} />);

    // Select 3 pieces for Player 1
    await user.click(screen.getByTestId('position-0'));
    await user.click(screen.getByRole('button', { name: /rook/i }));

    await user.click(screen.getByTestId('position-1'));
    await user.click(screen.getByRole('button', { name: /knight/i }));

    await user.click(screen.getByTestId('position-2'));
    await user.click(screen.getByRole('button', { name: /bishop/i }));

    // Assert: Handoff screen should appear
    expect(screen.getByText(/Pass device to Bob/i)).toBeInTheDocument();
  });
});
```

**Validation**:
```bash
pnpm test src/components/game/PieceSelectionScreen.test.tsx -t "should show handoff screen"
```

**Expected**: ❌ Test fails (handoff screen doesn't exist yet)

---

#### Task 1.2: Add State for Current Selector and Handoff

**File**: `src/components/game/PieceSelectionScreen.tsx`

**Action**: Add after line 39 (after `selectedPosition` state)

```typescript
// Track which player is currently selecting pieces
const [currentSelector, setCurrentSelector] = useState<'player1' | 'player2' | 'complete'>('player1');

// Track handoff screen visibility
const [showHandoff, setShowHandoff] = useState(false);
```

**Validation**:
```bash
pnpm run check  # TypeScript should pass
```

---

### Phase 2: Implement Handoff Logic (TDD - Green)

#### Task 2.1: Modify handlePieceSelect to Detect Player 1 Completion

**File**: `src/components/game/PieceSelectionScreen.tsx`

**Current code** (lines 72-100):
```typescript
const handlePieceSelect = (piece: PieceType): void => {
  if (selectedPosition === null) return;

  // Build new pieces array
  const currentPieces = state.player1Pieces || [null, null, null];
  const newPieces: SelectedPieces = [
    selectedPosition === 0 ? piece : currentPieces[0] ?? null,
    selectedPosition === 1 ? piece : currentPieces[1] ?? null,
    selectedPosition === 2 ? piece : currentPieces[2] ?? null,
  ] as unknown as SelectedPieces;

  dispatch({
    type: 'SET_PLAYER_PIECES',
    player: 'player1',
    pieces: newPieces,
  });

  // REMOVE THIS: Temporary workaround
  if (state.selectionMode === 'mirrored' || state.selectionMode === 'independent') {
    dispatch({
      type: 'SET_PLAYER_PIECES',
      player: 'player2',
      pieces: newPieces,
    });
  }

  setModalOpen(false);
  setSelectedPosition(null);
};
```

**Change to**:
```typescript
const handlePieceSelect = (piece: PieceType): void => {
  if (selectedPosition === null) return;

  // Determine which player is selecting
  const isPlayer1Selecting = currentSelector === 'player1';
  const currentPieces = isPlayer1Selecting
    ? (state.player1Pieces || [null, null, null])
    : (state.player2Pieces || [null, null, null]);

  // Build new pieces array
  const newPieces: SelectedPieces = [
    selectedPosition === 0 ? piece : currentPieces[0] ?? null,
    selectedPosition === 1 ? piece : currentPieces[1] ?? null,
    selectedPosition === 2 ? piece : currentPieces[2] ?? null,
  ] as unknown as SelectedPieces;

  // Dispatch to correct player
  dispatch({
    type: 'SET_PLAYER_PIECES',
    player: isPlayer1Selecting ? 'player1' : 'player2',
    pieces: newPieces,
  });

  // In mirrored mode, also set player2 pieces (existing behavior)
  if (state.selectionMode === 'mirrored' && isPlayer1Selecting) {
    dispatch({
      type: 'SET_PLAYER_PIECES',
      player: 'player2',
      pieces: newPieces,
    });
  }

  // Check if current player has completed selection (all 3 pieces chosen)
  const allPiecesSelected = newPieces.every((p) => p !== null);

  if (allPiecesSelected && state.selectionMode === 'independent') {
    if (currentSelector === 'player1') {
      // Player 1 done → Show handoff
      setShowHandoff(true);
    } else if (currentSelector === 'player2') {
      // Player 2 done → Mark complete
      setCurrentSelector('complete');
    }
  }

  setModalOpen(false);
  setSelectedPosition(null);
};
```

**Validation**:
```bash
pnpm test src/components/game/PieceSelectionScreen.test.tsx -t "should show handoff screen"
# Should still fail - handoff screen not rendered yet
```

---

#### Task 2.2: Add Handoff Continue Handler

**File**: `src/components/game/PieceSelectionScreen.tsx`

**Action**: Add after `handlePieceSelect`

```typescript
const handleHandoffContinue = (): void => {
  setShowHandoff(false);
  setCurrentSelector('player2');
};
```

**Validation**: TypeScript compilation should pass

---

#### Task 2.3: Update isComplete Logic

**File**: `src/components/game/PieceSelectionScreen.tsx`

**Current code** (lines 121-126):
```typescript
const isComplete =
  state.selectionMode !== null &&
  state.player1Pieces !== null &&
  state.player2Pieces !== null &&
  state.player1Pieces.every((p) => p !== null) &&
  state.player2Pieces.every((p) => p !== null);
```

**Change to**:
```typescript
const isComplete =
  state.selectionMode !== null &&
  state.player1Pieces !== null &&
  state.player2Pieces !== null &&
  state.player1Pieces.every((p) => p !== null) &&
  state.player2Pieces.every((p) => p !== null) &&
  // In independent mode, also check that both players have finished (currentSelector === 'complete')
  (state.selectionMode !== 'independent' || currentSelector === 'complete');
```

**Validation**: TypeScript should pass

---

### Phase 3: Update Render Logic (TDD - Green)

#### Task 3.1: Add Handoff Screen Rendering

**File**: `src/components/game/PieceSelectionScreen.tsx`

**Action**: Add BEFORE the closing `</div>` tag (around line 318)

```typescript
{/* Handoff Screen (Independent Mode Only) */}
{showHandoff && state.selectionMode === 'independent' && (
  <HandoffScreen
    nextPlayer="dark"  // Player 2 is always dark in piece selection
    nextPlayerName={state.player2Name || 'Player 2'}
    previousPlayer="light"  // Player 1 is always light
    previousPlayerName={state.player1Name}
    onContinue={handleHandoffContinue}
    countdownSeconds={3}
  />
)}
```

**Also add import** at top of file:
```typescript
import { HandoffScreen } from './HandoffScreen';
```

**Validation**:
```bash
pnpm test src/components/game/PieceSelectionScreen.test.tsx -t "should show handoff screen"
# Should now PASS ✅
```

---

#### Task 3.2: Hide Player 1 Pieces During Player 2 Selection (Blind Selection)

**File**: `src/components/game/PieceSelectionScreen.tsx`

**Find**: The grid rendering section that shows pieces (around lines 180-250)

**Current pattern**:
```typescript
<div className={styles.position}>
  {state.player1Pieces?.[position] ? (
    <span className={styles.pieceIcon}>
      {PIECE_POOL[state.player1Pieces[position]].unicode.light}
    </span>
  ) : (
    <button onClick={() => handlePositionClick(position)}>
      Select Piece
    </button>
  )}
</div>
```

**Change to**:
```typescript
<div className={styles.position}>
  {/* Show Player 1's pieces only if:
      - Player 1 is selecting (currentSelector === 'player1'), OR
      - NOT in independent mode, OR
      - Player 2 has completed (currentSelector === 'complete')
  */}
  {state.player1Pieces?.[position] &&
   (currentSelector === 'player1' ||
    state.selectionMode !== 'independent' ||
    currentSelector === 'complete') ? (
    <span className={styles.pieceIcon}>
      {PIECE_POOL[state.player1Pieces[position]].unicode.light}
    </span>
  ) : (
    /* During Player 2's selection in independent mode, show empty/clickable slots */
    currentSelector === 'player2' && state.selectionMode === 'independent' ? (
      <button
        onClick={() => handlePositionClick(position)}
        className={styles.selectButton}
        aria-label={`Select piece for position ${position + 1}`}
      >
        Select Piece
      </button>
    ) : (
      /* Player 1's selection phase */
      state.player1Pieces?.[position] ? (
        <span className={styles.pieceIcon}>
          {PIECE_POOL[state.player1Pieces[position]].unicode.light}
        </span>
      ) : (
        <button onClick={() => handlePositionClick(position)}>
          Select Piece
        </button>
      )
    )
  )}
</div>
```

**Validation**: Manual test - Player 2 should see empty grid, not Player 1's pieces

---

### Phase 4: Testing Strategy

#### Task 4.1: Write Comprehensive Component Tests

**File**: `src/components/game/PieceSelectionScreen.test.tsx`

**Add test suite**:
```typescript
describe('Independent Mode Complete Flow', () => {
  test('should allow Player 1 to select 3 pieces', async () => {
    // Test Player 1 can select pieces
  });

  test('should show handoff screen after Player 1 completes', async () => {
    // Already written in Task 1.1
  });

  test('should hide Player 1 pieces during Player 2 selection', async () => {
    // Test blind selection
    const state = {
      // ... Player 1 has completed, handoff done, now Player 2's turn
    };

    render(<PieceSelectionScreen state={state} dispatch={vi.fn()} />);

    // Assert: Player 1's piece icons should NOT be visible
    expect(screen.queryByText('♖')).not.toBeInTheDocument();
  });

  test('should allow Player 2 to select different pieces', async () => {
    // Test Player 2 can choose different pieces than Player 1
  });

  test('should show Start Game button after both players complete', async () => {
    // Complete flow test
  });

  test('should not break mirrored mode', async () => {
    // Regression test
  });

  test('should not break random mode', async () => {
    // Regression test
  });
});
```

**Validation**:
```bash
pnpm test src/components/game/PieceSelectionScreen.test.tsx
```

---

### Phase 5: Validation Gates

**Level 1: TypeScript + ESLint**
```bash
pnpm run check
pnpm run lint
```
Expected: 0 errors, 0 warnings

**Level 2: Unit Tests**
```bash
pnpm test src/components/game/PieceSelectionScreen.test.tsx
```
Expected: All tests pass

**Level 3: Integration Tests**
```bash
pnpm test:integration
```
Expected: No regressions

**Level 4: E2E Tests**
```bash
pnpm test:e2e
```
Expected: All tests pass

**Level 5: Build**
```bash
pnpm build
```
Expected: Production build succeeds

---

## Rollback Strategy

**If handoff breaks game flow**:
1. Revert state changes → restore original `handlePieceSelect`
2. Keep temporary workaround (lines 92-98) until proper fix

**If blind selection breaks UI**:
1. Revert conditional rendering in grid display
2. Show Player 1 pieces to Player 2 (temporary - not ideal)

**If Start Game button doesn't appear**:
1. Check `isComplete` logic
2. Verify `currentSelector === 'complete'` is set after Player 2's last piece
3. Debug state with React DevTools

---

## Success Checklist

- [ ] Player 1 can select 3 pieces in independent mode
- [ ] Handoff screen appears after Player 1 completes
- [ ] Handoff uses existing HandoffScreen component
- [ ] Player 2's turn begins after handoff
- [ ] Player 2 cannot see Player 1's piece selections (blind)
- [ ] Player 2 can select different pieces than Player 1
- [ ] Start Game button appears after both players complete
- [ ] Temporary workaround (lines 92-98) removed
- [ ] Mirrored mode still works (regression test)
- [ ] Random mode still works (regression test)
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] TypeScript: 0 errors
- [ ] ESLint: 0 warnings
- [ ] Test coverage: ≥ 80%
- [ ] Production build: succeeds
- [ ] WCAG 2.1 AA accessibility maintained

---

## References

**Related Issues**:
- #25 - Pawn promotion (similar modal/state management pattern)
- Original bug report describes "no transition out of player 1 choosing pieces"

**Key Files**:
- `/home/ryankhetlyr/Development/kings-cooking/claude_md_files/CLAUDE-REACT.md` - React 19 patterns
- `src/components/game/HandoffScreen.tsx` - Existing handoff component to reuse
- `src/components/game/PieceSelectionScreen.tsx` - Main file to modify

**Testing Patterns**:
- TDD: Red → Green → Refactor
- Write failing test FIRST
- Minimum code to pass
- Refactor while keeping tests green

---

**Generated**: 2025-10-22
**Framework**: PRP (Product Requirement Prompt)
**AI Agent**: Claude Code
