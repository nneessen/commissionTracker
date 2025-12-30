# Slack Emoji Rendering & User Mention Autocomplete - Implementation Plan

## Executive Summary

This plan addresses two features for the Slack messaging system:
1. **Fix emoji rendering bug**: Messages showing `:emoji_code:` instead of 🎉
2. **User mention autocomplete**: @ mentions with autocomplete dropdown similar to ContactPicker

## Current State Analysis

### Existing Infrastructure
- **File**: `src/features/messages/components/slack/SlackChannelView.tsx` (844 lines)
- **Library**: `node-emoji` v2.2.0 already installed
- **SLACK_EMOJI_MAP**: 200+ custom emoji mappings (lines 418-691)
- **formatSlackText()**: Function exists but NOT calling emoji conversion (lines 386-412)
- **ContactPicker Pattern**: Working autocomplete using `cmdk` + Popover (lines 1-316)
- **Edge Function**: `/supabase/functions/slack-get-messages/index.ts` fetches messages
- **User Data**: Already fetched per-message from Slack API (lines 170-199)

### Problem #1: Emoji Rendering Bug
- Line 409: `formatted = emoji.emojify(formatted);` exists but emojis still showing as `:code:`
- Issue: `node-emoji.emojify()` may not handle all Slack emoji codes
- Need to use SLACK_EMOJI_MAP first, then fallback to node-emoji

### Problem #2: No User Mention Autocomplete
- Current: Simple `<Textarea>` (lines 356-363)
- Need: Detect `@` trigger, show dropdown, insert `<@U123ABC>` format
- Pattern: Similar to ContactPicker using Popover + Command

---

## Architecture Decisions

### 1. Data Model - User Caching Strategy

**Decision: TanStack Query cache only (NO Postgres)**

**Rationale:**
- Messages are ephemeral (fetched from Slack API on-demand)
- User data already fetched per-message in edge function
- TanStack Query provides 5-minute staleTime by default
- No need to persist Slack users in DB (not part of core business data)

**Cache Structure:**
```typescript
queryKey: ["slack-users", integrationId, channelId]
staleTime: 5 * 60 * 1000 // 5 minutes
```

### 2. Edge Functions - New Slack API Calls

**New Function: `/supabase/functions/slack-get-channel-members/index.ts`**

**API Call:** `conversations.members` + `users.info` batch
- Fetch user IDs for channel
- Batch fetch user details (name, display_name, real_name, avatar)
- Return normalized user list

**Alternative Considered:** Add to existing `slack-get-messages`
- Rejected: Violates single responsibility principle
- Rejected: Would bloat message responses unnecessarily

### 3. Services - slackService.ts Extensions

**New Methods:**
```typescript
// src/services/slack/slackService.ts
async getChannelMembers(integrationId: string, channelId: string): Promise<SlackUser[]>
```

### 4. Hooks - TanStack Query Hooks

**New Hook:**
```typescript
// src/hooks/slack/useSlackIntegration.ts
export function useSlackChannelMembers(integrationId: string, channelId: string)
```

### 5. Components - Mention Input Component

**Decision: Create new `MentionTextarea` component**

**Why not enhance existing Textarea?**
- Separation of concerns
- Reusable for other Slack features
- Easier to test in isolation

**Component Structure:**
```
src/features/messages/components/slack/
├── SlackChannelView.tsx (parent)
├── MentionTextarea.tsx (NEW - textarea + mention autocomplete)
└── MessageItem.tsx (extract from SlackChannelView)
```

### 6. Text Rendering - Fix formatSlackText()

**Strategy: Two-pass emoji conversion**

1. **Pass 1:** Replace `:emoji:` codes using SLACK_EMOJI_MAP (priority)
2. **Pass 2:** Use `node-emoji.emojify()` for any remaining standard emoji codes
3. **Pass 3:** User mention resolution (use cached user data)

**Why two-pass?**
- Slack uses custom emoji names not in node-emoji (e.g., `:hand_clap:` → `clap`)
- SLACK_EMOJI_MAP handles Slack-specific naming
- node-emoji catches standard emoji codes

### 7. Autocomplete UI - Popover + Command Pattern

**Decision: Follow ContactPicker pattern exactly**

**Components:**
```
<Popover> (from Radix UI)
  <PopoverAnchor> → Textarea
  <PopoverContent>
    <Command> (from cmdk)
      <CommandList>
        <CommandGroup>
          <CommandItem> (per user)
```

