# Task PRP: Fix Pawn Symbol Emoji Rendering (Issue #26)

**Created**: 2025-10-20
**Issue**: https://github.com/randallard/kings-cooking/issues/26
**Type**: Bug Fix
**Scope**: Unicode symbol correction
**Complexity**: Low
**Risk**: Low

---

## Goal

Fix pawn symbol inconsistency where light player pawns render as 3D emoji graphic instead of flat chess symbols, while maintaining visual consistency with other pieces.

---

## Why

**Business Value**:
- Eliminates visual inconsistency confusing players
- Ensures consistent piece appearance across all browsers/fonts
- Maintains professional game aesthetics

**User Impact**:
- Light player pawns currently display as 3D emoji (♟ with emoji variant)
- Other pieces use flat chess symbols consistently
- Creates jarring visual mismatch during gameplay

**Technical Debt**:
- Incorrect unicode character selection allows emoji rendering
- No tests exist to prevent unicode symbol regression

---

## What

### User-Visible Behavior

**Before**:
- Light player pawns: 3D emoji graphic (♟ U+265F with emoji variant)
- Dark player pawns: Flat symbol (♙ U+2659)
- Visual inconsistency with other pieces

**After**:
- Light player pawns: Flat symbol (♙ U+2659)
- Dark player pawns: Flat symbol (♟ U+265F)
- Consistent with all other pieces (light=filled, dark=outline)

### Technical Requirements

1. **Swap pawn unicode symbols**
   - Light: '♙' (U+2659 WHITE CHESS PAWN) instead of '♟' (U+265F)
   - Dark: '♟' (U+265F BLACK CHESS PAWN) instead of '♙' (U+2659)

2. **Update all pawn symbol definitions**
   - `PIECE_POOL` in `src/lib/pieceSelection/types.ts`
   - `PIECE_UNICODE` in `src/components/game/GameCell.tsx`
   - `PIECE_UNICODE` in `src/components/game/CourtArea.tsx`
   - `getPieceSymbol()` in `src/components/game/VictoryScreen.tsx`

3. **Add regression tests**
   - Verify pawn unicode codepoints are correct
   - Test both light and dark player pawns
   - Prevent future unicode reversals

4. **Maintain consistency**
   - Follow light=filled, dark=outline pattern
   - Match existing piece symbol conventions

---

## All Needed Context

### Unicode Chess Symbols Reference

```
Current (BROKEN):
  Light pawn: '♟' U+265F BLACK CHESS PAWN (has emoji variant → 3D graphic)
  Dark pawn:  '♙' U+2659 WHITE CHESS PAWN

Fixed (CORRECT):
  Light pawn: '♙' U+2659 WHITE CHESS PAWN (no emoji variant)
  Dark pawn:  '♟' U+265F BLACK CHESS PAWN

Other pieces (CORRECT pattern):
  Light: ♜ ♞ ♝ ♛ (filled/solid)
  Dark:  ♖ ♘ ♗ ♕ (outline/hollow)
```

### Affected Files

1. **src/lib/pieceSelection/types.ts** (line 56)
   ```typescript
   pawn: { max: 8, unicode: { light: '♟', dark: '♙' } }, // WRONG
   ```

2. **src/components/game/GameCell.tsx** (line 141)
   ```typescript
   pawn: { light: '♟', dark: '♙' }, // WRONG
   ```

3. **src/components/game/CourtArea.tsx** (line 34)
   ```typescript
   pawn: { light: '♟', dark: '♙' }, // WRONG
   ```

4. **src/components/game/VictoryScreen.tsx** (line 173)
   ```typescript
   pawn: '♙', // INCOMPLETE - doesn't differentiate light/dark
   ```

### Test Coverage Gaps

**Missing Tests**:
- No tests verify pawn unicode codepoints
- No tests check light vs dark pawn symbols
- No regression tests for unicode symbol consistency

**Existing Test Files**:
- `src/lib/pieceSelection/types.test.ts` - tests PIECE_POOL
- `src/components/game/GameCell.test.tsx` - tests GameCell rendering
- `src/components/game/VictoryScreen.test.tsx` - tests victory screen

### Documentation

**Pattern Reference**: All other pieces use:
- Light (Player 1): Filled symbols (♜ ♞ ♝ ♛)
- Dark (Player 2): Outline symbols (♖ ♘ ♗ ♕)

**React Patterns**: Reference `/home/ryankhetlyr/Development/kings-cooking/claude_md_files/CLAUDE-REACT.md`

### Gotchas

1. **Emoji Variants**: U+265F has an emoji presentation selector that causes 3D rendering
2. **VictoryScreen Bug**: Currently only shows '♙' for ALL pawns (separate issue)
3. **Test Coverage**: No existing tests prevent this regression
4. **Browser Differences**: Emoji rendering varies by browser/OS

---

## Implementation Blueprint

### Task Sequence (TDD: Red → Green → Refactor)

#### Task 1: Write Failing Test (RED)

**File**: `src/lib/pieceSelection/types.test.ts`

