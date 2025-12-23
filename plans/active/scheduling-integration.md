# Scheduling Integration Feature - Implementation Plan

## Overview

This document outlines the complete implementation plan for embedded scheduling integrations (Calendly, Google Calendar, Zoom) in the recruiting pipeline. The feature allows recruits to book meetings directly within the application without leaving to external sites.

---

## Current State Audit

### What Exists (Partially Working)

| Component | File | Status | Notes |
|-----------|------|--------|-------|
| Settings > Integrations Tab | `src/features/settings/integrations/IntegrationsTab.tsx` | ✅ Works | Admin can add/edit/delete scheduling URLs |
| IntegrationDialog | `src/features/settings/integrations/components/IntegrationDialog.tsx` | ✅ Works | Form for adding integration details |
| SchedulingItemConfig | `src/features/recruiting/admin/SchedulingItemConfig.tsx` | ⚠️ Partial | Config component exists but not fully wired |
| ChecklistItemEditor | `src/features/recruiting/admin/ChecklistItemEditor.tsx` | ⚠️ Partial | Has scheduling_booking type but incomplete |
| PhaseChecklist | `src/features/recruiting/components/PhaseChecklist.tsx` | ❌ Wrong | Opens new tab instead of embedding |
| Embedded Booking Widget | N/A | ❌ Missing | Does not exist |

### What's Broken

1. **No Embedded Calendar** - Current implementation uses `<a href={url} target="_blank">` which opens a new browser tab
2. **Missing Booking Modal** - No modal/dialog component to embed the actual calendar widget
3. **Incomplete Admin Config** - SchedulingItemConfig doesn't clearly show which integration will be used
4. **Dialog Style Inconsistencies** - Several recruiting dialogs don't match app styling standards

---

## Requirements

### Functional Requirements

1. **Embedded Booking Experience**
   - Recruits see a "Book Meeting" button on scheduling checklist items
   - Clicking opens a modal with the calendar embedded inline
   - Booking happens within the app, not in a new tab
   - After successful booking, item can be marked complete

2. **Provider Support**
   - **Calendly**: Inline widget embed using Calendly's widget.js
   - **Google Calendar**: Appointment scheduling via iframe embed
   - **Zoom**: Meeting details display with direct join link (or scheduler if available)

3. **Admin Configuration**
   - Admin can configure scheduling integrations in Settings > Integrations
   - When creating a scheduling checklist item, admin selects which integration to use
   - System validates that the selected integration type has been configured

4. **Recruit-Facing Flow**
   - Recruit sees scheduling item in their pipeline checklist
   - Clicks "Book Meeting" button
   - Modal opens with embedded calendar
   - Recruit books directly in the embed
   - Item status updates (manual or auto-complete)

### Non-Functional Requirements

1. **UI Consistency** - All dialogs must match app styling standards
2. **Responsive** - Embedded widgets must work on various screen sizes
3. **Security** - Embedded content must be sandboxed appropriately
4. **Performance** - Lazy-load embed scripts only when needed

---

## Technical Design

### 1. New Components Required

#### `SchedulingBookingModal.tsx`
Location: `src/features/recruiting/components/SchedulingBookingModal.tsx`

Purpose: Modal that embeds the actual scheduling widget based on integration type.

```tsx
interface SchedulingBookingModalProps {
  open: boolean;
  onClose: () => void;
  integrationType: SchedulingIntegrationType;
  bookingUrl: string;
  itemName: string;
  instructions?: string;
  onBookingComplete?: () => void;
}
```

**Embed Strategies by Provider:**

| Provider | Embed Method | Script Required |
|----------|--------------|-----------------|
| Calendly | `<div class="calendly-inline-widget" data-url="...">` | `https://assets.calendly.com/assets/external/widget.js` |
| Google Calendar | `<iframe src="..." sandbox="allow-scripts allow-same-origin">` | None |
| Zoom | Display meeting info + join button OR iframe if scheduler URL | None |

#### `CalendlyEmbed.tsx`
Location: `src/features/recruiting/components/embeds/CalendlyEmbed.tsx`

Purpose: Wrapper component for Calendly inline widget with proper script loading.

#### `GoogleCalendarEmbed.tsx`
Location: `src/features/recruiting/components/embeds/GoogleCalendarEmbed.tsx`

Purpose: Wrapper component for Google Calendar appointment iframe.

#### `ZoomEmbed.tsx`
Location: `src/features/recruiting/components/embeds/ZoomEmbed.tsx`

Purpose: Display Zoom meeting details or scheduler embed.

### 2. Component Updates Required

#### `PhaseChecklist.tsx`
- Replace "Book Now" link button with button that opens `SchedulingBookingModal`
- Add state management for modal open/close
- Pass booking URL and metadata to modal

#### `SchedulingItemConfig.tsx`
- Show which configured integration will be used
- Add validation that integration exists
- Improve UX to show integration status

#### `ChecklistItemEditor.tsx`
- Ensure SchedulingItemConfig is properly integrated
- Clear scheduling metadata when item type changes

### 3. Style Fixes Required

The following dialogs need updated `DialogContent` className to match app standards:

**Standard Pattern:**
```tsx
<DialogContent className="max-w-md p-3 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
```

