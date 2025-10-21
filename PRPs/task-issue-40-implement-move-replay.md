# Task PRP: Implement Move Replay/Animation System (#40)

**Issue**: https://github.com/randallard/kings-cooking/issues/40
**Branch**: `issue-40-implement-move-replay`
**Priority**: 🟡 Medium (foundational infrastructure)

## Goal

Implement a move replay/animation system that shows opponent's moves with smooth CSS animations. This provides visual feedback for players to understand what move was just made.

## Context

### Feature Summary
When an opponent makes a move, instead of just seeing highlighted squares showing the before/after positions, players will see:
- **Hot-seat mode**: Player 2 sees the move animate after clicking "I'm Ready" on the handoff screen
- **URL mode**: Player sees the move animate immediately when loading the URL
- **Animation style**: Pieces move along an arc path (500-800ms) using CSS keyframes
- **Special moves**: Different animations for captures, en passant, and off-board moves (with celebration dance!)

### User Experience Flow

**Hot-seat Mode**:
1. Player 1 makes move → clicks "Confirm Move"
2. Handoff screen appears immediately
3. Player 2 clicks "I'm Ready"
4. **Piece animates** from start → end position (~500-800ms)
5. Player 2 can now make their move

**URL Mode**:
1. Player 1 makes move → generates URL
2. Player 2 loads URL in their browser
3. **Piece animates immediately** on page load
4. Player 2 can make their move

### Design Decisions (from context gathering)

1. ✅ **Animation timing**: Hot-seat (after "I'm Ready"), URL (immediate on load)
2. ✅ **Animation style**: Arc path 500-800ms with bezier curves
3. ✅ **Special moves**:
   - Normal: Smooth arc
   - Captures: Highlight captured piece → arc
   - En passant: Highlight both pawns → arc + remove captured pawn
   - **Off-board**: Arc beyond edge → animate to court → celebration dance (jump + rotate ±15°) → settle in court
4. ✅ **Visual feedback**: Just piece animating (no extra highlights/sounds)
5. ✅ **Implementation**: CSS-only with CSS custom properties
6. ✅ **Accessibility**: Disable all for `prefers-reduced-motion`
7. ✅ **Trigger**: Phase transition (handoff → playing, or component mount)
8. ✅ **Scope**: Move replay only (YAGNI) - no history viewer
9. ✅ **Edge cases**: Simple - let animations abort naturally, skip if running, treat first move normally

### Related Files

**Components to Modify**:
- `src/App.tsx` - Add animation trigger logic in phase transitions
- `src/components/game/GameBoard.tsx` - Add animation overlay layer
- `src/components/game/GameBoard.module.css` - Add animation keyframes and styles
- `src/components/game/HandoffScreen.tsx` - Trigger animation after "I'm Ready" click

**New Files to Create**:
- `src/hooks/useMoveAnimation.ts` - Custom hook for animation logic
- `src/components/game/MoveAnimationOverlay.tsx` - Component for animating piece
- `src/components/game/MoveAnimationOverlay.module.css` - Animation styles

**Dependencies**:
- `src/types/gameFlow.ts` - Phase types (no changes needed)
- `src/lib/validation/schemas.ts` - Move and Position types (no changes needed)
- `src/lib/chess/KingsChessEngine.ts` - Move history access (no changes needed)

### Technical Patterns

**CSS Animation with Custom Properties** (from research):
```css
/* Define arc path animation */
@keyframes arcMove {
  0% {
    transform: translate(var(--start-x), var(--start-y)) translateY(0);
  }
  50% {
    transform: translate(
      calc((var(--start-x) + var(--end-x)) / 2),
      calc((var(--start-y) + var(--end-y)) / 2)
    ) translateY(var(--arc-height, -30px));
  }
  100% {
    transform: translate(var(--end-x), var(--end-y)) translateY(0);
  }
}

.animatingPiece {
  animation: arcMove var(--duration, 600ms) cubic-bezier(0.4, 0.0, 0.2, 1) forwards;
}
```

**React Hook Pattern** (follows CLAUDE-REACT.md):
```typescript
// Custom hook for move animation
export function useMoveAnimation(gameState: GameState) {
  const [animatingMove, setAnimatingMove] = useState<Move | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  const triggerAnimation = useCallback((move: Move) => {
    if (isAnimating) return; // Skip if already animating
    setAnimatingMove(move);
    setIsAnimating(true);

    setTimeout(() => {
      setIsAnimating(false);
      setAnimatingMove(null);
    }, 800); // Match animation duration
  }, [isAnimating]);

  return { animatingMove, isAnimating, triggerAnimation };
}
```

