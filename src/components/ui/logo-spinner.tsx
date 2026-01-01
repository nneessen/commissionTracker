// src/components/ui/logo-spinner.tsx

import React from "react";
import { cn } from "@/lib/utils";

interface LogoSpinnerProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeClasses = {
  xs: "h-3 w-3",
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
  xl: "h-8 w-8",
} as const;

export const LogoSpinner: React.FC<LogoSpinnerProps> = ({
  size = "sm",
  className,
}) => {
  const sizeClass = sizeClasses[size];

  return (
    <div
      className={cn(
        "inline-flex shrink-0 items-center justify-center animate-logo-spin",
        sizeClass,
        className,
      )}
    >
      {/* Dark logo for light mode */}
      <img
        src="/logos/LetterLogo.png"
        alt=""
        aria-hidden="true"
        className={cn("dark:hidden", sizeClass)}
      />
      {/* Light logo for dark mode */}
      <img
        src="/logos/Light Letter Logo .png"
        alt=""
        aria-hidden="true"
        className={cn("hidden dark:block", sizeClass)}
      />
    </div>
  );
};
