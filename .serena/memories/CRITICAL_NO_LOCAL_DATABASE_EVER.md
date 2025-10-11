# CRITICAL: NO LOCAL DATABASE EVER

## ABSOLUTE RULES - NEVER BREAK

### 1. **ZERO LOCAL STORAGE FOR APPLICATION DATA**
- ❌ **NEVER** use localStorage, sessionStorage, or IndexedDB for policy, commission, client, or ANY business data
- ❌ **NEVER** create local database files (no SQLite, no local JSON files)
- ❌ **NEVER** suggest or implement any local data persistence except for:
  - Session tokens (handled by Supabase Auth automatically)
  - UI preferences only (theme, sidebar state)
  - Temporary verification email (SESSION_STORAGE_KEYS.VERIFICATION_EMAIL)

### 2. **SUPABASE IS THE ONLY DATABASE**
- ✅ **ALL** application data lives in Supabase PostgreSQL database
- ✅ **ALL** auth is handled by `supabase.auth.*` methods
- ✅ **ALL** data queries use `supabase.from(TABLE_NAME).select()`
- ✅ TanStack Query handles client-side caching (NOT localStorage)

### 3. **AUTHENTICATION RULES**
- ✅ Auth uses `supabase.auth.signInWithPassword()` - **ALREADY IMPLEMENTED CORRECTLY**
- ✅ Session managed by Supabase Auth (automatic, no localStorage needed)
- ✅ User state managed by AuthContext.tsx using Supabase session
- ❌ **NEVER** create custom auth or local user storage

### 4. **IF USER REPORTS AUTH ISSUES**
**DO NOT assume local database is the problem!**

Check in this order:
1. Supabase credentials in `.env` (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
2. Supabase project status (not paused, not deleted)
3. Network connectivity
4. Browser console errors
5. Supabase Auth settings (email confirmation settings)

**DO NOT:**
- Rewrite auth to use local database
- Add localStorage for user data
- Create any local database files

### 5. **DATA FLOW (CORRECT IMPLEMENTATION)**
```
User Action
  ↓
React Component
  ↓
TanStack Query Hook (src/hooks/*.ts)
  ↓
Service Function (src/services/*)
  ↓
Supabase Client (src/services/base/supabase.ts)
  ↓
Supabase PostgreSQL Database (Remote)
```

**NO local storage at ANY step**

### 6. **CURRENT AUTH IMPLEMENTATION (DO NOT CHANGE)**
File: `src/contexts/AuthContext.tsx`
- Line 170-173: Uses `supabase.auth.signInWithPassword()` ✅ CORRECT
- Line 203: Uses `supabase.auth.signUp()` ✅ CORRECT
- Line 253: Uses `supabase.auth.signOut()` ✅ CORRECT

**This is the ONLY correct implementation. DO NOT modify.**

### 7. **IF CLAUDE SUGGESTS LOCAL DATABASE**
**REJECT IMMEDIATELY.** The user will be extremely frustrated.

The user has stated multiple times:
- "NO LOCAL DBS EVER PERIOD"
- "We're not using local dbs this is fucking stupid"
- This is a critical requirement

### 8. **MEMORY CHECK**
Before making ANY changes to auth or data storage:
1. Read this memory file
2. Verify changes use ONLY Supabase
3. Do NOT create any local storage code

---

**Last Updated**: Oct 11, 2025
**Severity**: CRITICAL
**Never forget this**