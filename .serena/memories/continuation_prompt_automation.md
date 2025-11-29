# Continuation Prompt Automation System - FULLY AUTOMATED

## Overview

**ZERO manual steps required** for continuation across context windows. When context fills up, the system automatically preserves state and enables seamless resumption in new conversations.

## Implementation Date

2025-11-29 (Updated to full automation)

## How It Works

### When Context Fills Up (Automatic)

The PreCompact hook automatically:

1. ✅ **Captures current state** - Git status, commits, diffs, active plans, recent changes
2. ✅ **Writes to Serena memory** - Creates `ACTIVE_SESSION_CONTINUATION` memory
3. ✅ **Copies to clipboard** - Windows clipboard via `clip.exe` (WSL2)
4. ✅ **Shows notification** - Windows toast notification via PowerShell
5. ✅ **Saves backup file** - Timestamped file in `plans/continuation-prompts/`

### Starting New Conversation (Zero-Touch)

**Option 1: Auto-Resume (ZERO manual steps) ⭐ RECOMMENDED**

1. User starts ANY new Claude Code conversation (naturally, whenever ready)
2. Claude reads CLAUDE.md instructions
3. Claude sees `ACTIVE_SESSION_CONTINUATION` memory exists
4. Claude automatically reads the memory
5. Claude says: "I found an active session from [DATE]. Would you like to continue?"
6. User says "yes"
7. Work resumes seamlessly

**Option 2: Immediate Continuation (ONE manual step)**

1. Hook copies prompt to clipboard (automatic)
2. User opens new conversation
3. User presses Ctrl+V (ONLY manual step)
4. Work continues

## Components

### 1. PreCompact Hook

**File:** `.claude/hooks/pre-compact.md`

**Triggers:** Automatically when context window fills up

**Actions:**
- Gathers git state (status, commits, diffs, branch)
- Finds active plans from `plans/ACTIVE/` and `plans/`
- Identifies recently modified plans (last 7 days)
- Creates Serena memory: `ACTIVE_SESSION_CONTINUATION.md`
- Generates backup file with timestamp
- Copies to Windows clipboard via `clip.exe`
- Shows Windows notification via PowerShell
- Displays summary with both options

### 2. CLAUDE.md Instructions

**Location:** `CLAUDE.md` (top of file)

**Critical Section:**
```markdown
## CRITICAL: Auto-Resume Active Sessions

If the memory `ACTIVE_SESSION_CONTINUATION` exists:
1. Read the memory immediately
2. Check the timestamp (< 72 hours = likely active)
3. Acknowledge previous session to user
4. Ask if they want to continue or start fresh
5. If continuing: review plans, check current git status, resume work
6. If fresh: archive the memory, proceed with new request
```

**This enables new Claude instances to automatically detect and offer to resume previous sessions!**

### 3. Serena Memory

**File:** `.serena/memories/ACTIVE_SESSION_CONTINUATION.md`

**Auto-generated content:**
- Last session end time
- Git branch and status
- Recent commits (last 10)
- Uncommitted changes with diffs
- Active plans with previews
- Recently modified plans
- Project reminders
- How to continue instructions

**Lifecycle:**
- Created: When context fills (PreCompact hook)
- Read: By new Claude instance automatically
- Deleted: When session truly complete
- Archived: When user starts fresh session

### 4. Backup Files

**Location:** `plans/continuation-prompts/continue-YYYYMMDD_HHMMSS.md`

**Purpose:**
- Permanent backup of continuation state
- Clipboard source for immediate use
- Gitignored (local only)

### 5. Slash Command (Manual Trigger)

**File:** `.claude/commands/continue-prompt.md`

**Usage:** `/continue-prompt [optional-note]`

**When to use:**
- Proactively before context fills
- Create backup before risky operations
- Document current state for future reference

## User Experience

### Zero-Touch Workflow (Recommended)

**Current session:**
```
[Working on features...]
[Context fills up...]
🔄 Context window nearly full - activating FULL AUTOMATION...
✅ Memory written: .serena/memories/ACTIVE_SESSION_CONTINUATION.md
✅ Continuation prompt copied to Windows clipboard
✅ Windows notification sent
[Shows summary of both options]
```

**New session (hours or days later):**
```
User: [starts new conversation naturally]

Claude: I found an active session from 2025-11-29 12:30. The last session was working on:
- Implementing reports page redesign
- Active migration: create_reporting_materialized_views
- Uncommitted changes in: DashboardHome.tsx, ReportsPage.tsx

Would you like me to continue from where that session left off, or start fresh?

User: continue

Claude: Great! Let me review the current state and resume...
[Continues seamlessly]
```

**ZERO manual steps!**

### Immediate Continuation Workflow

**When context fills:**
- Prompt already in clipboard
- Windows notification shown

**User actions:**
1. Open claude.ai/code
2. Start new conversation
3. Press Ctrl+V
4. Press Enter

**ONE manual step (paste)**

## Technical Implementation

### WSL2 Integration

- Uses `clip.exe` for Windows clipboard access
- Uses `powershell.exe` for Windows notifications
- Bash scripts run in WSL2, interact with Windows
- Cross-platform notification system

