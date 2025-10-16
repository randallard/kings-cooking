# Phase 4: UI Components - Interactive Game Interface

**Version:** 1.0.0
**Phase:** 4 of 7
**Complexity:** High
**Dependencies:** Phase 1 (Foundation), Phase 2 (Chess Engine), Phase 3 (URL State)
**Estimated Effort:** 2-3 weeks

---

## 🎯 GOAL

Build a complete, accessible, mobile-responsive UI for King's Cooking game with comprehensive test coverage.

**Specific Deliverables:**
1. **GameBoard** - Interactive 3x3 chess board with piece rendering and move selection
2. **GameCell** - Individual board cell with click-to-move and accessibility
3. **MoveConfirmButton** - Confirm/Cancel move actions with loading states
4. **NameForm** - Player name input with validation (Player 1 on start, Player 2 on first handoff)
5. **URLSharer** - Share game link with copy-to-clipboard
6. **HandoffScreen** - Hot-seat turn handoff with privacy
7. **VictoryScreen** - Game end celebration with stats
8. **Dark mode** - System preference detection and manual toggle
9. **Test coverage** - 80%+ coverage with Vitest and React Testing Library

**NOT in Phase 4 (Deferred to v2.0+):**
- ❌ ModeSelector - Game has fixed setup (Rook, Knight, Bishop) for v1.0
- ❌ Variable board sizes - 3x3 only for v1.0
- ❌ Drag-and-drop - Click-to-move only for v1.0 (better mobile support)

**Success Criteria:**
- ✅ All components render correctly on mobile (320px), tablet (768px), desktop (1024px+)
- ✅ WCAG 2.1 AA compliance (keyboard navigation, ARIA, color contrast)
- ✅ Touch-friendly interactions (44x44px tap targets minimum)
- ✅ Dark mode works flawlessly with proper contrast ratios
- ✅ All tests pass with 80%+ code coverage
- ✅ Zero ESLint warnings, zero TypeScript errors
- ✅ Game is playable end-to-end

---

## 💡 WHY

**Business Value:**
- Transforms chess engine into playable game = **MVP COMPLETE**
- Professional UI builds user confidence and shareability
- Mobile-first design captures largest user segment (60%+ mobile traffic)
- Accessibility compliance opens game to all users

**User Impact:**
- **BEFORE Phase 4**: Users have working chess logic but no way to play
- **AFTER Phase 4**: Users can create games, make moves, share with friends, see victory
- Mobile users can play on-the-go (phone/tablet)
- Keyboard users can play without mouse
- Screen reader users can understand game state

**Technical Dependencies:**
- Phase 1 provides React 19, TypeScript, Vitest, validation schemas
- Phase 2 provides `KingsChessEngine` for move validation and game logic
- Phase 3 provides `useUrlState` hook for state persistence and sharing

**Why This Order:**
- Can't build UI without game engine (Phase 2 dependency)
- Can't share games without URL state (Phase 3 dependency)
- Phase 4 unblocks Phase 5 (WebRTC) by providing playable interface

---

## 📋 WHAT

### User-Visible Behavior

#### 1. GameBoard Component
**Desktop Experience:**
- User sees 3x3 chess board with alternating light/dark squares
- Fixed starting position: Rook (A), Knight (B), Bishop (C) for both players
- Pieces display as unicode chess symbols (♜ ♞ ♝ for black, ♖ ♘ ♗ for white)
- Click piece → highlights legal moves → click destination → move confirmed
- Visual feedback: hover effects, selected state, legal move indicators
- Move history panel shows last 10 moves with notation (A1 → B3)

**Note:** Board size and piece selection are FIXED in v1.0. Variable setup modes deferred to v2.0+.

**Mobile Experience:**
- Board scales to fit screen (min 320px width)
- Tap piece → highlights legal moves → tap destination → move confirmed
- 44x44px minimum tap targets for cells
- No hover effects (use active/selected states only)
- Scroll-friendly move history list

**Keyboard Experience:**
- Tab focuses board cells in reading order (A1, A2, A3, B1...)
- Arrow keys navigate between cells
- Enter selects piece, Enter again to confirm move
- Escape cancels selection
- Screen reader announces: "Rook, white player, position A1, 3 legal moves available"

**Accessibility:**
- `role="grid"` for board
- `role="gridcell"` for each cell
- `aria-label` for pieces: "White rook at A1"
- `aria-pressed` for selected pieces
- `aria-describedby` for move hints
- Focus indicator: 2px solid outline with 3:1 contrast ratio

