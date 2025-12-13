# Auth Email Fix - December 2024

## Problem Summary
The user creation flow was failing with these symptoms:
1. 403 "User not allowed" error when creating users
2. Users were created in the database but the UI showed an error
3. Confirmation emails were not being sent to new users
4. No way for new users to set their passwords and log in

## Root Cause Analysis
The issue was caused by attempting to use Supabase Admin API (`supabase.auth.admin.createUser()`) directly from the client-side browser code. The Admin API requires service role permissions which are not available in the browser (only anon key is available client-side).

## Solution Implemented

### 1. Created/Updated Edge Function for User Creation
- **File**: `/supabase/functions/create-auth-user/index.ts`
- Uses service role key to access admin API
- Implements proper error handling and fallback strategies
- First tries `inviteUserByEmail` which creates user and sends email in one step
- Falls back to creating user and sending password reset email if invite fails
- Returns clear status about whether email was sent successfully

### 2. Updated UserService to Use Edge Function
- **File**: `/src/services/users/userService.ts`
- Modified the `create()` method to call the Edge Function instead of using admin API directly
- Properly handles the response including checking if email was sent
- Provides appropriate error messages to the UI

### 3. Deployed Edge Function
```bash
npx supabase functions deploy create-auth-user
```

## Required Supabase Dashboard Configuration

### Critical Email Settings
Go to: https://supabase.com/dashboard/project/pcyaqwodnyrpkaiojnpz/auth/configuration

1. **Email Auth Settings**:
   - ✅ Enable Email Signup: **ON**
   - ✅ Confirm email: **Required** (NOT "Confirm email (OTP)")
   - ❌ Enable email link (passwordless/OTP): **OFF** (This causes magic links instead of confirmation emails!)

2. **SMTP Configuration**:
   - Go to: https://supabase.com/dashboard/project/pcyaqwodnyrpkaiojnpz/settings/smtp
   - Configure SMTP settings for sending emails
   - Options:
     - Use Supabase's built-in email service (limited to 3 emails/hour on free tier)
     - Configure custom SMTP (Gmail, SendGrid, AWS SES, etc.)

3. **Email Templates**:
   - Go to: https://supabase.com/dashboard/project/pcyaqwodnyrpkaiojnpz/auth/templates
   - Update "Confirm signup" template
   - Update "Invite user" template
   - Update "Reset password" template

### URL Configuration
- **Site URL**: Your production URL
- **Redirect URLs**: Add both production and development:
  - `https://your-production-url.vercel.app/auth/callback`
  - `http://localhost:5173/auth/callback`

## Testing the Fix

### Test User Creation:
1. Go to Admin Control Center
2. Click "Add User"
3. Fill in user details
4. Submit

### Expected Result:
- User profile created in database
- Auth user created in Supabase Auth
- Confirmation email sent to user
- Success message shows "User created! Confirmation email sent to [email]"

### If Email Still Not Sending:
1. Check Supabase dashboard logs for the Edge Function
2. Verify SMTP is configured in Supabase
3. Check spam folder for the emails
4. Try the password reset flow as a fallback

## Email Flow Options

### Option 1: Invite User by Email (Preferred)
- Creates user and sends invite in one API call
- User receives email to confirm account and set password
- Most reliable if SMTP is configured

### Option 2: Create User + Password Reset (Fallback)
- Creates user without confirmation
- Sends password reset email as confirmation
- User sets password through reset flow

## Monitoring and Debugging

### Check Edge Function Logs:
```bash
npx supabase functions logs create-auth-user --tail
```

### Check Supabase Dashboard:
- Function logs: https://supabase.com/dashboard/project/pcyaqwodnyrpkaiojnpz/functions/create-auth-user/logs
- Auth logs: https://supabase.com/dashboard/project/pcyaqwodnyrpkaiojnpz/auth/users

## Files Modified
1. `/supabase/functions/create-auth-user/index.ts` - Edge function for user creation
2. `/src/services/users/userService.ts` - Updated to use Edge Function
3. `/docs/auth-email-fix-december-2024.md` - This documentation

## Deployment Checklist
- [x] Update Edge Function code
- [x] Deploy Edge Function to Supabase
- [x] Update userService to use Edge Function
- [x] Test TypeScript compilation
- [x] Test production build
- [ ] Configure SMTP in Supabase Dashboard
- [ ] Update Email Templates in Supabase Dashboard
- [ ] Disable "Enable email link (passwordless/OTP)" in Supabase
- [ ] Test user creation flow end-to-end