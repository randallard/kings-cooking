# Phase 3: URL State Synchronization & History Viewer Implementation

**Version:** 1.0.0
**Date:** October 15, 2025
**Phase:** 3 of 7 (Delta-Based URL State Sync)
**Estimated Duration:** Week 2 (10 days)
**Complexity:** High

> **📝 CRITICAL:** This phase implements **compression-only** (NO encryption) URL sharing with checksum verification. See `PRPs/phase-3-decisions-summary.md` for design rationale and `PRPs/phase-3-url-state-sync-flows.md` for complete flow diagrams.

---

## 🎯 GOAL

Implement delta-based URL state synchronization with checksum verification, divergence detection UI, and history export functionality to enable async multiplayer gameplay.

**Specific End State:**
- URL encoding/decoding with lz-string compression (NO encryption)
- Three payload types: delta, full_state, resync_request (discriminated union)
- Move history storage in localStorage with checksums
- History Comparison Modal for resolving state divergence
- Always-visible collapsible History Viewer during gameplay
- Export game history as JSON for debugging
- **MINIMUM 80% test coverage** on URL encoding and history code
- Zero TypeScript errors, zero ESLint warnings
- Production-ready build passing

**Success Criteria:**
- [ ] Delta URLs work for normal gameplay (one move + metadata)
- [ ] Full state URLs initialize Player 2 correctly
- [ ] Resync request flow handles divergence gracefully
- [ ] History Comparison Modal shows divergence point clearly
- [ ] History Viewer displays move history with sync status
- [ ] Export JSON produces valid game data
- [ ] Corrupted URLs handled with user-friendly error messages
- [ ] Turn number mismatches detected and resolved
- [ ] All validation gates pass (80%+ test coverage)

---

## 💡 WHY

### Business Value

This phase enables the **core multiplayer experience** for King's Cooking without requiring server infrastructure:
- **Serverless async gameplay** → No hosting costs, scales infinitely
- **URL-based sharing** → Friction-free onboarding (just send a link)
- **Self-hosted game state** → Privacy, no data collection
- **Debugging tools** → History export enables bug reports

### User Impact

Phase 3 delivers the **first playable multiplayer experience**:
- **Player 1 creates game** → Gets shareable URL
- **Player 2 opens URL** → Game state loads automatically
- **Back-and-forth gameplay** → Each move generates new URL to share
- **Divergence resolution** → Clear UI for handling state mismatches
- **History review** → Players can review full game history anytime

### Technical Dependencies

**Phase 3 builds on Phase 1 & 2:**
- Phase 1: Zod validation, localStorage utilities, TypeScript strict mode
- Phase 2: Chess engine with checksum generation, move validation

**Phase 4-7 depend on Phase 3:**
- Phase 4: UI components need URL state hooks
- Phase 5: Game flow needs URL encoding/decoding
- Phase 6: Polish needs working multiplayer foundation

**Key Integration Points:**
- `KingsChessEngine.generateChecksum()` (Phase 2, line 422-436)
- `storage.getGameState()` / `storage.setGameState()` (Phase 1, line 174-182)
- `GameStateSchema` Zod validation (Phase 1, line 175-207)

---

## 📋 WHAT

### User-Visible Behavior

**Normal Gameplay Flow:**
1. Player 1 creates game → URL with full game state generated
2. Player 1 sends URL to Player 2 (copy-paste, messaging app, etc.)
3. Player 2 opens URL → Game state loads automatically
4. Player 2 makes move → New URL with delta generated
5. Players alternate: each move = new URL with just that move's data
6. History Viewer shows all moves with checkmarks (state synced)

**Divergence Handling Flow:**
1. Checksum mismatch detected (Player states don't match)
2. History Comparison Modal appears automatically
3. Side-by-side move history displayed, divergence point highlighted
4. Player chooses action:
   - **Send My State** → Share complete game state
   - **Accept Their State** → Replace with opponent's state
   - **Review** → See detailed history comparison
   - **Cancel** → End game
5. Game resumes after resolution

**History Viewer Features:**
- Collapsed by default, expandable with click
- Shows last 10 moves with turn numbers
- Checkmark icons indicate successfully synced moves
- "Show Full History" button for complete game
- "Export JSON" button downloads game history

### Technical Requirements

#### 1. URL Encoding/Decoding System (`src/lib/urlEncoding/`)

**Payload Type Definitions:**
```typescript
import { z } from 'zod';

// Discriminated union for 3 payload types
export const DeltaPayloadSchema = z.object({
  type: z.literal('delta'),
  move: z.object({
    from: z.tuple([z.number(), z.number()]),
    to: z.union([
      z.tuple([z.number(), z.number()]),
      z.literal('off_board')
    ]),
  }),
  turn: z.number().int().min(0),
  checksum: z.string(),
  playerName: z.string().min(2).max(20).optional(),
});

export const FullStatePayloadSchema = z.object({
  type: z.literal('full_state'),
  gameState: GameStateSchema,
  playerName: z.string().min(2).max(20).optional(),
});

export const ResyncRequestPayloadSchema = z.object({
  type: z.literal('resync_request'),
  move: z.object({
    from: z.tuple([z.number(), z.number()]),
    to: z.union([
      z.tuple([z.number(), z.number()]),
      z.literal('off_board')
    ]),
  }),
  turn: z.number().int().min(0),
  checksum: z.string(),
  playerName: z.string().min(2).max(20).optional(),
  message: z.string().optional(),
});

// Discriminated union (3x faster than regular union)
export const UrlPayloadSchema = z.discriminatedUnion('type', [
  DeltaPayloadSchema,
  FullStatePayloadSchema,
  ResyncRequestPayloadSchema,
]);

export type UrlPayload = z.infer<typeof UrlPayloadSchema>;
```

**Compression Functions:**
```typescript
import {
  compressToEncodedURIComponent,
  decompressFromEncodedURIComponent
} from 'lz-string';
import { fromError } from 'zod-validation-error';

/**
 * Compress payload to URL-safe string
 * @returns Compressed string or empty string on error
 */
export function compressPayload(payload: UrlPayload): string {
  try {
    const jsonString = JSON.stringify(payload);
    return compressToEncodedURIComponent(jsonString);
  } catch (error) {
    console.error('Failed to compress payload:', error);
    return '';
  }
}

/**
 * Decompress and validate payload from URL string
 * @returns Validated payload or null if decompression/validation fails
 */
export function decompressPayload(compressed: string): UrlPayload | null {
  try {
    const cleaned = compressed.trim();
    if (!cleaned) return null;

    // CRITICAL: Check for null (indicates corrupted data)
    const decompressed = decompressFromEncodedURIComponent(cleaned);
    if (decompressed === null) {
      console.error('Decompression returned null - data corrupted');
      return null;
    }

    const parsed: unknown = JSON.parse(decompressed);
    const result = UrlPayloadSchema.safeParse(parsed);

    if (result.success) {
      return result.data;
    } else {
      // User-friendly error message
      const error = fromError(result.error);
      console.error('Validation failed:', error.message);
      return null;
    }
  } catch (error) {
    console.error('Failed to decompress payload:', error);
    return null;
  }
}
```

#### 1b. Proactive Divergence Detection (Pre-Send Verification)

**Purpose:** Catch checksum mismatches BEFORE generating URLs to prevent sending invalid moves

**Use Case:**
- User tries to cheat by modifying localStorage
- User doesn't realize checksums verify state
- System catches mismatch before URL generation
- User sees friendly error message
- Offers "Reload from last verified state?" option

**Implementation:**
```typescript
/**
 * Verify current state matches opponent's last known checksum
 * before generating URL
 *
 * @returns null if states match, error message if diverged
 */
export function verifyStateBeforeSend(
  currentState: GameState,
  opponentLastChecksum: string | null
): { valid: boolean; error?: string } {
  // If this is the first move, no previous checksum to verify
  if (!opponentLastChecksum || currentState.currentTurn === 0) {
    return { valid: true };
  }

  // Get the checksum from the last move (before current move)
  const history = storage.getGameHistory() || [];
  if (history.length === 0) {
    // No history yet, first move
    return { valid: true };
  }

  // Find the last synced move from opponent
  const lastSyncedMove = history
    .slice()
    .reverse()
    .find(entry => entry.synced && entry.player !== currentState.currentPlayer);

  if (!lastSyncedMove) {
    // No synced moves from opponent yet
    return { valid: true };
  }

  // Verify opponent's last checksum matches what we calculated
  if (lastSyncedMove.checksum !== opponentLastChecksum) {
    return {
      valid: false,
      error: `Your game state has diverged from your opponent's.
Your last checksum: ${lastSyncedMove.checksum}
Opponent's last checksum: ${opponentLastChecksum}

This usually means:
• You modified your localStorage manually
• You missed a URL from your opponent
• Your game state was corrupted

Would you like to reload from the last verified state?`
    };
  }

  return { valid: true };
}

/**
 * Reload game state from last verified checkpoint
 *
 * @returns true if reload successful, false if no checkpoint exists
 */
export function reloadFromLastVerifiedState(): boolean {
  const history = storage.getGameHistory() || [];

  // Find last synced move
  const lastSyncedIndex = history
    .slice()
    .reverse()
    .findIndex(entry => entry.synced);

  if (lastSyncedIndex === -1) {
    // No synced moves, can't reload
    console.error('No verified state to reload from');
    return false;
  }

  // Get the actual index in forward array
  const actualIndex = history.length - 1 - lastSyncedIndex;

  // Trim history to last synced move
  const trimmedHistory = history.slice(0, actualIndex + 1);
  storage.setGameHistory(trimmedHistory);

  // Rebuild game state from history
  // TODO: Implement state reconstruction from history
  // For now, prompt user to request full_state from opponent

  console.log(`Reloaded to move ${actualIndex + 1}`);
  return true;
}
```

**Integration with URL Builder:**
```typescript
export function buildDeltaUrl(
  move: Move,
  turn: number,
  checksum: string,
  opponentLastChecksum: string | null,
  playerName?: string
): { url: string; error?: string } {
  // PROACTIVE CHECK: Verify state before sending
  const verification = verifyStateBeforeSend(
    getCurrentGameState(),
    opponentLastChecksum
  );

  if (!verification.valid) {
    return {
      url: '',
      error: verification.error
    };
  }

  // Build payload
  const payload: DeltaPayload = {
    type: 'delta',
    move: { from: move.from, to: move.to },
    turn,
    checksum,
    ...(playerName && { playerName }),
  };

  // Compress and return URL
  const compressed = compressPayload(payload);
  return {
    url: `#${compressed}`,
  };
}
```

**User-Facing Error Flow:**
```typescript
// When user tries to make a move
const urlResult = buildDeltaUrl(move, turn, checksum, opponentLastChecksum);

