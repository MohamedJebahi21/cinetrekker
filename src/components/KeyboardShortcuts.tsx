import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function KeyboardShortcuts() {
  const navigate = useNavigate();
  const seqRef = useRef<string | null>(null);
  const seqTimer = useRef<number | null>(null);
  const [announcement, setAnnouncement] = useState<string>('');

  useEffect(() => {
    const clearSeq = () => {
      seqRef.current = null;
      if (seqTimer.current) {
        window.clearTimeout(seqTimer.current);
        seqTimer.current = null;
      }
    };

    const handler = (e: KeyboardEvent) => {
      const target = document.activeElement as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const isTyping = target?.isContentEditable || tag === 'input' || tag === 'textarea' || target?.getAttribute('role') === 'textbox';

      if (!isTyping && e.key === '/') {
        e.preventDefault();
        const el = document.querySelector<HTMLInputElement>('.main-search-input');
        el?.focus();
        el?.select?.();
        setAnnouncement('Search focused');
        return;
      }

      if (e.key === 'Escape') {
        window.dispatchEvent(new CustomEvent('app:escape'));
        setAnnouncement('Closed overlays');
        return;
      }

      if (seqRef.current === 'g') {
        if (e.key === 'h') {
          navigate('/');
          setAnnouncement('Go to Home');
          clearSeq();
          return;
        }
        if (e.key === 's') {
          navigate('/search');
          setAnnouncement('Go to Search');
          clearSeq();
          return;
        }
        clearSeq();
        return;
      }

      if (e.key === 'g') {
        seqRef.current = 'g';
        seqTimer.current = window.setTimeout(() => clearSeq(), 1000);
        return;
      }
    };

    window.addEventListener('keydown', handler);
    return () => {
      window.removeEventListener('keydown', handler);
      if (seqTimer.current) window.clearTimeout(seqTimer.current);
    };
  }, [navigate]);

  return (
    <div aria-hidden="true">
      <div aria-live="polite" className="sr-only">{announcement}</div>
    </div>
  );
}
