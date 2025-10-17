# Phase 5: Game Flow Integration - Dual-Mode Complete Gameplay

**Version:** 2.0.0
**Phase:** 5 of 7
**Complexity:** High
**Dependencies:** Phase 1 (Foundation), Phase 2 (Chess Engine), Phase 3 (URL State), Phase 4 (UI Components)
**Estimated Effort:** 2-3 weeks
**Date:** 2025-10-16

---

## 🎯 GOAL

Transform App.tsx from a Phase 4 component showcase into a production-ready chess game with **TWO distinct play modes** (hot-seat and URL) sharing a unified state machine, complete turn management, and comprehensive E2E test coverage.

**Specific Deliverables:**

1. **Mode Selector** - Choose between hot-seat (same device) or URL (separate devices) at game start
2. **Unified State Machine** - useReducer-based game flow (5 phases: mode-selection → setup → playing → handoff → victory)
3. **Hot-Seat Mode Flow** - Privacy screen + "I'm Ready" button, localStorage ONLY (no URL generation)
4. **URL Mode Flow** - URLSharer + "Copy URL" button, full URL state sync with delta encoding
5. **Shared Game Logic** - Chess engine, move validation, victory detection work identically in both modes
6. **Mode-Specific UI Branches** - Conditional rendering based on `gameMode: 'hotseat' | 'url'`
7. **Player Name Management** - Collected at appropriate points for each mode
8. **Edge Case Handling** - Browser back button, page refresh, corrupted URLs
9. **E2E Test Coverage** - 80%+ coverage with separate test suites for each mode
10. **Production Build** - Zero errors, zero warnings, all validation gates pass

**NOT in Phase 5 (Deferred):**
- ❌ WebRTC real-time multiplayer (Phase 6+)
- ❌ Move history viewer UI with full replay (Phase 6+)
- ❌ Undo/redo functionality (Phase 6+)
- ❌ Mode switching mid-game (Phase 6+)
- ❌ Variable board sizes (v2.0+)

**Success Criteria:**
- ✅ Mode selector appears on game start with clear descriptions
- ✅ Hot-seat mode: Complete game playable with privacy screens, NO URLs generated
- ✅ URL mode: Complete game playable with URL generation after each move
- ✅ Both modes share same state machine and game logic
- ✅ Page refresh works correctly in both modes (localStorage for hot-seat, URL+localStorage for URL mode)
- ✅ Victory screen shows with confetti and stats in both modes
- ✅ 80%+ E2E test coverage for BOTH mode journeys
- ✅ Zero TypeScript errors, zero ESLint warnings
- ✅ Production build passes all validation gates

---

## 💡 WHY

**Business Value:**
- Delivers **MVP complete** with TWO play styles = broader user appeal
- Hot-seat mode: Zero infrastructure costs, instant play
- URL mode: Async gameplay without requiring accounts or servers
- Dual-mode architecture demonstrates technical sophistication
- URL sharing enables viral growth potential

**User Impact:**

**BEFORE Phase 5:**
- Users see beautiful UI components but can't play a complete game
- No way to choose how they want to play

**AFTER Phase 5:**
- **Hot-Seat Users** can:
  - Start game immediately with one device
  - Pass device between players with privacy screen
  - Play offline without internet
  - Refresh page without losing game

- **URL Mode Users** can:
  - Share game state via URL to play across devices/browsers
  - Play async (make move, send link, wait for opponent)
  - Continue game even if localStorage is cleared (URL contains state)
  - See URL update after each move with delta encoding

**Technical Dependencies:**
- Phase 1: `GameStateSchema`, `storage` utilities, TypeScript strict mode
- Phase 2: `KingsChessEngine` with `makeMove()`, `getChecksum()`, `checkGameEnd()`
- Phase 3: `useUrlState` hook, payload types (`DeltaPayload`, `FullStatePayload`, `ResyncRequestPayload`)
- Phase 4: `GameBoard`, `HandoffScreen`, `VictoryScreen`, `NameForm`, `URLSharer`, `DarkModeToggle`

**Why This Order:**
- Can't implement game modes without chess engine (Phase 2)
- Can't sync URL state without Phase 3 infrastructure
- Can't show UI without components (Phase 4)
- Phase 5 unblocks Phase 6 (polish & optimization) by providing complete functionality

---

## 📋 WHAT

### User-Visible Behavior

#### **Mode Selection Flow (Both Modes)**

**Initial Screen:**
```
┌────────────────────────────────────────────┐
│         🎮 King's Cooking Chess            │
│                                            │
│     Choose Your Game Mode:                 │
│                                            │
│  ┌──────────────────────────────────────┐ │
│  │  🏠 Hot-Seat Mode                    │ │
│  │  Play with someone on this device    │ │
│  │  • Pass device back and forth        │ │
│  │  • Privacy screen between turns      │ │
│  │  • Works offline                     │ │
│  └──────────────────────────────────────┘ │
│                                            │
│  ┌──────────────────────────────────────┐ │
│  │  🔗 URL Mode                         │ │
│  │  Share game via URL remotely         │ │
│  │  • Each player on their own device   │ │
│  │  • Share URL after each move         │ │
│  │  • Play at your own pace             │ │
│  └──────────────────────────────────────┘ │
└────────────────────────────────────────────┘
```

#### **Hot-Seat Mode - Complete Journey**

**Phase 1: Name Entry**
- Player 1 enters name (e.g., "Alice")
- Player 2 name collected on first turn handoff (not at start)
- Both names stored in localStorage (`PLAYER1_NAME`, `PLAYER2_NAME`)

**Phase 2: Playing**
- Alice sees board, her pieces highlighted
- Click rook → legal moves shown
- Click destination → "Confirm & Hand Off" button appears
- Click confirm → Move validated by engine

