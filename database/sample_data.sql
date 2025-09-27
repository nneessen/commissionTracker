-- /home/nneessen/projects/commissionTracker/database/sample_data.sql
-- Sample data for testing and development
-- High-performance commission tracking application

-- =============================================================================
-- SAMPLE AGENTS
-- =============================================================================

INSERT INTO agents (name, email, phone, contract_comp_level, license_number, license_states, hire_date, is_active) VALUES
  ('John Smith', 'john.smith@example.com', '555-123-4567', 100, 'INS123456', '{"TX", "CA", "FL"}', '2023-01-15', true),
  ('Sarah Johnson', 'sarah.johnson@example.com', '555-234-5678', 110, 'INS234567', '{"NY", "NJ", "PA"}', '2022-06-01', true),
  ('Mike Davis', 'mike.davis@example.com', '555-345-6789', 125, 'INS345678', '{"IL", "WI", "IN"}', '2021-03-20', true),
  ('Lisa Wilson', 'lisa.wilson@example.com', '555-456-7890', 95, 'INS456789', '{"GA", "SC", "NC"}', '2023-08-10', true),
  ('Robert Brown', 'robert.brown@example.com', '555-567-8901', 135, 'INS567890', '{"AZ", "NV", "UT"}', '2020-11-05', true);

-- =============================================================================
-- SAMPLE COMP GUIDE DATA
-- =============================================================================

-- Get carrier IDs for comp guide entries
DO $$
DECLARE
  baltimore_id UUID;
  royal_id UUID;
  uhl_id UUID;
  fg_id UUID;
  moo_id UUID;
BEGIN
  SELECT id INTO baltimore_id FROM carriers WHERE name = 'Baltimore Life';
  SELECT id INTO royal_id FROM carriers WHERE name = 'Royal Neighbors';
  SELECT id INTO uhl_id FROM carriers WHERE name = 'United Home Life';
  SELECT id INTO fg_id FROM carriers WHERE name = 'F&G';
  SELECT id INTO moo_id FROM carriers WHERE name = 'Mutual of Omaha';

  -- Baltimore Life comp guide
  INSERT INTO comp_guide (carrier_id, product_name, contract_level, commission_percentage, first_year_percentage, renewal_percentage, effective_date) VALUES
    (baltimore_id, 'Whole Life Premier', 80, 70.00, 70.00, 5.00, '2024-01-01'),
    (baltimore_id, 'Whole Life Premier', 90, 80.00, 80.00, 5.50, '2024-01-01'),
    (baltimore_id, 'Whole Life Premier', 100, 90.00, 90.00, 6.00, '2024-01-01'),
    (baltimore_id, 'Whole Life Premier', 110, 100.00, 100.00, 6.50, '2024-01-01'),
    (baltimore_id, 'Whole Life Premier', 120, 110.00, 110.00, 7.00, '2024-01-01'),
    (baltimore_id, 'Whole Life Premier', 130, 120.00, 120.00, 7.50, '2024-01-01'),
    (baltimore_id, 'Whole Life Premier', 140, 130.00, 130.00, 8.00, '2024-01-01'),

    (baltimore_id, 'Term Life 20', 80, 45.00, 45.00, 3.00, '2024-01-01'),
    (baltimore_id, 'Term Life 20', 90, 52.00, 52.00, 3.50, '2024-01-01'),
    (baltimore_id, 'Term Life 20', 100, 60.00, 60.00, 4.00, '2024-01-01'),
    (baltimore_id, 'Term Life 20', 110, 68.00, 68.00, 4.50, '2024-01-01'),
    (baltimore_id, 'Term Life 20', 120, 75.00, 75.00, 5.00, '2024-01-01'),
    (baltimore_id, 'Term Life 20', 130, 82.00, 82.00, 5.50, '2024-01-01'),
    (baltimore_id, 'Term Life 20', 140, 90.00, 90.00, 6.00, '2024-01-01');

  -- Royal Neighbors comp guide
  INSERT INTO comp_guide (carrier_id, product_name, contract_level, commission_percentage, first_year_percentage, renewal_percentage, effective_date) VALUES
    (royal_id, 'Whole Life Advantage', 80, 75.00, 75.00, 5.00, '2024-01-01'),
    (royal_id, 'Whole Life Advantage', 90, 85.00, 85.00, 5.50, '2024-01-01'),
    (royal_id, 'Whole Life Advantage', 100, 95.00, 95.00, 6.00, '2024-01-01'),
    (royal_id, 'Whole Life Advantage', 110, 105.00, 105.00, 6.50, '2024-01-01'),
    (royal_id, 'Whole Life Advantage', 120, 115.00, 115.00, 7.00, '2024-01-01'),
    (royal_id, 'Whole Life Advantage', 130, 125.00, 125.00, 7.50, '2024-01-01'),
    (royal_id, 'Whole Life Advantage', 140, 135.00, 135.00, 8.00, '2024-01-01'),

    (royal_id, 'Universal Life Plus', 80, 65.00, 65.00, 4.00, '2024-01-01'),
    (royal_id, 'Universal Life Plus', 90, 74.00, 74.00, 4.50, '2024-01-01'),
    (royal_id, 'Universal Life Plus', 100, 83.00, 83.00, 5.00, '2024-01-01'),
    (royal_id, 'Universal Life Plus', 110, 92.00, 92.00, 5.50, '2024-01-01'),
    (royal_id, 'Universal Life Plus', 120, 101.00, 101.00, 6.00, '2024-01-01'),
    (royal_id, 'Universal Life Plus', 130, 110.00, 110.00, 6.50, '2024-01-01'),
    (royal_id, 'Universal Life Plus', 140, 119.00, 119.00, 7.00, '2024-01-01');

  -- F&G comp guide
  INSERT INTO comp_guide (carrier_id, product_name, contract_level, commission_percentage, first_year_percentage, renewal_percentage, effective_date) VALUES
    (fg_id, 'Indexed Universal Life', 80, 80.00, 80.00, 4.50, '2024-01-01'),
    (fg_id, 'Indexed Universal Life', 90, 90.00, 90.00, 5.00, '2024-01-01'),
    (fg_id, 'Indexed Universal Life', 100, 100.00, 100.00, 5.50, '2024-01-01'),
    (fg_id, 'Indexed Universal Life', 110, 110.00, 110.00, 6.00, '2024-01-01'),
    (fg_id, 'Indexed Universal Life', 120, 120.00, 120.00, 6.50, '2024-01-01'),
    (fg_id, 'Indexed Universal Life', 130, 130.00, 130.00, 7.00, '2024-01-01'),
    (fg_id, 'Indexed Universal Life', 140, 140.00, 140.00, 7.50, '2024-01-01');

