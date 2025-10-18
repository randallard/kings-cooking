# Check Open GitHub Issues

Check for open GitHub issues in the kings-cooking repository and display them in a clear, actionable format.

## Instructions

1. Run the GitHub CLI command to list open issues
2. Display the results in a table format with:
   - Issue number
   - Title
   - Labels
   - Created date
3. For each issue, provide a quick action template:
   - Command to view full issue details
   - Command to create a feature branch
   - Suggested next steps per the GitHub Issue Workflow in CLAUDE.md

## Command

```bash
~/bin/gh issue list --repo randallard/kings-cooking --state open --json number,title,labels,createdAt --limit 20
```

## Output Format

Display in markdown table:

| # | Title | Labels | Created | Actions |
|---|-------|--------|---------|---------|
| X | Title | label1, label2 | Date | [View](#X) [Branch](#X) |

## Next Steps

For any issue you want to work on:
1. Create feature branch: `git checkout -b issue-{number}-{brief-description}`
2. View full issue: `~/bin/gh issue view {number} --repo randallard/kings-cooking`
3. Follow the GitHub Issue Workflow from CLAUDE.md:
   - Phase 1: Context gathering (one question at a time, poll for responses)
   - Phase 2: Create Task PRP using `/prp-commands:prp-task-create`
   - Phase 3: Get approval on PRP
   - Phase 4: Execute PRP using `/prp-commands:prp-task-execute`
   - Phase 5: Create PR and merge

## Reference

Repository: **randallard/kings-cooking**
Config: `.claude/repo-config.json`
