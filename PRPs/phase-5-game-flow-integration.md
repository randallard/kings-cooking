# Phase 5: Game Flow Integration - Complete Hot-Seat Gameplay

**Version:** 2.0.0
**Phase:** 5 of 7
**Complexity:** High
**Dependencies:** Phase 1 (Foundation), Phase 2 (Chess Engine), Phase 3 (URL State), Phase 4 (UI Components)
**Estimated Effort:** 2-3 weeks
**Date:** 2025-10-16

---

## 🎯 GOAL

Transform App.tsx from a Phase 4 component showcase into a production-ready, fully-functional hot-seat chess game with state machine orchestration, turn handoff flow, URL state persistence, and comprehensive E2E test coverage.

**Specific Deliverables:**

1. **State Machine** - useReducer-based game flow (4 phases: setup → playing → handoff → victory)
2. **URL Integration** - Sync game state with URL hash (full-state on first move, delta on subsequent)
3. **Turn Handoff Flow** - Privacy screen with countdown between player turns
4. **Victory Celebration** - VictoryScreen integration with game statistics
5. **Player Name Management** - Distinguish Player 1 vs Player 2 with localStorage persistence
6. **Edge Case Handling** - Browser back button, page refresh, corrupted URLs
7. **E2E Test Coverage** - 80%+ coverage with Playwright for complete game journeys
8. **Production Build** - Zero errors, zero warnings, all validation gates pass

**NOT in Phase 5 (Deferred):**
- ❌ WebRTC multiplayer (Phase 6+)
- ❌ Move history viewer UI (Phase 6+)
- ❌ Undo/redo functionality (Phase 6+)
- ❌ Variable board sizes (v2.0+)
- ❌ Custom piece selection (v2.0+)

**Success Criteria:**
- ✅ Complete hot-seat game playable from start to finish
- ✅ All 4 game phases transition correctly (setup → playing → handoff → victory)
- ✅ URL contains game state (full-state first, delta subsequent)
- ✅ Page refresh restores game from URL + localStorage
- ✅ Victory screen shows with confetti and stats
- ✅ 80%+ E2E test coverage with Playwright
- ✅ Zero TypeScript errors, zero ESLint warnings
- ✅ Production build passes all validation gates

---

## 💡 WHY

**Business Value:**
- Delivers **MVP complete** - users can play full games start-to-finish
- Hot-seat mode = zero infrastructure costs (serverless)
- URL sharing enables async gameplay without accounts
- Professional UX builds user confidence and shareability

**User Impact:**
- **BEFORE Phase 5**: Users see UI components but can't play a complete game
- **AFTER Phase 5**: Users can:
  - Start a new game with player names
  - Make moves with full validation
  - See turn handoff with privacy screen
  - Share game state via URL
  - Experience victory celebration
  - Refresh page without losing progress

**Technical Dependencies:**
- Phase 1: Validation schemas, localStorage utilities, TypeScript strict mode
- Phase 2: `KingsChessEngine` with move validation and checksum generation
- Phase 3: `useUrlState` hook, payload types (delta, full_state, resync_request)
- Phase 4: All UI components (GameBoard, HandoffScreen, VictoryScreen, etc.)

**Why This Order:**
- Can't orchestrate game flow without chess engine (Phase 2)
- Can't persist state without URL sync (Phase 3)
- Can't show UI without components (Phase 4)
- Phase 5 unblocks Phase 6 (WebRTC multiplayer) by providing complete single-device gameplay

---

##