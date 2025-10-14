# Dark Mode Implementation Guide

This guide documents how to implement dark mode support for correspondence games in this framework.

## Table of Contents

1. [Why Dark Mode?](#why-dark-mode)
2. [Core Requirements](#core-requirements)
3. [Using the Shared CSS Framework](#using-the-shared-css-framework)
4. [Manual Implementation](#manual-implementation)
5. [Testing Dark Mode](#testing-dark-mode)
6. [Common Patterns](#common-patterns)
7. [Troubleshooting](#troubleshooting)

---

## Why Dark Mode?

Dark mode support is essential for:
- **User comfort**: Reduces eye strain in low-light environments
- **Battery life**: OLED screens use less power with dark pixels
- **Accessibility**: Some users have light sensitivity or vision conditions
- **Modern UX**: Users expect dark mode in modern apps

The framework uses **OS-level dark mode detection** via `prefers-color-scheme` media query, which automatically adapts to the user's system preferences.

---

## Core Requirements

Every game MUST include:

1. **Color scheme declaration** in CSS:
   ```css
   :root {
     color-scheme: light dark;
   }
   ```
   This tells the browser the app supports both modes and enables native dark mode for scrollbars, form controls, etc.

2. **Dark mode styles** for ALL visual elements:
   - Text colors
   - Background colors
   - Borders
   - Buttons
   - Forms
   - Game boards/elements
   - Status messages

3. **Sufficient contrast** in both modes:
   - Light mode: Dark text on light backgrounds
   - Dark mode: Light text on dark backgrounds
   - Minimum WCAG AA contrast ratio (4.5:1 for normal text)

---

## Using the Shared CSS Framework

### Step 1: Import the Framework CSS

In your game's `App.css`:

```css
@import '@correspondence-games/core/src/styles/correspondence-games.css';
```

### Step 2: Use Framework Classes

The framework provides pre-styled components:

#### Buttons

```tsx
{/* Primary button (blue) */}
<button className="cg-button cg-button-primary">
  Start Game
</button>

{/* Success button (green) */}
<button className="cg-button cg-button-success">
  Play Again
</button>

{/* Secondary button (gray) */}
<button className="cg-button cg-button-secondary">
  Cancel
</button>

{/* Size variants */}
<button className="cg-button cg-button-primary cg-button-sm">Small</button>
<button className="cg-button cg-button-primary cg-button-lg">Large</button>
<button className="cg-button cg-button-primary cg-button-xl">Extra Large</button>
```

#### Forms

```tsx
<form className="cg-form">
  <label className="cg-form-label" htmlFor="playerName">
    Enter your name:
  </label>
  <input
    id="playerName"
    className="cg-form-input"
    type="text"
    required
  />
  <button type="submit" className="cg-button cg-button-primary">
    Continue
  </button>
</form>
```

#### Warning/Share Sections

```tsx
<div className="cg-warning-section">
  <h3>⚠️ Important</h3>
  <p>Keep this browser tab open during the game</p>
</div>
```

#### URL Display

```tsx
<div className="cg-url-display">
  https://example.com/game#s=abc123...
</div>
```

### Step 3: Use CSS Variables

For custom styling, use the framework's CSS variables:

```css
.my-custom-element {
  background: var(--cg-color-bg-primary);
  color: var(--cg-color-text-primary);
  border: 1px solid var(--cg-color-border);
  padding: var(--cg-spacing-md);
  border-radius: var(--cg-radius-md);
  box-shadow: var(--cg-shadow-md);
}

@media (prefers-color-scheme: dark) {
  .my-custom-element {
    box-shadow: var(--cg-shadow-md-dark);
  }
}
```

**Available CSS Variables:**

**Colors:**
- `--cg-color-text-primary` - Main text color
- `--cg-color-text-secondary` - Secondary text color
- `--cg-color-bg-primary` - Main background color
- `--cg-color-bg-secondary` - Secondary background color
- `--cg-color-border` - Border color
- `--cg-color-primary` - Primary brand color (blue)
- `--cg-color-success` - Success color (green)
- `--cg-color-warning` - Warning color (yellow)
- `--cg-color-secondary` - Secondary color (gray)

**Spacing:**
- `--cg-spacing-xs` (5px)
- `--cg-spacing-sm` (10px)
- `--cg-spacing-md` (20px)
- `--cg-spacing-lg` (30px)
- `--cg-spacing-xl` (40px)

**Border Radius:**
- `--cg-radius-sm` (4px)
- `--cg-radius-md` (8px)
- `--cg-radius-lg` (12px)

**Shadows:**
- `--cg-shadow-sm` / `--cg-shadow-sm-dark`
- `--cg-shadow-md` / `--cg-shadow-md-dark`
- `--cg-shadow-lg` / `--cg-shadow-lg-dark`

---

## Manual Implementation

If you need custom styles beyond the framework:

### Pattern 1: Text Colors

```css
.my-element {
  color: #333;
}

@media (prefers-color-scheme: dark) {
  .my-element {
    color: #e0e0e0;
  }
}
```

**Standard Colors:**
- Light mode text: `#333` (dark gray)
- Dark mode text: `#e0e0e0` (light gray)
- Light mode secondary: `#666`
- Dark mode secondary: `#999`

### Pattern 2: Background Colors

```css
.my-container {
  background: #ffffff;
}

@media (prefers-color-scheme: dark) {
  .my-container {
    background: #1e1e1e;
  }
}
```

**Standard Backgrounds:**
- Light mode: `#ffffff` (white) or `#f8f9fa` (light gray)
- Dark mode: `#1e1e1e` (very dark gray) or `#2a2a2a` (dark gray)

### Pattern 3: Borders

```css
.my-element {
  border: 1px solid #ddd;
}

@media (prefers-color-scheme: dark) {
  .my-element {
    border-color: #444;
  }
}
```

### Pattern 4: Buttons (Custom)

```css
.my-button {
  background: #007bff;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
}

.my-button:hover {
  background: #0056b3;
}

@media (prefers-color-scheme: dark) {
  .my-button {
    background: #0d6efd;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  }

  .my-button:hover {
    background: #0b5ed7;
  }
}
```

### Pattern 5: Game Boards/Cells

```css
.game-board {
  background: #2c3e50;
  padding: 16px;
  border-radius: 12px;
}

@media (prefers-color-scheme: dark) {
  .game-board {
    background: #1a252f;
  }
}

.game-cell {
  background: #ffffff;
  color: #333;
}

@media (prefers-color-scheme: dark) {
  .game-cell {
    background: #1e1e1e;
    color: #e0e0e0;
  }
}
```

### Pattern 6: Hover States

```css
.clickable-cell {
  background: #ffffff;
  transition: all 0.2s;
}

.clickable-cell:hover {
  background: #e3f2fd;
  box-shadow: 0 4px 8px rgba(0, 123, 255, 0.2);
}

@media (prefers-color-scheme: dark) {
  .clickable-cell {
    background: #1e1e1e;
  }

  .clickable-cell:hover {
    background: #1a3a52;
    box-shadow: 0 4px 8px rgba(74, 158, 255, 0.4);
  }
}
```

---

## Testing Dark Mode

### Browser DevTools

**Chrome/Edge:**
1. Open DevTools (F12)
2. Press `Ctrl+Shift+P` (Cmd+Shift+P on Mac)
3. Type "dark mode"
4. Select "Emulate CSS prefers-color-scheme: dark"

**Firefox:**
1. Open DevTools (F12)
2. Go to Inspector tab
3. Click the sun/moon icon in the toolbar

**Safari:**
1. Enable Develop menu (Safari > Preferences > Advanced)
2. Develop > Experimental Features > Dark Mode CSS Support

### OS-Level Testing

**macOS:**
- System Preferences > General > Appearance > Dark

**Windows:**
- Settings > Personalization > Colors > Choose your mode > Dark

**Linux (GNOME):**
- Settings > Appearance > Dark

### Manual Testing Checklist

For each game, verify in BOTH light and dark modes:

- [ ] All text is readable (sufficient contrast)
- [ ] Buttons are visible and clearly defined
- [ ] Form inputs are usable and visible
- [ ] Game boards/elements are clearly visible
- [ ] Hover states work and are visible
- [ ] Focus states (keyboard navigation) are visible
- [ ] Status messages are readable
- [ ] Warning/share sections stand out
- [ ] No pure white on pure black (too harsh)
- [ ] No pure black on pure white (too harsh)

### Automated Testing

Add to your test suite:

```typescript
describe('Dark Mode', () => {
  it('should apply dark mode styles', () => {
    // Mock prefers-color-scheme
    window.matchMedia = jest.fn().mockImplementation(query => ({
      matches: query === '(prefers-color-scheme: dark)',
      media: query,
      onchange: null,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));

    render(<App />);

    // Verify dark mode classes or computed styles
    const element = screen.getByRole('button');
    const styles = window.getComputedStyle(element);

    expect(styles.backgroundColor).toBe('rgb(13, 110, 253)'); // Dark mode blue
  });
});
```

---

## Common Patterns

### Color Palette

**Light Mode:**
```css
Background:     #ffffff, #f8f9fa, #f5f5f5
Text:           #333, #666, #999
Border:         #ddd
Primary:        #007bff (blue)
Success:        #28a745 (green)
Warning:        #ffc107 (yellow)
Secondary:      #6c757d (gray)
```

**Dark Mode:**
```css
Background:     #1e1e1e, #2a2a2a
Text:           #e0e0e0, #999, #666
Border:         #444
Primary:        #0d6efd (brighter blue)
Success:        #198754 (brighter green)
Warning:        #b8860b (darker yellow)
Secondary:      #6c757d (same gray)
```

### Shadow Adjustments

Shadows need to be stronger in dark mode:

```css
box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);  /* Light mode */
box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);  /* Dark mode */
```

### Hover State Pattern

```css
/* Light mode */
background: #007bff;
hover: #0056b3;  /* Darker on hover */

/* Dark mode */
background: #0d6efd;
hover: #0b5ed7;  /* Darker on hover (but still bright) */
```

---

## Troubleshooting

### Problem: Styles not updating in dark mode

**Solution:**
1. Clear browser cache
2. Check CSS specificity (media query might be overridden)
3. Verify `color-scheme: light dark` is in `:root`

### Problem: Colors look washed out in dark mode

**Solution:**
- Use slightly brighter/more saturated colors in dark mode
- Example: `#007bff` (light) → `#0d6efd` (dark) - brighter blue

### Problem: Text hard to read

**Solution:**
- Check contrast ratio: https://webaim.org/resources/contrastchecker/
- Minimum 4.5:1 for normal text
- Minimum 3:1 for large text (18px+)
- Use `#e0e0e0` text on `#1e1e1e` background (good contrast)

### Problem: Pure black on pure white is harsh

**Solution:**
- Use softer colors:
  - Instead of `#000000` → use `#333333`
  - Instead of `#ffffff` → use `#f8f9fa`

### Problem: Shadows invisible in dark mode

**Solution:**
- Increase shadow opacity: `rgba(0, 0, 0, 0.3)` instead of `0.1`
- Or add subtle glow: `0 0 10px rgba(255, 255, 255, 0.1)`

---

## Examples from Existing Games

### Emoji Chain

See: `games/emoji-chain/src/App.css`

Complete dark mode implementation with:
- All text elements
- Emoji selector buttons
- Share sections
- Form inputs

### Tic-Tac-Toe

See: `games/tic-tac-toe/src/App.css`

Complete dark mode implementation with:
- Game board and cells
- All button variants
- Forms
- URL sharing
- Status messages

---

## Framework Updates

When adding new shared patterns to the framework:

1. Update `/packages/core/src/styles/correspondence-games.css`
2. Add CSS variables for customization
3. Document in this guide
4. Test in both existing games
5. Update game templates

---

## Future Enhancements

Consider implementing:

1. **User toggle**: Let users override OS preference
2. **Transition animations**: Smooth color transitions when switching modes
3. **Additional themes**: High contrast, blue light reduction, etc.
4. **Saved preference**: Remember user's choice in localStorage
5. **Game-specific colors**: Allow games to define custom color schemes

---

## Quick Reference

**Minimum requirements for new games:**

1. Add to CSS:
   ```css
   @import '@correspondence-games/core/src/styles/correspondence-games.css';

   :root {
     color-scheme: light dark;
   }
   ```

2. Use framework classes for buttons, forms, containers

3. For custom elements, add `@media (prefers-color-scheme: dark)` blocks

4. Test in both light and dark modes

5. Verify sufficient contrast for all text

---

**Last Updated:** October 2025

**Version:** 1.0.0

**Maintainer:** Correspondence Games Framework Team