```typescript
// ADD: Test for correct pawn unicode codepoints
describe('PIECE_POOL pawn unicode', () => {
  it('should use U+2659 for light pawn (no emoji variant)', () => {
    const lightPawn = PIECE_POOL.pawn.unicode.light;
    expect(lightPawn.codePointAt(0)).toBe(0x2659); // ♙ WHITE CHESS PAWN
  });

  it('should use U+265F for dark pawn', () => {
    const darkPawn = PIECE_POOL.pawn.unicode.dark;
    expect(darkPawn.codePointAt(0)).toBe(0x265F); // ♟ BLACK CHESS PAWN
  });

  it('should follow light=filled, dark=outline pattern', () => {
    // Light pawn should match pattern of other light pieces (filled)
    const lightPawn = PIECE_POOL.pawn.unicode.light;
    const lightRook = PIECE_POOL.rook.unicode.light;

    // Both should be "filled" style (lower codepoints in chess unicode block)
    expect(lightPawn.codePointAt(0)).toBeLessThan(0x2660);
    expect(lightRook.codePointAt(0)).toBeLessThan(0x2660);
  });
});
```

**Validation**:
```bash
pnpm test src/lib/pieceSelection/types.test.ts
```

**Expected**: Tests FAIL (pawn symbols are reversed)

**IF_FAIL**: Check test is correctly written, verify PIECE_POOL import

---

#### Task 2: Fix PIECE_POOL (GREEN)

**File**: `src/lib/pieceSelection/types.ts`

**Action**: Update line 56

**BEFORE**:
```typescript
pawn: { max: 8, unicode: { light: '♟', dark: '♙' } },
```

**AFTER**:
```typescript
pawn: { max: 8, unicode: { light: '♙', dark: '♟' } },
```

**Validation**:
```bash
pnpm test src/lib/pieceSelection/types.test.ts
```

**Expected**: Tests PASS

**IF_FAIL**:
- Verify unicode characters are correct
- Check for copy-paste encoding issues
- Run `echo '♙' | xxd` to verify U+2659

---

#### Task 3: Fix GameCell Component

**File**: `src/components/game/GameCell.tsx`

**Action**: Update line 141

**BEFORE**:
```typescript
pawn: { light: '♟', dark: '♙' },
```

**AFTER**:
```typescript
pawn: { light: '♙', dark: '♟' },
```

**Validation**:
```bash
pnpm test src/components/game/GameCell.test.tsx
```

**Expected**: All existing tests PASS

**IF_FAIL**: Check for test failures related to pawn rendering

---

#### Task 4: Fix CourtArea Component

**File**: `src/components/game/CourtArea.tsx`

**Action**: Update line 34

**BEFORE**:
```typescript
pawn: { light: '♟', dark: '♙' },
```

**AFTER**:
```typescript
pawn: { light: '♙', dark: '♟' },
```

**Validation**:
```bash
pnpm test src/components/game/CourtArea.test.tsx
```

**Expected**: All tests PASS

**IF_FAIL**: Check CourtArea rendering tests

---

#### Task 5: Fix VictoryScreen Component

**File**: `src/components/game/VictoryScreen.tsx`

**Action**: Update getPieceSymbol function (lines 166-176)

**BEFORE**:
```typescript
const getPieceSymbol = (piece: Piece): string => {
  const symbols: Record<string, string> = {
    king: '♔',
    queen: '♕',
    rook: '♖',
    bishop: '♗',
    knight: '♘',
    pawn: '♙',
  };
  return symbols[piece.type] || '?';
};
```

**AFTER**:
```typescript
const getPieceSymbol = (piece: Piece): string => {
  const symbols: Record<PieceType, { light: string; dark: string }> = {
    king: { light: '♔', dark: '♚' },
    queen: { light: '♕', dark: '♛' },
    rook: { light: '♖', dark: '♜' },
    bishop: { light: '♗', dark: '♝' },
    knight: { light: '♘', dark: '♞' },
    pawn: { light: '♙', dark: '♟' },
  };
  return symbols[piece.type]?.[piece.owner] || '?';
};
```

**Validation**:
```bash
pnpm test src/components/game/VictoryScreen.test.tsx
```

**Expected**: All tests PASS

**IF_FAIL**:
- Check PieceType import
- Verify piece.owner is 'light' or 'dark'
- Test with actual victory screen

---

#### Task 6: Add Regression Tests

**File**: `src/components/game/GameCell.test.tsx`

**Action**: Add unicode verification tests

```typescript
describe('Pawn unicode symbols', () => {
  it('should render light pawn with U+2659 (no emoji variant)', () => {
    const lightPawn: Piece = {
      type: 'pawn',
      owner: 'light',
      position: [0, 0],
      moveCount: 0,
      id: 'test-light-pawn',
    };

    const { container } = render(
      <GameCell
        position={[0, 0]}
        piece={lightPawn}
        isValidMove={false}
        isSelected={false}
        isLastMoveFrom={false}
        isLastMoveTo={false}
        onClick={() => {}}
      />
    );

    const symbol = container.querySelector('[data-testid="piece-symbol"]')?.textContent;
    expect(symbol?.codePointAt(0)).toBe(0x2659); // ♙
  });

  it('should render dark pawn with U+265F', () => {
    const darkPawn: Piece = {
      type: 'pawn',
      owner: 'dark',
      position: [0, 0],
      moveCount: 0,
      id: 'test-dark-pawn',
    };

    const { container } = render(
      <GameCell
        position={[0, 0]}
        piece={darkPawn}
        isValidMove={false}
        isSelected={false}
        isLastMoveFrom={false}
        isLastMoveTo={false}
        onClick={() => {}}
      />
    );

    const symbol = container.querySelector('[data-testid="piece-symbol"]')?.textContent;
    expect(symbol?.codePointAt(0)).toBe(0x265F); // ♟
  });
});
```

