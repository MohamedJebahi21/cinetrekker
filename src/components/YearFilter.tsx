import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import Calendar from 'lucide-react/dist/esm/icons/calendar';

interface YearFilterProps {
  selectedYear: number | null;
  onYearChange: (year: number | null) => void;
  showAllOption?: boolean;
}

export function YearFilter({ selectedYear, onYearChange, showAllOption = true }: YearFilterProps) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - i);

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
      <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      
      {showAllOption && (
        <Badge
          variant={selectedYear === null ? "default" : "outline"}
          className="cursor-pointer whitespace-nowrap"
          onClick={() => onYearChange(null)}
        >
          All Years
        </Badge>
      )}
      
      {years.map(year => (
        <Badge
          key={year}
          variant={selectedYear === year ? "default" : "outline"}
          className="cursor-pointer whitespace-nowrap"
          onClick={() => onYearChange(year)}
        >
          {year}
        </Badge>
      ))}
    </div>
  );
}