#### 2. GameCell Component
**States:**
- Empty: Light (#f0d9b5) or dark (#b58863) square
- Occupied: Shows piece unicode character (♜ ♞ ♝ for black, ♖ ♘ ♗ for white)
- Selected: Blue highlight (#4a9eff)
- Legal move: Green dot indicator (#28a745)
- Last move: Yellow highlight (#ffc107)

**Interactions:**
- Click/Tap: Select piece or destination (primary interaction)
- Keyboard: Arrow navigation + Enter
- **Note:** Drag-and-drop deferred to v2.0+ (click-to-move is simpler and works better on mobile)

#### 3. MoveConfirmButton
**States:**
- Disabled: No move selected (grey, opacity 0.5)
- Ready: Move selected (green, #28a745)
- Processing: Move being validated (spinner, "Confirming...")
- Error: Invalid move (red, #dc3545, shake animation)

**Behavior:**
- Confirm button triggers `engine.makeMove(from, to)`
- Shows loading spinner during validation (< 100ms typically)
- On success: Updates board, adds to history, switches player
- On error: Shows error toast, doesn't clear selection

#### 4. NameForm
**Purpose:**
- Player 1 enters name on game start
- Player 2 enters name on first handoff screen
- Names stored in localStorage (hot-seat mode)

**Validation:**
- 1-20 characters
- No leading/trailing whitespace
- No special characters except - and _
- Debounced validation (300ms)
- XSS protection via React's built-in escaping

**States:**
- Empty: Placeholder "Enter your name"
- Valid: Green checkmark, enables continue button
- Invalid: Red X with error message
- Focus: Blue border highlight

**Storage:**
- `kings-cooking:player1-name` in localStorage
- `kings-cooking:player2-name` in localStorage

#### 5. URLSharer
**Features:**
- Displays current game URL (read-only input)
- Copy button with clipboard API
- Success toast: "Link copied!"
- Fallback for old browsers: manual selection

**Accessibility:**
- `aria-label="Copy game link to clipboard"`
- Success announcement: `aria-live="polite"`

#### 7. HandoffScreen
**Hot-Seat Mode:**
- "Player 2's turn - Pass device to Player 2"
- Countdown timer (3 seconds) with "Skip" button
- Privacy screen: blurs previous player's view
- Friendly message: "White made their move. Your turn, Black!"

#### 8. VictoryScreen
**Display:**
- Winner announcement: "White Wins! 🎉"
- Final score: "3 pieces in court"
- Game stats: "Game lasted 24 moves, 12 minutes"
- Action buttons: "New Game" | "Share Result" | "Review Moves"

**Animations:**
- Confetti effect (CSS animation, no libraries)
- Fade-in for text (respects prefers-reduced-motion)

### Technical Requirements

#### Component Structure
```typescript
// src/components/game/GameBoard.tsx
import { ReactElement } from 'react';
import type { GameState, Position } from '@/lib/validation/schemas';
import { KingsChessEngine } from '@/lib/chess/KingsChessEngine';

interface GameBoardProps {
  /** Current game state from URL or local */
  gameState: GameState;
  /** Callback when move is made */
  onMove: (from: Position, to: Position) => void;
  /** Optional: controlled selected position */
  selectedPosition?: Position;
  /** Optional: is it current player's turn? */
  isPlayerTurn: boolean;
}

export const GameBoard = ({
  gameState,
  onMove,
  selectedPosition,
  isPlayerTurn
}: GameBoardProps): ReactElement => {
  // Implementation
};
```

#### Component Size Limits (CLAUDE-REACT.md)
- **Maximum 200 lines** per component
- Break into sub-components if exceeding
- Extract helper functions to separate files

#### TypeScript Requirements
- **MANDATORY**: `ReactElement` return type (NOT `JSX.Element`)
- **MANDATORY**: Strict null checks, no implicit any
- **MANDATORY**: Zod validation for all external data
- **MANDATORY**: Branded types for IDs (GameId, PlayerId)

#### Testing Requirements
- **Minimum 80% code coverage**
- Co-locate tests: `GameBoard.test.tsx` next to `GameBoard.tsx`
- Use React Testing Library (no Enzyme)
- Test user behavior, not implementation details
- Mock chess engine for unit tests

#### Styling Requirements
- **CSS Modules** or **Tailwind CSS** (project uses Tailwind)
- **Mobile-first** approach: base styles for 320px, media queries for larger
- **Dark mode**: CSS custom properties + `prefers-color-scheme`
- **No external CSS libraries** (keep bundle small)

#### Performance Requirements
- Components MUST use React.memo for expensive renders
- Move calculation MUST be memoized with useMemo
- Event handlers MUST be memoized with useCallback
- Board re-renders MUST be < 16ms (60fps)

---

## 📚 REFERENCE DOCUMENTATION

**CRITICAL:** Read these documents BEFORE implementing. They contain mandatory patterns and gotchas.

### Project-Specific Documentation

#### CLAUDE-REACT.md (MANDATORY - 954 lines)
**Location:** `/home/ryankhetlyr/Development/kings-cooking/claude_md_files/CLAUDE-REACT.md`

**Critical Sections:**
- **Lines 1-100**: React 19 patterns - MUST use `ReactElement` not `JSX.Element`
- **Lines 101-200**: TypeScript strict mode requirements
- **Lines 201-300**: Component structure (max 200 lines, JSDoc, single responsibility)
- **Lines 301-400**: Testing requirements (80% coverage, React Testing Library)
- **Lines 401-500**: Zod validation patterns for external data
- **Lines 501-600**: Accessibility patterns (ARIA, keyboard navigation)
- **Lines 601-700**: Performance patterns (memoization, render optimization)
- **Lines 701-800**: Error handling and loading states
- **Lines 801-954**: Common gotchas and anti-patterns

**Key Takeaways:**
```typescript
// ✅ CORRECT - React 19 pattern
import { ReactElement } from 'react';
function MyComponent(): ReactElement { }

// ❌ WRONG - Will fail ESLint
function MyComponent(): JSX.Element { }

// ✅ CORRECT - Memoized handler
const handleClick = useCallback(() => {}, [deps]);

// ❌ WRONG - New function every render
<button onClick={() => handleClick()}>
```

#### NAME_COLLECTION_PATTERN.md
**Location:** `/home/ryankhetlyr/Development/kings-cooking/kings-cooking-docs/NAME_COLLECTION_PATTERN.md`

**Critical for:** NameForm component implementation

**Key Patterns:**
- ❌ **DON'T** use `prompt()` - Not styleable, no dark mode
- ✅ **DO** use HTML forms with framework classes
- Form submission pattern with `preventDefault()`
- localStorage persistence: `hotSeatStorage.setPlayer1Name()`, `setPlayer2Name()`
- Validation: trim whitespace, check empty
- Example component structure (lines 14-80)

#### DARK_MODE_GUIDE.md
**Location:** `/home/ryankhetlyr/Development/kings-cooking/kings-cooking-docs/DARK_MODE_GUIDE.md`

**Critical for:** All component styling

**Key Requirements:**
- MUST declare `color-scheme: light dark` in CSS
- MUST style ALL visual elements for dark mode
- MUST maintain 4.5:1 contrast for text, 3:1 for UI
- Use `@media (prefers-color-scheme: dark)` for automatic detection
- Test with: DevTools → Rendering → Emulate prefers-color-scheme
- Common pattern: CSS custom properties (see lines 50-150)

**Color Palette:**
```css
:root {
  /* Light mode */
  --bg-primary: #ffffff;
  --bg-board-light: #f0d9b5;
  --bg-board-dark: #b58863;
}

@media (prefers-color-scheme: dark) {
  :root {
    /* Dark mode - use deep grey, not pure black */
    --bg-primary: #1a1a1a;
    --bg-board-light: #4a4a4a;
    --bg-board-dark: #2a2a2a;
  }
}
```

### Codebase References

#### Existing Components (Phase 3)
**Location:** `/home/ryankhetlyr/Development/kings-cooking/src/components/`

1. **HistoryViewer.tsx (355 lines)** - Component structure reference
   - JSDoc documentation pattern (lines 1-8)
   - Props interface with comments (lines 14-26)
   - Collapsible panel with ARIA (lines 100-125)
   - Keyboard event handling (lines 71-76)
   - Auto-scroll with useEffect (lines 58-66)
   - Modal integration with focus-trap-react (lines 275-283)

2. **HistoryViewer.test.tsx (435 lines)** - Testing reference
   - Helper functions for test data (lines 17-41)
   - Test organization with describe blocks (lines 46-434)
   - userEvent.setup() pattern (lines 50)
   - Accessibility testing (lines 395-433)

3. **HistoryComparisonModal.tsx (434 lines)** - Modal reference
   - FocusTrap configuration (lines 198-205)
   - Body scroll prevention (lines 183-192)
   - ESC key handler (lines 256-270)
   - Async action handling with loading states (lines 98-128)

#### Validation Schemas
**Location:** `/home/ryankhetlyr/Development/kings-cooking/src/lib/validation/schemas.ts`

**Critical Sections:**
- Lines 15-46: Branded types (PlayerId, GameId, MoveId)
- Lines 48-100: Piece types and Position validation
- Lines 102-145: Move schema with off_board support
- Lines 147-210: Complete GameState schema
- Lines 212-290: Validation helper functions

**Usage Pattern:**
```typescript
import { GameStateSchema, PositionSchema } from '@/lib/validation/schemas';

// ALWAYS validate external data
const result = GameStateSchema.safeParse(data);
if (result.success) {
  const state = result.data; // Fully typed
} else {
  console.error(result.error.format());
}
```

#### Chess Engine API
**Location:** `/home/ryankhetlyr/Development/kings-cooking/src/lib/chess/KingsChessEngine.ts`

**Critical Methods:**
```typescript
// Get legal moves for a piece
const moves = engine.getLegalMoves([0, 0]);
// Returns: [[0,1], [1,0], 'off_board', ...]

// Make a move
const result = engine.makeMove([0, 0], [1, 1]);
if (result.success) {
  const newState = engine.getGameState();
}

// Check game end
if (engine.isGameOver()) {
  const winner = engine.getWinner(); // 'white' | 'black' | null
}
```

#### URL State Hook
**Location:** `/home/ryankhetlyr/Development/kings-cooking/src/hooks/useUrlState.ts`

**API:**
```typescript
const { payload, error, updateUrl, copyShareUrl } = useUrlState({
  debounceMs: 300,
  onError: (err) => console.error(err),
});

// Update URL with move
updateUrl({
  type: 'delta',
  move: { from: [0,0], to: [1,1] },
  turn: 1,
  checksum: 'abc123',
});

// Copy to clipboard
const success = await copyShareUrl();
```

### External Documentation

#### React 19 Official Docs
- **React Element Types**: https://react.dev/reference/react/ReactElement
- **useCallback**: https://react.dev/reference/react/useCallback
- **useMemo**: https://react.dev/reference/react/useMemo
- **useEffect cleanup**: https://react.dev/reference/react/useEffect#cleanup

#### Accessibility (WCAG 2.1 AA)
- **ARIA Grid Pattern**: https://www.w3.org/WAI/ARIA/apg/patterns/grid/
- **Keyboard Navigation**: https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/
- **Focus Management**: https://www.w3.org/WAI/ARIA/apg/practices/focus-management/
- **Color Contrast**: https://webaim.org/resources/contrastchecker/

#### Testing Resources
- **React Testing Library**: https://testing-library.com/docs/react-testing-library/intro/
- **User Event**: https://testing-library.com/docs/user-event/intro
- **Vitest Coverage**: https://vitest.dev/guide/coverage.html

#### Focus Management
- **focus-trap-react**: https://github.com/focus-trap/focus-trap-react
- **Modal Dialog Pattern**: https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/

### PRD References

**Location:** `/home/ryankhetlyr/Development/kings-cooking/PRD.md`

**Critical Sections:**
- **Lines 36-178**: Game rules (movement, capture, victory)
- **Lines 254-300**: Component structure overview
- **Lines 772-850**: User stories (name collection, URL sharing)
- **Lines 1198-1234**: Phase 4 task breakdown
- **Lines 1762-1795**: Future enhancements (v2.0+ scope)

### Common Pitfalls (Cross-Reference)

**From CLAUDE-REACT.md:**
1. ❌ Using `JSX.Element` instead of `ReactElement`
2. ❌ Inline event handlers (creates new function every render)
3. ❌ Missing memoization for expensive calculations
4. ❌ Testing implementation details instead of user behavior
5. ❌ Skipping Zod validation for external data

**From NAME_COLLECTION_PATTERN.md:**
1. ❌ Using `prompt()` for name collection
2. ❌ Not trimming whitespace in form inputs
3. ❌ Forgetting localStorage persistence

**From DARK_MODE_GUIDE.md:**
1. ❌ Using pure black (#000000) - causes eye strain
2. ❌ Forgetting to test both light and dark modes
3. ❌ Insufficient contrast ratios

---

## 📚 ALL NEEDED CONTEXT

### 1. Existing Codebase Patterns (Phase 3)

#### Component Pattern from HistoryViewer.tsx
```typescript
/**
 * @fileoverview GameBoard component for interactive chess gameplay
 * @module components/game/GameBoard
 *
 * Displays 3x3 board with drag-and-drop, keyboard navigation, and accessibility.
 * Integrates with KingsChessEngine for move validation and game logic.
 */

import { useState, useCallback, useMemo, type ReactElement } from 'react';
import type { GameState, Position } from '@/lib/validation/schemas';

interface GameBoardProps {
  /** JSDoc comment for each prop */
  gameState: GameState;
}

/**
 * GameBoard with complete accessibility.
 *
 * Features:
 * - Click-to-move interaction
 * - Keyboard navigation (Tab, Arrow keys, Enter)
 * - Screen reader support (ARIA)
 * - Touch-friendly (44x44px tap targets)
 *
 * @component
 * @example
 * ```tsx
 * <GameBoard
 *   gameState={currentGame}
 *   onMove={(from, to) => handleMove(from, to)}
 * />
 * ```
 */
export const GameBoard = ({ gameState }: GameBoardProps): ReactElement => {
  // Implementation
  return <div>Board</div>;
};
```

#### Testing Pattern from HistoryViewer.test.tsx
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GameBoard } from './GameBoard';

// Helper functions
const createMockGameState = (): GameState => ({ /* ... */ });

describe('GameBoard', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
  });

  describe('Basic Rendering', () => {
    it('should render 3x3 grid', () => {
      const state = createMockGameState();
      render(<GameBoard gameState={state} onMove={vi.fn()} />);

      const cells = screen.getAllByRole('gridcell');
      expect(cells).toHaveLength(9);
    });
  });

  describe('Keyboard Navigation', () => {
    it('should navigate cells with arrow keys', async () => {
      // Test implementation
    });
  });

  describe('Accessibility', () => {
    it('should have role="grid"', () => {
      const state = createMockGameState();
      render(<GameBoard gameState={state} onMove={vi.fn()} />);

      expect(screen.getByRole('grid')).toBeInTheDocument();
    });
  });
});
```

#### Modal Pattern from HistoryComparisonModal.tsx
```typescript
import FocusTrap from 'focus-trap-react';

// For modals (HandoffScreen, VictoryScreen)
const Modal = ({ isOpen, onClose }: ModalProps): ReactElement | null => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
    return undefined;
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <FocusTrap focusTrapOptions={{
      initialFocus: '#modal-close',
      clickOutsideDeactivates: true,
      escapeDeactivates: true,
      allowOutsideClick: true,
      onDeactivate: onClose,
    }}>
      <div className="modal-backdrop" onClick={onClose}>
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal content */}
        </div>
      </div>
    </FocusTrap>
  );
};
```

### 2. Chess Engine Integration

#### From src/lib/chess/KingsChessEngine.ts
```typescript
import { KingsChessEngine } from '@/lib/chess/KingsChessEngine';

