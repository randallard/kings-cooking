# Phase 5: Game Flow Integration - Unified State Machine

**Version:** 1.0.0
**Phase:** 5 of 7
**Complexity:** High
**Dependencies:** Phase 1 (Foundation), Phase 2 (Chess Engine), Phase 3 (URL State), Phase 4 (UI Components)
**Estimated Effort:** 2-3 weeks

---

## 🎯 GOAL

Wire up unified state machine to connect all Phase 1-4 components into a complete, playable game with both hot-seat and correspondence modes.

**Specific Deliverables:**
1. **useGameFlow Hook** - Custom React hook with state machine for game flow orchestration
2. **App.tsx Refactor** - Transform from demo showcase to production game application
3. **Turn Management** - Enforce whose turn it is, handle hot-seat handoff between players
4. **Name Collection Flow** - Collect Player 1 name on start, Player 2 name on first handoff (hot-seat) or join (URL)
5. **URL Generation** - Generate shareable URL only after move confirmation
6. **Game History Tracking** - Save completed games to localStorage history
7. **localStorage Persistence** - Auto-save game state, survive page refreshes
8. **E2E Test Suite** - Complete game flow tests with Playwright (hot-seat + URL modes)
9. **Error Recovery** - Handle corrupted state, invalid URLs, localStorage quota errors

**NOT in Phase 5 (Deferred):**
- ❌ WebRTC real-time multiplayer - Phase 6
- ❌ Game replays with navigation - Phase 6
- ❌ AI opponent - v2.0+
- ❌ Multiple simultaneous games - v2.0+
- ❌ User accounts/authentication - v2.0+

**Success Criteria:**
- ✅ Complete hot-seat game playable from name entry → victory
- ✅ Complete URL sharing game playable with 2 browser tabs
- ✅ Page refresh doesn't lose game state
- ✅ All Phase 4 components integrated and functional
- ✅ 80%+ test coverage including E2E tests
- ✅ Zero TypeScript errors, zero ESLint warnings
- ✅ Victory screen appears correctly on game end
- ✅ Player names persist in localStorage

---

## 💡 WHY

**Business Value:**
- Completes MVP = **SHIPPABLE PRODUCT** 🚀
- Enables real user testing and feedback
- Validates core game mechanics before WebRTC complexity
- Demonstrates technical capability for investors/stakeholders

**User Impact:**
- **BEFORE Phase 5**: Beautiful components but no way to actually play a game
- **AFTER Phase 5**: Full playable experience in both hot-seat and URL modes
- Hot-seat users can play immediately (no setup)
- URL users can play asynchronously with friends anywhere
- Game state never lost (localStorage + URL backup)

**Technical Dependencies:**
- Phase 1: React 19, TypeScript, Zod, localStorage utilities
- Phase 2: KingsChessEngine for move validation and game logic
- Phase 3: useUrlState hook for URL synchronization
- Phase 4: All UI components (GameBoard, HandoffScreen, VictoryScreen, etc.)

**Why This Order:**
- Can't integrate without all UI components (Phase 4 dependency)
- Can't share games without URL state (Phase 3 dependency)
- Phase 5 validates architecture before adding WebRTC complexity (Phase 6)
- Real user feedback informs Phase 6-7 priorities

---

## 📋 WHAT

### User-Visible Behavior

#### 1. Hot-Seat Game Flow (Single Device, Two Players)

**Complete User Journey:**
```
1. User loads app (/)
2. Sees welcome screen: "Welcome to King's Cooking!"
3. Enters name: "Alice" → clicks "Start Game"
4. Game board appears with Alice's name at bottom
5. Alice selects white rook (A3) → clicks B3 → clicks "Confirm Move"
6. Handoff screen appears:
   - "Pass device to opponent"
   - 3-second countdown (skippable)
   - Board blurred for privacy
7. After countdown, name form appears: "Opponent's name?"
8. Bob enters "Bob" → clicks "Continue"
9. Board appears with Bob's name at bottom, Alice's at top
10. Bob makes move → handoff screen → Alice's turn → repeat
11. Game continues until one player wins
12. Victory screen appears:
    - "Alice Wins! 🎉"
    - "3 pieces reached opponent's court"
    - "Game lasted 12 moves, 5 minutes"
    - Buttons: "New Game" | "Review Moves"
```

**Key UX Details:**
- Player 1 name collected upfront
- Player 2 name collected on **first handoff** (not before game starts)
- Clear turn indicator shows whose turn it is
- Handoff countdown prevents accidental viewing of opponent's position
- Names displayed prominently so players know orientation
- Victory screen shows clear winner and stats

#### 2. URL Sharing Game Flow (Correspondence Mode)

**Player 1 Journey:**
```
1. User loads app (/)
2. Enters name: "Alice" → clicks "Start Game"
3. Game board appears
4. Alice makes first move → clicks "Confirm Move"
5. URL sharer appears with long URL containing game state
6. Alice clicks "Copy Link" → success toast appears
7. Alice shares URL via messaging app to Bob
8. Alice waits for Bob to join and make move
9. Bob sends back new URL after his move
10. Alice opens Bob's URL → game state restored → Alice's turn
11. Repeat URL exchange until game ends
12. Victory screen appears
```

**Player 2 Journey:**
```
1. Bob receives URL from Alice
2. Bob opens URL in browser
3. Name form appears: "Enter your name to join game"
4. Bob enters "Bob" → clicks "Join Game"
5. Board appears showing Alice's first move
6. Turn indicator shows "Your turn (Black)"
7. Bob makes move → clicks "Confirm Move"
8. URL sharer appears with updated URL
9. Bob copies URL and sends to Alice
10. Repeat URL exchange until game ends
```

**Key UX Details:**
- URLs generated **only after move confirmation** (not on piece selection)
- First move creates full-state URL (long)
- Subsequent moves use delta encoding (shorter)
- Player 2 name collected on URL load (not known to Player 1 beforehand)
- Clear indication of whose turn it is
- URL always has latest game state (no merge conflicts)

#### 3. Page Refresh / Browser Back Behavior

**Scenario: Page Refresh During Game**
```
1. Alice and Bob playing hot-seat game (move 5)
2. Alice accidentally refreshes page (F5)
3. Page reloads → game continues from move 5
4. All state preserved: current turn, player names, move history
5. Game continues normally
```

**Scenario: Browser Back Button**
```
1. Alice makes move → gets new URL (#d=abc123)
2. Alice clicks browser back button
3. URL changes to previous game state
4. Board updates to show previous position
5. Turn indicator updates correctly
```

**Scenario: Corrupted localStorage**
```
1. User manually deletes localStorage during game
2. Next move triggers save → fails
3. Error message appears: "Unable to save game. Continue anyway?"
4. User clicks "Yes" → game continues (URL still works)
5. On page refresh → falls back to URL state (not localStorage)
```

---

### Technical Requirements

#### State Machine Architecture

**Game Phases (Finite States):**
```typescript
type GamePhase =
  | 'name-entry'          // Collecting player names
  | 'playing'             // Active gameplay
  | 'handoff'             // Hot-seat turn transition
  | 'victory'             // Game complete
```

**State Transitions:**
```
name-entry ──START_GAME──> playing
playing ────MOVE_COMPLETE──> handoff (hot-seat) or playing (URL mode)
playing ────GAME_OVER────> victory
handoff ────CONTINUE─────> playing
victory ────NEW_GAME────> name-entry
```

**State Machine Events:**
```typescript
type GameFlowEvent =
  | { type: 'START_GAME'; player1Name: string; gameState: GameState }
  | { type: 'SELECT_MOVE'; from: Position; to: Position }
  | { type: 'CONFIRM_MOVE_START' }
  | { type: 'CONFIRM_MOVE_SUCCESS'; gameState: GameState }
  | { type: 'CONFIRM_MOVE_ERROR'; error: string }
  | { type: 'ENTER_HANDOFF' }
  | { type: 'COMPLETE_HANDOFF'; player2Name: string }
  | { type: 'GAME_OVER'; winner: 'white' | 'black' | 'draw' }
  | { type: 'NEW_GAME' }
```

#### Component Integration Map

**Phase 5 App Structure:**
```
App.tsx (refactored)
├── useGameFlow() hook
│   ├── useReducer(gameFlowReducer, initialState)
│   ├── useUrlState() integration
│   ├── KingsChessEngine instance
│   └── localStorage effects
│
├── {phase === 'name-entry' && (
│     <NameForm
│       storageKey="my-name"
│       onNameChange={handlePlayerName}
│     />
│   )}
│
├── {phase === 'playing' && (
│     <>
│       <GameBoard
│         gameState={state.gameState}
│         onMove={handleMove}
│         isPlayerTurn={isMyTurn()}
│       />
│       <MoveConfirmButton
│         onConfirm={handleConfirmMove}
│         disabled={!pendingMove}
│         isProcessing={isProcessingMove}
│         error={moveError}
│       />
│       <URLSharer
│         url={shareableUrl}
│         onCopy={handleCopyUrl}
│       />
│     </>
│   )}
│
├── {phase === 'handoff' && (
│     <HandoffScreen
│       nextPlayer={state.gameState.currentPlayer}
│       nextPlayerName={getPlayerName(currentPlayer)}
│       previousPlayer={getPreviousPlayer()}
│       previousPlayerName={getPlayerName(previousPlayer)}
│       onContinue={handleCompleteHandoff}
│     />
│   )}
│
└── {phase === 'victory' && (
      <VictoryScreen
        winner={state.gameState.winner}
        winnerName={getWinnerName()}
        loserName={getLoserName()}
        totalMoves={state.gameState.moveHistory.length}
        gameDuration={calculateDuration()}
        whiteCaptured={state.gameState.capturedBlack.length}
        blackCaptured={state.gameState.capturedWhite.length}
        onNewGame={handleNewGame}
      />
    )}
```

