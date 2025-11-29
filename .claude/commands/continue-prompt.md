---
description: Generate continuation prompt for starting new conversation
argument-hint: [optional-note]
allowed-tools:
  - Bash(git status:*)
  - Bash(git log:*)
  - Bash(git diff:*)
  - Bash(ls:*)
  - Bash(find:*)
  - Bash(cat:*)
  - Bash(date:*)
  - Bash(stat:*)
  - Write(**/continuation-prompts/*.md)
---

# Generate Continuation Prompt

!`
#!/bin/bash

# File: .claude/commands/continue-prompt.md
# Generates comprehensive continuation prompt for new Claude Code conversation

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
PROMPT_FILE="plans/continuation-prompts/continue-${TIMESTAMP}.md"
USER_NOTE="$ARGUMENTS"

echo "📝 Generating continuation prompt..."

# Create the continuation prompt file
cat > "$PROMPT_FILE" <<'HEADER'
# Continuation Prompt - Manual Generation

HEADER

echo "**Generated:** $(date +'%Y-%m-%d %H:%M:%S')" >> "$PROMPT_FILE"
echo "**Trigger:** Manual (/continue-prompt command)" >> "$PROMPT_FILE"

if [ -n "$USER_NOTE" ]; then
    echo "**Note:** $USER_NOTE" >> "$PROMPT_FILE"
fi

cat >> "$PROMPT_FILE" <<'DIVIDER'

---

## Current Task Context

DIVIDER

# Get current git status
echo "### Git Status" >> "$PROMPT_FILE"
echo '```' >> "$PROMPT_FILE"
git status >> "$PROMPT_FILE" 2>&1
echo '```' >> "$PROMPT_FILE"
echo "" >> "$PROMPT_FILE"

# Get recent commits
echo "### Recent Commits (Last 10)" >> "$PROMPT_FILE"
echo '```' >> "$PROMPT_FILE"
git log --oneline -10 >> "$PROMPT_FILE" 2>&1
echo '```' >> "$PROMPT_FILE"
echo "" >> "$PROMPT_FILE"

# Get uncommitted changes
if ! git diff --quiet; then
    echo "### Uncommitted Changes" >> "$PROMPT_FILE"
    echo '```' >> "$PROMPT_FILE"
    git diff --stat >> "$PROMPT_FILE" 2>&1
    echo '```' >> "$PROMPT_FILE"
    echo "" >> "$PROMPT_FILE"

    # Show detailed diff for key files
    echo "### Recent File Changes (Detailed)" >> "$PROMPT_FILE"
    echo '```diff' >> "$PROMPT_FILE"
    git diff HEAD >> "$PROMPT_FILE" 2>&1
    echo '```' >> "$PROMPT_FILE"
    echo "" >> "$PROMPT_FILE"
fi

# List active plans
echo "### Active Plans" >> "$PROMPT_FILE"
if [ -d "plans/ACTIVE" ]; then
    find plans/ACTIVE -name "*.md" -type f 2>/dev/null | while read plan; do
        echo "- **$(basename "$plan")**" >> "$PROMPT_FILE"
        echo "  \`\`\`" >> "$PROMPT_FILE"
        head -20 "$plan" >> "$PROMPT_FILE"
        echo "  \`\`\`" >> "$PROMPT_FILE"
        echo "" >> "$PROMPT_FILE"
    done
fi

# Check for non-completed plans in root plans/ directory
echo "### Other Active Plans (Non-Completed)" >> "$PROMPT_FILE"
find plans/ -maxdepth 1 -name "*.md" -type f ! -name "*completed*" ! -name "*COMPLETED*" 2>/dev/null | while read plan; do
    echo "- **$(basename "$plan")**" >> "$PROMPT_FILE"
    echo "  \`\`\`" >> "$PROMPT_FILE"
    head -20 "$plan" >> "$PROMPT_FILE"
    echo "  \`\`\`" >> "$PROMPT_FILE"
    echo "" >> "$PROMPT_FILE"
done

# List recent plan activity
echo "### Recently Modified Plans (Last 7 Days)" >> "$PROMPT_FILE"
find plans/ -name "*.md" -type f -mtime -7 ! -path "*/COMPLETED/*" ! -path "*/completed/*" 2>/dev/null | while read plan; do
    MOD_DATE=$(stat -c %y "$plan" 2>/dev/null | cut -d' ' -f1)
    echo "- \`$plan\` (modified: $MOD_DATE)" >> "$PROMPT_FILE"
done
echo "" >> "$PROMPT_FILE"

# List relevant memories
echo "### Available Project Memories" >> "$PROMPT_FILE"
if [ -d ".serena/memories" ]; then
    ls -1 .serena/memories/*.md 2>/dev/null | while read mem; do
        MEM_NAME=$(basename "$mem" .md)
        echo "- \`$MEM_NAME\`" >> "$PROMPT_FILE"
    done
fi
echo "" >> "$PROMPT_FILE"

# Add continuation template
cat >> "$PROMPT_FILE" <<'TEMPLATE'

---

## Copy This Prompt Into New Conversation

```markdown
# Continue Commission Tracker Project

I was working on the commission tracker project and need to continue in a new conversation.

## Project Overview

- **Name:** Insurance Sales KPI Tracking System
- **Stack:** React 19.1, TypeScript, Supabase/Postgres, TanStack Router/Query/Form
- **Purpose:** Track insurance policies, calculate KPIs, manage commissions, monitor expenses

## Current State Summary

[REVIEW GIT STATUS, COMMITS, AND ACTIVE PLANS ABOVE]

### What I Was Working On

[DESCRIBE BASED ON ACTIVE PLANS AND RECENT COMMITS]

### Current Progress

[LIST WHAT'S BEEN COMPLETED FROM ACTIVE PLANS]

### What Needs To Be Done Next

[LIST PENDING TASKS FROM ACTIVE PLANS]

## Important Project Rules (From CLAUDE.md)

1. **ZERO LOCAL STORAGE** - All data in Supabase database, never localStorage/sessionStorage
2. **Single Migration Directory** - Only `supabase/migrations/` (no database/, db/ folders)
3. **Test Before Complete** - Run typecheck and test all changes
4. **Use Symbolic Tools** - Avoid reading entire files, use serena's symbolic search
5. **No Placeholder UI** - Every feature must be fully functional
6. **Update Plans** - Keep plan files current, move to completed/ when done

## Relevant Memories to Read

[LIST KEY MEMORIES FROM ABOVE THAT ARE RELEVANT TO CURRENT TASK]

## Next Steps

Please continue from where we left off:

1. [First action based on active plans]
2. [Second action]
3. [Third action]

Let me know if you need clarification on any part of the current state.
```

---

## Next Steps for You

1. **Review the prompt above** - Make sure it captures your current state
2. **Copy the markdown in the "Copy This Prompt" section**
3. **Start a new Claude Code conversation**
4. **Paste and customize** - Fill in the bracketed sections based on the context above
5. **Continue your work** in the fresh context window

TEMPLATE

# Create gitignore entry for continuation prompts
if ! grep -q "continuation-prompts" .gitignore 2>/dev/null; then
    echo "" >> .gitignore
    echo "# Auto-generated continuation prompts" >> .gitignore
    echo "plans/continuation-prompts/" >> .gitignore
fi

echo ""
echo "✅ Continuation prompt generated successfully!"
echo ""
echo "📄 File: $PROMPT_FILE"
echo ""
echo "📋 To view the prompt:"
echo "   cat $PROMPT_FILE | less"
echo ""
echo "💡 Quick start new conversation:"
echo "   1. Open new Claude Code session"
echo "   2. Copy content from the 'Copy This Prompt' section"
echo "   3. Customize bracketed sections"
echo "   4. Continue your work!"
echo ""
`

Based on the generated continuation prompt, please review the file and prepare your continuation strategy.

The prompt includes:
- Current git status and recent commits
- Active plans with previews
- Recently modified plans
- Available memories
- Ready-to-copy template for new conversation

**File location:** `$PROMPT_FILE` (generated above)

Next: Review the generated prompt and let me know if you'd like to start a new conversation now or continue in this one.
