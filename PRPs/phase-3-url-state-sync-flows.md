# Phase 3: URL State Synchronization Flows

**Document Type:** Technical Specification
**Phase:** 3 - URL Encoding & Security
**Status:** Design Document
**Date:** 2025-10-15

---

## Overview

This document maps out all URL-based state synchronization flows for King's Cooking, focusing on checksum verification, automatic resync, and edge case handling.

---

## Core Principles

1. **URLs contain only deltas** (one move + metadata), not full state
2. **Full state lives in localStorage** on each player's device
3. **Checksums verify state synchronization** between players
4. **Automatic resync** when states diverge
5. **Human-unreadable URLs** - everything compressed in `#d=[data]`

---

## URL Structure

### Standard URL Format
```
https://kings-cooking.pages.dev/#d=[compressed_payload]
```

All payloads are compressed with LZ-String and encoded as URI component.

### Payload Types

```typescript
// Delta Move (normal gameplay)
interface DeltaPayload {
  type: 'delta';
  move: {
    from: Position;
    to: Position | 'off_board';
  };
  turn: number;
  checksum: string;
  playerName?: string; // Only included on first move
}

// Full State (initial game or resync response)
interface FullStatePayload {
  type: 'full_state';
  gameState: GameState; // Complete game state
  notification?: string; // Optional message for recipient
}

// Resync Request with Attempted Move
interface ResyncRequestPayload {
  type: 'resync_request';
  reason: 'checksum_mismatch' | 'localStorage_lost' | 'illegal_move_detected';
  attemptedMove: {
    from: Position;
    to: Position | 'off_board';
  };
  turn: number;
  lastKnownChecksum?: string;
}
```

---

## Flow 1: Normal Gameplay (Happy Path)

### Initial Game Setup

```
┌─────────────┐                                    ┌─────────────┐
│  Player 1   │                                    │  Player 2   │
│  (Alice)    │                                    │   (Bob)     │
└─────────────┘                                    └─────────────┘
       │                                                   │
       │ 1. Creates game                                  │
       │    - enters name "Alice"                         │
       │    - makes first move                            │
       │    - saves to localStorage                       │
       │                                                   │
       │ 2. Generates URL                                 │
       │    type: 'full_state'                            │
       │    gameState: {initial + Alice's move}           │
       │                                                   │
       │────── #d=N4IgdghgtgpiBcIDKB... ──────────────>   │
       │                                                   │
       │                                    3. Receives URL│
       │                                       - decompresses│
       │                                       - validates with Zod│
       │                                       - verifies checksum│
       │                                       - saves to localStorage│
       │                                       - renders board│
       │                                                   │
       │                                    4. Makes move  │
       │                                       - enters name "Bob"│
       │                                       - updates state│
       │                                       - calculates checksum│
       │                                                   │
       │                                    5. Generates URL│
       │                                       type: 'delta'│
       │                                       move: {from, to}│
       │                                       turn: 2│
       │                                       checksum: "abc123"│
       │                                       playerName: "Bob"│
       │                                                   │
       │   <──────── #d=N4IgNgzgrghgJgSwHY... ───────────  │
       │                                                   │
       │ 6. Receives delta                                │
       │    - decompresses                                │
       │    - applies move to local state                 │
       │    - calculates own checksum                     │
       │    - verifies: own === received                  │
       │    - ✅ MATCH: states in sync!                   │
       │    - saves opponent_last_checksum                │
       │    - renders board                               │
       │                                                   │
```

### Subsequent Moves (Delta Only)

```
┌─────────────┐                                    ┌─────────────┐
│  Player 1   │                                    │  Player 2   │
└─────────────┘                                    └─────────────┘
       │                                                   │
       │ 1. Before making move:                           │
       │    - loads opponent_last_checksum                │
       │    - calculates own current checksum             │
       │    - verifies match                              │
       │    - ✅ States in sync, safe to proceed          │
       │                                                   │
       │ 2. Makes move                                    │
       │    - applies to local state                      │
       │    - generates new checksum                      │
       │                                                   │
       │ 3. Generates delta URL                           │
       │    type: 'delta'                                 │
       │    move: {from, to}                              │
       │    turn: 3                                       │
       │    checksum: "def456"                            │
       │                                                   │
       │────── #d=N4IgNgzgrg... ──────────────────────>   │
       │                                                   │
       │                                    4. Receives    │
       │                                       - applies move│
       │                                       - verifies checksum│
       │                                       - saves opponent_last_checksum│
       │                                                   │
```

