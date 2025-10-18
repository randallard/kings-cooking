# Task PRP: Fix Mobile Scrolling on Victory Screen Modal

**Issue**: #12 - [BUG] Mobile not scrolling on victory screen
**Type**: Bug Fix (Critical UX Issue)
**Complexity**: Low-Medium
**Estimated Time**: 1-2 hours

## Goal

Enable vertical scrolling on the VictoryScreen modal when content exceeds viewport height on mobile devices, while maintaining the centered appearance on desktop and preserving all accessibility features.

## Why This Matters

**Business Value**:
- **Critical UX Issue**: Users cannot access Share Result and Review Moves buttons on mobile
- **Accessibility**: Current implementation violates WCAG 2.1 guideline 1.4.10 (Reflow)
- **User Retention**: Players cannot share game results, reducing viral growth potential

**User Impact**:
- iOS Safari users report complete inability to scroll victory screen
- Pull-to-refresh gesture triggers instead of scrolling (iOS Safari behavior)
- Content below fold is completely inaccessible on mobile devices

## What Will Change

**User-Visible Behavior**:
1. ✅ **Before**: Victory screen with tall content is stuck - cannot scroll to see buttons
2. ✅ **After**: Victory screen content scrolls smoothly on mobile, buttons accessible
3. ✅ Desktop behavior remains unchanged (content centered in viewport)
4. ✅ Background body scroll remains locked when modal is open

**Technical Changes**:
- Modify `VictoryScreen.module.css` overlay and container styles
- Add mobile-specific overflow and max-height handling
- Implement iOS Safari touch-action and overscroll-behavior properties
- Add E2E test for mobile viewport scrolling

## All Needed Context

### Documentation

**Existing Codebase Pattern** (Reference Implementation):
```css
/* src/components/game/StoryPanel.module.css:16-27 */
.container {
  position: relative;
  z-index: 101;
  max-width: 800px;
  width: 100%;
  max-height: 90vh;        /* ← KEY: Limits height to viewport */
  overflow-y: auto;         /* ← KEY: Enables scrolling */
  background-color: var(--bg-primary, #ffffff);
  border-radius: var(--border-radius-lg, 1rem);
  padding: var(--spacing-xl, 2rem);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
}
```

**Current Problem** (VictoryScreen.module.css):
```css
/* Lines 1-16 - PROBLEMATIC PATTERN */
.overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  display: flex;
  align-items: center;       /* ← PROBLEM: Centers content but prevents scroll */
  justify-content: center;
  /* ... no overflow handling ... */
}

.container {
  /* ... no max-height constraint ... */
  /* ... no overflow-y: auto ... */
}
```

**Web Research Findings**:
- Modern solution: `overscroll-behavior: contain` on scrollable container
- iOS Safari requires: `touch-action: pan-y` to enable touch scrolling
- Flexbox `align-items: center` conflicts with overflow scrolling
- Alternative: `align-items: flex-start` with `padding` for centering effect

### Patterns to Follow

**CSS Pattern** (from StoryPanel.module.css):
```css
.overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  z-index: 1000;
  display: flex;
  align-items: center;    /* Keep for desktop */
  justify-content: center;
  padding: var(--spacing-lg, 1.5rem);  /* Ensures content doesn't touch edges */
}

.container {
  max-height: 90vh;       /* Constrains height */
  overflow-y: auto;       /* Enables scroll */
  /* Touch handling for iOS */
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
  touch-action: pan-y;    /* iOS Safari fix */
}
```

**Test Pattern** (E2E mobile viewport test):
```typescript
// From existing Playwright patterns
test('mobile viewport scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
  // ... trigger victory screen ...
  // ... verify scroll behavior ...
});
```

### Gotchas

1. **iOS Safari Pull-to-Refresh**:
   - Issue: Downward scroll triggers page refresh instead of scrolling
   - Fix: Add `overscroll-behavior: contain` to prevent scroll chaining
   - Fix: Add `touch-action: pan-y` to enable only vertical pan gestures

2. **Flexbox align-items: center Conflict**:
   - Issue: `align-items: center` prevents overflow scrolling in flex containers
   - Fix: Use `align-items: flex-start` with top padding for mobile viewports
   - Alternative: Keep `align-items: center` and rely on max-height constraint

3. **Mobile Viewport Height**:
   - Issue: `100vh` includes browser chrome on mobile, causing content cutoff
   - Fix: Use `90vh` or `95vh` to account for browser UI
   - Reference: StoryPanel uses `90vh` (desktop) and `95vh` (mobile)

