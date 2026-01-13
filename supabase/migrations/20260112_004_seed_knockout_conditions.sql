-- supabase/migrations/20260112_004_seed_knockout_conditions.sql
-- Seed knockout health conditions that can be referenced by rule sets

INSERT INTO underwriting_health_conditions (code, name, category, follow_up_schema, risk_weight, sort_order, is_active)
VALUES
  ('aids_hiv', 'AIDS/HIV', 'knockout', '{}', 10, 1, true),
  ('als', 'ALS (Lou Gehrig''s Disease)', 'knockout', '{}', 10, 2, true),
  ('alzheimers', 'Alzheimer''s Disease', 'knockout', '{}', 10, 3, true),
  ('organ_transplant_waiting', 'Awaiting Organ Transplant', 'knockout', '{}', 10, 4, true),
  ('dialysis', 'Currently on Dialysis', 'knockout', '{}', 10, 5, true),
  ('hospice', 'Hospice Care', 'knockout', '{}', 10, 6, true),
  ('intravenous_drug_use', 'IV Drug Use (Current)', 'knockout', '{}', 10, 7, true),
  ('metastatic_cancer', 'Metastatic Cancer', 'knockout', '{}', 10, 8, true),
  ('oxygen_therapy', 'Continuous Oxygen Therapy', 'knockout', '{}', 10, 9, true),
  ('wheelchair_bound', 'Wheelchair Bound', 'knockout', '{}', 9, 10, true),
  ('dementia', 'Dementia', 'knockout', '{}', 10, 11, true),
  ('parkinsons_advanced', 'Advanced Parkinson''s Disease', 'knockout', '{}', 10, 12, true),
  ('stroke_recent', 'Stroke (within 12 months)', 'knockout', '{}', 8, 13, true),
  ('heart_attack_recent', 'Heart Attack (within 12 months)', 'knockout', '{}', 8, 14, true),
  ('substance_abuse_active', 'Active Substance Abuse', 'knockout', '{}', 10, 15, true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  risk_weight = EXCLUDED.risk_weight,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active;
