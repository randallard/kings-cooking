# TASK PRP: Fix Piece Selection Flow - Move Light/Dark Choice Before Piece Selection

**Issue**: #6 (bug fix)
**Feature**: Fix piece selection flow and board orientation
**Created**: 2025-10-20
**Status**: Ready for execution

---

## Executive Summary

Fix critical bugs in piece selection flow where:
1. Duplicate piece selection screen appears after choosing who goes first
2. Wrong player pieces are selectable (top row instead of bottom for light player)
3. Party button activates for wrong court (dark court when light should be active)

**Root Cause**: The "who goes first" (light/dark) choice happens too late in the flow (after piece selection), preventing the UI from showing pieces from the correct player's perspective and causing incorrect player/piece assignments.

**Solution**: Move light/dark choice to happen RIGHT AFTER player 1 enters their name, BEFORE piece selection begins. Replace `firstMover` field with `player1Color`.

**Scope**: New color-selection phase, update reducer logic, fix piece selection UI orientation, update tests
**Estimated Complexity**: 🟡 Medium (2-3 hours)
**Risk Level**: 🟢 Low (focused refactor, comprehensive tests)

---

## Context Gathered from Issue Discussion

### Current Problematic Flow
```
1. mode-selection: Choose hot-seat/URL
2. setup: Enter player 1 name
3. piece-selection: Choose selection mode → Select pieces → Choose who goes first ❌
4. Duplicate piece selection screen appears ❌
5. playing: Wrong pieces selectable ❌
```

### Corrected Flow (Target)
```
1. mode-selection: Choose hot-seat/URL
2. setup: Enter player 1 name
3. color-selection (NEW): Choose Light (goes first) or Dark (goes second) ✅
4. piece-selection: Choose mode → Select pieces (from correct perspective) ✅
   - Mirrored: P1 selects, P2 gets same → Start Game
   - Independent: P1 selects → Collect P2 name → Create game → P2 selects → Start Game
   - Random: Auto-generate → Start Game
5. playing: Correct pieces selectable based on light player ✅
```

---

## All Needed Context

### 1. Files to Modify

**Type Definitions** (`src/types/gameFlow.ts`):
- Add `ColorSelectionPhase` interface
- Add `player1Color: 'light' | 'dark'` to `PieceSelectionPhase`
- Remove `firstMover` field from `PieceSelectionPhase`
- Remove `firstMover` from `HandoffPhase` optional fields
- Add `SET_PLAYER_COLOR` action type
- Remove `SET_FIRST_MOVER` action type

**Reducer Logic** (`src/lib/gameFlow/reducer.ts`):
- Add `START_COLOR_SELECTION` action handler
- Add `SET_PLAYER_COLOR` action handler
- Update `START_PIECE_SELECTION` to require `player1Color`
- Remove `SET_FIRST_MOVER` action handler
- Update `COMPLETE_PIECE_SELECTION` logic for independent mode
- Fix player assignment logic to use `player1Color` instead of `firstMover`

**Component** (`src/components/game/PieceSelectionScreen.tsx`):
- Remove first mover selection UI
- Update piece display logic to show correct row based on `player1Color`
- Fix `isComplete` check to not require `firstMover`

**New Component** (`src/components/game/ColorSelectionScreen.tsx`):
- Create new component for color selection phase
- Show "Which color do you want to play?" with Light/Dark buttons
- Include notes: "Goes first" for Light, "Goes second" for Dark

**App Router** (`src/App.tsx`):
- Add `color-selection` phase rendering
- Render `ColorSelectionScreen` component

**Tests**:
- Update `src/types/gameFlow.test.ts`
- Update `src/lib/gameFlow/reducer.test.ts`
- Update `src/components/game/PieceSelectionScreen.test.tsx`
- Add `src/components/game/ColorSelectionScreen.test.tsx`

**Piece Selection Types** (`src/lib/pieceSelection/types.ts`):
- Remove `FirstMoverSchema` and `FirstMover` type
- Update `PieceSelectionDataSchema` to use `player1Color`

### 2. Existing Patterns to Follow

#### Phase Transition Pattern
```typescript
// From reducer.ts - how phases transition
case 'START_PIECE_SELECTION':
  if (state.phase !== 'setup' || !state.player1Name) return state;
  return {
    phase: 'piece-selection',
    mode: state.mode,
    player1Name: state.player1Name,
    // ... fields
  };
```

#### Component Pattern (from ModeSelector.tsx)
```tsx
export function ColorSelectionScreen({ dispatch }: Props) {
  const handleColorSelect = (color: 'light' | 'dark'): void => {
    dispatch({ type: 'SET_PLAYER_COLOR', color });
    dispatch({ type: 'START_PIECE_SELECTION' });
  };

  return (
    <div className={styles.container}>
      <h1>Which color do you want to play?</h1>
      <div className={styles.buttonContainer}>
        <button onClick={() => handleColorSelect('light')}>
          Light
          <span className={styles.note}>Goes first</span>
        </button>
        <button onClick={() => handleColorSelect('dark')}>
          Dark
          <span className={styles.note}>Goes second</span>
        </button>
      </div>
    </div>
  );
}
```

### 3. Critical Gotchas