// Create engine instance
const engine = new KingsChessEngine();

// Get legal moves for a piece
const legalMoves = engine.getLegalMoves([0, 0]); // [[0,1], [1,0], 'off_board']

// Make a move
const result = engine.makeMove([0, 0], [1, 1]);
if (result.success) {
  const newState = engine.getGameState();
  // Update UI
} else {
  console.error(result.error); // "Invalid move: ..."
}

// Check if game is over
if (engine.isGameOver()) {
  const winner = engine.getWinner(); // 'white' | 'black' | null
}
```

### 3. URL State Integration

#### From src/hooks/useUrlState.ts
```typescript
import { useUrlState } from '@/hooks/useUrlState';

const GameContainer = (): ReactElement => {
  const { payload, error, updateUrl, copyShareUrl } = useUrlState({
    debounceMs: 300,
    onError: (err) => console.error(err),
  });

  // On move, update URL
  const handleMove = (from: Position, to: Position) => {
    const deltaPayload: DeltaPayload = {
      type: 'delta',
      move: { from, to },
      turn: gameState.currentTurn + 1,
      checksum: calculateChecksum(gameState),
    };
    updateUrl(deltaPayload);
  };

  // Copy share URL
  const handleShare = async () => {
    const success = await copyShareUrl();
    if (success) toast.success('Link copied!');
  };
};
```

### 4. Validation Schemas

#### From src/lib/validation/schemas.ts
```typescript
import { GameStateSchema, PositionSchema } from '@/lib/validation/schemas';