**Trigger Logic:**
- Detect `@` character typed
- Open popover positioned at cursor (use caret position)
- Filter users by text after `@`
- Close on Escape, Enter (selection), or click outside

---

## Implementation Plan - Step-by-Step

### Phase 1: Fix Emoji Rendering (Quick Win)

**Estimated Time: 1 hour**

#### Step 1.1: Update formatSlackText() Function
**File:** `src/features/messages/components/slack/SlackChannelView.tsx` (lines 386-412)

**Changes:**
```typescript
function formatSlackText(text: string, userMap?: Record<string, SlackUser>): string {
  if (!text) return "";
  let formatted = text;

  // Pass 1: Slack-specific emoji using SLACK_EMOJI_MAP
  formatted = formatted.replace(/:([a-z0-9_+-]+):/g, (match, name) => {
    if (SLACK_EMOJI_MAP[name]) {
      return SLACK_EMOJI_MAP[name];
    }
    return match; // Keep original if not found
  });

  // Pass 2: Standard emoji codes via node-emoji
  formatted = emoji.emojify(formatted);

  // Pass 3: User mentions (if userMap provided)
  if (userMap) {
    formatted = formatted.replace(/<@([A-Z0-9]+)>/g, (match, userId) => {
      const user = userMap[userId];
      return user ? `@${user.profile?.display_name || user.name}` : '@user';
    });
  }

  // Channel mentions (existing code)
  formatted = formatted.replace(/<#[A-Z0-9]+\|([^>]+)>/g, "#$1");
  formatted = formatted.replace(/<#([A-Z0-9]+)>/g, "#channel");

  // Links (existing code)
  formatted = formatted.replace(/<(https?:\/\/[^|>]+)\|([^>]+)>/g, "$2");
  formatted = formatted.replace(/<(https?:\/\/[^>]+)>/g, "$1");

  return formatted;
}
```

**Test Cases:**
- `:first_place_medal:` → 🥇
- `:hand_clap:` → 👏 (Slack name → `clap`)
- `:tada:` → 🎉
- `<@U123ABC>` → `@john.doe` (with userMap)
- Mixed: `Great job :fire: <@U123ABC>!` → `Great job 🔥 @john.doe!`

#### Step 1.2: Update MessageItem to Pass User Map
**File:** `src/features/messages/components/slack/SlackChannelView.tsx` (line 734)

**Change:**
```typescript
// Build userMap from messages
const userMap = useMemo(() => {
  const map: Record<string, SlackUser> = {};
  messages.forEach(msg => {
    if (msg.user) {
      map[msg.user.id] = msg.user;
    }
  });
  return map;
}, [messages]);

// In MessageItem
const formattedText = formatSlackText(message.text, userMap);
```

---

### Phase 2: Edge Function for Channel Members

**Estimated Time: 2 hours**

#### Step 2.1: Create Edge Function
**File:** `/supabase/functions/slack-get-channel-members/index.ts` (NEW)

**API Calls:**
1. `conversations.members` - Get user IDs in channel
2. `users.info` - Batch fetch user details (max 50 at a time)

**Response Format:**
```typescript
{
  ok: true,
  members: [
    {
      id: "U123ABC",
      name: "john.doe",
      real_name: "John Doe",
      profile: {
        display_name: "John",
        image_48: "https://...",
      }
    }
  ]
}
```

**Error Handling:**
- Not in channel → `{ ok: false, error: "not_in_channel" }`
- Invalid auth → Mark integration as `connection_status: "error"`
- Rate limits → Cache for 5 minutes

**Code Skeleton:**
```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { decrypt } from "../_shared/encryption.ts";
import { getCorsHeaders, corsResponse } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse(req);
  
  const { integrationId, channelId } = await req.json();
  
  // 1. Get bot token from slack_integrations
  // 2. Call conversations.members API
  // 3. Batch call users.info for each member
  // 4. Return normalized user list
});
```

#### Step 2.2: Update Service Layer
**File:** `src/services/slack/slackService.ts`

**Add Method:**
```typescript
async getChannelMembers(
  integrationId: string,
  channelId: string
): Promise<SlackUser[]> {
  const { data, error } = await supabase.functions.invoke(
    "slack-get-channel-members",
    { body: { integrationId, channelId } }
  );

  if (error) throw error;
  if (!data?.ok) throw new Error(data?.error || "Failed to fetch members");

  return data.members || [];
}
```

