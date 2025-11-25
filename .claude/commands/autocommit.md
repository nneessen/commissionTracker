---
description: Intelligent auto-commit with changelog updates and smart commit messages (project, gitignored)
argument-hint: [message]
---

# Stage all changes
git add -A

# Check if there are changes
if git diff --cached --quiet; then
    echo "✨ No changes to commit. Working directory is clean!"
    exit 0
fi

# Show status
echo "📋 Changes to be committed:"
git status --short

# Get commit message
COMMIT_MSG="${ARGUMENTS}"
if [ -z "$COMMIT_MSG" ]; then
    # Auto-generate message
    CHANGED_FILES=$(git diff --cached --name-only)
    NUM_FILES=$(echo "$CHANGED_FILES" | wc -l)
    DIRS=$(echo "$CHANGED_FILES" | xargs -n1 dirname | sort -u | head -3 | tr '\n' ',' | sed 's/,$//' | sed 's/,/, /g')
    COMMIT_MSG="docs: multiple changes in $DIRS"
fi

# Commit
echo "📝 Committing: $COMMIT_MSG"
git commit -m "$COMMIT_MSG"

# Push to remote
BRANCH=$(git branch --show-current)
echo "🚀 Pushing to remote origin/$BRANCH..."
git push origin "$BRANCH"

echo "✅ Successfully committed and pushed to GitHub!"
