// src/services/lead-purchases/LeadVendorService.ts
import { BaseService, type ServiceResponse } from "../base/BaseService";
import { LeadVendorRepository } from "./LeadVendorRepository";
import type {
  LeadVendor,
  CreateLeadVendorData,
  UpdateLeadVendorData,
  VendorWithStats,
  MergeVendorsResult,
} from "@/types/lead-purchase.types";

export class LeadVendorService extends BaseService<
  LeadVendor,
  CreateLeadVendorData,
  UpdateLeadVendorData
> {
  declare protected repository: LeadVendorRepository;

  constructor(repository: LeadVendorRepository) {
    super(repository);
  }

  protected initializeValidationRules(): void {
    this.validationRules = [
      {
        field: "name",
        validate: (value) => {
          if (typeof value !== "string") return false;
          const trimmed = value.trim();
          return trimmed.length > 0 && trimmed.length <= 255;
        },
        message: "Vendor name is required and must be 255 characters or less",
      },
      {
        field: "contactEmail",
        validate: (value) => {
          if (value === undefined || value === null || value === "")
            return true;
          if (typeof value !== "string") return false;
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          return emailRegex.test(value);
        },
        message: "Contact email must be a valid email address",
      },
      {
        field: "website",
        validate: (value) => {
          if (value === undefined || value === null || value === "")
            return true;
          if (typeof value !== "string") return false;
          try {
            new URL(value);
            return true;
          } catch {
            // Allow URLs without protocol
            try {
              new URL(`https://${value}`);
              return true;
            } catch {
              return false;
            }
          }
        },
        message: "Website must be a valid URL",
      },
    ];
  }

  /**
   * Get all active vendors for the current user's IMO
   */
  async getActiveVendors(): Promise<ServiceResponse<LeadVendor[]>> {
    try {
      const vendors = await this.repository.findActiveVendors();
      return { success: true, data: vendors };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Search vendors by name
   */
  async searchVendors(
    searchTerm: string,
  ): Promise<ServiceResponse<LeadVendor[]>> {
    try {
      const vendors = await this.repository.searchByName(searchTerm);
      return { success: true, data: vendors };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Soft delete a vendor
   */
  async softDelete(id: string): Promise<ServiceResponse<void>> {
    try {
      await this.repository.softDelete(id);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Create vendor with duplicate name check
   */
  async create(
    data: CreateLeadVendorData,
  ): Promise<ServiceResponse<LeadVendor>> {
    // Check for duplicate name
    const existing = await this.repository.findByName(data.name);
    if (existing) {
      return {
        success: false,
        error: new Error(
          `A vendor with the name "${data.name}" already exists`,
        ),
      };
    }

    return super.create(data);
  }

  /**
   * Get all vendors with purchase stats (for management UI)
   */
  async getAllWithStats(
    includeInactive = false,
  ): Promise<ServiceResponse<VendorWithStats[]>> {
    try {
      const vendors = await this.repository.findAllWithStats(includeInactive);
      return { success: true, data: vendors };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Merge multiple vendors into one
   */
  async mergeVendors(
    keepVendorId: string,
    mergeVendorIds: string[],
  ): Promise<ServiceResponse<MergeVendorsResult>> {
    try {
      if (!keepVendorId) {
        return {
          success: false,
          error: new Error("Keep vendor ID is required"),
        };
      }

      if (!mergeVendorIds || mergeVendorIds.length === 0) {
        return {
          success: false,
          error: new Error("At least one vendor to merge is required"),
        };
      }

      if (mergeVendorIds.includes(keepVendorId)) {
        return {
          success: false,
          error: new Error("Cannot merge a vendor into itself"),
        };
      }

      const result = await this.repository.mergeVendors(
        keepVendorId,
        mergeVendorIds,
      );
      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Toggle vendor active status
   */
  async toggleActive(
    id: string,
    isActive: boolean,
  ): Promise<ServiceResponse<LeadVendor>> {
    try {
      const vendor = await this.repository.toggleActive(id, isActive);
      return { success: true, data: vendor };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }
}

// Create singleton instance
const leadVendorRepository = new LeadVendorRepository();
export const leadVendorService = new LeadVendorService(leadVendorRepository);
