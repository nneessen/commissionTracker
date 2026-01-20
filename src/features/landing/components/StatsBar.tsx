// src/features/landing/components/StatsBar.tsx
// Brutalist stats - massive numbers, harsh grid, gold accents

import { useScrollAnimation, useCountUp } from '../hooks';
import type { LandingPageTheme, StatItem } from '../types';

interface StatsBarProps {
  theme: LandingPageTheme;
}

function StatBlock({
  stat,
  index,
  primaryColor,
  isVisible,
}: {
  stat: StatItem;
  index: number;
  primaryColor: string;
  isVisible: boolean;
}) {
  const numericValue = parseFloat(stat.value.replace(/[^0-9.-]/g, '')) || 0;
  const { formattedValue } = useCountUp(numericValue, {
    enabled: isVisible,
    duration: 1500,
    delay: index * 100,
    decimals: 0,
  });

  return (
    <div
      className="relative py-10 md:py-16 min-w-0 overflow-hidden"
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(40px)',
        transition: `all 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${index * 150}ms`,
      }}
    >
      {/* Vertical divider line */}
      {index > 0 && (
        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 w-[1px] h-1/2 hidden lg:block"
          style={{ background: `${primaryColor}30` }}
        />
      )}

      {/* Index marker */}
      <span className="block text-white/20 font-mono text-[10px] tracking-[0.3em] uppercase mb-6">
        [{String(index + 1).padStart(2, '0')}]
      </span>

      {/* Massive number */}
      <div
        className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black tracking-tighter leading-[0.85] break-all"
        style={{
          color: primaryColor,
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}
      >
        {stat.prefix}
        {formattedValue}
        {stat.suffix}
      </div>

      {/* Label - raw monospace */}
      <div className="mt-6 text-white/30 text-[10px] md:text-xs font-mono uppercase tracking-[0.2em]">
        {stat.label}
      </div>
    </div>
  );
}

export function StatsBar({ theme }: StatsBarProps) {
  const { ref, isVisible } = useScrollAnimation<HTMLDivElement>({
    threshold: 0.2,
    triggerOnce: true,
  });

  if (!theme.stats_data || theme.stats_data.length === 0) {
    return null;
  }

  return (
    <section ref={ref} className="relative bg-[#0a0a0a] overflow-hidden">
      {/* Harsh grid background */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(to right, white 1px, transparent 1px),
            linear-gradient(to bottom, white 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px',
        }}
      />

      {/* Top gold line */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{ background: theme.primary_color }}
      />

      {/* Diagonal accent */}
      <div
        className="absolute top-0 left-[20%] w-[1px] h-[200%] origin-top rotate-[25deg] hidden md:block"
        style={{ background: `${theme.primary_color}20` }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12">
        {/* Grid layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {theme.stats_data.map((stat, index) => (
            <StatBlock
              key={stat.label}
              stat={stat}
              index={index}
              primaryColor={theme.primary_color}
              isVisible={isVisible}
            />
          ))}
        </div>
      </div>

      {/* Bottom line */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[1px]"
        style={{ background: `${theme.primary_color}40` }}
      />
    </section>
  );
}