**Gotcha 1**: Independent mode creates game state MID-FLOW
- **Why**: Player 2 needs to see the board from their perspective to select pieces
- **Fix**: Call `createBoardWithPieces()` and create game state after Player 1 selects but before Player 2 selects

**Gotcha 2**: Board orientation during piece selection
- **Issue**: Currently shows pieces on arbitrary rows
- **Fix**: Use `player1Color` to determine row:
  - `player1Color === 'light'` → show pieces on row 2 (bottom)
  - `player1Color === 'dark'` → show pieces on row 0 (top)

**Gotcha 3**: Handoff logic must check current device holder
- **Issue**: Game might start with wrong player if device holder doesn't match light player
- **Fix**: After creating game state, check if current player (Player 1) matches light player. If not, go to handoff phase.

**Gotcha 4**: Independent mode P2 name collection timing
- **Current**: Happens in `COMPLETE_PIECE_SELECTION` for all modes
- **New**: Must happen BEFORE Player 2 selects pieces in independent mode
- **Fix**: Move P2 name collection to happen after P1 piece selection in independent mode only

---

## Implementation Blueprint

### PHASE 1: Update Type Definitions (TDD: Red)

**File**: `src/types/gameFlow.ts`

```typescript
// ADD: New color-selection phase
export interface ColorSelectionPhase {
  phase: 'color-selection';
  mode: 'hotseat' | 'url';
  player1Name: string;
}

// UPDATE: PieceSelectionPhase - replace firstMover with player1Color
export interface PieceSelectionPhase {
  phase: 'piece-selection';
  mode: 'hotseat' | 'url';
  player1Name: string;
  player2Name: string;
  selectionMode: SelectionMode | null;
  player1Pieces: SelectedPieces | null;
  player2Pieces: SelectedPieces | null;
  player1Color: 'light' | 'dark' | null; // CHANGED from firstMover
}

// UPDATE: GameFlowState union to include ColorSelectionPhase
export type GameFlowState =
  | ModeSelectionPhase
  | SetupPhase
  | ColorSelectionPhase // NEW
  | PieceSelectionPhase
  | PlayingPhase
  | HandoffPhase
  | VictoryPhase;

// ADD: SET_PLAYER_COLOR action
export interface SetPlayerColorAction {
  type: 'SET_PLAYER_COLOR';
  color: 'light' | 'dark';
}

// REMOVE: SetFirstMoverAction (delete entire interface)

// UPDATE: GameFlowAction union
export type GameFlowAction =
  | SelectModeAction
  | SetPlayer1NameAction
  | StartColorSelectionAction // NEW
  | SetPlayerColorAction // NEW
  | StartPieceSelectionAction
  | SetSelectionModeAction
  | SetPlayerPiecesAction
  // | SetFirstMoverAction // REMOVED
  | CompletePieceSelectionAction
  | SelectPieceAction
  | DeselectPieceAction
  | StageMoveAction
  | ConfirmMoveAction
  | SetPlayer2NameAction
  | CompleteHandoffAction
  | UrlGeneratedAction
  | GameOverAction
  | NewGameAction
  | LoadFromUrlAction;

// ADD: START_COLOR_SELECTION action
export interface StartColorSelectionAction {
  type: 'START_COLOR_SELECTION';
}

// UPDATE: HandoffPhase to remove firstMover from optional fields
export interface HandoffPhase {
  phase: 'handoff';
  mode: 'hotseat' | 'url';
  player1Name: string;
  player2Name: string;
  gameState: GameState | null;
  lastMove?: { from: Position; to: Position | 'off_board' };
  countdown?: number;
  generatedUrl?: string | null;
  selectionMode?: 'mirrored' | 'independent' | 'random';
  player1Pieces?: SelectedPieces;
  player2Pieces?: SelectedPieces;
  // firstMover?: 'player1' | 'player2'; // REMOVED
}
```

**Validation**:
```bash
pnpm run check  # Should show TypeScript errors (expected - Red phase)
```

---

### PHASE 2: Update Piece Selection Types (TDD: Red)

**File**: `src/lib/pieceSelection/types.ts`

```typescript
// REMOVE: FirstMoverSchema and FirstMover type (lines 25-29)
// DELETE these lines:
// export const FirstMoverSchema = z.enum(['player1', 'player2']);
// export type FirstMover = z.infer<typeof FirstMoverSchema>;

// UPDATE: PieceSelectionDataSchema
export const PieceSelectionDataSchema = z.object({
  mode: SelectionModeSchema,
  player1Pieces: SelectedPiecesSchema,
  player2Pieces: SelectedPiecesSchema,
  player1Color: z.enum(['light', 'dark']), // CHANGED from firstMover
});
export type PieceSelectionData = z.infer<typeof PieceSelectionDataSchema>;
```

**Validation**:
```bash
pnpm run check  # More TypeScript errors (expected)
```

---

### PHASE 3: Update Reducer Logic (TDD: Green)

**File**: `src/lib/gameFlow/reducer.ts`

**Step 3a**: Add START_COLOR_SELECTION handler (after SET_PLAYER1_NAME)

