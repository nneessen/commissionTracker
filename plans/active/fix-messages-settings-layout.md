# Fix Messages Settings Tab Layout & Template Uses Count

## Branch
Create: `fix/messages-settings-layout`

## Problem 1: Settings Tab Layout

When visiting the **Settings tab** on the Messages page (`/messages` → Settings tab), the folders sidebar remains visible on the left side. This wastes horizontal space since Settings doesn't need folder navigation.

### Current Behavior
- Folders sidebar is always visible regardless of which tab is active
- Settings content is constrained to a narrower column
- Inconsistent UX - settings should use full available width

### Expected Behavior
- When Settings tab is active, hide the folders sidebar
- Extend Settings content to fill the full width (where sidebar + content currently are)
- Other tabs (Instagram, Email, etc.) should continue showing the folders sidebar as normal

### Files to Investigate
- `src/features/messages/MessagesPage.tsx` - Main page layout
- `src/features/messages/components/MessagesSidebar.tsx` or similar - Folders sidebar component
- Look for tab state management to conditionally render sidebar

### Implementation Approach
1. Track which tab is currently active
2. Conditionally render the folders sidebar based on active tab
3. Adjust grid/flex layout to expand content when sidebar is hidden
4. Ensure smooth transition if desired

---

## Problem 2: Template "Uses" Column Not Connected

The templates list/table has a "Uses" column showing how many times each template was used, but this value is not connected to any actual calculation method.

### Current Behavior
- "Uses" column exists in the UI
- Value is likely hardcoded, static, or always 0
- Not reflecting actual template usage from `instagram_messages` or similar tables

### Expected Behavior
- "Uses" count should reflect actual times the template was sent
- Query `instagram_messages` (or relevant table) to count messages that used each template
- Update count when templates are used to send messages

### Files to Investigate
- `src/features/messages/components/instagram/templates/` - Template list components
- `supabase/migrations/*instagram*templates*` - Template table schema
- `src/services/instagram/` - Instagram service for template usage
- Look for `uses`, `use_count`, `usage_count` fields

### Implementation Approach
1. Check if `instagram_message_templates` has a `use_count` column
2. If not, either:
   - Add a `use_count` column and increment on send, OR
   - Query `instagram_messages` to count by `template_id` (if relationship exists)
3. Create a service method to get template usage counts
4. Update the templates list query to include usage data

---

## Styling Reference

When modifying UI, follow the Component Styling Guide:
- Use theme CSS variables (`--foreground`, `--background`, `--muted`, etc.)
- No hardcoded colors like `blue-500`, `slate-800`
- Maintain consistent hover/active states

---

## Testing Checklist
- [ ] Settings tab hides folders sidebar
- [ ] Settings content expands to full width
- [ ] Other tabs still show folders sidebar
- [ ] Template "Uses" column shows accurate counts
- [ ] Uses count updates after sending a template message
- [ ] Works in both light and dark mode
