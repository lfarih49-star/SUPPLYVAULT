import React, { useState } from 'react';
import { Package, ImageOff } from 'lucide-react';

interface AspectImageProps {
  src?: string | null;
  alt: string;
  aspectRatio?: '16/9' | '4/3' | '1/1';
  className?: string;
  containerClassName?: string;
  badge?: React.ReactNode;
  fallbackText?: string;
}

export const AspectImage: React.FC<AspectImageProps> = ({
  src,
  alt,
  aspectRatio = '16/9',
  className = '',
  containerClassName = '',
  badge,
  fallbackText,
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Ratio classes
  const ratioClasses = {
    '16/9': 'aspect-[16/9]',
    '4/3': 'aspect-[4/3]',
    '1/1': 'aspect-square',
  }[aspectRatio];

  const showFallback = !src || hasError;

  return (
    <div
      className={`relative w-full overflow-hidden bg-navy-950 border border-slate-800/80 rounded-xl select-none group ${ratioClasses} ${containerClassName}`}
    >
      {!showFallback ? (
        <>
          {/* Skeleton placeholder while loading */}
          {!isLoaded && (
            <div className="absolute inset-0 bg-navy-900 animate-pulse flex items-center justify-center">
              <Package className="w-8 h-8 text-gold-500/20" />
            </div>
          )}

          <img
            src={src}
            alt={alt}
            loading="lazy"
            onLoad={() => setIsLoaded(true)}
            onError={() => setHasError(true)}
            className={`w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105 ${
              isLoaded ? 'opacity-100' : 'opacity-0'
            } ${className}`}
          />
        </>
      ) : (
        /* Luxury Monogram SVG Fallback */
        <div className="absolute inset-0 bg-gradient-to-br from-navy-900 via-navy-950 to-navy-900 flex flex-col items-center justify-center p-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-navy-800/80 border border-gold-500/30 flex items-center justify-center shadow-inner mb-2 group-hover:border-gold-500/60 transition-colors">
            <Package className="w-6 h-6 text-gold-400" />
          </div>
          <span className="text-[11px] font-bold text-slate-300 tracking-tight line-clamp-1 max-w-[85%]">
            {fallbackText || alt}
          </span>
          <span className="text-[9px] uppercase tracking-widest font-mono text-gold-500/70 mt-0.5">
            SupplyVault Certified
          </span>
        </div>
      )}

      {/* Optional Top Badge (e.g. SKU, status) */}
      {badge && <div className="absolute top-2.5 left-2.5 z-10">{badge}</div>}

      {/* Subtle bottom gradient vignette for depth */}
      <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-navy-950/70 to-transparent pointer-events-none" />
    </div>
  );
};

