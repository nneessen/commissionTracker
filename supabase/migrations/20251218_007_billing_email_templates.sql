-- supabase/migrations/20251218_007_billing_email_templates.sql
-- Seed billing email templates for subscription system

-- First, add unique constraint on name if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'email_templates_name_unique'
  ) THEN
    ALTER TABLE email_templates ADD CONSTRAINT email_templates_name_unique UNIQUE (name);
  END IF;
END $$;

-- Now insert templates with proper handling
INSERT INTO email_templates (name, subject, body_html, body_text, category, is_global, is_active, variables)
SELECT
  'subscription_welcome',
  'Welcome to {{plan_name}} - Your Subscription is Active',
  '<div style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #18181b; font-size: 24px; margin-bottom: 20px;">Welcome to {{plan_name}}!</h1>
    <p style="color: #3f3f46; font-size: 16px; line-height: 1.6;">Hi {{first_name}},</p>
    <p style="color: #3f3f46; font-size: 16px; line-height: 1.6;">Thank you for subscribing to {{plan_name}}. Your subscription is now active and you have access to all the features included in your plan.</p>
    <div style="background: #f4f4f5; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h2 style="color: #18181b; font-size: 18px; margin: 0 0 12px 0;">Subscription Details</h2>
      <p style="color: #3f3f46; margin: 8px 0;"><strong>Plan:</strong> {{plan_name}}</p>
      <p style="color: #3f3f46; margin: 8px 0;"><strong>Amount:</strong> {{amount}}/{{billing_interval}}</p>
      <p style="color: #3f3f46; margin: 8px 0;"><strong>Next Billing Date:</strong> {{next_billing_date}}</p>
    </div>
    <p style="color: #3f3f46; font-size: 16px; line-height: 1.6;">You can manage your subscription anytime from your account settings.</p>
    <p style="color: #71717a; font-size: 14px; margin-top: 30px;">If you have any questions, please reply to this email.</p>
  </div>',
  'Welcome to {{plan_name}}!

Hi {{first_name}},

Thank you for subscribing to {{plan_name}}. Your subscription is now active.

Subscription Details:
- Plan: {{plan_name}}
- Amount: {{amount}}/{{billing_interval}}
- Next Billing Date: {{next_billing_date}}

You can manage your subscription anytime from your account settings.',
  'billing',
  true,
  true,
  ARRAY['first_name', 'plan_name', 'amount', 'billing_interval', 'next_billing_date']
WHERE NOT EXISTS (SELECT 1 FROM email_templates WHERE name = 'subscription_welcome');

INSERT INTO email_templates (name, subject, body_html, body_text, category, is_global, is_active, variables)
SELECT
  'payment_receipt',
  'Payment Receipt - {{amount}} for {{plan_name}}',
  '<div style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #18181b; font-size: 24px; margin-bottom: 20px;">Payment Receipt</h1>
    <p style="color: #3f3f46; font-size: 16px; line-height: 1.6;">Hi {{first_name}},</p>
    <p style="color: #3f3f46; font-size: 16px; line-height: 1.6;">We received your payment of <strong>{{amount}}</strong> for {{plan_name}}.</p>
    <div style="background: #f4f4f5; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h2 style="color: #18181b; font-size: 18px; margin: 0 0 12px 0;">Receipt Details</h2>
      <p style="color: #3f3f46; margin: 8px 0;"><strong>Amount:</strong> {{amount}}</p>
      <p style="color: #3f3f46; margin: 8px 0;"><strong>Date:</strong> {{payment_date}}</p>
      <p style="color: #3f3f46; margin: 8px 0;"><strong>Payment Method:</strong> {{card_brand}} ending in {{card_last_four}}</p>
      <p style="color: #3f3f46; margin: 8px 0;"><strong>Invoice #:</strong> {{invoice_id}}</p>
    </div>
    <p style="margin: 20px 0;"><a href="{{receipt_url}}" style="display: inline-block; background: #18181b; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500;">View Full Receipt</a></p>
    <p style="color: #71717a; font-size: 14px; margin-top: 30px;">Thank you for your business!</p>
  </div>',
  'Payment Receipt

Hi {{first_name}},

We received your payment of {{amount}} for {{plan_name}}.

Receipt Details:
- Amount: {{amount}}
- Date: {{payment_date}}
- Payment Method: {{card_brand}} ending in {{card_last_four}}
- Invoice #: {{invoice_id}}

View receipt: {{receipt_url}}

Thank you for your business!',
  'billing',
  true,
  true,
  ARRAY['first_name', 'amount', 'plan_name', 'payment_date', 'card_brand', 'card_last_four', 'invoice_id', 'receipt_url']
WHERE NOT EXISTS (SELECT 1 FROM email_templates WHERE name = 'payment_receipt');

INSERT INTO email_templates (name, subject, body_html, body_text, category, is_global, is_active, variables)
SELECT
  'payment_failed',
  'Action Required: Payment Failed for {{plan_name}}',
  '<div style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #dc2626; font-size: 24px; margin-bottom: 20px;">Payment Failed</h1>
    <p style="color: #3f3f46; font-size: 16px; line-height: 1.6;">Hi {{first_name}},</p>
    <p style="color: #3f3f46; font-size: 16px; line-height: 1.6;">We were unable to process your payment of <strong>{{amount}}</strong> for your {{plan_name}} subscription.</p>
    <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <p style="color: #991b1b; margin: 0;"><strong>What to do:</strong> Please update your payment method to avoid interruption to your service.</p>
    </div>
    <p style="margin: 20px 0;"><a href="{{update_payment_url}}" style="display: inline-block; background: #18181b; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500;">Update Payment Method</a></p>
    <p style="color: #3f3f46; font-size: 16px; line-height: 1.6;">We will retry the payment in a few days. If payment continues to fail, your subscription will be paused.</p>
    <p style="color: #71717a; font-size: 14px; margin-top: 30px;">Need help? Reply to this email.</p>
  </div>',
  'Payment Failed

