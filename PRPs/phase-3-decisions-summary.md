# Phase 3 Design Decisions Summary

**Date:** 2025-10-15
**Status:** Finalized - Ready for Implementation
**Full Documentation:** See `phase-3-url-state-sync-flows.md`

---

## Key Decisions

### 1. No Encryption (Simplified Approach)

**Decision:** Use compression + checksums instead of AES encryption

**Rationale:**
- Client-side encryption can't prevent determined cheating
- Game is for friendly play, not competitive stakes
- Simpler implementation = fewer bugs
- Checksums detect accidental divergence
- Focus on good UX for sync issues

**What We Use:**
- ✅ LZ-String compression (makes URLs unreadable to casual users)
- ✅ Checksum verification (detects state tampering/divergence)
- ✅ Zod validation (prevents corrupted data)

---

### 2. Delta-Based URLs

**Decision:** Send only move deltas in URLs, not full state (except initial game)

**Rationale:**
- Keeps URLs short (~80 chars for deltas vs ~1500 for full state)
- Full state lives in localStorage on each device
- First URL contains full state to initialize Player 2
- All subsequent URLs contain only: move + turn + checksum + optional player name

**URL Format:**
```
https://kings-cooking.pages.dev/#d=[compressed_payload]
```

**Payload Types:**
1. `delta` - Normal move (most common)
2. `full_state` - Complete game state (initial game or resync)
3. `resync_request` - Request full state with attempted move

---

### 3. History Comparison Modal (Manual Resync)

**Decision:** Show history viewer on checksum mismatch, let player choose action

**Rationale:**
- Better UX than automatic/silent resync
- Players understand what went wrong
- Clear choices for resolution
- Builds trust in the system

