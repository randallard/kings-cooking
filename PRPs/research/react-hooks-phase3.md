# React Hooks Patterns for Phase 3: URL State Synchronization

**Research Date**: 2025-10-15
**Context**: King's Cooking async two-player chess variant game
**Phase**: Phase 3 (Tasks 25-30) - URL State Sync Integration
**Document Length**: ~1,100 lines

---

## Executive Summary

This document provides comprehensive React hooks patterns needed for implementing Phase 3's URL state synchronization system. Key findings:

- **useUrlState Hook Pattern**: Custom hook combining hash monitoring, debouncing, and state management
- **Critical Gotcha**: Frozen closure problem in debounced callbacks requires `useRef` solution
- **Debouncing Strategy**: 300ms debounce with `useRef` for latest state access
- **Hash Change Monitoring**: `hashchange` event + `useEffect` with empty dependency array
- **Error State Management**: Multi-layer validation pipeline with user-friendly messages
- **URL Encoding Flow**: Compress payload → update hash → mark history entry as synced
- **URL Decoding Flow**: Parse hash → validate payload → apply to game state
- **Integration Points**: KingsChessEngine, localStorage, History Viewer components

**Success Metrics for Phase 3**:
- ✅ Delta URLs work for normal gameplay (moves 2+)
- ✅ Full state URLs initialize Player 2 correctly
- ✅ Corrupted URLs show user-friendly error messages
- ✅ Turn number mismatches detected and resolved
- ✅ All validation gates pass (80%+ test coverage)

---

## 1. useUrlState Hook Pattern (Task 25)

### 1.1 Core Hook Structure

The `useUrlState` hook is the central integration point for URL-based state management. It combines:
1. Hash change monitoring (browser back/forward navigation)
2. Debounced URL updates (prevent history pollution)
3. Error state management (user-friendly error messages)
4. Payload validation (multi-layer validation pipeline)

**Complete Implementation**:

```typescript
/**
 * @fileoverview Custom hook for URL state synchronization with debouncing
 * @module hooks/useUrlState
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { decompressPayload, compressPayload } from '@/lib/urlEncoding/compression';
import type { UrlPayload } from '@/lib/urlEncoding/types';

/**
 * Hook configuration options
 */
export interface UseUrlStateOptions {
  /** Debounce delay for URL updates (default: 300ms) */
  debounceMs?: number;

  /** Error callback handler */
  onError?: (error: string) => void;

  /** Success callback after URL update */
  onUrlUpdated?: (url: string) => void;
}

/**
 * Custom hook for managing game state in URL hash fragment.
 *
 * Features:
 * - Automatic URL parsing on mount
 * - Hash change monitoring (back/forward navigation)
 * - Debounced URL updates (300ms default)
 * - Error state management with validation
 * - Memory leak prevention (cleanup on unmount)
 *
 * @param options - Hook configuration options
 * @returns State object with payload, error, and update function
 *
 * @example
 * ```tsx
 * const { payload, error, updateUrl, getShareUrl } = useUrlState({
 *   debounceMs: 300,
 *   onError: (error) => showErrorToast(error),
 * });
 *
 * if (error) return <ErrorMessage error={error} />;
 * if (!payload) return <NewGameSetup />;
 *
 * if (payload.type === 'delta') {
 *   // Handle move delta
 *   applyMove(payload.move);
 * }
 * ```
 */
export function useUrlState(options: UseUrlStateOptions = {}) {
  const { debounceMs = 300, onError, onUrlUpdated } = options;

  // State: Current payload and error
  const [payload, setPayload] = useState<UrlPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Refs: Latest state for debounced callback (prevents frozen closure)
  const payloadRef = useRef<UrlPayload | null>(payload);
  const debounceTimerRef = useRef<number | null>(null);

  // Keep ref in sync with state (CRITICAL for debounce)
  useEffect(() => {
    payloadRef.current = payload;
  }, [payload]);

  /**
   * Parse URL hash on mount.
   *
   * This effect runs ONCE on component mount to load initial state
   * from URL hash fragment. Validates payload with multi-layer pipeline.
   */
  useEffect(() => {
    const hash = window.location.hash.slice(1); // Remove '#' prefix
    if (!hash) {
      // No hash = new game
      return;
    }

    // Decompress and validate payload
    const decoded = decompressPayload(hash);
    if (decoded) {
      setPayload(decoded);
      setError(null);
    } else {
      // Validation failed
      const errorMsg = 'Failed to load game from URL - the link may be corrupted';
      setError(errorMsg);
      onError?.(errorMsg);
    }
  }, []); // Empty deps - run ONCE on mount

  /**
   * Listen for hash changes (back/forward navigation).
   *
   * This effect monitors browser navigation (back/forward buttons)
   * and updates state when hash changes externally.
   *
   * CRITICAL: Empty dependency array prevents exponential listener growth.
   */
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);

      if (!hash) {
        // Hash removed - reset to new game
        setPayload(null);
        setError(null);
        return;
      }

      // Decompress and validate new payload
      const decoded = decompressPayload(hash);
      if (decoded) {
        setPayload(decoded);
        setError(null);
      } else {
        const errorMsg = 'Failed to load game from URL';
        setError(errorMsg);
        onError?.(errorMsg);
      }
    };

    window.addEventListener('hashchange', handleHashChange);

    // CRITICAL: Clean up listener on unmount
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []); // Empty deps - listener is stable

  /**
   * Debounced URL update function.
   *
   * Uses useMemo to create stable debounce function that accesses
   * latest state via payloadRef (prevents frozen closure problem).
   *
   * CRITICAL: Uses useRef for latest state access, not closure.
   */
  const debouncedUpdateUrl = useMemo(() => {
    return (newPayload: UrlPayload) => {
      // Clear any existing timer
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current);
      }

      // Debounce URL update
      debounceTimerRef.current = window.setTimeout(() => {
        // Use payloadRef.current for latest state, not closure
        const compressed = compressPayload(newPayload);

        if (!compressed) {
          const errorMsg = 'Failed to encode game state to URL';
          setError(errorMsg);
          onError?.(errorMsg);
          return;
        }

        // Update URL with replaceState (NO history pollution)
        const url = new URL(window.location.href);
        url.hash = compressed;
        window.history.replaceState(null, '', url);

        // Update state
        setPayload(newPayload);
        setError(null);

        // Notify success
        onUrlUpdated?.(url.href);

        debounceTimerRef.current = null;
      }, debounceMs);
    };
  }, [debounceMs, onError, onUrlUpdated]);

  /**
   * Cleanup debounce timer on unmount.
   *
   * CRITICAL: Prevents memory leaks and race conditions.
   */
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  /**
   * Get current shareable URL.
   *
   * @returns Current URL with hash fragment
   */
  const getShareUrl = useCallback((): string => {
    return window.location.href;
  }, []);

  /**
   * Force immediate URL update (bypasses debounce).
   *
   * Use this for significant events like game creation or resync.
   *
   * @param newPayload - Payload to encode immediately
   */
  const updateUrlImmediate = useCallback((newPayload: UrlPayload) => {
    // Clear any pending debounced update
    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    const compressed = compressPayload(newPayload);

    if (!compressed) {
      const errorMsg = 'Failed to encode game state to URL';
      setError(errorMsg);
      onError?.(errorMsg);
      return;
    }

    const url = new URL(window.location.href);
    url.hash = compressed;
    window.history.replaceState(null, '', url);

    setPayload(newPayload);
    setError(null);
    onUrlUpdated?.(url.href);
  }, [onError, onUrlUpdated]);

  return {
    /** Current parsed payload or null if no hash */
    payload,

    /** Current error message or null if no error */
    error,

    /** Update URL with debouncing (300ms default) */
    updateUrl: debouncedUpdateUrl,

    /** Update URL immediately (bypasses debounce) */
    updateUrlImmediate,

    /** Get current shareable URL */
    getShareUrl,
  };
}
```