// Validate game state from URL or localStorage
const result = GameStateSchema.safeParse(data);
if (result.success) {
  const gameState = result.data; // Typed as GameState
} else {
  console.error(result.error.format());
}

// Validate position
const pos = PositionSchema.parse([0, 0]); // [number, number] | null
```

### 5. Responsive Design Breakpoints

```css
/* Mobile-first approach */
.game-board {
  /* Base styles for 320px+ */
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2px;
  max-width: 100%;
}

/* Tablet: 768px+ */
@media (min-width: 768px) {
  .game-board {
    max-width: 600px;
    gap: 4px;
  }
}

/* Desktop: 1024px+ */
@media (min-width: 1024px) {
  .game-board {
    max-width: 800px;
    gap: 8px;
  }
}
```

### 6. Dark Mode Implementation

```css
:root {
  /* Light mode (default) */
  --bg-primary: #ffffff;
  --bg-board-light: #f0d9b5;
  --bg-board-dark: #b58863;
  --text-primary: #1a1a1a;
  --border-focus: #4a9eff;
}

@media (prefers-color-scheme: dark) {
  :root {
    /* Dark mode */
    --bg-primary: #1a1a1a;
    --bg-board-light: #4a4a4a;
    --bg-board-dark: #2a2a2a;
    --text-primary: #e0e0e0;
    --border-focus: #66b3ff;
  }
}

/* Manual toggle */
[data-theme="dark"] {
  --bg-primary: #1a1a1a;
  /* ... */
}
```

### 7. Accessibility Best Practices

#### Keyboard Navigation Example
```typescript
const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
  const currentPos = selectedPosition;
  if (!currentPos) return;

  let newPos: Position = currentPos;

  switch (event.key) {
    case 'ArrowUp':
      event.preventDefault();
      newPos = [Math.max(0, currentPos[0] - 1), currentPos[1]];
      break;
    case 'ArrowDown':
      event.preventDefault();
      newPos = [Math.min(2, currentPos[0] + 1), currentPos[1]];
      break;
    case 'ArrowLeft':
      event.preventDefault();
      newPos = [currentPos[0], Math.max(0, currentPos[1] - 1)];
      break;
    case 'ArrowRight':
      event.preventDefault();
      newPos = [currentPos[0], Math.min(2, currentPos[1] + 1)];
      break;
    case 'Enter':
    case ' ':
      event.preventDefault();
      handleCellClick(currentPos);
      break;
    case 'Escape':
      event.preventDefault();
      setSelectedPosition(null);
      break;
    default:
      return;
  }

  setSelectedPosition(newPos);
};
```

#### ARIA Labels Example
```tsx
<div
  role="gridcell"
  aria-label={`${piece?.type ?? 'Empty'} ${piece?.owner ?? ''} at ${positionToNotation(pos)}`}
  aria-pressed={isSelected}
  aria-describedby={legalMoves.length > 0 ? `moves-${pos}` : undefined}
  tabIndex={isSelected ? 0 : -1}
>
  {piece && <span aria-hidden="true">{getPieceUnicode(piece)}</span>}
</div>
```

### 8. Common Gotchas & Pitfalls

#### ❌ DON'T: Use JSX.Element
```typescript
// WRONG - will fail ESLint
function GameBoard(): JSX.Element {
  return <div>Board</div>;
}
```

#### ✅ DO: Use ReactElement
```typescript
// CORRECT
import { ReactElement } from 'react';

function GameBoard(): ReactElement {
  return <div>Board</div>;
}
```

#### ❌ DON'T: Mutate game state directly
```typescript
// WRONG - violates immutability
const handleMove = () => {
  gameState.board[0][0] = null; // Mutation!
  setGameState(gameState);
};
```

#### ✅ DO: Use engine methods
```typescript
// CORRECT
const handleMove = (from: Position, to: Position) => {
  const result = engine.makeMove(from, to);
  if (result.success) {
    setGameState(engine.getGameState()); // New object
  }
};
```

#### ❌ DON'T: Skip memoization for expensive calculations
```typescript
// WRONG - recalculates every render
const legalMoves = engine.getLegalMoves(selectedPosition);
```

#### ✅ DO: Memoize expensive calculations
```typescript
// CORRECT
const legalMoves = useMemo(() => {
  if (!selectedPosition) return [];
  return engine.getLegalMoves(selectedPosition);
}, [selectedPosition, gameState.currentTurn]);
```

#### ❌ DON'T: Use inline event handlers
```typescript
// WRONG - creates new function every render
<button onClick={() => handleMove(from, to)}>Move</button>
```

#### ✅ DO: Memoize event handlers
```typescript
// CORRECT
const handleClick = useCallback(() => {
  handleMove(from, to);
}, [from, to, handleMove]);

return <button onClick={handleClick}>Move</button>;
```

### 9. Testing Gotchas

#### ❌ DON'T: Test implementation details
```typescript
// WRONG - testing internal state
it('should set selectedPosition state', () => {
  wrapper.find('button').simulate('click');
  expect(wrapper.state('selectedPosition')).toEqual([0, 0]);
});
```

#### ✅ DO: Test user-visible behavior
```typescript
// CORRECT - testing what user sees
it('should highlight selected piece', async () => {
  render(<GameBoard {...props} />);
  const cell = screen.getByLabelText(/Rook at A1/i);

  await user.click(cell);

  expect(cell).toHaveClass('selected');
  expect(cell).toHaveAttribute('aria-pressed', 'true');
});
```

### 10. Unicode Chess Pieces

```typescript
const PIECE_UNICODE: Record<PieceType, { white: string; black: string }> = {
  rook: { white: '♜', black: '♖' },
  knight: { white: '♞', black: '♘' },
  bishop: { white: '♝', black: '♗' },
};

