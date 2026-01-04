# Instagram DM Integration - Milestone 3 Review Continuation

**Generated:** 2026-01-03
**Purpose:** Review Phase 3 Data Layer Refactoring & Verify Alignment with Phases 1-2

---

## Task Context

Milestone 3 (Data Layer Refactoring) has just been completed. Before proceeding to Milestone 4 (Basic UI), we need to:
1. **Review** the newly created repository/service architecture
2. **Verify alignment** with Milestones 1 & 2 (database schema, edge functions, hooks)
3. **Identify any gaps** or inconsistencies that need to be addressed

---

## What Was Completed in Milestone 3

### Architecture Change
Refactored from flat object literal (`instagramService = {}`) to class-based architecture following BaseRepository/BaseService patterns.

### New Files Created (7 files)
```
src/services/instagram/
├── repositories/
│   ├── InstagramIntegrationRepository.ts    # OAuth + CRUD
│   ├── InstagramConversationRepository.ts   # Conversations + Priority
│   ├── InstagramMessageRepository.ts        # Message queries
│   ├── InstagramScheduledMessageRepository.ts # Scheduled CRUD
│   ├── InstagramTemplateRepository.ts       # Template CRUD
│   └── index.ts                             # Barrel exports
└── InstagramService.ts                      # Facade composing all repos
```

### Key Pattern: Facade Service
```typescript
class InstagramServiceClass {
  private integrationRepo: InstagramIntegrationRepository;
  private conversationRepo: InstagramConversationRepository;
  private messageRepo: InstagramMessageRepository;
  private scheduledMessageRepo: InstagramScheduledMessageRepository;
  private templateRepo: InstagramTemplateRepository;
  // Methods delegate to repositories
}
export const instagramService = new InstagramServiceClass();
```

---

## Review Checklist

### 1. Repository ↔ Database Alignment (Milestone 1)
Verify each repository maps correctly to database tables:

| Repository | DB Table | Key Fields to Verify |
|------------|----------|----------------------|
| `InstagramIntegrationRepository` | `instagram_integrations` | OAuth tokens, connection_status |
| `InstagramConversationRepository` | `instagram_conversations` | can_reply_until, is_priority |
| `InstagramMessageRepository` | `instagram_messages` | direction enum, sent_at |
| `InstagramScheduledMessageRepository` | `instagram_scheduled_messages` | status enum, scheduled_for |
| `InstagramTemplateRepository` | `instagram_message_templates` | use_count, is_active |

### 2. Type Alignment (Milestone 1)
Verify repository generic types match `src/types/instagram.types.ts`:
- `InstagramIntegration` / `InstagramIntegrationRow` / `InstagramIntegrationInsert`
- `InstagramConversation` / `InstagramConversationRow` / etc.
- Computed fields (isConnected, windowStatus, isPastDue) calculated correctly

### 3. Edge Function Alignment (Milestone 2)
Verify service methods that call edge functions:
- `initiateOAuth()` → calls `instagram-oauth-init` edge function
- OAuth callback flow handled by `instagram-oauth-callback` (not in service)
- Token refresh handled by `instagram-refresh-token` CRON (not in service)

### 4. Hook Alignment (Milestone 2)
Verify 18 existing hooks still work with refactored service:
```
src/hooks/instagram/useInstagramIntegration.ts
├── useInstagramIntegrations(imoId)           → instagramService.getIntegrations()
├── useInstagramIntegrationById(id)           → instagramService.getIntegrationById()
├── useActiveInstagramIntegration(userId)     → instagramService.getActiveIntegration()
├── useHasInstagramIntegration(userId)        → instagramService.hasActiveIntegration()
├── useConnectInstagram()                     → instagramService.initiateOAuth()
├── useDisconnectInstagram()                  → instagramService.disconnect()
├── useDeleteInstagramIntegration()           → instagramService.deleteIntegration()
├── useInstagramConversations(integrationId)  → instagramService.getConversations()
├── useInstagramConversation(conversationId)  → instagramService.getConversationById()
├── usePriorityInstagramConversations()       → instagramService.getConversations({isPriority})
├── useInstagramMessages(conversationId)      → instagramService.getMessages()
├── useSetInstagramPriority()                 → instagramService.setPriority()
├── useInstagramTemplates(imoId)              → instagramService.getTemplates()
├── useCreateInstagramTemplate()              → instagramService.createTemplate()
├── useUpdateInstagramTemplate()              → instagramService.updateTemplate()
├── useDeleteInstagramTemplate()              → instagramService.deleteTemplate()
├── useInstagramScheduledMessages(convId)     → instagramService.getScheduledMessages()
└── useCancelInstagramScheduledMessage()      → instagramService.cancelScheduledMessage()
```