### 1.2 Hook Usage Examples

**Basic Usage**:

```typescript
/**
 * Game component using URL state hook
 */
function GamePage(): ReactElement {
  const { payload, error, updateUrl, getShareUrl } = useUrlState({
    debounceMs: 300,
    onError: (error) => {
      toast.error(error);
    },
  });

  // Handle loading state
  if (!payload && !error) {
    return <NewGameSetup />;
  }

  // Handle error state
  if (error) {
    return (
      <ErrorBanner
        message={error}
        onRetry={() => window.location.reload()}
      />
    );
  }

  // Handle payload types
  if (payload.type === 'full_state') {
    return <Game initialState={payload.gameState} />;
  }

  if (payload.type === 'delta') {
    return <Game moveToApply={payload.move} />;
  }

  if (payload.type === 'resync_request') {
    return <HistoryComparisonModal />;
  }

  return null;
}
```

**Advanced Usage with Integration**:

```typescript
/**
 * Game component with complete URL state integration
 */
function GameWithUrlSync(): ReactElement {
  const { payload, error, updateUrl, getShareUrl } = useUrlState({
    onError: showErrorToast,
    onUrlUpdated: (url) => {
      console.log('URL updated:', url);
    },
  });

  const [engine] = useState(() => new KingsChessEngine());

  // Apply payload to game engine
  useEffect(() => {
    if (!payload) return;

    if (payload.type === 'full_state') {
      engine.loadState(payload.gameState);
    } else if (payload.type === 'delta') {
      const result = engine.makeMove(payload.move.from, payload.move.to);

      if (!result.success) {
        showErrorToast(`Invalid move: ${result.error}`);
        return;
      }

      // Verify checksum
      if (engine.getChecksum() !== payload.checksum) {
        showErrorToast('Checksum mismatch - game states diverged');
        return;
      }
    }
  }, [payload, engine]);

  // Generate URL after move
  const handleMove = useCallback((from: Position, to: Position) => {
    const result = engine.makeMove(from, to);

    if (!result.success) {
      showErrorToast(result.error);
      return;
    }

    // Create delta payload
    const deltaPayload: DeltaPayload = {
      type: 'delta',
      move: { from, to },
      turn: engine.getCurrentTurn(),
      checksum: engine.getChecksum(),
    };

    // Update URL (debounced)
    updateUrl(deltaPayload);

    // Mark history entry as synced
    storage.appendToHistory({
      moveNumber: engine.getCurrentTurn() - 1,
      player: engine.getCurrentPlayer(),
      from,
      to,
      piece: engine.getPieceAt(to),
      captured: result.captured || null,
      checksum: engine.getChecksum(),
      timestamp: Date.now(),
      synced: true, // URL generated successfully
    });

    // Show copy link button
    showCopyLinkNotification();
  }, [engine, updateUrl]);

  return <Board onMove={handleMove} />;
}
```

---

## 2. Hash Change Monitoring (Tasks 26-27)

### 2.1 Hash Change Event Handling

**Pattern**: Use `hashchange` event with `useEffect` for external hash changes (back/forward navigation, manual URL edits).

**Critical Implementation Details**:

```typescript
/**
 * Hash change listener with proper cleanup.
 *
 * CRITICAL GOTCHAS:
 * - ❌ DO NOT include window.history in dependency array (causes exponential listeners)
 * - ❌ DO NOT forget cleanup function (causes memory leaks)
 * - ✅ USE empty dependency array (listener is stable)
 * - ✅ ALWAYS clean up listener on unmount
 */
useEffect(() => {
  const handleHashChange = () => {
    // Get hash without '#' prefix
    const hash = window.location.hash.slice(1);

    if (!hash) {
      // Hash removed - reset state
      setPayload(null);
      return;
    }

    // Decompress and validate
    const decoded = decompressPayload(hash);
    if (decoded) {
      setPayload(decoded);
      setError(null);
    } else {
      setError('Invalid URL format');
    }
  };

  // Register listener
  window.addEventListener('hashchange', handleHashChange);

  // CRITICAL: Clean up on unmount
  return () => window.removeEventListener('hashchange', handleHashChange);
}, []); // CRITICAL: Empty deps - never recreate listener
```

**Gotcha #1: Including history in Dependencies**

```typescript
// ❌ WRONG: Creates exponential listener growth
useEffect(() => {
  const handleHashChange = () => { /* ... */ };
  window.addEventListener('hashchange', handleHashChange);
  return () => window.removeEventListener('hashchange', handleHashChange);
}, [window.history]); // BAD - history object changes every render

// ✅ CORRECT: Stable listener with empty deps
useEffect(() => {
  const handleHashChange = () => { /* ... */ };
  window.addEventListener('hashchange', handleHashChange);
  return () => window.removeEventListener('hashchange', handleHashChange);
}, []); // GOOD - listener registered once
```

### 2.2 Initial Hash Load Pattern

**Pattern**: Parse hash on component mount (separate from hash change listener).

```typescript
/**
 * Load initial state from URL hash on mount.
 *
 * This runs BEFORE hashchange listener is registered.
 * Handles cases where user navigates directly to URL with hash.
 */
useEffect(() => {
  const hash = window.location.hash.slice(1);

  if (!hash) {
    // No hash - new game
    return;
  }

  // Decompress and validate
  const decoded = decompressPayload(hash);
  if (decoded) {
    setPayload(decoded);
    setError(null);
  } else {
    setError('Failed to load game from URL - the link may be corrupted');
  }
}, []); // Empty deps - run ONCE on mount
```

### 2.3 Multiple Component Synchronization

**Pattern**: Use hash as single source of truth, components listen to hash changes.

```typescript
/**
 * Multiple components can synchronize via shared hash state.
 *
 * Example: Game board + History viewer + Turn indicator
 * All listen to hashchange event and update from payload.
 */

// Component 1: Game Board
function GameBoard() {
  const { payload } = useUrlState();

  useEffect(() => {
    if (payload?.type === 'delta') {
      applyMove(payload.move);
    }
  }, [payload]);

  return <Board />;
}

// Component 2: History Viewer
function HistoryViewer() {
  const { payload } = useUrlState();

  useEffect(() => {
    if (payload?.type === 'delta') {
      addToHistory(payload.move);
    }
  }, [payload]);

  return <MoveList />;
}

// Both components stay synchronized via hash changes
```

