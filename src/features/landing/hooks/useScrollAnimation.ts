// src/features/landing/hooks/useScrollAnimation.ts
// Intersection Observer hook for scroll-triggered animations

import { useEffect, useRef, useState, useCallback } from 'react';

interface UseScrollAnimationOptions {
  /**
   * Percentage of element visibility required to trigger (0-1)
   * @default 0.1
   */
  threshold?: number;

  /**
   * Root margin for intersection observer
   * @default '0px'
   */
  rootMargin?: string;

  /**
   * Only trigger once (element stays visible after first trigger)
   * @default true
   */
  triggerOnce?: boolean;

  /**
   * Delay before animation starts (ms)
   * @default 0
   */
  delay?: number;
}

interface UseScrollAnimationReturn<T extends HTMLElement> {
  ref: React.RefObject<T | null>;
  isVisible: boolean;
  hasAnimated: boolean;
}

/**
 * Hook for triggering animations when element scrolls into view
 */
export function useScrollAnimation<T extends HTMLElement = HTMLDivElement>(
  options: UseScrollAnimationOptions = {}
): UseScrollAnimationReturn<T> {
  const { threshold = 0.1, rootMargin = '0px', triggerOnce = true, delay = 0 } = options;

  const ref = useRef<T>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (delay > 0) {
            setTimeout(() => {
              setIsVisible(true);
              setHasAnimated(true);
            }, delay);
          } else {
            setIsVisible(true);
            setHasAnimated(true);
          }

          if (triggerOnce) {
            observer.unobserve(element);
          }
        } else if (!triggerOnce) {
          setIsVisible(false);
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [threshold, rootMargin, triggerOnce, delay]);

  return { ref, isVisible, hasAnimated };
}

/**
 * Hook for staggered animations on multiple elements
 */
export function useStaggeredAnimation(
  _itemCount: number,
  options: UseScrollAnimationOptions & { staggerDelay?: number } = {}
): {
  containerRef: React.RefObject<HTMLDivElement | null>;
  isContainerVisible: boolean;
  getItemDelay: (index: number) => number;
  getItemStyle: (index: number) => React.CSSProperties;
} {
  const { staggerDelay = 100, ...scrollOptions } = options;
  const { ref: containerRef, isVisible: isContainerVisible } =
    useScrollAnimation<HTMLDivElement>(scrollOptions);

  const getItemDelay = useCallback(
    (index: number) => index * staggerDelay,
    [staggerDelay]
  );

  const getItemStyle = useCallback(
    (index: number): React.CSSProperties => ({
      opacity: isContainerVisible ? 1 : 0,
      transform: isContainerVisible ? 'translateY(0)' : 'translateY(20px)',
      transition: `opacity 0.5s ease-out ${getItemDelay(index)}ms, transform 0.5s ease-out ${getItemDelay(index)}ms`,
    }),
    [isContainerVisible, getItemDelay]
  );

  return {
    containerRef,
    isContainerVisible,
    getItemDelay,
    getItemStyle,
  };
}

/**
 * Hook for parallax scroll effects
 */
export function useParallax(speed: number = 0.5): {
  ref: React.RefObject<HTMLDivElement | null>;
  style: React.CSSProperties;
} {
  const ref = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const scrolled = window.scrollY;
      const elementTop = rect.top + scrolled;
      const relativeScroll = scrolled - elementTop + window.innerHeight;
      setOffset(relativeScroll * speed);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial calculation

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [speed]);

  return {
    ref,
    style: {
      transform: `translateY(${offset}px)`,
    },
  };
}

/**
 * Hook for scroll progress tracking
 */
export function useScrollProgress(): {
  progress: number;
  isAtTop: boolean;
  isAtBottom: boolean;
} {
  const [progress, setProgress] = useState(0);
  const [isAtTop, setIsAtTop] = useState(true);
  const [isAtBottom, setIsAtBottom] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollProgress = docHeight > 0 ? scrollTop / docHeight : 0;

      setProgress(Math.min(Math.max(scrollProgress, 0), 1));
      setIsAtTop(scrollTop <= 10);
      setIsAtBottom(scrollTop >= docHeight - 10);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial calculation

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return { progress, isAtTop, isAtBottom };
}
