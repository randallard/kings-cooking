# AI Agents Plan — Kings Cooking

> Status tracking: ⬜ Not started | 🔄 In progress | ✅ Complete

---

## Architecture

**GitHub Pages + Railway — no Vercel needed.**
The browser JS running on GitHub Pages can `fetch()` directly to a Railway-hosted inference server. Only requirement: CORS headers on the inference server allow `https://randallard.github.io`. The `#lot` hash pattern used by townage.app already handles passing agent + player context to static sites.

**Submodule relationship:** `kings-cooking-python` is a git submodule of `kings-cooking`, same pattern as `spaces-game-node/spaces-game-python` (`.gitmodules` with `ignore = dirty`).

---

## Inference API Design

Client sends pre-computed legal moves per piece (both on-board and off-board). The server just picks one.

**POST `/select-move`**

```json
// Request
{
  "agent": "scripted_1",
  "current_player": "dark",
  "board": [[piece_or_null, ...], ...],
  "pieces_with_moves": [
    {
      "from": [0, 0],
      "moves": [[1, 0], [2, 0], "off_board"]
    },
    {
      "from": [0, 2],
      "moves": [[1, 2], [0, 1]]
    }
  ]
}

// Response
{
  "move": { "from": [0, 0], "to": [1, 0] },
  "agent": "scripted_1"
}
```

**Move ordering (client responsibility):** Iterate board top→bottom (row 0 first for dark, last row first for light), left→right. For each piece belonging to `current_player`, call `engine.getValidMoves(position)` for on-board moves, then check off-board eligibility via piece-type helpers (`hasRookPathToEdge`, `canKnightJumpOffBoard`, `canBishopMoveOffBoard`, equivalent for queen/pawn). Append `"off_board"` to that piece's moves if eligible.

**`scripted_1` behavior:** Return `pieces_with_moves[0].moves[0]` — first piece's first available move. No reasoning, fully deterministic.

**Note on off-board moves:** ANY piece type can move off-board when conditions are met (not just rooks/queens from home position). The existing `pieceMovement.ts` helper functions handle eligibility per piece type. The client must check these for every piece when building `pieces_with_moves`.

**Skill level pattern:** Exact same as `spaces-game-python`:
```python
# models.py
class SkillLevel(str, Enum):
    scripted_1 = "scripted_1"
    # Future: scripted_2, scripted_3, beginner, intermediate, advanced, etc.

# main.py detection
if skill_level.startswith("scripted_"):
    level = int(skill_level.split("_")[1])
    # deterministic agent, no model needed
```

---

## Phase 1: `kings-cooking-python` (New Repo) ✅

### 1.1 Repository Setup
- [ ] Create GitHub repo `randallard/kings-cooking-python`
- [ ] Initialize with `uv` (`pyproject.toml`)
- [ ] Add FastAPI, uvicorn, pydantic dependencies
- [ ] Add `Procfile` for Railway: `web: python -m inference_server.main`

### 1.2 Project Structure
```
kings-cooking-python/
├── inference_server/
│   ├── __init__.py
│   ├── main.py              # FastAPI app, lifespan, endpoints
│   ├── scripted_agents.py   # Agent implementations
│   ├── models.py            # Pydantic schemas (SkillLevel enum, request/response)
│   └── config.py            # CORS origins, port, env vars
├── tests/
│   └── test_scripted_agents.py
├── Procfile
├── pyproject.toml
└── README.md
```

### 1.3 Pydantic Models (`models.py`)
```python
class SkillLevel(str, Enum):
    scripted_1 = "scripted_1"
    # extensible for future trained models

class MoveTarget(BaseModel):  # [row, col] or "off_board"
    ...

class PieceWithMoves(BaseModel):
    from_pos: list[int]        # [row, col]
    moves: list[str | list[int]]  # [row,col] or "off_board"

class SelectMoveRequest(BaseModel):
    agent: SkillLevel
    current_player: Literal["light", "dark"]
    board: list[list[dict | None]]   # board[row][col]
    pieces_with_moves: list[PieceWithMoves]

class SelectMoveResponse(BaseModel):
    move: dict  # {"from": [row, col], "to": [row, col] | "off_board"}
    agent: str
```

