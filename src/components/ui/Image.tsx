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
  const fetchPriorityAttr =
    fetchPriority && fetchPriority !== 'auto'
      ? ({ fetchpriority: fetchPriority } as { fetchpriority: 'high' | 'low' })
      : {};

  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      srcSet={srcSet}
      sizes={sizes}
      loading={loading}
      {...fetchPriorityAttr}
      {...props}
    />
  );
};
