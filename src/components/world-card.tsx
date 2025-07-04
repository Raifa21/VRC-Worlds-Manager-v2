import React from 'react';
import { CardSize } from '@/types/preferences';
import { Check, Heart, Plus } from 'lucide-react';
import Image from 'next/image';
import QPc from '@/../public/icons/VennColorQPc.svg';
import QPcQ from '@/../public/icons/VennColorQPcQ.svg';
import QQ from '@/../public/icons/VennColorQQ.svg';
import { Platform } from '@/types/worlds';
import { WorldDisplayData } from '@/lib/bindings';
import { useLocalization } from '@/hooks/use-localization';

interface WorldCardPreviewProps {
  size: CardSize;
  world: WorldDisplayData;
}

export function WorldCardPreview(props: WorldCardPreviewProps) {
  const { size, world } = props;
  const { t } = useLocalization();
  const sizeClasses: Record<CardSize, string> = {
    [CardSize.Compact]: 'w-48 h-32',
    [CardSize.Normal]: 'w-52 h-48',
    [CardSize.Expanded]: 'w-64 h-64',
    [CardSize.Original]: 'w-64 h-44',
  };

  return (
    <div
      className={`border rounded-lg shadow hover:shadow-md transition-all duration-300 ${sizeClasses[size]}`}
    >
      <div className="relative w-full">
        <div className="absolute top-2 right-2 z-1 bg-black/50 rounded-full p-1">
          {world.platform == Platform.CrossPlatform ? (
            <Image
              src={QPcQ}
              alt={t('world-card:cross-platform')}
              width={24}
              height={24}
              loading="lazy"
            />
          ) : world.platform == Platform.PC ? (
            <Image
              src={QPc}
              alt={t('world-card:pc')}
              width={24}
              height={24}
              loading="lazy"
            />
          ) : (
            <Image
              src={QQ}
              alt={t('world-card:quest')}
              width={24}
              height={24}
              loading="lazy"
            />
          )}
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

      {size === CardSize.Compact && (
        <div className="p-2">
          <h3 className="font-medium truncate">{world.name}</h3>
        </div>
      )}

      {size === CardSize.Normal && (
        <div className="p-2 space-y-1">
          <div className="flex items-center justify-between">
            <h3 className="font-medium truncate">{world.name}</h3>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground truncate">
              {world.authorName}
            </span>
            <div className="flex items-center gap-1">
              <Heart className="w-3.5 h-3.5" />
              <span className="text-sm truncate">{world.favorites}</span>
            </div>
          </div>
        </div>
      )}

      {size === CardSize.Expanded && (
        <div className="p-2 space-y-1">
          <div className="flex items-center justify-between">
            <h3 className="font-medium truncate">{world.name}</h3>
          </div>
          <div className="flex items-center text-muted-foreground text-sm justify-between">
            <span className="truncate">{world.authorName}</span>
            <span className="truncate">
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

      {size === CardSize.Original && (
        <div className="p-2">
          <h3 className="font-medium truncate">{world.name}</h3>
          <p className="text-sm text-muted-foreground truncate">
            {t('world-card:by-author', world.authorName)}
          </p>
        </div>
      )}
    </div>
  );
}