**Phase 3: Handoff Screen**
```
┌────────────────────────────────────────────┐
│                                            │
│         Alice made their move              │
│                                            │
│         🔄 Pass device to Bob               │
│                                            │
│                                            │
│      [Privacy Screen - Board Hidden]       │
│                                            │
│                                            │
│         ┌──────────────────┐              │
│         │  I'm Ready, Bob  │              │
│         └──────────────────┘              │
│                                            │
│    (Optional 3-second countdown with Skip) │
└────────────────────────────────────────────┘
```

**Phase 4: Bob's Turn**
- Privacy screen clears
- Board shown with Bob's pieces highlighted
- Bob makes move → "Confirm & Hand Off"
- Cycle repeats

**Phase 5: Victory**
- Game ends when one player gets more pieces to opponent's court
- VictoryScreen shows winner, stats, confetti
- "New Game" button returns to mode selection

**CRITICAL: NO URLs generated during hot-seat gameplay**

---

#### **URL Mode - Complete Journey**

**Phase 1: Name Entry + Warning**
- Player 1 (Alice) enters name
- ⚠️ Warning: "Don't clear cache during the game"
- Alice makes first move

**Phase 2: URL Generation (First Move)**
```
┌────────────────────────────────────────────┐
│                                            │
│     ✅ Move Confirmed!                     │
│                                            │
│     Share this URL with your opponent:     │
│                                            │
│  ┌──────────────────────────────────────┐ │
│  │ https://..../#d=N4IgdghgtgpiBcI... │ │
│  └──────────────────────────────────────┘ │
│                                            │
│         ┌──────────────────┐              │
│         │   📋 Copy URL    │              │
│         └──────────────────┘              │
│                                            │
│     Send this link to Bob via:             │
│     • Text message  • Email  • Chat        │
│                                            │
│  ⏳ Waiting for Bob to make their move...  │
└────────────────────────────────────────────┘
```

**IMPORTANT: First URL is `type: 'full_state'` (~500-1000 chars)**

**Phase 3: Bob Receives URL**
- Bob opens URL in their browser
- URL decompressed → `FullStatePayload` validated with Zod
- Game state saved to Bob's localStorage
- Bob prompted for their name (Player 2)
- Bob makes move

**Phase 4: Subsequent Moves (Delta URLs)**
- Bob's URL generated: `type: 'delta'` (~100-200 chars)
- Contains: `{ move, turn, checksum, playerName: 'Bob' }`
- Alice opens Bob's URL → delta applied to her localStorage state
- Checksum verified → if match, move applied
- Cycle repeats

**Phase 5: Victory**
- Same victory screen as hot-seat
- Additional "Share Result" button generates shareable URL

---

### Mode-Specific UI Differences

**From PRD.md line 390-396:**

| Game State | Hot-Seat UI | URL Mode UI |
|------------|-------------|-------------|
| **PreGame** | Mode selector only | Mode selector + ⚠️ Browser warning |
| **MoveSelected** | "Confirm & Hand Off" button | "Confirm & Generate URL" button |
| **Handoff** | Privacy screen + "I'm Ready, [Name]" button | URLSharer + "Copy URL" + "⏳ Waiting..." |
| **Player2NamePrompt** | After first move handoff | After opening first URL |
| **TheirTurn** | Hidden (privacy screen) | "⏳ Waiting..." (passive display) |

---

### Technical Requirements

#### 1. Mode Selection State

**Stored in localStorage:**
```typescript
// src/lib/storage/localStorage.ts (lines 25-43)
GAME_MODE: 'kings-cooking:game-mode'  // Type: 'hotseat' | 'url'
```

**ModeSelector Component (NEW):**
```typescript
// src/components/game/ModeSelector.tsx
interface ModeSelectorProps {
  onModeSelected: (mode: 'hotseat' | 'url') => void;
}

export function ModeSelector({ onModeSelected }: ModeSelectorProps): ReactElement {
  return (
    <div className={styles.container}>
      <h1>King's Cooking Chess</h1>
      <h2>Choose Your Game Mode:</h2>

      <button
        onClick={() => onModeSelected('hotseat')}
        aria-label="Play hot-seat mode on this device"
      >
        <h3>🏠 Hot-Seat Mode</h3>
        <p>Play with someone on this device</p>
        <ul>
          <li>Pass device back and forth</li>
          <li>Privacy screen between turns</li>
          <li>Works offline</li>
        </ul>
      </button>

      <button
        onClick={() => onModeSelected('url')}
        aria-label="Play URL mode across devices"
      >
        <h3>🔗 URL Mode</h3>
        <p>Share game via URL remotely</p>
        <ul>
          <li>Each player on their own device</li>
          <li>Share URL after each move</li>
          <li>Play at your own pace</li>
        </ul>
      </button>
    </div>
  );
}
```

---

#### 2. Unified State Machine (Both Modes)

**State Type with Discriminated Unions:**
```typescript
// src/types/gameFlow.ts
type GameFlowState =
  | { phase: 'mode-selection' }
  | {
      phase: 'setup';
      mode: 'hotseat' | 'url';
      player1Name: string | null;
    }
  | {
      phase: 'playing';
      mode: 'hotseat' | 'url';
      player1Name: string;
      player2Name: string | null;
      gameState: GameState;
      selectedPosition: Position | null;
      legalMoves: Position[];
      pendingMove: { from: Position; to: Position } | null;
    }
  | {
      phase: 'handoff';
      mode: 'hotseat' | 'url';
      player1Name: string;
      player2Name: string;
      gameState: GameState;
      lastMove: { from: Position; to: Position };
      countdown: number;  // Hot-seat only
      generatedUrl: string | null;  // URL mode only
    }
  | {
      phase: 'victory';
      mode: 'hotseat' | 'url';
      winner: 'white' | 'black' | 'draw';
      gameState: GameState;
      player1Name: string;
      player2Name: string;
    };

type GameFlowAction =
  | { type: 'SELECT_MODE'; mode: 'hotseat' | 'url' }
  | { type: 'SET_PLAYER1_NAME'; name: string }
  | { type: 'START_GAME' }
  | { type: 'SELECT_PIECE'; position: Position; legalMoves: Position[] }
  | { type: 'DESELECT_PIECE' }
  | { type: 'STAGE_MOVE'; from: Position; to: Position }
  | { type: 'CONFIRM_MOVE'; result: MoveResult }
  | { type: 'SET_PLAYER2_NAME'; name: string }  // Hot-seat: after first handoff, URL: when opening first URL
  | { type: 'COMPLETE_HANDOFF' }  // Hot-seat only
  | { type: 'URL_GENERATED'; url: string }  // URL mode only
  | { type: 'GAME_OVER'; winner: 'white' | 'black' | 'draw' }
  | { type: 'NEW_GAME' }
  | { type: 'LOAD_FROM_URL'; payload: FullStatePayload | DeltaPayload };  // URL mode only
```

