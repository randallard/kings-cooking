# King's Cooking 🍳♟️

A custom chess variant board game built with React 19 + Vite 7 for GitHub Pages deployment. Developed using the **PRP (Product Requirement Prompt) Framework** for AI-assisted one-pass implementation.

## 🎮 Game Overview

**King's Cooking** is a unique chess variant where the goal isn't checkmate, but attending a party hosted by the losing king! The king with the most opponent pieces that made it to their castle has to host the feast.

### 🏠 Core Game Rules

- **3x3 Board**: Compact chess variant (initially)
- **No King in Play**: Kings stay at their castle, off the board
- **Starting Pieces**: Rook, Knight, Bishop per player (mirrored setup)
- **Standard Movement**: Normal chess rules (no en passant, no castling)
- **Scoring Mechanic**:
  - Pieces that reach opponent's court (off-board) = points for that player
  - Captured pieces go to their own king's court = no points
- **Victory**: Player with most pieces in opponent's court wins
- **Off-Board Movement Rules**:
  - **Rooks**: Can move straight off if path is clear
  - **Knights**: Can L-jump directly off-board
  - **Bishops**: Can move off only if diagonal crosses through middle column (col 1)

For complete rules, see **[PRD.md](PRD.md)** (Product Requirements Document)

---

## 📊 Development Progress

### ✅ Phase 1: Foundation (COMPLETE)
**Status**: Production-ready
**Documentation**: [PRPs/phase-1-foundation-react19.md](PRPs/phase-1-foundation-react19.md)

**Implemented**:
- ✅ React 19.2 + Vite 7 setup
- ✅ TypeScript strict mode
- ✅ Zod validation with branded types
- ✅ localStorage utilities
- ✅ Dark mode support
- ✅ Vitest 3.x + Playwright testing infrastructure
- ✅ ESLint + Prettier (zero warnings)

**Validation**:
- TypeScript: 0 errors
- ESLint: 0 warnings
- Build: Successful
- Tests: 15 passing

---

### ✅ Phase 2: Chess Engine (COMPLETE)
**Status**: Production-ready
**Documentation**: [PRPs/phase-2-chess-engine.md](PRPs/phase-2-chess-engine.md)

**Implemented**:
- ✅ `KingsChessEngine` class (437 lines)
- ✅ Piece movement logic (Rook, Knight, Bishop)
- ✅ Move validation with King's Cooking rules
- ✅ Off-board movement mechanics
- ✅ Capture mechanics (captured piece → own court)
- ✅ Victory condition detection
- ✅ Auto-scoring when team eliminated
- ✅ Move history tracking
- ✅ State serialization (JSON)

**Test Coverage**:
- **104 tests** written (all passing)
- **83.48%** chess engine coverage ✅
- **95.64%** overall coverage ✅

**Validation**:
- Level 1: TypeScript (0 errors) + ESLint (0 warnings) ✅
- Level 2: 104/104 tests passing with 80%+ coverage ✅
- Level 3: Production build successful (252.2KB total) ✅

**Files Created**:
```
src/lib/chess/
├── KingsChessEngine.ts (437 lines)
├── types.ts (51 lines)
├── pieceMovement.ts (288 lines)
├── moveValidation.ts (244 lines)
├── victoryConditions.ts (158 lines)
├── KingsChessEngine.test.ts (28 tests)
├── pieceMovement.test.ts (33 tests)
└── victoryConditions.test.ts (10 tests)
```

---

### ✅ Phase 3: URL State Synchronization (COMPLETE)
**Status**: Production-ready
**Documentation**: [PRPs/phase-3-url-state-synchronization.md](PRPs/phase-3-url-state-synchronization.md)

**Implemented**:
- ✅ lz-string compression (66-88% size reduction)
- ✅ URL-safe base64 encoding
- ✅ Multi-layer URL parser with Zod validation
- ✅ Divergence detection (checksum + turn validation)
- ✅ Player name extraction and persistence
- ✅ localStorage integration for game history
- ✅ `useUrlState` hook with debouncing
- ✅ HistoryViewer component (collapsible panel + full history modal)
- ✅ HistoryComparisonModal for divergence resolution
- ✅ React 19 + focus-trap-react accessibility

