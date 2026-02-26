// src/components/icons/CloseCrmIcon.tsx
// Close CRM logo icon for sidebar navigation

import React from "react";

interface CloseCrmIconProps {
  className?: string;
  size?: number;
}

export const CloseCrmIcon: React.FC<CloseCrmIconProps> = ({
  className,
  size = 24,
}) => (
  <img
    src="/close-crm-logo.jpg"
    alt="Close CRM"
    width={size}
    height={size}
    className={className}
    style={{ borderRadius: 3 }}
  />
);
