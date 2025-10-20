// src/components/custom_ui/heading.tsx
import * as React from "react";
import { cn } from "@/lib/utils";

interface HeadingProps {
  size: "xl" | "lg" | "md" | "sm" | "xs";
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  children: React.ReactNode;
  className?: string;
}

export function Heading({
  size,
  as = "h2",
  children,
  className,
}: HeadingProps) {
  const Component = as;
  const sizeStyles = {
    xl: "text-3xl font-bold tracking-tight",
    lg: "text-2xl font-semibold",
    md: "text-xl font-semibold",
    sm: "text-lg font-medium",
    xs: "text-base font-medium",
  };

  return (
    <Component className={cn(sizeStyles[size], className)}>
      {children}
    </Component>
  );
}