### 1.4 Scripted Agent (`scripted_agents.py`)
```python
def scripted_1(pieces_with_moves: list[dict]) -> dict:
    """Pick first piece's first move. Deterministic."""
    first = pieces_with_moves[0]
    return {"from": first["from"], "to": first["moves"][0]}
```

### 1.5 FastAPI App (`main.py`)
- `GET /health` → `{"status": "ok"}`
- `GET /agents` → list of available agents with descriptions
- `POST /select-move` → route to agent by `request.agent`
- CORS configured for `https://randallard.github.io` and `http://localhost:5173`

### 1.6 Configuration (`config.py`)
```python
INFERENCE_HOST = os.environ.get("INFERENCE_HOST", "0.0.0.0")
INFERENCE_PORT = int(os.environ.get("PORT", os.environ.get("INFERENCE_PORT", "8100")))
INFERENCE_CORS_ORIGINS = os.environ.get(
    "INFERENCE_CORS_ORIGINS",
    "http://localhost:5173,http://localhost:4173"
).split(",")
```

### 1.7 CI for kings-cooking-python
- `uv run pytest tests/` with coverage
- `uv run ruff check .` (or flake8)
- Railway auto-deploy on push to main

---

## Phase 2: `kings-cooking` Frontend — AI Agents Mode ✅

### 2.1 Add Submodule
```bash
git submodule add git@github.com:randallard/kings-cooking-python.git
# .gitmodules: ignore = dirty
```

### 2.2 New TypeScript Types

```typescript
// src/types/aiAgents.ts
export type AgentSkillLevel = 'scripted_1'  // extensible

export interface LotLaunchData {
  sessionId: string
  npcId: string
  npcDisplayName: string
  agentType: AgentSkillLevel
  playerName?: string       // defaults to "Player" if absent
  returnUrl: string
}

export interface PieceWithMoves {
  from: Position
  moves: Array<Position | 'off_board'>
}

export interface SelectMoveRequest {
  agent: AgentSkillLevel
  current_player: 'light' | 'dark'
  board: Array<Array<Piece | null>>
  pieces_with_moves: PieceWithMoves[]
}
```

### 2.3 Parse `#lot` Hash on Load

```typescript
// src/lib/townage/parseLotHash.ts
import LZString from 'lz-string'

export function parseLotHash(): LotLaunchData | null {
  const hash = window.location.hash
  const match = hash.match(/#lot=(.+)/)
  if (!match) return null
  try {
    const json = LZString.decompressFromEncodedURIComponent(match[1])
    return json ? JSON.parse(json) : null
  } catch {
    return null
  }
}
```

Verify lz-string is already a dependency (used in URL encoding); add if not.

### 2.4 Game Flow When Launched from Townage

```
Normal:  ModeSelector → NameForm → PieceSelection → ColorSelection → Game
Townage: ColorSelection (with AI) → Game
         - Skip: mode selection, name form, piece selection mode
         - board columns: hardcoded 3 (no choice offered)
         - player name: from lot.playerName ?? "Player"
         - AI name: lot.npcDisplayName
         - pieces: random (auto-generated, same as random mode)
         - agentType: stored in game state for AI turn use
```

**New game flow state:** Add `'ai_agents'` mode alongside `'hotseat'` and `'url'`. When `lot` payload is present, dispatch into this mode immediately on app load.

### 2.5 Build `pieces_with_moves` Helper

