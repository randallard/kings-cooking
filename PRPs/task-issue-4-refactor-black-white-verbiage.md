# Task PRP: Refactor 'white'/'black' to 'light'/'dark' Throughout Codebase

**Issue:** #4 - [REFACTOR] Refactor Black and White verbiage
**Type:** System-wide refactoring
**Scope:** ~40 TypeScript/TSX files + 7 CSS files + documentation
**Priority:** Low (nice to have)
**Impact:** Breaking change - requires localStorage clear

---

## Goal

Replace all occurrences of 'white'/'black' terminology with 'light'/'dark' throughout the codebase for better semantic clarity and inclusivity while maintaining all game functionality.

---

## Why

- **Better semantics**: 'Light' and 'Dark' better represent the visual distinction (hollow vs filled pieces)
- **Inclusivity**: Removes potentially problematic racial terminology
- **Clarity**: Aligns with the visual representation (light=hollow, dark=filled)
- **Dark mode compatibility**: Makes CSS variable naming more intuitive

---

## What (User-Visible Changes)

### Before
- UI text: "White" and "Black" for players
- Chess pieces: ♖ (white rook), ♜ (black rook)
- Victory screen: "White wins!" / "Black wins!"

### After
- UI text: "Light" and "Dark" for players
- Chess pieces: ♖ (light rook), ♜ (dark rook) - **SAME SYMBOLS**
- Victory screen: "Light wins!" / "Dark wins!"
- **Note**: Existing saved games will be cleared on first load

---

## All Needed Context

### Decision Record (from Issue Discussion)

1. **Scope**: Option B - Complete refactor (all internal types, variables, AND user-facing text)
2. **Unicode symbols**: Option D - Keep current symbols (hollow for light, filled for dark)
3. **localStorage**: Option B - Clear all on first load (clean slate)

### Files Affected (32 TypeScript + 7 CSS + docs)

**Core Type Definitions:**
- `src/lib/validation/schemas.ts` - PieceOwnerSchema (line 63)
- `src/lib/chess/types.ts` - Victory types
- `src/types/gameFlow.ts` - All game flow states

**Chess Engine:**
- `src/lib/chess/KingsChessEngine.ts`
- `src/lib/chess/pieceMovement.ts`
- `src/lib/chess/moveValidation.ts`
- `src/lib/chess/victoryConditions.ts`

**Game Flow:**
- `src/lib/gameFlow/reducer.ts`
- `src/App.tsx`

**Components:**
- `src/components/game/GameBoard.tsx`
- `src/components/game/GameCell.tsx`
- `src/components/game/VictoryScreen.tsx`
- `src/components/game/HandoffScreen.tsx`
- `src/components/game/CourtArea.tsx`
- `src/components/game/OffBoardButton.tsx`
- `src/components/HistoryViewer.tsx`
- `src/components/HistoryComparisonModal.tsx`

**URL Encoding & History:**
- `src/lib/urlEncoding/playerNames.ts`
- `src/lib/urlEncoding/urlBuilder.ts`
- `src/lib/history/types.ts`
- `src/lib/history/storage.ts`

**CSS Files:**
- `src/index.css` - Root CSS variables
- `src/components/game/GameBoard.module.css`
- `src/components/game/VictoryScreen.module.css`
- `src/components/game/HandoffScreen.module.css`
- `src/components/game/OffBoardButton.module.css`
- `src/components/game/MoveConfirmButton.module.css`
- `src/components/game/URLSharer.module.css`

**Test Files (all):**
- All `*.test.ts` and `*.test.tsx` files (32 files)

**Documentation:**
- `CLAUDE.md`
- `README.md`
- `PRD.md`
- `kings-cooking-docs/*.md`

### Key Patterns

**Type changes:**
```typescript
// BEFORE
export const PieceOwnerSchema = z.enum(['white', 'black']);
export type PieceOwner = z.infer<typeof PieceOwnerSchema>;

// AFTER
export const PieceOwnerSchema = z.enum(['light', 'dark']);
export type PieceOwner = z.infer<typeof PieceOwnerSchema>;
```

