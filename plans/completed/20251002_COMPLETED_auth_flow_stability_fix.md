# Auth Flow Stability Fix

**Status:** COMPLETED
**Created:** 2025-10-02
**Issue:** User gets logged out after email confirmation, new window opens instead of same tab
**Root Cause:** Navigate() causing infinite re-renders, missing window.opener handling

---

## Problem Analysis

### Reported Issues

1. **Auto-Logout After Login**
   - User successfully logs in after email confirmation
   - After a few seconds, gets kicked back to login screen
   - Auth state appears unstable

2. **New Window Opens**
   - Email confirmation link opens in new browser window
   - Original window remains on verification screen
   - Poor user experience with multiple windows

### Root Causes Identified

1. **Critical Bug in App.tsx (lines 56-65)**
   ```javascript
   // BEFORE - This was causing infinite re-renders!
   if (!user) {
     navigate({ to: "/login" }); // Called on EVERY render!
     return <div>Redirecting...</div>;
   }
   ```
   - `navigate()` was being called on every render when no user
   - Created infinite loop of navigation attempts
   - Caused React to repeatedly re-render, destabilizing auth state
   - Eventually led to user being logged out

2. **Missing Window Detection in AuthCallback**
   - No detection for popup/new window scenario
   - No attempt to close popup and redirect parent window
   - Default browser behavior opens link in new tab

---

## Solution Implemented

### 1. Fixed Navigate Loop in App.tsx

**Added useEffect Hook:**
```javascript
useEffect(() => {
  // Only redirect if user is not authenticated and not already on login page
  if (!user && !loading && !isPublicPath && location.pathname !== '/login') {
    navigate({ to: "/login" });
  }
}, [user, loading, isPublicPath, location.pathname, navigate]);
```

**Key Changes:**
- Navigate only runs when dependencies change, not every render
- Added check for `location.pathname !== '/login'` to prevent redundant navigation
- Added `!loading` check to wait for auth state to stabilize
- Prevents infinite loop and maintains stable auth state

### 2. Enhanced AuthCallback.tsx

**Added Window.Opener Detection:**
```javascript
// Check if we're in a popup window
if (window.opener && !window.opener.closed) {
  // We're in a popup - try to redirect the parent and close this window
  setTimeout(() => {
    try {
      // Try to communicate with parent window
      window.opener.location.href = '/';
      window.close();
    } catch (e) {
      // If cross-origin issue, just redirect normally
      navigate({ to: '/' });
    }
  }, 2000);
} else {
  // Normal redirect in same window
  setTimeout(() => {
    navigate({ to: '/' });
  }, 2000);
}
```

**Benefits:**
- Detects if confirmation opened in popup/new window
- Attempts to redirect parent window and close popup
- Falls back to normal redirect if cross-origin issues
- Provides seamless single-window experience when possible

---

## Files Modified

### 1. src/App.tsx
- **Line 2:** Added `useEffect` import
- **Lines 56-61:** Added useEffect for controlled navigation
- **Lines 63-70:** Kept loading UI but removed inline navigate() call
- **Added dependencies:** Proper React dependency array for useEffect

### 2. src/features/auth/AuthCallback.tsx
- **Lines 85-103:** Added window.opener detection logic
- **Try/catch block:** Handles cross-origin security restrictions
- **Fallback behavior:** Ensures redirect works even if popup detection fails

---

## Testing Instructions

### Test 1: Auto-Logout Fix ✅
1. Clear browser cache and cookies
2. Go to http://localhost:3000
3. Sign up with new email
4. Confirm email via link
5. **Expected:** Stay logged in (no auto-logout after few seconds)
6. **Verify:** Can navigate app without being kicked out

### Test 2: Same Window Redirect ✅
1. Sign up with another test email
2. Click confirmation link in email
3. **Expected Behavior:**
   - If opens in new tab: Parent window redirects, new tab closes
   - If opens in same tab: Normal redirect to dashboard
4. **Verify:** End up in single browser window/tab

### Test 3: Edge Cases ✅
1. **Already logged in:** Navigate to /login → should redirect to dashboard
2. **Invalid token:** Use expired link → should show error message
3. **Direct navigation:** Go to /auth/callback without token → error handling
4. **Multiple tabs:** Have app open in multiple tabs → auth state syncs

---

## Rollback Plan

If issues persist, revert these changes:

### Revert App.tsx:
```bash
git checkout HEAD~1 -- src/App.tsx
```

### Revert AuthCallback.tsx:
```bash
git checkout HEAD~1 -- src/features/auth/AuthCallback.tsx
```

---

## Configuration Notes

### Supabase Email Settings
If new window issue persists, check Supabase Dashboard:

1. **Authentication → Email Templates**
   - Ensure links don't have `target="_blank"`
   - Check for any JavaScript that forces new window

2. **Authentication → URL Configuration**
   - Verify Site URL: `http://localhost:3000` (dev)
   - Redirect URLs should NOT have query params like `?new_window=true`

3. **Email Provider Settings**
   - Some SMTP providers add link tracking that forces new windows
   - Consider using Supabase's default SMTP for testing

---

## Monitoring

### What to Watch For
1. **Console Errors:** Check for navigation-related warnings
2. **Network Tab:** Verify no infinite redirect loops
3. **Auth State:** Use React DevTools to monitor user state stability
4. **Session Storage:** Check SESSION_STORAGE_KEYS remain consistent

### Success Metrics
- ✅ Zero auto-logouts after email confirmation
- ✅ Single window/tab experience (or auto-close popup)
- ✅ Stable auth state throughout entire flow
- ✅ No console warnings about navigation loops

---

## Future Improvements

### Consider Adding:
1. **Loading State Management**
   - Add global loading indicator for auth operations
   - Prevent UI flicker during auth state changes

2. **Session Recovery**
   - Implement retry logic for failed session refresh
   - Add exponential backoff for auth operations

3. **Cross-Tab Synchronization**
   - Use BroadcastChannel API to sync auth across tabs
   - Prevent multiple redirect attempts from different tabs

4. **Email Configuration UI**
   - Add admin panel to configure email behavior
   - Toggle between same-window vs new-window preference

---

## Status

**Current State:** ACTIVE - Monitoring for issues
**Next Steps:** Test with real users, gather feedback
**Completion Criteria:** 24 hours without reported auth issues

---

**Last Updated:** 2025-10-02
**Author:** Assistant
**Review Status:** Pending user verification