```typescript
case 'SET_PLAYER1_NAME':
  if (state.phase !== 'setup') return state;
  return { ...state, player1Name: action.name };

// ADD: New action handler
case 'START_COLOR_SELECTION':
  if (state.phase !== 'setup' || !state.player1Name) return state;
  return {
    phase: 'color-selection',
    mode: state.mode,
    player1Name: state.player1Name,
  };
```

**Step 3b**: Add SET_PLAYER_COLOR handler and update START_PIECE_SELECTION

```typescript
// ADD: New action handler
case 'SET_PLAYER_COLOR':
  if (state.phase !== 'color-selection') return state;
  return {
    phase: 'piece-selection',
    mode: state.mode,
    player1Name: state.player1Name,
    player2Name: '',
    selectionMode: null,
    player1Pieces: null,
    player2Pieces: null,
    player1Color: action.color, // NEW field
  };

// REMOVE: Old START_PIECE_SELECTION handler (no longer needed)
```

**Step 3c**: Remove SET_FIRST_MOVER handler

```typescript
// DELETE entire case block:
// case 'SET_FIRST_MOVER':
//   if (state.phase !== 'piece-selection') return state;
//   return { ...state, firstMover: action.mover };
```

**Step 3d**: Update COMPLETE_PIECE_SELECTION logic

```typescript
case 'COMPLETE_PIECE_SELECTION': {
  if (state.phase !== 'piece-selection') return state;
  if (
    !state.selectionMode ||
    !state.player1Pieces ||
    !state.player2Pieces ||
    !state.player1Color  // CHANGED from firstMover
  ) {
    return state;
  }

  // Create board with selected pieces
  const board = createBoardWithPieces(
    state.player1Pieces,
    state.player2Pieces,
    state.player1Color  // CHANGED: pass color instead of firstMover
  );

  // Create game state with custom board
  const lightPlayer = {
    id: crypto.randomUUID() as never,
    // CHANGED: Use player1Color to determine light player
    name: state.player1Color === 'light' ? state.player1Name : state.player2Name || 'Player 2',
  };
  const darkPlayer = {
    id: crypto.randomUUID() as never,
    // CHANGED: Use player1Color to determine dark player
    name: state.player1Color === 'light' ? state.player2Name || 'Player 2' : state.player1Name,
  };

  // ... rest of game state creation ...

  // NEW: Check if mode is NOT independent and player2Name is empty
  if (state.selectionMode !== 'independent' &&
      state.mode === 'hotseat' &&
      (!state.player2Name || state.player2Name.trim().length === 0)) {
    // Transition to handoff to collect player 2's name
    return {
      phase: 'handoff',
      mode: state.mode,
      player1Name: state.player1Name,
      player2Name: '',
      selectionMode: state.selectionMode,
      player1Pieces: state.player1Pieces,
      player2Pieces: state.player2Pieces,
      // NOTE: No firstMover field anymore
      gameState: null as never,
    };
  }

  // NEW: Check if current device holder (Player 1) doesn't match light player
  const currentPlayerIsLight = state.player1Color === 'light';
  if (!currentPlayerIsLight) {
    // Need to handoff to light player before game starts
    return {
      phase: 'handoff',
      mode: state.mode,
      player1Name: state.player1Name,
      player2Name: state.player2Name,
      gameState: finalGameState,
    };
  }

  // Device holder is light player, start game directly
  return {
    phase: 'playing',
    mode: state.mode,
    player1Name: state.player1Name,
    player2Name: state.player2Name,
    gameState: finalGameState,
    selectedPosition: null,
    legalMoves: [],
    pendingMove: null,
  };
}
```

**Step 3e**: Update COMPLETE_HANDOFF to remove firstMover handling

```typescript
case 'COMPLETE_HANDOFF': {
  if (state.phase !== 'handoff') return state;

  // Check if we're coming from piece-selection (gameState is null)
  if (!state.gameState && 'selectionMode' in state && state.selectionMode) {
    // REMOVED: No more firstMover field to check
    // Create the game state now that we have player2Name
    const board = createBoardWithPieces(
      state.player1Pieces!,
      state.player2Pieces!,
      state.player1Color!  // This won't exist yet - need different approach
    );
    // ... rest remains same ...
  }

  // ... normal handoff logic ...
}
```

**WAIT** - There's an issue here. When coming from piece-selection → handoff for P2 name collection, we lose the `player1Color` field because HandoffPhase doesn't have it. Need to add it:

**Step 3f**: Fix HandoffPhase to preserve player1Color

Back to **File**: `src/types/gameFlow.ts`

```typescript
export interface HandoffPhase {
  phase: 'handoff';
  mode: 'hotseat' | 'url';
  player1Name: string;
  player2Name: string;
  gameState: GameState | null;
  lastMove?: { from: Position; to: Position | 'off_board' };
  countdown?: number;
  generatedUrl?: string | null;
  selectionMode?: 'mirrored' | 'independent' | 'random';
  player1Pieces?: SelectedPieces;
  player2Pieces?: SelectedPieces;
  player1Color?: 'light' | 'dark'; // ADD this
}
```

Then back to reducer.ts, update the handoff transition:

```typescript
if (state.selectionMode !== 'independent' &&
    state.mode === 'hotseat' &&
    (!state.player2Name || state.player2Name.trim().length === 0)) {
  return {
    phase: 'handoff',
    mode: state.mode,
    player1Name: state.player1Name,
    player2Name: '',
    selectionMode: state.selectionMode,
    player1Pieces: state.player1Pieces,
    player2Pieces: state.player2Pieces,
    player1Color: state.player1Color, // ADD this
    gameState: null as never,
  };
}
```

And in COMPLETE_HANDOFF:

```typescript
if (!state.gameState && 'selectionMode' in state && state.selectionMode) {
  const board = createBoardWithPieces(
    state.player1Pieces!,
    state.player2Pieces!,
    state.player1Color!  // Now this exists
  );

  const lightPlayer = {
    id: crypto.randomUUID() as never,
    name: state.player1Color === 'light' ? state.player1Name : state.player2Name,
  };
  const darkPlayer = {
    id: crypto.randomUUID() as never,
    name: state.player1Color === 'light' ? state.player2Name : state.player1Name,
  };

  // ... rest of game state creation ...
}
```

**Step 3g**: Update createBoardWithPieces function signature

**File**: Look for where `createBoardWithPieces` is defined (likely in reducer.ts)

```typescript
// CHANGE signature from:
// function createBoardWithPieces(
//   player1Pieces: SelectedPieces,
//   player2Pieces: SelectedPieces,
//   firstMover: 'player1' | 'player2'
// ): ...

// TO:
function createBoardWithPieces(
  player1Pieces: SelectedPieces,
  player2Pieces: SelectedPieces,
  player1Color: 'light' | 'dark'
): (Piece | null)[][] {
  const board: (Piece | null)[][] = [
    [null, null, null], // Row 0
    [null, null, null], // Row 1
    [null, null, null], // Row 2
  ];

  // Place Player 1's pieces
  const p1Row = player1Color === 'light' ? 2 : 0;
  player1Pieces.forEach((pieceType, col) => {
    board[p1Row][col] = {
      type: pieceType,
      owner: player1Color,
      position: [p1Row, col] as never,
      moveCount: 0,
      id: crypto.randomUUID() as never,
    };
  });

  // Place Player 2's pieces
  const p2Row = player1Color === 'light' ? 0 : 2;
  const p2Color = player1Color === 'light' ? 'dark' : 'light';
  player2Pieces.forEach((pieceType, col) => {
    board[p2Row][col] = {
      type: pieceType,
      owner: p2Color,
      position: [p2Row, col] as never,
      moveCount: 0,
      id: crypto.randomUUID() as never,
    };
  });

  return board;
}
```

**Validation**:
```bash
pnpm run check  # Should pass now
pnpm test src/lib/gameFlow/reducer.test.ts  # Will fail - need to update tests
```

---

### PHASE 4: Update PieceSelectionScreen Component (TDD: Green)

**File**: `src/components/game/PieceSelectionScreen.tsx`

**Step 4a**: Remove first mover selection UI

```typescript
// DELETE entire "First Mover Selection" section (lines 265-287):
// {needsFirstMover && (
//   <div className={styles.firstMoverSection}>
//     ...
//   </div>
// )}

// DELETE handleFirstMoverSelect function (lines 102-107)

// UPDATE isComplete check (remove firstMover requirement):
const isComplete =
  state.selectionMode !== null &&
  state.player1Pieces !== null &&
  state.player2Pieces !== null &&
  state.player1Pieces.every((p) => p !== null) &&
  state.player2Pieces.every((p) => p !== null);
  // REMOVED: && state.firstMover !== null

// DELETE needsFirstMover calculation (lines 136-142)
```

**Step 4b**: Update piece display to show correct row based on player1Color

