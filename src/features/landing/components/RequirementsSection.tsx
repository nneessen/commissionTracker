// src/features/landing/components/RequirementsSection.tsx
// Brutalist requirements - massive numbered list, harsh typography

import { useScrollAnimation } from '../hooks';
import type { LandingPageTheme } from '../types';

interface RequirementsSectionProps {
  theme: LandingPageTheme;
}

export function RequirementsSection({ theme }: RequirementsSectionProps) {
  const { ref, isVisible } = useScrollAnimation<HTMLDivElement>({
    threshold: 0.1,
    triggerOnce: true,
  });

  if (!theme.requirements_items || theme.requirements_items.length === 0) {
    return null;
  }

  return (
    <section ref={ref} className="relative bg-[#0a0a0a] py-32 md:py-48 lg:py-64 overflow-hidden">
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

      {/* Vertical accent line - right */}
      <div
        className="absolute top-0 bottom-0 right-6 md:right-12 w-[1px]"
        style={{ background: `${theme.primary_color}20` }}
      />

      {/* Diagonal accent */}
      <div
        className="absolute top-0 left-[10%] w-[1px] h-[200%] origin-top rotate-[20deg] hidden lg:block"
        style={{ background: `${theme.primary_color}10` }}
      />

      <div className="relative z-10 px-6 md:px-12 max-w-6xl mx-auto">
        {/* Header */}
        <div
          className="mb-20 md:mb-28 transition-all duration-700"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(40px)',
          }}
        >
          {/* Index marker */}
          <span className="font-mono text-[10px] text-white/30 tracking-[0.3em] uppercase block mb-8">
            [05] Requirements
          </span>

          <h2
            className="text-[12vw] md:text-[10vw] lg:text-[7vw] font-black tracking-tighter text-white leading-[0.85] uppercase"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            {(theme.requirements_headline || 'THE NON-NEGOTIABLES').split(' ').map((word, i) => (
              <span key={i} className="block">
                {i === 0 ? (
                  <span style={{ color: theme.primary_color }}>{word}</span>
                ) : (
                  word
                )}
              </span>
            ))}
          </h2>
        </div>

        {/* Requirements list */}
        <div className="space-y-0">
          {theme.requirements_items.map((item, index) => (
            <div
              key={item.trait}
              className="group border-t-2 py-12 md:py-16 flex gap-8 md:gap-16 items-start"
              style={{
                borderColor: `${theme.primary_color}20`,
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? 'translateX(0)' : 'translateX(-40px)',
                transition: 'all 0.6s ease-out',
                transitionDelay: `${index * 100}ms`,
              }}
            >
              {/* Massive number */}
              <span
                className="text-[20vw] md:text-[12vw] lg:text-[8vw] font-black leading-[0.7] tracking-tighter shrink-0"
                style={{
                  color: theme.primary_color,
                  opacity: 0.3,
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}
              >
                {String(index + 1).padStart(2, '0')}
              </span>

              {/* Content */}
              <div className="flex-1 pt-4">
                <h3
                  className="text-2xl md:text-3xl lg:text-4xl font-black text-white uppercase tracking-tight mb-4"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  {item.trait}
                </h3>
                <p className="text-white/40 text-base md:text-lg lg:text-xl max-w-2xl leading-relaxed">
                  {item.description}
                </p>

                {/* Accent bar */}
                <div
                  className="w-12 h-[2px] mt-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ background: theme.primary_color }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Bottom callout */}
        <div
          className="mt-20 pt-12 border-t-2"
          style={{
            borderColor: `${theme.primary_color}40`,
            opacity: isVisible ? 1 : 0,
            transition: 'opacity 0.6s ease-out',
            transitionDelay: '500ms',
          }}
        >
          <p className="text-2xl md:text-3xl lg:text-4xl font-black">
            <span style={{ color: theme.primary_color }}>
              NO EXPERIENCE REQUIRED.
            </span>
            <span className="text-white/40 ml-3">
              We train you.
            </span>
          </p>
        </div>
      </div>

      {/* Bottom line */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[1px]"
        style={{ background: `${theme.primary_color}30` }}
      />
    </section>
  );
}