---

## 3. Debouncing Pattern with useRef (CRITICAL)

### 3.1 The Frozen Closure Problem

**Problem**: Debounced functions capture stale state from initial render.

**Example of the Problem**:

```typescript
// ❌ WRONG: Debounced function has stale state
const [gameState, setGameState] = useState(initialState);

const debouncedUpdate = useMemo(
  () => debounce(() => {
    // This closure captures gameState from INITIAL render
    // Even if gameState updates, this function still sees initial value
    updateUrl(gameState); // Always uses stale state!
  }, 300),
  [] // Empty deps mean closure is never updated
);

// When gameState changes, debouncedUpdate still sees initial value
```

**Why This Happens**:

1. `useMemo` creates debounce function on initial render
2. Debounce function closes over `gameState` from initial render
3. `gameState` updates, but debounce function still has old closure
4. When debounce executes, it uses stale `gameState`

### 3.2 The useRef Solution

**Solution**: Use `useRef` to access latest state without recreating debounce function.

**Complete Pattern**:

```typescript
/**
 * Debouncing with useRef pattern (RECOMMENDED).
 *
 * This pattern solves the frozen closure problem by:
 * 1. Storing state in a ref (always up-to-date)
 * 2. Creating debounce function once (stable reference)
 * 3. Accessing latest state via ref.current (no stale closures)
 */
function useGameUrlState() {
  const [gameState, setGameState] = useState(initialState);

  // CRITICAL: Store latest state in ref
  const gameStateRef = useRef(gameState);
  const debounceTimerRef = useRef<number | null>(null);

  // CRITICAL: Keep ref in sync with state
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // Debounced update using ref for latest state
  const debouncedUpdate = useMemo(
    () => debounce(() => {
      // Access latest state via ref.current (NO stale closure)
      const currentState = gameStateRef.current;

      // Encode and update URL
      const payload = createPayload(currentState);
      const compressed = compressPayload(payload);

      const url = new URL(window.location.href);
      url.hash = compressed;
      window.history.replaceState(null, '', url);
    }, 300),
    [] // Empty deps - function created once, but uses ref for latest state
  );

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return { gameState, setGameState, debouncedUpdate };
}
```

### 3.3 Manual Debounce Implementation

**Pattern**: Manual debounce without external library (recommended for Phase 3).

```typescript
/**
 * Manual debounce implementation using useRef.
 *
 * Advantages over lodash debounce:
 * - No external dependency
 * - Full control over timer lifecycle
 * - Easier to understand and debug
 */
function useUrlState() {
  const [payload, setPayload] = useState<UrlPayload | null>(null);
  const payloadRef = useRef(payload);
  const debounceTimerRef = useRef<number | null>(null);

  // Keep ref in sync
  useEffect(() => {
    payloadRef.current = payload;
  }, [payload]);

  // Manual debounce
  const updateUrl = useCallback((newPayload: UrlPayload) => {
    // Clear existing timer
    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current);
    }

    // Set new timer
    debounceTimerRef.current = window.setTimeout(() => {
      // Use ref for latest payload
      const compressed = compressPayload(newPayload);
      const url = new URL(window.location.href);
      url.hash = compressed;
      window.history.replaceState(null, '', url);

      setPayload(newPayload);
      debounceTimerRef.current = null;
    }, 300);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return { payload, updateUrl };
}
```

### 3.4 When to Debounce vs Immediate Update

**Debounce (300ms)**:
- ✅ Normal gameplay moves (delta payloads)
- ✅ Frequent state updates (drag-and-drop)
- ✅ Intermediate states (animations)

**Immediate Update (no debounce)**:
- ✅ Initial game creation (full_state payload)
- ✅ Resync after divergence (full_state or resync_request)
- ✅ Manual "Share Link" button click
- ✅ Game completion

**Implementation**:

```typescript
// Provide both debounced and immediate update functions
const { updateUrl, updateUrlImmediate } = useUrlState();

// Normal move - use debounced
const handleMove = (move: Move) => {
  updateUrl(createDeltaPayload(move)); // Debounced
};

// Game creation - use immediate
const handleCreateGame = (gameState: GameState) => {
  updateUrlImmediate(createFullStatePayload(gameState)); // Immediate
};

// Share button - use immediate
const handleShareClick = () => {
  const url = getShareUrl();
  navigator.clipboard.writeText(url);
  toast.success('Link copied!');
};
```

---

## 4. URL Encoding on Move (Task 26)

### 4.1 Generate Delta URL After Move

**Pattern**: Create delta payload → compress → update URL → mark history as synced.

```typescript
/**
 * Complete flow for encoding move in URL.
 *
 * Steps:
 * 1. Make move in chess engine
 * 2. Generate delta payload with checksum
 * 3. Compress payload to URL-safe string
 * 4. Update hash with replaceState (NO history pollution)
 * 5. Mark history entry as synced
 */
function handleMove(from: Position, to: Position) {
  // Step 1: Make move in engine
  const result = engine.makeMove(from, to);

  if (!result.success) {
    showErrorToast(result.error);
    return;
  }

  // Step 2: Generate delta payload
  const deltaPayload: DeltaPayload = {
    type: 'delta',
    move: { from, to },
    turn: engine.getCurrentTurn(),
    checksum: engine.getChecksum(),
  };

  // Step 3 & 4: Compress and update URL (debounced)
  updateUrl(deltaPayload);

  // Step 5: Mark history entry as synced
  storage.appendToHistory({
    moveNumber: engine.getCurrentTurn() - 1,
    player: engine.getCurrentPlayer(),
    from,
    to,
    piece: engine.getPieceAt(to),
    captured: result.captured || null,
    checksum: engine.getChecksum(),
    timestamp: Date.now(),
    synced: true, // URL generated successfully
  });

  // Show share link notification
  showNotification({
    message: 'Move recorded! Copy link to share with opponent.',
    action: {
      label: 'Copy Link',
      onClick: () => {
        navigator.clipboard.writeText(getShareUrl());
        toast.success('Link copied!');
      },
    },
  });
}
```

### 4.2 Using replaceState vs pushState

**Critical Decision**: Use `replaceState()` for async games to prevent history pollution.

```typescript
/**
 * History API usage for URL updates.
 *
 * CRITICAL: Use replaceState for async games, NOT pushState.
 *
 * Why?
 * - Players share links, they don't navigate via back button
 * - Using pushState creates history entry for every move
 * - Clicking back 10 times to return to previous page = bad UX
 */

// ❌ WRONG: Creates new history entry for every move
window.history.pushState(null, '', url);
// Result: Back button becomes useless (100+ entries)

// ✅ CORRECT: Replaces current entry (no history pollution)
window.history.replaceState(null, '', url);
// Result: Back button works as expected (returns to previous page)
```

