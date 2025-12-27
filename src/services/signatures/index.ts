// src/services/signatures/index.ts
// DocuSeal e-signature integration services

// Repositories
export {
  SignatureTemplateRepository,
  signatureTemplateRepository,
} from "./repositories/SignatureTemplateRepository";

export {
  SignatureSubmissionRepository,
  signatureSubmissionRepository,
} from "./repositories/SignatureSubmissionRepository";

export {
  SignatureSubmitterRepository,
  signatureSubmitterRepository,
} from "./repositories/SignatureSubmitterRepository";

// Services
export {
  SignatureTemplateService,
  signatureTemplateService,
} from "./SignatureTemplateService";

export {
  SignatureSubmissionService,
  signatureSubmissionService,
  type SubmissionWithDetails,
} from "./SignatureSubmissionService";

// API Client
export { docuSealApiClient, type DocuSealApiClient } from "./DocuSealApiClient";
