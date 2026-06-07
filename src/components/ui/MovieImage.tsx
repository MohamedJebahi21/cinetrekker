import React from 'react';

interface MovieImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  path: string;
  size?: 'w92' | 'w185' | 'w342' | 'w500' | 'w780' | 'original';
  width: number;
  height: number;
  priority?: boolean;
}

export const MovieImage: React.FC<MovieImageProps> = ({
  path,
  size = 'w500',
  width,
  height,
  priority = false,
  alt = '',
  ...props
}) => {
  const src = `https://image.tmdb.org/t/p/${size}${path}`;
  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      {...props}
    />
  );
};