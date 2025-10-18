# Task PRP: Remove Story/Instructions from ModeSelector and Add Header to StoryPanel

**Created**: 2025-10-17
**Type**: Task (Focused Changes)
**Status**: Ready for Execution
**Related Issues**: Follow-up to Issue #3 (collapsible story panel)

---

## Goal

Remove the story and instructions sections from the mode selection screen (ModeSelector component), and add a header "The Story" to the story panel overlay on the game screen (StoryPanel component).

---

## Why

**Business Value**: Cleaner, more focused mode selection screen that doesn't duplicate content now available in the StoryPanel overlay.

**User Impact**:
- Users see a streamlined mode selection screen without story/instructions clutter
- Story/instructions remain accessible via the overlay panel on the game screen
- Better visual hierarchy with clear "The Story" header on the overlay

**Context**: The story and instructions were previously shown on the mode selection screen. With the new collapsible StoryPanel feature (Issue #3), this content is now duplicated. Removing it from ModeSelector reduces cognitive load and improves the user experience.

---

## What (User-Visible Behavior)

### Before
- **Mode Selection Screen**: Shows story section, instructions section, then mode buttons
- **Story Panel Overlay**: Shows story and instructions without a header

### After
- **Mode Selection Screen**: Shows ONLY title and mode selection buttons (no story/instructions)
- **Story Panel Overlay**: Shows "The Story" header above story and instructions sections

---

## All Needed Context

### Documentation & Patterns

**React 19 Patterns**: Reference `/home/ryankhetlyr/Development/kings-cooking/claude_md_files/CLAUDE-REACT.md`
- Component props must be typed with interfaces
- Use `ReactElement` return type
- Follow TDD: Red → Green → Refactor

**CSS Module Patterns**:
- Scoped styles with dark mode support
- Mobile-responsive design
- WCAG 2.1 AA accessibility

**Test Patterns**:
- Unit tests with Vitest and @testing-library/react
- Test rendering, accessibility, user interactions
- Maintain 80%+ code coverage

### Existing Code Patterns

**ModeSelector Component** (`src/components/game/ModeSelector.tsx`):
- Currently includes story section (lines 37-53) and instructions section (lines 55-65)
- Story section uses `.storySection` class with ARIA label "Game story"
- Instructions section uses `.instructionsSection` class with ARIA label "How to play"
- Both sections have corresponding CSS in `ModeSelector.module.css`

**StoryPanel Component** (`src/components/game/StoryPanel.tsx`):
- Modal overlay with close button (line 105-113)
- Story section starts at line 116
- Instructions section starts at line 135
- Currently has `<h2>` for "How to Play" but no header for the story section

**Test Files**:
- `ModeSelector.test.tsx` has 52 tests covering story/instructions sections (lines 189-311)
- `StoryPanel.test.tsx` has 24 tests, no header-specific tests yet

### Gotchas

1. **Test Updates Required**: Removing story/instructions from ModeSelector will break 52 existing tests
   - Tests explicitly check for story content (lines 189-241)
   - Tests check for instructions content (lines 243-310)
   - Must remove/update these tests or all tests will fail

2. **Heading Hierarchy**: Adding "The Story" header to StoryPanel
   - Currently uses `<h2>` for "How to Play" instructions (line 136)
   - Need to add `<h1>` or `<h2>` for "The Story" to maintain proper hierarchy
   - ARIA labelledby currently points to "story-panel-title" (line 100) which is the instructions title
   - May need to update ARIA labels for clarity

3. **CSS Cleanup**: Story/instructions CSS in `ModeSelector.module.css` can be removed
   - `.storySection` (lines 70-79)
   - `.instructionsSection` (lines 106-114)
   - Related classes: `.stageDirection`, `.dialogue`, `.scrollSignature`, `.instructionsTitle`, `.instructionsList`
   - Dark mode and mobile responsive styles (lines 140-220)

4. **Accessibility**:
   - ARIA labels must remain accurate after header addition
   - Heading hierarchy must be semantically correct (h1 > h2 > h3)
   - Screen reader announcements should make sense with new header

---

## Implementation Blueprint

### Task 1: Update StoryPanel Component - Add "The Story" Header

**File**: `src/components/game/StoryPanel.tsx`

**Changes**:
```typescript
// ADD: Main header above story section (after close button, before story section)
<h1 id="story-panel-main-title" className={styles.mainTitle}>
  The Story
</h1>

// KEEP: Story section (no changes to content)
<section className={styles.storySection} aria-label="Game story">
  {/* existing story content */}
</section>

// KEEP: Instructions section (no changes)
<section className={styles.instructionsSection} aria-label="How to play">
  <h2 id="story-panel-title" className={styles.instructionsTitle}>
    How to Play
  </h2>
  {/* existing instructions content */}
</section>

// UPDATE: ARIA labelledby to reference new main header
<div
  className={styles.overlay}
  role="dialog"
  aria-modal="true"
  aria-labelledby="story-panel-main-title"  // Changed from "story-panel-title"
  aria-describedby="story-panel-description"
>
```

**Why**:
- Adds clear "The Story" header to panel
- Maintains proper heading hierarchy (h1 for main title, h2 for subsections)
- Updates ARIA labelledby to reference the main title for better screen reader experience

**Validation**:
```bash
pnpm run check:types  # TypeScript validation
pnpm test -- StoryPanel.test  # Run StoryPanel tests
```

**If Fail**:
- Check for TypeScript errors in component
- Verify ARIA IDs match between header and dialog container
- Ensure className references exist in CSS module

**Rollback**:
```bash
git checkout src/components/game/StoryPanel.tsx
```

---

### Task 2: Update StoryPanel CSS - Add Main Title Styles

**File**: `src/components/game/StoryPanel.module.css`

**Changes**:
```css
/* ADD: Main title styling (after closeButton styles, before storySection) */
.mainTitle {
  font-size: var(--font-size-xl, 1.5rem);
  font-weight: 700;
  margin: 0 0 var(--spacing-lg, 1.5rem) 0;
  color: var(--text-primary, #212529);
  text-align: center;
}

/* Mobile optimization for main title */
@media (max-width: 768px) {
  .mainTitle {
    font-size: var(--font-size-lg, 1.25rem);
    margin-bottom: var(--spacing-md, 1rem);
  }
}
```

**Why**:
- Consistent with existing component styles
- Responsive design for mobile
- Uses CSS custom properties for theme support

**Validation**:
```bash
pnpm run check:lint  # ESLint/Stylelint validation
pnpm build  # Verify CSS compiles correctly
```

**If Fail**:
- Check for CSS syntax errors
- Verify custom properties are defined
- Check for duplicate class names

**Rollback**:
```bash
git checkout src/components/game/StoryPanel.module.css
```

---

### Task 3: Update StoryPanel Tests - Add Header Tests

**File**: `src/components/game/StoryPanel.test.tsx`

**Changes**:
```typescript
// ADD: New describe block after "Story Section" tests
describe('Main Title', () => {
  it('should render "The Story" main title', () => {
    render(<StoryPanel isOpen={true} onClose={vi.fn()} />);

    const mainTitle = screen.getByRole('heading', { name: /the story/i, level: 1 });
    expect(mainTitle).toBeInTheDocument();
  });

  it('should have correct heading hierarchy (h1 for main title, h2 for subsections)', () => {
    render(<StoryPanel isOpen={true} onClose={vi.fn()} />);

    const h1 = screen.getByRole('heading', { level: 1 });
    const h2 = screen.getByRole('heading', { level: 2 });

    expect(h1).toHaveTextContent(/the story/i);
    expect(h2).toHaveTextContent(/how to play/i);
  });

  it('should use main title for aria-labelledby', () => {
    render(<StoryPanel isOpen={true} onClose={vi.fn()} />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-labelledby', 'story-panel-main-title');
  });
});
```

**Why**:
- Validates new header rendering
- Ensures proper heading hierarchy
- Verifies ARIA label correctness

**Validation**:
```bash
pnpm test -- StoryPanel.test  # Run tests
```

**If Fail**:
- Check test assertions match actual implementation
- Verify heading levels are correct
- Check ARIA attribute values

**Rollback**:
```bash
git checkout src/components/game/StoryPanel.test.tsx
```

---

### Task 4: Remove Story/Instructions from ModeSelector Component

**File**: `src/components/game/ModeSelector.tsx`

**Changes**:
```typescript
// REMOVE: Lines 37-53 (entire story section)
// REMOVE: Lines 55-65 (entire instructions section)

// KEEP: Title, subtitle, mode buttons
export function ModeSelector({ onModeSelected }: ModeSelectorProps): ReactElement {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>King's Cooking Chess</h1>

      <h3 className={styles.subtitle}>Choose Your Game Mode:</h3>

      <div className={styles.buttonContainer}>
        {/* mode buttons - unchanged */}
      </div>
    </div>
  );
}
```

**Why**:
- Removes duplicate content now available in StoryPanel
- Simplifies mode selection screen
- Reduces cognitive load for users

**Validation**:
```bash
pnpm run check:types  # TypeScript validation
```

**If Fail**:
- Check for accidental removal of other code
- Verify component still renders correctly
- Ensure props and return type unchanged

**Rollback**:
```bash
git checkout src/components/game/ModeSelector.tsx
```

---

### Task 5: Update ModeSelector Tests - Remove Story/Instructions Tests

**File**: `src/components/game/ModeSelector.test.tsx`

**Changes**:
```typescript
// REMOVE: Lines 189-311 (entire "Story and Instructions" describe block)
// This includes:
// - describe('Story and Instructions')
//   - describe('Story Section') - 11 tests
//   - describe('Instructions Section') - 11 tests

// UPDATE: Accessibility test for heading hierarchy (lines 153-172)
it('should have proper heading hierarchy', () => {
  render(<ModeSelector onModeSelected={vi.fn()} />);

  const h1 = screen.getByRole('heading', { level: 1 });
  const h3s = screen.getAllByRole('heading', { level: 3 });

  // h1: Page title
  expect(h1).toHaveTextContent(/king's cooking chess/i);

  // h3: Mode selection subtitle + mode titles
  expect(h3s).toHaveLength(3);
  expect(h3s[0]).toHaveTextContent(/choose your game mode/i);
  expect(h3s[1]).toHaveTextContent(/hot-seat mode/i);
  expect(h3s[2]).toHaveTextContent(/url mode/i);
});
```

**Why**:
- Removes tests for removed story/instructions sections
- Updates heading hierarchy test to reflect new structure (no more h2)
- Maintains test coverage for actual component functionality

**Validation**:
```bash
pnpm test -- ModeSelector.test  # Run tests
```

**If Fail**:
- Check that all story/instructions tests are removed
- Verify remaining tests still pass
- Ensure no orphaned test utilities or imports

**Rollback**:
```bash
git checkout src/components/game/ModeSelector.test.tsx
```

---

### Task 6: Clean Up ModeSelector CSS - Remove Story/Instructions Styles

**File**: `src/components/game/ModeSelector.module.css`

**Changes**:
```css
/* REMOVE: Story section styles (lines 70-105) */
/* REMOVE: Instructions section styles (lines 106-138) */
/* REMOVE: Dark mode overrides for story/instructions (lines 140-159) */
/* REMOVE: Mobile responsive styles for story/instructions (lines 194-220) */

/* KEEP: Container, title, subtitle, mode buttons, dark mode for buttons, mobile for buttons */
```

**Classes to Remove**:
- `.storySection`
- `.stageDirection`
- `.dialogue`
- `.scrollSignature`
- `.instructionsSection`
- `.instructionsTitle`
- `.instructionsList`

**Why**:
- Removes unused CSS for deleted story/instructions sections
- Reduces bundle size
- Prevents style conflicts

**Validation**:
```bash
pnpm run check:lint  # Stylelint validation
pnpm build  # Verify CSS compiles and no unused imports
```

**If Fail**:
- Check for accidentally removed button or container styles
- Verify no orphaned references to removed classes
- Ensure dark mode and mobile styles for buttons remain

**Rollback**:
```bash
git checkout src/components/game/ModeSelector.module.css
```

---

### Task 7: Run Full Validation Suite

**Validation Commands**:
```bash
# Level 1: Type checking
pnpm run check:types

# Level 2: Linting
pnpm run check:lint

# Level 3: Unit tests
pnpm test

# Level 4: Production build
pnpm build
```

**Expected Results**:
- TypeScript: 0 errors
- ESLint: 0 warnings
- Tests: All passing (expect ~661 tests - removed 22 story/instructions tests, added 3 header tests)
- Build: Successful with reduced bundle size

**If Fail**:
- Review error messages for specific failures
- Run individual test files to isolate issues
- Check for missing imports or broken references
- Verify all CSS modules compile correctly

**Rollback**:
```bash
git checkout src/components/game/ModeSelector.tsx
git checkout src/components/game/ModeSelector.test.tsx
git checkout src/components/game/ModeSelector.module.css
git checkout src/components/game/StoryPanel.tsx
git checkout src/components/game/StoryPanel.test.tsx
git checkout src/components/game/StoryPanel.module.css
```

---

## Task Checklist

- [ ] Task 1: Update StoryPanel Component - Add "The Story" Header
- [ ] Task 2: Update StoryPanel CSS - Add Main Title Styles
- [ ] Task 3: Update StoryPanel Tests - Add Header Tests
- [ ] Task 4: Remove Story/Instructions from ModeSelector Component
- [ ] Task 5: Update ModeSelector Tests - Remove Story/Instructions Tests
- [ ] Task 6: Clean Up ModeSelector CSS - Remove Story/Instructions Styles
- [ ] Task 7: Run Full Validation Suite

---

## Validation Strategy

### Unit Testing
- After Task 3: Run StoryPanel tests to verify header rendering
- After Task 5: Run ModeSelector tests to verify no broken references

### Integration Testing
- After Task 7: Manually test mode selection flow
- After Task 7: Manually test story panel overlay on game screen

### Manual Testing Checklist
- [ ] Mode selection screen shows only title and mode buttons (no story/instructions)
- [ ] Clicking mode button navigates to setup screen
- [ ] Game screen shows StoryPanel overlay with "The Story" header
- [ ] StoryPanel displays story content below "The Story" header
- [ ] StoryPanel displays "How to Play" instructions section
- [ ] Close button works correctly
- [ ] Toggle button shows/hides panel
- [ ] Dark mode renders correctly
- [ ] Mobile responsive design works
- [ ] Keyboard navigation (ESC key, Tab focus) works
- [ ] Screen reader announces "The Story" as main title

---

## Rollback Strategy

**Per-Task Rollback**: Use `git checkout` commands provided in each task

**Full Rollback**:
```bash
git checkout src/components/game/ModeSelector.tsx
git checkout src/components/game/ModeSelector.test.tsx
git checkout src/components/game/ModeSelector.module.css
git checkout src/components/game/StoryPanel.tsx
git checkout src/components/game/StoryPanel.test.tsx
git checkout src/components/game/StoryPanel.module.css
git reset --hard HEAD  # Nuclear option - discards all changes
```

---

## Risk Assessment

**Low Risk**:
- Story/instructions content is preserved in StoryPanel
- No game logic changes
- No state management changes
- No localStorage changes
- Well-isolated component changes

**Potential Issues**:
1. **Visual Regression**: Mode selection screen may look too sparse without story/instructions
   - **Mitigation**: User requested this change explicitly
   - **Fallback**: Can easily re-add content if needed

2. **Accessibility Regression**: Heading hierarchy or ARIA labels may be incorrect
   - **Mitigation**: Comprehensive tests for heading hierarchy and ARIA attributes
   - **Validation**: Manual screen reader testing

3. **Test Coverage Drop**: Removing 22 tests may lower overall coverage
   - **Mitigation**: Adding 3 new tests for header, net loss of 19 tests is acceptable
   - **Validation**: Check coverage report after Task 7

---

## Success Criteria

- ✅ ModeSelector component renders WITHOUT story/instructions sections
- ✅ StoryPanel component renders WITH "The Story" header
- ✅ All TypeScript checks pass (0 errors)
- ✅ All ESLint checks pass (0 warnings)
- ✅ All tests pass (~661 tests)
- ✅ Production build succeeds
- ✅ Manual testing checklist complete
- ✅ No visual regressions in dark mode or mobile
- ✅ Accessibility requirements met (WCAG 2.1 AA)

---

## Assumptions

1. User wants "The Story" as an h1 header (not h2 or h3)
2. Header should be centered and styled similarly to other headers
3. Story/instructions CSS in ModeSelector can be completely removed (not reused elsewhere)
4. Test count reduction is acceptable (removing 22 tests, adding 3)
5. No other components reference ModeSelector story/instructions sections

---

## Notes

- This task is a follow-up to Issue #3 (collapsible story panel feature)
- Total changes: 6 files modified (3 components, 3 test/style files)
- Net test change: -19 tests (removing 22, adding 3)
- Expected bundle size reduction: ~2-3KB (CSS cleanup)
- TDD approach: Red → Green → Refactor
- Reference CLAUDE-REACT.md for React 19 patterns

---

**END OF TASK PRP**
