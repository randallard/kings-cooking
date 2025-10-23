# Task PRP: Fix Turn Order and Handoff Message When Player 1 Chooses Dark

**Issue**: #49
**Type**: Bug Fix
**Complexity**: Medium
**Framework**: React 19 + TypeScript + Zod
**TDD Approach**: Red → Green → Refactor

---

## Goal

Fix the handoff screen message when Player 1 chooses to play as dark color. Currently shows incorrect message "Dark(Player1) made their move" when it should show "Light(Player2) gets the first move" since this is the START of the game, not after a move.

---

## Why

**Business Value:**
- Prevents player confusion about whose turn it is
- Ensures correct understanding of game flow in both hot-seat and URL modes
- Maintains consistency with game rules (light always moves first)

**User Impact:**
- Players currently see misleading message suggesting Dark player already moved
- Breaks immersion and game understanding
- Critical severity - affects core game flow

---

## What (User-Visible Behavior)

### Current Broken Behavior
When Player 1 selects dark color during setup:
1. After piece selection completes → Handoff screen appears
2. **BUG**: Shows "Dark's Turn" as title
3. **BUG**: Shows "Dark (Ryan) made their move. Pass the device to Ted."
4. This is wrong because NO move has been made yet - it's the game start!

### Expected Correct Behavior
When Player 1 selects dark color during setup:
1. After piece selection completes → Handoff screen appears
2. **FIX**: Shows "Light's Turn" or "{LightPlayerName}'s Turn" as title
3. **FIX**: Shows "Light(Ted) gets the first move." (not "made their move")
4. This correctly indicates it's the START of the game, light player goes first

### Affects Both Modes
- ✅ Hot-seat mode: Pass device from Player 1 (dark) to Player 2 (light)
- ✅ URL mode: Player 1 generates URL, sends to Player 2 who makes first move

---

## All Needed Context

### Architecture Overview

**State Machine Flow**:
```
ColorSelectionScreen (Player 1 chooses light/dark)
  ↓ SET_PLAYER_COLOR action
PieceSelectionPhase (player1Color stored in state)
  ↓ COMPLETE_PIECE_SELECTION action
HandoffPhase (if player1Color === 'dark', handoff to light player)
  ↓ COMPLETE_HANDOFF action
PlayingPhase (game begins, currentPlayer = 'light')
```

### Key Files

| File | Purpose | Lines |
|------|---------|-------|
| `src/lib/gameFlow/reducer.ts` | State machine reducer | 371-446 (COMPLETE_PIECE_SELECTION) |
| `src/components/game/HandoffScreen.tsx` | Displays handoff message | 109-131 (message logic) |
| `src/App.tsx` | Renders HandoffScreen with props | 890-910 (normal handoff), 840-850 (first handoff) |
| `src/types/gameFlow.ts` | Type definitions | 120-144 (HandoffPhase) |

### Current HandoffScreen Props

```typescript
interface HandoffScreenProps {
  nextPlayer: 'light' | 'dark';       // Which player's turn is next
  nextPlayerName: string;              // Name of next player
  previousPlayer: 'light' | 'dark';   // Color of player who just moved
  previousPlayerName: string;          // Name of player who just moved
  onContinue: () => void;
  countdownSeconds?: number;
}
```

**Current message generation** (HandoffScreen.tsx:109-131):
```typescript
const nextPlayerColor = nextPlayer === 'light' ? 'Light' : 'Dark';
const previousPlayerColor = previousPlayer === 'light' ? 'Light' : 'Dark';

<h2>{nextPlayerColor}'s Turn</h2>
<p>
  {previousPlayerColor} ({previousPlayerName}) made their move.
  <br />
  Pass the device to {nextPlayerName}.
</p>
```

**Problem**: Always says "{previousColor} ({previousName}) made their move" even when NO move has been made (game start).

### How to Detect Game Start

From `HandoffPhase.gameState`:
- `gameState.currentTurn === 0` → No turns taken yet
- `gameState.moveHistory.length === 0` → No moves recorded
- This happens after COMPLETE_PIECE_SELECTION when player1Color === 'dark'

### Reducer Logic Reference

