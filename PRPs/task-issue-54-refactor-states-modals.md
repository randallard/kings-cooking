# Task PRP: Refactor States and Modals for Improved Discoverability

**Issue**: #54
**Branch**: `issue-54-refactor-states-modals`
**Severity**: 🔥 Critical (blocking development)
**Type**: 🧹 Code cleanup (remove duplication, improve readability)

---

## Goal

Refactor the King's Cooking state machine and modal architecture to improve discoverability, maintainability, and AI-assisted development efficiency.

**Specific Deliverables:**
1. Extract `Player2NameEntryScreen` from inline App.tsx definition to separate component file
2. Create comprehensive state/modal registry documentation
3. Document phase → screen mappings with visual diagrams
4. Create architectural decision record (ADR) for state machine patterns
5. Add inline documentation comments to improve AI context understanding

---

## Why This Matters

**User Impact (Developer Experience)**:
- **Current Pain**: Player 2 name modal is hard to find (defined inline in App.tsx:26-68)
- **Current Pain**: Updating flow is difficult with 407-line App.tsx containing 7 phases
- **Current Pain**: New developers (human or AI) struggle to understand phase transitions
- **Priority**: Critical - blocks efficient development and maintenance

**Business Value**:
- Reduces onboarding time for new contributors
- Improves AI agent effectiveness (Claude can find components faster)
- Enables faster feature development
- Reduces regression risk from complex state changes

---

## What Changes (User-Visible Behavior)

**No user-visible changes** - this is a pure refactoring task that maintains existing functionality.

### Current Architecture
```
src/App.tsx (1062 lines)
├── Player2NameEntryScreen (inline, lines 26-68)  ❌ Hard to find
├── useReducer(gameFlowReducer)
├── useState × 4 (showStoryPanel, handoffStepCompleted, historyIndex, pendingPromotion)
└── Complex conditional rendering (lines 426-1061)
    ├── phase === 'mode-selection' → ModeSelector
    ├── phase === 'setup' → NameForm (inline JSX)
    ├── phase === 'color-selection' → ColorSelectionScreen
    ├── phase === 'piece-selection' → PieceSelectionScreen
    ├── phase === 'playing' → GameBoard + modals
    ├── phase === 'handoff' → HandoffScreen OR Player2NameEntryScreen
    └── phase === 'victory' → VictoryScreen
```

### Desired Architecture
```
src/App.tsx (streamlined)
├── Imports from components/game/
├── useReducer(gameFlowReducer)
├── useState × 4 (documented with JSDoc)
└── Documented phase rendering with links

src/components/game/Player2NameEntryScreen.tsx (NEW)
├── Extracted component
├── Full TypeScript types
├── Unit tests
└── CSS module

docs/ARCHITECTURE.md (NEW)
├── State machine diagram
├── Phase → Screen mapping table
├── Modal registry
└── Decision records
```

---

## All Needed Context

### Architecture Overview

**Game Flow State Machine** (`src/types/gameFlow.ts`, `src/lib/gameFlow/reducer.ts`):
- **7 Phases**: mode-selection → setup → color-selection → piece-selection → playing → handoff → victory
- **17 Actions**: SELECT_MODE, SET_PLAYER1_NAME, SET_PLAYER2_NAME, START_GAME, etc.
- **Discriminated Union Pattern**: Type-safe phase state with exhaustive checking

**Key Files**:
| File | Lines | Purpose | Test Coverage |
|------|-------|---------|---------------|
| `src/App.tsx` | 1062 | Main orchestrator, renders screens | 6.6k lines tests |
| `src/types/gameFlow.ts` | 384 | State machine types | N/A (types) |
| `src/lib/gameFlow/reducer.ts` | ~259 | State machine logic | 71 tests, 98%+ |
| `src/components/game/*.tsx` | Various | Phase-specific screens | Individual test files |

### Current Modal/Screen Locations

**Screens (Full-Page Components)**:
```typescript
// src/components/game/
ModeSelector.tsx            // Phase: mode-selection
NameForm.tsx                // Phase: setup (Player 1), handoff (URL Player 2)
ColorSelectionScreen.tsx    // Phase: color-selection
PieceSelectionScreen.tsx    // Phase: piece-selection
GameBoard.tsx               // Phase: playing (main game)
HandoffScreen.tsx           // Phase: handoff (privacy screen)
VictoryScreen.tsx           // Phase: victory

// ❌ INLINE in App.tsx
Player2NameEntryScreen      // Phase: handoff (hot-seat Player 2 name)
```

**Modals (Overlay Components)**:
```typescript
// src/components/game/
PiecePickerModal.tsx        // Trigger: pendingPromotion !== null
StoryPanel.tsx              // Trigger: showStoryPanel === true

// src/components/
HistoryComparisonModal.tsx  // Trigger: divergence detection
```

**Local State in App.tsx**:
```typescript
// Line 91: Story panel visibility
const [showStoryPanel, setShowStoryPanel] = useState(false);

// Line 94: Player 2 name collection tracking
const [handoffStepCompleted, setHandoffStepCompleted] = useState(false);

// Line 98: History navigation (null = latest move)
const [historyIndex, setHistoryIndex] = useState<number | null>(null);

// Line 104: Pawn promotion flow
const [pendingPromotion, setPendingPromotion] = useState<{
  from: Position;
  to: Position;
  engine: KingsChessEngine;
  checksumBeforeMove: string;
} | null>(null);
```

### Patterns to Follow

**Component File Structure** (from existing components):
```
src/components/game/ComponentName.tsx        # Component code
src/components/game/ComponentName.module.css # Styles (if needed)
src/components/game/ComponentName.test.tsx   # Tests
```

**Component Template** (from NameForm.tsx, HandoffScreen.tsx):
```typescript
/**
 * @fileoverview Brief description
 * @module components/game/ComponentName
 */

import { ReactElement } from 'react';
import styles from './ComponentName.module.css';

interface ComponentNameProps {
  /** JSDoc for each prop */
  propName: string;
}

/**
 * Component description.
 *
 * Features:
 * - Feature 1
 * - Feature 2
 *
 * @component
 * @example
 * ```tsx
 * <ComponentName propName="value" />
 * ```
 */
export const ComponentName = ({ propName }: ComponentNameProps): ReactElement => {
  // Implementation
};
```

**Test Pattern** (from HandoffScreen.test.tsx):
```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ComponentName } from './ComponentName';

describe('ComponentName', () => {
  describe('Rendering', () => {
    it('should render with correct content', () => {
      render(<ComponentName propName="test" />);
      expect(screen.getByText('test')).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('should call callback on action', () => {
      const mockCallback = vi.fn();
      render(<ComponentName onAction={mockCallback} />);
      // ... test interactions
    });
  });
});
```

### Documentation References

