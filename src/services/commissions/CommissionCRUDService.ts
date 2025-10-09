// src/services/commissions/CommissionCRUDService.ts
// Handles basic CRUD operations for commissions

import { Commission } from '../../types/commission.types';
import { CommissionRepository } from './CommissionRepository';
import { logger } from '../base/logger';
import { NotFoundError, DatabaseError, ValidationError, getErrorMessage } from '../../errors/ServiceErrors';
import { withRetry } from '../../utils/retry';
import { caches } from '../../utils/cache';

export interface CreateCommissionData {
  policyId?: string;
  userId?: string;
  client: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
  carrierId: string;
  product: string;
  type: string;
  status: string;
  calculationBasis: string;
  annualPremium: number;
  monthlyPremium?: number;

  // ADVANCE (upfront payment)
  advanceAmount?: number;
  advanceMonths?: number;

  // EARNING TRACKING
  monthsPaid?: number;
  earnedAmount?: number;
  unearnedAmount?: number;
  lastPaymentDate?: Date;

  // COMMISSION RATE
  commissionRate?: number;
  contractCompLevel?: number;
  isAutoCalculated?: boolean;

  // Dates
  expectedDate?: Date;
  actualDate?: Date;
  monthEarned?: number;
  yearEarned?: number;
  notes?: string;
}

export interface UpdateCommissionData extends Partial<CreateCommissionData> {
  id: string;
}

export interface CommissionFilters {
  status?: string;
  type?: string;
  carrierId?: string;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  minAmount?: number;
  maxAmount?: number;
  product?: string;
  calculationBasis?: string;
}

class CommissionCRUDService {
  private repository: CommissionRepository;

  constructor() {
    this.repository = new CommissionRepository();
  }

  /**
   * Handles and transforms errors into structured ServiceError types
   *
   * @param error - The error to handle
   * @param context - The context/method where the error occurred
   * @param entityId - Optional ID of the entity related to the error
   * @throws {NotFoundError | DatabaseError | ValidationError} Structured error based on error type
   *
   * @private
   */
  private handleError(error: unknown, context: string, entityId?: string): never {
    const message = getErrorMessage(error);
    logger.error(`CommissionCRUDService.${context}`, error instanceof Error ? error : new Error(String(error)));

    // Re-throw if already a structured error
    if (error instanceof NotFoundError || error instanceof DatabaseError || error instanceof ValidationError) {
      throw error;
    }

    // Wrap in appropriate error type
    throw new DatabaseError(context, error instanceof Error ? error : new Error(message), { entityId });
  }

  /**
   * Retrieves all commissions from the database
   *
   * @returns Promise resolving to an array of all commissions
   * @throws {DatabaseError} If the database query fails
   *
   * @example
   * ```ts
   * const commissions = await commissionCRUDService.getAll();
   * console.log(`Found ${commissions.length} commissions`);
   * ```
   */
  async getAll(): Promise<Commission[]> {
    try {
      return await withRetry(async () => {
        // CommissionRepository already transforms the data in its findAll method
        return await this.repository.findAll();
      }, { maxAttempts: 2 });
    } catch (error) {
      throw this.handleError(error, 'getAll');
    }
  }

  /**
   * Retrieves a single commission by its ID
   *
   * @param id - The unique identifier of the commission
   * @returns Promise resolving to the commission or null if not found
   * @throws {ValidationError} If the ID is invalid or missing
   * @throws {NotFoundError} If the commission does not exist
   * @throws {DatabaseError} If the database query fails
   *
   * @example
   * ```ts
   * const commission = await commissionCRUDService.getById('123e4567-e89b-12d3');
   * if (commission) {
   *   console.log(`Found commission for ${commission.client.firstName}`);
   * }
   * ```
   */
  async getById(id: string): Promise<Commission | null> {
    if (!id) {
      throw new ValidationError('Invalid commission ID', [
        { field: 'id', message: 'ID is required', value: id }
      ]);
    }

    try {
      return await withRetry(async () => {
        const commission = await this.repository.findById(id);
        if (!commission) {
          throw new NotFoundError('Commission', id);
        }
        // Repository already transforms the data
        return commission;
      }, { maxAttempts: 2 });
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw this.handleError(error, 'getById', id);
    }
  }

