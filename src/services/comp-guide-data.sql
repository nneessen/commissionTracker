-- Commission Guide Data Population
-- Based on CompGuide.pdf analysis

-- Clear existing comp guide data
DELETE FROM comp_guide;

-- United Home Life (Page 1)
INSERT INTO comp_guide (carrier_name, product_name, contract_level, commission_percentage) VALUES
-- Term Life
('United Home Life', 'Term Life', 80, 70.00),
('United Home Life', 'Term Life', 85, 75.00),
('United Home Life', 'Term Life', 90, 80.00),
('United Home Life', 'Term Life', 95, 85.00),
('United Home Life', 'Term Life', 100, 90.00),
('United Home Life', 'Term Life', 105, 95.00),
('United Home Life', 'Term Life', 110, 100.00),
('United Home Life', 'Term Life', 115, 105.00),
('United Home Life', 'Term Life', 120, 110.00),
('United Home Life', 'Term Life', 125, 115.00),
('United Home Life', 'Term Life', 130, 120.00),
('United Home Life', 'Term Life', 135, 125.00),
('United Home Life', 'Term Life', 140, 130.00),
('United Home Life', 'Term Life', 145, 135.00),

-- Express Issue Premier WL
('United Home Life', 'Express Issue Premier WL', 80, 70.00),
('United Home Life', 'Express Issue Premier WL', 85, 75.00),
('United Home Life', 'Express Issue Premier WL', 90, 80.00),
('United Home Life', 'Express Issue Premier WL', 95, 85.00),
('United Home Life', 'Express Issue Premier WL', 100, 90.00),
('United Home Life', 'Express Issue Premier WL', 105, 95.00),
('United Home Life', 'Express Issue Premier WL', 110, 100.00),
('United Home Life', 'Express Issue Premier WL', 115, 105.00),
('United Home Life', 'Express Issue Premier WL', 120, 110.00),
('United Home Life', 'Express Issue Premier WL', 125, 115.00),
('United Home Life', 'Express Issue Premier WL', 130, 120.00),
('United Home Life', 'Express Issue Premier WL', 135, 125.00),
('United Home Life', 'Express Issue Premier WL', 140, 130.00),
('United Home Life', 'Express Issue Premier WL', 145, 135.00),

-- Guaranteed Issue Whole Life
('United Home Life', 'Guaranteed Issue Whole Life', 80, 25.00),
('United Home Life', 'Guaranteed Issue Whole Life', 85, 25.00),
('United Home Life', 'Guaranteed Issue Whole Life', 90, 30.00),
('United Home Life', 'Guaranteed Issue Whole Life', 95, 35.00),
('United Home Life', 'Guaranteed Issue Whole Life', 100, 40.00),
('United Home Life', 'Guaranteed Issue Whole Life', 105, 45.00),
('United Home Life', 'Guaranteed Issue Whole Life', 110, 50.00),
('United Home Life', 'Guaranteed Issue Whole Life', 115, 55.00),
('United Home Life', 'Guaranteed Issue Whole Life', 120, 60.00),
('United Home Life', 'Guaranteed Issue Whole Life', 125, 65.00),
('United Home Life', 'Guaranteed Issue Whole Life', 130, 70.00),
('United Home Life', 'Guaranteed Issue Whole Life', 135, 75.00),
('United Home Life', 'Guaranteed Issue Whole Life', 140, 80.00),
('United Home Life', 'Guaranteed Issue Whole Life', 145, 85.00),

-- Provider Whole Life
('United Home Life', 'Provider Whole Life', 80, 55.00),
('United Home Life', 'Provider Whole Life', 85, 60.00),
('United Home Life', 'Provider Whole Life', 90, 65.00),
('United Home Life', 'Provider Whole Life', 95, 70.00),
('United Home Life', 'Provider Whole Life', 100, 75.00),
('United Home Life', 'Provider Whole Life', 105, 80.00),
('United Home Life', 'Provider Whole Life', 110, 85.00),
('United Home Life', 'Provider Whole Life', 115, 90.00),
('United Home Life', 'Provider Whole Life', 120, 95.00),
('United Home Life', 'Provider Whole Life', 125, 100.00),
('United Home Life', 'Provider Whole Life', 130, 105.00),
('United Home Life', 'Provider Whole Life', 135, 110.00),
('United Home Life', 'Provider Whole Life', 140, 115.00),
('United Home Life', 'Provider Whole Life', 145, 120.00),

-- Accidental Death
('United Home Life', 'Accidental Death', 80, 45.00),
('United Home Life', 'Accidental Death', 85, 50.00),
('United Home Life', 'Accidental Death', 90, 55.00),
('United Home Life', 'Accidental Death', 95, 60.00),
('United Home Life', 'Accidental Death', 100, 65.00),
('United Home Life', 'Accidental Death', 105, 70.00),
('United Home Life', 'Accidental Death', 110, 75.00),
('United Home Life', 'Accidental Death', 115, 80.00),
('United Home Life', 'Accidental Death', 120, 85.00),
('United Home Life', 'Accidental Death', 125, 90.00),
('United Home Life', 'Accidental Death', 130, 95.00),
('United Home Life', 'Accidental Death', 135, 100.00),
('United Home Life', 'Accidental Death', 140, 105.00),
('United Home Life', 'Accidental Death', 145, 110.00);