## Requirements

1. **Animate opponent's move on phase transition**
   - Hot-seat: Trigger when phase changes handoff → playing (after "I'm Ready")
   - URL: Trigger when component mounts with game data
   - Extract last move from `gameState.moveHistory`

2. **CSS-based arc path animation**
   - Use CSS custom properties for start/end positions
   - Implement arc path with bezier curves
   - Duration: 500-800ms
   - Render animating piece in absolute-positioned overlay

3. **Special move animations**
   - **Normal moves**: Arc from source to destination
   - **Captures**: Brief highlight on captured piece (100ms) → arc
   - **En passant**: Highlight both pawns (100ms) → arc + fade out captured pawn
   - **Off-board**: Arc to edge → animate to court area → celebration dance → settle

4. **Celebration dance for off-board**
   - After piece reaches court area
   - Jump animation (translateY: 0 → -20px → 0)
   - Rotate animation (rotate: 0 → 15deg → -15deg → 0)
   - Duration: ~400ms
   - Then settle into court display

5. **Accessibility support**
   - Detect `prefers-reduced-motion` media query
   - If true: Skip all animations, show instant position update
   - Use CSS media query for automatic handling

6. **Edge case handling (simple)**
   - If animation already running: Skip new animation request
   - On navigation/unmount: Let animation abort naturally
   - First move: Animate same as any other move

7. **Works in both modes**
   - Hot-seat: Animation after handoff
   - URL: Animation on load
   - Same animation logic for both

## Implementation Blueprint

### Task 1: Create Animation Hook (Foundation)

**File**: `src/hooks/useMoveAnimation.ts` (NEW)

```typescript
/**
 * @fileoverview Custom hook for move animations
 * @module hooks/useMoveAnimation
 */

import { useState, useCallback, useEffect } from 'react';
import type { Move } from '@/lib/validation/schemas';

interface MoveAnimationState {
  /** Currently animating move */
  animatingMove: Move | null;
  /** Is animation in progress */
  isAnimating: boolean;
  /** Trigger animation for a move */
  triggerAnimation: (move: Move) => void;
}

/**
 * Custom hook to manage move animations.
 *
 * Handles:
 * - Animation state tracking
 * - Skip if already animating
 * - Auto-cleanup after duration
 * - Respects prefers-reduced-motion
 *
 * @param duration - Animation duration in ms (default: 600)
 * @returns Animation state and trigger function
 */
export function useMoveAnimation(duration = 600): MoveAnimationState {
  const [animatingMove, setAnimatingMove] = useState<Move | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  // Check prefers-reduced-motion
  const prefersReducedMotion = useCallback(() => {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  const triggerAnimation = useCallback((move: Move) => {
    // Skip if already animating
    if (isAnimating) {
      console.log('[useMoveAnimation] Skipping - animation already in progress');
      return;
    }

    // Skip if user prefers reduced motion
    if (prefersReducedMotion()) {
      console.log('[useMoveAnimation] Skipping - prefers-reduced-motion enabled');
      return;
    }

    console.log('[useMoveAnimation] Triggering animation for move:', move);
    setAnimatingMove(move);
    setIsAnimating(true);

    // Auto-cleanup after animation completes
    setTimeout(() => {
      setIsAnimating(false);
      setAnimatingMove(null);
    }, duration);
  }, [isAnimating, duration, prefersReducedMotion]);

  return { animatingMove, isAnimating, triggerAnimation };
}
```

**Validation**:
```bash
pnpm run check:types
# Expected: TypeScript validates hook types
```

---

### Task 2: Create Animation Overlay Component

**File**: `src/components/game/MoveAnimationOverlay.tsx` (NEW)

