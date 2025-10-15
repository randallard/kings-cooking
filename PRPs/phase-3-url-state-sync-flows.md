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

## Flow 2: Checksum Mismatch Detection (Automatic Resync)

### Player 1 Detects Mismatch Before Sending

```
┌─────────────┐                                    ┌─────────────┐
│  Player 1   │                                    │  Player 2   │
└─────────────┘                                    └─────────────┘
       │                                                   │
       │ 1. About to make move                            │
       │    - loads opponent_last_checksum: "abc123"      │
       │    - calculates own checksum: "xyz999"           │
       │    - ❌ MISMATCH!                                │
       │                                                   │
       │ 2. Shows error to user                           │
       │    "Game states out of sync!"                    │
       │    [Request Resync] button                       │
       │                                                   │
       │ 3. User clicks [Request Resync]                  │
       │    - user still makes their desired move         │
       │    - generates resync request URL                │
       │                                                   │
       │ 4. Generates URL                                 │
       │    type: 'resync_request'                        │
       │    reason: 'checksum_mismatch'                   │
       │    attemptedMove: {from, to}                     │
       │    turn: expected_turn                           │
       │    lastKnownChecksum: "abc123"                   │
       │                                                   │
       │────── #d=N4IgNgzgrghg... ───────────────────>    │
       │                                                   │
       │                                    5. Receives    │
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

- [ ] Error notification component (checksum mismatch)
- [ ] Warning notification component (turn mismatch, old URL)
- [ ] Resync request dialog ("Send this URL to opponent")
- [ ] Illegal move indicator (highlight attempted square)
- [ ] State sync indicator (synced/out-of-sync badge)

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

## Questions for Review

1. ✅ **Resync request includes attempted move** - Player losing state can still make move
2. ✅ **Illegal moves rejected gracefully** - Full state sent back with notification
3. ✅ **Automatic resync response** - Receiving player's client handles it transparently
4. ✅ **URLs unreadable** - Everything in `#d=[compressed]`

**Next question:** Should we add a **"game history viewer"** in the UI to help players debug state divergence issues? (e.g., show last 5 moves with checksums)