function getPieceUnicode(piece: Piece): string {
  return PIECE_UNICODE[piece.type][piece.owner];
}
```

---

## 🏗️ IMPLEMENTATION BLUEPRINT

### Pre-Implementation Checklist

**BEFORE writing any code, ensure you have:**
- [ ] Read CLAUDE-REACT.md (954 lines) - React 19 patterns, testing, accessibility
- [ ] Read NAME_COLLECTION_PATTERN.md - NameForm implementation reference
- [ ] Read DARK_MODE_GUIDE.md - Dark mode color palette and testing
- [ ] Reviewed HistoryViewer.tsx (355 lines) - Component structure example
- [ ] Reviewed HistoryViewer.test.tsx (435 lines) - Testing patterns
- [ ] Reviewed useUrlState.ts (299 lines) - URL state integration
- [ ] Reviewed KingsChessEngine.ts API - getLegalMoves(), makeMove(), isGameOver()
- [ ] Set up dev environment: `pnpm install && pnpm dev`
- [ ] Run existing tests to verify setup: `pnpm test`

**Quick Reference During Implementation:**
- 🎨 **Colors**: Light #f0d9b5/#b58863, Dark #4a4a4a/#2a2a2a (see DARK_MODE_GUIDE.md)
- ⌨️ **Keys**: Tab (focus), Arrow (navigate), Enter (select), Escape (cancel)
- ♿ **ARIA**: role="grid/gridcell", aria-label, aria-pressed, aria-describedby
- 🧪 **Tests**: userEvent.setup(), screen.getByRole(), expect().toHaveAttribute()
- 📦 **Validation**: GameStateSchema.safeParse(), PositionSchema.parse()

---

### Phase 4A: Core Game Board (Week 1)

#### Task 1.1: GameCell Component (2-3 hours)
**File:** `src/components/game/GameCell.tsx`

```typescript
/**
 * @fileoverview Individual chess board cell with piece rendering
 * @module components/game/GameCell
 */

import { type ReactElement } from 'react';
import type { Piece, Position } from '@/lib/validation/schemas';

interface GameCellProps {
  /** Position on board [row, col] */
  position: Position;
  /** Piece occupying this cell (null if empty) */
  piece: Piece | null;
  /** Is this cell selected? */
  isSelected: boolean;
  /** Is this a legal move destination? */
  isLegalMove: boolean;
  /** Was this cell part of the last move? */
  isLastMove: boolean;
  /** Click handler */
  onClick: (position: Position) => void;
  /** Is it this player's turn? */
  disabled?: boolean;
}

/**
 * Renders a single chess board cell.
 *
 * States: empty, occupied, selected, legal move, last move
 * Interactions: click to select/move
 * Accessibility: role="gridcell", aria-label, keyboard navigation
 *
 * @component
 */
export const GameCell = ({
  position,
  piece,
  isSelected,
  isLegalMove,
  isLastMove,
  onClick,
  disabled = false,
}: GameCellProps): ReactElement => {
  // 1. Determine cell color (light/dark square)
  const [row, col] = position ?? [0, 0];
  const isLightSquare = (row + col) % 2 === 0;

  // 2. Build CSS classes
  const cellClasses = [
    'game-cell',
    isLightSquare ? 'light-square' : 'dark-square',
    isSelected && 'selected',
    isLegalMove && 'legal-move',
    isLastMove && 'last-move',
    disabled && 'disabled',
  ].filter(Boolean).join(' ');

  // 3. Format position notation (A1, B2, C3)
  const notation = position
    ? `${String.fromCharCode(65 + col)}${row + 1}`
    : '';

  // 4. Build ARIA label
  const ariaLabel = piece
    ? `${piece.owner} ${piece.type} at ${notation}`
    : `Empty square ${notation}`;

  // 5. Handle click
  const handleClick = () => {
    if (!disabled && position) {
      onClick(position);
    }
  };

  // 6. Get piece unicode
  const pieceChar = piece ? getPieceUnicode(piece) : '';

  return (
    <div
      role="gridcell"
      className={cellClasses}
      aria-label={ariaLabel}
      aria-pressed={isSelected}
      onClick={handleClick}
      tabIndex={isSelected ? 0 : -1}
    >
      {pieceChar && (
        <span className="piece" aria-hidden="true">
          {pieceChar}
        </span>
      )}
      {isLegalMove && <span className="move-indicator" aria-hidden="true" />}
    </div>
  );
};

// Helper: Unicode piece lookup
const PIECE_UNICODE: Record<string, { white: string; black: string }> = {
  rook: { white: '♜', black: '♖' },
  knight: { white: '♞', black: '♘' },
  bishop: { white: '♝', black: '♗' },
};

function getPieceUnicode(piece: Piece): string {
  return PIECE_UNICODE[piece.type][piece.owner];
}
```

**CSS Module:** `src/components/game/GameCell.module.css`
```css
.game-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 1;
  min-height: 44px; /* Touch target */
  cursor: pointer;
  position: relative;
  transition: background-color 0.2s;
}

.light-square {
  background-color: var(--bg-board-light);
}

.dark-square {
  background-color: var(--bg-board-dark);
}

.selected {
  background-color: var(--bg-selected);
  outline: 2px solid var(--border-focus);
  outline-offset: -2px;
}

.legal-move {
  background-color: var(--bg-legal-move);
}

.legal-move .move-indicator {
  position: absolute;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background-color: var(--color-success);
  opacity: 0.7;
}

.last-move {
  background-color: var(--bg-last-move);
}

.disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.piece {
  font-size: 2rem;
  line-height: 1;
}

/* Responsive sizing */
@media (min-width: 768px) {
  .piece {
    font-size: 3rem;
  }
}

/* Focus indicator */
.game-cell:focus {
  outline: 2px solid var(--border-focus);
  outline-offset: -2px;
  z-index: 1;
}

/* Dark mode overrides */
@media (prefers-color-scheme: dark) {
  .light-square {
    background-color: var(--bg-board-light-dark);
  }

  .dark-square {
    background-color: var(--bg-board-dark-dark);
  }
}
```

**Tests:** `src/components/game/GameCell.test.tsx`
```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GameCell } from './GameCell';
import type { Piece } from '@/lib/validation/schemas';

const mockPiece: Piece = {
  type: 'rook',
  owner: 'white',
  position: [0, 0],
  moveCount: 0,
  id: crypto.randomUUID(),
};

describe('GameCell', () => {
  it('should render empty cell', () => {
    render(
      <GameCell
        position={[0, 0]}
        piece={null}
        isSelected={false}
        isLegalMove={false}
        isLastMove={false}
        onClick={vi.fn()}
      />
    );

    expect(screen.getByRole('gridcell')).toHaveTextContent('');
    expect(screen.getByLabelText(/Empty square A1/i)).toBeInTheDocument();
  });

  it('should render piece with unicode character', () => {
    render(
      <GameCell
        position={[0, 0]}
        piece={mockPiece}
        isSelected={false}
        isLegalMove={false}
        isLastMove={false}
        onClick={vi.fn()}
      />
    );

    expect(screen.getByLabelText(/white rook at A1/i)).toBeInTheDocument();
    expect(screen.getByText('♜')).toBeInTheDocument();
  });

  it('should call onClick when clicked', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(
      <GameCell
        position={[1, 2]}
        piece={null}
        isSelected={false}
        isLegalMove={false}
        isLastMove={false}
        onClick={onClick}
      />
    );

    await user.click(screen.getByRole('gridcell'));

    expect(onClick).toHaveBeenCalledWith([1, 2]);
  });

  it('should show selected state with aria-pressed', () => {
    render(
      <GameCell
        position={[0, 0]}
        piece={mockPiece}
        isSelected={true}
        isLegalMove={false}
        isLastMove={false}
        onClick={vi.fn()}
      />
    );

    const cell = screen.getByRole('gridcell');
    expect(cell).toHaveAttribute('aria-pressed', 'true');
    expect(cell).toHaveClass('selected');
  });

  it('should show legal move indicator', () => {
    render(
      <GameCell
        position={[1, 1]}
        piece={null}
        isSelected={false}
        isLegalMove={true}
        isLastMove={false}
        onClick={vi.fn()}
      />
    );

    expect(screen.getByRole('gridcell')).toHaveClass('legal-move');
  });

  it('should not call onClick when disabled', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(
      <GameCell
        position={[0, 0]}
        piece={null}
        isSelected={false}
        isLegalMove={false}
        isLastMove={false}
        onClick={onClick}
        disabled={true}
      />
    );

    await user.click(screen.getByRole('gridcell'));

    expect(onClick).not.toHaveBeenCalled();
  });
});
```

**Validation:**
```bash
# Run tests
pnpm test GameCell.test.tsx

