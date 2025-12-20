// src/services/settings/constantsService.ts

import { logger } from "../base/logger";
import { constantsRepository } from "./ConstantsRepository";

/**
 * Constants interface - aggregated view of key constants
 */
export interface Constants {
  avgAP: number;
  target1: number;
  target2: number;
}

const DEFAULT_CONSTANTS: Constants = {
  avgAP: 0,
  target1: 0,
  target2: 0,
};

/**
 * Constants Service
 *
 * Provides access to system-wide configuration constants.
 * Delegates database operations to ConstantsRepository.
 */
export const constantsService = {
  /**
   * Get all constants as a typed object
   */
  async getAll(): Promise<Constants> {
    try {
      const keyValues = await constantsRepository.getAllAsKeyValue();

      return {
        avgAP: keyValues["avgAP"] ?? DEFAULT_CONSTANTS.avgAP,
        target1: keyValues["target1"] ?? DEFAULT_CONSTANTS.target1,
        target2: keyValues["target2"] ?? DEFAULT_CONSTANTS.target2,
      };
    } catch (error) {
      logger.error(
        "Error fetching constants",
        error instanceof Error ? error : String(error),
        "ConstantsService",
      );
      throw error;
    }
  },

  /**
   * Alias for getAll
   */
  async getConstants(): Promise<Constants> {
    return this.getAll();
  },

  /**
   * Update all constants at once
   */
  async updateConstants(data: Constants): Promise<Constants> {
    try {
      const updates = Object.entries(data).map(([key, value]) => ({
        key,
        value,
      }));

      await constantsRepository.updateMultiple(updates);

      return data;
    } catch (error) {
      logger.error(
        "Error updating constants",
        error instanceof Error ? error : String(error),
        "ConstantsService",
      );
      throw error;
    }
  },

  /**
   * Update multiple constants by key-value pairs
   */
  async updateMultiple(
    updates: Array<{ key: string; value: number }>,
  ): Promise<Constants> {
    try {
      await constantsRepository.updateMultiple(updates);

      // Return updated constants
      return this.getAll();
    } catch (error) {
      logger.error(
        "Error updating multiple constants",
        error instanceof Error ? error : String(error),
        "ConstantsService",
      );
      throw error;
    }
  },

  /**
   * Set a single constant value by key
   */
  async setValue(field: string, value: number): Promise<void> {
    try {
      await constantsRepository.updateByKey(field, value);
    } catch (error) {
      logger.error(
        `Error updating constant ${field}`,
        error instanceof Error ? error : String(error),
        "ConstantsService",
      );
      throw error;
    }
  },
};
