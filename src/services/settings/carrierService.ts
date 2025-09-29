// src/services/settings/carrierService.ts

import { BaseService } from '../base/BaseService';
import { Carrier } from '../../types/carrier.types';
import {
  CarrierRepository,
  CarrierCreateData,
  CarrierUpdateData
} from './CarrierRepository';
import { ValidationRule } from '../base/BaseService';

export interface NewCarrierForm {
  name: string;
  short_name?: string;
  is_active?: boolean;
  default_commission_rates?: Record<string, number>;
  contact_info?: {
    email?: string;
    phone?: string;
    website?: string;
    rep_name?: string;
    rep_email?: string;
    rep_phone?: string;
  };
  notes?: string;
}

class CarrierService extends BaseService<Carrier, CarrierCreateData, CarrierUpdateData> {
  private carrierRepository: CarrierRepository;

  constructor() {
    const repository = new CarrierRepository();
    super(repository);
    this.carrierRepository = repository;
  }

  protected validateCreate(data: CarrierCreateData): { isValid: boolean; errors: string[] } {
    const rules: ValidationRule[] = [
      {
        field: 'name',
        required: true,
        type: 'string',
        minLength: 1,
        maxLength: 255
      },
      {
        field: 'short_name',
        type: 'string',
        maxLength: 50
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
    if (data.contact_info) {
      if (data.contact_info.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.contact_info.email)) {
        validation.errors.push('Invalid email format in contact info');
        validation.isValid = false;
      }
      if (data.contact_info.rep_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.contact_info.rep_email)) {
        validation.errors.push('Invalid rep email format in contact info');
        validation.isValid = false;
      }
    }

    return validation;
  }

  protected validateUpdate(data: CarrierUpdateData): { isValid: boolean; errors: string[] } {
    const rules: ValidationRule[] = [
      {
        field: 'name',
        type: 'string',
        minLength: 1,
        maxLength: 255
      },
      {
        field: 'short_name',
        type: 'string',
        maxLength: 50
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
    if (data.contact_info) {
      if (data.contact_info.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.contact_info.email)) {
        validation.errors.push('Invalid email format in contact info');
        validation.isValid = false;
      }
      if (data.contact_info.rep_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.contact_info.rep_email)) {
        validation.errors.push('Invalid rep email format in contact info');
        validation.isValid = false;
      }
    }

    return validation;
  }

  protected async beforeCreate(data: CarrierCreateData): Promise<CarrierCreateData> {
    // Check for duplicate name
    const existingCarrier = await this.carrierRepository.findByName(data.name);
    if (existingCarrier) {
      throw new Error(`Carrier with name "${data.name}" already exists`);
    }

    return data;
  }

  protected async beforeUpdate(id: string, data: CarrierUpdateData): Promise<CarrierUpdateData> {
    // Check for duplicate name if name is being updated
    if (data.name) {
      const nameExists = await this.carrierRepository.checkNameExists(data.name, id);
      if (nameExists) {
        throw new Error(`Carrier with name "${data.name}" already exists`);
      }
    }

    return data;
  }

  protected async beforeDelete(id: string): Promise<{ allowed: boolean; reason?: string }> {
    // Check if carrier has associated comp guide entries
    // This would require a comp guide repository query
    // For now, allow deletion (can be enhanced later)
    return { allowed: true };
  }

  // Carrier-specific methods
  async findByName(name: string) {
    try {
      const carrier = await this.carrierRepository.findByName(name);
      return {
        data: carrier,
        success: true
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        success: false
      };
    }
  }

  async getActiveCarriers() {
    try {
      const carriers = await this.carrierRepository.findActiveCarriers();
      return {
        data: carriers,
        success: true
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        success: false
      };
    }
  }

  async searchCarriers(searchTerm: string) {
    try {
      const carriers = await this.carrierRepository.searchByName(searchTerm);
      return {
        data: carriers,
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
  async getAll(): Promise<Carrier[]> {
    const result = await super.getAll();
    if (result.success && result.data) {
      return result.data;
    }
    throw new Error(result.error || 'Failed to get carriers');
  }

  async getById(id: string): Promise<Carrier | null> {
    const result = await super.getById(id);
    if (result.success) {
      return result.data || null;
    }
    throw new Error(result.error || 'Failed to get carrier');
  }

  async create(data: NewCarrierForm): Promise<Carrier> {
    const result = await super.create(data);
    if (result.success && result.data) {
      return result.data;
    }
    throw new Error(result.error || 'Failed to create carrier');
  }

  async update(id: string, data: Partial<Carrier>): Promise<Carrier> {
    const result = await super.update(id, data);
    if (result.success && result.data) {
      return result.data;
    }
    throw new Error(result.error || 'Failed to update carrier');
  }

  async delete(id: string): Promise<void> {
    const result = await super.delete(id);
    if (!result.success) {
      throw new Error(result.error || 'Failed to delete carrier');
    }
  }
}

export const carrierService = new CarrierService();