if (urlResult.error) {
  // Show error modal
  showErrorModal({
    title: 'Game State Out of Sync',
    message: urlResult.error,
    actions: [
      {
        label: 'Reload from Last Verified State',
        onClick: () => {
          if (reloadFromLastVerifiedState()) {
            showSuccess('Game state restored. Please make your move again.');
          } else {
            showError('No verified state available. Request full state from opponent.');
          }
        }
      },
      {
        label: 'Request Full State from Opponent',
        onClick: () => {
          // Generate resync_request URL
          const resyncUrl = buildResyncRequestUrl(move, turn, checksum);
          copyToClipboard(resyncUrl);
          showInfo('Resync request copied. Send to your opponent.');
        }
      },
      {
        label: 'Cancel',
        onClick: () => closeModal()
      }
    ]
  });

  return; // Don't proceed with move
}

// If verification passed, proceed normally
copyToClipboard(urlResult.url);
showSuccess('Move URL copied! Send to your opponent.');
```

**Benefits:**
- ✅ **Catches cheating attempts** before they cause confusion
- ✅ **User-friendly error message** explains what happened
- ✅ **Offers recovery options** (reload or resync)
- ✅ **Prevents wasted time** debugging divergence after the fact
- ✅ **Educational** - users learn checksums prevent tampering

#### 2. History Storage System (`src/lib/history/`)

**Type Definitions:**
```typescript
export interface MoveHistoryEntry {
  moveNumber: number;
  player: 'white' | 'black';
  from: Position;
  to: Position | 'off_board';
  piece: Piece;
  captured: Piece | null;
  checksum: string;
  timestamp: number;
  synced: boolean; // Indicates if this move was successfully shared via URL
}

export const MoveHistoryEntrySchema = z.object({
  moveNumber: z.number().int().min(0),
  player: PieceOwnerSchema,
  from: z.tuple([z.number(), z.number()]),
  to: z.union([
    z.tuple([z.number(), z.number()]),
    z.literal('off_board')
  ]),
  piece: PieceSchema,
  captured: PieceSchema.nullable(),
  checksum: z.string(),
  timestamp: z.number(),
  synced: z.boolean(),
});

export const GameHistorySchema = z.array(MoveHistoryEntrySchema);
export type GameHistory = z.infer<typeof GameHistorySchema>;
```

**localStorage Integration:**
```typescript
// Add to src/lib/storage/localStorage.ts STORAGE_KEYS
export const STORAGE_KEYS = {
  // ... existing keys
  GAME_HISTORY: 'kings-cooking:game-history',
} as const;

// Add to storage facade
export const storage = {
  // ... existing methods

  getGameHistory: (): GameHistory | null =>
    getValidatedItem(STORAGE_KEYS.GAME_HISTORY, GameHistorySchema) as GameHistory | null,

  setGameHistory: (history: GameHistory): boolean =>
    setValidatedItem(STORAGE_KEYS.GAME_HISTORY, history, GameHistorySchema),

  appendToHistory: (entry: MoveHistoryEntry): boolean => {
    const currentHistory = storage.getGameHistory() || [];
    const updated = [...currentHistory, entry];
    return storage.setGameHistory(updated);
  },

  clearHistory: (): void => {
    localStorage.removeItem(STORAGE_KEYS.GAME_HISTORY);
  },
};
```

#### 3. History Viewer Component (`src/components/HistoryViewer.tsx`)

**Component Structure:**
```typescript
import { useState, useRef, useEffect } from 'react';
import type { GameHistory } from '@/lib/history/types';

interface HistoryViewerProps {
  history: GameHistory;
  currentMoveIndex: number;
  onJumpToMove: (index: number) => void;
  onExport: () => void;
}

export function HistoryViewer({
  history,
  currentMoveIndex,
  onJumpToMove,
  onExport,
}: HistoryViewerProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showFullHistory, setShowFullHistory] = useState(false);
  const currentMoveRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to current move
  useEffect(() => {
    if (currentMoveRef.current) {
      currentMoveRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      });
    }
  }, [currentMoveIndex]);

  const displayedMoves = showFullHistory ? history : history.slice(-10);

  return (
    <div className="history-viewer">
      <button
        type="button"
        className="panel-header"
        aria-expanded={isExpanded}
        aria-controls="history-content"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h2 id="history-title">Move History</h2>
        <span aria-hidden="true">{isExpanded ? '▼' : '▶'}</span>
      </button>

      <div
        id="history-content"
        hidden={!isExpanded}
        aria-labelledby="history-title"
        className="history-panel"
      >
        <div className="move-list" role="log" aria-live="polite">
          {displayedMoves.map((move, index) => (
            <div
              key={index}
              ref={index === currentMoveIndex ? currentMoveRef : null}
              className={`move-entry ${index === currentMoveIndex ? 'current' : ''}`}
            >
              <span className="move-number">{move.moveNumber}.</span>
              <button
                onClick={() => onJumpToMove(index)}
                className="move-button"
                aria-label={`Jump to move ${move.moveNumber}`}
              >
                <span className="move-notation">
                  {move.piece.type} {formatPosition(move.from)} → {formatPosition(move.to)}
                </span>
                {move.synced && (
                  <span className="sync-indicator" aria-label="Synced">✓</span>
                )}
              </button>
            </div>
          ))}
        </div>

        <div className="history-actions">
          {!showFullHistory && history.length > 10 && (
            <button
              onClick={() => setShowFullHistory(true)}
              className="btn-show-full"
            >
              Show Full History ({history.length} moves)
            </button>
          )}
          <button onClick={onExport} className="btn-export">
            Export JSON
          </button>
        </div>
      </div>
    </div>
  );
}
```

#### 4. History Comparison Modal (`src/components/HistoryComparisonModal.tsx`)

**Component Structure:**
```typescript
import { useMemo } from 'react';
import FocusTrap from 'focus-trap-react';
import type { GameHistory } from '@/lib/history/types';

interface HistoryComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  myHistory: GameHistory;
  theirHistory: GameHistory;
  onSendMyState: () => void;
  onAcceptTheirState: () => void;
  onReview: () => void;
}

export function HistoryComparisonModal({
  isOpen,
  onClose,
  myHistory,
  theirHistory,
  onSendMyState,
  onAcceptTheirState,
  onReview,
}: HistoryComparisonModalProps) {
  const divergenceIndex = useMemo(() => {
    for (let i = 0; i < Math.min(myHistory.length, theirHistory.length); i++) {
      if (myHistory[i].checksum !== theirHistory[i].checksum) {
        return i;
      }
    }
    return Math.min(myHistory.length, theirHistory.length);
  }, [myHistory, theirHistory]);

  if (!isOpen) return null;

  return (
    <FocusTrap
      focusTrapOptions={{
        initialFocus: '#modal-close',
        clickOutsideDeactivates: true,
        escapeDeactivates: true,
        onDeactivate: onClose,
      }}
    >
      <div className="modal-backdrop" onClick={onClose}>
        <div
          className="modal-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-header">
            <h2 id="modal-title">Timeline Divergence Detected</h2>
            <button
              id="modal-close"
              onClick={onClose}
              aria-label="Close modal"
              className="close-button"
            >
              ✕
            </button>
          </div>

          <div className="modal-body">
            <p className="divergence-message">
              Your game state and your opponent's state have diverged at move {divergenceIndex + 1}.
              Choose how to resolve this:
            </p>

            <div className="comparison-view">
              <div className="comparison-column">
                <h3>Your History</h3>
                <HistoryTimeline
                  history={myHistory}
                  divergenceIndex={divergenceIndex}
                />
              </div>

              <div className="comparison-divider" aria-hidden="true">
                <span className="divergence-marker">⚡</span>
              </div>

              <div className="comparison-column">
                <h3>Opponent's History</h3>
                <HistoryTimeline
                  history={theirHistory}
                  divergenceIndex={divergenceIndex}
                />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button onClick={onSendMyState} className="btn-primary">
              Send My State
            </button>
            <button onClick={onAcceptTheirState} className="btn-primary">
              Accept Their State
            </button>
            <button onClick={onReview} className="btn-secondary">
              Review Details
            </button>
            <button onClick={onClose} className="btn-secondary">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </FocusTrap>
  );
}
```

#### 5. URL State Sync Hook (`src/hooks/useUrlState.ts`)

**React Hook Implementation:**
```typescript
import { useState, useEffect, useRef, useCallback } from 'react';
import { compressPayload, decompressPayload } from '@/lib/urlEncoding';
import type { UrlPayload } from '@/lib/urlEncoding/types';

