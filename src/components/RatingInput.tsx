import React, { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from "../lib/utils";

interface RatingInputProps {
  value?: number;
  onChange: (rating: number) => void;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  readonly?: boolean;
  showValue?: boolean;
}

export function RatingInput({
  value = 0,
  onChange,
  max = 5,
  size = 'md',
  readonly = false,
  showValue = true,
}: RatingInputProps) {
  const [hoverValue, setHoverValue] = useState(0);

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  const handleClick = (rating: number) => {
    if (!readonly) {
      onChange(rating === value ? 0 : rating);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div 
        className="flex gap-1"
        onMouseLeave={() => setHoverValue(0)}
      >
        {Array.from({ length: max }).map((_, index) => {
          const starValue = index + 1;
          const isFilled = starValue <= (hoverValue || value);

          return (
            <button
              key={index}
              type="button"
              onClick={() => handleClick(starValue)}
              onMouseEnter={() => !readonly && setHoverValue(starValue)}
              disabled={readonly}
              className={cn(
                'transition-all duration-150',
                !readonly && 'cursor-pointer hover:scale-110',
                readonly && 'cursor-default'
              )}
            >
              <Star
                className={cn(
                  sizeClasses[size],
                  'transition-colors',
                  isFilled
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'fill-none text-muted-foreground'
                )}
              />
            </button>
          );
        })}
      </div>
      {showValue && value > 0 && (
        <span className="text-sm font-medium text-muted-foreground">
          {value}/{max}
        </span>
      )}
    </div>
  );
}