#### Step 2.3: Create TanStack Query Hook
**File:** `src/hooks/slack/useSlackIntegration.ts`

**Add Hook:**
```typescript
export function useSlackChannelMembers(
  integrationId: string | undefined,
  channelId: string | undefined
) {
  return useQuery({
    queryKey: ["slack-users", integrationId ?? "", channelId ?? ""],
    queryFn: async (): Promise<SlackUser[]> => {
      if (!integrationId || !channelId) return [];
      return slackService.getChannelMembers(integrationId, channelId);
    },
    enabled: !!integrationId && !!channelId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
```

**Export from index.ts:**
```typescript
// src/hooks/slack/index.ts
export { useSlackChannelMembers } from "./useSlackIntegration";
```

---

### Phase 3: MentionTextarea Component

**Estimated Time: 4 hours**

#### Step 3.1: Create Component File
**File:** `src/features/messages/components/slack/MentionTextarea.tsx` (NEW)

**Props Interface:**
```typescript
interface MentionTextareaProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  placeholder?: string;
  disabled?: boolean;
  integrationId: string;
  channelId: string;
  className?: string;
}
```

**State Management:**
```typescript
const [isOpen, setIsOpen] = useState(false);
const [cursorPosition, setCursorPosition] = useState(0);
const [mentionQuery, setMentionQuery] = useState(""); // Text after @
const textareaRef = useRef<HTMLTextAreaElement>(null);
```

**Trigger Detection Logic:**
```typescript
const detectMentionTrigger = (text: string, cursorPos: number) => {
  // Find @ before cursor
  const textBeforeCursor = text.slice(0, cursorPos);
  const lastAtIndex = textBeforeCursor.lastIndexOf('@');
  
  if (lastAtIndex === -1) return null;
  
  // Check if @ is at start or preceded by whitespace
  const charBefore = textBeforeCursor[lastAtIndex - 1];
  if (lastAtIndex > 0 && charBefore !== ' ' && charBefore !== '\n') {
    return null;
  }
  
  // Extract query after @
  const query = textBeforeCursor.slice(lastAtIndex + 1);
  
  // Only trigger if no whitespace in query
  if (query.includes(' ')) return null;
  
  return { index: lastAtIndex, query };
};
```

**User Filtering:**
```typescript
const { data: allMembers = [] } = useSlackChannelMembers(integrationId, channelId);

const filteredUsers = useMemo(() => {
  if (!mentionQuery) return allMembers.slice(0, 10);
  
  const lowerQuery = mentionQuery.toLowerCase();
  return allMembers
    .filter(user => {
      const displayName = user.profile?.display_name?.toLowerCase() || '';
      const name = user.name.toLowerCase();
      const realName = user.real_name?.toLowerCase() || '';
      
      return displayName.includes(lowerQuery) ||
             name.includes(lowerQuery) ||
             realName.includes(lowerQuery);
    })
    .slice(0, 10); // Limit to 10 results
}, [allMembers, mentionQuery]);
```

**Mention Insertion:**
```typescript
const insertMention = (user: SlackUser) => {
  const textarea = textareaRef.current;
  if (!textarea) return;
  
  const { value, selectionStart } = textarea;
  
  // Find @ position
  const textBefore = value.slice(0, selectionStart);
  const lastAtIndex = textBefore.lastIndexOf('@');
  
  // Replace from @ to cursor with mention format
  const before = value.slice(0, lastAtIndex);
  const after = value.slice(selectionStart);
  const mention = `<@${user.id}>`;
  const newValue = before + mention + after;
  
  onChange(newValue);
  
  // Set cursor after mention
  const newCursorPos = before.length + mention.length;
  setTimeout(() => {
    textarea.focus();
    textarea.setSelectionRange(newCursorPos, newCursorPos);
  }, 0);
  
  setIsOpen(false);
};
```

**Keyboard Navigation:**
```typescript
const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
  if (isOpen) {
    // Let Command component handle Up/Down/Enter
    if (['ArrowUp', 'ArrowDown', 'Enter'].includes(e.key)) {
      // Command handles these
      return;
    }
    
    if (e.key === 'Escape') {
      setIsOpen(false);
      e.preventDefault();
      return;
    }
  }
  
  // Pass through to parent (e.g., Shift+Enter to send)
  onKeyDown?.(e);
};
```

