/**
 * Legacy Types Directory
 *
 * This directory contains deprecated type definitions maintained for
 * backward compatibility. These types should NOT be used in new code.
 *
 * Each file includes:
 * - Deprecated type definitions with @deprecated JSDoc comments
 * - Migration helpers to convert legacy data to current format
 * - Type guards to detect legacy data structures
 *
 * When to use these types:
 * - Migrating old data from database
 * - Processing legacy API responses
 * - Maintaining backward compatibility with external systems
 *
 * Migration Path:
 * 1. Import migration helper: import { migrateLegacyCommission } from '@/types/legacy'
 * 2. Check for legacy data: if (hasLegacyFields(data)) { ... }
 * 3. Migrate: const current = migrateLegacyCommission(legacy)
 */

// Commission legacy types
export type { LegacyClient, LegacyCommission } from "./commission-v1.types";

export {
  migrateLegacyCommission,
  hasLegacyFields,
} from "./commission-v1.types";

// User legacy types removed - use UserProfile from @/types/user.types
