# Registration Route Fix - Verification Steps

## The Problem
The `/register/$token` route was redirecting to `/login` because it wasn't in the public paths whitelist.

## The Fix Applied
Added `/register/` to the `publicPaths` array in `src/App.tsx:31`

```typescript
const publicPaths = [
  "/login",
  "/auth/callback",
  "/auth/verify-email",
  "/auth/reset-password",
  "/auth/pending",
  "/auth/denied",
  "/terms",
  "/privacy",
  "/join-",
  "/join/",
  "/register/",  // ← ADDED THIS LINE
];
```

---

## ⚠️ CRITICAL: You Must Restart/Rebuild

The changes are in the code, but you need to restart your dev server or rebuild for them to take effect:

### If Testing Locally (Dev Server):
```bash
# Stop your dev server (Ctrl+C)
# Then restart it:
npm run dev
```

### If Testing on Deployed Site:
```bash
# Rebuild the app:
npm run build

# Deploy the new build to your hosting provider
# (Vercel, Netlify, etc.)
```

---

## Verification Steps

### Step 1: Clear Browser Cache
Before testing, clear your browser cache or open an **incognito window** to avoid cached redirects.

### Step 2: Test the Registration URL Directly
Open your browser and navigate directly to a test registration URL:

**Local Dev:**
```
http://localhost:5173/register/test-token-123
```

**Production:**
```
https://www.thestandardhq.com/register/test-token-123
```

### Step 3: Expected Behavior
✅ **Should see**: The registration form page loads (PublicRegistrationPage)
❌ **Should NOT see**: Redirect to /login page

### Step 4: Check Browser Console
Open DevTools (F12) → Console tab and check for errors:
- Should NOT see: "Redirecting to login..."
- Should see the registration page render

### Step 5: Test Full Flow
1. Go to "Send Registration Invite" dialog
2. Send an invite to a test email
3. Click the link in the email
4. Verify it loads the registration form (not login)

---

## Debugging If Still Failing

### Check 1: Verify the Code Change Exists
```bash
grep "/register/" src/App.tsx
```

Expected output should include:
```
    "/register/",
```

### Check 2: Verify Dev Server Picked Up Changes
Look at your terminal where `npm run dev` is running. You should see:
```
hmr update /src/App.tsx
```

If you DON'T see this, restart the dev server.

### Check 3: Test Path Matching Logic
Run this test script:
```bash
node test-path-matching.js
```

Expected output:
```
Path: /register/abc123-token → ✅ PUBLIC
```

### Check 4: Check for Service Worker Cache
If your site uses a service worker, you may need to:
1. Open DevTools → Application tab → Service Workers
2. Click "Unregister" on any registered workers
3. Hard refresh (Cmd+Shift+R or Ctrl+Shift+F5)

### Check 5: Verify Router Configuration
```bash
grep -A 5 "publicRegistrationRoute" src/router.tsx
```

Should show:
```typescript
const publicRegistrationRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "register/$token",
  component: PublicRegistrationPage,
});
```

---

## Still Not Working?

If after following ALL the steps above it STILL redirects to login:

1. **Check your browser network tab** (F12 → Network):
   - Look for the initial navigation to `/register/token`
   - Check if there's a 302/301 redirect response
   - Note what URL it redirects to

2. **Check the actual URL in the browser**:
   - Does it say `/register/abc123` or something else?
   - Is there a typo in the URL?

3. **Test with curl** to bypass browser cache entirely:
   ```bash
   curl -I http://localhost:5173/register/test-123
   ```

4. **Check if there's a reverse proxy** (nginx, cloudflare) doing redirects before the app even sees the request

5. **Provide the following debug info**:
   - Browser console logs
   - Network tab screenshot showing the redirect
   - Output of `grep "/register/" src/App.tsx`
   - Confirmation that dev server was restarted

---

## What This Fix Does

The `publicPaths` array in `App.tsx` controls which routes don't require authentication.

The auth guard checks:
```typescript
const isPublicPath = publicPaths.some((path) =>
  location.pathname.startsWith(path),
);
```

For a URL like `/register/abc123-token-here`:
- It checks if the path starts with any entry in `publicPaths`
- `/register/abc123-token-here`.startsWith("/register/") → `true`
- So `isPublicPath = true`
- Auth guard skips redirect, allows the route to render

Without `/register/` in the array, the guard treats it as a protected route and redirects to `/login`.