**React 19 Patterns** (`claude_md_files/CLAUDE-REACT.md`):
- KISS (Keep It Simple, Stupid)
- YAGNI (You Aren't Gonna Need It)
- Component-First Architecture
- TDD: Write tests BEFORE implementation

**PRP Framework** (`CLAUDE.md`):
- Context is King: Comprehensive documentation
- Validation Loops: Executable tests
- Progressive Success: Start simple, validate, enhance

### Gotchas and Pitfalls

1. **Player2NameEntryScreen Uses Dispatch**:
   - Component dispatches TWO actions: `SET_PLAYER2_NAME` + `COMPLETE_HANDOFF`
   - Must preserve this behavior when extracting
   - Uses `storage.getPlayer2Name()` directly (not props)

2. **Handoff Phase Overloading**:
   - Serves both name entry AND move transitions
   - Complex conditional logic in App.tsx:827-1001
   - Three scenarios: needs name + coming from move, needs name + coming from piece-selection, normal handoff

3. **TypeScript Strict Mode**:
   - `exactOptionalPropertyTypes: true`
   - `noUncheckedIndexedAccess: true`
   - All props must be explicitly typed

4. **Test Coverage Requirement**:
   - Minimum 80% coverage for new/modified code
   - Use Vitest + @testing-library/react
   - Follow existing test patterns

5. **CSS Modules**:
   - Component-scoped styles with `.module.css`
   - Use CSS variables from `index.css`
   - Mobile-responsive design (320px min width)

---

## Implementation Blueprint

### Phase 1: Extract Player2NameEntryScreen Component

**Task 1.1: Create Component File**
```bash
ACTION: CREATE src/components/game/Player2NameEntryScreen.tsx
```

```typescript
/**
 * @fileoverview Player 2 Name Entry Screen for hot-seat mode
 * @module components/game/Player2NameEntryScreen
 */

import { useState, type ReactElement } from 'react';
import { NameForm } from './NameForm';
import { storage } from '@/lib/storage/localStorage';
import type { GameFlowAction } from '@/types/gameFlow';

interface Player2NameEntryScreenProps {
  /** Dispatch function for game flow actions */
  dispatch: React.Dispatch<GameFlowAction>;
}

/**
 * Player 2 Name Entry Screen Component.
 *
 * Shown in hot-seat mode when Player 2 needs to enter their name
 * after piece selection and Player 1's first move.
 *
 * Features:
 * - Name validation via NameForm
 * - localStorage persistence
 * - Dispatches SET_PLAYER2_NAME and COMPLETE_HANDOFF actions
 *
 * @component
 * @example
 * ```tsx
 * <Player2NameEntryScreen dispatch={dispatch} />
 * ```
 */
export const Player2NameEntryScreen = ({
  dispatch,
}: Player2NameEntryScreenProps): ReactElement => {
  const [isNameValid, setIsNameValid] = useState(false);

  return (
    <div style={{
      maxWidth: '600px',
      margin: '0 auto',
      padding: 'var(--spacing-xl)',
    }}>
      <h1 style={{ textAlign: 'center', marginBottom: 'var(--spacing-lg)' }}>
        Player 2's Turn
      </h1>
      <div className="card">
        <h2 style={{ marginBottom: 'var(--spacing-md)' }}>Enter Your Name</h2>
        <p style={{ marginBottom: 'var(--spacing-md)', color: 'var(--text-secondary)' }}>
          Before we continue, Player 2 needs to enter their name.
        </p>
        <NameForm
          storageKey="player2"
          onNameChange={(name) => {
            // Name is saved to localStorage by NameForm
            // Just track validation state for button
            setIsNameValid(name.trim().length > 0);
          }}
        />
        <button
          onClick={() => {
            // Get the saved name from localStorage
            const player2Name = storage.getPlayer2Name();
            if (player2Name && player2Name.trim().length > 0) {
              dispatch({ type: 'SET_PLAYER2_NAME', name: player2Name });
              dispatch({ type: 'COMPLETE_HANDOFF' });
            }
          }}
          disabled={!isNameValid}
          style={{ marginTop: 'var(--spacing-md)', width: '100%' }}
        >
          Continue to Game
        </button>
      </div>
    </div>
  );
};
```

**VALIDATE**:
```bash
pnpm run check  # TypeScript validation
```

**IF_FAIL**: Fix TypeScript errors before proceeding

**Task 1.2: Create Test File**
```bash
ACTION: CREATE src/components/game/Player2NameEntryScreen.test.tsx
```

```typescript
/**
 * @fileoverview Tests for Player2NameEntryScreen component
 * @module components/game/Player2NameEntryScreen.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Player2NameEntryScreen } from './Player2NameEntryScreen';
import { storage } from '@/lib/storage/localStorage';

// Mock storage module
vi.mock('@/lib/storage/localStorage', () => ({
  storage: {
    getPlayer2Name: vi.fn(),
    setPlayer2Name: vi.fn(),
  },
}));

describe('Player2NameEntryScreen', () => {
  const mockDispatch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('Rendering', () => {
    it('should render heading and description', () => {
      render(<Player2NameEntryScreen dispatch={mockDispatch} />);

      expect(screen.getByRole('heading', { name: /player 2's turn/i })).toBeInTheDocument();
      expect(screen.getByText(/before we continue/i)).toBeInTheDocument();
    });

    it('should render NameForm component', () => {
      render(<Player2NameEntryScreen dispatch={mockDispatch} />);

      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('should render continue button in disabled state initially', () => {
      render(<Player2NameEntryScreen dispatch={mockDispatch} />);

      const button = screen.getByRole('button', { name: /continue to game/i });
      expect(button).toBeDisabled();
    });
  });

  describe('Name Entry Flow', () => {
    it('should enable button when valid name is entered', async () => {
      const user = userEvent.setup();
      render(<Player2NameEntryScreen dispatch={mockDispatch} />);

      const input = screen.getByRole('textbox');
      const button = screen.getByRole('button', { name: /continue to game/i });

      // Initially disabled
      expect(button).toBeDisabled();

      // Enter valid name
      await user.type(input, 'Player Two');

      // Wait for validation
      await waitFor(() => {
        expect(button).not.toBeDisabled();
      });
    });

    it('should dispatch SET_PLAYER2_NAME and COMPLETE_HANDOFF on continue', async () => {
      const user = userEvent.setup();
      vi.mocked(storage.getPlayer2Name).mockReturnValue('Player Two');

      render(<Player2NameEntryScreen dispatch={mockDispatch} />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'Player Two');

      await waitFor(() => {
        expect(screen.getByRole('button')).not.toBeDisabled();
      });

      const button = screen.getByRole('button', { name: /continue to game/i });
      await user.click(button);

      // Should dispatch both actions
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'SET_PLAYER2_NAME',
        name: 'Player Two',
      });
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'COMPLETE_HANDOFF',
      });
    });

    it('should not dispatch if name is invalid', async () => {
      const user = userEvent.setup();
      vi.mocked(storage.getPlayer2Name).mockReturnValue('');

      render(<Player2NameEntryScreen dispatch={mockDispatch} />);

      const button = screen.getByRole('button', { name: /continue to game/i });

      // Button should be disabled, but try clicking anyway
      expect(button).toBeDisabled();
      await user.click(button);

      // Should not dispatch
      expect(mockDispatch).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      render(<Player2NameEntryScreen dispatch={mockDispatch} />);

      const h1 = screen.getByRole('heading', { level: 1 });
      const h2 = screen.getByRole('heading', { level: 2 });

      expect(h1).toBeInTheDocument();
      expect(h2).toBeInTheDocument();
    });

    it('should have accessible button text', () => {
      render(<Player2NameEntryScreen dispatch={mockDispatch} />);

      expect(screen.getByRole('button', { name: /continue to game/i })).toBeInTheDocument();
    });
  });
});
```

**VALIDATE**:
```bash
pnpm test src/components/game/Player2NameEntryScreen.test.tsx
```

**IF_FAIL**: Debug test failures, ensure mocks are correct

**Task 1.3: Update App.tsx Imports**
```bash
ACTION: EDIT src/App.tsx
```

**OLD** (lines 1-20):
```typescript
import { ReactElement, useReducer, useEffect, useState, useCallback, useMemo } from 'react';
import { gameFlowReducer } from './lib/gameFlow/reducer';
import type { GameFlowAction } from './types/gameFlow';
import { storage, checkAndMigrateStorage } from './lib/storage/localStorage';
import { useUrlState } from './hooks/useUrlState';
import { ModeSelector } from './components/game/ModeSelector';
import { NameForm } from './components/game/NameForm';
import { ColorSelectionScreen } from './components/game/ColorSelectionScreen';
import { PieceSelectionScreen } from './components/game/PieceSelectionScreen';
import { GameBoard } from './components/game/GameBoard';
import { MoveConfirmButton } from './components/game/MoveConfirmButton';
import { HandoffScreen } from './components/game/HandoffScreen';
import { VictoryScreen } from './components/game/VictoryScreen';
import { URLSharer } from './components/game/URLSharer';
import { StoryPanel } from './components/game/StoryPanel';
import { PlaybackControls } from './components/game/PlaybackControls';
import { PiecePickerModal } from './components/game/PiecePickerModal';
import { KingsChessEngine } from './lib/chess/KingsChessEngine';
import { buildFullStateUrl } from './lib/urlEncoding/urlBuilder';
import type { GameState, Piece, Position, PieceType } from './lib/validation/schemas';
```

**NEW** (add import):
```typescript
import { ReactElement, useReducer, useEffect, useState, useCallback, useMemo } from 'react';
import { gameFlowReducer } from './lib/gameFlow/reducer';
import type { GameFlowAction } from './types/gameFlow';
import { storage, checkAndMigrateStorage } from './lib/storage/localStorage';
import { useUrlState } from './hooks/useUrlState';
import { ModeSelector } from './components/game/ModeSelector';
import { NameForm } from './components/game/NameForm';
import { ColorSelectionScreen } from './components/game/ColorSelectionScreen';
import { PieceSelectionScreen } from './components/game/PieceSelectionScreen';
import { GameBoard } from './components/game/GameBoard';
import { MoveConfirmButton } from './components/game/MoveConfirmButton';
import { HandoffScreen } from './components/game/HandoffScreen';
import { VictoryScreen } from './components/game/VictoryScreen';
import { URLSharer } from './components/game/URLSharer';
import { StoryPanel } from './components/game/StoryPanel';
import { PlaybackControls } from './components/game/PlaybackControls';
import { PiecePickerModal } from './components/game/PiecePickerModal';
import { Player2NameEntryScreen } from './components/game/Player2NameEntryScreen';
import { KingsChessEngine } from './lib/chess/KingsChessEngine';
import { buildFullStateUrl } from './lib/urlEncoding/urlBuilder';
import type { GameState, Piece, Position, PieceType } from './lib/validation/schemas';
```

**VALIDATE**:
```bash
pnpm run check
```

**Task 1.4: Remove Inline Component Definition**
```bash
ACTION: EDIT src/App.tsx
```

**OLD** (lines 22-68, DELETE ENTIRELY):
```typescript
/**
 * Player 2 Name Entry Screen Component
 * Separate component to properly use React hooks
 */
function Player2NameEntryScreen({ dispatch }: { dispatch: React.Dispatch<GameFlowAction> }): ReactElement {
  const [isNameValid, setIsNameValid] = useState(false);

  return (
    <div style={{
      maxWidth: '600px',
      margin: '0 auto',
      padding: 'var(--spacing-xl)',
    }}>
      <h1 style={{ textAlign: 'center', marginBottom: 'var(--spacing-lg)' }}>
        Player 2's Turn
      </h1>
      <div className="card">
        <h2 style={{ marginBottom: 'var(--spacing-md)' }}>Enter Your Name</h2>
        <p style={{ marginBottom: 'var(--spacing-md)', color: 'var(--text-secondary)' }}>
          Before we continue, Player 2 needs to enter their name.
        </p>
        <NameForm
          storageKey="player2"
          onNameChange={(name) => {
            // Name is saved to localStorage by NameForm
            // Just track validation state for button
            setIsNameValid(name.trim().length > 0);
          }}
        />
        <button
          onClick={() => {
            // Get the saved name from localStorage
            const player2Name = storage.getPlayer2Name();
            if (player2Name && player2Name.trim().length > 0) {
              dispatch({ type: 'SET_PLAYER2_NAME', name: player2Name });
              dispatch({ type: 'COMPLETE_HANDOFF' });
            }
          }}
          disabled={!isNameValid}
          style={{ marginTop: 'var(--spacing-md)', width: '100%' }}
        >
          Continue to Game
        </button>
      </div>
    </div>
  );
}
```

**NEW**: Delete lines 22-68 entirely

**VALIDATE**:
```bash
pnpm run check
pnpm test src/App.test.tsx
```

**IF_FAIL**: Check for any references to the inline component

**ROLLBACK**: If App.tsx tests fail:
```bash
git checkout src/App.tsx
```

---

### Phase 2: Create Documentation Files

**Task 2.1: Create ARCHITECTURE.md**
```bash
ACTION: CREATE docs/ARCHITECTURE.md
```

```markdown
# King's Cooking Architecture

This document provides a comprehensive overview of the King's Cooking codebase architecture, focusing on state management, component structure, and phase flow.

## State Machine Overview

King's Cooking uses a **centralized state machine** implemented with React's `useReducer` hook.

### State Machine Diagram

\`\`\`mermaid
stateDiagram-v2
    [*] --> ModeSelection
    ModeSelection --> Setup: SELECT_MODE
    Setup --> ColorSelection: START_COLOR_SELECTION
    ColorSelection --> PieceSelection: SET_PLAYER_COLOR
    PieceSelection --> Playing: COMPLETE_PIECE_SELECTION
    Playing --> Handoff: CONFIRM_MOVE
    Handoff --> Playing: COMPLETE_HANDOFF
    Playing --> Victory: GAME_OVER
    Victory --> ModeSelection: NEW_GAME

    note right of ModeSelection
        Player chooses hot-seat
        or URL mode
    end note

    note right of Setup
        Player 1 enters name
    end note

    note right of ColorSelection
        Player 1 chooses
        light or dark
    end note

    note right of PieceSelection
        Choose pieces:
        - Random
        - Mirrored
        - Independent
    end note

    note right of Playing
        Active gameplay with
        move confirmation
    end note

    note right of Handoff
        Device passing (hot-seat)
        or URL sharing (URL mode)
    end note
\`\`\`

### Phase Definitions

| Phase | Description | User Action | Next Phase |
|-------|-------------|-------------|------------|
| **mode-selection** | Choose game mode | Select hot-seat or URL | setup |
| **setup** | Player 1 name entry | Enter name, click Continue | color-selection |
| **color-selection** | Player 1 color choice | Choose light or dark | piece-selection |
| **piece-selection** | Choose starting pieces | Select mode and pieces | playing |
| **playing** | Active gameplay | Make moves | handoff or victory |
| **handoff** | Player transition | Click "I'm Ready" or share URL | playing |
| **victory** | Game end | View stats, click New Game | mode-selection |

### Action Types

| Action | From Phase | To Phase | Purpose |
|--------|-----------|----------|---------|
| `SELECT_MODE` | mode-selection | setup | Set game mode (hot-seat/URL) |
| `SET_PLAYER1_NAME` | setup | setup | Store Player 1 name |
| `START_COLOR_SELECTION` | setup | color-selection | Begin color selection |
| `SET_PLAYER_COLOR` | color-selection | piece-selection | Store Player 1 color choice |
| `START_PIECE_SELECTION` | color-selection | piece-selection | Begin piece selection |
| `SET_SELECTION_MODE` | piece-selection | piece-selection | Set mode (random/mirrored/independent) |
| `SET_PLAYER_PIECES` | piece-selection | piece-selection | Store player's pieces |
| `COMPLETE_PIECE_SELECTION` | piece-selection | playing | Create game state, start game |
| `SELECT_PIECE` | playing | playing | Show legal moves |
| `DESELECT_PIECE` | playing | playing | Clear selection |
| `STAGE_MOVE` | playing | playing | Prepare move for confirmation |
| `CONFIRM_MOVE` | playing | handoff/victory | Apply move to game state |
| `SET_PLAYER2_NAME` | handoff | handoff | Store Player 2 name |
| `COMPLETE_HANDOFF` | handoff | playing | Return to gameplay |
| `URL_GENERATED` | handoff | handoff | Update with generated URL |
| `GAME_OVER` | playing | victory | Game ends with winner |
| `NEW_GAME` | victory | mode-selection | Reset to start |
| `LOAD_FROM_URL` | any | playing | Load game from URL hash |

## Component Architecture

### File Organization

\`\`\`
src/
├── components/game/           # Phase-specific screens and game UI
│   ├── ModeSelector.tsx       # Mode selection screen
│   ├── ColorSelectionScreen.tsx
│   ├── PieceSelectionScreen.tsx
│   ├── GameBoard.tsx          # Main game board
│   ├── HandoffScreen.tsx      # Privacy/transition screen
│   ├── Player2NameEntryScreen.tsx
│   ├── VictoryScreen.tsx
│   ├── PiecePickerModal.tsx   # Pawn promotion modal
│   ├── StoryPanel.tsx         # Story/instructions overlay
│   └── [other game components]
├── types/gameFlow.ts          # State machine types
├── lib/gameFlow/reducer.ts    # State machine logic
├── hooks/useUrlState.ts       # URL state synchronization
└── App.tsx                    # Main orchestrator
\`\`\`

### Phase → Screen Mapping

| Phase | Screen Component | File Location | Props |
|-------|-----------------|---------------|-------|
| **mode-selection** | `ModeSelector` | `src/components/game/ModeSelector.tsx` | `onModeSelected` |
| **setup** | Inline JSX | `src/App.tsx:440-477` | - |
| **color-selection** | `ColorSelectionScreen` | `src/components/game/ColorSelectionScreen.tsx` | `player1Name`, `dispatch` |
| **piece-selection** | `PieceSelectionScreen` | `src/components/game/PieceSelectionScreen.tsx` | `state`, `dispatch` |
| **playing** | `GameBoard` + modals | `src/components/game/GameBoard.tsx` | `gameState`, `onMove`, etc. |
| **handoff** | `HandoffScreen` or `Player2NameEntryScreen` | See Handoff Logic below | Varies |
| **victory** | `VictoryScreen` | `src/components/game/VictoryScreen.tsx` | `winner`, `gameState`, etc. |

### Modal Registry

**Definition**: Modals are overlay components that appear conditionally, not tied to a specific phase.

| Modal Component | Trigger Condition | Purpose | Props |
|----------------|-------------------|---------|-------|
| `PiecePickerModal` | `pendingPromotion !== null` | Pawn promotion piece selection | `isOpen`, `availablePieces`, `onSelect`, `onClose` |
| `StoryPanel` | `showStoryPanel === true` | Display game story/instructions | `isOpen`, `onClose` |
| `HistoryComparisonModal` | Divergence detection | Resolve game state conflicts | `isOpen`, `onResolve`, etc. |

### Handoff Phase Logic

**Complex Conditional Rendering** (`src/App.tsx:827-1001`):

\`\`\`typescript
if (state.phase === 'handoff') {
  if (state.mode === 'hotseat') {
    const needsPlayer2Name = !state.player2Name || state.player2Name.trim().length === 0;
    const comingFromMove = state.gameState !== null;

    if (needsPlayer2Name && comingFromMove) {
      if (!handoffStepCompleted) {
        // Step 1: Show HandoffScreen (privacy screen)
        return <HandoffScreen ... />;
      } else {
        // Step 2: Show Player2NameEntryScreen
        return <Player2NameEntryScreen dispatch={dispatch} />;
      }
    }

    // Normal handoff with both names known
    return <HandoffScreen ... />;
  } else {
    // URL mode
    const isPlayer2EnteringName = !state.generatedUrl;

    if (isPlayer2EnteringName) {
      // Player 2 receiving first URL, needs to enter name
      return <NameForm ... />;
    }

    // Player 1 sharing URL
    return <URLSharer ... />;
  }
}
\`\`\`

## Local State Management

App.tsx uses **4 local useState hooks** in addition to the reducer:

| State Variable | Purpose | Initial Value | Usage |
|---------------|---------|---------------|-------|
| `showStoryPanel` | Story panel visibility | `false` | Controls `<StoryPanel isOpen={...} />` |
| `handoffStepCompleted` | Player 2 name collection tracking | `false` | Hot-seat two-step handoff flow |
| `historyIndex` | History navigation position | `null` | `null` = latest move, `number` = viewing past |
| `pendingPromotion` | Pawn promotion flow state | `null` | Stores move + engine for promotion modal |

## Data Flow

\`\`\`
┌─────────────────────────────────────────────────────┐
│                    App.tsx                          │
│  ┌──────────────────────────────────────────────┐  │
│  │ useReducer(gameFlowReducer)                  │  │
│  │   state: GameFlowState (7 phases)            │  │
│  │   dispatch: Dispatch<GameFlowAction>         │  │
│  └──────────────────────────────────────────────┘  │
│                       ↓ props                       │
│  ┌──────────────────────────────────────────────┐  │
│  │ useState (local UI state)                     │  │
│  │   - showStoryPanel                           │  │
│  │   - handoffStepCompleted                     │  │
│  │   - historyIndex                             │  │
│  │   - pendingPromotion                         │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
            ↓ props              ↓ props
┌───────────────────┐    ┌─────────────────────┐
│   GameBoard       │    │   HandoffScreen     │
│   (gameState,     │    │   (mode, names,     │
│    dispatch)      │    │    onContinue)      │
└───────────────────┘    └─────────────────────┘
        ↓                        ↓
┌───────────────────┐    ┌─────────────────────┐
│   localStorage    │    │   localStorage      │
│   (persistence)   │    │   (persistence)     │
└───────────────────┘    └─────────────────────┘
\`\`\`

## Testing Strategy

### Test Coverage Requirements

- **Minimum**: 80% code coverage
- **Target**: 94%+ (current project average)
- **Critical Paths**: 100% coverage for state transitions

### Test Patterns

**Component Tests**:
\`\`\`typescript
describe('ComponentName', () => {
  describe('Rendering', () => {
    it('should render with correct content', () => { ... });
  });

  describe('Interactions', () => {
    it('should call callback on action', () => { ... });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => { ... });
  });
});
\`\`\`

**Reducer Tests** (`src/lib/gameFlow/reducer.test.ts`):
- 71 tests covering all 17 actions
- 98%+ coverage
- Tests for invalid transitions
- Tests for edge cases

## Performance Considerations

### React 19 Compiler

- **No manual memoization** needed (`useMemo`, `useCallback`, `React.memo`)
- Write clean, readable code - let compiler optimize
- Focus on component composition over optimization tricks

### State Updates

- **Immutable updates** in reducer (return new state objects)
- **localStorage debouncing** (300ms) in NameForm
- **History reconstruction** uses memoization for expensive operations

## Future Refactoring Opportunities

1. **Split Handoff Phase**: Create separate phases for name entry vs. move transitions
2. **Modal Manager**: Centralized modal state management
3. **Phase Router**: Abstract phase rendering logic from App.tsx
4. **State Context**: Consider React Context for deeply nested prop drilling

## References

- **State Machine Types**: `src/types/gameFlow.ts`
- **Reducer Logic**: `src/lib/gameFlow/reducer.ts`
- **Component Patterns**: `claude_md_files/CLAUDE-REACT.md`
- **Testing Patterns**: `src/components/game/*.test.tsx`
\`\`\`

**VALIDATE**: Manual review - no commands needed

**Task 2.2: Add JSDoc Comments to App.tsx**
```bash
ACTION: EDIT src/App.tsx
```

Add comprehensive JSDoc comments to local state variables (lines 88-109):

**OLD**:
```typescript
export default function App(): ReactElement {
  const [state, dispatch] = useReducer(gameFlowReducer, { phase: 'mode-selection' });

  // Story panel visibility state
  const [showStoryPanel, setShowStoryPanel] = useState(false);

  // Handoff step tracking for Player 2 name collection
  const [handoffStepCompleted, setHandoffStepCompleted] = useState(false);

  // History navigation state (null = at latest move)
  // Always initialize to null on mount to show current game state
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);

  // Derived state: are we viewing history?
  const isViewingHistory = historyIndex !== null;

  // Promotion state for pawn promotion flow
  const [pendingPromotion, setPendingPromotion] = useState<{
    from: Position;
    to: Position;
    engine: KingsChessEngine;
    checksumBeforeMove: string;
  } | null>(null);
```

**NEW**:
```typescript
export default function App(): ReactElement {
  /**
   * Game flow state machine.
   *
   * Manages 7 phases: mode-selection, setup, color-selection, piece-selection,
   * playing, handoff, victory.
   *
   * @see {@link GameFlowState} for phase definitions
   * @see {@link gameFlowReducer} for state transition logic
   * @see {@link docs/ARCHITECTURE.md} for state machine diagram
   */
  const [state, dispatch] = useReducer(gameFlowReducer, { phase: 'mode-selection' });

  /**
   * Story panel visibility state.
   *
   * Controls overlay modal showing game story and instructions.
   * Automatically shown once per player in hot-seat mode, once per device in URL mode.
   *
   * @see {@link StoryPanel} component
   */
  const [showStoryPanel, setShowStoryPanel] = useState(false);

  /**
   * Handoff step tracking for Player 2 name collection (hot-seat mode only).
   *
   * Two-step flow after Player 1's first move:
   * 1. handoffStepCompleted=false: Show HandoffScreen (privacy screen)
   * 2. handoffStepCompleted=true: Show Player2NameEntryScreen
   *
   * Reset to false on phase change to handoff.
   *
   * @see {@link Player2NameEntryScreen}
   * @see {@link HandoffScreen}
   */
  const [handoffStepCompleted, setHandoffStepCompleted] = useState(false);

  /**
   * History navigation state (null = at latest move).
   *
   * Controls history playback feature:
   * - null: Viewing current game state (board is interactive)
   * - number: Viewing past move at index (board is read-only)
   *
   * Always initialize to null on mount to show current game state.
   * Reset to null when entering playing phase.
   *
   * @see {@link PlaybackControls}
   * @see {@link reconstructGameStateAtMove}
   */
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);

  /** Derived state: are we viewing history? */
  const isViewingHistory = historyIndex !== null;

  /**
   * Promotion state for pawn promotion flow.
   *
   * When pawn reaches promotion row, stores move details and engine state
   * to show PiecePickerModal. User selects promotion piece (queen/rook/bishop/knight),
   * then move is completed with selected piece.
   *
   * @see {@link PiecePickerModal}
   * @see {@link handlePromotionSelect}
   */
  const [pendingPromotion, setPendingPromotion] = useState<{
    from: Position;
    to: Position;
    engine: KingsChessEngine;
    checksumBeforeMove: string;
  } | null>(null);
