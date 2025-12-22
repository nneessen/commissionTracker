// src/types/documents.types.ts
/**
 * Document Type Definitions for Insurance Agents
 *
 * Defines document categories, types, and expiration defaults for the
 * insurance sales document management system.
 */

// =============================================================================
// Document Categories
// =============================================================================

/**
 * Document categories for organizing insurance agent documents
 */
export const DOCUMENT_CATEGORIES = {
  licensing: {
    label: "Licensing",
    description: "State insurance licenses and exam documentation",
    icon: "FileCheck",
    types: ["resident_license", "nonresident_license", "exam_results"] as const,
  },
  insurance: {
    label: "Insurance",
    description: "Errors & Omissions and professional liability coverage",
    icon: "Shield",
    types: ["e_and_o_insurance"] as const,
  },
  contracting: {
    label: "Contracting",
    description: "Carrier contracts and appointments",
    icon: "FileSignature",
    types: ["carrier_appointment", "carrier_contract"] as const,
  },
  compliance: {
    label: "Compliance",
    description: "Background checks and continuing education",
    icon: "ClipboardCheck",
    types: ["background_check", "continuing_education"] as const,
  },
  identification: {
    label: "Identification",
    description: "Personal identification documents",
    icon: "IdCard",
    types: ["drivers_license", "ssn_card", "passport"] as const,
  },
  other: {
    label: "Other",
    description: "Miscellaneous documents",
    icon: "File",
    types: ["application", "resume", "certification", "other"] as const,
  },
} as const;

// =============================================================================
// Derived Types
// =============================================================================

/**
 * Document category keys
 */
export type DocumentCategory = keyof typeof DOCUMENT_CATEGORIES;

/**
 * All insurance document types (union of all category types)
 */
export type InsuranceDocumentType =
  | (typeof DOCUMENT_CATEGORIES.licensing.types)[number]
  | (typeof DOCUMENT_CATEGORIES.insurance.types)[number]
  | (typeof DOCUMENT_CATEGORIES.contracting.types)[number]
  | (typeof DOCUMENT_CATEGORIES.compliance.types)[number]
  | (typeof DOCUMENT_CATEGORIES.identification.types)[number]
  | (typeof DOCUMENT_CATEGORIES.other.types)[number];

/**
 * Document status values
 */
export type DocumentStatus =
  | "pending"
  | "received"
  | "approved"
  | "rejected"
  | "expired";

// =============================================================================
// Document Type Labels
// =============================================================================

/**
 * Human-readable labels for document types
 */
export const DOCUMENT_TYPE_LABELS: Record<InsuranceDocumentType, string> = {
  // Licensing
  resident_license: "Resident License",
  nonresident_license: "Non-Resident License",
  exam_results: "Exam Results",
  // Insurance
  e_and_o_insurance: "E&O Insurance",
  // Contracting
  carrier_appointment: "Carrier Appointment",
  carrier_contract: "Carrier Contract",
  // Compliance
  background_check: "Background Check",
  continuing_education: "Continuing Education",
  // Identification
  drivers_license: "Driver's License",
  ssn_card: "SSN Card",
  passport: "Passport",
  // Other
  application: "Application",
  resume: "Resume",
  certification: "Certification",
  other: "Other",
};

// =============================================================================
// Expiration Defaults
// =============================================================================

/**
 * Default expiration periods in days for each document type
 * null = no expiration (permanent document)
 */
export const DOCUMENT_EXPIRATION_DEFAULTS: Record<
  InsuranceDocumentType,
  number | null
> = {
  // Licensing - typically 2 years
  resident_license: 730,
  nonresident_license: 730,
  exam_results: null, // Exam results don't expire

  // Insurance - annual renewal
  e_and_o_insurance: 365,

  // Contracting - varies by carrier
  carrier_appointment: null, // Indefinite until terminated
  carrier_contract: null,

  // Compliance
  background_check: 730, // 2 years typical
  continuing_education: 730, // CE cycles are usually 2 years

  // Identification
  drivers_license: 1460, // ~4 years (varies by state)
  ssn_card: null, // Never expires
  passport: 3650, // 10 years

  // Other - no default expiration
  application: null,
  resume: null,
  certification: 730, // Most certifications need renewal
  other: null,
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get the category for a document type
 */
export function getCategoryForDocumentType(
  documentType: InsuranceDocumentType,
): DocumentCategory {
  for (const [category, config] of Object.entries(DOCUMENT_CATEGORIES)) {
    if ((config.types as readonly string[]).includes(documentType)) {
      return category as DocumentCategory;
    }
  }
  return "other";
}

/**
 * Get all document types as a flat array
 */
export function getAllDocumentTypes(): InsuranceDocumentType[] {
  return Object.values(DOCUMENT_CATEGORIES).flatMap(
    (cat) => cat.types as unknown as InsuranceDocumentType[],
  );
}

/**
 * Get document types for a specific category
 */
export function getDocumentTypesForCategory(
  category: DocumentCategory,
): readonly InsuranceDocumentType[] {
  return DOCUMENT_CATEGORIES[category]
    .types as unknown as readonly InsuranceDocumentType[];
}

/**
 * Get the suggested expiration date for a document type
 * @returns Date or null if no expiration
 */
export function getSuggestedExpirationDate(
  documentType: InsuranceDocumentType,
): Date | null {
  const days = DOCUMENT_EXPIRATION_DEFAULTS[documentType];
  if (days === null) return null;

  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + days);
  return expirationDate;
}

// =============================================================================
// Category Display Order
// =============================================================================

/**
 * Ordered list of categories for UI display
 */
export const DOCUMENT_CATEGORY_ORDER: DocumentCategory[] = [
  "licensing",
  "insurance",
  "contracting",
  "compliance",
  "identification",
  "other",
];

// =============================================================================
// Validation
// =============================================================================

/**
 * Check if a string is a valid document type
 */
export function isValidDocumentType(
  value: string,
): value is InsuranceDocumentType {
  return getAllDocumentTypes().includes(value as InsuranceDocumentType);
}

/**
 * Check if a string is a valid document category
 */
export function isValidDocumentCategory(
  value: string,
): value is DocumentCategory {
  return Object.keys(DOCUMENT_CATEGORIES).includes(value);
}