4. **Confetti z-index**:
   - Issue: Confetti layer (z-index: 1001) might interfere with scrolling
   - Fix: Ensure confetti has `pointer-events: none` (already implemented line 25)

5. **Animation Conflicts**:
   - Issue: `slideInBounce` animation might conflict with scroll behavior
   - Fix: Animations only affect transform/opacity, not overflow - safe to keep

6. **Dark Mode Variables**:
   - Issue: CSS variables for colors must work in scroll context
   - Fix: All variables already properly scoped - no changes needed

### Dependencies

**Files to Modify**:
1. `src/components/game/VictoryScreen.module.css` - Add scrolling styles
2. `src/components/game/VictoryScreen.test.tsx` - Add mobile scroll test

**No Changes Required**:
- `src/components/game/VictoryScreen.tsx` - Component logic unchanged
- `src/App.tsx` - Parent component unchanged

**Test Dependencies**:
- Playwright for E2E mobile viewport testing
- React Testing Library for component tests
- Vitest for unit tests

## Implementation Blueprint

### Task Breakdown

```yaml
TASK 1: Update VictoryScreen.module.css overlay styles
  FILE: src/components/game/VictoryScreen.module.css
  LINES: 1-16

  CHANGES:
    - KEEP: position: fixed and overlay dimensions
    - KEEP: flexbox layout (align-items: center, justify-content: center)
    - ADD: padding for mobile safety (already has backdrop-filter)

  PSEUDOCODE: |
    .overlay {
      /* Existing fixed positioning - KEEP */
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      z-index: 1000;

      /* Existing flexbox centering - KEEP */
      display: flex;
      align-items: center;
      justify-content: center;

      /* NEW: Mobile-safe padding */
      padding: env(safe-area-inset-top, 0)
               env(safe-area-inset-right, 0)
               env(safe-area-inset-bottom, 0)
               env(safe-area-inset-left, 0);

      /* Existing background - KEEP */
      background-color: rgba(0, 0, 0, 0.85);
      backdrop-filter: blur(8px);
      animation: fadeIn 0.5s ease-out;

      /* NEW: Prevent iOS scroll chaining */
      overscroll-behavior: contain;
    }

  VALIDATE: |
    pnpm run check:types
    # Should pass - no TS changes

  IF_FAIL: |
    - Check CSS syntax with pnpm run lint
    - Verify no typos in property names

  ROLLBACK: |
    git diff src/components/game/VictoryScreen.module.css
    git checkout src/components/game/VictoryScreen.module.css

---

TASK 2: Add scrolling to VictoryScreen.module.css container
  FILE: src/components/game/VictoryScreen.module.css
  LINES: 94-108

  CHANGES:
    - ADD: max-height constraint (90vh)
    - ADD: overflow-y: auto for scrolling
    - ADD: iOS Safari touch handling
    - ADD: overscroll-behavior for scroll containment

  PSEUDOCODE: |
    .container {
      position: relative;
      z-index: 1002;

      /* Existing sizing - KEEP */
      max-width: 600px;
      width: 90%;

      /* NEW: Height constraint and scrolling */
      max-height: 90vh;
      overflow-y: auto;

      /* NEW: iOS Safari smooth scrolling */
      -webkit-overflow-scrolling: touch;
      overscroll-behavior: contain;
      touch-action: pan-y;

      /* Existing styles - KEEP */
      padding: var(--spacing-xl, 2rem);
      background-color: var(--bg-modal, #ffffff);
      border-radius: var(--border-radius-lg, 1rem);
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      text-align: center;
      animation: slideInBounce 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    }

  VALIDATE: |
    pnpm run check:types
    pnpm run lint
    # Both should pass - CSS only

  IF_FAIL: |
    - Check for CSS syntax errors
    - Verify vendor prefixes (-webkit-) are correct
    - Test if overscroll-behavior is supported (it is in modern browsers)

  ROLLBACK: |
    git checkout src/components/game/VictoryScreen.module.css

---

TASK 3: Add mobile-specific max-height override
  FILE: src/components/game/VictoryScreen.module.css
  LINES: 330-354 (within @media (max-width: 480px))

  CHANGES:
    - ADD: max-height: 95vh for mobile (more viewport usage)
    - KEEP: All existing mobile responsive styles

  PSEUDOCODE: |
    @media (max-width: 480px) {
      .container {
        /* Existing mobile styles - KEEP */
        padding: var(--spacing-lg, 1.5rem);

        /* NEW: Taller on mobile to maximize space */
        max-height: 95vh;
      }

      /* Keep all other mobile overrides (title, subtitle, etc.) */
    }

  VALIDATE: |
    pnpm run check:types
    pnpm run lint

  IF_FAIL: |
    - Verify media query syntax
    - Check that max-height doesn't conflict with other properties

  ROLLBACK: |
    git checkout src/components/game/VictoryScreen.module.css

---

TASK 4: Write E2E test for mobile scrolling
  FILE: src/components/game/VictoryScreen.test.tsx
  LOCATION: After line 401 (after existing Accessibility tests)

  CHANGES:
    - ADD: New test group "Mobile Scrolling"
    - ADD: Test for scrollable container
    - ADD: Test for max-height constraint

  PSEUDOCODE: |
    describe('Mobile Scrolling', () => {
      it('should have scrollable container', () => {
        render(<VictoryScreen {...defaultProps} />);

        const container = document.querySelector('.container');
        const styles = window.getComputedStyle(container);

        expect(styles.overflowY).toBe('auto');
        expect(styles.maxHeight).toBe('90vh');
      });

      it('should have touch scrolling enabled for iOS', () => {
        render(<VictoryScreen {...defaultProps} />);

        const container = document.querySelector('.container');
        const styles = window.getComputedStyle(container);

        // Check for iOS Safari properties
        expect(styles.webkitOverflowScrolling).toBe('touch');
        expect(styles.touchAction).toBe('pan-y');
      });

      it('should prevent scroll chaining', () => {
        render(<VictoryScreen {...defaultProps} />);

        const overlay = document.querySelector('.overlay');
        const overlayStyles = window.getComputedStyle(overlay);

        expect(overlayStyles.overscrollBehavior).toBe('contain');
      });
    });

  VALIDATE: |
    pnpm test -- VictoryScreen.test.tsx
    # New tests should pass

  IF_FAIL: |
    - Check if CSS modules are loaded in test environment
    - Verify class name selectors match actual CSS modules output
    - Use data-testid if CSS module names are hashed

  ROLLBACK: |
    git checkout src/components/game/VictoryScreen.test.tsx

---

TASK 5: Manual mobile testing verification
  MANUAL TEST:
    1. Start dev server: pnpm dev
    2. Open Chrome DevTools → Device Toolbar (Ctrl+Shift+M)
    3. Select "iPhone SE" viewport (375x667)
    4. Complete a test game to trigger victory screen
    5. Verify:
       - [ ] Victory screen appears centered
       - [ ] Content is scrollable with mouse wheel
       - [ ] All buttons visible after scrolling
       - [ ] No horizontal scrollbar
    6. Test iOS Simulator if available:
       - [ ] Touch scroll works smoothly
       - [ ] Pull-to-refresh doesn't trigger
       - [ ] Overscroll bounce contained to modal

  VALIDATE: |
    # Visual inspection - all checkboxes above must pass

  IF_FAIL: |
    - Check browser console for CSS errors
    - Verify viewport meta tag in HTML
    - Test with actual iOS device if simulator fails

  ROLLBACK: |
    git checkout src/components/game/VictoryScreen.module.css
```

