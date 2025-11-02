// /home/nneessen/projects/commissionTracker/src/components/ui/MetricTooltip.tsx

import React, { useState, useRef, useEffect } from "react";
import { HelpCircle } from "lucide-react";

interface MetricTooltipProps {
  title: string;
  description: string;
  formula?: string;
  example?: string;
  note?: string;
  preferredPosition?: "top" | "bottom" | "auto";
}

export const MetricTooltip: React.FC<MetricTooltipProps> = ({
  title,
  description,
  formula,
  example,
  note,
  preferredPosition = "auto",
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<"top" | "bottom">("bottom");
  const tooltipRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVisible && tooltipRef.current && triggerRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const tooltipHeight = 250; // Approximate height for a full tooltip
      const viewportHeight = window.innerHeight;
      const scrollY = window.scrollY;

      // Calculate space above and below
      const spaceAbove = triggerRect.top - scrollY;
      const spaceBelow = viewportHeight - triggerRect.bottom;

      // Determine best position
      if (preferredPosition === "top") {
        setPosition("top");
      } else if (preferredPosition === "bottom") {
        setPosition("bottom");
      } else {
        // Auto positioning
        // If we're in the top 30% of viewport, show below
        // If we're in the bottom 30% of viewport, show above
        // Otherwise check which has more space
        const topThreshold = viewportHeight * 0.3;
        const bottomThreshold = viewportHeight * 0.7;

        if (triggerRect.top < topThreshold) {
          // Near top of viewport, show below
          setPosition("bottom");
        } else if (triggerRect.top > bottomThreshold) {
          // Near bottom of viewport, show above
          setPosition("top");
        } else {
          // Middle of viewport, check which has more space
          if (spaceBelow >= tooltipHeight || spaceBelow > spaceAbove) {
            setPosition("bottom");
          } else {
            setPosition("top");
          }
        }
      }
    }
  }, [isVisible, preferredPosition]);

  const getTooltipStyles = () => {
    const baseStyles = {
      position: "absolute" as const,
      left: "50%",
      transform: "translateX(-50%)",
      background: "linear-gradient(135deg, #1e293b 0%, #334155 100%)",
      color: "white",
      padding: "12px 16px",
      borderRadius: "8px",
      boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
      minWidth: "250px",
      maxWidth: "350px",
      zIndex: 10000, // Very high z-index to ensure it's above everything
      fontSize: "13px",
      lineHeight: "1.5",
      border: "1px solid rgba(255,255,255,0.1)",
      pointerEvents: "none" as const, // Prevent tooltip from interfering with hover
    };

    if (position === "top") {
      return {
        ...baseStyles,
        bottom: "100%",
        marginBottom: "8px",
      };
    } else {
      return {
        ...baseStyles,
        top: "100%",
        marginTop: "8px",
      };
    }
  };

  const getArrowStyles = () => {
    const baseStyles = {
      position: "absolute" as const,
      left: "50%",
      transform: "translateX(-50%)",
      width: 0,
      height: 0,
      borderLeft: "6px solid transparent",
      borderRight: "6px solid transparent",
    };

    if (position === "top") {
      return {
        ...baseStyles,
        top: "100%",
        borderTop: "6px solid #334155",
        borderBottom: "none",
      };
    } else {
      return {
        ...baseStyles,
        bottom: "100%",
        borderBottom: "6px solid #334155",
        borderTop: "none",
      };
    }
  };

  return (
    <div
      ref={triggerRef}
      style={{
        position: "relative",
        display: "inline-block",
        marginLeft: "6px",
        verticalAlign: "middle",
      }}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      <HelpCircle
        size={14}
        style={{
          color: "#94a3b8",
          cursor: "help",
          transition: "color 0.2s",
          ...(isVisible && { color: "#3b82f6" }),
        }}
      />

      {isVisible && (
        <div ref={tooltipRef} style={getTooltipStyles()}>
          {/* Arrow */}
          <div style={getArrowStyles()} />

          <div
            style={{ fontWeight: 600, marginBottom: "6px", color: "#3b82f6" }}
          >
            {title}
          </div>

          <div style={{ marginBottom: formula || example ? "6px" : 0 }}>
            {description}
          </div>

          {formula && (
            <div
              style={{
                background: "rgba(0,0,0,0.3)",
                padding: "6px 8px",
                borderRadius: "4px",
                fontFamily: "monospace",
                fontSize: "12px",
                marginBottom: example ? "6px" : 0,
              }}
            >
              {formula}
            </div>
          )}

          {example && (
            <div
              style={{
                fontStyle: "italic",
                fontSize: "12px",
                color: "#94a3b8",
                marginTop: "6px",
              }}
            >
              Example: {example}
            </div>
          )}

          {note && (
            <div
              style={{
                marginTop: "8px",
                paddingTop: "8px",
                borderTop: "1px solid rgba(255,255,255,0.1)",
                fontSize: "11px",
                color: "#fbbf24",
              }}
            >
              ⚠️ {note}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