END $$;

-- =============================================================================
-- SAMPLE POLICIES
-- =============================================================================

DO $$
DECLARE
  agent1_id UUID;
  agent2_id UUID;
  agent3_id UUID;
  baltimore_id UUID;
  royal_id UUID;
  uhl_id UUID;
  fg_id UUID;
BEGIN
  SELECT id INTO agent1_id FROM agents WHERE name = 'John Smith';
  SELECT id INTO agent2_id FROM agents WHERE name = 'Sarah Johnson';
  SELECT id INTO agent3_id FROM agents WHERE name = 'Mike Davis';

  SELECT id INTO baltimore_id FROM carriers WHERE name = 'Baltimore Life';
  SELECT id INTO royal_id FROM carriers WHERE name = 'Royal Neighbors';
  SELECT id INTO uhl_id FROM carriers WHERE name = 'United Home Life';
  SELECT id INTO fg_id FROM carriers WHERE name = 'F&G';

  -- Sample policies
  INSERT INTO policies (policy_number, status, agent_id, carrier_id, client_name, client_state, client_age, client_email, product_name, product_type, effective_date, expiration_date, term_length_years, annual_premium, payment_frequency, notes) VALUES
    ('POL-2024-001', 'active', agent1_id, baltimore_id, 'Robert Johnson', 'TX', 35, 'robert.j@email.com', 'Whole Life Premier', 'whole_life', '2024-01-15', '2074-01-15', 50, 5000.00, 'annual', 'High net worth client'),
    ('POL-2024-002', 'active', agent1_id, royal_id, 'Mary Smith', 'TX', 42, 'mary.smith@email.com', 'Whole Life Advantage', 'whole_life', '2024-02-01', '2074-02-01', 50, 7500.00, 'quarterly', 'Referred by existing client'),
    ('POL-2024-003', 'active', agent2_id, baltimore_id, 'David Wilson', 'NY', 28, 'david.w@email.com', 'Term Life 20', 'term_life', '2024-02-15', '2044-02-15', 20, 1200.00, 'monthly', 'Young professional'),
    ('POL-2024-004', 'active', agent2_id, fg_id, 'Lisa Garcia', 'NY', 39, 'lisa.garcia@email.com', 'Indexed Universal Life', 'indexed_universal_life', '2024-03-01', '2074-03-01', 50, 8500.00, 'annual', 'Investment focused'),
    ('POL-2024-005', 'pending', agent3_id, uhl_id, 'Michael Brown', 'IL', 45, 'michael.b@email.com', 'Universal Life Plus', 'universal_life', '2024-03-15', '2074-03-15', 50, 6200.00, 'semi-annual', 'Application in underwriting'),
    ('POL-2024-006', 'active', agent1_id, baltimore_id, 'Jennifer Davis', 'TX', 33, 'jennifer.d@email.com', 'Term Life 20', 'term_life', '2024-01-30', '2044-01-30', 20, 900.00, 'monthly', 'New parent coverage'),
    ('POL-2024-007', 'active', agent3_id, royal_id, 'Thomas Miller', 'IL', 50, 'thomas.m@email.com', 'Whole Life Advantage', 'whole_life', '2024-02-20', '2074-02-20', 50, 12000.00, 'annual', 'Executive coverage'),
    ('POL-2023-050', 'lapsed', agent2_id, baltimore_id, 'Susan Taylor', 'NY', 38, 'susan.t@email.com', 'Whole Life Premier', 'whole_life', '2023-06-01', '2073-06-01', 50, 4500.00, 'quarterly', 'Client moved out of state');