**Modal Shows:**
- Side-by-side move history (yours vs opponent's)
- Exact turn where checksums diverged
- Four action buttons:
  1. **Send My State** - Share your complete state
  2. **Accept Their State** - Replace with opponent's state
  3. **Review** - See more details (future: board comparison)
  4. **Cancel** - Don't continue game

---

### 4. Always-Visible History Viewer

**Decision:** Collapsible history panel always available during gameplay

**Rationale:**
- Transparency builds trust
- Helps players debug issues themselves
- Can review game progress
- Export JSON for bug reports

**Features:**
- Collapsed by default (doesn't clutter UI)
- Last 5-10 moves visible when expanded
- "Show Full History" button
- "Export as JSON" button (always available)
- Checkmark icons show sync status

---

### 5. Full Game History Storage

**Decision:** Store complete move history in localStorage (no limits)

**Rationale:**
- 3x3 board games are short (~10-30 moves)
- Even 100 moves = only ~20KB
- Well under localStorage limits (~5-10MB)
- Simpler than managing sliding windows
- Helpful for debugging and review

---

### 6. Resync Request Includes Attempted Move

**Decision:** When requesting resync, include the move you want to make

**Rationale:**
- Player doesn't lose their intended action
- Receiving player validates move against their state
- If legal: apply move and send updated full state
- If illegal: send current state with error notification
- Seamless flow - player doesn't need to retry

---

### 7. Turn Number Validation

**Decision:** Include turn number in every payload, validate on receipt

**Rationale:**
- Detects if a URL was skipped/missed
- Prevents applying moves in wrong order
- Helps identify when states diverged
- Simple integer comparison

**Validation:**
```typescript
const expectedTurn = myCurrentTurn + 1;
if (receivedTurn !== expectedTurn) {
  showWarning('Turn mismatch detected');
  offerResync();
}
```

---

### 8. Deferred Features

**Deferred to Phase 6 (Polish):**

1. **Visual Board Comparison** - "Review Boards" feature showing side-by-side board states at divergence point
   - Complex UI (two boards)
   - Nice-to-have, not critical
   - History comparison covers 90% of needs

2. **Move History Chain Validation** - Hash of all previous moves instead of single checksum
   - More robust but URLs grow with each move
   - Single checksum is sufficient for 3x3 games
   - Add if users report issues

---

## Implementation Order

### Phase 3A: Core URL Encoding (Week 2, Days 1-2)
1. Install LZ-String
2. Create payload type definitions
3. Implement compress/decompress utilities
4. Create URL encoding functions (delta, full_state, resync_request)
5. Create URL decoding with Zod validation
6. Expose checksum verification from Phase 2 engine
7. Add turn number validation
8. Unit tests for encoding/decoding

### Phase 3B: History Storage (Week 2, Day 3)
1. Define MoveHistoryEntry type
2. Create localStorage history utilities
3. Integrate with KingsChessEngine.makeMove()
4. Save checksum with each move
5. Unit tests for history storage

### Phase 3C: History Viewer UI (Week 2, Days 4-5)
1. Build collapsible History Viewer component
2. Display last 10 moves with sync status
3. Add "Show Full History" modal
4. Add "Export JSON" functionality
5. Component tests

### Phase 3D: History Comparison Modal (Week 2, Days 6-7)
1. Build History Comparison Modal
2. Implement divergence detection logic
3. Add four action buttons with handlers
4. Wire up resync flows
5. Integration tests

### Phase 3E: Integration & Error Handling (Week 2, Days 8-10)
1. Test full happy path (10 move game)
2. Test checksum mismatch flow
3. Test localStorage loss recovery
4. Test corrupted URL handling
5. Test turn number mismatch
6. Error message polish
7. E2E tests

---

## Success Criteria

**Phase 3 is complete when:**

- [ ] Player 1 can create game and send URL to Player 2
- [ ] Player 2 can receive URL, decompress, validate, and play
- [ ] Delta URLs work for all subsequent moves
- [ ] Checksum mismatch triggers History Comparison Modal
- [ ] Players can resolve divergence using the four action buttons
- [ ] History Viewer shows move history with sync status
- [ ] Export JSON works and produces valid game data
- [ ] All error cases handled gracefully (corrupted URL, turn mismatch, etc.)
- [ ] Integration tests pass with 80%+ coverage
- [ ] No console errors during normal gameplay
- [ ] URLs are human-unreadable (compressed)
- [ ] URLs are reasonably short (<100 chars for deltas, <2000 for full state)

---

## Questions Resolved

✅ Should we use encryption? **No - compression + checksums sufficient**
✅ What happens on checksum mismatch? **Show History Comparison Modal**
✅ Automatic or manual resync? **Manual - player chooses**
✅ History viewer always visible? **Yes - collapsed by default**
✅ Limit history storage? **No - keep full history**
✅ Export JSON available? **Yes - always visible to all users**
✅ Include "Review Boards" in Phase 3? **No - defer to Phase 6**
✅ Hot-seat mode generate URLs? **No - localStorage only in Phase 3**

---

## Game Mode Separation

### Hot-Seat Mode (Phase 3)
- Uses **localStorage only** (no URL generation)
- Players pass device back and forth
- Handoff screen between turns
- Simpler flow, no network concerns
- History viewer still available (for review/debugging)

### URL Mode (Phase 3)
- Generates URLs after each move
- Full URL encoding/decoding with checksums
- History Comparison Modal on divergence
- Delta-based synchronization
- Primary focus of Phase 3

### Future Enhancement (Phase 6+)
- Add "Share URL" button to hot-seat mode
- Allow switching from hot-seat to URL mode mid-game
- Optional: Auto-generate URL in background for backup

---

## Risk Assessment

### Low Risk
- LZ-String is proven, stable library
- Checksum logic already exists and tested (Phase 2)
- localStorage is well-supported
- Delta approach reduces URL length significantly

### Medium Risk
- History Comparison Modal UX must be intuitive (requires user testing)
- Reconstructing opponent history from single move (limitation documented)
- Players might not understand divergence causes (good error messages critical)

### Mitigation
- User testing with 3-5 people before Phase 4
- Clear, friendly error messages
- Good documentation in UI ("What does this mean?")
- Export JSON helps with bug reports

---

## Next Steps

1. Review this summary with stakeholders ✅
2. Create Phase 3 PRP document (detailed implementation blueprint)
3. Begin Phase 3A implementation
4. Check in after History Viewer UI complete for feedback
