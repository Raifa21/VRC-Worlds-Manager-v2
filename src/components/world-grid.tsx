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
import { SortAsc, SortDesc } from 'lucide-react';

interface WorldGridProps {
  size: CardSize;
  worlds: WorldDisplayData[];
  folderName?: string;
}

type SortOption =
  | 'name-asc'
  | 'name-desc'
  | 'authorName-asc'
  | 'authorName-desc'
  | 'favorites-asc'
  | 'favorites-desc'
  | 'dateAdded-asc'
  | 'dateAdded-desc'
  | 'lastUpdated-asc'
  | 'lastUpdated-desc';

export function WorldGrid({ size, worlds, folderName }: WorldGridProps) {
  const cardWidths = {
    [CardSize.Compact]: 192, // w-48 = 12rem = 192px
    [CardSize.Normal]: 208, // w-52 = 13rem = 208px
    [CardSize.Expanded]: 256, // w-64 = 16rem = 256px
    [CardSize.Original]: 256, // w-64 = 16rem = 256px
  };

  const [cols, setCols] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('name-asc');
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
    const [field, direction] = sortBy.split('-');
    const multiplier = direction === 'asc' ? 1 : -1;

    switch (field) {
      case 'name':
        return multiplier * a.name.localeCompare(b.name);
      case 'authorName':
        return multiplier * a.authorName.localeCompare(b.authorName);
      case 'favorites':
        return multiplier * (a.favorites - b.favorites);
      case 'dateAdded': {
        const getTimestamp = (dateStr: string | null) => {
          if (!dateStr) return 0;
          // Extract date and time parts
          const [datePart, timePart] = dateStr.split(' Dec:');
          if (!datePart) return 0;

          // Extract base date
          const dateMatch = datePart.match(/\d{4}-\d{2}-\d{2}/);
          if (!dateMatch) return 0;

          // Extract time number if it exists
          const timeNumber = timePart
            ? parseInt(timePart.replace(/\D/g, ''), 10)
            : 0;

          // Combine date and time offset
          const baseTime = Date.parse(dateMatch[0]);
          return baseTime + timeNumber;
        };

        const dateA = getTimestamp(a.dateAdded);
        const dateB = getTimestamp(b.dateAdded);

        console.log('Date comparison:', {
          rawA: a.dateAdded,
          rawB: b.dateAdded,
          timestampA: dateA,
          timestampB: dateB,
          result: multiplier * (dateA - dateB),
        });

        return multiplier * (dateA - dateB);
      }
      case 'lastUpdated': {
        // Parse dates and handle nulls
        const dateA = a.lastUpdated ? new Date(a.lastUpdated) : new Date(0);
        const dateB = b.lastUpdated ? new Date(b.lastUpdated) : new Date(0);
        return multiplier * (dateA.getTime() - dateB.getTime());
      }
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
            <SelectItem value="name-asc">Name (A-Z)</SelectItem>
            <SelectItem value="name-desc">Name (Z-A)</SelectItem>
            <SelectItem value="authorName-asc">Author (A-Z)</SelectItem>
            <SelectItem value="authorName-desc">Author (Z-A)</SelectItem>
            <SelectItem value="favorites-asc">Favorites (Low-High)</SelectItem>
            <SelectItem value="favorites-desc">Favorites (High-Low)</SelectItem>
            <SelectItem value="dateAdded-asc">Date Added (Oldest)</SelectItem>
            <SelectItem value="dateAdded-desc">Date Added (Newest)</SelectItem>
            <SelectItem value="lastUpdated-asc">
              Last Updated (Oldest)
            </SelectItem>
            <SelectItem value="lastUpdated-desc">
              Last Updated (Newest)
            </SelectItem>
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