END $$;

-- =============================================================================
-- SAMPLE COMMISSIONS
-- =============================================================================

DO $$
DECLARE
  agent1_id UUID;
  agent2_id UUID;
  agent3_id UUID;
  baltimore_id UUID;
  royal_id UUID;
  uhl_id UUID;
  fg_id UUID;
  policy1_id UUID;
  policy2_id UUID;
  policy3_id UUID;
  policy4_id UUID;
  policy6_id UUID;
  policy7_id UUID;
  policy8_id UUID;
BEGIN
  SELECT id INTO agent1_id FROM agents WHERE name = 'John Smith';
  SELECT id INTO agent2_id FROM agents WHERE name = 'Sarah Johnson';
  SELECT id INTO agent3_id FROM agents WHERE name = 'Mike Davis';

  SELECT id INTO baltimore_id FROM carriers WHERE name = 'Baltimore Life';
  SELECT id INTO royal_id FROM carriers WHERE name = 'Royal Neighbors';
  SELECT id INTO uhl_id FROM carriers WHERE name = 'United Home Life';
  SELECT id INTO fg_id FROM carriers WHERE name = 'F&G';

  SELECT id INTO policy1_id FROM policies WHERE policy_number = 'POL-2024-001';
  SELECT id INTO policy2_id FROM policies WHERE policy_number = 'POL-2024-002';
  SELECT id INTO policy3_id FROM policies WHERE policy_number = 'POL-2024-003';
  SELECT id INTO policy4_id FROM policies WHERE policy_number = 'POL-2024-004';
  SELECT id INTO policy6_id FROM policies WHERE policy_number = 'POL-2024-006';
  SELECT id INTO policy7_id FROM policies WHERE policy_number = 'POL-2024-007';
  SELECT id INTO policy8_id FROM policies WHERE policy_number = 'POL-2023-050';

  -- Sample commissions
  INSERT INTO commissions (policy_id, agent_id, carrier_id, client_name, client_state, client_age, commission_type, status, calculation_basis, product_name, product_type, annual_premium, monthly_premium, advance_months, commission_rate, commission_amount, contract_comp_level, is_auto_calculated, expected_date, actual_date, paid_date, notes) VALUES

    -- John Smith's commissions (100% contract level)
    (policy1_id, agent1_id, baltimore_id, 'Robert Johnson', 'TX', 35, 'first_year', 'paid', 'premium', 'Whole Life Premier', 'whole_life', 5000.00, 416.67, 9, 90.00, 3750.00, 100, true, '2024-02-15', '2024-02-15', '2024-02-20', 'First commission from Baltimore Life'),
    (policy2_id, agent1_id, royal_id, 'Mary Smith', 'TX', 42, 'first_year', 'paid', 'premium', 'Whole Life Advantage', 'whole_life', 7500.00, 625.00, 9, 95.00, 5343.75, 100, true, '2024-03-01', '2024-03-01', '2024-03-05', 'Strong performer'),
    (policy6_id, agent1_id, baltimore_id, 'Jennifer Davis', 'TX', 33, 'first_year', 'expected', 'premium', 'Term Life 20', 'term_life', 900.00, 75.00, 9, 60.00, 405.00, 100, true, '2024-03-30', NULL, NULL, 'Term life commission'),

    -- Sarah Johnson's commissions (110% contract level)
    (policy3_id, agent2_id, baltimore_id, 'David Wilson', 'NY', 28, 'first_year', 'paid', 'premium', 'Term Life 20', 'term_life', 1200.00, 100.00, 9, 68.00, 612.00, 110, true, '2024-03-15', '2024-03-15', '2024-03-18', 'Young professional term'),
    (policy4_id, agent2_id, fg_id, 'Lisa Garcia', 'NY', 39, 'first_year', 'expected', 'premium', 'Indexed Universal Life', 'indexed_universal_life', 8500.00, 708.33, 9, 110.00, 7012.50, 110, true, '2024-04-01', NULL, NULL, 'High value IUL'),

    -- Mike Davis's commissions (125% contract level)
    (policy7_id, agent3_id, royal_id, 'Thomas Miller', 'IL', 50, 'first_year', 'paid', 'premium', 'Whole Life Advantage', 'whole_life', 12000.00, 1000.00, 9, 115.00, 10350.00, 125, true, '2024-03-20', '2024-03-20', '2024-03-25', 'Executive level policy'),

    -- Chargeback example from lapsed policy
    (policy8_id, agent2_id, baltimore_id, 'Susan Taylor', 'NY', 38, 'first_year', 'clawback', 'premium', 'Whole Life Premier', 'whole_life', 4500.00, 375.00, 9, 100.00, 3375.00, 110, true, '2023-07-01', '2023-07-01', '2023-07-05', 'Policy later lapsed - chargeback processed');

