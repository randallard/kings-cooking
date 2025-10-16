# URL-Based State Synchronization Research
**Research Date**: 2025-10-16
**Purpose**: Inform edge case handling and URL integration for King's Cooking chess game

---

## 1. History API Best Practices

### 1.1 replaceState vs pushState

**Source**: [MDN - History API](https://developer.mozilla.org/en-US/docs/Web/API/History_API/Working_with_the_History_API)

#### Key Differences

| Aspect | pushState() | replaceState() |
|--------|------------|----------------|
| History Entry | Creates new entry | Modifies current entry |
| Back Button | Returns to previous state | Skips to earlier state |
| Use Case | Navigation between views | Updating current view state |
| History Pollution | Can pollute history | Prevents history pollution |

#### When to Use Each

**Use `pushState()` when**:
- Users navigate between distinct views/sections in SPA
- Previous state should be accessible via back button
- Creating bookmarkable navigation points
- Each state represents a meaningful user action

**Use `replaceState()` when**:
- Updating URL without creating navigation history
- Correcting initial page state on load
- Syncing URL with transient UI state (filters, sorts)
- Preventing multiple back-button presses for same view

#### Syntax

```javascript
// pushState - adds to history
history.pushState(state, unused, url);

// replaceState - modifies current entry
history.replaceState(state, unused, url);
```

**Parameters**:
- `state`: Serializable JavaScript object (size limits apply, ~640KB-10MB browser-dependent)
- `unused`: Required for compatibility, pass empty string `""`
- `url`: Optional new URL (must be same-origin)

**Important**: Both methods return `undefined` and don't trigger page reloads or `hashchange` events.

---

### 1.2 Preventing Browser History Pollution

**Sources**:
- [Stack Overflow - replaceState vs pushState](https://stackoverflow.com/questions/17507091/replacestate-vs-pushstate)
- [ThatWare - pushState vs replaceState](https://thatware.co/pushstate-vs-replacestate/)

#### Anti-Pattern: History Spam
```javascript
// DON'T: Creates excessive history entries
onChange={(value) => {
  history.pushState({ filter: value }, "", `?filter=${value}`);
}}
```

#### Best Practice: Replace for Transient State
```javascript
// DO: Use replaceState for UI state updates
onChange={(value) => {
  history.replaceState({ filter: value }, "", `?filter=${value}`);
}}

// DO: Use pushState only for deliberate navigation
onNavigate={(page) => {
  history.pushState({ page }, "", `?page=${page}`);
}}
```

#### Pattern: Initial State Correction
```javascript
// Set initial state on page load
window.addEventListener('load', () => {
  history.replaceState({ initialized: true }, "", location.href);
});
```

---

### 1.3 Handling Back/Forward Button in SPAs

**Sources**:
- [MDN - popstate event](https://developer.mozilla.org/en-US/docs/Web/API/Window/popstate_event)
- [GeeksforGeeks - Stop Browser Back Button](https://www.geeksforgeeks.org/javascript/how-to-stop-browser-back-button-using-javascript/)

#### The popstate Event

**Event Type**: `PopStateEvent` inheriting from `Event`

**Key Property**: `event.state` - Returns copy of state object from `pushState()`/`replaceState()`

**When it Fires**:
- User clicks browser back/forward buttons
- `history.back()`, `history.forward()`, `history.go()` called
- **NOT** when `pushState()` or `replaceState()` called

**Timing**: Fires "near the end of the process to navigate to the new location"
- After new content loads
- After `pageshow` event
- Before `hashchange` event

#### Basic Implementation

```javascript
window.addEventListener('popstate', (event) => {
  console.log(`Location: ${document.location}`);
  console.log(`State: ${JSON.stringify(event.state)}`);

  // Restore application state
  if (event.state) {
    restoreGameState(event.state);
  }
});
```

#### Critical Browser Quirks

**Page Load Behavior** (inconsistent across browsers):
- Chrome (pre-v34): Fires `popstate` on page load
- Safari (pre-v10): Fires `popstate` on page load
- Firefox: Never fires `popstate` on page load
- **Modern browsers** (Chrome 34+, Safari 10+, Firefox): Consistent - no `popstate` on load

**Interaction Requirement**:
> "Browsers may not fire the `popstate` event at all unless the page has been interacted with"

This prevents unwanted pop-ups and malicious navigation.

---

### 1.4 Detecting and Preventing Back Button Navigation

**Sources**:
- [Stack Overflow - Disable back button](https://stackoverflow.com/questions/31308958/disable-browser-back-button-for-one-page-application)
- [Jesal Gadhia - Preventing back button in SPAs](https://jes.al/2016/03/preventing-back-button-navigation-in-SPAs/)

#### UX Considerations

**⚠️ Warning**: Disabling back button is generally considered poor UX practice.

**Legitimate Use Cases**:
- Online exams/testing platforms
- Banking transactions
- Multi-step forms with destructive back navigation
- Game state that can't be recovered

#### Detection Pattern

```javascript
let preventBack = false;

window.addEventListener('popstate', (event) => {
  if (preventBack) {
    // Push state back to prevent navigation
    history.pushState(null, "", location.href);

    // Optionally show modal
    showNavigationWarning();
  }
});

// Initialize on critical pages
if (isCriticalGameState()) {
  history.pushState(null, "", location.href);
  preventBack = true;
}
```

#### Conditional Prevention (Recommended)

```javascript
// Use a flag to control when prevention is active
let unsavedChanges = false;

window.addEventListener('popstate', (event) => {
  if (unsavedChanges) {
    if (confirm('You have unsaved changes. Are you sure you want to leave?')) {
      unsavedChanges = false;
      // Allow navigation
    } else {
      // Prevent navigation
      history.pushState(null, "", location.href);
    }
  }
});
```

#### Best Practice: Warn, Don't Block

```javascript
// Better: Show warning modal instead of blocking
window.addEventListener('beforeunload', (event) => {
  if (gameInProgress) {
    event.preventDefault();
    event.returnValue = ''; // Chrome requires returnValue to be set
  }
});
```

---

## 2. URL Hash Fragment Patterns

### 2.1 Using Hash (#) for Client-Side State

**Sources**:
- [Wikipedia - URI Fragment](https://en.wikipedia.org/wiki/URI_fragment)
- [MDN - URL.hash](https://developer.mozilla.org/en-US/docs/Web/API/URL/hash)
- [HttpWatch - Fragment URLs](https://blog.httpwatch.com/2011/03/01/6-things-you-should-know-about-fragment-urls/)

#### Advantages of Hash Fragments

1. **No Server Requests**: Fragment identifiers aren't sent to server
2. **Instant Updates**: No page reload required
3. **Backward Compatible**: Works in all browsers
4. **Client-Only State**: Perfect for SPA state management
5. **Bookmarkable**: Can be saved and shared

#### Hash vs Search Params

```javascript
// Hash fragment (not sent to server)
// https://example.com/#gameState=xyz123
location.hash = '#gameState=xyz123';

// Search params (sent to server)
// https://example.com/?gameState=xyz123
location.search = '?gameState=xyz123';
```

#### Hash Change Detection

```javascript
window.addEventListener('hashchange', (event) => {
  console.log('Old URL:', event.oldURL);
  console.log('New URL:', event.newURL);

  const hash = location.hash.substring(1); // Remove #
  const state = parseHashState(hash);
  updateGameState(state);
});
```

#### Best Practice: Structured Hash Format

```javascript
// Use URL-friendly encoding
function setHashState(state) {
  const encoded = encodeURIComponent(JSON.stringify(state));
  location.hash = encoded;
}

function getHashState() {
  if (!location.hash) return null;
  const hash = location.hash.substring(1);
  return JSON.parse(decodeURIComponent(hash));
}
```

---

### 2.2 LZ-String Compression Techniques

**Sources**:
- [Stack Overflow - JS String Compression for URL](https://stackoverflow.com/questions/28413880/javascript-string-compression-for-url-hash-parameter)
- [Medium - Handling Long Query Strings](https://medium.com/suyeonme/effective-strategies-for-handling-long-query-strings-b790e1fddd65)
- [GitHub - lz-string](https://pieroxy.net/blog/pages/lz-string/index.html)

#### Why Compression?

Chess game state can be large:
- Board configuration (64 squares × piece data)
- Captured pieces
- Move history
- Game settings

**Uncompressed JSON**: ~2-5KB
**LZ-compressed**: ~500-1000 bytes (70-80% reduction)

#### LZ-String Library

**Installation**:
```bash
pnpm add lz-string
```

**Core Functions**:
```javascript
import LZString from 'lz-string';

// Compress for URL (URI-safe characters)
const compressed = LZString.compressToEncodedURIComponent(jsonString);

// Decompress
const original = LZString.decompressFromEncodedURIComponent(compressed);
```

#### Implementation Pattern

```javascript
import LZString from 'lz-string';

// Encode game state to URL
function encodeGameStateToURL(gameState) {
  const json = JSON.stringify(gameState);
  const compressed = LZString.compressToEncodedURIComponent(json);
  return compressed;
}

// Decode game state from URL
function decodeGameStateFromURL(urlParam) {
  try {
    const decompressed = LZString.decompressFromEncodedURIComponent(urlParam);
    if (!decompressed) return null;
    return JSON.parse(decompressed);
  } catch (error) {
    console.error('Failed to decode game state:', error);
    return null;
  }
}

// Usage
const state = { board: [...], moves: [...], settings: {...} };
const encoded = encodeGameStateToURL(state);
history.replaceState(null, "", `#game=${encoded}`);

// Restore from URL
const hash = location.hash.substring(1);
const params = new URLSearchParams(hash);
const gameState = decodeGameStateFromURL(params.get('game'));
```

#### Alternative: Base64 Encoding (Simpler, Less Efficient)

```javascript
// Less compression but simpler
function encodeBase64(data) {
  const json = JSON.stringify(data);
  return btoa(unescape(encodeURIComponent(json)));
}

function decodeBase64(encoded) {
  try {
    const json = decodeURIComponent(escape(atob(encoded)));
    return JSON.parse(json);
  } catch (error) {
    return null;
  }
}
```

---

### 2.3 URL Length Limits Across Browsers

**Sources**:
- [Stack Overflow - Maximum URL length](https://stackoverflow.com/questions/417142/what-is-the-maximum-length-of-a-url-in-different-browsers)
- [Baeldung - Max URL Length](https://www.baeldung.com/cs/max-url-length)

#### Browser Limits (2025)

| Browser | Maximum URL Length | Notes |
|---------|-------------------|-------|
| **Chrome** | 2 MB (2,097,152 chars) | Practical limit ~2048 chars |
| **Firefox** | 65,536 chars | Location bar stops displaying after limit |
| **Safari** | 80,000 chars | Error displayed if exceeded |
| **Edge** | ~2 MB | Same engine as Chrome |
| **Mobile Browsers** | Varies | Generally more restrictive |

#### Safe Practical Limit

**Recommendation**: **2,048 characters** total URL length

**Reasoning**:
- Works across all browsers
- Compatible with search engine crawlers
- Works with most server configurations (Apache, Nginx)
- Won't cause issues with proxies/firewalls

#### URL Budget Calculation

```javascript
// Example URL structure
// https://kingscooking.github.io/game#state=COMPRESSED_DATA

const BASE_URL = 'https://kingscooking.github.io/game'; // 40 chars
const HASH_PREFIX = '#state='; // 7 chars
const SAFETY_MARGIN = 100; // chars
const AVAILABLE_FOR_STATE = 2048 - BASE_URL.length - HASH_PREFIX.length - SAFETY_MARGIN;
// = 1,901 characters available

console.log(`Available for game state: ${AVAILABLE_FOR_STATE} chars`);
```

#### Overflow Handling

```javascript
function encodeWithFallback(gameState) {
  const compressed = LZString.compressToEncodedURIComponent(
    JSON.stringify(gameState)
  );

  const MAX_LENGTH = 1900; // Conservative limit

  if (compressed.length > MAX_LENGTH) {
    console.warn('State too large for URL, using localStorage fallback');

    // Generate short ID
    const id = generateShortId();
    localStorage.setItem(`game-${id}`, compressed);

    return id; // Just store ID in URL
  }

  return compressed;
}
```

---

### 2.4 Error Handling for Corrupted/Malformed URLs

**Sources**:
- [Stack Overflow - Corrupted payload](https://stackoverflow.com/questions/35656404/whats-the-most-appropriate-http-error-code-for-a-corrupted-payload-checksum-fa)
- [UX Stack Exchange - Invalid querystring](https://ux.stackexchange.com/questions/85451/when-invalid-querystring-paramater-detected-in-a-web-page-url-throw-an-error-or)

#### Detection Strategy

```javascript
function loadGameStateFromURL() {
  const hash = location.hash.substring(1);
  if (!hash) return null;

  try {
    // Parse hash
    const params = new URLSearchParams(hash);
    const encoded = params.get('state');

    if (!encoded) {
      throw new Error('No state parameter found');
    }

    // Decompress
    const decompressed = LZString.decompressFromEncodedURIComponent(encoded);
    if (!decompressed) {
      throw new Error('Decompression failed - corrupted data');
    }

    // Parse JSON
    const state = JSON.parse(decompressed);

    // Validate structure
    if (!validateGameState(state)) {
      throw new Error('Invalid game state structure');
    }

    return state;

  } catch (error) {
    console.error('Failed to load game state from URL:', error);
    handleCorruptedURL(error);
    return null;
  }
}
```

#### Validation Function

```javascript
function validateGameState(state) {
  // Required fields
  if (!state || typeof state !== 'object') return false;
  if (!Array.isArray(state.board)) return false;
  if (!state.currentPlayer) return false;

  // Board dimensions
  if (state.board.length === 0) return false;
  if (!state.board.every(row => Array.isArray(row))) return false;

  // Valid players
  if (!['white', 'black'].includes(state.currentPlayer)) return false;

  return true;
}
```

#### User-Friendly Error Recovery

```javascript
function handleCorruptedURL(error) {
  // Remove bad hash
  history.replaceState(null, "", location.pathname);

  // Show user-friendly message
  showNotification({
    type: 'error',
    title: 'Could not load game state',
    message: 'The game link appears to be corrupted. Starting a new game.',
    actions: [
      { label: 'Start New Game', action: () => startNewGame() },
      { label: 'Load from Backup', action: () => loadFromLocalStorage() }
    ]
  });

  // Log for debugging
  console.error('URL parsing error:', {
    error: error.message,
    hash: location.hash,
    timestamp: new Date().toISOString()
  });
}
```

#### Checksum Validation (Optional but Recommended)

```javascript
import crypto from 'crypto';

function encodeWithChecksum(gameState) {
  const json = JSON.stringify(gameState);
  const compressed = LZString.compressToEncodedURIComponent(json);

  // Calculate checksum
  const checksum = calculateChecksum(compressed);

  // Append checksum
  return `${compressed}.${checksum}`;
}

function decodeWithChecksum(encoded) {
  const [compressed, providedChecksum] = encoded.split('.');

  if (!providedChecksum) {
    throw new Error('Missing checksum');
  }

  const calculatedChecksum = calculateChecksum(compressed);

  if (calculatedChecksum !== providedChecksum) {
    throw new Error('Checksum mismatch - data corrupted');
  }

  return LZString.decompressFromEncodedURIComponent(compressed);
}

function calculateChecksum(data) {
  // Simple hash for checksum
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(36); // Base36 for shorter string
}
```

---

## 3. Edge Case Handling Patterns

### 3.1 Browser Back Button Blocking/Detection

**Sources**:
- [Jesal Gadhia - Preventing back button in SPAs](https://jes.al/2016/03/preventing-back-button-navigation-in-SPAs/)
- [Telerik - Respect the Back Button](https://www.telerik.com/blogs/please-respect-the-back-button)

#### Chess Game Use Case: Active Game Protection

```javascript
class GameNavigationGuard {
  constructor() {
    this.gameActive = false;
    this.setupListeners();
  }

  setupListeners() {
    // Detect back button
    window.addEventListener('popstate', this.handlePopState.bind(this));

    // Detect page close/refresh
    window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));
  }

  handlePopState(event) {
    if (this.gameActive && !this.userConfirmedNavigation) {
      // Prevent navigation
      history.pushState(null, "", location.href);

      // Show confirmation modal
      this.showNavigationConfirmation((confirmed) => {
        if (confirmed) {
          this.userConfirmedNavigation = true;
          this.saveGameToLocalStorage();
          history.back();
        }
      });
    }
  }

  handleBeforeUnload(event) {
    if (this.gameActive) {
      event.preventDefault();
      event.returnValue = 'Game in progress. Are you sure you want to leave?';

      // Auto-save game state
      this.saveGameToLocalStorage();
    }
  }

  activateGuard() {
    this.gameActive = true;
    history.pushState(null, "", location.href);
  }

  deactivateGuard() {
    this.gameActive = false;
    this.userConfirmedNavigation = false;
  }

  showNavigationConfirmation(callback) {
    // Implementation with modal UI
    const modal = createModal({
      title: 'Game in Progress',
      message: 'Your game will be saved. Do you want to leave?',
      buttons: [
        { label: 'Stay', action: () => callback(false) },
        { label: 'Leave', action: () => callback(true) }
      ]
    });
    modal.show();
  }

  saveGameToLocalStorage() {
    const state = getCurrentGameState();
    localStorage.setItem('autosave', JSON.stringify(state));
    console.log('Game auto-saved');
  }
}

// Usage
const guard = new GameNavigationGuard();

// When game starts
function startGame() {
  guard.activateGuard();
}

// When game ends
function endGame() {
  guard.deactivateGuard();
}
```

---

### 3.2 Page Refresh with Stale URL Data

**Sources**:
- [Medium - Syncing localStorage with React state](https://cgarethc.medium.com/syncing-browser-local-storage-with-react-state-and-the-browser-url-in-a-spa-cd97adb10edc)
- [Thomas Derleth - localStorage sync](https://thomasderleth.de/keeping-react-state-and-local-storage-in-sync/)

#### Problem: URL vs localStorage Conflicts

When page refreshes:
1. URL hash contains game state
2. localStorage may have different (newer/older) state
3. Need to determine source of truth

#### Solution: Timestamp-Based Resolution

```javascript
function loadGameState() {
  const urlState = loadFromURL();
  const localState = loadFromLocalStorage();

  // Neither source has data
  if (!urlState && !localState) {
    return createNewGame();
  }

  // Only one source has data
  if (!urlState) return localState;
  if (!localState) return urlState;

  // Both sources have data - compare timestamps
  const urlTimestamp = urlState.lastUpdated || 0;
  const localTimestamp = localState.lastUpdated || 0;

  if (urlTimestamp > localTimestamp) {
    console.log('URL state is newer, using URL');
    // Update localStorage to match
    saveToLocalStorage(urlState);
    return urlState;
  } else {
    console.log('LocalStorage state is newer, using localStorage');
    // Update URL to match
    updateURL(localState);
    return localState;
  }
}

function saveGameState(state) {
  // Add timestamp
  const stateWithTimestamp = {
    ...state,
    lastUpdated: Date.now()
  };

  // Save to both sources
  saveToLocalStorage(stateWithTimestamp);
  updateURL(stateWithTimestamp);
}
```

#### Pattern: Version-Based Resolution

```javascript
const CURRENT_STATE_VERSION = 3; // Increment when schema changes

function migrateState(state, fromVersion) {
  let migrated = { ...state };

  // Apply migrations sequentially
  for (let v = fromVersion; v < CURRENT_STATE_VERSION; v++) {
    migrated = migrations[v](migrated);
  }

  migrated.version = CURRENT_STATE_VERSION;
  return migrated;
}

const migrations = {
  1: (state) => {
    // Migration from v1 to v2
    return { ...state, capturedPieces: { white: [], black: [] } };
  },
  2: (state) => {
    // Migration from v2 to v3
    return { ...state, gamePhase: 'playing' };
  }
};

function loadGameState() {
  const urlState = loadFromURL();
  const localState = loadFromLocalStorage();

  // Migrate if needed
  if (urlState && urlState.version < CURRENT_STATE_VERSION) {
    urlState = migrateState(urlState, urlState.version);
  }
  if (localState && localState.version < CURRENT_STATE_VERSION) {
    localState = migrateState(localState, localState.version);
  }

  // Continue with resolution logic...
}
```

---

### 3.3 Checksum Mismatch Resolution UI Patterns

**Source**: UX best practices synthesis

#### Three-Tier Recovery Strategy

**Tier 1: Silent Recovery**
```javascript
function attemptSilentRecovery(corruptedState) {
  // Try to salvage partial state
  const recovered = {
    board: corruptedState.board || createEmptyBoard(),
    currentPlayer: corruptedState.currentPlayer || 'white',
    gamePhase: corruptedState.gamePhase || 'setup'
  };

  if (validateGameState(recovered)) {
    console.log('Silently recovered from corruption');
    return recovered;
  }

  return null;
}
```

**Tier 2: User-Prompted Recovery**
```javascript
function promptUserRecovery(options) {
  return new Promise((resolve) => {
    showModal({
      title: 'Game State Issue',
      message: 'We detected an issue loading your game. How would you like to proceed?',
      options: [
        {
          label: 'Load Backup',
          description: 'Restore from most recent auto-save',
          icon: 'backup',
          action: () => resolve(options.backup)
        },
        {
          label: 'Start Fresh',
          description: 'Begin a new game',
          icon: 'new',
          action: () => resolve(null)
        },
        {
          label: 'View Details',
          description: 'See technical details',
          icon: 'info',
          action: () => showErrorDetails(options.error)
        }
      ]
    });
  });
}
```

**Tier 3: Graceful Degradation**
```javascript
async function handleCorruptedState(error, urlState) {
  // Tier 1: Try silent recovery
  const recovered = attemptSilentRecovery(urlState);
  if (recovered) {
    notifyUser('Game state recovered', 'info');
    return recovered;
  }

  // Tier 2: Check for backup
  const backup = await loadBackupState();
  if (backup) {
    const userChoice = await promptUserRecovery({ backup, error });
    if (userChoice) return userChoice;
  }

  // Tier 3: Fresh start
  clearBadState();
  return createNewGame();
}

function notifyUser(message, type = 'info') {
  // Non-blocking toast notification
  showToast({ message, type, duration: 3000 });
}

function clearBadState() {
  // Clean up corrupted data
  history.replaceState(null, "", location.pathname);
  localStorage.removeItem('game-state');
  console.log('Cleared corrupted state');
}
```

---

### 3.4 localStorage vs URL State Reconciliation

**Sources**:
- [GitHub - react-easy-params](https://github.com/solkimicreb/react-easy-params)
- [Stack Overflow - Populating state from localStorage](https://stackoverflow.com/questions/34825403/populating-state-from-localstorage-in-react)

#### Dual-Source Strategy

```javascript
class StateManager {
  constructor() {
    this.sources = ['url', 'localStorage', 'sessionStorage'];
    this.preferredSource = 'url'; // URL is source of truth for sharing
  }

  // Load state with fallback chain
  async loadState() {
    // Try URL first (for shared links)
    const urlState = this.loadFromURL();
    if (urlState && this.validate(urlState)) {
      // Sync to localStorage
      this.saveToLocalStorage(urlState);
      return urlState;
    }

    // Fallback to localStorage (for returning users)
    const localState = this.loadFromLocalStorage();
    if (localState && this.validate(localState)) {
      // Update URL for consistency
      this.updateURL(localState);
      return localState;
    }

    // Fallback to sessionStorage (for temporary sessions)
    const sessionState = this.loadFromSessionStorage();
    if (sessionState && this.validate(sessionState)) {
      return sessionState;
    }

    // All sources empty/invalid - create new
    return this.createDefaultState();
  }

  // Save state to all sources
  saveState(state) {
    const validated = this.validate(state) ? state : this.sanitize(state);

    this.updateURL(validated);
    this.saveToLocalStorage(validated);
    this.saveToSessionStorage(validated);
  }

  // Reconcile conflicts
  reconcile(urlState, localState) {
    // If identical, no conflict
    if (this.areEqual(urlState, localState)) {
      return urlState;
    }

    // Use URL state if explicitly shared (has shareId)
    if (urlState?.shareId) {
      return urlState;
    }

    // Use newer state based on timestamp
    return this.selectNewer(urlState, localState);
  }

  validate(state) {
    if (!state || typeof state !== 'object') return false;
    // Add your validation logic
    return validateGameState(state);
  }

  sanitize(state) {
    // Remove invalid fields, set defaults
    return {
      ...state,
      version: CURRENT_STATE_VERSION,
      lastUpdated: Date.now()
    };
  }

  areEqual(state1, state2) {
    return JSON.stringify(state1) === JSON.stringify(state2);
  }

  selectNewer(state1, state2) {
    const t1 = state1?.lastUpdated || 0;
    const t2 = state2?.lastUpdated || 0;
    return t1 > t2 ? state1 : state2;
  }

  // Individual source methods
  loadFromURL() {
    try {
      const hash = location.hash.substring(1);
      const params = new URLSearchParams(hash);
      const encoded = params.get('state');
      if (!encoded) return null;

      const decompressed = LZString.decompressFromEncodedURIComponent(encoded);
      return JSON.parse(decompressed);
    } catch (error) {
      console.error('Failed to load from URL:', error);
      return null;
    }
  }

  updateURL(state) {
    const encoded = LZString.compressToEncodedURIComponent(JSON.stringify(state));
    history.replaceState(null, "", `#state=${encoded}`);
  }

  loadFromLocalStorage() {
    try {
      const stored = localStorage.getItem('game-state');
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Failed to load from localStorage:', error);
      return null;
    }
  }

  saveToLocalStorage(state) {
    try {
      localStorage.setItem('game-state', JSON.stringify(state));
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  }

  loadFromSessionStorage() {
    try {
      const stored = sessionStorage.getItem('game-state');
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      return null;
    }
  }

  saveToSessionStorage(state) {
    try {
      sessionStorage.setItem('game-state', JSON.stringify(state));
    } catch (error) {
      console.error('Failed to save to sessionStorage:', error);
    }
  }
}
```

---

## 4. React Specific Patterns

### 4.1 useEffect Cleanup for popstate Listeners

**Sources**:
- [LogRocket - useEffect cleanup](https://blog.logrocket.com/understanding-react-useeffect-cleanup-function/)
- [DEV - Fix React memory leak](https://dev.to/jxprtn/how-to-fix-the-react-memory-leak-warning-d4i)
- [MDN - popstate event](https://developer.mozilla.org/en-US/docs/Web/API/Window/popstate_event)

#### The Problem: Memory Leaks

When components mount event listeners on `window` and unmount without cleanup:
- Event listener references persist
- Component can't be garbage collected
- Memory leaks accumulate with re-renders
- Stale closures access outdated state

#### Correct Pattern

```typescript
import { useEffect } from 'react';

function GameComponent() {
  const [gameState, setGameState] = useState(null);

  useEffect(() => {
    // Define handler inside useEffect to capture current dependencies
    const handlePopState = (event: PopStateEvent) => {
      console.log('Navigated to:', event.state);

      if (event.state?.gameState) {
        setGameState(event.state.gameState);
      }
    };

    // Add listener
    window.addEventListener('popstate', handlePopState);

    // CRITICAL: Cleanup function removes listener
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []); // Empty deps - runs once on mount

  return <div>Game UI</div>;
}
```

**Key Points**:
1. **Extract handler**: Define `handlePopState` inside `useEffect`
2. **Same reference**: Pass identical function to `removeEventListener`
3. **Return cleanup**: Cleanup runs before unmount and before re-runs
4. **Empty dependencies**: Usually `[]` for window listeners

#### Common Mistake: External Handler

```typescript
// DON'T: External handler creates closure issues
const handlePopState = (event) => {
  setGameState(event.state); // References stale state
};

useEffect(() => {
  window.addEventListener('popstate', handlePopState);
  return () => window.removeEventListener('popstate', handlePopState);
}, []); // handlePopState not in deps - stale closure
```

#### Advanced: Dynamic Dependencies

```typescript
function GameComponent({ gameId }: { gameId: string }) {
  const [gameState, setGameState] = useState(null);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      // Can safely use gameId - it's in dependency array
      if (event.state?.gameId === gameId) {
        setGameState(event.state.gameState);
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [gameId]); // Re-run when gameId changes

  return <div>Game {gameId}</div>;
}
```

#### Pattern: hashchange Cleanup

```typescript
useEffect(() => {
  const handleHashChange = () => {
    const newHash = location.hash.substring(1);
    const state = parseGameState(newHash);
    setGameState(state);
  };

  window.addEventListener('hashchange', handleHashChange);

  // Initial load
  handleHashChange();

  return () => {
    window.removeEventListener('hashchange', handleHashChange);
  };
}, []);
```

#### Multiple Event Listeners

```typescript
useEffect(() => {
  const handlePopState = (event) => { /* ... */ };
  const handleHashChange = () => { /* ... */ };
  const handleBeforeUnload = (event) => { /* ... */ };

  window.addEventListener('popstate', handlePopState);
  window.addEventListener('hashchange', handleHashChange);
  window.addEventListener('beforeunload', handleBeforeUnload);

  return () => {
    window.removeEventListener('popstate', handlePopState);
    window.removeEventListener('hashchange', handleHashChange);
    window.removeEventListener('beforeunload', handleBeforeUnload);
  };
}, []);
```

---

### 4.2 Preventing Infinite URL Update Loops

**Sources**:
- [Developer Way - Debouncing in React](https://www.developerway.com/posts/debouncing-in-react)
- [GitHub - Hooks useEffect infinite loop](https://github.com/reactjs/rfcs/issues/86)
- [Stack Overflow - Prevent infinite loop](https://stackoverflow.com/questions/56831803/prevent-infinite-loop-when-updating-state-via-react-useeffect-hook)

#### The Problem: Circular Updates

```typescript
// ANTI-PATTERN: Infinite loop
function GameComponent() {
  const [gameState, setGameState] = useState(null);

  useEffect(() => {
    // Read from URL
    const urlState = loadFromURL();
    setGameState(urlState); // Triggers re-render
  }, [gameState]); // gameState changes, triggers useEffect, loop!

  useEffect(() => {
    // Update URL
    updateURL(gameState); // Changes URL
  }, [gameState]); // gameState changes, triggers useEffect, updates URL, loop!

  return <div>Game</div>;
}
```

#### Solution 1: Separate URL Read/Write

```typescript
function GameComponent() {
  const [gameState, setGameState] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // READ: Load from URL once on mount
  useEffect(() => {
    const urlState = loadFromURL();
    if (urlState) {
      setGameState(urlState);
    }
    setIsInitialized(true);
  }, []); // Empty deps - runs once

  // WRITE: Update URL when state changes (after initialization)
  useEffect(() => {
    if (isInitialized && gameState) {
      updateURL(gameState);
    }
  }, [gameState, isInitialized]); // Only when gameState changes

  return <div>Game</div>;
}
```

#### Solution 2: useRef to Track Previous Value

```typescript
function GameComponent() {
  const [gameState, setGameState] = useState(null);
  const prevStateRef = useRef(null);

  useEffect(() => {
    // Load from URL only on mount
    const urlState = loadFromURL();
    if (urlState) {
      setGameState(urlState);
      prevStateRef.current = urlState;
    }
  }, []);

  useEffect(() => {
    // Only update URL if state actually changed
    if (gameState && gameState !== prevStateRef.current) {
      updateURL(gameState);
      prevStateRef.current = gameState;
    }
  }, [gameState]);

  return <div>Game</div>;
}
```

#### Solution 3: Deep Equality Check

```typescript
import { useEffect, useRef } from 'react';
import isEqual from 'lodash.isequal';

function GameComponent() {
  const [gameState, setGameState] = useState(null);
  const prevStateRef = useRef(null);

  useEffect(() => {
    // Only update if deeply different
    if (!isEqual(gameState, prevStateRef.current)) {
      updateURL(gameState);
      prevStateRef.current = gameState;
    }
  }, [gameState]);

  return <div>Game</div>;
}
```

#### Solution 4: Single Source of Truth Hook

```typescript
function useURLState(key: string, defaultValue: any) {
  const [state, setState] = useState(() => {
    // Initialize from URL
    const urlState = loadFromURL(key);
    return urlState ?? defaultValue;
  });

  const setURLState = useCallback((newState) => {
    setState(newState);
    updateURL(key, newState);
  }, [key]);

  // Sync from URL changes (e.g., back button)
  useEffect(() => {
    const handlePopState = () => {
      const urlState = loadFromURL(key);
      if (urlState) {
        setState(urlState);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [key]);

  return [state, setURLState];
}

// Usage
function GameComponent() {
  const [gameState, setGameState] = useURLState('game', createDefaultGame());

  return (
    <div>
      <button onClick={() => setGameState(makeMove(gameState))}>
        Make Move
      </button>
    </div>
  );
}
```

---

### 4.3 Debouncing URL Updates

**Sources**:
- [Developer Way - Debouncing in React](https://www.developerway.com/posts/debouncing-in-react)
- [FreeCodeCamp - Debouncing Explained](https://www.freecodecamp.org/news/debouncing-explained/)

#### Why Debounce?

Updating URL on every keystroke or piece movement:
- Creates excessive history entries
- Degrades performance
- Makes compression inefficient
- Pollutes browser history

#### Pattern 1: useMemo + useCallback

```typescript
import { useMemo, useCallback } from 'react';
import debounce from 'lodash.debounce';

function GameComponent() {
  const [gameState, setGameState] = useState(null);

  // Create debounced function once
  const debouncedUpdateURL = useMemo(
    () => debounce((state) => {
      console.log('Updating URL...');
      updateURL(state);
    }, 500), // 500ms delay
    [] // Created once
  );

  // Update URL when state changes (debounced)
  useEffect(() => {
    if (gameState) {
      debouncedUpdateURL(gameState);
    }

    // Cleanup pending debounced calls on unmount
    return () => {
      debouncedUpdateURL.cancel();
    };
  }, [gameState, debouncedUpdateURL]);

  return <div>Game</div>;
}
```

#### Pattern 2: Custom Hook with useRef

```typescript
function useDebounce(callback, delay) {
  const callbackRef = useRef(callback);

  // Update ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Create debounced function once
  const debouncedCallback = useMemo(() => {
    return debounce((...args) => {
      callbackRef.current?.(...args);
    }, delay);
  }, [delay]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      debouncedCallback.cancel();
    };
  }, [debouncedCallback]);

  return debouncedCallback;
}

// Usage
function GameComponent() {
  const [gameState, setGameState] = useState(null);

  const debouncedUpdateURL = useDebounce((state) => {
    updateURL(state);
  }, 500);

  useEffect(() => {
    if (gameState) {
      debouncedUpdateURL(gameState);
    }
  }, [gameState, debouncedUpdateURL]);

  return <div>Game</div>;
}
```

#### Pattern 3: Manual Debounce (No Dependencies)

```typescript
function GameComponent() {
  const [gameState, setGameState] = useState(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      if (gameState) {
        updateURL(gameState);
      }
    }, 500);

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [gameState]);

  return <div>Game</div>;
}
```

#### Immediate + Debounced Updates

```typescript
function GameComponent() {
  const [gameState, setGameState] = useState(null);

  const updateURLImmediate = useCallback((state) => {
    updateURL(state);
  }, []);

  const updateURLDebounced = useDebounce((state) => {
    updateURL(state);
  }, 1000);

  const handleMove = (move) => {
    const newState = applyMove(gameState, move);
    setGameState(newState);

    // Update URL immediately for important moves
    if (move.type === 'capture' || move.type === 'checkmate') {
      updateURLImmediate(newState);
    } else {
      updateURLDebounced(newState);
    }
  };

  return <div>Game</div>;
}
```

---

### 4.4 Memory Leak Prevention

**Sources**:
- [Medium - Memory leaks in React](https://medium.com/@shriharim006/memory-leaks-in-react-203de733f7d2)
- [Wisdom Geek - Avoiding race conditions](https://www.wisdomgeek.com/development/web-development/react/avoiding-race-conditions-memory-leaks-react-useeffect/)

#### Common Memory Leak Sources

1. **Event listeners** not removed
2. **Timers** (setTimeout/setInterval) not cleared
3. **Subscriptions** not unsubscribed
4. **State updates** on unmounted components

#### Pattern: Cleanup Checklist

```typescript
function GameComponent() {
  const [gameState, setGameState] = useState(null);

  useEffect(() => {
    let isMounted = true; // Track mount status

    // Event listeners
    const handlePopState = (event) => {
      if (isMounted) {
        setGameState(event.state?.gameState);
      }
    };
    window.addEventListener('popstate', handlePopState);

    // Timers
    const autoSaveTimer = setInterval(() => {
      if (isMounted && gameState) {
        saveToLocalStorage(gameState);
      }
    }, 30000); // Auto-save every 30s

    // Subscriptions (WebRTC example)
    const unsubscribe = webRTCConnection.subscribe((message) => {
      if (isMounted) {
        handleGameMessage(message);
      }
    });

    // Async operations
    async function loadGame() {
      try {
        const state = await fetchGameState();
        if (isMounted) {
          setGameState(state);
        }
      } catch (error) {
        if (isMounted) {
          handleError(error);
        }
      }
    }
    loadGame();

    // CLEANUP
    return () => {
      isMounted = false;
      window.removeEventListener('popstate', handlePopState);
      clearInterval(autoSaveTimer);
      unsubscribe();
    };
  }, []);

  return <div>Game</div>;
}
```

#### Pattern: AbortController for Fetch

```typescript
function GameComponent() {
  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    async function fetchGame() {
      try {
        const response = await fetch('/api/game', { signal });
        const data = await response.json();
        setGameState(data);
      } catch (error) {
        if (error.name === 'AbortError') {
          console.log('Fetch aborted');
        } else {
          handleError(error);
        }
      }
    }

    fetchGame();

    return () => {
      controller.abort(); // Cancel fetch on unmount
    };
  }, []);

  return <div>Game</div>;
}
```

#### Pattern: Ref-Based Cancellation

```typescript
function GameComponent() {
  const timeoutsRef = useRef([]);
  const intervalsRef = useRef([]);

  const setTimeout = useCallback((callback, delay) => {
    const id = window.setTimeout(callback, delay);
    timeoutsRef.current.push(id);
    return id;
  }, []);

  const setInterval = useCallback((callback, delay) => {
    const id = window.setInterval(callback, delay);
    intervalsRef.current.push(id);
    return id;
  }, []);

  useEffect(() => {
    // Use wrapped setTimeout/setInterval
    setTimeout(() => console.log('Delayed'), 1000);
    setInterval(() => console.log('Periodic'), 5000);

    // Cleanup all timers
    return () => {
      timeoutsRef.current.forEach(clearTimeout);
      intervalsRef.current.forEach(clearInterval);
      timeoutsRef.current = [];
      intervalsRef.current = [];
    };
  }, [setTimeout, setInterval]);

  return <div>Game</div>;
}
```

---

## 5. Security Considerations

### 5.1 XSS (Cross-Site Scripting) Risks

**Sources**:
- [OWASP - XSS](https://owasp.org/www-community/attacks/xss)
- [PortSwigger - XSS vs CSRF](https://portswigger.net/web-security/csrf/xss-vs-csrf)

#### Risk: Malicious State in URL

Attackers can craft URLs with malicious payloads:

```
https://kingscooking.com/#state=<script>stealCookies()</script>
```

#### Mitigation 1: Never Use innerHTML

```typescript
// DON'T
function DisplayGameState({ urlState }) {
  return <div dangerouslySetInnerHTML={{ __html: urlState }} />;
}

// DO
function DisplayGameState({ urlState }) {
  const parsedState = parseGameState(urlState);
  return <div>{JSON.stringify(parsedState)}</div>;
}
```

#### Mitigation 2: Validate and Sanitize

```typescript
function parseGameState(encoded: string): GameState | null {
  try {
    const decompressed = LZString.decompressFromEncodedURIComponent(encoded);
    const parsed = JSON.parse(decompressed);

    // Validate structure
    if (!isValidGameState(parsed)) {
      throw new Error('Invalid game state structure');
    }

    // Sanitize values
    return sanitizeGameState(parsed);
  } catch (error) {
    console.error('Failed to parse game state:', error);
    return null;
  }
}

function sanitizeGameState(state: any): GameState {
  return {
    board: Array.isArray(state.board) ? state.board.map(sanitizeRow) : [],
    currentPlayer: ['white', 'black'].includes(state.currentPlayer)
      ? state.currentPlayer
      : 'white',
    // Sanitize all fields
  };
}
```

#### Mitigation 3: Content Security Policy

```html
<!-- Add to HTML head -->
<meta http-equiv="Content-Security-Policy"
      content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';">
```

---

### 5.2 CSRF (Cross-Site Request Forgery)

**Sources**:
- [OWASP - CSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [Wiz - CSRF Examples](https://www.wiz.io/academy/cross-site-request-forgery-csrf)

#### Risk for King's Cooking

Since King's Cooking uses WebRTC (peer-to-peer), traditional CSRF is less relevant. However:

**Concern**: Malicious links could manipulate game state

```
https://kingscooking.com/#state=MALICIOUS_ENCODED_STATE
```

#### Mitigation: Signed State

```typescript
import crypto from 'crypto';

const SECRET_KEY = process.env.STATE_SIGNING_KEY;

function signState(state: GameState): string {
  const json = JSON.stringify(state);
  const signature = crypto
    .createHmac('sha256', SECRET_KEY)
    .update(json)
    .digest('hex');

  return `${json}.${signature}`;
}

function verifyState(signed: string): GameState | null {
  const [json, providedSignature] = signed.split('.');

  const expectedSignature = crypto
    .createHmac('sha256', SECRET_KEY)
    .update(json)
    .digest('hex');

  if (providedSignature !== expectedSignature) {
    console.error('State signature invalid');
    return null;
  }

  return JSON.parse(json);
}
```

**Note**: For client-only apps, signing is limited since key is exposed. Better approach: checksum validation (shown earlier).

---

### 5.3 URL Injection Attacks

#### Risk: Path Traversal

```typescript
// DON'T: Unsafe URL construction
const gameId = params.get('id'); // Could be: ../../admin
window.location.href = `/game/${gameId}`;
```

#### Mitigation: Whitelist Validation

```typescript
function sanitizeGameId(id: string): string | null {
  // Only allow alphanumeric and hyphens
  if (!/^[a-zA-Z0-9-]+$/.test(id)) {
    console.error('Invalid game ID format');
    return null;
  }

  // Limit length
  if (id.length > 50) {
    console.error('Game ID too long');
    return null;
  }

  return id;
}

// Usage
const rawId = params.get('id');
const gameId = sanitizeGameId(rawId);
if (!gameId) {
  navigate('/error');
  return;
}
```

---

### 5.4 Data Privacy

#### Risk: Exposing Sensitive Data in URLs

URLs are:
- Logged in browser history
- Logged in server logs
- Sent in Referer headers
- Visible in address bar
- Shareable

#### Best Practice: Limit State in URL

```typescript
// DON'T: Store user identifiers
const state = {
  userId: '12345',
  email: 'user@example.com',
  board: [...]
};

// DO: Store only game data
const state = {
  board: [...],
  moves: [...],
  settings: {...}
};
```

#### Pattern: Short Links with Server Storage

```typescript
// Generate short ID
async function createShareableLink(gameState: GameState): Promise<string> {
  const id = generateShortId(); // e.g., "a7bk3m"

  // Store on server (or use localStorage for client-only)
  await storeGameState(id, gameState);

  return `https://kingscooking.com/game/${id}`;
}

// Retrieve state
async function loadGameState(id: string): Promise<GameState | null> {
  return await fetchGameState(id);
}
```

For client-only apps:
```typescript
function createShareableLink(gameState: GameState): string {
  const id = generateShortId();

  // Store in localStorage with expiration
  const stored = {
    state: gameState,
    expires: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
  };
  localStorage.setItem(`share-${id}`, JSON.stringify(stored));

  return `${location.origin}/#share=${id}`;
}
```

---

## 6. Browser Compatibility Notes

### 6.1 History API Support

**Source**: [Can I Use - History API](https://caniuse.com/history)

#### Support Matrix (2025)

| Browser | pushState/replaceState | popstate Event |
|---------|----------------------|----------------|
| Chrome | ✅ Since v5 (2010) | ✅ Full support |
| Firefox | ✅ Since v4 (2011) | ✅ Full support |
| Safari | ✅ Since v5 (2010) | ✅ Full support |
| Edge | ✅ All versions | ✅ Full support |
| iOS Safari | ✅ Since iOS 4.2 | ✅ Full support |
| Android | ✅ Since 2.3 | ✅ Full support |

**Verdict**: Universal support - no polyfill needed in 2025.

---

### 6.2 hashchange Event Support

**Source**: [MDN - hashchange event](https://developer.mozilla.org/en-US/docs/Web/API/Window/hashchange_event)

#### Support Matrix

| Browser | Support |
|---------|---------|
| All modern browsers | ✅ Full support since 2010 |

**Verdict**: Universal support.

---

### 6.3 Known Issues

#### iOS Safari (Pre-v10)

**Issue**: `popstate` fires on page load
**Impact**: May incorrectly trigger navigation logic
**Solution**:
```typescript
let isInitialLoad = true;

window.addEventListener('popstate', (event) => {
  if (isInitialLoad) {
    isInitialLoad = false;
    return; // Ignore initial popstate
  }

  handleNavigation(event.state);
});
```

#### Chrome on iOS

**Issue**: Back button may not fire `hashchange`
**Solution**: Listen to both `popstate` and `hashchange`
```typescript
const handleNavigation = () => {
  const state = loadFromURL();
  updateGameState(state);
};

window.addEventListener('popstate', handleNavigation);
window.addEventListener('hashchange', handleNavigation);
```

#### Firefox hashchange Order

**Issue**: `popstate` fires synchronously, `hashchange` asynchronously
**Impact**: Event timing inconsistencies
**Solution**: Use only `popstate` for consistency
```typescript
// Prefer popstate over hashchange
window.addEventListener('popstate', (event) => {
  // Handle both URL types
  const state = event.state || loadFromHash();
  updateGameState(state);
});
```

---

## 7. Real-World GitHub Examples

### 7.1 URL State Management Libraries

**TanStack Router** (formerly React Location)
- **GitHub**: https://github.com/TanStack/router
- **Features**: Type-safe URL state, automatic sync, caching
- **Example**:
```typescript
import { useNavigate, useSearch } from '@tanstack/react-router'

function GameFilters() {
  const search = useSearch({ from: '/games' })
  const navigate = useNavigate()

  return (
    <input
      value={search.filter}
      onChange={(e) => navigate({
        search: { ...search, filter: e.target.value }
      })}
    />
  )
}
```

---

### 7.2 Compression Examples

**React Easy Params**
- **GitHub**: https://github.com/solkimicreb/react-easy-params
- **Features**: Auto-sync state with URL and localStorage
- **Pattern**: Observable objects that sync on mutation

**Example from repo**:
```typescript
import { params, store } from 'react-easy-params'

// params syncs with URL query parameters
params.page = 1
console.log(location.search) // "?page=1"

// store syncs with localStorage
store.theme = 'dark'
console.log(localStorage.getItem('theme')) // "dark"
```

---

### 7.3 Chess Game Examples

**lichess.org** (Open source chess platform)
- **GitHub**: https://github.com/lichess-org/lila
- **URL Pattern**: Uses FEN notation in URL for board state
- **Example**: `https://lichess.org/editor/rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR_w_KQkq_-_0_1`

**Key Takeaways**:
- Standard chess notation (FEN) is compact
- Human-readable for debugging
- Validated against chess rules

---

## 8. Recommended Patterns for King's Cooking

### 8.1 State Management Strategy

```typescript
// Define game state type
interface KingsCookingState {
  version: number;
  boardWidth: number;
  boardHeight: number;
  board: (Piece | null)[][];
  currentPlayer: 'white' | 'black';
  capturedPieces: {
    white: Piece[];
    black: Piece[];
  };
  gamePhase: 'setup' | 'playing' | 'finished';
  setupMode: 'random' | 'playground-mirrored' | 'playground-independent';
  moveHistory: Move[];
  lastUpdated: number;
}

// Custom hook for URL state
function useGameState() {
  const [state, setState] = useState<KingsCookingState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const stateRef = useRef<KingsCookingState | null>(null);

  // Load state on mount
  useEffect(() => {
    const loaded = loadGameState();
    setState(loaded);
    stateRef.current = loaded;
    setIsLoading(false);
  }, []);

  // Debounced URL update
  const debouncedUpdateURL = useMemo(
    () => debounce((state: KingsCookingState) => {
      const encoded = encodeGameStateToURL(state);
      history.replaceState(null, "", `#game=${encoded}`);
    }, 500),
    []
  );

  // Update URL when state changes
  useEffect(() => {
    if (!isLoading && state && state !== stateRef.current) {
      debouncedUpdateURL(state);
      saveToLocalStorage(state);
      stateRef.current = state;
    }

    return () => debouncedUpdateURL.cancel();
  }, [state, isLoading, debouncedUpdateURL]);

  // Listen for popstate (back button)
  useEffect(() => {
    const handlePopState = () => {
      const loaded = loadGameState();
      setState(loaded);
      stateRef.current = loaded;
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  return [state, setState, isLoading] as const;
}
```

### 8.2 Helper Functions

```typescript
// Load with fallback chain
function loadGameState(): KingsCookingState {
  // Try URL first
  const urlState = loadFromURL();
  if (urlState && validateGameState(urlState)) {
    saveToLocalStorage(urlState); // Sync
    return urlState;
  }

  // Try localStorage
  const localState = loadFromLocalStorage();
  if (localState && validateGameState(localState)) {
    return localState;
  }

  // Create new game
  return createNewGame();
}

function loadFromURL(): KingsCookingState | null {
  try {
    const hash = location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const encoded = params.get('game');

    if (!encoded) return null;

    const decompressed = LZString.decompressFromEncodedURIComponent(encoded);
    if (!decompressed) return null;

    return JSON.parse(decompressed);
  } catch (error) {
    console.error('Failed to load from URL:', error);
    return null;
  }
}

function validateGameState(state: any): state is KingsCookingState {
  return (
    state &&
    typeof state === 'object' &&
    typeof state.version === 'number' &&
    Array.isArray(state.board) &&
    ['white', 'black'].includes(state.currentPlayer) &&
    ['setup', 'playing', 'finished'].includes(state.gamePhase)
  );
}
```

---

## 9. Summary & Recommendations

### ✅ DO

1. **Use `replaceState()` for transient state** (filters, UI state)
2. **Use `pushState()` for navigation** (page changes)
3. **Compress state with LZ-String** before URL encoding
4. **Validate and sanitize** all URL-sourced data
5. **Clean up event listeners** in `useEffect` return
6. **Debounce URL updates** to prevent performance issues
7. **Implement fallback chain** (URL → localStorage → default)
8. **Add timestamps** to resolve state conflicts
9. **Show user-friendly error recovery** for corrupted state
10. **Keep URLs under 2KB** for compatibility

### ❌ DON'T

1. **Don't pollute history** with every state change
2. **Don't block back button** unless absolutely necessary
3. **Don't store sensitive data** in URLs
4. **Don't use `dangerouslySetInnerHTML`** with URL data
5. **Don't forget cleanup** for timers/listeners/subscriptions
6. **Don't create infinite loops** with circular dependencies
7. **Don't ignore browser quirks** (iOS Safari, Chrome on iOS)
8. **Don't skip validation** of URL-sourced state
9. **Don't exceed URL limits** without fallback
10. **Don't assume URL is always available** (could be disabled)

---

## 10. Additional Resources

### Official Documentation

- [MDN - History API](https://developer.mozilla.org/en-US/docs/Web/API/History_API)
- [MDN - popstate event](https://developer.mozilla.org/en-US/docs/Web/API/Window/popstate_event)
- [MDN - hashchange event](https://developer.mozilla.org/en-US/docs/Web/API/Window/hashchange_event)
- [React - useEffect Hook](https://react.dev/reference/react/useEffect)

### Libraries & Tools

- [lz-string](https://www.npmjs.com/package/lz-string) - String compression for URLs
- [TanStack Router](https://tanstack.com/router) - Type-safe routing with URL state
- [use-query-params](https://github.com/pbeshai/use-query-params) - React Hook for URL query parameters

### Articles & Guides

- [LogRocket - URL State Management in React](https://blog.logrocket.com/advanced-react-state-management-using-url-parameters/)
- [Developer Way - Debouncing in React](https://www.developerway.com/posts/debouncing-in-react)
- [Medium - Storing App State in URL](https://medium.com/@suyeonme/effective-strategies-for-handling-long-query-strings-b790e1fddd65)

### Security Resources

- [OWASP - XSS Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [OWASP - CSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)

---

**End of Research Document**
