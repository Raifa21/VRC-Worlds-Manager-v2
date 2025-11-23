import { WorldCardPreview } from '@/components/world-card';
import { useState, useEffect, useMemo } from 'react';
import { FolderType } from '@/types/folders';
import { CardSize, WorldDisplayData } from '@/lib/bindings';
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
import { Badge } from '@/components/ui/badge';
import { useFolders } from '../../hook/use-folders';
import { useWorldGrid } from './hook';
import { useDraggable } from '@dnd-kit/core';

interface WorldGridProps {
  worlds: WorldDisplayData[];
  // Used for virtualized scrolling
  containerRef: React.RefObject<HTMLDivElement | null>;
  currentFolder: FolderType;
  // Optional interaction flags for special embeds (e.g., selection-only dialog)
  disableCardClick?: boolean;
  alwaysShowSelection?: boolean;
}

interface DraggableWorldCardProps {
  world: WorldDisplayData;
  isSelected: boolean;
  cardSize: CardSize;
  isFindPage: boolean;
  isHiddenFolder: boolean;
  isSpecialFolder: boolean;
  isSelectionMode: boolean;
  alwaysShowSelection: boolean;
  disableCardClick: boolean;
  existingWorldIds: Set<string>;
  selectedWorlds: string[];
  worlds: WorldDisplayData[];
  handleOpenFolderDialog: (worldId: string) => void;
  handleOpenWorldDetails: (worldId: string) => void;
  handleSelect: (worldId: string, event: React.MouseEvent) => void;
  handleRemoveFromCurrentFolder: (worldId: string) => void;
  removeWorldsFromFolder: (worldIds: string[]) => void;
  handleHideWorld: (worldIds: string[], worldNames: string[]) => void;
  handleRestoreWorld?: (worldIds: string[]) => void;
}

