import React, { useState, useEffect } from 'react';
import { resolveMediaUrl } from '../lib/indexedDBStorage';

interface ResolvedImageProps {
  src: string | undefined;
  alt?: string;
  className?: string;
  referrerPolicy?: "no-referrer" | "no-referrer-when-downgrade" | "origin" | "origin-when-cross-origin" | "same-origin" | "strict-origin" | "strict-origin-when-cross-origin" | "unsafe-url" | undefined;
  style?: React.CSSProperties;
  onClick?: (e: React.MouseEvent<HTMLImageElement>) => void;
}

export function ResolvedImage({ src, ...props }: ResolvedImageProps) {
  const [resolvedSrc, setResolvedSrc] = useState<string>('');

  useEffect(() => {
    if (!src) {
      setResolvedSrc('');
      return;
    }

    let isMounted = true;
    resolveMediaUrl(src).then((resolved) => {
      if (isMounted) {
        setResolvedSrc(resolved);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [src]);

  return <img src={resolvedSrc || src} {...props} />;
}