---

## Flow 2: Checksum Mismatch Detection (History Viewer & Manual Resync)

### Player Detects Mismatch When Receiving Move

```
┌─────────────┐                                    ┌─────────────┐
│  Player 1   │                                    │  Player 2   │
└─────────────┘                                    └─────────────┘
       │                                                   │
       │   <──────── #d=N4IgNgzgrghg... ─────────────────  │
       │                                                   │
       │ 1. Receives delta move                           │
       │    - decompresses payload                        │
       │    - extracts: move, turn, checksum              │
       │    - applies move to local state                 │
       │    - calculates own checksum: "abc123"           │
       │    - received checksum: "xyz999"                 │
       │    - ❌ CHECKSUM MISMATCH!                       │
       │                                                   │
       │ 2. Shows History Comparison Modal                │
       │    ┌──────────────────────────────────────┐     │
       │    │  ⚠️  Game State Mismatch Detected    │     │
       │    │                                      │     │
       │    │  Your History   │  Opponent's Move  │     │
       │    │  ─────────────  │  ───────────────  │     │
       │    │  Turn 1: ♖→[1,0]│  Turn 1: ♖→[1,0]  │     │
       │    │  ✓ abc111       │  ✓ abc111         │     │
       │    │                 │                    │     │
       │    │  Turn 2: ♜→[1,1]│  Turn 2: ♜→[1,1]  │     │
       │    │  ✓ def222       │  ✓ def222         │     │
       │    │                 │                    │     │
       │    │  Turn 3: ♘→[0,2]│  Turn 3: ♘→[2,2]  │     │
       │    │  ✓ ghi333       │  ❌ xyz999        │     │
       │    │                 │  ^^^ Different!   │     │
       │    │                 │                    │     │
       │    │  Possible causes:                   │     │
       │    │  • Different move was made          │     │
       │    │  • State modified manually          │     │
       │    │  • Missed a previous URL            │     │
       │    │                                      │     │
       │    │  [Review My History]                │     │
       │    │  [Send My State to Opponent]        │     │
       │    │  [Accept Opponent's State]          │     │
       │    │  [Cancel - Don't Continue]          │     │
       │    └──────────────────────────────────────┘     │
       │                                                   │
```

### Option A: Player Chooses "Send My State to Opponent"

```
       │                                                   │
       │ 3. User clicks [Send My State to Opponent]       │
       │    - Confirms they believe their state is correct│
       │    - Wants to make their move and share state    │
       │                                                   │
       │ 4. User makes their desired move                 │
       │    - Selects piece and destination               │
       │    - Move applied to THEIR local state           │
       │    - New checksum generated                      │
       │                                                   │
       │ 5. Generates full_state URL                      │
       │    type: 'full_state'                            │
       │    gameState: {complete state with P1's move}    │
       │    notification: "State diverged at turn 3. Using my state. Please verify."│
       │    divergenceInfo: {                             │
       │      turn: 3,                                    │
       │      myChecksum: "ghi333",                       │
       │      theirChecksum: "xyz999"                     │
       │    }                                             │
       │                                                   │
       │────── #d=N4IgdghgtgpiBc... ──────────────────>   │
       │                                                   │
       │                                    6. Receives    │
       │                                       - detects type: 'full_state'│
       │                                       - sees divergenceInfo│
       │                                       - shows modal│
       │                                                   │
       │                                    7. Shows Modal │
       │                                       ┌─────────────────┐│
       │                                       │ ⚠️ Opponent sent ││
       │                                       │ their full state││
       │                                       │                 ││
       │                                       │ They believe    ││
       │                                       │ states diverged ││
       │                                       │ at turn 3       ││
       │                                       │                 ││
       │                                       │ [View Their History]││
       │                                       │ [Accept Their State]││
       │                                       │ [Keep My State]     ││
       │                                       └─────────────────┘│
       │                                                   │
```

