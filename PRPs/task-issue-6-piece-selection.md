# TASK PRP: Add Piece Selection Phase to Game

**Issue**: #6
**Feature**: Allow players to select which pieces they play with
**Created**: 2025-10-19
**Status**: Ready for execution

---

## Executive Summary

Add a new `piece-selection` phase to the game flow where players choose their starting pieces before gameplay begins. This includes three selection modes (mirrored, independent, random), a piece picker UI, and a "who goes first" choice that determines light/dark assignment.

**Scope**: New phase, UI components, reducer actions, URL encoding, localStorage, comprehensive tests
**Estimated Complexity**: 🟡 Medium (3-4 days)
**Risk Level**: 🟡 Medium (touches core game flow, URL encoding)

---

## Context Gathered from Issue Discussion

### Question 1: Game Flow Integration
**Answer**: Piece selection occurs **after story panel closes** (or immediately after game start if story is already collapsed).

### Question 2: Piece Selection Modes
**Answer**: Player 1 chooses mode before selecting pieces:
1. **Mirrored**: P1 picks pieces, P2 gets identical setup
2. **Independent**: P1 picks first (hidden), then P2 picks separately
3. **Random**: Hidden random pieces for both (mirrored)

### Question 3: First Move Selection
**Answer**: After pieces are selected, P1 chooses who goes first. This determines light/dark assignment (first player = light). Goes to handoff phase after choice.

### Question 4: UI Details
**Answer**:
- Piece limits enforced: can select same piece type until limit reached
- Modal dialog for piece picker
- Show all 9 squares (3x3 board)
- Players can change selections by clicking piece on board
- Confirm button appears after all 3 pieces selected

### Question 5: Edge Cases
**Answer**:
- Random mode: pieces hidden until both players ready
- Changing: click piece on board to reopen modal
- Accessibility: WCAG 2.1 AA (keyboard, ARIA, focus trap)
- URL encoding: yes, piece selection encoded in URL
- No back button: must complete selection once started

---

## All Needed Context

### 1. Current Phase Flow (from exploration)

```
mode-selection → setup → playing (with story panel) → handoff → victory
```

**NEW FLOW**:
```
mode-selection → setup → piece-selection → playing (with story) → handoff → victory
```

### 2. Existing Patterns to Follow

#### Modal Pattern (HistoryComparisonModal.tsx)
```tsx
import FocusTrap from 'focus-trap-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  // ... other props
}

export const Modal = ({ isOpen, onClose }: ModalProps) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <FocusTrap>
      <div className={styles.backdrop} onClick={onClose}>
        <div
          className={styles.modal}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          {/* content */}
        </div>
      </div>
    </FocusTrap>
  );
};
```

#### Reducer Phase Pattern (gameFlow/reducer.ts)
```typescript
// New phase type in types/gameFlow.ts
export type PieceSelectionPhase = {
  phase: 'piece-selection';
  mode: GameMode;
  player1Name: string;
  player2Name: string;
  selectionMode: 'mirrored' | 'independent' | 'random';
  player1Pieces: SelectedPieces | null;
  player2Pieces: SelectedPieces | null;
  firstMover: 'player1' | 'player2' | null;
};

// Action in reducer
case 'START_PIECE_SELECTION':
  if (state.phase !== 'setup') return state;
  return {
    phase: 'piece-selection',
    mode: state.mode,
    player1Name: state.player1Name,
    player2Name: state.player2Name || '',
    selectionMode: null,
    player1Pieces: null,
    player2Pieces: null,
    firstMover: null,
  };
```

#### URL Encoding Pattern (urlEncoding/types.ts)
```typescript
// Add to FullStatePayload
export interface FullStatePayload {
  type: 'full_state';
  // ... existing fields
  pieceSelection?: {
    mode: 'mirrored' | 'independent' | 'random';
    player1Pieces: [PieceType, PieceType, PieceType];
    player2Pieces: [PieceType, PieceType, PieceType];
    firstMover: 'player1' | 'player2';
  };
}
```

#### localStorage Pattern (storage/localStorage.ts)
```typescript
// Add to storage object
getPieceSelection(): PieceSelectionData | null {
  return getValidatedItem('piece-selection', PieceSelectionSchema);
}

setPieceSelection(data: PieceSelectionData): void {
  setValidatedItem('piece-selection', data, PieceSelectionSchema);
}
```

### 3. Piece Pool & Limits

From CLAUDE.md game rules:
```typescript
const PIECE_POOL = {
  rook: { max: 2, unicode: { light: '♜', dark: '♖' } },
  knight: { max: 2, unicode: { light: '♞', dark: '♘' } },
  bishop: { max: 2, unicode: { light: '♝', dark: '♗' } },
  queen: { max: 1, unicode: { light: '♛', dark: '♕' } },
  pawn: { max: 8, unicode: { light: '♟', dark: '♙' } },
} as const;
```

### 4. Key Dependencies

| File | Purpose |
|------|---------|
| `src/types/gameFlow.ts` | Add `PieceSelectionPhase` to union |
| `src/lib/gameFlow/reducer.ts` | Add 4 new actions |
| `src/App.tsx` | Add phase rendering |
| `src/components/game/PieceSelectionScreen.tsx` | NEW: Main UI |
| `src/components/game/PiecePickerModal.tsx` | NEW: Piece selection modal |
| `src/lib/pieceSelection/types.ts` | NEW: Types |
| `src/lib/pieceSelection/logic.ts` | NEW: Business logic |
| `src/lib/urlEncoding/types.ts` | Update payloads |
| `src/lib/storage/localStorage.ts` | Add piece selection storage |

### 5. Gotchas & Known Issues

