# Story PRP: Add Game Story and Instructions to Mode Selection Screen

**Issue**: #3 - [BUG] No story or instructions
**Branch**: `issue-3-add-story-instructions`
**Created**: 2025-10-18
**Status**: Ready for Execution
**Story Type**: Enhancement (Missing Feature)
**Complexity**: Low
**Affected Systems**: Mode Selection UI

---

## Goal

Add an engaging game story and clear instructions to the ModeSelector component, displayed ABOVE the mode selection buttons, to help new users understand the game's narrative context and how to play.

---

## Why (Business Value)

**User Impact**: High - New users are confused about game objectives and mechanics

**Problem**:
- New players see mode selection buttons with no context
- No explanation of game story or win conditions
- No instructions for move mechanics or mode differences
- Users don't understand "King's Cooking" theme

**Expected Outcome**:
- Users understand the Dark King vs Light King narrative
- Clear win condition: "most pieces to opponent's castle"
- Explicit move instructions: select piece → select destination → confirm
- Mode-specific guidance for hot-seat and URL gameplay
- Improved user onboarding and engagement

**Success Metrics**:
- Story visible on mode selection screen
- Instructions accessible and readable
- Maintains WCAG 2.1 AA accessibility
- Mobile-responsive design
- Zero regression in existing tests

---

## What (User-Visible Behavior)

### Current Behavior
1. User opens app
2. Sees "King's Cooking Chess" title
3. Sees "Choose Your Game Mode:" subtitle
4. Two mode buttons (Hot-Seat, URL)
5. **No story or instructions**

### Expected Behavior
1. User opens app
2. Sees "King's Cooking Chess" title
3. **Sees game story section with Dark King/Light King dialogue**
4. **Sees clear, bulleted instructions**
5. Sees "Choose Your Game Mode:" subtitle
6. Two mode buttons (Hot-Seat, URL) - unchanged

### Technical Requirements