```typescript
// UPDATE Board Grid section (line 194+)
{state.selectionMode !== null && state.selectionMode !== 'random' && (
  <div className={styles.boardSection}>
    <h2 className={styles.sectionTitle}>Select Your Pieces</h2>
    <p className={styles.instruction}>Click any position to choose or change a piece</p>

    <div className={styles.board}>
      {/* Determine which row to show based on player1Color */}
      {state.player1Color === 'light' ? (
        <>
          {/* Row 0: Opponent pieces (display only) - top */}
          <div className={styles.row}>
            {[0, 1, 2].map((col) => {
              const piece = state.player2Pieces?.[col];
              return (
                <div key={col} className={styles.cellDisplay}>
                  {piece && (
                    <span className={styles.pieceIcon} aria-hidden="true">
                      {PIECE_POOL[piece].unicode.dark}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Row 1: Empty middle row */}
          <div className={styles.row}>
            {[0, 1, 2].map((col) => (
              <div key={col} className={styles.emptyRow} />
            ))}
          </div>

          {/* Row 2: Player pieces (clickable) - bottom */}
          <div className={styles.row}>
            {[0, 1, 2].map((col) => {
              const piece = state.player1Pieces?.[col];
              return (
                <button
                  key={col}
                  type="button"
                  onClick={() => handlePositionClick(col)}
                  className={styles.cell}
                  aria-label={`Position ${col + 1}${piece ? `: ${piece}` : ' (empty)'}`}
                >
                  {piece ? (
                    <span className={styles.pieceIcon} aria-hidden="true">
                      {PIECE_POOL[piece].unicode.light}
                    </span>
                  ) : (
                    <span className={styles.emptyCell}>{col + 1}</span>
                  )}
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <>
          {/* Player chose Dark - show pieces on top */}
          {/* Row 0: Player pieces (clickable) - top */}
          <div className={styles.row}>
            {[0, 1, 2].map((col) => {
              const piece = state.player1Pieces?.[col];
              return (
                <button
                  key={col}
                  type="button"
                  onClick={() => handlePositionClick(col)}
                  className={styles.cell}
                  aria-label={`Position ${col + 1}${piece ? `: ${piece}` : ' (empty)'}`}
                >
                  {piece ? (
                    <span className={styles.pieceIcon} aria-hidden="true">
                      {PIECE_POOL[piece].unicode.dark}
                    </span>
                  ) : (
                    <span className={styles.emptyCell}>{col + 1}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Row 1: Empty middle row */}
          <div className={styles.row}>
            {[0, 1, 2].map((col) => (
              <div key={col} className={styles.emptyRow} />
            ))}
          </div>

          {/* Row 2: Opponent pieces (display only) - bottom */}
          <div className={styles.row}>
            {[0, 1, 2].map((col) => {
              const piece = state.player2Pieces?.[col];
              return (
                <div key={col} className={styles.cellDisplay}>
                  {piece && (
                    <span className={styles.pieceIcon} aria-hidden="true">
                      {PIECE_POOL[piece].unicode.light}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  </div>
)}
```

**Validation**:
```bash
pnpm run check  # Should pass
pnpm test src/components/game/PieceSelectionScreen.test.tsx  # Will fail - update tests next
```

---

### PHASE 5: Create ColorSelectionScreen Component (TDD: Red → Green)

**File**: `src/components/game/ColorSelectionScreen.tsx` (NEW)

```typescript
/**
 * @fileoverview Color selection screen component
 * @module components/game/ColorSelectionScreen
 */

import { type ReactElement } from 'react';
import type { GameFlowAction } from '@/types/gameFlow';
import styles from './ColorSelectionScreen.module.css';

interface ColorSelectionScreenProps {
  /** Player 1's name */
  player1Name: string;
  /** Dispatch function for game flow actions */
  dispatch: (action: GameFlowAction) => void;
}

/**
 * Color selection screen component.
 *
 * Allows Player 1 to choose which color to play (Light or Dark).
 * Light player goes first, Dark player goes second.
 *
 * @component
 */
export function ColorSelectionScreen({
  player1Name,
  dispatch,
}: ColorSelectionScreenProps): ReactElement {
  const handleColorSelect = (color: 'light' | 'dark'): void => {
    dispatch({ type: 'SET_PLAYER_COLOR', color });
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Choose Your Color</h1>
      <p className={styles.subtitle}>{player1Name}</p>

      <div className={styles.colorButtons}>
        <button
          type="button"
          onClick={() => handleColorSelect('light')}
          className={styles.colorButton}
          aria-label="Choose Light pieces - go first"
        >
          <span className={styles.colorIcon}>☀️</span>
          <span className={styles.colorName}>Light</span>
          <span className={styles.colorNote}>Goes first</span>
        </button>

        <button
          type="button"
          onClick={() => handleColorSelect('dark')}
          className={styles.colorButton}
          aria-label="Choose Dark pieces - go second"
        >
          <span className={styles.colorIcon}>🌙</span>
          <span className={styles.colorName}>Dark</span>
          <span className={styles.colorNote}>Goes second</span>
        </button>
      </div>
    </div>
  );
}
```

**File**: `src/components/game/ColorSelectionScreen.module.css` (NEW)

```css
.container {
  max-width: 600px;
  margin: 0 auto;
  padding: var(--spacing-xl);
}

.title {
  text-align: center;
  margin-bottom: var(--spacing-md);
  font-size: var(--font-size-2xl);
  color: var(--color-text-primary);
}

.subtitle {
  text-align: center;
  margin-bottom: var(--spacing-xl);
  font-size: var(--font-size-lg);
  color: var(--color-text-secondary);
}

.colorButtons {
  display: flex;
  gap: var(--spacing-lg);
  justify-content: center;
  flex-wrap: wrap;
}

.colorButton {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-xl);
  min-width: 200px;
  background: var(--color-bg-secondary);
  border: 2px solid var(--color-border);
  border-radius: var(--border-radius-lg);
  cursor: pointer;
  transition: all 0.2s ease;
}

.colorButton:hover {
  background: var(--color-bg-tertiary);
  border-color: var(--color-primary);
  transform: translateY(-2px);
}

.colorButton:focus {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.colorIcon {
  font-size: 3rem;
}

.colorName {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
}

.colorNote {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  font-style: italic;
}

@media (max-width: 640px) {
  .colorButtons {
    flex-direction: column;
  }

  .colorButton {
    width: 100%;
  }
}
```

**Validation**:
```bash
pnpm run check  # Should pass
```

---

### PHASE 6: Update App.tsx Router (TDD: Green)

**File**: `src/App.tsx`

