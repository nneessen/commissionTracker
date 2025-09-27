import {
  policyService,
  commissionService,
  expenseService,
  carrierService,
  constantsService,
} from '../services';
import { Policy } from '../types/policy.types';
import { Commission } from '../types/commission.types';
import { ExpenseItem, ExpenseData, Constants } from '../types/expense.types';
import { Carrier } from '../types/carrier.types';

export interface MigrationResult {
  success: boolean;
  message: string;
  details: {
    policies: number;
    commissions: number;
    expenses: number;
    carriers: number;
    constants: number;
  };
  errors: string[];
}

interface LocalStorageData {
  policies?: Policy[];
  commissions?: Commission[];
  expenses?: ExpenseData;
  carriers?: Carrier[];
  constants?: Constants;
}

class DataMigrationService {
  async migrateFromLocalStorage(): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: false,
      message: '',
      details: {
        policies: 0,
        commissions: 0,
        expenses: 0,
        carriers: 0,
        constants: 0,
      },
      errors: [],
    };

    try {
      // Get all localStorage data
      const localData = this.getLocalStorageData();

      // Migrate each entity type
      await this.migratePolicies(localData.policies || [], result);
      await this.migrateCommissions(localData.commissions || [], result);
      await this.migrateExpenses(localData.expenses, result);
      await this.migrateCarriers(localData.carriers || [], result);
      await this.migrateConstants(localData.constants, result);

      const totalMigrated = Object.values(result.details).reduce((sum, count) => sum + count, 0);

      if (totalMigrated > 0) {
        result.success = true;
        result.message = `Successfully migrated ${totalMigrated} items to database`;
      } else {
        result.message = 'No data found in localStorage to migrate';
      }

    } catch (error) {
      result.errors.push(`Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      result.message = 'Migration failed due to errors';
    }

    return result;
  }

  async checkDatabaseEmpty(): Promise<boolean> {
    try {
      const [policies, commissions, expenses, carriers] = await Promise.all([
        policyService.getAll(),
        commissionService.getAll(),
        expenseService.getAll(),
        carrierService.getAll(),
      ]);

      return (
        policies.length === 0 &&
        commissions.length === 0 &&
        expenses.length === 0 &&
        carriers.length === 0
      );
    } catch (error) {
      console.error('Error checking database state:', error);
      return false;
    }
  }

  clearLocalStorageData(): void {
    const keys = ['policies', 'commissions', 'expenses', 'carriers', 'constants'];
    keys.forEach(key => {
      try {
        window.localStorage.removeItem(key);
      } catch (error) {
        console.warn(`Failed to clear localStorage key: ${key}`, error);
      }
    });
  }

  private getLocalStorageData(): LocalStorageData {
    const data: LocalStorageData = {};

    try {
      const policies = window.localStorage.getItem('policies');
      if (policies) {
        data.policies = JSON.parse(policies);
      }
    } catch (error) {
      console.warn('Failed to parse policies from localStorage:', error);
    }

    try {
      const commissions = window.localStorage.getItem('commissions');
      if (commissions) {
        data.commissions = JSON.parse(commissions);
      }
    } catch (error) {
      console.warn('Failed to parse commissions from localStorage:', error);
    }

    try {
      const expenses = window.localStorage.getItem('expenses');
      if (expenses) {
        data.expenses = JSON.parse(expenses);
      }
    } catch (error) {
      console.warn('Failed to parse expenses from localStorage:', error);
    }

    try {
      const carriers = window.localStorage.getItem('carriers');
      if (carriers) {
        data.carriers = JSON.parse(carriers);
      }
    } catch (error) {
      console.warn('Failed to parse carriers from localStorage:', error);
    }

    try {
      const constants = window.localStorage.getItem('constants');
      if (constants) {
        data.constants = JSON.parse(constants);
      }
    } catch (error) {
      console.warn('Failed to parse constants from localStorage:', error);
    }

    return data;
  }

  private async migratePolicies(policies: Policy[], result: MigrationResult): Promise<void> {
    for (const policy of policies) {
      try {
        await policyService.create({
          policyNumber: policy.policyNumber,
          client: {
            firstName: policy.client.name?.split(' ')[0] || 'Unknown',
            lastName: policy.client.name?.split(' ').slice(1).join(' ') || '',
            email: policy.client.email,
            phone: policy.client.phone,
            state: policy.client.state,
          },
          carrierId: policy.carrierId,
          product: policy.product,
          effectiveDate: new Date(policy.effectiveDate),
          termLength: policy.termLength,
          expirationDate: policy.expirationDate ? new Date(policy.expirationDate) : undefined,
          annualPremium: policy.annualPremium,
          paymentFrequency: policy.paymentFrequency,
          commissionPercentage: policy.commissionPercentage,
          notes: policy.notes,
        });
        result.details.policies++;
      } catch (error) {
        result.errors.push(`Failed to migrate policy ${policy.policyNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  private async migrateCommissions(commissions: Commission[], result: MigrationResult): Promise<void> {
    for (const commission of commissions) {
      try {
        await commissionService.create({
          policyId: commission.policyId,
          client: commission.client,
          carrierId: commission.carrierId,
          product: commission.product,
          type: commission.type,
          status: commission.status,
          calculationBasis: commission.calculationBasis,
          annualPremium: commission.annualPremium,
          commissionAmount: commission.commissionAmount,
          commissionRate: commission.commissionRate,
          expectedDate: commission.expectedDate ? new Date(commission.expectedDate) : undefined,
          actualDate: commission.actualDate ? new Date(commission.actualDate) : undefined,
          paidDate: commission.paidDate ? new Date(commission.paidDate) : undefined,
          notes: commission.notes,
        });
        result.details.commissions++;
      } catch (error) {
        result.errors.push(`Failed to migrate commission ${commission.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  private async migrateExpenses(expenseData: ExpenseData | undefined, result: MigrationResult): Promise<void> {
    if (!expenseData) return;

    const allExpenses: ExpenseItem[] = [
      ...expenseData.personal.map(e => ({ ...e, category: 'personal' as const })),
      ...expenseData.business.map(e => ({ ...e, category: 'business' as const })),
    ];

    for (const expense of allExpenses) {
      try {
        await expenseService.create({
          name: expense.name,
          amount: expense.amount,
          category: expense.category,
        });
        result.details.expenses++;
      } catch (error) {
        result.errors.push(`Failed to migrate expense ${expense.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  private async migrateCarriers(carriers: Carrier[], result: MigrationResult): Promise<void> {
    for (const carrier of carriers) {
      try {
        await carrierService.create({
          name: carrier.name,
          isActive: carrier.isActive,
          commissionRates: carrier.commissionRates,
        });
        result.details.carriers++;
      } catch (error) {
        result.errors.push(`Failed to migrate carrier ${carrier.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  private async migrateConstants(constants: Constants | undefined, result: MigrationResult): Promise<void> {
    if (!constants) return;

    try {
      await constantsService.updateMultiple(constants);
      result.details.constants = Object.keys(constants).length;
    } catch (error) {
      result.errors.push(`Failed to migrate constants: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const dataMigrationService = new DataMigrationService();