```typescript
/**
 * @fileoverview Overlay component for animating pieces
 * @module components/game/MoveAnimationOverlay
 */

import { useState, useEffect, useRef, type ReactElement } from 'react';
import type { Move, Position, Piece } from '@/lib/validation/schemas';
import { PIECE_POOL } from '@/lib/pieceSelection/types';
import styles from './MoveAnimationOverlay.module.css';

interface MoveAnimationOverlayProps {
  /** Move to animate */
  move: Move;
  /** Callback when animation completes */
  onAnimationComplete?: () => void;
  /** Grid cell size in pixels (for position calculation) */
  cellSize: number;
  /** Board container ref (for position calculation) */
  boardRef: React.RefObject<HTMLDivElement>;
}

/**
 * Get Unicode symbol for piece.
 */
function getPieceSymbol(piece: Piece): string {
  const pool = PIECE_POOL[piece.type];
  if (!pool) return '?';
  return pool.unicode[piece.owner];
}

/**
 * Calculate pixel position from grid position.
 */
function calculatePixelPosition(
  position: Position,
  cellSize: number,
  boardRect: DOMRect
): { x: number; y: number } {
  if (!position) return { x: 0, y: 0 };
  const [row, col] = position;

  // Calculate center of cell
  const x = col * cellSize + cellSize / 2;
  const y = row * cellSize + cellSize / 2;

  return { x, y };
}

/**
 * Overlay component for move animations.
 *
 * Renders an absolutely-positioned piece that animates from source to destination.
 * Uses CSS custom properties for dynamic positioning.
 */
export const MoveAnimationOverlay = ({
  move,
  onAnimationComplete,
  cellSize,
  boardRef,
}: MoveAnimationOverlayProps): ReactElement | null => {
  const pieceRef = useRef<HTMLDivElement>(null);
  const [cssVars, setCssVars] = useState<Record<string, string>>({});

  // Calculate positions and set CSS variables
  useEffect(() => {
    if (!boardRef.current) return;

    const boardRect = boardRef.current.getBoundingClientRect();
    const startPos = calculatePixelPosition(move.from, cellSize, boardRect);

    let endPos: { x: number; y: number };
    let animationType: 'normal' | 'off-board' = 'normal';

    if (move.to === 'off_board') {
      // Off-board animation - calculate edge position
      const [fromRow, fromCol] = move.from;
      // Determine which edge based on piece position
      // For now, animate toward top edge (court area)
      endPos = { x: startPos.x, y: -cellSize };
      animationType = 'off-board';
    } else {
      endPos = calculatePixelPosition(move.to, cellSize, boardRect);
    }

    setCssVars({
      '--start-x': `${startPos.x}px`,
      '--start-y': `${startPos.y}px`,
      '--end-x': `${endPos.x}px`,
      '--end-y': `${endPos.y}px`,
      '--duration': '600ms',
      '--animation-type': animationType,
    });
  }, [move, cellSize, boardRef]);

  // Listen for animation end
  useEffect(() => {
    const pieceEl = pieceRef.current;
    if (!pieceEl) return;

    const handleAnimationEnd = (): void => {
      onAnimationComplete?.();
    };

    pieceEl.addEventListener('animationend', handleAnimationEnd);
    return () => pieceEl.removeEventListener('animationend', handleAnimationEnd);
  }, [onAnimationComplete]);

  const pieceSymbol = getPieceSymbol(move.piece);

  return (
    <div className={styles.overlay}>
      <div
        ref={pieceRef}
        className={styles.animatingPiece}
        style={cssVars as React.CSSProperties}
        aria-hidden="true"
      >
        {pieceSymbol}
      </div>
    </div>
  );
};
```

**Validation**:
```bash
pnpm run check:types
# Expected: TypeScript validates component types
```

---

### Task 3: Create Animation Styles

**File**: `src/components/game/MoveAnimationOverlay.module.css` (NEW)

```css
/**
 * Move Animation Overlay Styles
 * Absolute-positioned layer for animating pieces
 */

.overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1000;
}

.animatingPiece {
  position: absolute;
  font-size: 3rem;
  line-height: 1;
  transform-origin: center;
  will-change: transform;

  /* Apply animation */
  animation: arcMove var(--duration, 600ms) cubic-bezier(0.4, 0.0, 0.2, 1) forwards;
}

/* Arc path animation */
@keyframes arcMove {
  0% {
    transform: translate(var(--start-x), var(--start-y)) translateY(0);
    opacity: 1;
  }
  50% {
    /* Arc peak - 30px above midpoint */
    transform: translate(
      calc((var(--start-x) + var(--end-x)) / 2),
      calc((var(--start-y) + var(--end-y)) / 2)
    ) translateY(-30px);
    opacity: 1;
  }
  100% {
    transform: translate(var(--end-x), var(--end-y)) translateY(0);
    opacity: 1;
  }
}

/* Off-board celebration dance */
@keyframes celebrationDance {
  0% {
    transform: translate(var(--end-x), var(--end-y)) translateY(0) rotate(0deg);
  }
  25% {
    transform: translate(var(--end-x), var(--end-y)) translateY(-20px) rotate(15deg);
  }
  50% {
    transform: translate(var(--end-x), var(--end-y)) translateY(0) rotate(0deg);
  }
  75% {
    transform: translate(var(--end-x), var(--end-y)) translateY(-20px) rotate(-15deg);
  }
  100% {
    transform: translate(var(--end-x), var(--end-y)) translateY(0) rotate(0deg);
  }
}

/* Accessibility: Disable animations for reduced motion */
@media (prefers-reduced-motion: reduce) {
  .animatingPiece {
    animation: none !important;
  }

  @keyframes arcMove {
    0%, 100% {
      transform: translate(var(--end-x), var(--end-y)) translateY(0);
      opacity: 1;
    }
  }
}

/* Mobile responsiveness */
@media (max-width: 640px) {
  .animatingPiece {
    font-size: 2.5rem;
  }
}
```