-- SBLI (Page 2)
INSERT INTO comp_guide (carrier_name, product_name, contract_level, commission_percentage) VALUES
-- SBLI Term
('SBLI', 'Term Life', 80, 85.00),
('SBLI', 'Term Life', 85, 90.00),
('SBLI', 'Term Life', 90, 95.00),
('SBLI', 'Term Life', 95, 100.00),
('SBLI', 'Term Life', 100, 105.00),
('SBLI', 'Term Life', 105, 110.00),
('SBLI', 'Term Life', 110, 115.00),
('SBLI', 'Term Life', 115, 120.00),
('SBLI', 'Term Life', 120, 125.00),
('SBLI', 'Term Life', 125, 130.00),
('SBLI', 'Term Life', 130, 135.00),
('SBLI', 'Term Life', 135, 140.00),
('SBLI', 'Term Life', 140, 145.00),
('SBLI', 'Term Life', 145, 150.00);

-- American Home Life FE
INSERT INTO comp_guide (carrier_name, product_name, contract_level, commission_percentage) VALUES
-- Final Expense
('American Home Life', 'Final Expense', 80, 65.00),
('American Home Life', 'Final Expense', 85, 70.00),
('American Home Life', 'Final Expense', 90, 75.00),
('American Home Life', 'Final Expense', 95, 80.00),
('American Home Life', 'Final Expense', 100, 85.00),
('American Home Life', 'Final Expense', 105, 90.00),
('American Home Life', 'Final Expense', 110, 100.00),
('American Home Life', 'Final Expense', 115, 105.00),
('American Home Life', 'Final Expense', 120, 110.00),
('American Home Life', 'Final Expense', 125, 115.00),
('American Home Life', 'Final Expense', 130, 120.00),
('American Home Life', 'Final Expense', 135, 125.00),
('American Home Life', 'Final Expense', 140, 130.00),
('American Home Life', 'Final Expense', 145, 135.00);

-- American Amicable (Page 3)
INSERT INTO comp_guide (carrier_name, product_name, contract_level, commission_percentage) VALUES
-- Express UL
('American Amicable', 'Express UL', 80, 45.00),
('American Amicable', 'Express UL', 85, 50.00),
('American Amicable', 'Express UL', 90, 55.00),
('American Amicable', 'Express UL', 95, 60.00),
('American Amicable', 'Express UL', 100, 65.00),
('American Amicable', 'Express UL', 105, 70.00),
('American Amicable', 'Express UL', 110, 75.00),
('American Amicable', 'Express UL', 115, 80.00),
('American Amicable', 'Express UL', 120, 85.00),
('American Amicable', 'Express UL', 125, 90.00),
('American Amicable', 'Express UL', 130, 95.00),
('American Amicable', 'Express UL', 135, 100.00),
('American Amicable', 'Express UL', 140, 105.00),
('American Amicable', 'Express UL', 145, 110.00),

-- Home Protector
('American Amicable', 'Home Protector', 80, 70.00),
('American Amicable', 'Home Protector', 85, 75.00),
('American Amicable', 'Home Protector', 90, 80.00),
('American Amicable', 'Home Protector', 95, 85.00),
('American Amicable', 'Home Protector', 100, 90.00),
('American Amicable', 'Home Protector', 105, 95.00),
('American Amicable', 'Home Protector', 110, 100.00),
('American Amicable', 'Home Protector', 115, 105.00),
('American Amicable', 'Home Protector', 120, 110.00),
('American Amicable', 'Home Protector', 125, 115.00),
('American Amicable', 'Home Protector', 130, 120.00),
('American Amicable', 'Home Protector', 135, 125.00),
('American Amicable', 'Home Protector', 140, 130.00),
('American Amicable', 'Home Protector', 145, 135.00);

-- CoreBridge (Page 4)
INSERT INTO comp_guide (carrier_name, product_name, contract_level, commission_percentage) VALUES
-- GIWL Whole Life
('CoreBridge', 'GIWL Whole Life', 80, 65.00),
('CoreBridge', 'GIWL Whole Life', 85, 70.00),
('CoreBridge', 'GIWL Whole Life', 90, 75.00),
('CoreBridge', 'GIWL Whole Life', 95, 80.00),
('CoreBridge', 'GIWL Whole Life', 100, 80.00),
('CoreBridge', 'GIWL Whole Life', 105, 80.00),
('CoreBridge', 'GIWL Whole Life', 110, 80.00),
('CoreBridge', 'GIWL Whole Life', 115, 80.00),
('CoreBridge', 'GIWL Whole Life', 120, 90.00),
('CoreBridge', 'GIWL Whole Life', 125, 90.00),
('CoreBridge', 'GIWL Whole Life', 130, 95.00),
('CoreBridge', 'GIWL Whole Life', 135, 95.00),
('CoreBridge', 'GIWL Whole Life', 140, 95.00),
('CoreBridge', 'GIWL Whole Life', 145, 95.00);

-- Add a default agent for testing
INSERT INTO agents (name, email, contract_comp_level) VALUES
('Default Agent', 'agent@example.com', 120);

-- Verify data insertion
SELECT 'Comp Guide Records Inserted:' as info, COUNT(*) as count FROM comp_guide;
SELECT 'Agent Records Inserted:' as info, COUNT(*) as count FROM agents;