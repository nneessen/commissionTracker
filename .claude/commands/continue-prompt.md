---
description: Generate continuation prompt for starting new conversation
argument-hint: [optional-note]
---

# Generate Continuation Prompt

Generate a comprehensive continuation prompt file that captures the current state of the project for starting a new Claude Code conversation.

This command will:
1. Capture current git status and recent commits
2. List active plans with previews
3. Show recently modified plans
4. List available project memories
5. Create a ready-to-copy template for the new conversation

Run the generation script:

```bash
./scripts/generate-continuation-prompt.sh "$ARGUMENTS"
```

After the script runs, review the generated file and use the template to continue in a new conversation.
