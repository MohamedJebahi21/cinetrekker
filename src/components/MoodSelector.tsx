import React, { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

export type MoodId =
  | 'escapist'
  | 'mindless'
  | 'cathartic'
  | 'mindbending'
  | 'feelgood'
  | 'edge';

export type MoodSelectorProps = {
  onSelect?: (mood: MoodId | null) => void;
  className?: string;
};

const MOODS: { id: MoodId; emoji: string; label: string }[] = [
  { id: 'escapist', emoji: '🚀', label: 'Escapist' },
  { id: 'mindless', emoji: '🍿', label: 'Mindless Fun' },
  { id: 'cathartic', emoji: '💔', label: 'Cathartic Cry' },
  { id: 'mindbending', emoji: '🧠', label: 'Mind Bending' },
  { id: 'feelgood', emoji: '🤣', label: 'Feel Good' },
  { id: 'edge', emoji: '😰', label: 'Edge of Seat' },
];

export function MoodSelector({ onSelect, className = '' }: MoodSelectorProps) {
  const [selected, setSelected] = useState<MoodId | null>(null);
  const reduce = useReducedMotion();

  const handleSelect = (id: MoodId) => {
    const next = selected === id ? null : id;
    setSelected(next);
    onSelect?.(next);
  };

  return (
    <div className={cn('w-full', className)}>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {MOODS.map((m) => {
          const active = selected === m.id;
          return (
            <motion.button
              key={m.id}
              type="button"
              onClick={() => handleSelect(m.id)}
              aria-pressed={active}
              whileTap={reduce ? undefined : { scale: 0.97 }}
              transition={{ duration: 0.12 }}
              className={cn(
                'flex flex-col items-center justify-center gap-2 rounded-lg p-3 text-center select-none',
                'min-h-[44px] min-w-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                'bg-card hover:bg-accent/5 transition-colors',
                active ? 'ring-2 ring-primary bg-primary/5 text-primary' : 'text-foreground'
              )}
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <span className="text-2xl leading-none" aria-hidden>
                {m.emoji}
              </span>
              <span className="text-sm font-medium leading-tight">{m.label}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

export default MoodSelector;
