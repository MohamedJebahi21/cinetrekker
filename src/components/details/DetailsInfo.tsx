import React from 'react';
import { Badge } from '@/components/ui/badge';
import type { Genre } from '@/types/media';
import { useTranslation } from 'react-i18next';

export default function DetailsInfo({ genres, overview }: { genres?: Genre[]; overview: string }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      {genres && genres.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {genres.map((g) => (
            <Badge key={g.id} variant="secondary">{g.name}</Badge>
          ))}
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold mb-2">{t('details.overview', 'Overview')}</h2>
        <p className="text-slate-400 leading-relaxed text-base">{overview}</p>
      </div>
    </div>
  );
}