| File | Lines | Current | Fix Required |
|------|-------|---------|--------------|
| `PhaseEditor.tsx` | 245, 358, 483 | `max-w-md` | Add `p-3 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800` |
| `ChecklistItemEditor.tsx` | 282, 470, 675 | `max-w-md` | Add standard styles |
| `PipelineTemplatesList.tsx` | 217, 298 | `max-w-md` | Add standard styles |
| `IntegrationDialog.tsx` | 148 | `max-w-md p-3` | Add `bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800` |

---

## Implementation Steps

### Phase 1: Dialog Style Fixes (30 min)
1. Update `PhaseEditor.tsx` - 3 dialogs
2. Update `ChecklistItemEditor.tsx` - 3 dialogs
3. Update `PipelineTemplatesList.tsx` - 2 dialogs
4. Update `IntegrationDialog.tsx` - 1 dialog
5. Run typecheck to verify

### Phase 2: Embed Components (2-3 hours)
1. Create `src/features/recruiting/components/embeds/` directory
2. Implement `CalendlyEmbed.tsx`
   - Dynamic script loading
   - Widget initialization
   - Event listeners for booking confirmation
3. Implement `GoogleCalendarEmbed.tsx`
   - iframe with proper sandbox attributes
   - Responsive sizing
4. Implement `ZoomEmbed.tsx`
   - Meeting info display
   - Join button with proper link handling

### Phase 3: Booking Modal (1-2 hours)
1. Create `SchedulingBookingModal.tsx`
   - Modal structure with proper sizing for embeds
   - Integration type switch to render correct embed
   - Loading states
   - Error handling for missing URLs
   - Instructions display
   - Close/cancel handling

### Phase 4: PhaseChecklist Integration (1 hour)
1. Import `SchedulingBookingModal`
2. Add modal state management
3. Replace link button with modal trigger button
4. Wire up modal open/close
5. Handle booking completion callback

### Phase 5: Admin Config Improvements (1 hour)
1. Update `SchedulingItemConfig.tsx` to show integration status
2. Add validation warnings if no integration configured
3. Improve UX for selecting integration

### Phase 6: Testing & Cleanup (1 hour)
1. Run typecheck
2. Run build
3. Manual testing of each provider embed
4. Test recruit-facing flow end-to-end
5. Verify dialog styles are consistent

---

## File Changes Summary

### New Files
- `src/features/recruiting/components/SchedulingBookingModal.tsx`
- `src/features/recruiting/components/embeds/CalendlyEmbed.tsx`
- `src/features/recruiting/components/embeds/GoogleCalendarEmbed.tsx`
- `src/features/recruiting/components/embeds/ZoomEmbed.tsx`
- `src/features/recruiting/components/embeds/index.ts`

### Modified Files
- `src/features/recruiting/components/PhaseChecklist.tsx`
- `src/features/recruiting/admin/SchedulingItemConfig.tsx`
- `src/features/recruiting/admin/ChecklistItemEditor.tsx`
- `src/features/recruiting/admin/PhaseEditor.tsx`
- `src/features/recruiting/admin/PipelineTemplatesList.tsx`
- `src/features/settings/integrations/components/IntegrationDialog.tsx`

---

## Security Considerations

1. **Iframe Sandboxing** - Google Calendar/Zoom iframes should use `sandbox` attribute:
   ```html
   <iframe sandbox="allow-scripts allow-same-origin allow-popups allow-forms" ...>
   ```

2. **URL Validation** - Validate booking URLs before rendering in iframes:
   - Must start with `https://`
   - Domain must match expected provider (calendly.com, calendar.google.com, zoom.us)

3. **XSS Prevention** - Never render user-provided content as HTML in embed context

4. **CSP Headers** - May need to update Content-Security-Policy to allow embedding from:
   - `*.calendly.com`
   - `*.google.com`
   - `*.zoom.us`

---

## Edge Cases

1. **No Integration Configured** - Show informative message to admin, disable item for recruits
2. **Invalid Booking URL** - Show error state with instructions to contact admin
3. **Embed Load Failure** - Show fallback with "Open in New Tab" link
4. **Mobile Responsiveness** - Some embeds may need special handling on small screens
5. **Calendly Script Already Loaded** - Check before loading to avoid duplicates

---

## Success Criteria

- [ ] Recruits can book meetings without leaving the app
- [ ] Calendly widget embeds and functions correctly
- [ ] Google Calendar scheduling embeds and functions correctly
- [ ] Zoom meeting details display correctly (embed if scheduler available)
- [ ] All dialogs match app styling standards
- [ ] Admin can configure which integration is used per checklist item
- [ ] Typecheck passes with zero errors
- [ ] Build succeeds
- [ ] No console errors during booking flow

---

## Open Questions

1. **Auto-Complete on Booking** - Should scheduling items auto-complete when booking is confirmed, or require manual completion?
2. **Calendly Event Listeners** - Does Calendly widget emit events we can listen to for booking confirmation?
3. **Zoom Scheduler** - Does Zoom have a schedulable embed, or just meeting join links?
4. **Google Calendar Auth** - Does Google appointment scheduling require OAuth, or can it work with just a URL?

---

## References

- Calendly Embed Documentation: https://developer.calendly.com/api-docs/ZG9jOjQ0MDI5ODg-embed-options
- Google Calendar Appointment Scheduling: https://support.google.com/calendar/answer/10729749
- Zoom Meeting SDK: https://developers.zoom.us/docs/meeting-sdk/

---

## Status

**Current Phase:** Not Started
**Last Updated:** 2024-12-23
**Assigned To:** TBD
