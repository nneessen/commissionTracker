# Development Process Reminders

## CRITICAL: Always Test Commands Before Giving Instructions

**ALWAYS run commands yourself to verify they work before instructing the user to run them.**

### Key Testing Rules:
1. **Check running processes**: Use `ps aux | grep node` or similar to see what's already running
2. **Test port availability**: Use `lsof -i :PORT` to check if ports are in use
3. **Run the exact commands** you're suggesting to the user
4. **Verify outputs** match expectations before declaring success
5. **Kill background processes** when switching approaches

### CRITICAL LESSON: Clean Up Background Processes First
**NEVER change configuration (ports, env vars) to work around background processes!**
- Always kill conflicting background shells first
- Then test the original command as intended
- Only change configuration if there's a real architectural need

### EXTREMELY CRITICAL: ALWAYS KILL BACKGROUND PROCESSES WHEN DONE
**IMMEDIATELY kill any background processes you start for testing!**
- Don't leave servers running in background
- Kill them as soon as you've verified they work
- This prevents port conflicts and resource waste
- User gets frustrated when you leave processes running

### Background Process Management:
1. When starting background process: Note the shell ID
2. **IMMEDIATELY after testing**: Kill the shell with KillShell tool
3. NEVER leave background processes running unnecessarily
4. If you need to test multiple things, kill and restart cleanly

### Memory Triggers:
1. **"Did I kill background processes first, then test this command myself?"**
2. **"Did I immediately kill the background process I just started?"**

### Recent Mistakes:
- Changed server port from 3001 to 3002 instead of just killing background processes
- Started background process to test, then left it running
- Created unnecessary configuration inconsistency
- Frustrated user by not cleaning up properly

### Current Project Status:
- PostgreSQL Docker: Running on port 5432
- Configuration restored to original ports
- All background test processes should be killed immediately after verification