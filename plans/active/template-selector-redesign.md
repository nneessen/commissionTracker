# Continuation Prompt: Instagram Template Selector Redesign

## Context

The Instagram DM template system was just implemented with 140 templates across 7 categories. However, the current template selector UI (a small popover with scrolling) is not functional for this volume of templates.

## Current Implementation (TO BE REPLACED)

**File:** `src/features/messages/components/instagram/InstagramTemplateSelector.tsx`

Current design:
- Small popover triggered by icon button
- 272px wide scrollable area
- Groups templates by message_stage (opener/follow_up/closer)
- Shows "Recently Used" section
- Truncated content preview

**Problems:**
1. Too small to browse 140 templates effectively
2. No category filtering (only shows message_stage grouping)
3. Can't see conversation context while selecting
4. Hard to compare templates side-by-side
5. Search alone isn't enough for discovery

## New Design Requirements

### 1. Dialog-Based Interface
- Full dialog/modal instead of popover
- Adequate size for browsing (e.g., 800-900px wide, 600px tall)
- Clean close button, ESC to dismiss

### 2. Two-Panel Layout
**Left Panel - Conversation Context:**
- Show the Instagram conversation you're replying to
- Display recent messages (last 3-5)
- Show prospect's profile info (name, username, avatar)
- Make it clear what you're responding to

**Right Panel - Template Selection:**
- Category tabs or dropdown filter (Licensed Agent, Has Team, Solar, D2D, Athlete, Car Sales, General Cold)
- Message stage filter (Opener, Follow-up, Closer)
- Search within filtered results
- Template cards showing full content (not truncated)
- Click to select, or preview before inserting

### 3. Template Cards
- Template name (bold)
- Full message content (readable, not truncated)
- Category badge
- Stage badge
- Use count indicator (popular templates)
- "Use Template" button

### 4. Interaction Flow
1. User clicks template icon in message composer
2. Dialog opens showing conversation on left, templates on right
3. User filters by category and/or stage
4. User browses/searches templates
5. User clicks "Use Template"
6. Dialog closes, template content inserted into composer
7. User can edit before sending

## Technical Details

### Files to Modify/Create
- `src/features/messages/components/instagram/InstagramTemplateSelector.tsx` - Replace entirely
- May need new sub-components in `src/features/messages/components/instagram/templates/`

### Data Available
- `useInstagramTemplates()` - Returns all user templates
- `useInstagramTemplateCategories()` - Returns custom categories
- Template fields: `id`, `name`, `content`, `category`, `message_stage`, `use_count`, `last_used_at`
- Built-in categories: `licensed_agent`, `has_team`, `solar`, `door_to_door`, `athlete`, `car_salesman`, `general_cold`
- Message stages: `opener`, `follow_up`, `closer`

### Props Interface (Current)
```typescript
interface InstagramTemplateSelectorProps {
  onSelect: (content: string, templateId: string) => void;
  disabled?: boolean;
  className?: string;
}
```

Will need to add:
```typescript
interface InstagramTemplateSelectorProps {
  onSelect: (content: string, templateId: string) => void;
  disabled?: boolean;
  className?: string;
  // NEW: Conversation context for left panel
  conversation?: InstagramConversation | null;
  recentMessages?: InstagramMessage[];
}
```

### UI Components Available
- `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle` from `@/components/ui/dialog`
- `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` from `@/components/ui/tabs`
- `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue`
- `ScrollArea` from `@/components/ui/scroll-area`
- `Badge` from `@/components/ui/badge`
- `Input` for search
- `Button` for actions

### Design System
- Text sizes: text-[11px] for body, text-[10px] for labels
- Colors: zinc palette (zinc-100 to zinc-900)
- Compact spacing: p-2, gap-2, etc.
- Dark mode support required

## Integration Point

The selector is used in `InstagramConversationView.tsx` in the message composer area. The conversation and messages are already available in that component's context.

## Task

Redesign the `InstagramTemplateSelector` component to be a full dialog with:
1. Left panel showing conversation context
2. Right panel with category/stage filters and template grid
3. Easy browsing and selection of 140+ templates
4. Maintain the `onSelect` callback interface

Start by reading the current implementation, then design and implement the new dialog-based selector.
