# Refactor emailService: Delete Duplicate & Inherit from Base Classes

## 1. Summary

**Problem Identified:** Two email service files exist, created on the same day (Dec 16, 2025):

| File | Edge Function | Status |
|------|--------------|--------|
| `src/services/emailService.ts` (root, 137 lines) | `send-email` | **CORRECT** - per memory file |
| `src/services/email/emailService.ts` (folder, 381 lines) | `send-automated-email` | **DEPRECATED** - should be deleted |

**Root Cause:** Morning automated checkpoint created the folder version. Evening developer correctly created root version using new edge function. Nobody cleaned up the old file.

**Bug Found:** `recruitingService.ts` imports from the deprecated folder version, calling the wrong edge function.

---

## 2. Current State Analysis

### Correct File: `src/services/emailService.ts` (ROOT)

**Consumers (4 files):**
- `src/features/recruiting/hooks/useRecruitEmails.ts` → `sendEmail`, `getEmailsForRecruit`
- `src/features/recruiting/components/CommunicationPanel.tsx` → `sendEmail`, `getEmailsForUser`
- `src/features/recruiting/components/ComposeEmailDialog.tsx` → type imports
- `src/features/email/components/EmailComposer.tsx` → type imports

**Methods:**
- `sendEmail(request)` - Uses correct `send-email` edge function
- `getEmailsForUser(userId)` - SELECT with joins
- `getEmailsForRecruit(recruitId)` - SELECT with filter
- `getEmailById(emailId)` - SELECT by ID
- `htmlToText(html)` - Utility

### Deprecated File: `src/services/email/emailService.ts` (FOLDER)

**Consumers (1 file):**
- `src/services/recruiting/recruitingService.ts` → `sendEmail` (BROKEN!)

**Extra methods (UNUSED DEAD CODE):**
- `sendTemplatedEmail` - Not called anywhere
- `sendBulkEmail` - Not called anywhere
- `queueEmail` - Not called anywhere
- `getUsageStats` - Not called anywhere
- `canSendEmail` - Not called anywhere
- `incrementUsage` - Not called anywhere
- `getEmailHistory` - Not called anywhere
- `recordEmailHistory` - Not called anywhere

---

## 3. Implementation Plan

### Phase 1: Delete Deprecated File & Fix Bug

**Step 1.1:** Update `src/services/email/index.ts` to re-export from root file

```typescript
// src/services/email/index.ts
// Email Service - Re-exports from unified service

export {
  emailService,
  type SendEmailRequest,
  type SendEmailResponse,
} from "../emailService";

// Re-export template service from features
export {
  getEmailTemplates,
  getEmailTemplate,
  createEmailTemplate,
  updateEmailTemplate,
  deleteEmailTemplate,
  duplicateEmailTemplate,
  toggleTemplateActive,
  getUserTemplateStatus,
  getGroupedEmailTemplates,
} from "@/features/email/services/emailTemplateService";
```

**Step 1.2:** Delete deprecated file
```
DELETE: src/services/email/emailService.ts
```

**Step 1.3:** Verify build passes
```bash
npm run build
```

### Phase 2: Move Root File to Proper Location

**Step 2.1:** Create new properly-structured files:

```
src/services/email/
├── index.ts                 # Barrel exports
├── types.ts                 # Type definitions
├── UserEmailRepository.ts   # Extends BaseRepository
├── UserEmailService.ts      # Extends BaseService
```

**Step 2.2:** Create `src/services/email/types.ts`

```typescript
import type { Database } from "@/types/database.types";
import type { UserEmail } from "@/types/recruiting.types";

export { UserEmail };

// Re-export existing types for backward compatibility
export interface SendEmailRequest {
  to: string[];
  cc?: string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  recruitId?: string;
  senderId?: string;
  metadata?: Record<string, unknown>;
}

export interface SendEmailResponse {
  success: boolean;
  emailId?: string;
  resendMessageId?: string;
  error?: string;
}

// Base class types
export interface CreateUserEmailData {
  userId: string;
  senderId?: string;
  subject: string;
  bodyHtml?: string;
  bodyText?: string;
  status?: string;
  toAddresses?: string[];
  metadata?: Record<string, unknown>;
}

export interface UpdateUserEmailData {
  status?: string;
  sentAt?: string;
  deliveredAt?: string;
  openedAt?: string;
  failedReason?: string;
}
```

**Step 2.3:** Create `src/services/email/UserEmailRepository.ts`