**Reducer Implementation:**
```typescript
function gameFlowReducer(state: GameFlowState, action: GameFlowAction): GameFlowState {
  switch (action.type) {
    case 'SELECT_MODE':
      if (state.phase !== 'mode-selection') return state;
      return {
        phase: 'setup',
        mode: action.mode,
        player1Name: null,
      };

    case 'SET_PLAYER1_NAME':
      if (state.phase !== 'setup') return state;
      return { ...state, player1Name: action.name };

    case 'START_GAME':
      if (state.phase !== 'setup' || !state.player1Name) return state;
      return {
        phase: 'playing',
        mode: state.mode,
        player1Name: state.player1Name,
        player2Name: null,  // Collected later
        gameState: createInitialGameState(),
        selectedPosition: null,
        legalMoves: [],
        pendingMove: null,
      };

    case 'SELECT_PIECE':
      if (state.phase !== 'playing') return state;
      return {
        ...state,
        selectedPosition: action.position,
        legalMoves: action.legalMoves,
      };

    case 'STAGE_MOVE':
      if (state.phase !== 'playing') return state;
      return {
        ...state,
        pendingMove: { from: action.from, to: action.to },
      };

    case 'CONFIRM_MOVE':
      if (state.phase !== 'playing' || !state.pendingMove) return state;

      // Check for game over
      const victoryResult = action.result.engine.checkGameEnd();
      if (victoryResult.gameOver) {
        return {
          phase: 'victory',
          mode: state.mode,
          winner: victoryResult.winner || 'draw',
          gameState: action.result.newState,
          player1Name: state.player1Name,
          player2Name: state.player2Name || 'Player 2',
        };
      }

      // Transition to handoff
      return {
        phase: 'handoff',
        mode: state.mode,
        player1Name: state.player1Name,
        player2Name: state.player2Name || '',  // Prompt if empty
        gameState: action.result.newState,
        lastMove: state.pendingMove,
        countdown: 3,  // Hot-seat countdown
        generatedUrl: null,  // URL mode: will be set by URL_GENERATED action
      };

    case 'SET_PLAYER2_NAME':
      // Hot-seat: called from handoff screen if player2Name is empty
      // URL mode: called when Player 2 opens first URL
      if (state.phase === 'handoff') {
        return { ...state, player2Name: action.name };
      }
      if (state.phase === 'playing') {
        return { ...state, player2Name: action.name };
      }
      return state;

    case 'URL_GENERATED':
      // URL mode only
      if (state.phase !== 'handoff' || state.mode !== 'url') return state;
      return { ...state, generatedUrl: action.url };

    case 'COMPLETE_HANDOFF':
      if (state.phase !== 'handoff') return state;
      return {
        phase: 'playing',
        mode: state.mode,
        player1Name: state.player1Name,
        player2Name: state.player2Name,
        gameState: state.gameState,
        selectedPosition: null,
        legalMoves: [],
        pendingMove: null,
      };

    case 'GAME_OVER':
      if (state.phase !== 'playing') return state;
      return {
        phase: 'victory',
        mode: state.mode,
        winner: action.winner,
        gameState: state.gameState,
        player1Name: state.player1Name,
        player2Name: state.player2Name || 'Player 2',
      };

    case 'NEW_GAME':
      return { phase: 'mode-selection' };

    case 'LOAD_FROM_URL':
      // URL mode only: restore game from URL on page load
      // This bypasses mode selection and goes straight to playing
      // Details in URL integration section
      return handleUrlLoad(state, action.payload);

    default:
      const _exhaustive: never = action;
      throw new Error(`Unhandled action: ${JSON.stringify(_exhaustive)}`);
  }
}
```

---

#### 3. App.tsx Integration