### Task Sequencing

**Phase 1: CSS Changes** (Red → Green → Refactor)
1. ✅ **RED**: Run existing tests to establish baseline
2. ✅ **GREEN**: Update overlay styles (TASK 1)
3. ✅ **GREEN**: Add container scrolling (TASK 2)
4. ✅ **GREEN**: Add mobile max-height (TASK 3)
5. ✅ **REFACTOR**: Review CSS for consistency with StoryPanel pattern

**Phase 2: Test Coverage** (TDD Verification)
6. ✅ **RED**: Write failing mobile scroll tests (TASK 4)
7. ✅ **GREEN**: Verify tests pass with CSS changes
8. ✅ **REFACTOR**: Clean up test assertions

**Phase 3: Manual Validation**
9. ✅ **VERIFY**: Manual mobile testing (TASK 5)
10. ✅ **VERIFY**: Desktop regression testing

## Validation Loop

### Level 1: Syntax & Style
```bash
pnpm run check:types
# Expected: ✅ No TypeScript errors

pnpm run lint
# Expected: ✅ No linting errors
```

### Level 2: Unit Tests
```bash
pnpm test -- VictoryScreen.test.tsx
# Expected: ✅ All tests pass (existing + new mobile scroll tests)
```

### Level 3: Integration Tests
```bash
pnpm test:integration
# Expected: ✅ All integration tests pass (no changes expected)
```

