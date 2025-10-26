# Task PRP: Refactor to Full State URLs + Remove Game State from localStorage

**Created**: 2025-01-25
**Status**: Draft
**Complexity**: Medium
**Estimated Time**: 4-6 hours

---

## Goal

Simplify the URL sharing system by:
1. **Always using full game state in URLs** (remove delta optimization)
2. **Removing game state from localStorage** (URLs become single source of truth)
3. **Keeping localStorage for player names and UI preferences** (convenience features)

This creates a **stateless game architecture** where:
- ✅ Every URL contains complete, self-contained game state
- ✅ No localStorage dependency for game persistence
- ✅ Refresh without URL in address bar = start new game
- ✅ Player names and preferences still remembered for UX

---

## Why

**Current Complexity**:
- Delta vs full_state URL logic requires checksum validation
- localStorage game state can diverge from URL state
- First move vs subsequent move branching logic
- Resync request handling for checksum mismatches

**Benefits of Refactoring**:
- 🎯 Simpler codebase (remove ~200 lines of delta logic)
- 🐛 Fewer edge cases (no checksum mismatches)
- 🔗 URLs are portable and self-contained
- 🧪 Easier to test (stateless = predictable)
- 🚀 Faster debugging (URL = complete state snapshot)

**Trade-offs**:
- ⚠️ Larger URLs (~1500 chars vs ~80 chars for moves)
- ⚠️ Refresh loses state unless URL is in address bar
- ✅ Hash fragment compression mitigates URL size (lz-string gives 66-88% reduction)

---

## What

### User-Visible Changes

**Before**:
```
Player shares move → Small delta URL (~80 chars)
Refresh browser → Game state restored from localStorage
```

**After**:
```
Player shares move → Full state URL (~1500 chars compressed)
Refresh browser → New game (unless URL is in address bar)
```

**No Change**:
- Player names still remembered in localStorage
- UI preferences (dark mode, seen story) still persisted
- URL hash fragment encryption/compression unchanged
- Game logic, move validation, victory conditions unchanged

---

## All Needed Context

### Current Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Current System                        │
├─────────────────────────────────────────────────────────┤
│  URL Hash Fragment:                                      │
│    - First move: full_state (~1500 chars)               │
│    - Subsequent: delta (~80 chars)                       │
│    - Checksum validation required                        │
│                                                           │
│  localStorage:                                           │
│    - Game state (full GameState object)                  │
│    - Player names (my-name, player1, player2)            │
│    - UI preferences (mode, seen-story, etc.)             │
└─────────────────────────────────────────────────────────┘
```

### Target Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    New System                            │
├─────────────────────────────────────────────────────────┤
│  URL Hash Fragment:                                      │
│    - Always: full_state (~1500 chars compressed)         │
│    - No checksum validation needed                       │
│                                                           │
│  localStorage:                                           │
│    - Player names (my-name, player1, player2)            │
│    - UI preferences (mode, seen-story, etc.)             │
│    - NO game state                                       │
└─────────────────────────────────────────────────────────┘
```

### Files to Modify

| File | Changes | Lines | Risk |
|------|---------|-------|------|
| `src/lib/urlEncoding/types.ts` | Remove `DeltaPayload`, `ResyncRequestPayload` | -60 | Low |
| `src/lib/urlEncoding/urlBuilder.ts` | Remove `buildDeltaUrl()`, `buildResyncRequestUrl()` | -30 | Low |
| `src/lib/urlEncoding/urlParser.ts` | Remove `applyDeltaPayload()`, `handleResyncRequest()` | -120 | Medium |
| `src/App.tsx` | Remove delta URL logic, remove game state localStorage | -40 | High |
| `src/lib/storage/localStorage.ts` | Remove `GAME_STATE` key and helpers | -20 | Low |
| `src/lib/gameFlow/reducer.ts` | Remove localStorage saves from reducer | -15 | Medium |
| Test files (5 files) | Remove delta tests, update integration tests | -200 | Low |

**Total**: ~485 lines removed, ~50 lines added

### Patterns to Follow

**URL Generation** (from existing full_state logic):
```typescript
// src/App.tsx:579-590
const fullStatePayload = {
  type: 'full_state' as const,
  gameState: newState,
  playerName: state.player1Name || undefined,
};
updateUrlImmediate(fullStatePayload);
```

