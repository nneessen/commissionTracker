// src/features/landing/components/FinalCta.tsx
// Brutalist final CTA - massive headline, stark contrast

import { Link } from '@tanstack/react-router';
import { useScrollAnimation } from '../hooks';
import type { LandingPageTheme } from '../types';

interface FinalCtaProps {
  theme: LandingPageTheme;
}

export function FinalCta({ theme }: FinalCtaProps) {
  const { ref, isVisible } = useScrollAnimation<HTMLDivElement>({
    threshold: 0.15,
    triggerOnce: true,
  });

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

      {/* Vertical accent line - center */}
      <div
        className="absolute top-0 left-1/2 w-[1px] h-full -translate-x-1/2"
        style={{ background: `linear-gradient(to bottom, ${theme.primary_color}, transparent 80%)` }}
      />

      {/* Diagonal accents */}
      <div
        className="absolute top-0 left-[15%] w-[1px] h-[200%] origin-top rotate-[25deg] hidden lg:block"
        style={{ background: `${theme.primary_color}15` }}
      />
      <div
        className="absolute top-0 right-[15%] w-[1px] h-[200%] origin-top rotate-[-25deg] hidden lg:block"
        style={{ background: `${theme.primary_color}15` }}
      />

      <div className="relative z-10 px-6 md:px-12 max-w-6xl mx-auto text-center">
        {/* Index marker */}
        <span
          className="font-mono text-[10px] text-white/30 tracking-[0.3em] uppercase block mb-12"
          style={{
            opacity: isVisible ? 1 : 0,
            transition: 'opacity 0.5s',
          }}
        >
          [09] Final Call
        </span>

        {/* Massive headline */}
        <h2
          className="text-[15vw] md:text-[12vw] lg:text-[10vw] font-black tracking-tighter text-white leading-[0.8] uppercase"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(60px)',
            transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}
        >
          {theme.final_cta_headline.split(' ').slice(0, 2).map((word, i) => (
            <span key={i} className="block">{word}</span>
          ))}
          <span style={{ color: theme.primary_color }} className="block">
            {theme.final_cta_headline.split(' ').slice(2).join(' ') || 'NOW.'}
          </span>
        </h2>

        {/* Subtext */}
        <p
          className="text-white/40 text-xl md:text-2xl lg:text-3xl max-w-2xl mx-auto mt-12 font-light"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(40px)',
            transition: 'all 0.7s cubic-bezier(0.16, 1, 0.3, 1)',
            transitionDelay: '150ms',
          }}
        >
          {theme.final_cta_subheadline}
        </p>

        {/* Brutalist button */}
        <div
          className="mt-16"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(30px)',
            transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
            transitionDelay: '300ms',
          }}
        >
          <Link
            to={theme.final_cta_link}
            className="inline-block px-12 py-6 font-black text-lg uppercase tracking-widest transition-all duration-150 border-2"
            style={{
              background: theme.primary_color,
              color: '#0a0a0a',
              borderColor: theme.primary_color,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = theme.primary_color;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = theme.primary_color;
              e.currentTarget.style.color = '#0a0a0a';
            }}
          >
            {theme.final_cta_text} →
          </Link>
        </div>

        {/* Raw facts */}
        <div
          className="mt-20 flex flex-wrap justify-center gap-8 md:gap-12 text-white/30 text-sm font-mono uppercase tracking-[0.2em]"
          style={{
            opacity: isVisible ? 1 : 0,
            transition: 'opacity 0.5s ease-out',
            transitionDelay: '450ms',
          }}
        >
          <span>100% Remote</span>
          <span style={{ color: theme.primary_color }}>/</span>
          <span>Zero Experience</span>
          <span style={{ color: theme.primary_color }}>/</span>
          <span>Uncapped Income</span>
        </div>
      </div>

      {/* Bottom gold line */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[2px]"
        style={{ background: theme.primary_color }}
      />
    </section>
  );
}