END $$;

-- =============================================================================
-- SAMPLE CHARGEBACKS
-- =============================================================================

DO $$
DECLARE
  commission_id UUID;
  policy8_id UUID;
  agent2_id UUID;
  baltimore_id UUID;
BEGIN
  SELECT id INTO policy8_id FROM policies WHERE policy_number = 'POL-2023-050';
  SELECT id INTO agent2_id FROM agents WHERE name = 'Sarah Johnson';
  SELECT id INTO baltimore_id FROM carriers WHERE name = 'Baltimore Life';
  SELECT id INTO commission_id FROM commissions WHERE policy_id = policy8_id;

  -- Sample chargeback for the lapsed policy
  INSERT INTO chargebacks (original_commission_id, policy_id, agent_id, carrier_id, chargeback_type, chargeback_amount, chargeback_reason, policy_lapse_date, chargeback_date, notification_date, status, amount_recovered) VALUES
    (commission_id, policy8_id, agent2_id, baltimore_id, 'policy_lapse', 3375.00, 'Policy lapsed after 8 months - full chargeback required', '2024-02-01', '2024-02-15', '2024-02-10', 'processed', 3375.00);

END $$;

-- =============================================================================
-- SAMPLE EXPENSES
-- =============================================================================

INSERT INTO expenses (name, description, amount, category, subcategory, expense_date, is_tax_deductible, notes) VALUES
  -- Business expenses
  ('CRM Software Subscription', 'Monthly HubSpot CRM subscription', 450.00, 'business', 'software', '2024-01-01', true, 'Essential for lead management'),
  ('Marketing Materials', 'Business cards and brochures printing', 275.00, 'business', 'marketing', '2024-01-15', true, 'Quarterly print run'),
  ('Professional Development', 'Insurance industry conference attendance', 1200.00, 'business', 'education', '2024-02-10', true, 'Annual industry conference'),
  ('Office Supplies', 'Printer paper, pens, folders', 85.00, 'business', 'office', '2024-01-20', true, 'Monthly office supplies'),
  ('Website Hosting', 'Annual website hosting and domain', 180.00, 'business', 'technology', '2024-01-01', true, 'Professional website maintenance'),
  ('Licensing Fees', 'State insurance license renewals', 350.00, 'business', 'licensing', '2024-01-30', true, 'Multi-state license renewal'),
  ('Client Entertainment', 'Lunch meeting with high-value prospect', 125.00, 'business', 'entertainment', '2024-02-05', true, 'Client relationship building'),
  ('Vehicle Expenses', 'Fuel for client meetings', 180.00, 'business', 'transportation', '2024-02-01', true, 'Monthly vehicle expenses'),
  ('Errors & Omissions Insurance', 'Professional liability insurance', 850.00, 'business', 'insurance', '2024-01-01', true, 'Annual E&O premium'),
  ('Lead Generation', 'Facebook ads for lead generation', 500.00, 'business', 'marketing', '2024-02-15', true, 'Digital marketing campaign'),

  -- Personal expenses
  ('Mortgage Payment', 'Monthly mortgage payment', 2800.00, 'personal', 'housing', '2024-01-01', false, 'Primary residence'),
  ('Utilities', 'Electricity, water, gas', 285.00, 'personal', 'utilities', '2024-01-15', false, 'Monthly utilities'),
  ('Groceries', 'Monthly grocery shopping', 650.00, 'personal', 'food', '2024-01-01', false, 'Family groceries'),
  ('Car Payment', 'Monthly auto loan payment', 420.00, 'personal', 'transportation', '2024-01-01', false, 'Personal vehicle'),
  ('Health Insurance', 'Monthly health insurance premium', 380.00, 'personal', 'insurance', '2024-01-01', false, 'Family health plan'),
  ('Cell Phone', 'Monthly cell phone bill', 95.00, 'personal', 'utilities', '2024-01-01', false, 'Personal mobile plan'),
  ('Gym Membership', 'Monthly fitness center membership', 65.00, 'personal', 'health', '2024-01-01', false, 'Personal fitness'),
  ('Dining Out', 'Restaurant meals', 320.00, 'personal', 'food', '2024-01-15', false, 'Entertainment dining'),
  ('Clothing', 'Professional wardrobe update', 450.00, 'personal', 'clothing', '2024-02-01', false, 'Business attire'),
  ('Entertainment', 'Streaming services and entertainment', 75.00, 'personal', 'entertainment', '2024-01-01', false, 'Monthly subscriptions');

