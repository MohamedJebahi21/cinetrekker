import React from 'react';
import { getImageUrl } from '@/services/tmdb';

type Props = {
  backdrops?: Array<{ file_path: string }>;
  videos?: Array<{ key: string; name?: string; site?: string }>; 
};

function MediaGalleryInner({ backdrops = [], videos = [] }: Props) {
  if (!backdrops.length && !videos.length) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">Trailers & Clips</h3>
        <div className="flex gap-3 overflow-x-auto hide-scrollbar">
          {videos.slice(0,6).map((v, idx) => (
            <div key={v.key || idx} className="w-64 bg-muted rounded overflow-hidden">
              {v.site === 'YouTube' ? (
                <iframe title={v.name || v.key} src={`https://www.youtube.com/embed/${v.key}`} className="w-full h-36" />
              ) : (
                <div className="h-36 flex items-center justify-center">{v.name}</div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-2">Backdrops</h3>
        <div className="flex gap-3 overflow-x-auto hide-scrollbar">
          {backdrops.slice(0,8).map((b, i) => (
            <img key={i} src={getImageUrl(b.file_path, 'w780')} alt={`backdrop-${i}`} className="w-72 h-40 object-cover rounded-md" />
          ))}
        </div>
      </div>
    </div>
  );
}

export const MediaGallery = React.memo(MediaGalleryInner);

export default MediaGallery;
