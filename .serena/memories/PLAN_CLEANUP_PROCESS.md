# Plan File Cleanup Process

## CRITICAL RULE: Always Clean Up Plans When Complete

When finishing ANY task that has an associated plan file in `plans/active/`:

1. **IMMEDIATELY** move the plan to `plans/completed/` using:
   ```bash
   git mv plans/active/<filename>.md plans/completed/
   ```

2. **Check for related plans** - if a task had multiple continuations, move ALL of them

3. **Update ACTIVE_SESSION_CONTINUATION memory** if the plan was the active session

## Why This Matters

- Keeps plans/active/ focused on CURRENT work only
- Prevents confusion about what's actually in progress
- Maintains clean project structure per CLAUDE.md rules

## Script Available

Use `scripts/cleanup-old-plans.sh` to automatically identify plans older than 3 days in plans/active/

## When to Run Cleanup

- After completing ANY task with a plan file
- At the start of new sessions (check for stale plans)
- Before creating new continuation plans