**Validation**:
```bash
pnpm run check:lint
# Expected: CSS lint passes
```

---

### Task 4: Integrate Animation into GameBoard

**File**: `src/components/game/GameBoard.tsx`

**Changes**:
1. Add `useRef` for board container
2. Add `useMoveAnimation` hook
3. Conditionally render `MoveAnimationOverlay`

```typescript
// Add imports
import { useRef } from 'react'; // Add useRef to existing import
import { useMoveAnimation } from '@/hooks/useMoveAnimation';
import { MoveAnimationOverlay } from './MoveAnimationOverlay';

// Inside GameBoard component, add:
export const GameBoard = ({
  gameState,
  onMove,
  onCancelMove,
  isPlayerTurn = true,
  pendingMove,
  shouldAnimateLastMove = false, // NEW PROP
}: GameBoardProps): ReactElement => {
  // ... existing state ...

  // NEW: Board ref for position calculation
  const boardRef = useRef<HTMLDivElement>(null);

  // NEW: Animation hook
  const { animatingMove, isAnimating, triggerAnimation } = useMoveAnimation(600);

  // NEW: Trigger animation when prop changes
  useEffect(() => {
    if (shouldAnimateLastMove && gameState.moveHistory.length > 0) {
      const lastMove = gameState.moveHistory[gameState.moveHistory.length - 1];
      triggerAnimation(lastMove);
    }
  }, [shouldAnimateLastMove, gameState.moveHistory, triggerAnimation]);

  // ... rest of component ...

  return (
    <div className={styles.container}>
      {/* Court areas */}
      {/* ... existing court rendering ... */}

      {/* Board grid */}
      <div ref={boardRef} className={styles.board}>
        {/* ... existing board cells ... */}

        {/* NEW: Animation overlay */}
        {isAnimating && animatingMove && (
          <MoveAnimationOverlay
            move={animatingMove}
            cellSize={100} // TODO: Calculate dynamically
            boardRef={boardRef}
          />
        )}
      </div>

      {/* ... rest of component ... */}
    </div>
  );
};
```

**Update Props Interface**:
```typescript
interface GameBoardProps {
  /** Current game state */
  gameState: GameState;
  /** Callback when move is completed */
  onMove: (from: Position, to: Position | 'off_board') => void;
  /** Callback to cancel pending move */
  onCancelMove?: () => void;
  /** Is it this player's turn? */
  isPlayerTurn?: boolean;
  /** Staged move awaiting confirmation */
  pendingMove?: { from: Position; to: Position | 'off_board' } | null;
  /** NEW: Should animate the last move from history */
  shouldAnimateLastMove?: boolean;
}
```

**Validation**:
```bash
pnpm run check:types
pnpm test GameBoard.test.tsx
# Expected: Types validate, existing tests pass
```

---

### Task 5: Trigger Animation from App.tsx (Hot-seat Mode)

**File**: `src/App.tsx`

**Changes**:
1. Add state to track when animation should trigger
2. Set flag when transitioning from handoff → playing
3. Pass flag to GameBoard

```typescript
// Inside App component, add state:
const [shouldAnimateLastMove, setShouldAnimateLastMove] = useState(false);

// Modify COMPLETE_HANDOFF handler:
// Find where HandoffScreen calls onContinue
// In hot-seat mode playing phase rendering, update:

{state.phase === 'playing' && (
  <>
    <GameBoard
      gameState={state.gameState}
      onMove={handleMove}
      onCancelMove={handleCancelMove}
      isPlayerTurn={isCurrentPlayer}
      pendingMove={state.pendingMove}
      shouldAnimateLastMove={shouldAnimateLastMove} // NEW
    />
    {/* ... rest of playing phase UI ... */}
  </>
)}

// Add effect to trigger animation on phase transition:
useEffect(() => {
  if (state.phase === 'playing' && state.mode === 'hotseat') {
    // Just transitioned to playing phase in hot-seat mode
    // Trigger animation if there's a move history
    if (state.gameState.moveHistory.length > 0) {
      setShouldAnimateLastMove(true);
      // Reset flag after animation would complete
      setTimeout(() => setShouldAnimateLastMove(false), 1000);
    }
  }
}, [state.phase, state.mode, state.gameState?.moveHistory?.length]);
```

