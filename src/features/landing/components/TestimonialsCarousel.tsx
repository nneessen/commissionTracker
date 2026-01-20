// src/features/landing/components/TestimonialsCarousel.tsx
// Brutalist testimonials - massive quotes, raw numbers, harsh transitions

import { useState } from 'react';
import { useScrollAnimation } from '../hooks';
import type { LandingPageTheme, Testimonial } from '../types';

interface TestimonialsCarouselProps {
  theme: LandingPageTheme;
}

interface TestimonialBlockProps {
  testimonial: Testimonial;
  primaryColor: string;
  index: number;
  isActive: boolean;
}

function TestimonialBlock({
  testimonial,
  primaryColor,
  index,
  isActive,
}: TestimonialBlockProps) {
  return (
    <div
      className="min-w-full px-4 md:px-0 transition-all duration-700"
      style={{
        opacity: isActive ? 1 : 0.1,
        transform: isActive ? 'scale(1)' : 'scale(0.9)',
      }}
    >
      <div className="max-w-5xl mx-auto">
        {/* Top row - index + earnings */}
        <div className="flex items-end justify-between mb-12">
          <span
            className="text-[20vw] md:text-[15vw] lg:text-[10vw] font-black leading-[0.7] tracking-tighter"
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              color: `${primaryColor}15`,
            }}
          >
            {String(index + 1).padStart(2, '0')}
          </span>
          {testimonial.earnings && (
            <span
              className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tighter"
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                color: primaryColor,
              }}
            >
              {testimonial.earnings}
            </span>
          )}
        </div>

        {/* Quote - massive */}
        <blockquote
          className="text-2xl md:text-4xl lg:text-5xl font-black text-white leading-[1.1] mb-16 uppercase tracking-tight"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          "{testimonial.quote}"
        </blockquote>

        {/* Author */}
        <div className="flex items-center gap-8">
          {testimonial.image_url ? (
            <img
              src={testimonial.image_url}
              alt={testimonial.name}
              className="w-20 h-20 object-cover grayscale hover:grayscale-0 transition-all duration-500"
            />
          ) : (
            <div
              className="w-20 h-20 flex items-center justify-center text-3xl font-black"
              style={{
                background: `${primaryColor}20`,
                color: primaryColor,
              }}
            >
              {testimonial.name.charAt(0)}
            </div>
          )}

          <div>
            <span
              className="block text-xl md:text-2xl font-black text-white uppercase tracking-wide"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              {testimonial.name}
            </span>
            {testimonial.role && (
              <span className="block text-white/40 text-sm font-mono mt-2 tracking-[0.1em]">
                {testimonial.role}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function TestimonialsCarousel({ theme }: TestimonialsCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const { ref, isVisible } = useScrollAnimation<HTMLDivElement>({
    threshold: 0.1,
    triggerOnce: true,
  });

  const testimonials =
    theme.testimonials && theme.testimonials.length > 0
      ? theme.testimonials
      : [
          {
            name: 'Your Name Here',
            role: 'Future Agent',
            quote:
              'Add testimonials from your successful agents to showcase real results.',
            earnings: '$XX,XXX',
          },
        ];

  const handlePrev = () => {
    setCurrentIndex((prev) =>
      prev === 0 ? testimonials.length - 1 : prev - 1
    );
  };

  const handleNext = () => {
    setCurrentIndex((prev) =>
      prev === testimonials.length - 1 ? 0 : prev + 1
    );
  };

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

      {/* Vertical accent lines */}
      <div
        className="absolute top-0 bottom-0 left-6 md:left-12 w-[1px]"
        style={{ background: `${theme.primary_color}20` }}
      />
      <div
        className="absolute top-0 bottom-0 right-6 md:right-12 w-[1px]"
        style={{ background: `${theme.primary_color}20` }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12">
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
            [07] Results
          </span>

          <h2
            className="text-[12vw] md:text-[10vw] lg:text-[7vw] font-black leading-[0.85] tracking-tighter text-white uppercase"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            {theme.testimonials_headline.split(' ').map((word, i) => (
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

        {/* Carousel */}
        <div
          className="relative transition-all duration-700"
          style={{
            opacity: isVisible ? 1 : 0,
            transitionDelay: '200ms',
          }}
        >
          {/* Testimonials */}
          <div className="overflow-hidden">
            <div
              className="flex transition-transform duration-700 ease-out"
              style={{
                transform: `translateX(-${currentIndex * 100}%)`,
              }}
            >
              {testimonials.map((testimonial, index) => (
                <TestimonialBlock
                  key={testimonial.name + index}
                  testimonial={testimonial}
                  primaryColor={theme.primary_color}
                  index={index}
                  isActive={index === currentIndex}
                />
              ))}
            </div>
          </div>

          {/* Navigation */}
          {testimonials.length > 1 && (
            <div className="flex items-center justify-between mt-20">
              {/* Prev/Next buttons */}
              <div className="flex gap-4">
                <button
                  onClick={handlePrev}
                  className="w-16 h-16 flex items-center justify-center text-white/40 hover:text-white transition-all duration-300 border-2 hover:border-white/50"
                  style={{ borderColor: `${theme.primary_color}30` }}
                  aria-label="Previous testimonial"
                >
                  <span className="text-2xl font-black">←</span>
                </button>
                <button
                  onClick={handleNext}
                  className="w-16 h-16 flex items-center justify-center text-white/40 hover:text-white transition-all duration-300 border-2 hover:border-white/50"
                  style={{ borderColor: `${theme.primary_color}30` }}
                  aria-label="Next testimonial"
                >
                  <span className="text-2xl font-black">→</span>
                </button>
              </div>

              {/* Index indicator */}
              <div className="flex items-center gap-6">
                <span
                  className="text-5xl md:text-6xl font-black tracking-tighter"
                  style={{
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    color: theme.primary_color,
                  }}
                >
                  {String(currentIndex + 1).padStart(2, '0')}
                </span>
                <span className="text-white/30 font-mono text-sm tracking-[0.2em]">
                  / {String(testimonials.length).padStart(2, '0')}
                </span>
              </div>
            </div>
          )}
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