**Exception**: Use `pushState()` only for significant milestones (game creation, major events).

```typescript
// Example: Use pushState for game creation, replaceState for moves
function createGame(initialState: GameState) {
  const payload = createFullStatePayload(initialState);
  const compressed = compressPayload(payload);

  const url = new URL(window.location.href);
  url.hash = compressed;

  // Use pushState for game creation (new history entry)
  window.history.pushState(null, '', url);
}

function makeMove(move: Move) {
  const payload = createDeltaPayload(move);
  const compressed = compressPayload(payload);

  const url = new URL(window.location.href);
  url.hash = compressed;

  // Use replaceState for moves (no new history entry)
  window.history.replaceState(null, '', url);
}
```

### 4.3 Marking History Entry as Synced

**Pattern**: Update history entry synced flag after URL generation succeeds.

```typescript
/**
 * Mark history entry as synced after URL update.
 *
 * This indicates the move was successfully encoded and shared.
 * Used by History Viewer to show checkmark icons.
 */
function handleMove(move: Move) {
  const result = engine.makeMove(move.from, move.to);

  if (!result.success) return;

  // Attempt to generate URL
  try {
    const payload = createDeltaPayload(move);
    const compressed = compressPayload(payload);

    if (!compressed) {
      throw new Error('Compression failed');
    }

    // Update URL
    const url = new URL(window.location.href);
    url.hash = compressed;
    window.history.replaceState(null, '', url);

    // Mark as synced (URL generation succeeded)
    storage.appendToHistory({
      ...createHistoryEntry(move, result),
      synced: true, // ✅ Successfully encoded in URL
    });
  } catch (error) {
    console.error('Failed to encode move in URL:', error);

    // Mark as NOT synced (URL generation failed)
    storage.appendToHistory({
      ...createHistoryEntry(move, result),
      synced: false, // ❌ URL encoding failed
    });

    // Show error to user
    showErrorToast('Failed to generate share link. Move saved locally.');
  }
}
```

---

## 5. URL Decoding on Load (Task 27)

### 5.1 Parse Hash on Component Mount

**Pattern**: Load from URL on initial render, apply to game state.

```typescript
/**
 * Complete URL decoding flow on component mount.
 *
 * Steps:
 * 1. Extract hash from window.location
 * 2. Decompress and validate payload
 * 3. Apply payload to game state
 * 4. Handle errors gracefully
 */
function GamePage() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load from URL on mount
  useEffect(() => {
    const hash = window.location.hash.slice(1);

    if (!hash) {
      // No hash - new game
      setGameState(createNewGame());
      setIsLoading(false);
      return;
    }

    // Decompress payload
    const payload = decompressPayload(hash);

    if (!payload) {
      // Decompression failed
      setLoadError('Could not load game from URL. The link may be corrupted.');
      setIsLoading(false);
      return;
    }

    // Apply payload based on type
    try {
      if (payload.type === 'full_state') {
        // Load complete game state
        setGameState(payload.gameState);
      } else if (payload.type === 'delta') {
        // Load previous state from localStorage
        const previousState = storage.getGameState();

        if (!previousState) {
          throw new Error('Missing previous game state for delta');
        }

        // Apply move
        const engine = new KingsChessEngine(previousState);
        const result = engine.makeMove(payload.move.from, payload.move.to);

        if (!result.success) {
          throw new Error(`Invalid move: ${result.error}`);
        }

        // Verify checksum
        if (engine.getChecksum() !== payload.checksum) {
          throw new Error('Checksum mismatch - game states diverged');
        }

        setGameState(engine.getState());
      } else if (payload.type === 'resync_request') {
        // Show divergence modal
        setLoadError('Opponent detected state divergence and requested resync');
      }

      setIsLoading(false);
    } catch (error) {
      console.error('Failed to apply payload:', error);
      setLoadError(error instanceof Error ? error.message : 'Unknown error');
      setIsLoading(false);
    }
  }, []); // Empty deps - run once on mount

  // Render states
  if (isLoading) return <LoadingSpinner />;
  if (loadError) return <ErrorBanner message={loadError} />;
  if (!gameState) return <NewGameSetup />;

  return <Game state={gameState} />;
}
```

### 5.2 Validation Before Application

**Pattern**: Multi-layer validation pipeline before applying payload.

```typescript
/**
 * Multi-layer validation pipeline for URL payloads.
 *
 * Layers:
 * 1. Decompression (check for null)
 * 2. JSON parsing (catch exceptions)
 * 3. Schema validation (Zod)
 * 4. Business logic validation (turn numbers, checksums)
 */
function validateAndApplyPayload(
  hash: string,
  currentState: GameState | null
): { success: boolean; newState?: GameState; error?: string } {
  // Layer 1: Decompression
  const decompressed = decompressFromEncodedURIComponent(hash);
  if (decompressed === null) {
    return {
      success: false,
      error: 'The game link is corrupted. Please request a new link.',
    };
  }

  // Layer 2: JSON Parsing
  let parsed: unknown;
  try {
    parsed = JSON.parse(decompressed);
  } catch {
    return {
      success: false,
      error: 'The game link contains invalid data.',
    };
  }

  // Layer 3: Schema Validation
  const result = UrlPayloadSchema.safeParse(parsed);
  if (!result.success) {
    const error = fromError(result.error);
    return {
      success: false,
      error: `Invalid game data: ${error.message}`,
    };
  }

  const payload = result.data;

  // Layer 4: Business Logic Validation
  if (payload.type === 'delta') {
    if (!currentState) {
      return {
        success: false,
        error: 'Cannot apply delta without previous game state',
      };
    }

    // Validate turn number
    const expectedTurn = currentState.currentTurn + 1;
    if (payload.turn !== expectedTurn) {
      return {
        success: false,
        error: `Turn mismatch: Expected ${expectedTurn}, received ${payload.turn}`,
      };
    }

    // Apply move
    const engine = new KingsChessEngine(currentState);
    const moveResult = engine.makeMove(payload.move.from, payload.move.to);

    if (!moveResult.success) {
      return {
        success: false,
        error: `Invalid move: ${moveResult.error}`,
      };
    }

    // Verify checksum
    if (engine.getChecksum() !== payload.checksum) {
      return {
        success: false,
        error: 'Checksum mismatch - game states have diverged',
      };
    }

    return { success: true, newState: engine.getState() };
  }

  if (payload.type === 'full_state') {
    return { success: true, newState: payload.gameState };
  }

  return {
    success: false,
    error: 'Resync requested - please resolve divergence',
  };
}
```

### 5.3 Loading States During Parse

**Pattern**: Show loading indicator while parsing complex payloads.