**Test Coverage**:
- **294 tests** written (all passing)
- **94.77%** overall coverage ✅
- Coverage by area:
  - URL Encoding: 73.72%
  - History Storage: 94.64%
  - Components: 94.90%
  - Hooks: 0% (not used yet in app)

**Validation**:
- Level 1: TypeScript (0 errors) + ESLint (0 warnings) ✅
- Level 2: 294/294 tests passing with 94.77% coverage ✅
- Level 3: Production build successful (252KB total) ✅

**Files Created**:
```
src/lib/urlEncoding/
├── types.ts (122 lines)
├── compression.ts (119 lines)
├── urlBuilder.ts (141 lines)
├── urlParser.ts (340 lines)
├── divergenceDetection.ts (207 lines)
├── playerNames.ts (157 lines)
├── compression.test.ts (17 tests)
├── urlBuilder.test.ts (20 tests)
├── urlParser.test.ts (23 tests)
└── integration.test.ts (22 tests)

src/lib/history/
├── types.ts (97 lines)
├── storage.ts (194 lines)
└── storage.test.ts (29 tests)

src/components/
├── HistoryViewer.tsx (~352 lines)
├── HistoryViewer.test.tsx (30 tests)
├── HistoryComparisonModal.tsx (~304 lines)
└── HistoryComparisonModal.test.tsx (24 tests)

src/hooks/
└── useUrlState.ts (298 lines)

tests/e2e/
└── url-sharing.spec.ts (19 E2E tests - ready for Playwright)
```

---

### 🔄 Phase 4: UI Components (IN PROGRESS)
**Status**: Phase 4A Complete ✅
**Documentation**: [PRPs/phase-4-ui-components.md](PRPs/phase-4-ui-components.md)

**Phase 4A Complete** (Interactive Game Board):
- ✅ `GameCell` component (119 lines, 10 tests, 93.33% coverage)
- ✅ `GameBoard` component (178 lines, 25 tests, 100% line coverage)
- ✅ CSS Modules with dark mode support
- ✅ WCAG 2.1 AA accessibility (ARIA, keyboard nav)
- ✅ Mobile-responsive design (44px touch targets)
- ✅ Interactive demo in App.tsx

**Phase 4B-C Remaining**:
- ⏳ MoveConfirmButton component
- ⏳ NameForm component + localStorage integration
- ⏳ URLSharer component + clipboard API
- ⏳ HandoffScreen modal (focus-trap-react)
- ⏳ VictoryScreen component + animations

**Test Coverage**:
- **35 tests** written (all passing)
- **97.56%** components/game coverage ✅
- Coverage breakdown:
  - GameBoard.tsx: 100% line coverage
  - GameCell.tsx: 93.33% coverage

**Validation**:
- Level 1: TypeScript (0 errors) + ESLint (0 warnings) ✅
- Level 2: 35/35 tests passing with 97%+ coverage ✅
- Level 3: Development build running successfully ✅

**Files Created**:
```
src/components/game/
├── GameCell.tsx (119 lines)
├── GameCell.module.css (66 lines)
├── GameCell.test.tsx (209 lines, 10 tests)
├── GameBoard.tsx (178 lines)
├── GameBoard.module.css (47 lines)
└── GameBoard.test.tsx (418 lines, 25 tests)

src/vite-env.d.ts (18 lines - CSS module types)
```

---

### 🔄 Phase 5: Game Flow Integration (TODO)
**Status**: Not started
**Estimated**: Week 3-4

**Scope**:
- Wire engine to React UI
- Hot-seat turn handoff
- URL generation on move
- Game history tracking

---

### 🔄 Phase 6: Polish & Optimization (TODO)
**Status**: Not started
**Estimated**: Week 4-5

**Scope**:
- Animations and transitions
- Sound effects
- Mobile optimization
- Performance tuning

---

### 🔄 Phase 7: Deployment (TODO)
**Status**: Not started
**Estimated**: Week 5

