// src/services/settings/carriers/CarrierService.ts
import { ServiceResponse } from "../../base/BaseService";
import { CarrierRepository } from "./CarrierRepository";
import type { Carrier, NewCarrierForm } from "@/types/carrier.types";
import type { Json } from "@/types/database.types";

/**
 * Service for carrier business logic
 * Uses CarrierRepository for data access
 */
class CarrierServiceClass {
  private repository: CarrierRepository;

  constructor() {
    this.repository = new CarrierRepository();
  }

  /**
   * Get all carriers
   */
  async getAll(): Promise<ServiceResponse<Carrier[]>> {
    try {
      const carriers = await this.repository.findAll();
      return { success: true, data: carriers as Carrier[] };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Get carrier by ID
   */
  async getById(id: string): Promise<ServiceResponse<Carrier>> {
    try {
      const carrier = await this.repository.findById(id);
      if (!carrier) {
        return { success: false, error: new Error("Carrier not found") };
      }
      return { success: true, data: carrier as Carrier };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Create a new carrier
   */
  async create(data: NewCarrierForm): Promise<ServiceResponse<Carrier>> {
    try {
      const carrier = await this.repository.create({
        name: data.name,
        code: data.code || null,
        is_active: data.is_active ?? true,
        contact_info: (data.contact_info || null) as Json,
        commission_structure: null,
      });
      return { success: true, data: carrier as Carrier };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Update a carrier
   */
  async update(
    id: string,
    data: Partial<NewCarrierForm>,
  ): Promise<ServiceResponse<Carrier>> {
    try {
      const updateData: Record<string, unknown> = {};

      if (data.name !== undefined) updateData.name = data.name;
      if (data.code !== undefined) updateData.code = data.code;
      if (data.is_active !== undefined) updateData.is_active = data.is_active;
      if (data.contact_info !== undefined) {
        updateData.contact_info = data.contact_info as Json;
      }

      const carrier = await this.repository.update(id, updateData);
      return { success: true, data: carrier as Carrier };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Delete a carrier
   */
  async delete(id: string): Promise<ServiceResponse<void>> {
    try {
      await this.repository.delete(id);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Search carriers by name or code
   */
  async search(query: string): Promise<ServiceResponse<Carrier[]>> {
    try {
      const carriers = await this.repository.search(query);
      return { success: true, data: carriers as Carrier[] };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Get all active carriers
   */
  async getActive(): Promise<ServiceResponse<Carrier[]>> {
    try {
      const carriers = await this.repository.findActive();
      return { success: true, data: carriers as Carrier[] };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }
}

export const carrierService = new CarrierServiceClass();
export { CarrierServiceClass };
