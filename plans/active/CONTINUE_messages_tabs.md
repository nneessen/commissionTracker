# CONTINUATION: Messages Tab Reorganization

## Branch
`feature/messages-tab-reorganization`

## Status: IMPLEMENTATION COMPLETE - NEEDS TESTING & COMMIT

Typecheck passes. All code written. Ready for manual testing and commit.

---

## What Was Done

### 1. Templates Tab ✅
Moved `InstagramTemplatesSettings` from Settings → Templates tab

### 2. Settings Tab ✅
Created new sub-tabs container with 4 panels:
- Email (digest settings)
- Slack (connection status, auto-post)
- Instagram (connection status)
- LinkedIn (coming soon placeholder)

### 3. Analytics Tab ✅
Created dashboard with 4 KPI cards + period selector (7d/30d/90d):
- Email: sent, open rate, click rate
- Instagram: sent, delivered %, read %
- Slack: sent, success rate, failed
- Quota: daily usage bar

---

## Files Created

```
src/features/messages/components/settings/
├── index.ts
├── MessagesSettingsContainer.tsx
├── EmailSettingsPanel.tsx
├── SlackSettingsPanel.tsx
├── InstagramSettingsPanel.tsx
└── LinkedInSettingsPanel.tsx

src/features/messages/components/analytics/
├── index.ts
├── MessagingAnalyticsDashboard.tsx
├── EmailKpiCard.tsx
├── InstagramKpiCard.tsx
├── SlackKpiCard.tsx
└── QuotaUsageCard.tsx

src/features/messages/hooks/useMessagingAnalytics.ts
```

**Modified:** `src/features/messages/MessagesPage.tsx`

---

## Next Steps for New Session

1. **Start dev server and test**:
   ```bash
   npm run dev
   ```
   - Go to `/messages`
   - Test Templates tab (should show Instagram templates)
   - Test Settings tab (should show 4 sub-tabs)
   - Test Analytics tab (should show KPI dashboard)

2. **If all works, commit**:
   ```bash
   git add .
   git commit -m "feat(messages): reorganize tabs with templates, settings sub-tabs, and analytics dashboard

   - Move Instagram templates from Settings to Templates tab
   - Add Settings sub-tabs: Email, Slack, Instagram, LinkedIn
   - Add Analytics dashboard with KPI cards and period selector
   - Create useMessagingAnalytics hook for aggregated metrics"
   ```

3. **Clean up plan files** in `plans/active/`

---

## If Issues Found

Check these files for type errors:
- `src/features/messages/hooks/useMessagingAnalytics.ts`
- `src/features/messages/components/settings/SlackSettingsPanel.tsx`

Run `npm run typecheck` to verify.
