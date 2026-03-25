# Verification Guide — AI Agents Plan

Covers Phases 1–3. Phase 4 (deployment) is not yet done.

---

## Verification Status

Most of the guide below has been verified locally. Two issues found:

### Issue 1 — AI Agents color picker doesn't match look and feel

**What's wrong:** When launched from townage (`#lot=` hash), the color picker in `App.tsx` is inline JSX with plain buttons (♔ Play Light / ♚ Play Dark). The existing `ColorSelectionScreen` component (`src/components/game/ColorSelectionScreen.tsx`) has the correct card-style layout with ☀️/🌙 emoji icons, "Light"/"Dark" labels, and "Goes first"/"Goes second" subtitles styled via `ColorSelectionScreen.module.css`.

**Where the AI agents color picker lives:** `src/App.tsx` around line 494–542, inside the `if (state.phase === 'mode-selection' && lotData)` block.

**What the fix looks like:** Replace the inline button pair with a call to `ColorSelectionScreen`. The component currently dispatches `SET_PLAYER_COLOR` which doesn't exist in AI agents flow — `START_AI_AGENTS` needs the color plus other params (`player1Name`, `player2Name`, `seed`). Either:
- Add an `onColorSelect` callback prop to `ColorSelectionScreen` (already has `dispatch`, could add optional `onSelect: (color) => void` to override the dispatch behavior), OR
- Create a thin wrapper that renders `ColorSelectionScreen`'s markup with an `onClick` that dispatches `START_AI_AGENTS`

The header should show the player name (from `lotData.playerName ?? 'Player'`) just like `ColorSelectionScreen` shows `player1Name`. The "vs NPC" context (`Playing vs {lotData.npcDisplayName}`) could be a subtitle above the component.

---

### Issue 2 — Victory screen doesn't show "Return to Townage" button

**What's wrong:** After finishing a game against an NPC, the victory screen only shows the "New Game" button. The "Return to Townage" button should also appear.

**Where the button is:** `src/App.tsx` around line 1158–1183:
```tsx
{state.mode === 'ai_agents' && lotData && (
  <div ...>
    <button onClick={() => { clearMidGame(...); window.location.href = ...; }}>
      Return to Townage
    </button>
  </div>
)}
```

**Likely cause:** The condition depends on both `state.mode === 'ai_agents'` and `lotData` being non-null. Need to verify which one is failing at victory time:
- `lotData` is React `useState` set once on mount from `parseLotHash` — should persist across all phases
- `state.mode` in the `victory` phase comes from the `AI_MAKE_MOVE` reducer case — check that it propagates `mode: state.mode` correctly into the `VictoryPhase` shape
- Check `src/lib/gameFlow/reducer.ts` `AI_MAKE_MOVE` case to confirm `mode: 'ai_agents'` is set on the victory state
- Also check the `VictoryPhase` type in `src/types/gameFlow.ts` — it needs `mode: 'ai_agents'` in its union

**Quick debug:** In devtools at victory screen, run:
```js
// Check React state via React DevTools, or add a temporary console.log
// In App.tsx victory phase block, add:
console.log('[victory]', { mode: state.mode, hasLotData: !!lotData, playerColor })
```

---

---

## Phase 1: kings-cooking-python inference server

**Repo:** `/home/ryankhetlyr/Development/kings-cooking-python`

### Automated tests
```bash
cd /home/ryankhetlyr/Development/kings-cooking-python
uv run pytest tests/ -v
```
Expected: 13 passed.

### Start the server locally
```bash
uv run python -m inference_server.main
```
Server starts on `http://localhost:8100`.

### Manual endpoint checks
```bash
# Health
curl http://localhost:8100/health
# → {"status":"ok"}

# Available agents
curl http://localhost:8100/agents
# → {"agents":[{"id":"scripted_1",...}]}

# Select a move (scripted_1 picks first piece's first move)
curl -s -X POST http://localhost:8100/select-move \
  -H "Content-Type: application/json" \
  -d '{
    "agent": "scripted_1",
    "current_player": "dark",
    "board": [[{"type":"rook","owner":"dark","id":"a","move_count":0},null,null],[null,null,null],[null,null,null]],
    "pieces_with_moves": [{"from": [0,0], "moves": [[1,0],[2,0]]}]
  }'
# → {"move":{"from":[0,0],"to":[1,0]},"agent":"scripted_1"}

# Empty pieces_with_moves → 422
curl -s -X POST http://localhost:8100/select-move \
  -H "Content-Type: application/json" \
  -d '{"agent":"scripted_1","current_player":"dark","board":[],"pieces_with_moves":[]}' | jq .status
# → 422

# Off-board move
curl -s -X POST http://localhost:8100/select-move \
  -H "Content-Type: application/json" \
  -d '{"agent":"scripted_1","current_player":"dark","board":[],"pieces_with_moves":[{"from":[0,0],"moves":["off_board"]}]}' | jq .move
# → {"from":[0,0],"to":"off_board"}
```