**URL Parsing** (from existing full_state logic):
```typescript
// src/lib/urlEncoding/urlParser.ts:218-260
function applyFullStatePayload(payload: FullStatePayload): ApplyResult {
  const expectedChecksum = computeChecksum(payload.gameState);
  if (payload.gameState.checksum !== expectedChecksum) {
    return { success: false, error: 'checksum_mismatch' };
  }
  return {
    success: true,
    engine: new KingsChessEngine(/*...*/),
    playerName: payload.playerName,
  };
}
```

**localStorage Player Names** (keep as-is):
```typescript
// src/lib/storage/localStorage.ts:262-347
storage.getMyName()        // Keep
storage.setMyName()        // Keep
storage.getPlayer1Name()   // Keep
storage.setPlayer1Name()   // Keep
```

### Gotchas

1. **URL Size Limits**
   - Issue: Browsers support ~2MB URLs, but some servers/proxies limit to 2KB-8KB
   - Current: Full state URLs are ~1500 chars compressed (~700 chars after lz-string)
   - Fix: Test with maximum game state (full 3x3 board, long move history)
   - Mitigation: Hash fragments don't hit server, only client-side

2. **Refresh Behavior**
   - Issue: Users expect refresh to preserve game state
   - Fix: Document this behavior change in UI
   - Mitigation: Show warning if user tries to refresh during active game?

3. **Back/Forward Navigation**
   - Issue: Browser history contains full game states
   - Current: `useUrlState.ts` already handles hashchange events
   - Fix: Verify back/forward works with full state URLs

4. **Victory Screen URL Sharing**
   - Issue: Victory screen already generates full_state URL (App.tsx:1035)
   - Fix: No change needed - already works correctly

5. **Player Name Extraction**
   - Issue: `extractAndSaveOpponentName()` saves to localStorage
   - Current: Uses full_state payload's `playerName` field
   - Fix: Verify this still works with always-full-state approach

### Related Documentation

- **lz-string compression**: https://github.com/pieroxy/lz-string
- **Hash fragment limits**: https://stackoverflow.com/questions/417142/what-is-the-maximum-length-of-a-url-in-different-browsers
- **React Router hash handling**: https://reactrouter.com/en/main/router-components/hash-router

---

## Implementation Blueprint

### Phase 1: Update Type Definitions (Low Risk)

**Task 1.1**: Remove delta and resync payload types

```typescript
FILE: src/lib/urlEncoding/types.ts

REMOVE:
- DeltaPayloadSchema (lines 33-46)
- ResyncRequestPayloadSchema (lines 68-81)
- DeltaPayload type (line 100)
- ResyncRequestPayload type (line 108)

KEEP:
- FullStatePayloadSchema (lines 48-66)
- FullStatePayload type (line 104)

UPDATE:
- UrlPayloadSchema: Remove delta and resync_request from union
  OLD: z.discriminatedUnion('type', [FullStatePayloadSchema, DeltaPayloadSchema, ResyncRequestPayloadSchema])
  NEW: FullStatePayloadSchema

- UrlPayload type: Simplify to just FullStatePayload
  OLD: DeltaPayload | FullStatePayload | ResyncRequestPayload
  NEW: FullStatePayload

VALIDATE:
  pnpm run check  # TypeScript should compile

IF_FAIL:
  - Check for imports of removed types in other files
  - Update those imports to use FullStatePayload only

ROLLBACK:
  git restore src/lib/urlEncoding/types.ts
```

**Task 1.2**: Update URL builder to only export full state function

```typescript
FILE: src/lib/urlEncoding/urlBuilder.ts

REMOVE:
- buildDeltaUrl() function (lines 33-51)
- buildResyncRequestUrl() function (lines 71-89)

KEEP:
- buildFullStateUrl() function (lines 53-69)
- buildCompleteUrl() function (lines 91-106)

RENAME (optional for clarity):
- buildFullStateUrl → buildGameUrl (since it's the only one now)

VALIDATE:
  pnpm run check
  pnpm run lint

IF_FAIL:
  - Check call sites in App.tsx
  - Update function name references

ROLLBACK:
  git restore src/lib/urlEncoding/urlBuilder.ts
```

**Task 1.3**: Simplify URL parser to only handle full state

