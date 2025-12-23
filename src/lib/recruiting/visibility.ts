// src/lib/recruiting/visibility.ts

/**
 * Utility functions for recruit visibility checks.
 * Centralizes visibility logic to ensure consistent behavior across components.
 */

interface VisibleToRecruitItem {
  visible_to_recruit?: boolean | null;
}

/**
 * Check if an item (phase or checklist item) is visible to recruits.
 * Items are visible by default (null/undefined = visible).
 */
export const isVisibleToRecruit = (item: VisibleToRecruitItem): boolean => {
  return item.visible_to_recruit !== false;
};

/**
 * Check if an item is hidden from recruits.
 */
export const isHiddenFromRecruit = (item: VisibleToRecruitItem): boolean => {
  return item.visible_to_recruit === false;
};

/**
 * Filter an array of items to only include those visible to recruits.
 */
export const filterVisibleToRecruit = <T extends VisibleToRecruitItem>(
  items: T[],
): T[] => {
  return items.filter(isVisibleToRecruit);
};

/**
 * Check if a viewer is a recruit (not admin and not upline).
 */
export const isRecruitViewer = (
  isAdmin: boolean,
  isUpline: boolean,
): boolean => {
  return !isAdmin && !isUpline;
};

/**
 * Filter items based on viewer role.
 * Admins and uplines see all items; recruits only see visible items.
 */
export const filterItemsForViewer = <T extends VisibleToRecruitItem>(
  items: T[],
  isAdmin: boolean,
  isUpline: boolean,
): T[] => {
  if (isRecruitViewer(isAdmin, isUpline)) {
    return filterVisibleToRecruit(items);
  }
  return items;
};
