# Task PRP: Fix VictoryScreen Share Result Button

**Issue**: #1 - [BUG] Victory Display Broken
**Branch**: `issue-1-fix-victory-display`
**Created**: 2025-10-17
**Status**: Ready for Execution

---

## Goal

Fix VictoryScreen Share Result button to properly display the URLSharer component with a generated delta URL, and remove the non-functional New Game button from the victory screen.

---

## Why (Business Value)

**User Impact**: High - Players cannot share game results with opponents, breaking the collaborative/social aspect of the game.

**Problem**:
- Share Result button console logs but doesn't show URL form
- Players cannot copy/share victory URLs with opponents
- New Game button exists but is not part of victory flow requirements

**Expected Outcome**:
- Players can click Share Result to see URLSharer with pre-populated victory URL
- Players can copy and share the URL with their opponent
- Victory screen only shows Share Result action (New Game button removed)

---

## What (User-Visible Behavior)

### Current Behavior
1. Game ends, VictoryScreen displays
2. User clicks "Share Result" button
3. Console logs "Share victory result"
4. Nothing happens - no URL form appears

### Expected Behavior
1. Game ends, VictoryScreen displays
2. User clicks "Share Result" button
3. URLSharer component appears with pre-populated victory URL
4. User can copy URL and share with opponent
5. Only "Share Result" button visible (New Game removed)

### Technical Requirements
- Generate delta URL with final game state when Share Result clicked
- Display existing URLSharer component (same as during gameplay)
- Manage visibility state for URLSharer (show after button click)
- Remove New Game button and onNewGame prop handling

---

## All Needed Context

### Pattern: URL Generation During Gameplay

**Location**: `src/App.tsx` lines 282-294

Current gameplay pattern:
```typescript
const handleConfirmMove = (): void => {
  if (state.pendingMove) {
    // Update URL first using updateUrlImmediate
    if (state.mode === 'url') {
      const deltaUrl = buildDeltaUrl(/* ... */);
      updateUrlImmediate(deltaPayload);

      // IMPORTANT: getShareUrl() reads from window.location.hash
      const shareUrl = getShareUrl();
      dispatch({ type: 'URL_GENERATED', url: shareUrl });
    }
  }
};
```

**Pattern to follow for Victory**:
1. Build delta URL with final game state
2. Update URL via `updateUrlImmediate()`
3. Call `getShareUrl()` to get full shareable URL
4. Show URLSharer with that URL

### File Dependency Map

**Files to Modify**:
1. `/home/ryankhetlyr/Development/kings-cooking/src/App.tsx` (lines 534-539)
   - Victory phase URL generation logic
   - Props passed to VictoryScreen

2. `/home/ryankhetlyr/Development/kings-cooking/src/components/game/VictoryScreen.tsx`
   - Add URLSharer import and state management
   - Remove New Game button (lines 287-294)
   - Update onShare handler to show URLSharer
   - Update interface to remove onNewGame

**Files to Reference** (no changes needed):
- `src/lib/urlEncoding/urlBuilder.ts` - `buildFullStateUrl()` function
- `src/hooks/useUrlState.ts` - `getShareUrl()` function
- `src/components/game/URLSharer.tsx` - Component to display

### Gotchas & Edge Cases

1. **URL Generation Timing**: Must call `updateUrlImmediate()` BEFORE `getShareUrl()` because getShareUrl reads from `window.location.hash`

2. **Victory State in URL**: The GameState already contains victory information:
   - `status: 'white_wins' | 'black_wins' | 'draw'`
   - `winner: 'white' | 'black' | null`
   - `whiteCourt` and `blackCourt` arrays with scored pieces
   - Delta URLs already work for victory state

3. **URL Type Choice**: Use `buildFullStateUrl()` instead of `buildDeltaUrl()` for victory sharing:
   - Full state ensures opponent sees complete final game state
   - Prevents issues if they're out of sync
   - Slightly longer URL (~1500 chars vs ~80) but more reliable

4. **Component State**: VictoryScreen needs local state for URLSharer visibility:
   ```typescript
   const [showUrlSharer, setShowUrlSharer] = useState(false);
   ```

5. **Props**: VictoryScreen needs URL passed as prop:
   ```typescript
   interface VictoryScreenProps {
     // ... existing props
     shareUrl?: string;  // Add this
     onShare?: () => void;  // Already exists
     // onNewGame: () => void;  // REMOVE this
   }
   ```

### React/TypeScript Patterns

**Reference**: `/home/ryankhetlyr/Development/kings-cooking/claude_md_files/CLAUDE-REACT.md`

