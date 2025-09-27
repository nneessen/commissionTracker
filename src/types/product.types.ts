// src/types/product.types.ts

export type ProductType = 'term' | 'whole_life' | 'universal_life' | 'indexed_universal_life' | 'final_expense' | 'accidental' | 'annuity';

export interface Product {
  id: string;
  carrierId: string;
  productName: string;
  productType: ProductType;
  isActive: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

export interface CommissionRate {
  id: string;
  carrierId: string;
  productId: string;
  contractLevel: number; // 80-145
  commissionPercentage: number; // e.g., 85.5 for 85.5%
  createdAt: Date;
  updatedAt?: Date;
}

export interface ProductWithRates extends Product {
  commissionRates: CommissionRate[];
  carrierName?: string;
}

export interface CarrierProduct {
  carrierId: string;
  carrierName: string;
  products: ProductWithRates[];
}

export interface NewProductForm {
  productName: string;
  productType: Product['productType'];
  carrierId: string;
  isActive?: boolean;
}

export interface UpdateProductForm extends Partial<NewProductForm> {
  id: string;
}

export interface CommissionRateForm {
  contractLevel: number;
  commissionPercentage: number;
}

export interface NewCommissionRateForm extends CommissionRateForm {
  carrierId: string;
  productId: string;
}

export interface UpdateCommissionRateForm extends CommissionRateForm {
  id: string;
}

export interface CompGuideEntry {
  id: string;
  carrierName: string;
  productName: string;
  contractLevel: number;
  commissionPercentage: number;
  productType: Product['productType'];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CompGuideLookup {
  carrierName: string;
  productName: string;
  contractLevel: number;
}

export interface CommissionCalculation {
  monthlyPremium: number;
  commissionPercentage: number;
  advanceMonths: number;
  totalCommission: number;
}

export interface ProductStats {
  productId: string;
  productName: string;
  carrierName: string;
  totalCommissions: number;
  totalPremiums: number;
  policyCount: number;
  averageCommissionRate: number;
}

export const PRODUCT_TYPES: { value: Product['productType']; label: string }[] = [
  { value: 'term', label: 'Term Life' },
  { value: 'whole_life', label: 'Whole Life' },
  { value: 'universal_life', label: 'Universal Life' },
  { value: 'indexed_universal_life', label: 'Indexed Universal Life' },
  { value: 'final_expense', label: 'Final Expense' },
  { value: 'accidental', label: 'Accidental Death' },
  { value: 'annuity', label: 'Annuity' },
];

export const CONTRACT_LEVELS = Array.from({ length: 14 }, (_, i) => 80 + i * 5); // 80, 85, 90, ..., 145

export const validateContractLevel = (level: number): boolean => {
  return level >= 80 && level <= 145 && level % 5 === 0;
};