**Structure:**
```typescript
// src/App.tsx
import { useReducer, useEffect } from 'react';
import { gameFlowReducer } from './lib/gameFlow/reducer';
import { ModeSelector } from './components/game/ModeSelector';
import { NameForm } from './components/game/NameForm';
import { GameBoard } from './components/game/GameBoard';
import { HandoffScreen } from './components/game/HandoffScreen';
import { VictoryScreen } from './components/game/VictoryScreen';
import { URLSharer } from './components/game/URLSharer';
import { useUrlState } from './hooks/useUrlState';
import { storage } from './lib/storage/localStorage';

export function App(): ReactElement {
  const [state, dispatch] = useReducer(gameFlowReducer, { phase: 'mode-selection' });

  // URL state hook (URL mode only)
  const {
    payload,
    updateUrl,
    updateUrlImmediate,
    getShareUrl,
  } = useUrlState({
    enabled: state.phase !== 'mode-selection' &&
             (state as any).mode === 'url',  // Only in URL mode
    onPayloadReceived: (payload) => {
      dispatch({ type: 'LOAD_FROM_URL', payload });
    },
  });

  // Restore mode from localStorage on mount
  useEffect(() => {
    const savedMode = storage.getGameMode();
    const savedGameState = storage.getGameState();

    if (savedMode && savedGameState) {
      // Restore in-progress game
      // Details in implementation section
    }
  }, []);

  // Render based on phase
  if (state.phase === 'mode-selection') {
    return (
      <ModeSelector
        onModeSelected={(mode) => {
          dispatch({ type: 'SELECT_MODE', mode });
          storage.setGameMode(mode);
        }}
      />
    );
  }

  if (state.phase === 'setup') {
    return (
      <NameForm
        storageKey="player1"
        label="Enter your name (Player 1)"
        onNameChange={(name) => {
          dispatch({ type: 'SET_PLAYER1_NAME', name });
        }}
        onSubmit={() => {
          dispatch({ type: 'START_GAME' });
        }}
      />
    );
  }

  if (state.phase === 'playing') {
    return (
      <>
        <GameBoard
          gameState={state.gameState}
          isPlayerTurn={true}
          onMove={(from, to) => {
            dispatch({ type: 'STAGE_MOVE', from, to });
          }}
        />

        {state.pendingMove && (
          <MoveConfirmButton
            onConfirm={() => {
              const engine = new KingsChessEngine();
              engine.loadGameState(state.gameState);
              const result = engine.makeMove(
                state.pendingMove.from,
                state.pendingMove.to
              );

              if (result.success) {
                dispatch({
                  type: 'CONFIRM_MOVE',
                  result: {
                    newState: engine.getGameState(),
                    engine,
                  }
                });
              }
            }}
          />
        )}
      </>
    );
  }

  if (state.phase === 'handoff') {
    // Mode-specific handoff UI
    if (state.mode === 'hotseat') {
      return (
        <HandoffScreen
          nextPlayer={state.gameState.currentPlayer}
          nextPlayerName={state.player2Name || ''}
          onContinue={() => {
            dispatch({ type: 'COMPLETE_HANDOFF' });
          }}
          onNameSubmit={(name) => {
            dispatch({ type: 'SET_PLAYER2_NAME', name });
          }}
          showNamePrompt={!state.player2Name}
        />
      );
    } else {
      // URL mode
      return (
        <URLSharer
          url={state.generatedUrl || getShareUrl()}
          onCopy={() => {
            // Analytics or toast notification
          }}
        />
      );
    }
  }

  if (state.phase === 'victory') {
    return (
      <VictoryScreen
        winner={state.winner}
        winnerName={state.winner === 'white' ? state.player1Name : state.player2Name}
        loserName={state.winner === 'white' ? state.player2Name : state.player1Name}
        totalMoves={state.gameState.currentTurn}
        gameDuration={0}  // TODO: Track duration
        whiteCaptured={state.gameState.capturedWhite.length}
        blackCaptured={state.gameState.capturedBlack.length}
        onNewGame={() => {
          dispatch({ type: 'NEW_GAME' });
          storage.clearGameState();
        }}
        onShare={state.mode === 'url' ? () => {
          // Generate victory URL
        } : undefined}
      />
    );
  }

  return null;
}
```

---

## 🔗 REFERENCE DOCUMENTATION

### Phase 1-4 Integration Points

**Validation Schemas** (`/home/ryankhetlyr/Development/kings-cooking/src/lib/validation/schemas.ts`):
- Lines 175-209: `GameStateSchema` - Complete game state type
- Lines 92-100: `Piece` type definition
- Lines 76-81: `Position` type (`[number, number] | null`)

**localStorage Utilities** (`/home/ryankhetlyr/Development/kings-cooking/src/lib/storage/localStorage.ts`):
- Lines 25-43: `STORAGE_KEYS` constant with all keys
- Lines 159-203: Typed storage interface (`storage.getGameState()`, etc.)
- Lines 69-93: `getValidatedItem()` with Zod validation

**Chess Engine** (`/home/ryankhetlyr/Development/kings-cooking/src/lib/chess/KingsChessEngine.ts`):
- Lines 100-145: `makeMove()` method
- Lines 371-373: `checkGameEnd()` method
- Lines 422-436: `generateChecksum()` method
- Lines 320-329: `advanceTurn()` private method

**URL State Hook** (`/home/ryankhetlyr/Development/kings-cooking/src/hooks/useUrlState.ts`):
- Lines 78-81: State management (payload, error, isLoading)
- Lines 171-205: `updateUrl()` debounced update
- Lines 236-259: `updateUrlImmediate()` force immediate
- Lines 276-297: Return interface

**Phase 3 Payload Types** (`/home/ryankhetlyr/Development/kings-cooking/PRPs/phase-3-url-state-sync-flows.md`):
- Lines 38-68: Complete type definitions for `DeltaPayload`, `FullStatePayload`, `ResyncRequestPayload`

**Phase 4 UI Components**:
- `GameBoard.tsx` (lines 12-19): Props interface
- `HandoffScreen.tsx` (lines 9-22): Props with countdown
- `VictoryScreen.tsx` (lines 9-30): Complete props
- `URLSharer.tsx` (lines 9-14): URL + onCopy callback
- `NameForm.tsx` (lines 10-17): Storage key + validation

### Project-Specific Documentation (MUST READ)

**CRITICAL**: `/home/ryankhetlyr/Development/kings-cooking/claude_md_files/CLAUDE-REACT.md`
- **Lines 100-122**: MANDATORY React 19 TypeScript patterns
  - MUST use `ReactElement` instead of `JSX.Element`
  - MUST import `ReactElement` from 'react' explicitly
  - All function components MUST have explicit return types
- **Lines 23-28**: Design principles (Vertical Slice Architecture, Composition, Fail Fast)
- **Lines 89-91**: React Compiler - no manual memoization needed
- **Lines 124-150**: Actions API examples with documentation patterns
- **Line 47**: TDD requirement - create tests BEFORE implementation

**Phase 3 Decision Documentation**:
- `/home/ryankhetlyr/Development/kings-cooking/PRPs/phase-3-decisions-summary.md`
  - **Lines 226, 232-244**: Hot-seat vs URL mode separation
  - Hot-seat: localStorage ONLY, NO URL generation
  - URL mode: URLs generated after every move

### External Research References