  /**
   * Retrieves all commissions associated with a specific policy
   *
   * @param policyId - The unique identifier of the policy
   * @returns Promise resolving to an array of commissions for the policy
   * @throws {DatabaseError} If the database query fails
   *
   * @example
   * ```ts
   * const policyCommissions = await commissionCRUDService.getByPolicyId('POL-12345');
   * ```
   */
  async getByPolicyId(policyId: string): Promise<Commission[]> {
    try {
      // Repository already transforms the data
      return await this.repository.findByPolicy(policyId);
    } catch (error) {
      throw this.handleError(error, 'getByPolicyId');
    }
  }

  /**
   * Retrieves all commissions for a specific user/agent
   *
   * @param userId - The unique identifier of the user
   * @returns Promise resolving to an array of commissions for the user
   * @throws {DatabaseError} If the database query fails
   *
   * @example
   * ```ts
   * const userCommissions = await commissionCRUDService.getCommissionsByUser('user-123');
   * ```
   */
  async getCommissionsByUser(userId: string): Promise<Commission[]> {
    try {
      // Repository already transforms the data
      return await this.repository.findByAgent(userId);
    } catch (error) {
      throw this.handleError(error, 'getCommissionsByUser');
    }
  }

  /**
   * Creates a new commission record
   *
   * @param data - The commission data to create
   * @returns Promise resolving to the newly created commission
   * @throws {ValidationError} If required fields are missing or invalid
   * @throws {DatabaseError} If the database operation fails
   *
   * @example
   * ```ts
   * const newCommission = await commissionCRUDService.create({
   *   client: { firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
   *   carrierId: 'carrier-123',
   *   product: 'whole_life',
   *   type: 'new_business',
   *   status: 'pending',
   *   calculationBasis: 'annual_premium',
   *   annualPremium: 12000
   * });
   * ```
   */
  async create(data: CreateCommissionData): Promise<Commission> {
    // Validate required fields
    const errors: Array<{ field: string; message: string; value?: unknown }> = [];

    if (!data.client) {
      errors.push({ field: 'client', message: 'Client information is required' });
    }
    if (!data.carrierId) {
      errors.push({ field: 'carrierId', message: 'Carrier ID is required' });
    }
    if (!data.product) {
      errors.push({ field: 'product', message: 'Product is required' });
    }
    if (!data.annualPremium || data.annualPremium <= 0) {
      errors.push({ field: 'annualPremium', message: 'Annual premium must be greater than 0', value: data.annualPremium });
    }

    if (errors.length > 0) {
      throw new ValidationError('Invalid commission data', errors);
    }

    try {
      const dbData = this.transformToDB(data);
      const created = await this.repository.create(dbData);
      const commission = this.transformFromDB(created);

      // Cache the newly created commission
      const cacheKey = `commission:${commission.id}`;
      caches.commissions.set(cacheKey, commission);

      return commission;
    } catch (error) {
      throw this.handleError(error, 'create');
    }
  }

  /**
   * Updates an existing commission record
   *
   * @param id - The unique identifier of the commission to update
   * @param data - Partial commission data with fields to update
   * @returns Promise resolving to the updated commission
   * @throws {ValidationError} If the ID is invalid or missing
   * @throws {NotFoundError} If the commission does not exist
   * @throws {DatabaseError} If the database operation fails
   *
   * @example
   * ```ts
   * const updated = await commissionCRUDService.update('123e4567-e89b-12d3', {
   *   status: 'paid',
   *   actualDate: new Date()
   * });
   * ```
   */
  async update(id: string, data: Partial<CreateCommissionData>): Promise<Commission> {
    if (!id) {
      throw new ValidationError('Invalid commission ID', [
        { field: 'id', message: 'ID is required' }
      ]);
    }

    try {
      // Verify commission exists first
      await this.getById(id);

      const dbData = this.transformToDB(data, true);
      const updated = await this.repository.update(id, dbData);
      const commission = this.transformFromDB(updated);

      // Invalidate cache and update with new data
      const cacheKey = `commission:${id}`;
      caches.commissions.set(cacheKey, commission);

      return commission;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw this.handleError(error, 'update', id);
    }
  }

