-- Temporary sample data for testing
-- This will be replaced by FFG Comp Guide import

BEGIN;

-- Insert sample carriers
INSERT INTO carriers (id, name, code, created_at, updated_at) VALUES
('11111111-1111-1111-1111-111111111111', 'Mutual of Omaha', 'MOO', NOW(), NOW()),
('22222222-2222-2222-2222-222222222222', 'American General', 'AG', NOW(), NOW()),
('33333333-3333-3333-3333-333333333333', 'Transamerica', 'TRANS', NOW(), NOW()),
('44444444-4444-4444-4444-444444444444', 'North American', 'NAC', NOW(), NOW()),
('55555555-5555-5555-5555-555555555555', 'Family First Life', 'FFL', NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- Insert sample products for each carrier
INSERT INTO products (carrier_id, name, code, product_type, description, commission_percentage, is_active) VALUES
-- Mutual of Omaha products
('11111111-1111-1111-1111-111111111111', 'Living Promise Whole Life', 'MOO-LP-WL', 'whole_life', 'Mutual of Omaha flagship whole life product', 0.75, true),
('11111111-1111-1111-1111-111111111111', 'Term Life Express', 'MOO-TLE', 'term_life', 'Simplified issue term life', 0.50, true),
('11111111-1111-1111-1111-111111111111', 'Income Protection IUL', 'MOO-IUL', 'universal_life', 'Indexed universal life with income protection', 0.65, true),

-- American General products
('22222222-2222-2222-2222-222222222222', 'Select-a-Term', 'AG-SAT', 'term_life', 'Flexible term life insurance', 0.55, true),
('22222222-2222-2222-2222-222222222222', 'Quality of Life Plus', 'AG-QOL', 'universal_life', 'Universal life with living benefits', 0.70, true),
('22222222-2222-2222-2222-222222222222', 'Guaranteed Issue Whole Life', 'AG-GIWL', 'whole_life', 'Guaranteed acceptance whole life', 0.80, true),

-- Transamerica products
('33333333-3333-3333-3333-333333333333', 'Trendsetter Super', 'TRANS-TS', 'term_life', 'Competitive term life product', 0.52, true),
('33333333-3333-3333-3333-333333333333', 'Financial Foundation IUL', 'TRANS-FIUL', 'universal_life', 'Index universal life for wealth building', 0.68, true),
('33333333-3333-3333-3333-333333333333', 'TransChoice WL', 'TRANS-TWL', 'whole_life', 'Traditional whole life insurance', 0.72, true),

-- North American products
('44444444-4444-4444-4444-444444444444', 'ADDvantage Term', 'NAC-ADV', 'term_life', 'Term with accelerated death benefit', 0.54, true),
('44444444-4444-4444-4444-444444444444', 'Builder Plus IUL', 'NAC-BPIUL', 'universal_life', 'IUL for retirement planning', 0.66, true),
('44444444-4444-4444-4444-444444444444', 'Signature Whole Life', 'NAC-SWL', 'whole_life', 'Premium whole life product', 0.78, true),

-- Family First Life products
('55555555-5555-5555-5555-555555555555', 'Family Protection Term', 'FFL-FPT', 'term_life', 'Basic term life coverage', 0.48, true),
('55555555-5555-5555-5555-555555555555', 'Legacy Builder Whole Life', 'FFL-LBWL', 'whole_life', 'Whole life for legacy planning', 0.76, true),
('55555555-5555-5555-5555-555555555555', 'Secure Future Annuity', 'FFL-SFA', 'annuity', 'Fixed annuity product', 0.35, true)
ON CONFLICT (carrier_id, name) DO NOTHING;

-- Add sample commission rates to comp_guide
INSERT INTO comp_guide (carrier_id, product_type, comp_level, commission_percentage, bonus_percentage, effective_date) VALUES
-- Mutual of Omaha rates
('11111111-1111-1111-1111-111111111111', 'term_life', 'street', 0.50, 0, CURRENT_DATE),
('11111111-1111-1111-1111-111111111111', 'term_life', 'release', 0.55, 0.05, CURRENT_DATE),
('11111111-1111-1111-1111-111111111111', 'term_life', 'enhanced', 0.60, 0.10, CURRENT_DATE),
('11111111-1111-1111-1111-111111111111', 'term_life', 'premium', 0.65, 0.15, CURRENT_DATE),
('11111111-1111-1111-1111-111111111111', 'whole_life', 'street', 0.75, 0, CURRENT_DATE),
('11111111-1111-1111-1111-111111111111', 'whole_life', 'release', 0.80, 0.05, CURRENT_DATE),
('11111111-1111-1111-1111-111111111111', 'whole_life', 'enhanced', 0.85, 0.10, CURRENT_DATE),
('11111111-1111-1111-1111-111111111111', 'whole_life', 'premium', 0.90, 0.15, CURRENT_DATE),

-- American General rates
('22222222-2222-2222-2222-222222222222', 'term_life', 'street', 0.55, 0, CURRENT_DATE),
('22222222-2222-2222-2222-222222222222', 'term_life', 'release', 0.60, 0.05, CURRENT_DATE),
('22222222-2222-2222-2222-222222222222', 'term_life', 'enhanced', 0.65, 0.10, CURRENT_DATE),
('22222222-2222-2222-2222-222222222222', 'whole_life', 'street', 0.80, 0, CURRENT_DATE),
('22222222-2222-2222-2222-222222222222', 'whole_life', 'release', 0.85, 0.10, CURRENT_DATE)
ON CONFLICT (carrier_id, product_type, comp_level, effective_date) DO NOTHING;

COMMIT;