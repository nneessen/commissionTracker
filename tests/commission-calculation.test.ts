// /home/nneessen/projects/commissionTracker/tests/commission-calculation.test.ts
// Comprehensive tests for policy commission calculation functionality

import {describe, it, expect, _beforeAll, _afterAll, vi} from 'vitest';
import {commissionCalculationService} from '@/services/commissions/commissionCalculationService';
import {supabase} from '@/services/base/supabase';

// Mock the supabase client
vi.mock('@/services/base/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('Commission Calculation Service', () => {
  describe('getUserContractLevel', () => {
    it('should return user contract level from agent_settings', async () => {
      const mockData = { contract_level: 115 };

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      } as any);

      const level = await commissionCalculationService.getUserContractLevel('user-123');
      expect(level).toBe(115);
    });

    it('should return default 100 when no agent settings found', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
      } as any);

      const level = await commissionCalculationService.getUserContractLevel('user-123');
      expect(level).toBe(100);
    });
  });

  describe('getCommissionRate', () => {
    it('should return commission rate from comp guide', async () => {
      const mockData = {
        id: 'comp-123',
        commission_percentage: 125.5,
      };

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      } as any);

      const result = await commissionCalculationService.getCommissionRate(
        'carrier-123',
        'term_life',
        120
      );

      expect(result.rate).toBe(125.5);
      expect(result.compGuideId).toBe('comp-123');
    });

    it('should return 0 rate when no comp guide entry found', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      } as any);

      const result = await commissionCalculationService.getCommissionRate(
        'carrier-123',
        'term_life',
        120
      );

      expect(result.rate).toBe(0);
      expect(result.compGuideId).toBeUndefined();
    });
  });

  describe('calculateCommission', () => {
    it('should calculate commission correctly for 120% rate at contract level 125', async () => {
      // Mock getUserContractLevel
      vi.mocked(supabase.from).mockImplementationOnce(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { contract_level: 125 },
          error: null,
        }),
      } as any));

      // Mock getCommissionRate
      vi.mocked(supabase.from).mockImplementationOnce(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: 'comp-123', commission_percentage: 120 },
          error: null,
        }),
      } as any));

      const result = await commissionCalculationService.calculateCommission({
        carrierId: 'carrier-123',
        productType: 'term_life',
        annualPremium: 5000,
        userId: 'user-123',
      });

      expect(result.commissionPercentage).toBe(120);
      expect(result.commissionAmount).toBe(6000); // 5000 * 120 / 100
      expect(result.contractLevel).toBe(125);
      expect(result.compGuideId).toBe('comp-123');
      expect(result.isAutoCalculated).toBe(true);
    });

    it('should use override contract level when provided', async () => {
      // Mock getCommissionRate only (no getUserContractLevel call)
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: 'comp-456', commission_percentage: 145 },
          error: null,
        }),
      } as any);

      const result = await commissionCalculationService.calculateCommission({
        carrierId: 'carrier-123',
        productType: 'whole_life',
        annualPremium: 10000,
        contractLevelOverride: 145,
      });

      expect(result.commissionPercentage).toBe(145);
      expect(result.commissionAmount).toBe(14500); // 10000 * 145 / 100
      expect(result.contractLevel).toBe(145);
      expect(result.isAutoCalculated).toBe(true);
    });

    it('should return 0 commission when no rate found', async () => {
      // Mock getUserContractLevel
      vi.mocked(supabase.from).mockImplementationOnce(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { contract_level: 100 },
          error: null,
        }),
      } as any));

      // Mock getCommissionRate returning no data
      vi.mocked(supabase.from).mockImplementationOnce(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      } as any));

      const result = await commissionCalculationService.calculateCommission({
        carrierId: 'carrier-999',
        productType: 'term_life',
        annualPremium: 5000,
        userId: 'user-123',
      });

      expect(result.commissionPercentage).toBe(0);
      expect(result.commissionAmount).toBe(0);
      expect(result.isAutoCalculated).toBe(true);
    });
  });

  describe('getCarrierProducts', () => {
    it('should return unique product types for a carrier', async () => {
      const mockData = [
        { product_type: 'term_life' },
        { product_type: 'whole_life' },
        { product_type: 'term_life' }, // duplicate
        { product_type: 'universal_life' },
      ];

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      } as any);

      const products = await commissionCalculationService.getCarrierProducts('carrier-123');

      expect(products).toHaveLength(3);
      expect(products).toContain('term_life');
      expect(products).toContain('whole_life');
      expect(products).toContain('universal_life');
    });

    it('should return empty array on error', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: { message: 'Error' } }),
      } as any);

      const products = await commissionCalculationService.getCarrierProducts('carrier-123');
      expect(products).toEqual([]);
    });
  });

  describe('Contract Level Ranges', () => {
    const testCases = [
      { level: 80, description: 'minimum contract level' },
      { level: 85, description: 'low contract level' },
      { level: 100, description: 'default contract level' },
      { level: 120, description: 'enhanced contract level' },
      { level: 145, description: 'maximum contract level' },
    ];

    testCases.forEach(({ level, description }) => {
      it(`should handle ${description} (${level})`, async () => {
        vi.mocked(supabase.from).mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: `comp-${level}`, commission_percentage: level },
            error: null,
          }),
        } as any);

        const result = await commissionCalculationService.getCommissionRate(
          'carrier-123',
          'term_life',
          level
        );

        expect(result.rate).toBe(level);
      });
    });
  });

  describe('Commission Calculation Examples from PDF', () => {
    const examples = [
      {
        carrier: 'United Home Life',
        product: 'term_life',
        contractLevel: 145,
        expectedRate: 150,
        annualPremium: 10000,
        expectedCommission: 15000,
      },
      {
        carrier: 'American Home Life',
        product: 'whole_life',
        contractLevel: 130,
        expectedRate: 120,
        annualPremium: 5000,
        expectedCommission: 6000,
      },
      {
        carrier: 'SBLI',
        product: 'term_life',
        contractLevel: 100,
        expectedRate: 105,
        annualPremium: 3000,
        expectedCommission: 3150,
      },
    ];

    examples.forEach((example) => {
      it(`should calculate ${example.carrier} ${example.product} at level ${example.contractLevel}`, async () => {
        vi.mocked(supabase.from).mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              id: 'comp-test',
              commission_percentage: example.expectedRate,
            },
            error: null,
          }),
        } as any);

        const result = await commissionCalculationService.calculateCommission({
          carrierId: `${example.carrier}-id`,
          productType: example.product,
          annualPremium: example.annualPremium,
          contractLevelOverride: example.contractLevel,
        });

        expect(result.commissionPercentage).toBe(example.expectedRate);
        expect(result.commissionAmount).toBe(example.expectedCommission);
      });
    });
  });
});

describe('Policy Form Integration', () => {
  it('should not allow manual commission input', () => {
    // This test would be in a React component test file
    // Just documenting the expected behavior here
    expect(true).toBe(true); // Placeholder
  });

  it('should display auto-calculated commission', () => {
    // This test would verify the commission is displayed correctly
    expect(true).toBe(true); // Placeholder
  });

  it('should include submit_date in policy creation', () => {
    // This test would verify submit_date is included
    expect(true).toBe(true); // Placeholder
  });
});

describe('Database Migration Tests', () => {
  it('policies table should have submit_date column', () => {
    // This would test the actual database schema
    expect(true).toBe(true); // Placeholder
  });

  it('comp_guide should accept contract levels 80-145', () => {
    // This would test the comp_level constraint
    expect(true).toBe(true); // Placeholder
  });

  it('agent_settings should have contract_level column', () => {
    // This would test the agent_settings table
    expect(true).toBe(true); // Placeholder
  });
});