**Variable naming:**
```typescript
// BEFORE
currentPlayer: 'white' | 'black'
whitePlayer: PlayerInfo
blackPlayer: PlayerInfo
whiteCourt: Piece[]

// AFTER
currentPlayer: 'light' | 'dark'
lightPlayer: PlayerInfo
darkPlayer: PlayerInfo
lightCourt: Piece[]
```

**UI text:**
```typescript
// BEFORE
<div>White wins!</div>

// AFTER
<div>Light wins!</div>
```

**CSS variables:**
```css
/* BEFORE */
--white-piece-color: #333;
--black-piece-color: #000;

/* AFTER */
--light-piece-color: #333;
--dark-piece-color: #000;
```

### Gotchas

1. **TypeScript strict mode**: All type changes will cause compilation errors until ALL files are updated
2. **Test dependencies**: Tests depend on schemas, so schema changes will break tests immediately
3. **URL backward compatibility**: URLs with old format should still parse correctly
4. **Chess Unicode symbols**: The Unicode standard calls them "white" and "dark" pieces - we're keeping the symbols but renaming our references
5. **localStorage**: Existing saved games use 'white'/'black' - will cause parse errors if not cleared
6. **CSS class names**: Some may use `.white-` or `.black-` prefixes

---

## Implementation Blueprint

### Phase 1: Setup & localStorage Migration (TDD Red)

**Task 1.1: Add localStorage version check and clear logic**
```typescript
// ACTION: src/lib/storage/localStorage.ts
// Add version constant and migration function

const STORAGE_VERSION = '2.0.0'; // Increment from 1.0.0
const VERSION_KEY = 'kings-cooking-version';

export function checkAndMigrateStorage(): boolean {
  const currentVersion = localStorage.getItem(VERSION_KEY);

  if (!currentVersion || currentVersion < STORAGE_VERSION) {
    // Clear all game data
    localStorage.removeItem('kings-cooking-game-state');
    localStorage.removeItem('kings-cooking-game-mode');
    localStorage.removeItem('kings-cooking-player1-name');
    localStorage.removeItem('kings-cooking-player2-name');
    // Keep story flags and dark mode preference
    localStorage.setItem(VERSION_KEY, STORAGE_VERSION);
    return true; // Migration performed
  }

  return false; // No migration needed
}

// VALIDATE: pnpm test src/lib/storage/localStorage.test.ts
// IF_FAIL: Check localStorage keys match exactly
// ROLLBACK: Remove version check code
```

**Task 1.2: Call migration on app startup**
```typescript
// ACTION: src/App.tsx
// Add migration call in useEffect before state restoration

useEffect(() => {
  const migrated = checkAndMigrateStorage();
  if (migrated) {
    console.log('Storage migrated to v2.0.0 - cleared old game data');
  }

  // ... existing restoration logic
}, []);

// VALIDATE: Manual test - check console log appears on first load
// IF_FAIL: Verify useEffect runs before state restoration
// ROLLBACK: Remove migration call
```

---

### Phase 2: Core Type Definitions (TDD Red → Green)

**Task 2.1: Update PieceOwnerSchema in schemas.ts**
```typescript
// ACTION: src/lib/validation/schemas.ts (line 63)
// CHANGE:
export const PieceOwnerSchema = z.enum(['white', 'black']);

// TO:
export const PieceOwnerSchema = z.enum(['light', 'dark']);

// UPDATE JSDOC:
/**
 * Piece owner (color).
 * Light always starts first.
 */

// VALIDATE: pnpm run check (expect ~500 errors across codebase)
// IF_FAIL: Revert change, TypeScript not installed correctly
// ROLLBACK: git checkout src/lib/validation/schemas.ts
```

**Task 2.2: Update chess engine types**
```typescript
// ACTION: src/lib/chess/types.ts
// CHANGE all 'white' | 'black' to 'light' | 'dark'

export interface VictoryResult {
  gameOver: boolean;
  winner?: 'light' | 'dark' | null;  // Changed from 'white' | 'black'
  score?: {
    light: number;  // Changed from white
    dark: number;   // Changed from black
  };
  reason?: string;
}

// VALIDATE: pnpm run check (errors should remain ~500)
// IF_FAIL: Check for typos in type definitions
// ROLLBACK: git checkout src/lib/chess/types.ts
```

