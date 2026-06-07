import React from 'react';

interface MovieImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  path: string;
  size?: 'w92' | 'w185' | 'w342' | 'w500' | 'w780' | 'original';
  width: number;
  height: number;
  priority?: boolean;
  fetchPriority?: 'high' | 'low' | 'auto';
}

export const MovieImage: React.FC<MovieImageProps> = ({
  path,
  size = 'w500',
  width,
  height,
  priority = false,
  alt = '',
  fetchPriority,
  ...props
}) => {
  const src = `https://image.tmdb.org/t/p/${size}${path}`;
  const effectiveFetchPriority = fetchPriority ?? (priority ? 'high' : 'auto');
  const fetchPriorityAttr =
    effectiveFetchPriority && effectiveFetchPriority !== 'auto'
      ? ({ fetchpriority: effectiveFetchPriority } as { fetchpriority: 'high' | 'low' })
      : {};

  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading={priority ? 'eager' : 'lazy'}
      {...fetchPriorityAttr}
      {...props}
    />
  );
};