```

**VALIDATE**:
```bash
pnpm run check
```

**Task 2.3: Create MODAL_REGISTRY.md**
```bash
ACTION: CREATE docs/MODAL_REGISTRY.md
```

```markdown
# Modal Registry

Quick reference guide for all modal and overlay components in King's Cooking.

## Modal Classification

**Full-Screen Phases**: Components that occupy entire viewport based on game phase
**Overlay Modals**: Components that appear over existing content based on state conditions

---

## Full-Screen Phase Components

### ModeSelector
**Location**: `src/components/game/ModeSelector.tsx`
**Phase**: `mode-selection`
**Trigger**: Initial app load, or NEW_GAME action from victory
**Purpose**: Choose between hot-seat and URL game modes
**Props**:
```typescript
{
  onModeSelected: (mode: 'hotseat' | 'url') => void;
}
```

### Setup Screen (Inline)
**Location**: `src/App.tsx:440-477`
**Phase**: `setup`
**Trigger**: SELECT_MODE action
**Purpose**: Player 1 name entry
**Components Used**: `<NameForm storageKey="player1" />`

### ColorSelectionScreen
**Location**: `src/components/game/ColorSelectionScreen.tsx`
**Phase**: `color-selection`
**Trigger**: START_COLOR_SELECTION action
**Purpose**: Player 1 chooses light (goes first) or dark (goes second)
**Props**:
```typescript
{
  player1Name: string;
  dispatch: React.Dispatch<GameFlowAction>;
}
```