```typescript
/**
 * Progressive loading for large game states.
 *
 * For games with 100+ moves, show loading states:
 * 1. Parsing URL
 * 2. Validating payload
 * 3. Applying moves
 * 4. Ready to play
 */
function GameLoader() {
  const [loadingStage, setLoadingStage] = useState<
    'parsing' | 'validating' | 'applying' | 'ready'
  >('parsing');
  const [gameState, setGameState] = useState<GameState | null>(null);

  useEffect(() => {
    async function loadGame() {
      // Stage 1: Parsing
      setLoadingStage('parsing');
      await new Promise(resolve => setTimeout(resolve, 0)); // Yield to browser

      const hash = window.location.hash.slice(1);
      const payload = decompressPayload(hash);

      if (!payload) {
        throw new Error('Failed to parse URL');
      }

      // Stage 2: Validating
      setLoadingStage('validating');
      await new Promise(resolve => setTimeout(resolve, 0));

      const result = UrlPayloadSchema.safeParse(payload);
      if (!result.success) {
        throw new Error('Invalid payload');
      }

      // Stage 3: Applying
      setLoadingStage('applying');
      await new Promise(resolve => setTimeout(resolve, 0));

      if (payload.type === 'full_state') {
        setGameState(payload.gameState);
      }

      // Stage 4: Ready
      setLoadingStage('ready');
    }

    loadGame().catch(console.error);
  }, []);

  // Show loading stage
  if (loadingStage !== 'ready') {
    return (
      <LoadingScreen>
        <Spinner />
        <p>
          {loadingStage === 'parsing' && 'Parsing game link...'}
          {loadingStage === 'validating' && 'Validating game data...'}
          {loadingStage === 'applying' && 'Loading game state...'}
        </p>
      </LoadingScreen>
    );
  }

  return <Game state={gameState} />;
}
```

---

## 6. Error Handling Patterns (Task 28)

### 6.1 Corrupted URL Detection

**Pattern**: Detect corruption at decompression layer, show user-friendly message.

```typescript
/**
 * User-friendly error messages for common failure modes.
 */
const ERROR_MESSAGES = {
  CORRUPTED_URL: 'The game link appears to be corrupted. Please request a new link from your opponent.',
  INVALID_JSON: 'The game link contains invalid data. Please start a new game.',
  INVALID_MOVE: 'The game link contains an illegal move. Please contact your opponent.',
  TURN_MISMATCH: 'The move order is incorrect. You may have missed a previous move.',
  CHECKSUM_MISMATCH: 'Game states have diverged. Use the History Comparison tool to resolve.',
  MISSING_STATE: 'Missing previous game state. Please request a full game state from your opponent.',
} as const;

/**
 * Error detection and user message mapping.
 */
function handleUrlError(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (message.includes('decompress') || message.includes('null')) {
      return ERROR_MESSAGES.CORRUPTED_URL;
    }

    if (message.includes('json')) {
      return ERROR_MESSAGES.INVALID_JSON;
    }

    if (message.includes('invalid move')) {
      return ERROR_MESSAGES.INVALID_MOVE;
    }

    if (message.includes('turn')) {
      return ERROR_MESSAGES.TURN_MISMATCH;
    }

    if (message.includes('checksum')) {
      return ERROR_MESSAGES.CHECKSUM_MISMATCH;
    }

    if (message.includes('missing')) {
      return ERROR_MESSAGES.MISSING_STATE;
    }
  }

  return 'Could not load the game. Please start a new game or request a new link.';
}
```

### 6.2 Fallback to New Game

**Pattern**: Offer "Start New Game" action for unrecoverable errors.

```typescript
/**
 * Error boundary with fallback to new game.
 */
function ErrorBanner({ error }: { error: string }) {
  const navigate = useNavigate();

  return (
    <div className="error-banner" role="alert">
      <div className="error-icon">⚠️</div>
      <div className="error-content">
        <h2>Could Not Load Game</h2>
        <p>{error}</p>
        <div className="error-actions">
          <button
            onClick={() => {
              window.location.hash = '';
              window.location.reload();
            }}
            className="btn-primary"
          >
            Start New Game
          </button>
          <button
            onClick={() => {
              const email = 'mailto:opponent@example.com?subject=New Game Link Request';
              window.location.href = email;
            }}
            className="btn-secondary"
          >
            Request New Link
          </button>
          <button
            onClick={() => navigate('/')}
            className="btn-secondary"
          >
            Return Home
          </button>
        </div>
      </div>
    </div>
  );
}
```

### 6.3 Toast Notifications for Non-Critical Errors

**Pattern**: Use toast for transient errors that don't block gameplay.

```typescript
/**
 * Toast notification patterns for URL errors.
 */
function useUrlErrorToasts() {
  const { payload, error } = useUrlState({
    onError: (error) => {
      // Non-blocking error - show toast
      if (error.includes('failed to encode')) {
        toast.warning('Could not generate share link. Move saved locally.', {
          duration: 5000,
          action: {
            label: 'Retry',
            onClick: () => retryUrlGeneration(),
          },
        });
      } else if (error.includes('corrupted')) {
        toast.error('The game link is corrupted. Please request a new link.', {
          duration: 10000,
        });
      } else {
        toast.error(error);
      }
    },
  });

  return { payload, error };
}
```

### 6.4 Error Boundary Integration

**Pattern**: Wrap game components in error boundary to catch unexpected errors.

```typescript
/**
 * Error boundary for game components.
 */
class GameErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Game error:', error, errorInfo);

    // Log to error tracking service
    logErrorToService(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorBanner
          error={handleUrlError(this.state.error)}
          onRetry={() => {
            this.setState({ hasError: false, error: null });
            window.location.reload();
          }}
        />
      );
    }

    return this.props.children;
  }
}

// Usage
function App() {
  return (
    <GameErrorBoundary>
      <GamePage />
    </GameErrorBoundary>
  );
}
```

---

## 7. Integration Patterns (Tasks 29-30)

### 7.1 Integration with KingsChessEngine

**Pattern**: Use engine as source of truth, sync to URL after moves.

```typescript
/**
 * Complete integration between chess engine and URL state.
 */
function useGameWithUrlSync() {
  const [engine] = useState(() => new KingsChessEngine());
  const { payload, updateUrl } = useUrlState();

  // Apply payload to engine
  useEffect(() => {
    if (!payload) return;

    if (payload.type === 'full_state') {
      engine.loadState(payload.gameState);
    } else if (payload.type === 'delta') {
      const result = engine.makeMove(payload.move.from, payload.move.to);

      if (!result.success) {
        console.error('Move failed:', result.error);
        return;
      }

      // Verify checksum
      if (engine.getChecksum() !== payload.checksum) {
        console.error('Checksum mismatch');
        // Trigger divergence modal
        showDivergenceModal();
      }
    }
  }, [payload, engine]);

  // Handle user move
  const makeMove = useCallback((from: Position, to: Position) => {
    const result = engine.makeMove(from, to);

    if (!result.success) {
      showErrorToast(result.error);
      return;
    }

    // Generate delta payload
    const deltaPayload: DeltaPayload = {
      type: 'delta',
      move: { from, to },
      turn: engine.getCurrentTurn(),
      checksum: engine.getChecksum(),
    };

    // Update URL
    updateUrl(deltaPayload);

    // Save to history
    storage.appendToHistory({
      moveNumber: engine.getCurrentTurn() - 1,
      player: engine.getCurrentPlayer(),
      from,
      to,
      piece: engine.getPieceAt(to),
      captured: result.captured || null,
      checksum: engine.getChecksum(),
      timestamp: Date.now(),
      synced: true,
    });
  }, [engine, updateUrl]);

  return {
    gameState: engine.getState(),
    makeMove,
    getShareUrl: () => window.location.href,
  };
}
```

