import { CalculationResult } from '../types';

/**
 * Safely finds a calculation result by scenario name
 * @param calculations Array of calculation results
 * @param scenarioName Name of the scenario to find (e.g., "Breakeven", "+$5,000")
 * @returns CalculationResult or null if not found
 */
export function findCalculationByScenario(
  calculations: CalculationResult[],
  scenarioName: string
): CalculationResult | null {
  return calculations.find(calc => calc.scenario === scenarioName) || null;
}

/**
 * Gets the breakeven calculation result
 * @param calculations Array of calculation results
 * @returns CalculationResult for breakeven scenario or null if not found
 */
export function getBreakevenCalculation(calculations: CalculationResult[]): CalculationResult | null {
  return findCalculationByScenario(calculations, 'Breakeven');
}

/**
 * Gets calculation results by target type
 * @param calculations Array of calculation results
 * @param targetAmount Target amount (e.g., 5000 for "+$5,000")
 * @returns CalculationResult or null if not found
 */
export function getTargetCalculation(
  calculations: CalculationResult[],
  targetAmount: number
): CalculationResult | null {
  const targetScenario = `+$${targetAmount.toLocaleString()}`;
  return findCalculationByScenario(calculations, targetScenario);
}

/**
 * Creates a default calculation result for error handling
 * @param scenario Scenario name
 * @returns Default CalculationResult with zero values
 */
export function createDefaultCalculation(scenario: string): CalculationResult {
  return {
    scenario,
    commissionNeeded: 0,
    apNeeded100: 0,
    policies100: 0,
    apNeeded90: 0,
    policies90: 0,
    apNeeded80: 0,
    policies80: 0,
    apNeeded70: 0,
    policies70: 0,
  };
}

/**
 * Safely gets calculation with fallback to default
 * @param calculations Array of calculation results
 * @param scenarioName Name of the scenario to find
 * @returns CalculationResult (either found or default)
 */
export function getCalculationSafely(
  calculations: CalculationResult[],
  scenarioName: string
): CalculationResult {
  return findCalculationByScenario(calculations, scenarioName) || createDefaultCalculation(scenarioName);
}