**Key Patterns**:
1. **Conditional Rendering**: Use `{showUrlSharer && <URLSharer ... />}`
2. **State Management**: `const [showUrlSharer, setShowUrlSharer] = useState(false);`
3. **Event Handlers**: `onClick={() => setShowUrlSharer(true)}`
4. **Props**: Pass `shareUrl` from App.tsx to VictoryScreen
5. **TypeScript**: Update interface, remove optional `onNewGame`

---

## Implementation Blueprint

### Phase 1: Update App.tsx Victory URL Generation

**File**: `src/App.tsx`
**Lines**: 534-541

```typescript
// CURRENT CODE (lines 534-539):
if (state.mode === 'url') {
  victoryProps.onShare = () => {
    // TODO: Generate victory URL for sharing
    console.log('Share victory result');
  };
}

// NEW CODE:
if (state.mode === 'url') {
  // Generate full state URL for victory sharing
  const victoryUrl = buildFullStateUrl(state.gameState, state.player1Name);
  const fullShareUrl = getShareUrl(); // Gets current URL from window.location

  victoryProps.shareUrl = fullShareUrl || victoryUrl;
  victoryProps.onShare = () => {
    // Trigger showing URLSharer in VictoryScreen
    // VictoryScreen will manage its own visibility state
  };
}
```

**Changes**:
1. Import `buildFullStateUrl` from `@/lib/urlEncoding/urlBuilder`
2. Generate full state URL with final game state
3. Pass `shareUrl` as prop to VictoryScreen
4. Remove TODO comment

**Validation**:
```bash
pnpm run check  # TypeScript compilation
pnpm test -- src/App.test.tsx  # Unit tests pass
```

---

### Phase 2: Update VictoryScreen Component

**File**: `src/components/game/VictoryScreen.tsx`

#### Step 2.1: Update Interface (lines 10-37)

```typescript
// REMOVE:
onNewGame: () => void;

// ADD:
shareUrl?: string;

// KEEP (already exists):
onShare?: () => void;
```

#### Step 2.2: Add Imports (top of file)

```typescript
import { useState } from 'react';  // Add useState
import { URLSharer } from './URLSharer';  // Add URLSharer import
```

#### Step 2.3: Add State Management (after component start, line ~88)

```typescript
export const VictoryScreen = ({ /* ... */ }: VictoryScreenProps): ReactElement => {
  // URL sharing state
  const [showUrlSharer, setShowUrlSharer] = useState(false);

  // Existing code continues...
  const getAutoScoredPieces = (owner: 'white' | 'black'): Piece[] => {
```

#### Step 2.4: Remove New Game Button (lines 287-294)

**DELETE ENTIRE BLOCK**:
```typescript
<button
  type="button"
  onClick={onNewGame}
  className={`${styles.button} ${styles.primaryButton}`}
  aria-label="Start a new game"
>
  New Game
</button>
```

#### Step 2.5: Update Share Result Button (lines 296-305)

**CURRENT**:
```typescript
{onShare && (
  <button
    type="button"
    onClick={onShare}
    className={`${styles.button} ${styles.secondaryButton}`}
    aria-label="Share game result"
  >
    Share Result
  </button>
)}
```

**NEW**:
```typescript
{onShare && shareUrl && (
  <button
    type="button"
    onClick={() => {
      onShare();  // Call parent callback if provided
      setShowUrlSharer(true);  // Show URLSharer
    }}
    className={`${styles.button} ${styles.primaryButton}`}  // Make it primary now
    aria-label="Share game result"
  >
    Share Result
  </button>
)}
```

#### Step 2.6: Add URLSharer Component (after actions div, before closing container)

**INSERT AFTER** line 317 `</div>` (closing actions div):

```typescript
{/* URL Sharing */}
{showUrlSharer && shareUrl && (
  <div style={{ marginTop: 'var(--spacing-lg)' }}>
    <URLSharer
      url={shareUrl}
      onCopy={() => {
        console.log('Victory URL copied successfully');
      }}
    />
  </div>
)}
```

**Validation**:
```bash
pnpm run check  # TypeScript compilation
pnpm test -- src/components/game/VictoryScreen.test.tsx  # Unit tests
```

---

### Phase 3: Update VictoryScreen Tests

**File**: `src/components/game/VictoryScreen.test.tsx`

#### Changes Needed:

1. **Remove onNewGame from test fixtures** (all test cases)
2. **Add shareUrl prop to test cases**
3. **Add tests for Share Result button behavior**
4. **Add tests for URLSharer visibility**

**Test Cases to Add**:

```typescript
describe('Share Result functionality', () => {
  it('shows Share Result button when shareUrl and onShare provided', () => {
    const mockOnShare = vi.fn();
    const shareUrl = 'https://example.com/game#abc123';

    render(<VictoryScreen
      {...defaultProps}
      shareUrl={shareUrl}
      onShare={mockOnShare}
    />);

    const button = screen.getByLabelText('Share game result');
    expect(button).toBeInTheDocument();
  });

  it('does not show Share Result button without shareUrl', () => {
    const mockOnShare = vi.fn();

    render(<VictoryScreen
      {...defaultProps}
      onShare={mockOnShare}
    />);

    const button = screen.queryByLabelText('Share game result');
    expect(button).not.toBeInTheDocument();
  });

  it('shows URLSharer after clicking Share Result', async () => {
    const user = userEvent.setup();
    const shareUrl = 'https://example.com/game#abc123';

    render(<VictoryScreen
      {...defaultProps}
      shareUrl={shareUrl}
      onShare={vi.fn()}
    />);

    const button = screen.getByLabelText('Share game result');
    await user.click(button);

    expect(screen.getByText('Share this game:')).toBeInTheDocument();
    expect(screen.getByDisplayValue(shareUrl)).toBeInTheDocument();
  });

  it('calls onShare callback when Share Result clicked', async () => {
    const user = userEvent.setup();
    const mockOnShare = vi.fn();
    const shareUrl = 'https://example.com/game#abc123';

    render(<VictoryScreen
      {...defaultProps}
      shareUrl={shareUrl}
      onShare={mockOnShare}
    />);

    const button = screen.getByLabelText('Share game result');
    await user.click(button);

    expect(mockOnShare).toHaveBeenCalledTimes(1);
  });
});

describe('New Game button', () => {
  it('does not render New Game button', () => {
    render(<VictoryScreen {...defaultProps} />);

    const button = screen.queryByText('New Game');
    expect(button).not.toBeInTheDocument();
  });
});
```

**Validation**:
```bash
pnpm test -- src/components/game/VictoryScreen.test.tsx
```

---

### Phase 4: Integration Tests

**File**: `src/test/integration/victory-url-sharing.integration.test.ts` (CREATE NEW)

```typescript
import { describe, it, expect } from 'vitest';
import { KingsChessEngine } from '@/lib/chess/KingsChessEngine';
import { buildFullStateUrl } from '@/lib/urlEncoding/urlBuilder';
import { parseGameUrl } from '@/lib/urlEncoding/urlParser';

describe('Victory URL Sharing Integration', () => {
  it('generates valid full state URL for victory state', () => {
    const engine = new KingsChessEngine();

    // Simulate game ending (simplified - adjust for actual game end scenario)
    // ... make moves until victory condition ...

    const gameState = engine.getGameState();
    const url = buildFullStateUrl(gameState, 'Player 1');

    expect(url).toMatch(/^#N4Ig/);  // Starts with compressed payload
    expect(url.length).toBeGreaterThan(10);
  });

  it('parses victory URL correctly', () => {
    const engine = new KingsChessEngine();
    // Set up victory state
    const gameState = engine.getGameState();
    const url = buildFullStateUrl(gameState, 'Player 1');

    const parsed = parseGameUrl(url, gameState);

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.payload.type).toBe('full_state');
      expect(parsed.payload.gameState.status).toMatch(/playing|white_wins|black_wins|draw/);
    }
  });

  it('victory state includes all required fields for display', () => {
    const engine = new KingsChessEngine();
    // Set up victory state
    const gameState = engine.getGameState();

    expect(gameState).toHaveProperty('whiteCourt');
    expect(gameState).toHaveProperty('blackCourt');
    expect(gameState).toHaveProperty('capturedWhite');
    expect(gameState).toHaveProperty('capturedBlack');
    expect(gameState).toHaveProperty('status');
    expect(gameState).toHaveProperty('winner');
    expect(gameState).toHaveProperty('currentTurn');
  });
});
```

**Validation**:
```bash
pnpm test:integration
```

---

### Phase 5: E2E Tests

**File**: `src/test/e2e/victory-sharing.e2e.ts` (CREATE NEW)

```typescript
import { test, expect } from '@playwright/test';

test.describe('Victory Screen URL Sharing', () => {
  test('Share Result button shows URLSharer with valid URL', async ({ page }) => {
    // Navigate to game in victory state
    // Note: You'll need to create a test fixture URL with victory state
    await page.goto('/');

    // TODO: Complete game to victory state
    // This requires implementing game completion flow

    // Verify victory screen displayed
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: /wins|draw/i })).toBeVisible();

    // Click Share Result button
    const shareButton = page.getByRole('button', { name: 'Share game result' });
    await expect(shareButton).toBeVisible();
    await shareButton.click();

    // Verify URLSharer appears
    await expect(page.getByText('Share this game:')).toBeVisible();

    // Verify URL is populated
    const urlInput = page.getByLabel('Game share URL');
    await expect(urlInput).toBeVisible();
    const url = await urlInput.inputValue();
    expect(url).toContain('#N4Ig');  // Compressed payload
    expect(url).toMatch(/^http/);  // Full URL
  });

  test('New Game button is not present', async ({ page }) => {
    // Navigate to game in victory state
    await page.goto('/');

    // TODO: Complete game to victory state

    // Verify New Game button is NOT present
    const newGameButton = page.getByRole('button', { name: 'New Game' });
    await expect(newGameButton).not.toBeVisible();
  });

  test('Copy button copies URL to clipboard', async ({ page, context }) => {
    // Grant clipboard permissions
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    // Navigate to victory state
    await page.goto('/');

    // TODO: Complete game to victory state

    // Click Share Result
    await page.getByRole('button', { name: 'Share game result' }).click();

    // Click Copy button
    await page.getByRole('button', { name: /copy/i }).click();

    // Verify success message
    await expect(page.getByText('Link copied to clipboard!')).toBeVisible();

    // Verify clipboard contains URL
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toContain('#N4Ig');
  });
});
```

