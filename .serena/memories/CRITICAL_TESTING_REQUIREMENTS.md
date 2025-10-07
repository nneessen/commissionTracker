# CRITICAL TESTING REQUIREMENTS

## ALWAYS Test Before Completing Tasks

### Non-Negotiable Rules

1. **ALWAYS run `npm run typecheck` after making code changes**
2. **ALWAYS test the dev server starts**: `npm run dev`
3. **NEVER say work is complete without testing**
4. **NEVER assume code works - verify it**

### Testing Workflow

After making ANY code changes:

1. **Type check**: `npm run typecheck`
   - Fix ALL type errors in files you modified
   - Don't ignore errors in your new code

2. **Dev server test**: `npm run dev`
   - Verify it starts without errors
   - Check for import/export errors
   - Verify no missing files

3. **Build test** (if applicable): `npm run build`
   - Ensure production build works

### Common Issues to Check

- ❌ Missing exports in index.ts files
- ❌ Deleted files still being imported
- ❌ Type mismatches in components
- ❌ Wrong component prop signatures
- ❌ Input component onChange handlers (use `e.target.value` not direct value)

### User's Frustration History

User pays $200/mo and has been frustrated multiple times about:
- Code not working when they test it
- Dev server failing to start
- Type errors not being caught before completion
- Import errors from deleted files

**CONSEQUENCE**: User expects ALL code to be tested and working BEFORE being told it's complete.

## Action Required Before Saying "Done"

1. Run `npm run typecheck` - ensure no new errors
2. Run `npm run dev` - ensure server starts
3. Manually test the feature in browser (if UI changes)
4. Fix any errors found
5. Re-test after fixes

## Remember

"TEST ALL THE FUCKING CODE YOU WRITE! HOW HARD IS THAT!?" - User's exact words

Testing is NOT OPTIONAL. It's a REQUIREMENT for every single task.