**COMPLETE_PIECE_SELECTION** (reducer.ts:371-446):
```typescript
// Creates game state with correct player assignment
const lightPlayer = {
  name: state.player1Color === 'light' ? state.player1Name : state.player2Name || 'Player 2',
};
const darkPlayer = {
  name: state.player1Color === 'light' ? state.player2Name || 'Player 2' : state.player1Name,
};

// If Player 1 chose dark, transition to handoff before game starts
if (state.player1Color === 'dark') {
  return {
    phase: 'handoff',
    gameState,  // currentTurn = 0, moveHistory = []
    player1Color: state.player1Color,
    // ... other fields
  };
}
```

### Testing Patterns

**Reducer Tests** (reducer.test.ts):
```typescript
it('should handle action correctly', () => {
  const initialState = { /* ... */ };
  const action = { type: 'ACTION_TYPE', /* ... */ };
  const result = gameFlowReducer(initialState, action);

  expect(result).toMatchObject({
    phase: 'expected-phase',
    // ... expected fields
  });
});
```

**Component Tests** (HandoffScreen.test.tsx:20-62):
```typescript
it('should display correct message', () => {
  render(
    <HandoffScreen
      nextPlayer="light"
      nextPlayerName="Alice"
      previousPlayer="dark"
      previousPlayerName="Bob"
      onContinue={vi.fn()}
    />
  );

  expect(screen.getByText(/light \(bob\) made their move/i)).toBeInTheDocument();
});
```

### Documentation

- **CLAUDE.md**: Lines 1-815 - Follow TDD, 80% coverage, conventional commits
- **Game Rules** (PRD.md): Light always moves first regardless of player names
- **State Machine** (types/gameFlow.ts): Discriminated union pattern for phases

---

## Implementation Blueprint

### TDD Approach: Red → Green → Refactor

**Phase 1 - RED (Write Failing Tests)**
1. Write reducer test for handoff phase when player1Color === 'dark'
2. Write HandoffScreen component test for game-start scenario
3. Run tests → Should fail ❌

**Phase 2 - GREEN (Minimal Fix)**
1. Add `isGameStart` prop to HandoffScreen
2. Update HandoffScreen to show different message when isGameStart
3. Update App.tsx to pass isGameStart based on gameState.currentTurn
4. Run tests → Should pass ✅

**Phase 3 - REFACTOR (Clean Up)**
1. Extract message generation to helper function
2. Ensure type safety with Zod if needed
3. Add accessibility improvements
4. Run tests → Should still pass ✅

### Detailed Task Breakdown

#### TASK 1: CREATE failing test for HandoffScreen game-start message

**File**: `src/components/game/HandoffScreen.test.tsx`

**Action**: ADD new test case in existing describe block

```typescript
describe('Handoff message display', () => {
  it('should display game-start message when no moves made yet', () => {
    render(
      <HandoffScreen
        nextPlayer="light"
        nextPlayerName="Ted"
        previousPlayer="dark"
        previousPlayerName="Ryan"
        isGameStart={true}  // NEW PROP
        onContinue={vi.fn()}
      />
    );

    // Should NOT show "made their move"
    expect(screen.queryByText(/made their move/i)).not.toBeInTheDocument();

    // SHOULD show "gets the first move"
    expect(screen.getByText(/light \(ted\) gets the first move/i)).toBeInTheDocument();
  });

  it('should display normal handoff message mid-game', () => {
    render(
      <HandoffScreen
        nextPlayer="dark"
        nextPlayerName="Ryan"
        previousPlayer="light"
        previousPlayerName="Ted"
        isGameStart={false}  // Mid-game
        onContinue={vi.fn()}
      />
    );

    // Should show normal "made their move" message
    expect(screen.getByText(/light \(ted\) made their move/i)).toBeInTheDocument();
  });
});
```

**Validation**:
```bash
pnpm test HandoffScreen.test.tsx
# Should see: ❌ Test fails - isGameStart prop doesn't exist
```

---

#### TASK 2: UPDATE HandoffScreen props interface to include isGameStart

**File**: `src/components/game/HandoffScreen.tsx`

**Action**: UPDATE Props interface (around line 15)

```typescript
interface HandoffScreenProps {
  nextPlayer: 'light' | 'dark';
  nextPlayerName: string;
  previousPlayer: 'light' | 'dark';
  previousPlayerName: string;
  onContinue: () => void;
  countdownSeconds?: number;
  isGameStart?: boolean;  // ADD THIS - true when game just started (no moves yet)
}
```

**Validation**:
```bash
pnpm run check
# Should pass - type added correctly
```

