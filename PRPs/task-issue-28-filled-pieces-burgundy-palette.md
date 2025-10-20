# Task PRP: Use Filled Pieces with Burgundy/Cream Palette

**Issue**: #28
**Type**: Task (Refactoring + Feature)
**Status**: Draft
**Created**: 2025-10-20

## Goal

Replace light/dark symbol variants with filled pieces everywhere, using CSS color to differentiate piece ownership. Apply burgundy/cream color palette for view-mode-agnostic styling.

## Why

- **Consistency**: Eliminate unicode rendering inconsistencies between filled/unfilled symbols
- **Simplicity**: Single symbol per piece type, color-based ownership
- **Theme Support**: Fixed color palette works in both light and dark view modes
- **User Experience**: Clear visual distinction with burgundy/cream aesthetic

## What (User-Visible Behavior)

### Before
- Pieces use different unicode symbols based on owner (light=filled ♜, dark=unfilled ♖)
- Board colors change based on light/dark theme
- Pawn symbol inconsistent with other pieces

### After
- All pieces use filled symbols: ♜ ♞ ♝ ♛ ♟
- Piece color indicates ownership:
  - Dark pieces: `#3E0401` (darker burgundy)
  - Light pieces: `#BDB5A8` (cream)
- Board square colors (fixed across themes):
  - Dark squares: `#580101` (burgundy)
  - Light squares: `#554200` (brownish gold)
- CSS `font-variant-emoji: text` prevents emoji rendering

## Context

### Documentation

**React 19 Patterns**: `/home/ryankhetlyr/Development/kings-cooking/claude_md_files/CLAUDE-REACT.md`
- CSS Modules with `composes`
- Component prop typing
- Test patterns

**CSS Custom Properties**: Already in use
- See `GameCell.module.css` lines 13-18 for existing pattern
- Use CSS variables for colors with fallbacks

### Current Implementation

**PIECE_POOL Structure** (`src/lib/pieceSelection/types.ts:51-57`):
```typescript
export const PIECE_POOL = {
  rook: { max: 2, unicode: { light: '♜', dark: '♖' } },
  knight: { max: 2, unicode: { light: '♞', dark: '♘' } },
  bishop: { max: 2, unicode: { light: '♝', dark: '♗' } },
  queen: { max: 1, unicode: { light: '♛', dark: '♕' } },
  pawn: { max: 8, unicode: { light: '♟', dark: '♙' } },
} as const;
```

**Component Pattern** (`src/components/game/GameCell.tsx:136-150`):
```typescript
const PIECE_UNICODE: Record<string, { light: string; dark: string }> = {
  rook: { light: '♜', dark: '♖' },
  // ...
};

function getPieceUnicode(piece: Piece): string {
  const pieceType = PIECE_UNICODE[piece.type];
  return pieceType[piece.owner];
}
```

### Affected Files (8 TypeScript + 5 CSS)

**TypeScript/TSX**:
1. `src/lib/pieceSelection/types.ts` - PIECE_POOL definition
2. `src/components/game/GameCell.tsx` - PIECE_UNICODE + rendering
3. `src/components/game/CourtArea.tsx` - PIECE_UNICODE
4. `src/components/game/VictoryScreen.tsx` - getPieceSymbol()
5. `src/components/game/PiecePickerModal.tsx` - Uses PIECE_POOL
6. `src/lib/pieceSelection/types.test.ts` - PIECE_POOL tests
7. `src/components/game/GameCell.test.tsx` - Piece rendering tests
8. `src/components/game/CourtArea.test.tsx` - Court piece tests
9. `src/components/game/VictoryScreen.test.tsx` - Victory piece tests
10. `src/components/game/PiecePickerModal.test.tsx` - Picker tests

**CSS Modules**:
1. `src/components/game/GameCell.module.css` - Board squares + piece styling
2. `src/components/game/CourtArea.module.css` - Court piece styling
3. `src/components/game/VictoryScreen.module.css` - Victory piece styling
4. `src/components/game/PiecePickerModal.module.css` - Picker piece styling
5. `src/components/game/PieceSelectionScreen.module.css` - Selection piece styling (if needed)