### 7.2 Integration with localStorage

**Pattern**: Use localStorage for persistence, URL for sharing.

```typescript
/**
 * Dual-storage strategy: localStorage + URL.
 *
 * - localStorage: Persistent game state (survives refresh)
 * - URL: Shareable state (send to opponent)
 */
function useDualStorageGame() {
  const { payload, updateUrl } = useUrlState();
  const [gameState, setGameState] = useState<GameState | null>(null);

  // Load from localStorage or URL on mount
  useEffect(() => {
    // Priority 1: URL payload (shared by opponent)
    if (payload?.type === 'full_state') {
      setGameState(payload.gameState);
      storage.setGameState(payload.gameState);
      return;
    }

    // Priority 2: localStorage (persistent state)
    const storedState = storage.getGameState();
    if (storedState) {
      setGameState(storedState);
      return;
    }

    // Priority 3: New game
    const newGame = createNewGame();
    setGameState(newGame);
    storage.setGameState(newGame);
  }, [payload]);

  // Save to both on move
  const makeMove = useCallback((move: Move) => {
    if (!gameState) return;

    const engine = new KingsChessEngine(gameState);
    const result = engine.makeMove(move.from, move.to);

    if (!result.success) return;

    const newState = engine.getState();

    // Save to localStorage
    storage.setGameState(newState);

    // Save to URL
    const deltaPayload = createDeltaPayload(move, newState);
    updateUrl(deltaPayload);

    setGameState(newState);
  }, [gameState, updateUrl]);

  return { gameState, makeMove };
}
```

### 7.3 Integration with History Viewer

**Pattern**: History viewer listens to storage changes, shows sync status.

```typescript
/**
 * History viewer integrated with URL state sync.
 */
function HistoryViewer() {
  const [history, setHistory] = useState<GameHistory>([]);
  const { payload } = useUrlState();

  // Load history from localStorage
  useEffect(() => {
    const stored = storage.getGameHistory();
    if (stored) {
      setHistory(stored);
    }
  }, []);

  // Update history when new move synced via URL
  useEffect(() => {
    if (payload?.type === 'delta') {
      const updated = storage.getGameHistory() || [];
      setHistory(updated);
    }
  }, [payload]);

  return (
    <div className="history-viewer">
      <h2>Move History</h2>
      <div className="move-list">
        {history.map((entry, index) => (
          <div key={index} className="move-entry">
            <span className="move-number">{entry.moveNumber}.</span>
            <span className="move-notation">
              {entry.piece.type} {formatPosition(entry.from)} → {formatPosition(entry.to)}
            </span>
            {entry.synced ? (
              <span className="sync-indicator" title="Synced via URL">
                ✓
              </span>
            ) : (
              <span className="sync-indicator" title="Not synced">
                ⏳
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 8. E2E Testing with Playwright (Task 30)

### 8.1 Testing URL Generation

**Pattern**: Verify URL encoding after move.

```typescript
/**
 * E2E test for URL generation.
 */
test('should generate URL after move', async ({ page }) => {
  await page.goto('/');

  // Create new game
  await page.click('[data-testid="new-game"]');

  // Make first move
  await page.click('[data-testid="square-2-0"]'); // Select piece
  await page.click('[data-testid="square-1-0"]'); // Move piece

  // Verify URL hash updated
  const url = page.url();
  expect(url).toContain('#');

  // Verify hash is compressed (short)
  const hash = url.split('#')[1];
  expect(hash.length).toBeLessThan(200); // Delta should be < 200 chars

  // Verify hash decompresses to valid payload
  const payload = await page.evaluate((hashValue) => {
    const { decompressPayload } = require('@/lib/urlEncoding/compression');
    return decompressPayload(hashValue);
  }, hash);

  expect(payload).toBeTruthy();
  expect(payload.type).toBe('delta');
});
```

### 8.2 Testing URL Parsing

**Pattern**: Load game from URL in new tab.

```typescript
/**
 * E2E test for URL parsing (two-player flow).
 */
test('should load game from URL', async ({ page, context }) => {
  // Player 1: Create game and make move
  await page.goto('/');
  await page.click('[data-testid="new-game"]');
  await page.click('[data-testid="square-2-0"]');
  await page.click('[data-testid="square-1-0"]');

  // Get share URL
  const shareUrl = page.url();

  // Player 2: Open URL in new tab
  const page2 = await context.newPage();
  await page2.goto(shareUrl);

  // Verify game state loaded
  await expect(page2.locator('[data-testid="board"]')).toBeVisible();

  // Verify move is shown
  const boardState = await page2.evaluate(() => {
    const engine = (window as any).gameEngine;
    return engine.getState();
  });

  expect(boardState.currentTurn).toBe(1);
});
```

### 8.3 Testing Browser Back/Forward

**Pattern**: Verify hash change handling on navigation.

```typescript
/**
 * E2E test for browser back/forward navigation.
 */
test('should handle back/forward navigation', async ({ page }) => {
  await page.goto('/');
  await page.click('[data-testid="new-game"]');

  // Make 3 moves
  for (let i = 0; i < 3; i++) {
    await page.click(`[data-testid="move-${i}"]`);
    await page.waitForTimeout(500); // Wait for debounce
  }

  // Go back in history
  await page.goBack();
  await page.waitForTimeout(100);

  // Verify game state reverted
  let turn = await page.evaluate(() => {
    const engine = (window as any).gameEngine;
    return engine.getCurrentTurn();
  });
  expect(turn).toBe(2);

  // Go forward in history
  await page.goForward();
  await page.waitForTimeout(100);

  turn = await page.evaluate(() => {
    const engine = (window as any).gameEngine;
    return engine.getCurrentTurn();
  });
  expect(turn).toBe(3);
});
```

### 8.4 Testing Corrupted URLs

**Pattern**: Verify error handling for malformed hash.

```typescript
/**
 * E2E test for corrupted URL handling.
 */
test('should handle corrupted URL gracefully', async ({ page }) => {
  // Navigate to URL with corrupted hash
  await page.goto('/#CORRUPTED_BASE64_DATA');

  // Verify error message shown
  await expect(page.locator('[data-testid="error-banner"]')).toBeVisible();
  await expect(page.locator('[data-testid="error-message"]')).toContainText(
    'corrupted'
  );

  // Verify "Start New Game" button works
  await page.click('[data-testid="start-new-game"]');
  await expect(page.locator('[data-testid="new-game-form"]')).toBeVisible();
});
```

### 8.5 Testing Cross-Tab Synchronization

**Pattern**: Verify multiple tabs stay synchronized.

```typescript
/**
 * E2E test for cross-tab synchronization.
 */
