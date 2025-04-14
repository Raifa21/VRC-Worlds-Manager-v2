import { WorldCardPreview } from './world-card';
import { CardSize } from '@/types/preferences';
import { useState, useEffect, useRef, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { toRomaji } from 'wanakana';
import { SpecialFolders } from '@/types/folders';
import { Platform } from '@/types/worlds';
import { WorldDisplayData } from '@/types/worlds';
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
import { SortAsc, SortDesc, CheckSquare, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import * as Portal from '@radix-ui/react-portal';
import { createPortal } from 'react-dom';
import { AddToFolderDialog } from './add-to-folder-dialog';

interface WorldGridProps {
  size: CardSize;
  worlds: WorldDisplayData[];
  folderName: string | SpecialFolders;
  onWorldChange: () => Promise<void>;
  onRemoveFromFolder: (worldId: string[]) => void;
  onHideWorld: (worldId: string[], worldName: string[]) => void;
  onOpenWorldDetails: (worldId: string) => void;
  onAddToFolder?: (worldIds: string[], folderName: string) => void;
  onShowFolderDialog: (worlds: WorldDisplayData[]) => void;
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
  onAddToFolder,
  onShowFolderDialog,
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
  const containerRef = useRef<HTMLDivElement>(null);
  const [dialogConfig, setDialogConfig] = useState<{
    type: 'remove' | 'hide';
    worldId: string;
    worldName?: string;
    isOpen: boolean;
  } | null>(null);
  const [selectedWorlds, setSelectedWorlds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [contextMenuOpen, setContextMenuOpen] = useState(false);

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

  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (
        event.key === 'Escape' &&
        (isSelectionMode || selectedWorlds.size > 0)
      ) {
        clearSelection();
      }
    };

    window.addEventListener('keydown', handleEscKey);
    return () => window.removeEventListener('keydown', handleEscKey);
  }, [isSelectionMode, selectedWorlds]);

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

  // Check if current folder is a special folder
  const isSpecialFolder = useMemo(() => {
    return Object.values(SpecialFolders).includes(folderName as SpecialFolders);
  }, [folderName]);

  const handleDialogClose = () => {
    setDialogConfig((prev) => (prev ? { ...prev, isOpen: false } : null));
    // Allow animation to complete before clearing state
    setTimeout(() => setDialogConfig(null), 150);
  };

  const handleSelect = (worldId: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    setSelectedWorlds((prev) => {
      const newSelection = new Set(prev);
      if (event.shiftKey && prev.size > 0) {
        // Keep existing shift+click range selection
        const worldIds = sortedAndFilteredWorlds.map((w) => w.worldId);
        const lastSelected = Array.from(prev)[prev.size - 1];
        const lastIndex = worldIds.indexOf(lastSelected);
        const currentIndex = worldIds.indexOf(worldId);
        const [start, end] = [
          Math.min(lastIndex, currentIndex),
          Math.max(lastIndex, currentIndex),
        ];

        for (let i = start; i <= end; i++) {
          newSelection.add(worldIds[i]);
        }
      } else if (event.ctrlKey || event.metaKey) {
        // Keep existing ctrl/cmd+click toggle
        if (newSelection.has(worldId)) {
          newSelection.delete(worldId);
        } else {
          newSelection.add(worldId);
        }
      } else {
        // Modified single click behavior - toggle selection
        if (newSelection.has(worldId)) {
          newSelection.delete(worldId);
        } else {
          newSelection.add(worldId);
        }
      }
      return newSelection;
    });
  };

  const handleClick = (worldId: string, event: React.MouseEvent) => {
    if (isSelectionMode || event.ctrlKey || event.metaKey || event.shiftKey) {
      handleSelect(worldId, event);
    } else {
      onOpenWorldDetails(worldId);
    }
  };

  const clearSelection = () => {
    setSelectedWorlds(new Set());
  };

  const handleAddToFolder = (folder: string) => {
    onAddToFolder?.(Array.from(selectedWorlds), folder);
    clearSelection();
    setIsSelectionMode(false);
  };

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
              variant={isSelectionMode ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => {
                if (isSelectionMode) {
                  clearSelection();
                  setIsSelectionMode(false);
                } else {
                  setIsSelectionMode(true);
                }
              }}
              className="h-10 w-10"
            >
              {isSelectionMode ? (
                <CheckSquare className="h-4 w-4" />
              ) : (
                <Square className="h-4 w-4" />
              )}
            </Button>
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
              <ContextMenu
                key={world.worldId}
                onOpenChange={setContextMenuOpen}
              >
                <ContextMenuTrigger asChild>
                  <div
                    id={world.worldId}
                    className={`relative w-fit h-fit group rounded-lg ${
                      selectedWorlds.has(world.worldId)
                        ? 'ring-2 ring-primary'
                        : ''
                    }`}
                    onClick={(e) => handleClick(world.worldId, e)}
                  >
                    <WorldCardPreview size={size} world={world} />
                    {isSelectionMode && (
                      <div className="absolute top-2 left-2 z-10">
                        {selectedWorlds.has(world.worldId) ? (
                          <>
                            <Square className="w-5 h-5 text-primary" />
                            <div className="absolute inset-[4px] bg-primary rounded-sm" />
                          </>
                        ) : (
                          <Square className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                    )}
                  </div>
                </ContextMenuTrigger>
                <ContextMenuContent>
                  <ContextMenuItem
                    onSelect={(e) => {
                      const worldsToMove =
                        selectedWorlds.size > 0 &&
                        selectedWorlds.has(world.worldId)
                          ? Array.from(selectedWorlds).map(
                              (id) => worlds.find((w) => w.worldId === id)!,
                            )
                          : [world];
                      onShowFolderDialog(worldsToMove);
                    }}
                  >
                    Move{' '}
                    {selectedWorlds.size > 1 &&
                    selectedWorlds.has(world.worldId)
                      ? `${selectedWorlds.size} worlds`
                      : 'world'}{' '}
                    to folder
                  </ContextMenuItem>
                  {!isSpecialFolder && (
                    <ContextMenuItem
                      onSelect={(e) => {
                        const worldsToRemove =
                          selectedWorlds.size > 0 &&
                          selectedWorlds.has(world.worldId)
                            ? Array.from(selectedWorlds)
                            : [world.worldId];
                        onRemoveFromFolder(worldsToRemove);
                      }}
                      className="text-destructive"
                    >
                      Remove{' '}
                      {selectedWorlds.size > 1 &&
                      selectedWorlds.has(world.worldId)
                        ? `${selectedWorlds.size} worlds`
                        : 'world'}{' '}
                      from folder
                    </ContextMenuItem>
                  )}

                  <ContextMenuItem
                    onSelect={(e) => {
                      const worldsToHide =
                        selectedWorlds.size > 0 &&
                        selectedWorlds.has(world.worldId)
                          ? Array.from(selectedWorlds)
                          : [world.worldId];
                      const worldNames = worldsToHide
                        .map(
                          (id) =>
                            worlds.find((w) => w.worldId === id)?.name || '',
                        )
                        .filter(Boolean);
                      onHideWorld(worldsToHide, worldNames);
                    }}
                    className="text-destructive"
                  >
                    Hide{' '}
                    {selectedWorlds.size > 1 &&
                    selectedWorlds.has(world.worldId)
                      ? `${selectedWorlds.size} worlds`
                      : 'world'}
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            ))}
          </div>
        </div>
      </div>

      {/* Portaled AlertDialogs */}
      <Portal.Root>
        {dialogConfig && (
          <AlertDialog
            open={dialogConfig.isOpen}
            onOpenChange={(open) => {
              if (!open) handleDialogClose();
            }}
          >
            <AlertDialogContent onEscapeKeyDown={handleDialogClose}>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {dialogConfig.type === 'remove'
                    ? 'Remove from Folder'
                    : 'Hide World'}
                </AlertDialogTitle>
                <AlertDialogDescription className="space-y-2">
                  {dialogConfig.type === 'remove' ? (
                    <p>This will remove this world from the current folder.</p>
                  ) : (
                    <>
                      <p>This hides this world from all folders.</p>
                      <p className="text-muted-foreground">
                        You can find the world in the "Hidden Folder" in
                        settings to revert.
                      </p>
                    </>
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={handleDialogClose}>
                  Cancel
                </AlertDialogCancel>
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (dialogConfig.type === 'remove') {
                      onRemoveFromFolder([dialogConfig.worldId]);
                    } else if (dialogConfig.worldName) {
                      onHideWorld(
                        [dialogConfig.worldId],
                        [dialogConfig.worldName],
                      );
                    }
                    handleDialogClose();
                  }}
                >
                  {dialogConfig.type === 'remove' ? 'Remove' : 'Hide World'}
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </Portal.Root>
    </div>
  );
}