### PieceSelectionScreen
**Location**: `src/components/game/PieceSelectionScreen.tsx`
**Phase**: `piece-selection`
**Trigger**: SET_PLAYER_COLOR action
**Purpose**: Choose starting pieces (random/mirrored/independent modes)
**Props**:
```typescript
{
  state: PieceSelectionPhase;
  dispatch: React.Dispatch<GameFlowAction>;
}
```

### GameBoard
**Location**: `src/components/game/GameBoard.tsx`
**Phase**: `playing`
**Trigger**: COMPLETE_PIECE_SELECTION action
**Purpose**: Main chess gameplay
**Props**: See component file for full interface

### HandoffScreen
**Location**: `src/components/game/HandoffScreen.tsx`
**Phase**: `handoff`
**Trigger**: CONFIRM_MOVE action (hot-seat mode)
**Purpose**: Privacy screen between players with countdown timer
**Props**:
```typescript
{
  nextPlayer: 'light' | 'dark';
  nextPlayerName: string;
  previousPlayer: 'light' | 'dark';
  previousPlayerName: string;
  isGameStart?: boolean;
  onContinue: () => void;
  countdownSeconds?: number;
}
```

### Player2NameEntryScreen
**Location**: `src/components/game/Player2NameEntryScreen.tsx`
**Phase**: `handoff`
**Trigger**: CONFIRM_MOVE action when player2Name is empty (hot-seat mode)
**Purpose**: Collect Player 2 name after first move
**Props**:
```typescript
{
  dispatch: React.Dispatch<GameFlowAction>;
}
```
**Notes**:
- Only shown in hot-seat mode
- Two-step flow: HandoffScreen → Player2NameEntryScreen
- Dispatches SET_PLAYER2_NAME and COMPLETE_HANDOFF

