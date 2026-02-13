import { useEffect } from 'react';

export default function useDocumentTitle(title?: string) {
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const prev = document.title;
    if (title) {
      document.title = title.includes('CineTrekker') ? title : `${title} | CineTrekker`;
    }
    return () => { document.title = prev; };
  }, [title]);
}
