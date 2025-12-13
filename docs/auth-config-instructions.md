# Auth Configuration Instructions for The Standard HQ

## 1. Apply the User Profile Creation Migration

Go to the Supabase SQL Editor:
https://supabase.com/dashboard/project/pcyaqwodnyrpkaiojnpz/sql/new

Run this SQL to create the user profile trigger:

```sql
-- Drop existing trigger if exists (to avoid conflicts)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create user profile when a new auth user is created
  INSERT INTO public.user_profiles (
    id,
    email,
    full_name,
    roles,
    is_active,
    is_admin,
    is_deleted,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(
      ARRAY(SELECT jsonb_array_elements_text(NEW.raw_user_meta_data->'roles')),
      ARRAY['active_agent']::text[]
    ),
    true,
    COALESCE((NEW.raw_user_meta_data->>'is_admin')::boolean, false),
    false,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signups
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Fix any existing users without profiles (like nick.neessen@gmail.com)
INSERT INTO public.user_profiles (
  id,
  email,
  full_name,
  roles,
  is_active,
  is_admin,
  is_deleted,
  created_at,
  updated_at
)
SELECT
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', au.email),
  COALESCE(
    ARRAY(SELECT jsonb_array_elements_text(au.raw_user_meta_data->'roles')),
    ARRAY['active_agent']::text[]
  ),
  true,
  COALESCE((au.raw_user_meta_data->>'is_admin')::boolean, false),
  false,
  NOW(),
  NOW()
FROM auth.users au
LEFT JOIN public.user_profiles up ON au.id = up.id
WHERE up.id IS NULL
ON CONFLICT (id) DO NOTHING;
```

## 2. Configure Email Templates in Supabase Dashboard

Go to: https://supabase.com/dashboard/project/pcyaqwodnyrpkaiojnpz/auth/templates

### 2.1 Update the Confirmation Email Template

Click on "Confirm signup" and update:

**Subject:**
```
Welcome to The Standard HQ - Confirm Your Account
```

**Email Body:**
```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      text-align: center;
      border-radius: 10px 10px 0 0;
    }
    .content {
      background: white;
      padding: 30px;
      border: 1px solid #e5e7eb;
      border-radius: 0 0 10px 10px;
    }
    .button {
      display: inline-block;
      padding: 12px 30px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white !important;
      text-decoration: none;
      border-radius: 5px;
      margin: 20px 0;
      font-weight: bold;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      font-size: 12px;
      color: #6b7280;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>The Standard HQ</h1>
    <p>Your Complete Insurance Agency Management Platform</p>
  </div>
  <div class="content">
    <h2>Welcome to The Standard HQ!</h2>
    <p>Thank you for joining our platform. You're just one step away from accessing powerful tools to manage every aspect of your life insurance business.</p>

    <p>Please confirm your email address to activate your account:</p>

    <center>
      <a href="{{ .ConfirmationURL }}" class="button">Confirm Email Address</a>
    </center>

    <p><small>Or copy and paste this link in your browser:</small><br>
    <small>{{ .ConfirmationURL }}</small></p>

    <p>This link will expire in 24 hours for security reasons.</p>

    <p>If you didn't create an account with The Standard HQ, please ignore this email.</p>
  </div>
  <div class="footer">
    <p>© 2024 The Standard HQ. All rights reserved.</p>
    <p>Empowering agents and agencies in the life insurance industry.</p>
  </div>
</body>
</html>
```

### 2.2 Update Password Reset Email

Click on "Reset Password" and update:

**Subject:**
```
Reset Your Password - The Standard HQ
```

**Email Body:**
```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      text-align: center;
      border-radius: 10px 10px 0 0;
    }
    .content {
      background: white;
      padding: 30px;
      border: 1px solid #e5e7eb;
      border-radius: 0 0 10px 10px;
    }
    .button {
      display: inline-block;
      padding: 12px 30px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white !important;
      text-decoration: none;
      border-radius: 5px;
      margin: 20px 0;
      font-weight: bold;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      font-size: 12px;
      color: #6b7280;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>The Standard HQ</h1>
    <p>Password Reset Request</p>
  </div>
  <div class="content">
    <h2>Reset Your Password</h2>
    <p>We received a request to reset your password for your The Standard HQ account.</p>

    <p>Click the button below to create a new password:</p>

    <center>
      <a href="{{ .ConfirmationURL }}" class="button">Reset Password</a>
    </center>

    <p><small>Or copy and paste this link in your browser:</small><br>
    <small>{{ .ConfirmationURL }}</small></p>

    <p>This link will expire in 1 hour for security reasons.</p>

    <p>If you didn't request a password reset, you can safely ignore this email. Your password won't be changed.</p>
  </div>
  <div class="footer">
    <p>© 2024 The Standard HQ. All rights reserved.</p>
    <p>Empowering agents and agencies in the life insurance industry.</p>
  </div>
</body>
</html>
```

## 3. Configure Authentication Settings

Go to: https://supabase.com/dashboard/project/pcyaqwodnyrpkaiojnpz/auth/configuration

### 3.1 Email Auth Settings
- Ensure "Enable Email Signup" is ON
- Set "Confirm email" to REQUIRED (not "Confirm email (OTP)")
- Disable "Enable email link (passwordless/OTP)" - This is what causes magic links

### 3.2 URL Configuration
- Site URL: `https://your-vercel-app.vercel.app` (your production URL)
- Redirect URLs: Add your production and development URLs:
  - `https://your-vercel-app.vercel.app/auth/callback`
  - `http://localhost:5173/auth/callback`

## 4. Fix the AddRecruitDialog Component

The AddRecruitDialog is creating user_profiles directly without creating auth users. This needs to be fixed to properly use Supabase Auth.

Create a new file: `/src/services/recruiting/createAuthUser.ts`

```typescript
import { supabase } from '@/services/base/supabase';

export async function createAuthUserForRecruit(
  email: string,
  fullName: string,
  roles: string[],
  isAdmin: boolean = false
) {
  // Generate a random password for the new user
  const randomPassword = crypto.randomUUID();

  // Create auth user with metadata
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: randomPassword,
    email_confirm: false, // Will send confirmation email
    user_metadata: {
      full_name: fullName,
      roles: roles,
      is_admin: isAdmin,
    }
  });

  if (authError) {
    throw authError;
  }

  // Send password reset email so user can set their own password
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`,
  });

  return authData.user;
}
```

## 5. Update Login Page Branding

Update `/src/features/auth/Login.tsx` line 162:

```tsx
// Change from:
<div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-primary-foreground text-2xl font-bold mb-4 shadow-lg">
  CT
</div>

// To:
<div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-primary-foreground text-xl font-bold mb-4 shadow-lg">
  TSH
</div>
```

## 6. Testing the Fixed Flow

1. **Test existing user (nick.neessen@gmail.com)**:
   - After applying the migration, the user profile should be created
   - Try logging in - you should be able to access the app

2. **Test new user signup**:
   - When adding a new recruit, they should receive a confirmation email (not a magic link)
   - The email should be branded as "The Standard HQ"
   - After confirming, they can set their password

## Notes

- Magic links were being sent because "Enable email link (passwordless/OTP)" was enabled
- The 406 errors were because user_profiles weren't being created for auth users
- The trigger function ensures every auth user gets a profile automatically
- The Standard HQ branding replaces all "Commission Tracker" references