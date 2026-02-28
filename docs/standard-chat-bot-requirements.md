# Standard Chat Bot — External API Requirements

This document defines the API endpoints that the **commissionTracker** system expects
from the **standard-chat-bot** project. These endpoints power the analytics and
attribution features in commissionTracker's Chat Bot page.

All endpoints are consumed by Supabase Edge Functions running in commissionTracker.
Authentication uses a shared API key via `X-API-Key` header.

---

## Authentication

All endpoints require the `X-API-Key` header:

```
X-API-Key: <shared-secret>
```

Return `401` if the key is missing or invalid.

---

## Endpoint 1: Agent Analytics

**Used by:** `chat-bot-api` edge function (`get_analytics` action)

```
GET /api/external/agents/:agentId/analytics?from=<date>&to=<date>
```

### Query Parameters

| Param | Type   | Required | Description                    |
|-------|--------|----------|--------------------------------|
| from  | string | No       | ISO date (YYYY-MM-DD) start    |
| to    | string | No       | ISO date (YYYY-MM-DD) end      |

### Response (200 OK)

The response can be wrapped in `{ success: true, data: <payload> }` or returned
directly as the payload. commissionTracker handles both via an `unwrap()` helper.

```json
{
  "conversations": {
    "total": 142,
    "byStatus": {
      "active": 45,
      "completed": 80,
      "stale": 17
    },
    "byChannel": {
      "sms": 100,
      "web": 42
    },
    "avgMessagesPerConvo": 6.3,
    "suppressionRate": 0.05,
    "staleRate": 0.12
  },
  "engagement": {
    "responseRate": 0.78,
    "multiTurnRate": 0.62,
    "avgFirstResponseMin": 2.4,
    "avgObjectionCount": 1.1,
    "hardNoRate": 0.08
  },
  "appointments": {
    "total": 28,
    "bookingRate": 0.197,
    "showRate": 0.82,
    "cancelRate": 0.11,
    "avgDaysToAppointment": 3.2
  },
  "timeline": [
    {
      "date": "2026-02-01",
      "conversations": 12,
      "appointments": 3,
      "conversions": 1
    }
  ]
}
```

### Field Notes

- All rates are decimals (0.0–1.0), not percentages.
- `timeline[]` should include one entry per day within the `from`/`to` range.
- `byStatus` keys should include at minimum: `active`, `completed`, `stale`.
- `byChannel` keys are flexible — commissionTracker renders whatever keys are returned.

---

## Endpoint 2: Conversation Search

**Used by:** `chat-bot-api` edge function (`check_attribution` action) and
`backfill-attributions` edge function.

This is the **most critical endpoint for attribution**. It searches an agent's
conversation history to find leads matching a given name or phone number.

```
GET /api/external/agents/:agentId/conversations/search?leadName=<name>&leadPhone=<phone>&from=<date>
```

### Query Parameters

| Param     | Type   | Required | Description                                         |
|-----------|--------|----------|-----------------------------------------------------|
| leadName  | string | No*      | Full name of the lead (e.g., "Clifford Springman")   |
| leadPhone | string | No*      | Phone number, digits only (e.g., "5551234567")       |
| from      | string | No       | ISO date (YYYY-MM-DD) — only return convos after this |

*At least one of `leadName` or `leadPhone` must be provided.

### Matching Logic

commissionTracker uses these matches with the following priority:

1. **Phone match** (digits-only comparison) → confidence 1.0, method `auto_phone`
2. **Name match** (case-insensitive) → confidence 0.7, method `auto_name`

The search endpoint should return ALL conversations where the lead's phone OR name
matches the query parameters. commissionTracker handles the ranking/selection logic.

### Response (200 OK)

The response can be wrapped in `{ success: true, data: <payload> }` or returned
directly as the array.

```json
[
  {
    "id": "conv_abc123",
    "leadName": "Clifford Springman",
    "leadPhone": "5551234567",
    "appointmentId": "appt_xyz789",
    "startedAt": "2026-01-15T14:30:00Z"
  },
  {
    "id": "conv_def456",
    "leadName": "Cliff Springman",
    "leadPhone": null,
    "appointmentId": null,
    "startedAt": "2026-01-10T09:15:00Z"
  }
]
```

