# Email Service Consolidation - Updated 2025-12-20

## Summary
Consolidated all email functionality to use a single Resend-based Edge Function.
**Refactored 2025-12-20:** Now uses BaseRepository pattern with proper folder organization.

## Architecture

### Edge Function: `supabase/functions/send-email/index.ts`
- **Provider:** Resend API
- **Features:**
  - Accepts both `html`/`text` and `bodyHtml`/`bodyText` naming conventions
  - Stores sent emails in `user_emails` table
  - Supports `to`, `cc`, `replyTo` fields
  - Tracks `recruitId` and `senderId` for database linking
  - Falls back to simulation mode if `RESEND_API_KEY` not set

### Frontend Service: `src/services/email/`
- **UserEmailRepository.ts** - Extends BaseRepository for `user_emails` table
  - Standard CRUD operations inherited from BaseRepository
  - Custom methods: `findByUser()`, `findByRecruit()`, `findBySender()`, `findByStatus()`
  - Includes email attachments in queries
- **UserEmailService.ts** - Service layer using repository
  - `sendEmail(request)` - Send via Edge Function
  - `getEmailsForUser(userId)` - Get all emails for a user
  - `getEmailsForRecruit(recruitId)` - Get emails linked to a recruit
  - `htmlToText(html)` - Convert HTML to plain text
  - CRUD operations delegated to repository
- **types.ts** - Type definitions (UserEmailEntity, SendEmailRequest, SendEmailResponse)
- **index.ts** - Barrel exports + template service re-exports

### Import Path
All consumers should import from: `@/services/email`

### Components Updated
1. **CommunicationPanel** (`src/features/recruiting/components/CommunicationPanel.tsx`)
   - Recruits can email their recruiter (upline)
   - Fixed recipient (no selection needed)
   - Shows recruiter info clearly
   - Uses emailService.sendEmail()

2. **EmailManager** (`src/features/recruiting/components/EmailManager.tsx`)
   - Used by recruiters to email recruits
   - Uses DOMPurify for HTML sanitization
   - Uses shadcn Dialog for email view

3. **ComposeEmailDialog** - Uses existing hooks which call recruitingService.sendEmail()

## RLS Policies (user_emails)
- `user_emails_select_own` - Users see their own emails
- `user_emails_select_sent` - Senders see emails they sent
- `user_emails_select_recruiter` - Recruiters see recruit emails
- `user_emails_select_admin` - Admins see all
- Similar INSERT/UPDATE/DELETE policies

## Required Secrets
- `RESEND_API_KEY` - Resend API key for email delivery

## Deprecated
- `send-automated-email` Edge Function - Still exists but can be removed
- Gmail OAuth email sending - Removed from send-email function