⚠️ **Light/Dark Terminology**: Must use `'light'` and `'dark'` (Issue #4 refactor), NOT white/black

⚠️ **Story Panel Integration**: Story panel checks `player1-seen-story` and `player2-seen-story` flags. Piece selection should happen AFTER story closes.

⚠️ **URL Mode Complexity**: In independent mode, Player 2's pieces must not be revealed in URL until they've made their selection.

⚠️ **Random Mode**: Pieces must be deterministic (use game ID as seed) so both players see the same pieces.

⚠️ **First Mover = Light**: The player who goes first is always assigned to `light` pieces. Must swap player assignments in GameState if Player 2 goes first.

⚠️ **CSS Modules**: Use CSS Modules for styling (hashed class names), reference existing patterns in GameBoard.module.css

⚠️ **Accessibility**: Must follow WCAG 2.1 AA - keyboard nav, focus trap, ARIA labels, screen reader support

---

## Implementation Blueprint

### Phase 1: Types & Data Structures (RED)

#### TASK 1.1: Add Piece Selection Types

**File**: `src/lib/pieceSelection/types.ts` (NEW)

**Test First** (RED):
```typescript
// src/lib/pieceSelection/types.test.ts
describe('PieceSelectionSchema', () => {
  it('should validate valid piece selection', () => {
    const valid = {
      mode: 'mirrored',
      player1Pieces: ['rook', 'knight', 'bishop'],
      player2Pieces: ['rook', 'knight', 'bishop'],
      firstMover: 'player1',
    };
    expect(() => PieceSelectionSchema.parse(valid)).not.toThrow();
  });

  it('should reject invalid mode', () => {
    const invalid = { mode: 'invalid', /* ... */ };
    expect(() => PieceSelectionSchema.parse(invalid)).toThrow();
  });

  it('should reject wrong number of pieces', () => {
    const invalid = {
      mode: 'mirrored',
      player1Pieces: ['rook', 'knight'], // only 2
      /* ... */
    };
    expect(() => PieceSelectionSchema.parse(invalid)).toThrow();
  });
});
```

**Implementation** (GREEN):
```typescript
import { z } from 'zod';

export const PieceTypeSchema = z.enum(['rook', 'knight', 'bishop', 'queen', 'pawn']);
export type PieceType = z.infer<typeof PieceTypeSchema>;

export const SelectionModeSchema = z.enum(['mirrored', 'independent', 'random']);
export type SelectionMode = z.infer<typeof SelectionModeSchema>;

export const FirstMoverSchema = z.enum(['player1', 'player2']);
export type FirstMover = z.infer<typeof FirstMoverSchema>;

export const SelectedPiecesSchema = z.tuple([
  PieceTypeSchema,
  PieceTypeSchema,
  PieceTypeSchema,
]);
export type SelectedPieces = z.infer<typeof SelectedPiecesSchema>;

export const PieceSelectionDataSchema = z.object({
  mode: SelectionModeSchema,
  player1Pieces: SelectedPiecesSchema,
  player2Pieces: SelectedPiecesSchema,
  firstMover: FirstMoverSchema,
});
export type PieceSelectionData = z.infer<typeof PieceSelectionDataSchema>;

export const PIECE_POOL = {
  rook: { max: 2, unicode: { light: '♜', dark: '♖' } },
  knight: { max: 2, unicode: { light: '♞', dark: '♘' } },
  bishop: { max: 2, unicode: { light: '♝', dark: '♗' } },
  queen: { max: 1, unicode: { light: '♛', dark: '♕' } },
  pawn: { max: 8, unicode: { light: '♟', dark: '♙' } },
} as const;
```

**Validation**:
```bash
pnpm test src/lib/pieceSelection/types.test.ts
```

---

#### TASK 1.2: Update GameFlow Types

**File**: `src/types/gameFlow.ts`

**Test First** (RED):
```typescript
// Add to src/types/gameFlow.test.ts
describe('GameFlowState - Piece Selection Phase', () => {
  it('should validate piece-selection phase', () => {
    const state: GameFlowState = {
      phase: 'piece-selection',
      mode: 'hotseat',
      player1Name: 'Alice',
      player2Name: '',
      selectionMode: null,
      player1Pieces: null,
      player2Pieces: null,
      firstMover: null,
    };
    expect(() => GameFlowStateSchema.parse(state)).not.toThrow();
  });

  it('should validate piece-selection with completed selection', () => {
    const state: GameFlowState = {
      phase: 'piece-selection',
      mode: 'url',
      player1Name: 'Alice',
      player2Name: 'Bob',
      selectionMode: 'mirrored',
      player1Pieces: ['rook', 'knight', 'bishop'],
      player2Pieces: ['rook', 'knight', 'bishop'],
      firstMover: 'player1',
    };
    expect(() => GameFlowStateSchema.parse(state)).not.toThrow();
  });
});
```

**Implementation** (GREEN):
```typescript
// Add to the discriminated union
export type PieceSelectionPhase = {
  phase: 'piece-selection';
  mode: GameMode;
  player1Name: string;
  player2Name: string;
  selectionMode: SelectionMode | null;
  player1Pieces: SelectedPieces | null;
  player2Pieces: SelectedPieces | null;
  firstMover: FirstMover | null;
};

// Update the union type
export type GameFlowState =
  | ModeSelectionPhase
  | SetupPhase
  | PieceSelectionPhase  // <-- ADD THIS
  | PlayingPhase
  | HandoffPhase
  | VictoryPhase;

// Add Zod schema
const PieceSelectionPhaseSchema = z.object({
  phase: z.literal('piece-selection'),
  mode: GameModeSchema,
  player1Name: z.string(),
  player2Name: z.string(),
  selectionMode: SelectionModeSchema.nullable(),
  player1Pieces: SelectedPiecesSchema.nullable(),
  player2Pieces: SelectedPiecesSchema.nullable(),
  firstMover: FirstMoverSchema.nullable(),
});

// Update GameFlowStateSchema
export const GameFlowStateSchema = z.discriminatedUnion('phase', [
  ModeSelectionPhaseSchema,
  SetupPhaseSchema,
  PieceSelectionPhaseSchema,  // <-- ADD THIS
  PlayingPhaseSchema,
  HandoffPhaseSchema,
  VictoryPhaseSchema,
]);
```

**Validation**:
```bash
pnpm run check  # TypeScript
pnpm test src/types/gameFlow.test.ts
```

---

### Phase 2: Reducer Actions (RED → GREEN)

#### TASK 2.1: Add START_PIECE_SELECTION Action

**File**: `src/lib/gameFlow/reducer.ts`

**Test First** (RED):
```typescript
// Add to src/lib/gameFlow/reducer.test.ts
describe('START_PIECE_SELECTION', () => {
  it('should transition from setup to piece-selection', () => {
    const setupState: GameFlowState = {
      phase: 'setup',
      mode: 'hotseat',
      player1Name: 'Alice',
    };

    const newState = gameFlowReducer(setupState, {
      type: 'START_PIECE_SELECTION'
    });

    expect(newState.phase).toBe('piece-selection');
    expect(newState.mode).toBe('hotseat');
    expect(newState.player1Name).toBe('Alice');
    expect(newState.selectionMode).toBe(null);
    expect(newState.player1Pieces).toBe(null);
  });

  it('should not transition from other phases', () => {
    const playingState: GameFlowState = {
      phase: 'playing',
      /* ... */
    };

    const newState = gameFlowReducer(playingState, {
      type: 'START_PIECE_SELECTION'
    });

    expect(newState).toBe(playingState); // unchanged
  });
});
```

**Implementation** (GREEN):
```typescript
// Add action type
export type GameFlowAction =
  | { type: 'SELECT_MODE'; mode: GameMode }
  // ... existing actions
  | { type: 'START_PIECE_SELECTION' }
  | { type: 'SET_SELECTION_MODE'; mode: SelectionMode }
  | { type: 'SET_PLAYER_PIECES'; player: 'player1' | 'player2'; pieces: SelectedPieces }
  | { type: 'SET_FIRST_MOVER'; mover: FirstMover }
  | { type: 'COMPLETE_PIECE_SELECTION' };

// Add to reducer
case 'START_PIECE_SELECTION':
  if (state.phase !== 'setup') return state;
  return {
    phase: 'piece-selection',
    mode: state.mode,
    player1Name: state.player1Name,
    player2Name: state.player2Name || '',
    selectionMode: null,
    player1Pieces: null,
    player2Pieces: null,
    firstMover: null,
  };

case 'SET_SELECTION_MODE':
  if (state.phase !== 'piece-selection') return state;
  return { ...state, selectionMode: action.mode };

case 'SET_PLAYER_PIECES':
  if (state.phase !== 'piece-selection') return state;
  if (action.player === 'player1') {
    return { ...state, player1Pieces: action.pieces };
  } else {
    return { ...state, player2Pieces: action.pieces };
  }

case 'SET_FIRST_MOVER':
  if (state.phase !== 'piece-selection') return state;
  return { ...state, firstMover: action.mover };

case 'COMPLETE_PIECE_SELECTION': {
  if (state.phase !== 'piece-selection') return state;
  if (!state.selectionMode || !state.player1Pieces || !state.firstMover) {
    return state; // incomplete
  }

  // Determine player assignments based on firstMover
  const lightPlayer = state.firstMover === 'player1'
    ? state.player1Name
    : state.player2Name;
  const darkPlayer = state.firstMover === 'player1'
    ? state.player2Name
    : state.player1Name;

  // Create initial board with selected pieces
  const initialBoard = createBoardWithPieces(
    state.player1Pieces,
    state.player2Pieces,
    state.firstMover
  );

  // Create GameState
  const gameState = new KingsChessEngine(
    { id: crypto.randomUUID(), name: lightPlayer },
    { id: crypto.randomUUID(), name: darkPlayer },
    { board: initialBoard }
  ).getState();

  return {
    phase: 'playing',
    mode: state.mode,
    player1Name: state.player1Name,
    player2Name: state.player2Name,
    gameState,
    selectedPosition: null,
    legalMoves: [],
    pendingMove: null,
  };
}
```

**Validation**:
```bash
pnpm test src/lib/gameFlow/reducer.test.ts
```

---

#### TASK 2.2: Add Piece Selection Logic

**File**: `src/lib/pieceSelection/logic.ts` (NEW)

**Test First** (RED):
```typescript
// src/lib/pieceSelection/logic.test.ts
describe('Piece Selection Logic', () => {
  describe('getAvailablePieces', () => {
    it('should return all pieces when none selected', () => {
      const available = getAvailablePieces([]);
      expect(available).toContain('rook');
      expect(available).toContain('knight');
      expect(available.length).toBe(5);
    });

    it('should remove rook after 2 selected', () => {
      const available = getAvailablePieces(['rook', 'rook']);
      expect(available).not.toContain('rook');
      expect(available).toContain('knight');
    });

    it('should remove queen after 1 selected', () => {
      const available = getAvailablePieces(['queen']);
      expect(available).not.toContain('queen');
    });
  });

  describe('generateRandomPieces', () => {
    it('should generate 3 pieces', () => {
      const pieces = generateRandomPieces('test-seed');
      expect(pieces).toHaveLength(3);
    });

    it('should respect piece limits', () => {
      const pieces = generateRandomPieces('test-seed');
      const rookCount = pieces.filter(p => p === 'rook').length;
      const queenCount = pieces.filter(p => p === 'queen').length;
      expect(rookCount).toBeLessThanOrEqual(2);
      expect(queenCount).toBeLessThanOrEqual(1);
    });

    it('should be deterministic with same seed', () => {
      const pieces1 = generateRandomPieces('seed1');
      const pieces2 = generateRandomPieces('seed1');
      expect(pieces1).toEqual(pieces2);
    });
  });

  describe('createBoardWithPieces', () => {
    it('should place player1 pieces in correct row', () => {
      const board = createBoardWithPieces(
        ['rook', 'knight', 'bishop'],
        ['rook', 'knight', 'bishop'],
        'player1'
      );

      // Player1 goes first = light = row 0
      expect(board[0][0]?.type).toBe('rook');
      expect(board[0][1]?.type).toBe('knight');
      expect(board[0][2]?.type).toBe('bishop');
      expect(board[0][0]?.owner).toBe('light');
    });

    it('should place player2 pieces if they go first', () => {
      const board = createBoardWithPieces(
        ['rook', 'knight', 'bishop'],
        ['bishop', 'knight', 'rook'],
        'player2'
      );

      // Player2 goes first = light = row 0
      expect(board[0][0]?.type).toBe('bishop');
      expect(board[0][0]?.owner).toBe('light');
      // Player1 = dark = row 2
      expect(board[2][0]?.type).toBe('rook');
      expect(board[2][0]?.owner).toBe('dark');
    });
  });
});
```

**Implementation** (GREEN):
```typescript
import { PIECE_POOL } from './types';
import type { PieceType, SelectedPieces, FirstMover } from './types';
import type { Board, Piece } from '@/lib/validation/schemas';

/**
 * Get available pieces based on current selection
 */
export function getAvailablePieces(selected: PieceType[]): PieceType[] {
  const counts: Record<PieceType, number> = {
    rook: 0,
    knight: 0,
    bishop: 0,
    queen: 0,
    pawn: 0,
  };

  // Count selected pieces
  selected.forEach(piece => counts[piece]++);

  // Filter to available pieces
  return Object.entries(PIECE_POOL)
    .filter(([piece, { max }]) => counts[piece as PieceType] < max)
    .map(([piece]) => piece as PieceType);
}

/**
 * Generate random pieces (deterministic with seed)
 */
export function generateRandomPieces(seed: string): SelectedPieces {
  // Simple seeded random using djb2 hash
  let hash = 5381;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 33) ^ seed.charCodeAt(i);
  }

  const seededRandom = () => {
    hash = (hash * 1103515245 + 12345) & 0x7fffffff;
    return hash / 0x7fffffff;
  };

  const selected: PieceType[] = [];

  for (let i = 0; i < 3; i++) {
    const available = getAvailablePieces(selected);
    const index = Math.floor(seededRandom() * available.length);
    selected.push(available[index]);
  }

  return selected as SelectedPieces;
}

/**
 * Create board with selected pieces
 */
export function createBoardWithPieces(
  player1Pieces: SelectedPieces,
  player2Pieces: SelectedPieces,
  firstMover: FirstMover
): Board {
  // Empty 3x3 board
  const board: Board = [
    [null, null, null],
    [null, null, null],
    [null, null, null],
  ];

  // Determine which player is light (goes first)
  const lightPieces = firstMover === 'player1' ? player1Pieces : player2Pieces;
  const darkPieces = firstMover === 'player1' ? player2Pieces : player1Pieces;

  // Place light pieces (row 0)
  lightPieces.forEach((type, col) => {
    board[0][col] = {
      type,
      owner: 'light',
      position: [0, col],
      moveCount: 0,
      id: `light-${type}-${col}`,
    };
  });

  // Place dark pieces (row 2)
  darkPieces.forEach((type, col) => {
    board[2][col] = {
      type,
      owner: 'dark',
      position: [2, col],
      moveCount: 0,
      id: `dark-${type}-${col}`,
    };
  });

  return board;
}
```

**Validation**:
```bash
pnpm test src/lib/pieceSelection/logic.test.ts
```

---

### Phase 3: UI Components (RED → GREEN)

#### TASK 3.1: Create PiecePickerModal Component

**File**: `src/components/game/PiecePickerModal.tsx` (NEW)

**Test First** (RED):
```typescript
// src/components/game/PiecePickerModal.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PiecePickerModal } from './PiecePickerModal';

describe('PiecePickerModal', () => {
  it('should not render when closed', () => {
    render(
      <PiecePickerModal
        isOpen={false}
        availablePieces={['rook', 'knight']}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should render available pieces', () => {
    render(
      <PiecePickerModal
        isOpen={true}
        availablePieces={['rook', 'knight', 'bishop']}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('♜')).toBeInTheDocument(); // rook
    expect(screen.getByText('♞')).toBeInTheDocument(); // knight
    expect(screen.getByText('♝')).toBeInTheDocument(); // bishop
  });

  it('should call onSelect when piece clicked', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(
      <PiecePickerModal
        isOpen={true}
        availablePieces={['rook', 'knight']}
        onSelect={onSelect}
        onClose={vi.fn()}
      />
    );

    await user.click(screen.getByLabelText(/select rook/i));
    expect(onSelect).toHaveBeenCalledWith('rook');
  });

  it('should close on ESC key', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <PiecePickerModal
        isOpen={true}
        availablePieces={['rook']}
        onSelect={vi.fn()}
        onClose={onClose}
      />
    );

    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });

  it('should trap focus within modal', async () => {
    const user = userEvent.setup();

    render(
      <PiecePickerModal
        isOpen={true}
        availablePieces={['rook', 'knight', 'bishop']}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />
    );

    // Tab through elements
    await user.tab();
    const firstButton = screen.getAllByRole('button')[0];
    expect(firstButton).toHaveFocus();

    // Tab to last element then back to first
    await user.tab();
    await user.tab();
    await user.tab();
    await user.tab(); // Should wrap back to first
    expect(firstButton).toHaveFocus();
  });
});
```

**Implementation** (GREEN):
```typescript
import { useEffect, type ReactElement } from 'react';
import FocusTrap from 'focus-trap-react';
import type { PieceType } from '@/lib/pieceSelection/types';
import { PIECE_POOL } from '@/lib/pieceSelection/types';
import styles from './PiecePickerModal.module.css';

interface PiecePickerModalProps {
  isOpen: boolean;
  availablePieces: PieceType[];
  onSelect: (piece: PieceType) => void;
  onClose: () => void;
}

export const PiecePickerModal = ({
  isOpen,
  availablePieces,
  onSelect,
  onClose,
}: PiecePickerModalProps): ReactElement | null => {
  // Prevent body scroll when modal open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    if (!isOpen) return;

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <FocusTrap>
      <div className={styles.backdrop} onClick={onClose}>
        <div
          className={styles.modal}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="piece-picker-title"
        >
          <div className={styles.header}>
            <h2 id="piece-picker-title" className={styles.title}>
              Choose a Piece
            </h2>
            <button
              className={styles.closeButton}
              onClick={onClose}
              aria-label="Close piece picker"
            >
              ×
            </button>
          </div>

          <div className={styles.pieceGrid}>
            {availablePieces.map((piece) => (
              <button
                key={piece}
                className={styles.pieceButton}
                onClick={() => {
                  onSelect(piece);
                  onClose();
                }}
                aria-label={`Select ${piece}`}
              >
                <span className={styles.pieceIcon} aria-hidden="true">
                  {PIECE_POOL[piece].unicode.light}
                </span>
                <span className={styles.pieceName}>{piece}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </FocusTrap>
  );
};
```

**CSS File**: `src/components/game/PiecePickerModal.module.css` (NEW)
```css
.backdrop {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background-color: var(--bg-primary, #ffffff);
  border-radius: var(--border-radius-lg, 8px);
  box-shadow: var(--shadow-lg, 0 10px 25px rgba(0, 0, 0, 0.3));
  max-width: 90vw;
  max-height: 90vh;
  overflow: auto;
  padding: var(--spacing-lg, 24px);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-md, 16px);
}

.title {
  font-size: var(--font-size-lg, 1.5rem);
  font-weight: 600;
  margin: 0;
}

.closeButton {
  background: none;
  border: none;
  font-size: 2rem;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--border-radius-sm, 4px);
}

.closeButton:hover {
  background-color: var(--bg-hover, rgba(0, 0, 0, 0.1));
}

.pieceGrid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: var(--spacing-md, 16px);
}

.pieceButton {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm, 8px);
  padding: var(--spacing-md, 16px);
  border: 2px solid var(--border-primary, #ccc);
  border-radius: var(--border-radius-md, 6px);
  background-color: var(--bg-primary, #fff);
  cursor: pointer;
  transition: all 0.2s;
  min-height: 100px;
}

.pieceButton:hover {
  border-color: var(--border-focus, #4a9eff);
  background-color: var(--bg-hover, rgba(74, 158, 255, 0.1));
  transform: scale(1.05);
}

.pieceButton:focus {
  outline: 2px solid var(--border-focus, #4a9eff);
  outline-offset: 2px;
}

.pieceIcon {
  font-size: 3rem;
  line-height: 1;
}

.pieceName {
  font-size: var(--font-size-sm, 0.875rem);
  font-weight: 500;
  text-transform: capitalize;
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  :global(:root:not([data-theme='light'])) .modal {
    background-color: var(--bg-primary-dark, #2a2a2a);
  }

  :global(:root:not([data-theme='light'])) .pieceButton {
    background-color: var(--bg-secondary-dark, #3a3a3a);
    border-color: var(--border-primary-dark, #555);
  }
}
```

**Validation**:
```bash
pnpm test src/components/game/PiecePickerModal.test.tsx
```

---

#### TASK 3.2: Create PieceSelectionScreen Component

**File**: `src/components/game/PieceSelectionScreen.tsx` (NEW)

**Test First** (RED):
```typescript
// src/components/game/PieceSelectionScreen.test.tsx
describe('PieceSelectionScreen', () => {
  it('should show mode selection initially', () => {
    render(
      <PieceSelectionScreen
        selectionMode={null}
        player1Pieces={null}
        currentPlayer="player1"
        onModeSelect={vi.fn()}
        onPieceSelect={vi.fn()}
        onFirstMoverSelect={vi.fn()}
        onConfirm={vi.fn()}
      />
    );

    expect(screen.getByText(/choose selection mode/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /mirrored/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /independent/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /random/i })).toBeInTheDocument();
  });

  it('should show board after mode selected', () => {
    render(
      <PieceSelectionScreen
        selectionMode="mirrored"
        player1Pieces={null}
        currentPlayer="player1"
        onModeSelect={vi.fn()}
        onPieceSelect={vi.fn()}
        onFirstMoverSelect={vi.fn()}
        onConfirm={vi.fn()}
      />
    );

    expect(screen.getByRole('grid')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /choose piece/i })).toHaveLength(3);
  });

  it('should show pieces after selection', async () => {
    const user = userEvent.setup();
    const onPieceSelect = vi.fn();

    render(
      <PieceSelectionScreen
        selectionMode="mirrored"
        player1Pieces={['rook', null, null]}
        currentPlayer="player1"
        onModeSelect={vi.fn()}
        onPieceSelect={onPieceSelect}
        onFirstMoverSelect={vi.fn()}
        onConfirm={vi.fn()}
      />
    );

    expect(screen.getByText('♜')).toBeInTheDocument();

    // Click rook to change
    await user.click(screen.getByText('♜'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('should show confirm button when all pieces selected', () => {
    render(
      <PieceSelectionScreen
        selectionMode="mirrored"
        player1Pieces={['rook', 'knight', 'bishop']}
        currentPlayer="player1"
        onModeSelect={vi.fn()}
        onPieceSelect={vi.fn()}
        onFirstMoverSelect={vi.fn()}
        onConfirm={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument();
  });

  it('should show first mover choice after confirming pieces', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();

    render(
      <PieceSelectionScreen
        selectionMode="mirrored"
        player1Pieces={['rook', 'knight', 'bishop']}
        currentPlayer="player1"
        firstMover={null}
        onModeSelect={vi.fn()}
        onPieceSelect={vi.fn()}
        onFirstMoverSelect={vi.fn()}
        onConfirm={onConfirm}
      />
    );

    await user.click(screen.getByRole('button', { name: /confirm/i }));

    expect(screen.getByText(/who goes first/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /i go first/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /opponent goes first/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /random/i })).toBeInTheDocument();
  });
});
```

**Implementation** (GREEN):
```typescript
import { useState, type ReactElement } from 'react';
import type { SelectionMode, PieceType, SelectedPieces, FirstMover } from '@/lib/pieceSelection/types';
import { getAvailablePieces } from '@/lib/pieceSelection/logic';
import { PIECE_POOL } from '@/lib/pieceSelection/types';
import { PiecePickerModal } from './PiecePickerModal';
import styles from './PieceSelectionScreen.module.css';

interface PieceSelectionScreenProps {
  selectionMode: SelectionMode | null;
  player1Pieces: SelectedPieces | null;
  player2Pieces?: SelectedPieces | null;
  firstMover: FirstMover | null;
  currentPlayer: 'player1' | 'player2';
  onModeSelect: (mode: SelectionMode) => void;
  onPieceSelect: (position: number, piece: PieceType) => void;
  onFirstMoverSelect: (mover: FirstMover) => void;
  onConfirm: () => void;
}

export const PieceSelectionScreen = ({
  selectionMode,
  player1Pieces,
  firstMover,
  currentPlayer,
  onModeSelect,
  onPieceSelect,
  onFirstMoverSelect,
  onConfirm,
}: PieceSelectionScreenProps): ReactElement => {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<number | null>(null);
  const [showFirstMoverChoice, setShowFirstMoverChoice] = useState(false);

  // Step 1: Mode selection
  if (!selectionMode) {
    return (
      <div className={styles.container}>
        <h2 className={styles.title}>Choose Selection Mode</h2>
        <div className={styles.modeButtons}>
          <button
            className={styles.modeButton}
            onClick={() => onModeSelect('mirrored')}
            aria-label="Mirrored mode: You choose pieces, opponent gets same"
          >
            <div className={styles.modeTitle}>Mirrored</div>
            <div className={styles.modeDescription}>
              You choose pieces, opponent gets the same setup
            </div>
          </button>

          <button
            className={styles.modeButton}
            onClick={() => onModeSelect('independent')}
            aria-label="Independent mode: Both players choose separately"
          >
            <div className={styles.modeTitle}>Independent</div>
            <div className={styles.modeDescription}>
              Both players choose their own pieces (hidden)
            </div>
          </button>

          <button
            className={styles.modeButton}
            onClick={() => onModeSelect('random')}
            aria-label="Random mode: Random pieces for both"
          >
            <div className={styles.modeTitle}>Random</div>
            <div className={styles.modeDescription}>
              Random pieces for both players (mirrored)
            </div>
          </button>
        </div>
      </div>
    );
  }

  // Get current pieces for this player
  const currentPieces = player1Pieces || [null, null, null];
  const allSelected = currentPieces.every(p => p !== null);

  // Available pieces for modal
  const selectedPieces = currentPieces.filter((p): p is PieceType => p !== null);
  const availablePieces = getAvailablePieces(selectedPieces);

  // Open modal for position
  const handleCellClick = (position: number) => {
    setSelectedPosition(position);
    setModalOpen(true);
  };

  // Select piece for position
  const handlePieceSelect = (piece: PieceType) => {
    if (selectedPosition !== null) {
      onPieceSelect(selectedPosition, piece);
      setSelectedPosition(null);
    }
  };

  // Confirm pieces and show first mover choice
  const handleConfirmPieces = () => {
    setShowFirstMoverChoice(true);
  };

  // First mover choice
  if (showFirstMoverChoice && !firstMover) {
    return (
      <div className={styles.container}>
        <h2 className={styles.title}>Who Goes First?</h2>
        <p className={styles.subtitle}>The first player will play as Light</p>
        <div className={styles.firstMoverButtons}>
          <button
            className={styles.firstMoverButton}
            onClick={() => {
              onFirstMoverSelect('player1');
              onConfirm();
            }}
          >
            I go first
          </button>
          <button
            className={styles.firstMoverButton}
            onClick={() => {
              onFirstMoverSelect('player2');
              onConfirm();
            }}
          >
            Opponent goes first
          </button>
          <button
            className={styles.firstMoverButton}
            onClick={() => {
              const random: FirstMover = Math.random() < 0.5 ? 'player1' : 'player2';
              onFirstMoverSelect(random);
              onConfirm();
            }}
          >
            Random
          </button>
        </div>
      </div>
    );
  }

  // Step 2: Piece selection board
  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Choose Your Pieces</h2>
      <p className={styles.subtitle}>Click each square to select a piece</p>

      {/* 3x3 Board */}
      <div className={styles.board} role="grid" aria-label="Piece selection board">
        {/* Row 0: Your pieces */}
        <div className={styles.row} role="row">
          {[0, 1, 2].map((col) => (
            <div
              key={`your-${col}`}
              className={styles.cell}
              role="gridcell"
              onClick={() => handleCellClick(col)}
              aria-label={
                currentPieces[col]
                  ? `${currentPieces[col]} selected, click to change`
                  : 'Click to choose piece'
              }
            >
              {currentPieces[col] ? (
                <span className={styles.piece} aria-hidden="true">
                  {PIECE_POOL[currentPieces[col]!].unicode.light}
                </span>
              ) : (
                <button className={styles.choosePieceButton}>
                  Choose Piece
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Row 1: Empty middle */}
        <div className={styles.row} role="row">
          {[0, 1, 2].map((col) => (
            <div
              key={`empty-${col}`}
              className={`${styles.cell} ${styles.emptyCell}`}
              role="gridcell"
              aria-label="Empty square"
            />
          ))}
        </div>

        {/* Row 2: Opponent's row (empty or hidden) */}
        <div className={styles.row} role="row">
          {[0, 1, 2].map((col) => (
            <div
              key={`opponent-${col}`}
              className={`${styles.cell} ${styles.opponentCell}`}
              role="gridcell"
              aria-label="Opponent's square"
            />
          ))}
        </div>
      </div>

      {/* Confirm button */}
      {allSelected && (
        <button
          className={styles.confirmButton}
          onClick={handleConfirmPieces}
        >
          Confirm Selection
        </button>
      )}

      {/* Piece picker modal */}
      <PiecePickerModal
        isOpen={modalOpen}
        availablePieces={availablePieces}
        onSelect={handlePieceSelect}
        onClose={() => {
          setModalOpen(false);
          setSelectedPosition(null);
        }}
      />
    </div>
  );
};
```

**CSS File**: `src/components/game/PieceSelectionScreen.module.css` (NEW)
```css
.container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-lg, 24px);
  padding: var(--spacing-lg, 24px);
}

.title {
  font-size: var(--font-size-xl, 2rem);
  font-weight: 600;
  margin: 0;
  text-align: center;
}

.subtitle {
  font-size: var(--font-size-md, 1rem);
  color: var(--text-secondary, #666);
  margin: 0;
  text-align: center;
}

/* Mode selection */
.modeButtons {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md, 16px);
  width: 100%;
  max-width: 400px;
}

.modeButton {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--spacing-sm, 8px);
  padding: var(--spacing-lg, 24px);
  border: 2px solid var(--border-primary, #ccc);
  border-radius: var(--border-radius-md, 6px);
  background-color: var(--bg-primary, #fff);
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.modeButton:hover {
  border-color: var(--border-focus, #4a9eff);
  background-color: var(--bg-hover, rgba(74, 158, 255, 0.1));
  transform: translateY(-2px);
}

.modeButton:focus {
  outline: 2px solid var(--border-focus, #4a9eff);
  outline-offset: 2px;
}

.modeTitle {
  font-size: var(--font-size-lg, 1.5rem);
  font-weight: 600;
}

.modeDescription {
  font-size: var(--font-size-sm, 0.875rem);
  color: var(--text-secondary, #666);
}

/* Board */
.board {
  display: flex;
  flex-direction: column;
  gap: 2px;
  background-color: var(--border-primary, #ccc);
  padding: 2px;
  border-radius: var(--border-radius-md, 6px);
}

.row {
  display: flex;
  gap: 2px;
}

.cell {
  width: 100px;
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--bg-board-light, #f0d9b5);
  cursor: pointer;
  transition: background-color 0.2s;
}

.cell:nth-child(even) {
  background-color: var(--bg-board-dark, #b58863);
}

.cell:hover {
  background-color: var(--bg-hover, rgba(74, 158, 255, 0.2));
}

.emptyCell {
  cursor: default;
  opacity: 0.5;
}

.opponentCell {
  cursor: default;
  opacity: 0.3;
  background-color: var(--bg-board-opponent, #ddd);
}

.piece {
  font-size: 3rem;
  line-height: 1;
}

.choosePieceButton {
  font-size: var(--font-size-sm, 0.875rem);
  padding: var(--spacing-sm, 8px);
  border: none;
  background-color: transparent;
  cursor: pointer;
  text-align: center;
}

/* Confirm button */
.confirmButton {
  padding: var(--spacing-md, 16px) var(--spacing-xl, 32px);
  font-size: var(--font-size-lg, 1.25rem);
  font-weight: 600;
  border: none;
  border-radius: var(--border-radius-md, 6px);
  background-color: var(--color-success, #28a745);
  color: white;
  cursor: pointer;
  transition: all 0.2s;
}

.confirmButton:hover {
  background-color: var(--color-success-hover, #218838);
  transform: scale(1.05);
}

.confirmButton:focus {
  outline: 2px solid var(--border-focus, #4a9eff);
  outline-offset: 2px;
}

/* First mover choice */
.firstMoverButtons {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md, 16px);
  width: 100%;
  max-width: 300px;
}

.firstMoverButton {
  padding: var(--spacing-lg, 24px);
  font-size: var(--font-size-lg, 1.25rem);
  font-weight: 600;
  border: 2px solid var(--border-primary, #ccc);
  border-radius: var(--border-radius-md, 6px);
  background-color: var(--bg-primary, #fff);
  cursor: pointer;
  transition: all 0.2s;
}

.firstMoverButton:hover {
  border-color: var(--border-focus, #4a9eff);
  background-color: var(--bg-hover, rgba(74, 158, 255, 0.1));
  transform: translateY(-2px);
}

.firstMoverButton:focus {
  outline: 2px solid var(--border-focus, #4a9eff);
  outline-offset: 2px;
}

/* Mobile responsive */
@media (max-width: 768px) {
  .cell {
    width: 80px;
    height: 80px;
  }

  .piece {
    font-size: 2.5rem;
  }
}
```

**Validation**:
```bash
pnpm test src/components/game/PieceSelectionScreen.test.tsx
```

---

### Phase 4: Integration (RED → GREEN)

#### TASK 4.1: Update App.tsx to Render Piece Selection Phase

**File**: `src/App.tsx`

**Test First** (RED):
```typescript
// Add to src/App.test.tsx
describe('App - Piece Selection Phase', () => {
  it('should show piece selection screen after setup', () => {
    const { container } = render(<App />);

    // Select mode
    fireEvent.click(screen.getByText(/hot-seat/i));

    // Enter name
    const nameInput = screen.getByLabelText(/your name/i);
    fireEvent.change(nameInput, { target: { value: 'Alice' } });

    // Start game
    fireEvent.click(screen.getByText(/start game/i));

    // Should show piece selection
    expect(screen.getByText(/choose selection mode/i)).toBeInTheDocument();
  });

  it('should transition to playing after piece selection complete', async () => {
    const { container } = render(<App />);

    // ... setup steps ...

    // Select mode
    fireEvent.click(screen.getByText(/mirrored/i));

    // Select pieces
    // ... piece selection interactions ...

    // Confirm
    fireEvent.click(screen.getByText(/confirm/i));

    // Choose first mover
    fireEvent.click(screen.getByText(/i go first/i));

    // Should transition to playing
    await waitFor(() => {
      expect(screen.getByRole('grid', { name: /chess board/i })).toBeInTheDocument();
    });
  });
});
```

**Implementation** (GREEN):
```typescript
// Add to App.tsx phase rendering (around line 300)

{state.phase === 'piece-selection' && (
  <div>
    <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 600, marginBottom: 'var(--spacing-lg)' }}>
      Piece Selection
    </h1>

    <PieceSelectionScreen
      selectionMode={state.selectionMode}
      player1Pieces={state.player1Pieces}
      player2Pieces={state.player2Pieces}
      firstMover={state.firstMover}
      currentPlayer={state.mode === 'url' ? 'player1' : 'player1'} // TODO: determine from context
      onModeSelect={(mode) => {
        if (mode === 'random') {
          // Generate random pieces immediately for both
          const seed = crypto.randomUUID();
          const pieces = generateRandomPieces(seed);
          dispatch({ type: 'SET_SELECTION_MODE', mode });
          dispatch({ type: 'SET_PLAYER_PIECES', player: 'player1', pieces });
          dispatch({ type: 'SET_PLAYER_PIECES', player: 'player2', pieces });
        } else {
          dispatch({ type: 'SET_SELECTION_MODE', mode });
        }
      }}
      onPieceSelect={(position, piece) => {
        // Update piece at position
        const currentPieces = state.player1Pieces || [null, null, null];
        const newPieces: SelectedPieces = [...currentPieces] as any;
        newPieces[position] = piece;

        dispatch({ type: 'SET_PLAYER_PIECES', player: 'player1', pieces: newPieces as SelectedPieces });

        // If mirrored mode, also set player 2 pieces
        if (state.selectionMode === 'mirrored') {
          dispatch({ type: 'SET_PLAYER_PIECES', player: 'player2', pieces: newPieces as SelectedPieces });
        }
      }}
      onFirstMoverSelect={(mover) => {
        dispatch({ type: 'SET_FIRST_MOVER', mover });
      }}
      onConfirm={() => {
        dispatch({ type: 'COMPLETE_PIECE_SELECTION' });
      }}
    />
  </div>
)}
```

**Also update START_GAME action**:
```typescript
case 'START_GAME':
  if (state.phase !== 'setup') return state;
  // CHANGE: Go to piece-selection instead of playing
  return {
    phase: 'piece-selection',
    mode: state.mode,
    player1Name: state.player1Name,
    player2Name: state.player2Name || '',
    selectionMode: null,
    player1Pieces: null,
    player2Pieces: null,
    firstMover: null,
  };
```

**Validation**:
```bash
pnpm test src/App.test.tsx
pnpm run check
```

---

#### TASK 4.2: Add localStorage Support

**File**: `src/lib/storage/localStorage.ts`

**Test First** (RED):
```typescript
// Add to src/lib/storage/localStorage.test.ts
describe('Piece Selection Storage', () => {
  it('should save and load piece selection', () => {
    const data: PieceSelectionData = {
      mode: 'mirrored',
      player1Pieces: ['rook', 'knight', 'bishop'],
      player2Pieces: ['rook', 'knight', 'bishop'],
      firstMover: 'player1',
    };

    storage.setPieceSelection(data);
    const loaded = storage.getPieceSelection();

    expect(loaded).toEqual(data);
  });

  it('should return null for invalid data', () => {
    localStorage.setItem('kings-cooking:piece-selection', 'invalid');
    const loaded = storage.getPieceSelection();
    expect(loaded).toBe(null);
  });

  it('should clear piece selection', () => {
    storage.setPieceSelection({ /* ... */ });
    storage.clearPieceSelection();
    expect(storage.getPieceSelection()).toBe(null);
  });
});
```

**Implementation** (GREEN):
```typescript
// Add to storage object
getPieceSelection(): PieceSelectionData | null {
  return getValidatedItem('piece-selection', PieceSelectionDataSchema);
},

setPieceSelection(data: PieceSelectionData): void {
  setValidatedItem('piece-selection', data, PieceSelectionDataSchema);
},

clearPieceSelection(): void {
  localStorage.removeItem('kings-cooking:piece-selection');
},
```

**Validation**:
```bash
pnpm test src/lib/storage/localStorage.test.ts
```

---

#### TASK 4.3: Update URL Encoding

**File**: `src/lib/urlEncoding/types.ts`

**Test First** (RED):
```typescript
// Add to src/lib/urlEncoding/types.test.ts
describe('FullStatePayload with PieceSelection', () => {
  it('should validate payload with piece selection', () => {
    const payload = {
      type: 'full_state',
      gameState: { /* ... */ },
      turn: 0,
      checksum: 'abc123',
      pieceSelection: {
        mode: 'mirrored',
        player1Pieces: ['rook', 'knight', 'bishop'],
        player2Pieces: ['rook', 'knight', 'bishop'],
        firstMover: 'player1',
      },
    };

    expect(() => FullStatePayloadSchema.parse(payload)).not.toThrow();
  });

  it('should allow missing piece selection', () => {
    const payload = {
      type: 'full_state',
      gameState: { /* ... */ },
      turn: 0,
      checksum: 'abc123',
      // No pieceSelection field
    };

    expect(() => FullStatePayloadSchema.parse(payload)).not.toThrow();
  });
});
```

**Implementation** (GREEN):
```typescript
// Update FullStatePayload
export const FullStatePayloadSchema = z.object({
  type: z.literal('full_state'),
  gameState: GameStateSchema,
  turn: z.number().int().min(0),
  checksum: z.string(),
  playerName: z.string().optional(),
  pieceSelection: z.object({
    mode: SelectionModeSchema,
    player1Pieces: SelectedPiecesSchema,
    player2Pieces: SelectedPiecesSchema,
    firstMover: FirstMoverSchema,
  }).optional(),
});
```

**Update builders** (`urlBuilder.ts`):
```typescript
export function buildFullStateUrl(
  gameState: GameState,
  playerName?: string,
  pieceSelection?: PieceSelectionData
): string {
  const payload: FullStatePayload = {
    type: 'full_state',
    gameState,
    turn: gameState.currentTurn,
    checksum: generateChecksum(gameState),
    playerName,
    pieceSelection,
  };

  return compressAndEncode(payload);
}
```

**Update parser** (`urlParser.ts`):
```typescript
// In handleUrlLoad function of reducer
case 'LOAD_FROM_URL': {
  // ... existing logic ...

  // If payload has piece selection, restore it
  if (payload.pieceSelection) {
    return {
      phase: 'piece-selection',
      mode: state.mode,
      player1Name: payload.gameState.lightPlayer.name,
      player2Name: payload.gameState.darkPlayer.name,
      selectionMode: payload.pieceSelection.mode,
      player1Pieces: payload.pieceSelection.player1Pieces,
      player2Pieces: payload.pieceSelection.player2Pieces,
      firstMover: payload.pieceSelection.firstMover,
    };
  }

  // ... rest of logic ...
}
```

**Validation**:
```bash
pnpm test src/lib/urlEncoding/types.test.ts
pnpm test src/lib/urlEncoding/urlBuilder.test.ts
pnpm test src/lib/urlEncoding/urlParser.test.ts
```

---

### Phase 5: Comprehensive Testing (RED → GREEN → REFACTOR)

#### TASK 5.1: Integration Tests

**File**: `src/lib/pieceSelection/integration.test.ts` (NEW)

```typescript
describe('Piece Selection Integration', () => {
  it('should complete full mirrored flow', () => {
    let state: GameFlowState = { phase: 'setup', mode: 'hotseat', player1Name: 'Alice' };

    // Start piece selection
    state = gameFlowReducer(state, { type: 'START_PIECE_SELECTION' });
    expect(state.phase).toBe('piece-selection');

    // Select mode
    state = gameFlowReducer(state, { type: 'SET_SELECTION_MODE', mode: 'mirrored' });

    // Select pieces
    state = gameFlowReducer(state, {
      type: 'SET_PLAYER_PIECES',
      player: 'player1',
      pieces: ['rook', 'knight', 'bishop']
    });

    // Should auto-set player2 pieces in mirrored mode
    if (state.phase === 'piece-selection') {
      expect(state.player1Pieces).toEqual(['rook', 'knight', 'bishop']);
    }

    // Set first mover
    state = gameFlowReducer(state, { type: 'SET_FIRST_MOVER', mover: 'player1' });

    // Complete selection
    state = gameFlowReducer(state, { type: 'COMPLETE_PIECE_SELECTION' });

    // Should transition to playing
    expect(state.phase).toBe('playing');
    if (state.phase === 'playing') {
      expect(state.gameState.board[0][0]?.type).toBe('rook');
      expect(state.gameState.board[0][1]?.type).toBe('knight');
      expect(state.gameState.board[0][2]?.type).toBe('bishop');
    }
  });

  it('should handle independent mode for URL game', () => {
    // Similar test but with independent mode and URL encoding
  });

  it('should handle random mode', () => {
    // Test random piece generation
  });
});
```

**Validation**:
```bash
pnpm test:integration
```

---

#### TASK 5.2: E2E Tests

**File**: `src/test/e2e/piece-selection.e2e.ts` (NEW)

```typescript
import { test, expect } from '@playwright/test';

test.describe('Piece Selection', () => {
  test('should allow player to select pieces in mirrored mode', async ({ page }) => {
    await page.goto('/');

    // Select hot-seat mode
    await page.click('text=Hot-Seat');

    // Enter name
    await page.fill('input[name="player1-name"]', 'Alice');
    await page.click('text=Start Game');

    // Should show piece selection
    await expect(page.locator('text=Choose Selection Mode')).toBeVisible();

    // Select mirrored mode
    await page.click('text=Mirrored');

    // Should show board
    await expect(page.locator('role=grid')).toBeVisible();

    // Select first piece
    await page.click('button:has-text("Choose Piece")').first();
    await expect(page.locator('role=dialog')).toBeVisible();
    await page.click('button:has-text("rook")');

    // Should show rook
    await expect(page.locator('text=♜')).toBeVisible();

    // Select remaining pieces
    await page.click('button:has-text("Choose Piece")').first();
    await page.click('button:has-text("knight")');

    await page.click('button:has-text("Choose Piece")').first();
    await page.click('button:has-text("bishop")');

    // Should show confirm button
    await expect(page.locator('button:has-text("Confirm")')).toBeVisible();
    await page.click('button:has-text("Confirm")');

    // Should show first mover choice
    await expect(page.locator('text=Who Goes First')).toBeVisible();

    // Choose first mover
    await page.click('button:has-text("I go first")');

    // Should transition to playing phase
    await expect(page.locator('role=grid[aria-label*="Chess board"]')).toBeVisible();
  });

  test('should respect piece limits', async ({ page }) => {
    // ... setup ...

    // Select rook twice
    // ... clicks ...

    // Should not show rook in third selection
    await page.click('button:has-text("Choose Piece")').first();
    await expect(page.locator('button:has-text("rook")')).not.toBeVisible();
  });

  test('should be keyboard accessible', async ({ page }) => {
    // ... setup ...

    // Tab through mode buttons
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');

    // Tab through piece selection
    // ... keyboard navigation tests ...
  });
});
```

**Validation**:
```bash
pnpm test:e2e
```

---

## Validation Loop

Run these commands in sequence. Fix failures before proceeding.

### Level 1: Syntax & Types
```bash
pnpm run check
```
**Expected**: No TypeScript errors

### Level 2: Unit Tests
```bash
pnpm test src/lib/pieceSelection/
pnpm test src/components/game/PiecePickerModal.test.tsx
pnpm test src/components/game/PieceSelectionScreen.test.tsx
```
**Expected**: All unit tests pass

### Level 3: Integration Tests
```bash
pnpm test:integration
```
**Expected**: Full flow tests pass

### Level 4: E2E Tests
```bash
pnpm test:e2e src/test/e2e/piece-selection.e2e.ts
```
**Expected**: Browser tests pass

### Level 5: Full Test Suite
```bash
pnpm test
```
**Expected**: All 694+ tests pass (including new tests)

### Level 6: Build
```bash
pnpm build
```
**Expected**: Clean production build

---

## Rollback Strategy

If implementation fails:

### Quick Rollback
```bash
git checkout main
git branch -D issue-6-piece-selection
```

### Partial Rollback (keep some changes)
```bash
# Revert specific files
git checkout main -- src/lib/gameFlow/reducer.ts
git checkout main -- src/types/gameFlow.ts
```

### Debug Strategy

**TypeScript Errors**:
- Check discriminated union exhaustiveness
- Verify all phase types have required fields
- Check SelectionMode import paths

**Test Failures**:
- Check mock setup for new reducer actions
- Verify PiecePickerModal focus trap
- Check CSS module class names

**Integration Issues**:
- Check App.tsx phase rendering order
- Verify START_GAME action transitions to piece-selection
- Check URL encoding/decoding with pieceSelection field

---

## Success Criteria

✅ Player 1 can choose selection mode (mirrored, independent, random)
✅ Player 1 can select 3 pieces from available pool
✅ Piece limits enforced (2 rooks, 2 knights, 2 bishops, 1 queen, 8 pawns)
✅ Player can change selections by clicking pieces
✅ Confirm button appears after all 3 pieces selected
✅ Player chooses who goes first (determines light/dark)
✅ Independent mode: Player 2 selects without seeing P1's choices
✅ Random mode: Hidden random pieces for both players
✅ Piece selection encoded in URL for Player 2
✅ Full WCAG 2.1 AA accessibility
✅ Mobile-responsive design
✅ All tests pass (80%+ coverage)
✅ Clean build

---

## Timeline Estimate

- **Phase 1** (Types): 2 hours
- **Phase 2** (Reducer): 3 hours
- **Phase 3** (UI Components): 8 hours
- **Phase 4** (Integration): 4 hours
- **Phase 5** (Testing): 6 hours
- **Buffer**: 3 hours

**Total**: ~26 hours (~3-4 days)

---

## Notes & Assumptions

1. **Deterministic Random**: Using simple djb2 hash for seeded random - sufficient for game purposes, not cryptographically secure
2. **Player Assignment**: First mover is always assigned to "light" pieces, impacts GameState creation
3. **URL Mode**: Piece selection data included in full_state payload, adds ~100 chars to URL
4. **Story Panel**: Assumes story panel is handled separately and piece selection happens after it closes
5. **No Back Button**: Once in piece selection, must complete it (per user requirement)
6. **CSS Variables**: Assumes CSS custom properties defined in global styles

---

**Created**: 2025-10-19
**Last Updated**: 2025-10-19
**Status**: Ready for Execution
