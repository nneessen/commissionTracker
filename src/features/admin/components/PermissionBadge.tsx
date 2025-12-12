// src/features/admin/components/PermissionBadge.tsx

import {Badge} from '@/components/ui/badge';
import {ArrowDownFromLine} from 'lucide-react';
import {getScopeColor, getScopeIcon, getScopeAriaLabel, type DeduplicatedPermission} from '../utils/permissionHelpers';

/**
 * Permission Badge Component
 * Displays a single permission with scope, inheritance status, and accessibility features
 *
 * Design features:
 * - Color coding for scope (with dark mode support)
 * - Icons for accessibility (not color-only)
 * - Text labels for scope
 * - Inheritance indicator icon
 * - "Both" indicator when permission is direct AND inherited
 * - Screen reader support via aria-label
 */

interface PermissionBadgeProps {
  permission: DeduplicatedPermission;
}

export function PermissionBadge({ permission }: PermissionBadgeProps) {
  const ScopeIcon = getScopeIcon(permission.scope);
  const isInherited = permission.sources.includes('inherited');
  const isDirect = permission.sources.includes('direct');
  const isBoth = isInherited && isDirect;

  return (
    <Badge
      className={`${getScopeColor(permission.scope)} text-xs`}
      variant={isInherited && !isDirect ? 'outline' : 'secondary'}
      aria-label={getScopeAriaLabel(permission.scope, permission.code)}
    >
      {/* Scope icon for accessibility */}
      <ScopeIcon className="h-3 w-3 mr-1" aria-hidden="true" />

      {/* Inherited indicator */}
      {isInherited && <ArrowDownFromLine className="h-3 w-3 mr-1" aria-hidden="true" />}

      {/* Permission code */}
      <span>{permission.code}</span>

      {/* Scope label (not just color) */}
      <span className="ml-1 text-[10px] font-semibold opacity-70">[{permission.scope}]</span>

      {/* Both direct and inherited indicator */}
      {isBoth && <span className="ml-1 text-[10px] font-bold">(both)</span>}
    </Badge>
  );
}