### Level 4: E2E Tests
```bash
pnpm test:e2e
# Expected: ✅ All E2E tests pass
# Note: May need to add mobile viewport test for victory screen scrolling
```

### Level 5: Build Verification
```bash
pnpm build
# Expected: ✅ Build succeeds with no warnings

pnpm preview
# Manual test: Open localhost, complete game, verify mobile scrolling
```

### Level 6: Mobile Testing Checklist
- [ ] iPhone SE (375x667): Victory screen scrolls
- [ ] iPhone 12 Pro (390x844): Victory screen scrolls
- [ ] Pixel 5 (393x851): Victory screen scrolls
- [ ] Galaxy S20 (360x800): Victory screen scrolls
- [ ] iPad Mini (768x1024): Victory screen centered
- [ ] Desktop (1920x1080): Victory screen centered (regression)

## Success Criteria

**Must Have** (Blocking):
- ✅ Victory screen scrolls on mobile viewports (320px-480px width)
- ✅ All content accessible (Share/Review buttons visible after scroll)
- ✅ Desktop behavior unchanged (content centered)
- ✅ No horizontal scrollbar on any viewport
- ✅ All existing tests pass
- ✅ New mobile scroll tests pass
- ✅ Build succeeds with zero errors

**Should Have** (Non-Blocking):
- ✅ Smooth touch scrolling on iOS Safari
- ✅ No pull-to-refresh interference
- ✅ Overscroll bounce contained to modal
- ✅ Dark mode works correctly in scrolled state

**Nice to Have** (Future Enhancement):
- ⏭️ Scroll progress indicator for long content
- ⏭️ Auto-scroll to buttons on mobile after animation
- ⏭️ Haptic feedback on iOS (requires native API)

## Risk Assessment

**Low Risk**:
- CSS-only changes, no logic modifications
- Pattern already proven in StoryPanel.module.css
- Easy rollback (git checkout)

**Potential Issues**:
1. **Browser Compatibility**:
   - Risk: `overscroll-behavior` not supported in very old browsers
   - Mitigation: Property is widely supported (95%+ globally), graceful degradation

2. **Animation Conflicts**:
   - Risk: `slideInBounce` animation might glitch with scrollbar
   - Mitigation: Test thoroughly, can disable animation on mobile if needed

3. **Performance**:
   - Risk: Scroll jank on low-end mobile devices
   - Mitigation: Use `will-change: transform` if needed, already has GPU-accelerated animations

## Rollback Strategy

**If All Tests Fail**:
```bash
git checkout src/components/game/VictoryScreen.module.css
git checkout src/components/game/VictoryScreen.test.tsx
pnpm test
```

**If Partial Failure** (some tests pass):
- Revert individual tasks using git diff
- Re-run validation after each revert
- Document which specific change caused failure

**If Production Issue** (post-merge):
- Immediately revert PR commit
- Create hotfix branch with temporary workaround
- Re-implement with additional testing

## Debug Strategies

**CSS Not Applied**:
```bash
# Check CSS module compilation
pnpm run build
# Inspect dist/ folder for CSS output

# Verify class names in browser DevTools
# CSS modules add hash: .container_abc123
```

**Scrolling Not Working on iOS**:
```javascript
// Add debug overlay to component (temporary)
<div style={{
  position: 'fixed',
  top: 0,
  left: 0,
  background: 'red',
  color: 'white',
  zIndex: 9999
}}>
  Scroll Height: {containerRef.current?.scrollHeight}
  Client Height: {containerRef.current?.clientHeight}
</div>
```

**Tests Failing**:
```bash
# Run with verbose output
pnpm test -- VictoryScreen.test.tsx --reporter=verbose

# Run single test
pnpm test -- VictoryScreen.test.tsx -t "should have scrollable container"

# Check test snapshots
pnpm test -- -u  # Update snapshots if needed
```

## Performance Considerations

**Rendering Performance**:
- No JavaScript changes → No render performance impact
- CSS-only changes are GPU-accelerated
- Confetti animation already optimized with `transform`

**Scroll Performance**:
- `-webkit-overflow-scrolling: touch` enables hardware acceleration
- `will-change: transform` on confetti prevents scroll jank
- Modal content is relatively simple DOM (no heavy images/videos)

