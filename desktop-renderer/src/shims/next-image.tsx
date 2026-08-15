import React from 'react';

type ImageProps = React.ImgHTMLAttributes<HTMLImageElement> & {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  priority?: boolean;
  unoptimized?: boolean;
};

export default function Image({
  src,
  alt,
  width,
  height,
  fill,
  className,
  style,
  ...rest
}: ImageProps) {
  const mergedStyle: React.CSSProperties = {
    ...style,
    ...(fill
      ? {
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }
      : {}),
  };

  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      style={mergedStyle}
      {...rest}
    />
  );
}
