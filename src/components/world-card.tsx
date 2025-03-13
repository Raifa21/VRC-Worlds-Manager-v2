import { CardSize } from '@/app/setup/page';
import { Heart } from 'lucide-react';

export enum Platform {
  PC = 'PC',
  Quest = 'Quest',
  CrossPlatform = 'Cross-Platform',
}

export interface WorldDisplayData {
  worldId: string;
  name: string;
  thumbnailUrl: string;
  authorName: string;
  favorites: number;
  lastUpdated: string;
  visits: number;
  dateAdded: string;
  platform: Platform;
}

interface WorldCardPreviewProps {
  size: CardSize;
  world: WorldDisplayData;
}

export function WorldCardPreview({ size, world }: WorldCardPreviewProps) {
  const sizeClasses: Record<CardSize, string> = {
    [CardSize.Compact]: 'w-48 h-32',
    [CardSize.Normal]: 'w-52 h-48',
    [CardSize.Expanded]: 'w-64 h-64',
    [CardSize.Original]: 'w-64 h-48',
  };

  return (
    <div
      className={`border rounded-lg shadow hover:shadow-md transition-all duration-300 ${sizeClasses[size]}`}
    >
      <img
        src={world.thumbnailUrl}
        alt={world.name}
        className="w-full h-2/3 object-cover rounded-t-lg"
      />

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
            <span className="text-sm text-muted-foreground">
              {world.authorName}
            </span>
            <div className="flex items-center gap-1">
              <Heart className="w-3.5 h-3.5" />
              <span className="text-sm">{world.favorites}</span>
            </div>
          </div>
        </div>
      )}

      {size === CardSize.Expanded && (
        <div className="p-2 space-y-1">
          <div className="flex items-center justify-between">
            <h3 className="font-medium truncate">{world.name}</h3>
            <div className="flex items-center gap-1">
              <Heart className="w-3.5 h-3.5" /> {/* Changed from w-4 h-4 */}
              <span className="text-sm">{world.favorites}</span>
            </div>
          </div>
          <span className="text-sm text-muted-foreground">
            {world.authorName}
          </span>
          <div className="flex justify-between text-sm text-muted-foreground whitespace-nowrap">
            <span>Updated: {world.lastUpdated}</span>
            <span>Visits: {world.visits}</span>
          </div>
        </div>
      )}

      {size === CardSize.Original && (
        <div className="p-2 text-white">
          <h3 className="font-medium truncate">{world.name}</h3>
          <p className="text-sm text-muted-foreground truncate">
            By {world.authorName}
          </p>
        </div>
      )}
    </div>
  );
}