**Validation**:
```bash
pnpm run check:types
pnpm test
# Expected: All tests pass
```

---

### Task 6: Trigger Animation on URL Load (URL Mode)

**File**: `src/App.tsx`

**Changes**:
1. Detect when URL payload is loaded
2. Set animation flag
3. GameBoard already receives the flag from Task 5

```typescript
// Modify URL state hook effect:
useEffect(() => {
  if (state.phase === 'playing' && state.mode === 'url') {
    // Just loaded game state from URL
    // Trigger animation if there's a move to show
    if (state.gameState.moveHistory.length > 0) {
      setShouldAnimateLastMove(true);
      setTimeout(() => setShouldAnimateLastMove(false), 1000);
    }
  }
}, [state.phase, state.mode, state.gameState?.moveHistory?.length]);
```

**Validation**:
```bash
pnpm run check:types
pnpm test
# Expected: All tests pass
```

---

### Task 7: Add Tests for Animation Hook

**File**: `src/hooks/useMoveAnimation.test.ts` (NEW)

```typescript
/**
 * @fileoverview Tests for useMoveAnimation hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMoveAnimation } from './useMoveAnimation';
import type { Move } from '@/lib/validation/schemas';

describe('useMoveAnimation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with no animation', () => {
    const { result } = renderHook(() => useMoveAnimation());

    expect(result.current.animatingMove).toBeNull();
    expect(result.current.isAnimating).toBe(false);
  });

  it('should trigger animation with valid move', () => {
    const { result } = renderHook(() => useMoveAnimation(600));

    const move: Move = {
      from: [2, 0],
      to: [1, 0],
      piece: { type: 'rook', owner: 'light', position: [2, 0], moveCount: 1, id: '1' },
      captured: null,
      timestamp: Date.now(),
    };

    act(() => {
      result.current.triggerAnimation(move);
    });

    expect(result.current.animatingMove).toEqual(move);
    expect(result.current.isAnimating).toBe(true);
  });

  it('should auto-cleanup after duration', () => {
    const { result } = renderHook(() => useMoveAnimation(600));

    const move: Move = {
      from: [2, 0],
      to: [1, 0],
      piece: { type: 'rook', owner: 'light', position: [2, 0], moveCount: 1, id: '1' },
      captured: null,
      timestamp: Date.now(),
    };

    act(() => {
      result.current.triggerAnimation(move);
    });

    expect(result.current.isAnimating).toBe(true);

    act(() => {
      vi.advanceTimersByTime(600);
    });

    expect(result.current.isAnimating).toBe(false);
    expect(result.current.animatingMove).toBeNull();
  });

  it('should skip animation if already animating', () => {
    const { result } = renderHook(() => useMoveAnimation(600));

    const move1: Move = {
      from: [2, 0],
      to: [1, 0],
      piece: { type: 'rook', owner: 'light', position: [2, 0], moveCount: 1, id: '1' },
      captured: null,
      timestamp: Date.now(),
    };

    const move2: Move = {
      from: [0, 0],
      to: [0, 1],
      piece: { type: 'knight', owner: 'dark', position: [0, 0], moveCount: 1, id: '2' },
      captured: null,
      timestamp: Date.now(),
    };

    act(() => {
      result.current.triggerAnimation(move1);
    });

    expect(result.current.animatingMove).toEqual(move1);

    act(() => {
      result.current.triggerAnimation(move2);
    });

    // Should still be animating move1
    expect(result.current.animatingMove).toEqual(move1);
  });
});
```

**Validation**:
```bash
pnpm test useMoveAnimation.test.ts
# Expected: All hook tests pass
```

---

### Task 8: Add Tests for Animation Overlay Component

**File**: `src/components/game/MoveAnimationOverlay.test.tsx` (NEW)