### Option B: Player Chooses "Accept Opponent's State"

```
       │                                                   │
       │ 3. User clicks [Accept Opponent's State]         │
       │    - Trusts opponent's state is correct          │
       │    - Wants to replace their local state          │
       │                                                   │
       │ 4. Request full state from opponent              │
       │    - Generates resync_request URL                │
       │    - Includes their attempted move               │
       │                                                   │
       │ 5. Generates URL                                 │
       │    type: 'resync_request'                        │
       │    reason: 'checksum_mismatch'                   │
       │    attemptedMove: {from, to}                     │
       │    turn: expected_turn                           │
       │    myChecksum: "abc123"                          │
       │    theirChecksum: "xyz999"                       │
       │                                                   │
       │────── #d=N4IgNgzgrghg... ───────────────────>    │
       │                                                   │
       │                                    6. Receives    │
       │                                       - detects type: 'resync_request'│
       │                                       - extracts attemptedMove│
       │                                       - validates move against own state│
       │                                                   │
```

### Scenario A: Attempted Move is Legal

```
       │                                                   │
       │                                    6. Move is legal│
       │                                       - applies attemptedMove to state│
       │                                       - generates new checksum│
       │                                       - creates full_state payload│
       │                                                   │
       │                                    7. Generates URL│
       │                                       type: 'full_state'│
       │                                       gameState: {updated with P1's move}│
       │                                       notification: "State synced! Your move was applied."│
       │                                                   │
       │   <──────── #d=N4IgdghgtgpiBc... ───────────────  │
       │                                                   │
       │ 8. Receives full_state                           │
       │    - replaces localStorage with received state   │
       │    - verifies checksum                           │
       │    - shows notification                          │
       │    - ✅ SYNCED: Both players now have same state │
       │                                                   │
```

### Scenario B: Attempted Move is Illegal

```
       │                                                   │
       │                                    6. Move is ILLEGAL│
       │                                       - validates against chess rules│
       │                                       - ❌ Invalid move detected│
       │                                       - does NOT apply move│
       │                                                   │
       │                                    7. Generates URL│
       │                                       type: 'full_state'│
       │                                       gameState: {P2's last legal state}│
       │                                       notification: "⚠️ Your attempted move was illegal. Here's the current board state. Please select a legal move."│
       │                                                   │
       │   <──────── #d=N4IgdghgtgpiBc... ───────────────  │
       │                                                   │
       │ 8. Receives full_state                           │
       │    - replaces localStorage                       │
       │    - shows notification (red/warning style)      │
       │    - highlights illegal move attempt             │
       │    - renders correct board state                 │
       │    - ⚠️ Player must choose new move              │
       │                                                   │
```

---

## Flow 3: localStorage Lost (Player Initiates Resync)

```
┌─────────────┐                                    ┌─────────────┐
│  Player 1   │                                    │  Player 2   │
└─────────────┘                                    └─────────────┘
       │                                                   │
       │ 1. Opens game URL                                │
       │    - localStorage is empty                       │
       │    - URL only contains delta move                │
       │    - ❌ No game state to apply move to!          │
       │                                                   │
       │ 2. Shows error                                   │
       │    "Game state not found!"                       │
       │    [Request Full State from Opponent]            │
       │                                                   │
       │ 3. User wants to make move anyway                │
       │    - selects piece and destination               │
       │                                                   │
       │ 4. Generates resync request                      │
       │    type: 'resync_request'                        │
       │    reason: 'localStorage_lost'                   │
       │    attemptedMove: {from, to}                     │
       │    turn: unknown (or guessed from URL)           │
       │                                                   │
       │────── #d=N4IgNgzgrghg... ───────────────────>    │
       │                                                   │
       │                                    5. Receives    │
       │                                       - validates attemptedMove│
       │                                       - determines legality│
       │                                       - applies if legal│
       │                                       - generates full_state│
       │                                                   │
       │   <──────── #d=N4IgdghgtgpiBc... ───────────────  │
       │                                                   │
       │ 6. Receives full_state                           │
       │    - restores complete game                      │
       │    - saves to localStorage                       │
       │    - ✅ Game restored!                           │
       │                                                   │
```

