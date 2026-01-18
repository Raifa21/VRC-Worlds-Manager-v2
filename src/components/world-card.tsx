import React from 'react';
import { Heart } from 'lucide-react';
import { CardSize, WorldDisplayData } from '@/lib/bindings';
import { useLocalization } from '@/hooks/use-localization';
import { usePatreonContext } from '@/contexts/patreon-context';
import { PlatformIndicator } from './platform-indicator';

interface WorldCardPreviewProps {
  size: CardSize;
  world: WorldDisplayData;
}

export function WorldCardPreview(props: WorldCardPreviewProps) {
  const { size, world } = props;
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
      className={`border rounded-lg shadow hover:shadow-md transition-all duration-300 ${sizeClasses[size]}`}
    >
      <div className="relative w-full">
        <div className="absolute top-2 right-2 z-1 bg-black/50 rounded-full p-1">
          <PlatformIndicator platform={world.platform} />
        </div>
      </div>
      <img
        src={world.thumbnailUrl}
        alt={world.name}
        className={`w-full h-2/3 object-cover rounded-t-lg`}
        draggable="false"
        loading="lazy"
      />

      {/* Various size renderings... */}

      {size === 'Compact' && (
        <div className="p-2">
          <h3 className="font-medium truncate">{world.name}</h3>
        </div>
      )}

      {size === 'Normal' && (
        <div className="p-2 space-y-1">
          <div className="flex items-center justify-between">
            <h3 className="font-medium truncate">{world.name}</h3>
          </div>
          <div className="flex items-center justify-between">
            <span
              className={`text-sm truncate ${isSupporter ? 'text-pink-500 dark:text-pink-400' : 'text-muted-foreground'}`}
            >
              {world.authorName}
            </span>
            <div className="flex items-center gap-1">
              <Heart className="w-3.5 h-3.5" />
              <span className="text-sm truncate">{world.favorites}</span>
            </div>
          </div>
        </div>
      )}

      {size === 'Expanded' && (
        <div className="p-2 space-y-1">
          <div className="flex items-center justify-between">
            <h3 className="font-medium truncate">{world.name}</h3>
          </div>
          <div className="flex items-center text-sm justify-between">
            <span
              className={`truncate ${isSupporter ? 'text-pink-500 dark:text-pink-400' : 'text-muted-foreground'}`}
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
            <div className="flex items-center gap-1">
              <Heart className="w-3.5 h-3.5" />
              <span className="text-sm truncate">{world.favorites}</span>
            </div>
          </div>
        </div>
      )}

      {size === 'Original' && (
        <div className="p-2">
          <h3 className="font-medium truncate">{world.name}</h3>
          <p
            className={`text-sm truncate ${isSupporter ? 'text-pink-500 dark:text-pink-400' : 'text-muted-foreground'}`}
          >
            {t('world-card:by-author', world.authorName)}
          </p>
        </div>
      )}
    </div>
  );
}
