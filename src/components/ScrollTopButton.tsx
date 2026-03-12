import { useState, useEffect } from 'react';
import { ChevronUp } from 'lucide-react';

export default function ScrollTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      try {
        setVisible(window.scrollY > 300);
      } catch (e) {
        setVisible(false);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Scroll to top"
      className="fixed bottom-6 right-4 z-50 w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center active:scale-95 transition-transform"
    >
      <ChevronUp className="w-5 h-5" />
    </button>
  );
}