```typescript
FILE: src/lib/urlEncoding/urlParser.ts

REMOVE:
- applyDeltaPayload() function (lines 136-215)
- handleResyncRequest() function (lines 262-285)
- All delta-specific logic in applyPayloadToEngine()

UPDATE applyPayloadToEngine():
  OLD:
    switch (payload.type) {
      case 'delta': return applyDeltaPayload(...)
      case 'full_state': return applyFullStatePayload(...)
      case 'resync_request': return handleResyncRequest(...)
    }

  NEW:
    // payload is always FullStatePayload now
    return applyFullStatePayload(payload);

KEEP:
- applyFullStatePayload() function (lines 218-260)
- parseUrlHash() function (lines 108-133)

VALIDATE:
  pnpm run check
  pnpm test src/lib/urlEncoding/urlParser.test.ts

IF_FAIL:
  - Review error messages
  - Check Zod schema validation still works
  - Verify test payloads are full_state format

ROLLBACK:
  git restore src/lib/urlEncoding/urlParser.ts
```

---

### Phase 2: Update Application Logic (High Risk)

**Task 2.1**: Remove delta URL generation from App.tsx

```typescript
FILE: src/App.tsx

LOCATE: handleConfirmMove function (around line 561-636)

REMOVE:
- isFirstMove calculation (line 570-577)
- Conditional delta vs full_state logic (lines 579-630)

REPLACE WITH:
  const fullStatePayload: FullStatePayload = {
    type: 'full_state' as const,
    gameState: newState,
    playerName: state.player1Name || undefined,
  };
  updateUrlImmediate(fullStatePayload);

VALIDATE:
  pnpm run check
  pnpm test src/App.test.tsx

IF_FAIL:
  - Check updateUrlImmediate signature
  - Verify FullStatePayload type import
  - Run game in browser and share URL

ROLLBACK:
  git restore src/App.tsx

DEBUG STRATEGY:
  1. console.log(fullStatePayload) before updateUrlImmediate
  2. Check browser console for payload structure
  3. Copy URL and paste in new tab - should restore game
  4. Check Network tab for any localStorage writes
```

**Task 2.2**: Remove game state localStorage operations

```typescript
FILE: src/App.tsx

LOCATE: Game state restoration (lines 146-149)

REMOVE:
  const savedGameState = storage.getGameState();
  if (savedGameState) {
    // Initialize from localStorage
  }

REMOVE: storage.setGameState() calls
  - Line 549: After move confirmation
  - Any other setGameState() calls in reducer

KEEP:
  - storage.getMyName()
  - storage.getPlayer1Name()
  - storage.getPlayer2Name()
  - All other localStorage operations

VALIDATE:
  # Test that game does NOT restore after refresh
  1. Start game in browser
  2. Make a move
  3. Refresh page (without URL in address bar)
  4. Game should start fresh, not restore

  # Test that URL sharing still works
  1. Start game in browser
  2. Make a move
  3. Copy URL from address bar
  4. Open new incognito tab
  5. Paste URL
  6. Game should restore from URL

IF_FAIL:
  - Check for other getGameState() calls
  - Verify reducer doesn't save to localStorage
  - Check useEffect dependencies

ROLLBACK:
  git restore src/App.tsx

DEBUG STRATEGY:
  # Add localStorage monitoring
  const originalSetItem = localStorage.setItem;
  localStorage.setItem = function(key, value) {
    console.log('localStorage.setItem', key, value);
    if (key.includes('game-state')) {
      console.trace('GAME STATE WRITE - SHOULD NOT HAPPEN');
    }
    return originalSetItem.apply(this, arguments);
  };
```

**Task 2.3**: Update gameFlow reducer to not save to localStorage

```typescript
FILE: src/lib/gameFlow/reducer.ts

SEARCH FOR: storage.setGameState

REMOVE: All storage.setGameState() calls in reducer actions:
  - CONFIRM_MOVE action
  - MAKE_MOVE action
  - Any other actions that save game state

KEEP:
  - All game state manipulation in memory
  - Return new state objects as normal

VALIDATE:
  pnpm test src/lib/gameFlow/reducer.test.ts

IF_FAIL:
  - Check test assertions about localStorage
  - Update tests to NOT expect localStorage writes
  - Verify state is still returned correctly

ROLLBACK:
  git restore src/lib/gameFlow/reducer.ts

DEBUG STRATEGY:
  1. Add console.log in each reducer case
  2. Verify state is updated in memory
  3. Confirm no localStorage.setItem calls
```

---

### Phase 3: Update localStorage Module (Low Risk)

**Task 3.1**: Remove GAME_STATE key and helpers

