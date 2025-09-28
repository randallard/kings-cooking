# King's Cooking 🍳♟️

A custom chess variant board game built with Astro 5+ and WebRTC for real-time multiplayer gaming. Deployed on GitHub Pages with comprehensive TDD practices.

## 🎮 Game Overview

**King's Cooking** is a unique chess variant where the goal isn't checkmate, but attending a party hosted by the losing king! Players capture opponent pieces to send them back to their castle to help their king prepare the feast.

### 🏠 Game Rules

1. **Variable Board**: Player 1 chooses board dimensions
2. **No King in Play**: Kings stay at their castle, not on the board
3. **Piece Selection**: Three setup modes:
   - **Random**: Identical random pieces and placement for both players - pieces are chosen from the normal set so there can't be more than one queen, two rooks, two bishops or two knights, player chooses whether pawns are in the mix at a different ratio - normally there would start at a 50% chance that you choose a pawn.  percentage chance of choosing a particular piece changes after each draw.
   - **Playground Mirrored**: Player 2 chooses a piece and it's placement first, then player one gets that piece and placement, and chooses then next, repeating back and forth between players until the first row is filled, so pieces are mirrored and the players took turns choosing pieces and placement, still from the normal set of pieces so there can't be more than one queen, two rooks, two bishops or two knights, pawns are also acceptable
   - **Playground Independent**: Turn-based piece selection and placement - players see what their opponent chose but get to chose their own piece and placement
4. **Standard Movement**: Normal chess rules including en passant
5. **Party Mechanic**: Captured pieces join their king
6. **Victory**: King with the most guests that made it to their castle from the opponents side has to host the feast!
7. **Off-Board Moves**: Rooks/queens can move straight off the board in one turn if there's a clear path; bishops cannot exit if the next square would be off the side of the board - we should have a diagram of this

### 🚀 Technical Stack

- **Frontend**: Astro 5+ completely client side
- **Deployment**: GitHub Pages (static hosting)
- **Multiplayer**: WebRTC peer-to-peer (no server required)
- **Testing**: Vitest + Playwright with MCP integration
- **Development**: TDD Red-Green-Refactor methodology

### 🎯 Key Features

- **Real-time Multiplayer**: Share link to invite Player 2
- **Responsive Design**: Works on desktop and mobile
- **Zero Server Costs**: Pure client-side with P2P communication
- **Comprehensive Testing**: 80%+ coverage with automated CI/CD

## 🛠️ Development Methodology

This project leverages the **PRP (Product Requirement Prompt) Framework** for AI-assisted development that delivers production-ready code on the first pass.

## What is PRP?

Product Requirement Prompt (PRP)

## In short

A PRP is PRD + curated codebase intelligence + agent/runbook—the minimum viable packet an AI needs to plausibly ship production-ready code on the first pass.

Product Requirement Prompt (PRP) is a structured prompt methodology first established in summer 2024 with context engineering at heart. A PRP supplies an AI coding agent with everything it needs to deliver a vertical slice of working software—no more, no less.

### How PRP Differs from Traditional PRD

A traditional PRD clarifies what the product must do and why customers need it, but deliberately avoids how it will be built.

A PRP keeps the goal and justification sections of a PRD yet adds three AI-critical layers:

### Context

Precise file paths and content, library versions and library context, code snippets examples. LLMs generate higher-quality code when given direct, in-prompt references instead of broad descriptions. Usage of a ai_docs/ directory to pipe in library and other docs.

## Getting Started

### Option 1: Copy Resources to Your Existing Project

1. **Copy the Claude commands** to your project:

   ```bash
   # From your project root
   cp -r /path/to/PRPs-agentic-eng/.claude/commands .claude/
   ```

2. **Copy the PRP templates and runner**:

   ```bash
   cp -r /path/to/PRPs-agentic-eng/PRPs/templates PRPs/
   cp -r /path/to/PRPs-agentic-eng/PRPs/scripts PRPs/
   cp /path/to/PRPs-agentic-eng/PRPs/README.md PRPs/
   ```

3. **Copy AI documentation** (optional but recommended):
   ```bash
   cp -r /path/to/PRPs-agentic-eng/PRPs/ai_docs PRPs/
   ```

### Option 2: Clone and Start a New Project

1. **Clone this repository**:

   ```bash
   git clone https://github.com/Wirasm/PRPs-agentic-eng.git
   cd PRPs-agentic-eng
   ```

2. **Create your project structure**:

   ```bash
   # Example for a Python project
   mkdir -p src/tests
   touch src/__init__.py
   touch pyproject.toml
   touch CLAUDE.md
   ```

3. **Initialize with UV** (for Python projects):
   ```bash
   uv venv
   uv sync
   ```

## Using Claude Commands

The `.claude/commands/` directory contains 12 pre-configured commands that appear as slash commands in Claude Code.

### Available Commands

1. **PRP Creation & Execution**:
   - `/create-base-prp` - Generate comprehensive PRPs with research
   - `/execute-base-prp` - Execute PRPs against codebase
   - `/planning-create` - Create planning documents with diagrams
   - `/spec-create-adv` - Advanced specification creation
   - `/spec-execute` - Execute specifications

2. **Code Review & Refactoring**:
   - `/review-general` - General code review
   - `/review-staged-unstaged` - Review git changes
   - `/refactor-simple` - Simple refactoring tasks

3. **Git & GitHub**:
   - `/create-pr` - Create pull requests

4. **Utilities**:
   - `/prime-core` - Prime Claude with project context
   - `/onboarding` - Onboarding process for new team members
   - `/debug` - Debugging workflow

### How to Use Commands