Hi {{first_name}},

We were unable to process your payment of {{amount}} for your {{plan_name}} subscription.

Please update your payment method: {{update_payment_url}}

We will retry the payment in a few days.',
  'billing',
  true,
  true,
  ARRAY['first_name', 'amount', 'plan_name', 'update_payment_url']
WHERE NOT EXISTS (SELECT 1 FROM email_templates WHERE name = 'payment_failed');

INSERT INTO email_templates (name, subject, body_html, body_text, category, is_global, is_active, variables)
SELECT
  'subscription_cancelled',
  'Your {{plan_name}} Subscription Has Been Cancelled',
  '<div style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #18181b; font-size: 24px; margin-bottom: 20px;">Subscription Cancelled</h1>
    <p style="color: #3f3f46; font-size: 16px; line-height: 1.6;">Hi {{first_name}},</p>
    <p style="color: #3f3f46; font-size: 16px; line-height: 1.6;">Your {{plan_name}} subscription has been cancelled as requested.</p>
    <div style="background: #f4f4f5; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <p style="color: #3f3f46; margin: 0;"><strong>You still have access until:</strong> {{access_until_date}}</p>
    </div>
    <p style="color: #3f3f46; font-size: 16px; line-height: 1.6;">After this date, you will be moved to the Free plan.</p>
    <p style="color: #71717a; font-size: 14px; margin-top: 30px;">Changed your mind? Resubscribe anytime from your account settings.</p>
  </div>',
  'Subscription Cancelled

Hi {{first_name}},

Your {{plan_name}} subscription has been cancelled.

You still have access until: {{access_until_date}}

After this date, you will be moved to the Free plan.',
  'billing',
  true,
  true,
  ARRAY['first_name', 'plan_name', 'access_until_date']
WHERE NOT EXISTS (SELECT 1 FROM email_templates WHERE name = 'subscription_cancelled');

INSERT INTO email_templates (name, subject, body_html, body_text, category, is_global, is_active, variables)
SELECT
  'subscription_renewed',
  'Your {{plan_name}} Subscription Has Been Renewed',
  '<div style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #18181b; font-size: 24px; margin-bottom: 20px;">Subscription Renewed</h1>
    <p style="color: #3f3f46; font-size: 16px; line-height: 1.6;">Hi {{first_name}},</p>
    <p style="color: #3f3f46; font-size: 16px; line-height: 1.6;">Your {{plan_name}} subscription has been successfully renewed.</p>
    <div style="background: #f4f4f5; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <p style="color: #3f3f46; margin: 8px 0;"><strong>Amount Charged:</strong> {{amount}}</p>
      <p style="color: #3f3f46; margin: 8px 0;"><strong>Next Renewal:</strong> {{next_billing_date}}</p>
    </div>
    <p style="color: #3f3f46; font-size: 16px; line-height: 1.6;">Thank you for continuing to use our service!</p>
  </div>',
  'Subscription Renewed

Hi {{first_name}},

Your {{plan_name}} subscription has been renewed.

Amount Charged: {{amount}}
Next Renewal: {{next_billing_date}}

Thank you!',
  'billing',
  true,
  true,
  ARRAY['first_name', 'plan_name', 'amount', 'next_billing_date']
WHERE NOT EXISTS (SELECT 1 FROM email_templates WHERE name = 'subscription_renewed');

INSERT INTO email_templates (name, subject, body_html, body_text, category, is_global, is_active, variables)
SELECT
  'grandfather_expiring',
  'Your Free {{plan_name}} Access Expires in {{days_remaining}} Days',
  '<div style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #f59e0b; font-size: 24px; margin-bottom: 20px;">Your Free Access is Expiring Soon</h1>
    <p style="color: #3f3f46; font-size: 16px; line-height: 1.6;">Hi {{first_name}},</p>
    <p style="color: #3f3f46; font-size: 16px; line-height: 1.6;">Your complimentary {{plan_name}} access will expire in <strong>{{days_remaining}} days</strong>.</p>
    <div style="background: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <p style="color: #92400e; margin: 0;">After expiration, you will move to the Free plan and lose access to features like {{lost_features}}.</p>
    </div>
    <p style="color: #3f3f46; font-size: 16px; line-height: 1.6;">Subscribe now to keep all your {{plan_name}} features at just <strong>{{price}}/month</strong>.</p>
    <p style="margin: 20px 0;"><a href="{{subscribe_url}}" style="display: inline-block; background: #18181b; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500;">Subscribe Now</a></p>
  </div>',
  'Your Free Access is Expiring Soon

Hi {{first_name}},

Your complimentary {{plan_name}} access will expire in {{days_remaining}} days.

After expiration, you will move to the Free plan and lose access to features like {{lost_features}}.

Subscribe now to keep all your {{plan_name}} features at just {{price}}/month.

Subscribe here: {{subscribe_url}}',
  'billing',
  true,
  true,
  ARRAY['first_name', 'plan_name', 'days_remaining', 'lost_features', 'price', 'subscribe_url']
WHERE NOT EXISTS (SELECT 1 FROM email_templates WHERE name = 'grandfather_expiring');