export function useUrlState() {
  const [payload, setPayload] = useState<UrlPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const debounceTimerRef = useRef<number | null>(null);

  // Load payload from URL hash on mount
  useEffect(() => {
    const hash = window.location.hash.slice(1); // Remove '#'
    if (!hash) return;

    const decoded = decompressPayload(hash);
    if (decoded) {
      setPayload(decoded);
      setError(null);
    } else {
      setError('Failed to load game from URL - the link may be corrupted');
    }
  }, []); // Only run on mount

  // Listen for hash changes (back/forward navigation)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      if (!hash) {
        setPayload(null);
        return;
      }

      const decoded = decompressPayload(hash);
      if (decoded) {
        setPayload(decoded);
        setError(null);
      } else {
        setError('Failed to load game from URL');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Update URL hash (debounced)
  const updateUrl = useCallback((newPayload: UrlPayload) => {
    // Clear any existing timer
    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current);
    }

    // Debounce URL update by 300ms
    debounceTimerRef.current = window.setTimeout(() => {
      const compressed = compressPayload(newPayload);
      if (compressed) {
        // Use replaceState to avoid history pollution
        const url = new URL(window.location.href);
        url.hash = compressed;
        window.history.replaceState(null, '', url);

        setPayload(newPayload);
        setError(null);
      } else {
        setError('Failed to encode game state to URL');
      }

      debounceTimerRef.current = null;
    }, 300);
  }, []);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    payload,
    error,
    updateUrl,
  };
}
```

---

## 📚 ALL NEEDED CONTEXT

### Phase 1 & 2 Foundation (MUST READ FIRST)

**Already Implemented:**
- ✅ `src/lib/validation/schemas.ts` (273 lines)
  - GameStateSchema, PieceSchema, MoveSchema with branded types
  - `safeValidateGameState()` helper (Line 261-265)
  - Pattern: Use `.safeParse()` for all external data (URLs, localStorage)
- ✅ `src/lib/storage/localStorage.ts` (203 lines)
  - `getValidatedItem()` / `setValidatedItem()` (Lines 69-126)
  - Pattern: Automatically removes corrupted data (Line 84, 90)
  - `storage` facade for type-safe access (Lines 159-203)
- ✅ `src/lib/chess/KingsChessEngine.ts` (437 lines)
  - `generateChecksum()` private method (Lines 422-436)
  - Hashes: gameId + turn + board state
  - **CRITICAL:** Need to expose checksum via public getter for Phase 3
- ✅ TypeScript strict mode configured (`tsconfig.json`)
  - `noUncheckedIndexedAccess: true` (array access must be guarded)
  - `exactOptionalPropertyTypes: true` (optional != undefined)
- ✅ Vitest 3.2.4 + Playwright 1.56.0 testing setup
  - 80% coverage threshold enforced (Lines 12-20 in vitest.config.ts)
  - Test cleanup hook clears localStorage/sessionStorage

### External Documentation (CRITICAL READING)

#### 0. Phase 3 Research Documents (READ FIRST)

**URL Hash Fragment Best Practices:**
- **File**: `PRPs/phase-3-url-hash-research.md` (1,410 lines)
- **Key Topics**:
  - React integration patterns (useEffect + hashchange listeners, debouncing with useRef)
  - Browser compatibility limits (2,000 char safety limit for Edge/IE11)
  - Base64URL encoding (URL-safe, no percent encoding needed)
  - Common pitfalls (frozen closure problem, history pollution, percent encoding asymmetry)
  - Testing strategies (mobile browser testing, URL length limits)
  - Complete code templates (useGameUrlState hook with validation)
- **Critical Gotchas**:
  - ❌ Hash is percent-encoded when setting but NOT decoded when reading (Lines 88-100)
  - ❌ Including history in useEffect dependencies causes exponential listener accumulation (Lines 976-998)
  - ❌ Debounced functions capture stale state → use useRef pattern (Lines 859-889)
  - ✅ Use replaceState() not pushState() for async games to prevent history pollution (Lines 158-181)
  - ✅ Binary encoding + Base64URL = 90% size reduction vs JSON (Lines 1164-1168)
- **Must Read Sections**:
  - Section 2: React Integration Patterns (Lines 104-213)
  - Section 3.2: Debouncing URL Updates (Lines 249-289)
  - Section 4: Error Handling and Validation (Lines 333-451)
  - Section 9: Common Pitfalls and Gotchas (Lines 856-1009)
  - Section 13: Code Templates (Lines 1239-1364)

**Phase 3 Design Decisions:**
- **File**: `PRPs/phase-3-decisions-summary.md`
- **Confirms**: Compression-only approach (NO encryption), delta-based URLs, History Comparison Modal design

**Phase 3 Flow Diagrams:**
- **File**: `PRPs/phase-3-url-state-sync-flows.md`
- **Defines**: Payload structures, normal gameplay flow, divergence handling flow

**Phase 3 Zod Validation Research:**
- **Summary**: `PRPs/research/RESEARCH_SUMMARY.md`
- **Advanced Patterns**: `PRPs/research/zod-advanced-patterns-phase3.md`
- **Quick Reference**: `PRPs/research/zod-phase3-quick-reference.md`
- **Key Topics**:
  - Discriminated unions for 3 payload types (3x faster parsing)
  - `.safeParse()` vs `.parse()` best practices
  - Error formatting with `zod-validation-error`
  - Refinements for checksum verification
  - Transforms for decompression pipelines
  - Branded types for player IDs
- **Critical Patterns**:
  - ✅ Use `z.discriminatedUnion('type', [...])` for O(1) payload type lookup
  - ✅ Chain transforms: `z.string().transform(decompress).transform(parse).pipe(schema)`
  - ✅ Always use `.safeParse()` for URL data (no exceptions)
  - ✅ Use `fromError()` from `zod-validation-error` for user-friendly messages
  - ❌ Never use `.parse()` on untrusted data (throws exceptions)

**React 19 Component Standards:**
- **File**: `claude_md_files/CLAUDE-REACT.md` (954 lines)
- **MUST READ for Tasks 15-30** (UI components and hooks)
- **Key Standards**:
  - Component documentation (JSDoc with @component, @example)
  - React 19 TypeScript (ReactElement, not JSX.Element)
  - Testing requirements (80% coverage minimum, React Testing Library)
  - Accessibility (ARIA attributes, keyboard navigation, focus management)
  - Component size limits (200 lines max, cognitive complexity ≤15)
  - State management hierarchy (useState → Context → TanStack Query → Zustand)
- **Critical Patterns**:
  - ✅ Use `ReactElement` for return types (Lines 100-122)
  - ✅ Document ALL component props with descriptions (Lines 609-624)
  - ✅ Test user behavior, not implementation details (Lines 410-453)
  - ✅ Handle ALL states: loading, error, empty, success (Lines 306-313)
  - ✅ Use focus-trap-react for modal accessibility (referenced for Task 20)
  - ❌ Never exceed 200 lines per component (Line 743)
  - ❌ Never skip JSDoc for exported functions (Lines 672-682)

**Phase 3 React Components Research (Tasks 15-24):**
- **File**: `PRPs/research/react-components-phase3.md` (~1,500 lines)
- **MUST READ before implementing History Viewer and Comparison Modal**
- **Covers**:
  - Collapsible component patterns with ARIA (Task 15)
  - History list display with sync indicators (Tasks 16-17)
  - JSON export with Blob API and error handling (Task 18)
  - Modal accessibility with focus-trap-react (Task 20)
  - Side-by-side comparison UI with divergence highlighting (Task 21)
  - Button action handlers with loading states (Tasks 22-23)
  - React Testing Library patterns for modals and keyboard interactions (Tasks 19, 24)
- **Includes**:
  - 25+ complete code examples
  - 10+ test suites with React Testing Library
  - 15 documented pitfalls with ❌/✅ solutions
  - CSS transitions (max-height vs CSS Grid)
  - Auto-scroll implementation
  - Synchronized scrolling patterns
  - Browser API mocking (Blob, URL.createObjectURL)

**Phase 3 React Hooks Research (Tasks 25-30):**
- **File**: `PRPs/research/react-hooks-phase3.md` (~1,100 lines)
- **MUST READ before implementing useUrlState and integration**
- **Covers**:
  - useGameUrlState hook implementation with TypeScript generics (Task 25)
  - Hash change monitoring with hashchange event (Tasks 26-27)
  - Debouncing with useRef pattern (CRITICAL for frozen closure problem)
  - URL encoding on move with delta payloads (Task 26)
  - URL decoding on load with multi-layer validation (Task 27)
  - Error handling for corrupted URLs with fallback strategies (Task 28)
  - E2E testing with Playwright (Task 30)
- **Includes**:
  - Complete useGameUrlState hook (~130 lines)
  - Frozen closure problem explained with useRef solution
  - Integration examples with KingsChessEngine
  - Dual-storage strategy (URL + localStorage)
  - Playwright test patterns for URL flows
  - Performance benchmarks (compression, debouncing)
- **Critical Sections**:
  - Lines 61-193: Complete useGameUrlState implementation
  - Lines 256-355: Frozen closure problem deep dive
  - Lines 612-749: Real-world integration patterns
  - Lines 751-863: E2E testing patterns

#### 1. lz-string Library (Compression)

**Official Documentation:**
- **Primary**: https://pieroxy.net/blog/pages/lz-string/index.html
- **GitHub**: https://github.com/pieroxy/lz-string
- **npm**: https://www.npmjs.com/package/lz-string (16M+ weekly downloads)

**Installation:**
```bash
pnpm add lz-string
# TypeScript types included (no @types package needed)
```

**Key Methods:**
```typescript
import {
  compressToEncodedURIComponent,
  decompressFromEncodedURIComponent
} from 'lz-string';

// Compress JSON to URL-safe string
const compressed = compressToEncodedURIComponent(JSON.stringify(data));
// Result: "N4IgdghgtgpiBcIDaB..."

// Decompress - CRITICAL: Returns null if corrupted
const decompressed = decompressFromEncodedURIComponent(compressed);
if (decompressed === null) {
  // Data is corrupted - DO NOT attempt JSON.parse
  handleError('Corrupted data');
}
```

**Bundle Size:** < 1KB gzipped (minimal impact)

**Compression Ratios:**
- Typical JSON payload: 66-88% size reduction
- 100-move chess game (~20KB JSON) → ~3KB compressed
- Delta payload (one move) → ~80 chars

**GOTCHA #1: Always Check for Null**
```typescript
// ❌ WRONG: Assumes string return
const data = JSON.parse(decompressFromEncodedURIComponent(hash));

// ✅ CORRECT: Check for null first
const decompressed = decompressFromEncodedURIComponent(hash);
if (decompressed === null) return null;
const data = JSON.parse(decompressed);
```

**GOTCHA #2: Not Encryption**
- lz-string compresses, does NOT encrypt
- Data is readable if decompressed
- Fine for King's Cooking (no sensitive data, checksums prevent tampering)

#### 2. URL Hash Fragment Best Practices

**React Integration Pattern:**
- **Reading**: `window.location.hash.slice(1)` (remove '#' prefix)
- **Writing**: `history.replaceState()` (not `pushState()` - avoid history pollution)
- **Listening**: `hashchange` event for back/forward navigation

**URL Length Limits:**
- **IE11/Edge Legacy**: 2,025 characters (most restrictive)
- **Chrome/Firefox/Safari**: 50,000-1,000,000+ characters
- **Recommendation**: Keep compressed payloads < 2,000 chars for universal compatibility
- **King's Cooking**: Delta payloads ~80 chars, full state ~1,500 chars (safe)

**Debouncing Pattern:**
```typescript
// Debounce URL updates by 300ms to avoid excessive history entries
const debounceTimerRef = useRef<number | null>(null);