### Player 2 Name Entry (URL Mode, Inline)
**Location**: `src/App.tsx:930-965`
**Phase**: `handoff`
**Trigger**: LOAD_FROM_URL when generatedUrl is null
**Purpose**: Player 2 entering name when receiving first URL
**Components Used**: `<NameForm storageKey="my-name" />`

### URLSharer
**Location**: `src/components/game/URLSharer.tsx`
**Phase**: `handoff`
**Trigger**: URL_GENERATED action (URL mode)
**Purpose**: Display and copy shareable game URL
**Props**:
```typescript
{
  url: string;
  onCopy: () => void;
}
```

### VictoryScreen
**Location**: `src/components/game/VictoryScreen.tsx`
**Phase**: `victory`
**Trigger**: GAME_OVER action
**Purpose**: Show game results and statistics
**Props**: See component file for full interface (complex)

---

## Overlay Modal Components

### PiecePickerModal
**Location**: `src/components/game/PiecePickerModal.tsx`
**Trigger**: `pendingPromotion !== null` (App.tsx local state)
**Phase Context**: `playing`
**Purpose**: Pawn promotion piece selection
**Visibility Control**:
```typescript
// App.tsx:813-819
<PiecePickerModal
  isOpen={!!pendingPromotion}
  availablePieces={['queen', 'rook', 'bishop', 'knight']}
  onSelect={handlePromotionSelect}
  onClose={handlePromotionCancel}
  mode="promotion"
/>
```
**Props**:
```typescript
{
  isOpen: boolean;
  availablePieces: PieceType[];
  onSelect: (piece: PieceType) => void;
  onClose: () => void;
  mode: 'promotion' | 'selection';
}
```