```typescript
// src/lib/aiAgents/buildPiecesWithMoves.ts
export function buildPiecesWithMoves(
  engine: KingsChessEngine,
  currentPlayer: 'light' | 'dark',
  board: Board,
  lastMove: Move | null
): PieceWithMoves[] {
  const result: PieceWithMoves[] = []

  // Iterate board top→bottom, left→right
  for (let row = 0; row < board.length; row++) {
    for (let col = 0; col < board[row].length; col++) {
      const piece = board[row][col]
      if (!piece || piece.owner !== currentPlayer) continue

      const from: Position = [row, col]
      const onBoardMoves = engine.getValidMoves(from)
      const moves: Array<Position | 'off_board'> = [...onBoardMoves]

      // Check off-board eligibility for this piece type
      if (canMoveOffBoard(from, piece, engine.getPiece.bind(engine))) {
        moves.push('off_board')
      }

      if (moves.length > 0) {
        result.push({ from, moves })
      }
    }
  }
  return result
}

function canMoveOffBoard(
  from: Position,
  piece: Piece,
  getPiece: (pos: Position) => Piece | null
): boolean {
  switch (piece.type) {
    case 'rook':  return hasRookPathToEdge(from, piece, getPiece)
    case 'queen': return hasRookPathToEdge(from, piece, getPiece)
                    || canBishopMoveOffBoard(from, piece, getPiece)
    case 'knight': return canKnightJumpOffBoard(from, piece)
    case 'bishop': return canBishopMoveOffBoard(from, piece, getPiece)
    default: return false
  }
}
```

### 2.6 Inference Client

```typescript
// src/lib/aiAgents/inferenceClient.ts
const INFERENCE_URL = import.meta.env.VITE_INFERENCE_API_URL ?? 'http://localhost:8100'

export async function selectMove(request: SelectMoveRequest): Promise<{
  from: Position
  to: Position | 'off_board'
}> {
  const res = await fetch(`${INFERENCE_URL}/select-move`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  })
  if (!res.ok) throw new Error(`Inference server error: ${res.status}`)
  const data = await res.json()
  return data.move
}
```

### 2.7 AI Turn Loop

In the playing phase reducer/hook, when `currentPlayer === aiColor` in `'ai_agents'` mode:

```typescript
async function handleAiTurn(gameState, agentType, aiColor) {
  const piecesWithMoves = buildPiecesWithMoves(engine, aiColor, board, lastMove)
  if (piecesWithMoves.length === 0) {
    // stalemate for AI
    dispatch({ type: 'STALEMATE' })
    return
  }
  const move = await selectMove({
    agent: agentType,
    current_player: aiColor,
    board,
    pieces_with_moves: piecesWithMoves
  })
  await delay(1000)  // 1-second artificial thinking delay
  dispatch({ type: 'APPLY_MOVE', from: move.from, to: move.to })
}
```

### 2.8 Mid-Game State Save & Return to Townage

**"Return to Townage" button placement:**
- During game: next to "Show Story / Instructions" button
- After game ends (results view): replace "Play Again" button with "Return to Townage"

**Mid-game save (on "Return to Townage" click):**
```typescript
// src/lib/townage/midGameSave.ts
const SAVE_KEY = (npcId: string) => `townage-kings-cooking-game-${npcId}`

export function saveMidGameState(npcId: string, gameState: GameState) {
  localStorage.setItem(SAVE_KEY(npcId), JSON.stringify(gameState))
}

export function loadMidGameState(npcId: string): GameState | null {
  const raw = localStorage.getItem(SAVE_KEY(npcId))
  return raw ? JSON.parse(raw) : null
}

export function clearMidGameState(npcId: string) {
  localStorage.removeItem(SAVE_KEY(npcId))
}
```

When kings-cooking loads with a `#lot` payload, check `loadMidGameState(lot.npcId)`. If found, resume from saved state instead of starting fresh.