```typescript
// ADD import at top
import { ColorSelectionScreen } from '@/components/game/ColorSelectionScreen';

// ADD color-selection phase rendering (after setup phase, before piece-selection)
if (state.phase === 'color-selection') {
  return (
    <ColorSelectionScreen
      player1Name={state.player1Name}
      dispatch={dispatch}
    />
  );
}
```

**Step 6a**: Update setup phase to transition to color-selection instead of piece-selection

Find the setup phase section and update the button action:

```typescript
// CHANGE from:
// onClick={() => dispatch({ type: 'START_PIECE_SELECTION' })}

// TO:
onClick={() => dispatch({ type: 'START_COLOR_SELECTION' })}
```

**Validation**:
```bash
pnpm run check  # Should pass
pnpm build  # Should succeed
```

---

### PHASE 7: Update Tests (TDD: Green → Refactor)

**File**: `src/types/gameFlow.test.ts`

```typescript
// UPDATE test cases to remove firstMover, add player1Color
describe('GameFlowState', () => {
  it('should validate color-selection phase', () => {
    const state: ColorSelectionPhase = {
      phase: 'color-selection',
      mode: 'hotseat',
      player1Name: 'Alice',
    };
    expect(state.phase).toBe('color-selection');
  });

  it('should validate piece-selection phase with player1Color', () => {
    const state: PieceSelectionPhase = {
      phase: 'piece-selection',
      mode: 'hotseat',
      player1Name: 'Alice',
      player2Name: 'Bob',
      selectionMode: 'mirrored',
      player1Pieces: ['rook', 'knight', 'bishop'],
      player2Pieces: ['rook', 'knight', 'bishop'],
      player1Color: 'light',  // CHANGED from firstMover: 'player1'
    };
    expect(state.player1Color).toBe('light');
  });
});
```

**File**: `src/lib/gameFlow/reducer.test.ts`

```typescript
// ADD tests for new actions
describe('Color Selection', () => {
  it('should transition from setup to color-selection on START_COLOR_SELECTION', () => {
    const state: SetupPhase = {
      phase: 'setup',
      mode: 'hotseat',
      player1Name: 'Alice',
    };
    const action: StartColorSelectionAction = { type: 'START_COLOR_SELECTION' };
    const newState = gameFlowReducer(state, action);

    expect(newState).toEqual({
      phase: 'color-selection',
      mode: 'hotseat',
      player1Name: 'Alice',
    });
  });

  it('should transition from color-selection to piece-selection on SET_PLAYER_COLOR', () => {
    const state: ColorSelectionPhase = {
      phase: 'color-selection',
      mode: 'hotseat',
      player1Name: 'Alice',
    };
    const action: SetPlayerColorAction = { type: 'SET_PLAYER_COLOR', color: 'light' };
    const newState = gameFlowReducer(state, action);

    expect(newState).toEqual({
      phase: 'piece-selection',
      mode: 'hotseat',
      player1Name: 'Alice',
      player2Name: '',
      selectionMode: null,
      player1Pieces: null,
      player2Pieces: null,
      player1Color: 'light',
    });
  });
});

// UPDATE existing tests to use player1Color instead of firstMover
describe('Piece Selection', () => {
  it('should set player color during piece selection', () => {
    const state: PieceSelectionPhase = {
      phase: 'piece-selection',
      mode: 'hotseat',
      player1Name: 'Alice',
      player2Name: 'Bob',
      selectionMode: 'mirrored',
      player1Pieces: ['rook', 'knight', 'bishop'],
      player2Pieces: ['rook', 'knight', 'bishop'],
      player1Color: 'light',  // CHANGED
    };
    const action: CompletePieceSelectionAction = { type: 'COMPLETE_PIECE_SELECTION' };
    const newState = gameFlowReducer(state, action);

    expect(newState.phase).toBe('handoff'); // or 'playing' depending on conditions
  });
});

// REMOVE all tests related to SET_FIRST_MOVER action
```

**File**: `src/components/game/PieceSelectionScreen.test.tsx`

