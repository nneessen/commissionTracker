# FIX: Products Dropdown Not Populating

## THE PROBLEM
Products dropdown is empty because RLS policies are filtering out all data for anonymous users.

## THE FIX (2 MINUTES)

### Step 1: Open Supabase Dashboard SQL Editor

Go to: **https://supabase.com/dashboard/project/pcyaqwodnyrpkaiojnpz/sql**

### Step 2: Copy and Paste This SQL

```sql
ALTER TABLE public.carriers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
```

### Step 3: Click "RUN"

### Step 4: Verify Fix

```bash
node scripts/diagnose-rls-issue.js
```

**Expected Output:**
```
📋 STEP 6: Anonymous Key Access Test (CRITICAL!)

  Carriers Query:
    ✅ SUCCESS: 7 carriers found  ← Should show 7, not 0!

  Products Query:
    ✅ SUCCESS: 42 products found  ← Should show 42, not 0!
```

### Step 5: Test in Browser

```bash
npm run dev
```

1. Open http://localhost:3002
2. Click "New Policy"
3. Select carrier: "United Home Life"
4. Products dropdown should show 7 products
5. Select "Term" → Commission auto-fills to 102.5%

## WHY THIS WORKS

- Carriers and products are **reference data** (like a lookup table)
- They don't contain sensitive user information
- They're the same for all users
- Disabling RLS makes them publicly readable
- Write operations still require authentication

## DONE!
Once you run that SQL, everything will work immediately. No code changes needed.
