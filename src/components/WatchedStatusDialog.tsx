import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WatchedStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: { rating: number; note: string; status: string }) => void;
  initialRating?: number;
  initialNote?: string;
  initialStatus?: string;
  mediaTitle: string;
}

const STATUS_OPTIONS = [
  { value: 'watching', label: 'Watching', icon: '📺', color: 'text-blue-500' },
  { value: 'completed', label: 'Completed', icon: '✅', color: 'text-green-500' },
  { value: 'dropped', label: 'Dropped', icon: '❌', color: 'text-red-500' },
  { value: 'plan_to_watch', label: 'Plan to Watch', icon: '📋', color: 'text-yellow-500' },
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
    onSave({ rating, note, status });
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
          {/* Status Selection */}
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
                  <SelectItem key={option.value} value={option.value} className="cursor-pointer">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{option.icon}</span>
                      <span className={cn("font-medium", option.color)}>{option.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Rating */}
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
                  className="transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary rounded"
                  aria-label={`Rate ${star} out of 10`}
                >
                  <Star
                    className={cn(
                      'w-6 h-6 transition-colors',
                      star <= (hoveredStar || rating)
                        ? 'fill-primary text-primary'
                        : 'text-muted-foreground'
                    )}
                  />
                </button>
              ))}
              <span className="ml-2 text-2xl font-bold text-primary min-w-[3ch]">
                {hoveredStar || rating}/10
              </span>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="note" className="text-base font-semibold">
              {t('actions.yourThoughts', 'Your Thoughts')} 
              <span className="text-sm text-muted-foreground font-normal ml-2">
                ({t('common.optional', 'Optional')})
              </span>
            </Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t('actions.notePlaceholder', 'Share your thoughts about this title...')}
              className="min-h-[100px] resize-none"
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">
              {note.length}/500
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button onClick={handleSave} className="gap-2">
            <Star className="w-4 h-4" />
            {t('common.save', 'Save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
