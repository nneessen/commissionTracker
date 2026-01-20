// src/features/landing/components/TechShowcase.tsx
// Brutalist tech showcase - massive alternating layout, harsh lines

import { useScrollAnimation } from '../hooks';
import type { LandingPageTheme, TechFeature } from '../types';

interface TechShowcaseProps {
  theme: LandingPageTheme;
}

interface FeatureBlockProps {
  feature: TechFeature;
  index: number;
  primaryColor: string;
  isVisible: boolean;
  isRight: boolean;
}

function FeatureBlock({
  feature,
  index,
  primaryColor,
  isVisible,
  isRight,
}: FeatureBlockProps) {
  return (
    <div
      className={`grid lg:grid-cols-2 gap-12 lg:gap-24 items-center ${
        isRight ? 'lg:text-right' : ''
      }`}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible
          ? 'translateX(0)'
          : `translateX(${isRight ? '80px' : '-80px'})`,
        transition: `all 0.8s cubic-bezier(0.16, 1, 0.3, 1)`,
        transitionDelay: `${index * 200}ms`,
      }}
    >
      {/* Massive number column */}
      <div className={isRight ? 'lg:order-2' : ''}>
        <span
          className="text-[30vw] md:text-[20vw] lg:text-[15vw] font-black leading-[0.7] tracking-tighter"
          style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            color: `${primaryColor}10`,
          }}
        >
          {String(index + 1).padStart(2, '0')}
        </span>
      </div>

      {/* Content column */}
      <div className={isRight ? 'lg:order-1' : ''}>
        {/* Index marker */}
        <span className="font-mono text-[10px] text-white/30 tracking-[0.3em] uppercase block mb-6">
          [Feature {String(index + 1).padStart(2, '0')}]
        </span>

        <h3
          className="text-3xl md:text-4xl lg:text-5xl font-black text-white uppercase tracking-tight mb-8"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          {feature.title}
        </h3>

        <p className="text-white/50 text-lg md:text-xl lg:text-2xl leading-relaxed">
          {feature.description}
        </p>

        {/* Accent bar */}
        <div
          className={`w-20 h-[3px] mt-10 ${isRight ? 'lg:ml-auto' : ''}`}
          style={{ background: index === 0 ? primaryColor : `${primaryColor}50` }}
        />
      </div>
    </div>
  );
}

export function TechShowcase({ theme }: TechShowcaseProps) {
  const { ref, isVisible } = useScrollAnimation<HTMLDivElement>({
    threshold: 0.1,
    triggerOnce: true,
  });

  if (!theme.tech_features || theme.tech_features.length === 0) {
    return null;
  }

  return (
    <section ref={ref} className="relative py-32 md:py-48 lg:py-64 overflow-hidden bg-[#050505]">
      {/* Harsh grid background */}
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `
            linear-gradient(to right, white 1px, transparent 1px),
            linear-gradient(to bottom, white 1px, transparent 1px)
          `,
          backgroundSize: '100px 100px',
        }}
      />

      {/* Top gold line */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{ background: theme.primary_color }}
      />

      {/* Vertical accent line - center */}
      <div
        className="absolute top-0 bottom-0 left-1/2 w-[1px] -translate-x-1/2"
        style={{ background: `${theme.primary_color}15` }}
      />

      {/* Diagonal accents */}
      <div
        className="absolute top-0 left-[10%] w-[1px] h-[200%] origin-top rotate-[15deg] hidden lg:block"
        style={{ background: `${theme.primary_color}08` }}
      />
      <div
        className="absolute top-0 right-[10%] w-[1px] h-[200%] origin-top rotate-[-15deg] hidden lg:block"
        style={{ background: `${theme.primary_color}08` }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12">
        {/* Header */}
        <div
          className="mb-32 md:mb-40 transition-all duration-700"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(40px)',
          }}
        >
          {/* Index marker */}
          <span className="font-mono text-[10px] text-white/30 tracking-[0.3em] uppercase block mb-8">
            [06] Platform
          </span>

          <h2
            className="text-[12vw] md:text-[10vw] lg:text-[7vw] font-black leading-[0.85] tracking-tighter text-white uppercase"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            {theme.tech_headline.split(' ').map((word, i) => (
              <span key={i} className="block">
                {i === 1 ? (
                  <span style={{ color: theme.primary_color }}>{word}</span>
                ) : (
                  word
                )}
              </span>
            ))}
          </h2>

          {theme.tech_subheadline && (
            <p className="text-white/40 text-xl md:text-2xl mt-10 max-w-2xl font-light">
              {theme.tech_subheadline}
            </p>
          )}
        </div>

        {/* Features list */}
        <div className="space-y-32 md:space-y-48">
          {theme.tech_features.map((feature, index) => (
            <FeatureBlock
              key={feature.title}
              feature={feature}
              index={index}
              primaryColor={theme.primary_color}
              isVisible={isVisible}
              isRight={index % 2 === 1}
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