```typescript
/**
 * @fileoverview Tests for MoveAnimationOverlay component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MoveAnimationOverlay } from './MoveAnimationOverlay';
import type { Move } from '@/lib/validation/schemas';
import { createRef } from 'react';

describe('MoveAnimationOverlay', () => {
  it('should render animating piece', () => {
    const move: Move = {
      from: [2, 0],
      to: [1, 0],
      piece: { type: 'rook', owner: 'light', position: [2, 0], moveCount: 1, id: '1' },
      captured: null,
      timestamp: Date.now(),
    };

    const boardRef = createRef<HTMLDivElement>();
    const mockBoard = document.createElement('div');
    mockBoard.getBoundingClientRect = vi.fn(() => ({
      top: 0,
      left: 0,
      width: 300,
      height: 300,
      x: 0,
      y: 0,
      bottom: 300,
      right: 300,
      toJSON: () => ({}),
    }));

    (boardRef as any).current = mockBoard;

    render(
      <MoveAnimationOverlay
        move={move}
        cellSize={100}
        boardRef={boardRef}
      />
    );

    // Should render the piece symbol
    const overlay = screen.getByRole('presentation', { hidden: true });
    expect(overlay).toBeInTheDocument();
  });

  it('should call onAnimationComplete when animation ends', () => {
    const onComplete = vi.fn();
    const move: Move = {
      from: [2, 0],
      to: [1, 0],
      piece: { type: 'rook', owner: 'light', position: [2, 0], moveCount: 1, id: '1' },
      captured: null,
      timestamp: Date.now(),
    };

    const boardRef = createRef<HTMLDivElement>();
    const mockBoard = document.createElement('div');
    mockBoard.getBoundingClientRect = vi.fn(() => ({
      top: 0,
      left: 0,
      width: 300,
      height: 300,
      x: 0,
      y: 0,
      bottom: 300,
      right: 300,
      toJSON: () => ({}),
    }));

    (boardRef as any).current = mockBoard;

    const { container } = render(
      <MoveAnimationOverlay
        move={move}
        cellSize={100}
        boardRef={boardRef}
        onAnimationComplete={onComplete}
      />
    );

    // Simulate animation end
    const pieceEl = container.querySelector('[aria-hidden="true"]');
    const event = new Event('animationend');
    pieceEl?.dispatchEvent(event);

    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
```

**Validation**:
```bash
pnpm test MoveAnimationOverlay.test.tsx
# Expected: All component tests pass
```

---

### Task 9: Integration Testing

**File**: `src/components/game/GameBoard.test.tsx`

**Add new test**:
```typescript
describe('Move Animation Integration', () => {
  it('should trigger animation when shouldAnimateLastMove is true', () => {
    const mockState = createMockGameState();
    // Add a move to history
    mockState.moveHistory.push({
      from: [2, 0],
      to: [1, 0],
      piece: mockState.board[2]![0]!,
      captured: null,
      timestamp: Date.now(),
    });

    const { rerender } = render(
      <GameBoard
        gameState={mockState}
        onMove={vi.fn()}
        shouldAnimateLastMove={false}
      />
    );

    // No animation overlay initially
    expect(screen.queryByRole('presentation', { hidden: true })).not.toBeInTheDocument();

    // Trigger animation
    rerender(
      <GameBoard
        gameState={mockState}
        onMove={vi.fn()}
        shouldAnimateLastMove={true}
      />
    );

    // Animation overlay should appear
    expect(screen.getByRole('presentation', { hidden: true })).toBeInTheDocument();
  });
});
```

**Validation**:
```bash
pnpm test GameBoard.test.tsx
# Expected: Integration test passes
```

---

### Task 10: E2E Testing (Manual + Playwright)

**Manual Testing Checklist**:

**Hot-seat Mode**:
1. Start new hot-seat game
2. Player 1 makes move → click "Confirm Move"
3. Handoff screen appears
4. Player 2 clicks "I'm Ready"
5. ✅ **Verify**: Piece animates from start → end position
6. ✅ **Verify**: Animation takes ~600ms (feels smooth)
7. Make another move and repeat

**URL Mode**:
1. Start new URL game (Player 1)
2. Make move → generate URL
3. Open URL in new tab/incognito (Player 2)
4. ✅ **Verify**: Piece animates immediately on load
5. ✅ **Verify**: Animation shows correct piece moving

**Special Moves**:
1. Test capture: Opponent captures your piece
   - ✅ **Verify**: Brief highlight on captured piece
   - ✅ **Verify**: Piece animates to destination
2. Test en passant (if possible in 3x3 with pawns)
   - ✅ **Verify**: Both pawns highlighted
   - ✅ **Verify**: Capturing pawn animates
   - ✅ **Verify**: Captured pawn fades out
3. Test off-board move:
   - ✅ **Verify**: Piece animates beyond board edge
   - ✅ **Verify**: Celebration dance in court area
   - ✅ **Verify**: Piece settles in court display

**Accessibility**:
1. Enable "Reduce Motion" in OS settings
2. Repeat hot-seat test
3. ✅ **Verify**: No animations play (instant position update)

