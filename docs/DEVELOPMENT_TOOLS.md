# Development Tools

Tools for debugging and understanding the game flow during development.

## State Machine Diagram

See [STATE_MACHINE.md](./STATE_MACHINE.md) for a comprehensive Mermaid diagram of all states, transitions, and data flow.

You can view this in:
- **GitHub**: Automatically renders Mermaid diagrams
- **VS Code**: Install "Markdown Preview Mermaid Support" extension
- **Online**: Copy to https://mermaid.live/

## StateDebugger Component

A live debugging tool that shows current state in the UI during development.

### Usage

Add to `src/App.tsx` (only renders on localhost):

```typescript
import { StateDebugger } from './components/dev/StateDebugger';

function App() {
  const [state, dispatch] = useReducer(gameFlowReducer, initialState);

  return (
    <>
      {/* Your app components */}

      {/* Add this at the bottom */}
      <StateDebugger state={state} />
    </>
  );
}
```

### Features

- 📍 Shows current phase with color-coded indicator
- 📊 Displays all relevant data for current phase
- 🎯 Detects P1 vs P2 scenarios in handoff phase using `generatedUrl`
- 🔗 Links to state machine diagram
- 🎨 Collapsible panel (bottom-right corner)
- 🚀 Only renders on localhost

### Example Output

**Handoff Phase (P2 entering name):**
```
phase: handoff
mode: url
player1Name: Ryan
player2Name: (empty)
needsPlayer2Name: true
currentTurn: 1
hasGeneratedUrl: false ← KEY: P2 has null
countdown: 0
🎯 Detection: P2 entering name (!generatedUrl)
```

**Handoff Phase (P1 sharing move):**
```
phase: handoff
mode: url
player1Name: Ryan
player2Name: (empty)
needsPlayer2Name: true
currentTurn: 1
hasGeneratedUrl: true ← KEY: P1 has URL
countdown: 0
🎯 Detection: P1 sharing move (generatedUrl exists)
```

## Console Logging

The reducer and App.tsx include detailed console logging (localhost only):

### Reducer Logs
- `🔄 LOAD_FROM_URL Action` - URL payload received
- `📥 Received FULL_STATE` - Payload details
- `➡️ Player X returning/first load` - Flow decision
- `✅ Identified as Player 1/2 receiving name` - Player detection
- `📝 Data details` - Key values

### App.tsx Logs
- `🔍 URL Mode Handoff Debug` - P1/P2 detection logic
- `🔍 URL Generation Debug` - Payload creation
- `✅ Initial URL generated` - Auto-generation success

## Testing Scenarios

Use the StateDebugger to verify these scenarios:

### Random + P1 Light
1. piece-selection → **playing** (P1)
   - Check: currentPlayer = 'light'
2. playing → **handoff** (P1 shares)
   - Check: hasGeneratedUrl = true, 🎯 = "P1 sharing move"
3. LOAD_FROM_URL → **handoff** (P2 name)
   - Check: hasGeneratedUrl = false, 🎯 = "P2 entering name"

### Random + P1 Dark
1. piece-selection → **handoff** (P1 shares)
   - Check: currentTurn = 0, hasGeneratedUrl = true
2. LOAD_FROM_URL → **handoff** (P2 name)
   - Check: hasGeneratedUrl = false, 🎯 = "P2 entering name"

### Independent + P1 Light
1. piece-selection → **handoff** (P1 shares partial)
   - Check: hasGameState = true (incomplete), hasGeneratedUrl = true
2. LOAD_FROM_URL → **handoff** (P2 name)
   - Check: hasGeneratedUrl = false
3. handoff → **piece-selection** (P2 picks)
4. piece-selection → **handoff** (P2 shares)
   - Check: hasGeneratedUrl = true

## Browser DevTools

### React DevTools
Recommended for inspecting component state and props:
```bash
https://react.dev/link/react-devtools
```

### Network Tab
Monitor URL hash changes:
- Filter by "Doc" to see navigation
- Hash changes don't trigger network requests but do update URL

### Console Filters
Focus on specific logs:
```
Filter: "🔄"  → Reducer actions
Filter: "🔍"  → Detection logic
Filter: "📥"  → Payload data
Filter: "✅"  → Success events
```

## Common Debugging Patterns

### "Why isn't P2 seeing the name form?"
1. Check console: Look for `📥 Received FULL_STATE` with myName status
2. Check StateDebugger: `hasGeneratedUrl` should be `false`
3. Check: `player2Name` should be "(empty)"
4. Verify: `storage.getMyName()` returns null (first time visitor)

### "Why isn't P1 seeing the URLSharer?"
1. Check console: Look for `URL_GENERATED` action
2. Check StateDebugger: `hasGeneratedUrl` should be `true`
3. Check: `generatedUrl` should have a URL string
4. Verify: URL_GENERATED action was dispatched after CONFIRM_MOVE

### "Why did P2 skip the name form?"
1. Check console: Look for "Player 2 with a saved name"
2. Check: `storage.getMyName()` returns an existing name
3. This means P2 is returning to an existing game
4. Expected behavior: Should go directly to playing phase

### "P1 is seeing name form instead of URLSharer"
1. Check: URL_GENERATED action was dispatched
2. Check: `state.generatedUrl` is not null
3. Likely cause: URL_GENERATED dispatch is missing or failed
4. Verify: `App.tsx` dispatches URL_GENERATED after CONFIRM_MOVE

## Critical Detection Logic

### The `generatedUrl` Pattern

**Why this works:**
```typescript
// App.tsx:928
const isPlayer2EnteringName = !state.generatedUrl;
```

**P1 Flow:**
1. CONFIRM_MOVE → Sets `generatedUrl: null` in reducer
2. App.tsx generates URL and dispatches URL_GENERATED
3. URL_GENERATED → Sets `generatedUrl: <url string>`
4. Result: `!state.generatedUrl` = false → Shows URLSharer

**P2 Flow:**
1. LOAD_FROM_URL → Reducer sets `generatedUrl: null`
2. No URL_GENERATED action (P2 doesn't generate on first load)
3. Result: `!state.generatedUrl` = true → Shows name form

**Why NOT `lastMove`?**
- Both P1 and P2 have `lastMove` in handoff phase
- P1: Real lastMove from CONFIRM_MOVE
- P2: Placeholder lastMove from reducer (line 158)
- Cannot reliably distinguish between them

**Why `generatedUrl`?**
- P1: Always has URL from URL_GENERATED action
- P2: Always has null from reducer (never dispatches URL_GENERATED on first load)
- Guaranteed distinction by state machine design

## Removing Debug Tools

Before production build, remove:
1. `<StateDebugger />` from App.tsx
2. Or keep it - it auto-hides in production (non-localhost)

The component and console logs automatically disable outside localhost.

## Code References

### P1/P2 Detection
**App.tsx:928**
```typescript
const isPlayer2EnteringName = !state.generatedUrl;
```

### Reducer State Creation
**reducer.ts:160** (P2 first load)
```typescript
generatedUrl: null,  // Player 2 doesn't generate URL yet
```

**reducer.ts:508** (P1 after move)
```typescript
generatedUrl: null,  // Will be set by URL_GENERATED action
```

### URL_GENERATED Handler
**reducer.ts:574-577**
```typescript
case 'URL_GENERATED':
  if (state.phase !== 'handoff' || state.mode !== 'url') return state;
  return { ...state, generatedUrl: action.url };
```
