# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Nature

This is **King's Cooking** - a custom chess variant board game built with **Astro 5+ for GitHub Pages deployment** using the **PRP (Product Requirement Prompt) Framework** for development methodology. The core concept: **"PRP = PRD + curated codebase intelligence + agent/runbook"** - designed to enable AI agents to ship production-ready code on the first pass.

## King's Cooking - Chess Variant Game

### Game Rules

**King's Cooking** is a custom chess variant with these unique features:

1. **Variable Board**: Player 1 chooses board dimensions
2. **No King in Play**: Kings stay at their castle, not on the board
3. **Piece Selection**: Three setup modes:
   - **Random**: Identical random pieces and placement for both players - pieces are chosen from the normal set so there can't be more than one queen, two rooks, two bishops or two knights, player chooses whether pawns are in the mix at a different ratio - normally there would start at a 50% chance that you choose a pawn.  percentage chance of choosing a particular piece changes after each draw.
   - **Playground Mirrored**: Player 2 chooses a piece and it's placement first, then player one gets that piece and placement, and chooses then next, repeating back and forth between players until the first row is filled, so pieces are mirrored and the players took turns choosing pieces and placement, still from the normal set of pieces so there can't be more than one queen, two rooks, two bishops or two knights, pawns are also acceptable
   - **Playground Independent**: Turn-based piece selection and placement - players see what their opponent chose but get to chose their own piece and placement
4. **Standard Movement**: Normal chess rules including en passant
5. **Party Mechanic**: Captured pieces join their king
6. **Victory**: King with the most guests that made it to their castle from the opponents side has to host the feast!
7. **Off-Board Movement**:
   - Rooks and queens with clear paths can move straight off the board in one move if the path is clear
   - Bishops cannot move off-board if the landing space would not be beyond board sides - we should diagram this

### Technical Architecture

**Frontend**: Astro 5+ static site generation for GitHub Pages
**Real-time Communication**: WebRTC peer-to-peer (no external servers)
**Multiplayer Flow**: Player 1 creates game and sends link to Player 2

## Core Architecture

### Command-Driven System

- **pre-configured Claude Code commands** in `.claude/commands/`
- Commands organized by function:
  - `PRPs/` - PRP creation and execution workflows
  - `development/` - Core development utilities (prime-core, onboarding, debug)
  - `code-quality/` - Review and refactoring commands
  - `rapid-development/experimental/` - Parallel PRP creation and hackathon tools
  - `git-operations/` - Conflict resolution and smart git operations

### Template-Based Methodology

- **PRP Templates** in `PRPs/templates/` follow structured format with validation loops
- **Context-Rich Approach**: Every PRP must include comprehensive documentation, examples, and gotchas
- **Validation-First Design**: Each PRP contains executable validation gates (syntax, tests, integration)

### Test-Driven Development (TDD) Strategy

**MANDATORY**: All development follows strict **Red-Green-Refactor** TDD principles:

1. **Red**: Write failing test first
2. **Green**: Write minimal code to pass test
3. **Refactor**: Improve code while keeping tests green

**Testing Stack**:
- **Unit Testing**: Vitest for game logic, piece movement, board state
- **Integration Testing**: Playwright for WebRTC peer connections and game synchronization
- **E2E Testing**: Playwright for complete multiplayer game flows
- **MCP Integration**: Microsoft Playwright MCP Server for browser automation
- **Mock Strategy**: Mock WebRTC for unit testing, test real connections in integration

**Coverage Requirements**:
- **Minimum 80% code coverage** across all test types
- **YAGNI/KISS principles**: Good coverage without over-engineering
- **GitHub Actions**: Automated testing pipeline with merge protection

**Workflow Integration**:
- **GitHub Issues**: TDD cycle tracking with issue templates
- **GitHub Flow**: Feature branches with auto-merge on green tests
- **Conventional Commits**: Enforced commit message format
- **Status Checks**: Required test passage before merge

### AI Documentation Curation

- `PRPs/ai_docs/` contains curated Claude Code documentation for context injection
- `claude_md_files/` provides framework-specific CLAUDE.md examples