```typescript
// UPDATE base state to include player1Color
const baseState: PieceSelectionPhase = {
  phase: 'piece-selection',
  mode: 'hotseat',
  player1Name: 'Alice',
  player2Name: 'Bob',
  selectionMode: null,
  player1Pieces: null,
  player2Pieces: null,
  player1Color: 'light',  // ADD this
};

// REMOVE all "First Mover Selection" tests
// DELETE entire describe block:
// describe('First Mover Selection', () => { ... });

// UPDATE "Start Game Button" tests to remove firstMover requirement
describe('Start Game Button', () => {
  const completeState: PieceSelectionPhase = {
    ...baseState,
    selectionMode: 'independent',
    player1Pieces: ['rook', 'knight', 'bishop'],
    player2Pieces: ['queen', 'pawn', 'pawn'],
    player1Color: 'light',  // CHANGED from firstMover: 'player1'
  };

  it('should show start game button when selection complete', () => {
    render(<PieceSelectionScreen state={completeState} dispatch={mockDispatch} />);
    expect(screen.getByRole('button', { name: /start game/i })).toBeInTheDocument();
  });

  it('should not show start game button when incomplete', () => {
    const incompleteState: PieceSelectionPhase = {
      ...completeState,
      player1Pieces: null,  // Incomplete
    };
    render(<PieceSelectionScreen state={incompleteState} dispatch={mockDispatch} />);
    expect(screen.queryByRole('button', { name: /start game/i })).not.toBeInTheDocument();
  });
});

// ADD tests for board orientation based on player1Color
describe('Board Orientation', () => {
  it('should show player pieces on bottom row when player1Color is light', () => {
    const state: PieceSelectionPhase = {
      ...baseState,
      selectionMode: 'mirrored',
      player1Pieces: ['rook', 'knight', 'bishop'],
      player2Pieces: ['rook', 'knight', 'bishop'],
      player1Color: 'light',
    };
    render(<PieceSelectionScreen state={state} dispatch={mockDispatch} />);

    // Light pieces (player 1) should use light unicode
    const lightRook = screen.getByText('♜');
    expect(lightRook).toBeInTheDocument();
  });

  it('should show player pieces on top row when player1Color is dark', () => {
    const state: PieceSelectionPhase = {
      ...baseState,
      selectionMode: 'mirrored',
      player1Pieces: ['rook', 'knight', 'bishop'],
      player2Pieces: ['rook', 'knight', 'bishop'],
      player1Color: 'dark',
    };
    render(<PieceSelectionScreen state={state} dispatch={mockDispatch} />);

    // Dark pieces (player 1) should use dark unicode
    const darkRook = screen.getByText('♖');
    expect(darkRook).toBeInTheDocument();
  });
});
```

**File**: `src/components/game/ColorSelectionScreen.test.tsx` (NEW)

```typescript
/**
 * @fileoverview Tests for ColorSelectionScreen component
 * @module components/game/ColorSelectionScreen.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ColorSelectionScreen } from './ColorSelectionScreen';

describe('ColorSelectionScreen', () => {
  const mockDispatch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render title and player name', () => {
    render(<ColorSelectionScreen player1Name="Alice" dispatch={mockDispatch} />);

    expect(screen.getByRole('heading', { name: /choose your color/i })).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('should show both color options', () => {
    render(<ColorSelectionScreen player1Name="Alice" dispatch={mockDispatch} />);

    expect(screen.getByRole('button', { name: /choose light/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /choose dark/i })).toBeInTheDocument();
  });

  it('should show "Goes first" note for Light', () => {
    render(<ColorSelectionScreen player1Name="Alice" dispatch={mockDispatch} />);

    const lightButton = screen.getByRole('button', { name: /choose light/i });
    expect(lightButton).toHaveTextContent(/goes first/i);
  });

  it('should show "Goes second" note for Dark', () => {
    render(<ColorSelectionScreen player1Name="Alice" dispatch={mockDispatch} />);

    const darkButton = screen.getByRole('button', { name: /choose dark/i });
    expect(darkButton).toHaveTextContent(/goes second/i);
  });

  it('should dispatch SET_PLAYER_COLOR with light when Light button clicked', async () => {
    const user = userEvent.setup();
    render(<ColorSelectionScreen player1Name="Alice" dispatch={mockDispatch} />);

    await user.click(screen.getByRole('button', { name: /choose light/i }));

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'SET_PLAYER_COLOR',
      color: 'light',
    });
  });

  it('should dispatch SET_PLAYER_COLOR with dark when Dark button clicked', async () => {
    const user = userEvent.setup();
    render(<ColorSelectionScreen player1Name="Alice" dispatch={mockDispatch} />);

    await user.click(screen.getByRole('button', { name: /choose dark/i }));

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'SET_PLAYER_COLOR',
      color: 'dark',
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<ColorSelectionScreen player1Name="Alice" dispatch={mockDispatch} />);

      expect(screen.getByRole('button', { name: /choose light.*go first/i })).toHaveAttribute('aria-label');
      expect(screen.getByRole('button', { name: /choose dark.*go second/i })).toHaveAttribute('aria-label');
    });

    it('should be keyboard navigable', async () => {
      const user = userEvent.setup();
      render(<ColorSelectionScreen player1Name="Alice" dispatch={mockDispatch} />);

      // Tab to first button
      await user.tab();
      expect(screen.getByRole('button', { name: /choose light/i })).toHaveFocus();

      // Tab to second button
      await user.tab();
      expect(screen.getByRole('button', { name: /choose dark/i })).toHaveFocus();
    });

    it('should support Enter key activation', async () => {
      const user = userEvent.setup();
      render(<ColorSelectionScreen player1Name="Alice" dispatch={mockDispatch} />);

      const lightButton = screen.getByRole('button', { name: /choose light/i });
      lightButton.focus();
      await user.keyboard('{Enter}');

      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'SET_PLAYER_COLOR',
        color: 'light',
      });
    });
  });
});
```

**Validation**:
```bash
pnpm test  # All tests should pass
```

---

### PHASE 8: Update localStorage (if needed)

Check if `firstMover` is stored in localStorage. If so, update:

**File**: `src/lib/storage/localStorage.ts`

Search for `firstMover` references and update to `player1Color` if found.

**Validation**:
```bash
grep -r "firstMover" src/lib/storage/
# If found, update those references
```

