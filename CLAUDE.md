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
- **MANDATORY**: Reference `/home/ryankhetlyr/Development/kings-cooking/claude_md_files/CLAUDE-REACT.md` for React/TypeScript patterns and best practices

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
2. **Reference CLAUDE-REACT.md**: Always consult `/home/ryankhetlyr/Development/kings-cooking/claude_md_files/CLAUDE-REACT.md` for React/TypeScript patterns

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

## GitHub Issue Workflow (MANDATORY)

When working on GitHub issues, follow this **strict workflow** to ensure proper context gathering, PRP creation, and implementation:

### Quick Reference - Issue to PR Workflow

```
1. Create branch: git checkout -b issue-{number}-{description}
2. Ask questions (one at a time): ~/bin/gh issue comment {number} --body "Question..."
   → WAIT for response (poll every 5s), repeat until full context
3. Create PRP: /prp-commands:prp-task-create "Fix [component]... Requirements: (1)... Follow TDD."
4. Commit PRP: git add PRPs/*.md && git commit && git push
5. Post PRP summary to issue, WAIT for approval (no polling)
6. Execute PRP: /prp-commands:prp-task-execute "PRPs/task-issue-{number}-{description}.md"
7. RUN ALL TESTS (MANDATORY): pnpm run check && pnpm run lint && pnpm test:coverage && pnpm test:integration && pnpm test:e2e && pnpm build
   → ALL must pass before pushing
8. Push & PR: git push && ~/bin/gh pr create
9. Auto-merge on green CI/CD
```

### Phase 1: Issue Discovery & Context Gathering

1. **Detect New Issue Assignment**
   - Monitor for new issues via `~/bin/gh issue list --repo randallard/kings-cooking`
   - When assigned an issue, immediately create a feature branch:
     ```bash
     git checkout -b issue-{issue-number}-{brief-description}
     ```

2. **Iterative Context Gathering** (CRITICAL: ONE QUESTION AT A TIME)
   - Post questions to the GitHub issue using `~/bin/gh issue comment {issue-number} --body "QUESTION"`
   - **Poll for responses every 5 seconds** using this pattern:
     ```bash
     # Post question
     ~/bin/gh issue comment {issue-number} --body "Your question here"

     # Poll for new comments every 5 seconds
     LAST_COMMENT_COUNT=$(~/bin/gh issue view {issue-number} --json comments --jq '.comments | length')
     while true; do
       sleep 5
       CURRENT_COUNT=$(~/bin/gh issue view {issue-number} --json comments --jq '.comments | length')
       if [ "$CURRENT_COUNT" -gt "$LAST_COMMENT_COUNT" ]; then
         # New comment detected - read and process
         ~/bin/gh issue view {issue-number} --comments | tail -20
         break
       fi
     done
     ```
   - Continue until you have ALL necessary context for a comprehensive PRP
   - Questions should cover:
     - **User Requirements**: What is the desired user-visible behavior?
     - **Technical Constraints**: Any performance, accessibility, or compatibility requirements?
     - **Scope Boundaries**: What is explicitly OUT of scope?
     - **Success Criteria**: How will we know it's done correctly?
     - **Test Strategy**: What specific test cases should be included?
     - **Design Decisions**: Any UI/UX preferences or patterns to follow?

3. **Example Question Flow**:
   ```
   Comment 1: "To ensure I implement this correctly, I need to gather some context.
   First question: What is the primary user-visible behavior you want to see?
   Please describe the exact interaction flow from the user's perspective."

   [WAIT FOR RESPONSE]

   Comment 2: "Thank you! Next question: Are there any specific accessibility
   requirements (keyboard navigation, screen reader support, ARIA labels)?"

   [WAIT FOR RESPONSE]

   ... continue until comprehensive understanding achieved ...
   ```

### Phase 2: Task PRP Creation

4. **Generate Task PRP Using Slash Command**
   - Use `/prp-commands:prp-task-create "description"` with all gathered context in quotes:
     ```bash
     /prp-commands:prp-task-create "Fix [component] to [action]. Bug: [symptom]. Requirements: (1) [req1], (2) [req2], (3) [req3]. Technical context: [key details]. Follow TDD: Red → Green → Refactor."
     ```
   - The command will create: `PRPs/task-issue-{issue-number}-{brief-description}.md`
   - Includes: context, patterns, test strategy, validation gates, implementation blueprint

5. **Commit and Push PRP**
   - After PRP is created, commit it to the feature branch:
     ```bash
     git add PRPs/task-issue-{issue-number}-{brief-description}.md
     git commit -m "docs: add task PRP for issue #{issue-number}

     Created comprehensive Task PRP with:
     - Detailed context from issue discussion
     - Implementation blueprint with validation gates
     - Test strategy (unit/integration/E2E)
     - Rollback strategy

     🤖 Generated with Claude Code"

     git push -u origin issue-{issue-number}-{brief-description}
     ```

6. **Post PRP for Approval**
   - After pushing, comment on issue with PRP summary and link:
     ```bash
     ~/bin/gh issue comment {issue-number} --body "
     I've created a comprehensive Task PRP based on our discussion: \`PRPs/task-issue-{number}-{description}.md\`

     **Summary:**
     - Goal: {one-line goal}
     - Approach: {brief technical approach}
     - Test Strategy: {test coverage plan}
     - Validation: {validation gates}

     **Files Changed:** {list of files}

     Please review and confirm approval to proceed with implementation!
     If any adjustments are needed, let me know and I'll update the PRP.
     "
     ```
   - **WAIT** for explicit approval comment before proceeding
   - Do NOT poll for approval - this may take time for review

### Phase 3: Implementation & Validation

