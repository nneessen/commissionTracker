-- supabase/migrations/20260220150110_seed_bootcamp_graduation_email_template.sql
-- Seed a global block-based graduation email template for bootcamp completers.
-- Trainers can send this when a recruit graduates and gains full platform access.

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
  'bootcamp_graduation',
  'Congratulations, {{recruit_first_name}} — You''ve Graduated!',
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
          <h1 style="margin: 0; font-weight: bold;">You Did It!</h1>
        </div>
      <div style="height: 12px;"></div><div style="padding: 0 24px"><p>Hi {{recruit_first_name}},</p><p>Congratulations on graduating bootcamp! Your hard work has paid off, and you now have full access to The Standard HQ as a licensed agent.</p><p>Here's what's now available to you:</p></div><div style="padding: 0 24px"><ul style="margin: 0 0 0.75em 0; padding-left: 20px;"><li><strong>Commission tracking</strong> — log and monitor every policy and payout.</li><li><strong>Client management</strong> — organize your book of business in one place.</li><li><strong>Pipeline & reporting tools</strong> — track your activity and performance.</li><li><strong>All platform features</strong> — everything The Standard HQ has to offer.</li></ul></div>
        <div style="padding: 16px 24px; text-align: center">
          <a href="https://thestandardhq.com" style="display: inline-block; width: auto; padding: 12px 24px; background-color: #18181b; color: #ffffff; text-decoration: none; border: none; border-radius: 6px; font-weight: 500; text-align: center; box-sizing: border-box;">Log In & Get Started</a>
        </div>
      <div style="padding: 8px 0;"><hr style="border: none; border-top: 1px solid #e5e7eb; margin: 0 16px;" /></div><div style="color: #71717a; font-size: 12px; padding: 0 24px"><p>Your recruiter, {{recruiter_name}}, and the rest of the team are here to support you as you build your business. Don't hesitate to reach out if you need anything.</p></div>
        <div style="color: #71717a; padding: 16px 24px; text-align: center; font-size: 12px;">
          <p style="margin: 0; white-space: pre-wrap;">Sent by {{sender_name}} via The Standard HQ.
Questions? Reply directly to this email.</p>
        </div>
      </div>
</body>
</html>$$,
  -- body_text: plain text fallback
  $$You Did It!

Hi {{recruit_first_name}},

Congratulations on graduating bootcamp! Your hard work has paid off, and you now have full access to The Standard HQ as a licensed agent.

Here's what's now available to you:

- Commission tracking — log and monitor every policy and payout.
- Client management — organize your book of business in one place.
- Pipeline & reporting tools — track your activity and performance.
- All platform features — everything The Standard HQ has to offer.

Log in and get started: https://thestandardhq.com

---

Your recruiter, {{recruiter_name}}, and the rest of the team are here to support you as you build your business. Don't hesitate to reach out if you need anything.

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
      "id": "blk_grad_1",
      "type": "header",
      "content": { "title": "You Did It!", "showLogo": false },
      "styles": { "backgroundColor": "#18181b", "textColor": "#ffffff", "padding": "32px 24px", "alignment": "center" }
    },
    {
      "id": "blk_grad_2",
      "type": "spacer",
      "content": { "height": 12 },
      "styles": {}
    },
    {
      "id": "blk_grad_3",
      "type": "text",
      "content": { "html": "<p>Hi {{recruit_first_name}},</p><p>Congratulations on graduating bootcamp! Your hard work has paid off, and you now have full access to The Standard HQ as a licensed agent.</p><p>Here's what's now available to you:</p>" },
      "styles": { "padding": "0 24px" }
    },
    {
      "id": "blk_grad_4",
      "type": "text",
      "content": { "html": "<ul style=\"margin: 0 0 0.75em 0; padding-left: 20px;\"><li><strong>Commission tracking</strong> — log and monitor every policy and payout.</li><li><strong>Client management</strong> — organize your book of business in one place.</li><li><strong>Pipeline & reporting tools</strong> — track your activity and performance.</li><li><strong>All platform features</strong> — everything The Standard HQ has to offer.</li></ul>" },
      "styles": { "padding": "0 24px" }
    },
    {
      "id": "blk_grad_5",
      "type": "button",
      "content": { "text": "Log In & Get Started", "url": "https://thestandardhq.com", "variant": "solid", "buttonColor": "#18181b", "textColor": "#ffffff", "fullWidth": false },
      "styles": { "padding": "16px 24px", "alignment": "center" }
    },
    {
      "id": "blk_grad_6",
      "type": "divider",
      "content": { "color": "#e5e7eb", "thickness": 1, "style": "solid" },
      "styles": {}
    },
    {
      "id": "blk_grad_7",
      "type": "text",
      "content": { "html": "<p>Your recruiter, {{recruiter_name}}, and the rest of the team are here to support you as you build your business. Don't hesitate to reach out if you need anything.</p>" },
      "styles": { "padding": "0 24px", "fontSize": "12px", "textColor": "#71717a" }
    },
    {
      "id": "blk_grad_8",
      "type": "footer",
      "content": { "text": "Sent by {{sender_name}} via The Standard HQ.\nQuestions? Reply directly to this email.", "showUnsubscribe": false },
      "styles": { "padding": "16px 24px", "textColor": "#71717a", "alignment": "center" }
    }
  ]$$::jsonb,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM email_templates WHERE name = 'bootcamp_graduation'
);
