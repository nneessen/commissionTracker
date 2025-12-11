---
description: Intelligent auto-commit with changelog updates and smart commit messages (project, gitignored)
argument-hint: [message]
---

You must perform a full git add, commit, and push to the remote GitHub repository. Do this NOW without asking for confirmation.

## Steps to execute:

1. **Stage ALL changes** - Run `git add -A` to stage everything (new files, modified files, deleted files)

2. **Check for changes** - Run `git status --short` to see what will be committed. If nothing is staged, report "No changes to commit" and stop.

3. **Create commit** - If the user provided a message argument, use it. Otherwise, generate a concise commit message based on the changed files. Run `git commit -m "your message here"`

4. **Push to remote** - Get the current branch with `git branch --show-current`, then run `git push origin <branch>` to push to GitHub.

5. **Confirm success** - Report what was committed and pushed.

User's optional commit message: $ARGUMENTS

IMPORTANT: Execute all git commands immediately. Do not ask for confirmation. Do not skip the push step.
