import { useEffect, useRef, useState } from 'react';

export function useInView<T extends Element>(options?: IntersectionObserverInit) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setInView(true);
          // once visible, we can unobserve to avoid extra work
          if (observer && el) observer.unobserve(el);
        }
      });
    }, options || { rootMargin: '200px' });

    observer.observe(el);

    return () => observer.disconnect();
  }, [options]);

  return [ref, inView] as const;
}