**Task 2.3: Update game flow types**
```typescript
// ACTION: src/types/gameFlow.ts
// CHANGE all player color references

// Find and replace:
// - currentPlayer: 'white' | 'black' → 'light' | 'dark'
// - winner: 'white' | 'black' | 'draw' → 'light' | 'dark' | 'draw'
// - All JSDoc comments mentioning "White" or "Black"

// VALIDATE: pnpm run check (errors ~500, should not increase)
// IF_FAIL: Ensure all type union members updated
// ROLLBACK: git checkout src/types/gameFlow.ts
```

---

### Phase 3: Chess Engine Implementation (TDD Green)

**Task 3.1: Update KingsChessEngine.ts**
```typescript
// ACTION: src/lib/chess/KingsChessEngine.ts
// SYSTEMATIC FIND/REPLACE:

// Variable names:
whitePlayer → lightPlayer
blackPlayer → darkPlayer
whiteCourt → lightCourt
blackCourt → darkCourt
whiteRook → lightRook
blackRook → darkRook
whiteKnight → lightKnight
blackKnight → darkKnight
whiteBishop → lightBishop
blackBishop → darkBishop
capturedWhite → capturedLight
capturedBlack → capturedDark

// String literals:
'white' → 'light'
'black' → 'dark'

// Comments and JSDoc:
White → Light
Black → Dark
white → light
black → dark

// SPECIAL CASE - Unicode comments:
// Keep: ♖ ♘ ♗ (light pieces - hollow)
// Keep: ♜ ♞ ♝ (dark pieces - filled)

// VALIDATE: pnpm run check && pnpm test src/lib/chess/KingsChessEngine.test.ts
// IF_FAIL: Search for remaining 'white' or 'black' in file
// ROLLBACK: git checkout src/lib/chess/KingsChessEngine.ts
```

**Task 3.2: Update pieceMovement.ts**
```typescript
// ACTION: src/lib/chess/pieceMovement.ts
// Find/replace all color references in:
// - Function parameters
// - Return values
// - Comments
// - Type annotations

// VALIDATE: pnpm test src/lib/chess/pieceMovement.test.ts
// IF_FAIL: Check piece owner comparisons
// ROLLBACK: git checkout src/lib/chess/pieceMovement.ts
```

**Task 3.3: Update moveValidation.ts**
```typescript
// ACTION: src/lib/chess/moveValidation.ts
// Update all color checks and comparisons

// VALIDATE: pnpm run check
// IF_FAIL: Review validation logic for hardcoded strings
// ROLLBACK: git checkout src/lib/chess/moveValidation.ts
```

**Task 3.4: Update victoryConditions.ts**
```typescript
// ACTION: src/lib/chess/victoryConditions.ts
// Update victory detection logic and return values

// VALIDATE: pnpm test src/lib/chess/victoryConditions.test.ts
// IF_FAIL: Check winner assignment logic
// ROLLBACK: git checkout src/lib/chess/victoryConditions.ts
```

---

### Phase 4: Game Flow & State Management (TDD Green)

**Task 4.1: Update gameFlow reducer**
```typescript
// ACTION: src/lib/gameFlow/reducer.ts
// Update all state transitions and player references

// Key changes:
// - GAME_OVER action winner: 'white' | 'black' → 'light' | 'dark'
// - Victory phase state
// - All player name logic

// VALIDATE: pnpm test src/lib/gameFlow/reducer.test.ts
// IF_FAIL: Check discriminated union types
// ROLLBACK: git checkout src/lib/gameFlow/reducer.ts
```