1. **In Claude Code**, type `/` to see available commands
2. **Select a command** and provide arguments when prompted
3. **Example usage**:
   ```
   /create-base-prp user authentication system with OAuth2
   ```

## Using PRPs

### Creating a PRP

1. **Use the template** as a starting point:

   ```bash
   cp PRPs/templates/prp_base.md PRPs/my-feature.md
   ```

2. **Fill in the sections**:
   - Goal: What needs to be built
   - Why: Business value and user impact
   - Context: Documentation, code examples, gotchas
   - Implementation Blueprint: Tasks and pseudocode
   - Validation Loop: Executable tests

3. **Or use Claude to generate one**:
   ```
   /create-base-prp implement user authentication with JWT tokens
   ```

### Executing a PRP

1. **Using the runner script**:

   ```bash
   # Interactive mode (recommended for development)
   uv run PRPs/scripts/prp_runner.py --prp my-feature --interactive

   # Headless mode (for CI/CD)
   uv run PRPs/scripts/prp_runner.py --prp my-feature --output-format json

   # Streaming JSON (for real-time monitoring)
   uv run PRPs/scripts/prp_runner.py --prp my-feature --output-format stream-json
   ```

2. **Using Claude commands**:
   ```
   /execute-base-prp PRPs/my-feature.md
   ```

### PRP Best Practices

1. **Context is King**: Include ALL necessary documentation, examples, and caveats
2. **Validation Loops**: Provide executable tests/lints the AI can run and fix
3. **Information Dense**: Use keywords and patterns from the codebase
4. **Progressive Success**: Start simple, validate, then enhance

### Example PRP Structure

```markdown
## Goal

Implement user authentication with JWT tokens

## Why

- Enable secure user sessions
- Support API authentication
- Replace basic auth with industry standard

## What

JWT-based authentication system with login, logout, and token refresh

### Success Criteria

- [ ] Users can login with email/password
- [ ] JWT tokens expire after 24 hours
- [ ] Refresh tokens work correctly
- [ ] All endpoints properly secured

## All Needed Context

### Documentation & References

- url: https://jwt.io/introduction/
  why: JWT structure and best practices

- file: src/auth/basic_auth.py
  why: Current auth pattern to replace

- doc: https://fastapi.tiangolo.com/tutorial/security/oauth2-jwt/
  section: OAuth2 with Password and JWT

### Known Gotchas

# CRITICAL: Use RS256 algorithm for production

# CRITICAL: Store refresh tokens in httpOnly cookies

# CRITICAL: Implement token blacklist for logout

## Implementation Blueprint

[... detailed implementation plan ...]

## Validation Loop

### Level 1: Syntax & Style

ruff check src/ --fix
mypy src/

### Level 2: Unit Tests

uv run pytest tests/test_auth.py -v

### Level 3: Integration Test

curl -X POST http://localhost:8000/auth/login \
 -H "Content-Type: application/json" \
 -d '{"email": "test@example.com", "password": "testpass"}'
```

## Project Structure Recommendations

```
your-project/
|-- .claude/
|   |-- commands/          # Claude Code commands
|   `-- settings.json      # Tool permissions
|-- PRPs/
|   |-- templates/         # PRP templates
|   |-- scrips/           # PRP runner
|   |-- ai_docs/          # Library documentation
|   |-- completed/        # Finished PRPs
|   `-- *.md              # Active PRPs
|-- CLAUDE.md             # Project-specific guidelines
|-- src/                  # Your source code
`-- tests/                # Your tests
```

## Setting Up CLAUDE.md

Create a `CLAUDE.md` file in your project root with:

1. **Core Principles**: KISS, YAGNI, etc.
2. **Code Structure**: File size limits, function length
3. **Architecture**: How your project is organized
4. **Testing**: Test patterns and requirements
5. **Style Conventions**: Language-specific guidelines
6. **Development Commands**: How to run tests, lint, etc.

See the example CLAUDE.md in this repository for a comprehensive template.

## Advanced Usage

### Running Multiple Claude Sessions

Use Git worktrees for parallel development:

```bash
git worktree add -b feature-auth ../project-auth
git worktree add -b feature-api ../project-api

# Run Claude in each worktree
cd ../project-auth && claude
cd ../project-api && claude
```

### CI/CD Integration

Use the PRP runner in headless mode:

```yaml
# GitHub Actions example
- name: Execute PRP
  run: |
    uv run PRPs/scripts/prp_runner.py \
      --prp implement-feature \
      --output-format json > result.json
```

### Custom Commands

Create your own commands in `.claude/commands/`:

```markdown
# .claude/commands/my-command.md

# My Custom Command

Do something specific to my project.

## Arguments: $ARGUMENTS

[Your command implementation]
```

## Resources Included

### Documentation (PRPs/ai_docs/)

- `cc_base.md` - Core Claude Code documentation
- `cc_actions_sdk.md` - GitHub Actions and SDK integration
- `cc_best_practices.md` - Best practices guide
- `cc_settings.md` - Configuration and security
- `cc_tutorials.md` - Step-by-step tutorials

### Templates (PRPs/templates/)

- `prp_base.md` - Comprehensive PRP template with validation
- `prp_spec.md` - Specification template
- `prp_planning_base.md` - Planning template with diagrams

### Example PRP

- `example-from-workshop-mcp-crawl4ai-refactor-1.md` - Real-world refactoring example

## License

MIT License

## Support

I spent a considerable amount of time creating these resources and prompts. If you find value in this project, please consider buying me a coffee to support my work.

👉 **Buy me a coffee:** https://coff.ee/wirasm

---

Remember: The goal is one-pass implementation success through comprehensive context. Happy coding with Claude Code!
