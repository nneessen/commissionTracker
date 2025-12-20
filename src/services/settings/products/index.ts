// src/services/settings/products/index.ts
export { productService, ProductServiceClass } from "./ProductService";
export { ProductRepository } from "./ProductRepository";

// Re-export types
export type {
  Product,
  ProductFormData,
  ProductType,
  ProductWithCarrier,
  ProductFilters,
  ProductOption,
} from "@/types/product.types";
