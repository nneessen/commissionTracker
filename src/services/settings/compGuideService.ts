// src/services/settings/compGuideService.ts

import { BaseService } from '../base/BaseService';
import { CompGuideEntry, NewCompGuideForm } from '../../types/compGuide.types';
import {
  CompGuideRepository,
  CompGuideCreateData,
  CompGuideUpdateData,
  CompGuideFilters
} from './CompGuideRepository';
import { ValidationRule } from '../base/BaseService';

class CompGuideService extends BaseService<CompGuideEntry, CompGuideCreateData, CompGuideUpdateData> {
  private compGuideRepository: CompGuideRepository;

  constructor() {
    const repository = new CompGuideRepository();
    super(repository);
    this.compGuideRepository = repository;
  }

  protected validateCreate(data: CompGuideCreateData): { isValid: boolean; errors: string[] } {
    const rules: ValidationRule[] = [
      {
        field: 'carrier_name',
        required: true,
        type: 'string',
        minLength: 1,
        maxLength: 255
      },
      {
        field: 'product_name',
        required: true,
        type: 'string',
        minLength: 1,
        maxLength: 255
      },
      {
        field: 'contract_level',
        required: true,
        type: 'number',
        min: 80,
        max: 145
      },
      {
        field: 'commission_percentage',
        required: true,
        type: 'number',
        min: 0,
        max: 1000
      },
      {
        field: 'first_year_percentage',
        type: 'number',
        min: 0,
        max: 1000
      },
      {
        field: 'renewal_percentage',
        type: 'number',
        min: 0,
        max: 1000
      },
      {
        field: 'trail_percentage',
        type: 'number',
        min: 0,
        max: 1000
      },
      {
        field: 'effective_date',
        required: true,
        type: 'date'
      },
      {
        field: 'expiration_date',
        type: 'date'
      },
      {
        field: 'is_active',
        type: 'boolean'
      },
      {
        field: 'notes',
        type: 'string',
        maxLength: 1000
      }
    ];

    const validation = this.validate(data, rules);

    // Additional custom validations
    if (data.contract_level && (data.contract_level % 5 !== 0)) {
      validation.errors.push('Contract level must be in increments of 5');
      validation.isValid = false;
    }

    if (data.expiration_date && data.effective_date && data.expiration_date <= data.effective_date) {
      validation.errors.push('Expiration date must be after effective date');
      validation.isValid = false;
    }

    return validation;
  }

  protected validateUpdate(data: CompGuideUpdateData): { isValid: boolean; errors: string[] } {
    const rules: ValidationRule[] = [
      {
        field: 'carrier_name',
        type: 'string',
        minLength: 1,
        maxLength: 255
      },
      {
        field: 'product_name',
        type: 'string',
        minLength: 1,
        maxLength: 255
      },
      {
        field: 'contract_level',
        type: 'number',
        min: 80,
        max: 145
      },
      {
        field: 'commission_percentage',
        type: 'number',
        min: 0,
        max: 1000
      },
      {
        field: 'first_year_percentage',
        type: 'number',
        min: 0,
        max: 1000
      },
      {
        field: 'renewal_percentage',
        type: 'number',
        min: 0,
        max: 1000
      },
      {
        field: 'trail_percentage',
        type: 'number',
        min: 0,
        max: 1000
      },
      {
        field: 'effective_date',
        type: 'date'
      },
      {
        field: 'expiration_date',
        type: 'date'
      },
      {
        field: 'is_active',
        type: 'boolean'
      },
      {
        field: 'notes',
        type: 'string',
        maxLength: 1000
      }
    ];

    const validation = this.validate(data, rules);

    // Additional custom validations
    if (data.contract_level && (data.contract_level % 5 !== 0)) {
      validation.errors.push('Contract level must be in increments of 5');
      validation.isValid = false;
    }

    if (data.expiration_date && data.effective_date && data.expiration_date <= data.effective_date) {
      validation.errors.push('Expiration date must be after effective date');
      validation.isValid = false;
    }

    return validation;
  }

  protected async beforeCreate(data: CompGuideCreateData): Promise<CompGuideCreateData> {
    // Check for duplicate entry (carrier + product + contract level)
    const existingEntry = await this.compGuideRepository.findExistingEntry(
      data.carrier_name,
      data.product_name,
      data.contract_level
    );

    if (existingEntry) {
      throw new Error(
        `Commission guide entry already exists for this carrier, product, and contract level`
      );
    }

    return data;
  }