### Gotchas

1. **TypeScript Const Assertion**: PIECE_POOL uses `as const` - changing structure breaks type inference
   - **Fix**: Keep same shape, just change value from `{light, dark}` to single string
   - **Impact**: Type `PiecePoolType` will need updating

2. **Test Expectations**: Many tests check for specific symbols
   - **Fix**: Update all test expectations to filled symbols only
   - **Scope**: ~100+ test assertions across 4 test files

3. **CSS Specificity**: Dark mode overrides currently in GameCell.module.css
   - **Fix**: Remove/replace with fixed color scheme
   - **Risk**: May affect other components if they rely on theme variables

4. **Font Emoji Rendering**: Some browsers render chess unicode as emoji
   - **Fix**: Add `font-variant-emoji: text` to all piece displays
   - **Browser Support**: Works in modern browsers, graceful degradation

5. **Color Prop Application**: Need to pass owner to CSS
   - **Fix**: Use data attributes or class names (`.lightPiece`, `.darkPiece`)
   - **Pattern**: Similar to existing `.lightSquare`, `.darkSquare`

## Implementation Blueprint

### TDD Workflow: Red → Green → Refactor

#### **Task 1: Write Failing Tests (RED)**

**File**: `src/lib/pieceSelection/types.test.ts`

**Action**: Add tests for new PIECE_POOL structure
```typescript
describe('PIECE_POOL - Filled Symbols Only', () => {
  it('should use filled symbols for all pieces', () => {
    expect(PIECE_POOL.rook.unicode).toBe('♜');
    expect(PIECE_POOL.knight.unicode).toBe('♞');
    expect(PIECE_POOL.bishop.unicode).toBe('♝');
    expect(PIECE_POOL.queen.unicode).toBe('♛');
    expect(PIECE_POOL.pawn.unicode).toBe('♟');
  });

  it('should have correct unicode codepoints', () => {
    expect(PIECE_POOL.rook.unicode.codePointAt(0)).toBe(0x265C);
    expect(PIECE_POOL.knight.unicode.codePointAt(0)).toBe(0x265E);
    expect(PIECE_POOL.bishop.unicode.codePointAt(0)).toBe(0x265D);
    expect(PIECE_POOL.queen.unicode.codePointAt(0)).toBe(0x265B);
    expect(PIECE_POOL.pawn.unicode.codePointAt(0)).toBe(0x265F);
  });
});
```

**Validate**: `pnpm test types.test.ts`
**Expected**: Tests FAIL (PIECE_POOL still has {light, dark} structure)

**IF_FAIL**: Tests don't run
- Check test file syntax
- Verify imports

**ROLLBACK**: `git checkout src/lib/pieceSelection/types.test.ts`

---

#### **Task 2: Update PIECE_POOL Structure (GREEN)**

**File**: `src/lib/pieceSelection/types.ts`

**Action**: Change unicode from object to string
```typescript
export const PIECE_POOL = {
  rook: { max: 2, unicode: '♜' },
  knight: { max: 2, unicode: '♞' },
  bishop: { max: 2, unicode: '♝' },
  queen: { max: 1, unicode: '♛' },
  pawn: { max: 8, unicode: '♟' },
} as const;
```

**Validate**: `pnpm run check && pnpm test types.test.ts`
**Expected**:
- TypeScript errors in files using `.unicode.light` or `.unicode.dark`
- types.test.ts passes

**IF_FAIL**: TypeScript won't compile
- Check for syntax errors in PIECE_POOL
- Verify `as const` is present

**ROLLBACK**: `git checkout src/lib/pieceSelection/types.ts`

---

#### **Task 3: Update GameCell Component (GREEN)**

**File**: `src/components/game/GameCell.tsx`

**Action 1**: Update PIECE_UNICODE to use single symbol
```typescript
// Remove this constant entirely
// const PIECE_UNICODE: Record<string, { light: string; dark: string }> = { ... };

// Replace getPieceUnicode with direct PIECE_POOL access
import { PIECE_POOL } from '@/lib/pieceSelection/types';

function getPieceUnicode(piece: Piece): string {
  const pieceData = PIECE_POOL[piece.type];
  if (!pieceData) return '?';
  return pieceData.unicode;
}
```