---

## Phase 2: kings-cooking frontend — AI Agents Mode

**Repo:** `/home/ryankhetlyr/Development/kings-cooking`

### Automated tests + coverage
```bash
pnpm run check      # TypeScript — expect 0 errors
pnpm run lint       # ESLint — expect 0 warnings
pnpm test:coverage  # Vitest — expect 859 passed, all thresholds ≥ 80%
```

### Manual flow — launch from townage (simulated)

The frontend checks `window.location.hash` on mount for `#lot=<lz-string>`.
Build the hash in browser devtools or Node:

```js
// In browser devtools on the kings-cooking dev page, or in Node:
import { compressToEncodedURIComponent } from 'lz-string'
const payload = {
  sessionId: 'test-session-1',
  npcId: 'sprout',
  npcDisplayName: 'Sprout',
  agentType: 'scripted_1',
  returnUrl: 'http://localhost:5174',  // townage dev URL
}
const hash = '#lot=' + compressToEncodedURIComponent(JSON.stringify(payload))
// paste hash into URL bar: http://localhost:5173/kings-cooking/<hash>
```

**What to verify:**
1. App skips mode selector, name form, and piece selection
2. Color picker screen appears: "Playing vs Sprout" header, choose Light or Dark
3. After choosing a color, game starts immediately (random pieces, 3-column board)
4. It's the AI's turn first (or player's, depending on color choice) — AI moves after ~1 second
5. "Return to Townage" link appears in the playing phase
6. Clicking "Return to Townage" during a game saves to localStorage:
   - Key: `townage-kings-cooking-game-sprout`
   - Value: JSON with `{ gameState, playerColor, agentType }`
   - Navigates to `returnUrl` (will 404 if townage isn't running — that's fine)
7. If you reload with the same `#lot=` hash and a mid-game save exists, game should resume

### Manual flow — mid-game resume

1. Start an AI game with the hash above
2. Play a few moves
3. Click "Return to Townage" (or close the tab)
4. Check localStorage for `townage-kings-cooking-game-sprout`
5. Navigate back to `http://localhost:5173/kings-cooking/<same hash>`
6. Game should resume from saved state, not restart

### Manual flow — game end results

1. Play until victory (or force it by moving all AI pieces off board)
2. Victory screen appears with "Return to Townage" button
3. Click it — URL should navigate to `returnUrl#r=<compressed>`
4. In devtools, decode the hash:
   ```js
   import { decompressFromEncodedURIComponent } from 'lz-string'
   const hash = window.location.hash.slice('#r='.length)
   JSON.parse(decompressFromEncodedURIComponent(hash))
   // → { sessionId, npcId, winner: 'player'|'opponent'|'tie', game: 'kings-cooking' }
   ```

### GitHub Actions workflow check

Confirm `deploy.yml` has `VITE_INFERENCE_API_URL`:
```bash
grep VITE_INFERENCE_API_URL .github/workflows/deploy.yml
# → VITE_INFERENCE_API_URL: ${{ vars.INFERENCE_API_URL }}
```

---

## Phase 3: townage.app updates

**Repo:** `/home/ryankhetlyr/Development/the-lot`

### Automated tests
```bash
cd /home/ryankhetlyr/Development/the-lot
pnpm test
```
Expected: 160 passed, 2 pre-existing failures in `fetch-pending-results.test.ts` (unrelated to Phase 3).

Build check:
```bash
pnpm run build
# → tsc -b passes, vite build ✓
```

### Verify NPC configs

In `src/config/npcs.ts`, all 4 NPCs (myco, ember, ryan, sprout) should have:
- `agentType: "scripted_1"`
- `games: ["spaces-game", "kings-cooking"]`
- `personality.kingsChessAcceptText` set

```bash
grep -A2 'agentType' src/config/npcs.ts
grep 'kingsChessAcceptText' src/config/npcs.ts
```

### Manual flow — game select screen

Start the-lot dev server (`pnpm dev`).

1. Complete the tutorial (collect 2 bot parts, assemble, talk to NPC Ryan)
2. Open the phone (E key), go to Find app, select any NPC
3. Chat → "let's play a game" → NPC invite response appears
4. Player choice bubble should show **three options**: Spaces Game, King's Cooking, "You choose"
5. Select **King's Cooking** → NPC accept speech bubble appears with `kingsChessAcceptText`
6. Dismiss the bubble → should navigate to `VITE_KINGS_COOKING_URL/#lot=<compressed>`
   - Default URL: `https://randallard.github.io/kings-cooking/#lot=...`
   - Dev override: set `VITE_KINGS_COOKING_URL=http://localhost:5173/kings-cooking` in `.env.local`

Alternatively, open the opponents list (phone → Find) → select an NPC → "Play Game":
1. Game select screen appears (in phone UI)
2. Both **Spaces Game** and **King's Cooking** cards should be visible
3. Selecting King's Cooking navigates to kings-cooking with correct `#lot=` payload

### Verify Kings Cooking launch payload

After clicking King's Cooking in the game select or accepting in the game invite:
- Open devtools Network tab before clicking, or intercept `window.location.assign`
- The URL should be `<KINGS_COOKING_URL>/#lot=<compressed>`
- Decode to verify:
  ```js
  import { decompressFromEncodedURIComponent } from 'lz-string'
  // grab compressed from URL
  JSON.parse(decompressFromEncodedURIComponent(compressed))
  // → { sessionId, npcId, npcDisplayName, agentType: 'scripted_1', returnUrl }
  ```

### Manual flow — returning from kings-cooking with results

Simulate a kings-cooking result hash on the-lot:
```js
import { compressToEncodedURIComponent } from 'lz-string'
const result = {
  sessionId: 'test-session-1',
  npcId: 'sprout',
  winner: 'player',
  game: 'kings-cooking',
}
window.location.hash = '#r=' + compressToEncodedURIComponent(JSON.stringify(result))
// then reload page
```

**What to verify:**
1. NPC Sprout appears with a chat bubble reaction (win/loss/tie personality text)
2. `recordKingsChessResult` is called (check localStorage key `townage-npc-kings-chess-records`)
3. Hash is cleared from URL after parsing
4. Spaces-game results (without `game: 'kings-cooking'`) still parse correctly via `parseResultsFromHash`

### Verify mid-game detection

```js
// In browser devtools on the-lot:
localStorage.setItem('townage-kings-cooking-game-sprout', JSON.stringify({gameState: {}, playerColor: 'light', agentType: 'scripted_1'}))
// Then check hasKingsChessInProgress('sprout') returns true
// (no UI for this yet — Phase 3.7 "Continue game" indicator is not yet implemented)
```

---

## End-to-end flow (manual, both servers running)

Prerequisites:
- kings-cooking dev server: `pnpm dev` in `/home/ryankhetlyr/Development/kings-cooking` (port 5173)
- the-lot dev server: `pnpm dev` in `/home/ryankhetlyr/Development/the-lot` (port 5174)
- kings-cooking-python: `uv run python -m inference_server.main` (port 8100)
- kings-cooking `.env.local`: `VITE_INFERENCE_API_URL=http://localhost:8100`
- the-lot `.env.local`: `VITE_KINGS_COOKING_URL=http://localhost:5173/kings-cooking`

Flow:
1. Open `http://localhost:5174` (the-lot), complete tutorial
2. Select an NPC → choose King's Cooking
3. Browser navigates to `http://localhost:5173/kings-cooking/#lot=...`
4. Choose a color in kings-cooking
5. Play a game (AI moves automatically after ~1 second)
6. At victory, click "Return to Townage"
7. Browser navigates back to `http://localhost:5174#r=...`
8. NPC reacts to the result with a chat bubble
9. Check `townage-npc-kings-chess-records` in localStorage — record updated

## Run command?

● Bash(cd /home/ryankhetlyr/Development/kings-cooking-python && uv run python -c "import inference_server.scripted_agents; import inspect; print(inspect.getfile(infere…)
