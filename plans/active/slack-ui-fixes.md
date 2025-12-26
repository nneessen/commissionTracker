# Continuation: Slack UI Fixes

## Session Context
Slack integration is working but has two UI issues that need fixing.

## Issue 1: Emoji Codes Not Converting to Real Emojis

**Current behavior:** Emoji codes display as text like `:raised_hands: 1`

**Expected behavior:** Should display actual emoji like 🙌

**Root cause:** The `formatSlackText()` function in `src/features/messages/components/slack/SlackChannelView.tsx` only handles a handful of hardcoded emoji codes. Slack has thousands of emoji codes.

**Solution options:**
1. Use a library like `emoji-js` or `node-emoji` to convert all Slack emoji codes
2. Create a more comprehensive emoji mapping
3. Use Slack's emoji API to get custom workspace emojis

**File to modify:** `src/features/messages/components/slack/SlackChannelView.tsx`

**Current code (lines 344-354):**
```typescript
// Convert common Slack emoji codes
formatted = formatted.replace(/:slightly_smiling_face:/g, "🙂");
formatted = formatted.replace(/:thumbsup:/g, "👍");
formatted = formatted.replace(/:wave:/g, "👋");
// ... only handles ~10 emojis
```

**Recommended fix:** Install `emoji-js` or use a comprehensive emoji map.

---

## Issue 2: Dark Mode Tab Styling - Active Tab Not Visible

**Current behavior:** In dark mode, the active/hover tab color is the same as the background, making it impossible to tell which tab is selected.

**Location:** `src/features/messages/MessagesPage.tsx` - the tab buttons around line 170-190

**Current code:**
```tsx
<button
  className={cn(
    "flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded transition-all",
    isActive
      ? "bg-white dark:bg-zinc-900 shadow-sm text-zinc-900 dark:text-zinc-100"
      : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300",
  )}
>
```

**Problem:** `dark:bg-zinc-900` is the same as the page background `dark:bg-zinc-950` (or very close).

**Fix per Component Styling Guide:**
- Use CSS variables: `bg-background` for inactive, `bg-accent` for active
- Active state should have clear visual distinction with proper contrast
- Reference the guide's hover/active effects

**Recommended fix:**
```tsx
isActive
  ? "bg-card dark:bg-zinc-800 shadow-sm text-foreground border border-border"
  : "text-muted-foreground hover:text-foreground hover:bg-accent"
```

---

## Files to Modify

1. `src/features/messages/components/slack/SlackChannelView.tsx` - emoji conversion
2. `src/features/messages/MessagesPage.tsx` - tab styling

## Testing

After fixes:
1. Open Messages → Slack tab
2. View a channel with emoji reactions (should show real emojis)
3. Toggle dark mode
4. Verify active tab is clearly visible against background
5. Verify hover state on inactive tabs is visible

## Related Docs
- Component Styling Guide in CLAUDE.md
- Use CSS variables from index.css for colors
