# URL Payload Requirements Analysis

## Purpose

This document analyzes what data must be included in URL payloads to eliminate localStorage dependencies that cause state sync failures between players.

## Current Implementation (Working)

### Random/Mirrored Modes

**What Works:**
- Both modes always have complete boards before URL generation
- All necessary state is in the URL payload
- No localStorage sync issues

**URL Payload Structure (Full State):**
```typescript
{
  type: 'full_state',
  gameState: {
    board: [[piece, piece, piece], [null, null, null], [piece, piece, piece]], // Complete
    currentTurn: number,
    currentPlayer: 'light' | 'dark',
    lightPlayer: { id, name },
    darkPlayer: { id, name },
    moveHistory: Move[],
    checksum: string,
    // ... other gameState fields
  },
  playerName: string // Who sent this URL
}
```

**URL Payload Structure (Delta):**
```typescript
{
  type: 'delta',
  move: { from: Position, to: Position },
  turn: number,
  checksum: string, // Checksum BEFORE move for verification
  playerName: string // Who sent this URL
}
```

### Key Insight: localStorage Only Used For:

1. **My Name** (`localStorage.getItem('my-name')`)
   - Determines if this is P1 or P2's browser
   - Used in `handleUrlLoad` to decide playing vs handoff phase
   - **NOT in URL** - determined locally

2. **Seen Story Flags** (`localStorage`)
   - UI preference only
   - Not critical to game state

3. **Game State** (`localStorage.setGameState()`)
   - Used for delta verification
   - Used for returning players
   - **Problem**: If localStorage is out of sync, delta fails

## Problem: Delta Verification Dependency

### Current Delta Flow:

```
P1 makes move → generates delta URL with checksum BEFORE move
P2 opens delta URL
P2 reducer:
  1. Gets currentState from localStorage
  2. Verifies checksumInURL === currentState.checksum
  3. If match: applies delta
  4. If mismatch: ERROR - state diverged
```

### Failure Scenario:

```
P1: Move 1 → Delta URL (checksum: A)
P2: Applies delta → localStorage has checksum B (after move 1)
P1: Move 2 → Delta URL (checksum: B)
P2: Clears localStorage or opens in new browser
P2: localStorage is empty → Cannot verify checksum
P2: Game broken ❌
```

## Solution Options

### Option 1: Full State Only (Recommended)

**Change:** Always send full gameState in URL, never use deltas

**Pros:**
- No localStorage dependency for game state
- Works across browsers/devices
- Simple implementation
- Always recoverable

**Cons:**
- Longer URLs
- More data in hash

**Implementation:**
- Remove delta payload type
- Always use `full_state` in URL generation
- Remove localStorage.setGameState() calls
- Keep localStorage only for 'my-name'

**URL Size Estimate:**
- Current full state: ~2-3KB base64 encoded
- Still within URL limits (browsers support 2MB+)

### Option 2: Hybrid (Full State Periodically)

**Change:** Send full state every N moves, deltas in between

**Pros:**
- Shorter URLs most of the time
- Recovery points every N moves

**Cons:**
- More complex logic
- Still has localStorage dependency between full states
- Can fail if player skips recovery point

### Option 3: Add Full State Fallback to Deltas

**Change:** Include minimal full state snapshot in delta payloads

**Pros:**
- Delta efficiency maintained
- Fallback if localStorage missing

**Cons:**
- Still large URLs
- Added complexity
- Doesn't fully solve problem

## Recommended Implementation: Full State Only

### Changes Required:

**1. Remove Delta Support**

`src/App.tsx` - URL generation (lines 604-673):
```typescript
// BEFORE: Conditional delta vs full state
if (isFirstMove) {
  // Full state
} else {
  // Delta
}

// AFTER: Always full state
const fullStatePayload = {
  type: 'full_state' as const,
  gameState: newState,
  playerName: currentPlayerName,
};
updateUrlImmediate(fullStatePayload);
```

**2. Remove Delta Handling**

`src/lib/gameFlow/reducer.ts` - handleUrlLoad (lines 163-285):
```typescript
// BEFORE: if/else for full_state vs delta
if (payload.type === 'full_state') {
  // ...
} else {
  // Delta handling with localStorage dependency
}

// AFTER: Only handle full_state
if (payload.type !== 'full_state') {
  console.error('Only full_state payloads supported');
  return state;
}
// ... full state handling only
```

**3. Update Type Definitions**

`src/lib/urlEncoding/types.ts`:
```typescript
// BEFORE: Union type
export type UrlPayload = FullStatePayload | DeltaPayload;

// AFTER: Only full state
export type UrlPayload = FullStatePayload;
```

**4. Remove localStorage Game State**