**Component Structure:**
```tsx
<Popover open={isOpen} onOpenChange={setIsOpen}>
  <PopoverAnchor asChild>
    <Textarea
      ref={textareaRef}
      value={value}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onSelect={handleCursorMove} // Track cursor position
      placeholder={placeholder}
      disabled={disabled}
      className={className}
    />
  </PopoverAnchor>
  
  <PopoverContent
    side="top"
    align="start"
    sideOffset={4}
    onOpenAutoFocus={(e) => e.preventDefault()}
    className="w-[280px] p-0"
  >
    <Command shouldFilter={false} loop>
      <CommandList className="max-h-[200px]">
        {filteredUsers.length > 0 ? (
          <CommandGroup heading="Mention user">
            {filteredUsers.map(user => (
              <CommandItem
                key={user.id}
                value={user.id}
                onSelect={() => insertMention(user)}
              >
                <UserDisplay user={user} />
              </CommandItem>
            ))}
          </CommandGroup>
        ) : (
          <CommandEmpty>No users found</CommandEmpty>
        )}
      </CommandList>
    </Command>
  </PopoverContent>
</Popover>
```

**User Display Component:**
```tsx
function UserDisplay({ user }: { user: SlackUser }) {
  return (
    <div className="flex items-center gap-2">
      <Avatar className="h-6 w-6">
        <AvatarImage src={user.profile?.image_48} />
        <AvatarFallback className="text-[9px]">
          {user.name.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-medium truncate">
          {user.profile?.display_name || user.real_name || user.name}
        </div>
        <div className="text-[9px] text-muted-foreground truncate">
          @{user.name}
        </div>
      </div>
    </div>
  );
}
```

#### Step 3.2: Update SlackChannelView to Use MentionTextarea
**File:** `src/features/messages/components/slack/SlackChannelView.tsx`

**Replace lines 356-363:**
```tsx
// OLD:
<Textarea
  value={messageText}
  onChange={(e) => setMessageText(e.target.value)}
  onKeyDown={handleKeyDown}
  placeholder={`Message #${channel.name}`}
  className="min-h-[36px] max-h-24 text-[11px] resize-none"
  rows={1}
/>

// NEW:
<MentionTextarea
  value={messageText}
  onChange={setMessageText}
  onKeyDown={handleKeyDown}
  placeholder={`Message #${channel.name}`}
  integrationId={integrationId}
  channelId={channel.id}
  className="min-h-[36px] max-h-24 text-[11px] resize-none"
/>
```

**Add Import:**
```typescript
import { MentionTextarea } from "./MentionTextarea";
```

---

### Phase 4: Type Definitions

**Estimated Time: 30 minutes**

#### Step 4.1: Add SlackUser Type
**File:** `src/types/slack.types.ts`

**Add Interface:**
```typescript
export interface SlackUser {
  id: string;
  name: string;
  real_name?: string;
  profile?: {
    image_48?: string;
    display_name?: string;
  };
}
```

**Export from service:**
```typescript
// src/services/slack/slackService.ts
export type { SlackUser } from '@/types/slack.types';
```

---

### Phase 5: Testing Strategy

**Estimated Time: 2 hours**

#### Unit Tests

**File:** `src/features/messages/components/slack/__tests__/formatSlackText.test.ts`

**Test Cases:**
```typescript
describe('formatSlackText', () => {
  it('converts Slack-specific emoji codes', () => {
    expect(formatSlackText(':first_place_medal:')).toBe('🥇');
    expect(formatSlackText(':hand_clap:')).toBe('👏');
  });
  
  it('converts standard emoji codes', () => {
    expect(formatSlackText(':tada:')).toBe('🎉');
    expect(formatSlackText(':fire:')).toBe('🔥');
  });
  
  it('resolves user mentions with userMap', () => {
    const userMap = {
      'U123': { id: 'U123', name: 'john.doe', profile: { display_name: 'John' } }
    };
    expect(formatSlackText('<@U123>', userMap)).toBe('@John');
  });
  
  it('handles mixed content', () => {
    const userMap = {
      'U123': { id: 'U123', name: 'john', profile: { display_name: 'John' } }
    };
    const input = 'Great job :fire: <@U123>!';
    expect(formatSlackText(input, userMap)).toBe('Great job 🔥 @John!');
  });
});
```

**File:** `src/features/messages/components/slack/__tests__/MentionTextarea.test.tsx`

**Test Cases:**
```typescript
describe('MentionTextarea', () => {
  it('detects @ trigger and shows dropdown', async () => {
    render(<MentionTextarea {...props} />);
    const textarea = screen.getByRole('textbox');
    
    await userEvent.type(textarea, '@jo');
    
    expect(screen.getByText('Mention user')).toBeInTheDocument();
    expect(screen.getByText('@john.doe')).toBeInTheDocument();
  });
  
  it('filters users by query', async () => {
    render(<MentionTextarea {...props} />);
    
    await userEvent.type(textarea, '@alice');
    
    expect(screen.getByText('@alice.smith')).toBeInTheDocument();
    expect(screen.queryByText('@john.doe')).not.toBeInTheDocument();
  });
  
  it('inserts mention on user selection', async () => {
    const onChange = vi.fn();
    render(<MentionTextarea {...props} onChange={onChange} />);
    
    await userEvent.type(textarea, '@jo');
    await userEvent.click(screen.getByText('@john.doe'));
    
    expect(onChange).toHaveBeenCalledWith(expect.stringContaining('<@U123>'));
  });
  
  it('closes dropdown on Escape', async () => {
    render(<MentionTextarea {...props} />);
    
    await userEvent.type(textarea, '@jo');
    expect(screen.getByText('Mention user')).toBeInTheDocument();
    
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByText('Mention user')).not.toBeInTheDocument();
  });
});
```

#### Integration Tests

**Manual Testing Checklist:**
1. Type `@` → Dropdown appears
2. Type `@john` → Filters to John
3. Arrow keys navigate dropdown
4. Enter selects user → Inserts `<@U123ABC>`
5. Send message → Appears in channel
6. Refresh page → Message shows `@john.doe`
7. Message with emoji `:fire:` → Renders as 🔥
8. Multiple mentions in one message → All resolve correctly
9. Edge case: `@@` → Dropdown still works
10. Edge case: Email `test@example.com` → Does NOT trigger dropdown

#### Edge Function Testing

**Test `/supabase/functions/slack-get-channel-members`:**
```bash
# Local test
supabase functions serve slack-get-channel-members

