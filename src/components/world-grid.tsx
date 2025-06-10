import { WorldCardPreview } from './world-card';
import { CardSize } from '@/types/preferences';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { toRomaji } from 'wanakana';
import { SpecialFolders } from '@/types/folders';
import { WorldDisplayData } from '@/lib/bindings';
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
import { SortAsc, SortDesc, CheckSquare, Square, Check } from 'lucide-react';
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
import { Badge } from './ui/badge';

interface WorldGridProps {
  size: CardSize;
  worlds: WorldDisplayData[];
  folderName: string | SpecialFolders;
  initialSelectedWorlds: string[];
  onRemoveFromFolder?: (worldId: string[]) => void;
  onHideWorld?: (worldId: string[], worldName: string[]) => void;
  onUnhideWorld?: (worldId: string[]) => void;
  onOpenWorldDetails: (worldId: string) => void;
  onShowFolderDialog?: (worlds: string[]) => void;
  onSelectedWorldsChange: (worldIds: string[]) => void;
  selectAll?: boolean;
  shouldClearSelection: boolean;
  onClearSelectionComplete?: () => void;
  worldsJustAdded?: string[];
  onWorldsJustAddedProcessed?: () => void;
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
  initialSelectedWorlds,
  onRemoveFromFolder,
  onHideWorld,
  onUnhideWorld,
  onOpenWorldDetails,
  onShowFolderDialog,
  onSelectedWorldsChange,
  selectAll,
  shouldClearSelection,
  onClearSelectionComplete,
  worldsJustAdded,
  onWorldsJustAddedProcessed,
}: WorldGridProps) {
  const { t } = useLocalization();
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
  const [dialogConfig, setDialogConfig] = useState<{
    type: 'remove' | 'hide';
    worldId: string;
    worldName?: string;
    isOpen: boolean;
  } | null>(null);
  const [selectedWorlds, setSelectedWorlds] = useState<string[]>(
    initialSelectedWorlds,
  );
  const [isSelectionMode, setIsSelectionMode] = useState(
    folderName === SpecialFolders.Find?.valueOf(),
  );
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

  // Wrap clearSelection in useCallback to prevent stale closures
  const clearSelection = useCallback(() => {
    setSelectedWorlds([]);
  }, []);

  useEffect(() => {
    if (shouldClearSelection) {
      clearSelection();
      info('Cleared selection');

      onClearSelectionComplete?.();
    }
  }, [shouldClearSelection, onClearSelectionComplete, clearSelection]);

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
        (isSelectionMode || selectedWorlds.length > 0)
      ) {
        clearSelection();
      }
    };

    window.addEventListener('keydown', handleEscKey);
    return () => window.removeEventListener('keydown', handleEscKey);
  }, [isSelectionMode, selectedWorlds, clearSelection]);

  useEffect(() => {
    // when folder changes, set selected worlds if selection mode is on
    if (isSelectionMode) {
      setSelectedWorlds(initialSelectedWorlds);
    } else {
      setSelectedWorlds([]);
    }
  }, [folderName]);

  useEffect(() => {
    onSelectedWorldsChange(selectedWorlds);
  }, [selectedWorlds]);

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
        const existingWorlds = existingWorldsResult.data;

        const hiddenWorldsResult = await commands.getHiddenWorlds();
        if (hiddenWorldsResult.status !== 'ok') {
          error(`Error fetching hidden worlds: ${hiddenWorldsResult.error}`);
          throw new Error(hiddenWorldsResult.error);
        }
        const hiddenWorlds = hiddenWorldsResult.data;

        //check if the worldId exists in the collection
        const existingIds = worldIds.filter(
          (id) =>
            existingWorlds.some((world) => world.worldId === id) ||
            hiddenWorlds.some((world) => world.worldId === id),
        );

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

  // Modify the handleClick function to check for existing worlds in isFindPage
  const handleClick = (worldId: string, event: React.MouseEvent) => {
    // Skip selection for existing worlds in Find page
    if (isFindPage && existingWorldIds.has(worldId)) {
      onOpenWorldDetails(worldId);
      return;
    }

    if (isSelectionMode || event.ctrlKey || event.metaKey || event.shiftKey) {
      handleSelect(worldId, event);
    } else {
      onOpenWorldDetails(worldId);
    }
  };

  // Also update handleSelect to ignore worlds that already exist in Find page
  const handleSelect = (worldId: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    // Don't allow selecting existing worlds in Find page
    if (isFindPage && existingWorldIds.has(worldId)) {
      return;
    }

    setSelectedWorlds((prev) => {
      const newSelection = new Set(prev);
      if (event.shiftKey && prev.length > 0) {
        // Keep existing shift+click range selection
        const worldIds = sortedAndFilteredWorlds.map((w) => w.worldId);
        const lastSelected = prev[prev.length - 1];
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
      return Array.from(newSelection);
    });
  };

  useEffect(() => {
    if (!selectAll) return;

    // Select all applicable worlds (filter out existing worlds in Find page)
    const worldsToSelect = sortedAndFilteredWorlds
      .filter((world) => !isFindPage || !existingWorldIds.has(world.worldId))
      .map((world) => world.worldId);

    setSelectedWorlds(worldsToSelect);

    onSelectedWorldsChange(worldsToSelect);
  }, [selectAll, sortedAndFilteredWorlds, isFindPage, existingWorldIds]);

  useEffect(() => {
    if (worldsJustAdded && worldsJustAdded.length > 0) {
      setExistingWorldIds((prev) => {
        const newWorldIds = new Set(prev);
        worldsJustAdded.forEach((id) => newWorldIds.add(id));
        return newWorldIds;
      });

      // Notify parent component that we've processed these
      onWorldsJustAddedProcessed?.();
    }
  }, [worldsJustAdded, onWorldsJustAddedProcessed]);

  return (
    <div ref={containerRef} className="h-full flex flex-col">
      <div className="sticky top-0 z-10 bg-background">
        {!isFindPage && (
          <div className="p-4 flex items-center gap-4">
            <Input
              type="search"
              placeholder={t('world-grid:search-placeholder')}
              className={isFindPage ? 'w-full' : 'w-[calc(80vw-340px)] z-1'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="flex">
              <Select
                value={sortField}
                onValueChange={(value) => handleSort(value as SortField)}
              >
                <SelectTrigger className="w-[180px] mt-0.5">
                  <SelectValue placeholder={t('world-grid:sort-placeholder')} />
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
                    {t('general:date-added')}
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
          </div>
        )}
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
                  <div
                    id={world.worldId}
                    className={`relative w-fit h-fit group rounded-lg ${
                      selectedWorlds.includes(world.worldId)
                        ? 'ring-2 ring-primary'
                        : ''
                    }`}
                    onClick={(e) => handleClick(world.worldId, e)}
                  >
                    <WorldCardPreview size={size} world={world} />
                    {isSelectionMode && (
                      <>
                        {!isFindPage ? (
                          <div className="absolute top-2 left-2 z-1">
                            {selectedWorlds.includes(world.worldId) ? (
                              <>
                                <Square className="w-5 h-5 text-primary" />
                                <div className="absolute inset-[3px] bg-background" />
                                <Check className="absolute inset-0 m-auto w-3 h-3 text-primary" />
                              </>
                            ) : (
                              <Square className="w-5 h-5 text-muted-foreground" />
                            )}
                          </div>
                        ) : (
                          <>
                            {!existingWorldIds.has(world.worldId) ? (
                              <div className="absolute top-2 left-2 z-1">
                                {selectedWorlds.includes(world.worldId) ? (
                                  <>
                                    <Square className="w-5 h-5 text-primary" />
                                    <div className="absolute inset-[3px] bg-background" />
                                    <Check className="absolute inset-0 m-auto w-3 h-3 text-primary" />
                                  </>
                                ) : (
                                  <Square className="w-5 h-5 text-muted-foreground" />
                                )}
                              </div>
                            ) : (
                              <div className="absolute top-2 left-2 z-1">
                                <Badge className="bg-green-100 text-green-700 border-green-300">
                                  {t('world-grid:exists-in-collection')}
                                </Badge>
                              </div>
                            )}
                          </>
                        )}
                      </>
                    )}
                  </div>
                </ContextMenuTrigger>
                {!isFindPage && (
                  <ContextMenuContent>
                    {!isHiddenFolder ? (
                      <>
                        {onShowFolderDialog && (
                          <ContextMenuItem
                            onSelect={(e) => {
                              const worldsToMove =
                                selectedWorlds.length > 0 &&
                                selectedWorlds.includes(world.worldId)
                                  ? Array.from(selectedWorlds).map(
                                      (id) =>
                                        worlds.find((w) => w.worldId === id)!,
                                    )
                                  : [world];
                              onShowFolderDialog(
                                worldsToMove.map((w) => w.worldId),
                              );
                            }}
                          >
                            {t('world-grid:move-title')}
                          </ContextMenuItem>
                        )}
                        {!isSpecialFolder && (
                          <ContextMenuItem
                            onSelect={(e) => {
                              const worldsToRemove =
                                selectedWorlds.length > 0 &&
                                selectedWorlds.includes(world.worldId)
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
                              selectedWorlds.length > 0 &&
                              selectedWorlds.includes(world.worldId)
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
                            selectedWorlds.length > 0 &&
                            selectedWorlds.includes(world.worldId)
                              ? Array.from(selectedWorlds)
                              : [world.worldId];
                          onUnhideWorld?.(worldsToRestore);
                        }}
                      >
                        {t('world-grid:restore-world')}
                      </ContextMenuItem>
                    )}
                  </ContextMenuContent>
                )}
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

      {isFindPage && selectedWorlds.length > 0 && (
        <Button
          className="absolute xl:fixed bottom-4 ml-4 z-50 bg-blue-100 text-blue-700 rounded-full shadow-xl w-36 h-12 flex items-center justify-center hover:bg-blue-200 hover:text-blue-900 transition"
          onClick={() => onShowFolderDialog?.(selectedWorlds)}
        >
          <span className="text-md font-semibold">
            {t('world-grid:add-title')}
          </span>
        </Button>
      )}
    </div>
  );
}