`src/lib/storage/localStorage.ts`:
```typescript
// Remove:
export function setGameState(state: GameState): void
export function getGameState(): GameState | null
export function clearGameState(): void

// Keep:
export function getMyName(): string | null
export function setMyName(name: string): void
// ... other non-game-state functions
```

**5. Remove from App.tsx**

Remove all `storage.setGameState(newState)` calls:
- Line 592: After move confirmation
- Line 668: After promotion

## URL Payload Requirements by Mode

### Random + Light

| Transition | URL Payload Required |
|------------|---------------------|
| P1 → P2 (first URL) | full_state: complete board, turn 1, playerName: P1 |
| P2 → P1 (after move) | full_state: complete board, turn 2, playerName: P2 |
| P1 → P2 (after move) | full_state: complete board, turn 3, playerName: P1 |

### Random + Dark

| Transition | URL Payload Required |
|------------|---------------------|
| P1 → P2 (first URL) | full_state: complete board, turn 0, playerName: P1 |
| P2 → P1 (after move) | full_state: complete board, turn 1, playerName: P2 |
| P1 → P2 (after move) | full_state: complete board, turn 2, playerName: P1 |

### Mirrored (same as Random)

### Independent (NOT SUPPORTED)

Would require:
- Incomplete board support in URL
- P1 → P2: full_state with incomplete board
- P2 → P1: full_state with complete board
- Then normal flow

## Data That Must Be in URL

### Required in Every URL:
```typescript
{
  type: 'full_state',
  gameState: {
    board: Piece[][], // MUST be complete for random/mirrored
    currentTurn: number,
    currentPlayer: 'light' | 'dark',
    lightPlayer: { id: UUID, name: string },
    darkPlayer: { id: UUID, name: string },
    moveHistory: Move[],
    checksum: string,
    lightCourt: Piece[],
    darkCourt: Piece[],
    capturedLight: Piece[],
    capturedDark: Piece[],
    status: GameStatus,
    winner: PlayerColor | null,
  },
  playerName: string // CRITICAL: Who sent this URL
}
```

### NOT in URL (Determined Locally):
- `localStorage.getItem('my-name')` - Used to identify if browser is P1 or P2
- Game mode preferences
- Story panel seen flags
- UI preferences

## Critical: playerName Field

The `playerName` field in the URL payload is CRITICAL for correct routing:

```typescript
// In handleUrlLoad (reducer.ts:77-97)
if (payload.playerName && payload.playerName !== myName) {
  // URL is from the OTHER player
  if (myName === player1Name) {
    // We are P1, payload is from P2
    player2Name = payload.playerName;
  } else {
    // We are P2, payload is from P1
    player1Name = payload.playerName;
  }
}
```

**Why This Matters:**
- Distinguishes P1 sending URL to P2 (first time) vs P2 sending back to P1
- Updates player names correctly in gameState
- Prevents name sync issues

## Migration Path

### Phase 1: Remove Delta Support ✅ Priority
1. Change URL generation to always use full_state
2. Remove delta handling from handleUrlLoad
3. Update type definitions
4. Test random/mirrored modes

### Phase 2: Remove localStorage Game State
1. Remove setGameState/getGameState functions
2. Remove all calls to storage.setGameState()
3. Keep only 'my-name' in localStorage
4. Test recovery scenarios

### Phase 3: Add Independent Mode (Optional)
1. Add incomplete board support to full_state payload
2. Update COMPLETE_HANDOFF to detect incomplete boards
3. Route P2 to piece-selection when needed
4. Generate URL after P2 completes pieces

## Testing Checklist

### After Full State Migration:

- [ ] Random + Light: P1 moves first, shares URL, P2 enters name and plays
- [ ] Random + Dark: P1 shares URL immediately, P2 enters name and moves first
- [ ] Mirrored + Light: Same as Random + Light
- [ ] Mirrored + Dark: Same as Random + Dark
- [ ] Clear localStorage between turns - game should still work
- [ ] Open URL in incognito/different browser - game should still work
- [ ] Long game (20+ moves) - URLs should still work
- [ ] P1 returns to old URL - should see game at that state
- [ ] P2 returns to old URL - should see game at that state

### Critical Scenarios:

1. **P2 opens URL in fresh browser (no localStorage)**
   - Should work: All state is in URL

2. **P1 clears localStorage mid-game**
   - Should work: Next URL from P2 contains full state

3. **Players open URLs out of order**
   - Should work: Each URL contains complete game state for that point in time

4. **Player refreshes page**
   - Current: Breaks (localStorage might be stale)
   - After: Works (state preserved in URL hash)

## Conclusion

**Recommendation: Implement Option 1 (Full State Only)**

This eliminates localStorage game state dependencies entirely, making the game:
- Resilient to localStorage issues
- Playable across devices/browsers
- Recoverable from any URL
- Simpler to maintain

The slight increase in URL size is negligible compared to the reliability gains.
