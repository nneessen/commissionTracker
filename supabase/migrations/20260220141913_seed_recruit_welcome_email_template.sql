-- supabase/migrations/20260220141913_seed_recruit_welcome_email_template.sql
-- Seed a global block-based welcome email template for new recruits.
-- Trainers can send this after a recruit's account is set up.

INSERT INTO email_templates (
  name,
  subject,
  body_html,
  body_text,
  variables,
  category,
  is_global,
  is_active,
  created_by,
  blocks,
  is_block_template
)
SELECT
  'recruit_welcome_pipeline',
  'Welcome to The Standard HQ, {{recruit_first_name}}!',
  -- body_html: pre-compiled to match blocksToHtml() output
  $$<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 13px;
      line-height: 1.5;
      color: #374151;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    .email-container {
      max-width: 480px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    img {
      max-width: 100%;
      height: auto;
    }
    p {
      margin: 0 0 0.75em 0;
      font-size: 13px;
    }
    p:last-child {
      margin-bottom: 0;
    }
    h1, h2, h3 {
      margin: 0 0 0.5em 0;
    }
    table {
      border-collapse: collapse;
    }
    a {
      color: inherit;
    }
  </style>
</head>
<body>
  <div class="email-container">
        <div style="background-color: #18181b; color: #ffffff; padding: 32px 24px; text-align: center">
          <h1 style="margin: 0; font-weight: bold;">Welcome to The Standard HQ</h1>
        </div>
      <div style="height: 12px;"></div><div style="padding: 0 24px"><p>Hi {{recruit_first_name}},</p><p>Congratulations on taking the next step in your career! Your account on The Standard HQ is now set up and ready for you.</p><p>Your recruiter, {{recruiter_name}}, has enrolled you in a training pipeline. Here's what you need to know:</p></div><div style="padding: 0 24px"><ul style="margin: 0 0 0.75em 0; padding-left: 20px;"><li><strong>Follow the instructions carefully.</strong> Each phase has specific tasks to get you fully prepared.</li><li><strong>Complete items in real time</strong> as you finish them — don't wait to mark them off later.</li><li><strong>Notifications are automatic.</strong> When you complete a checklist item, your trainer and managers are notified immediately.</li></ul></div>
        <div style="padding: 16px 24px; text-align: center">
          <a href="https://thestandardhq.com" style="display: inline-block; width: auto; padding: 12px 24px; background-color: #18181b; color: #ffffff; text-decoration: none; border: none; border-radius: 6px; font-weight: 500; text-align: center; box-sizing: border-box;">Go to Your Pipeline</a>
        </div>
      <div style="padding: 8px 0;"><hr style="border: none; border-top: 1px solid #e5e7eb; margin: 0 16px;" /></div><div style="color: #71717a; font-size: 12px; padding: 0 24px"><p>Once you officially graduate from bootcamp, thestandardhq.com will be fully available for you to set up and use as a licensed agent — including commission tracking, client management, and all platform features.</p></div>
        <div style="color: #71717a; padding: 16px 24px; text-align: center; font-size: 12px;">
          <p style="margin: 0; white-space: pre-wrap;">Sent by {{sender_name}} via The Standard HQ.
Questions? Reply directly to this email.</p>
        </div>
      </div>
</body>
</html>$$,
  -- body_text: plain text fallback
  $$Welcome to The Standard HQ

Hi {{recruit_first_name}},

Congratulations on taking the next step in your career! Your account on The Standard HQ is now set up and ready for you.

Your recruiter, {{recruiter_name}}, has enrolled you in a training pipeline. Here's what you need to know:

- Follow the instructions carefully. Each phase has specific tasks to get you fully prepared.
- Complete items in real time as you finish them — don't wait to mark them off later.
- Notifications are automatic. When you complete a checklist item, your trainer and managers are notified immediately.

Go to your pipeline: https://thestandardhq.com

---

Once you officially graduate from bootcamp, thestandardhq.com will be fully available for you to set up and use as a licensed agent — including commission tracking, client management, and all platform features.

This email was sent by {{sender_name}} via The Standard HQ.
Questions? Reply directly to this email.$$,
  ARRAY['recruit_first_name', 'recruiter_name', 'sender_name'],
  'onboarding',
  true,
  true,
  NULL,
  -- blocks: JSON for the visual block builder
  $$[
    {
      "id": "blk_welcome_1",
      "type": "header",
      "content": { "title": "Welcome to The Standard HQ", "showLogo": false },
      "styles": { "backgroundColor": "#18181b", "textColor": "#ffffff", "padding": "32px 24px", "alignment": "center" }
    },
    {
      "id": "blk_welcome_2",
      "type": "spacer",
      "content": { "height": 12 },
      "styles": {}
    },
    {
      "id": "blk_welcome_3",
      "type": "text",
      "content": { "html": "<p>Hi {{recruit_first_name}},</p><p>Congratulations on taking the next step in your career! Your account on The Standard HQ is now set up and ready for you.</p><p>Your recruiter, {{recruiter_name}}, has enrolled you in a training pipeline. Here's what you need to know:</p>" },
      "styles": { "padding": "0 24px" }
    },
    {
      "id": "blk_welcome_4",
      "type": "text",
      "content": { "html": "<ul style=\"margin: 0 0 0.75em 0; padding-left: 20px;\"><li><strong>Follow the instructions carefully.</strong> Each phase has specific tasks to get you fully prepared.</li><li><strong>Complete items in real time</strong> as you finish them — don't wait to mark them off later.</li><li><strong>Notifications are automatic.</strong> When you complete a checklist item, your trainer and managers are notified immediately.</li></ul>" },
      "styles": { "padding": "0 24px" }
    },
    {
      "id": "blk_welcome_5",
      "type": "button",
      "content": { "text": "Go to Your Pipeline", "url": "https://thestandardhq.com", "variant": "solid", "buttonColor": "#18181b", "textColor": "#ffffff", "fullWidth": false },
      "styles": { "padding": "16px 24px", "alignment": "center" }
    },
    {
      "id": "blk_welcome_6",
      "type": "divider",
      "content": { "color": "#e5e7eb", "thickness": 1, "style": "solid" },
      "styles": {}
    },
    {
      "id": "blk_welcome_7",
      "type": "text",
      "content": { "html": "<p>Once you officially graduate from bootcamp, thestandardhq.com will be fully available for you to set up and use as a licensed agent — including commission tracking, client management, and all platform features.</p>" },
      "styles": { "padding": "0 24px", "fontSize": "12px", "textColor": "#71717a" }
    },
    {
      "id": "blk_welcome_8",
      "type": "footer",
      "content": { "text": "Sent by {{sender_name}} via The Standard HQ.\nQuestions? Reply directly to this email.", "showUnsubscribe": false },
      "styles": { "padding": "16px 24px", "textColor": "#71717a", "alignment": "center" }
    }
  ]$$::jsonb,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM email_templates WHERE name = 'recruit_welcome_pipeline'
);
