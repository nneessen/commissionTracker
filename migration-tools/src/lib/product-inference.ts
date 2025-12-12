// /home/nneessen/projects/commissionTracker/migration-tools/src/lib/product-inference.ts
import type {ProductType} from './types.js';

export function inferProductType(productName: string): ProductType {
  const lower = productName.toLowerCase();

  // Term Life indicators
  if (
    lower.includes('term') ||
    lower.includes('level term') ||
    lower.includes('year term') ||
    lower.match(/\d+\s*year/)
  ) {
    return 'term_life';
  }

  // Whole Life indicators
  if (
    lower.includes('whole') ||
    lower.includes('permanent') ||
    lower.includes('traditional life')
  ) {
    return 'whole_life';
  }

  // Universal Life indicators
  if (
    lower.includes('universal') ||
    lower.includes('iul') ||
    lower.includes('indexed universal')
  ) {
    return 'universal_life';
  }

  // Variable Life indicators
  if (
    lower.includes('variable') ||
    lower.includes('vul') ||
    lower.includes('variable universal')
  ) {
    return 'variable_life';
  }

  // Health indicators
  if (
    lower.includes('health') ||
    lower.includes('medical') ||
    lower.includes('medicare') ||
    lower.includes('aca') ||
    lower.includes('major medical')
  ) {
    return 'health';
  }

  // Disability indicators
  if (
    lower.includes('disability') ||
    lower.includes('di') ||
    lower.includes('income protection')
  ) {
    return 'disability';
  }

  // Annuity indicators
  if (
    lower.includes('annuity') ||
    lower.includes('spia') ||
    lower.includes('fia') ||
    lower.includes('fixed annuity') ||
    lower.includes('variable annuity')
  ) {
    return 'annuity';
  }

  // Default to term_life (most common)
  return 'term_life';
}

export function normalizeClientName(name: string | null): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ');
}

export function normalizePhone(phone: string | null): string | null {
  if (!phone) return null;
  // Remove all non-numeric characters
  const digits = phone.replace(/\D/g, '');
  // Return null if too short
  if (digits.length < 10) return null;
  // Return last 10 digits (US phone numbers)
  return digits.slice(-10);
}
