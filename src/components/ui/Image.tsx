import React from 'react';

interface ImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  srcSet?: string;
  sizes?: string;
  fetchPriority?: 'high' | 'low' | 'auto';
}

export const Image: React.FC<ImageProps> = ({
  src,
  alt,
  width,
  height,
  srcSet,
  sizes,
  loading = 'lazy',
  fetchPriority = 'auto',
  ...props
}) => {
  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      srcSet={srcSet}
      sizes={sizes}
      loading={loading}
      fetchPriority={fetchPriority}
      {...props}
    />
  );
};