---

## Flow 4: Turn Number Mismatch

```
┌─────────────┐                                    ┌─────────────┐
│  Player 1   │                                    │  Player 2   │
└─────────────┘                                    └─────────────┘
       │                                                   │
       │                                    1. Receives delta│
       │                                       turn: 5      │
       │                                       my current turn: 3│
       │                                       ❌ Turn mismatch!│
       │                                                   │
       │                                    2. Detects     │
       │                                       "Opponent is 2 turns ahead!"│
       │                                       Possible causes:│
       │                                       - Missed a URL  │
       │                                       - State diverged│
       │                                                   │
       │                                    3. Auto-generates│
       │                                       resync_request│
       │                                       reason: 'turn_mismatch'│
       │                                       lastKnownTurn: 3│
       │                                                   │
       │   <──────── #d=N4IgNgzgrghg... ─────────────────  │
       │                                                   │
       │ 4. Receives request                              │
       │    - sends full_state at turn 5                  │
       │    - notification: "Caught up to turn 5"         │
       │                                                   │
```

---

## Edge Cases & Error Handling

### Edge Case 1: Both Players Think It's Their Turn

**Cause:** Network delay, URLs crossed in transit

**Detection:**
- Player receives delta with turn number = their current turn
- Both players have same turn number

**Resolution:**
```typescript
if (receivedTurn === myCurrentTurn) {
  // Check whose turn it actually is based on game state
  const correctPlayer = gameState.currentPlayer;

  if (correctPlayer === myColor) {
    // It's actually my turn, reject their move
    return createError('not_your_turn');
  } else {
    // They're correct, apply their move
    applyMove(receivedMove);
  }
}
```

### Edge Case 2: Malformed/Corrupted URL

**Detection:**
- LZ-String decompression fails
- JSON.parse fails
- Zod validation fails

**Resolution:**
```typescript
try {
  const payload = decompressAndParse(hashFragment);
} catch (error) {
  showError({
    message: "URL is corrupted or invalid",
    action: "Request fresh URL from opponent",
    technicalDetails: error.message
  });
}
```

### Edge Case 3: Ancient URL (Many Turns Old)

**Detection:**
- `receivedTurn` << `myCurrentTurn` (e.g., received turn 2, current turn 10)

**Resolution:**
```typescript
if (receivedTurn < myCurrentTurn - 1) {
  showWarning({
    message: "This URL is outdated (8 turns old)",
    actions: [
      "Ignore (continue current game)",
      "Request latest state from opponent"
    ]
  });
}
```

### Edge Case 4: Opponent Makes Multiple Moves in One URL

**Prevention:** Validate that `receivedTurn === expectedTurn`

```typescript
const expectedTurn = myCurrentTurn + 1;

if (receivedTurn !== expectedTurn) {
  if (receivedTurn > expectedTurn) {
    // They skipped turns or sent multiple moves
    requestResync('turn_skip_detected');
  }
}
```

---

## Implementation Checklist

### Core Functions

- [ ] `compressPayload(payload)` → compressed string
- [ ] `decompressPayload(compressed)` → payload object
- [ ] `generateDeltaURL(move, turn, checksum)` → URL
- [ ] `generateFullStateURL(gameState, notification?)` → URL
- [ ] `generateResyncRequestURL(attemptedMove, reason)` → URL
- [ ] `parseURLHashFragment(hash)` → payload | null
- [ ] `verifyChecksum(gameState)` → boolean
- [ ] `detectStateDivergence()` → boolean
- [ ] `validateReceivedMove(move, currentState)` → legal | illegal
- [ ] `applyMoveAndSync(move, checksum)` → success | error

### State Management

