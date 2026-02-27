-- Fix: ai_chat_bot addon has is_active = NULL because the original seed migration
-- (20260225214620) omitted the is_active column. NULL is falsy in both SQL and JS,
-- causing ChatBotLanding.tsx and manage-subscription-items to reject the addon.

UPDATE subscription_addons
SET is_active = true, updated_at = now()
WHERE name = 'ai_chat_bot' AND (is_active IS NULL OR is_active = false);