## Development Commands

### PRP Execution

```bash
# Interactive mode (recommended for development)
uv run PRPs/scripts/prp_runner.py --prp [prp-name] --interactive

# Headless mode (for CI/CD)
uv run PRPs/scripts/prp_runner.py --prp [prp-name] --output-format json

# Streaming JSON (for real-time monitoring)
uv run PRPs/scripts/prp_runner.py --prp [prp-name] --output-format stream-json
```

### Key Claude Commands

- `/prp-base-create` - Generate comprehensive PRPs with research
- `/prp-base-execute` - Execute PRPs against codebase
- `/prp-planning-create` - Create planning documents with diagrams
- `/prime-core` - Prime Claude with project context
- `/review-staged-unstaged` - Review git changes using PRP methodology

## Critical Success Patterns

### The PRP Methodology

1. **Context is King**: Include ALL necessary documentation, examples, and caveats
2. **Validation Loops**: Provide executable tests/lints the AI can run and fix
3. **Information Dense**: Use keywords and patterns from the codebase
4. **Progressive Success**: Start simple, validate, then enhance

### PRP Structure Requirements

- **Goal**: Specific end state and desires
- **Why**: Business value and user impact
- **What**: User-visible behavior and technical requirements
- **All Needed Context**: Documentation URLs, code examples, gotchas, patterns
- **Implementation Blueprint**: Pseudocode with critical details and task lists
- **Validation Loop**: Executable commands for syntax, tests, integration

### Validation Gates (Must be Executable)

```bash
# Level 1: Syntax & Style
astro check && eslint . --ext .js,.ts,.astro --max-warnings 0

# Level 2: Unit Tests
pnpm test

# Level 3: Integration Tests
pnpm test:integration

# Level 4: E2E Testing
pnpm test:e2e

# Level 5: Build & Deploy
pnpm build && pnpm preview
```

## Anti-Patterns to Avoid

- L Don't create minimal context prompts - context is everything - the PRP must be comprehensive and self-contained, reference relevant documentation and examples.
- L Don't skip validation steps - they're critical for one-pass success - The better The AI is at running the validation loop, the more likely it is to succeed.
- L Don't ignore the structured PRP format - it's battle-tested
- L Don't create new patterns when existing templates work
- L Don't hardcode values that should be config
- L Don't catch all exceptions - be specific

## Working with This Framework

### When Creating new PRPs

1. **Context Process**: New PRPs must consist of context sections, Context is King!
2.

### When Executing PRPs

1. **Load PRP**: Read and understand all context and requirements
2. **ULTRATHINK**: Create comprehensive plan, break down into todos, use subagents, batch tool etc check prps/ai_docs/
3. **Execute**: Implement following the blueprint
4. **Validate**: Run each validation command, fix failures
5. **Complete**: Ensure all checklist items done

### Command Usage

- Read the .claude/commands directory
- Access via `/` prefix in Claude Code
- Commands are self-documenting with argument placeholders
- Use parallel creation commands for rapid development
- Leverage existing review and refactoring commands

## Project Structure Understanding

```
PRPs-agentic-eng/
.claude/
  commands/           # 28+ Claude Code commands
  settings.local.json # Tool permissions
PRPs/
  templates/          # PRP templates with validation
  scripts/           # PRP runner and utilities
  ai_docs/           # Curated Claude Code documentation
   *.md               # Active and example PRPs
 claude_md_files/        # Framework-specific CLAUDE.md examples
 pyproject.toml         # Python package configuration
```

Remember: This framework is about **one-pass implementation success through comprehensive context and validation**. Every PRP should contain the exact context for an AI agent to successfully implement working code in a single pass.

## Astro 5+ Configuration for King's Cooking

### Core Development Philosophy