test('should synchronize across tabs', async ({ page, context }) => {
  // Tab 1: Create game
  await page.goto('/');
  await page.click('[data-testid="new-game"]');
  const url = page.url();

  // Tab 2: Open same URL
  const page2 = await context.newPage();
  await page2.goto(url);

  // Tab 1: Make move
  await page.click('[data-testid="square-2-0"]');
  await page.click('[data-testid="square-1-0"]');
  await page.waitForTimeout(500);

  const updatedUrl = page.url();

  // Tab 2: Navigate to updated URL
  await page2.goto(updatedUrl);

  // Verify Tab 2 shows updated state
  const turn = await page2.evaluate(() => {
    const engine = (window as any).gameEngine;
    return engine.getCurrentTurn();
  });

  expect(turn).toBe(1);
});
```

---

## 9. Code Templates

### 9.1 Complete useGameUrlState Hook

**Full implementation with all features**:

```typescript
/**
 * @fileoverview Complete URL state hook for King's Cooking
 * @module hooks/useGameUrlState
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { decompressPayload, compressPayload } from '@/lib/urlEncoding/compression';
import type { UrlPayload, DeltaPayload, FullStatePayload } from '@/lib/urlEncoding/types';
import { storage } from '@/lib/storage/localStorage';

/**
 * Hook options
 */
export interface UseGameUrlStateOptions {
  /** Debounce delay (default: 300ms) */
  debounceMs?: number;

  /** Error handler */
  onError?: (error: string) => void;

  /** URL updated handler */
  onUrlUpdated?: (url: string) => void;

  /** Payload received handler */
  onPayloadReceived?: (payload: UrlPayload) => void;
}

/**
 * Custom hook for game URL state synchronization.
 *
 * Combines:
 * - Hash change monitoring
 * - Debounced URL updates
 * - Error state management
 * - localStorage integration
 *
 * @param options - Hook configuration
 * @returns URL state object
 */
export function useGameUrlState(options: UseGameUrlStateOptions = {}) {
  const {
    debounceMs = 300,
    onError,
    onUrlUpdated,
    onPayloadReceived,
  } = options;

  const [payload, setPayload] = useState<UrlPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const payloadRef = useRef(payload);
  const debounceTimerRef = useRef<number | null>(null);

  // Keep ref in sync
  useEffect(() => {
    payloadRef.current = payload;
  }, [payload]);

  // Load from URL on mount
  useEffect(() => {
    const hash = window.location.hash.slice(1);

    if (!hash) {
      setIsLoading(false);
      return;
    }

    const decoded = decompressPayload(hash);

    if (decoded) {
      setPayload(decoded);
      setError(null);
      onPayloadReceived?.(decoded);
    } else {
      const errorMsg = 'Failed to load game from URL - the link may be corrupted';
      setError(errorMsg);
      onError?.(errorMsg);
    }

    setIsLoading(false);
  }, [onError, onPayloadReceived]);

  // Listen for hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);

      if (!hash) {
        setPayload(null);
        setError(null);
        return;
      }

      const decoded = decompressPayload(hash);

      if (decoded) {
        setPayload(decoded);
        setError(null);
        onPayloadReceived?.(decoded);
      } else {
        const errorMsg = 'Invalid URL format';
        setError(errorMsg);
        onError?.(errorMsg);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [onError, onPayloadReceived]);

  // Debounced URL update
  const updateUrl = useMemo(() => {
    return (newPayload: UrlPayload) => {
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = window.setTimeout(() => {
        const compressed = compressPayload(newPayload);

        if (!compressed) {
          const errorMsg = 'Failed to encode game state to URL';
          setError(errorMsg);
          onError?.(errorMsg);
          return;
        }

        const url = new URL(window.location.href);
        url.hash = compressed;
        window.history.replaceState(null, '', url);

        setPayload(newPayload);
        setError(null);
        onUrlUpdated?.(url.href);

        debounceTimerRef.current = null;
      }, debounceMs);
    };
  }, [debounceMs, onError, onUrlUpdated]);

  // Immediate URL update
  const updateUrlImmediate = useCallback((newPayload: UrlPayload) => {
    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    const compressed = compressPayload(newPayload);

    if (!compressed) {
      const errorMsg = 'Failed to encode game state to URL';
      setError(errorMsg);
      onError?.(errorMsg);
      return;
    }

    const url = new URL(window.location.href);
    url.hash = compressed;
    window.history.replaceState(null, '', url);

    setPayload(newPayload);
    setError(null);
    onUrlUpdated?.(url.href);
  }, [onError, onUrlUpdated]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Get shareable URL
  const getShareUrl = useCallback((): string => {
    return window.location.href;
  }, []);

  // Copy share URL
  const copyShareUrl = useCallback(async (): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      return true;
    } catch {
      return false;
    }
  }, []);

  return {
    payload,
    error,
    isLoading,
    updateUrl,
    updateUrlImmediate,
    getShareUrl,
    copyShareUrl,
  };
}
```

### 9.2 Usage Example with KingsChessEngine

```typescript
/**
 * Complete game page with URL state integration.
 */
function GamePage(): ReactElement {
  const {
    payload,
    error,
    isLoading,
    updateUrl,
    copyShareUrl,
  } = useGameUrlState({
    onError: (error) => toast.error(error),
    onUrlUpdated: () => toast.success('Link updated!'),
  });

  const [engine] = useState(() => new KingsChessEngine());
  const [gameState, setGameState] = useState<GameState | null>(null);

  // Apply payload to engine
  useEffect(() => {
    if (!payload) return;

    if (payload.type === 'full_state') {
      engine.loadState(payload.gameState);
      setGameState(payload.gameState);
      storage.setGameState(payload.gameState);
    } else if (payload.type === 'delta') {
      const result = engine.makeMove(payload.move.from, payload.move.to);

      if (!result.success) {
        toast.error(`Invalid move: ${result.error}`);
        return;
      }

      if (engine.getChecksum() !== payload.checksum) {
        toast.error('Checksum mismatch - game states diverged');
        return;
      }

      const newState = engine.getState();
      setGameState(newState);
      storage.setGameState(newState);
    }
  }, [payload, engine]);

  // Handle user move
  const handleMove = useCallback((from: Position, to: Position) => {
    const result = engine.makeMove(from, to);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    const deltaPayload: DeltaPayload = {
      type: 'delta',
      move: { from, to },
      turn: engine.getCurrentTurn(),
      checksum: engine.getChecksum(),
    };

    updateUrl(deltaPayload);

    storage.appendToHistory({
      moveNumber: engine.getCurrentTurn() - 1,
      player: engine.getCurrentPlayer(),
      from,
      to,
      piece: engine.getPieceAt(to)!,
      captured: result.captured || null,
      checksum: engine.getChecksum(),
      timestamp: Date.now(),
      synced: true,
    });

    const newState = engine.getState();
    setGameState(newState);
    storage.setGameState(newState);
  }, [engine, updateUrl]);

  // Render states
  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorBanner error={error} />;
  if (!gameState) return <NewGameSetup />;

  return (
    <div className="game-container">
      <Board state={gameState} onMove={handleMove} />
      <HistoryViewer history={storage.getGameHistory() || []} />
      <button onClick={async () => {
        const success = await copyShareUrl();
        if (success) {
          toast.success('Link copied!');
        } else {
          toast.error('Failed to copy link');
        }
      }}>
        Copy Share Link
      </button>
    </div>
  );
}
```

---

## 10. Critical Gotchas Reference

### Gotcha #1: Frozen Closure in Debounced Callbacks

**Problem**: Debounced functions capture stale state.

**Solution**: Use `useRef` for latest state access.

```typescript
// ❌ WRONG: Stale closure
const debouncedUpdate = useMemo(
  () => debounce(() => updateUrl(gameState), 300),
  []
);