```typescript
FILE: src/lib/storage/localStorage.ts

REMOVE from STORAGE_KEYS:
  GAME_STATE: 'kings-cooking:game-state'

REMOVE from storage interface:
  getGameState(): GameState | null
  setGameState(state: GameState): void

KEEP:
  - MY_NAME
  - MY_PLAYER_ID
  - PLAYER1_NAME
  - PLAYER2_NAME
  - GAME_MODE
  - PIECE_SELECTION_MODE
  - All UI preference keys

UPDATE clearGameStorage():
  Remove GAME_STATE from the list of keys to clear

VALIDATE:
  pnpm run check
  pnpm test src/lib/storage/localStorage.test.ts

IF_FAIL:
  - Update tests to not expect game state operations
  - Remove game state test cases

ROLLBACK:
  git restore src/lib/storage/localStorage.ts
```

---

### Phase 4: Update Tests (Low Risk)

**Task 4.1**: Remove delta URL builder tests

```typescript
FILE: src/lib/urlEncoding/urlBuilder.test.ts

REMOVE test suites:
  - "buildDeltaUrl" describe block
  - "buildResyncRequestUrl" describe block

KEEP test suites:
  - "buildFullStateUrl" describe block
  - "buildCompleteUrl" describe block

ADD tests for edge cases:
  - Maximum game state size (full 3x3 board + long move history)
  - Empty game state
  - URL length verification (<2000 chars)

VALIDATE:
  pnpm test src/lib/urlEncoding/urlBuilder.test.ts

IF_FAIL:
  - Check for remaining delta references
  - Update test imports

ROLLBACK:
  git restore src/lib/urlEncoding/urlBuilder.test.ts
```

**Task 4.2**: Remove delta URL parser tests

```typescript
FILE: src/lib/urlEncoding/urlParser.test.ts

REMOVE test suites:
  - "applyDeltaPayload" describe block
  - "handleResyncRequest" describe block
  - Checksum mismatch tests for delta payloads

KEEP test suites:
  - "applyFullStatePayload" describe block
  - "parseUrlHash" describe block

UPDATE "applyPayloadToEngine" tests:
  - Remove delta payload test cases
  - Keep only full_state test cases

VALIDATE:
  pnpm test src/lib/urlEncoding/urlParser.test.ts

IF_FAIL:
  - Update payload fixtures to full_state format
  - Remove delta-specific assertions

ROLLBACK:
  git restore src/lib/urlEncoding/urlParser.test.ts
```

**Task 4.3**: Update integration tests

```typescript
FILE: src/lib/urlEncoding/urlEncoding.integration.test.ts

REMOVE test suites:
  - Delta round-trip encoding tests
  - Checksum validation tests

UPDATE test suites:
  - Full state round-trip encoding
  - Player name extraction from full_state

ADD regression tests:
  - URL sharing after multiple moves
  - Browser refresh behavior (should NOT restore game)
  - Back/forward navigation with full state URLs

VALIDATE:
  pnpm test src/lib/urlEncoding/urlEncoding.integration.test.ts

IF_FAIL:
  - Check test fixtures
  - Verify compression/decompression still works

ROLLBACK:
  git restore src/lib/urlEncoding/urlEncoding.integration.test.ts
```

**Task 4.4**: Update App component tests

```typescript
FILE: src/App.test.tsx

REMOVE test cases:
  - "should restore game state from localStorage on mount"
  - "should save game state to localStorage after move"

ADD test cases:
  - "should NOT restore game state from localStorage on mount"
  - "should NOT save game state to localStorage after move"
  - "should generate full_state URL after every move"

UPDATE test cases:
  - Victory screen URL generation (verify still full_state)
  - URL sharing tests (verify always full_state)

VALIDATE:
  pnpm test src/App.test.tsx

IF_FAIL:
  - Check localStorage mock in tests
  - Verify URL generation assertions

ROLLBACK:
  git restore src/App.test.tsx
```

**Task 4.5**: Update E2E tests

```typescript
FILE: tests/e2e/url-sharing.spec.ts

UPDATE test scenarios:
  - Remove delta URL expectations
  - All URLs should be full_state format
  - Test refresh behavior (should start new game)

ADD test scenarios:
  - Share URL after 10 moves (verify URL length is acceptable)
  - Copy/paste URL in new browser window
  - Back/forward navigation

VALIDATE:
  pnpm test:e2e

IF_FAIL:
  - Check Playwright selectors
  - Verify URL format in browser

ROLLBACK:
  git restore tests/e2e/url-sharing.spec.ts
```