#### Performance Requirements
- Game state updates MUST complete < 100ms
- URL encoding/decoding MUST complete < 50ms
- localStorage writes MUST be debounced (300ms)
- Board re-renders MUST be < 16ms (60fps)
- Initial page load MUST be < 2s on 3G

---

## 📚 REFERENCE DOCUMENTATION

**CRITICAL:** Read these documents BEFORE implementing. They contain mandatory patterns and gotchas discovered during research.

### Project-Specific Documentation

#### CLAUDE-REACT.md (MANDATORY)
**Location:** `/home/ryankhetlyr/Development/kings-cooking/claude_md_files/CLAUDE-REACT.md`

**Critical Sections for Phase 5:**
- **Lines 1-100**: React 19 patterns - MUST use `ReactElement` not `JSX.Element`
- **Lines 201-300**: Component structure (max 200 lines, JSDoc, single responsibility)
- **Lines 301-400**: Testing requirements (80% coverage, React Testing Library)
- **Lines 401-500**: Zod validation patterns for external data
- **Lines 701-800**: Error handling and loading states
- **Lines 801-954**: Common gotchas and anti-patterns

**Key Takeaways for Phase 5:**
```typescript
// ✅ CORRECT - React 19 pattern
import { useReducer, useCallback, type ReactElement } from 'react';

function useGameFlow(): GameFlowHookReturn {
  const [state, dispatch] = useReducer(gameFlowReducer, initialState);
  // ...
}

// ✅ CORRECT - Discriminated unions for type safety
type GameFlowState =
  | { phase: 'name-entry'; player1Name: string | null }
  | { phase: 'playing'; player1Name: string; gameState: GameState; ... }
  | { phase: 'handoff'; ... }
  | { phase: 'victory'; winner: 'white' | 'black' | 'draw' }

// ❌ WRONG - Stringly-typed phases
type GameFlowState = {
  phase: string;  // Too loose!
  data: any;      // No type safety!
}
```

#### PRD Phase 5 Requirements
**Location:** `/home/ryankhetlyr/Development/kings-cooking/PRD.md`

**Critical Sections:**
- **Lines 1235-1268**: Phase 5 task breakdown and requirements
- **Lines 1078-1227**: Complete implementation phases (context for Phase 5)
- **Lines 772-850**: User stories for name collection, URL sharing, game flow

**Key Requirements:**
- Both hot-seat and URL modes share same state flow
- UI differences only where specified
- P2 name collected on first handoff (hot-seat) or on join (URL)
- URLs generated after confirmation only (not on piece selection)
- History saved on game end
- Can refresh page without losing state

### Codebase References

#### Current App.tsx (Phase 4 Demo)
**Location:** `/home/ryankhetlyr/Development/kings-cooking/src/App.tsx` (253 lines)

**Current Status:** Demo/showcase for Phase 1-4 components

**Critical Findings from Research:**
1. **No state machine** - Uses basic useState hooks
2. **No game flow** - Components rendered in isolation
3. **HandoffScreen not integrated** - Component exists but never rendered
4. **VictoryScreen not integrated** - Component exists but never rendered
5. **useUrlState not used** - URL shown but not functional
6. **Player names hardcoded** - "Player 1" and "Player 2"
7. **No turn validation** - `isPlayerTurn` always `true`
8. **No localStorage persistence** - Only tested, not actually used

**Phase 5 must transform App.tsx from demo → production application**

#### Phase 4 Components (All Available)
**Location:** `/home/ryankhetlyr/Development/kings-cooking/src/components/game/`

**Available Components:**
1. **GameBoard.tsx** (247 lines) - Interactive board with move selection
   - Props: `gameState`, `onMove`, `isPlayerTurn`
   - Internal state: `selectedPosition`
   - Emits: `onMove(from, to)` when move completed

2. **MoveConfirmButton.tsx** (129 lines) - Confirm/cancel move actions
   - Props: `onConfirm`, `disabled`, `isProcessing`, `error`
   - States: disabled, ready, processing, error

3. **HandoffScreen.tsx** (184 lines) - Turn handoff with countdown
   - Props: `nextPlayer`, `nextPlayerName`, `previousPlayer`, `previousPlayerName`, `onContinue`, `countdownSeconds`
   - Features: 3s countdown, skip button, privacy blur, Escape key, focus trap

4. **VictoryScreen.tsx** (267 lines) - Game end celebration with stats
   - Props: `winner`, `winnerName`, `loserName`, `totalMoves`, `gameDuration`, `whiteCaptured`, `blackCaptured`, `onNewGame`, `onShare`, `onReviewMoves`
   - Features: Confetti animation, statistics display, action buttons

5. **NameForm.tsx** (149 lines) - Player name input with validation
   - Props: `storageKey`, `label`, `onNameChange`
   - Features: Real-time validation, localStorage persistence (debounced 300ms), XSS protection

6. **URLSharer.tsx** (89 lines) - Share game link with copy-to-clipboard
   - Props: `url`, `onCopy`
   - Features: Clipboard API + execCommand fallback, success toast

7. **DarkModeToggle.tsx** (172 lines) - Theme switcher
   - Props: `onThemeChange`, `storageKey`
   - Features: System preference detection, manual override, localStorage

#### Phase 3 useUrlState Hook
**Location:** `/home/ryankhetlyr/Development/kings-cooking/src/hooks/useUrlState.ts` (299 lines)

**API:**
```typescript
const {
  payload,              // UrlPayload | null - Current parsed URL state
  error,                // string | null - Parsing/validation errors
  isLoading,            // boolean - Initial URL parsing state
  updateUrl,            // (payload: UrlPayload) => void - Debounced update (300ms)
  updateUrlImmediate,   // (payload: UrlPayload) => void - Immediate update
  getShareUrl,          // () => string - Get current shareable URL
  copyShareUrl,         // () => Promise<boolean> - Copy URL to clipboard
} = useUrlState({
  debounceMs?: number,                            // Default: 300ms
  onError?: (error: string) => void,              // Error callback
  onUrlUpdated?: (url: string) => void,           // Success callback
  onPayloadReceived?: (payload: UrlPayload) => void  // Receive callback
});
```

**Critical Patterns (from code comments):**
1. **useRef for debounced callbacks** - Prevents frozen closure problem (lines 83-90)
2. **Empty dependency array for hashchange listener** - Prevents exponential growth (line 160)
3. **Cleanup listeners and timers on unmount** - Prevents memory leaks (lines 157-161, 193-197)
4. **replaceState not pushState** - Prevents history pollution (line 88)

**When to Use:**
- On mount: Parses URL hash, loads game state
- On move: Updates URL with delta payload (debounced)
- On share: Copies current URL to clipboard
- On browser back/forward: Syncs state with URL

#### Phase 2 Chess Engine API
**Location:** `/home/ryankhetlyr/Development/kings-cooking/src/lib/chess/KingsChessEngine.ts`

**Constructor:**
```typescript
new KingsChessEngine(
  whitePlayer: PlayerInfo,
  blackPlayer: PlayerInfo,
  initialState?: GameState  // Optional: restore from saved state
)
```

**Critical Methods for Phase 5:**