### Memory Persistence

- Serena memory system (.serena/memories/)
- Automatically read by new Claude instances
- CLAUDE.md instructs Claude to check for active sessions
- Memory lifecycle managed automatically

### Git Integration

- Captures branch, status, commits, diffs
- Detects uncommitted changes
- Includes recent commit history for context
- Compares past state to current state on resume

### Plan Integration

- Scans `plans/ACTIVE/` directory
- Finds non-completed plans in `plans/`
- Shows previews (first 30 lines)
- Tracks recently modified plans (7 days)

## Files Modified

```
.claude/
├── hooks/
│   └── pre-compact.md          # Updated: Full automation
└── commands/
    └── continue-prompt.md       # Original manual command

plans/
└── continuation-prompts/        # Storage (gitignored)

CLAUDE.md                        # Added: Auto-resume instructions

.serena/memories/
├── ACTIVE_SESSION_CONTINUATION.md           # Auto-generated on context fill
└── continuation_prompt_automation.md        # This memory

.gitignore                       # Updated: Exclude continuation prompts
```

## Benefits

### Zero-Touch Mode

- ✅ **Literally zero manual steps**
- ✅ **Resume anytime** - hours or days later
- ✅ **Automatic detection** - Claude reads memory on startup
- ✅ **User confirmation** - Claude asks before resuming
- ✅ **Flexible** - Option to start fresh instead

### Immediate Mode

- ✅ **Clipboard ready** - No file navigation
- ✅ **Windows notification** - Visual confirmation
- ✅ **One-step paste** - Ctrl+V and go
- ✅ **Backup file** - Always available if clipboard clears

### Both Modes

- ✅ **Comprehensive context** - Git, plans, commits, changes
- ✅ **Timestamped** - Know when session ended
- ✅ **Project rules included** - Reminders in every prompt
- ✅ **Git-safe** - All backups gitignored

## Comparison: Before vs After

### Before (Manual Process)

1. Notice context at 5%
2. Say: "Please write a comprehensive continuation prompt"
3. Wait for Claude to generate
4. Copy the prompt manually
5. Open file, select all, copy
6. Start new conversation
7. Paste

**Steps: 7 | Time: 3-5 minutes | Effort: High**

### After Option 1 (Zero-Touch)

1. [Context fills automatically]
2. [Memory written automatically]
3. Start new conversation (whenever ready)
4. Say "yes" when Claude asks to resume

**Steps: 1 | Time: 10 seconds | Effort: Zero**

### After Option 2 (Immediate)

1. [Context fills automatically]
2. [Clipboard filled automatically]
3. Open new conversation
4. Press Ctrl+V

**Steps: 1 manual | Time: 30 seconds | Effort: Minimal**

## Testing

Tested successfully on 2025-11-29:

- ✅ PreCompact hook syntax validated
- ✅ Memory creation works
- ✅ Clipboard automation works (clip.exe)
- ✅ PowerShell notification tested
- ✅ CLAUDE.md instructions added
- ✅ Git state capture complete
- ✅ Plan detection working
- ✅ Backup file generation confirmed
- ✅ End-to-end workflow validated

## Troubleshooting

**Q: New conversation doesn't offer to resume?**
A: Check if `ACTIVE_SESSION_CONTINUATION` memory exists in `.serena/memories/`. If not, the PreCompact hook may not have fired.

**Q: Clipboard is empty?**
A: Check if `clip.exe` is available (`which clip.exe`). WSL2 should have access to Windows clipboard.

**Q: No Windows notification?**
A: Check if `powershell.exe` is available. This is expected in WSL2 but may not work in pure Linux.

**Q: Want to test without filling context?**
A: Run `/continue-prompt` slash command to manually generate a continuation state.

**Q: How to clear old session state?**
A: Delete or rename `.serena/memories/ACTIVE_SESSION_CONTINUATION.md`.

## Best Practices

1. **Use Zero-Touch mode** - Let the system work automatically
2. **Don't rush** - New conversation can be started hours later
3. **Confirm resumption** - Say "yes" when Claude asks
4. **Archive when done** - Delete ACTIVE_SESSION_CONTINUATION memory when project complete
5. **Keep backups local** - Never commit continuation-prompts/ to git

## Future Enhancements

Potential improvements:

1. Include TODO list state in memory
2. Capture active background bash processes
3. Include recent tool usage patterns  
4. Auto-detect incomplete features
5. Browser extension for one-click new conversation
6. Desktop app for zero-click continuation

## Related Documentation

- `docs/continuation-prompt-automation-guide.md` - User guide
- `.claude/hooks/pre-compact.md` - Hook implementation
- `CLAUDE.md` - Auto-resume instructions

## Summary

**This is TRULY fully automated continuation:**

- Context fills → Memory written (automatic)
- New conversation → Claude detects memory (automatic)
- Claude asks to resume → User says yes (one word)
- Work continues (automatic)

**Total user effort: Saying "yes" or pressing Ctrl+V**

**This is as close to zero-touch as technically possible!** 🎉
