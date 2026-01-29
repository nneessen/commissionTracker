// src/lib/__tests__/format.test.ts
// Unit tests for format utilities

import { describe, it, expect } from 'vitest';
import { formatCompactCurrency, formatCurrency, abbreviateNumber } from '../format';

describe('formatCompactCurrency', () => {
  it('formats zero correctly', () => {
    expect(formatCompactCurrency(0)).toBe('$0');
  });

  it('formats small values without suffix', () => {
    expect(formatCompactCurrency(500)).toBe('$500');
    expect(formatCompactCurrency(999)).toBe('$999');
  });

  it('formats thousands with K suffix (no decimals)', () => {
    expect(formatCompactCurrency(1000)).toBe('$1K');
    expect(formatCompactCurrency(1500)).toBe('$2K'); // Rounds up
    expect(formatCompactCurrency(15000)).toBe('$15K');
    expect(formatCompactCurrency(150000)).toBe('$150K');
    expect(formatCompactCurrency(999999)).toBe('$1000K');
  });

  it('formats millions with M suffix', () => {
    expect(formatCompactCurrency(1000000)).toBe('$1.0M');
    expect(formatCompactCurrency(1500000)).toBe('$1.5M');
    expect(formatCompactCurrency(15000000)).toBe('$15.0M');
    expect(formatCompactCurrency(999999999)).toBe('$1000.0M');
  });

  it('formats billions with B suffix', () => {
    expect(formatCompactCurrency(1000000000)).toBe('$1.0B');
    expect(formatCompactCurrency(1500000000)).toBe('$1.5B');
  });

  it('handles negative values', () => {
    expect(formatCompactCurrency(-1500)).toBe('-$2K'); // Rounds
    expect(formatCompactCurrency(-1500000)).toBe('-$1.5M');
  });
});

describe('formatCurrency', () => {
  it('formats standard currency values', () => {
    expect(formatCurrency(0)).toBe('$0');
    expect(formatCurrency(1234)).toBe('$1,234');
    expect(formatCurrency(1234567)).toBe('$1,234,567');
  });

  it('rounds decimal values', () => {
    expect(formatCurrency(1234.56)).toBe('$1,235');
    expect(formatCurrency(1234.49)).toBe('$1,234');
  });
});

describe('abbreviateNumber', () => {
  it('abbreviates thousands', () => {
    expect(abbreviateNumber(1000)).toBe('1.0K');
    expect(abbreviateNumber(1500)).toBe('1.5K');
  });

  it('abbreviates millions', () => {
    expect(abbreviateNumber(1000000)).toBe('1.0M');
    expect(abbreviateNumber(2500000)).toBe('2.5M');
  });

  it('abbreviates billions', () => {
    expect(abbreviateNumber(1000000000)).toBe('1.0B');
  });

  it('returns plain number for small values', () => {
    expect(abbreviateNumber(500)).toBe('500');
    expect(abbreviateNumber(0)).toBe('0');
  });
});
