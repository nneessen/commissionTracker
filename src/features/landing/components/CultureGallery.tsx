// src/features/landing/components/CultureGallery.tsx
// Brutalist gallery - raw grid, no frames, harsh overlays

import { useScrollAnimation } from '../hooks';
import type { LandingPageTheme } from '../types';

interface CultureGalleryProps {
  theme: LandingPageTheme;
}

export function CultureGallery({ theme }: CultureGalleryProps) {
  const { ref, isVisible } = useScrollAnimation<HTMLDivElement>({
    threshold: 0.1,
    triggerOnce: true,
  });

  // Filter out images with empty URLs
  const validGalleryImages = theme.gallery_images?.filter(img => img.url && img.url.trim() !== '') || [];

  const hasImages =
    theme.gallery_featured_url ||
    validGalleryImages.length > 0;

  const gridImages = validGalleryImages.slice(0, 6);


  return (
    <section ref={ref} className="relative py-32 md:py-48 overflow-hidden bg-[#050505]">
      {/* Harsh grid background */}
      <div
        className="absolute inset-0 opacity-[0.015]"
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

      {/* Vertical accent line */}
      <div
        className="absolute top-0 bottom-0 right-6 md:right-12 w-[1px]"
        style={{ background: `${theme.primary_color}20` }}
      />

      {/* Diagonal */}
      <div
        className="absolute top-0 left-[40%] w-[1px] h-[200%] origin-top rotate-[15deg] hidden lg:block"
        style={{ background: `${theme.primary_color}10` }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12">
        {/* Header */}
        <div
          className="mb-20 transition-all duration-700"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(30px)',
          }}
        >
          {/* Index marker */}
          <span className="font-mono text-[10px] text-white/30 tracking-[0.3em] uppercase block mb-8">
            [03] Culture
          </span>

          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
            <h2
              className="text-[12vw] md:text-[10vw] lg:text-[7vw] font-black leading-[0.85] tracking-tighter text-white uppercase"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              {theme.gallery_headline.split(' ').map((word, i) => (
                <span key={i} className="block">
                  {i === 1 ? (
                    <span style={{ color: theme.primary_color }}>{word}</span>
                  ) : (
                    word
                  )}
                </span>
              ))}
            </h2>
            <p className="text-white/40 text-lg md:text-xl lg:text-2xl max-w-md font-light lg:text-right">
              {theme.gallery_subheadline}
            </p>
          </div>
        </div>

        {/* Gallery grid */}
        {hasImages ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {/* Featured image - spans two columns */}
            {theme.gallery_featured_url && (
              <div
                className="col-span-2 row-span-2 transition-all duration-700"
                style={{
                  opacity: isVisible ? 1 : 0,
                  transform: isVisible ? 'scale(1)' : 'scale(0.95)',
                  transitionDelay: '100ms',
                }}
              >
                <div className="relative h-full min-h-[400px] md:min-h-[600px] overflow-hidden group">
                  <img
                    src={theme.gallery_featured_url}
                    alt="Team culture"
                    className="w-full h-full object-cover grayscale-[50%] group-hover:grayscale-0 transition-all duration-700 group-hover:scale-105"
                  />
                  {/* Gold overlay */}
                  <div
                    className="absolute inset-0 opacity-30 group-hover:opacity-0 transition-opacity duration-500 mix-blend-multiply"
                    style={{ background: theme.primary_color }}
                  />
                  {/* Index */}
                  <span className="absolute bottom-4 left-4 font-mono text-[10px] text-white/70 tracking-[0.2em]">
                    [01]
                  </span>
                  {/* Corner accent */}
                  <div
                    className="absolute top-0 right-0 w-20 h-20"
                    style={{
                      background: `linear-gradient(135deg, ${theme.primary_color} 0%, transparent 50%)`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Grid images */}
            {gridImages.map((image, index) => (
              <div
                key={`gallery-${index}-${image.url.slice(-20)}`}
                className="transition-all duration-500"
                style={{
                  opacity: isVisible ? 1 : 0,
                  transform: isVisible ? 'translateY(0)' : 'translateY(30px)',
                  transitionDelay: `${(index + 2) * 100}ms`,
                }}
              >
                <div className="relative aspect-square overflow-hidden group">
                  <img
                    src={image.url}
                    alt={image.alt || image.caption || 'Team photo'}
                    className="w-full h-full object-cover grayscale-[50%] group-hover:grayscale-0 transition-all duration-700 group-hover:scale-110"
                  />
                  {/* Gold overlay */}
                  <div
                    className="absolute inset-0 opacity-30 group-hover:opacity-0 transition-opacity duration-500 mix-blend-multiply"
                    style={{ background: theme.primary_color }}
                  />
                  {/* Index */}
                  <span className="absolute bottom-2 left-2 font-mono text-[10px] text-white/50 tracking-[0.2em]">
                    [{String(index + 2).padStart(2, '0')}]
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Placeholder grid when no images
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {[...Array(6)].map((_, index) => (
              <div
                key={index}
                className="transition-all duration-500"
                style={{
                  opacity: isVisible ? 1 : 0,
                  transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
                  transitionDelay: `${index * 80}ms`,
                }}
              >
                <div
                  className="relative aspect-square overflow-hidden"
                  style={{ background: `${theme.primary_color}08` }}
                >
                  {/* Grid pattern placeholder */}
                  <div
                    className="absolute inset-0 opacity-30"
                    style={{
                      backgroundImage: `
                        linear-gradient(to right, ${theme.primary_color}20 1px, transparent 1px),
                        linear-gradient(to bottom, ${theme.primary_color}20 1px, transparent 1px)
                      `,
                      backgroundSize: '20px 20px',
                    }}
                  />
                  {/* Center text */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span
                      className="text-[20vw] md:text-[10vw] font-black opacity-10"
                      style={{
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                        color: theme.primary_color,
                      }}
                    >
                      {index + 1}
                    </span>
                  </div>
                  {/* Index */}
                  <span className="absolute bottom-2 left-2 font-mono text-[10px] text-white/20 tracking-[0.2em]">
                    [{String(index + 1).padStart(2, '0')}]
                  </span>
                </div>
              </div>
            ))}
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