**Task 4.2: Update App.tsx**
```typescript
// ACTION: src/App.tsx
// Update all UI text and player references

// Text changes:
"White" → "Light"
"Black" → "Dark"
"white" → "light"
"black" → "dark"

// Variable names:
// Keep player1Name/player2Name (these are user-entered names)
// Update currentPlayer comparisons

// VALIDATE: pnpm test src/App.test.tsx
// IF_FAIL: Check conditional rendering logic
// ROLLBACK: git checkout src/App.tsx
```

---

### Phase 5: UI Components (TDD Green)

**Task 5.1: Update GameBoard.tsx**
```typescript
// ACTION: src/components/game/GameBoard.tsx
// Update piece rendering and player indicators

// VALIDATE: pnpm test src/components/game/GameBoard.test.tsx
// IF_FAIL: Check piece symbol rendering
// ROLLBACK: git checkout src/components/game/GameBoard.tsx
```

**Task 5.2: Update VictoryScreen.tsx**
```typescript
// ACTION: src/components/game/VictoryScreen.tsx
// Update victory messages and UI text

// Key text:
"White wins!" → "Light wins!"
"Black wins!" → "Dark wins!"
"White Court" → "Light Court"
"Black Court" → "Dark Court"

// VALIDATE: pnpm test src/components/game/VictoryScreen.test.tsx
// IF_FAIL: Check winner prop type
// ROLLBACK: git checkout src/components/game/VictoryScreen.tsx
```

**Task 5.3: Update HandoffScreen.tsx**
```typescript
// ACTION: src/components/game/HandoffScreen.tsx
// Update player transition messages

// VALIDATE: pnpm test src/components/game/HandoffScreen.test.tsx (if exists)
// IF_FAIL: Check player color props
// ROLLBACK: git checkout src/components/game/HandoffScreen.tsx
```

**Task 5.4: Update CourtArea.tsx**
```typescript
// ACTION: src/components/game/CourtArea.tsx
// Update court labels and piece counts

// VALIDATE: pnpm test src/components/game/CourtArea.test.tsx
// IF_FAIL: Check aria-labels
// ROLLBACK: git checkout src/components/game/CourtArea.tsx
```

**Task 5.5: Update OffBoardButton.tsx**
```typescript
// ACTION: src/components/game/OffBoardButton.tsx
// Update button text and aria-labels

// VALIDATE: pnpm run check
// IF_FAIL: Check accessibility attributes
// ROLLBACK: git checkout src/components/game/OffBoardButton.tsx
```

**Task 5.6: Update GameCell.tsx**
```typescript
// ACTION: src/components/game/GameCell.tsx
// Update piece owner references

// VALIDATE: pnpm test src/components/game/GameCell.test.tsx
// IF_FAIL: Check piece rendering logic
// ROLLBACK: git checkout src/components/game/GameCell.tsx
```

**Task 5.7: Update ModeSelector.tsx**
```typescript
// ACTION: src/components/game/ModeSelector.tsx
// Update game instructions and examples

// Text changes in instructions:
// "White pieces" → "Light pieces"
// "Black pieces" → "Dark pieces"

// VALIDATE: pnpm test src/components/game/ModeSelector.test.tsx (if exists)
// IF_FAIL: Check instructional text
// ROLLBACK: git checkout src/components/game/ModeSelector.tsx
```

**Task 5.8: Update StoryPanel.tsx**
```typescript
// ACTION: src/components/game/StoryPanel.tsx
// Update story narrative

// Story changes:
// "Dark King" → Keep (this is narrative flavor)
// "Light King" → Keep (this is narrative flavor)
// "White pieces" → "Light pieces"
// "Black pieces" → "Dark pieces"

// VALIDATE: Manual review of story text
// IF_FAIL: Revert narrative changes
// ROLLBACK: git checkout src/components/game/StoryPanel.tsx
```

---

### Phase 6: URL Encoding & History (TDD Green)

