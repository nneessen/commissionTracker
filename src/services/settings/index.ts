// src/services/settings/index.ts

// Carrier service - refactored to BaseRepository pattern
export {
  carrierService,
  CarrierServiceClass,
  CarrierRepository,
} from "./carriers";
export type {
  Carrier,
  CarrierRow,
  NewCarrierForm,
  CarrierContactInfo,
} from "./carriers";

// Product service - refactored to BaseRepository pattern
export {
  productService,
  ProductServiceClass,
  ProductRepository,
} from "./products";
export type {
  Product,
  ProductFormData,
  ProductType,
  ProductWithCarrier,
  ProductFilters,
  ProductOption,
} from "./products";

// Comp guide service - refactored to BaseRepository pattern
export {
  compGuideService,
  CompGuideServiceClass,
  CompGuideRepository,
} from "./comp-guide";
export type { CompGuideEntry, CompGuideFormData } from "./comp-guide";

// Other settings services
export { constantsService } from "./constantsService";
export { agentSettingsService } from "./agentSettingsService";