### 5. Computed Field Transformations
Verify `transformFromDB()` in each repository correctly computes:

| Entity | Computed Fields |
|--------|-----------------|
| Integration | `isConnected`, `tokenExpiringSoon` |
| Conversation | `windowStatus`, `windowTimeRemaining`, `hasLinkedLead` |
| Message | `isOutbound`, `formattedSentAt` |
| ScheduledMessage | `isPastDue`, `isWindowExpired` |

---

## Files to Review

### Critical Files (Read These)
1. `src/services/instagram/InstagramService.ts` - Main facade
2. `src/services/instagram/repositories/InstagramIntegrationRepository.ts` - OAuth logic
3. `src/services/instagram/repositories/InstagramConversationRepository.ts` - Window status
4. `src/types/instagram.types.ts` - Type definitions & helper functions
5. `src/hooks/instagram/useInstagramIntegration.ts` - Verify hook → service mapping

### Reference Files (For Comparison)
1. `src/services/base/BaseRepository.ts` - Base class methods
2. `supabase/migrations/20260103_005_instagram_integrations.sql` - Integration table schema
3. `supabase/migrations/20260103_006_instagram_conversations_messages.sql` - Conversations schema
4. `supabase/functions/instagram-oauth-init/index.ts` - OAuth init logic

---

## Known Issues to Check

1. **Case-sensitivity on macOS** - `InstagramService.ts` vs `instagramService.ts` resolved by removing lowercase file
2. **Type casting** - Using `as unknown as Type` pattern for `transformFromDB()`
3. **Connection status enum** - Ensure "disconnected" is valid enum value

---

## Expected Outcome of Review

After review, confirm:
- [ ] All 5 repositories correctly extend BaseRepository
- [ ] Type generics match instagram.types.ts definitions
- [ ] Computed fields calculate same values as original service
- [ ] All 18 hooks still work without modification
- [ ] OAuth edge function integration unchanged
- [ ] `npm run build` passes with zero errors

---

## Copy This Prompt

```markdown
# Review Instagram DM Integration - Milestone 3

I just completed Milestone 3 (Data Layer Refactoring) for the Instagram DM integration. Before proceeding to Milestone 4 (Basic UI), I need you to:

## Primary Task
Review the newly created repository/service architecture and verify it aligns correctly with:
1. **Milestone 1** - Database schema (tables, enums, types)
2. **Milestone 2** - Edge functions and TanStack Query hooks

## What Changed
Refactored `instagramService` from flat object literal to class-based architecture:
- 5 repository classes extending BaseRepository
- 1 facade service (InstagramServiceClass) composing all repositories
- Singleton export pattern matching codebase conventions

## Key Files to Review
1. `src/services/instagram/InstagramService.ts` - Facade service
2. `src/services/instagram/repositories/*.ts` - 5 repository files
3. `src/types/instagram.types.ts` - Type definitions
4. `src/hooks/instagram/useInstagramIntegration.ts` - 18 hooks (should work unchanged)

## Review Checklist
1. Verify repository generics match type definitions
2. Verify `transformFromDB()` computes same fields as original
3. Verify facade methods delegate correctly to repositories
4. Verify hooks still call correct service methods
5. Run `npm run build` to confirm zero errors

## Relevant Plan File
Read: `plans/active/instagram-dm-integration.md` - Full implementation plan

## Relevant Memory
Read: `commission-tracker-architecture` - Base repository/service patterns

Please start by reading the plan file and the key files listed above, then provide your review findings.
```

---

## Notes

- Build passes with zero TypeScript errors
- All 18 existing hooks should work without modification (API unchanged)
- Next milestone (M4: Basic UI) is unblocked once review passes