# Check coverage (must be 80%+)
pnpm test:coverage -- GameCell

# TypeScript check
pnpm run check:types

# Lint
pnpm run check:lint
```

---

#### Task 1.2: GameBoard Component (4-6 hours)
**File:** `src/components/game/GameBoard.tsx`

```typescript
/**
 * @fileoverview Interactive 3x3 chess board with move selection
 * @module components/game/GameBoard
 */

import { useState, useCallback, useMemo, type ReactElement } from 'react';
import type { GameState, Position, Move } from '@/lib/validation/schemas';
import { KingsChessEngine } from '@/lib/chess/KingsChessEngine';
import { GameCell } from './GameCell';

interface GameBoardProps {
  /** Current game state */
  gameState: GameState;
  /** Callback when move is completed */
  onMove: (from: Position, to: Position) => void;
  /** Is it this player's turn? */
  isPlayerTurn?: boolean;
}

/**
 * Interactive 3x3 chess board with click-to-move.
 *
 * Features:
 * - Click piece → highlights legal moves → click destination → move confirmed
 * - Keyboard navigation with Tab and Arrow keys
 * - Full screen reader support with ARIA
 * - Responsive design (mobile, tablet, desktop)
 * - Dark mode support
 *
 * @component
 * @example
 * ```tsx
 * <GameBoard
 *   gameState={currentGame}
 *   onMove={(from, to) => handleMove(from, to)}
 *   isPlayerTurn={true}
 * />
 * ```
 */
export const GameBoard = ({
  gameState,
  onMove,
  isPlayerTurn = true,
}: GameBoardProps): ReactElement => {
  // State: Currently selected position
  const [selectedPosition, setSelectedPosition] = useState<Position>(null);

  // Chess engine instance (memoized)
  const engine = useMemo(() => {
    const eng = new KingsChessEngine();
    eng.loadGameState(gameState);
    return eng;
  }, [gameState]);

  // Get legal moves for selected piece (memoized)
  const legalMoves = useMemo(() => {
    if (!selectedPosition) return [];
    return engine.getLegalMoves(selectedPosition);
  }, [selectedPosition, engine, gameState.currentTurn]);

  // Get last move positions for highlighting
  const lastMove = gameState.moveHistory[gameState.moveHistory.length - 1];

  // Handle cell click
  const handleCellClick = useCallback((position: Position) => {
    if (!position || !isPlayerTurn) return;

    const piece = gameState.board[position[0]]?.[position[1]];

    // If no piece selected yet
    if (!selectedPosition) {
      // Only select pieces owned by current player
      if (piece && piece.owner === gameState.currentPlayer) {
        setSelectedPosition(position);
      }
      return;
    }

    // If clicking same piece, deselect
    if (
      selectedPosition[0] === position[0] &&
      selectedPosition[1] === position[1]
    ) {
      setSelectedPosition(null);
      return;
    }

    // Check if this is a legal move
    const isLegal = legalMoves.some((move) => {
      if (move === 'off_board') return false;
      return move[0] === position[0] && move[1] === position[1];
    });

    if (isLegal) {
      // Make the move
      onMove(selectedPosition, position);
      setSelectedPosition(null);
    } else {
      // Select different piece if it's current player's
      if (piece && piece.owner === gameState.currentPlayer) {
        setSelectedPosition(position);
      }
    }
  }, [selectedPosition, legalMoves, gameState, isPlayerTurn, onMove]);

  // Keyboard navigation
  const handleKeyDown = useCallback((
    event: React.KeyboardEvent<HTMLDivElement>,
    currentPos: Position
  ) => {
    if (!currentPos) return;

    let newPos: Position = currentPos;

    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault();
        newPos = [Math.max(0, currentPos[0] - 1), currentPos[1]];
        break;
      case 'ArrowDown':
        event.preventDefault();
        newPos = [Math.min(2, currentPos[0] + 1), currentPos[1]];
        break;
      case 'ArrowLeft':
        event.preventDefault();
        newPos = [currentPos[0], Math.max(0, currentPos[1] - 1)];
        break;
      case 'ArrowRight':
        event.preventDefault();
        newPos = [currentPos[0], Math.min(2, currentPos[1] + 1)];
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        handleCellClick(currentPos);
        return;
      case 'Escape':
        event.preventDefault();
        setSelectedPosition(null);
        return;
      default:
        return;
    }

    setSelectedPosition(newPos);
  }, [handleCellClick]);

  // Helper: Check if position is a legal move
  const isLegalMove = useCallback((position: Position): boolean => {
    if (!position) return false;
    return legalMoves.some((move) => {
      if (move === 'off_board') return false;
      return move[0] === position[0] && move[1] === position[1];
    });
  }, [legalMoves]);

  // Helper: Check if position was part of last move
  const isLastMovePosition = useCallback((position: Position): boolean => {
    if (!position || !lastMove) return false;

    return (
      (lastMove.from[0] === position[0] && lastMove.from[1] === position[1]) ||
      (lastMove.to !== 'off_board' &&
        lastMove.to[0] === position[0] &&
        lastMove.to[1] === position[1])
    );
  }, [lastMove]);

  return (
    <div className="game-board-container">
      <div
        role="grid"
        className="game-board"
        aria-label="Chess board, 3 by 3 grid"
      >
        {gameState.board.map((row, rowIndex) => (
          <div key={rowIndex} role="row" className="board-row">
            {row.map((piece, colIndex) => {
              const position: Position = [rowIndex, colIndex];
              const isSelected =
                selectedPosition &&
                selectedPosition[0] === rowIndex &&
                selectedPosition[1] === colIndex;

              return (
                <GameCell
                  key={`${rowIndex}-${colIndex}`}
                  position={position}
                  piece={piece}
                  isSelected={Boolean(isSelected)}
                  isLegalMove={isLegalMove(position)}
                  isLastMove={isLastMovePosition(position)}
                  onClick={handleCellClick}
                  disabled={!isPlayerTurn}
                />
              );
            })}
          </div>
        ))}
      </div>

      {/* Screen reader announcements */}
      <div className="sr-only" role="status" aria-live="polite">
        {selectedPosition && (
          `Selected ${
            gameState.board[selectedPosition[0]]?.[selectedPosition[1]]?.type ?? 'piece'
          } at ${String.fromCharCode(65 + selectedPosition[1])}${selectedPosition[0] + 1}.
          ${legalMoves.length} legal moves available.`
        )}
      </div>
    </div>
  );
};
```

**CSS:** `src/components/game/GameBoard.module.css`
```css
.game-board-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem;
}