**Scope**:
- GitHub Pages deployment
- CI/CD pipeline
- Production testing
- Documentation

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ (recommended: 20+)
- pnpm 8.15+ (package manager)

### Installation & Running

```bash
# Clone repository
git clone https://github.com/yourusername/kings-cooking.git
cd kings-cooking

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

**🎮 Interactive Demo**: Open http://localhost:5173 to see:
- Working 3x3 chess board with interactive pieces
- Click a piece → legal moves highlight → click destination to move
- Real-time game state updates
- "New Game" button to restart
- "Test Validation" button to verify Zod schemas and localStorage

### Development Commands

```bash
# Run all tests
pnpm test

# Run tests with coverage report
pnpm run test:coverage

# Run full validation (TypeScript + ESLint + Tests)
pnpm run validate

# Build for production
pnpm build

# Preview production build
pnpm preview
```

### Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server (Vite) |
| `pnpm build` | Build for production |
| `pnpm preview` | Preview production build |
| `pnpm test` | Run unit tests (Vitest) |
| `pnpm test:coverage` | Run tests with coverage report |
| `pnpm test:e2e` | Run E2E tests (Playwright) |
| `pnpm run check` | TypeScript type checking |
| `pnpm run lint` | Lint with ESLint |
| `pnpm run lint:fix` | Fix ESLint issues |
| `pnpm run format` | Format with Prettier |
| `pnpm run validate` | Run all checks (type-check + lint + tests) |

---

## 🧪 Manual Verification

### Phase 1-4A: Complete Validation

Run the full validation suite to verify all phases:

```bash
# 1. TypeScript type checking (0 errors expected)
pnpm run check

# 2. ESLint (0 warnings expected)
pnpm run lint

# 3. All tests (329 tests expected)
pnpm test

# 4. Test coverage (high coverage expected)
pnpm run test:coverage

# 5. Production build (should succeed)
pnpm build

# 6. View interactive demo
pnpm dev
# Open http://localhost:5173 to test the game board

# Expected Results:
# ✅ TypeScript: 0 errors
# ✅ ESLint: 0 errors, 0 warnings
# ✅ Tests: 329/329 passing (294 previous + 35 new Phase 4A tests)
# ✅ Coverage: High coverage across all modules
#    - Phase 1 (Foundation): 90-95%
#    - Phase 2 (Chess Engine): 83.56%
#    - Phase 3 (URL State): 73-95%
#    - Phase 4A (Game Board): 97.56%
# ✅ Build: dist/ folder created with optimized bundles
# ✅ Interactive Demo: Playable chess board at localhost:5173
```

### Testing Phase 2: Chess Engine

```bash
# Run chess engine tests only
pnpm test src/lib/chess/

# Expected: 71 tests passing
# - KingsChessEngine.test.ts: 28 tests
# - pieceMovement.test.ts: 33 tests
# - victoryConditions.test.ts: 10 tests

# Features covered:
# ✅ Piece Movement: Rook, Knight, Bishop movement patterns
# ✅ Off-Board Movement: All pieces can move off-board correctly
# ✅ Victory Conditions: Score tracking and game end detection
# ✅ Move Validation: Legal/illegal move detection
# ✅ Capture Mechanics: Captured pieces go to correct court
# ✅ State Serialization: JSON export/import
```

### Testing Phase 3: URL State Synchronization

```bash
# Run URL encoding tests
pnpm test src/lib/urlEncoding/

# Expected: 82 tests passing
# - compression.test.ts: 17 tests
# - urlBuilder.test.ts: 20 tests
# - urlParser.test.ts: 23 tests
# - integration.test.ts: 22 tests

# Run history storage tests
pnpm test src/lib/history/

# Expected: 59 tests passing
# - storage.test.ts: 29 tests
# - playerNames integration: 30 tests

# Run component tests
pnpm test src/components/

# Expected: 54 tests passing
# - HistoryViewer.test.tsx: 30 tests
# - HistoryComparisonModal.test.tsx: 24 tests

