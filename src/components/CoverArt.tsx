import { useState } from 'react';
import { Music } from 'lucide-react';

interface CoverArtProps {
  url?: string;
  className?: string;
}

/**
 * Album art, or a theme-colored placeholder when there is none (or it fails to
 * load). Decorative: the title and artist are always shown next to it.
 */
export const CoverArt = ({ url, className = '' }: CoverArtProps) => {
  const [failedUrl, setFailedUrl] = useState<string>();
  const hasImage = Boolean(url) && failedUrl !== url;

  return (
    <div
      className={`relative aspect-square shrink-0 overflow-hidden rounded-lg bg-raised ${className}`}
    >
      {hasImage ? (
        <img
          src={url}
          alt=""
          draggable={false}
          onError={() => setFailedUrl(url)}
          className="size-full object-cover"
        />
      ) : (
        <Music
          aria-hidden="true"
          strokeWidth={1.25}
          className="absolute inset-0 m-auto size-2/5 text-fg-muted"
        />
      )}
    </div>
  );
};
