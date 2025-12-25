import { WorldCardPreview } from '@/components/world-card';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { FolderType, SpecialFolders } from '@/types/folders';
import { CardSize, WorldDisplayData } from '@/lib/bindings';
import { useLocalization } from '@/hooks/use-localization';
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

interface WorldGridProps {
  worlds: WorldDisplayData[];
  // Used for virtualized scrolling
  containerRef: React.RefObject<HTMLDivElement | null>;
  currentFolder: FolderType;
  // Optional interaction flags for special embeds (e.g., selection-only dialog)
  disableCardClick?: boolean;
  alwaysShowSelection?: boolean;
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
  const cardWidths: Record<CardSize, number> = {
    Compact: 192, // w-48 = 12rem = 192px
    Normal: 208, // w-52 = 13rem = 208px
    Expanded: 256, // w-64 = 16rem = 256px
    Original: 256, // w-64 = 16rem = 256px
  };
  const cardW = cardWidths[cardSize];

  // Use CSS Grid auto-fill for responsive layout - no manual calculation needed

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
      className="pt-2 flex-1 overflow-auto p-4"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fill, minmax(${cardW}px, 1fr))`,
        gap: `${gap}px`,
        justifyContent: 'center',
      }}
    >
      {worlds.map((world) => {
        const isSelected = selectedWorlds.includes(world.worldId);
        return (
          <ContextMenu key={world.worldId}>
            <ContextMenuTrigger asChild>
              <div
                id={world.worldId}
                onClick={() => {
                  if (disableCardClick) return;
                  if (isFindPage) {
                    // Only set dontSaveToLocal on worlds not already in collection
                    handleOpenWorldDetails(
                      world.worldId,
                      !existingWorldIds.has(world.worldId),
                    );
                  } else {
                    // null == !dontSaveToLocal
                    handleOpenWorldDetails(world.worldId);
                  }
                }}
                className="group relative w-fit h-fit rounded-lg overflow-hidden"
              >
                {isSelected && (
                  <div className="absolute inset-0 rounded-lg border-2 border-primary pointer-events-none z-10" />
                )}
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
                        .map(
                          (id) =>
                            worlds.find((w) => w.worldId === id)?.name || '',
                        )
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
      })}

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
                {t('world-grid:add-multiple', selectedWorlds.length)}
              </span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
