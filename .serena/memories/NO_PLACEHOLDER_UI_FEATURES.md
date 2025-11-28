# CRITICAL: No Placeholder/Mock UI Features

## ABSOLUTE RULE: NO FAKE UI ELEMENTS

**NEVER add UI features that don't actually work!**

- ❌ NO buttons that don't have onClick handlers
- ❌ NO fake actions that do nothing
- ❌ NO placeholder/mock functionality
- ❌ NO "coming soon" features in production UI

**Why this is critical:**
- Makes the application confusing
- Users click things expecting them to work
- Creates false expectations
- Wastes development time fixing broken UX

## Implementation Rule

**Before adding ANY button, link, or interactive element:**
1. ✅ Implement the backend function FIRST
2. ✅ Wire up the onClick handler
3. ✅ Test that it actually works
4. ✅ THEN add the UI element

**If you can't implement the full feature:**
- Don't add the UI element at all
- Wait until the backend is ready
- Or clearly mark it as disabled with explanation

## Examples of Violations

❌ BAD:
```tsx
<Button>Approve</Button>  // No onClick, does nothing
<Button>Send Email</Button>  // No handler, fake
```

✅ GOOD:
```tsx
<Button onClick={handleApprove}>Approve</Button>  // Actually wired up
// OR don't add the button at all until handleApprove exists
```

## Memory Trigger

**Before writing ANY interactive UI element, ask:**
"Is this fully implemented and functional right now?"
If NO → Don't add it to the UI!
