import { WorldCardPreview } from './world-card';
import { CardSize } from '@/types/preferences';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { SpecialFolders } from '@/types/folders';
import { WorldDisplayData } from '@/lib/bindings';
import { useLocalization } from '@/hooks/use-localization';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Square, Check, Plus } from 'lucide-react';
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
  isSelectionMode: boolean;
  selectAll?: boolean;
  shouldClearSelection: boolean;
  onClearSelectionComplete?: () => void;
  worldsJustAdded?: string[];
  onWorldsJustAddedProcessed?: () => void;
  // Used for virtualized scrolling
  containerRef?: React.RefObject<HTMLDivElement | null>;
}

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
  isSelectionMode,
  shouldClearSelection,
  onClearSelectionComplete,
  worldsJustAdded,
  onWorldsJustAddedProcessed,
  containerRef,
}: WorldGridProps) {
  const { t } = useLocalization();
  const gap = 16;
  const cardHeights = {
    [CardSize.Compact]: 128, // h-32 = 8rem = 128px
    [CardSize.Normal]: 192, // h-48 = 12rem = 192px
    [CardSize.Expanded]: 256, // h-64 = 16rem = 256px
    [CardSize.Original]: 176, // h-44 = 11rem = 176px
  };
  const cardWidths = {
    [CardSize.Compact]: 192, // w-48 = 12rem = 192px
    [CardSize.Normal]: 208, // w-52 = 13rem = 208px
    [CardSize.Expanded]: 256, // w-64 = 16rem = 256px
    [CardSize.Original]: 256, // w-64 = 16rem = 256px
  };
  const cardH = cardHeights[size];
  const cardW = cardWidths[size];

  // 1) Keep a piece of state for the container’s width
  const [containerWidth, setContainerWidth] = useState<number>(
    () => containerRef?.current?.clientWidth ?? window.innerWidth - 250,
  );

  // 2) Observe that div and update width on resize
  useEffect(() => {
    const el = containerRef?.current;
    if (!el) return;
    // set initial
    setContainerWidth(el.clientWidth);
    const ro = new ResizeObserver(([entry]) => {
      setContainerWidth(entry.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [containerRef]);

  // 3) Recompute cols whenever size or containerWidth changes
  const cols = useMemo(() => {
    return Math.max(1, Math.floor((containerWidth + gap) / (cardW + gap)));
  }, [size, containerWidth]);

  // 2) chunk worlds into rows
  const rows = useMemo(() => {
    const out = [];
    for (let i = 0; i < worlds.length; i += cols) {
      out.push(worlds.slice(i, i + cols));
    }
    return out;
  }, [worlds, cols]);

  // 3) virtualize rows
  const rowHeight = cardH + gap;
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => containerRef?.current ?? null,
    estimateSize: () => rowHeight,
    overscan: 5,
  });

  const totalHeight = rowVirtualizer.getTotalSize();
  const virtualRows = rowVirtualizer.getVirtualItems();

  const [dialogConfig, setDialogConfig] = useState<{
    type: 'remove' | 'hide';
    worldId: string;
    worldName?: string;
    isOpen: boolean;
  } | null>(null);
  const [selectedWorlds, setSelectedWorlds] = useState<string[]>(
    initialSelectedWorlds,
  );
  const [existingWorldIds, setExistingWorldIds] = useState<Set<string>>(
    new Set(),
  );

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

  const handleDialogClose = () => {
    setDialogConfig((prev) => (prev ? { ...prev, isOpen: false } : null));
    setTimeout(() => setDialogConfig(null), 150);
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
        const worldIds = worlds.map((w) => w.worldId);
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
    const worldsToSelect = worlds
      .filter((world) => !isFindPage || !existingWorldIds.has(world.worldId))
      .map((world) => world.worldId);

    setSelectedWorlds(worldsToSelect);

    onSelectedWorldsChange(worldsToSelect);
  }, [selectAll, worlds, isFindPage, existingWorldIds]);

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

  // Check if current folder is a special folder
  const isSpecialFolder = useMemo(() => {
    return Object.values(SpecialFolders).includes(folderName as SpecialFolders);
  }, [folderName]);

  // Check if current folder is Hidden folder
  const isHiddenFolder = useMemo(() => {
    return folderName === SpecialFolders.Hidden;
  }, [folderName]);

  return (
    <div ref={containerRef} className="flex-1 overflow-auto relative">
      <div style={{ height: totalHeight, position: 'relative' }}>
        {virtualRows.map((vr) => {
          const row = rows[vr.index];
          return (
            <div
              key={vr.index}
              style={{
                position: 'absolute',
                top: vr.start,
                left: 0,
                width: '100%',
                height: cardH,
              }}
            >
              <div className="flex justify-center" style={{ gap: `${gap}px` }}>
                {row.map((world) => (
                  <ContextMenu key={world.worldId}>
                    <ContextMenuTrigger asChild>
                      <div
                        id={world.worldId}
                        className={`relative w-fit h-fit group rounded-lg ${
                          selectedWorlds.includes(world.worldId)
                            ? 'ring-2 ring-primary'
                            : ''
                        }`}
                        onClick={() => onOpenWorldDetails(world.worldId)}
                      >
                        <WorldCardPreview size={size} world={world} />
                        {isSelectionMode && (
                          <>
                            {!isFindPage ? (
                              <div className="absolute top-2 left-2 z-1">
                                {selectedWorlds.includes(world.worldId) ? (
                                  <div
                                    className="absolute top-0 left-0 z-10 w-8 h-8 flex items-center justify-center cursor-pointer"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSelect(world.worldId, e);
                                    }}
                                  >
                                    <Square className="w-5 h-5 z-10 text-primary" />
                                    <div className="absolute inset-[8px] bg-background rounded" />
                                    <Check className="absolute inset-0 m-auto w-3 h-3 text-primary" />
                                  </div>
                                ) : (
                                  <div
                                    className="absolute top-0 left-0 z-10 w-8 h-8 flex items-center justify-center cursor-pointer"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSelect(world.worldId, e);
                                    }}
                                  >
                                    <Square className="w-5 h-5 text-muted-foreground" />
                                  </div>
                                )}
                              </div>
                            ) : (
                              <>
                                {!existingWorldIds.has(world.worldId) ? (
                                  <div className="absolute top-2 left-2 z-1">
                                    {selectedWorlds.includes(world.worldId) ? (
                                      <div
                                        className="absolute top-0 left-0 z-10 w-8 h-8 flex items-center justify-center cursor-pointer"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleSelect(world.worldId, e);
                                        }}
                                      >
                                        <Square className="w-5 h-5 z-10 text-primary" />
                                        <div className="absolute inset-[8px] bg-background rounded" />
                                        <Check className="absolute inset-0 m-auto w-3 h-3 text-primary" />
                                      </div>
                                    ) : (
                                      <div
                                        className="absolute top-0 left-0 z-10 w-8 h-8 flex items-center justify-center cursor-pointer"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleSelect(world.worldId, e);
                                        }}
                                      >
                                        <Square className="w-5 h-5 text-muted-foreground" />
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="absolute top-2 left-2 z-1">
                                    <Badge className="bg-green-100 text-green-700 border-green-300 hover:bg-green-100 hover:border-green-300 cursor-default">
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
                                            worlds.find(
                                              (w) => w.worldId === id,
                                            )!,
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
                                      worlds.find((w) => w.worldId === id)
                                        ?.name || '',
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
          );
        })}
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
        <div
          className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 flex justify-center pointer-events-none w-full"
          style={{ left: 'calc(50% + 125px)' }}
        >
          <div className="pointer-events-auto relative inline-block">
            <div
              className="absolute inset-0 rounded-lg bg-background"
              style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
              aria-hidden="true"
            />
            <Button
              variant="default"
              size="lg"
              className="rounded-lg flex items-center gap-2 px-4 py-3 relative"
              onClick={() => onShowFolderDialog?.(selectedWorlds)}
            >
              <Plus className="w-5 h-5" />
              <span className="text-md font-semibold">
                {t('world-grid:add-title')}
              </span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