  /**
   * Deletes a commission record from the database
   *
   * @param id - The unique identifier of the commission to delete
   * @returns Promise that resolves when deletion is complete
   * @throws {ValidationError} If the ID is invalid or missing
   * @throws {NotFoundError} If the commission does not exist
   * @throws {DatabaseError} If the database operation fails
   *
   * @example
   * ```ts
   * await commissionCRUDService.delete('123e4567-e89b-12d3');
   * console.log('Commission deleted successfully');
   * ```
   */
  async delete(id: string): Promise<void> {
    if (!id) {
      throw new ValidationError('Invalid commission ID', [
        { field: 'id', message: 'ID is required' }
      ]);
    }

    try {
      // Verify commission exists first
      await this.getById(id);

      await this.repository.delete(id);

      // Invalidate cache
      const cacheKey = `commission:${id}`;
      caches.commissions.delete(cacheKey);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw this.handleError(error, 'delete', id);
    }
  }

  /**
   * Retrieves commissions filtered by various criteria
   *
   * @param filters - Filter criteria for querying commissions
   * @returns Promise resolving to an array of filtered commissions
   * @throws {DatabaseError} If the database query fails
   *
   * @example
   * ```ts
   * const filtered = await commissionCRUDService.getFiltered({
   *   status: 'paid',
   *   startDate: new Date('2024-01-01'),
   *   minAmount: 1000
   * });
   * ```
   */
  async getFiltered(filters: CommissionFilters): Promise<Commission[]> {
    try {
      let commissions = await this.repository.findAll();

      // Apply filters
      if (filters.status) {
        commissions = commissions.filter(c => c.status === filters.status);
      }

      if (filters.type) {
        commissions = commissions.filter(c => c.type === filters.type);
      }

      if (filters.carrierId) {
        commissions = commissions.filter(c => (c as any).carrier_id === filters.carrierId);
      }

      if (filters.userId) {
        commissions = commissions.filter(c => (c as any).user_id === filters.userId);
      }

      if (filters.product) {
        commissions = commissions.filter(c =>
          c.product.toLowerCase().includes(filters.product!.toLowerCase())
        );
      }

      if (filters.calculationBasis) {
        commissions = commissions.filter(c => (c as any).calculation_basis === filters.calculationBasis);
      }

      if (filters.startDate) {
        commissions = commissions.filter(c => {
          const commDate = (c as any).expected_date ? new Date((c as any).expected_date) : null;
          return commDate && commDate >= filters.startDate!;
        });
      }

      if (filters.endDate) {
        commissions = commissions.filter(c => {
          const commDate = (c as any).expected_date ? new Date((c as any).expected_date) : null;
          return commDate && commDate <= filters.endDate!;
        });
      }

      if (filters.minAmount !== undefined) {
        commissions = commissions.filter(c =>
          parseFloat((c as any).commission_amount) >= filters.minAmount!
        );
      }

      if (filters.maxAmount !== undefined) {
        commissions = commissions.filter(c =>
          parseFloat((c as any).commission_amount) <= filters.maxAmount!
        );
      }

      return commissions.map(this.transformFromDB);
    } catch (error) {
      throw this.handleError(error, 'getFiltered');
    }
  }