**React 19 useReducer Patterns**:
- Official Docs: https://react.dev/reference/react/useReducer
- Discriminated Unions: https://www.totaltypescript.com/tutorials/react-with-typescript/hooks/typing-state-and-actions-for-usereducer/solution
- State Machine Pattern: https://kyleshevlin.com/how-to-use-usereducer-as-a-finite-state-machine/

**URL State Synchronization**:
- History API: https://developer.mozilla.org/en-US/docs/Web/API/History_API/Working_with_the_History_API
- Hash Navigation: https://developer.mozilla.org/en-US/docs/Web/API/Window/popstate_event

**Playwright Testing**:
- Clock API: https://playwright.dev/docs/clock
- Page Object Model: https://playwright.dev/docs/pom
- Test Fixtures: https://playwright.dev/docs/test-fixtures
- localStorage Testing: https://scrapingant.com/blog/playwright-local-storage

---

## 🛠 IMPLEMENTATION BLUEPRINT

### Task 1: Create ModeSelector Component
**File:** `src/components/game/ModeSelector.tsx`
**Dependencies:** None
**Tests:** `src/components/game/ModeSelector.test.tsx`

**Implementation:**
1. Create component with two mode buttons
2. Add descriptions from PRD lines 797-798
3. Style with proper tap targets (44x44px minimum)
4. Add accessibility labels
5. Test both mode selections
6. Test keyboard navigation

**Validation:**
```bash
pnpm test src/components/game/ModeSelector.test.tsx
pnpm run check:types
```

---

### Task 2: Extend localStorage for Game Mode
**File:** `src/lib/storage/localStorage.ts`
**Dependencies:** Task 1
**Tests:** `src/lib/storage/localStorage.test.ts`

**Implementation:**
1. Add `GAME_MODE` key (already exists at line 30)
2. Create `getGameMode()` and `setGameMode()` methods
3. Create Zod schema for mode validation
4. Add to typed storage interface
5. Test mode persistence
6. Test invalid mode rejection

**Code:**
```typescript
// Add to storage interface (after line 203)
export const storage = {
  // ... existing methods

  getGameMode(): 'hotseat' | 'url' | null {
    const mode = getValidatedItem('kings-cooking:game-mode', z.enum(['hotseat', 'url']));
    return mode;
  },

  setGameMode(mode: 'hotseat' | 'url'): boolean {
    return setValidatedItem('kings-cooking:game-mode', mode, z.enum(['hotseat', 'url']));
  },
};
```

---

### Task 3: Create GameFlow Type Definitions
**File:** `src/types/gameFlow.ts` (NEW)
**Dependencies:** None
**Tests:** TypeScript compilation

**Implementation:**
1. Define `GameFlowState` discriminated union (5 phases)
2. Define `GameFlowAction` discriminated union (11 actions)
3. Export types for App.tsx
4. Add JSDoc comments for each type
5. Validate with TypeScript strict mode

**Validation:**
```bash
pnpm run check:types
```

---

### Task 4: Implement gameFlowReducer
**File:** `src/lib/gameFlow/reducer.ts` (NEW)
**Dependencies:** Task 3
**Tests:** `src/lib/gameFlow/reducer.test.ts`

**Implementation:**
1. Implement reducer with switch on action.type
2. Add exhaustive checking with never type
3. Handle all 11 action types
4. Add mode-specific logic branches
5. Write unit tests for each transition
6. Test invalid transitions return unchanged state

**Test Cases:**
- Mode selection → setup
- Setup → playing (with player1 name)
- Playing → handoff (after move)
- Handoff → playing (hot-seat: after button, URL: after URL gen)
- Playing → victory (on game end)
- Victory → mode-selection (new game)

**Validation:**
```bash
pnpm test src/lib/gameFlow/reducer.test.ts --coverage
```

---

### Task 5: Integrate State Machine into App.tsx
**File:** `src/App.tsx`
**Dependencies:** Tasks 1-4
**Tests:** Integration tests

**Implementation:**
1. Replace existing useState with useReducer
2. Import gameFlowReducer
3. Initialize with `{ phase: 'mode-selection' }`
4. Add conditional rendering based on phase
5. Wire up all dispatch calls
6. Test mode switching

**Key Changes:**
- Lines 19-30: Remove old useState calls
- Add useReducer initialization
- Replace component showcase with phase-based rendering

---

### Task 6: Hot-Seat Mode - Privacy Screen Flow
**File:** `src/App.tsx` (handoff phase)
**Dependencies:** Task 5, HandoffScreen component (Phase 4)
**Tests:** `tests/e2e/hot-seat-flow.spec.ts`

**Implementation:**
1. After CONFIRM_MOVE, check if `mode === 'hotseat'`
2. Render HandoffScreen with countdown
3. If player2Name is empty, show NameForm first
4. On COMPLETE_HANDOFF, transition to playing phase
5. Board re-renders with new currentPlayer

**Edge Cases:**
- First handoff (Player 2 name prompt)
- Subsequent handoffs (no name prompt)
- Skip countdown button
- Countdown reaches 0 auto-continue

---

### Task 7: URL Mode - URL Generation Flow
**File:** `src/App.tsx` (handoff phase + useUrlState integration)
**Dependencies:** Task 5, useUrlState hook (Phase 3)
**Tests:** `tests/e2e/url-mode-flow.spec.ts`

**Implementation:**
1. Enable useUrlState hook only when `mode === 'url'`
2. After CONFIRM_MOVE in URL mode:
   - Check if first move (moveHistory.length === 1)
   - If first: call `updateUrlImmediate()` with FullStatePayload
   - If subsequent: call `updateUrl()` (debounced) with DeltaPayload
3. Dispatch URL_GENERATED action with generated URL
4. Render URLSharer component in handoff phase
5. Show "⏳ Waiting..." state (no button)

**URL Payload Construction:**
```typescript
// First move
updateUrlImmediate({
  type: 'full_state',
  gameState: state.gameState,
  notification: `Join ${state.player1Name}'s game!`,
});