const updateUrl = useCallback((data: unknown) => {
  if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

  debounceTimerRef.current = window.setTimeout(() => {
    const url = new URL(window.location.href);
    url.hash = compressPayload(data);
    window.history.replaceState(null, '', url);
  }, 300);
}, []);
```

**GOTCHA #3: Hash Not Auto-Decoded**
```typescript
// ❌ WRONG: Hash is percent-encoded when set but NOT decoded when read
const hash = window.location.hash.slice(1);
const data = decompressPayload(hash); // Fails if hash has %20, etc.

// ✅ CORRECT: Manually decode URI component
const hash = decodeURIComponent(window.location.hash.slice(1));
const data = decompressPayload(hash);
```

**GOTCHA #4: replaceState vs pushState**
```typescript
// ❌ WRONG: Creates new history entry for every move (pollutes back button)
window.history.pushState(null, '', url);

// ✅ CORRECT: Replaces current entry (no history pollution for async game)
window.history.replaceState(null, '', url);
```

#### 3. Zod Discriminated Unions (Validation)

**Official Documentation:**
- **Primary**: https://zod.dev/api?id=discriminated-unions
- **Error Handling**: https://zod.dev/error-formatting
- **zod-validation-error**: https://github.com/causaly/zod-validation-error

**Installation:**
```bash
pnpm add zod-validation-error
# Provides user-friendly error messages
```

**Discriminated Union Pattern:**
```typescript
import { z } from 'zod';

// 3 payload types with 'type' discriminator
const UrlPayloadSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('delta'),
    move: MoveSchema,
    turn: z.number(),
    checksum: z.string(),
  }),
  z.object({
    type: z.literal('full_state'),
    gameState: GameStateSchema,
  }),
  z.object({
    type: z.literal('resync_request'),
    move: MoveSchema,
    turn: z.number(),
    checksum: z.string(),
  }),
]);

// Validation with safeParse (never throws)
const result = UrlPayloadSchema.safeParse(unknownData);
if (result.success) {
  // TypeScript automatically narrows based on 'type' field
  if (result.data.type === 'delta') {
    // result.data.move is typed correctly
  }
}
```

**Why Discriminated Unions:**
- **3x faster** than regular unions (O(1) vs O(n) lookup)
- **Better error messages**: "Invalid delta payload" vs "Invalid input"
- **Automatic TypeScript narrowing** based on discriminator field

**Error Handling Pattern:**
```typescript
import { fromError } from 'zod-validation-error';

const result = UrlPayloadSchema.safeParse(data);
if (!result.success) {
  // Convert ZodError to user-friendly message
  const error = fromError(result.error);
  console.error(error.message);
  // "Invalid delta payload: expected number at turn, received string"
}
```

**GOTCHA #5: safeParse() vs parse()**
```typescript
// ❌ WRONG: parse() throws exceptions (expensive, unpredictable)
try {
  const data = UrlPayloadSchema.parse(unknownData);
} catch (error) {
  // Exception thrown every time data is invalid
}

// ✅ CORRECT: safeParse() returns result object (no exceptions, 1.5x faster)
const result = UrlPayloadSchema.safeParse(unknownData);
if (result.success) {
  const data = result.data; // Fully typed
} else {
  const error = fromError(result.error);
  // Handle error gracefully
}
```

#### 4. React Hooks for URL State

**useEffect Pattern for Hash Monitoring:**
```typescript
useEffect(() => {
  const handleHashChange = () => {
    const hash = window.location.hash.slice(1);
    const payload = decompressPayload(hash);
    if (payload) {
      setGameState(applyPayload(payload));
    }
  };

  window.addEventListener('hashchange', handleHashChange);
  return () => window.removeEventListener('hashchange', handleHashChange);
}, []); // Empty deps - listener never changes
```

**GOTCHA #6: Dependency Array Hell**
```typescript
// ❌ WRONG: Including history object causes exponential listeners
useEffect(() => {
  const handleHashChange = () => { /* ... */ };
  window.addEventListener('hashchange', handleHashChange);
  return () => window.removeEventListener('hashchange', handleHashChange);
}, [window.history]); // BAD - creates new listener every render

// ✅ CORRECT: Empty array - listener is stable
useEffect(() => {
  const handleHashChange = () => { /* ... */ };
  window.addEventListener('hashchange', handleHashChange);
  return () => window.removeEventListener('hashchange', handleHashChange);
}, []); // GOOD - listener registered once
```

**useRef for Debouncing:**
```typescript
// Avoid stale closures in debounced functions
const stateRef = useRef(gameState);
stateRef.current = gameState; // Always update ref

const debouncedUpdate = useCallback(() => {
  debounceTimerRef.current = window.setTimeout(() => {
    updateUrl(stateRef.current); // Use ref, not closure
  }, 300);
}, []); // Empty deps - function is stable
```

#### 5. History Viewer UI Patterns

**Accessibility Requirements (ARIA):**
```typescript
// Collapsible panel
<button
  aria-expanded={isExpanded}
  aria-controls="history-content"
>
  Move History
</button>

<div
  id="history-content"
  hidden={!isExpanded}
  aria-labelledby="history-title"
>
  {/* Panel content */}
</div>

// Modal dialog
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="modal-title"
>
  <h2 id="modal-title">Timeline Divergence</h2>
</div>
```

**Focus Trap Library:**
```bash
pnpm add focus-trap-react
```

```typescript
import FocusTrap from 'focus-trap-react';

<FocusTrap
  focusTrapOptions={{
    initialFocus: '#close-button',
    clickOutsideDeactivates: true,
    escapeDeactivates: true,
    onDeactivate: onClose,
  }}
>
  <div className="modal">
    {/* Modal content - focus trapped inside */}
  </div>
</FocusTrap>
```

**Export JSON Pattern:**
```typescript
function downloadJSON(data: unknown, filename: string) {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url); // Clean up memory
}

// Usage
const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
downloadJSON(gameHistory, `kings-cooking-${timestamp}.json`);
```

**GOTCHA #7: Scroll Behavior**
```typescript
// Auto-scroll to latest move
useEffect(() => {
  if (currentMoveRef.current) {
    currentMoveRef.current.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest' // CRITICAL: Don't scroll entire page
    });
  }
}, [currentMoveIndex]);
```

### Code Examples from Research

#### Multi-Layer Validation Pipeline

```typescript
export function validateAndApplyUrlPayload(
  hash: string,
  currentState: GameState
): {
  success: boolean;
  newState?: GameState;
  error?: string;
} {
  // Layer 1: Decompression
  const decompressed = decompressFromEncodedURIComponent(hash);
  if (decompressed === null) {
    return {
      success: false,
      error: 'The game link is corrupted. Please request a new link from your opponent.'
    };
  }

  // Layer 2: JSON Parsing
  let parsed: unknown;
  try {
    parsed = JSON.parse(decompressed);
  } catch {
    return {
      success: false,
      error: 'The game link contains invalid data. Please request a new link.'
    };
  }

  // Layer 3: Schema Validation
  const result = UrlPayloadSchema.safeParse(parsed);
  if (!result.success) {
    const error = fromError(result.error);
    return {
      success: false,
      error: `Invalid game data: ${error.message}`
    };
  }

  // Layer 4: Business Logic Validation
  const payload = result.data;

  if (payload.type === 'delta') {
    // Validate turn number
    if (payload.turn !== currentState.currentTurn + 1) {
      return {
        success: false,
        error: `Turn mismatch: Expected turn ${currentState.currentTurn + 1}, received ${payload.turn}`
      };
    }

    // Apply move and verify checksum
    const moveResult = applyMove(currentState, payload.move);
    if (!moveResult.success) {
      return {
        success: false,
        error: `Invalid move: ${moveResult.error}`
      };
    }

    // Verify checksum matches
    if (moveResult.newState.checksum !== payload.checksum) {
      return {
        success: false,
        error: 'Checksum mismatch - game states have diverged'
      };
    }

    return { success: true, newState: moveResult.newState };
  }

  if (payload.type === 'full_state') {
    // Validate game state schema
    const stateResult = GameStateSchema.safeParse(payload.gameState);
    if (!stateResult.success) {
      const error = fromError(stateResult.error);
      return {
        success: false,
        error: `Invalid game state: ${error.message}`
      };
    }

    return { success: true, newState: stateResult.data };
  }

  if (payload.type === 'resync_request') {
    // Handle resync request
    // TODO: Open History Comparison Modal
    return {
      success: false,
      error: 'Resync requested - please resolve divergence'
    };
  }

  // Should never reach here due to discriminated union
  return { success: false, error: 'Unknown payload type' };
}
```

#### History Storage Integration

```typescript
// Extend KingsChessEngine.makeMove() to save history
export class KingsChessEngine {
  // ... existing methods

  public makeMove(from: Position, to: Position | 'off_board'): MoveResult {
    // Existing validation logic...
    const validation = validateMove(/* ... */);
    if (!validation.valid) {
      return { success: false, error: validation.reason };
    }

    // Execute move...
    const piece = this.getPieceAt(from);
    const targetPiece = this.getPieceAt(to);

    // CRITICAL: Capture checksum BEFORE move
    const checksumBeforeMove = this.gameState.checksum;

    // Apply move logic...
    this.applyMove(from, to);
    this.advanceTurn(); // Generates new checksum

    // NEW: Save to history
    const historyEntry: MoveHistoryEntry = {
      moveNumber: this.gameState.currentTurn - 1,
      player: this.gameState.currentPlayer === 'white' ? 'black' : 'white',
      from,
      to,
      piece,
      captured: targetPiece || null,
      checksum: this.gameState.checksum,
      timestamp: Date.now(),
      synced: false, // Will be set to true after URL generation
    };

    storage.appendToHistory(historyEntry);

    return {
      success: true,
      gameState: this.gameState,
      captured: targetPiece || undefined,
    };
  }

