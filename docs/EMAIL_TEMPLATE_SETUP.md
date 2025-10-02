# Email Template Setup Guide

This guide explains how to configure the custom email verification template in Supabase.

## Overview

Commission Tracker uses a custom HTML email template for email verification that provides:
- Professional branding with CT logo
- Mobile-responsive design
- Clear call-to-action button
- Security information
- User-friendly messaging

## Prerequisites

- Access to your Supabase project dashboard
- Project owner or admin permissions

## Setup Instructions

### 1. Access Supabase Dashboard

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Authentication** in the left sidebar

### 2. Navigate to Email Templates

1. In the Authentication section, click on **Email Templates**
2. You'll see several template options:
   - Confirm signup
   - Invite user
   - Magic Link
   - Change Email Address
   - Reset Password

### 3. Update the "Confirm Signup" Template

1. Click on **Confirm signup** template
2. You'll see the template editor with these fields:
   - **Subject line**
   - **Message (HTML)**

#### Update the Subject Line

Replace with:
```
Verify your email - Welcome to Commission Tracker!
```

#### Update the HTML Template

1. Delete the existing template content
2. Copy the entire contents of `docs/email-templates/verify-email.html`
3. Paste into the **Message (HTML)** field

### 4. Available Template Variables

The template uses these Supabase variables:
- `{{ .ConfirmationURL }}` - The verification link with token
- `{{ .Email }}` - User's email address
- `{{ .Token }}` - Raw token (not recommended to use directly)
- `{{ .TokenHash }}` - Hashed token
- `{{ .SiteURL }}` - Your site URL from Supabase config

**Note:** These variables are automatically replaced by Supabase when sending emails.

### 5. Test the Template

Before going live, test the email:

1. Click **Save** in the template editor
2. Create a test account in your application
3. Check your inbox for the verification email
4. Verify:
   - Email renders correctly on desktop and mobile
   - All links work properly
   - Images and styles display correctly
   - Button redirects to correct callback URL

### 6. Configure Email Settings (if needed)

While in the Authentication section:

1. Go to **Settings** → **Auth**
2. Verify these settings:
   - **Enable email confirmations**: ON
   - **Confirm email**: Required for new signups
   - **Site URL**: Set to your production domain (e.g., `https://yourapp.com`)
   - **Redirect URLs**: Add your callback URLs
     - `http://localhost:5173/auth/callback` (development)
     - `https://yourapp.com/auth/callback` (production)

### 7. Email Provider Configuration

Supabase uses different email providers based on your plan:

#### Free Tier
- Uses Supabase's built-in SMTP
- Limited to 3 emails per hour per user
- Suitable for development only

#### Pro/Team Tier
- Configure custom SMTP provider recommended
- Go to **Project Settings** → **Auth** → **SMTP Settings**
- Recommended providers:
  - SendGrid
  - AWS SES
  - Mailgun
  - Postmark

## Troubleshooting

### Emails Not Sending

1. **Check Supabase Logs**
   - Go to **Logs** → **Auth Logs**
   - Look for email sending errors

2. **Verify Email Settings**
   - Ensure email confirmations are enabled
   - Check rate limits (free tier = 3/hour)
   - Verify SMTP configuration if using custom provider

3. **Check Spam Folder**
   - Test emails often land in spam initially
   - Configure SPF/DKIM records for custom domain

### Template Not Rendering Correctly

1. **Email Client Compatibility**
   - The template uses table-based layout for broad compatibility
   - Inline CSS ensures styles work across email clients
   - Test on multiple clients (Gmail, Outlook, Apple Mail)

2. **Variables Not Replacing**
   - Ensure you're using the exact variable syntax: `{{ .VariableName }}`
   - Variables are case-sensitive
   - Check for typos in variable names

### Links Not Working

1. **Verify Callback URL**
   - Must be added to **Redirect URLs** in Auth settings
   - Must include `/auth/callback` path
   - Protocol (http/https) must match exactly

2. **Check Site URL**
   - Set in **Auth** → **Settings** → **Site URL**
   - Should match your production domain

## Development vs Production

### Development
```
Site URL: http://localhost:5173
Redirect URL: http://localhost:5173/auth/callback
```

### Production
```
Site URL: https://yourapp.com
Redirect URL: https://yourapp.com/auth/callback
```

**Note:** You can have multiple redirect URLs configured simultaneously.

## Security Best Practices

1. **Token Expiration**
   - Verification links expire after 24 hours (Supabase default)
   - Cannot be changed in template - controlled by Supabase

2. **HTTPS Only in Production**
   - Always use HTTPS for production callback URLs
   - Tokens in URL are sensitive

3. **Email Validation**
   - Template includes security notice
   - Users told to ignore if they didn't sign up

## Customization

### Changing Colors

The template uses these primary colors:
- Primary Blue: `#2563eb`
- Primary Indigo: `#4f46e5`
- Success Green: `#10b981`
- Warning Yellow: `#f59e0b`

To customize, search and replace color values in the HTML.

### Changing Logo

Currently uses text-based logo ("CT"). To use an image:

1. Upload logo to a reliable CDN
2. Replace the logo `<div>` with:
```html
<img src="https://yourcdn.com/logo.png"
     alt="Commission Tracker"
     width="64"
     height="64"
     style="display: block; margin: 0 auto 20px;">
```

### Changing Content

Edit the HTML directly:
- Headings: `<h1>` and `<h2>` tags
- Body text: `<p>` tags
- Lists: `<ul>` and `<li>` tags

## Plain Text Fallback

Some email clients don't support HTML. Supabase automatically generates a plain text version, but you can customize it:

1. In the template editor, look for **Plain text** tab/toggle
2. Add a simple version:

```
Welcome to Commission Tracker!

We're excited to have you on board. Please verify your email address to get started.

Email: {{ .Email }}

Verify your email by clicking this link:
{{ .ConfirmationURL }}

This link will expire in 24 hours for your security.

If you didn't create an account, you can safely ignore this email.

Need help? Contact us at support@commissiontracker.com

© 2025 Commission Tracker
```

## Support

For issues with email templates:
- Check Supabase [Auth documentation](https://supabase.com/docs/guides/auth)
- Review [Email template guide](https://supabase.com/docs/guides/auth/auth-email-templates)
- Contact Supabase support for platform-specific issues

For application-specific email flow issues:
- See main `README.md` for email verification flow documentation
- Check component docs in `src/features/auth/EmailVerificationPending.tsx`