### Field Definitions

| Field         | Type            | Required | Description                                                |
|---------------|-----------------|----------|------------------------------------------------------------|
| id            | string          | Yes      | Unique conversation identifier                              |
| leadName      | string \| null  | Yes      | Name of the lead from the conversation                      |
| leadPhone     | string \| null  | Yes      | Phone number of the lead (digits only preferred)            |
| appointmentId | string \| null  | Yes      | If an appointment was booked, its ID; null otherwise        |
| startedAt     | string \| null  | Yes      | ISO 8601 timestamp of conversation start                    |

### Attribution Logic

commissionTracker uses these fields as follows:

- If `appointmentId` is non-null → `attribution_type = "bot_converted"` (conversation + appointment + sale)
- If `appointmentId` is null → `attribution_type = "bot_assisted"` (conversation only + sale)
- `id` is stored as `external_conversation_id` in `bot_policy_attributions`
- `appointmentId` is stored as `external_appointment_id`
- `leadName` is stored as `lead_name` (fallback display name)
- `startedAt` is stored as `conversation_started_at`

---

## Endpoint 3: Aggregate Analytics

**Used by:** `bot-collective-analytics` edge function (public, no JWT).

Returns cross-agent aggregate metrics. This is called without per-agent context.

```
GET /api/external/analytics/aggregate?from=<date>&to=<date>
```

### Query Parameters

| Param | Type   | Required | Description                    |
|-------|--------|----------|--------------------------------|
| from  | string | No       | ISO date (YYYY-MM-DD) start    |
| to    | string | No       | ISO date (YYYY-MM-DD) end      |

### Response (200 OK)

The response can be wrapped in `{ success: true, data: <payload> }` or returned directly.

```json
{
  "totalConversations": 847,
  "totalAppointments": 156,
  "bookingRate": 0.184,
  "timeline": [
    {
      "date": "2026-02-01",
      "conversations": 45,
      "appointments": 8,
      "conversions": 3
    }
  ]
}
```

### Field Definitions

| Field              | Type    | Required | Description                                    |
|--------------------|---------|----------|------------------------------------------------|
| totalConversations | number  | Yes      | Total conversations across all agents           |
| totalAppointments  | number  | Yes      | Total appointments booked across all agents     |
| bookingRate        | number  | Yes      | Appointments / conversations (decimal 0.0–1.0) |
| timeline           | array   | Yes      | Daily breakdown (same shape as Endpoint 1)      |

### Usage Notes

- commissionTracker merges these external metrics with its own DB-side attribution counts.
- `conversionRate` is computed by commissionTracker: `totalAttributions / totalConversations`.
- `totalPremium` is computed from `bot_policy_attributions` → `policies.annual_premium` in DB.

---

## Error Responses

All endpoints should return errors in this format:

```json
{
  "success": false,
  "error": "Description of the error"
}
```

Or simply:

```json
{
  "error": "Description of the error"
}
```

commissionTracker handles both. Standard HTTP status codes apply:

| Status | Meaning              |
|--------|----------------------|
| 200    | Success              |
| 400    | Bad request          |
| 401    | Invalid/missing API key |
| 404    | Agent not found      |
| 500    | Server error (commissionTracker will show "Bot service temporarily unavailable") |

---

## Integration Notes

1. **Response wrapping is optional.** commissionTracker's `unwrap()` helper handles
   both `{ success: true, data: <payload> }` and direct payload responses.

2. **Phone numbers** should be stored/compared as digits-only strings. The search
   endpoint should strip non-digit characters before matching.

3. **Name matching** should be case-insensitive. Partial/fuzzy matching is acceptable
   but not required — commissionTracker does its own ranking.

4. **The `from` parameter** on conversation search uses ISO date format. Return
   conversations where `startedAt >= from`.

5. **Empty results** should return `[]` (empty array), not an error.

6. **Agent IDs** correspond to the `external_agent_id` field in commissionTracker's
   `chat_bot_agents` table. These are UUIDs assigned during agent provisioning.
