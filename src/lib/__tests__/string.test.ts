// src/lib/__tests__/string.test.ts
// Unit tests for string utilities

import { describe, it, expect } from 'vitest';
import { getInitials, getInitialsFromEmail } from '../string';

describe('getInitials', () => {
  it('extracts initials from two-word name', () => {
    expect(getInitials('John Doe')).toBe('JD');
  });

  it('extracts initial from single-word name', () => {
    expect(getInitials('Alice')).toBe('A');
  });

  it('limits to first two initials for long names', () => {
    expect(getInitials('Mary Jane Watson')).toBe('MJ');
    expect(getInitials('John Paul George Ringo')).toBe('JP');
  });

  it('handles empty string', () => {
    expect(getInitials('')).toBe('');
  });

  it('handles whitespace-only string', () => {
    expect(getInitials('   ')).toBe('');
  });

  it('handles names with extra whitespace', () => {
    expect(getInitials('  John   Doe  ')).toBe('JD');
  });

  it('converts to uppercase', () => {
    expect(getInitials('john doe')).toBe('JD');
    expect(getInitials('JANE SMITH')).toBe('JS');
  });

  it('handles single character names', () => {
    expect(getInitials('J D')).toBe('JD');
  });

  it('handles hyphenated names', () => {
    expect(getInitials('Mary-Jane Watson')).toBe('MW');
  });
});

describe('getInitialsFromEmail', () => {
  it('extracts initials from dot-separated email', () => {
    expect(getInitialsFromEmail('john.doe@example.com')).toBe('JD');
  });

  it('extracts initials from underscore-separated email', () => {
    expect(getInitialsFromEmail('jane_smith@example.com')).toBe('JS');
  });

  it('extracts initials from hyphen-separated email', () => {
    expect(getInitialsFromEmail('bob-jones@example.com')).toBe('BJ');
  });

  it('handles single-part email by taking first 2 chars', () => {
    expect(getInitialsFromEmail('alice@example.com')).toBe('AL');
  });

  it('handles short single-part email', () => {
    expect(getInitialsFromEmail('ab@example.com')).toBe('AB');
  });

  it('converts to uppercase', () => {
    expect(getInitialsFromEmail('john.doe@example.com')).toBe('JD');
  });

  it('handles multiple separators', () => {
    expect(getInitialsFromEmail('john.middle.doe@example.com')).toBe('JM');
  });
});
