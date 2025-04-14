import { CardSize } from './preferences';
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
  folders: string[];
}

export interface WorldCardPreviewProps {
  size: CardSize;
  world: WorldDisplayData;
}