---

### Phase 5: Update localStorage Tests

**Task 5.1**: Remove game state localStorage tests

```typescript
FILE: src/lib/storage/localStorage.test.ts

REMOVE test suites:
  - "getGameState" tests
  - "setGameState" tests

KEEP test suites:
  - Player name tests
  - UI preference tests
  - Validation utility tests

VALIDATE:
  pnpm test src/lib/storage/localStorage.test.ts

IF_FAIL:
  - Update test imports
  - Remove game state fixtures

ROLLBACK:
  git restore src/lib/storage/localStorage.test.ts
```

---

## Validation Loop

### Level 1: Syntax & Type Checking

```bash
pnpm run check
# Expected: 0 errors
# Watch for: Removed type references, missing imports

pnpm run lint
# Expected: 0 warnings
# Watch for: Unused variables, console.logs
```

**If Fail**:
- Check all imports of removed types
- Verify FullStatePayload is exported
- Update function signatures

---

### Level 2: Unit Tests

```bash
pnpm test src/lib/urlEncoding/
# Expected: All tests pass
# Watch for: Delta payload test failures

pnpm test src/lib/storage/
# Expected: All tests pass
# Watch for: Game state localStorage test failures

pnpm test src/lib/gameFlow/
# Expected: All tests pass
# Watch for: localStorage write expectations
```

**If Fail**:
- Remove delta test cases
- Update localStorage mock expectations
- Verify payload structure in tests

---

### Level 3: Integration Tests

```bash
pnpm test src/lib/urlEncoding/urlEncoding.integration.test.ts
# Expected: All tests pass
# Watch for: Round-trip encoding failures

pnpm test src/App.test.tsx
# Expected: All tests pass
# Watch for: localStorage restoration expectations
```

**If Fail**:
- Check compression/decompression pipeline
- Verify URL hash format
- Update test fixtures to full_state

---

### Level 4: E2E Tests

```bash
pnpm test:e2e tests/e2e/url-sharing.spec.ts
# Expected: All tests pass
# Watch for: URL format mismatches, localStorage dependencies

# Manual E2E Test Checklist:
1. ✅ Start new game in hot-seat mode
2. ✅ Make 5 moves
3. ✅ Copy URL from address bar
4. ✅ Verify URL length < 2000 characters
5. ✅ Open new incognito tab
6. ✅ Paste URL
7. ✅ Game should restore at move 5
8. ✅ Refresh without URL in address bar
9. ✅ Game should start fresh (not restore)
10. ✅ Player names should still be remembered
```

**If Fail**:
- Check URL hash parsing
- Verify compression ratio
- Test with maximum game state

---

### Level 5: Production Build

```bash
pnpm build
# Expected: Build succeeds with no warnings
# Watch for: Dead code elimination, bundle size

# Check bundle size:
ls -lh dist/assets/*.js
# Expected: No significant size increase (compression helps)
```

**If Fail**:
- Check for circular dependencies
- Verify all imports are used
- Run tree-shaking analysis

---

## Testing Strategy

### Unit Test Scenarios

```typescript
describe('Full State URL Refactoring', () => {
  describe('URL Builder', () => {
    it('should always generate full_state URLs', () => {
      const payload = buildGameUrl(gameState, playerName);
      expect(payload.type).toBe('full_state');
      expect(payload.gameState).toEqual(gameState);
    });

    it('should handle maximum game state size', () => {
      const largeGameState = createGameWithMaxMoves(); // 50 moves
      const url = buildCompleteUrl(largeGameState);
      expect(url.length).toBeLessThan(2000); // Browser limit
    });
  });

  describe('URL Parser', () => {
    it('should parse full_state URLs', () => {
      const url = buildCompleteUrl(gameState);
      const result = parseUrlHash(url.hash);
      expect(result.success).toBe(true);
      expect(result.payload.type).toBe('full_state');
    });

    it('should reject delta URLs (backwards compatibility)', () => {
      const oldDeltaUrl = '#N4IgdghgtgpiBcIDaB...'; // Old delta URL
      const result = parseUrlHash(oldDeltaUrl);
      expect(result.success).toBe(false);
      expect(result.error).toContain('invalid payload type');
    });
  });

  describe('localStorage', () => {
    it('should NOT save game state to localStorage', () => {
      const spy = vi.spyOn(storage, 'setGameState');
      makeMove(from, to);
      expect(spy).not.toHaveBeenCalled();
    });

    it('should NOT restore game state from localStorage', () => {
      localStorage.setItem('kings-cooking:game-state', JSON.stringify(gameState));
      renderApp();
      expect(getGameState()).toBeNull(); // Should be fresh game
    });

    it('should still save player names to localStorage', () => {
      const spy = vi.spyOn(storage, 'setPlayer1Name');
      setPlayerName('Alice');
      expect(spy).toHaveBeenCalledWith('Alice');
    });
  });
});
```