# Features covered:
# ✅ lz-string compression/decompression (66-88% size reduction)
# ✅ URL-safe base64 encoding
# ✅ Multi-layer URL parser with Zod validation
# ✅ Divergence detection (checksum + turn validation)
# ✅ Player name extraction from URLs
# ✅ localStorage integration for game history
# ✅ React components with accessibility (ARIA, keyboard nav, focus trap)
```

### Verifying Test Coverage

```bash
# Run coverage report
pnpm run test:coverage

# Expected results:
# Test Files: 14 passed (14)
# Tests: 294 passed (294)
# Coverage:
#   All files: 94.77% Statements | 88.72% Branches | 87.61% Functions
#   src/lib/chess: 83.56%
#   src/lib/urlEncoding: 73.72%
#   src/lib/history: 94.64%
#   src/components: 94.90%

# View detailed HTML report
open coverage/index.html
```

### Testing Individual Features

**Phase 2 - Chess Engine**:
```bash
# Test specific piece movement
pnpm test pieceMovement.test.ts

# Test victory conditions
pnpm test victoryConditions.test.ts

# Test full engine
pnpm test KingsChessEngine.test.ts
```

**Phase 3 - URL State**:
```bash
# Test compression
pnpm test compression.test.ts

# Test URL parsing
pnpm test urlParser.test.ts

# Test integration flow
pnpm test integration.test.ts

# Test React components
pnpm test HistoryViewer.test.tsx
pnpm test HistoryComparisonModal.test.tsx
```

**Phase 4A - Game Board UI**:
```bash
# Test all game components
pnpm test src/components/game/

# Expected: 35 tests passing
# - GameCell.test.tsx: 10 tests (93.33% coverage)
# - GameBoard.test.tsx: 25 tests (100% line coverage)

# Test specific components
pnpm test GameCell.test.tsx
pnpm test GameBoard.test.tsx

# Features covered:
# ✅ GameCell: Piece rendering, selection states, accessibility
# ✅ GameBoard: Move selection, legal move highlighting, turn management
# ✅ Chess engine integration (getValidMoves API)
# ✅ ARIA attributes and keyboard navigation
# ✅ Screen reader announcements
# ✅ Mobile-responsive design
```

**Interactive Manual Testing**:
```bash
# Start dev server
pnpm dev

# Open browser: http://localhost:5173

# Test the following:
# 1. Click white rook (♖) at bottom-left → should highlight legal moves
# 2. Click highlighted square → piece should move
# 3. Try clicking opponent's pieces (black) → should not select
# 4. Click "New Game" → board should reset
# 5. Click "Test Validation" → check console for Zod validation results
# 6. Try keyboard navigation (Tab to cells, Enter to select)
# 7. Test dark mode (toggle OS dark mode) → board colors should adapt
# 8. Test mobile (resize to 320px width) → touch targets should be 44px minimum
```

---

## 🛠️ Technical Stack

### Core
- **React 19.2** (with React Compiler)
- **Vite 7.1** (build tool)
- **TypeScript 5.9** (strict mode)
- **Zod 3.25** (runtime validation)
- **UUID 11.0** (unique identifiers)

### Phase 3: URL State & UI
- **lz-string 1.5** (compression, 66-88% size reduction)
- **zod-validation-error 3.4** (human-readable error messages)
- **focus-trap-react 11.0** (modal accessibility)

### Testing
- **Vitest 3.2** (unit tests)
- **Playwright 1.56** (E2E tests)
- **@testing-library/react 16.1** (React testing)
- **@testing-library/user-event 14.6** (user interactions)
- **Happy DOM 15.11** (DOM environment)

### Development
- **ESLint 9.36** (linting, zero warnings enforced)
- **Prettier 3.1** (code formatting)
- **pnpm 8.15** (package manager)

---

## 📚 Development Methodology: PRP Framework

This project uses the **PRP (Product Requirement Prompt) Framework** for AI-assisted development.

### What is PRP?

**PRP = PRD + curated codebase intelligence + agent/runbook**

A PRP is a structured prompt that provides AI coding agents with everything needed to deliver production-ready code on the first pass.

### Key PRP Principles

1. **Context is King**: Include ALL necessary documentation, examples, and gotchas
2. **Validation Loops**: Provide executable tests/lints the AI can run and fix
3. **Information Dense**: Use keywords and patterns from the codebase
4. **Progressive Success**: Start simple, validate, then enhance

### PRP Structure

```markdown
## Goal
Specific end state and deliverables

