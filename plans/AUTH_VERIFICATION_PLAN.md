# Authentication System Verification Plan

## Overview
Comprehensive plan to verify and test the authentication system built on Supabase Auth.

## Current Implementation

### Services & Components
- **AuthContext** (`src/contexts/AuthContext.tsx`)
  - Manages global auth state (user, session, loading, error)
  - Provides methods: signIn, signUp, signOut, resetPassword, updatePassword, refreshSession, updateUserMetadata
  - Integrates with userService for full user data with metadata

- **UserService** (`src/services/settings/userService.ts`)
  - getCurrentUser(): Gets authenticated user with metadata
  - getUserById(userId): Fetches user from database view
  - updateUser(userId, updates): Updates user metadata via RPC
  - Maps between Supabase auth users and database users view

- **Login Component** (`src/features/auth/Login.tsx`)
  - Combined login/signup form
  - Password reset functionality
  - Basic validation (email format, password length, password match)

- **Database Migrations**
  - `20250930_003_rls_policies_auth.sql`: RLS policies for authenticated users
  - `20250930_004_user_metadata_setup.sql`: User metadata functions and triggers

### Database Functions
- `update_user_metadata(user_id, metadata)`: Updates user metadata (SECURITY DEFINER)
- `get_user_profile(user_id)`: Retrieves user profile with metadata
- `handle_new_user()`: Trigger to set default metadata on signup

## Verification Checklist

### 1. Authentication Flow Testing

#### Sign Up
- [ ] User can create account with email/password
- [ ] Email confirmation works (if enabled in Supabase)
- [ ] Auto-confirm works in development mode
- [ ] Default metadata is set correctly (contract_comp_level: 100, is_active: true)
- [ ] full_name defaults to email prefix
- [ ] User is redirected after successful signup
- [ ] Error handling for duplicate email
- [ ] Error handling for weak password
- [ ] Password confirmation validation works

#### Sign In
- [ ] User can sign in with correct credentials
- [ ] Error message shown for incorrect password
- [ ] Error message shown for non-existent user
- [ ] Session is created and stored
- [ ] User data is loaded from database
- [ ] User is redirected to dashboard
- [ ] "Remember me" functionality (if applicable)

#### Sign Out
- [ ] User can sign out successfully
- [ ] Session is cleared
- [ ] User state is reset
- [ ] User is redirected to login page
- [ ] No residual data in localStorage

#### Password Reset
- [ ] Reset password email is sent
- [ ] Reset link works and redirects correctly
- [ ] User can set new password
- [ ] User can sign in with new password
- [ ] Old password no longer works

### 2. Session Management

#### Session Persistence
- [ ] Session persists across page refreshes
- [ ] Session persists across browser tabs
- [ ] Session expires appropriately (check Supabase settings)
- [ ] Refresh token works correctly

#### Session State
- [ ] Loading state shows while checking session
- [ ] User redirected to login if session invalid
- [ ] User redirected to app if session valid
- [ ] Auth state listener updates UI on auth changes

### 3. User Profile & Metadata

#### Profile Data
- [ ] User metadata loads correctly on signin
- [ ] Profile displays correct email
- [ ] Profile displays correct name (or email prefix)
- [ ] Contract compensation level defaults to 100
- [ ] is_active defaults to true

#### Profile Updates
- [ ] updateUserMetadata works correctly
- [ ] Metadata updates reflect in UI
- [ ] Users can only update their own metadata
- [ ] Database function security is enforced

### 4. Row Level Security (RLS)

#### Policy Verification
- [ ] Unauthenticated users cannot access protected tables
- [ ] Authenticated users can access carriers
- [ ] Users can read their own commissions
- [ ] Users can read/write policies
- [ ] Users can read/write their own expenses
- [ ] Comp guide is readable by all authenticated users
- [ ] Constants are readable by all authenticated users

#### Security Testing
- [ ] Direct database queries respect RLS
- [ ] API calls respect RLS
- [ ] Users cannot access other users' private data
- [ ] Admin policies work correctly (if implemented)

### 5. Error Handling