- [ ] `saveToLocalStorage(key, value)` with error handling
- [ ] `loadFromLocalStorage(key)` with corruption detection
- [ ] `clearGameState()` for new games
- [ ] `saveOpponentChecksum(checksum)` for verification
- [ ] `loadOpponentChecksum()` → checksum | null

### UI Components

- [ ] **History Comparison Modal** (primary divergence UI)
  - [ ] Side-by-side move history display
  - [ ] Highlight divergence point with checksum diff
  - [ ] Action buttons: Send My State / Accept Opponent's State / Review / Cancel
  - [ ] Expandable move details (piece type, from/to positions)
  - [ ] Visual diff indicators (✓ match, ❌ mismatch)
- [ ] **History Viewer Component** (expandable in-game)
  - [ ] Last 10 moves with checksums
  - [ ] Collapsible/expandable panel
  - [ ] Click to expand full move history
  - [ ] Export history as JSON (debugging)
- [ ] Error notification component (corrupted URL, parse failures)
- [ ] Warning notification component (turn mismatch, old URL)
- [ ] Resync request dialog ("Send this URL to opponent")
- [ ] Illegal move indicator (highlight attempted square)
- [ ] State sync indicator (synced/out-of-sync badge in corner)

### Validation & Testing

- [ ] Unit tests for compression/decompression
- [ ] Unit tests for checksum calculation
- [ ] Integration tests for happy path (10 moves)
- [ ] Integration tests for checksum mismatch detection
- [ ] Integration tests for resync flow (legal move)
- [ ] Integration tests for resync flow (illegal move)
- [ ] Integration tests for localStorage loss recovery
- [ ] Integration tests for turn number validation
- [ ] E2E tests for malformed URLs
- [ ] E2E tests for corrupted data
- [ ] Performance tests for large game states

---

## Security Considerations

### What We Prevent

✅ **Accidental state divergence** - Checksums detect unintentional desyncs
✅ **Corrupted data** - Zod validation + checksum verification
✅ **Stale URLs** - Turn number tracking
✅ **Lost game state** - Automatic resync mechanism

### What We Don't Prevent (Acceptable Trade-offs)

⚠️ **Deliberate cheating** - Determined player could:
- Modify their localStorage
- Regenerate valid checksum
- Send fabricated URL

**Why this is acceptable:**
- Requires technical knowledge + deliberate effort
- Game is meant for friendly play, not competitive stakes
- Detection: Opponent can review move history for suspicious patterns
- Mitigation: Social (trust-based gameplay)

---

## Performance Considerations

### URL Length Estimates

**Delta Move (typical):**
```json
{
  "type": "delta",
  "move": {"from": [2,0], "to": [1,0]},
  "turn": 5,
  "checksum": "a3f2b"
}
```
- JSON: ~90 bytes
- LZ-String compressed: ~40-50 bytes
- Final URL: ~80 chars total

**Full State (turn 10):**
```json
{
  "type": "full_state",
  "gameState": { /* complete state */ }
}
```
- JSON: ~2KB
- LZ-String compressed: ~800 bytes - 1KB
- Final URL: ~1500 chars

**Browser Limits:**
- Chrome/Edge: 2MB URL length
- Firefox: 65,536 chars
- Safari: 80,000 chars
- **Our max URL: ~2000 chars** → ✅ Safe

### Compression Ratios

LZ-String achieves:
- Delta moves: ~50% compression (small data, less compressible)
- Full state: ~60-70% compression (repetitive JSON structure)
- Move history: ~75% compression (many similar moves)

---

## Future Enhancements (Post-Phase 3)

### Optional: Move History Validation

Instead of single checksum, include hash chain:

```typescript
interface DeltaPayload {
  // ... existing fields
  moveHistory: string[]; // Array of move hashes
}

// Each move hash = hash(previousHash + move)
// Validates entire game history, not just current state
```

**Pros:**
- Detects exactly which move caused divergence
- More robust validation

**Cons:**
- URLs grow with each move
- More complex implementation

**Decision:** Defer to Phase 6 (polish) if users report issues

---

---

