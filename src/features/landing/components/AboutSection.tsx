// src/features/landing/components/AboutSection.tsx
// Brutalist about - massive split typography, harsh lines, gold accents

import { useScrollAnimation } from '../hooks';
import type { LandingPageTheme } from '../types';

interface AboutSectionProps {
  theme: LandingPageTheme;
}

export function AboutSection({ theme }: AboutSectionProps) {
  const { ref, isVisible } = useScrollAnimation<HTMLDivElement>({
    threshold: 0.15,
    triggerOnce: true,
  });

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
        className="absolute top-0 right-[30%] w-[1px] h-[200%] origin-top rotate-[-20deg] hidden lg:block"
        style={{ background: `${theme.primary_color}15` }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12">
        {/* Index marker */}
        <div
          className="mb-16 transition-all duration-700"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
          }}
        >
          <span className="font-mono text-[10px] text-white/30 tracking-[0.3em] uppercase">
            [02] About
          </span>
        </div>

        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24">
          {/* Left - Massive headline */}
          <div
            className="transition-all duration-700"
            style={{
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? 'translateX(0)' : 'translateX(-60px)',
              transitionDelay: '100ms',
            }}
          >
            <h2
              className="text-[15vw] md:text-[12vw] lg:text-[8vw] font-black leading-[0.85] tracking-tighter text-white uppercase"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              {theme.about_headline.split(' ').map((word, i) => (
                <span key={i} className="block">
                  {i === 0 ? (
                    <span style={{ color: theme.primary_color }}>{word}</span>
                  ) : (
                    word
                  )}
                </span>
              ))}
            </h2>

            {/* Harsh accent bar */}
            <div
              className="w-32 h-[3px] mt-12"
              style={{ background: theme.primary_color }}
            />
          </div>

          {/* Right - Content */}
          <div
            className="transition-all duration-700 lg:pt-12"
            style={{
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? 'translateX(0)' : 'translateX(60px)',
              transitionDelay: '200ms',
            }}
          >
            {/* Body text */}
            <p className="text-white/50 text-xl md:text-2xl lg:text-3xl leading-relaxed font-light">
              {theme.about_content}
            </p>

            {/* Raw stats */}
            <div className="mt-16 flex gap-16 md:gap-20">
              <div>
                <span
                  className="text-[12vw] md:text-[8vw] lg:text-[5vw] font-black leading-[0.8] tracking-tighter"
                  style={{
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    color: theme.primary_color,
                  }}
                >
                  24/7
                </span>
                <span className="block mt-4 text-[10px] font-mono text-white/30 uppercase tracking-[0.2em]">
                  Support
                </span>
              </div>
              <div>
                <span
                  className="text-[12vw] md:text-[8vw] lg:text-[5vw] font-black leading-[0.8] tracking-tighter"
                  style={{
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    color: theme.primary_color,
                  }}
                >
                  100%
                </span>
                <span className="block mt-4 text-[10px] font-mono text-white/30 uppercase tracking-[0.2em]">
                  Remote
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Media section - full width */}
        {(theme.about_image_url || theme.about_video_url) && (
          <div
            className="mt-32 transition-all duration-700"
            style={{
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? 'translateY(0)' : 'translateY(60px)',
              transitionDelay: '400ms',
            }}
          >
            {theme.about_image_url ? (
              <div className="relative aspect-[21/9] overflow-hidden">
                <img
                  src={theme.about_image_url}
                  alt="About The Standard"
                  className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700"
                />
                {/* Gold overlay on hover */}
                <div
                  className="absolute inset-0 mix-blend-multiply opacity-40 hover:opacity-0 transition-opacity duration-500"
                  style={{ background: theme.primary_color }}
                />
                {/* Index */}
                <span className="absolute bottom-4 left-4 font-mono text-[10px] text-white/50 tracking-[0.2em]">
                  [IMG_01]
                </span>
              </div>
            ) : theme.about_video_url ? (
              <div className="relative aspect-video overflow-hidden">
                <video
                  src={theme.about_video_url}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Bottom line */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[1px]"
        style={{ background: `${theme.primary_color}30` }}
      />
    </section>
  );
}
