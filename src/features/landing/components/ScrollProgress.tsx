// src/features/landing/components/ScrollProgress.tsx
// Scroll progress indicator at the top of the page

import { useScrollProgress } from '../hooks';

interface ScrollProgressProps {
  color?: string;
}

export function ScrollProgress({ color = '#f59e0b' }: ScrollProgressProps) {
  const { progress } = useScrollProgress();

  return (
    <div className="fixed top-0 left-0 right-0 h-1 z-50">
      <div
        className="h-full transition-all duration-100 ease-out"
        style={{
          width: `${progress * 100}%`,
          background: `linear-gradient(90deg, ${color} 0%, ${color}cc 100%)`,
          boxShadow: `0 0 10px ${color}80`,
        }}
      />
    </div>
  );
}