// ✅ CORRECT: useRef for latest state
const gameStateRef = useRef(gameState);
useEffect(() => { gameStateRef.current = gameState; }, [gameState]);
const debouncedUpdate = useMemo(
  () => debounce(() => updateUrl(gameStateRef.current), 300),
  []
);
```

### Gotcha #2: Empty Dependency Array for hashchange

**Problem**: Including history object causes exponential listener growth.

**Solution**: Use empty dependency array.

```typescript
// ❌ WRONG: Recreates listener every render
useEffect(() => {
  window.addEventListener('hashchange', handler);
  return () => window.removeEventListener('hashchange', handler);
}, [window.history]);

// ✅ CORRECT: Stable listener
useEffect(() => {
  window.addEventListener('hashchange', handler);
  return () => window.removeEventListener('hashchange', handler);
}, []);
```

### Gotcha #3: replaceState vs pushState

**Problem**: Using pushState pollutes history.

**Solution**: Use replaceState for async games.

```typescript
// ❌ WRONG: Creates history entry
window.history.pushState(null, '', url);

// ✅ CORRECT: Replaces current entry
window.history.replaceState(null, '', url);
```

### Gotcha #4: Null Check for Decompression

**Problem**: Assuming decompression always returns string.

**Solution**: Check for null before parsing.

```typescript
// ❌ WRONG: Crashes on null
const data = JSON.parse(decompressFromEncodedURIComponent(hash));

// ✅ CORRECT: Check for null
const decompressed = decompressFromEncodedURIComponent(hash);
if (decompressed === null) return null;
const data = JSON.parse(decompressed);
```

### Gotcha #5: Cleanup Debounce Timers

**Problem**: Timers persist after unmount.

**Solution**: Clean up in useEffect return.

```typescript
// ❌ WRONG: No cleanup
setTimeout(() => updateUrl(), 300);

// ✅ CORRECT: Cleanup on unmount
useEffect(() => {
  return () => {
    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current);
    }
  };
}, []);
```

---

## 11. Performance Considerations

### 11.1 Debounce Timing

**Recommended**: 300ms for URL updates.

- Too short (< 100ms): Excessive history updates
- Too long (> 500ms): Delayed feedback
- Sweet spot: 300ms balances responsiveness and efficiency

### 11.2 Compression Performance

**Benchmarks** (100-move game):
- JSON: ~4000 chars, 2ms
- lz-string: ~250 chars, 1ms

**Recommendation**: Always use lz-string compression.

### 11.3 Lazy Parsing for Long Games

For games with 100+ moves, parse incrementally:

```typescript
// Load moves in chunks to avoid blocking UI
const loadGameIncrementally = async (moves: Move[]) => {
  const chunkSize = 10;

  for (let i = 0; i < moves.length; i += chunkSize) {
    const chunk = moves.slice(i, i + chunkSize);
    await new Promise(resolve => setTimeout(resolve, 0)); // Yield
    applyMoveChunk(chunk);
  }
};
```

---

## 12. Testing Strategy

### 12.1 Unit Tests for useUrlState Hook

```typescript
describe('useUrlState', () => {
  it('should parse URL on mount', () => {
    window.location.hash = '#' + compressPayload(mockPayload);

    const { result } = renderHook(() => useUrlState());

    expect(result.current.payload).toEqual(mockPayload);
    expect(result.current.error).toBeNull();
  });

  it('should debounce URL updates', async () => {
    const { result } = renderHook(() => useUrlState({ debounceMs: 100 }));

    act(() => {
      result.current.updateUrl(mockPayload1);
      result.current.updateUrl(mockPayload2);
      result.current.updateUrl(mockPayload3);
    });

    // Only last update should apply
    await waitFor(() => {
      expect(window.location.hash).toContain(compressPayload(mockPayload3));
    }, { timeout: 200 });
  });

  it('should handle corrupted URL', () => {
    window.location.hash = '#CORRUPTED_DATA';

    const onError = vi.fn();
    renderHook(() => useUrlState({ onError }));

    expect(onError).toHaveBeenCalledWith(
      expect.stringContaining('corrupted')
    );
  });
});
```

### 12.2 Integration Tests

```typescript
describe('URL State Integration', () => {
  it('should round-trip delta payload', () => {
    const payload: DeltaPayload = {
      type: 'delta',
      move: { from: [2, 0], to: [1, 0] },
      turn: 1,
      checksum: 'abc123',
    };

    const compressed = compressPayload(payload);
    const decompressed = decompressPayload(compressed);

    expect(decompressed).toEqual(payload);
  });

  it('should sync across components', async () => {
    const { rerender } = render(<GameWithUrlState />);

    // Make move
    await userEvent.click(screen.getByTestId('square-2-0'));
    await userEvent.click(screen.getByTestId('square-1-0'));

    // Rerender to simulate new component mount
    rerender(<HistoryViewer />);

    // Verify history updated
    expect(screen.getByText('Move 1')).toBeInTheDocument();
  });
});
```

---

## 13. Summary

### Key Takeaways

1. **useUrlState Hook**: Central integration point combining hash monitoring, debouncing, and error handling
2. **useRef Pattern**: Critical for preventing frozen closures in debounced callbacks
3. **Debouncing**: 300ms for URL updates, use `useRef` for latest state access
4. **Hash Monitoring**: `hashchange` event with empty dependency array
5. **URL Encoding**: replaceState (not pushState) to prevent history pollution
6. **Error Handling**: Multi-layer validation with user-friendly messages
7. **Integration**: KingsChessEngine as source of truth, URL for sharing

### Success Metrics

- ✅ Delta URLs < 200 characters
- ✅ Full state URLs < 2000 characters
- ✅ 80%+ test coverage
- ✅ Zero TypeScript errors
- ✅ User-friendly error messages
- ✅ Smooth two-player URL sharing

### Next Steps

1. Implement `useGameUrlState` hook (Task 25)
2. Integrate URL encoding on move (Task 26)
3. Integrate URL decoding on load (Task 27)
4. Add error handling for corrupted URLs (Task 28)
5. Write integration tests (Task 29)
6. Write E2E tests with Playwright (Task 30)

---

**END OF RESEARCH DOCUMENT**