**Action 2**: Add CSS class for piece color in JSX
```typescript
// In the piece span element
<span
  className={`${styles.piece} ${piece.owner === 'light' ? styles.lightPiece : styles.darkPiece}`}
  aria-hidden="true"
>
  {pieceChar}
</span>
```

**Validate**: `pnpm run check`
**Expected**: TypeScript compiles successfully

**IF_FAIL**: Type errors
- Check PIECE_POOL import
- Verify piece.type is valid key

**ROLLBACK**: `git checkout src/components/game/GameCell.tsx`

---

#### **Task 4: Update GameCell CSS (GREEN)**

**File**: `src/components/game/GameCell.module.css`

**Action 1**: Add piece color classes
```css
/* Add after line 52 (.piece class) */
.lightPiece {
  color: var(--color-piece-light, #BDB5A8);
  font-variant-emoji: text;
}

.darkPiece {
  color: var(--color-piece-dark, #3E0401);
  font-variant-emoji: text;
}
```

**Action 2**: Update board square colors
```css
/* Replace lines 12-18 */
.lightSquare {
  background-color: var(--bg-board-light, #554200);
}

.darkSquare {
  background-color: var(--bg-board-dark, #580101);
}
```

**Action 3**: Remove dark mode overrides
```css
/* DELETE lines 68-94 (dark mode @media rules) */
/* Keep only fixed color scheme */
```

**Validate**: `pnpm build`
**Expected**: Build succeeds, CSS compiles

**IF_FAIL**: CSS syntax errors
- Check for missing semicolons
- Verify hex color codes

**ROLLBACK**: `git checkout src/components/game/GameCell.module.css`

---

#### **Task 5: Update GameCell Tests (GREEN)**

**File**: `src/components/game/GameCell.test.tsx`

**Action**: Update all symbol expectations to filled
```typescript
// Find and replace:
// '♖' → '♜' (rook)
// '♘' → '♞' (knight)
// '♗' → '♝' (bishop)
// '♕' → '♛' (queen)
// '♙' → '♟' (pawn)

// Example (lines 45, 156, etc.):
expect(screen.getByText('♜')).toBeInTheDocument(); // Rook (filled)
expect(screen.getByText('♞')).toBeInTheDocument(); // Knight (filled)
```

**Validate**: `pnpm test GameCell.test.tsx`
**Expected**: All GameCell tests pass

**IF_FAIL**: Symbol not found
- Check actual rendering with `screen.debug()`
- Verify CSS class names applied

**ROLLBACK**: `git checkout src/components/game/GameCell.test.tsx`

---

#### **Task 6: Update CourtArea Component (GREEN)**

**File**: `src/components/game/CourtArea.tsx`

**Action 1**: Update PIECE_UNICODE (lines 28-35)
```typescript
// Remove PIECE_UNICODE constant, use PIECE_POOL directly
import { PIECE_POOL } from '@/lib/pieceSelection/types';

function getPieceIcon(piece: Piece): string {
  const pieceData = PIECE_POOL[piece.type];
  if (!pieceData) return '?';
  return pieceData.unicode;
}
```

**Action 2**: Add CSS class to piece spans (lines 104-110, 124-130)
```typescript
<span
  className={`${styles.pieceIcon} ${piece.owner === 'light' ? styles.lightPiece : styles.darkPiece}`}
  title={`${piece.owner} ${piece.type}`}
>
  {getPieceIcon(piece)}
</span>
```

**Validate**: `pnpm run check`
**Expected**: TypeScript compiles

**ROLLBACK**: `git checkout src/components/game/CourtArea.tsx`

---

#### **Task 7: Update CourtArea CSS (GREEN)**

**File**: `src/components/game/CourtArea.module.css`

**Action**: Add piece color classes
```css
/* Add at end of file */
.lightPiece {
  color: var(--color-piece-light, #BDB5A8);
  font-variant-emoji: text;
}

.darkPiece {
  color: var(--color-piece-dark, #3E0401);
  font-variant-emoji: text;
}
```

