# Name Collection Pattern

This document describes the standard pattern for collecting player names in correspondence games.

## Overview

**DO NOT use JavaScript `prompt()` dialogs** - they are not styleable, don't support dark mode, and provide poor UX.

**DO use styled HTML forms** with the framework's form classes.

## Standard Pattern

### React Component Structure

```tsx
// State
const [playerName, setPlayerName] = useState<string | null>(null);

// Handler
const handleNameSubmit = (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  const formData = new FormData(e.currentTarget);
  const name = formData.get('playerName') as string;

  if (name && name.trim()) {
    // Save to localStorage
    hotSeatStorage.setMyName(name.trim());  // or setPlayer1Name(), setPlayer2Name()

    // Update React state
    setPlayerName(name.trim());
  }
};

// Render
if (!playerName) {
  return (
    <div className="container">
      <h1>🎯 Game Title - Mode</h1>
      <h2>Player 1 (X)</h2>
      <form onSubmit={handleNameSubmit} className="name-form">
        <label htmlFor="playerName">Enter your name:</label>

        {/* Optional warning for URL mode */}
        {gameMode === 'url' && (
          <p style={{ fontSize: '13px', color: '#666', margin: '10px 0' }}>
            ⚠️ Important: Keep this browser tab open and don't clear cache during the game
          </p>
        )}

        <input
          type="text"
          id="playerName"
          name="playerName"
          autoFocus
          required
          maxLength={20}
        />
        <button type="submit">Continue</button>
      </form>
    </div>
  );
}
```

## CSS Classes

Use the framework's form classes (already defined in `correspondence-games.css`):

### Option 1: Framework Classes (Recommended)

```tsx
<form onSubmit={handleNameSubmit} className="cg-form">
  <label htmlFor="playerName" className="cg-form-label">
    Enter your name:
  </label>
  <input
    type="text"
    id="playerName"
    name="playerName"
    className="cg-form-input"
    autoFocus
    required
    maxLength={20}
  />
  <button type="submit" className="cg-button cg-button-primary">
    Continue
  </button>
</form>
```

**Benefits:**
- Automatic dark mode support
- Consistent with other forms
- No custom CSS needed
- Maintained by framework

### Option 2: Custom `.name-form` Class

If you need game-specific styling, use the `.name-form` pattern from tic-tac-toe:

```css
.name-form {
  display: flex;
  flex-direction: column;
  gap: 15px;
  max-width: 400px;
  margin: 30px auto;
  padding: 30px;
  background: #f8f9fa;
  border-radius: 8px;
}

@media (prefers-color-scheme: dark) {
  .name-form {
    background: #2a2a2a;
  }
}

.name-form label {
  font-size: 16px;
  color: #333;
  text-align: left;
}

@media (prefers-color-scheme: dark) {
  .name-form label {
    color: #e0e0e0;
  }
}

.name-form input {
  padding: 12px;
  font-size: 16px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  color: #333;
}

@media (prefers-color-scheme: dark) {
  .name-form input {
    background: #1e1e1e;
    border-color: #444;
    color: #e0e0e0;
  }
}

.name-form button {
  padding: 12px;
  font-size: 16px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

@media (prefers-color-scheme: dark) {
  .name-form button {
    background: #0d6efd;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  }
}

.name-form button:hover {
  background: #0056b3;
}

@media (prefers-color-scheme: dark) {
  .name-form button:hover {
    background: #0b5ed7;
  }
}
```

## Different Modes

### Hot-Seat Mode

Collect names for both players sequentially:

```tsx
// Player 1 name
if (!player1Name) {
  return (
    <div className="container">
      <h1>🎯 Game - Hot-Seat Mode</h1>
      <h2>Player 1 (X)</h2>
      <form onSubmit={handlePlayer1NameSubmit} className="cg-form">
        <label htmlFor="player1Name" className="cg-form-label">
          Enter your name:
        </label>
        <input
          type="text"
          id="player1Name"
          name="player1Name"
          className="cg-form-input"
          autoFocus
          required
          maxLength={20}
        />
        <button type="submit" className="cg-button cg-button-primary">
          Continue
        </button>
      </form>
    </div>
  );
}

// Player 2 name
if (!player2Name) {
  return (
    <div className="container">
      <h1>🎯 Game - Hot-Seat Mode</h1>
      <h2>Player 2 (O)</h2>
      <form onSubmit={handlePlayer2NameSubmit} className="cg-form">
        <label htmlFor="player2Name" className="cg-form-label">
          Enter your name:
        </label>
        <input
          type="text"
          id="player2Name"
          name="player2Name"
          className="cg-form-input"
          autoFocus
          required
          maxLength={20}
        />
        <button type="submit" className="cg-button cg-button-primary">
          Start Game
        </button>
      </form>
    </div>
  );
}
```

### URL Mode

