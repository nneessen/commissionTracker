# Email Verification Testing Checklist

## Critical Fix Applied

**Problem:** App.tsx was blocking all routes when user was not authenticated, preventing auth routes from rendering.

**Solution:** Modified App.tsx to check if the current path is a public route (login, auth/callback, auth/verify-email, auth/reset-password) and render those routes even without authentication.

## Testing Checklist

### 1. Signup Flow
- [ ] Open app in browser (http://localhost:5173)
- [ ] Should see Login screen (since no user)
- [ ] Click "Create a new account"
- [ ] Enter email: [your test email]
- [ ] Enter password: [test password]
- [ ] Enter confirm password: [same password]
- [ ] Click "Create account"
- [ ] **EXPECTED:** Navigate to `/auth/verify-email`
- [ ] **SHOULD SEE:**
  - "Check your email" heading
  - Your email address displayed
  - Email icon
  - "Resend verification email" button
  - Instructions to check inbox

### 2. Email Verification
- [ ] Check email inbox for verification email
- [ ] **EXPECTED:** Professional HTML email with CT branding
- [ ] **SHOULD CONTAIN:**
  - "Welcome to Commission Tracker!" heading
  - Your email address
  - "Verify Email Address" button
  - Security notice about 24hr expiration
  - Alternative text link

- [ ] Click "Verify Email Address" button
- [ ] **EXPECTED:** Redirect to `/auth/callback` with tokens in URL
- [ ] **SHOULD SEE:**
  - "Verifying Email" or "Success!" message
  - Brief loading state
  - Redirect to dashboard

- [ ] **VERIFY:**
  - User is logged in
  - Can see sidebar with user email
  - Can navigate to different pages
  - No errors in console

### 3. Resend Email Test
- [ ] Sign up with another email
- [ ] On verification screen, click "Resend verification email"
- [ ] **EXPECTED:**
  - Button shows "Sending..."
  - Success message appears
  - Button changes to "Resend in 60s"
  - Countdown timer works
  - Receive another email

- [ ] Click resend 2 more times (total 3)
- [ ] **EXPECTED:**
  - After 3rd attempt, button disabled
  - Shows "Maximum attempts reached"
  - Counter shows "3 of 3 resend attempts used"

### 4. Page Refresh Test
- [ ] Sign up with new email
- [ ] On verification screen, refresh page (F5)
- [ ] **EXPECTED:**
  - Email still displayed (from sessionStorage)
  - Page functions normally
  - Can still resend email

### 5. Back Button Test
- [ ] On verification screen, click "Back to login"
- [ ] **EXPECTED:**
  - Navigate to login page
  - sessionStorage cleared
  - Can sign in with verified account

### 6. Edge Cases

**Expired Token:**
- [ ] Get verification email
- [ ] Wait 24+ hours (or manually test with expired token)
- [ ] Click link
- [ ] **EXPECTED:**
  - Error message about expired link
  - Redirect to verification screen
  - Can resend email

**Already Verified:**
- [ ] Verify email successfully
- [ ] Click verification link again
- [ ] **EXPECTED:**
  - Message: "This email is already verified"
  - Redirect to login
  - Can log in normally

**Unverified Login Attempt:**
- [ ] Sign up but don't verify
- [ ] Try to log in with those credentials
- [ ] **EXPECTED:**
  - Error: "Please verify your email before signing in"
  - After 2 seconds, redirect to verification screen
  - Can resend verification email

### 7. Console Errors
- [ ] Open browser DevTools (F12)
- [ ] Go through entire signup → verify → login flow
- [ ] **VERIFY:** No console errors (warnings OK)
- [ ] Check Network tab for failed requests
- [ ] Check Application → Session Storage for keys

### 8. Mobile Responsive
- [ ] Open DevTools responsive mode
- [ ] Test on iPhone size (375x667)
- [ ] Test on iPad size (768x1024)
- [ ] **VERIFY:**
  - Verification screen looks good
  - Email displays properly
  - Buttons are tappable
  - Text is readable

### 9. Accessibility
- [ ] Use Tab key to navigate verification screen
- [ ] **VERIFY:**
  - Can reach all interactive elements
  - Focus indicator visible
  - Resend button has proper aria-label
  - Success/error alerts have ARIA live regions

### 10. Browser Compatibility
- [ ] Test in Chrome
- [ ] Test in Firefox
- [ ] Test in Safari (if Mac)
- [ ] **VERIFY:** All functionality works across browsers

## Common Issues & Solutions

### Issue: Not redirected to verification screen
**Symptom:** After signup, stay on login page
**Cause:** App.tsx not allowing public routes
**Solution:** Verify App.tsx has `isPublicPath` check

### Issue: Auth callback shows error
**Symptom:** Click email link → see error message
**Cause:** Token parsing or session setting issue
**Check:**
- Browser console for error details
- Network tab for Supabase API calls
- URL hash contains tokens

### Issue: Email not received
**Symptom:** No email arrives
**Cause:**
- Spam folder
- Supabase rate limits (3/hour on free tier)
- Email not configured in Supabase
**Solution:**
- Check spam
- Wait if hit rate limit
- Configure SMTP in Supabase

### Issue: Can navigate without logging in
**Symptom:** See app content without authentication
**Cause:** Session persisted from previous test
**Solution:**
- Clear browser data
- Use incognito/private window
- Check sessionStorage is cleared

## Success Criteria

✅ User signs up → sees verification screen
✅ User receives professional branded email
✅ User clicks email link → gets logged in
✅ Resend button works with cooldown
✅ Page refresh preserves state
✅ No console errors
✅ Mobile responsive
✅ Accessible with keyboard
✅ All edge cases handled gracefully

## Test Results

Date: ___________
Tester: ___________

- [ ] All tests passed
- [ ] Issues found (document below)

**Issues:**
1.
2.
3.

**Notes:**