function DraggableWorldCard({
  world,
  isSelected,
  cardSize,
  isFindPage,
  isHiddenFolder,
  isSpecialFolder,
  isSelectionMode,
  alwaysShowSelection,
  disableCardClick,
  existingWorldIds,
  selectedWorlds,
  worlds,
  handleOpenFolderDialog,
  handleOpenWorldDetails,
  handleSelect,
  handleRemoveFromCurrentFolder,
  handleHideWorld,
  handleRestoreWorld,
}: DraggableWorldCardProps) {
  const { t } = useLocalization();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: world.worldId,
    data: {
      selectedWorlds: selectedWorlds,
      world: world,
    },
  });

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          ref={setNodeRef}
          id={world.worldId}
          onClick={() => {
            if (disableCardClick) return;
            if (isFindPage) {
              handleOpenFolderDialog(world.worldId);
            } else {
              handleOpenWorldDetails(world.worldId);
            }
          }}
          className="group relative w-fit h-fit rounded-lg overflow-hidden"
          style={{
            opacity: isDragging ? 0.5 : 1,
          }}
        >
          {isSelected && (
            <div className="absolute inset-0 rounded-lg border-2 border-primary pointer-events-none z-10" />
          )}
          {/* Drag Handle - positioned at top left */}
          <div
            {...listeners}
            {...attributes}
            className="absolute top-1 left-1 z-20 cursor-grab active:cursor-grabbing bg-background/80 hover:bg-background rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-muted-foreground"
            >
              <circle cx="9" cy="5" r="1" />
              <circle cx="9" cy="12" r="1" />
              <circle cx="9" cy="19" r="1" />
              <circle cx="15" cy="5" r="1" />
              <circle cx="15" cy="12" r="1" />
              <circle cx="15" cy="19" r="1" />
            </svg>
          </div>
          <WorldCardPreview size={cardSize} world={world} />
          <div className="absolute bottom-[70px] left-2 z-10">
            {isFindPage && existingWorldIds.has(world.worldId) && (
              <Badge className="bg-green-100 text-green-700 border-green-300 hover:bg-green-100 hover:border-green-300 cursor-default">
                {t('world-grid:exists-in-collection')}
              </Badge>
            )}
          </div>
          {(isSelectionMode || alwaysShowSelection) && (
            <div className="absolute top-2 left-2 z-10 flex items-center gap-2">
              {isSelected ? (
                <div
                  className="relative w-10 h-10 flex items-center justify-center cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelect(world.worldId, e);
                  }}
                >
                  <Square className="w-5 h-5 z-10 text-primary" />
                  <div className="absolute inset-[12px] bg-background rounded" />
                  <Check className="absolute inset-0 m-auto w-3 h-3 text-primary" />
                </div>
              ) : (
                <div
                  className="relative w-10 h-10 flex items-center justify-center cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelect(world.worldId, e);
                  }}
                >
                  <Square className="w-5 h-5 text-muted-foreground" />
                </div>
              )}
            </div>
          )}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        {isFindPage ? (
          <ContextMenuItem
            onSelect={(e) => {
              handleOpenFolderDialog(world.worldId);
            }}
          >
            {t('world-grid:add-title')}
          </ContextMenuItem>
        ) : !isHiddenFolder ? (
          <>
            <ContextMenuItem
              onSelect={(e) => {
                handleOpenFolderDialog(world.worldId);
              }}
            >
              {t('world-grid:move-title')}
            </ContextMenuItem>
            {!isSpecialFolder && (
              <ContextMenuItem
                onSelect={(e) => {
                  handleRemoveFromCurrentFolder(world.worldId);
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
                  .map((id) => worlds.find((w) => w.worldId === id)?.name || '')
                  .filter(Boolean);
                handleHideWorld(worldsToHide, worldNames);
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
              handleRestoreWorld?.(worldsToRestore);
            }}
          >
            {t('world-grid:restore-world')}
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}

export function WorldGrid({
  worlds,
  containerRef,
  currentFolder,
  disableCardClick = false,
  alwaysShowSelection = false,
}: WorldGridProps) {
  const { t } = useLocalization();

  const {
    cardSize,
    selectedWorlds,
    selectAllWorlds,
    toggleWorld,
    clearSelection,
    isSelectionMode,
    selectAllFindPage,
    handleOpenFolderDialog,
    handleOpenWorldDetails,
    handleDeleteWorld,
    handleRemoveFromCurrentFolder,
    removeWorldsFromFolder,
    handleHideWorld,
    handleRestoreWorld,
    isFindPage,
    isSpecialFolder,
    isHiddenFolder,
    existingWorldIds,
  } = useWorldGrid(currentFolder, worlds);

  const gap = 16;
  const cardHeights: Record<CardSize, number> = {
    Compact: 128, // h-32 = 8rem = 128px
    Normal: 192, // h-48 = 12rem = 192px
    Expanded: 256, // h-64 = 16rem = 256px
    Original: 176, // h-44 = 11rem = 176px
  };
  const cardWidths: Record<CardSize, number> = {
    Compact: 192, // w-48 = 12rem = 192px
    Normal: 208, // w-52 = 13rem = 208px
    Expanded: 256, // w-64 = 16rem = 256px
    Original: 256, // w-64 = 16rem = 256px
  };
  const cardH = cardHeights[cardSize];
  const cardW = cardWidths[cardSize];

  // 1) Keep a piece of state for the container’s width
  const [containerWidth, setContainerWidth] = useState<number>(() => {
    // don’t read window on the server
    if (typeof window === 'undefined') return 0;
    // if ref is ready use it, otherwise fallback to window.innerWidth minus sidebar width (250px)
    return containerRef.current?.clientWidth ?? window.innerWidth - 250;
  });

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
    // account for the same “-10px” you use in the container width
    const effectiveWidth = containerWidth - 10;
    return Math.max(1, Math.floor((effectiveWidth + gap) / (cardW + gap)));
  }, [cardSize, containerWidth]);

  // 4) chunk worlds into rows
  const rows = useMemo(() => {
    const out = [];
    for (let i = 0; i < worlds.length; i += cols) {
      out.push(worlds.slice(i, i + cols));
    }
    return out;
  }, [worlds, cols]);

  // 5) virtualize rows
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

  const handleDialogClose = () => {
    setDialogConfig((prev) => (prev ? { ...prev, isOpen: false } : null));
    setTimeout(() => setDialogConfig(null), 150);
  };

  const handleSelect = (worldId: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    toggleWorld(worldId);
  };

  return (
    <div
      ref={containerRef}
      className="pt-2 flex-1 overflow-auto relative"
      // ↑ debug: the scrollable full-width parent
    >
      <div
        className="mx-auto relative"
        // ↑ debug: this fixed-width grid container
        style={{
          width: `${containerWidth - 10}px`,
          height: `${totalHeight}px`,
        }}
      >
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
                height: cardH + gap,
              }}
            >
              <div
                className="justify-evenly"
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${cols}, ${cardW}px)`,
                  columnGap: `${gap}px`,
                }}
              >
                {row.map((world) => {
                  const isSelected = selectedWorlds.includes(world.worldId);
                  return (
                    <DraggableWorldCard
                      key={world.worldId}
                      world={world}
                      isSelected={isSelected}
                      cardSize={cardSize}
                      isFindPage={isFindPage}
                      isHiddenFolder={isHiddenFolder}
                      isSpecialFolder={isSpecialFolder}
                      isSelectionMode={isSelectionMode}
                      alwaysShowSelection={alwaysShowSelection}
                      disableCardClick={disableCardClick}
                      existingWorldIds={existingWorldIds}
                      selectedWorlds={selectedWorlds}
                      worlds={worlds}
                      handleOpenFolderDialog={handleOpenFolderDialog}
                      handleOpenWorldDetails={handleOpenWorldDetails}
                      handleSelect={handleSelect}
                      handleRemoveFromCurrentFolder={
                        handleRemoveFromCurrentFolder
                      }
                      removeWorldsFromFolder={removeWorldsFromFolder}
                      handleHideWorld={handleHideWorld}
                      handleRestoreWorld={handleRestoreWorld}
                    />
                  );
                })}
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
                      removeWorldsFromFolder([dialogConfig.worldId]);
                    } else if (dialogConfig.worldName) {
                      handleHideWorld?.(
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
          // add half-width of sidebar (250px) to center the button
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
              onClick={() => handleOpenFolderDialog(selectedWorlds[0])}
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