// Subsequent moves
updateUrl({
  type: 'delta',
  move: state.pendingMove,
  turn: state.gameState.currentTurn,
  checksum: engine.getChecksum(),
  playerName: state.player2Name,  // Only on first move from P2
});
```

---

### Task 8: URL Mode - URL Loading Flow
**File:** `src/App.tsx` (LOAD_FROM_URL action)
**Dependencies:** Task 7
**Tests:** `tests/e2e/url-loading.spec.ts`

**Implementation:**
1. useUrlState hook detects hash on page load
2. Decompresses payload → validates with Zod
3. Calls `onPayloadReceived` callback
4. App dispatches LOAD_FROM_URL action
5. Reducer handles two cases:
   - FullStatePayload: Restore complete game, show Player 2 name prompt
   - DeltaPayload: Apply move to existing localStorage state, verify checksum

**Checksum Verification:**
```typescript
if (payload.type === 'delta') {
  const currentState = storage.getGameState();
  const engine = new KingsChessEngine();
  engine.loadGameState(currentState);

  // Verify checksum before applying
  const currentChecksum = engine.getChecksum();
  if (currentChecksum !== payload.checksum) {
    // Checksum mismatch - trigger resync flow (Phase 3)
    console.error('State diverged - checksums do not match');
    // Show History Comparison Modal (already implemented in Phase 3)
    return state;
  }

  // Apply delta
  const result = engine.makeMove(payload.move.from, payload.move.to);
  if (result.success) {
    storage.setGameState(engine.getGameState());
    // Transition to playing phase
  }
}
```

---

### Task 9: Edge Case - Browser Back Button
**File:** `src/App.tsx` (useEffect for popstate)
**Dependencies:** All previous tasks
**Tests:** `tests/e2e/edge-cases.spec.ts`

**Implementation Priority (from user discussion):**
1. **Attempt to disable back button** during active game
2. **If disable not possible:** Treat as page refresh
3. **Load from localStorage** (priority over URL history state)
4. **Show toast:** "Loaded current game state from device"

**Code:**
```typescript
useEffect(() => {
  // Prevent back button during game
  const handlePopState = (event: PopStateEvent) => {
    if (state.phase === 'playing' || state.phase === 'handoff') {
      event.preventDefault();

      // Try to stay on current page
      window.history.pushState(null, '', window.location.href);

      // Fallback: Reload from localStorage
      const savedState = storage.getGameState();
      if (savedState) {
        dispatch({
          type: 'LOAD_FROM_LOCAL_STORAGE',
          gameState: savedState
        });

        // Show toast notification
        showToast('Loaded current game state from device');
      }
    }
  };

  window.addEventListener('popstate', handlePopState);
  return () => window.removeEventListener('popstate', handlePopState);
}, [state.phase]);
```

---

### Task 10: Edge Case - Page Refresh
**File:** `src/App.tsx` (initialization useEffect)
**Dependencies:** Task 9
**Tests:** `tests/e2e/edge-cases.spec.ts`

**Implementation (from user discussion):**
1. **If localStorage has game in progress:**
   - Resume exactly where left off
   - Show confirmation toast: "Resuming game..."

2. **If localStorage is empty/corrupted:**
   - Check URL for payload
   - If URL has full_state: Load from URL
   - If URL has delta only: Show "Request Full State from Opponent" (Phase 3 resync flow)

3. **If in handoff phase when refreshed:**
   - Hot-seat: Stay in handoff, show privacy screen
   - URL mode: Stay in handoff, show URLSharer with same URL
   - Toast: "Handoff in progress - URL ready to share"

**Code:**
```typescript
useEffect(() => {
  // On mount: Restore game state
  const savedMode = storage.getGameMode();
  const savedGameState = storage.getGameState();
  const savedPlayer1 = storage.getPlayer1Name();
  const savedPlayer2 = storage.getPlayer2Name();

  if (savedGameState && savedMode) {
    // Resume game
    dispatch({
      type: 'RESTORE_GAME',
      mode: savedMode,
      gameState: savedGameState,
      player1Name: savedPlayer1 || 'Player 1',
      player2Name: savedPlayer2 || 'Player 2',
    });

    showToast('Resuming game...');
  } else if (payload) {
    // Load from URL (URL mode)
    dispatch({ type: 'LOAD_FROM_URL', payload });
  }
}, []);
```

---

### Task 11: Edge Case - Corrupted URL
**File:** `src/hooks/useUrlState.ts` (error handling)
**Dependencies:** Phase 3
**Tests:** `tests/e2e/edge-cases.spec.ts`

**Implementation (from user discussion):**

**If localStorage exists but URL is corrupted:**
- Ignore bad URL
- Load from localStorage
- Show warning toast: "Invalid URL - loaded game from device"

**If no localStorage and URL is corrupted:**
- Show error modal: "This URL is invalid or corrupted"
- Action buttons:
  - "Request New URL" (generates resync_request)
  - "Start New Game"
  - "Cancel"

**Differentiate corruption types:**
1. **Decompression failed:** "URL is corrupted - cannot read game data"
2. **Validation failed:** "URL format is invalid - missing required fields"
3. **Unknown payload type:** "URL is from incompatible version"

---

## ✅ VALIDATION LOOP

### Level 1: Syntax & Style
```bash
pnpm run check:types       # Must pass with 0 errors
pnpm run check:lint        # Must pass with 0 warnings
```

**Fix any TypeScript errors before proceeding.**

---

### Level 2: Unit Tests (Vitest)
```bash
pnpm test                   # All unit tests must pass
pnpm test:coverage          # Must hit 80%+ coverage threshold
```

**Critical Unit Tests:**
- `gameFlowReducer.test.ts` - All 11 action types
- `ModeSelector.test.tsx` - Mode selection UI
- `localStorage.test.ts` - Mode persistence
- `GameBoard.test.tsx` - Piece selection and moves
- `HandoffScreen.test.tsx` - Privacy screen countdown

---

### Level 3: Integration Tests (Vitest)
```bash
pnpm test src/lib/gameFlow/integration.test.ts
```

**Test Complete Flows:**
- Hot-seat: Mode select → name → 10 moves → victory
- URL mode: Mode select → name → URL gen → URL load → moves → victory
- Mode persistence across page refresh
- Victory detection and VictoryScreen rendering

---

### Level 4: E2E Tests (Playwright)
```bash
pnpm test:e2e
```

**Hot-Seat E2E Tests** (`tests/e2e/hot-seat-flow.spec.ts`):
```typescript
test.describe('Hot-Seat Complete Game Flow', () => {
  test('play full game with privacy screens', async ({ page }) => {
    await page.goto('/');

    await test.step('Select hot-seat mode', async () => {
      await page.click('[data-testid="mode-hotseat"]');
    });

    await test.step('Enter Player 1 name', async () => {
      await page.fill('[data-testid="player1-name"]', 'Alice');
      await page.click('[data-testid="start-game"]');
    });

    await test.step('Alice makes first move', async () => {
      await page.click('[data-testid="piece-0-0"]');  // Rook
      await page.click('[data-testid="square-1-0"]');
      await page.click('[data-testid="confirm-move"]');
    });

    await test.step('Privacy screen shows', async () => {
      await expect(page.locator('[data-testid="privacy-screen"]'))
        .toBeVisible();
      await expect(page.locator('[data-testid="game-board"]'))
        .not.toBeVisible();
    });

    await test.step('Enter Player 2 name on first handoff', async () => {
      await page.fill('[data-testid="player2-name"]', 'Bob');
      await page.click('[data-testid="im-ready"]');
    });

    await test.step('Bob makes move', async () => {
      await expect(page.locator('[data-testid="current-player"]'))
        .toContainText('Bob');
      // ... Bob's move
    });

    // Continue for 10 moves...

    await test.step('Victory screen appears', async () => {
      await expect(page.locator('[data-testid="victory-screen"]'))
        .toBeVisible();
      await expect(page.locator('[data-testid="winner"]'))
        .toContainText('Alice');
    });
  });

  test('page refresh resumes game', async ({ page }) => {
    // Setup game mid-way through
    await page.evaluate(() => {
      localStorage.setItem('kings-cooking:game-mode', '"hotseat"');
      localStorage.setItem('kings-cooking:game-state', JSON.stringify({
        // ... mid-game state
        currentTurn: 5,
      }));
    });

    await page.goto('/');

    await expect(page.locator('[data-testid="toast"]'))
      .toContainText('Resuming game...');
    await expect(page.locator('[data-testid="turn-number"]'))
      .toContainText('5');
  });
});
```

**URL Mode E2E Tests** (`tests/e2e/url-mode-flow.spec.ts`):
```typescript
test.describe('URL Mode Complete Game Flow', () => {
  test('Player 1 generates URL, Player 2 loads it', async ({ page, context }) => {
    await test.step('Player 1: Select URL mode', async () => {
      await page.goto('/');
      await page.click('[data-testid="mode-url"]');
    });

    await test.step('Player 1: Enter name and make move', async () => {
      await page.fill('[data-testid="player1-name"]', 'Alice');
      await page.click('[data-testid="start-game"]');
      await page.click('[data-testid="piece-0-0"]');
      await page.click('[data-testid="square-1-0"]');
      await page.click('[data-testid="confirm-move"]');
    });

    await test.step('URL generated with full-state', async () => {
      await expect(page.locator('[data-testid="url-sharer"]'))
        .toBeVisible();

      // Get generated URL
      const url = await page.locator('[data-testid="game-url"]')
        .inputValue();

      expect(url).toContain('#d=');
      expect(url.length).toBeGreaterThan(100);  // Full-state is long
    });

    await test.step('Player 2: Open URL in new context', async () => {
      const page2 = await context.newPage();
      const url = await page.locator('[data-testid="game-url"]')
        .inputValue();

      await page2.goto(url);

      // Game state loaded
      await expect(page2.locator('[data-testid="game-board"]'))
        .toBeVisible();

      // Player 2 prompted for name
      await page2.fill('[data-testid="player2-name"]', 'Bob');
      await page2.click('[data-testid="start-playing"]');
    });

    await test.step('Player 2: Make move and generate delta URL', async () => {
      const page2 = (await context.pages())[1];

      await page2.click('[data-testid="piece-0-2"]');
      await page2.click('[data-testid="square-1-2"]');
      await page2.click('[data-testid="confirm-move"]');

      // Delta URL is shorter
      const deltaUrl = await page2.locator('[data-testid="game-url"]')
        .inputValue();

      expect(deltaUrl.length).toBeLessThan(200);  // Delta is short
    });
  });

  test('corrupted URL shows error', async ({ page }) => {
    await page.goto('/#d=CORRUPTED_DATA');

    await expect(page.locator('[data-testid="error-modal"]'))
      .toBeVisible();
    await expect(page.locator('[data-testid="error-message"]'))
      .toContainText('URL is corrupted');
  });
});
```

**Edge Case Tests** (`tests/e2e/edge-cases.spec.ts`):
```typescript
test.describe('Edge Cases', () => {
  test('browser back button during game', async ({ page }) => {
    // Setup mid-game
    await page.goto('/');
    // ... play a few moves

    // Try to go back
    await page.goBack();

    // Should show toast and stay in game
    await expect(page.locator('[data-testid="toast"]'))
      .toContainText('Loaded current game state');
    await expect(page.locator('[data-testid="game-board"]'))
      .toBeVisible();
  });

  test('page refresh in handoff phase (hot-seat)', async ({ page }) => {
    // Setup at handoff phase
    await page.evaluate(() => {
      localStorage.setItem('kings-cooking:game-mode', '"hotseat"');
      // ... handoff state
    });

    await page.goto('/');

    await expect(page.locator('[data-testid="privacy-screen"]'))
      .toBeVisible();
    await expect(page.locator('[data-testid="toast"]'))
      .toContainText('Handoff in progress');
  });
});
```

---

### Level 5: Build & Preview
```bash
pnpm build                  # Must complete with 0 errors
pnpm preview &              # Start preview server
sleep 5
curl http://localhost:4173/kings-cooking/ | grep "King's Cooking"
```

---

## 📊 SUCCESS METRICS

**Code Quality:**
- ✅ TypeScript strict mode: 0 errors
- ✅ ESLint: 0 warnings
- ✅ Test coverage: 80%+ (unit + integration + E2E)

**Functional Completeness:**
- ✅ Both modes (hot-seat + URL) fully playable
- ✅ Mode selector with clear descriptions
- ✅ Player names persist correctly in both modes
- ✅ Hot-seat: NO URLs generated during gameplay
- ✅ URL mode: URLs generated after every move
- ✅ Victory screen appears with correct winner
- ✅ New game returns to mode selection

**Edge Cases Handled:**
- ✅ Browser back button disabled/handled gracefully
- ✅ Page refresh resumes game in both modes
- ✅ Corrupted URLs show user-friendly errors
- ✅ localStorage cleared triggers resync flow (URL mode)

**Performance:**
- ✅ Mode selection → first move: < 2 seconds
- ✅ Move confirmation → handoff screen: < 500ms
- ✅ URL generation: < 100ms (first), < 50ms (delta)
- ✅ URL load → board render: < 1 second

---

## 🎯 COMPLETION CHECKLIST

### Core Functionality
- [ ] ModeSelector component renders with two clear options
- [ ] Hot-seat mode selected → stores `'hotseat'` in localStorage
- [ ] URL mode selected → stores `'url'` in localStorage
- [ ] Player 1 name collected in setup phase
- [ ] Player 2 name collected at correct time for each mode
- [ ] Game board renders with correct pieces
- [ ] Move selection shows legal moves
- [ ] Move confirmation triggers correct flow for each mode

### Hot-Seat Specific
- [ ] Privacy screen shows after move confirmation
- [ ] Privacy screen hides game board
- [ ] "I'm Ready, [Name]" button appears
- [ ] Countdown timer works (3 seconds)
- [ ] Skip button bypasses countdown
- [ ] Player 2 name prompt on first handoff
- [ ] NO URL generation during hot-seat gameplay
- [ ] Page refresh resumes hot-seat game

### URL Mode Specific
- [ ] Warning shown: "Don't clear browser cache..."
- [ ] First move generates full-state URL (~500-1000 chars)
- [ ] Subsequent moves generate delta URLs (~100-200 chars)
- [ ] URLSharer component shows with copy button
- [ ] Copy to clipboard works
- [ ] "⏳ Waiting..." state shows (no button)
- [ ] Player 2 can open URL and load game
- [ ] Checksum verification on delta load
- [ ] Page refresh resumes URL mode game

### State Machine
- [ ] All 5 phases transition correctly
- [ ] All 11 actions handled
- [ ] Invalid transitions rejected
- [ ] Mode-specific branches work correctly
- [ ] Victory detection triggers victory phase
- [ ] New game returns to mode selection

### Edge Cases
- [ ] Browser back button handled gracefully
- [ ] Page refresh resumes correct phase
- [ ] Corrupted URL shows error modal
- [ ] localStorage cleared triggers resync (URL mode)
- [ ] Checksum mismatch shows History Comparison Modal

### Testing
- [ ] Unit tests pass (80%+ coverage)
- [ ] Integration tests pass
- [ ] Hot-seat E2E test passes
- [ ] URL mode E2E test passes
- [ ] Edge case E2E tests pass
- [ ] Build completes with 0 errors

### Documentation
- [ ] README updated with mode descriptions
- [ ] Code comments explain mode branches
- [ ] JSDoc on all public functions
- [ ] PRP marked complete

---

## 📚 APPENDIX

### Mode Selection Decision Tree

```
User lands on app
    ↓
