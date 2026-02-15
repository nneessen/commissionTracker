# Forum + FAQ Phase 1 Implementation Spec (Builder Mode Compliant)

## 1. Problem Restatement

Goal: add a new `/community` page that provides IMO-scoped forum discussions plus a curated FAQ system, with secure moderation and strong performance.

Constraints:

- Existing stack: React 19 + TanStack Router/Query + Supabase/Postgres.
- Authorization must be RLS-first; frontend authorization is UX only.
- Tenant isolation must be enforced at DB layer (`imo_id` + RLS helper patterns).
- Must be production-safe for existing data, reversible, and migration-based.

Known overlaps and design decision:

- Existing `messages` feature is 1:1/channel communication, not community discourse.
- Reuse: auth, permission system, route guard, query/client conventions, moderation UX patterns.
- New domain required: forum/faq tables and RPCs (do not overload `message_threads/messages`).

Unknowns/gaps that must be confirmed before coding:

- Exact moderator role policy: whether `trainer` should moderate or only `admin`.
- Recruit access policy: should approved recruits read-only or read/write.
- Final rich-text policy: markdown-only renderer and exact allowlist implementation.
- Gold-standard RLS template for community-like UGC tables in this repo (none currently identical).

## 2. High-Level Architecture

Frontend responsibilities:

- Route and page composition for `/community`.
- UI state for tabs (`Discussions`, `FAQ`, `My Activity`, `Moderation`).
- TanStack Query hooks with canonical keys and narrow invalidation.
- Loading/error/empty states for all data surfaces.

Backend responsibilities:

- New tenant-scoped forum/faq schema.
- RLS policies for read/write/moderation ownership.
- RPCs for hot read paths and transactional writes.
- Validation and sanitization for all user-generated content.

Data ownership:

- Source of truth: PostgreSQL tables in `supabase/migrations/**`.
- Auth identity: `auth.uid()`.
- Tenant scope: `imo_id` and `get_my_imo_id()`.

Auth boundaries:

- DB/RLS enforces access by tenant and role.
- RPCs enforce business constraints (locked topic, accepted answer ownership, moderation privileges).
- Frontend `RouteGuard` is presentation-layer gating only.

Trust model:

- Client input is untrusted.
- User content is stored as markdown/plain text and rendered through strict sanitizer/allowlist.
- No direct frontend filtering for tenant isolation.

## 3. Data Model & Schema Changes

Tables:

- `forum_categories`
- `forum_topics`
- `forum_posts`
- `forum_topic_follows`
- `forum_post_votes`
- `forum_reports`
- `faq_articles`

Columns and relationships (summary):

- All tenant tables include `imo_id uuid not null`.
- Topic/post authors use `author_id -> user_profiles(id)`.
- Topic belongs to category; post belongs to topic.
- FAQ article may reference source topic (`source_topic_id`).
- Follow/vote tables are many-to-many by user and topic/post.

Indexes (minimum):

- Required tenant composite indexes on all tables: `(imo_id, id)`.
- Feed indexes:
  - `forum_topics(imo_id, category_id, last_activity_at desc, id desc)`
  - `forum_topics(imo_id, status, last_activity_at desc, id desc)`
  - `forum_posts(imo_id, topic_id, created_at asc, id asc)`
- Search indexes:
  - `GIN(search_tsv)` on topics/posts/faq.

RLS policies:

- Baseline selector: `imo_id = get_my_imo_id()`.
- `forum_categories`: read IMO-wide; write moderator/admin.
- `forum_topics`: read IMO-wide (deleted hidden unless moderator); create own; edit own; moderate by role.
- `forum_posts`: read IMO-wide (deleted hidden unless moderator); create own; edit own; moderate by role.
- `forum_topic_follows`: users manage only own rows.
- `forum_post_votes`: users manage only own rows.
- `forum_reports`: create by any IMO user; read/update by moderation roles.
- `faq_articles`: published readable IMO-wide; drafts writable/readable by moderation roles.

Migration strategy:

