// src/features/landing/components/FaqAccordion.tsx
// Brutalist FAQ - massive expand/collapse, harsh typography

import { useState } from 'react';
import { useScrollAnimation } from '../hooks';
import type { LandingPageTheme, FaqItem } from '../types';

interface FaqAccordionProps {
  theme: LandingPageTheme;
}

interface FaqItemRowProps {
  item: FaqItem;
  index: number;
  isOpen: boolean;
  onToggle: () => void;
  primaryColor: string;
  isVisible: boolean;
  isLast: boolean;
}

function FaqItemRow({
  item,
  index,
  isOpen,
  onToggle,
  primaryColor,
  isVisible,
  isLast,
}: FaqItemRowProps) {
  return (
    <div
      className="transition-all duration-500"
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(30px)',
        transitionDelay: `${index * 100}ms`,
      }}
    >
      <div
        className="border-t-2"
        style={{ borderColor: `${primaryColor}20` }}
      >
        {/* Question */}
        <button
          onClick={onToggle}
          className="w-full flex items-start gap-8 md:gap-12 py-10 md:py-14 text-left group"
        >
          {/* Index */}
          <span
            className="text-4xl md:text-5xl font-black shrink-0 tracking-tighter"
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              color: isOpen ? primaryColor : `${primaryColor}30`,
              transition: 'color 0.3s',
            }}
          >
            {String(index + 1).padStart(2, '0')}
          </span>

          {/* Question text */}
          <span
            className="flex-1 text-xl md:text-2xl lg:text-3xl font-black transition-colors leading-tight uppercase tracking-tight pt-2"
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              color: isOpen ? 'white' : 'rgba(255,255,255,0.6)',
            }}
          >
            {item.question}
          </span>

          {/* Toggle indicator */}
          <span
            className="text-4xl md:text-5xl shrink-0 font-black transition-all duration-300"
            style={{
              color: isOpen ? primaryColor : 'rgba(255,255,255,0.2)',
              transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)',
            }}
          >
            +
          </span>
        </button>

        {/* Answer */}
        <div
          className="overflow-hidden transition-all duration-500 ease-out"
          style={{
            maxHeight: isOpen ? '500px' : '0px',
            opacity: isOpen ? 1 : 0,
          }}
        >
          <div className="pl-16 md:pl-24 pb-12 pr-16">
            <p className="text-white/50 text-lg md:text-xl lg:text-2xl leading-relaxed max-w-3xl">
              {item.answer}
            </p>
            {/* Accent bar */}
            <div
              className="w-16 h-[2px] mt-8"
              style={{ background: primaryColor }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function FaqAccordion({ theme }: FaqAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const { ref, isVisible } = useScrollAnimation<HTMLDivElement>({
    threshold: 0.1,
    triggerOnce: true,
  });

  if (!theme.faq_items || theme.faq_items.length === 0) {
    return null;
  }

  const handleToggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

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
        className="absolute top-0 bottom-0 left-6 md:left-12 w-[1px]"
        style={{ background: `${theme.primary_color}20` }}
      />

      {/* Diagonal */}
      <div
        className="absolute top-0 right-[25%] w-[1px] h-[200%] origin-top rotate-[-25deg] hidden lg:block"
        style={{ background: `${theme.primary_color}10` }}
      />

      <div className="relative z-10 max-w-5xl mx-auto px-6 md:px-12">
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
            [08] FAQ
          </span>

          <h2
            className="text-[12vw] md:text-[10vw] lg:text-[7vw] font-black leading-[0.85] tracking-tighter text-white uppercase"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            {theme.faq_headline.split(' ').map((word, i) => (
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

        {/* FAQ List */}
        <div>
          {theme.faq_items.map((item, index) => (
            <FaqItemRow
              key={item.question}
              item={item}
              index={index}
              isOpen={openIndex === index}
              onToggle={() => handleToggle(index)}
              primaryColor={theme.primary_color}
              isVisible={isVisible}
              isLast={index === theme.faq_items.length - 1}
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