**KISS (Keep It Simple, Stupid)**: Choose straightforward solutions over complex ones
**YAGNI (You Aren't Gonna Need It)**: Implement features only when needed
**Islands Architecture**: Ship minimal JavaScript, hydrate only what needs interactivity

### Project Structure

```
src/
├── components/           # Astro components (.astro)
│   ├── game/            # Chess game components
│   ├── ui/              # Reusable UI components
│   └── islands/         # Interactive components (WebRTC, game controls)
├── pages/               # File-based routing
│   ├── index.astro      # Game lobby/setup
│   ├── game/[id].astro  # Game room page
│   └── api/             # API routes (if needed)
├── lib/                 # Game logic and utilities
│   ├── chess/           # Chess game engine
│   ├── webrtc/          # WebRTC connection handling
│   └── utils.ts         # Helper functions
├── types/               # TypeScript type definitions
└── assets/              # Images, icons, sounds
```

### TypeScript Configuration (MANDATORY)

```json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUncheckedIndexedAccess": true,
    "paths": {
      "@/*": ["src/*"],
      "@/components/*": ["src/components/*"],
      "@/lib/*": ["src/lib/*"]
    }
  }
}
```

### Package Management & Dependencies

**MANDATORY**: Use pnpm for all package management

```bash
pnpm create astro@latest . --template minimal
pnpm add @astrojs/tailwind @astrojs/sitemap
pnpm add -D vitest @vitest/ui playwright @playwright/test
pnpm add -D @microsoft/playwright-mcp
```

### Testing Configuration

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";
import { getViteConfig } from "astro/config";

export default defineConfig(
  getViteConfig({
    test: {
      environment: "happy-dom",
      coverage: {
        threshold: {
          global: {
            branches: 80,
            functions: 80,
            lines: 80,
            statements: 80,
          },
        },
      },
    },
  }),
);
```

### MCP Server Configuration

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@microsoft/playwright-mcp"],
      "env": {
        "PLAYWRIGHT_HEADLESS": "false"
      }
    },
    "github": {
      "command": "github-mcp-server",
      "env": {
        "GITHUB_TOKEN": "your_github_token"
      }
    }
  }
}
```

### Development Commands

```json
{
  "scripts": {
    "dev": "astro dev",
    "build": "astro check && astro build",
    "preview": "astro preview",
    "test": "vitest",
    "test:coverage": "vitest --coverage",
    "test:integration": "vitest --config vitest.integration.config.ts",
    "test:e2e": "playwright test",
    "lint": "eslint . --ext .js,.ts,.astro --max-warnings 0",
    "format": "prettier --write \"src/**/*.{astro,js,ts}\"",
    "validate": "pnpm run check && pnpm run lint && pnpm run test:coverage"
  }
}
```

### WebRTC Testing Strategy

```typescript
// Example WebRTC mock for unit testing
export class MockWebRTCConnection {
  connect = vi.fn().mockResolvedValue(true);
  sendGameState = vi.fn();
  onGameStateReceived = vi.fn();
  disconnect = vi.fn();
}

// Integration test with Playwright
test('WebRTC peer connection establishment', async ({ page, context }) => {
  await context.grantPermissions(['camera', 'microphone']);
  const page2 = await context.newPage();

  await page.goto('/');
  await page2.goto('/game/test-room-id');

  // Test connection establishment
  await expect(page.locator('[data-testid="connection-status"]')).toContainText('Connected');
});
```

### Critical Astro Guidelines

1. **NEVER over-hydrate** - Use client:visible, client:idle over client:load
2. **Component props MUST be typed** with interfaces
3. **MUST use Astro's Image component** for all images
4. **Static-first approach** - Only use framework components for interactivity
5. **astro check MUST pass** with zero errors before commits

### Chess Game Specific Patterns

```typescript
// Game state type definitions
export interface GameState {
  board: Piece[][];
  currentPlayer: 'white' | 'black';
  capturedPieces: {
    white: Piece[];
    black: Piece[];
  };
  gamePhase: 'setup' | 'playing' | 'finished';
  winner?: 'white' | 'black';
}

// WebRTC message types
export interface GameMessage {
  type: 'move' | 'gameState' | 'setup' | 'chat';
  payload: any;
  timestamp: number;
}
```
