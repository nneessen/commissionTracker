// src/features/landing/index.ts
// Public exports for the landing page feature

// Main page component
export { PublicLandingPage } from './PublicLandingPage';

// Types
export type {
  StatItem,
  GalleryImage,
  OpportunityStep,
  RequirementItem,
  TechFeature,
  Testimonial,
  FaqItem,
  SocialLinks,
  LoginAccessType,
  SectionId,
  LandingPageSettingsRow,
  LandingPageTheme,
  LandingPageSettingsInput,
} from './types';
export { DEFAULT_LANDING_PAGE_THEME, mergeWithDefaults } from './types';

// Hooks
export {
  usePublicLandingPageSettings,
  useLandingPageSettings,
  useUpsertLandingPageSettings,
  useDeleteLandingPageSettings,
  useUploadLandingPageAsset,
  useDeleteLandingPageAsset,
  useLandingPageOperations,
  landingPageKeys,
  useScrollAnimation,
  useStaggeredAnimation,
  useParallax,
  useScrollProgress,
  useCountUp,
  useCountUpOnScroll,
} from './hooks';

// Service
export { landingPageService } from './services';
