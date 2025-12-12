// src/services/base/BaseService.ts
import {BaseRepository, BaseEntity, QueryOptions, FilterOptions} from './BaseRepository';
import {logger} from './logger';

export interface ServiceResponse<T> {
  data?: T;
  error?: Error;
  success: boolean;
}

export interface ListResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ValidationRule {
  field: string;
  validate: (value: unknown, data?: Record<string, unknown>) => boolean;
  message: string;
}

export abstract class BaseService<
  T extends BaseEntity,
  CreateData = Partial<T>,
  UpdateData = Partial<T>
> {
  protected repository: BaseRepository<T, CreateData, UpdateData>;
  protected validationRules: ValidationRule[] = [];

  constructor(repository: BaseRepository<T, CreateData, UpdateData>) {
    this.repository = repository;
    this.initializeValidationRules();
  }

  /**
   * Initialize validation rules - override in child classes
   */
  protected initializeValidationRules(): void {
    // Override in child classes to add specific validation rules
  }

  /**
   * Validate data against rules
   */
  protected validate(data: Record<string, unknown>, rules?: ValidationRule[]): Error[] {
    const errors: Error[] = [];
    const rulesToUse = rules || this.validationRules;

    rulesToUse.forEach(rule => {
      const value = this.getNestedValue(data, rule.field);
      if (!rule.validate(value, data)) {
        errors.push(new Error(rule.message));
      }
    });

    return errors;
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce((current: unknown, part) => {
      return current && typeof current === 'object' && part in current
        ? (current as Record<string, unknown>)[part]
        : undefined;
    }, obj);
  }

  /**
   * Create a new entity
   */
  async create(data: CreateData): Promise<ServiceResponse<T>> {
    try {
      const errors = this.validate(data as Record<string, unknown>);
      if (errors.length > 0) {
        return {
          success: false,
          error: new Error(errors.map(e => e.message).join(', '))
        };
      }

      const entity = await this.repository.create(data);
      return {
        success: true,
        data: entity
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }

  /**
   * Get entity by ID
   */
  async getById(id: string): Promise<ServiceResponse<T>> {
    try {
      const entity = await this.repository.findById(id);

      if (!entity) {
        return {
          success: false,
          error: new Error('Entity not found')
        };
      }

      return {
        success: true,
        data: entity
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }

  /**
   * Get all entities
   */
  async getAll(options?: QueryOptions, filters?: FilterOptions): Promise<ServiceResponse<T[]>> {
    try {
      const entities = await this.repository.findAll(options, filters);

      return {
        success: true,
        data: entities
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }

  /**
   * Get paginated list
   */
  async getPaginated(
    page: number = 1,
    pageSize: number = 10,
    filters?: FilterOptions,
    orderBy?: string,
    orderDirection: 'asc' | 'desc' = 'desc'
  ): Promise<ServiceResponse<ListResponse<T>>> {
    try {
      const offset = (page - 1) * pageSize;

      const [entities, total] = await Promise.all([
        this.repository.findAll(
          {
            limit: pageSize,
            offset,
            orderBy,
            orderDirection
          },
          filters
        ),
        this.repository.count(filters)
      ]);

      return {
        success: true,
        data: {
          data: entities,
          total,
          page,
          pageSize
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }

  /**
   * Update an entity
   */
  async update(id: string, updates: UpdateData): Promise<ServiceResponse<T>> {
    try {
      const errors = this.validate(updates as Record<string, unknown>);
      if (errors.length > 0) {
        return {
          success: false,
          error: new Error(errors.map(e => e.message).join(', '))
        };
      }

      const entity = await this.repository.update(id, updates);
      return {
        success: true,
        data: entity
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }

  /**
   * Delete an entity
   */
  async delete(id: string): Promise<ServiceResponse<void>> {
    try {
      await this.repository.delete(id);
      return {
        success: true
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }

  /**
   * Batch create entities
   */
  async createMany(items: CreateData[]): Promise<ServiceResponse<T[]>> {
    try {
      // Validate all items
      for (const item of items) {
        const errors = this.validate(item as Record<string, unknown>);
        if (errors.length > 0) {
          return {
            success: false,
            error: new Error(`Validation failed: ${errors.map(e => e.message).join(', ')}`)
          };
        }
      }

      const entities = await this.repository.createMany(items);
      return {
        success: true,
        data: entities
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }

  /**
   * Check if entity exists
   */
  async exists(id: string): Promise<boolean> {
    try {
      return await this.repository.exists(id);
    } catch (error) {
      logger.error('Error checking existence', error instanceof Error ? error : String(error), 'BaseService');
      return false;
    }
  }

  /**
   * Get count of entities
   */
  async count(filters?: FilterOptions): Promise<number> {
    try {
      return await this.repository.count(filters);
    } catch (error) {
      logger.error('Error getting count', error instanceof Error ? error : String(error), 'BaseService');
      return 0;
    }
  }
}