- Migration 1: schema + indexes + constraints + helper triggers.
- Migration 2: RLS enablement + policies.
- Migration 3: RPC read/write contracts.
- Migration 4: permission rows + role mappings (`nav.community` + community perms).

Backward compatibility notes:

- All schema additions are additive (no destructive change in phase 1).
- No existing route/table contract is replaced.
- Existing messaging remains unchanged.

Reversibility and rollout:

- Provide paired revert SQL in `supabase/migrations/reverts/**` for each migration batch.
- Apply via `scripts/apply-migration.sh`; rollback via `scripts/revert-migration.sh` (or revert SQL runner).

## 4. API & Data Flow Design

RPCs (v1, typed `RETURNS TABLE`):

- `forum_list_topics_v1(...)`
- `forum_get_topic_detail_v1(p_topic_id uuid)`
- `forum_list_posts_v1(...)`
- `faq_list_articles_v1(...)`
- `faq_get_article_v1(p_slug text)`
- `forum_create_topic_v1(...)`
- `forum_create_post_v1(...)`
- `forum_update_topic_v1(...)`
- `forum_update_post_v1(...)`
- `forum_set_topic_status_v1(...)`
- `forum_set_accepted_post_v1(...)`
- `forum_toggle_follow_topic_v1(...)`
- `forum_set_post_vote_v1(...)`
- `forum_report_content_v1(...)`
- `forum_resolve_report_v1(...)`
- `faq_upsert_article_v1(...)`
- `faq_publish_from_topic_v1(...)`

Inputs and outputs:

- Cursor-based pagination inputs for feed endpoints.
- Explicit enums/validated text for statuses (`open/resolved/locked/archived`, etc.).
- Read RPCs return typed table rows, not ad hoc JSON.

Error handling:

- Validation failures: title/body length, invalid status transitions, bad slug.
- Authorization failures: non-owner edit, non-moderator moderation.
- Domain failures: posting into locked topic; accepted answer on wrong topic.
- RPC responses should propagate structured error codes/messages to hooks.

Auth checks:

- RLS enforces tenant and ownership.
- RPCs validate role-sensitive operations (moderation/FAQ publishing).
- Never trust client-supplied `user_id`.

When to use CRUD vs RPC:

- RPC for feed ranking, pagination joins, transactional writes.
- Simple CRUD can be used for non-hot single-row interactions if RLS-safe and index-backed.

## 5. Frontend Integration Plan

Query and mutation design:

- Canonical keys in `src/hooks/community/communityKeys.ts`.
- Community hooks under `src/hooks/community/**` only.
- No `useQuery` domain fetches inside UI components.

Cache strategy:

- Topic feed: `staleTime 30s`, `gcTime 5m`, infinite query.
- Topic detail: `staleTime 15s`, `gcTime 10m`.
- FAQ list/detail: `staleTime 5m`, `gcTime 20m`.
- Bound infinite pages to reduce memory pressure.

Invalidation rules:

- Create topic: invalidate feed keys only.
- Create post: update topic summary, invalidate posts for topic, invalidate affected feed slice.
- Moderation action: invalidate specific topic/posts + report queue.
- FAQ edit/publish: invalidate faq list/detail only.

Loading/error/empty states:

- Discussions list: skeleton + "No topics yet" empty state.
- Topic detail: explicit "topic not found" vs "access denied" handling.
- Replies: "No replies yet" state and retry UI.
- FAQ list/detail: empty FAQ state and unavailable article state.
- Moderation queue: empty queue and action failure toasts.

File-level guidance:

- Route integration: `src/router.tsx`
- Sidebar integration: `src/components/layout/Sidebar.tsx`
- Feature page/components: `src/features/community/**`
- Hooks/keys: `src/hooks/community/**`
- Data access: `src/services/community/**`
- Domain types: `src/types/community.types.ts`

## 6. Implementation Steps