  // NEW: Expose checksum for URL encoding
  public getChecksum(): string {
    return this.gameState.checksum;
  }
}
```

---

## 🔨 IMPLEMENTATION BLUEPRINT

### Phase 3A: URL Encoding Infrastructure (Days 1-2)

#### Task 1: Install Dependencies and Setup Types
**Duration:** 30 minutes

```bash
# Install compression library
pnpm add lz-string

# Install validation helper
pnpm add zod-validation-error

# Install focus trap for modals
pnpm add focus-trap-react
```

**Create directory structure:**
```bash
mkdir -p src/lib/urlEncoding
mkdir -p src/lib/history
mkdir -p src/hooks
mkdir -p src/components
```

**Validation:**
```bash
pnpm run type-check
```

---

#### Task 2: Define Payload Type Schemas
**Duration:** 1 hour
**File:** `src/lib/urlEncoding/types.ts`

```typescript
/**
 * @fileoverview URL payload type definitions for Phase 3
 * @module lib/urlEncoding/types
 *
 * Three payload types:
 * - delta: One move + metadata (most common, ~80 chars compressed)
 * - full_state: Complete game state (initial game or resync, ~1500 chars)
 * - resync_request: Request full state with attempted move
 */

import { z } from 'zod';
import { GameStateSchema } from '@/lib/validation/schemas';

/**
 * Delta payload: One move with turn number and checksum
 *
 * Used for normal gameplay after initial game setup.
 * Smallest payload type (~80 chars compressed).
 */
export const DeltaPayloadSchema = z.object({
  type: z.literal('delta'),
  move: z.object({
    from: z.tuple([
      z.number().int().min(0).max(2),
      z.number().int().min(0).max(2),
    ]),
    to: z.union([
      z.tuple([
        z.number().int().min(0).max(2),
        z.number().int().min(0).max(2),
      ]),
      z.literal('off_board'),
    ]),
  }),
  turn: z.number().int().min(0),
  checksum: z.string(),
  playerName: z.string().min(2).max(20).optional(),
});

export type DeltaPayload = z.infer<typeof DeltaPayloadSchema>;

/**
 * Full state payload: Complete game state
 *
 * Used for:
 * 1. Initial game setup (Player 1 → Player 2)
 * 2. Resync after divergence
 * 3. Manual state sharing
 */
export const FullStatePayloadSchema = z.object({
  type: z.literal('full_state'),
  gameState: GameStateSchema,
  playerName: z.string().min(2).max(20).optional(),
});

export type FullStatePayload = z.infer<typeof FullStatePayloadSchema>;

/**
 * Resync request payload: Request full state with attempted move
 *
 * Sent when checksum mismatch detected.
 * Includes the move player wanted to make so it can be applied
 * to synced state if legal.
 */
export const ResyncRequestPayloadSchema = z.object({
  type: z.literal('resync_request'),
  move: z.object({
    from: z.tuple([
      z.number().int().min(0).max(2),
      z.number().int().min(0).max(2),
    ]),
    to: z.union([
      z.tuple([
        z.number().int().min(0).max(2),
        z.number().int().min(0).max(2),
      ]),
      z.literal('off_board'),
    ]),
  }),
  turn: z.number().int().min(0),
  checksum: z.string(),
  message: z.string().optional(),
});

export type ResyncRequestPayload = z.infer<typeof ResyncRequestPayloadSchema>;

/**
 * Discriminated union of all payload types
 *
 * Performance: 3x faster than regular union due to discriminator field.
 * TypeScript automatically narrows type based on 'type' field.
 */
export const UrlPayloadSchema = z.discriminatedUnion('type', [
  DeltaPayloadSchema,
  FullStatePayloadSchema,
  ResyncRequestPayloadSchema,
]);

export type UrlPayload = z.infer<typeof UrlPayloadSchema>;

/**
 * Type guard for delta payload
 */
export function isDeltaPayload(payload: UrlPayload): payload is DeltaPayload {
  return payload.type === 'delta';
}

/**
 * Type guard for full state payload
 */
export function isFullStatePayload(payload: UrlPayload): payload is FullStatePayload {
  return payload.type === 'full_state';
}

/**
 * Type guard for resync request payload
 */
export function isResyncRequestPayload(payload: UrlPayload): payload is ResyncRequestPayload {
  return payload.type === 'resync_request';
}
```

**Tests:** `src/lib/urlEncoding/types.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import {
  DeltaPayloadSchema,
  FullStatePayloadSchema,
  ResyncRequestPayloadSchema,
  UrlPayloadSchema,
} from './types';