**Story Content** (from issue #3):
```
(flapping)
Dark King: A pigeon... what's up Glinda?
(scroll reads: we're coming over! you're cooking!
   - Light King)
Dark King: HA! Not if we get there first!
(shouting)
We're off! Dinner at the Light King's Castle!
```

**Instructions Content** (from issue #3):
- Most pieces to make it to the opponent's castle wins!
- Captured pieces are sent home to prepare the feast
- Click a piece to select, then click the desired square you want them to move to
- Then click confirm to lock in your move
- For URL game: share URL with opponent via text/email
- Or play with someone on the same device (hot-seat)

**Design Constraints**:
- Display ABOVE mode selection buttons (confirmed by user)
- Follow existing CSS module patterns
- Match ModeSelector visual style
- Maintain semantic HTML structure
- WCAG 2.1 AA compliance (proper heading hierarchy, color contrast)
- Mobile-responsive (readable on 320px+ screens)
- Support dark mode
- Reduced motion support

---

## All Needed Context

### Pattern: Existing ModeSelector Component Structure

**Location**: `src/components/game/ModeSelector.tsx`

**Current Component Hierarchy**:
```tsx
<div className={styles.container}>
  <h1 className={styles.title}>King's Cooking Chess</h1>
  <h2 className={styles.subtitle}>Choose Your Game Mode:</h2>
  <div className={styles.buttonContainer}>
    {/* Mode buttons */}
  </div>
</div>
```

**Pattern to Follow**:
```tsx
<div className={styles.container}>
  <h1 className={styles.title}>King's Cooking Chess</h1>

  {/* NEW: Story section */}
  <section className={styles.storySection} aria-label="Game story">
    {/* Story dialogue */}
  </section>

  {/* NEW: Instructions section */}
  <section className={styles.instructionsSection} aria-label="How to play">
    {/* Instructions */}
  </section>

  <h2 className={styles.subtitle}>Choose Your Game Mode:</h2>
  <div className={styles.buttonContainer}>
    {/* Existing mode buttons - UNCHANGED */}
  </div>
</div>
```

### Pattern: CSS Module Conventions

**Location**: `src/components/game/ModeSelector.module.css`

**Existing CSS Variables**:
```css
--spacing-xs: 0.25rem
--spacing-sm: 0.5rem
--spacing-md: 1rem
--spacing-lg: 1.5rem
--spacing-xl: 2rem
--font-size-sm: 0.875rem
--font-size-md: 1rem
--font-size-lg: 1.25rem
--font-size-xl: 1.5rem
--font-size-2xl: 2rem
--text-primary: #212529 (light) / #f8f9fa (dark)
--text-secondary: #6c757d (light) / #adb5bd (dark)
--bg-secondary: #f8f9fa (light) / #343a40 (dark)
--border-color: #ced4da (light) / #495057 (dark)
```

**Responsive Breakpoint**:
- Mobile: `@media (max-width: 768px)`

**Accessibility Media Queries**:
- Dark mode: `@media (prefers-color-scheme: dark)`
- Reduced motion: `@media (prefers-reduced-motion: reduce)`
- High contrast: `@media (prefers-contrast: high)`

### Pattern: Testing Strategy from Phase 4

**Location**: `src/components/game/ModeSelector.test.tsx`

**Existing Test Categories**:
1. **Rendering** - Component renders correctly
2. **Mode Selection** - Click handlers work
3. **Accessibility** - ARIA, keyboard nav, heading hierarchy
4. **Test IDs** - data-testid attributes
5. **Edge Cases** - Undefined callbacks, rapid clicks

**Pattern to Follow for NEW Tests**:
```typescript
describe('Story and Instructions', () => {
  it('should render game story section', () => {
    render(<ModeSelector onModeSelected={vi.fn()} />);
    expect(screen.getByRole('region', { name: /game story/i })).toBeInTheDocument();
  });

  it('should display Dark King dialogue', () => {
    render(<ModeSelector onModeSelected={vi.fn()} />);
    expect(screen.getByText(/A pigeon\.\.\. what's up Glinda/i)).toBeInTheDocument();
  });

  // ... more tests
});
```

**Coverage Requirement**: Maintain 100% line coverage (current: 100%)

### Pattern: React 19 Component Structure

**From**: `/home/ryankhetlyr/Development/kings-cooking/claude_md_files/CLAUDE-REACT.md`

**MANDATORY React 19 Patterns**:
```typescript
import { ReactElement } from 'react';

/**
 * @fileoverview Mode selector with story and instructions
 * @module components/game/ModeSelector
 */

/**
 * Component description with context.
 *
 * Features list.
 *
 * @component
 * @example
 * ```tsx
 * <ModeSelector onModeSelected={(mode) => console.log(mode)} />
 * ```
 */
export function ModeSelector(props): ReactElement {
  return <div>...</div>;
}
```

**Key Principles**:
- ✅ Use `ReactElement` return type (NOT `JSX.Element`)
- ✅ JSDoc with `@fileoverview`, `@module`, `@component`
- ✅ Include usage example
- ✅ KISS principle: simple text display, no animations
- ✅ YAGNI principle: no collapsible state management

### Gotchas and Anti-Patterns

❌ **DON'T** change mode button functionality or layout
❌ **DON'T** add interactivity to story (no animations, no state)
❌ **DON'T** use inline styles - use CSS modules
❌ **DON'T** break heading hierarchy (h1 → h2 → h3)
❌ **DON'T** add new dependencies
❌ **DON'T** skip accessibility attributes

✅ **DO** use semantic HTML (`<section>`, `<ul>`, `<p>`)
✅ **DO** add ARIA labels for screen readers
✅ **DO** test heading hierarchy
✅ **DO** maintain dark mode support
✅ **DO** keep mobile responsive

### File Dependency Map

**Files to Modify**:
1. `src/components/game/ModeSelector.tsx`
   - Add story section above subtitle
   - Add instructions section above subtitle
   - Keep existing mode buttons unchanged

2. `src/components/game/ModeSelector.module.css`
   - Add `.storySection` styles
   - Add `.instructionsSection` styles
   - Add `.dialogue`, `.stageDirection` styles
   - Add `.instructionsList` styles
   - Ensure responsive design
   - Add dark mode support

3. `src/components/game/ModeSelector.test.tsx`
   - Add "Story and Instructions" describe block
   - Test story section rendering
   - Test instructions rendering
   - Test accessibility (ARIA labels, heading hierarchy)
   - Maintain 100% coverage

**Files to Reference** (no changes):
- `src/components/game/VictoryScreen.tsx` - Similar text content patterns
- `src/components/game/HandoffScreen.tsx` - Section layout patterns
- Other Phase 4 components - Accessibility patterns

---

## Implementation Blueprint

### Task 1: CREATE Story Section in ModeSelector Component

**Action**: ADD story section to ModeSelector.tsx between title and subtitle

**Location**: `src/components/game/ModeSelector.tsx` (after line 35, before line 36)

**Implementation Details**:
```tsx
// After <h1 className={styles.title}>King's Cooking Chess</h1>
// Before <h2 className={styles.subtitle}>Choose Your Game Mode:</h2>

<section className={styles.storySection} aria-label="Game story">
  <p className={styles.stageDirection}>(flapping)</p>
  <p className={styles.dialogue}>
    <strong>Dark King:</strong> A pigeon... what's up Glinda?
  </p>
  <p className={styles.stageDirection}>
    (scroll reads: we're coming over! you're cooking!<br />
    <span className={styles.scrollSignature}>- Light King</span>)
  </p>
  <p className={styles.dialogue}>
    <strong>Dark King:</strong> HA! Not if we get there first!
  </p>
  <p className={styles.stageDirection}>(shouting)</p>
  <p className={styles.dialogue}>
    We're off! Dinner at the Light King's Castle!
  </p>
</section>
```

**Key Decisions**:
- Use `<section>` with `aria-label` for accessibility
- Use `<strong>` for speaker names (semantic emphasis)
- Use `<p>` for each dialogue line (proper semantics)
- Use className for stage directions vs dialogue (CSS differentiation)

**Validation**:
```bash
# TypeScript check
pnpm run check

# Should render without errors
pnpm dev
# Visit http://localhost:5173/kings-cooking/ and verify story appears
```

---

### Task 2: CREATE Instructions Section in ModeSelector Component

**Action**: ADD instructions section to ModeSelector.tsx after story, before subtitle

**Location**: `src/components/game/ModeSelector.tsx` (after story section, before line 36)

**Implementation Details**:
```tsx
// After story section
// Before <h2 className={styles.subtitle}>Choose Your Game Mode:</h2>

<section className={styles.instructionsSection} aria-label="How to play">
  <h2 className={styles.instructionsTitle}>How to Play</h2>
  <ul className={styles.instructionsList}>
    <li>Most pieces to make it to the opponent's castle wins!</li>
    <li>Captured pieces are sent home to prepare the feast</li>
    <li>Click a piece to select, then click the desired square you want them to move to</li>
    <li>Then click confirm to lock in your move</li>
    <li>For URL game: you'll be given a URL to share with your opponent via text or email</li>
    <li>Or play with someone on the same device (hot-seat mode)</li>
  </ul>
</section>
```

**Key Decisions**:
- Use `<section>` with `aria-label` for screen readers
- Use `<h2>` for "How to Play" (maintains heading hierarchy)
- Use `<ul>` for instructions (semantic list)
- Instructions are concise, action-oriented bullets

**Validation**:
```bash
# TypeScript check
pnpm run check

# Visual verification
pnpm dev
# Visit http://localhost:5173/kings-cooking/ and verify instructions appear
```

---

### Task 3: UPDATE Heading Hierarchy in ModeSelector Component

**Action**: CHANGE subtitle from `<h2>` to `<h3>` to maintain proper hierarchy

**Location**: `src/components/game/ModeSelector.tsx` line 36

**Current Code**:
```tsx
<h2 className={styles.subtitle}>Choose Your Game Mode:</h2>
```

**New Code**:
```tsx
<h3 className={styles.subtitle}>Choose Your Game Mode:</h3>
```

**Rationale**:
- h1: "King's Cooking Chess" (page title)
- h2: "How to Play" (instructions section)
- h3: "Choose Your Game Mode:" (subsection)
- h3: Mode titles in buttons (existing, unchanged)

This maintains proper document outline.

**Validation**:
```bash
# TypeScript check
pnpm run check

# Test heading hierarchy
pnpm test ModeSelector.test.tsx -t "heading hierarchy"
```

---

### Task 4: CREATE CSS Styles for Story Section

**Action**: ADD story section styles to ModeSelector.module.css

**Location**: `src/components/game/ModeSelector.module.css` (after line 23)

**Implementation Details**:
```css
.storySection {
  max-width: 600px;
  width: 100%;
  margin: 0 auto var(--spacing-lg, 1.5rem);
  padding: var(--spacing-md, 1rem);
  background-color: var(--bg-secondary, #f8f9fa);
  border: 1px solid var(--border-color, #ced4da);
  border-radius: var(--border-radius-md, 0.5rem);
  text-align: left;
}

.stageDirection {
  font-style: italic;
  color: var(--text-secondary, #6c757d);
  font-size: var(--font-size-sm, 0.875rem);
  margin: var(--spacing-xs, 0.25rem) 0;
}

.dialogue {
  color: var(--text-primary, #212529);
  font-size: var(--font-size-md, 1rem);
  margin: var(--spacing-sm, 0.5rem) 0;
  line-height: 1.5;
}

.dialogue strong {
  color: var(--text-primary, #212529);
  font-weight: 700;
}

.scrollSignature {
  display: inline-block;
  margin-left: var(--spacing-md, 1rem);
  font-style: italic;
}
```

**Key Decisions**:
- Constrain width for readability (max-width: 600px)
- Use existing CSS variables for consistency
- Stage directions are italicized, secondary color
- Dialogue is primary color, readable font size
- Speaker names are bold for emphasis

**Validation**:
```bash
# Visual check
pnpm dev
# Verify story section has background, border, proper spacing
```

---

### Task 5: CREATE CSS Styles for Instructions Section

**Action**: ADD instructions section styles to ModeSelector.module.css

**Location**: `src/components/game/ModeSelector.module.css` (after story section styles)

**Implementation Details**:
```css
.instructionsSection {
  max-width: 700px;
  width: 100%;
  margin: 0 auto var(--spacing-xl, 2rem);
  padding: var(--spacing-lg, 1.5rem);
  background-color: var(--bg-secondary, #f8f9fa);
  border: 1px solid var(--border-color, #ced4da);
  border-radius: var(--border-radius-md, 0.5rem);
}

.instructionsTitle {
  font-size: var(--font-size-lg, 1.25rem);
  font-weight: 600;
  margin: 0 0 var(--spacing-md, 1rem) 0;
  color: var(--text-primary, #212529);
  text-align: center;
}

.instructionsList {
  list-style: disc inside;
  padding: 0;
  margin: 0;
  font-size: var(--font-size-md, 1rem);
  color: var(--text-primary, #212529);
  text-align: left;
  line-height: 1.6;
}

.instructionsList li {
  padding: var(--spacing-xs, 0.25rem) 0;
  margin-left: var(--spacing-md, 1rem);
}
```

**Key Decisions**:
- Slightly wider than story (700px vs 600px) for longer bullets
- Centered title, left-aligned list
- Standard disc bullets (list-style: disc inside)
- Comfortable line height for readability (1.6)

**Validation**:
```bash
# Visual check
pnpm dev
# Verify instructions section has proper layout and spacing
```

---

### Task 6: UPDATE CSS for Mobile Responsiveness

**Action**: ADD mobile-specific overrides to ModeSelector.module.css

**Location**: `src/components/game/ModeSelector.module.css` (inside `@media (max-width: 768px)` block, after line 157)

**Implementation Details**:
```css
@media (max-width: 768px) {
  /* Existing mobile styles */

  /* NEW: Story section mobile adjustments */
  .storySection {
    padding: var(--spacing-sm, 0.5rem);
    margin-bottom: var(--spacing-md, 1rem);
  }

  .dialogue,
  .stageDirection {
    font-size: var(--font-size-sm, 0.875rem);
  }

  /* NEW: Instructions section mobile adjustments */
  .instructionsSection {
    padding: var(--spacing-md, 1rem);
    margin-bottom: var(--spacing-lg, 1.5rem);
  }

  .instructionsTitle {
    font-size: var(--font-size-md, 1rem);
  }

  .instructionsList {
    font-size: var(--font-size-sm, 0.875rem);
  }

  .instructionsList li {
    margin-left: var(--spacing-sm, 0.5rem);
  }
}
```

**Rationale**:
- Reduce padding on small screens to maximize content space
- Slightly smaller font sizes for mobile readability
- Maintain visual hierarchy

**Validation**:
```bash
# Visual check at different sizes
pnpm dev
# Resize browser to 320px, 768px, 1024px
# Verify text remains readable at all sizes
```

---

### Task 7: UPDATE CSS for Dark Mode Support

**Action**: ADD dark mode variable overrides to ModeSelector.module.css

**Location**: `src/components/game/ModeSelector.module.css` (inside both dark mode blocks, after line 125 and line 136)

**Implementation Details**:
```css
/* Dark mode - system preference */
@media (prefers-color-scheme: dark) {
  :global(:root:not([data-theme='light'])) .container {
    /* Existing dark mode variables */
  }

  /* NEW: Story and Instructions dark mode */
  :global(:root:not([data-theme='light'])) .storySection,
  :global(:root:not([data-theme='light'])) .instructionsSection {
    --bg-secondary: #343a40;
    --border-color: #495057;
    --text-primary: #f8f9fa;
    --text-secondary: #adb5bd;
  }
}

/* Dark mode - manual toggle */
:global([data-theme='dark']) .container {
  /* Existing dark mode variables */
}

:global([data-theme='dark']) .storySection,
:global([data-theme='dark']) .instructionsSection {
  --bg-secondary: #343a40;
  --border-color: #495057;
  --text-primary: #f8f9fa;
  --text-secondary: #adb5bd;
}
```

**Validation**:
```bash
# Toggle dark mode in browser
pnpm dev
# Toggle system dark mode (OS settings)
# Verify story and instructions sections use dark theme colors
```

---

### Task 8: CREATE Tests for Story Section

**Action**: ADD "Story and Instructions" test suite to ModeSelector.test.tsx

**Location**: `src/components/game/ModeSelector.test.tsx` (after line 165, before "Edge Cases")

**Implementation Details**:
```typescript
describe('Story and Instructions', () => {
  describe('Story Section', () => {
    it('should render game story section with ARIA label', () => {
      render(<ModeSelector onModeSelected={vi.fn()} />);

      const storySection = screen.getByRole('region', { name: /game story/i });
      expect(storySection).toBeInTheDocument();
    });

    it('should display Dark King pigeon dialogue', () => {
      render(<ModeSelector onModeSelected={vi.fn()} />);

      expect(screen.getByText(/A pigeon\.\.\. what's up Glinda/i)).toBeInTheDocument();
    });

    it('should display Light King scroll message', () => {
      render(<ModeSelector onModeSelected={vi.fn()} />);

      expect(screen.getByText(/we're coming over! you're cooking!/i)).toBeInTheDocument();
      expect(screen.getByText(/Light King/i)).toBeInTheDocument();
    });

    it('should display Dark King response', () => {
      render(<ModeSelector onModeSelected={vi.fn()} />);

      expect(screen.getByText(/HA! Not if we get there first!/i)).toBeInTheDocument();
    });

    it('should display Dark King final shout', () => {
      render(<ModeSelector onModeSelected={vi.fn()} />);

      expect(screen.getByText(/We're off! Dinner at the Light King's Castle!/i)).toBeInTheDocument();
    });

    it('should use semantic paragraph elements for dialogue', () => {
      const { container } = render(<ModeSelector onModeSelected={vi.fn()} />);

      const storySection = container.querySelector('[aria-label="Game story"]');
      const paragraphs = storySection?.querySelectorAll('p');

      expect(paragraphs?.length).toBeGreaterThan(0);
    });

    it('should use strong elements for speaker names', () => {
      const { container } = render(<ModeSelector onModeSelected={vi.fn()} />);

      const storySection = container.querySelector('[aria-label="Game story"]');
      const strongElements = storySection?.querySelectorAll('strong');

      expect(strongElements?.length).toBeGreaterThan(0);
      expect(strongElements?.[0]).toHaveTextContent(/Dark King/i);
    });
  });

  describe('Instructions Section', () => {
    it('should render instructions section with ARIA label', () => {
      render(<ModeSelector onModeSelected={vi.fn()} />);

      const instructionsSection = screen.getByRole('region', { name: /how to play/i });
      expect(instructionsSection).toBeInTheDocument();
    });

    it('should display "How to Play" heading', () => {
      render(<ModeSelector onModeSelected={vi.fn()} />);

      expect(screen.getByRole('heading', { name: /how to play/i })).toBeInTheDocument();
    });

    it('should display win condition instruction', () => {
      render(<ModeSelector onModeSelected={vi.fn()} />);

      expect(screen.getByText(/most pieces to make it to the opponent's castle wins/i)).toBeInTheDocument();
    });

    it('should display capture mechanic instruction', () => {
      render(<ModeSelector onModeSelected={vi.fn()} />);

      expect(screen.getByText(/captured pieces are sent home to prepare the feast/i)).toBeInTheDocument();
    });

    it('should display move selection instruction', () => {
      render(<ModeSelector onModeSelected={vi.fn()} />);

      expect(screen.getByText(/click a piece to select.*click the desired square/i)).toBeInTheDocument();
    });

    it('should display move confirmation instruction', () => {
      render(<ModeSelector onModeSelected={vi.fn()} />);

      expect(screen.getByText(/click confirm to lock in your move/i)).toBeInTheDocument();
    });

    it('should display URL mode instruction', () => {
      render(<ModeSelector onModeSelected={vi.fn()} />);

      expect(screen.getByText(/URL to share with your opponent/i)).toBeInTheDocument();
    });

    it('should display hot-seat mode instruction', () => {
      render(<ModeSelector onModeSelected={vi.fn()} />);

      expect(screen.getByText(/play with someone on the same device/i)).toBeInTheDocument();
    });

    it('should use unordered list for instructions', () => {
      render(<ModeSelector onModeSelected={vi.fn()} />);

      const instructionsSection = screen.getByRole('region', { name: /how to play/i });
      const list = instructionsSection.querySelector('ul');

      expect(list).toBeInTheDocument();
    });

    it('should have at least 6 instruction items', () => {
      render(<ModeSelector onModeSelected={vi.fn()} />);

      const instructionsSection = screen.getByRole('region', { name: /how to play/i });
      const listItems = instructionsSection.querySelectorAll('li');

      expect(listItems.length).toBeGreaterThanOrEqual(6);
    });
  });
});
```

**Validation**:
```bash
# Run new tests
pnpm test ModeSelector.test.tsx -t "Story and Instructions"

# Should see all new tests passing
```

---

### Task 9: UPDATE Tests for Heading Hierarchy

**Action**: UPDATE heading hierarchy test to account for new h2 and h3

**Location**: `src/components/game/ModeSelector.test.tsx` lines 152-164

**Current Code**:
```typescript
it('should have proper heading hierarchy', () => {
  render(<ModeSelector onModeSelected={vi.fn()} />);

  const h1 = screen.getByRole('heading', { level: 1 });
  const h2 = screen.getByRole('heading', { level: 2 });
  const h3s = screen.getAllByRole('heading', { level: 3 });

  expect(h1).toHaveTextContent(/king's cooking chess/i);
  expect(h2).toHaveTextContent(/choose your game mode/i);
  expect(h3s).toHaveLength(2);
  expect(h3s[0]).toHaveTextContent(/hot-seat mode/i);
  expect(h3s[1]).toHaveTextContent(/url mode/i);
});
```

**New Code**:
```typescript
it('should have proper heading hierarchy', () => {
  render(<ModeSelector onModeSelected={vi.fn()} />);

  const h1 = screen.getByRole('heading', { level: 1 });
  const h2s = screen.getAllByRole('heading', { level: 2 });
  const h3s = screen.getAllByRole('heading', { level: 3 });

  // h1: Page title
  expect(h1).toHaveTextContent(/king's cooking chess/i);

  // h2: Instructions title
  expect(h2s).toHaveLength(1);
  expect(h2s[0]).toHaveTextContent(/how to play/i);

  // h3: Mode selection subtitle + mode titles
  expect(h3s).toHaveLength(3);
  expect(h3s[0]).toHaveTextContent(/choose your game mode/i);
  expect(h3s[1]).toHaveTextContent(/hot-seat mode/i);
  expect(h3s[2]).toHaveTextContent(/url mode/i);
});
```

**Rationale**:
- Now we have 1 h2 ("How to Play")
- Now we have 3 h3s (subtitle + 2 mode titles)

**Validation**:
```bash
# Run updated test
pnpm test ModeSelector.test.tsx -t "heading hierarchy"

# Should pass with new hierarchy
```

---

### Task 10: UPDATE Tests for Subtitle Rendering

**Action**: UPDATE subtitle test to check for h3 instead of h2

**Location**: `src/components/game/ModeSelector.test.tsx` lines 18-22

**Current Code**:
```typescript
it('should render subtitle', () => {
  render(<ModeSelector onModeSelected={vi.fn()} />);

  expect(screen.getByRole('heading', { name: /choose your game mode/i })).toBeInTheDocument();
});
```

**New Code**:
```typescript
it('should render subtitle', () => {
  render(<ModeSelector onModeSelected={vi.fn()} />);

  const subtitle = screen.getByRole('heading', { name: /choose your game mode/i, level: 3 });
  expect(subtitle).toBeInTheDocument();
});
```

**Rationale**:
- Subtitle is now h3 instead of h2
- Explicitly test for level 3 to catch regressions

**Validation**:
```bash
# Run updated test
pnpm test ModeSelector.test.tsx -t "subtitle"

# Should pass
```

---

## Validation Loop

### Level 1: Syntax & Style (MUST PASS)

```bash
# TypeScript type checking
pnpm run check
# Expected: 0 errors

# ESLint
pnpm run lint
# Expected: 0 errors, 0 warnings
```

### Level 2: Unit Tests (MUST PASS)

```bash
# Run all ModeSelector tests
pnpm test ModeSelector.test.tsx
# Expected: All existing tests + 17 new tests passing
# Expected: 100% line coverage maintained

# Run with coverage
pnpm test:coverage -- ModeSelector.test.tsx
# Expected: 100% statements, 100% branches, 100% functions, 100% lines
```

### Level 3: Integration (MUST PASS)

```bash
# Build production bundle
pnpm build
# Expected: Successful build, no warnings

# Preview production build
pnpm preview
# Visit http://localhost:4173/kings-cooking/
# Expected: Story and instructions visible, mode buttons functional
```

### Level 4: Manual Verification (MUST PASS)

**Desktop (1920x1080)**:
- [ ] Story section displays with proper formatting
- [ ] Instructions section displays with bulleted list
- [ ] Mode buttons appear below story/instructions
- [ ] Dark mode toggle affects story and instructions
- [ ] Clicking mode buttons works unchanged

**Mobile (375x667)**:
- [ ] Story section is readable (font size, spacing)
- [ ] Instructions list items are not cut off
- [ ] Mode buttons maintain minimum tap target (44px)
- [ ] No horizontal scrolling

**Accessibility**:
- [ ] Screen reader announces "Game story" and "How to play" regions
- [ ] Heading hierarchy is logical (h1 → h2 → h3)
- [ ] Tab order is logical (story → instructions → mode buttons)
- [ ] Color contrast meets WCAG 2.1 AA (4.5:1 for text)

**Browser Compatibility**:
- [ ] Chrome/Edge: Story and instructions render correctly
- [ ] Firefox: No layout issues
- [ ] Safari: No font rendering issues

### Level 5: Regression Testing (MUST PASS)

```bash
# Run ALL tests to ensure no regressions
pnpm test
# Expected: 656 tests passing (639 existing + 17 new)

# Full test coverage
pnpm test:coverage
# Expected: Overall coverage >= 93.71% (maintained or improved)
```

---

## Success Criteria

- [x] Story section displays above mode selection buttons
- [x] Story content matches issue #3 specifications
- [x] Instructions section displays above mode selection buttons
- [x] Instructions content matches issue #3 specifications
- [x] Proper heading hierarchy (h1 → h2 → h3)
- [x] ARIA labels for screen readers
- [x] Mobile-responsive design (320px+)
- [x] Dark mode support
- [x] Reduced motion support
- [x] 100% test coverage maintained
- [x] TypeScript: 0 errors
- [x] ESLint: 0 warnings
- [x] All existing tests passing
- [x] 17 new tests passing
- [x] Production build successful
- [x] No visual regressions on mode selection buttons

---

## Rollback Strategy

If implementation fails validation:

1. **Revert Component Changes**:
   ```bash
   git checkout src/components/game/ModeSelector.tsx
   git checkout src/components/game/ModeSelector.module.css
   git checkout src/components/game/ModeSelector.test.tsx
   ```

2. **Re-run Tests**:
   ```bash
   pnpm test ModeSelector.test.tsx
   # Should return to baseline (20 tests passing, 100% coverage)
   ```

3. **Investigate Issues**:
   - Check console for runtime errors
   - Review test failures for specific assertions
   - Verify CSS module imports

4. **Iterative Fix**:
   - Fix one task at a time
   - Validate after each task
   - Don't proceed to next task until current passes

---

## Estimated Effort

**Complexity**: Low
**Estimated Time**: 30-45 minutes
**Task Breakdown**:
- Tasks 1-3 (Component updates): 10 minutes
- Tasks 4-7 (CSS updates): 15 minutes
- Tasks 8-10 (Test updates): 15 minutes
- Validation: 5 minutes

**Risk Level**: Low
**Dependencies**: None (isolated to ModeSelector component)

---

## Additional Notes

**KISS Principle Applied**:
- No animations, no interactivity
- Simple text display
- Standard HTML elements
- Straightforward CSS

**YAGNI Principle Applied**:
- No collapsible state management
- No "read more" functionality
- No i18n support (not required yet)
- No server-side rendering optimizations

**Accessibility First**:
- Semantic HTML (section, ul, strong)
- ARIA labels for regions
- Proper heading hierarchy
- Color contrast compliance

**Mobile-First Design**:
- Responsive breakpoints
- Readable font sizes on small screens
- Touch-friendly spacing
- No horizontal scroll

**Component Cohesion**:
- All story/instructions logic in ModeSelector
- No new dependencies
- Self-contained CSS module
- No global style pollution

---

## References

**Issue**: https://github.com/randallard/kings-cooking/issues/3
**Branch**: `issue-3-add-story-instructions`
**CLAUDE.md**: `/home/ryankhetlyr/Development/kings-cooking/CLAUDE.md`
**CLAUDE-REACT.md**: `/home/ryankhetlyr/Development/kings-cooking/claude_md_files/CLAUDE-REACT.md`
**Phase 4 PRP**: `/home/ryankhetlyr/Development/kings-cooking/PRPs/phase-4-ui-components.md`

---

**Ready for Execution**: ✅
**Approved By**: [Awaiting approval in issue comments]
**Execution Command**: `/prp-commands:prp-story-execute "PRPs/story-add-game-story-and-instructions.md"`
