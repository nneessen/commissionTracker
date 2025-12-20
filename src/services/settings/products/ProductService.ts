// src/services/settings/products/ProductService.ts
import { ServiceResponse } from "../../base/BaseService";
import { ProductRepository } from "./ProductRepository";
import type { Product, ProductFormData } from "@/types/product.types";

/**
 * Service for product business logic
 * Uses ProductRepository for data access
 */
class ProductServiceClass {
  private repository: ProductRepository;

  constructor() {
    this.repository = new ProductRepository();
  }

  /**
   * Get all products
   */
  async getAll(): Promise<ServiceResponse<Product[]>> {
    try {
      const products = await this.repository.findAll();
      return { success: true, data: products as Product[] };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Get product by ID
   */
  async getById(id: string): Promise<ServiceResponse<Product>> {
    try {
      const product = await this.repository.findById(id);
      if (!product) {
        return { success: false, error: new Error("Product not found") };
      }
      return { success: true, data: product as Product };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Create a new product
   */
  async create(data: ProductFormData): Promise<ServiceResponse<Product>> {
    try {
      const product = await this.repository.create({
        ...data,
        is_active: data.is_active ?? true,
      });
      return { success: true, data: product as Product };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Update a product
   */
  async update(
    id: string,
    data: Partial<ProductFormData>,
  ): Promise<ServiceResponse<Product>> {
    try {
      const product = await this.repository.update(id, data);
      return { success: true, data: product as Product };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Delete a product
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
   * Get products by carrier
   */
  async getByCarrier(carrierId: string): Promise<ServiceResponse<Product[]>> {
    try {
      const products = await this.repository.findByCarrier(carrierId);
      return { success: true, data: products as Product[] };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Get all active products
   */
  async getActive(): Promise<ServiceResponse<Product[]>> {
    try {
      const products = await this.repository.findActive();
      return { success: true, data: products as Product[] };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Search products by name
   */
  async search(query: string): Promise<ServiceResponse<Product[]>> {
    try {
      const products = await this.repository.search(query);
      return { success: true, data: products as Product[] };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Bulk create products
   */
  async bulkCreate(
    products: ProductFormData[],
  ): Promise<ServiceResponse<Product[]>> {
    try {
      const created = await this.repository.createMany(
        products.map((p) => ({
          ...p,
          is_active: p.is_active ?? true,
        })),
      );
      return { success: true, data: created as Product[] };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }
}

export const productService = new ProductServiceClass();
export { ProductServiceClass };