1. **makeMove(from: Position, to: Position | 'off_board'): MoveResult**
   - Validates move legality
   - Updates board state (immutable)
   - Handles captures (pieces go to their OWN king's court for scoring)
   - Switches turns automatically
   - Returns: `{ success: boolean, error?: string, gameState?: GameState, captured?: Piece }`

2. **getValidMoves(position: Position): Position[]**
   - Returns array of legal destination positions
   - Used by GameBoard for move highlighting
   - Includes 'off_board' if piece can move off board

3. **checkGameEnd(): VictoryResult**
   - Checks if game is over
   - Calculates winner based on court scores
   - Returns: `{ gameOver: boolean, winner?: 'white' | 'black' | null, score?: { white, black }, reason?: string }`

4. **getGameState(): GameState**
   - Returns deep copy of current state (immutable)
   - Safe to pass to React setState
   - Used for state updates and URL sync

5. **getChecksum(): string**
   - Returns SHA-256 hash of current state
   - Used for URL sync validation
   - Detects state corruption

6. **fromJSON(json: GameState): KingsChessEngine** (static)
   - Restores engine from serialized state
   - Used when loading from URL/localStorage
   - Validates state with Zod before restoring

#### Phase 1 Validation Schemas
**Location:** `/home/ryankhetlyr/Development/kings-cooking/src/lib/validation/schemas.ts`

**GameState Schema (lines 147-210):**
```typescript
const GameStateSchema = z.object({
  version: z.literal('1.0.0'),
  gameId: GameIdSchema,
  board: z.array(z.array(PieceSchema.nullable())).length(3),
  whiteCourt: z.array(PieceSchema),
  blackCourt: z.array(PieceSchema),
  capturedWhite: z.array(PieceSchema),
  capturedBlack: z.array(PieceSchema),
  currentTurn: z.number().int().min(0),
  currentPlayer: z.enum(['white', 'black']),
  whitePlayer: PlayerInfoSchema,
  blackPlayer: PlayerInfoSchema,
  status: z.enum(['playing', 'white_wins', 'black_wins', 'draw']),
  winner: z.enum(['white', 'black']).nullable(),
  moveHistory: z.array(MoveSchema),
  checksum: z.string(),
});

type GameState = z.infer<typeof GameStateSchema>;
```

**Usage Pattern:**
```typescript
// ALWAYS validate external data
const result = GameStateSchema.safeParse(data);
if (result.success) {
  const validState = result.data; // Fully typed
  const engine = KingsChessEngine.fromJSON(validState);
} else {
  console.error(result.error.format());
  showErrorToUser('Invalid game state');
}
```

#### Phase 1 localStorage Utilities
**Location:** `/home/ryankhetlyr/Development/kings-cooking/src/lib/storage/localStorage.ts`

**API:**
```typescript
storage.getMyName(): string | null
storage.setMyName(name: string): boolean
storage.getPlayer1Name(): string | null
storage.setPlayer1Name(name: string): boolean
storage.getPlayer2Name(): string | null
storage.setPlayer2Name(name: string): boolean
storage.getGameState(): GameState | null
storage.setGameState(state: GameState): boolean
storage.clearAll(): void
```

**Features:**
- Automatic Zod validation on read
- Corrupted data auto-removal
- Namespaced keys (`kings-cooking:*`)
- Try-catch all localStorage operations (quota errors, private browsing)

### External Documentation

#### React 19 Official Docs
- **useReducer**: https://react.dev/reference/react/useReducer
- **useCallback**: https://react.dev/reference/react/useCallback
- **useMemo**: https://react.dev/reference/react/useMemo
- **useEffect cleanup**: https://react.dev/reference/react/useEffect#cleanup
- **TypeScript with React**: https://react-typescript-cheatsheet.netlify.app/

#### TypeScript Discriminated Unions
- **Official Docs**: https://www.typescriptlang.org/docs/handbook/unions-and-intersections.html#discriminating-unions
- **Type-checking useReducer**: https://www.benmvp.com/blog/type-checking-react-usereducer-typescript/
- **State Machine with useReducer**: https://undefined.technology/blog/state-machine-in-react-with-usereducer/

#### Testing Resources
- **React Testing Library**: https://testing-library.com/docs/react-testing-library/intro/
- **Vitest Coverage**: https://vitest.dev/guide/coverage.html
- **Playwright Official Docs**: https://playwright.dev/
- **Playwright Best Practices**: https://playwright.dev/docs/best-practices

### Common Pitfalls (Cross-Reference from Research)

**From State Management Patterns Analysis:**
1. ❌ **Frozen closure in debounced callbacks** - Must use useRef for latest state
2. ❌ **Memory leaks from uncleaned listeners** - Must return cleanup function from useEffect
3. ❌ **Storing derived state** - Compute from source of truth with useMemo
4. ❌ **Inline event handlers** - Creates new function every render, use useCallback
5. ❌ **Missing exhaustiveness check** - TypeScript can't catch invalid transitions

**From App.tsx Analysis:**
1. ❌ **Using prompt() for name collection** - Not styleable, no dark mode
2. ❌ **Hardcoding player names** - Must come from user input
3. ❌ **Always enabling player's turn** - Must validate actual turn ownership
4. ❌ **Not persisting to localStorage** - State lost on refresh
5. ❌ **Creating new engine on every move** - Performance issue, must memoize

**From useUrlState Hook:**
1. ❌ **Using pushState** - Creates history pollution, use replaceState
2. ❌ **Empty effect dependencies with state access** - Frozen closure, use ref
3. ❌ **Not cleaning up timers** - Memory leaks on unmount
4. ❌ **Synchronous hash updates** - Can cause race conditions, use debounce

---

## 📚 ALL NEEDED CONTEXT

### 1. Research Report: App.tsx Current State

**From Agent 1 Research (App.tsx Analysis):**

**Current App.tsx Role:** Demo/showcase for Phases 1-4 components

**Critical Gaps:**
1. **No state machine** - Just basic useState hooks, no flow control
2. **No turn management** - `isPlayerTurn` always `true`
3. **HandoffScreen exists but never rendered**
4. **VictoryScreen exists but never rendered**
5. **useUrlState imported but never used**
6. **Player names hardcoded** as "Player 1" and "Player 2"
7. **No localStorage persistence** - only tested in one function
8. **No game mode tracking** (hot-seat vs URL)

**What DOES Work:**
- GameBoard renders correctly
- Move selection and highlighting functional
- MoveConfirmButton validates moves
- Chess engine integration working

**Phase 5 Transformation Required:**
```
BEFORE (Demo):                    AFTER (Production):
└── Show all components           ├── {phase === 'name-entry' && <NameForm />}
    in one page                   ├── {phase === 'playing' && <GameBoard />}
                                  ├── {phase === 'handoff' && <HandoffScreen />}
                                  └── {phase === 'victory' && <VictoryScreen />}
```

### 2. Research Report: State Management Patterns

**From Agent 2 Research (State Management Analysis):**

**Codebase Pattern:** Component-local state with useState + custom hooks

**No Global State:**
- Zero `useContext` or `createContext` usage
- Zero `useReducer` usage (until Phase 5)
- No Redux, MobX, Zustand, etc.

**Recommended Pattern for Phase 5:** useReducer + TypeScript discriminated unions

**Why useReducer:**
- ✅ Zero bundle impact (already in React 19)
- ✅ Native React pattern (team familiarity)
- ✅ Excellent TypeScript support (compiler enforces valid transitions)
- ✅ Simple testing (pure reducer functions)
- ✅ KISS principle (minimal abstraction)
- ⚠️ XState would be overkill for 4-state machine

**Critical Patterns Found in Codebase:**

1. **Debounced State Updates with Ref** (useUrlState.ts:83-90)
```typescript
// ✅ DO: Use ref to avoid frozen closure
const payloadRef = useRef(payload);

useEffect(() => {
  payloadRef.current = payload; // Keep ref in sync
}, [payload]);

const debouncedUpdate = useMemo(() => {
  return (newPayload) => {
    setTimeout(() => {
      // Use ref for latest value, not closure
      if (payloadRef.current !== newPayload) {
        setPayload(newPayload);
      }
    }, 300);
  };
}, []); // Stable deps, but accesses latest state via ref
```

2. **Event Listener Cleanup** (useUrlState.ts:132-161)
```typescript
useEffect(() => {
  const handleHashChange = () => { /* ... */ };
  window.addEventListener('hashchange', handleHashChange);

  // CRITICAL: Return cleanup function
  return () => window.removeEventListener('hashchange', handleHashChange);
}, []); // Empty deps = listener added ONCE
```

3. **Lazy State Initialization** (DarkModeToggle.tsx:51-72)
```typescript
const [theme, setTheme] = useState<'light' | 'dark'>(() => {
  // 1. Check localStorage
  try {
    const stored = localStorage.getItem('theme');
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {}

  // 2. Check system preference
  try {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
  } catch {}

  // 3. Default
  return 'light';
});
```

### 3. Research Report: State Machine Library Comparison

**From Agent 3 Research (State Machine Libraries):**

**Top 3 Approaches:**

1. **useReducer + Discriminated Unions** (⭐⭐⭐⭐⭐ RECOMMENDED)
   - Bundle size: 0 KB (already in React)
   - Pros: Zero dependencies, native React, excellent TypeScript, easy testing
   - Cons: Manual state machine enforcement, no visual state chart

2. **@cassiozen/useStateMachine** (⭐⭐⭐⭐)
   - Bundle size: ~900 bytes
   - Pros: Tiny, entry/exit callbacks, guards, React-first
   - Cons: Additional dependency, smaller community

3. **XState** (⭐⭐⭐ OVERKILL)
   - Bundle size: ~20 KB
   - Pros: Industry standard, visual tooling, actor model
   - Cons: Too powerful for 4-state machine, steep learning curve, YAGNI violation

**Decision: Use useReducer**

**Rationale:**
- Game flow is linear (name-entry → playing → handoff → victory)
- Only 4 states with straightforward transitions
- Codebase already uses useState pattern successfully
- Keep dependencies minimal (YAGNI principle)
- No team learning curve

**React 19 Actions API:**
- Use for async move confirmation (useActionState)
- Complementary to state machine, not replacement
- Handles pending states automatically

### 4. Research Report: Playwright E2E Testing

**From Agent 4 Research (Playwright Patterns):**

**Existing Test Coverage:**
- ✅ URL hash management (23 tests)
- ✅ Multi-player simulation (2-browser context)
- ✅ localStorage integration
- ✅ Browser history navigation
- ✅ Error handling (corrupted payloads)

**Gaps for Phase 5:**
- ❌ Complete game flow E2E (name → play → victory)
- ❌ Hot-seat handoff interactions
- ❌ Victory screen after real game
- ❌ Turn management validation
- ❌ Name collection flow

**Recommended Test Structure:**
```typescript
// tests/e2e/complete-game-flow.spec.ts
test('should complete hot-seat game from start to victory', async ({ page }) => {
  // 1. Name entry
  await page.fill('[data-testid="name-input"]', 'Alice');
  await page.click('[data-testid="name-submit"]');

  // 2. First move
  await page.click('[data-testid="cell-2-0"]');
  await page.click('[data-testid="cell-1-0"]');
  await page.click('[data-testid="confirm-move"]');

  // 3. Handoff screen
  await expect(page.locator('[data-testid="handoff-screen"]')).toBeVisible();
  await page.click('[data-testid="skip-countdown"]');

  // 4. Player 2 name
  await page.fill('[data-testid="name-input"]', 'Bob');
  await page.click('[data-testid="name-submit"]');

  // 5. Continue game...

  // 6. Victory screen
  await expect(page.locator('[data-testid="victory-screen"]')).toBeVisible();
});
```

**data-testid Recommendations:**
- Add to all interactive components
- Use consistent naming: `cell-${row}-${col}`, `confirm-move`, `handoff-screen`, etc.
- See Section 8 of research report for full list

### 5. Research Report: Phase 1-4 Integration Points

**From Agent 5 Research (Integration Mapping):**

**Component Integration Checklist:**

- [ ] **GameBoard** → Pass `gameState`, handle `onMove`, calculate `isPlayerTurn`
- [ ] **MoveConfirmButton** → Track `pendingMove`, handle `onConfirm`, show errors
- [ ] **HandoffScreen** → Show between turns (hot-seat), pass player names
- [ ] **VictoryScreen** → Show on game end, pass stats, handle `onNewGame`
- [ ] **NameForm** → Collect names at start and first handoff
- [ ] **URLSharer** → Display after move confirmation, handle copy
- [ ] **DarkModeToggle** → Always visible, persist preference

**Hook Integration:**

**useUrlState:**
```typescript
const { payload, updateUrl, copyShareUrl } = useUrlState({
  onPayloadReceived: (payload) => {
    if (payload.type === 'full') {
      // Restore complete game
      dispatch({ type: 'RESTORE_GAME', gameState: payload.gameState });
    } else if (payload.type === 'delta') {
      // Apply move
      dispatch({ type: 'APPLY_MOVE', move: payload.move });
    }
  },
});
```

**Chess Engine Integration:**
```typescript
// Create engine on game start
const engine = new KingsChessEngine(whitePlayer, blackPlayer);

// Make move
const result = engine.makeMove(from, to);
if (result.success) {
  const newState = engine.getGameState();
  dispatch({ type: 'MOVE_SUCCESS', gameState: newState });

  // Check victory
  const victory = engine.checkGameEnd();
  if (victory.gameOver) {
    dispatch({ type: 'GAME_OVER', winner: victory.winner });
  }
}
```

**localStorage Integration:**
```typescript
// Save after each move
useEffect(() => {
  if (state.phase === 'playing') {
    storage.setGameState(state.gameState);
    storage.setPlayer1Name(state.player1Name);
    if (state.player2Name) {
      storage.setPlayer2Name(state.player2Name);
    }
  }
}, [state]);

// Load on mount
useEffect(() => {
  const savedState = storage.getGameState();
  if (savedState) {
    dispatch({ type: 'RESTORE_GAME', gameState: savedState });
  }
}, []);
```

---

## 🏗️ IMPLEMENTATION BLUEPRINT

### Pre-Implementation Checklist

**BEFORE writing any code, ensure you have:**
- [ ] Read complete Phase 5 PRP (this document)
- [ ] Read CLAUDE-REACT.md (React 19 patterns, TypeScript requirements)
- [ ] Read all 5 research agent reports (App.tsx, State Management, State Machines, Playwright, Integration)
- [ ] Reviewed Phase 4 PRP for component usage patterns
- [ ] Reviewed useUrlState.ts hook (Phase 3)
- [ ] Reviewed KingsChessEngine.ts API (Phase 2)
- [ ] Set up dev environment: `pnpm install && pnpm dev`
- [ ] Run existing tests to verify setup: `pnpm test`

**Quick Reference During Implementation:**
- 🎨 **State Machine**: 4 phases (name-entry, playing, handoff, victory)
- 🔄 **Turn Flow**: move → confirm → check victory → handoff/victory
- ⌨️ **Events**: START_GAME, CONFIRM_MOVE_SUCCESS, ENTER_HANDOFF, COMPLETE_HANDOFF, GAME_OVER, NEW_GAME
- 📦 **Validation**: Always use GameStateSchema.safeParse() for external data
- 🧪 **Testing**: useReducer → unit test reducer as pure function → then test hook with renderHook()

---

### Phase 5A: State Machine Core (Week 1, Days 1-3)

#### Task 1.1: Create useGameFlow Hook with useReducer (6-8 hours)

**File:** `src/hooks/useGameFlow.ts`

**Purpose:** Central state machine orchestrating complete game flow

**Step 1: Define Types**
```typescript
/**
 * @fileoverview Game flow state machine using useReducer
 * @module hooks/useGameFlow
 */

import { useReducer, useEffect, useCallback, useMemo } from 'react';
import { KingsChessEngine } from '@/lib/chess/KingsChessEngine';
import { storage } from '@/lib/storage/localStorage';
import type { GameState, Position, PlayerInfo } from '@/lib/validation/schemas';

// ============================================================================
// STATE MACHINE TYPES
// ============================================================================

/**
 * Game flow phases (finite states)
 */
type GamePhase = 'name-entry' | 'playing' | 'handoff' | 'victory';

/**
 * Game flow state with discriminated union for phase-specific data
 *
 * Type-safe state machine: each phase has only the data it needs
 */
type GameFlowState =
  | {
      phase: 'name-entry';
      player1Name: string | null;
    }
  | {
      phase: 'playing';
      player1Name: string;
      player2Name: string | null;
      gameState: GameState;
      engine: KingsChessEngine;
      pendingMove: { from: Position; to: Position } | null;
      isProcessingMove: boolean;
      moveError: string | null;
    }
  | {
      phase: 'handoff';
      player1Name: string;
      player2Name: string | null;
      gameState: GameState;
      engine: KingsChessEngine;
    }
  | {
      phase: 'victory';
      player1Name: string;
      player2Name: string;
      gameState: GameState;
      engine: KingsChessEngine;
      winner: 'white' | 'black' | 'draw';
    };

/**
 * Events that trigger state transitions
 */
type GameFlowEvent =
  | { type: 'START_GAME'; player1Name: string }
  | { type: 'SELECT_MOVE'; from: Position; to: Position }
  | { type: 'CONFIRM_MOVE_START' }
  | { type: 'CONFIRM_MOVE_SUCCESS'; gameState: GameState }
  | { type: 'CONFIRM_MOVE_ERROR'; error: string }
  | { type: 'ENTER_HANDOFF' }
  | { type: 'COMPLETE_HANDOFF'; player2Name: string }
  | { type: 'GAME_OVER'; winner: 'white' | 'black' | 'draw' }
  | { type: 'NEW_GAME' }
  | { type: 'RESTORE_GAME'; gameState: GameState };

/**
 * Hook return type
 */
interface GameFlowHookReturn {
  state: GameFlowState;
  actions: {
    startGame: (player1Name: string) => void;
    selectMove: (from: Position, to: Position) => void;
    confirmMove: () => void;
    enterHandoff: () => void;
    completeHandoff: (player2Name: string) => void;
    newGame: () => void;
  };
}

// ============================================================================
// STATE MACHINE REDUCER
// ============================================================================

/**
 * Game flow reducer - enforces state machine transitions
 *
 * Valid transitions:
 * - name-entry → playing (START_GAME)
 * - playing → handoff (ENTER_HANDOFF)
 * - playing → victory (GAME_OVER)
 * - handoff → playing (COMPLETE_HANDOFF)
 * - victory → name-entry (NEW_GAME)
 *
 * Invalid transitions are ignored (no-op) - this is intentional for safety
 */
function gameFlowReducer(
  state: GameFlowState,
  event: GameFlowEvent
): GameFlowState {
  switch (state.phase) {
    case 'name-entry':
      switch (event.type) {
        case 'START_GAME': {
          // Create new game with Player 1
          const whitePlayer: PlayerInfo = {
            id: crypto.randomUUID() as never,
            name: event.player1Name,
          };
          const blackPlayer: PlayerInfo = {
            id: crypto.randomUUID() as never,
            name: 'Player 2', // Placeholder, will be set on first handoff
          };

          const engine = new KingsChessEngine(whitePlayer, blackPlayer);
          const gameState = engine.getGameState();

          return {
            phase: 'playing',
            player1Name: event.player1Name,
            player2Name: null,
            gameState,
            engine,
            pendingMove: null,
            isProcessingMove: false,
            moveError: null,
          };
        }

        case 'RESTORE_GAME': {
          // Restore game from URL or localStorage
          const restored = KingsChessEngine.fromJSON(event.gameState);

          return {
            phase: 'playing',
            player1Name: event.gameState.whitePlayer.name,
            player2Name: event.gameState.blackPlayer.name,
            gameState: event.gameState,
            engine: restored,
            pendingMove: null,
            isProcessingMove: false,
            moveError: null,
          };
        }

        default:
          // Invalid transition - ignore
          return state;
      }

    case 'playing':
      switch (event.type) {
        case 'SELECT_MOVE':
          return {
            ...state,
            pendingMove: { from: event.from, to: event.to },
            moveError: null,
          };

        case 'CONFIRM_MOVE_START':
          return {
            ...state,
            isProcessingMove: true,
            moveError: null,
          };

        case 'CONFIRM_MOVE_SUCCESS': {
          // Update game state
          const updatedState = {
            ...state,
            gameState: event.gameState,
            pendingMove: null,
            isProcessingMove: false,
            moveError: null,
          };

          // Check if game is over
          if (
            event.gameState.status === 'white_wins' ||
            event.gameState.status === 'black_wins' ||
            event.gameState.status === 'draw'
          ) {
            // Transition to victory
            return {
              phase: 'victory',
              player1Name: state.player1Name,
              player2Name: state.player2Name ?? 'Player 2',
              gameState: event.gameState,
              engine: state.engine,
              winner: event.gameState.winner ?? 'draw',
            };
          }

          return updatedState;
        }

        case 'CONFIRM_MOVE_ERROR':
          return {
            ...state,
            isProcessingMove: false,
            moveError: event.error,
          };

        case 'ENTER_HANDOFF':
          // Transition to handoff phase
          return {
            phase: 'handoff',
            player1Name: state.player1Name,
            player2Name: state.player2Name,
            gameState: state.gameState,
            engine: state.engine,
          };

        default:
          return state;
      }

    case 'handoff':
      switch (event.type) {
        case 'COMPLETE_HANDOFF':
          // Transition back to playing with Player 2 name
          return {
            phase: 'playing',
            player1Name: state.player1Name,
            player2Name: event.player2Name,
            gameState: state.gameState,
            engine: state.engine,
            pendingMove: null,
            isProcessingMove: false,
            moveError: null,
          };

        default:
          return state;
      }

    case 'victory':
      switch (event.type) {
        case 'NEW_GAME':
          // Reset to name entry
          return {
            phase: 'name-entry',
            player1Name: null,
          };

        default:
          return state;
      }

    default:
      // TypeScript exhaustiveness check
      const _exhaustive: never = state;
      return _exhaustive;
  }
}

// ============================================================================
// CUSTOM HOOK
// ============================================================================

/**
 * Initial state - name entry phase
 */
const initialState: GameFlowState = {
  phase: 'name-entry',
  player1Name: null,
};

/**
 * Custom hook for game flow state machine
 *
 * Manages transitions between name-entry → playing → handoff → victory
 * Handles localStorage persistence, URL updates, and async move processing
 *
 * @returns Game flow state and action creators
 *
 * @example
 * ```tsx
 * const { state, actions } = useGameFlow();
 *
 * // Start game
 * actions.startGame('Alice');
 *
 * // Make move
 * actions.selectMove([0, 0], [1, 0]);
 * actions.confirmMove();
 * ```
 */
export function useGameFlow(): GameFlowHookReturn {
  const [state, dispatch] = useReducer(gameFlowReducer, initialState);

  // ============================================================================
  // EFFECTS (localStorage, URL sync handled by parent component)
  // ============================================================================

  /**
   * Persist player names to localStorage
   */
  useEffect(() => {
    if (state.phase === 'name-entry') return;

    storage.setMyName(state.player1Name);

    if (state.phase !== 'name-entry' && 'player2Name' in state && state.player2Name) {
      storage.setItem('player2-name', state.player2Name);
    }
  }, [state]);

  /**
   * Persist game state to localStorage (debounced by storage layer)
   */
  useEffect(() => {
    if (
      state.phase === 'playing' ||
      state.phase === 'handoff' ||
      state.phase === 'victory'
    ) {
      storage.setGameState(state.gameState);
    }
  }, [state]);

  // ============================================================================
  // EVENT HANDLERS (public API)
  // ============================================================================

  /**
   * Start new game with Player 1 name
   */
  const startGame = useCallback((player1Name: string) => {
    dispatch({ type: 'START_GAME', player1Name });
  }, []);

  /**
   * Select move (store as pending)
   */
  const selectMove = useCallback((from: Position, to: Position) => {
    dispatch({ type: 'SELECT_MOVE', from, to });
  }, []);

  /**
   * Confirm pending move (async validation)
   */
  const confirmMove = useCallback(() => {
    if (state.phase !== 'playing' || !state.pendingMove) return;

    dispatch({ type: 'CONFIRM_MOVE_START' });

    // Simulate async move processing (engine validation)
    setTimeout(() => {
      const result = state.engine.makeMove(
        state.pendingMove!.from,
        state.pendingMove!.to
      );

      if (result.success) {
        const newGameState = state.engine.getGameState();
        dispatch({ type: 'CONFIRM_MOVE_SUCCESS', gameState: newGameState });
      } else {
        dispatch({ type: 'CONFIRM_MOVE_ERROR', error: result.error ?? 'Invalid move' });
      }
    }, 100);
  }, [state]);

  /**
   * Enter handoff phase (hot-seat mode)
   */
  const enterHandoff = useCallback(() => {
    dispatch({ type: 'ENTER_HANDOFF' });
  }, []);

  /**
   * Complete handoff with Player 2 name
   */
  const completeHandoff = useCallback((player2Name: string) => {
    dispatch({ type: 'COMPLETE_HANDOFF', player2Name });
  }, []);

  /**
   * Start new game (from victory screen)
   */
  const newGame = useCallback(() => {
    storage.clearAll();
    dispatch({ type: 'NEW_GAME' });
  }, []);

  return {
    state,
    actions: {
      startGame,
      selectMove,
      confirmMove,
      enterHandoff,
      completeHandoff,
      newGame,
    },
  };
}
```

**Validation:**
```bash
pnpm run check:types
pnpm run check:lint
```

---

#### Task 1.2: Write Tests for useGameFlow Hook (4-6 hours)

**File:** `src/hooks/useGameFlow.test.ts`

**Purpose:** Comprehensive tests for state machine logic

```typescript
/**
 * @fileoverview Tests for useGameFlow state machine hook
 * @module hooks/useGameFlow.test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGameFlow } from './useGameFlow';

describe('useGameFlow', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  describe('Initial State', () => {
    it('should start in name-entry phase', () => {
      const { result } = renderHook(() => useGameFlow());

      expect(result.current.state.phase).toBe('name-entry');
      expect(result.current.state.player1Name).toBeNull();
    });
  });

  describe('State Transitions', () => {
    it('should transition name-entry → playing on START_GAME', () => {
      const { result } = renderHook(() => useGameFlow());

      act(() => {
        result.current.actions.startGame('Alice');
      });

      expect(result.current.state.phase).toBe('playing');
      if (result.current.state.phase === 'playing') {
        expect(result.current.state.player1Name).toBe('Alice');
        expect(result.current.state.player2Name).toBeNull();
        expect(result.current.state.pendingMove).toBeNull();
      }
    });

    it('should transition playing → handoff on ENTER_HANDOFF', () => {
      const { result } = renderHook(() => useGameFlow());

      // Start game
      act(() => {
        result.current.actions.startGame('Alice');
      });

      // Enter handoff
      act(() => {
        result.current.actions.enterHandoff();
      });

      expect(result.current.state.phase).toBe('handoff');
    });

    it('should transition handoff → playing on COMPLETE_HANDOFF', () => {
      const { result } = renderHook(() => useGameFlow());

      // Setup: get to handoff phase
      act(() => {
        result.current.actions.startGame('Alice');
        result.current.actions.enterHandoff();
      });

      // Complete handoff with Player 2 name
      act(() => {
        result.current.actions.completeHandoff('Bob');
      });

      expect(result.current.state.phase).toBe('playing');
      if (result.current.state.phase === 'playing') {
        expect(result.current.state.player2Name).toBe('Bob');
      }
    });

    it('should transition victory → name-entry on NEW_GAME', () => {
      const { result } = renderHook(() => useGameFlow());

      // Mock: get to victory phase (complex setup)
      // ... (setup game state with victory condition)

      act(() => {
        result.current.actions.newGame();
      });

      expect(result.current.state.phase).toBe('name-entry');
    });
  });

  describe('Move Selection', () => {
    it('should store pending move on SELECT_MOVE', () => {
      const { result } = renderHook(() => useGameFlow());

      // Setup: start game
      act(() => {
        result.current.actions.startGame('Alice');
      });

      // Select move
      act(() => {
        result.current.actions.selectMove([2, 0], [1, 0]);
      });

      if (result.current.state.phase === 'playing') {
        expect(result.current.state.pendingMove).toEqual({
          from: [2, 0],
          to: [1, 0],
        });
      }
    });

    it('should clear error on new move selection', () => {
      const { result } = renderHook(() => useGameFlow());

      act(() => {
        result.current.actions.startGame('Alice');
      });

      // First move - will fail
      act(() => {
        result.current.actions.selectMove([0, 0], [0, 0]); // Invalid move
        result.current.actions.confirmMove();
      });

      // Wait for async
      vi.waitFor(() => {
        if (result.current.state.phase === 'playing') {
          expect(result.current.state.moveError).toBeTruthy();
        }
      });

      // Select new move - should clear error
      act(() => {
        result.current.actions.selectMove([2, 0], [1, 0]);
      });

      if (result.current.state.phase === 'playing') {
        expect(result.current.state.moveError).toBeNull();
      }
    });
  });

  describe('Move Confirmation', () => {
    it('should set isProcessingMove during confirmation', async () => {
      const { result } = renderHook(() => useGameFlow());

      act(() => {
        result.current.actions.startGame('Alice');
        result.current.actions.selectMove([2, 0], [1, 0]);
      });

      act(() => {
        result.current.actions.confirmMove();
      });

      // Should be processing immediately
      if (result.current.state.phase === 'playing') {
        expect(result.current.state.isProcessingMove).toBe(true);
      }
    });

    it('should clear pending move on successful confirmation', async () => {
      const { result } = renderHook(() => useGameFlow());

      act(() => {
        result.current.actions.startGame('Alice');
        result.current.actions.selectMove([2, 0], [1, 0]);
        result.current.actions.confirmMove();
      });

      // Wait for async completion
      await vi.waitFor(() => {
        if (result.current.state.phase === 'playing') {
          expect(result.current.state.pendingMove).toBeNull();
          expect(result.current.state.isProcessingMove).toBe(false);
        }
      });
    });
  });

  describe('Invalid Transitions', () => {
    it('should ignore ENTER_HANDOFF in name-entry phase', () => {
      const { result } = renderHook(() => useGameFlow());

      act(() => {
        result.current.actions.enterHandoff();
      });

      // Should still be in name-entry
      expect(result.current.state.phase).toBe('name-entry');
    });

    it('should ignore START_GAME in playing phase', () => {
      const { result } = renderHook(() => useGameFlow());

      act(() => {
        result.current.actions.startGame('Alice');
      });

      const playingState = result.current.state;

      // Try to start game again
      act(() => {
        result.current.actions.startGame('Bob');
      });

      // State should be unchanged
      expect(result.current.state).toEqual(playingState);
    });
  });

  describe('localStorage Persistence', () => {
    it('should persist player names', () => {
      const { result } = renderHook(() => useGameFlow());

      act(() => {
        result.current.actions.startGame('Alice');
        result.current.actions.enterHandoff();
        result.current.actions.completeHandoff('Bob');
      });

      // Check localStorage
      const savedName = localStorage.getItem('kings-cooking:my-name');
      expect(savedName).toBe('Alice');

      const player2Name = localStorage.getItem('player2-name');
      expect(player2Name).toBe('Bob');
    });

    it('should persist game state', () => {
      const { result } = renderHook(() => useGameFlow());

      act(() => {
        result.current.actions.startGame('Alice');
      });

      // Check localStorage has game state
      const savedState = localStorage.getItem('kings-cooking:game-state');
      expect(savedState).toBeTruthy();

      const parsed = JSON.parse(savedState!);
      expect(parsed.currentTurn).toBe(0);
    });
  });
});
```

**Validation:**
```bash
pnpm test useGameFlow.test.ts
pnpm test:coverage -- useGameFlow
# Must be 80%+ coverage
```

---

### Phase 5B: App.tsx Refactor (Week 1, Days 4-5)

#### Task 2.1: Refactor App.tsx to Use State Machine (6-8 hours)

**File:** `src/App.tsx`

**Purpose:** Transform from demo to production application

**Complete Implementation:**

```typescript
/**
 * @fileoverview Main application component with game flow state machine
 * @module App
 */

import { type ReactElement } from 'react';
import { useGameFlow } from './hooks/useGameFlow';
import { useUrlState } from './hooks/useUrlState';
import { GameBoard } from './components/game/GameBoard';
import { MoveConfirmButton } from './components/game/MoveConfirmButton';
import { HandoffScreen } from './components/game/HandoffScreen';
import { VictoryScreen } from './components/game/VictoryScreen';
import { NameForm } from './components/game/NameForm';
import { URLSharer } from './components/game/URLSharer';
import { DarkModeToggle } from './components/game/DarkModeToggle';
import './App.css';

/**
 * Main application component
 *
 * Orchestrates complete game flow using state machine pattern:
 * - name-entry: Collect player names
 * - playing: Active gameplay with move selection
 * - handoff: Hot-seat turn transition with privacy screen
 * - victory: Game end celebration with statistics
 *
 * Features:
 * - Hot-seat mode: Single device, turn-based play with handoff screens
 * - URL sharing mode: Asynchronous play via shared game URLs
 * - localStorage persistence: Game state survives page refreshes
 * - URL synchronization: Browser back/forward navigation works correctly
 * - Dark mode: System preference detection + manual toggle
 *
 * @component
 */
export function App(): ReactElement {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  const { state, actions } = useGameFlow();

  // URL state synchronization (Phase 3)
  const { updateUrl, getShareUrl, copyShareUrl } = useUrlState({
    debounceMs: 300,
    onPayloadReceived: (payload) => {
      if (payload.type === 'full') {
        // Restore complete game from URL
        // Note: useGameFlow handles RESTORE_GAME event
        console.log('Game restored from URL', payload.gameState);
      } else if (payload.type === 'delta') {
        // Apply move delta from URL
        console.log('Move applied from URL', payload.move);
      }
    },
    onError: (error) => {
      console.error('URL state error:', error);
    },
  });

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  /**
   * Handle Player 1 name submission
   */
  const handlePlayer1Name = (name: string): void => {
    actions.startGame(name);
  };

  /**
   * Handle Player 2 name submission (first handoff)
   */
  const handlePlayer2Name = (name: string): void => {
    actions.completeHandoff(name);
  };

  /**
   * Handle piece selection and destination click
   */
  const handleMove = (from: Position, to: Position): void => {
    actions.selectMove(from, to);
  };

  /**
   * Handle move confirmation
   * - Validates move with chess engine
   * - Updates URL with delta payload
   * - Checks for victory condition
   * - Triggers handoff if hot-seat mode
   */
  const handleConfirmMove = (): void => {
    actions.confirmMove();

    // After successful move, update URL (debounced)
    if (state.phase === 'playing') {
      updateUrl({
        type: 'delta',
        move: state.pendingMove,
        turn: state.gameState.currentTurn + 1,
        checksum: state.engine.getChecksum(),
      });
    }
  };

  /**
   * Handle handoff completion (countdown finished or skipped)
   */
  const handleHandoffContinue = (): void => {
    // If Player 2 name not collected yet, stay in handoff
    if (state.phase === 'handoff' && !state.player2Name) {
      // Name form will appear after handoff screen
      return;
    }

    // Continue to next turn
    // Note: useGameFlow already transitioned to 'playing' after COMPLETE_HANDOFF
  };

  /**
   * Handle new game request from victory screen
   */
  const handleNewGame = (): void => {
    actions.newGame();
  };

  /**
   * Handle URL copy from URLSharer
   */
  const handleCopyUrl = async (): Promise<void> => {
    const success = await copyShareUrl();
    if (success) {
      console.log('URL copied to clipboard');
    }
  };

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  /**
   * Get player name by color
   */
  const getPlayerName = (player: 'white' | 'black'): string => {
    if (state.phase === 'name-entry') return '';

    if (player === 'white') {
      return state.player1Name;
    } else {
      return state.player2Name ?? 'Opponent';
    }
  };

  /**
   * Calculate game duration in seconds
   */
  const calculateDuration = (): number => {
    if (state.phase !== 'victory') return 0;

    const history = state.gameState.moveHistory;
    if (history.length === 0) return 0;

    const firstMove = history[0].timestamp;
    const lastMove = history[history.length - 1].timestamp;

    return Math.floor((lastMove - firstMove) / 1000);
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="app">
      {/* Dark mode toggle - always visible */}
      <header className="app-header">
        <h1>King's Cooking</h1>
        <DarkModeToggle />
      </header>

      <main className="app-main">
        {/* Phase: Name Entry */}
        {state.phase === 'name-entry' && (
          <div className="name-entry-screen">
            <h2>Welcome to King's Cooking!</h2>
            <p>Enter your name to start a new game</p>
            <NameForm
              storageKey="my-name"
              label="Your Name"
              onNameChange={handlePlayer1Name}
            />
          </div>
        )}

        {/* Phase: Playing */}
        {state.phase === 'playing' && (
          <div className="game-screen">
            <div className="game-info">
              <div className="player-info">
                <span className="player-label">White:</span>
                <span className="player-name">{state.player1Name}</span>
              </div>
              <div className="turn-indicator">
                Current Turn: {state.gameState.currentPlayer}
              </div>
              <div className="player-info">
                <span className="player-label">Black:</span>
                <span className="player-name">{state.player2Name ?? 'Waiting...'}</span>
              </div>
            </div>

            <GameBoard
              gameState={state.gameState}
              onMove={handleMove}
              isPlayerTurn={true} // Hot-seat mode: always your turn
            />

            <div className="game-controls">
              <MoveConfirmButton
                onConfirm={handleConfirmMove}
                disabled={!state.pendingMove}
                isProcessing={state.isProcessingMove}
                error={state.moveError}
              />
            </div>

            {/* Show URL sharer after first move */}
            {state.gameState.moveHistory.length > 0 && (
              <URLSharer
                url={getShareUrl()}
                onCopy={handleCopyUrl}
              />
            )}
          </div>
        )}

        {/* Phase: Handoff */}
        {state.phase === 'handoff' && (
          <>
            <HandoffScreen
              nextPlayer={state.gameState.currentPlayer}
              nextPlayerName={getPlayerName(state.gameState.currentPlayer)}
              previousPlayer={state.gameState.currentPlayer === 'white' ? 'black' : 'white'}
              previousPlayerName={getPlayerName(
                state.gameState.currentPlayer === 'white' ? 'black' : 'white'
              )}
              onContinue={handleHandoffContinue}
              countdownSeconds={3}
            />

            {/* If Player 2 name not collected, show name form after countdown */}
            {!state.player2Name && (
              <div className="name-entry-overlay">
                <h2>Opponent's Turn</h2>
                <p>Enter opponent's name to continue</p>
                <NameForm
                  storageKey="player2"
                  label="Opponent's Name"
                  onNameChange={handlePlayer2Name}
                />
              </div>
            )}
          </>
        )}

        {/* Phase: Victory */}
        {state.phase === 'victory' && (
          <VictoryScreen
            winner={state.winner}
            winnerName={getPlayerName(state.winner === 'draw' ? 'white' : state.winner)}
            loserName={getPlayerName(state.winner === 'white' ? 'black' : 'white')}
            totalMoves={state.gameState.moveHistory.length}
            gameDuration={calculateDuration()}
            whiteCaptured={state.gameState.capturedBlack.length}
            blackCaptured={state.gameState.capturedWhite.length}
            onNewGame={handleNewGame}
          />
        )}
      </main>
    </div>
  );
}
```

**Validation:**
```bash
pnpm run check:types
pnpm run check:lint
pnpm dev
# Manual test: Play complete game from name entry to victory
```

---

### Phase 5C: E2E Test Suite (Week 2, Days 1-3)

#### Task 3.1: Add data-testid Attributes (2-3 hours)

**Update all Phase 4 components with test IDs**

**Files to Update:**
- `GameBoard.tsx` - Add `data-testid="game-board"` and `data-testid="cell-${row}-${col}"`
- `MoveConfirmButton.tsx` - Add `data-testid="confirm-move"` and `data-testid="cancel-move"`
- `NameForm.tsx` - Add `data-testid="name-input"` and `data-testid="name-submit"`
- `HandoffScreen.tsx` - Add `data-testid="handoff-screen"`, `data-testid="countdown"`, `data-testid="skip-countdown"`
- `VictoryScreen.tsx` - Add `data-testid="victory-screen"`, `data-testid="winner-name"`, `data-testid="new-game-button"`
- `URLSharer.tsx` - Add `data-testid="url-input"` and `data-testid="copy-url-button"`

**Example (GameBoard.tsx):**
```typescript
return (
  <div className="game-board-container" data-testid="game-board">
    {/* ... */}
    <GameCell
      key={`${rowIndex}-${colIndex}`}
      data-testid={`cell-${rowIndex}-${colIndex}`}
      {/* ... */}
    />
  </div>
);
```

---

#### Task 3.2: Write Complete Game Flow E2E Tests (6-8 hours)

**File:** `tests/e2e/complete-game-flow.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Complete Game Flow - Hot-Seat Mode', () => {
  test('should complete full game from name entry to victory', async ({ page }) => {
    // 1. Navigate to app
    await page.goto('/');

    // 2. Enter Player 1 name
    await expect(page.locator('h2')).toContainText('Welcome to King\'s Cooking');
    await page.fill('[data-testid="name-input"]', 'Alice');
    await page.click('[data-testid="name-submit"]');

    // 3. Verify game board appears
    await expect(page.locator('[data-testid="game-board"]')).toBeVisible();
    await expect(page.locator('text=Alice')).toBeVisible();
    await expect(page.locator('text=Current Turn: white')).toBeVisible();

    // 4. Player 1 (Alice) makes first move
    await page.click('[data-testid="cell-2-0"]'); // Select white rook at A3
    await expect(page.locator('[data-testid="cell-2-0"]')).toHaveClass(/selected/);

    await page.click('[data-testid="cell-1-0"]'); // Move to A2
    await page.click('[data-testid="confirm-move"]');

    // 5. Handoff screen appears
    await expect(page.locator('[data-testid="handoff-screen"]')).toBeVisible();
    await expect(page.locator('[data-testid="countdown"]')).toContainText('3');

    // 6. Skip countdown
    await page.click('[data-testid="skip-countdown"]');

    // 7. Player 2 name form appears
    await expect(page.locator('text=Opponent\'s Turn')).toBeVisible();
    await page.fill('[data-testid="name-input"]', 'Bob');
    await page.click('[data-testid="name-submit"]');

    // 8. Board reappears for Player 2 (Bob)
    await expect(page.locator('[data-testid="game-board"]')).toBeVisible();
    await expect(page.locator('text=Bob')).toBeVisible();
    await expect(page.locator('text=Current Turn: black')).toBeVisible();

    // 9. Player 2 (Bob) makes move
    await page.click('[data-testid="cell-0-0"]'); // Select black rook at A1
    await page.click('[data-testid="cell-0-1"]'); // Move to B1
    await page.click('[data-testid="confirm-move"]');

    // 10. Handoff screen again
    await expect(page.locator('[data-testid="handoff-screen"]')).toBeVisible();
    await page.click('[data-testid="skip-countdown"]');

    // 11. Continue playing until victory condition
    // (Play remaining moves to reach victory)
    // ...

    // 12. Victory screen appears
    await expect(page.locator('[data-testid="victory-screen"]')).toBeVisible();
    await expect(page.locator('[data-testid="winner-name"]')).toContainText(/Alice|Bob/);
    await expect(page.locator('[data-testid="new-game-button"]')).toBeVisible();
  });

  test('should persist game state across page reload', async ({ page }) => {
    // Start game
    await page.goto('/');
    await page.fill('[data-testid="name-input"]', 'Alice');
    await page.click('[data-testid="name-submit"]');

    // Make move
    await page.click('[data-testid="cell-2-0"]');
    await page.click('[data-testid="cell-1-0"]');
    await page.click('[data-testid="confirm-move"]');

    // Skip handoff
    await page.click('[data-testid="skip-countdown"]');
    await page.fill('[data-testid="name-input"]', 'Bob');
    await page.click('[data-testid="name-submit"]');

    // Reload page
    await page.reload();

    // Game state should be restored
    await expect(page.locator('[data-testid="game-board"]')).toBeVisible();
    await expect(page.locator('text=Alice')).toBeVisible();
    await expect(page.locator('text=Bob')).toBeVisible();

    // Check piece position (Alice's rook moved from A3 to A2)
    const a2Cell = page.locator('[data-testid="cell-1-0"]');
    await expect(a2Cell).toContainText('♖'); // White rook unicode
  });
});

test.describe('Complete Game Flow - URL Sharing Mode', () => {
  test('should complete game with URL sharing between two browsers', async ({ page, context }) => {
    // Player 1 (Alice) setup
    await page.goto('/');
    await page.fill('[data-testid="name-input"]', 'Alice');
    await page.click('[data-testid="name-submit"]');

    // Player 1 makes first move
    await page.click('[data-testid="cell-2-0"]');
    await page.click('[data-testid="cell-1-0"]');
    await page.click('[data-testid="confirm-move"]');

    // Get shared URL
    await expect(page.locator('[data-testid="url-sharer"]')).toBeVisible();
    const sharedUrl = await page.locator('[data-testid="url-input"]').inputValue();

    // Player 2 (Bob) opens URL in new browser context
    const player2Page = await context.newPage();
    await player2Page.goto(sharedUrl);

    // Player 2 enters name
    await player2Page.fill('[data-testid="name-input"]', 'Bob');
    await player2Page.click('[data-testid="name-submit"]');

    // Verify Player 2 sees Player 1's move
    const a2Cell = player2Page.locator('[data-testid="cell-1-0"]');
    await expect(a2Cell).toContainText('♖');
    await expect(player2Page.locator('text=Current Turn: black')).toBeVisible();

    // Player 2 makes move
    await player2Page.click('[data-testid="cell-0-0"]');
    await player2Page.click('[data-testid="cell-0-1"]');
    await player2Page.click('[data-testid="confirm-move"]');

    // Get Player 2's updated URL
    const updatedUrl = await player2Page.locator('[data-testid="url-input"]').inputValue();

    // Player 1 loads updated URL
    await page.goto(updatedUrl);

    // Verify synchronization
    const b1Cell = page.locator('[data-testid="cell-0-1"]');
    await expect(b1Cell).toContainText('♜'); // Black rook
    await expect(page.locator('text=Current Turn: white')).toBeVisible();

    await player2Page.close();
  });
});
```

**Validation:**
```bash
pnpm run test:e2e
pnpm run test:e2e:ui  # Interactive mode for debugging
```

---

### Phase 5D: Polish & Documentation (Week 2, Days 4-5)

#### Task 4.1: Error Handling & Edge Cases (4-6 hours)

**Add Error Boundaries and Recovery:**

1. **localStorage Quota Exceeded**
2. **Corrupted URL State**
3. **Invalid Move Attempts**
4. **Network Errors** (future-proofing for WebRTC)

**File:** `src/components/ErrorBoundary.tsx`

```typescript
/**
 * @fileoverview Error boundary for graceful error recovery
 * @module components/ErrorBoundary
 */

import { Component, type ReactElement, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactElement;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary component for graceful error handling
 *
 * Catches errors in child components and displays fallback UI
 * Provides "Try Again" button to reset error state
 *
 * @component
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('Error boundary caught error:', error, errorInfo);
  }

  reset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.reset);
      }

      return (
        <div className="error-screen">
          <h2>Something went wrong</h2>
          <p>{this.state.error.message}</p>
          <button onClick={this.reset}>Try Again</button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

**Update App.tsx to use ErrorBoundary:**
```typescript
import { ErrorBoundary } from './components/ErrorBoundary';

export function App(): ReactElement {
  return (
    <ErrorBoundary>
      <div className="app">
        {/* ... existing code */}
      </div>
    </ErrorBoundary>
  );
}
```

---

#### Task 4.2: Update Documentation (2-3 hours)

1. **README.md** - Add Phase 5 features and usage
2. **CHANGELOG.md** - Document Phase 5 additions
3. **JSDoc comments** - Ensure all functions documented

---

## ✅ VALIDATION LOOP

### Level 1: Syntax & Type Checking
```bash
# TypeScript strict mode check (MUST pass with 0 errors)
pnpm run check:types

# ESLint check (MUST pass with 0 warnings)
pnpm run check:lint

# Format check
pnpm run format
```

### Level 2: Unit Tests
```bash
# Run all tests
pnpm test

# Check coverage for new files (MUST be 80%+)
pnpm test:coverage -- useGameFlow

# Test reducer in isolation
pnpm test -- useGameFlow.test.ts
```

### Level 3: Integration Tests
```bash
# Test complete game flow
pnpm test src/App.test.tsx

# Test with real components (not mocked)
pnpm test:integration
```

### Level 4: E2E Tests
```bash
# Run all E2E tests
pnpm run test:e2e

# Run specific test
pnpm run test:e2e -- complete-game-flow.spec.ts

# Run with UI for debugging
pnpm run test:e2e:ui
```

### Level 5: Manual Testing Checklist
```
Hot-Seat Mode:
[ ] Enter Player 1 name → game starts
[ ] Make first move → handoff screen appears
[ ] Skip countdown → Player 2 name form appears
[ ] Enter Player 2 name → game continues
[ ] Make several moves with handoff between each
[ ] Complete game → victory screen appears with correct winner
[ ] Click "New Game" → returns to name entry

URL Sharing Mode:
[ ] Player 1 starts game and makes move
[ ] URL sharer appears with shareable link
[ ] Copy URL to clipboard
[ ] Open URL in new private/incognito window
[ ] Player 2 enters name and sees Player 1's move
[ ] Player 2 makes move → new URL generated
[ ] Player 1 opens new URL → sees Player 2's move
[ ] Continue alternating until victory

Page Refresh:
[ ] Start game with both players named
[ ] Make 3-4 moves
[ ] Refresh page (F5)
[ ] Game continues from same state
[ ] All names, positions, and turn preserved

Browser Back/Forward:
[ ] Make several moves (URLs change)
[ ] Click browser back button
[ ] Game state reverts to previous move
[ ] Click forward button
[ ] Game state advances to next move

Dark Mode:
[ ] Toggle dark mode on/off
[ ] Preference persists across refresh
[ ] All components visible in both modes
[ ] Color contrast sufficient (use DevTools audit)

Error Recovery:
[ ] Clear localStorage mid-game → game continues using URL
[ ] Manually edit URL to invalid hash → error screen appears
[ ] Invalid move attempt → error shown, can retry
```

---

## 📊 SUCCESS METRICS

### Code Quality
- ✅ 0 TypeScript errors
- ✅ 0 ESLint warnings
- ✅ 80%+ test coverage on all new files
- ✅ useGameFlow hook < 300 lines
- ✅ App.tsx < 300 lines
- ✅ All functions have JSDoc comments

### Performance
- ✅ State updates < 100ms
- ✅ URL encoding/decoding < 50ms
- ✅ Board re-renders < 16ms (60fps)
- ✅ Page load < 2s on 3G

### User Experience
- ✅ Complete hot-seat game playable
- ✅ Complete URL sharing game playable
- ✅ No data loss on page refresh
- ✅ Clear turn indicators
- ✅ Victory screen shows correct winner
- ✅ Error messages user-friendly

### Test Coverage
- ✅ useGameFlow: 90%+ coverage
- ✅ App.tsx: 80%+ coverage
- ✅ E2E tests: 3+ complete game flows
- ✅ All state transitions tested
- ✅ Error cases tested

---

## 🚀 COMPLETION CHECKLIST

### Phase 5A: State Machine Core
- [ ] useGameFlow hook implemented with useReducer
- [ ] GameFlowState discriminated union defined
- [ ] GameFlowEvent types defined
- [ ] gameFlowReducer handles all transitions
- [ ] localStorage effects working
- [ ] Tests written with 90%+ coverage
- [ ] All invalid transitions ignored (no crashes)

### Phase 5B: App.tsx Refactor
- [ ] App.tsx uses useGameFlow hook
- [ ] All 4 phases rendered correctly (name-entry, playing, handoff, victory)
- [ ] GameBoard integrated with state machine
- [ ] MoveConfirmButton triggers move validation
- [ ] HandoffScreen appears between turns
- [ ] VictoryScreen appears on game end
- [ ] NameForm collects P1 and P2 names correctly
- [ ] URLSharer displays after first move
- [ ] Dark mode toggle always visible
- [ ] No console errors or warnings

### Phase 5C: E2E Test Suite
- [ ] data-testid attributes added to all components
- [ ] complete-game-flow.spec.ts written
- [ ] Hot-seat game flow E2E test passes
- [ ] URL sharing game flow E2E test passes
- [ ] Page refresh persistence test passes
- [ ] All E2E tests pass in CI

### Phase 5D: Polish & Documentation
- [ ] ErrorBoundary implemented
- [ ] localStorage quota errors handled
- [ ] Corrupted URL state handled
- [ ] Invalid move errors handled
- [ ] README.md updated with Phase 5 features
- [ ] CHANGELOG.md updated
- [ ] All JSDoc comments complete

### Documentation
- [ ] README has "How to Play" section
- [ ] README has "Development" section
- [ ] CHANGELOG lists all Phase 5 changes
- [ ] Code comments explain complex logic
- [ ] State machine diagram included (optional)

### Validation
- [ ] `pnpm run check:types` passes
- [ ] `pnpm run check:lint` passes
- [ ] `pnpm test` passes with 80%+ coverage
- [ ] `pnpm run test:e2e` passes
- [ ] Manual testing checklist complete
- [ ] Accessibility audit passes (Lighthouse)

---

## 🎯 DEFINITION OF DONE

Phase 5 is complete when:

1. ✅ Complete hot-seat game playable from name entry to victory
2. ✅ Complete URL sharing game playable with 2 browser tabs
3. ✅ useGameFlow hook has 90%+ test coverage
4. ✅ All Phase 4 components integrated and functional
5. ✅ Page refresh doesn't lose game state
6. ✅ Browser back/forward works correctly with URL state
7. ✅ Victory screen appears with correct winner and stats
8. ✅ Player names persist in localStorage
9. ✅ E2E tests pass (hot-seat + URL modes)
10. ✅ Zero TypeScript errors, zero ESLint warnings
11. ✅ Dark mode works throughout entire game
12. ✅ Error recovery handles corrupted state gracefully
13. ✅ Code reviewed and merged to main branch

**Final Validation Command:**
```bash
pnpm run check:types && \
pnpm run check:lint && \
pnpm test:coverage && \
pnpm run test:e2e && \
pnpm build
```

If all pass → **Phase 5 Complete! 🎉** → Ready for Phase 6 (WebRTC Multiplayer)

---

## 📝 NOTES ON v1.0 MVP COMPLETION

**What's COMPLETE after Phase 5:**
- ✅ Full playable game (hot-seat mode)
- ✅ Game sharing via URL (correspondence mode)
- ✅ Complete UI/UX flow (name → play → victory)
- ✅ State persistence (localStorage + URL)
- ✅ Comprehensive test coverage (unit + integration + E2E)
- ✅ Production-ready code quality (0 errors, 80%+ coverage)
- ✅ Accessibility compliance (WCAG 2.1 AA)

**What's DEFERRED to Phase 6+:**
- ❌ WebRTC real-time multiplayer (Phase 6)
- ❌ Game replays with navigation (Phase 6)
- ❌ Multiple simultaneous games (v2.0+)
- ❌ AI opponent (v2.0+)
- ❌ User accounts/authentication (v2.0+)
- ❌ Leaderboards/statistics (v2.0+)

**Why This is a Complete MVP:**
- Users can play complete games in both hot-seat and URL modes
- All core game mechanics working (movement, capture, victory)
- Professional UX (smooth transitions, clear feedback, error recovery)
- Shareable (URL links work reliably)
- Persistent (game state never lost)
- Accessible (keyboard, screen reader, dark mode)

**Next Steps After Phase 5:**
1. Deploy to GitHub Pages (static hosting)
2. Share with beta testers for feedback
3. Monitor real-world usage (analytics)
4. Prioritize Phase 6-7 features based on user demand
5. Consider WebRTC (Phase 6) vs additional game modes (v2.0)

---

**Version History:**
- v1.0.0 (Phase 5 Complete) - Full game flow integration, hot-seat + URL modes
- v0.4.0 (Phase 4 Complete) - All UI components
- v0.3.0 (Phase 3 Complete) - URL state synchronization
- v0.2.0 (Phase 2 Complete) - Chess engine
- v0.1.0 (Phase 1 Complete) - Foundation