describe('URL Payload Schemas', () => {
  describe('DeltaPayloadSchema', () => {
    it('should accept valid delta payload', () => {
      const valid = {
        type: 'delta',
        move: { from: [2, 0], to: [1, 0] },
        turn: 1,
        checksum: 'abc123',
      };

      const result = DeltaPayloadSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject invalid coordinates', () => {
      const invalid = {
        type: 'delta',
        move: { from: [5, 0], to: [1, 0] }, // 5 is out of bounds
        turn: 1,
        checksum: 'abc123',
      };

      const result = DeltaPayloadSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should accept off_board destination', () => {
      const valid = {
        type: 'delta',
        move: { from: [0, 0], to: 'off_board' },
        turn: 5,
        checksum: 'xyz789',
      };

      const result = DeltaPayloadSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });
  });

  describe('UrlPayloadSchema discriminated union', () => {
    it('should discriminate based on type field', () => {
      const deltaPayload = {
        type: 'delta',
        move: { from: [2, 0], to: [1, 0] },
        turn: 1,
        checksum: 'abc',
      };

      const result = UrlPayloadSchema.safeParse(deltaPayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe('delta');
      }
    });

    it('should reject payload with invalid type', () => {
      const invalid = {
        type: 'unknown_type',
        move: { from: [2, 0], to: [1, 0] },
      };

      const result = UrlPayloadSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });
});
```

**Validation:**
```bash
pnpm test src/lib/urlEncoding/types.test.ts
```

---

#### Task 3: Implement Compression/Decompression Utilities
**Duration:** 2 hours
**File:** `src/lib/urlEncoding/compression.ts`

```typescript
/**
 * @fileoverview Compression utilities for URL payloads
 * @module lib/urlEncoding/compression
 *
 * Uses lz-string library for URL-safe compression.
 * Typical compression ratios: 66-88% size reduction.
 */

import {
  compressToEncodedURIComponent,
  decompressFromEncodedURIComponent
} from 'lz-string';
import { fromError } from 'zod-validation-error';
import { UrlPayloadSchema, type UrlPayload } from './types';

/**
 * Compress payload to URL-safe string
 *
 * @param payload - Validated URL payload
 * @returns Compressed string or empty string on error
 *
 * @example
 * const payload: DeltaPayload = { type: 'delta', ... };
 * const compressed = compressPayload(payload);
 * // Result: "N4IgdghgtgpiBcIDaB..."
 */
export function compressPayload(payload: UrlPayload): string {
  try {
    const jsonString = JSON.stringify(payload);
    const compressed = compressToEncodedURIComponent(jsonString);

    // Log size for debugging
    if (import.meta.env.DEV) {
      console.log(`Compressed payload: ${jsonString.length} → ${compressed.length} chars (${Math.round((compressed.length / jsonString.length) * 100)}%)`);
    }

    return compressed;
  } catch (error) {
    console.error('Failed to compress payload:', error);
    return '';
  }
}

/**
 * Decompress and validate payload from URL string
 *
 * @param compressed - Compressed URL string (from hash fragment)
 * @returns Validated payload or null if decompression/validation fails
 *
 * @example
 * const hash = window.location.hash.slice(1);
 * const payload = decompressPayload(hash);
 * if (payload && payload.type === 'delta') {
 *   // Handle delta payload
 * }
 */
export function decompressPayload(compressed: string): UrlPayload | null {
  try {
    // Clean whitespace
    const cleaned = compressed.trim();
    if (!cleaned) {
      console.warn('Empty compressed string');
      return null;
    }

    // Decompress - CRITICAL: Check for null return
    const decompressed = decompressFromEncodedURIComponent(cleaned);
    if (decompressed === null) {
      console.error('Decompression returned null - data is corrupted');
      return null;
    }

    // Parse JSON
    let parsed: unknown;
    try {
      parsed = JSON.parse(decompressed);
    } catch (parseError) {
      console.error('JSON parse failed:', parseError);
      return null;
    }

    // Validate with Zod schema
    const result = UrlPayloadSchema.safeParse(parsed);

    if (result.success) {
      return result.data;
    } else {
      // Convert ZodError to user-friendly message
      const error = fromError(result.error);
      console.error('Payload validation failed:', error.message);
      return null;
    }
  } catch (error) {
    console.error('Failed to decompress payload:', error);
    return null;
  }
}

/**
 * Get compression statistics for debugging
 *
 * @param payload - Payload to analyze
 * @returns Size statistics
 */
export function getCompressionStats(payload: UrlPayload): {
  originalSize: number;
  compressedSize: number;
  ratio: number;
} {
  const jsonString = JSON.stringify(payload);
  const compressed = compressPayload(payload);

  return {
    originalSize: jsonString.length,
    compressedSize: compressed.length,
    ratio: compressed.length / jsonString.length,
  };
}
```

**Tests:** `src/lib/urlEncoding/compression.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { compressPayload, decompressPayload, getCompressionStats } from './compression';
import type { DeltaPayload, FullStatePayload } from './types';
import { v4 as uuid } from 'uuid';
import { PlayerIdSchema, GameIdSchema } from '@/lib/validation/schemas';

describe('Compression Utilities', () => {
  let deltaPayload: DeltaPayload;

  beforeEach(() => {
    deltaPayload = {
      type: 'delta',
      move: { from: [2, 0], to: [1, 0] },
      turn: 1,
      checksum: 'abc123',
    };
  });

  describe('compressPayload', () => {
    it('should compress delta payload', () => {
      const compressed = compressPayload(deltaPayload);

      expect(compressed).toBeTruthy();
      expect(typeof compressed).toBe('string');
      expect(compressed.length).toBeGreaterThan(0);
    });

    it('should produce URL-safe characters', () => {
      const compressed = compressPayload(deltaPayload);

      // Should not contain characters that need percent encoding
      expect(compressed).not.toMatch(/[^A-Za-z0-9_\-+]/);
    });

    it('should reduce size compared to JSON', () => {
      const jsonString = JSON.stringify(deltaPayload);
      const compressed = compressPayload(deltaPayload);

      // Compression should reduce size
      expect(compressed.length).toBeLessThan(jsonString.length);
    });
  });

  describe('decompressPayload', () => {
    it('should decompress valid compressed payload', () => {
      const compressed = compressPayload(deltaPayload);
      const decompressed = decompressPayload(compressed);

      expect(decompressed).toEqual(deltaPayload);
    });

    it('should return null for corrupted data', () => {
      const corrupted = 'this-is-not-compressed-data';
      const result = decompressPayload(corrupted);

      expect(result).toBeNull();
    });

    it('should return null for empty string', () => {
      const result = decompressPayload('');

      expect(result).toBeNull();
    });

    it('should handle whitespace trimming', () => {
      const compressed = compressPayload(deltaPayload);
      const withWhitespace = `  ${compressed}  `;
      const result = decompressPayload(withWhitespace);

      expect(result).toEqual(deltaPayload);
    });

    it('should round-trip full state payload', () => {
      const fullStatePayload: FullStatePayload = {
        type: 'full_state',
        gameState: {
          version: '1.0.0',
          gameId: GameIdSchema.parse(uuid()),
          board: [[null, null, null], [null, null, null], [null, null, null]],
          whiteCourt: [],
          blackCourt: [],
          capturedWhite: [],
          capturedBlack: [],
          currentTurn: 0,
          currentPlayer: 'white',
          whitePlayer: {
            id: PlayerIdSchema.parse(uuid()),
            name: 'Player 1',
          },
          blackPlayer: {
            id: PlayerIdSchema.parse(uuid()),
            name: 'Player 2',
          },
          status: 'playing',
          winner: null,
          moveHistory: [],
          checksum: 'initial',
        },
      };

      const compressed = compressPayload(fullStatePayload);
      const decompressed = decompressPayload(compressed);

      expect(decompressed).toEqual(fullStatePayload);
    });
  });

  describe('getCompressionStats', () => {
    it('should return accurate statistics', () => {
      const stats = getCompressionStats(deltaPayload);

      expect(stats.originalSize).toBeGreaterThan(0);
      expect(stats.compressedSize).toBeGreaterThan(0);
      expect(stats.ratio).toBeLessThan(1); // Compressed is smaller
      expect(stats.ratio).toBeGreaterThan(0);
    });

    it('should show typical compression ratio', () => {
      const stats = getCompressionStats(deltaPayload);

      // Typical compression: 40-80% of original size
      expect(stats.ratio).toBeGreaterThan(0.3);
      expect(stats.ratio).toBeLessThan(0.9);
    });
  });
});
```

**Validation:**
```bash
pnpm test src/lib/urlEncoding/compression.test.ts
pnpm run type-check
```

---

#### Task 4-8: URL Encoding Functions, Checksum Exposure, Turn Validation, and Tests

[Due to length constraints, I'll provide a concise outline. The full PRP would expand each task similarly to Tasks 1-3]

**Task 4:** Create URL generation functions (`src/lib/urlEncoding/urlBuilder.ts`)
- `buildDeltaUrl(move, turn, checksum)`
- `buildFullStateUrl(gameState)`
- `buildResyncRequestUrl(move, turn, checksum, message)`

**Task 5:** Implement URL parser with validation (`src/lib/urlEncoding/urlParser.ts`)
- `parseUrlHash(hash)` returns validated payload or error
- Multi-layer validation pipeline (decompress → parse → validate → business logic)

**Task 6:** Expose checksum from KingsChessEngine
- Add `public getChecksum(): string` method
- Update existing tests

**Task 7:** Add turn number validation utility
- `validateTurnNumber(receivedTurn, currentTurn)` returns validation result

**Task 8:** Comprehensive unit tests
- Test all payload types
- Test error cases (corrupted data, invalid moves, turn mismatches)
- Test round-trip encoding/decoding
- Achieve 80%+ coverage

**Validation:**
```bash
pnpm test src/lib/urlEncoding/
pnpm run test:coverage -- src/lib/urlEncoding/
```

---

### Phase 3B: History Storage & Player Name Integration (Day 3)

#### Task 9-14: History Types, localStorage Integration, Player Names, Engine Integration, Tests

**Task 9:** Define MoveHistoryEntry type (`src/lib/history/types.ts`)

**Task 10:** Create history storage utilities (`src/lib/history/storage.ts`)
- `getGameHistory()`, `setGameHistory()`, `appendToHistory()`, `clearHistory()`
- Integrate with existing `storage` facade pattern

**Task 11:** Add player name integration logic (`src/lib/urlEncoding/playerNames.ts`)

**Purpose:** Extract and save player names from URL payloads to localStorage

**Implementation:**
```typescript
import { storage } from '@/lib/storage/localStorage';
import type { UrlPayload } from './types';

/**
 * Extract and save opponent name from URL payload
 *
 * For URL Mode:
 * 1. Player 1 creates game with their name in gameState.whitePlayer.name
 * 2. Player 2 receives full_state URL → saves Player 1's name as opponent
 * 3. Player 2 makes first move → includes their name in delta.playerName
 * 4. Player 1 receives delta → saves Player 2's name as opponent
 * 5. If localStorage lost, resync_request includes playerName
 */
export function extractAndSaveOpponentName(
  payload: UrlPayload,
  myPlayerId: string
): void {
  if (payload.type === 'full_state') {
    // Receiving initial game state from Player 1
    const opponentName = payload.gameState.whitePlayer.name;

    // Save as opponent in localStorage
    localStorage.setItem('kings-cooking:opponent-name', opponentName);

    console.log(`Opponent name saved: ${opponentName}`);
  } else if (payload.type === 'delta' && payload.playerName) {
    // Receiving first move from Player 2 with their name
    localStorage.setItem('kings-cooking:opponent-name', payload.playerName);

    console.log(`Opponent name saved: ${payload.playerName}`);
  } else if (payload.type === 'resync_request' && payload.playerName) {
    // Receiving resync request (localStorage may have been lost)
    localStorage.setItem('kings-cooking:opponent-name', payload.playerName);

    console.log(`Opponent name saved from resync: ${payload.playerName}`);
  }
}

/**
 * Determine if we should include playerName in payload
 *
 * @param payloadType - Type of payload being created
 * @returns true if opponent might not have our name yet
 */
export function shouldIncludePlayerName(
  gameState: GameState,
  payloadType: 'delta' | 'resync_request',
  myPlayerId: string
): boolean {
  // For delta payloads: Include if we're black player on first move (turn 1)
  if (payloadType === 'delta') {
    if (gameState.currentPlayer === 'black' && gameState.currentTurn === 1) {
      return true;
    }
  }

  // For resync requests: Always include (opponent may have lost localStorage)
  if (payloadType === 'resync_request') {
    return true;
  }

  return false;
}
```

**Task 12:** Integrate with KingsChessEngine.makeMove()
- Save history entry after successful move
- Include checksum and timestamp

**Task 13:** Add checksum to each history entry
- Use engine's `getChecksum()` method

**Task 14:** Unit tests for history storage and player names
- Test append, get, clear operations
- Test localStorage persistence
- Test corrupted data handling
- Test extractAndSaveOpponentName() for both full_state and delta payloads
- Test shouldIncludePlayerName() logic

**Validation:**
```bash
pnpm test src/lib/history/
pnpm test src/lib/urlEncoding/playerNames.test.ts
```

---

### Phase 3C: History Viewer UI (Days 4-5)

#### Task 15-19: History Viewer Component, Full History Modal, Export JSON, Tests

**Task 15:** Build collapsible History Viewer component (`src/components/HistoryViewer.tsx`)
- Follow accessibility requirements (ARIA attributes)
- Auto-scroll to current move
- Show sync status with checkmarks

**Task 16:** Display last 10 moves with turn numbers and sync status

**Task 17:** Add "Show Full History" modal
- Display complete game history
- Scrollable list for long games

**Task 18:** Add "Export JSON" functionality
- Download game history with metadata
- Timestamp-based file naming

**Task 19:** Component tests with Testing Library
- Test expand/collapse
- Test move selection
- Test export functionality

**Validation:**
```bash
pnpm test src/components/HistoryViewer.test.tsx
```

---

### Phase 3D: History Comparison Modal (Days 6-7)

#### Task 20-24: Comparison Modal, Divergence Detection, Action Buttons, Resync Flows, Tests

**Task 20:** Build History Comparison Modal component
- Use focus-trap-react for accessibility
- Side-by-side history display

**Task 21:** Implement divergence detection logic
- Find first mismatched checksum
- Highlight divergence point

**Task 22:** Add four action buttons with handlers
- Send My State, Accept Their State, Review, Cancel

**Task 23:** Wire up resync flows
- Generate full_state URL when sending state
- Apply full_state when accepting state

**Task 24:** Integration tests
- Test divergence detection
- Test each action button
- Test modal accessibility

**Validation:**
```bash
pnpm test src/components/HistoryComparisonModal.test.tsx
```

---

### Phase 3E: URL State Sync Integration (Days 8-10)

#### Task 25-30: URL Hooks, Integration, Error Handling, E2E Tests

**Task 25:** Create useUrlState React hook
- Monitor hash changes
- Debounce URL updates
- Return payload and error state

**Task 26:** Integrate URL encoding on move
- Generate delta URL after each move
- Mark history entry as synced

**Task 27:** Integrate URL decoding on load
- Parse URL on mount
- Apply payload to game state

**Task 28:** Error handling for corrupted URLs
- User-friendly error messages
- Fallback to new game

**Task 29:** Full integration tests
- Test happy path (10-move game)
- Test checksum mismatch flow
- Test localStorage loss recovery

**Task 30:** E2E tests with Playwright
- Two-browser URL sharing test
- Divergence resolution flow

**Validation:**
```bash
pnpm test
pnpm run test:e2e
pnpm run test:coverage
```

---

## ✅ VALIDATION LOOP

### Level 1: Type Checking & Linting

**Commands:**
```bash
# TypeScript compilation
pnpm run type-check

# ESLint (zero warnings)
pnpm run lint

# Auto-fix ESLint issues
pnpm run lint:fix
```

**Expected Output:**
```
✓ TypeScript compilation successful (0 errors)
✓ ESLint: No errors, no warnings
```

**If Errors:**
- Fix TypeScript errors before proceeding
- Review ESLint errors and fix manually or with --fix
- Pay attention to `noUncheckedIndexedAccess` errors (array access must be guarded)

---

### Level 2: Unit Tests

**Commands:**
```bash
# Run all tests
pnpm test

# Run with coverage
pnpm run test:coverage

# Run specific file
pnpm test src/lib/urlEncoding/compression.test.ts

# Watch mode for development
pnpm test -- --watch
```

**Expected Output:**
```
✓ src/lib/urlEncoding/types.test.ts (12 tests)
✓ src/lib/urlEncoding/compression.test.ts (15 tests)
✓ src/lib/urlEncoding/urlBuilder.test.ts (10 tests)
✓ src/lib/urlEncoding/urlParser.test.ts (18 tests)
✓ src/lib/history/storage.test.ts (14 tests)
✓ src/components/HistoryViewer.test.tsx (20 tests)
✓ src/components/HistoryComparisonModal.test.tsx (16 tests)
✓ src/hooks/useUrlState.test.ts (12 tests)

Test Files  8 passed (8)
     Tests  117 passed (117)

Coverage:
---------------------------------|---------|----------|---------|---------|
File                             | % Stmts | % Branch | % Funcs | % Lines |
---------------------------------|---------|----------|---------|---------|
All files                        |   85.23 |    82.45 |   87.12 |   85.23 |
 lib/urlEncoding                 |   88.45 |    85.20 |   90.00 |   88.45 |
  compression.ts                 |   92.15 |    88.89 |   95.00 |   92.15 |
  types.ts                       |   100   |    100   |   100   |   100   |
  urlBuilder.ts                  |   85.71 |    82.35 |   88.00 |   85.71 |
  urlParser.ts                   |   87.23 |    83.33 |   87.50 |   87.23 |
 lib/history                     |   86.34 |    84.21 |   88.67 |   86.34 |
  storage.ts                     |   90.45 |    87.50 |   92.00 |   90.45 |
  types.ts                       |   100   |    100   |   100   |   100   |
 components                      |   82.15 |    78.90 |   84.00 |   82.15 |
  HistoryViewer.tsx              |   81.45 |    77.78 |   83.33 |   81.45 |
  HistoryComparisonModal.tsx     |   82.85 |    80.00 |   84.62 |   82.85 |
 hooks                           |   88.23 |    85.45 |   90.00 |   88.23 |
  useUrlState.ts                 |   88.23 |    85.45 |   90.00 |   88.23 |
---------------------------------|---------|----------|---------|---------|
```

**Minimum Requirements:**
- All tests passing (100%)
- Overall coverage ≥ 80%
- URL encoding coverage ≥ 85%
- History storage coverage ≥ 85%

**If Failures:**
- Fix failing tests before proceeding
- Add missing test cases for uncovered branches
- Verify error handling paths are tested

---

### Level 3: Integration Tests

**Commands:**
```bash
# Run integration tests
pnpm test -- --grep "integration"

# Run specific integration suite
pnpm test src/lib/urlEncoding/integration.test.ts
```

**Expected Output:**
```
✓ URL encoding/decoding integration (10 tests)
  ✓ Should round-trip delta payload
  ✓ Should round-trip full state payload
  ✓ Should handle checksum mismatch
  ✓ Should handle turn number mismatch
  ✓ Should handle corrupted URL
  ✓ Should handle missing localStorage
  ✓ Should save and load history correctly
  ✓ Should detect divergence point
  ✓ Should apply resync correctly
  ✓ Should export valid JSON

Integration Tests  10 passed (10)
```

**If Failures:**
- Debug integration issues with isolated unit tests
- Verify data flow between components
- Check localStorage state persistence

---

### Level 4: E2E Tests (Playwright)

**Commands:**
```bash
# Run E2E tests
pnpm run test:e2e

# Run in headed mode (see browser)
pnpm run test:e2e -- --headed

# Run specific test
pnpm run test:e2e -- --grep "URL sharing"
```

**Expected Output:**
```
✓ URL state sync E2E tests (8 tests)
  ✓ Should create game and share URL
  ✓ Should load game from URL
  ✓ Should alternate moves via URL
  ✓ Should detect checksum mismatch
  ✓ Should resolve divergence with modal
  ✓ Should export game history
  ✓ Should handle corrupted URL gracefully
  ✓ Should persist history in localStorage

E2E Tests  8 passed (8)
Duration  45.2s
```

**If Failures:**
- Check browser console for errors
- Verify URL encoding/decoding in browser
- Test localStorage persistence manually

---

### Level 5: Build Validation

**Commands:**
```bash
# Type check + Build
pnpm run type-check && pnpm run build

# Preview production build
pnpm run preview
```

**Expected Output:**
```
✓ TypeScript compilation successful
✓ Building for production...
✓ 52 modules transformed

dist/index.html                         0.75 kB │ gzip:  0.38 kB
dist/assets/index-Ck8FJ92k.css          3.45 kB │ gzip:  1.12 kB
dist/assets/react-vendor-Dg3Hj8Kf.js  11.95 kB │ gzip:  4.28 kB
dist/assets/validation-EH7_knx9.js    54.23 kB │ gzip: 12.45 kB
dist/assets/lz-string-Fk3Dj8Ks.js      2.85 kB │ gzip:  0.92 kB
dist/assets/index-CYLr-yt_.js         198.67 kB │ gzip: 62.34 kB

✓ built in 2.34s
```

**Bundle Size Checks:**
- lz-string should add < 3KB gzipped
- Total bundle should be < 300KB

**If Build Fails:**
- Review TypeScript errors
- Check for missing imports
- Verify all files included in build

---

### Level 6: Manual Verification

**Two-Browser URL Sharing Test:**

1. **Setup:**
   - Open Chrome in regular window (Player 1)
   - Open Chrome in incognito window (Player 2)
   - Or use two different browsers

2. **Player 1 Creates Game:**
   ```
   - Navigate to http://localhost:5173
   - Create new game (enter name)
   - Make first move (e.g., rook forward)
   - Copy generated URL from address bar
   ```

3. **Player 2 Joins Game:**
   ```
   - Paste URL in incognito/second browser
   - Verify game state loads correctly
   - Verify Player 1's move is shown
   - Verify it's Player 2's turn
   ```

4. **Alternate Moves:**
   ```
   - Player 2 makes move
   - Copy new URL
   - Player 1 pastes URL in first browser
   - Verify move is applied correctly
   - Continue for 5-10 moves
   ```

5. **Test History Viewer:**
   ```
   - Expand history panel
   - Verify all moves shown
   - Verify sync indicators (checkmarks)
   - Test "Export JSON" button
   - Verify downloaded JSON is valid
   ```

6. **Test Divergence (Simulated):**
   ```
   - In one browser, open DevTools
   - Modify localStorage game state manually
   - Make move in that browser
   - Paste URL in other browser
   - Verify History Comparison Modal appears
   - Test "Send My State" button
   - Verify game syncs correctly
   ```

7. **Test Error Cases:**
   ```
   - Navigate to URL with corrupted hash
   - Verify error message is user-friendly
   - Clear localStorage and paste URL
   - Verify game loads from URL
   - Test very long game (50+ moves)
   - Verify URL length is acceptable
   ```

**Expected Results:**
- ✅ URLs share game state correctly
- ✅ Delta URLs are short (~80-150 chars)
- ✅ Full state URLs work but are longer (~1500 chars)
- ✅ History viewer shows all moves accurately
- ✅ Export JSON produces valid, readable data
- ✅ Divergence modal appears on checksum mismatch
- ✅ Error messages are clear and actionable
- ✅ No console errors during normal gameplay

**If Issues:**
- Check browser console for errors
- Verify localStorage is not disabled
- Test in multiple browsers
- Check URL length limits (< 2000 chars for IE compatibility)

---

## 📊 PHASE 3 COMPLETION CHECKLIST

### Core Functionality
- [ ] lz-string library installed and TypeScript types working
- [ ] Three payload types (delta, full_state, resync_request) defined with discriminated union
- [ ] Compression/decompression utilities implemented with null checks
- [ ] URL encoding functions for all three payload types
- [ ] URL decoding with multi-layer validation (decompress → parse → validate → business logic)
- [ ] Checksum exposed from KingsChessEngine via getChecksum()
- [ ] Turn number validation detects skipped moves
- [ ] Move history storage integrated with KingsChessEngine.makeMove()
- [ ] localStorage saves full game history with checksums

### UI Components
- [ ] History Viewer component (collapsible, accessible, auto-scroll)
- [ ] History Viewer displays last 10 moves with sync status
- [ ] "Show Full History" modal works for games with 100+ moves
- [ ] "Export JSON" downloads game history with metadata
- [ ] History Comparison Modal (4 action buttons, divergence highlighting)
- [ ] Divergence detection finds first checksum mismatch
- [ ] "Send My State" generates full_state URL
- [ ] "Accept Their State" applies opponent's full_state
- [ ] Focus trap works in modals (Escape closes, Tab cycles)

### React Integration
- [ ] useUrlState hook monitors hash changes
- [ ] useUrlState debounces URL updates (300ms)
- [ ] URL updates use replaceState (no history pollution)
- [ ] Hash changes handled on back/forward navigation
- [ ] Error state managed and displayed to user

### Testing
- [ ] Unit tests for all URL encoding functions
- [ ] Unit tests for compression/decompression
- [ ] Unit tests for history storage
- [ ] Component tests for History Viewer
- [ ] Component tests for History Comparison Modal
- [ ] Hook tests for useUrlState
- [ ] Integration tests for full URL sync flow
- [ ] E2E tests with Playwright (two-browser)
- [ ] 80%+ coverage achieved

### Validation
- [ ] TypeScript compilation: 0 errors
- [ ] ESLint: 0 warnings
- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] All E2E tests passing
- [ ] Production build successful
- [ ] Manual two-browser test completed

### Documentation
- [ ] All functions have JSDoc comments
- [ ] README updated with Phase 3 completion status
- [ ] Gotchas documented in code comments

---

## 🎯 SUCCESS METRICS

**Phase 3 is complete when:**

1. **Delta URLs work** for normal gameplay (moves 2+)
2. **Full state URLs** initialize Player 2 correctly (move 1)
3. **Resync request URLs** trigger History Comparison Modal
4. **Checksum verification** detects and handles divergence
5. **History Viewer** displays accurate move history with sync status
6. **Export JSON** produces valid, human-readable game data
7. **Error handling** gracefully handles all edge cases:
   - Corrupted URLs show user-friendly message
   - Turn mismatches detected and resolved
   - localStorage loss recoverable from URL
8. **All validation gates pass:**
   - TypeScript: 0 errors
   - ESLint: 0 warnings
   - Tests: 117+ passing, 80%+ coverage
   - Build: Production build successful
9. **Manual verification** confirms two-browser URL sharing works end-to-end

---

## 🚨 COMMON GOTCHAS (CRITICAL TO AVOID)

### Gotcha #1: Forgetting to Check for null from decompressFromEncodedURIComponent

**Problem:** Assuming decompression always returns a string

```typescript
// ❌ WRONG: Crashes if decompression fails
const data = JSON.parse(decompressFromEncodedURIComponent(hash));

// ✅ CORRECT: Check for null first
const decompressed = decompressFromEncodedURIComponent(hash);
if (decompressed === null) {
  return handleCorruptedUrl();
}
const data = JSON.parse(decompressed);
```

---

### Gotcha #2: Using parse() Instead of safeParse() for URL Data

**Problem:** Throwing exceptions for expected errors

```typescript
// ❌ WRONG: Throws ZodError for invalid data
const payload = UrlPayloadSchema.parse(unknownData);

// ✅ CORRECT: Use safeParse for external data
const result = UrlPayloadSchema.safeParse(unknownData);
if (result.success) {
  const payload = result.data;
} else {
  const error = fromError(result.error);
  showUserError(error.message);
}
```

---

### Gotcha #3: Using pushState() Instead of replaceState()

**Problem:** Polluting browser history with every move

```typescript
// ❌ WRONG: Every move creates history entry
window.history.pushState(null, '', url);

// ✅ CORRECT: Replace current entry
window.history.replaceState(null, '', url);
```

**Why:** In async games, players don't navigate via back button between moves. Using `pushState()` means clicking back 10 times to return to previous page.

---

### Gotcha #4: Not Debouncing URL Updates

**Problem:** Excessive history.replaceState() calls

```typescript
// ❌ WRONG: Updates URL immediately on every state change
useEffect(() => {
  const compressed = compressPayload(gameState);
  window.location.hash = compressed;
}, [gameState]); // Fires on every state change

// ✅ CORRECT: Debounce URL updates by 300ms
const debounceTimerRef = useRef<number | null>(null);

const updateUrl = useCallback((state: GameState) => {
  if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

  debounceTimerRef.current = window.setTimeout(() => {
    const compressed = compressPayload(createPayload(state));
    const url = new URL(window.location.href);
    url.hash = compressed;
    window.history.replaceState(null, '', url);
  }, 300);
}, []);
```

---

### Gotcha #5: Including history Object in useEffect Dependencies

**Problem:** Exponential event listener growth

```typescript
// ❌ WRONG: Creates new listener on every render
useEffect(() => {
  const handleHashChange = () => { /* ... */ };
  window.addEventListener('hashchange', handleHashChange);
  return () => window.removeEventListener('hashchange', handleHashChange);
}, [window.history]); // BAD - history object changes every render

// ✅ CORRECT: Empty dependency array - listener is stable
useEffect(() => {
  const handleHashChange = () => { /* ... */ };
  window.addEventListener('hashchange', handleHashChange);
  return () => window.removeEventListener('hashchange', handleHashChange);
}, []); // GOOD - registered once
```

---

### Gotcha #6: Not Cleaning Up Debounce Timers

**Problem:** Memory leaks and race conditions

```typescript
// ❌ WRONG: Timer persists after component unmounts
const updateUrl = useCallback((state: GameState) => {
  setTimeout(() => {
    window.history.replaceState(/* ... */);
  }, 300);
}, []);

// ✅ CORRECT: Clean up timer on unmount
const debounceTimerRef = useRef<number | null>(null);

useEffect(() => {
  return () => {
    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current);
    }
  };
}, []);
```

---

### Gotcha #7: Not Handling Turn Number Mismatches

**Problem:** Applying moves in wrong order

```typescript
// ❌ WRONG: Blindly apply move without turn validation
if (payload.type === 'delta') {
  applyMove(payload.move);
}