## History Viewer Feature (Divergence Resolution UI)

### Purpose

When checksums don't match, players need visibility into:
1. **Where** did states diverge? (which turn)
2. **What** was different? (move comparison)
3. **How** to fix it? (clear action buttons)

### History Comparison Modal

Triggered when checksum mismatch detected on receiving a move.

#### Layout
```
┌────────────────────────────────────────────────────────────┐
│  ⚠️  Game State Mismatch Detected                          │
│                                                            │
│  ┌─────────────────────────┬─────────────────────────┐   │
│  │   Your History          │  Opponent's History     │   │
│  ├─────────────────────────┼─────────────────────────┤   │
│  │  Turn 1: ♖ [2,0]→[1,0]  │  Turn 1: ♖ [2,0]→[1,0] │   │
│  │  Checksum: abc111       │  Checksum: abc111       │   │
│  │  ✓ Match                │  ✓ Match                │   │
│  ├─────────────────────────┼─────────────────────────┤   │
│  │  Turn 2: ♜ [0,0]→[1,1]  │  Turn 2: ♜ [0,0]→[1,1] │   │
│  │  Checksum: def222       │  Checksum: def222       │   │
│  │  ✓ Match                │  ✓ Match                │   │
│  ├─────────────────────────┼─────────────────────────┤   │
│  │  Turn 3: ♘ [2,1]→[0,2]  │  Turn 3: ♘ [2,1]→[2,2] │   │
│  │  Checksum: ghi333       │  Checksum: xyz999       │   │
│  │  ❌ DIVERGENCE DETECTED │  ❌ Different!          │   │
│  └─────────────────────────┴─────────────────────────┘   │
│                                                            │
│  Possible Causes:                                         │
│  • Different move was recorded at Turn 3                  │
│  • One player modified their game state                   │
│  • A previous URL was missed or corrupted                 │
│                                                            │
│  What would you like to do?                               │
│                                                            │
│  ┌──────────────────────┐  ┌──────────────────────┐     │
│  │  [Send My State]     │  │ [Accept Their State] │     │
│  │                      │  │                      │     │
│  │  Share your complete │  │ Replace your state   │     │
│  │  game state with     │  │ with opponent's and  │     │
│  │  opponent            │  │ request resync       │     │
│  └──────────────────────┘  └──────────────────────┘     │
│                                                            │
│  ┌──────────────────────┐  ┌──────────────────────┐     │
│  │  [Review Boards]     │  │ [Cancel]             │     │
│  │                      │  │                      │     │
│  │  See board state at  │  │ Don't continue this  │     │
│  │  Turn 3 for both     │  │ game                 │     │
│  └──────────────────────┘  └──────────────────────┘     │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

#### Data Structure for History Comparison

```typescript
interface MoveHistoryEntry {
  turn: number;
  move: {
    from: Position;
    to: Position | 'off_board';
    piece: 'rook' | 'knight' | 'bishop';
  };
  checksum: string;
  timestamp: number;
  player: 'white' | 'black';
}