### Integration Test Scenarios

```typescript
describe('URL Sharing Integration', () => {
  it('should share game state via URL after multiple moves', async () => {
    const { makeMove, getShareUrl } = renderGame();

    // Make 5 moves
    await makeMove([0, 0], [0, 1]);
    await makeMove([2, 2], [2, 1]);
    await makeMove([0, 1], [1, 1]);
    await makeMove([2, 1], [1, 1]); // Capture
    await makeMove([1, 1], [1, 2]);

    const shareUrl = getShareUrl();

    // Open in new browser context
    const { getGameState } = renderGameWithUrl(shareUrl);
    const restoredState = getGameState();

    expect(restoredState.currentTurn).toBe(5);
    expect(restoredState.moveHistory).toHaveLength(5);
  });

  it('should NOT restore game after refresh without URL', async () => {
    const { makeMove, refresh, getGameState } = renderGame();

    await makeMove([0, 0], [0, 1]);

    // Refresh without URL in address bar
    await refresh();

    const state = getGameState();
    expect(state.currentTurn).toBe(0); // Fresh game
    expect(state.moveHistory).toHaveLength(0);
  });
});
```

### E2E Test Scenarios

```typescript
test('URL sharing flow', async ({ page, context }) => {
  await page.goto('/');

  // Start game
  await page.click('[data-testid="hotseat-mode"]');
  await page.click('[data-testid="start-game"]');

  // Make moves
  await page.click('[data-testid="cell-0-0"]');
  await page.click('[data-testid="cell-0-1"]');
  await page.click('[data-testid="confirm-move"]');

  // Get share URL
  const shareUrl = await page.evaluate(() => window.location.href);
  expect(shareUrl).toContain('#');

  // Open in new tab
  const newPage = await context.newPage();
  await newPage.goto(shareUrl);

  // Verify game restored
  const turn = await newPage.textContent('[data-testid="current-turn"]');
  expect(turn).toBe('Turn 1');
});

test('refresh behavior without URL', async ({ page }) => {
  await page.goto('/');

  // Start game and make move
  await page.click('[data-testid="hotseat-mode"]');
  await page.click('[data-testid="start-game"]');
  await page.click('[data-testid="cell-0-0"]');
  await page.click('[data-testid="cell-0-1"]');
  await page.click('[data-testid="confirm-move"]');

  // Refresh (address bar cleared)
  await page.goto('/');

  // Should be fresh game
  const mode = await page.textContent('[data-testid="mode-selection"]');
  expect(mode).toContain('Select Mode');
});
```

---

## Rollback Strategy

### Quick Rollback (if caught early)

```bash
# Rollback all changes
git restore src/lib/urlEncoding/*.ts
git restore src/App.tsx
git restore src/lib/storage/localStorage.ts
git restore src/lib/gameFlow/reducer.ts

# Verify rollback
pnpm run check
pnpm test
```

### Partial Rollback (if some changes are good)

```bash
# Keep type changes, rollback App.tsx only
git restore src/App.tsx

# Keep URL builder changes, rollback parser
git restore src/lib/urlEncoding/urlParser.ts
```

### Feature Flag Approach (for gradual rollout)

```typescript
// Add feature flag in App.tsx
const USE_FULL_STATE_URLS = import.meta.env.VITE_FULL_STATE_URLS === 'true';

if (USE_FULL_STATE_URLS) {
  // New: Always full_state
  updateUrlImmediate({ type: 'full_state', gameState, playerName });
} else {
  // Old: Delta vs full_state
  if (isFirstMove) {
    // ... full_state logic
  } else {
    // ... delta logic
  }
}
```

---

## Success Criteria

### Functional Requirements

