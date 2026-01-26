import { useEffect, useCallback } from 'react';

interface ShortcutHandlers {
  onFocusSearch?: () => void;
  onCloseModal?: () => void;
  onNavigateHome?: () => void;
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in inputs
    const target = event.target as HTMLElement;
    const isTyping = target.tagName === 'INPUT' || 
                     target.tagName === 'TEXTAREA' || 
                     target.isContentEditable;

    // "/" to focus search (only when not typing)
    if (event.key === '/' && !isTyping && handlers.onFocusSearch) {
      event.preventDefault();
      handlers.onFocusSearch();
    }

    // "Escape" to close modals (always works)
    if (event.key === 'Escape' && handlers.onCloseModal) {
      handlers.onCloseModal();
    }

    // "g h" for go home (Vim-style navigation)
    // Could extend this for power users

  }, [handlers]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

// Hook for ESC to close modals - can be used by individual modals
export function useEscapeKey(onEscape: () => void, enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onEscape();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onEscape, enabled]);
}
