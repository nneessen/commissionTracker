# Email Automation Workflow Guide

## Overview
The email automation system allows you to create sophisticated email sequences that trigger based on events, schedules, or manual actions. You now have two fully functional examples in your system.

## Your Example Workflows

### 1. New Recruit Welcome Sequence
**Purpose:** Automatically onboard new recruits with a series of welcome emails

**How it works:**
- **Trigger:** When a recruit's status changes to "Application Review"
- **Actions:** Sends 3 emails over 48 hours
  1. **Immediate:** Welcome email
  2. **Day 1:** Important documents to review
  3. **Day 2:** Training schedule

**Key Features:**
- Event-based trigger (phase change)
- Time delays between emails
- Personalization variables
- One-time per recruit (won't spam)

### 2. Policy Renewal Reminder Campaign
**Purpose:** Ensure policies get renewed before expiration

**How it works:**
- **Trigger:** Runs daily at 9 AM EST
- **Checks:** Finds all policies expiring in 30, 15, or 1 day
- **Actions:** Sends appropriate reminder based on urgency
  1. **30 days out:** Friendly reminder
  2. **15 days out:** Urgent notice with special offer
  3. **1 day out:** Final critical notice

**Key Features:**
- Schedule-based trigger
- Conditional logic (different emails for different timeframes)
- Escalating urgency
- Rate limiting (won't overwhelm recipients)

## Creating Your Own Workflows

### Step 1: Click "+ Create Workflow"
Opens the workflow dialog where you can configure everything

### Step 2: Basic Settings
- **Name:** Make it descriptive (e.g., "Weekly Team Update")
- **Description:** Explain what it does
- **Category:** Choose email, recruiting, commission, or general
- **Trigger Type:**
  - **Manual:** You trigger it yourself
  - **Schedule:** Runs at specific times
  - **Event:** Responds to system events
  - **Webhook:** External systems can trigger

### Step 3: Configure Actions
Each workflow can have multiple actions:

**Email Action Types:**
- `send_email` - Send an email
- `wait` - Delay before next action
- `branch` - Conditional logic
- `update_field` - Update database fields

**Email Configuration:**
```javascript
{
  templateId: "your_template_id",
  subject: "Email Subject Line",
  body: "Email body with {{variables}}",
  delayMinutes: 1440  // Wait 24 hours
}
```

### Step 4: Set Limits
- **Max Runs Per Day:** Prevent runaway workflows
- **Max Runs Per Recipient:** Avoid spamming individuals
- **Cooldown Minutes:** Time between runs
- **Priority:** Higher number = higher priority (1-100)

## Variables and Personalization

Use double curly braces for variables:
- `{{recruit_name}}` - Recruit's name
- `{{policy_number}}` - Policy number
- `{{expiration_date}}` - Expiration date
- `{{agent_name}}` - Agent's name
- Any field from your database

## Conditional Logic

Add conditions to control when actions run:

```javascript
conditions: [
  {
    field: "days_until_expiration",
    operator: "equals",  // equals, not_equals, greater_than, less_than, in
    value: 30
  }
]
```

## Best Practices

### 1. Start Simple
- Create a basic single-email workflow first
- Test it thoroughly
- Then add complexity

### 2. Use Delays Wisely
- Space out emails (don't send all at once)
- Consider time zones
- Respect business hours

### 3. Personalize Content
- Use variables for names, dates, amounts
- Make emails feel personal, not robotic
- Include relevant details

### 4. Set Appropriate Limits
- Limit daily runs to prevent spam
- Use cooldowns between campaigns
- Set per-recipient limits

### 5. Test Before Activating
- Create workflow in "draft" status
- Test with your own email
- Check all conditions work
- Then set to "active"

## Common Use Cases

### Recruiting
- Welcome sequences for new recruits
- Interview reminders
- Document collection follow-ups
- Training schedules
- Phase transition notifications

### Policies
- Renewal reminders
- Payment due notices
- Coverage change notifications
- Annual review reminders
- Lapse warnings

### Commissions
- Payment confirmations
- Chargeback notifications
- Milestone achievements
- Monthly summaries
- Target progress updates

### General
- Birthday greetings
- Holiday messages
- Team updates
- Meeting reminders
- Task assignments

## Workflow Status

- **Draft:** Being created/edited, won't run
- **Active:** Running and processing
- **Paused:** Temporarily stopped
- **Archived:** No longer needed, kept for reference

## Monitoring Your Workflows

### Workflows Tab
- See all your workflows
- Check status at a glance
- Quick actions (pause, edit, delete)

### Recent Runs Tab
- View execution history
- Check success/failure
- See timing and duration
- Debug issues

### Templates Tab
- Pre-built workflows
- Community templates
- Copy and customize

## Troubleshooting

**Workflow not triggering?**
- Check it's set to "active"
- Verify trigger conditions
- Check cooldown periods
- Review max runs limits

**Emails not sending?**
- Verify email templates exist
- Check recipient data
- Review email queue
- Check for errors in Recent Runs

**Wrong recipients?**
- Review conditions
- Check your queries
- Test with smaller group first

## Advanced Features

### Branching Logic
Create different paths based on conditions:
- Send different emails based on amount
- Skip steps if conditions aren't met
- Route to different sequences

### Webhook Integration
- Trigger workflows from external systems
- Send data to other services
- Integrate with Zapier/Make

### Bulk Operations
- Process multiple records at once
- Batch email sends
- Scheduled bulk updates

## Security & Compliance

- All workflows respect user permissions
- Rate limiting prevents abuse
- Audit trail for all executions
- GDPR-compliant unsubscribe handling

---

## Next Steps

1. **Review the examples** in your Workflows tab
2. **Create a simple test workflow** (try a single welcome email)
3. **Add complexity gradually** (delays, conditions, multiple emails)
4. **Monitor performance** in Recent Runs
5. **Iterate and improve** based on results

Remember: Start simple, test thoroughly, then scale up!