7. **Execute Task PRP Using Slash Command**
   - Once approved (check issue comments for approval), use:
     ```bash
     /prp-commands:prp-task-execute "PRPs/task-issue-{issue-number}-{brief-description}.md"
     ```
   - Provide the local file path to the PRP as parameter in quotes
   - The command will:
     - Execute the implementation following the PRP blueprint
     - Follow TDD: Red → Green → Refactor
     - Reference `/home/ryankhetlyr/Development/kings-cooking/claude_md_files/CLAUDE-REACT.md` for patterns
     - Run validation gates continuously:
       ```bash
       # Level 1: Type checking
       pnpm run check

       # Level 2: Linting
       pnpm run lint

       # Level 3: Unit tests
       pnpm test

       # Level 4: Integration tests
       pnpm test:integration

       # Level 5: E2E tests
       pnpm test:e2e

       # Level 6: Build
       pnpm build
       ```
     - Track progress and report status

8. **Continuous Progress Updates**
   - The execution command will post progress updates to issue as milestones are reached
   - Report any blockers or questions immediately via issue comments

### Phase 4: Pull Request & Merge

9. **Run All Tests Before Pushing** (MANDATORY)
   - **CRITICAL**: You MUST run the complete test suite locally before pushing to remote
   - This catches failures early and prevents CI/CD pipeline failures
   - Run all validation gates in sequence:
     ```bash
     # Step 1: Type checking
     pnpm run check
     echo "✅ Type checking passed"

     # Step 2: Linting
     pnpm run lint
     echo "✅ Linting passed"

     # Step 3: Unit tests with coverage
     pnpm test:coverage
     echo "✅ Unit tests passed"

     # Step 4: Integration tests
     pnpm test:integration
     echo "✅ Integration tests passed"

     # Step 5: E2E tests
     pnpm test:e2e
     echo "✅ E2E tests passed"

     # Step 6: Build verification
     pnpm build
     echo "✅ Build successful"
     ```
   - **ONLY proceed to push if ALL tests pass locally**
   - If any test fails:
     1. Fix the failing test/code
     2. Re-run the full test suite
     3. Do NOT push until everything is green

10. **Create Pull Request**
   - **IMPORTANT**: PR title MUST follow conventional commit format:
     - `feat: description` - New feature
     - `fix: description` - Bug fix
     - `fix(component): description` - Bug fix with scope
     - `docs: description` - Documentation only
     - `test: description` - Adding tests
     - `refactor: description` - Code refactoring
     - `style: description` - Formatting changes
     - `chore: description` - Maintenance tasks
     - `perf: description` - Performance improvements

   - Once ALL validation gates pass, push branch and create PR:
     ```bash
     git push -u origin issue-{issue-number}-{brief-description}

     # PR title MUST match: type(scope)?: description
     # Examples:
     #   "fix: prevent name form auto-closing"
     #   "feat(chess): add castling move validation"
     #   "test: add regression tests for issue #13"

     ~/bin/gh pr create \
       --title "feat: {conventional commit title}" \
       --body "Closes #{issue-number}

     ## Summary
     {Brief description of changes}

     ## Task PRP
     Implemented according to \`PRPs/task-issue-{number}-{description}.md\`

     ## Test Coverage
     - ✅ Unit tests: {coverage %}
     - ✅ Integration tests: passing
     - ✅ E2E tests: passing
     - ✅ Build: successful

     ## Validation Gates
     - ✅ Type checking: passing
     - ✅ Linting: passing
     - ✅ All tests: passing
     "
     ```

11. **Automatic Merge on Green**
   - GitHub Actions will automatically merge PR when all checks pass
   - Monitor for any CI/CD failures and fix immediately
   - If CI/CD fails but local tests passed, investigate environment differences

### Critical Rules for Issue Workflow

- ✅ **ALWAYS create a feature branch** before starting work
- ✅ **ONE question at a time** in issue comments, WAIT for response
- ✅ **USE `/prp-commands:prp-task-create`** to create Task PRP before implementation
- ✅ **GET APPROVAL** on PRP before coding
- ✅ **USE `/prp-commands:prp-task-execute`** to execute the approved PRP
- ✅ **REFERENCE CLAUDE-REACT.md** for patterns
- ✅ **RUN ALL TESTS LOCALLY** before every push (type check, lint, unit, integration, E2E, build)
- ✅ **ALL validation gates MUST pass** before PR
- ✅ **USE conventional commits** for all commits and PR titles
- ❌ **NEVER start coding** without comprehensive context
- ❌ **NEVER skip PRP approval** step
- ❌ **NEVER push code** without running the complete test suite locally first
- ❌ **NEVER merge** without passing tests
- ❌ **NEVER manually create/execute PRPs** - use slash commands

### GitHub CLI Commands Reference

```bash
# List open issues
~/bin/gh issue list --repo randallard/kings-cooking

# View specific issue
~/bin/gh issue view {issue-number} --repo randallard/kings-cooking

# Comment on issue
~/bin/gh issue comment {issue-number} --body "Your comment here"

# Create pull request
~/bin/gh pr create --title "feat: title" --body "Description"

# Check PR status
~/bin/gh pr status

# List pull requests
~/bin/gh pr list --repo randallard/kings-cooking
```

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
  currentPlayer: 'light' | 'dark';
  capturedPieces: {
    white: Piece[];
    black: Piece[];
  };
  gamePhase: 'setup' | 'playing' | 'finished';
  winner?: 'light' | 'dark';
}

// WebRTC message types
export interface GameMessage {
  type: 'move' | 'gameState' | 'setup' | 'chat';
  payload: any;
  timestamp: number;
}
```
