// src/components/custom_ui/index.ts

/**
 * Custom UI Components - Dense Design System
 *
 * This folder contains customized versions of shadcn/ui components
 * optimized for high-density layouts.
 *
 * Usage:
 * - Import from here when you need compact, dense components
 * - Import from @/components/ui for standard components
 *
 * Example:
 * import { DenseButton } from "@/components/custom_ui/button";  // Dense version
 * import { Button } from "@/components/ui/button";              // Standard version
 */

export { DenseButton, buttonVariants } from "./button";
export type { ButtonProps } from "./button";

export {
  DenseCard,
  DenseCardHeader,
  DenseCardFooter,
  DenseCardTitle,
  DenseCardDescription,
  DenseCardContent,
} from "./card";

export { DenseInput } from "./input";
export type { InputProps } from "./input";