#### Network Errors
- [ ] Offline mode handled gracefully
- [ ] Timeout errors display user-friendly messages
- [ ] Network reconnection triggers session check

#### Auth Errors
- [ ] Invalid credentials show clear error message
- [ ] Expired session handled gracefully
- [ ] Invalid reset token shows error
- [ ] Rate limiting errors handled

#### Validation Errors
- [ ] Client-side validation prevents bad requests
- [ ] Server-side validation errors are displayed
- [ ] Form validation is clear and helpful

### 6. Edge Cases

#### Email Edge Cases
- [ ] Email with + character works
- [ ] Email with dots works
- [ ] Case sensitivity handled correctly
- [ ] Whitespace trimmed from email

#### Password Edge Cases
- [ ] Unicode characters in password
- [ ] Special characters in password
- [ ] Very long passwords
- [ ] Minimum password length enforced

#### Session Edge Cases
- [ ] Multiple browser tabs sync state
- [ ] Signing out in one tab affects others
- [ ] Concurrent sign-in attempts
- [ ] Rapid sign-in/sign-out cycles

### 7. Performance

#### Load Times
- [ ] Initial auth check is fast (<500ms)
- [ ] Sign in completes quickly (<1s)
- [ ] Session refresh is transparent
- [ ] No unnecessary re-renders

#### Optimization
- [ ] Auth state doesn't cause unnecessary re-renders
- [ ] User data is cached appropriately
- [ ] Metadata updates are efficient

## Testing Strategy

### Manual Testing
1. **Happy Path Testing**
   - Sign up → confirm email → sign in → use app → sign out
   - Sign in → use app → refresh page → still signed in
   - Forgot password → receive email → reset → sign in

2. **Error Path Testing**
   - Try invalid credentials
   - Try duplicate signup
   - Try weak password
   - Try password reset with invalid email

3. **Edge Case Testing**
   - Test all edge cases from checklist
   - Test on different browsers
   - Test on mobile devices

### Automated Testing
1. **Unit Tests**
   - Test AuthContext methods
   - Test UserService methods
   - Test form validation logic

2. **Integration Tests**
   - Test sign up flow
   - Test sign in flow
   - Test password reset flow
   - Test session persistence

3. **E2E Tests**
   - Test complete user journey
   - Test multi-tab scenarios
   - Test network failure scenarios

## Issues Found

### Current Issues
1. **Login.tsx uses direct supabase client** instead of AuthContext methods
   - Should use signIn/signUp from context for consistency

2. **No loading states** in Login component during auth operations
   - Button shows "Loading..." but no spinner or disabled state

3. **Error messages** could be more specific
   - Generic "An error occurred" doesn't help users

4. **No redirect route handling**
   - Users always redirect to "/" after login
   - Should support redirect to intended page

5. **Form UI is basic**
   - Needs modern, polished design
   - Should use shadcn components consistently
   - Missing icons, better spacing, animations

6. **No email confirmation callback handler**
   - `/auth/callback` route not implemented

7. **No password reset page**
   - `/auth/reset-password` route not implemented

8. **Missing TypeScript types**
   - Input onChange type casting is awkward

9. **No "remember me" option**
   - All sessions are persistent by default

10. **users view not created**
    - userService.getUserById queries 'users' table/view
    - Need to verify if this view exists in database

## Recommended Fixes

### High Priority
1. Create users database view or table
2. Implement auth callback route for email confirmation
3. Implement password reset route
4. Refactor Login component to use AuthContext
5. Redesign login/signup UI with modern design

### Medium Priority
6. Add proper loading states and spinners
7. Improve error messages with specific guidance
8. Add redirect route handling
9. Add input validation feedback (show errors inline)

### Low Priority
10. Add "remember me" option
11. Add password strength meter
12. Add social login options (Google, etc.)
13. Add two-factor authentication

## Next Steps

1. ✅ Review current implementation
2. ✅ Document findings and issues
3. 🔄 Create improved login/signup UI
4. Create auth callback route
5. Create password reset route
6. Create users database view
7. Run through verification checklist
8. Fix identified issues
9. Add automated tests
10. Final verification and sign-off