```typescript
import { BaseRepository } from "../base/BaseRepository";
import type { UserEmail, CreateUserEmailData, UpdateUserEmailData } from "./types";

export class UserEmailRepository extends BaseRepository<
  UserEmail,
  CreateUserEmailData,
  UpdateUserEmailData
> {
  constructor() {
    super("user_emails");
  }

  protected transformFromDB(dbRecord: Record<string, unknown>): UserEmail {
    return {
      id: dbRecord.id as string,
      user_id: dbRecord.user_id as string,
      sender_id: dbRecord.sender_id as string | null,
      subject: dbRecord.subject as string,
      body_html: dbRecord.body_html as string | null,
      body_text: dbRecord.body_text as string | null,
      status: dbRecord.status as string,
      sent_at: dbRecord.sent_at as string | null,
      delivered_at: dbRecord.delivered_at as string | null,
      opened_at: dbRecord.opened_at as string | null,
      failed_reason: dbRecord.failed_reason as string | null,
      metadata: dbRecord.metadata as Record<string, unknown> | null,
      created_at: dbRecord.created_at as string,
      updated_at: dbRecord.updated_at as string,
      attachments: [],
    };
  }

  protected transformToDB(
    data: CreateUserEmailData | UpdateUserEmailData
  ): Record<string, unknown> {
    const dbData: Record<string, unknown> = {};
    if ('userId' in data && data.userId !== undefined) dbData.user_id = data.userId;
    if ('senderId' in data && data.senderId !== undefined) dbData.sender_id = data.senderId;
    if ('subject' in data && data.subject !== undefined) dbData.subject = data.subject;
    if ('bodyHtml' in data && data.bodyHtml !== undefined) dbData.body_html = data.bodyHtml;
    if ('bodyText' in data && data.bodyText !== undefined) dbData.body_text = data.bodyText;
    if ('status' in data && data.status !== undefined) dbData.status = data.status;
    if ('toAddresses' in data && data.toAddresses !== undefined) dbData.to_addresses = data.toAddresses;
    if ('sentAt' in data && data.sentAt !== undefined) dbData.sent_at = data.sentAt;
    if ('deliveredAt' in data && data.deliveredAt !== undefined) dbData.delivered_at = data.deliveredAt;
    if ('openedAt' in data && data.openedAt !== undefined) dbData.opened_at = data.openedAt;
    if ('failedReason' in data && data.failedReason !== undefined) dbData.failed_reason = data.failedReason;
    if ('metadata' in data && data.metadata !== undefined) dbData.metadata = data.metadata;
    return dbData;
  }

  // Domain-specific methods

  async findByUser(userId: string): Promise<UserEmail[]> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select(`*, attachments:user_email_attachments(*)`)
        .or(`user_id.eq.${userId},sender_id.eq.${userId}`)
        .order("created_at", { ascending: false });

      if (error) throw this.handleError(error, "findByUser");
      return data?.map((item) => this.transformFromDB(item)) || [];
    } catch (error) {
      throw this.wrapError(error, "findByUser");
    }
  }

  async findByRecruit(recruitId: string): Promise<UserEmail[]> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select(`*, attachments:user_email_attachments(*)`)
        .eq("user_id", recruitId)
        .order("created_at", { ascending: false });

      if (error) throw this.handleError(error, "findByRecruit");
      return data?.map((item) => this.transformFromDB(item)) || [];
    } catch (error) {
      throw this.wrapError(error, "findByRecruit");
    }
  }

  override async findById(id: string): Promise<UserEmail | null> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select(`*, attachments:user_email_attachments(*)`)
        .eq("id", id)
        .single();

      if (error) {
        if (error.code === "PGRST116") return null;
        throw this.handleError(error, "findById");
      }
      return data ? this.transformFromDB(data) : null;
    } catch (error) {
      throw this.wrapError(error, "findById");
    }
  }
}
```

**Step 2.4:** Create `src/services/email/UserEmailService.ts`