// ✅ CORRECT: Validate turn number first
if (payload.type === 'delta') {
  const expectedTurn = currentState.currentTurn + 1;
  if (payload.turn !== expectedTurn) {
    showError(`Turn mismatch: Expected ${expectedTurn}, got ${payload.turn}`);
    return;
  }
  applyMove(payload.move);
}
```

---

### Gotcha #8: Not Trimming Compressed Strings

**Problem:** Whitespace breaks decompression

```typescript
// ❌ WRONG: Whitespace causes decompression to fail
const hash = window.location.hash.slice(1);
const payload = decompressPayload(hash); // Fails if hash has leading/trailing spaces

// ✅ CORRECT: Trim whitespace before decompression
const hash = window.location.hash.slice(1).trim();
const payload = decompressPayload(hash);
```

---

### Gotcha #9: Regular Union Instead of Discriminated Union

**Problem:** Slow validation and poor error messages

```typescript
// ❌ WRONG: Regular union (O(n) validation, generic errors)
const UrlPayloadSchema = z.union([
  DeltaPayloadSchema,
  FullStatePayloadSchema,
  ResyncRequestPayloadSchema,
]);

// ✅ CORRECT: Discriminated union (O(1) validation, specific errors)
const UrlPayloadSchema = z.discriminatedUnion('type', [
  DeltaPayloadSchema,
  FullStatePayloadSchema,
  ResyncRequestPayloadSchema,
]);
```

**Performance:** Discriminated union is 3x faster and provides better error messages.

---

### Gotcha #10: Not Handling localStorage Quota Exceeded

**Problem:** Saving history fails silently

```typescript
// ❌ WRONG: Doesn't check if save succeeded
storage.appendToHistory(entry);