.game-board {
  display: grid;
  grid-template-rows: repeat(3, 1fr);
  gap: 0;
  border: 2px solid var(--border-color);
  max-width: 100%;
  width: 100%;
  aspect-ratio: 1;
}

.board-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0;
}

/* Tablet */
@media (min-width: 768px) {
  .game-board {
    max-width: 600px;
  }
}

/* Desktop */
@media (min-width: 1024px) {
  .game-board {
    max-width: 800px;
  }
}

/* Screen reader only */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

**Tests:** `src/components/game/GameBoard.test.tsx`
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GameBoard } from './GameBoard';
import type { GameState } from '@/lib/validation/schemas';

// Helper to create mock game state
const createMockGameState = (): GameState => ({
  version: '1.0.0',
  gameId: crypto.randomUUID() as never,
  board: [
    [
      { type: 'rook', owner: 'white', position: [0, 0], moveCount: 0, id: crypto.randomUUID() },
      null,
      null,
    ],
    [
      null,
      null,
      null,
    ],
    [
      null,
      null,
      { type: 'rook', owner: 'black', position: [2, 2], moveCount: 0, id: crypto.randomUUID() },
    ],
  ],
  whiteCourt: [],
  blackCourt: [],
  capturedWhite: [],
  capturedBlack: [],
  currentTurn: 0,
  currentPlayer: 'white',
  whitePlayer: { id: crypto.randomUUID() as never, name: 'Player 1' },
  blackPlayer: { id: crypto.randomUUID() as never, name: 'Player 2' },
  status: 'playing',
  winner: null,
  moveHistory: [],
  checksum: 'test-checksum',
});

describe('GameBoard', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
  });

  describe('Rendering', () => {
    it('should render 3x3 grid', () => {
      const state = createMockGameState();
      render(<GameBoard gameState={state} onMove={vi.fn()} />);

      expect(screen.getByRole('grid')).toBeInTheDocument();
      expect(screen.getAllByRole('gridcell')).toHaveLength(9);
    });

    it('should render pieces in correct positions', () => {
      const state = createMockGameState();
      render(<GameBoard gameState={state} onMove={vi.fn()} />);

      expect(screen.getByLabelText(/white rook at A1/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/black rook at C3/i)).toBeInTheDocument();
    });
  });

  describe('Move Selection', () => {
    it('should select piece when clicked', async () => {
      const state = createMockGameState();
      render(<GameBoard gameState={state} onMove={vi.fn()} isPlayerTurn={true} />);

      const whiteRook = screen.getByLabelText(/white rook at A1/i);
      await user.click(whiteRook);

      expect(whiteRook).toHaveAttribute('aria-pressed', 'true');
    });

    it('should highlight legal moves when piece selected', async () => {
      const state = createMockGameState();
      render(<GameBoard gameState={state} onMove={vi.fn()} isPlayerTurn={true} />);

      const whiteRook = screen.getByLabelText(/white rook at A1/i);
      await user.click(whiteRook);

      // Rook can move to A2, A3, B1, C1
      const legalCells = screen.getAllByRole('gridcell').filter(cell =>
        cell.classList.contains('legal-move')
      );
      expect(legalCells.length).toBeGreaterThan(0);
    });

    it('should call onMove when legal move clicked', async () => {
      const state = createMockGameState();
      const onMove = vi.fn();
      render(<GameBoard gameState={state} onMove={onMove} isPlayerTurn={true} />);

      const whiteRook = screen.getByLabelText(/white rook at A1/i);
      await user.click(whiteRook);

      const emptyCell = screen.getByLabelText(/Empty square A2/i);
      await user.click(emptyCell);

      expect(onMove).toHaveBeenCalledWith([0, 0], [1, 0]);
    });

    it('should deselect when same piece clicked twice', async () => {
      const state = createMockGameState();
      render(<GameBoard gameState={state} onMove={vi.fn()} isPlayerTurn={true} />);

      const whiteRook = screen.getByLabelText(/white rook at A1/i);
      await user.click(whiteRook);
      expect(whiteRook).toHaveAttribute('aria-pressed', 'true');

      await user.click(whiteRook);
      expect(whiteRook).toHaveAttribute('aria-pressed', 'false');
    });

    it('should not select opponent pieces', async () => {
      const state = createMockGameState();
      render(<GameBoard gameState={state} onMove={vi.fn()} isPlayerTurn={true} />);

      const blackRook = screen.getByLabelText(/black rook at C3/i);
      await user.click(blackRook);

      expect(blackRook).toHaveAttribute('aria-pressed', 'false');
    });
  });

  describe('Keyboard Navigation', () => {
    it('should navigate with arrow keys', async () => {
      const state = createMockGameState();
      render(<GameBoard gameState={state} onMove={vi.fn()} isPlayerTurn={true} />);

      const whiteRook = screen.getByLabelText(/white rook at A1/i);
      await user.click(whiteRook);

      // TODO: Test arrow key navigation
      // This requires implementing keyboard event simulation
    });

    it('should deselect on Escape key', async () => {
      const state = createMockGameState();
      render(<GameBoard gameState={state} onMove={vi.fn()} isPlayerTurn={true} />);

      const whiteRook = screen.getByLabelText(/white rook at A1/i);
      await user.click(whiteRook);
      expect(whiteRook).toHaveAttribute('aria-pressed', 'true');

      await user.keyboard('{Escape}');
      expect(whiteRook).toHaveAttribute('aria-pressed', 'false');
    });
  });

  describe('Accessibility', () => {
    it('should have role="grid"', () => {
      const state = createMockGameState();
      render(<GameBoard gameState={state} onMove={vi.fn()} />);

      expect(screen.getByRole('grid')).toBeInTheDocument();
    });

    it('should announce selected piece to screen readers', async () => {
      const state = createMockGameState();
      render(<GameBoard gameState={state} onMove={vi.fn()} isPlayerTurn={true} />);

      const whiteRook = screen.getByLabelText(/white rook at A1/i);
      await user.click(whiteRook);

      const announcement = screen.getByRole('status');
      expect(announcement).toHaveTextContent(/Selected rook at A1/i);
    });
  });

  describe('Player Turn', () => {
    it('should disable moves when not player turn', async () => {
      const state = createMockGameState();
      const onMove = vi.fn();
      render(<GameBoard gameState={state} onMove={onMove} isPlayerTurn={false} />);

      const whiteRook = screen.getByLabelText(/white rook at A1/i);
      await user.click(whiteRook);

      expect(whiteRook).toHaveAttribute('aria-pressed', 'false');
      expect(onMove).not.toHaveBeenCalled();
    });
  });
});
```

**Validation:**
```bash
pnpm test GameBoard.test.tsx
pnpm test:coverage -- GameBoard
pnpm run check:types
pnpm run check:lint
```

---

### Phase 4B: Game Controls (Week 1-2)

#### Task 2.1: MoveConfirmButton Component
**File:** `src/components/game/MoveConfirmButton.tsx`
**Time:** 1-2 hours
**Details:** See implementation blueprint below

#### Task 2.2: NameForm Component
**File:** `src/components/game/NameForm.tsx`
**Time:** 2-3 hours
**Purpose:** Collect player names with validation and localStorage persistence
**Details:** See implementation blueprint below

#### Task 2.3: URLSharer Component
**File:** `src/components/game/URLSharer.tsx`
**Time:** 1-2 hours
**Details:** See implementation blueprint below

*(Continue with similar detail for each component...)*

---

### Phase 4C: Game Screens (Week 2-3)

#### Task 3.1: HandoffScreen Component
#### Task 3.2: VictoryScreen Component
#### Task 3.3: Dark Mode Implementation
#### Task 3.4: Integration Testing

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
# Run all component tests
pnpm test src/components/game/

# Check coverage (MUST be 80%+ for each file)
pnpm test:coverage -- src/components/game/

# Individual component coverage
pnpm test:coverage -- GameBoard
pnpm test:coverage -- GameCell
pnpm test:coverage -- MoveConfirmButton
```