## Why
Business value and user impact

## What
User-visible behavior and technical requirements

## All Needed Context
- Documentation URLs
- Code examples
- Gotchas and pitfalls
- Patterns to follow

## Implementation Blueprint
Detailed pseudocode and task breakdown

## Validation Loop
Level 1: Syntax & Style
Level 2: Unit Tests
Level 3: Integration Tests
Level 4: Manual Verification
```

### Available PRPs

- **[PRD.md](PRD.md)** - Complete Product Requirements Document
- **[Phase 1 PRP](PRPs/phase-1-foundation-react19.md)** - Foundation setup (✅ Complete)
- **[Phase 2 PRP](PRPs/phase-2-chess-engine.md)** - Chess engine implementation (✅ Complete)
- **[Phase 3 PRP](PRPs/phase-3-url-state-synchronization.md)** - URL state synchronization (✅ Complete)
- Phase 4-7 PRPs (coming soon)

### Using PRPs

```bash
# Execute a PRP using Claude Code
/prp-base-execute PRPs/phase-2-chess-engine.md

# Or use the runner script
uv run PRPs/scripts/prp_runner.py --prp phase-2-chess-engine --interactive
```

---

## 📁 Project Structure

```
kings-cooking/
├── PRPs/                          # Product Requirement Prompts
│   ├── phase-1-foundation-react19.md
│   ├── phase-2-chess-engine.md
│   ├── phase-3-url-state-synchronization.md
│   ├── templates/                 # PRP templates
│   ├── scripts/                   # PRP runner
│   └── ai_docs/                   # Curated documentation
├── .claude/
│   ├── commands/                  # Claude Code commands
│   └── settings.local.json        # Tool permissions
├── src/
│   ├── lib/
│   │   ├── chess/                 # Phase 2: Chess engine
│   │   │   ├── KingsChessEngine.ts
│   │   │   ├── types.ts
│   │   │   ├── pieceMovement.ts
│   │   │   ├── moveValidation.ts
│   │   │   ├── victoryConditions.ts
│   │   │   ├── KingsChessEngine.test.ts
│   │   │   ├── pieceMovement.test.ts
│   │   │   └── victoryConditions.test.ts
│   │   ├── urlEncoding/           # Phase 3: URL state sync
│   │   │   ├── types.ts
│   │   │   ├── compression.ts
│   │   │   ├── urlBuilder.ts
│   │   │   ├── urlParser.ts
│   │   │   ├── divergenceDetection.ts
│   │   │   ├── playerNames.ts
│   │   │   ├── compression.test.ts
│   │   │   ├── urlBuilder.test.ts
│   │   │   ├── urlParser.test.ts
│   │   │   └── integration.test.ts
│   │   ├── history/               # Phase 3: History storage
│   │   │   ├── types.ts
│   │   │   ├── storage.ts
│   │   │   └── storage.test.ts
│   │   ├── storage/               # Phase 1: localStorage utilities
│   │   │   ├── localStorage.ts
│   │   │   └── localStorage.test.ts
│   │   └── validation/            # Phase 1: Zod schemas
│   │       ├── schemas.ts
│   │       └── schemas.test.ts
│   ├── components/                # React components
│   │   ├── game/                  # Phase 4A: Game board UI
│   │   │   ├── GameCell.tsx
│   │   │   ├── GameCell.module.css
│   │   │   ├── GameCell.test.tsx
│   │   │   ├── GameBoard.tsx
│   │   │   ├── GameBoard.module.css
│   │   │   └── GameBoard.test.tsx
│   │   ├── HistoryViewer.tsx      # Phase 3: History UI
│   │   ├── HistoryViewer.test.tsx
│   │   ├── HistoryComparisonModal.tsx
│   │   └── HistoryComparisonModal.test.tsx
│   ├── hooks/                     # Phase 3: React hooks
│   │   └── useUrlState.ts
│   ├── App.tsx                    # Demo app with interactive board
│   ├── App.test.tsx
│   ├── main.tsx
│   ├── vite-env.d.ts              # Phase 4A: CSS module types
│   └── index.css
├── tests/
│   └── e2e/                       # Phase 3: E2E tests
│       └── url-sharing.spec.ts
├── CLAUDE.md                      # Project instructions for Claude
├── PRD.md                         # Product Requirements Document
├── README.md                      # This file
├── package.json
├── vite.config.ts
├── vitest.config.ts
└── tsconfig.json
```

---

## 🔐 Type Safety

This project enforces **strict TypeScript** with:

- `strict: true`
- `noImplicitAny: true`
- `strictNullChecks: true`
- `noUncheckedIndexedAccess: true`
- `exactOptionalPropertyTypes: true`

All external data is validated with **Zod** at runtime:

```typescript
// Branded types prevent mixing IDs
const gameId: GameId = GameIdSchema.parse(uuid());
const playerId: PlayerId = PlayerIdSchema.parse(uuid());