**Task 6.1: Add backward compatibility to URL parser**
```typescript
// ACTION: src/lib/urlEncoding/urlParser.ts
// Add migration logic to convert old URLs

// Add helper function:
function migratePlayerColor(color: string): 'light' | 'dark' {
  if (color === 'white') return 'light';
  if (color === 'black') return 'dark';
  return color as 'light' | 'dark';
}

// Apply in parseFullState and parseDelta:
// gameState.currentPlayer = migratePlayerColor(parsed.currentPlayer);
// piece.owner = migratePlayerColor(piece.owner);

// VALIDATE: pnpm test src/lib/urlEncoding/urlParser.test.ts
// Add test case with old 'white'/'black' URL
// IF_FAIL: Check migration logic placement
// ROLLBACK: git checkout src/lib/urlEncoding/urlParser.ts
```

**Task 6.2: Update playerNames.ts**
```typescript
// ACTION: src/lib/urlEncoding/playerNames.ts
// Update player name extraction logic

// VALIDATE: pnpm test src/lib/urlEncoding/playerNames.test.ts
// IF_FAIL: Check regex patterns
// ROLLBACK: git checkout src/lib/urlEncoding/playerNames.ts
```

**Task 6.3: Update history types and storage**
```typescript
// ACTION: src/lib/history/types.ts
// Update HistoryEntry types

// ACTION: src/lib/history/storage.ts
// Update storage logic

// VALIDATE: pnpm test src/lib/history/storage.test.ts
// IF_FAIL: Check schema validation
// ROLLBACK: git checkout src/lib/history/types.ts src/lib/history/storage.ts
```

---

### Phase 7: CSS Updates (Visual Polish)

**Task 7.1: Update root CSS variables**
```css
/* ACTION: src/index.css */
/* CHANGE: */
--white-piece-color → --light-piece-color
--black-piece-color → --dark-piece-color
--white-court-bg → --light-court-bg
--black-court-bg → --dark-court-bg

/* Keep dark mode detection as-is */
@media (prefers-color-scheme: dark) {
  /* Update variable values but not detection logic */
}

/* VALIDATE: pnpm dev, visual inspection in both light/dark modes */
/* IF_FAIL: Check CSS variable references in components */
/* ROLLBACK: git checkout src/index.css */
```

**Task 7.2: Update component CSS modules**
```css
/* ACTION: All *.module.css files */
/* Find/replace class names: */
.white- → .light-
.black- → .dark-
.whitePiece → .lightPiece
.blackPiece → .darkPiece

/* FILES: */
/* - src/components/game/GameBoard.module.css */
/* - src/components/game/VictoryScreen.module.css */
/* - src/components/game/HandoffScreen.module.css */
/* - src/components/game/OffBoardButton.module.css */
/* - src/components/game/MoveConfirmButton.module.css */
/* - src/components/game/URLSharer.module.css */

/* VALIDATE: pnpm dev, visual inspection */
/* IF_FAIL: Check for orphaned CSS class references */
/* ROLLBACK: git checkout src/components/game/*.module.css */
```

---

### Phase 8: Test Updates (TDD Green)

**Task 8.1: Update all test files systematically**
```typescript
// ACTION: All *.test.ts and *.test.tsx files (32 files)
// SYSTEMATIC FIND/REPLACE in each file:

// Test data:
'white' → 'light'
'black' → 'dark'
whitePlayer → lightPlayer
blackPlayer → darkPlayer
whiteCourt → lightCourt
blackCourt → darkCourt

// Test descriptions:
"white" → "light"
"black" → "dark"
"White" → "Light"
"Black" → "Dark"

// Expected values in assertions:
expect(winner).toBe('white') → expect(winner).toBe('light')
expect(winner).toBe('black') → expect(winner).toBe('dark')

// PROCESS:
// 1. Update schema tests first: src/lib/validation/schemas.test.ts
// 2. Update chess engine tests: src/lib/chess/*.test.ts (4 files)
// 3. Update game flow tests: src/lib/gameFlow/reducer.test.ts
// 4. Update component tests: src/components/**/*.test.tsx (8 files)
// 5. Update URL/history tests: src/lib/urlEncoding/*.test.ts, src/lib/history/*.test.ts

// VALIDATE AFTER EACH FILE: pnpm test {file}
// IF_FAIL: Check for hardcoded 'white'/'black' in assertions
// ROLLBACK: git checkout {file}
```