```typescript
import { supabase } from "../base/supabase";
import { UserEmailRepository } from "./UserEmailRepository";
import type { UserEmail, SendEmailRequest, SendEmailResponse } from "./types";

class UserEmailService {
  private repository: UserEmailRepository;

  constructor() {
    this.repository = new UserEmailRepository();
  }

  // Delegate CRUD to repository
  async getById(id: string): Promise<UserEmail | null> {
    return this.repository.findById(id);
  }

  async getEmailsForUser(userId: string): Promise<UserEmail[]> {
    return this.repository.findByUser(userId);
  }

  async getEmailsForRecruit(recruitId: string): Promise<UserEmail[]> {
    return this.repository.findByRecruit(recruitId);
  }

  // Send email via edge function (special operation, not CRUD)
  async sendEmail(request: SendEmailRequest): Promise<SendEmailResponse> {
    const { data, error } = await supabase.functions.invoke("send-email", {
      body: request,
    });

    if (error) {
      console.error("Email service error:", error);
      throw new Error(error.message || "Failed to send email");
    }

    return data as SendEmailResponse;
  }

  // Utility
  htmlToText(html: string): string {
    return html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .trim();
  }
}

// Singleton for backward compatibility
export const emailService = new UserEmailService();
export { UserEmailService };
```

**Step 2.5:** Update `src/services/email/index.ts`

```typescript
// src/services/email/index.ts
export { emailService, UserEmailService } from "./UserEmailService";
export { UserEmailRepository } from "./UserEmailRepository";
export * from "./types";

// Re-export template service
export {
  getEmailTemplates,
  getEmailTemplate,
  createEmailTemplate,
  updateEmailTemplate,
  deleteEmailTemplate,
  duplicateEmailTemplate,
  toggleTemplateActive,
  getUserTemplateStatus,
  getGroupedEmailTemplates,
} from "@/features/email/services/emailTemplateService";
```

### Phase 3: Update Consumer Imports

**Step 3.1:** Update imports in consumer files

| File | Current Import | New Import |
|------|---------------|------------|
| `useRecruitEmails.ts` | `@/services/emailService` | `@/services/email` |
| `CommunicationPanel.tsx` | `@/services/emailService` | `@/services/email` |
| `ComposeEmailDialog.tsx` | `@/services/emailService` | `@/services/email` |
| `EmailComposer.tsx` | `@/services/emailService` | `@/services/email` |
| `recruitingService.ts` | `@/services/email` | No change needed |

### Phase 4: Delete Old Root File

```
DELETE: src/services/emailService.ts
```

### Phase 5: Verification

```bash
npm run build     # Must pass with zero errors
npm run test:run  # All tests must pass
```

---

## 4. Files Changed Summary

| Action | File Path |
|--------|-----------|
| DELETE | `src/services/email/emailService.ts` (deprecated) |
| CREATE | `src/services/email/types.ts` |
| CREATE | `src/services/email/UserEmailRepository.ts` |
| CREATE | `src/services/email/UserEmailService.ts` |
| MODIFY | `src/services/email/index.ts` |
| MODIFY | `src/features/recruiting/hooks/useRecruitEmails.ts` |
| MODIFY | `src/features/recruiting/components/CommunicationPanel.tsx` |
| MODIFY | `src/features/recruiting/components/ComposeEmailDialog.tsx` |
| MODIFY | `src/features/email/components/EmailComposer.tsx` |
| DELETE | `src/services/emailService.ts` (moved to folder) |

---

## 5. Test Plan

### Unit Tests
- [ ] `UserEmailRepository.findById` returns email with attachments
- [ ] `UserEmailRepository.findByUser` returns emails for user as sender or recipient
- [ ] `UserEmailRepository.findByRecruit` returns only recruit's emails
- [ ] `UserEmailService.sendEmail` invokes correct edge function
- [ ] `UserEmailService.htmlToText` strips HTML correctly

### Integration Tests
- [ ] CommunicationPanel loads and displays emails
- [ ] ComposeEmailDialog sends email successfully
- [ ] useRecruitEmails hook returns correct data

### Build Verification
- [ ] `npm run build` passes with zero TypeScript errors
- [ ] `npm run test:run` passes

---

## 6. Validation Checklist

- [ ] No duplicate email service files exist
- [ ] All consumers import from `@/services/email`
- [ ] `sendEmail` uses correct `send-email` edge function
- [ ] BaseRepository inheritance provides standard CRUD
- [ ] Deprecated `send-automated-email` edge function no longer called
- [ ] Memory file `.serena/memories/email_service_consolidated.md` updated if needed

---

## 7. Risk Assessment

**Low Risk:**
- Clear pattern from CommissionRepository to follow
- Only 5 consumer files to update
- All changes are in email domain only

**Mitigation:**
- Phase 1 fixes the bug immediately (correct edge function)
- Phase 2-4 are refactoring with no behavior change
- Build verification at each phase