### Level 3: Integration Tests
```bash
# Test complete game flow
pnpm test src/components/game/GameContainer.test.tsx

# Test with real chess engine (not mocked)
pnpm test:integration
```

### Level 4: Accessibility Testing
```bash
# Run axe-core accessibility tests (if configured)
pnpm test:a11y

# Manual checklist:
# [ ] Tab through entire interface
# [ ] Test with screen reader (NVDA/VoiceOver)
# [ ] Test keyboard-only navigation
# [ ] Verify color contrast with WebAIM tool
# [ ] Test with 200% browser zoom
```

### Level 5: Visual Regression Testing
```bash
# Test responsive breakpoints manually
# [ ] 320px width (iPhone SE)
# [ ] 768px width (iPad Mini)
# [ ] 1024px width (Desktop)
# [ ] 1920px width (Large desktop)

# Test dark mode
# [ ] System preference: light
# [ ] System preference: dark
# [ ] Manual toggle (if implemented)
```

### Level 6: End-to-End Testing
```bash
# Run Playwright E2E tests (when Phase 5 complete)
pnpm test:e2e

# Manual E2E checklist:
# [ ] Create new game
# [ ] Make 5 moves
# [ ] Copy share URL
# [ ] Open URL in new tab
# [ ] Verify game state matches
# [ ] Complete game to victory
# [ ] See victory screen
```

---

## 📊 SUCCESS METRICS

### Code Quality
- ✅ 0 TypeScript errors
- ✅ 0 ESLint warnings
- ✅ 80%+ test coverage on all files
- ✅ All components < 200 lines
- ✅ All functions have JSDoc comments

### Performance
- ✅ Board re-renders < 16ms (60fps)
- ✅ First Contentful Paint < 1.5s
- ✅ Time to Interactive < 3s
- ✅ Bundle size < 100KB (gzipped)

### Accessibility
- ✅ WCAG 2.1 AA compliance (verified with axe-core)
- ✅ Keyboard navigation works for all interactions
- ✅ Screen reader announces all game state changes
- ✅ Color contrast ratios ≥ 4.5:1 (text), ≥ 3:1 (UI components)
- ✅ Touch targets ≥ 44x44px

### Responsiveness
- ✅ Works on 320px width (iPhone SE)
- ✅ Works on 768px width (iPad)
- ✅ Works on 1024px+ width (Desktop)
- ✅ No horizontal scroll at any breakpoint
- ✅ Text readable at all sizes

### Browser Support
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ✅ iOS Safari 14+
- ✅ Chrome Android 90+

---

## 🚀 COMPLETION CHECKLIST

### Phase 4A: Core Game Board
- [ ] GameCell component implemented and tested (80%+ coverage)
- [ ] GameBoard component implemented and tested (80%+ coverage)
- [ ] Keyboard navigation working (Tab, Arrow keys, Enter, Escape)
- [ ] ARIA labels correct and comprehensive
- [ ] Responsive design working (320px, 768px, 1024px)
- [ ] Dark mode working for board components

### Phase 4B: Game Controls
- [ ] MoveConfirmButton implemented and tested
- [ ] NameForm implemented with validation, localStorage, and tests
- [ ] URLSharer implemented with clipboard API and tests
- [ ] All controls accessible via keyboard
- [ ] All controls work in dark mode
- [ ] XSS protection verified for player names

### Phase 4C: Game Screens
- [ ] HandoffScreen implemented with focus trap and tests
- [ ] VictoryScreen implemented with animations and tests
- [ ] Dark mode toggle implemented (system + manual)
- [ ] All modals accessible with Escape/click-outside close
- [ ] Integration tests passing

### Documentation
- [ ] All components have JSDoc comments
- [ ] README updated with component usage examples
- [ ] CHANGELOG updated with Phase 4 additions
- [ ] Storybook stories created (if using Storybook)

### Validation
- [ ] `pnpm run check:types` passes
- [ ] `pnpm run check:lint` passes
- [ ] `pnpm test` passes with 80%+ coverage
- [ ] Manual accessibility test completed
- [ ] Manual responsive test completed
- [ ] Manual browser compatibility test completed

---

## 🎯 DEFINITION OF DONE

Phase 4 is complete when:

1. ✅ All 8 components implemented with 80%+ test coverage
2. ✅ Game is playable end-to-end (create → play → victory)
3. ✅ Works perfectly on mobile (320px+), tablet (768px+), desktop (1024px+)
4. ✅ WCAG 2.1 AA compliant (keyboard, screen reader, color contrast)
5. ✅ Dark mode works throughout entire interface
6. ✅ Zero TypeScript errors, zero ESLint warnings
7. ✅ All validation commands pass
8. ✅ User can share game URL and continue in new tab
9. ✅ Victory screen appears when game ends
10. ✅ Code reviewed and merged to main branch

**Final Validation Command:**
```bash
pnpm run check:types && \
pnpm run check:lint && \
pnpm test:coverage && \
pnpm build
```

If all pass → **Phase 4 Complete! 🎉** → Ready for Phase 5 (Game Flow Integration)

---

## 📝 NOTES ON v1.0 SCOPE

**What's INCLUDED in Phase 4 (v1.0 MVP):**
- ✅ Fixed 3x3 board
- ✅ Fixed piece setup: Rook, Knight, Bishop (mirrored)
- ✅ Click-to-move interaction (best for mobile + accessibility)
- ✅ Player name collection (localStorage for hot-seat)
- ✅ URL sharing for correspondence mode
- ✅ Dark mode support
- ✅ Full accessibility (WCAG 2.1 AA)

**What's DEFERRED to v2.0+:**
- ❌ ModeSelector component (no mode selection needed)
- ❌ Variable board sizes (3x3 only)
- ❌ Random/Mirrored/Independent piece selection
- ❌ Additional pieces (pawns, queen, king)
- ❌ Drag-and-drop (click-to-move is simpler)
- ❌ Game replays with navigation
- ❌ AI opponent

**Rationale for Deferrals:**
- **Focus on MVP**: Get playable game shipped faster
- **Simpler testing**: Fixed setup reduces edge cases
- **Better mobile UX**: Click-to-move works universally
- **Easier to learn**: One setup to understand
- **Can add later**: Architecture supports future enhancements
