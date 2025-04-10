import { WorldCardPreview, WorldDisplayData, Platform } from './world-card';
import { CardSize } from '@/app/setup/page';
import { useState, useEffect, useRef, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { toRomaji } from 'wanakana';
import { SpecialFolders } from '@/app/listview/page';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SortAsc, SortDesc, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import * as Portal from '@radix-ui/react-portal';

interface WorldGridProps {
  size: CardSize;
  worlds: WorldDisplayData[];
  folderName: string | SpecialFolders;
  onWorldChange: () => Promise<void>;
  onRemoveFromFolder: (worldId: string[]) => void;
  onHideWorld: (worldId: string[], worldName: string[]) => void;
  onOpenWorldDetails: (worldId: string) => void;
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

export function WorldGrid({
  size,
  worlds,
  folderName,
  onWorldChange,
  onRemoveFromFolder,
  onHideWorld,
  onOpenWorldDetails,
}: WorldGridProps) {
  const cardWidths = {
    [CardSize.Compact]: 192, // w-48 = 12rem = 192px
    [CardSize.Normal]: 208, // w-52 = 13rem = 208px
    [CardSize.Expanded]: 256, // w-64 = 16rem = 256px
    [CardSize.Original]: 256, // w-64 = 16rem = 256px
  };

  const [cols, setCols] = useState(1);
  const [showWorld, setShowWorld] = useState(false);
  const [worldId, setWorldId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('dateAdded');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const [selectedWorld, setSelectedWorld] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [showHideDialog, setShowHideDialog] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dialogAction, setDialogAction] = useState<{
    type: 'remove' | 'hide';
    worldId: string;
    worldName?: string;
  } | null>(null);

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

          try {
            const date = new Date(dateStr);
            return date.getTime();
          } catch (error) {
            console.error('Error parsing date:', dateStr, error);
            return 0;
          }
        };

        const dateA = getTimestamp(a.dateAdded);
        const dateB = getTimestamp(b.dateAdded);

        return multiplier * (dateA - dateB);
      }
      case 'lastUpdated': {
        const getTimestamp = (dateStr: string | null) => {
          if (!dateStr) return 0;

          try {
            const date = new Date(dateStr);
            return date.getTime();
          } catch (error) {
            console.error('Error parsing date:', dateStr, error);
            return 0;
          }
        };
        const dateA = getTimestamp(a.lastUpdated);
        const dateB = getTimestamp(b.lastUpdated);
        console.log('Date A:', a.lastUpdated, 'Date B:', b.lastUpdated);
        console.log('Date A:', dateA, 'Date B:', dateB);

        return multiplier * (dateA - dateB);
      }
      default:
        return 0;
    }
  });

  const openDetailedView = (id: string) => {
    setWorldId(id);
    setShowWorld(true);
  };

  // Check if current folder is a special folder
  const isSpecialFolder = useMemo(() => {
    return Object.values(SpecialFolders).includes(folderName as SpecialFolders);
  }, [folderName]);

  return (
    <div ref={containerRef} className="h-full flex flex-col">
      <div className="sticky top-0 z-10 bg-background">
        <div className="p-4 flex items-center gap-4">
          <Input
            type="search"
            placeholder="Search worlds..."
            className="w-[calc(80vw-380px)]"
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
      </div>

      <div className="flex-1 overflow-auto">
        <div className="p-4">
          <div
            className="grid gap-4 justify-items-center"
            style={{
              gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            }}
          >
            {sortedAndFilteredWorlds.map((world) => (
              <ContextMenu key={world.worldId}>
                <ContextMenuTrigger asChild>
                  <div className="w-fit h-fit">
                    <div
                      className="cursor-pointer"
                      onClick={() => onOpenWorldDetails(world.worldId)}
                    >
                      <WorldCardPreview size={size} world={world} />
                    </div>
                  </div>
                </ContextMenuTrigger>
                <ContextMenuContent>
                  {!isSpecialFolder && (
                    <ContextMenuItem
                      onSelect={(e) => {
                        e.preventDefault();
                        setDialogAction({
                          type: 'remove',
                          worldId: world.worldId,
                        });
                      }}
                      className="text-destructive"
                    >
                      Remove from Folder
                    </ContextMenuItem>
                  )}

                  <ContextMenuItem
                    onSelect={(e) => {
                      e.preventDefault();
                      setDialogAction({
                        type: 'hide',
                        worldId: world.worldId,
                        worldName: world.name,
                      });
                    }}
                    className="text-destructive"
                  >
                    <EyeOff className="mr-2 h-4 w-4" />
                    Hide World
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            ))}
          </div>
        </div>
      </div>

      {/* Portaled AlertDialogs */}
      <Portal.Root>
        <AlertDialog
          open={dialogAction?.type === 'remove'}
          onOpenChange={(open) => !open && setDialogAction(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove from Folder</AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <p>This will remove this world from the current folder.</p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setDialogAction(null)}>
                Cancel
              </AlertDialogCancel>
              <Button
                variant="destructive"
                onClick={() => {
                  if (dialogAction?.worldId) {
                    onRemoveFromFolder([dialogAction.worldId]);
                  }
                  setDialogAction(null);
                }}
              >
                Remove
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog
          open={dialogAction?.type === 'hide'}
          onOpenChange={(open) => !open && setDialogAction(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Hide World</AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <p>This hides this world from all folders.</p>
                <p className="text-muted-foreground">
                  You can find the world in the "Hidden Folder" in settings to
                  revert.
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setDialogAction(null)}>
                Cancel
              </AlertDialogCancel>
              <Button
                variant="destructive"
                onClick={() => {
                  if (dialogAction?.worldId && dialogAction?.worldName) {
                    onHideWorld(
                      [dialogAction.worldId],
                      [dialogAction.worldName],
                    );
                  }
                  setDialogAction(null);
                }}
              >
                Hide World
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Portal.Root>
    </div>
  );
}