**Note**: May need to add `data-testid="piece-symbol"` to piece span in GameCell.tsx

**Validation**:
```bash
pnpm test src/components/game/GameCell.test.tsx
```

**Expected**: Tests PASS

**IF_FAIL**:
- Verify data-testid is added to GameCell
- Check querySelector path
- Verify textContent extraction

---

#### Task 7: Run All Tests (REFACTOR)

**Validation**:
```bash
pnpm test
```

**Expected**: All 826+ tests PASS

**IF_FAIL**:
- Identify failing test
- Check if unicode change broke anything
- Review error messages

---

#### Task 8: Type Checking

**Validation**:
```bash
pnpm run check
```

**Expected**: No TypeScript errors

**IF_FAIL**:
- Check PieceType import in VictoryScreen
- Verify symbol map types are correct

---

#### Task 9: Build Verification

**Validation**:
```bash
pnpm build
```

**Expected**: Build succeeds

**IF_FAIL**:
- Check for type errors in production build
- Verify all imports resolve

---

#### Task 10: Manual Testing

**Test Plan**:

1. Start game in hot-seat mode
2. Select piece picker
3. Add pawns to both players
4. Verify light player pawns display as ♙ (flat, not 3D emoji)
5. Verify dark player pawns display as ♟ (flat)
6. Complete game and check victory screen pawn symbols
7. Check court area pawn symbols

**Expected**:
- All pawns render as flat chess symbols
- No 3D emoji graphics
- Consistent with other pieces

**IF_FAIL**:
- Check browser dev tools for unicode rendering
- Verify emoji variant selector is not present
- Test in different browsers (Chrome, Firefox, Safari)

---

## Validation Loop

### Level 1: Unit Tests
```bash
pnpm test src/lib/pieceSelection/types.test.ts
pnpm test src/components/game/GameCell.test.tsx
pnpm test src/components/game/CourtArea.test.tsx
pnpm test src/components/game/VictoryScreen.test.tsx
```

### Level 2: All Tests
```bash
pnpm test
```

### Level 3: Type Checking
```bash
pnpm run check
```

### Level 4: Build
```bash
pnpm build
```

### Level 5: Manual Testing
- Start game
- Add pawns via piece picker
- Verify symbols are flat (not 3D emoji)
- Check victory screen

---

## Rollback Strategy

### Quick Rollback
```bash
git checkout HEAD -- src/lib/pieceSelection/types.ts src/components/game/GameCell.tsx src/components/game/CourtArea.tsx src/components/game/VictoryScreen.tsx
```

### If Tests Fail
1. Revert symbol changes
2. Verify original tests pass
3. Review unicode character encoding
4. Re-apply changes carefully

### If Build Fails
1. Check TypeScript errors
2. Verify all imports
3. Ensure PieceType is correctly imported in VictoryScreen

---

## Success Criteria

- ✅ Light player pawns render as ♙ (U+2659) flat symbol
- ✅ Dark player pawns render as ♟ (U+265F) flat symbol
- ✅ No 3D emoji graphics appear
- ✅ Visual consistency with all other pieces
- ✅ All tests pass (826+ tests)
- ✅ TypeScript compiles without errors
- ✅ Production build succeeds
- ✅ Regression tests prevent future reversals

---

## Risk Assessment

**Risk Level**: LOW

**Potential Issues**:
- Browser font differences (low risk - using standard unicode)
- Copy-paste encoding issues (medium risk - verify unicode)
- Test failures (low risk - isolated change)

**Mitigation**:
- Verify unicode codepoints with `codePointAt()`
- Add regression tests
- Test in multiple browsers
- Check for emoji variant selectors

---

## Notes

- Issue reported by user: "ponds have 3-D graphic"
- Affects light player consistently
- Root cause: U+265F has emoji variant presentation
- Fix: Use U+2659 for light (no emoji variant)
- Bonus: Fix VictoryScreen to respect light/dark (currently broken)
- Pattern: light=filled, dark=outline (matches all other pieces)

---

## Definition of Done

- [ ] All 4 files updated with correct pawn unicode
- [ ] Regression tests added
- [ ] All existing tests pass
- [ ] TypeScript compiles
- [ ] Production build succeeds
- [ ] Manual testing confirms flat symbols
- [ ] No 3D emoji graphics
- [ ] VictoryScreen respects light/dark pawns
- [ ] Code committed with conventional commit message
- [ ] PR created with test plan
