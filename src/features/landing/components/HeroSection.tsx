// src/features/landing/components/HeroSection.tsx
// Brutalist hero - raw, bold, gold accent throughout

import { Link } from "@tanstack/react-router";
import type { LandingPageTheme } from "../types";

interface HeroSectionProps {
  theme: LandingPageTheme;
}

export function HeroSection({ theme }: HeroSectionProps) {
  // Video is now rendered globally in PublicLandingPage, only show image here if no video
  const hasImageOnly = !theme.hero_video_url && theme.hero_image_url;

  return (
    <section className="min-h-screen bg-transparent relative overflow-hidden">
      {/* Background image only (video is handled globally) */}
      {hasImageOnly && (
        <div className="absolute inset-0 z-0">
          <img
            src={theme.hero_image_url!}
            alt="Hero background"
            className="w-full h-full object-cover"
          />
          {/* Dark overlay for text readability */}
          <div className="absolute inset-0 bg-black/60" />
        </div>
      )}

      {/* Harsh grid lines */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(to right, white 1px, transparent 1px),
            linear-gradient(to bottom, white 1px, transparent 1px)
          `,
          backgroundSize: "80px 80px",
        }}
      />

      {/* Single diagonal accent line - gold */}
      <div
        className="absolute top-0 right-0 w-[2px] h-[200vh] origin-top-right rotate-[-35deg]"
        style={{ background: theme.primary_color }}
      />

      {/* Header */}
      <header className="relative z-20 flex items-center justify-between px-6 md:px-12 py-6 border-b border-white/10">
        {/* Logo */}
        {theme.logo_light_url ? (
          <img
            src={theme.logo_light_url}
            alt="Logo"
            className="h-8 md:h-10 w-auto"
          />
        ) : (
          <span
            className="text-xl font-black tracking-tighter uppercase"
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              color: theme.primary_color,
            }}
          >
            THE STANDARD
          </span>
        )}

        {/* Login - raw, no frills */}
        <Link
          to="/login"
          className="text-white/60 text-sm font-mono uppercase tracking-widest hover:text-white transition-colors"
          style={{ borderBottom: `1px solid transparent` }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.borderBottomColor = theme.primary_color)
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.borderBottomColor = "transparent")
          }
        >
          Agent Login →
        </Link>
      </header>

      {/* Main content */}
      <div className="relative z-10 px-6 md:px-12 pt-24 md:pt-32 lg:pt-40">
        {/* Oversized headline */}
        <h1
          className="text-[12vw] md:text-[10vw] lg:text-[8vw] font-black leading-[0.85] tracking-tighter text-white uppercase"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          {theme.hero_headline.split(" ").map((word, i) => (
            <span key={i} className="block">
              {i === 1 ? (
                <span style={{ color: theme.primary_color }}>{word}</span>
              ) : (
                word
              )}
            </span>
          ))}
        </h1>

        {/* Subheadline - stark contrast */}
        <p className="mt-12 text-white/50 text-lg md:text-xl max-w-xl font-light leading-relaxed">
          {theme.hero_subheadline}
        </p>

        {/* CTA - brutalist button with gold accent */}
        <div className="mt-16 flex items-center gap-8">
          <Link
            to={theme.hero_cta_link}
            className="group relative px-8 py-4 font-black text-sm uppercase tracking-widest transition-all duration-150 border-2"
            style={{
              background: theme.primary_color,
              color: "#0a0a0a",
              borderColor: theme.primary_color,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = theme.primary_color;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = theme.primary_color;
              e.currentTarget.style.color = "#0a0a0a";
            }}
          >
            {theme.hero_cta_text}
          </Link>

          {/* Raw stat */}

          {/*     className="text-4xl font-black" */}
          {/*     style={{ */}
          {/*       fontFamily: "'Plus Jakarta Sans', sans-serif", */}
          {/*       color: theme.primary_color, */}
          {/*     }} */}
          {/*   > */}
          {/*     100+ */}
          {/*   </span> */}
          {/*   <br /> */}
          {/*   <span className="text-white/30">AGENTS NATIONWIDE</span> */}
          {/* </div> */}
        </div>
      </div>

      {/* Bottom brutal accent - gold */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[2px]"
        style={{ background: theme.primary_color }}
      />

      {/* Scroll indicator - raw text */}
      <div className="absolute bottom-12 left-6 md:left-12 text-white/20 font-mono text-xs uppercase tracking-widest">
        <span className="inline-block animate-pulse">↓</span> Scroll
      </div>
    </section>
  );
}