**Return flow:**
```typescript
function returnToTownage(lot: LotLaunchData, result?: GameResult) {
  if (result) {
    // Game ended — send results
    const compressed = LZString.compressToEncodedURIComponent(
      JSON.stringify({
        sessionId: lot.sessionId,
        npcId: lot.npcId,
        winner: result.winner,
        playerScore: result.playerScore,
        opponentScore: result.opponentScore,
      })
    )
    clearMidGameState(lot.npcId)
    window.location.assign(`${lot.returnUrl}#r=${compressed}`)
  } else {
    // Mid-game — save state, return without results
    saveMidGameState(lot.npcId, currentGameState)
    window.location.assign(lot.returnUrl)
  }
}
```

### 2.9 Environment Variable for CI/CD

Add to GitHub Actions deploy workflow:
```yaml
env:
  VITE_INFERENCE_API_URL: ${{ vars.INFERENCE_API_URL }}
```

Add `INFERENCE_API_URL` as a GitHub Actions variable (not secret, not sensitive) pointing to the Railway deployment URL.

### 2.10 Test Coverage Requirements

New code must maintain ≥80% coverage (enforced by CI). Write tests for:
- `parseLotHash` (unit: various hash formats)
- `buildPiecesWithMoves` (unit: various board positions, off-board eligibility)
- `inferenceClient` (unit: mocked fetch)
- `midGameSave` / `loadMidGameState` (unit: localStorage)
- AI turn integration (integration: mock inference server response)

---

## Phase 3: `townage.app` (the-lot) Updates ✅

### 3.1 Extend NPC Config

Add `agentType` and `kingsChess` fields to `NpcConfig`:

```typescript
// src/config/npcs.ts
interface NpcConfig {
  // ... existing fields ...
  agentType?: AgentSkillLevel          // NEW: for kings-cooking
  games?: ('spaces-game' | 'kings-cooking')[]  // NEW: which games this NPC plays
}

// Add to ALL existing NPCs (Myco, Ember, NPC Ryan, Sprout):
{
  // ... existing config ...
  agentType: "scripted_1",
  games: ["spaces-game", "kings-cooking"]
}
```

### 3.2 GameSelect — Phone Interface

Update `GameSelect.tsx` to show both games when NPC has `games` array:

```tsx
// Show available games based on NPC config
{npc.games?.includes('spaces-game') && (
  <GameOption name="Spaces Game" onSelect={() => onSelect('spaces-game')} />
)}
{npc.games?.includes('kings-cooking') && (
  <GameOption name="King's Cooking" onSelect={() => onSelect('kings-cooking')} />
)}
```

### 3.3 GameSelect — Conversation Flow

Update `GameNpc.tsx` conversation flow to handle both game selections. The `game-invite` → `game-accept` flow needs to:
- Show both game options in the conversation
- Each NPC personality should have game-specific `gameAcceptText` entries
- Add `kingsChessAcceptText` or make `gameAcceptText` a map by game name

### 3.4 Launch URL for Kings Cooking

Extend `launch-game.ts`:

```typescript
const GAMES = {
  'spaces-game': import.meta.env.VITE_SPACES_GAME_URL ?? 'http://localhost:5174',
  'kings-cooking': import.meta.env.VITE_KINGS_COOKING_URL ?? 'http://localhost:5173/kings-cooking',
}

export function buildKingsChessLaunchUrl(npc: NpcConfig): string {
  const payload: LotLaunchData = {
    sessionId: generateSessionId(),
    npcId: npc.id,
    npcDisplayName: npc.displayName,
    agentType: npc.agentType ?? 'scripted_1',
    playerName: getPlayerName() ?? undefined,   // from townage player profile when added
    returnUrl: window.location.origin,
  }
  const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(payload))
  return `${GAMES['kings-cooking']}/#lot=${compressed}`
}
```

### 3.5 Results Parsing

Parse `#r=` hash on return from kings-cooking (same pattern as spaces-game):