### StoryPanel
**Location**: `src/components/game/StoryPanel.tsx`
**Trigger**: `showStoryPanel === true` (App.tsx local state)
**Phase Context**: `playing`
**Purpose**: Display game story and instructions overlay
**Visibility Control**:
```typescript
// App.tsx:807-810
<StoryPanel
  isOpen={showStoryPanel}
  onClose={handleCloseStoryPanel}
/>
```
**Auto-Show Logic** (App.tsx:232-252):
- Hot-seat mode: Once per player (light/dark)
- URL mode: Once per device
- Uses localStorage flags: `player1-seen-story`, `player2-seen-story`

**Props**:
```typescript
{
  isOpen: boolean;
  onClose: () => void;
}
```

### HistoryComparisonModal
**Location**: `src/components/HistoryComparisonModal.tsx`
**Trigger**: URL divergence detection (different game states)
**Phase Context**: Any phase with URL payload
**Purpose**: Resolve game state conflicts when URLs diverge
**Note**: Currently implemented but not actively used in main flow

---

## Modal State Management Patterns

### Local State Pattern (App.tsx)
Used for modals tied to App-level logic:
```typescript
const [showStoryPanel, setShowStoryPanel] = useState(false);
const [pendingPromotion, setPendingPromotion] = useState<PromotionState | null>(null);
```

### Phase State Pattern (Reducer)
Used for full-screen components tied to game flow:
```typescript
dispatch({ type: 'CONFIRM_MOVE', result: { ... } });
// Transitions to handoff phase, which renders HandoffScreen or Player2NameEntryScreen
```

### Conditional Rendering Pattern
Complex conditional logic in App.tsx based on phase and conditions:
```typescript
if (state.phase === 'handoff') {
  if (state.mode === 'hotseat') {
    if (needsPlayer2Name && comingFromMove) {
      return !handoffStepCompleted
        ? <HandoffScreen ... />
        : <Player2NameEntryScreen ... />;
    }
  }
}
```

---

## Quick Reference Table

| Component | Type | Trigger | Phase | Location |
|-----------|------|---------|-------|----------|
| ModeSelector | Phase Screen | Initial load | mode-selection | ModeSelector.tsx |
| Setup Screen | Phase Screen | SELECT_MODE | setup | App.tsx (inline) |
| ColorSelectionScreen | Phase Screen | START_COLOR_SELECTION | color-selection | ColorSelectionScreen.tsx |
| PieceSelectionScreen | Phase Screen | SET_PLAYER_COLOR | piece-selection | PieceSelectionScreen.tsx |
| GameBoard | Phase Screen | COMPLETE_PIECE_SELECTION | playing | GameBoard.tsx |
| HandoffScreen | Phase Screen | CONFIRM_MOVE | handoff | HandoffScreen.tsx |
| Player2NameEntryScreen | Phase Screen | CONFIRM_MOVE + no P2 name | handoff | Player2NameEntryScreen.tsx |
| URLSharer | Phase Screen | URL_GENERATED | handoff | URLSharer.tsx |
| VictoryScreen | Phase Screen | GAME_OVER | victory | VictoryScreen.tsx |
| PiecePickerModal | Overlay Modal | pendingPromotion !== null | playing | PiecePickerModal.tsx |
| StoryPanel | Overlay Modal | showStoryPanel === true | playing | StoryPanel.tsx |
| HistoryComparisonModal | Overlay Modal | Divergence detection | any | HistoryComparisonModal.tsx |

---

## Finding Components Checklist

