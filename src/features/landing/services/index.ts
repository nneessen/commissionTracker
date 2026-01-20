// src/features/landing/services/index.ts
// Export landing page service

export {
  landingPageService,
  getPublicLandingPageSettings,
  getLandingPageSettings,
  upsertLandingPageSettings,
  deleteLandingPageSettings,
  uploadLandingPageAsset,
  deleteLandingPageAsset,
  deleteAllLandingPageAssets,
  type AssetType,
} from './landingPageService';
