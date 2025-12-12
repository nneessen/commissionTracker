// src/features/admin/utils/permissionHelpers.ts

import type {PermissionWithSource} from '@/types/permissions.types';
import {User, Users, Globe, UserCircle} from 'lucide-react';

/**
 * Permission Helper Utilities
 * Functions for managing permission display, grouping, and deduplication
 */

/**
 * Get color classes for permission scope (accessible with icons)
 * Uses Tailwind color classes with dark mode support
 */
export function getScopeColor(scope: string): string {
  const colors: Record<string, string> = {
    own: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    downline: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    all: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    self: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  };
  return colors[scope] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
}

/**
 * Get icon component for permission scope (for accessibility)
 * Icons provide visual cues beyond color alone
 */
export function getScopeIcon(scope: string) {
  const icons = {
    own: User,
    downline: Users,
    all: Globe,
    self: UserCircle,
  };
  return icons[scope as keyof typeof icons] || User;
}

/**
 * Get aria-label for screen readers
 * Provides accessible descriptions for assistive technology
 */
export function getScopeAriaLabel(scope: string, code: string): string {
  return `${code} - ${scope} scope permission`;
}

/**
 * Deduplicated permission with multiple sources
 * Handles case where permission is both direct AND inherited
 */
export interface DeduplicatedPermission extends PermissionWithSource {
  sources: Array<'direct' | 'inherited'>;
  inheritedFromRoles: string[];
}

/**
 * Group permissions by category (resource)
 * Organizes permissions for cleaner UI display
 */
export function groupPermissionsByCategory(
  permissions: DeduplicatedPermission[]
): Record<string, DeduplicatedPermission[]> {
  return permissions.reduce(
    (acc, perm) => {
      const category = perm.resource;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(perm);
      return acc;
    },
    {} as Record<string, DeduplicatedPermission[]>
  );
}

/**
 * Deduplicate permissions and mark sources
 * Prevents showing the same permission twice
 * Tracks whether permission is direct, inherited, or both
 */
export function deduplicatePermissions(
  permissions: PermissionWithSource[]
): DeduplicatedPermission[] {
  const permMap = new Map<string, DeduplicatedPermission>();

  for (const perm of permissions) {
    const existing = permMap.get(perm.id);

    if (existing) {
      // Permission already exists - add source
      if (!existing.sources.includes(perm.permissionType)) {
        existing.sources.push(perm.permissionType);
      }
      if (
        perm.inheritedFromRoleName &&
        !existing.inheritedFromRoles.includes(perm.inheritedFromRoleName)
      ) {
        existing.inheritedFromRoles.push(perm.inheritedFromRoleName);
      }
    } else {
      // First time seeing this permission
      permMap.set(perm.id, {
        ...perm,
        sources: [perm.permissionType],
        inheritedFromRoles: perm.inheritedFromRoleName ? [perm.inheritedFromRoleName] : [],
      });
    }
  }

  return Array.from(permMap.values());
}