- ✅ Every move generates full_state URL
- ✅ URLs can be shared and restore game correctly
- ✅ Game does NOT restore after refresh without URL
- ✅ Player names ARE remembered across sessions
- ✅ UI preferences ARE persisted
- ✅ Back/forward navigation works
- ✅ Victory screen URL sharing works

### Technical Requirements

- ✅ All tests pass (unit, integration, E2E)
- ✅ Type checking passes with no errors
- ✅ Linting passes with no warnings
- ✅ Production build succeeds
- ✅ Bundle size does not increase significantly
- ✅ No localStorage writes for game state
- ✅ URL length stays under 2000 characters

### Code Quality

- ✅ Removed ~485 lines of delta logic
- ✅ No dead code or unused imports
- ✅ Test coverage maintains 92%+
- ✅ No console.log statements left in code
- ✅ All TypeScript strict mode checks pass

---

## Performance Impact

### URL Size Comparison

| Scenario | Delta URL | Full State URL | Increase |
|----------|-----------|----------------|----------|
| Move 1 | N/A | ~700 chars | N/A |
| Move 2 | ~80 chars | ~720 chars | 800% |
| Move 10 | ~80 chars | ~850 chars | 962% |
| Move 50 | ~80 chars | ~1400 chars | 1650% |

**Mitigation**: lz-string compression reduces full state URLs by 66-88%

### Memory Usage

- **Before**: Game state in memory + localStorage (duplicate)
- **After**: Game state in memory only (single source)
- **Impact**: Slight memory reduction (~50KB per game)

### Network Impact

- **URL sharing bandwidth**: Increased by ~600 bytes per share
- **Hash fragment**: Not sent to server, client-side only
- **Impact**: Negligible for peer-to-peer sharing

---

## Security Considerations

### Data Exposure

- ✅ Hash fragments are not sent to server
- ✅ Compression obscures game state (not encryption)
- ⚠️ Full state URLs reveal complete game history
- ✅ No sensitive data in game state (just piece positions)

### localStorage Persistence

- ✅ Removing game state from localStorage reduces attack surface
- ✅ Player names in localStorage are non-sensitive
- ✅ No personal data stored

---

## Documentation Updates Needed

1. **README.md**: Update URL sharing documentation
2. **ARCHITECTURE.md**: Document stateless game architecture
3. **CONTRIBUTING.md**: Update testing guidelines
4. **API.md**: Remove delta payload documentation

---

## Estimated Timeline

| Phase | Tasks | Time | Risk |
|-------|-------|------|------|
| Phase 1: Types | 3 tasks | 1 hour | Low |
| Phase 2: App Logic | 3 tasks | 2 hours | High |
| Phase 3: localStorage | 1 task | 30 min | Low |
| Phase 4: Tests | 5 tasks | 1.5 hours | Low |
| Phase 5: Validation | All levels | 1 hour | Medium |

**Total**: 6 hours (with buffer for debugging)

---

## Open Questions

1. **Should we add a "Save Game" button** that explicitly saves URL to browser history?
2. **Should we warn users before refresh** if there's an active game?
3. **Should we keep old delta URLs working** for backwards compatibility?
4. **Should we add URL length validation** and show error if > 2000 chars?

---

## Notes

- Compression is critical - test with maximum game states
- Browser back/forward must be thoroughly tested
- Consider UX impact of refresh behavior change
- Monitor URL length in production
- Document breaking change in release notes

---

## Checklist

### Before Starting

- [ ] Read entire PRP
- [ ] Understand delta vs full_state current implementation
- [ ] Review test strategy
- [ ] Set up feature branch: `git checkout -b refactor/full-state-urls`

### During Implementation

- [ ] Complete Phase 1 (Types)
- [ ] Validate Level 1 (Syntax)
- [ ] Complete Phase 2 (App Logic)
- [ ] Validate Level 2 (Unit Tests)
- [ ] Complete Phase 3 (localStorage)
- [ ] Complete Phase 4 (Tests)
- [ ] Validate Level 3 (Integration)
- [ ] Validate Level 4 (E2E)
- [ ] Validate Level 5 (Production Build)

### After Implementation

- [ ] All tests pass
- [ ] Manual testing complete
- [ ] Documentation updated
- [ ] PR created with detailed description
- [ ] Code review requested

---

**Remember**: This is a **breaking change** for users who rely on localStorage game state restoration. Consider:
1. **Communication**: Announce in release notes
2. **Migration**: Provide tool to export current game as URL?
3. **Feature Flag**: Allow gradual rollout if needed