**Task 8.2: Add backward compatibility tests**
```typescript
// ACTION: Create new test in src/lib/urlEncoding/urlParser.test.ts
describe('Backward compatibility', () => {
  it('should parse old URLs with white/black', () => {
    // Create URL with old format
    const oldUrl = buildOldFormatUrl(); // Helper to create pre-refactor URL

    // Should parse and migrate
    const result = parseUrlPayload(oldUrl);

    expect(result.gameState.currentPlayer).toBe('light');
    expect(result.gameState.lightPlayer).toBeDefined();
    expect(result.gameState.darkPlayer).toBeDefined();
  });
});

// VALIDATE: pnpm test src/lib/urlEncoding/urlParser.test.ts
// IF_FAIL: Check migration logic
// ROLLBACK: Remove test
```

---

### Phase 9: Documentation Updates

**Task 9.1: Update CLAUDE.md**
```markdown
<!-- ACTION: CLAUDE.md -->
<!-- Find/replace: -->
- "White pieces" → "Light pieces"
- "Black pieces" → "Dark pieces"
- "white" player → "light" player
- "black" player → "dark" player
- ♖ ♘ ♗ (white) → ♖ ♘ ♗ (light - hollow)
- ♜ ♞ ♝ (black) → ♜ ♞ ♝ (dark - filled)

<!-- VALIDATE: Manual review -->
<!-- IF_FAIL: Check for missed references -->
<!-- ROLLBACK: git checkout CLAUDE.md -->
```

**Task 9.2: Update README.md**
```markdown
<!-- ACTION: README.md -->
<!-- Update all game examples and code snippets -->
<!-- Find/replace same patterns as CLAUDE.md -->

<!-- VALIDATE: Manual review -->
<!-- IF_FAIL: Check code examples -->
<!-- ROLLBACK: git checkout README.md -->
```

**Task 9.3: Update PRD.md**
```markdown
<!-- ACTION: PRD.md -->
<!-- Update game rules and technical specs -->
<!-- Update board diagrams: -->
[♜][♞][♝]  ← Black's starting row → [♜][♞][♝]  ← Dark's starting row (filled)
[♖][♘][♗]  ← White's starting row → [♖][♘][♗]  ← Light's starting row (hollow)

<!-- VALIDATE: Manual review -->
<!-- IF_FAIL: Check diagrams render correctly -->
<!-- ROLLBACK: git checkout PRD.md -->
```

