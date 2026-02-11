-- Fix 11 policies with incorrect submit_date (set to effective_date instead of created_at)
-- This is the final batch; future policies won't have this issue.

UPDATE policies
SET submit_date = created_at::date,
    updated_at = now()
WHERE id IN (
  'a0f7aa85-33ab-4a6b-bfdb-2c3e4b5e6b1c',
  'b051abaf-05ce-43fc-a7d6-0d8b57ef2fb8',
  'cd1109c3-ab19-4099-9ef7-eb983c001260',
  'fae04d2b-4dbe-450a-9a95-a50552320c91',
  '8f4f5951-4513-419a-8be6-c98288c35e33',
  '9aecbda2-d130-4059-8a44-a8c12a961a87',
  'b2631c35-de7c-465c-8efb-6f5edf2f19cf',
  '764e57d4-135f-4037-9fcc-10eb213bf196',
  '2b0f2b0d-3fae-4a70-9379-f4453a47e835',
  'b1e01b96-1c4f-43cd-935b-b01da5c86a72',
  '853dd8c0-b478-4406-8d83-9581555228eb'
);
