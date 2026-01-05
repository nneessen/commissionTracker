# Plan: Add Engagement/Conversation Continuer Templates

## Problem
Current message stages (opener, follow_up, closer) don't cover the middle of conversations when:
- They've already responded and you're building rapport
- The conversation is flowing naturally
- You need to probe deeper into their situation
- You want to transition topics without being pushy
- You're gathering info before going for the close

## Solution
Add a 4th message stage: **"engagement"**

### What Engagement Templates Cover:
1. **Rapport Builders** - Keep them talking, show genuine interest
2. **Probing Questions** - Learn about their situation, pain points
3. **Value Drops** - Share interesting info without being salesy
4. **Transition Messages** - Move convo toward next steps naturally
5. **Interest Confirmations** - Gauge where they're at
6. **Objection Softeners** - Address concerns conversationally

## Implementation Steps

### 1. Update Message Stage Type
File: `src/types/instagram.types.ts`
- Add "engagement" to MessageStage type
- Add label to MESSAGE_STAGE_LABELS

### 2. Update Template Selector UI
File: `src/features/messages/components/instagram/InstagramTemplateSelector.tsx`
- Add engagement to STAGE_ORDER
- Add color for engagement badge (purple/violet)

### 3. Update Settings UI
File: `src/features/messages/components/instagram/templates/InstagramTemplatesSettings.tsx`
- Already uses MESSAGE_STAGE_LABELS so should work automatically

### 4. Create Seed Script for New Templates
File: `scripts/seed-engagement-templates.js`
- 7 engagement templates per category
- Total: 49 new templates (7 categories × 7 templates)

## Template Examples by Category

### Licensed Agent - Engagement
- "That's dope that you're already licensed! How long have you been at it? What got you into insurance in the first place?"
- "Interesting - so what's the biggest thing holding you back right now? Is it leads, training, comp, or something else?"
- "Yeah I totally get that. A lot of agents feel stuck there. What would need to change for you to feel like you're actually winning?"
- "That makes sense. Out of curiosity, what does your ideal setup look like? Like if you could design the perfect situation, what would it be?"
- "Real talk - are you happy where you're at, or just comfortable? No judgment, genuine question."
- "Sounds like you've got some solid experience. What's keeping you at your current spot? Is it loyalty, comp, or something else?"
- "I hear you. So if the right opportunity came along, would you be open to at least hearing about it? Or are you locked in where you are?"

### Has Team - Engagement
- "That's awesome you've built a team! How many people are you leading right now? What's been the hardest part about scaling?"
- "Yeah team building is no joke. What do you wish your upline did better to support you? Like what's missing?"
- "Makes sense. If you could wave a magic wand and fix one thing about your current situation, what would it be?"
- "So is it more of a retention issue or a recruiting issue? Both are fixable btw."
- "I feel that. What systems do you have in place for training your people? Or is it more 1-on-1 right now?"
- "Gotcha. What would it take for your team to double their production? What's the bottleneck?"
- "That's real. So if there was a way to get better support AND better comp for your whole team, would that be worth exploring?"

(Similar patterns for: Solar, D2D, Athlete, Car Sales, General Cold)

## Color Scheme for Engagement Stage
- Use violet/purple: `bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400`
- This differentiates from:
  - Opener (blue)
  - Follow-up (amber)
  - Closer (emerald)

## Execution Order
1. Update types (MessageStage, labels)
2. Update UI components (selector, settings)
3. Run typecheck
4. Create and run seed script