**Task 9.4: Update kings-cooking-docs/**
```markdown
<!-- ACTION: kings-cooking-docs/*.md -->
<!-- Update all technical documentation -->
<!-- Files: -->
<!-- - chess_engine_typescript_patterns.md -->
<!-- - DARK_MODE_GUIDE.md -->
<!-- - kings-cooking.md -->
<!-- - NAME_COLLECTION_PATTERN.md -->

<!-- VALIDATE: Manual review -->
<!-- IF_FAIL: Check technical accuracy -->
<!-- ROLLBACK: git checkout kings-cooking-docs/ -->
```

---

### Phase 10: Final Validation & Integration

**Task 10.1: Run full validation suite**
```bash
# VALIDATE ALL:

# Level 1: Type checking
pnpm run check
# EXPECT: 0 errors

# Level 2: Linting
pnpm run lint
# EXPECT: 0 warnings

# Level 3: Unit tests
pnpm test
# EXPECT: All 612+ tests passing

# Level 4: Integration tests
pnpm test:integration
# EXPECT: All passing

# Level 5: Build
pnpm build
# EXPECT: Successful build

# IF_FAIL: Review failed step, check for missed references
# ROLLBACK: git reset --hard HEAD
```

**Task 10.2: Manual testing checklist**
```
□ Start new game in hot-seat mode
  □ Light player name displays correctly
  □ Dark player name displays correctly
  □ Piece symbols correct (♖ for light, ♜ for dark)
  □ Turn indicator shows "Light" / "Dark"
  □ Court labels show "Light Court" / "Dark Court"

□ Start new game in URL mode
  □ Share URL generates correctly
  □ Opponent can load URL
  □ Player colors displayed correctly

□ Complete a game
  □ Victory screen shows correct winner ("Light wins!" or "Dark wins!")
  □ Court statistics correct
  □ Share result URL works

□ Test dark mode
  □ Toggle OS dark mode
  □ Piece colors have proper contrast
  □ Court areas visible
  □ All text readable

□ Test localStorage migration
  □ Clear browser data
  □ Load app
  □ Check console for migration message
  □ Start game, verify storage works

□ Test backward compatibility (if possible)
  □ Load old URL with 'white'/'black'
  □ Verify automatic migration
  □ Game should work normally

# IF_FAIL: Document issue, fix and re-test
```

**Task 10.3: Performance check**
```bash
# Run performance audit
pnpm build
pnpm preview

# Check bundle size (should not increase significantly)
ls -lh dist/assets/*.js

# Lighthouse audit
# - Performance: Should remain 90+
# - Accessibility: Should remain 100
# - Best Practices: Should remain 100

# IF_FAIL: Investigate bundle size increase
# ROLLBACK: Optimize or revert
```

---

## Validation Loop

### Level 1: Syntax & Style
```bash
pnpm run check && pnpm run lint
```
**EXPECT:** 0 TypeScript errors, 0 ESLint warnings

### Level 2: Unit Tests
```bash
pnpm test
```
**EXPECT:** All 612+ tests passing with 94%+ coverage

### Level 3: Integration Tests
```bash
pnpm test:integration
```
**EXPECT:** All integration tests passing

### Level 4: E2E Tests
```bash
pnpm test:e2e
```
**EXPECT:** All E2E tests passing

### Level 5: Build & Preview
```bash
pnpm build && pnpm preview
```
**EXPECT:** Successful build, manual testing passes

---

## Rollback Strategy

### Complete Rollback
```bash
git checkout issue-4-refactor-black-white-verbiage
git reset --hard origin/main
```

### Partial Rollback (by phase)
```bash
# Phase 2: Types
git checkout src/lib/validation/schemas.ts src/lib/chess/types.ts src/types/gameFlow.ts

# Phase 3: Chess Engine
git checkout src/lib/chess/

# Phase 4: Game Flow
git checkout src/lib/gameFlow/ src/App.tsx

# Phase 5: Components
git checkout src/components/

# Phase 6: URL/History
git checkout src/lib/urlEncoding/ src/lib/history/

# Phase 7: CSS
git checkout src/**/*.css

# Phase 8: Tests
git checkout src/**/*.test.ts src/**/*.test.tsx

# Phase 9: Docs
git checkout *.md kings-cooking-docs/
```

---

## Success Criteria

✅ All TypeScript errors resolved (0 errors)
✅ All ESLint warnings resolved (0 warnings)
✅ All 612+ tests passing
✅ 94%+ test coverage maintained
✅ Successful production build
✅ Manual testing checklist complete
✅ No visual regressions in light/dark modes
✅ localStorage migration working
✅ Backward compatible URL parsing
✅ Documentation updated
✅ PR approved and merged

---

## Estimated Effort

- **Phase 1 (Setup):** 30 minutes
- **Phase 2 (Types):** 15 minutes
- **Phase 3 (Chess Engine):** 1 hour
- **Phase 4 (Game Flow):** 45 minutes
- **Phase 5 (Components):** 2 hours
- **Phase 6 (URL/History):** 1 hour
- **Phase 7 (CSS):** 30 minutes
- **Phase 8 (Tests):** 2 hours
- **Phase 9 (Docs):** 1 hour
- **Phase 10 (Validation):** 1 hour

**Total:** ~10 hours of focused work

---

## Notes

- This is a **breaking change** that requires localStorage clear
- All existing saved games will be lost
- URLs with old format will be automatically migrated
- Unicode piece symbols remain unchanged (semantic name vs visual representation)
- CSS variables updated for better dark mode support
- Follow TDD: Red → Green → Refactor throughout

---

**READY FOR APPROVAL** ✅
