import { CardSize, commands, WorldDisplayData } from '@/lib/bindings';
import { usePopupStore } from '../../hook/usePopups/store';
import { toast } from 'sonner';
import { useLocalization } from '@/hooks/use-localization';
import { use, useEffect, useState } from 'react';
import { error } from '@tauri-apps/plugin-log';
import { useSelectedWorldsStore } from '../../hook/use-selected-worlds';
import { useFolders } from '../../hook/use-folders';
import { useWorlds } from '../../hook/use-worlds';
import { usePathname } from 'next/navigation';
import path from 'path';
import { FolderType, isUserFolder, SpecialFolders } from '@/types/folders';

export function useWorldGrid(
  currentFolder: FolderType,
  worlds: WorldDisplayData[],
) {
  const { t } = useLocalization();
  const setPopup = usePopupStore((state) => state.setPopup);

  const {
    getSelectedWorlds,
    isSelectionMode,
    toggleSelectionMode,
    toggleWorldSelection,
    selectAllWorlds,
    clearFolderSelections,
  } = useSelectedWorldsStore();

  const { refresh } = useWorlds(currentFolder);

  const [cardSize, setCardSize] = useState<CardSize>('Normal');

  useEffect(() => {
    loadCardSize();
  }, []);

  const loadCardSize = async () => {
    try {
      const result = await commands.getCardSize();
      if (result.status === 'ok') {
        setCardSize(result.data);
      }
    } catch (e) {
      error(`Failed to load card size: ${e}`);
      toast(t('general:error-title'), {
        description: t('listview-page:error-load-card-size'),
      });
    }
  };

  const selectedWorlds = Array.from(getSelectedWorlds(currentFolder));

  const toggleWorld = (worldId: string) => {
    toggleWorldSelection(currentFolder, worldId);
  };

  const clearSelection = () => {
    clearFolderSelections(currentFolder);
  };

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
  });

  const isFindPage = currentFolder === SpecialFolders.Find;
  const isSpecialFolder = !isUserFolder(currentFolder);
  const isHiddenFolder = currentFolder === SpecialFolders.Hidden;

  // existing world set for "Added" badge in find page
  const [existingWorldIds, setExistingWorldIds] = useState<Set<string>>(
    () => new Set(),
  );
  // respond to membership changes triggered by dialogs
  const membershipVersion = usePopupStore((s) => s.membershipVersion);
  useEffect(() => {
    if (!isFindPage) return; // Only needed for find page

    const checkWorldsExistence = async () => {
      try {
        const worldIds = worlds.map((world) => world.worldId);

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
  }, [isFindPage, worlds, membershipVersion]);

  const selectAllFindPage = () => {
    const worldsToSelect = worlds
      .filter((world) => !existingWorldIds.has(world.worldId))
      .map((world) => world.worldId);
    selectAllWorlds(currentFolder, worldsToSelect);
  };

  const handleOpenWorldDetails = (worldId: string) => {
    setPopup('showWorldDetails', worldId);
  };

  const handleShareWorld = (worldId: string, worldName: string) => {
    setPopup('showShareWorld', { worldId, worldName });
  };

  // pass the worldId of the world that was selected. This only gets used if
  const handleOpenFolderDialog = (worldId: string) => {
    const idsToAdd =
      isSelectionMode && selectedWorlds.includes(worldId)
        ? Array.from(selectedWorlds)
        : [worldId];

    const worldsToAdd = worlds.filter((world) =>
      idsToAdd.includes(world.worldId),
    );
    setPopup('showAddToFolder', worldsToAdd);
  };

  const handleDeleteWorld = async (worldId: string) => {
    try {
      const result = await commands.deleteWorld(worldId);

      if (result.status === 'error') {
        toast(t('general:error-title'), {
          description: t('listview-page:error-delete-world'),
        });
        return;
      }

      await refresh();
      toast(t('general:success-title'), {
        description: t('listview-page:world-deleted-success'),
      });
    } catch (e) {
      error(`Failed to delete world: ${e}`);
      toast(t('general:error-title'), {
        description: t('listview-page:error-delete-world'),
      });
    }
  };

  const handleRemoveFromCurrentFolder = async (worldId: string) => {
    const worldsToRemove =
      isSelectionMode && selectedWorlds.includes(worldId)
        ? Array.from(selectedWorlds)
        : [worldId];

    removeWorldsFromFolder(worldsToRemove);
  };

  const removeWorldsFromFolder = async (worldIds: string[]) => {
    try {
      const removedWorlds = worldIds;

      // Remove all worlds from folder in parallel
      await Promise.all(
        worldIds.map((id) => commands.removeWorldFromFolder(currentFolder, id)),
      );

      toast(t('listview-page:worlds-removed-title'), {
        description: (
          <span>{t('listview-page:removed-from-folder', currentFolder)}</span>
        ),
        action: {
          label: t('listview-page:undo-button'),
          onClick: async () => {
            try {
              // Restore all worlds to folder in parallel
              await Promise.all(
                removedWorlds.map((id) =>
                  commands.addWorldToFolder(currentFolder, id),
                ),
              );

              await refresh();
              toast(t('listview-page:restored-title'), {
                description: t('listview-page:worlds-restored-to-folder'),
              });
            } catch (e) {
              error(`Failed to restore worlds: ${e}`);
              toast(t('general:error-title'), {
                description: t('listview-page:error-restore-worlds'),
              });
            }
          },
        },
      });

      await refresh();
    } catch (e) {
      error(`Failed to remove worlds from folder: ${e}`);
      toast(t('general:error-title'), {
        description: t('listview-page:error-remove-from-folder'),
      });
    }
  };

  const handleHideWorld = async (worldId: string[], worldName: string[]) => {
    try {
      // Store original folder information for each world before hiding
      const worldFoldersMap = new Map<string, string[]>();

      // Get folder information for each world
      for (const id of worldId) {
        const world = worlds.find((w) => w.worldId === id);
        if (world) {
          worldFoldersMap.set(id, [...world.folders]);
        }
      }

      // Hide worlds in parallel instead of one by one
      await Promise.all(worldId.map((id) => commands.hideWorld(id)));

      toast(t('listview-page:worlds-hidden-title'), {
        description:
          worldName.length > 1
            ? t(
                'listview-page:worlds-hidden-multiple',
                worldName[0],
                worldName.length - 1,
              )
            : t('listview-page:worlds-hidden-single', worldName[0]),
        action: {
          label: t('listview-page:undo-button'),
          onClick: async () => {
            try {
              // Parallel unhide and folder restoration
              await Promise.all(
                worldId.map(async (id) => {
                  await commands.unhideWorld(id);

                  // Restore folders for this world
                  const originalFolders = worldFoldersMap.get(id);
                  if (originalFolders?.length) {
                    await Promise.all(
                      originalFolders.map((folder) =>
                        commands.addWorldToFolder(folder, id),
                      ),
                    );
                  }
                }),
              );

              await refresh();
              toast(t('listview-page:restored-title'), {
                description: t('listview-page:worlds-restored'),
              });
            } catch (e) {
              error(`Failed to restore worlds: ${e}`);
              toast(t('general:error-title'), {
                description: t('listview-page:error-restore-worlds'),
              });
            }
          },
        },
      });

      await refresh();
    } catch (e) {
      error(`Failed to hide world: ${e}`);
      toast(t('general:error-title'), {
        description: t('listview-page:error-hide-world'),
      });
    }
  };

  const handleRestoreWorld = async (worldIds: string[]) => {
    try {
      const restoredWorlds = worldIds;

      // Unhide all worlds in parallel
      await Promise.all(worldIds.map((id) => commands.unhideWorld(id)));

      toast(t('listview-page:restored-title'), {
        description: t('listview-page:worlds-restored'),
        action: {
          label: t('listview-page:undo-button'),
          onClick: async () => {
            try {
              // Hide all worlds in parallel
              await Promise.all(
                restoredWorlds.map((id) => commands.hideWorld(id)),
              );

              await refresh();
              toast(t('listview-page:worlds-hidden-title'), {
                description: t('listview-page:worlds-hidden-again'),
              });
            } catch (e) {
              error(`Failed to restore worlds: ${e}`);
              toast(t('general:error-title'), {
                description: t('listview-page:error-hide-world'),
              });
            }
          },
        },
      });

      await refresh();
    } catch (e) {
      error(`Failed to restore worlds: ${e}`);
      toast(t('general:error-title'), {
        description: t('listview-page:error-restore-worlds'),
      });
    }
  };

  return {
    cardSize,
    selectedWorlds,
    selectAllWorlds,
    toggleWorld,
    clearSelection,
    isSelectionMode,
    selectAllFindPage,
    handleOpenFolderDialog,
    handleOpenWorldDetails,
    handleShareWorld,
    handleDeleteWorld,
    handleRemoveFromCurrentFolder,
    removeWorldsFromFolder,
    handleHideWorld,
    handleRestoreWorld,
    isFindPage,
    isSpecialFolder,
    isHiddenFolder,
    existingWorldIds,
  };
}
