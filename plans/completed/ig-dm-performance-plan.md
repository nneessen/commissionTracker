# Instagram DM Performance, Media, and Realtime Architecture Plan

This document defines a **production-grade plan** to improve speed, reliability, and UX for an Instagram DM integration built on the Meta Graph API, Supabase, and Edge Functions.

The goal is **not** to replicate the Instagram app (which is impossible), but to deliver a **Slack‑like, enterprise inbox** that feels fast, consistent, and scalable while fully respecting Meta’s constraints.

---

## 1. Profile Picture & Participant Media Strategy

### 1.1 Constraints

- Instagram profile picture URLs:
  - Are **temporary**
  - May expire or return 403
  - Cannot be relied on long‑term

- Participant metadata changes infrequently
- Fetching profile data repeatedly adds latency

### 1.2 Canonical Strategy

**Rule:** Instagram is an _event source_, not a media CDN.

#### Ingestion

- On first encounter (conversation create or webhook event):
  - Capture `profile_pic_url`, `username`, `name`

- Immediately enqueue a **media fetch job**

#### Storage

- Download profile pictures
- Store in:
  - S3 / Cloudflare R2 / Supabase Storage

- Persist canonical URL in DB:
  - `participant_avatar_url`

#### Refresh Policy

- Refresh profile pictures only when:
  - Webhook indicates profile update
  - Manual refresh requested
  - Scheduled low‑priority background job (e.g. every 30–60 days)

### 1.3 UI Rules

- UI **never** hits Instagram directly
- UI only loads cached avatar URLs
- Broken image fallback is mandatory

---

## 2. Speed & Perceived Performance Principles

### 2.1 Core Rule

> **Never block UI on Instagram API calls.**

Instagram API latency is unavoidable. Your system must assume:

- 300–1500ms per request
- Occasional rate limits
- Partial failures

The UI should always read from **your database first**.

---

## 3. Webhook‑First Ingestion Architecture (Primary Path)

### 3.1 Why Polling Is the Problem

Using:

- `instagram-get-conversations`
- `instagram-get-messages`

as primary mechanisms causes:

- Slow page loads
- Redundant API calls
- Rate‑limit pressure
- Poor perceived UX

### 3.2 Correct Data Flow

**Primary path:**

1. Instagram sends webhook event
2. Edge Function receives event
3. Persist conversation/message immediately
4. Update unread counters
5. Push realtime update to clients

Polling endpoints become **fallback + recovery tools only**.

### 3.3 Webhook Responsibilities

Webhook handler must:

- Be idempotent
- Validate signature
- Normalize payload
- Persist minimal data immediately
- Enqueue heavy work asynchronously

**Never:**

- Fetch media synchronously
- Perform serial Graph API calls
- Block response longer than necessary

---

## 4. Message Persistence & Unread Count Updates

### 4.1 Message Insert Rules

On webhook message event:

- Insert message row immediately
- Do not wait for media fetch
- Mark `unread = true` for inbound

### 4.2 Conversation Updates

Atomically update:

- `last_message_at`
- `last_message_preview`
- `unread_count = unread_count + 1`

This ensures inbox lists update instantly.

---

## 5. Realtime UI Updates (Supabase Realtime)

### 5.1 What Realtime Is Used For

- New inbound messages
- Conversation list updates
- Unread badge updates
- Status reconciliation

### 5.2 What Realtime Is NOT Used For

- Typing indicators
- Read receipts
- Message delivery guarantees

### 5.3 Mental Model

**Slack‑like inbox**, not chat app:

- Messages appear quickly
- Exact delivery semantics are eventual
- Optimistic UI fills the gap

---

## 6. Message‑Level Pagination Strategy

### 6.1 Ordering (Correct)

```ts
.order("sent_at", { ascending: false })
```

This is correct and should not change.

### 6.2 Loading Rules

- Always load **latest N messages** (e.g. 20–50)
- Never load full threads by default
- Older messages load only on scroll

### 6.3 Sync Rules

- Do **not** auto‑sync entire conversation history
- Sync older pages **only when user requests them**
- Cache results locally once fetched

---

## 7. Aggressive Caching Strategy

### 7.1 What Must Be Cached

- Profile pictures
- Participant metadata
- Conversation headers
- Last message previews

### 7.2 Cache Invalidation

Invalidate cache **only** when:

- Webhook indicates new message
- Webhook indicates profile update
- Explicit user action

Never invalidate on:

- Page refresh
- Navigation
- Timer‑based expiry (except long TTL fallback)

---

## 8. Real‑Time UX: What Is and Isn’t Possible

### 8.1 Not Possible (Hard Limits)

- Typing indicators
- Read receipts
- Native IG interaction parity
- True real‑time streaming

### 8.2 Possible and Recommended

- Supabase Realtime subscriptions
- Optimistic outbound messages
- Status reconciliation on API response

### 8.3 UX Philosophy

Users should feel:

- Inbox is fast
- Messages appear quickly
- Failures are rare and recoverable

Not:

- That this is a live chat clone

---

## 9. Repository‑Layer Optimization

### 9.1 Current State

Your repositories are clean and well‑structured.

### 9.2 Recommended Improvement

Move computed fields out of DB transforms:

- `windowStatus`
- `windowTimeRemaining`

### 9.3 Reason

- These values change with time
- Recomputing on every DB fetch is wasteful
- UI selectors are the correct place

### 9.4 Result

- Faster queries
- Cleaner persistence layer
- Better separation of concerns

---

## 10. Edge Function Performance Hardening

### 10.1 Common Bottlenecks

- Serial Graph API calls
- Fetching media synchronously
- Blocking responses on secondary work

### 10.2 Required Fixes

#### Parallelization

- Fetch messages and metadata concurrently
- Use `Promise.all` aggressively

#### Queued Media Processing

- Immediately enqueue media downloads
- Process asynchronously
- Update message record when complete

#### Early Return Pattern

Webhook handlers should:

1. Persist minimal data
2. Acknowledge webhook
3. Defer heavy processing

---

## 11. Final Architectural Positioning

This system should be positioned as:

> **A high‑performance, compliant Instagram inbox for teams**

Not:

- A replacement for the Instagram app
- A live chat system

When designed with these principles, your current foundation scales cleanly and avoids fighting Meta’s rules.

---

## 12. Optional Next Documents

This plan can be extended with:

- Webhook ingestion schemas
- Media processing queue design
- Realtime subscription patterns
- Failure & retry strategies
- Rate‑limit mitigation playbooks
