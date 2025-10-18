# King's Cooking - Quick Reference for Claude Code

**Last Updated:** 2025-10-18

---

## Repository Information

- **Owner:** randallard
- **Name:** kings-cooking
- **Full Name:** randallard/kings-cooking
- **URL:** https://github.com/randallard/kings-cooking
- **Git Remote:** git@github.com:randallard/kings-cooking.git
- **Branch:** main
- **GitHub CLI:** `~/bin/gh` (authenticated as ryankhetlyr)

---

## Quick Commands

### Check Open Issues
```bash
~/bin/gh issue list --repo randallard/kings-cooking --state open
```

**Current Open Issues (as of 2025-10-18):**
- **#11** - [BUG] Name set requires change (bug)
- **#9** - [TDD] allow more than one game at a time
- **#6** - [TDD] Allow players to select which pieces they play with
- **#4** - [REFACTOR] Refactor Black and White verbiage

### View Specific Issue
```bash
~/bin/gh issue view {issue_number} --repo randallard/kings-cooking
```

### Comment on Issue
```bash
~/bin/gh issue comment {issue_number} --body "Your comment here" --repo randallard/kings-cooking
```

### Create Pull Request
```bash
~/bin/gh pr create --repo randallard/kings-cooking --title "feat: title" --body "Description"
```

---

## GitHub Issue Workflow (FROM CLAUDE.md)

### Phase 1: Issue Discovery & Context Gathering

1. **Create feature branch:**
   ```bash
   git checkout -b issue-{issue-number}-{brief-description}
   ```

2. **Iterative Context Gathering (ONE QUESTION AT A TIME):**
   - Post question:
     ```bash
     ~/bin/gh issue comment {issue-number} --body "Your question here"
     ```

   - **Poll for response every 5 seconds:**
     ```bash
     LAST_COMMENT_COUNT=$(~/bin/gh issue view {issue-number} --json comments --jq '.comments | length')
     while true; do
       sleep 5
       CURRENT_COUNT=$(~/bin/gh issue view {issue-number} --json comments --jq '.comments | length')
       if [ "$CURRENT_COUNT" -gt "$LAST_COMMENT_COUNT" ]; then
         ~/bin/gh issue view {issue-number} --comments | tail -20
         break
       fi
     done
     ```

3. **Continue until comprehensive context gathered**

### Phase 2: Task PRP Creation

4. **Generate Task PRP:**
   ```bash
   /prp-commands:prp-task-create "Fix [component] to [action]. Requirements: (1) [req1], (2) [req2]. Technical context: [details]. Follow TDD: Red → Green → Refactor."
   ```

5. **Commit and Push PRP:**
   ```bash
   git add PRPs/task-issue-{issue-number}-{brief-description}.md
   git commit -m "docs: add task PRP for issue #{issue-number}

   Created comprehensive Task PRP with:
   - Detailed context from issue discussion
   - Implementation blueprint with validation gates
   - Test strategy (unit/integration/E2E)

   🤖 Generated with Claude Code"

   git push -u origin issue-{issue-number}-{brief-description}
   ```

6. **Post PRP for Approval:**
   ```bash
   ~/bin/gh issue comment {issue-number} --body "I've created a comprehensive Task PRP: PRPs/task-issue-{number}-{description}.md

   **Summary:**
   - Goal: {one-line goal}
   - Approach: {technical approach}
   - Test Strategy: {test coverage}
   - Validation: {validation gates}

   Please review and approve!"
   ```

7. **WAIT for explicit approval** (do NOT poll)

### Phase 3: Implementation & Validation

8. **Execute Task PRP:**
   ```bash
   /prp-commands:prp-task-execute "PRPs/task-issue-{issue-number}-{brief-description}.md"
   ```

9. **Run Validation Gates:**
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

### Phase 4: Pull Request & Merge

10. **Create Pull Request:**
    ```bash
    git push -u origin issue-{issue-number}-{brief-description}

    ~/bin/gh pr create \
      --title "feat: {conventional commit title}" \
      --body "Closes #{issue-number}

    ## Summary
    {Brief description}

    ## Task PRP
    Implemented according to PRPs/task-issue-{number}-{description}.md

    ## Test Coverage
    - ✅ Unit tests: passing
    - ✅ Integration tests: passing
    - ✅ E2E tests: passing
    - ✅ Build: successful

    ## Validation Gates
    - ✅ Type checking: passing
    - ✅ Linting: passing
    - ✅ All tests: passing"
    ```

11. **Auto-merge on green CI/CD**

---

## Critical Rules