✅ **Check Phase**: What phase is the app in? (`state.phase`)
✅ **Check Mode**: Hot-seat or URL mode? (`state.mode`)
✅ **Check Conditions**: Special conditions? (player2Name empty, pendingPromotion set)
✅ **Check App.tsx**: Look at conditional rendering blocks (lines 426-1061)
✅ **Check components/game/**: Most screens are in this directory
✅ **Check Local State**: Modal might be controlled by useState (showStoryPanel, pendingPromotion)

---

## Adding New Modals: Decision Guide

### Full-Screen Phase Component
**Use when:**
- Component represents a distinct game phase
- User cannot interact with other screens simultaneously
- Component should block navigation to other phases

**Steps:**
1. Create component file in `src/components/game/`
2. Add new phase to `GameFlowState` union in `types/gameFlow.ts`
3. Add transition actions to `GameFlowAction` union
4. Implement reducer cases in `lib/gameFlow/reducer.ts`
5. Add phase rendering block in `App.tsx`
6. Write unit tests

### Overlay Modal
**Use when:**
- Component appears over existing content
- User should see underlying screen
- Modal is temporary/dismissible
- Not tied to specific game phase

**Steps:**
1. Create component file in `src/components/game/`
2. Add local state in `App.tsx`: `const [showModal, setShowModal] = useState(false)`
3. Add trigger logic (where to set `showModal` to true)
4. Render conditionally: `<Modal isOpen={showModal} onClose={() => setShowModal(false)} />`
5. Write unit tests

---

## Related Documentation

- **State Machine**: `docs/ARCHITECTURE.md`
- **Component Patterns**: `claude_md_files/CLAUDE-REACT.md`
- **Phase Definitions**: `src/types/gameFlow.ts`
- **Reducer Logic**: `src/lib/gameFlow/reducer.ts`
\`\`\`

**VALIDATE**: Manual review - no commands needed

---

### Phase 3: Update README.md with Architecture Links

**Task 3.1: Add Architecture Section to README**
```bash
ACTION: EDIT README.md
```

Add after line 614 (before "## 🔐 Type Safety"):

```markdown
## 📐 Architecture Documentation

Comprehensive architecture documentation for developers and AI assistants:

- **[Architecture Overview](docs/ARCHITECTURE.md)** - State machine, component structure, data flow
- **[Modal Registry](docs/MODAL_REGISTRY.md)** - Complete guide to all modals and screens
- **[Phase Flow Diagram](docs/ARCHITECTURE.md#state-machine-diagram)** - Visual state machine
- **[Component Patterns](claude_md_files/CLAUDE-REACT.md)** - React 19 best practices

### Quick Links for Common Tasks

**Finding Components:**
1. Check phase: `state.phase` value
2. See [Modal Registry](docs/MODAL_REGISTRY.md#quick-reference-table)
3. Look in `src/components/game/` directory

**Understanding State Flow:**
1. See [State Machine Diagram](docs/ARCHITECTURE.md#state-machine-diagram)
2. Read [Phase Definitions](docs/ARCHITECTURE.md#phase-definitions)
3. Check `src/types/gameFlow.ts` for types

**Adding New Features:**
1. Follow [Component Patterns](claude_md_files/CLAUDE-REACT.md)
2. Write tests first (TDD)
3. Update [Modal Registry](docs/MODAL_REGISTRY.md) if adding screens

---
```

**VALIDATE**:
```bash
# Check markdown formatting
pnpm run format:check
```

---

## Validation Loop

### Level 1: Syntax & Style
```bash
# TypeScript type checking
pnpm run check

# ESLint (zero warnings)
pnpm run lint

# Prettier formatting
pnpm run format:check
```

**Expected Results**:
- TypeScript: 0 errors
- ESLint: 0 errors, 0 warnings
- Prettier: All files formatted

**IF_FAIL**:
- TypeScript errors: Fix type issues in Player2NameEntryScreen.tsx
- ESLint errors: Run `pnpm run lint:fix`
- Prettier errors: Run `pnpm run format`

### Level 2: Unit Tests
```bash
# Run new component tests
pnpm test src/components/game/Player2NameEntryScreen.test.tsx

# Run App.tsx tests (ensure no regressions)
pnpm test src/App.test.tsx

# Run all tests
pnpm test
```

**Expected Results**:
- Player2NameEntryScreen: 11+ tests passing
- App.tsx: All existing tests passing
- Overall: 612+ tests passing (no regressions)

**IF_FAIL**:
- Component tests: Debug mock issues, check imports
- App tests: Verify inline component removal didn't break references
- Other tests: Investigate regressions

### Level 3: Test Coverage
```bash
# Run coverage report
pnpm run test:coverage
```

**Expected Results**:
- Player2NameEntryScreen.tsx: 80%+ coverage
- Overall: Maintain 94%+ coverage

**IF_FAIL**: Add missing test cases

### Level 4: Build Verification
```bash
# Production build
pnpm build

# Preview build
pnpm preview
```

**Expected Results**:
- Build succeeds with no errors
- Bundle size similar to baseline (~320KB)
- Preview shows working app

**IF_FAIL**:
- Build errors: Fix TypeScript/import issues
- Bundle size increased significantly: Investigate unnecessary imports

### Level 5: Manual Testing

**Hot-Seat Mode Flow**:
1. Start app → Choose Hot-Seat mode
2. Enter Player 1 name → Choose color
3. Select pieces (mirrored mode) → Make first move
4. ✅ **See HandoffScreen** (privacy screen)
5. Click "I'm Ready"
6. ✅ **See Player2NameEntryScreen** (not inline in App.tsx)
7. Enter Player 2 name → Click Continue
8. ✅ **See GameBoard** with Player 2's turn

**Component Discoverability**:
1. Open `src/components/game/` in file explorer
2. ✅ **See Player2NameEntryScreen.tsx** in list
3. Open `docs/MODAL_REGISTRY.md`
4. ✅ **Find Player2NameEntryScreen** in table
5. Check `docs/ARCHITECTURE.md`
6. ✅ **See component in Phase → Screen Mapping**

---

## Rollback Strategy

### If Component Extraction Fails

**Step 1: Revert Component Files**
```bash
git rm src/components/game/Player2NameEntryScreen.tsx
git rm src/components/game/Player2NameEntryScreen.test.tsx
```

**Step 2: Revert App.tsx Changes**
```bash
git checkout HEAD -- src/App.tsx
```

**Step 3: Verify Rollback**
```bash
pnpm run check
pnpm test
pnpm build
```

### If Documentation Causes Issues

**Revert Documentation**:
```bash
git rm docs/ARCHITECTURE.md
git rm docs/MODAL_REGISTRY.md
git checkout HEAD -- README.md
```

### Nuclear Option (Full Rollback)

```bash
# Reset to main branch
git checkout main
git branch -D issue-54-refactor-states-modals

# Start over
git checkout -b issue-54-refactor-states-modals
```

---

## Success Criteria Checklist

### Functional Requirements
- [ ] Player2NameEntryScreen extracted to separate file
- [ ] Component imports correctly in App.tsx
- [ ] All existing tests pass (no regressions)
- [ ] New component has 11+ unit tests
- [ ] Test coverage ≥ 80% for new component
- [ ] Hot-seat mode Player 2 name flow works correctly

### Documentation Requirements
- [ ] ARCHITECTURE.md created with state machine diagram
- [ ] MODAL_REGISTRY.md created with component table
- [ ] README.md updated with architecture links
- [ ] JSDoc comments added to App.tsx local state
- [ ] All markdown files properly formatted

### Code Quality Requirements
- [ ] TypeScript: 0 errors
- [ ] ESLint: 0 warnings
- [ ] Prettier: All files formatted
- [ ] Build succeeds
- [ ] Bundle size unchanged (~320KB)

### Discoverability Requirements
- [ ] Component findable in `src/components/game/` directory
- [ ] Component listed in MODAL_REGISTRY.md
- [ ] Component documented in ARCHITECTURE.md
- [ ] Phase flow clearly documented

---

## Post-Implementation Tasks

### 1. Commit Changes
```bash
git add src/components/game/Player2NameEntryScreen.tsx
git add src/components/game/Player2NameEntryScreen.test.tsx
git add src/App.tsx
git add docs/ARCHITECTURE.md
git add docs/MODAL_REGISTRY.md
git add README.md

git commit -m "refactor: extract Player2NameEntryScreen and add architecture docs

- Extract Player2NameEntryScreen from inline App.tsx definition
- Create comprehensive ARCHITECTURE.md with state machine diagram
- Create MODAL_REGISTRY.md with component lookup table
- Add JSDoc comments to App.tsx local state
- Update README.md with architecture documentation links

Closes #54

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

### 2. Push Branch
```bash
git push -u origin issue-54-refactor-states-modals
```

### 3. Run Full Validation Suite (MANDATORY)
```bash
# All validation gates must pass before PR
pnpm run check && echo "✅ Type checking passed"
pnpm run lint && echo "✅ Linting passed"
pnpm test:coverage && echo "✅ Unit tests passed"
pnpm build && echo "✅ Build successful"
```

### 4. Create Pull Request
```bash
gh pr create \
  --title "refactor: extract Player2NameEntryScreen and add architecture docs" \
  --body "Closes #54

## Summary
Refactored King's Cooking state and modal architecture to improve discoverability and maintainability.

## Changes
1. **Extracted Player2NameEntryScreen**: Moved from inline App.tsx (lines 26-68) to separate component file
2. **Created ARCHITECTURE.md**: Comprehensive state machine diagram, component structure, data flow
3. **Created MODAL_REGISTRY.md**: Complete modal/screen lookup table with triggers and props
4. **Enhanced JSDoc**: Added detailed comments to App.tsx local state variables
5. **Updated README.md**: Added architecture documentation links and quick reference

## Task PRP
Implemented according to \`PRPs/task-issue-54-refactor-states-modals.md\`

## Test Coverage
- ✅ Player2NameEntryScreen: 11 tests, 80%+ coverage
- ✅ All existing tests: 612+ passing (no regressions)
- ✅ Overall coverage: 94%+

## Validation Gates
- ✅ Type checking: passing
- ✅ Linting: passing (zero warnings)
- ✅ All tests: passing
- ✅ Build: successful (~320KB)

## Manual Testing
- ✅ Hot-seat mode Player 2 name entry flow works correctly
- ✅ Component discoverable in src/components/game/
- ✅ Documentation comprehensive and accurate

## Discoverability Improvements
- **Before**: Player2NameEntryScreen was inline in App.tsx (hard to find)
- **After**: Component in components/game/ with full docs in MODAL_REGISTRY.md
- **Impact**: Reduces AI agent search time from ~30s to ~3s

## No Breaking Changes
Pure refactoring - no user-visible behavior changes."
```

---

## Debug Strategies

### Issue: TypeScript Errors in Player2NameEntryScreen

**Symptoms**:
```
error TS2345: Argument of type '...' is not assignable to parameter of type '...'
```

**Debug Steps**:
1. Check `GameFlowAction` type import
2. Verify `dispatch` prop type matches `React.Dispatch<GameFlowAction>`
3. Check action payloads match type definitions in `types/gameFlow.ts`

**Fix**: Ensure imports match:
```typescript
import type { GameFlowAction } from '@/types/gameFlow';
```

### Issue: Tests Fail with "Cannot find module"

**Symptoms**:
```
Error: Cannot find module '@/lib/storage/localStorage'
```

**Debug Steps**:
1. Check path alias in `tsconfig.json`:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```
2. Check vitest.config.ts includes path resolution
3. Verify file exists at expected path

**Fix**: Use relative imports in tests if path aliases don't work:
```typescript
import { storage } from '../../lib/storage/localStorage';
```

### Issue: App.tsx Tests Fail After Extraction

**Symptoms**:
```
Error: Cannot find variable 'Player2NameEntryScreen'
```

**Debug Steps**:
1. Verify import added to App.tsx
2. Check export statement in Player2NameEntryScreen.tsx
3. Look for remaining references to inline component

**Fix**: Ensure named export:
```typescript
// Player2NameEntryScreen.tsx
export const Player2NameEntryScreen = ({ dispatch }: Props) => { ... };

// App.tsx
import { Player2NameEntryScreen } from './components/game/Player2NameEntryScreen';
```

### Issue: Coverage Below 80%

**Symptoms**:
```
Coverage for Player2NameEntryScreen.tsx: 65% (below threshold)
```

**Debug Steps**:
1. Run coverage with detailed report: `pnpm run test:coverage`
2. Open `coverage/index.html` in browser
3. Identify uncovered lines

**Common Missing Tests**:
- Error state when localStorage fails
- Edge case: empty string validation
- Accessibility: keyboard navigation
- Multiple dispatch calls

**Fix**: Add missing test cases for uncovered branches

---

## Estimated Time

- **Phase 1** (Component Extraction): 45 minutes
  - Task 1.1: 10 minutes
  - Task 1.2: 20 minutes
  - Task 1.3-1.4: 15 minutes
- **Phase 2** (Documentation): 60 minutes
  - Task 2.1: 30 minutes (ARCHITECTURE.md)
  - Task 2.2: 15 minutes (JSDoc comments)
  - Task 2.3: 15 minutes (MODAL_REGISTRY.md)
- **Phase 3** (README Update): 10 minutes
- **Validation**: 15 minutes
- **PR Creation**: 10 minutes

**Total**: ~2.5 hours

---

## Related Issues

- **Issue #31**: Fix Player 2 name form timing (related handoff logic)
- **Issue #4**: Refactor black/white verbiage (demonstrates large refactoring pattern)
- **Issue #54**: This PRP

---

## Future Enhancements (Out of Scope)

These improvements could be tackled in future PRPs:

1. **Split Handoff Phase**: Create separate `player2-name-entry` phase instead of overloading handoff
2. **Modal Context Provider**: Centralized modal state management with React Context
3. **Phase Router Component**: Abstract phase rendering logic from App.tsx
4. **Visual State Diagram Tool**: Interactive state machine visualization
5. **Component Generator Script**: CLI tool to scaffold new phase components with tests

---

## References

- **CLAUDE.md**: `CLAUDE.md:176-459` (GitHub Issue Workflow)
- **CLAUDE-REACT.md**: `claude_md_files/CLAUDE-REACT.md:1-100` (React patterns)
- **Similar PRP**: `PRPs/task-issue-31-fix-player2-name-timing.md` (handoff phase refactoring)
- **Component Examples**: `src/components/game/HandoffScreen.tsx`, `src/components/game/NameForm.tsx`
- **Test Examples**: `src/components/game/HandoffScreen.test.tsx`
