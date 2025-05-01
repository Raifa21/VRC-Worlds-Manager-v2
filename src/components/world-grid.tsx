import { WorldCardPreview } from './world-card';
import { CardSize } from '@/types/preferences';
import { useState, useEffect, useRef, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { toRomaji } from 'wanakana';
import { SpecialFolders } from '@/types/folders';
import { WorldDisplayData } from '@/types/worlds';
import { useLocalization } from '@/hooks/use-localization';
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
import { info, error } from '@tauri-apps/plugin-log';
import { commands } from '@/lib/bindings';

interface WorldGridProps {
  size: CardSize;
  worlds: WorldDisplayData[];
  folderName: string | SpecialFolders;
  onRemoveFromFolder?: (worldId: string[]) => void;
  onHideWorld?: (worldId: string[], worldName: string[]) => void;
  onUnhideWorld?: (worldId: string[]) => void;
  onOpenWorldDetails: (worldId: string) => void;
  onShowFolderDialog?: (worlds: WorldDisplayData[]) => void;
  onWorldChange?: () => void;
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
  onRemoveFromFolder,
  onHideWorld,
  onUnhideWorld,
  onOpenWorldDetails,
  onShowFolderDialog,
  onWorldChange,
}: WorldGridProps) {
  const { t } = useLocalization();
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
  const [existingWorldIds, setExistingWorldIds] = useState<Set<string>>(
    new Set(),
  );

  const calculateCols = () => {
    const cardWidth = cardWidths[size];
    const gap = 16;
    const containerWidth =
      containerRef.current?.clientWidth ?? window.innerWidth - 250;
    const numCols = Math.max(1, Math.floor(containerWidth / (cardWidth + gap)));

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

  const isFindPage = useMemo(() => {
    return folderName === SpecialFolders.Find;
  }, [folderName]);

  useEffect(() => {
    if (!isFindPage) return; // Only needed for find page

    const checkWorldsExistence = async () => {
      try {
        // Get unique world IDs
        const worldIds = worlds.map((world) => world.worldId);

        // Check which worlds exist in the collection
        const existingWorldsResult = await commands.getAllWorlds();
        if (existingWorldsResult.status !== 'ok') {
          error(`Error fetching worlds: ${existingWorldsResult.error}`);
          throw new Error(existingWorldsResult.error);
        }
        const existingWorlds = existingWorldsResult.data as WorldDisplayData[];

        //check if the worldId exists in the collection
        const existingIds = worldIds.filter((id) =>
          existingWorlds.some((world) => world.worldId === id),
        );

        // Update state with set of existing world IDs
        setExistingWorldIds(new Set(existingIds));
      } catch (err) {
        error(`Error checking world existence: ${err}`);
      }
    };

    checkWorldsExistence();
  }, [worlds, isFindPage]);

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
        const dateA = a.dateAdded || '';
        const dateB = b.dateAdded || '';

        return multiplier * dateA.localeCompare(dateB);
      }
      case 'lastUpdated': {
        const getTimestamp = (dateStr: string | null) => {
          if (!dateStr) return 0;

          try {
            const date = new Date(dateStr);
            return date.getTime();
          } catch (e) {
            error(`Error parsing date: ${dateStr}, ${e}`);
            return 0;
          }
        };
        const dateA = getTimestamp(a.lastUpdated);
        const dateB = getTimestamp(b.lastUpdated);

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

  // Check if current folder is Hidden folder
  const isHiddenFolder = useMemo(() => {
    return folderName === SpecialFolders.Hidden;
  }, [folderName]);

  const handleDialogClose = () => {
    setDialogConfig((prev) => (prev ? { ...prev, isOpen: false } : null));
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

  return (
    <div ref={containerRef} className="h-full flex flex-col">
      <div className="sticky top-0 z-10 bg-background">
        <div className="p-4 flex items-center gap-4">
          <Input
            type="search"
            placeholder={t('world-grid:search-placeholder')}
            className={isFindPage? "w-[calc(80vw)]" :"w-[calc(80vw-340px)]"}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="flex items-center gap-2">
            {!isFindPage && (
              <div className="flex">
                <Select
                  value={sortField}
                  onValueChange={(value) => handleSort(value as SortField)}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue
                      placeholder={t('world-grid:sort-placeholder')}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">
                      {t('world-grid:sort-name')}
                    </SelectItem>
                    <SelectItem value="authorName">
                      {t('general:sort-author')}
                    </SelectItem>
                    <SelectItem value="favorites">
                      {t('world-grid:sort-favorites')}
                    </SelectItem>
                    <SelectItem value="dateAdded">
                      {t('world-grid:sort-date-added')}
                    </SelectItem>
                    <SelectItem value="lastUpdated">
                      {t('world-grid:sort-last-updated')}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    setSortDirection((prev) =>
                      prev === 'asc' ? 'desc' : 'asc',
                    )
                  }
                  className="h-10 w-10"
                >
                  {sortDirection === 'asc' ? (
                    <SortAsc className="h-4 w-4" />
                  ) : (
                    <SortDesc className="h-4 w-4" />
                  )}
                </Button>
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
              </div>
            )}
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
                    {isFindPage ? (
                      <WorldCardPreview
                        size={size}
                        world={world}
                        findPage={true}
                        onAddWorld={(world) => {
                          onShowFolderDialog?.(world);
                        }}
                        worldExists={existingWorldIds.has(world.worldId)}
                      />
                    ) : (
                      <WorldCardPreview size={size} world={world} />
                    )}
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
                  {!isHiddenFolder ? (
                    <>
                      {onShowFolderDialog && (
                        <ContextMenuItem
                          onSelect={(e) => {
                            const worldsToMove =
                              selectedWorlds.size > 0 &&
                              selectedWorlds.has(world.worldId)
                                ? Array.from(selectedWorlds).map(
                                    (id) =>
                                      worlds.find((w) => w.worldId === id)!,
                                  )
                                : [world];
                            onShowFolderDialog(worldsToMove);
                          }}
                        >
                          {t('world-grid:move-title')}
                        </ContextMenuItem>
                      )}
                      {!isSpecialFolder && (
                        <ContextMenuItem
                          onSelect={(e) => {
                            const worldsToRemove =
                              selectedWorlds.size > 0 &&
                              selectedWorlds.has(world.worldId)
                                ? Array.from(selectedWorlds)
                                : [world.worldId];
                            onRemoveFromFolder?.(worldsToRemove);
                          }}
                          className="text-destructive"
                        >
                          {t('world-grid:remove-title')}
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
                                worlds.find((w) => w.worldId === id)?.name ||
                                '',
                            )
                            .filter(Boolean);
                          onHideWorld?.(worldsToHide, worldNames);
                        }}
                        className="text-destructive"
                      >
                        {t('general:hide-title')}
                      </ContextMenuItem>
                    </>
                  ) : (
                    <ContextMenuItem
                      onSelect={(e) => {
                        const worldsToRestore =
                          selectedWorlds.size > 0 &&
                          selectedWorlds.has(world.worldId)
                            ? Array.from(selectedWorlds)
                            : [world.worldId];
                        onUnhideWorld?.(worldsToRestore);
                      }}
                    >
                      {t('world-grid:restore-world')}
                    </ContextMenuItem>
                  )}
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
                    ? t('world-grid:remove-title')
                    : t('general:hide-title')}
                </AlertDialogTitle>
                <AlertDialogDescription className="space-y-2">
                  {dialogConfig.type === 'remove' ? (
                    <p>{t('world-grid:remove-description')}</p>
                  ) : (
                    <>
                      <p>{t('world-grid:hide-description')}</p>
                      <p className="text-muted-foreground">
                        {t('world-grid:hide-note')}
                      </p>
                    </>
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={handleDialogClose}>
                  {t('general:cancel')}
                </AlertDialogCancel>
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (dialogConfig.type === 'remove') {
                      onRemoveFromFolder?.([dialogConfig.worldId]);
                    } else if (dialogConfig.worldName) {
                      onHideWorld?.(
                        [dialogConfig.worldId],
                        [dialogConfig.worldName],
                      );
                    }
                    handleDialogClose();
                  }}
                >
                  {dialogConfig.type === 'remove'
                    ? t('world-grid:remove-button')
                    : t('general:hide-title')}
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </Portal.Root>
    </div>
  );
}
