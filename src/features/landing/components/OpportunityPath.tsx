// src/features/landing/components/OpportunityPath.tsx
// Brutalist opportunity path - massive step numbers, harsh lines

import { useScrollAnimation } from '../hooks';
import type { LandingPageTheme, OpportunityStep } from '../types';

interface OpportunityPathProps {
  theme: LandingPageTheme;
}

interface StepItemProps {
  step: OpportunityStep;
  index: number;
  total: number;
  primaryColor: string;
  isVisible: boolean;
}

function StepItem({
  step,
  index,
  total,
  primaryColor,
  isVisible,
}: StepItemProps) {
  const isLast = index === total - 1;

  return (
    <div
      className="relative"
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(60px)',
        transition: `all 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${index * 200}ms`,
      }}
    >
      {/* Connector line - horizontal on desktop */}
      {!isLast && (
        <div
          className="hidden md:block absolute top-16 left-full w-full h-[2px]"
          style={{ background: `${primaryColor}30` }}
        />
      )}

      {/* Step content */}
      <div className="relative">
        {/* Massive number */}
        <span
          className="text-[25vw] md:text-[15vw] lg:text-[10vw] font-black leading-[0.7] tracking-tighter"
          style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            color: index === 0 ? primaryColor : `${primaryColor}20`,
          }}
        >
          {String(index + 1).padStart(2, '0')}
        </span>

        {/* Title */}
        <h3
          className="text-2xl md:text-3xl lg:text-4xl font-black text-white mt-6 mb-4 uppercase tracking-tight"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          {step.title}
        </h3>

        {/* Description */}
        <p className="text-white/50 text-base md:text-lg leading-relaxed max-w-xs">
          {step.description}
        </p>

        {/* Detail */}
        {step.detail && (
          <p
            className="text-sm mt-4 font-mono tracking-[0.1em]"
            style={{ color: `${primaryColor}80` }}
          >
            → {step.detail}
          </p>
        )}

        {/* Accent bar */}
        <div
          className="w-16 h-[2px] mt-6"
          style={{ background: index === 0 ? primaryColor : `${primaryColor}40` }}
        />
      </div>
    </div>
  );
}

export function OpportunityPath({ theme }: OpportunityPathProps) {
  const { ref, isVisible } = useScrollAnimation<HTMLDivElement>({
    threshold: 0.1,
    triggerOnce: true,
  });

  if (!theme.opportunity_steps || theme.opportunity_steps.length === 0) {
    return null;
  }

  return (
    <section ref={ref} className="relative py-32 md:py-48 lg:py-64 overflow-hidden bg-[#0a0a0a]">
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

      {/* Vertical accent line - left */}
      <div
        className="absolute top-0 bottom-0 left-6 md:left-12 w-[1px]"
        style={{ background: `${theme.primary_color}20` }}
      />

      {/* Diagonal accent */}
      <div
        className="absolute top-0 right-[20%] w-[1px] h-[200%] origin-top rotate-[-30deg] hidden lg:block"
        style={{ background: `${theme.primary_color}15` }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12">
        {/* Header */}
        <div
          className="mb-24 md:mb-32 transition-all duration-700"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(40px)',
          }}
        >
          {/* Index marker */}
          <span className="font-mono text-[10px] text-white/30 tracking-[0.3em] uppercase block mb-8">
            [04] Path
          </span>

          <h2
            className="text-[12vw] md:text-[10vw] lg:text-[7vw] font-black leading-[0.85] tracking-tighter text-white uppercase max-w-5xl"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            {theme.opportunity_headline.split(' ').map((word, i) => (
              <span key={i} className={i > 0 ? 'block' : ''}>
                {i === 0 ? (
                  <span style={{ color: theme.primary_color }}>{word} </span>
                ) : (
                  word + ' '
                )}
              </span>
            ))}
          </h2>

          {theme.opportunity_subheadline && (
            <p className="text-white/40 text-xl md:text-2xl mt-8 max-w-2xl font-light">
              {theme.opportunity_subheadline}
            </p>
          )}
        </div>

        {/* Steps grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16 md:gap-8">
          {theme.opportunity_steps.map((step, index) => (
            <StepItem
              key={step.title}
              step={step}
              index={index}
              total={theme.opportunity_steps.length}
              primaryColor={theme.primary_color}
              isVisible={isVisible}
            />
          ))}
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
