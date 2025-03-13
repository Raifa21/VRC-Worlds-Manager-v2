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
import { Button } from '@/components/ui/button';

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

type SortField =
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
  const [sortField, setSortField] = useState<SortField>('dateAdded');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
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

  const getDefaultDirection = (field: SortField): 'asc' | 'desc' => {
    switch (field) {
      case 'favorites':
      case 'dateAdded':
      case 'lastUpdated':
        return 'desc';
      default:
        return 'asc';
    }
  };

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(getDefaultDirection(field));
    }
  };

  const sortedAndFilteredWorlds = filteredWorlds.sort((a, b) => {
    const multiplier = sortDirection === 'asc' ? 1 : -1;

    switch (sortField) {
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
        <div className="flex items-center gap-2">
          <Select
            value={sortField}
            onValueChange={(value) => handleSort(value as SortField)}
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
          <Button
            variant="ghost"
            size="icon"
            onClick={() =>
              setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
            }
            className="h-10 w-10"
          >
            {sortDirection === 'asc' ? (
              <SortAsc className="h-4 w-4" />
            ) : (
              <SortDesc className="h-4 w-4" />
            )}
          </Button>
        </div>
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