  protected async beforeUpdate(id: string, data: CompGuideUpdateData): Promise<CompGuideUpdateData> {
    // Check for duplicate entry if key fields are being updated
    if (data.carrier_name || data.product_name || data.contract_level) {
      const current = await this.repository.findById(id);
      if (!current) {
        throw new Error('Commission guide entry not found');
      }

      const carrierName = data.carrier_name || current.carrier_name;
      const productName = data.product_name || current.product_name;
      const contractLevel = data.contract_level || current.contract_level;

      const existingEntry = await this.compGuideRepository.findExistingEntry(
        carrierName,
        productName,
        contractLevel,
        id
      );

      if (existingEntry) {
        throw new Error(
          `Commission guide entry already exists for this carrier, product, and contract level`
        );
      }
    }

    return data;
  }

  // CompGuide-specific methods
  async getAllWithCarriers() {
    try {
      const entries = await this.compGuideRepository.findAllWithCarriers();
      return {
        data: entries,
        success: true
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        success: false
      };
    }
  }

  async getByCarrier(carrierName: string) {
    try {
      const entries = await this.compGuideRepository.findByCarrier(carrierName);
      return {
        data: entries,
        success: true
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        success: false
      };
    }
  }

  async getByProduct(productName: string) {
    try {
      const entries = await this.compGuideRepository.findByProduct(productName);
      return {
        data: entries,
        success: true
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        success: false
      };
    }
  }

  async getByContractLevel(contractLevel: number) {
    try {
      const entries = await this.compGuideRepository.findByContractLevel(contractLevel);
      return {
        data: entries,
        success: true
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        success: false
      };
    }
  }

  async searchByFilters(filters: CompGuideFilters) {
    try {
      const entries = await this.compGuideRepository.findByFiltersWithCarriers(filters);
      return {
        data: entries,
        success: true
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        success: false
      };
    }
  }

  async getContractLevels() {
    try {
      const levels = await this.compGuideRepository.getContractLevels();
      return {
        data: levels,
        success: true
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        success: false
      };
    }
  }

  async getProductsByCarrier(carrierName: string) {
    try {
      const products = await this.compGuideRepository.getProductsByCarrier(carrierName);
      return {
        data: products,
        success: true
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        success: false
      };
    }
  }

  async getCommissionRate(carrierName: string, productName: string, contractLevel: number) {
    try {
      const rate = await this.compGuideRepository.getCommissionRate(carrierName, productName, contractLevel);
      return {
        data: rate,
        success: true
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        success: false
      };
    }
  }

  async bulkImport(entries: CompGuideCreateData[]) {
    try {
      // Validate all entries first
      for (const entry of entries) {
        const validation = this.validateCreate(entry);
        if (!validation.isValid) {
          throw new Error(`Validation failed for entry: ${validation.errors.join(', ')}`);
        }
      }

      // Check for duplicates
      for (const entry of entries) {
        const existing = await this.compGuideRepository.findExistingEntry(
          entry.carrier_name,
          entry.product_name,
          entry.contract_level
        );
        if (existing) {
          throw new Error(
            `Duplicate entry found for ${entry.product_name} at contract level ${entry.contract_level}`
          );
        }
      }

      // Bulk insert
      const imported = await this.compGuideRepository.bulkInsert(entries);
      return {
        data: imported,
        success: true
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        success: false
      };
    }
  }

  // Legacy interface methods for backward compatibility
  async getAll(): Promise<CompGuideEntry[]> {
    const result = await this.getAllWithCarriers();
    if (result.success && result.data) {
      return result.data;
    }
    throw new Error(result.error || 'Failed to get comp guide entries');
  }

  async create(data: NewCompGuideForm): Promise<CompGuideEntry> {
    const result = await super.create(data);
    if (result.success && result.data) {
      return result.data;
    }
    throw new Error(result.error || 'Failed to create comp guide entry');
  }

  async update(id: string, data: Partial<CompGuideEntry>): Promise<CompGuideEntry> {
    const result = await super.update(id, data);
    if (result.success && result.data) {
      return result.data;
    }
    throw new Error(result.error || 'Failed to update comp guide entry');
  }

  async delete(id: string): Promise<void> {
    const result = await super.delete(id);
    if (!result.success) {
      throw new Error(result.error || 'Failed to delete comp guide entry');
    }
  }
}

export const compGuideService = new CompGuideService();