  /**
   * Transforms a database record to a Commission domain object
   *
   * @param dbRecord - The raw database record
   * @returns Transformed Commission object with camelCase properties
   *
   * @private
   */
  private transformFromDB(dbRecord: any): Commission {
    return {
      id: dbRecord.id,
      policyId: dbRecord.policy_id,
      userId: dbRecord.user_id,
      client: dbRecord.client,
      carrierId: dbRecord.carrier_id,
      product: dbRecord.product,
      type: dbRecord.type,
      status: dbRecord.status,
      calculationBasis: dbRecord.calculation_basis,
      annualPremium: parseFloat(dbRecord.annual_premium || 0),
      monthlyPremium: parseFloat(dbRecord.monthly_premium || dbRecord.annual_premium / 12 || 0),

      // ADVANCE (upfront payment)
      advanceAmount: parseFloat(dbRecord.advance_amount || dbRecord.amount || 0), // New column name with fallback
      advanceMonths: dbRecord.advance_months ?? 9,

      // EARNING TRACKING
      monthsPaid: dbRecord.months_paid || 0,
      earnedAmount: parseFloat(dbRecord.earned_amount || 0),
      unearnedAmount: parseFloat(dbRecord.unearned_amount || 0),
      lastPaymentDate: dbRecord.last_payment_date ? new Date(dbRecord.last_payment_date) : undefined,

      // COMMISSION RATE
      commissionRate: parseFloat(dbRecord.rate || dbRecord.commission_rate || 0),

      contractCompLevel: dbRecord.contract_comp_level,
      isAutoCalculated: dbRecord.is_auto_calculated || false,
      expectedDate: dbRecord.expected_date ? new Date(dbRecord.expected_date) : undefined,
      actualDate: dbRecord.actual_date ? new Date(dbRecord.actual_date) : undefined,
      paidDate: dbRecord.payment_date ? new Date(dbRecord.payment_date) : undefined,
      monthEarned: dbRecord.month_earned,
      yearEarned: dbRecord.year_earned,
      notes: dbRecord.notes,
      createdAt: new Date(dbRecord.created_at),
      updatedAt: dbRecord.updated_at ? new Date(dbRecord.updated_at) : undefined,
    };
  }

  /**
   * Transforms a Commission domain object to database format
   *
   * @param data - The commission data to transform
   * @param isUpdate - Whether this is an update operation (affects timestamp handling)
   * @returns Transformed object with snake_case properties for database storage
   *
   * @private
   */
  private transformToDB(data: Partial<CreateCommissionData>, isUpdate = false): any {
    const dbData: any = {};

    if (data.policyId !== undefined) dbData.policy_id = data.policyId;
    const userId = data.userId;
    if (userId !== undefined) {
      dbData.user_id = userId;
    }
    if (data.client !== undefined) dbData.client = data.client;
    if (data.carrierId !== undefined) dbData.carrier_id = data.carrierId;
    if (data.product !== undefined) dbData.product = data.product;
    if (data.type !== undefined) dbData.type = data.type;
    if (data.status !== undefined) dbData.status = data.status;
    if (data.calculationBasis !== undefined) dbData.calculation_basis = data.calculationBasis;
    if (data.annualPremium !== undefined) dbData.annual_premium = data.annualPremium;
    if (data.monthlyPremium !== undefined) dbData.monthly_premium = data.monthlyPremium;

    // ADVANCE
    if (data.advanceAmount !== undefined) dbData.advance_amount = data.advanceAmount;
    if (data.advanceMonths !== undefined) dbData.advance_months = data.advanceMonths;

    // EARNING TRACKING
    if (data.monthsPaid !== undefined) dbData.months_paid = data.monthsPaid;
    if (data.earnedAmount !== undefined) dbData.earned_amount = data.earnedAmount;
    if (data.unearnedAmount !== undefined) dbData.unearned_amount = data.unearnedAmount;
    if (data.lastPaymentDate !== undefined) dbData.last_payment_date = data.lastPaymentDate;

    // COMMISSION RATE
    if (data.commissionRate !== undefined) dbData.rate = data.commissionRate;

    if (data.contractCompLevel !== undefined) dbData.contract_comp_level = data.contractCompLevel;
    if (data.isAutoCalculated !== undefined) dbData.is_auto_calculated = data.isAutoCalculated;
    if (data.expectedDate !== undefined) dbData.expected_date = data.expectedDate;
    if (data.actualDate !== undefined) dbData.actual_date = data.actualDate;
    if (data.monthEarned !== undefined) dbData.month_earned = data.monthEarned;
    if (data.yearEarned !== undefined) dbData.year_earned = data.yearEarned;
    if (data.notes !== undefined) dbData.notes = data.notes;

    if (!isUpdate) {
      dbData.created_at = new Date().toISOString();
    }
    dbData.updated_at = new Date().toISOString();

    return dbData;
  }
}

export const commissionCRUDService = new CommissionCRUDService();