---

## Validation Loop

### Level 1: Type Checking
```bash
pnpm run check
# Expected: 0 errors
```

### Level 2: Linting
```bash
pnpm run lint
# Expected: 0 warnings, 0 errors
```

### Level 3: Unit Tests
```bash
pnpm test
# Expected: All 790+ tests passing
```

### Level 4: Integration Tests
```bash
pnpm test:integration
# Expected: All tests passing
```

### Level 5: E2E Tests
```bash
pnpm test:e2e
# Expected: All tests passing
```

### Level 6: Build
```bash
pnpm build
# Expected: Successful build
```

### Level 7: Manual Testing Checklist

**Hot-seat Mode - Mirrored**:
- [ ] Player 1 enters name
- [ ] Player 1 chooses Light color
- [ ] Pieces appear on bottom row (row 2) with light unicode
- [ ] Player 1 selects 3 pieces
- [ ] "Start Game" button appears
- [ ] Click "Start Game"
- [ ] Player 2 name prompt appears
- [ ] Enter Player 2 name
- [ ] Game board shows Player 1's pieces on bottom
- [ ] Player 1 can select and move pieces
- [ ] Party button appears in correct court

**Hot-seat Mode - Mirrored (Dark)**:
- [ ] Player 1 enters name
- [ ] Player 1 chooses Dark color
- [ ] Pieces appear on top row (row 0) with dark unicode
- [ ] Player 1 selects 3 pieces
- [ ] "Start Game" button appears
- [ ] Click "Start Game"
- [ ] Handoff screen appears (Player 2 is light, should go first)
- [ ] Player 2 name prompt
- [ ] Game starts with Player 2's turn (light player)

**Hot-seat Mode - Independent**:
- [ ] Player 1 enters name
- [ ] Player 1 chooses Light
- [ ] Player 1 selects 3 pieces (on bottom row)
- [ ] Player 2 name prompt appears
- [ ] Enter Player 2 name
- [ ] Player 2 sees board from their perspective (top row)
- [ ] Player 2 selects 3 different pieces
- [ ] "Start Game" button appears
- [ ] Game starts with Player 1's turn (light player)

---

## Rollback Strategy

If issues arise at any phase:

1. **Immediate rollback**: `git reset --hard HEAD~1`
2. **Partial rollback**: Use git to revert specific files
3. **Feature flag**: Add `useNewPieceSelectionFlow` flag to toggle between old/new flow

**Rollback commands**:
```bash
# Full rollback
git reset --hard HEAD~1

# Revert specific file
git checkout HEAD~1 -- src/lib/gameFlow/reducer.ts

# Stash changes and test old code
git stash
pnpm test
git stash pop
```

---

## Debug Strategies

### Issue: TypeScript errors about player1Color not existing

**Diagnosis**:
```bash
pnpm run check 2>&1 | grep player1Color
```

**Fix**: Ensure all phase interfaces are updated in `types/gameFlow.ts`

### Issue: Tests failing with "firstMover is not defined"

**Diagnosis**:
```bash
pnpm test 2>&1 | grep firstMover
```

**Fix**: Search all test files for `firstMover` and replace with `player1Color`

### Issue: Wrong pieces selectable after color selection

**Diagnosis**: Check `createBoardWithPieces` function logic

**Fix**: Verify row assignment:
- `player1Color === 'light'` → p1Row = 2, p2Row = 0
- `player1Color === 'dark'` → p1Row = 0, p2Row = 2

### Issue: Duplicate piece selection screen still appears

**Diagnosis**: Check reducer logic in `COMPLETE_PIECE_SELECTION`

**Fix**: Ensure first mover selection UI is completely removed from `PieceSelectionScreen.tsx`

---

## Success Criteria

✅ All TypeScript compilation errors resolved
✅ All ESLint warnings resolved
✅ All 790+ unit tests passing
✅ All integration tests passing
✅ All E2E tests passing
✅ Manual testing checklist completed
✅ No duplicate piece selection screen
✅ Correct pieces selectable based on color choice
✅ Party button activates for correct court
✅ Board orientation correct during piece selection
✅ Independent mode flows correctly (P2 name → P2 piece selection)
✅ Code review approved

---

## Performance Impact

**Expected**: Minimal performance impact
- New color-selection phase adds one extra screen/click
- No algorithmic changes, just flow refactoring
- No additional API calls or heavy computations

**Monitoring**: Check that phase transitions remain instant (<100ms)

---

## Security Considerations

**None** - This is a UI/UX flow refactor with no security implications.

---

## Notes and Assumptions

1. **Assumption**: The `createBoardWithPieces` function exists in reducer.ts
2. **Assumption**: No localStorage migration needed (firstMover not persisted)
3. **Note**: This is a breaking change for any in-progress games (acceptable for beta)
4. **Note**: URL encoding may need updates if `firstMover` is in payload (check separately)

---

## References

- Issue #6: https://github.com/randallard/kings-cooking/issues/6
- CLAUDE-REACT.md: `/home/ryankhetlyr/Development/kings-cooking/claude_md_files/CLAUDE-REACT.md`
- Existing PRP: `PRPs/task-issue-6-piece-selection.md`
