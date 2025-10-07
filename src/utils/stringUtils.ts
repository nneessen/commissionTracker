// src/utils/stringUtils.ts

/**
 * Capitalizes the first letter of each word in a string
 * @param str - The string to capitalize
 * @returns The string with each word capitalized
 * @example
 * capitalizeWords('whole_life') // 'Whole Life'
 * capitalizeWords('term life') // 'Term Life'
 * capitalizeWords('final expense') // 'Final Expense'
 */
export function capitalizeWords(str: string): string {
  if (!str) return '';

  return str
    .split(/[_\s]+/) // Split on underscores or spaces
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Capitalizes only the first letter of a string
 * @param str - The string to capitalize
 * @returns The string with the first letter capitalized
 * @example
 * capitalize('hello world') // 'Hello world'
 */
export function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}