Mode Selection Screen
    ↓
    ├─→ Clicks "Hot-Seat Mode"
    │       ↓
    │   Set gameMode = 'hotseat'
    │   Save to localStorage
    │       ↓
    │   Name Entry (Player 1)
    │       ↓
    │   Playing Phase
    │       ↓
    │   After Move → Privacy Screen
    │       ↓
    │   "I'm Ready" button
    │       ↓
    │   Continue playing
    │       ↓
    │   Victory Screen
    │
    └─→ Clicks "URL Mode"
            ↓
        Set gameMode = 'url'
        Save to localStorage
        Show browser warning
            ↓
        Name Entry (Player 1)
            ↓
        Playing Phase
            ↓
        After Move → Generate URL
            ↓
        URLSharer Component
            ↓
        "⏳ Waiting..." (passive)
            ↓
        Opponent opens URL → loads game
            ↓
        Continue playing
            ↓
        Victory Screen
```

### URL Payload Size Comparison

| Payload Type | Use Case | Size | Example |
|-------------|----------|------|---------|
| **full_state** | First move only | ~500-1000 chars | Player 2 initial load |
| **delta** | All subsequent moves | ~100-200 chars | Normal gameplay |
| **resync_request** | Checksum mismatch | ~150-250 chars | Recovery flow |

### localStorage Keys Used

| Key | Type | Mode | Description |
|-----|------|------|-------------|
| `kings-cooking:game-mode` | `'hotseat' \| 'url'` | Both | Current mode selection |
| `kings-cooking:player1-name` | `string` | Both | Player 1 display name |
| `kings-cooking:player2-name` | `string` | Both | Player 2 display name |
| `kings-cooking:game-state` | `GameState` | Both | Complete game state |
| `kings-cooking:my-name` | `string` | URL only | Current player (for multi-device) |

---

**End of PRP**

This PRP provides comprehensive context for implementing Phase 5 with proper separation of hot-seat and URL modes, shared state machine architecture, and complete edge case handling.