---

#### TASK 3: UPDATE HandoffScreen message generation logic

**File**: `src/components/game/HandoffScreen.tsx`

**Action**: UPDATE message display logic (lines 109-131)

```typescript
const nextPlayerColor = nextPlayer === 'light' ? 'Light' : 'Dark';
const previousPlayerColor = previousPlayer === 'light' ? 'Light' : 'Dark';

// NEW: Determine message based on game state
const message = isGameStart
  ? `${nextPlayerColor} (${nextPlayerName}) gets the first move.`
  : `${previousPlayerColor} (${previousPlayerName}) made their move.`;

<h2 id="handoff-title" className={styles.title}>
  {nextPlayerColor}'s Turn
</h2>

<p id="handoff-description" className={styles.description}>
  {message}
  <br />
  {!isGameStart && `Pass the device to ${nextPlayerName}.`}
  {isGameStart && `Ready to start!`}
</p>
```

**Validation**:
```bash
pnpm test HandoffScreen.test.tsx
# Should see: ✅ Tests pass with new logic
```

---

#### TASK 4: UPDATE App.tsx to pass isGameStart prop

**File**: `src/App.tsx`

**Action**: UPDATE HandoffScreen rendering logic (two locations)

**Location 1** - First handoff after piece selection (lines 840-850):
```typescript
// When collecting Player 2 name after piece selection
<HandoffScreen
  nextPlayer={state.gameState.currentPlayer}
  nextPlayerName="Player 2"
  previousPlayer={state.gameState.currentPlayer === 'light' ? 'dark' : 'light'}
  previousPlayerName={state.player1Name || 'Light'}
  isGameStart={state.gameState.currentTurn === 0}  // ADD THIS
  onContinue={() => {
    setHandoffStepCompleted(true);
  }}
  countdownSeconds={3}
/>
```

**Location 2** - Normal handoff during gameplay (lines 890-910):
```typescript
const isGameStart = state.gameState.currentTurn === 0 && state.gameState.moveHistory.length === 0;

<HandoffScreen
  nextPlayer={state.gameState.currentPlayer}
  nextPlayerName={nextPlayerName}
  previousPlayer={previousPlayer}
  previousPlayerName={previousPlayerName}
  isGameStart={isGameStart}  // ADD THIS
  onContinue={() => {
    dispatch({ type: 'COMPLETE_HANDOFF' });
  }}
  countdownSeconds={3}
/>
```

**Validation**:
```bash
pnpm run check && pnpm run lint
# Should pass - no TypeScript or lint errors
```

---

#### TASK 5: CREATE reducer test for handoff phase with player1Color='dark'

**File**: `src/lib/gameFlow/reducer.test.ts`

**Action**: ADD test in COMPLETE_PIECE_SELECTION describe block

```typescript
describe('COMPLETE_PIECE_SELECTION with player1Color="dark"', () => {
  it('should transition to handoff phase when Player 1 chose dark', () => {
    const pieceSelectionState: PieceSelectionPhase = {
      phase: 'piece-selection',
      mode: 'hotseat',
      player1Name: 'Ryan',
      player2Name: 'Ted',
      selectionMode: 'random',
      player1Pieces: ['rook', 'knight', 'bishop'],
      player2Pieces: ['rook', 'knight', 'bishop'],
      player1Color: 'dark',  // KEY: Player 1 chose dark
    };

    const action: GameFlowAction = {
      type: 'COMPLETE_PIECE_SELECTION',
      firstMover: 'light', // Light goes first (always)
    };

    const result = gameFlowReducer(pieceSelectionState, action);

    // Should transition to handoff phase, not directly to playing
    expect(result.phase).toBe('handoff');
    expect(result.mode).toBe('hotseat');

    // Verify game state created correctly
    if (result.phase === 'handoff' && result.gameState) {
      expect(result.gameState.currentPlayer).toBe('light'); // Light goes first
      expect(result.gameState.currentTurn).toBe(0); // No moves yet
      expect(result.gameState.lightPlayer.name).toBe('Ted'); // Player 2 is light
      expect(result.gameState.darkPlayer.name).toBe('Ryan'); // Player 1 is dark
    }
  });
});
```

**Validation**:
```bash
pnpm test reducer.test.ts
# Should pass - logic already exists, we're adding regression test
```

---

