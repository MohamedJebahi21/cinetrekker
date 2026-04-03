import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WatchedStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: {
    rating: number;
    note: string;
    status: "watching" | "completed" | "dropped" | "plan_to_watch";
  }) => void;
  initialRating?: number;
  initialNote?: string;
  initialStatus?: string;
  mediaTitle: string;
}

const STATUS_OPTIONS = [
  { value: 'watching', labelKey: 'watchedStatusDialog.statusWatching', fallback: 'Watching', icon: 'TV', color: 'text-primary' },
  { value: 'completed', labelKey: 'watchedStatusDialog.statusCompleted', fallback: 'Completed', icon: 'Done', color: 'text-green-500' },
  { value: 'dropped', labelKey: 'watchedStatusDialog.statusDropped', fallback: 'Dropped', icon: 'Stop', color: 'text-red-500' },
  { value: 'plan_to_watch', labelKey: 'watchedStatusDialog.statusPlanToWatch', fallback: 'Plan to Watch', icon: 'List', color: 'text-yellow-500' },
];

export function WatchedStatusDialog({
  open,
  onOpenChange,
  onSave,
  initialRating = 5,
  initialNote = '',
  initialStatus = 'completed',
  mediaTitle,
}: WatchedStatusDialogProps) {
  const { t } = useTranslation();
  const [rating, setRating] = useState(initialRating);
  const [note, setNote] = useState(initialNote);
  const [status, setStatus] = useState(initialStatus);
  const [hoveredStar, setHoveredStar] = useState(0);

  const handleSave = () => {
    onSave({
      rating,
      note,
      status: status as "watching" | "completed" | "dropped" | "plan_to_watch",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {t('actions.rateAndReview', 'Rate & Review')}
          </DialogTitle>
          <DialogDescription className="line-clamp-1">
            {mediaTitle}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="status" className="text-base font-semibold">
              {t('actions.watchStatus', 'Watch Status')}
            </Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="status" className="h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem
                    key={option.value}
                    value={option.value}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{option.icon}</span>
                      <span className={cn('font-medium', option.color)}>
                        {t(option.labelKey, option.fallback)}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-base font-semibold">
              {t('actions.yourRating', 'Your Rating')}
            </Label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredStar(star)}
                  onMouseLeave={() => setHoveredStar(0)}
                  className="rounded transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary"
                  aria-label={t('watchedStatusDialog.rateOutOfTen', 'Rate {{star}} out of 10', { star })}
                >
                  <Star
                    className={cn(
                      'h-6 w-6 transition-colors',
                      star <= (hoveredStar || rating)
                        ? 'fill-primary text-primary'
                        : 'text-muted-foreground',
                    )}
                  />
                </button>
              ))}
              <span className="ml-2 min-w-[3ch] text-2xl font-bold text-primary">
                {hoveredStar || rating}/10
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="note" className="text-base font-semibold">
              {t('actions.yourThoughts', 'Your Thoughts')}
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({t('common.optional', 'Optional')})
              </span>
            </Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t(
                'actions.notePlaceholder',
                'Share your thoughts about this title...',
              )}
              className="min-h-[100px] resize-none"
              maxLength={500}
            />
            <p className="text-right text-xs text-muted-foreground">
              {note.length}/500
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button onClick={handleSave} className="gap-2">
            <Star className="h-4 w-4" />
            {t('common.save', 'Save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
