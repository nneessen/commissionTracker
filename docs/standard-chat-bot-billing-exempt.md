# Standard Chat Bot API: Billing Exemption + Safety Caps

## Context

CommissionTracker now provisions "team bots" for agents under a team leader's hierarchy. These bots are **billing-exempt** (no Stripe subscription, no lead limits). The external standard-chat-bot API already accepts `billingExempt: true` on provision/update. This doc covers what the standard-chat-bot API needs to support and return.

---

## 1. Provision (POST `/api/external/agents`)

### Request Body (billing-exempt agent)

```json
{
  "externalRef": "user-uuid-from-supabase",
  "name": "Agent Display Name",
  "billingExempt": true
}
```

### Expected Behavior

- Create the agent normally
- When `billingExempt: true`:
  - **Skip lead limit enforcement** entirely (no `leadLimit` field sent)
  - Do NOT require a Stripe subscription or payment method
  - Store `billingExempt = true` on the agent record
- Return the same `{ success: true, data: { agentId: "..." } }` response

### What NOT to change

- Non-exempt agents still receive `leadLimit` and follow normal billing. No changes there.

---

## 2. Update (PATCH `/api/external/agents/:id`)

### Toggle billing exemption

```json
{
  "billingExempt": true
}
```

or

```json
{
  "billingExempt": false
}
```

### Expected Behavior

- Update the `billingExempt` flag on the agent record
- When switching to `true`: remove/bypass any lead limit enforcement
- When switching to `false`: re-apply lead limits (will need a subsequent PATCH with `leadLimit`)

---

## 3. Get Agent (GET `/api/external/agents/:id`)

### Response — new fields to include

The `agent` object in the response MUST include these fields:

```json
{
  "success": true,
  "data": {
    "agent": {
      "id": "...",
      "name": "...",
      "botEnabled": true,
      "billingExempt": false,
      "dailyMessageLimit": 100,
      "maxMessagesPerConversation": 25,
      // ... all existing fields ...
    },
    "connections": { ... }
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `billingExempt` | `boolean` | Whether this agent bypasses billing/lead limits |
| `dailyMessageLimit` | `number \| null` | Max messages the bot can send per day (null = no limit) |
| `maxMessagesPerConversation` | `number \| null` | Max messages per single conversation (null = no limit) |

### Important

- `billingExempt` must default to `false` for agents that don't have it set
- `dailyMessageLimit` and `maxMessagesPerConversation` may already be stored and enforced server-side — just make sure they're **returned in the GET response**

---

## 4. Update Safety Caps (PATCH `/api/external/agents/:id`)

These fields should be accepted in the PATCH body:

```json
{
  "dailyMessageLimit": 100,
  "maxMessagesPerConversation": 25
}
```

Or set to null to remove limits:

```json
{
  "dailyMessageLimit": null,
  "maxMessagesPerConversation": null
}
```

### Expected Behavior

- Store on the agent record
- Enforce server-side during message sending (this is likely already done)
- Return updated values in subsequent GET responses

---

## 5. Usage (GET `/api/external/agents/:id/usage`)

### Current Response

```json
{
  "success": true,
  "data": {
    "leadCount": 42,
    "leadLimit": 150,
    "periodStart": "2026-03-01",
    "periodEnd": "2026-03-31",
    "planName": "Growth"
  }
}
```

### For billing-exempt agents

The usage endpoint should still work. Suggested behavior:

- `leadCount`: actual leads engaged (still tracked for informational purposes)
- `leadLimit`: `0` or `null` (no limit applies)
- `planName`: `"Team"` or `"Exempt"` (whatever makes sense)
- `periodStart`/`periodEnd`: still return the current calendar month

---

## How CommissionTracker Uses This

### Team hierarchy flow

1. **Team leader** (e.g., the IMO owner at hierarchy root) subscribes to the chat bot via Stripe and gets a normal bot
2. Team leader's bot is then marked `billing_exempt = true` via `set_billing_exempt` action in `chat-bot-provision`
3. **Downline agents** call `team_provision` in `chat-bot-api`, which:
   - Reads the agent's `hierarchy_path` from `user_profiles` (dot-separated UUID chain)
   - Parses upline IDs from the path
   - Checks if any upline has `billing_exempt = true` in `chat_bot_agents`
   - If yes: provisions the agent's bot with `billingExempt: true` on the external API
   - If no: returns 403

### Frontend flow

1. Page loads → `useIsOnExemptTeam()` hook queries `user_profiles.hierarchy_path` → checks `chat_bot_agents` for exempt uplines
2. If on exempt team → shows "Team Access — Free" card and "Activate Free Team Bot" button
3. Agent clicks activate → calls `team_provision` → bot is provisioned → setup wizard appears

---

## Checklist

- [ ] `POST /api/external/agents` — accepts and stores `billingExempt: true`, skips lead limit enforcement
- [ ] `PATCH /api/external/agents/:id` — accepts `billingExempt`, `dailyMessageLimit`, `maxMessagesPerConversation`
- [ ] `GET /api/external/agents/:id` — returns `billingExempt`, `dailyMessageLimit`, `maxMessagesPerConversation` in agent object
- [ ] `GET /api/external/agents/:id/usage` — works for billing-exempt agents (returns count without limit enforcement)
- [ ] Safety caps enforced server-side during message sending (if not already)