#### TASK 6: RUN all validation gates

**Validation Commands**:

```bash
# Level 1: Type checking
pnpm run check

# Level 2: Linting
pnpm run lint

# Level 3: Unit tests (ALL must pass)
pnpm test

# Level 4: Test coverage (maintain 80%+)
pnpm run test:coverage

# Level 5: Build
pnpm build
```

**Expected Results**:
- ✅ TypeScript: 0 errors
- ✅ ESLint: 0 warnings
- ✅ Tests: 863+ passing (2 new tests added)
- ✅ Coverage: >80% maintained
- ✅ Build: Successful

---

#### TASK 7: MANUAL verification with dev server

**Steps**:
1. Start dev server: `pnpm dev`
2. Open http://localhost:5173
3. **Test Scenario 1**: Player 1 chooses DARK
   - Select hot-seat mode
   - Enter Player 1 name: "Ryan"
   - Choose "Dark 🌙" color
   - Select random pieces → Click "Start Game"
   - **VERIFY**: Handoff screen shows "Light (Player 2) gets the first move"
   - **VERIFY**: Does NOT show "made their move"

4. **Test Scenario 2**: Player 1 chooses LIGHT
   - Start new game
   - Enter Player 1 name: "Ryan"
   - Choose "Light ☀️" color
   - Select random pieces → Click "Start Game"
   - **VERIFY**: Game starts immediately (no handoff)
   - Make first move
   - **VERIFY**: After move, handoff shows "Light (Ryan) made their move"

5. **Test Scenario 3**: URL Mode with Player 1 dark
   - Select URL mode
   - Enter Player 1 name
   - Choose "Dark" color
   - Select pieces, click "Start Game"
   - **VERIFY**: Handoff screen shows correct "gets first move" message
   - Copy URL, open in new tab
   - **VERIFY**: Player 2 can make first move

**Validation**: All scenarios work correctly ✅

---

## Validation Loop

### Level 1: Syntax & Style
```bash
pnpm run check && pnpm run lint
```
**Expected**: 0 TypeScript errors, 0 ESLint warnings

### Level 2: Unit Tests
```bash
pnpm test HandoffScreen.test.tsx
pnpm test reducer.test.ts
```
**Expected**: All tests pass, 2 new tests added

### Level 3: Test Coverage
```bash
pnpm run test:coverage
```
**Expected**:
- HandoffScreen.tsx: >90% coverage
- reducer.ts: >75% coverage
- Overall: >80% coverage maintained

### Level 4: Integration
```bash
pnpm build && pnpm preview
```
**Expected**: Production build successful, manual testing confirms fix

---

## Acceptance Criteria Checklist

- [ ] When Player 1 chooses dark color, handoff screen shows correct message
- [ ] Message says "Light({Player2Name}) gets the first move" (not "made their move")
- [ ] Works in both hot-seat mode and URL mode
- [ ] Existing mid-game handoff messages still work correctly
- [ ] TypeScript: 0 errors
- [ ] ESLint: 0 warnings
- [ ] All tests pass (863+ tests)
- [ ] Test coverage: >80%
- [ ] Manual testing confirms fix
- [ ] Conventional commit message follows format

---

## Rollback Strategy

If issues arise:
```bash
git checkout main
git branch -D issue-49-fix-dark-player-turn-order
```

Changes are isolated to:
- HandoffScreen.tsx (message logic)
- App.tsx (prop passing)
- Test files (new tests)

No database migrations, no API changes, minimal risk.

---

## Additional Context

### Related Issues
- Issue #4: Refactor black/white → light/dark (completed, related terminology)
- Issue #6: Piece selection (completed, affects this flow)

### Game Rules Reference (PRD.md)
- Light player ALWAYS moves first
- Dark player ALWAYS moves second
- Player 1 choosing color doesn't change this rule

### TypeScript Strict Mode
- All changes must maintain strict type safety
- Use discriminated unions for state machine
- Validate props with interfaces

---

## Success Metrics

**Implementation Ready**: ✅ All tasks have clear actions and validations
**Validation Complete**: ✅ Every task has executable validation command
**Pattern Consistent**: ✅ Follows existing React/TypeScript/TDD patterns
**Context Complete**: ✅ All necessary information provided

---

**PRP Version**: 1.0
**Created**: 2025-10-23
**Issue**: #49
**Estimated Effort**: 1-2 hours