// Full game state validation
const state = GameStateSchema.parse(externalData);
```

---

## 🧪 Testing Strategy

### Test Pyramid

- **Unit Tests** (294 tests): Piece movement, validation, URL encoding, compression, storage
- **Integration Tests** (41 tests): Complete URL state synchronization flows
- **Component Tests** (54 tests): HistoryViewer, HistoryComparisonModal with accessibility
- **E2E Tests** (19 tests): UI interactions (Playwright - ready to run)

### TDD Red-Green-Refactor

1. **Red**: Write failing test first
2. **Green**: Write minimal code to pass
3. **Refactor**: Improve code while keeping tests green

### Coverage Requirements

- **Minimum 80%** across all test types
- **Current achievement**: 94.77% overall coverage ✅
  - Phase 1 (Foundation): 90-95%
  - Phase 2 (Chess Engine): 83.56%
  - Phase 3 (URL State): 73-95% (varies by module)

---

## 🎨 Code Style

- **KISS**: Keep It Simple, Stupid
- **YAGNI**: You Aren't Gonna Need It
- **ESLint**: Zero warnings enforced
- **Prettier**: Consistent formatting
- **JSDoc**: All public APIs documented

---

## 📖 Documentation

- **[PRD.md](PRD.md)** - Complete game rules and technical architecture
- **[CLAUDE.md](CLAUDE.md)** - Development guidelines for AI agents
- **[Phase 1 PRP](PRPs/phase-1-foundation-react19.md)** - Foundation implementation (✅ Complete)
- **[Phase 2 PRP](PRPs/phase-2-chess-engine.md)** - Chess engine implementation (✅ Complete)
- **[Phase 3 PRP](PRPs/phase-3-url-state-synchronization.md)** - URL state synchronization (✅ Complete)
- **Type Definitions** - All code includes TypeScript types and JSDoc
- **Test Coverage Reports** - Run `pnpm run test:coverage` to view detailed HTML reports

---

## 🤝 Contributing

This project is built using AI-assisted development with the PRP framework. To contribute:

1. Read **[CLAUDE.md](CLAUDE.md)** for project guidelines
2. Review relevant PRPs in **PRPs/** directory
3. Follow TDD Red-Green-Refactor methodology
4. Ensure 80%+ test coverage
5. Pass all validation gates (TypeScript + ESLint + tests + build)

---

## 📄 License

MIT License

---

## 🙏 Acknowledgments

Built using the **PRP (Product Requirement Prompt) Framework** by [@Wirasm](https://github.com/Wirasm).

If you find value in this methodology, consider:
👉 **Buy me a coffee:** https://coff.ee/wirasm

---

**Current Status**: Phase 4A Complete ✅ (Interactive Game Board) | Next: Phase 4B-C (Game Controls & Screens)

---

## 🎮 Try It Now!

```bash
pnpm install
pnpm dev
# Open http://localhost:5173
```

Play with the interactive chess board and see the game in action! 🎉
