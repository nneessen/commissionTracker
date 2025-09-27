// src/services/base/BaseService.ts
import { BaseRepository, BaseEntity, QueryOptions, FilterOptions } from './BaseRepository';

export interface ServiceResponse<T> {
  data?: T;
  error?: string;
  success: boolean;
}

export interface ListResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  success: boolean;
  error?: string;
}

export interface ValidationRule {
  field: string;
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'date' | 'email' | 'uuid';
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean | string;
}

export abstract class BaseService<T extends BaseEntity, TCreate = Omit<T, 'id' | 'created_at' | 'updated_at'>, TUpdate = Partial<TCreate>> {
  protected readonly repository: BaseRepository<T, TCreate, TUpdate>;

  constructor(repository: BaseRepository<T, TCreate, TUpdate>) {
    this.repository = repository;
  }

  async getAll(options?: QueryOptions): Promise<ServiceResponse<T[]>> {
    try {
      const data = await this.repository.findAll(options);
      return {
        data,
        success: true
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        success: false
      };
    }
  }

  async getById(id: string): Promise<ServiceResponse<T | null>> {
    try {
      if (!this.isValidUUID(id)) {
        return {
          error: 'Invalid ID format',
          success: false
        };
      }

      const data = await this.repository.findById(id);
      return {
        data,
        success: true
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        success: false
      };
    }
  }

  async getByFilters(filters: FilterOptions, options?: QueryOptions): Promise<ServiceResponse<T[]>> {
    try {
      const data = await this.repository.findByFilters(filters, options);
      return {
        data,
        success: true
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        success: false
      };
    }
  }

  async getListWithPagination(page: number = 1, limit: number = 10, filters?: FilterOptions): Promise<ListResponse<T>> {
    try {
      const offset = (page - 1) * limit;
      const options: QueryOptions = { limit, offset };

      const [data, total] = await Promise.all([
        this.repository.findByFilters(filters || {}, options),
        this.repository.count(filters)
      ]);

      return {
        data,
        total,
        page,
        limit,
        success: true
      };
    } catch (error) {
      return {
        data: [],
        total: 0,
        page,
        limit,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async create(data: TCreate): Promise<ServiceResponse<T>> {
    try {
      const validationResult = this.validateCreate(data);
      if (!validationResult.isValid) {
        return {
          error: validationResult.errors.join(', '),
          success: false
        };
      }

      const processedData = await this.beforeCreate(data);
      const result = await this.repository.create(processedData);
      await this.afterCreate(result);

      return {
        data: result,
        success: true
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        success: false
      };
    }
  }

  async update(id: string, data: TUpdate): Promise<ServiceResponse<T>> {
    try {
      if (!this.isValidUUID(id)) {
        return {
          error: 'Invalid ID format',
          success: false
        };
      }

      const validationResult = this.validateUpdate(data);
      if (!validationResult.isValid) {
        return {
          error: validationResult.errors.join(', '),
          success: false
        };
      }

      const processedData = await this.beforeUpdate(id, data);
      const result = await this.repository.update(id, processedData);
      await this.afterUpdate(result);

      return {
        data: result,
        success: true
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        success: false
      };
    }
  }

  async delete(id: string): Promise<ServiceResponse<void>> {
    try {
      if (!this.isValidUUID(id)) {
        return {
          error: 'Invalid ID format',
          success: false
        };
      }

      const canDelete = await this.beforeDelete(id);
      if (!canDelete.allowed) {
        return {
          error: canDelete.reason || 'Cannot delete this record',
          success: false
        };
      }

      await this.repository.delete(id);
      await this.afterDelete(id);

      return {
        success: true
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        success: false
      };
    }
  }

  protected validate(data: any, rules: ValidationRule[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const rule of rules) {
      const value = data[rule.field];

      if (rule.required && (value === undefined || value === null || value === '')) {
        errors.push(`${rule.field} is required`);
        continue;
      }

      if (value === undefined || value === null) {
        continue; // Skip validation for optional empty fields
      }

      if (rule.type) {
        if (!this.validateType(value, rule.type)) {
          errors.push(`${rule.field} must be of type ${rule.type}`);
          continue;
        }
      }

      if (rule.minLength && typeof value === 'string' && value.length < rule.minLength) {
        errors.push(`${rule.field} must be at least ${rule.minLength} characters long`);
      }

      if (rule.maxLength && typeof value === 'string' && value.length > rule.maxLength) {
        errors.push(`${rule.field} must not exceed ${rule.maxLength} characters`);
      }

      if (rule.min && typeof value === 'number' && value < rule.min) {
        errors.push(`${rule.field} must be at least ${rule.min}`);
      }

      if (rule.max && typeof value === 'number' && value > rule.max) {
        errors.push(`${rule.field} must not exceed ${rule.max}`);
      }

      if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
        errors.push(`${rule.field} format is invalid`);
      }

      if (rule.custom) {
        const customResult = rule.custom(value);
        if (customResult !== true) {
          errors.push(typeof customResult === 'string' ? customResult : `${rule.field} is invalid`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private validateType(value: any, type: string): boolean {
    switch (type) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'date':
        return value instanceof Date || !isNaN(Date.parse(value));
      case 'email':
        return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      case 'uuid':
        return typeof value === 'string' && this.isValidUUID(value);
      default:
        return true;
    }
  }

  private isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  // Abstract methods for subclasses to implement
  protected abstract validateCreate(data: TCreate): { isValid: boolean; errors: string[] };
  protected abstract validateUpdate(data: TUpdate): { isValid: boolean; errors: string[] };

  // Lifecycle hooks that subclasses can override
  protected async beforeCreate(data: TCreate): Promise<TCreate> {
    return data;
  }

  protected async afterCreate(result: T): Promise<void> {
    // Override in subclasses if needed
  }

  protected async beforeUpdate(id: string, data: TUpdate): Promise<TUpdate> {
    return data;
  }

  protected async afterUpdate(result: T): Promise<void> {
    // Override in subclasses if needed
  }

  protected async beforeDelete(id: string): Promise<{ allowed: boolean; reason?: string }> {
    return { allowed: true };
  }

  protected async afterDelete(id: string): Promise<void> {
    // Override in subclasses if needed
  }
}