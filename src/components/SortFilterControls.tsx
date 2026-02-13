import React from 'react';
import { ArrowUpDown, Filter, Calendar, Star, Clock, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

export type SortOption = 
  | 'title-asc' 
  | 'title-desc' 
  | 'rating-desc' 
  | 'rating-asc' 
  | 'date-desc' 
  | 'date-asc'
  | 'runtime-desc'
  | 'runtime-asc'
  | 'popularity-desc'
  | 'added-desc'
  | 'added-asc';

interface SortFilterControlsProps {
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  runtimeRange?: [number, number];
  onRuntimeChange?: (range: [number, number]) => void;
  minYear?: number;
  maxYear?: number;
  onYearRangeChange?: (min: number, max: number) => void;
  showRuntimeFilter?: boolean;
  showYearFilter?: boolean;
  activeFilters?: number;
}

export function SortFilterControls({
  sortBy,
  onSortChange,
  runtimeRange,
  onRuntimeChange,
  minYear,
  maxYear,
  onYearRangeChange,
  showRuntimeFilter = false,
  showYearFilter = false,
  activeFilters = 0,
}: SortFilterControlsProps) {
  const [localRuntime, setLocalRuntime] = React.useState(runtimeRange || [0, 300]);
  const [localYearMin, setLocalYearMin] = React.useState(minYear || 1900);
  const [localYearMax, setLocalYearMax] = React.useState(maxYear || new Date().getFullYear());

  const sortOptions: { value: SortOption; label: string; icon: React.ReactNode }[] = [
    { value: 'title-asc', label: 'Title (A-Z)', icon: <ArrowUpDown className="h-4 w-4" /> },
    { value: 'title-desc', label: 'Title (Z-A)', icon: <ArrowUpDown className="h-4 w-4" /> },
    { value: 'rating-desc', label: 'Rating (High-Low)', icon: <Star className="h-4 w-4" /> },
    { value: 'rating-asc', label: 'Rating (Low-High)', icon: <Star className="h-4 w-4" /> },
    { value: 'date-desc', label: 'Release Date (Newest)', icon: <Calendar className="h-4 w-4" /> },
    { value: 'date-asc', label: 'Release Date (Oldest)', icon: <Calendar className="h-4 w-4" /> },
    { value: 'runtime-desc', label: 'Runtime (Longest)', icon: <Clock className="h-4 w-4" /> },
    { value: 'runtime-asc', label: 'Runtime (Shortest)', icon: <Clock className="h-4 w-4" /> },
    { value: 'popularity-desc', label: 'Most Popular', icon: <TrendingUp className="h-4 w-4" /> },
    { value: 'added-desc', label: 'Recently Added', icon: <Calendar className="h-4 w-4" /> },
    { value: 'added-asc', label: 'First Added', icon: <Calendar className="h-4 w-4" /> },
  ];

  const currentSort = sortOptions.find((opt) => opt.value === sortBy);

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {/* Sort Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowUpDown className="h-4 w-4" />
            Sort: {currentSort?.label || 'Default'}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>Sort by</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup value={sortBy} onValueChange={(v) => onSortChange(v as SortOption)}>
            {sortOptions.map((option) => (
              <DropdownMenuRadioItem key={option.value} value={option.value} className="gap-2">
                {option.icon}
                {option.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Filter Dropdown */}
      {(showRuntimeFilter || showYearFilter) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="h-4 w-4" />
              Filters
              {activeFilters > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 w-5 rounded-full p-0 flex items-center justify-center">
                  {activeFilters}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-72 p-4 space-y-4">
            {showRuntimeFilter && (
              <div className="space-y-3">
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Runtime: {localRuntime[0]}-{localRuntime[1]} min
                </Label>
                <Slider
                  min={0}
                  max={300}
                  step={15}
                  value={localRuntime}
                  onValueChange={(v) => setLocalRuntime(v as [number, number])}
                  onValueCommit={(v) => onRuntimeChange?.(v as [number, number])}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0 min</span>
                  <span>5 hours</span>
                </div>
              </div>
            )}

            {showYearFilter && (
              <>
                {showRuntimeFilter && <DropdownMenuSeparator />}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Year Range
                  </Label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="number"
                      min={1900}
                      max={new Date().getFullYear()}
                      value={localYearMin}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        setLocalYearMin(val);
                        if (val <= localYearMax) {
                          onYearRangeChange?.(val, localYearMax);
                        }
                      }}
                      className="w-20 px-2 py-1 text-sm border rounded"
                    />
                    <span className="text-muted-foreground">-</span>
                    <input
                      type="number"
                      min={1900}
                      max={new Date().getFullYear()}
                      value={localYearMax}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        setLocalYearMax(val);
                        if (val >= localYearMin) {
                          onYearRangeChange?.(localYearMin, val);
                        }
                      }}
                      className="w-20 px-2 py-1 text-sm border rounded"
                    />
                  </div>
                </div>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
