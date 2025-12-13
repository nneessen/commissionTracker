# Email Templates - The Standard

Professional, minimalist email templates for The Standard insurance agency management platform.

## Design Philosophy

- **Professional**: Clean, business-appropriate design
- **Minimalist**: No gradients, rounded corners, or decorative elements
- **Data-Dense**: Compact layout with minimal padding
- **Consistent**: Unified branding across all templates
- **Accessible**: Works across all email clients

## Available Templates

### 1. Account Verification (`verify-email.html`)
- Sent when a new user account is created
- Contains password setup link
- Used for initial account activation

### 2. Password Reset (`reset-password.html`)
- Sent when user requests password reset
- Contains secure reset link
- Expires in 1 hour for security

### 3. Email Change Confirmation (`email-change.html`)
- Sent when user requests email address change
- Shows both old and new email addresses
- Requires confirmation to complete change

### 4. User Invitation (`invite-user.html`)
- Sent when admin invites new user to platform
- Contains invitation acceptance link
- Shows who invited the user
- Expires in 7 days

### 5. Reauthentication (`reauthentication.html`)
- Sent for sensitive operations requiring identity verification
- Shows IP address and request time
- Expires in 10 minutes for security

### 6. Magic Link (`magic-link.html`)
- Passwordless sign-in option (rarely used)
- One-time use link
- Expires in 1 hour

## Template Structure

All templates follow the same structure:

```
┌─────────────────────────────────────┐
│ THE STANDARD          [Template Type]│ ← Header with text logo
├─────────────────────────────────────┤
│                                     │
│ Main Heading                        │ ← Clear, concise title
│ Description text                    │ ← Brief explanation
│                                     │
│ ┌───────────────────────────────┐   │
│ │ Account Details               │   │ ← Gray info box
│ │ Email: user@example.com       │   │
│ └───────────────────────────────┘   │
│                                     │
│ [Action Button]                     │ ← Black CTA button
│                                     │
│ Fallback URL                        │ ← Copy/paste option
│                                     │
│ Security/Important Information      │ ← Notices and warnings
│                                     │
├─────────────────────────────────────┤
│ © 2025 The Standard                 │ ← Minimal footer
└─────────────────────────────────────┘
```

## Color Palette

- **Text**: #111827 (primary), #4b5563 (secondary), #6b7280 (muted)
- **Background**: #ffffff (white), #f9fafb (light gray)
- **Borders**: #e5e7eb
- **Button**: #111827 (black)
- **Warnings**: #991b1b (red text), #fef2f2 (red background)
- **Info**: #78350f (yellow text), #fffbeb (yellow background)

## Typography

- **Font Family**: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif
- **Base Size**: 14px
- **Small Text**: 12px
- **Footer**: 11px
- **Headings**: 18px (h1), 20px (logo text)

## Implementation in Supabase

To use these templates in Supabase:

1. Go to Authentication > Email Templates in Supabase Dashboard
2. Select the appropriate template type
3. Copy the HTML from the corresponding file
4. Paste into the template editor
5. Save changes

## Template Variables

Supabase provides these variables for templates:

- `{{ .Email }}` - User's email address
- `{{ .ConfirmationURL }}` - Action link URL
- `{{ .Token }}` - Verification token (if needed)
- `{{ .TokenHash }}` - Hashed token (if needed)
- `{{ .SiteURL }}` - Your application URL
- `{{ .RedirectTo }}` - Redirect URL after action

## Testing

Always test templates by:
1. Creating test accounts
2. Triggering each email type
3. Verifying rendering in different email clients
4. Checking mobile responsiveness
5. Confirming all links work correctly

## Maintenance

- Keep branding consistent across all templates
- Update copyright year annually
- Test after any Supabase updates
- Ensure support email is monitored