**Validate**: `pnpm build`
**Expected**: Build succeeds

**ROLLBACK**: `git checkout src/components/game/CourtArea.module.css`

---

#### **Task 8: Update CourtArea Tests (GREEN)**

**File**: `src/components/game/CourtArea.test.tsx`

**Action**: Update symbol expectations to filled (same replacements as Task 5)

**Validate**: `pnpm test CourtArea.test.tsx`
**Expected**: All tests pass

**ROLLBACK**: `git checkout src/components/game/CourtArea.test.tsx`

---

#### **Task 9: Update VictoryScreen Component (GREEN)**

**File**: `src/components/game/VictoryScreen.tsx`

**Action 1**: Update getPieceSymbol() (lines 165-176)
```typescript
import { PIECE_POOL } from '@/lib/pieceSelection/types';

const getPieceSymbol = (piece: Piece): string => {
  const pieceData = PIECE_POOL[piece.type];
  if (!pieceData) return '?';
  return pieceData.unicode;
};
```

**Action 2**: Add CSS class to piece spans (lines 250, 265, 278, 297, 311, 325)
```typescript
<span
  className={`${styles.piece} ${piece.owner === 'light' ? styles.lightPiece : styles.darkPiece}`}
  title={piece.type}
>
  {getPieceSymbol(piece)}
</span>
```

**Validate**: `pnpm run check`
**Expected**: TypeScript compiles

**ROLLBACK**: `git checkout src/components/game/VictoryScreen.tsx`

---

#### **Task 10: Update VictoryScreen CSS (GREEN)**

**File**: `src/components/game/VictoryScreen.module.css`

**Action**: Add piece color classes
```css
/* Add at end of file */
.lightPiece {
  color: var(--color-piece-light, #BDB5A8);
  font-variant-emoji: text;
}

.darkPiece {
  color: var(--color-piece-dark, #3E0401);
  font-variant-emoji: text;
}
```

**Validate**: `pnpm build`
**Expected**: Build succeeds

**ROLLBACK**: `git checkout src/components/game/VictoryScreen.module.css`

---

#### **Task 11: Update VictoryScreen Tests (GREEN)**

**File**: `src/components/game/VictoryScreen.test.tsx`

**Action**: Update symbol expectations to filled

**Validate**: `pnpm test VictoryScreen.test.tsx`
**Expected**: All tests pass

**ROLLBACK**: `git checkout src/components/game/VictoryScreen.test.tsx`

---

#### **Task 12: Update PiecePickerModal Component (GREEN)**

**File**: `src/components/game/PiecePickerModal.tsx`

**Action**: Update piece display (line 158)
```typescript
<span className={styles.pieceIcon} aria-hidden="true">
  {pieceData.unicode}
</span>
```
*Note*: No `.light` or `.dark` access needed - single symbol now

**Validate**: `pnpm run check`
**Expected**: TypeScript compiles

**ROLLBACK**: `git checkout src/components/game/PiecePickerModal.tsx`

---

#### **Task 13: Update PiecePickerModal CSS (GREEN)**

**File**: `src/components/game/PiecePickerModal.module.css`

**Action**: Add font-variant-emoji to .pieceIcon
```css
.pieceIcon {
  font-size: 2rem;
  margin-bottom: 0.5rem;
  font-variant-emoji: text; /* Add this line */
}
```

**Validate**: `pnpm build`
**Expected**: Build succeeds

**ROLLBACK**: `git checkout src/components/game/PiecePickerModal.module.css`

---

#### **Task 14: Update PiecePickerModal Tests (GREEN)**

**File**: `src/components/game/PiecePickerModal.test.tsx`

**Action**: Update symbol expectations (lines 146-150)
```typescript
expect(screen.getByText('♜')).toBeInTheDocument(); // Rook (filled)
expect(screen.getByText('♞')).toBeInTheDocument(); // Knight (filled)
expect(screen.getByText('♝')).toBeInTheDocument(); // Bishop (filled)
expect(screen.getByText('♛')).toBeInTheDocument(); // Queen (filled)
expect(screen.getByText('♟')).toBeInTheDocument(); // Pawn (filled)
```