1. Confirm unresolved policy decisions (moderator role mapping, recruit permissions, markdown renderer choice).
2. Add migration `forum-faq-schema-v1`: tables, constraints, indexes, triggers.
3. Add migration `forum-faq-rls-v1`: enable RLS + policies.
4. Add migration `forum-faq-rpcs-v1`: read/write/moderation RPCs.
5. Add migration `forum-faq-permissions-v1`: `nav.community`, `community.*` permissions and role mappings.
6. Regenerate DB types: `npm run generate:types`.
7. Add community service layer (`src/services/community/**`) with typed methods.
8. Add canonical query keys and hooks (`src/hooks/community/**`).
9. Add `/community` route and sidebar nav item.
10. Build UI for Discussions + Topic detail + Reply composer.
11. Build FAQ tab + publish-from-topic flow.
12. Build moderation queue + report resolution actions.
13. Add tests (unit/integration/RLS/UI) and validate build/test/lint.

Minimal-diff principle:

- Do not refactor unrelated features.
- Do not repurpose existing messaging tables.
- Keep each migration batch scoped to one concern.

## 7. Test Plan

Unit tests (Vitest):

- Query key builders.
- Client-side input schema helpers.
- Mapper/transformation helpers for RPC result contracts.

Integration tests (Supabase local):

- Topic/post create/read/update flows under same IMO.
- FAQ draft/publish/read visibility.
- Report creation and moderation resolution.

RLS/security tests:

- Cross-tenant read/write attempts fail.
- Non-owner edits fail.
- Non-moderator moderation/FAQ publish fails.
- Locked topic rejects new post.

Frontend tests (Testing Library):

- Feed pagination and cursor continuity.
- Mutation success/error states.
- Permission-gated moderation tab visibility.
- FAQ empty/loading/error handling.

Build/runtime gates:

- `npm run test:run`
- `npm run build`
- `npm run lint`

## 8. Risk & Failure Analysis

Data corruption risks:

- Counter drift (`reply_count`, `last_activity_at`) from concurrent writes.
- Mitigation: transactional updates in RPCs and reconciliation query test.

Security risks:

- Cross-tenant leakage due to missing predicates or permissive policy.
- Mitigation: RLS-first design + explicit cross-tenant integration tests.

Race conditions:

- Accepted answer set while post/topic deleted.
- Simultaneous moderation/status update collisions.
- Mitigation: row-level checks in RPCs, optimistic lock checks where needed.

Cache risks:

- Over-broad invalidation causing stale flashes or unnecessary refetch.
- Mitigation: canonical keys + narrow invalidation only.

Performance risks:

- Seq scans on feed endpoints.
- Mitigation: required indexes + EXPLAIN review before rollout.

Rollback strategy:

- Keep revert SQL per migration in `supabase/migrations/reverts/**`.
- Roll back in reverse order: permissions -> RPCs -> RLS policies -> tables.
- During rollback, hide `/community` route via permission removal/feature flag.

Mandatory cross-cutting checks:

- Supabase RLS enforcement
- Authorization correctness
- React Query cache correctness
- Hook dependency correctness
- Race conditions
- Transaction safety
- Error propagation
- Undefined/null handling
- UI/data-model alignment
- Performance impact
- Bundle size impact
- Resource cleanup

## 9. Final Implementation Checklist

- [ ] Confirm moderation and recruit access policy decisions.
- [ ] Create additive schema migration for forum/faq tables.
- [ ] Add required tenant and feed/search indexes.
- [ ] Enable RLS and add per-table policies.
- [ ] Implement typed v1 RPC contracts.
- [ ] Add permissions (`nav.community`, `community.*`) and role mapping migration.
- [ ] Add `/community` route with `RouteGuard` permission check.
- [ ] Add sidebar nav item for community.
- [ ] Implement service layer + community hooks + canonical keys.
- [ ] Implement discussions UI with loading/error/empty states.
- [ ] Implement FAQ UI and promote-from-topic flow.
- [ ] Implement moderation queue/actions with permission gating.
- [ ] Add unit, integration, RLS/security, and UI tests.
- [ ] Run `npm run test:run`, `npm run lint`, and `npm run build`.
- [ ] Document rollout + rollback commands using migration scripts.