- ✅ **ALWAYS create a feature branch** before starting work
- ✅ **ONE question at a time** in issue comments, WAIT for response
- ✅ **USE `/prp-commands:prp-task-create`** to create Task PRP before implementation
- ✅ **GET APPROVAL** on PRP before coding
- ✅ **USE `/prp-commands:prp-task-execute`** to execute the approved PRP
- ✅ **REFERENCE CLAUDE-REACT.md** for patterns (`/home/ryankhetlyr/Development/kings-cooking/claude_md_files/CLAUDE-REACT.md`)
- ✅ **ALL validation gates MUST pass** before PR
- ✅ **USE conventional commits** for all commits and PR titles
- ❌ **NEVER start coding** without comprehensive context
- ❌ **NEVER skip PRP approval** step
- ❌ **NEVER merge** without passing tests
- ❌ **NEVER manually create/execute PRPs** - use slash commands

---

## Project Stack

**Core:**
- React 19.2 + Vite 7.1
- TypeScript 5.9 (strict mode)
- pnpm 8.15 (MANDATORY package manager)

**Testing:**
- Vitest 3.x (612 tests, 94.09% coverage)
- Playwright 1.56 (E2E)
- @testing-library/react 16

**Validation:**
- Zod 3.22 (runtime validation)
- ESLint 9.36 (zero warnings enforced)
- TypeScript strict mode (all flags)

---

## Development Commands

```bash
# Start dev server
pnpm dev

# Run all validation
pnpm run validate

# Type checking
pnpm run check

# Linting
pnpm run lint

# Unit tests
pnpm test

# Test coverage
pnpm test:coverage

# Integration tests
pnpm test:integration

# E2E tests
pnpm test:e2e

# Build
pnpm build

# Preview build
pnpm preview
```

---

## File Locations

**Key Configuration:**
- Repository config: `.claude/repo-config.json`
- Project instructions: `CLAUDE.md`
- React patterns: `claude_md_files/CLAUDE-REACT.md`
- PRD: `PRD.md`
- README: `README.md`

**Commands:**
- All Claude commands: `.claude/commands/`
- PRP commands: `.claude/commands/prp-commands/`
- Development utils: `.claude/commands/development/`
- Check issues: `.claude/commands/development/check-issues.md`

**PRPs:**
- Active PRPs: `PRPs/*.md`
- Completed: `PRPs/completed/`
- Templates: `PRPs/templates/`
- Research: `PRPs/research/`

**Source Code:**
- Main app: `src/App.tsx`
- Chess engine: `src/lib/chess/`
- URL encoding: `src/lib/urlEncoding/`
- Game flow: `src/lib/gameFlow/`
- Components: `src/components/game/`
- Types: `src/types/gameFlow.ts`

---

## Phase Status

- ✅ Phase 1: Foundation (COMPLETE)
- ✅ Phase 2: Chess Engine (COMPLETE)
- ✅ Phase 3: URL State Sync (COMPLETE)
- ✅ Phase 4: UI Components (COMPLETE)
- ✅ Phase 5: Game Flow Integration (COMPLETE)
- 🔄 Phase 6: Polish & Optimization (NEXT)
- 📋 Phase 7: Deployment (TODO)

**Current State:** Fully playable dual-mode chess game with 612 tests (94.09% coverage)

---

## Issue Templates

### Context Gathering Comment Template
```
To ensure I implement this correctly, I need to gather some context.

First question: {Your specific question}

Please provide details about {specific aspect}.
```

### PRP Approval Request Template
```
I've created a comprehensive Task PRP: PRPs/task-issue-{number}-{description}.md

**Summary:**
- Goal: {one-line goal}
- Approach: {brief technical approach}
- Test Strategy: {test coverage plan}
- Validation: {validation gates}

**Files Changed:** {list of files}

Please review and confirm approval to proceed with implementation!
If any adjustments are needed, let me know and I'll update the PRP.
```

---

## Quick Reference: Issue to PR Workflow

```
1. git checkout -b issue-{number}-{description}
2. Ask questions (one at a time): ~/bin/gh issue comment {number} --body "Q..."
   → WAIT for response (poll every 5s)
3. /prp-commands:prp-task-create "Fix... Requirements: (1)... Follow TDD."
4. git add PRPs/*.md && git commit && git push
5. Post PRP summary, WAIT for approval
6. /prp-commands:prp-task-execute "PRPs/task-issue-{number}-*.md"
7. git push && ~/bin/gh pr create
8. Auto-merge on green CI/CD
```

---

**This quick reference provides all essential information for working with the kings-cooking repository using the PRP Framework and GitHub Issue Workflow.**