// ✅ CORRECT: Handle quota exceeded error
const success = storage.appendToHistory(entry);
if (!success) {
  console.warn('Failed to save history - localStorage quota exceeded');
  // Option: Trim old history entries
  const history = storage.getGameHistory() || [];
  const trimmed = history.slice(-50); // Keep last 50 moves
  storage.setGameHistory(trimmed);
  storage.appendToHistory(entry);
}
```

---

## 📈 ESTIMATED COMPLETION TIME

**Total Duration:** 10 days (Week 2)

**Breakdown:**
- Phase 3A (URL Encoding Infrastructure): 2 days
- Phase 3B (History Storage): 1 day
- Phase 3C (History Viewer UI): 2 days
- Phase 3D (History Comparison Modal): 2 days
- Phase 3E (Integration & Testing): 3 days

**Confidence Level:** High (8/10)

**Reasoning:**
- Well-defined scope with comprehensive PRD and flow diagrams
- Existing patterns established in Phase 1 & 2
- Libraries proven and documented (lz-string, Zod, focus-trap-react)
- Comprehensive research completed upfront
- Clear validation gates at each step

**Risks Mitigated:**
- ✅ Research completed before implementation
- ✅ Code examples provided from research
- ✅ Gotchas documented upfront
- ✅ Validation gates defined for each sub-phase
- ✅ Test-driven approach ensures quality

---

## 🎓 PRP QUALITY SCORE

**Self-Assessment:** **9/10**

**Scoring Breakdown:**

✅ **Context Completeness (10/10)**
- Comprehensive research from 5 specialized agents
- External documentation URLs with specific sections
- Code examples from existing codebase
- Gotchas documented with solutions
- Integration points identified (file paths + line numbers)

✅ **Validation Executability (10/10)**
- 6 validation levels with exact commands
- Expected outputs specified
- Error handling instructions
- Manual verification steps detailed
- Success metrics clearly defined

✅ **Existing Pattern Integration (9/10)**
- Follows branded types pattern from Phase 1
- Uses storage facade pattern from Phase 1
- Extends KingsChessEngine from Phase 2
- Follows test structure conventions
- Minor: Could include more existing file snippets

✅ **Implementation Clarity (9/10)**
- Task-by-task breakdown with pseudocode
- Estimated durations for each task
- Dependencies clearly identified
- File structure defined upfront
- Minor: Some tasks condensed due to length

✅ **Error Handling Documentation (10/10)**
- 10 common gotchas documented
- Each gotcha has ❌ wrong and ✅ correct examples
- Multi-layer validation pipeline explained
- User-friendly error message patterns
- Edge cases covered (corrupted URLs, localStorage quota)

**Total Confidence Score:** **9/10**

**Why Not 10/10:**
- Some tasks (4-8, 9-13, etc.) were condensed due to length constraints
- Could include more inline code comments in examples
- Could provide more visual diagrams (text-based due to markdown format)

**One-Pass Implementation Probability:** **85-90%**

**Rationale:**
- Comprehensive context reduces unknowns
- Executable validation gates enable self-correction
- Gotchas documented prevent common errors
- Test-driven approach catches issues early
- Well-defined success criteria
- Estimated 1-2 minor iterations for edge case refinement

---

**END OF PRP**

---

**Next Steps:**

1. Review this PRP with stakeholders
2. Confirm Phase 3 scope aligns with PRD requirements
3. Begin Phase 3A implementation (URL encoding infrastructure)
4. Execute validation loop after each sub-phase
5. Report blockers immediately if encountered

**Questions or Clarifications:**

If any aspect of this PRP is unclear or requires additional context, please raise it before beginning implementation. The goal is to enable one-pass implementation success through comprehensive upfront planning.