-- =============================================================================
-- UPDATE AGENT YTD PERFORMANCE
-- =============================================================================

-- Update agent YTD commission and premium totals based on commissions
UPDATE agents
SET
  ytd_commission = subq.total_commission,
  ytd_premium = subq.total_premium
FROM (
  SELECT
    agent_id,
    SUM(commission_amount) as total_commission,
    SUM(annual_premium) as total_premium
  FROM commissions
  WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
    AND status IN ('paid', 'expected')
  GROUP BY agent_id
) subq
WHERE agents.id = subq.agent_id;

-- =============================================================================
-- REFRESH MATERIALIZED VIEW
-- =============================================================================

REFRESH MATERIALIZED VIEW dashboard_summary;

-- =============================================================================
-- FINAL STATISTICS
-- =============================================================================

-- Show sample data summary
SELECT 'Data Summary' as info;
SELECT COUNT(*) as agent_count FROM agents;
SELECT COUNT(*) as carrier_count FROM carriers;
SELECT COUNT(*) as comp_guide_entries FROM comp_guide;
SELECT COUNT(*) as policy_count FROM policies;
SELECT COUNT(*) as commission_count FROM commissions;
SELECT COUNT(*) as chargeback_count FROM chargebacks;
SELECT COUNT(*) as expense_count FROM expenses;
SELECT COUNT(*) as constant_count FROM constants;