# Test request
curl -X POST http://localhost:54321/functions/v1/slack-get-channel-members \
  -H "Content-Type: application/json" \
  -d '{"integrationId":"uuid","channelId":"C123ABC"}'
```

**Expected Response:**
```json
{
  "ok": true,
  "members": [
    {
      "id": "U123ABC",
      "name": "john.doe",
      "real_name": "John Doe",
      "profile": {
        "display_name": "John",
        "image_48": "https://avatars.slack-edge.com/..."
      }
    }
  ]
}
```

---

## Edge Cases & Error Handling

### Emoji Rendering Edge Cases

1. **Unknown emoji code**: `:unknown_emoji:` → Keep as-is (fallback to original)
2. **Emoji at start/end**: `:fire:` or `text :fire:` → Render correctly
3. **Multiple emojis**: `:fire: :tada: :100:` → All render
4. **Emoji in URL**: `https://example.com/:path:` → Do NOT convert (handled by link regex)
5. **Escaped emoji**: Slack doesn't escape, but test `\:fire\:` → Keep as-is

### Mention Autocomplete Edge Cases

1. **@ at start of message**: `@john` → Trigger works
2. **@ mid-word**: `test@example.com` → Do NOT trigger (check char before @)
3. **Multiple @ symbols**: `@john @alice` → Each triggers separately
4. **@ followed by space**: `@ ` → Close dropdown
5. **User not in channel**: Edge function only returns channel members
6. **Large channel (500+ users)**: Limit to first 100, show "Type to search"
7. **Slow network**: Show loading spinner in dropdown
8. **User leaves channel mid-compose**: Mention still works (user ID stored)
9. **User deactivated**: Slack API returns user but may show "Deactivated User"
10. **Keyboard navigation**: Up/Down arrows, Enter to select, Escape to close

### Error States

1. **Edge function fails**: Show toast "Failed to load users", textarea still works
2. **Not in channel**: Edge function returns `not_in_channel` → Show join prompt
3. **Invalid auth**: Mark integration as error, show reconnect prompt
4. **Rate limited**: Cache users for 5 minutes, show stale data
5. **Network timeout**: Retry with exponential backoff (TanStack Query default)

---

## File Summary

### New Files (3)
1. `/supabase/functions/slack-get-channel-members/index.ts` - Edge function
2. `src/features/messages/components/slack/MentionTextarea.tsx` - Component
3. `src/features/messages/components/slack/__tests__/formatSlackText.test.ts` - Tests