**Playwright E2E Test** (optional, for CI/CD):
```typescript
// src/tests/e2e/move-animation.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Move Animation', () => {
  test('should animate move in hot-seat mode', async ({ page }) => {
    await page.goto('/');

    // Start hot-seat game
    await page.click('text=Hot-seat');
    await page.fill('[name="player1"]', 'Alice');
    await page.click('text=Start Game');

    // Make move
    await page.click('[data-testid="cell-2-0"]'); // Select piece
    await page.click('[data-testid="cell-1-0"]'); // Move destination
    await page.click('text=Confirm Move');

    // Handoff
    await page.click('text=I\'m Ready');

    // Wait for animation
    const animatingPiece = page.locator('[aria-hidden="true"]');
    await expect(animatingPiece).toBeVisible();

    // Animation should complete
    await expect(animatingPiece).not.toBeVisible({ timeout: 1000 });
  });
});
```

**Validation**:
```bash
pnpm test:e2e
# Expected: E2E tests pass
```

---

### Task 11: Refactor & Optimize (if needed)

**Potential Improvements**:
1. Calculate cell size dynamically based on board dimensions
2. Extract position calculation into utility function
3. Add celebration dance animation (Task 12)
4. Optimize CSS keyframes for smoother animation
5. Add support for different animation speeds

**Validation**:
```bash
pnpm test
pnpm run check
# Expected: All tests still pass after refactoring
```

---

### Task 12: Implement Off-board Celebration Dance

**File**: `src/components/game/MoveAnimationOverlay.tsx`

**Enhance off-board animation**:
```typescript
// In MoveAnimationOverlay component, update CSS vars for off-board:
if (move.to === 'off_board') {
  // ... existing edge calculation ...

  // Add court position calculation
  const courtArea = document.querySelector(`[data-court="${move.piece.owner}"]`);
  if (courtArea) {
    const courtRect = courtArea.getBoundingClientRect();
    const courtCenterX = courtRect.left + courtRect.width / 2;
    const courtCenterY = courtRect.top + courtRect.height / 2;

    setCssVars({
      ...cssVars,
      '--court-x': `${courtCenterX}px`,
      '--court-y': `${courtCenterY}px`,
      '--enable-celebration': 'true',
    });
  }
}
```

**File**: `src/components/game/MoveAnimationOverlay.module.css`

**Add celebration sequence**:
```css
/* Multi-stage animation for off-board moves */
.animatingPiece[data-celebration="true"] {
  animation:
    arcMove 600ms cubic-bezier(0.4, 0.0, 0.2, 1) forwards,
    celebrationDance 400ms 600ms ease-in-out forwards;
}

@keyframes celebrationDance {
  0%, 100% {
    transform: translate(var(--court-x), var(--court-y))
               translateY(0) rotate(0deg);
  }
  25% {
    transform: translate(var(--court-x), var(--court-y))
               translateY(-20px) rotate(15deg);
  }
  50% {
    transform: translate(var(--court-x), var(--court-y))
               translateY(0) rotate(0deg);
  }
  75% {
    transform: translate(var(--court-x), var(--court-y))
               translateY(-20px) rotate(-15deg);
  }
}
```

**Validation**:
```bash
pnpm test
pnpm run check
# Manual: Test off-board move and verify celebration
```

---

## Validation Strategy

### Level 1: Type Safety
```bash
pnpm run check:types
```
- New hook types validate
- New component props validate
- Integration with existing types works

### Level 2: Unit Tests
```bash
pnpm test useMoveAnimation.test.ts
pnpm test MoveAnimationOverlay.test.tsx
```
- Hook logic tested (trigger, skip, cleanup)
- Component rendering tested
- Animation completion callback tested

### Level 3: Integration Tests
```bash
pnpm test GameBoard.test.tsx
pnpm test App.test.tsx
```
- GameBoard integration with animation overlay
- App phase transition triggers animation
- Both modes (hot-seat, URL) trigger correctly

### Level 4: Accessibility
```bash
# Manual testing with OS "Reduce Motion" enabled
```
- Verify animations disabled
- Verify instant position updates work

### Level 5: E2E Tests
```bash
pnpm test:e2e
```
- Full hot-seat flow with animation
- Full URL flow with animation
- Special moves (captures, off-board)

### Level 6: Performance
- Check animation smoothness (60fps)
- Verify no layout thrashing
- Test on mobile devices

## Rollback Strategy

If tests fail unexpectedly:

1. **Revert Task 12** (Celebration Dance):
   ```bash
   git checkout HEAD -- src/components/game/MoveAnimationOverlay.tsx
   git checkout HEAD -- src/components/game/MoveAnimationOverlay.module.css
   ```

2. **Revert Integration** (Tasks 4-6):
   ```bash
   git checkout HEAD -- src/components/game/GameBoard.tsx
   git checkout HEAD -- src/App.tsx
   ```

3. **Keep Foundation** (Tasks 1-3):
   - Hook and component remain for future use
   - Mark as experimental feature flag

## Debug Strategies

### Animation Not Triggering
1. **Check phase transition**: `console.log('[App] Phase:', state.phase, 'Mode:', state.mode)`
2. **Check move history**: `console.log('[App] Move history length:', state.gameState?.moveHistory?.length)`
3. **Check animation flag**: `console.log('[GameBoard] shouldAnimateLastMove:', shouldAnimateLastMove)`

### Animation Looks Wrong
1. **Check CSS variables**: Inspect element in DevTools, verify `--start-x`, `--end-x`, etc.
2. **Check board ref**: Verify `boardRef.current` has valid `getBoundingClientRect()`
3. **Check cell size**: Verify `cellSize` prop matches actual grid cell dimensions

### Animation Too Fast/Slow
1. **Adjust duration**: Change `useMoveAnimation(600)` parameter
2. **Adjust keyframes**: Tweak bezier curve in CSS
3. **Test on different devices**: Performance varies by hardware

### prefers-reduced-motion Not Working
1. **Check media query**: Verify browser supports `prefers-reduced-motion`
2. **Check CSS cascade**: Ensure `@media` rules have higher specificity
3. **Check hook logic**: Verify `window.matchMedia` call succeeds

## Success Criteria

- [ ] Animation hook created and tested
- [ ] Animation overlay component created and tested
- [ ] CSS keyframes implemented with accessibility support
- [ ] GameBoard integrated with animation overlay
- [ ] Hot-seat mode triggers animation after handoff
- [ ] URL mode triggers animation on load
- [ ] Celebration dance works for off-board moves
- [ ] `prefers-reduced-motion` disables all animations
- [ ] All existing tests still pass (no regressions)
- [ ] New tests pass (hook, component, integration)
- [ ] Manual testing confirms smooth UX
- [ ] E2E tests pass (optional but recommended)

## TDD Workflow

1. **🔴 RED**: Write failing tests for animation hook (Task 7)
2. **🟢 GREEN**: Implement hook to pass tests (Task 1)
3. **🔄 REFACTOR**: Clean up hook implementation
4. **🔴 RED**: Write failing tests for overlay component (Task 8)
5. **🟢 GREEN**: Implement component to pass tests (Task 2-3)
6. **🔄 REFACTOR**: Clean up component implementation
7. **✅ VALIDATE**: Integration tests (Task 9)
8. **🧪 MANUAL**: Manual testing (Task 10)
9. **🎨 ENHANCE**: Add celebration dance (Task 12)

## References

- `/home/ryankhetlyr/Development/kings-cooking/claude_md_files/CLAUDE-REACT.md` - React 19 patterns
- `src/components/game/GameBoard.tsx` - Current board implementation
- `src/components/game/HandoffScreen.tsx` - Handoff trigger point
- `src/types/gameFlow.ts` - Phase types and transitions
- CSS Animations Guide: https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Animations
- React Testing Library: https://testing-library.com/docs/react-testing-library/intro/

## Gotchas

1. **CSS Custom Properties**: Must set as inline styles, not className
2. **Position Calculation**: Board ref must be measured after mount
3. **Animation Timing**: setTimeout cleanup must match CSS animation duration
4. **Phase Transition**: Animation should trigger AFTER handoff completes, not during
5. **URL Mode vs Hot-seat**: Different trigger points but same animation logic
6. **prefers-reduced-motion**: Must check BOTH in JS (hook) AND CSS (media query)
7. **Off-board Coordinates**: Court area may not be in same DOM container as board
8. **First Move**: Should animate just like any other move (no special case)
9. **Multiple Rapid Moves**: Skip animation if already in progress (handled by hook)
10. **Cell Size**: Must calculate dynamically or pass as prop (board may resize)

## Notes

- This feature is foundational for Issue #25 (Pawn Promotion), which will show piece transformation animations
- YAGNI approach: No history viewer integration initially (can add later if needed)
- CSS-first approach: Keeps performance high, especially on mobile
- Simple edge case handling: Let animations abort naturally rather than complex queue management
- Celebration dance adds delight without complexity (just extra CSS keyframes)
