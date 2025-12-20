// src/services/settings/carriers/index.ts
export { carrierService, CarrierServiceClass } from "./CarrierService";
export { CarrierRepository } from "./CarrierRepository";

// Re-export types
export type {
  Carrier,
  CarrierRow,
  CarrierInsert,
  CarrierUpdate,
  NewCarrierForm,
  UpdateCarrierForm,
  CarrierContactInfo,
} from "@/types/carrier.types";