```typescript
// src/services/parse-results.ts — add kings-cooking result parsing
export function parseKingsChessResults(): KingsChessResult | null {
  const hash = window.location.hash
  const match = hash.match(/#r=(.+)/)
  if (!match) return null
  const json = LZString.decompressFromEncodedURIComponent(match[1])
  return json ? JSON.parse(json) : null
}
```

### 3.6 Win/Loss Tracking — Kings Cooking

Create a new service for kings-cooking records (separate from `npc-board-records.ts` which is spaces-game specific):

```typescript
// src/services/npc-kings-chess-records.ts
// localStorage key: "townage-npc-kings-chess-records"

interface KingsChessRecord {
  wins: number
  losses: number
  ties: number
  totalGames: number
  lastPlayed: number
  inProgress: boolean   // true if mid-game save exists in kings-cooking
}

export function recordKingsChessResult(npcId: string, winner: 'player' | 'opponent' | 'tie')
export function getKingsChessRecord(npcId: string): KingsChessRecord
export function getKingsChessRank(npcId: string): 'S' | 'A' | 'B' | '—'
```

### 3.7 Mid-Game State Display

When `KingsChessRecord.inProgress === true` for an NPC, show a visual indicator in the GameSelect UI that a game is in progress — "Continue game" instead of "New game". On launch, kings-cooking will detect the saved state and resume.

### 3.8 NPC Personality — Kings Cooking Comments

Add kings-cooking commentary to each NPC's personality config (win/lose reactions for chess, game invite text). These feed into the existing haiku/commentary system.

---

## Phase 4: Deployment ⬜

### 4.1 kings-cooking-python → Railway

- Create Railway project `kings-cooking-python`
- Connect to GitHub repo
- Environment variables:
  ```
  PORT=8100  (set by Railway automatically)
  INFERENCE_CORS_ORIGINS=https://randallard.github.io,https://townage.app
  ```
- Railway auto-deploy on push to main

### 4.2 kings-cooking → GitHub Pages (existing, add env var)

- Add GitHub Actions variable `INFERENCE_API_URL` = Railway deployment URL
- Ensure CI passes all existing checks:
  - `pnpm run check` (TypeScript)
  - `pnpm run lint` (0 warnings, --max-warnings 0)
  - `pnpm test:coverage` (≥80% coverage threshold)
  - `pnpm test:integration`
  - `pnpm test:e2e`
  - `pnpm audit --prod` (no vulnerabilities)
  - `pnpm build`
- PR title must follow conventional commits format
- New AI agents code needs test coverage before merge

### 4.3 townage.app

- Add environment variable: `VITE_KINGS_COOKING_URL=https://randallard.github.io/kings-cooking`
- Rebuild and redeploy

### 4.4 CORS Verification

After Railway deploy, verify from browser console on GitHub Pages:
```javascript
fetch('https://kings-cooking-python.up.railway.app/health')
  .then(r => r.json())
  .then(console.log)
// Should return {"status": "ok"} without CORS error
```

---

## Implementation Order

1. **Phase 1** (kings-cooking-python) — stand-alone, can be done independently
2. **Phase 2.1–2.3** (submodule + hash parsing) — needed before anything else in frontend
3. **Phase 2.4–2.7** (AI turn loop, game mode) — core gameplay
4. **Phase 2.8** (mid-game save + return buttons) — quality of life
5. **Phase 2.9–2.10** (CI/env vars + tests) — required before merge
6. **Phase 3** (townage.app) — depends on Phase 1 being deployed
7. **Phase 4** (deployment) — final integration

---

## Open Questions / Future Considerations

- Player name in townage.app not yet implemented — kings-cooking defaults to "Player"
- Future: trained RL models for kings-cooking (same skill level enum, just add new levels)
- Future: additional scripted agents (scripted_2, scripted_3, etc.)
- Future: AI vs AI mode
- Future: non-3-column board sizes in AI mode

---

*This plan is saved at `plans/ai-agents-plan.md` in the kings-cooking repo.*
*Update phases to ✅ as they are completed.*