interface HistoryComparison {
  myHistory: MoveHistoryEntry[];
  theirHistory: MoveHistoryEntry[];
  divergencePoint: number | null; // Turn where checksums first differ
  matchingSince: number | null;   // Last turn that matched
}
```

#### Logic for Detecting Divergence Point

```typescript
function compareHistories(
  myHistory: MoveHistoryEntry[],
  theirMoves: MoveHistoryEntry[]
): HistoryComparison {
  let divergencePoint = null;
  let matchingSince = 0;

  const maxTurns = Math.max(myHistory.length, theirMoves.length);

  for (let i = 0; i < maxTurns; i++) {
    const myEntry = myHistory[i];
    const theirEntry = theirMoves[i];

    // Both exist - compare checksums
    if (myEntry && theirEntry) {
      if (myEntry.checksum === theirEntry.checksum) {
        matchingSince = i + 1;
      } else if (divergencePoint === null) {
        divergencePoint = i + 1; // Turn numbers are 1-indexed
        break;
      }
    }

    // One missing - definitely diverged
    if (!myEntry || !theirEntry) {
      divergencePoint = i + 1;
      break;
    }
  }

  return {
    myHistory,
    theirHistory: theirMoves,
    divergencePoint,
    matchingSince
  };
}
```

### In-Game History Viewer (Optional, Always Available)

A collapsible panel in the game UI that shows move history:

```
┌─────────────────────────────────────┐
│  Game History  [⌄]                  │
├─────────────────────────────────────┤
│  Turn 5: ♖ [1,0]→[0,0]  ✓ synced   │
│  Turn 4: ♜ [1,1]→[1,2]  ✓ synced   │
│  Turn 3: ♘ [0,2]→[2,1]  ✓ synced   │
│  Turn 2: ♜ [0,0]→[1,1]  ✓ synced   │
│  Turn 1: ♖ [2,0]→[1,0]  ✓ synced   │
│                                     │
│  [Show Full History]                │
│  [Export as JSON]                   │
└─────────────────────────────────────┘
```

**Collapsed state:**
```
┌─────────────────────────────────────┐
│  Game History  [>]  Turn 5  ✓       │
└─────────────────────────────────────┘
```

### Storing Move History

Move history needs to be saved in localStorage alongside game state:

```typescript
interface StoredGameData {
  gameState: GameState;
  moveHistory: MoveHistoryEntry[];
  lastSyncedChecksum: string | null;
}

// Save after each move
function saveMoveToHistory(move: Move, checksum: string) {
  const history = loadMoveHistory();

  history.push({
    turn: gameState.currentTurn,
    move: {
      from: move.from,
      to: move.to,
      piece: move.piece.type
    },
    checksum,
    timestamp: Date.now(),
    player: gameState.currentPlayer
  });

  localStorage.setItem('kings-cooking:move-history', JSON.stringify(history));
}
```

### Reconstructing Opponent's History from URL

When showing history comparison, we need to reconstruct what opponent's history looks like:

```typescript
function reconstructOpponentHistory(
  receivedMove: Move,
  receivedChecksum: string,
  receivedTurn: number
): MoveHistoryEntry[] {
  // We only know their LATEST move from the URL
  // We need to infer their history based on our history + this move

  const myHistory = loadMoveHistory();
  const theirHistory: MoveHistoryEntry[] = [];

  // Copy matching history up to divergence
  for (let i = 0; i < myHistory.length; i++) {
    if (myHistory[i].turn < receivedTurn) {
      // Assume their history matches ours until the turn we received
      theirHistory.push({ ...myHistory[i] });
    }
  }

  // Add their received move
  theirHistory.push({
    turn: receivedTurn,
    move: {
      from: receivedMove.from,
      to: receivedMove.to,
      piece: receivedMove.piece.type
    },
    checksum: receivedChecksum,
    timestamp: Date.now(),
    player: receivedTurn % 2 === 0 ? 'black' : 'white'
  });

  return theirHistory;
}
```

**Limitation:** We can only show opponent's LATEST move in the comparison, not their full history. This is acceptable because:
1. We can identify WHERE divergence occurred (turn number)
2. We can see WHAT they did on that turn
3. Players can coordinate out-of-band if more investigation needed

---

## Questions for Review

1. ✅ **Resync request includes attempted move** - Player losing state can still make move
2. ✅ **Illegal moves rejected gracefully** - Full state sent back with notification
3. ✅ **Manual resync with history viewer** - Players choose how to resolve divergence
4. ✅ **URLs unreadable** - Everything in `#d=[compressed]`
5. ✅ **History comparison UI** - Side-by-side view with clear action buttons

**Decisions:**
- ✅ History viewer **always visible** (collapsed by default in corner)
- ✅ **Full game history** stored (no limits - games are short, ~20KB max)
- ✅ **"Export as JSON"** available to all users (transparency + debugging)

**Rationale:**
- 3x3 board games rarely exceed 30 moves
- Full history = ~20KB even at 100 moves (well under localStorage limits)
- Export JSON helps with bug reports and debugging
- Transparency builds trust in the sync mechanism
