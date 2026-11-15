import React from 'react';
import { Heart } from 'lucide-react';
import { CardSize, WorldDisplayData } from '@/lib/bindings';
import { useLocalization } from '@/hooks/use-localization';
import { usePatreonContext } from '@/contexts/patreon-context';
import { PlatformIndicator } from './platform-indicator';

interface WorldCardPreviewProps {
  size: CardSize;
  world: WorldDisplayData;
  imageOverlay?: React.ReactNode;
}

export function WorldCardPreview(props: WorldCardPreviewProps) {
  const { size, world, imageOverlay } = props;
  const { t } = useLocalization();
  const { supporters } = usePatreonContext();
  const isSupporter = supporters.has(world.authorName);
  const sizeClasses: Record<CardSize, string> = {
    Compact: 'w-48 h-32',
    Normal: 'w-52 h-48',
    Expanded: 'w-64 h-64',
    Original: 'w-64 h-44',
  };

  return (
    <div
      className={`relative flex flex-col overflow-hidden border rounded-lg shadow hover:shadow-md transition-shadow duration-300 ${sizeClasses[size]}`}
    >
      {/* Overlay platform icons without affecting the content height. */}
      <div className="absolute top-2 right-2 z-10 bg-black/50 rounded-full p-1">
        <PlatformIndicator platform={world.platform} />
      </div>
      {/* Position badges relative to the image rather than the card height. */}
      <div className="relative w-full min-h-0 flex-1">
        <img
          src={world.thumbnailUrl}
          alt={world.name}
          className="block w-full h-full object-cover rounded-t-lg"
          draggable="false"
          loading="lazy"
        />
        {imageOverlay}
      </div>

      {/* Reserve space for text and let the image fill the remaining height. */}

      {size === 'Compact' && (
        <div className="shrink-0 min-w-0 p-2">
          <h3 className="font-medium truncate">{world.name}</h3>
        </div>
      )}

      {size === 'Normal' && (
        <div className="shrink-0 min-w-0 p-2 space-y-1">
          <div className="flex items-center justify-between">
            <h3 className="font-medium truncate">{world.name}</h3>
          </div>
          <div className="flex items-center justify-between">
            <span
              className={`min-w-0 text-sm truncate ${isSupporter ? 'text-pink-500 dark:text-pink-400' : 'text-muted-foreground'}`}
            >
              {world.authorName}
            </span>
            <div className="flex shrink-0 items-center gap-1">
              <Heart className="w-3.5 h-3.5" />
              <span className="text-sm truncate">{world.favorites}</span>
            </div>
          </div>
        </div>
      )}

      {size === 'Expanded' && (
        <div className="shrink-0 min-w-0 p-2 space-y-1">
          <div className="flex items-center justify-between">
            <h3 className="font-medium truncate">{world.name}</h3>
          </div>
          <div className="flex items-center text-sm justify-between">
            <span
              className={`min-w-0 truncate ${isSupporter ? 'text-pink-500 dark:text-pink-400' : 'text-muted-foreground'}`}
            >
              {world.authorName}
            </span>
            <span className="truncate text-muted-foreground">
              {t('world-card:visits', world.visits)}
            </span>
          </div>
          <div className="flex justify-between whitespace-nowrap">
            <span className="text-sm text-muted-foreground truncate">
              {t('world-card:updated', world.lastUpdated)}
            </span>
            <div className="flex shrink-0 items-center gap-1">
              <Heart className="w-3.5 h-3.5" />
              <span className="text-sm truncate">{world.favorites}</span>
            </div>
          </div>
        </div>
      )}

      {size === 'Original' && (
        <div className="shrink-0 min-w-0 p-2">
          <h3 className="font-medium truncate">{world.name}</h3>
          <p
            className={`min-w-0 text-sm truncate ${isSupporter ? 'text-pink-500 dark:text-pink-400' : 'text-muted-foreground'}`}
          >
            {t('world-card:by-author', world.authorName)}
          </p>
        </div>
      )}
    </div>
  );
}