**Memory**:
- No additional components or state
- No memory impact

## Security Considerations

**No Security Impact**:
- CSS-only changes
- No user input handling
- No data transmission
- No third-party dependencies

## Accessibility Considerations

**WCAG 2.1 Compliance**:
- ✅ **1.4.10 Reflow**: Content adapts to viewport without horizontal scrolling
- ✅ **2.1.1 Keyboard**: Scroll is keyboard accessible (arrow keys, space, page up/down)
- ✅ **2.4.3 Focus Order**: Focus order maintained in scroll context
- ✅ **2.4.7 Focus Visible**: Focus indicators remain visible while scrolling

**Screen Reader Support**:
- No changes to ARIA attributes
- Scroll region is part of dialog role (already implemented)
- Screen readers announce scrollable region automatically

**Motor Impairments**:
- Larger scroll target area with full viewport height
- Scroll momentum for easier navigation on touch devices
- Keyboard scroll already supported

## Browser Support Matrix

| Browser | Version | Scroll Support | Touch Support | Notes |
|---------|---------|----------------|---------------|-------|
| Chrome (Desktop) | 88+ | ✅ | N/A | Full support |
| Chrome (Android) | 88+ | ✅ | ✅ | Full support |
| Safari (Desktop) | 14+ | ✅ | N/A | Full support |
| Safari (iOS) | 14+ | ✅ | ✅ | Requires touch-action |
| Firefox (Desktop) | 85+ | ✅ | N/A | Full support |
| Firefox (Android) | 85+ | ✅ | ✅ | Full support |
| Edge | 88+ | ✅ | ✅ | Full support |
| Samsung Internet | 14+ | ✅ | ✅ | Full support |

**Legacy Browser Graceful Degradation**:
- Older browsers without `overscroll-behavior`: Modal still scrolls, just no scroll containment
- Older browsers without `touch-action`: Touch scroll works, might have minor UX quirks

## Post-Implementation Checklist

- [ ] All validation gates passed (check, lint, test, build)
- [ ] Manual mobile testing completed on 3+ viewports
- [ ] Desktop regression testing completed
- [ ] iOS Safari testing completed (simulator or device)
- [ ] Android Chrome testing completed (simulator or device)
- [ ] Dark mode verified in scrolled state
- [ ] Accessibility verified with keyboard navigation
- [ ] PR created with conventional commit format
- [ ] Issue #12 linked in PR description
- [ ] Screenshots/video of mobile scrolling attached to PR

## Related Issues & Context

**GitHub Issue**: #12 - [BUG] Mobile not scrolling on victory screen
**Priority**: Critical (app unusable on mobile for victory screen)
**Reported By**: @randallard
**Platform**: iOS Safari (iPhone), likely affects Android too
**Reproducibility**: 100% on mobile devices

**Related PRs**:
- Phase 4 UI Components (initial VictoryScreen implementation)
- Issue #1 Victory Share Button (added Share functionality)

**Similar Patterns in Codebase**:
- StoryPanel.module.css: Already implements scrollable modal correctly
- Modal/dialog patterns: Should follow same scrolling approach

## Assumptions

1. **Target Viewport**: Primary focus on mobile phones (320px-480px width)
2. **Browser Support**: Modern browsers (last 2 years), no IE11 support needed
3. **Content Size**: Victory screen content can vary greatly based on game length
4. **User Behavior**: Users expect native scroll behavior (touch/wheel/keyboard)
5. **Environment**: GitHub Pages static hosting, no server-side rendering

## Notes

**Why Not Use Dialog Element**:
- Current implementation uses div with role="dialog" for wider browser support
- Native `<dialog>` element has limited mobile support in older Safari versions
- Switching to native dialog is a future enhancement, not part of this fix

**Why 90vh Instead of 100vh**:
- Mobile browsers have dynamic viewport (address bar hides/shows)
- 90vh ensures content always fits with browser chrome visible
- Mobile override to 95vh provides more space when chrome is hidden
- Pattern established in StoryPanel.module.css

**Why Not Use JavaScript Scroll Lock**:
- CSS-only solution is simpler and more performant
- `overscroll-behavior` handles scroll chaining natively
- JavaScript scroll lock libraries add unnecessary bundle size
- Current approach aligns with KISS/YAGNI principles

**Testing Strategy Rationale**:
- Focus on CSS computed styles rather than mock scrolling behavior
- Manual testing critical for touch gesture verification
- E2E tests verify integration, unit tests verify styles applied