### Modified Files (4)
1. `src/features/messages/components/slack/SlackChannelView.tsx`
   - Update `formatSlackText()` function (lines 386-412)
   - Add userMap memoization
   - Replace Textarea with MentionTextarea (lines 356-363)
   
2. `src/services/slack/slackService.ts`
   - Add `getChannelMembers()` method
   
3. `src/hooks/slack/useSlackIntegration.ts`
   - Add `useSlackChannelMembers()` hook
   
4. `src/hooks/slack/index.ts`
   - Export `useSlackChannelMembers`
   
5. `src/types/slack.types.ts`
   - Add `SlackUser` interface

### Total LOC Estimate
- New code: ~450 lines
- Modified code: ~80 lines
- Test code: ~200 lines
- **Total: ~730 lines**

---

## Dependencies

### Existing (No changes needed)
- `node-emoji` v2.2.0 ✓
- `cmdk` v1.1.1 ✓
- `@radix-ui/react-popover` ✓
- `@tanstack/react-query` ✓

### No New Dependencies Required

---

## Implementation Timeline

| Phase | Task | Time | Cumulative |
|-------|------|------|------------|
| 1 | Fix emoji rendering | 1h | 1h |
| 2 | Edge function + service + hook | 2h | 3h |
| 3 | MentionTextarea component | 4h | 7h |
| 4 | Type definitions | 30m | 7.5h |
| 5 | Testing & QA | 2h | 9.5h |
| - | **Total** | **9.5h** | - |

**Suggested Order:**
1. Phase 1 (emoji fix) - Quick win, immediate value
2. Phase 2 (backend infrastructure) - Foundation for mentions
3. Phase 3 (UI component) - User-facing feature
4. Phase 5 (testing) - Validate everything works

---

## Deployment Checklist

### Pre-Deployment
- [ ] Run `npm run build` - Zero TypeScript errors
- [ ] Run `npm test` - All tests passing
- [ ] Run `npm run lint` - No lint errors
- [ ] Deploy edge function: `supabase functions deploy slack-get-channel-members`
- [ ] Test edge function in staging
- [ ] Verify emoji rendering with sample messages
- [ ] Verify mention autocomplete with real Slack workspace

### Post-Deployment
- [ ] Monitor edge function logs for errors
- [ ] Check TanStack Query devtools for cache behavior
- [ ] Verify emoji render correctly across different browsers
- [ ] Test mention insertion on mobile (if responsive)
- [ ] Gather user feedback on autocomplete UX

---

## Future Enhancements (Out of Scope)

1. **Emoji picker button**: Add emoji selector UI (like Slack's)
2. **Channel mention autocomplete**: # trigger for channel mentions
3. **Slash command autocomplete**: / trigger for Slack commands
4. **Rich text editor**: Replace Textarea with TipTap (already in dependencies)
5. **Message editing**: Edit sent messages (requires Slack API)
6. **Thread replies**: Nested conversation threads
7. **File uploads**: Attach files to messages
8. **Message search**: Full-text search across messages
9. **User presence**: Show online/offline status
10. **Custom emoji**: Support workspace custom emoji

---

## Risk Assessment

### Low Risk
- ✅ Emoji rendering fix (isolated function change)
- ✅ Edge function (follows existing pattern)
- ✅ TanStack Query hook (standard pattern)

### Medium Risk
- ⚠️ Mention autocomplete UX (complex user interaction)
- ⚠️ Cursor positioning logic (browser compatibility)
- ⚠️ Keyboard navigation (accessibility concerns)

### Mitigation
- Follow ContactPicker pattern exactly (proven to work)
- Test on Chrome, Firefox, Safari
- Use ARIA labels for screen readers
- Extensive manual testing before production

---

## Success Metrics

1. **Emoji rendering**: 100% of Slack emoji codes render correctly
2. **Mention autocomplete**: 0 complaints about UX (after 1 week)
3. **Performance**: Autocomplete opens in <100ms
4. **Cache hit rate**: >90% for user data (5-minute staleTime)
5. **Error rate**: <1% for edge function calls
6. **Accessibility**: WCAG 2.1 AA compliant (keyboard navigation)

---

## Notes

- **No database changes required** - All data from Slack API
- **No new npm dependencies** - Use existing libraries
- **Follows existing patterns** - ContactPicker, edge functions, TanStack Query
- **Type-safe** - Full TypeScript coverage
- **Testable** - Unit tests + integration tests
- **Accessible** - Keyboard navigation, ARIA labels
- **Performance** - 5-minute cache, lazy loading, debounced search