**Validate**: `pnpm test PiecePickerModal.test.tsx`
**Expected**: All tests pass

**ROLLBACK**: `git checkout src/components/game/PiecePickerModal.test.tsx`

---

#### **Task 15: Run Full Test Suite (REFACTOR)**

**Action**: Run all tests to verify no regressions

**Validate**: `pnpm test`
**Expected**: All 829+ tests pass

**IF_FAIL**:
- Check test output for specific failures
- Look for missed symbol replacements
- Verify CSS class names match

**ROLLBACK**:
```bash
git checkout src/lib/pieceSelection/types.ts \
  src/components/game/GameCell.* \
  src/components/game/CourtArea.* \
  src/components/game/VictoryScreen.* \
  src/components/game/PiecePickerModal.*
```

---

#### **Task 16: TypeScript Type Checking (REFACTOR)**

**Action**: Verify no type errors

**Validate**: `pnpm run check:types`
**Expected**: No type errors

**IF_FAIL**:
- Check for missed `.unicode.light`/`.unicode.dark` accesses
- Verify PIECE_POOL type inference correct

**ROLLBACK**: Full rollback from Task 15

---

#### **Task 17: Production Build (REFACTOR)**

**Action**: Verify production build succeeds

**Validate**: `pnpm build`
**Expected**: Build succeeds, no warnings

**IF_FAIL**:
- Check for CSS syntax errors
- Verify all imports resolve

**ROLLBACK**: Full rollback from Task 15

---

#### **Task 18: Manual Visual Testing (REFACTOR)**

**Action**: Test in browser with hot reload

**Test Cases**:
1. Start hot-seat game with pawns
2. Verify light pawns show as ♟ with cream color (#BDB5A8)
3. Verify dark pawns show as ♟ with dark burgundy color (#3E0401)
4. Check board squares: dark #580101, light #554200
5. Verify no emoji rendering (should be flat text symbols)
6. Test piece picker modal - all symbols filled
7. Test victory screen - all symbols filled with correct colors
8. Test court areas - all symbols filled with correct colors

**IF_FAIL**:
- Check browser console for errors
- Verify CSS classes applied (browser dev tools)
- Check `font-variant-emoji` support

**ROLLBACK**: Full rollback from Task 15

---

## Validation Loop

### Level 1: Syntax & Types
```bash
pnpm run check && pnpm run check:types
```
**Expected**: No TypeScript errors

### Level 2: Unit Tests
```bash
pnpm test
```
**Expected**: All tests pass (829+)

### Level 3: Build
```bash
pnpm build
```
**Expected**: Production build succeeds

### Level 4: Manual Testing
- Visual inspection in browser
- Test all piece types render correctly
- Verify colors match spec
- Check no emoji rendering

## Success Criteria

- [ ] All pieces use filled symbols (♜ ♞ ♝ ♛ ♟)
- [ ] Piece colors correctly applied (dark #3E0401, light #BDB5A8)
- [ ] Board square colors updated (dark #580101, light #554200)
- [ ] `font-variant-emoji: text` on all piece displays
- [ ] All tests passing (829+)
- [ ] TypeScript compiles with no errors
- [ ] Production build succeeds
- [ ] No emoji rendering in any browser
- [ ] Colors work in both light/dark view modes

## Rollback Strategy

### Per-Task Rollback
Each task includes specific rollback command

### Full Rollback
```bash
git checkout issue-28-align-pawn-unicode-and-theme-support
git reset --hard HEAD~1  # If committed
```

### Emergency Rollback
```bash
git stash
git checkout main
```

## Notes

- **Performance**: No impact expected (same rendering, just different symbols/colors)
- **Security**: No security implications
- **Accessibility**: Improved - `font-variant-emoji: text` ensures consistent screen reader pronunciation
- **Browser Support**: `font-variant-emoji` supported in modern browsers, graceful degradation in older browsers

## Related Issues

- Issue #26 - Pawn emoji rendering (original problem)
- Issue #28 - This implementation
