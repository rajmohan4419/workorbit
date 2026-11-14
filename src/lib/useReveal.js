import { useEffect, useRef } from 'react';

/**
 * Hook to trigger a one-time reveal animation using IntersectionObserver.
 * Automatically adds the 'revealed' class and sets data-revealed="true".
 * Completely bypassed (immediately reveals) when prefers-reduced-motion is enabled.
 *
 * @param {Object} options - IntersectionObserver configuration
 * @returns {React.RefObject} - Ref to attach to the element to reveal
 */
export function useReveal(options = { threshold: 0.1, rootMargin: '0px 0px -30px 0px' }) {
  const ref = useRef(null);
  const threshold = options?.threshold ?? 0.1;
  const rootMargin = options?.rootMargin ?? '0px 0px -30px 0px';
  const root = options?.root ?? null;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const prefersReducedMotion = typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion || typeof IntersectionObserver === 'undefined') {
      el.classList.add('revealed');
      el.setAttribute('data-revealed', 'true');
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        el.classList.add('revealed');
        el.setAttribute('data-revealed', 'true');
        observer.unobserve(el);
      }
    }, { threshold, rootMargin, root });

    observer.observe(el);

    return () => {
      observer.disconnect();
    };
  }, [threshold, rootMargin, root]);

  return ref;
}

export default useReveal;