Only collect the current player's name, with a warning:

```tsx
if (!myName) {
  return (
    <div className="container">
      <h1>🎯 Game - URL Mode</h1>
      <h2>Player {myPlayerNumber} ({myPlayerNumber === 1 ? 'X' : 'O'})</h2>
      <form onSubmit={handleNameSubmit} className="cg-form">
        <label htmlFor="playerName" className="cg-form-label">
          Enter your name:
        </label>
        <p style={{ fontSize: '13px', color: '#666', margin: '10px 0' }}>
          ⚠️ Important: Keep this browser tab open and don't clear cache during the game
        </p>
        <input
          type="text"
          id="playerName"
          name="playerName"
          className="cg-form-input"
          autoFocus
          required
          maxLength={20}
        />
        <button type="submit" className="cg-button cg-button-primary">
          Continue
        </button>
      </form>
    </div>
  );
}
```

## Form Requirements

### Input Attributes

- **`type="text"`** - Standard text input
- **`id`** - For label association (must match label's `htmlFor`)
- **`name`** - For FormData retrieval (should match state variable name)
- **`autoFocus`** - Automatically focus on page load
- **`required`** - HTML5 validation
- **`maxLength={20}`** - Prevent excessively long names

### Button Text

Choose appropriate button text based on context:

- **"Continue"** - When more steps follow (Player 1 → Player 2)
- **"Start Game"** - When game begins after this step (Player 2 in hot-seat)
- **"Join Game"** - When joining an existing game (URL mode)

## Storage Keys

Use the correct localStorage keys:

### Hot-Seat Mode
```typescript
hotSeatStorage.setPlayer1Name(name);  // 'correspondence-games:player1-name'
hotSeatStorage.setPlayer2Name(name);  // 'correspondence-games:player2-name'
```

### URL Mode
```typescript
hotSeatStorage.setMyName(name);  // 'correspondence-games:my-name'
```

**Why different keys?**
- Hot-seat: Same browser, two different people → separate keys
- URL: Same person across multiple games → single identity

## Validation

### Client-Side (HTML5)

```tsx
<input
  type="text"
  required          // Cannot be empty
  maxLength={20}    // Max length
  pattern="[A-Za-z0-9 ]+"  // Optional: Only alphanumeric + spaces
/>
```

### Server-Side (React)

```tsx
const handleNameSubmit = (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  const formData = new FormData(e.currentTarget);
  const name = formData.get('playerName') as string;

  // Trim whitespace
  const trimmedName = name?.trim();

  // Validate
  if (!trimmedName) {
    alert('Please enter a name');
    return;
  }

  if (trimmedName.length > 20) {
    alert('Name too long (max 20 characters)');
    return;
  }

  // Optional: Sanitize for XSS (framework already does this in storage)
  hotSeatStorage.setMyName(trimmedName);
  setPlayerName(trimmedName);
};
```

## Anti-Patterns

### ❌ DON'T: Use JavaScript prompt()

```tsx
// WRONG - not styleable, no dark mode, poor UX
const name = prompt('Enter your name:');
if (name) {
  setPlayerName(name);
}
```

### ❌ DON'T: Use separate buttons

```tsx
// WRONG - requires onClick instead of form submission
<input id="name" />
<button onClick={() => {
  const name = document.getElementById('name').value;
  setPlayerName(name);
}}>
  Submit
</button>
```

### ❌ DON'T: Forget dark mode

```css
/* WRONG - only light mode */
.name-form {
  background: #fff;
  color: #000;
}
```

### ❌ DON'T: Use controlled inputs unnecessarily

```tsx
// WRONG - unnecessary complexity for simple form
const [nameInput, setNameInput] = useState('');

<input
  value={nameInput}
  onChange={(e) => setNameInput(e.target.value)}
/>
```

**Why?** FormData is simpler for one-time submission forms.

## Complete Example

See `/games/tic-tac-toe/src/App.tsx` for the complete implementation:

- Lines 415-430: URL mode name form
- Lines 442-458: Hot-seat Player 1 name form
- Lines 469-481: Hot-seat Player 2 name form

Key features:
- Uses `<form>` with `onSubmit`
- Uses `FormData` to extract values
- Uses `.name-form` class for styling
- Includes dark mode support
- Has appropriate validation
- Shows warning for URL mode
- Uses correct localStorage keys

## Testing

Verify your name collection form:

- [ ] Form submits on Enter key
- [ ] Required validation works (try submitting empty)
- [ ] maxLength validation works (try 21+ characters)
- [ ] autoFocus works (field is focused on load)
- [ ] Name is saved to correct localStorage key
- [ ] React state updates after submission
- [ ] Dark mode styling works
- [ ] Button text is appropriate for context
- [ ] Warning shows in URL mode only

---

**Last Updated:** October 2025
**Version:** 1.0.0