**Validation**:
```bash
pnpm exec playwright install  # Ensure browsers installed
pnpm test:e2e
```

---

## Validation Loop

### Level 1: TypeScript & Linting
```bash
pnpm run check
pnpm run lint
```
**Expected**: Zero errors, zero warnings

**If Fail**:
- Check import statements are correct
- Verify interface changes match prop usage
- Fix any unused variable warnings

---

### Level 2: Unit Tests
```bash
pnpm test -- src/components/game/VictoryScreen.test.tsx
pnpm test -- src/App.test.tsx
```
**Expected**: All tests pass, new tests for Share Result behavior pass

**If Fail**:
- Check test fixtures have correct props
- Verify mock functions are set up correctly
- Ensure URLSharer component is mocked if needed

---

### Level 3: Integration Tests
```bash
pnpm test:integration
```
**Expected**: URL generation and parsing tests pass

**If Fail**:
- Verify buildFullStateUrl generates valid URLs
- Check parseGameUrl can parse victory URLs
- Ensure GameState has all required fields

---

### Level 4: E2E Tests
```bash
pnpm test:e2e
```
**Expected**: Victory screen E2E tests pass

**If Fail**:
- Check Playwright test setup is correct
- Verify victory state can be reached in test
- Ensure URLSharer component renders correctly

---

### Level 5: Build & Manual Testing
```bash
pnpm build
pnpm preview
```
**Manual Test Checklist**:
1. ✅ Complete a game to victory
2. ✅ Verify Share Result button appears
3. ✅ Click Share Result button
4. ✅ Verify URLSharer appears with URL
5. ✅ Copy URL and verify clipboard content
6. ✅ Verify New Game button is NOT present
7. ✅ Paste URL in new browser tab - verify victory screen loads

---

## Rollback Strategy

**If implementation fails**:
1. Revert changes to `App.tsx` - restore TODO comment
2. Revert changes to `VictoryScreen.tsx` - restore onNewGame button
3. Delete new test files
4. Run `pnpm test` to verify original state works

**Git Commands**:
```bash
git checkout src/App.tsx
git checkout src/components/game/VictoryScreen.tsx
git clean -fd src/test/  # Remove new test files
pnpm test  # Verify rollback successful
```

---

## Success Criteria

### Functional
- ✅ Share Result button shows URLSharer component
- ✅ URLSharer displays valid shareable URL
- ✅ Copy button copies URL to clipboard
- ✅ New Game button is removed
- ✅ Victory screen shows only Share Result action

### Technical
- ✅ TypeScript compilation passes with zero errors
- ✅ All unit tests pass (including new Share Result tests)
- ✅ Integration tests pass (URL generation/parsing)
- ✅ E2E tests pass (complete victory → share flow)
- ✅ Build succeeds without warnings
- ✅ Code coverage remains above 80%

### User Experience
- ✅ Clicking Share Result immediately shows URLSharer
- ✅ URL is pre-populated and ready to copy
- ✅ Copy button provides clear feedback
- ✅ No console errors in browser
- ✅ Works in both light and dark modes

---

## Notes & Assumptions

1. **URL Type**: Using `buildFullStateUrl()` for reliability over `buildDeltaUrl()` for victory sharing
2. **State Management**: VictoryScreen manages URLSharer visibility internally (no need for App.tsx state)
3. **Backward Compatibility**: onShare callback remains optional for non-URL mode games
4. **Accessibility**: Share Result button maintains ARIA labels and keyboard navigation
5. **Performance**: URL generation happens on demand (when button clicked) not on mount

---

## References

- Issue #1: https://github.com/randallard/kings-cooking/issues/1
- CLAUDE-REACT.md: `/home/ryankhetlyr/Development/kings-cooking/claude_md_files/CLAUDE-REACT.md`
- URL Encoding Docs: `src/lib/urlEncoding/README.md` (if exists)
- Victory Conditions: `src/lib/chess/victoryConditions.ts`
