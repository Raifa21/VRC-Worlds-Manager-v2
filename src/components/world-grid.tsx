import { WorldCardPreview, WorldDisplayData, Platform } from './world-card';
import { CardSize } from '@/app/setup/page';
import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { toRomaji } from 'wanakana';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface WorldGridProps {
  size: CardSize;
  worlds: WorldDisplayData[];
  folderName?: string;
}

type SortOption =
  | 'name'
  | 'authorName'
  | 'favorites'
  | 'dateAdded'
  | 'lastUpdated';

export function WorldGrid({ size, worlds, folderName }: WorldGridProps) {
  const cardWidths = {
    [CardSize.Compact]: 192, // w-48 = 12rem = 192px
    [CardSize.Normal]: 208, // w-52 = 13rem = 208px
    [CardSize.Expanded]: 256, // w-64 = 16rem = 256px
    [CardSize.Original]: 256, // w-64 = 16rem = 256px
  };

  const [cols, setCols] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const containerRef = useRef<HTMLDivElement>(null);

  const calculateCols = () => {
    const cardWidth = cardWidths[size];
    const gap = 16;
    const containerWidth =
      containerRef.current?.clientWidth ?? window.innerWidth - 250;
    const numCols = Math.max(1, Math.floor(containerWidth / (cardWidth + gap)));

    console.log({
      cardWidth,
      containerWidth,
      numCols,
      size,
    });

    return numCols;
  };

  useEffect(() => {
    const handleResize = () => {
      requestAnimationFrame(() => {
        setCols(calculateCols());
      });
    };

    handleResize(); // Initial calculation
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [size]);

  const filteredWorlds = worlds.filter(
    (world) =>
      world.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      world.authorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      toRomaji(world.name).toLowerCase().includes(searchQuery.toLowerCase()) ||
      toRomaji(world.authorName)
        .toLowerCase()
        .includes(searchQuery.toLowerCase()),
  );

  const sortedAndFilteredWorlds = filteredWorlds.sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'authorName':
        return a.authorName.localeCompare(b.authorName);
      case 'favorites':
        return b.favorites - a.favorites;
      case 'dateAdded':
        return (
          new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime()
        );
      case 'lastUpdated':
        return (
          new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
        );
      default:
        return 0;
    }
  });

  return (
    <div ref={containerRef} className="space-y-4 p-4">
      {folderName && <h1 className="text-2xl font-semibold">{folderName}</h1>}
      <div className="flex items-center gap-4">
        <Input
          type="search"
          placeholder="Search worlds..."
          className="max-w-sm"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <Select
          value={sortBy}
          onValueChange={(value) => setSortBy(value as SortOption)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sort by..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="authorName">Author</SelectItem>
            <SelectItem value="favorites">Favorites</SelectItem>
            <SelectItem value="dateAdded">Date Added</SelectItem>
            <SelectItem value="lastUpdated">Last Updated</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div
        className="grid gap-4"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        }}
      >
        {sortedAndFilteredWorlds.map((world) => (
          <WorldCardPreview key={world.worldId} size={size} world={world} />
        ))}
      </div>
    </div>
  );
}
