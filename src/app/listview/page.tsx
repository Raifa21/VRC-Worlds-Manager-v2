'use client';

import { useEffect, useState } from 'react';
import { useLocalization } from '@/hooks/use-localization';
import { invoke } from '@tauri-apps/api/core';
import { useToast } from '@/hooks/use-toast';
import { CreateFolderDialog } from '@/components/create-folder-dialog';
import { useFolders } from '../listview/hook';
import { AppSidebar } from '@/components/app-sidebar';
import { Platform } from '@/types/worlds';
import { WorldGrid } from '@/components/world-grid';
import { CardSize } from '@/types/preferences';
import { Button } from '@/components/ui/button';
import { Plus, RefreshCw } from 'lucide-react'; // For the reload icon
import { commands, WorldDisplayData } from '@/lib/bindings';
import { AboutSection } from '@/components/about-section';
import { SettingsPage } from '@/components/settings-page';
import { WorldDetailPopup } from '@/components/world-detail-popup';
import { AddToFolderDialog } from '@/components/add-to-folder-dialog';
import { DeleteFolderDialog } from '@/components/delete-folder-dialog';
import { AddWorldPopup } from '@/components/add-world-popup';
import { GroupInstanceType, InstanceType, Region } from '@/types/instances';
import { useMemo } from 'react';
import {
  GroupInstanceCreatePermission,
  UserGroup,
  GroupInstanceCreateAllowedType,
  GroupInstancePermissionInfo,
} from '@/lib/bindings';
import { SpecialFolders } from '@/types/folders';
import { FindPage } from '@/components/find-page';
import { warn, debug, trace, info, error } from '@tauri-apps/plugin-log';
import { save } from '@tauri-apps/plugin-dialog';

export default function ListView() {
  const { folders, loadFolders } = useFolders();
  const { toast } = useToast();
  const { t } = useLocalization();
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [showDeleteFolder, setShowDeleteFolder] = useState<string | null>(null);
  const [isAddWorldOpen, setIsAddWorldOpen] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showFind, setShowFind] = useState(false);
  const [worlds, setWorlds] = useState<WorldDisplayData[]>([]);
  const [cardSize, setCardSize] = useState<CardSize>(CardSize.Normal);
  const [currentFolder, setCurrentFolder] = useState<string | SpecialFolders>(
    SpecialFolders.All,
  );
  const [showWorldDetails, setShowWorldDetails] = useState(false);
  const [selectedWorldForDetails, setSelectedWorldForDetails] = useState<
    string | null
  >(null);
  const [showFolderDialog, setShowFolderDialog] = useState(false);
  const [selectedWorldsForFolder, setSelectedWorldsForFolder] = useState<
    string[]
  >([]);
  const [selectedWorldsState, setSelectedWorldsState] = useState<
    Map<string | SpecialFolders, string[]>
  >(new Map<string | SpecialFolders, string[]>());
  const [shouldClearFindSelection, setShouldClearFindSelection] =
    useState(false);

  useEffect(() => {
    loadAllWorlds();
  }, []);

  const isFindPage = useMemo(() => {
    return currentFolder === SpecialFolders.Find;
  }, [currentFolder]);

  const saveSelectedState = (type: string | SpecialFolders) => {
    if (type === SpecialFolders.Find) {
      return;
    }
    setSelectedWorldsState((prev) => {
      const newState = new Map(prev);
      newState.set(type, selectedWorldsForFolder);
      return newState;
    });
  };

  const loadSelectedState = (type: string | SpecialFolders) => {
    const selected = selectedWorldsState.get(type);
    if (selected) {
      setSelectedWorldsForFolder(selected);
    } else {
      setSelectedWorldsForFolder([]);
    }
  };

  const handleSelectFolder = async (
    type:
      | SpecialFolders.All
      | SpecialFolders.Find
      | SpecialFolders.Unclassified
      | SpecialFolders.Hidden
      | 'folder',
    folderName?: string,
  ) => {
    try {
      saveSelectedState(currentFolder);

      setShowAbout(false);
      setShowSettings(false);
      setShowFind(false);
      switch (type) {
        case SpecialFolders.All:
          await loadAllWorlds();
          setCurrentFolder(SpecialFolders.All);
          loadSelectedState(type);
          break;
        case SpecialFolders.Find:
          setShowFind(true);
          setCurrentFolder(SpecialFolders.Find);
          loadSelectedState(type);
          break;
        case SpecialFolders.Unclassified:
          await loadUnclassifiedWorlds();
          setCurrentFolder(SpecialFolders.Unclassified);
          loadSelectedState(type);
          break;
        case SpecialFolders.Hidden:
          await openHiddenFolder();
          setCurrentFolder(SpecialFolders.Hidden);
          loadSelectedState(type);
          break;
        case 'folder':
          if (folderName) {
            await loadFolderContents(folderName);
            loadSelectedState(folderName);
          }
          break;
      }
    } catch (error) {
      toast({
        title: t('general:error-title'),
        description: t('listview-page:error-load-worlds'),
        duration: 3000,
      });
    }
  };

  const loadAllWorlds = async () => {
    try {
      const worlds = await commands.getAllWorlds();
      if (worlds.status === 'ok') {
        setWorlds(worlds.data);
      } else {
        toast({
          title: t('general:error-title'),
          description: worlds.error,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: t('general:error-title'),
        description: t('listview-page:error-load-worlds'),
      });
    }
  };
  const loadUnclassifiedWorlds = async () => {
    try {
      const worlds = await commands.getUnclassifiedWorlds();
      if (worlds.status === 'ok') {
        setWorlds(worlds.data);
      } else {
        toast({
          title: t('general:error-title'),
          description: worlds.error,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: t('general:error-title'),
        description: t('listview-page:error-load-worlds'),
      });
    }
  };
  const openHiddenFolder = async () => {
    info('Opening hidden worlds');
    try {
      const hiddenWorlds = await commands.getHiddenWorlds();
      if (hiddenWorlds.status === 'error') {
        toast({
          title: 'Error',
          description: hiddenWorlds.error as string,
          variant: 'destructive',
        });
        return;
      }
      const worlds = hiddenWorlds.data;
      setWorlds(
        worlds.map((world) => ({
          ...world,
          platform: world.platform as Platform,
        })),
      );
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load hidden worlds',
        variant: 'destructive',
      });
    }
  };

  const handleCreateFolder = async (name: string) => {
    try {
      const newName = await invoke<string>('create_folder', { name: name });
      await loadFolders();

      // Batch state updates before navigation
      await Promise.all([
        setCurrentFolder(newName),
        setShowCreateFolder(false),
      ]);

      // Navigate to the new folder
      await loadFolderContents(newName);
    } catch (e) {
      error(`Failed to create folder: ${e}`);
      toast({
        title: t('general:error-title'),
        description: t('listview-page:error-create-folder'),
      });
    }
  };

  const handleAddWorld = async (worldId: string) => {
    try {
      const world = await commands.getWorld(worldId, null);
      if (world.status === 'error') {
        throw new Error(world.error);
      }
      // if we are not in a special folder, add the world to the current folder
      if (
        !Object.values(SpecialFolders).includes(currentFolder as SpecialFolders)
      ) {
        await commands.addWorldToFolder(currentFolder, worldId);
      }
      toast({
        title: t('listview-page:world-added-title'),
        description: t('listview-page:world-added-description'),
        duration: 1000,
      });
      await refreshCurrentView();
    } catch (e) {
      error(`Failed to add world: ${e}`);
      toast({
        title: t('general:error-title'),
        description: t('listview-page:error-add-world'),
        variant: 'destructive',
      });
    }
  };

  const loadFolderContents = async (folder: string) => {
    try {
      const result = await commands.getWorlds(folder);
      if (result.status === 'ok') {
        setWorlds(result.data);
        setCurrentFolder(folder);
      } else {
        toast({
          title: t('general:error-title'),
          description: result.error,
          variant: 'destructive',
        });
      }
    } catch (e) {
      toast({
        title: t('general:error-title'),
        description: t('listview-page:error-load-worlds'),
        variant: 'destructive',
      });
      error(`Error loading worlds: ${e}`);
    }
  };

  const handleReload = async () => {
    const result = await commands.getFavoriteWorlds();

    if (result.status === 'error') {
      const e = result.error;

      toast({
        title: t('general:error-title'),
        description: e as string,
        variant: 'destructive',
      });
      error(`Failed to reload: ${e}`);
      return;
    }
    if (currentFolder === SpecialFolders.All) {
      await loadAllWorlds();
    } else if (currentFolder === SpecialFolders.Unclassified) {
      await loadUnclassifiedWorlds();
    } else if (currentFolder === SpecialFolders.Hidden) {
      await openHiddenFolder();
    } else if (currentFolder === SpecialFolders.Find) {
      return;
    } else if (currentFolder) {
      await loadFolderContents(currentFolder);
    }

    toast({
      title: t('general:success-title'),
      description: t('listview-page:worlds-fetched'),
      duration: 2000,
    });
  };

  const refreshCurrentView = async () => {
    try {
      info('Refreshing current view');
      info(`Current folder: ${currentFolder}`);
      switch (currentFolder) {
        case SpecialFolders.All:
          await loadAllWorlds();
          break;
        case SpecialFolders.Unclassified:
          await loadUnclassifiedWorlds();
          break;
        case SpecialFolders.Find:
          break;
        case SpecialFolders.Hidden:
          await openHiddenFolder();
          break;
        default:
          if (currentFolder) {
            await loadFolderContents(currentFolder);
          }
      }
    } catch (error) {
      toast({
        title: t('general:error-title'),
        description: t('listview-page:error-refresh-worlds'),
        duration: 3000,
      });
    }
  };

  const handleHideWorld = async (worldId: string[], worldName: string[]) => {
    try {
      // Store original folder information for each world before hiding
      const worldFoldersMap = new Map<string, string[]>();

      // Get folder information for each world (this is already fast - just in-memory lookup)
      for (const id of worldId) {
        const world = worlds.find((w) => w.worldId === id);
        if (world) {
          worldFoldersMap.set(id, [...world.folders]);
        }
      }

      // Hide worlds in parallel instead of one by one
      await Promise.all(worldId.map((id) => commands.hideWorld(id)));

      toast({
        title: t('listview-page:worlds-hidden-title'),
        description: (
          <div className="flex w-full items-center justify-between gap-2">
            <span>
              {worldName.length > 1
                ? t(
                    'listview-page:worlds-hidden-multiple',
                    worldName[0],
                    worldName.length - 1,
                  )
                : t('listview-page:worlds-hidden-single', worldName[0])}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
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

                  await refreshCurrentView();
                  toast({
                    title: t('listview-page:restored-title'),
                    description: t('listview-page:worlds-restored'),
                  });
                } catch (e) {
                  error(`Failed to restore worlds: ${e}`);
                  toast({
                    title: t('general:error-title'),
                    description: t('listview-page:error-restore-worlds'),
                    variant: 'destructive',
                  });
                }
              }}
            >
              {t('listview-page:undo-button')}
            </Button>
          </div>
        ),
        duration: 3000,
        className: 'relative',
        style: {
          '--progress': '100%',
        } as React.CSSProperties,
      });

      await refreshCurrentView();
    } catch (e) {
      error(`Failed to hide world: ${e}`);
      toast({
        title: t('general:error-title'),
        description: t('listview-page:error-hide-world'),
        variant: 'destructive',
      });
    }
  };

  const handleRestoreWorld = async (worldIds: string[]) => {
    try {
      const restoredWorlds = worldIds;

      // Unhide all worlds in parallel
      await Promise.all(worldIds.map((id) => commands.unhideWorld(id)));

      toast({
        title: 'Worlds restored',
        description: (
          <div className="flex w-full items-center justify-between gap-2">
            <span>Restored from hidden</span>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  // Hide all worlds in parallel
                  await Promise.all(
                    restoredWorlds.map((id) => commands.hideWorld(id)),
                  );

                  await refreshCurrentView();
                  toast({
                    title: 'Hidden',
                    description: 'Worlds hidden again',
                  });
                } catch (e) {
                  error(`Failed to restore worlds: ${e}`);
                  toast({
                    title: 'Error',
                    description: 'Failed to re-hide worlds',
                    variant: 'destructive',
                  });
                }
              }}
            >
              Undo
            </Button>
          </div>
        ),
        duration: 3000,
      });

      await refreshCurrentView();
    } catch (e) {
      error(`Failed to restore worlds: ${e}`);
      toast({
        title: 'Error',
        description: 'Failed to restore worlds from hidden',
        variant: 'destructive',
      });
    }
  };

  const removeWorldsFromFolder = async (worldIds: string[]) => {
    try {
      const removedWorlds = worldIds;

      // Remove all worlds from folder in parallel
      await Promise.all(
        worldIds.map((id) => commands.removeWorldFromFolder(currentFolder, id)),
      );

      toast({
        title: t('listview-page:worlds-removed-title'),
        description: (
          <div className="flex w-full items-center justify-between gap-2">
            <span>{t('listview-page:removed-from-folder', currentFolder)}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  // Restore all worlds to folder in parallel
                  await Promise.all(
                    removedWorlds.map((id) =>
                      commands.addWorldToFolder(currentFolder, id),
                    ),
                  );

                  await refreshCurrentView();
                  toast({
                    title: t('listview-page:restored-title'),
                    description: t('listview-page:worlds-restored-to-folder'),
                  });
                } catch (e) {
                  error(`Failed to restore worlds: ${e}`);
                  toast({
                    title: t('general:error-title'),
                    description: t('listview-page:error-restore-worlds'),
                    variant: 'destructive',
                  });
                }
              }}
            >
              Undo
            </Button>
          </div>
        ),
        duration: 3000,
        className: 'relative',
        style: {
          '--progress': '100%',
        } as React.CSSProperties,
      });

      await refreshCurrentView();
    } catch (e) {
      error(`Failed to remove worlds from folder: ${e}`);
      toast({
        title: t('general:error-title'),
        description: t('listview-page:error-remove-from-folder'),
        variant: 'destructive',
      });
    }
  };

  const handleAddToFolders = async (
    foldersToAdd: string[],
    foldersToRemove: string[],
  ) => {
    try {
      const worldsToAdd = worlds.filter((world) =>
        selectedWorldsForFolder.includes(world.worldId),
      );

      if (currentFolder === SpecialFolders.Find) {
        // Create an array of promises for all world fetches
        const worldPromises = worldsToAdd.map((worldData) =>
          commands.getWorld(worldData.worldId, null),
        );

        // Wait for all promises to resolve in parallel
        const worldResults = await Promise.all(worldPromises);

        // Check if any of the results have errors
        const errorResult = worldResults.find(
          (result) => result.status === 'error',
        );
        if (errorResult) {
          throw new Error(errorResult.error);
        }

        setSelectedWorldsForFolder([]);
        setShouldClearFindSelection(true);
        toast({
          title: t('listview-page:worlds-added-title'),
          description:
            worldsToAdd.length > 1
              ? t(
                  'listview-page:worlds-added-description-multiple',
                  worldsToAdd.length,
                )
              : t('listview-page:worlds-added-description-single'),
          duration: 1000,
        });
      }
      // Store original state for each world-folder combination
      const originalStates = worldsToAdd.map((world) => ({
        worldId: world.worldId,
        worldName: world.name,
        addedTo: foldersToAdd.filter(
          (folder) => !world.folders.includes(folder),
        ),
        removedFrom: foldersToRemove.filter((folder) =>
          world.folders.includes(folder),
        ),
      }));

      // Perform changes...
      try {
        const addPromises = [];
        const removePromises = [];

        // Gather all add operations
        for (const folder of foldersToAdd) {
          for (const world of worldsToAdd) {
            addPromises.push(commands.addWorldToFolder(folder, world.worldId));
          }
        }

        // Gather all remove operations - with validation
        const validFoldersToRemove = foldersToRemove.filter((folder) =>
          folders.includes(folder),
        );

        for (const folder of validFoldersToRemove) {
          for (const world of worldsToAdd) {
            // Only remove if the world is actually in this folder
            if (world.folders.includes(folder)) {
              removePromises.push(
                commands.removeWorldFromFolder(folder, world.worldId),
              );
            }
          }
        }

        // Execute all operations in parallel
        const results = await Promise.all([...addPromises, ...removePromises]);

        // Check for errors in results if needed
        const hasErrors = results.some((result) => result?.status === 'error');
        if (hasErrors) {
          throw new Error('One or more folder operations failed');
        }
      } catch (e) {
        error(`Failed during folder operations: ${e}`);
        throw e; // Re-throw to be caught by the outer try/catch
      }

      if (currentFolder != SpecialFolders.Find) {
        toast({
          title: t('listview-page:folders-updated-title'),
          description: (
            <div className="flex w-full items-center justify-between gap-2">
              <span>
                {worldsToAdd.length > 1
                  ? t(
                      'listview-page:folders-updated-multiple',
                      worldsToAdd[0].name,
                      worldsToAdd.length - 1,
                    )
                  : t(
                      'listview-page:folders-updated-single',
                      worldsToAdd[0].name,
                    )}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    // Undo changes per world
                    for (const state of originalStates) {
                      // Remove from folders that were added
                      for (const folder of state.addedTo) {
                        await commands.removeWorldFromFolder(
                          folder,
                          state.worldId,
                        );
                      }
                      // Add back to folders that were removed
                      for (const folder of state.removedFrom) {
                        await commands.addWorldToFolder(folder, state.worldId);
                      }
                    }
                    await refreshCurrentView();
                    toast({
                      title: t('listview-page:restored-title'),
                      description: t('listview-page:folder-changes-undone'),
                    });
                  } catch (e) {
                    error(`Failed to undo folder changes: ${e}`);
                    toast({
                      title: t('general:error-title'),
                      description: t('listview-page:error-undo-folder-changes'),
                      variant: 'destructive',
                    });
                  }
                }}
              >
                Undo
              </Button>
            </div>
          ),
          duration: 3000,
          className: 'relative',
          style: {
            '--progress': '100%',
          } as React.CSSProperties,
        });
      }

      await refreshCurrentView();
      setShowFolderDialog(false);
      setSelectedWorldsForFolder([]);
    } catch (e) {
      error(`Failed to update folders: ${e}`);
      toast({
        title: t('general:error-title'),
        description: t('listview-page:error-update-folders'),
        variant: 'destructive',
      });
    }
  };

  const handleOpenWorldDetails = (worldId: string) => {
    setSelectedWorldForDetails(worldId);
    setShowWorldDetails(true);
  };

  const createInstance = async (
    worldId: string,
    instanceType: Exclude<InstanceType, 'group'>,
    region: Region,
  ) => {
    try {
      const result = await commands.createWorldInstance(
        worldId,
        instanceType,
        region,
      );

      if (result.status === 'error') {
        const error = result.error;
        toast({
          title: t('general:error-title'),
          description: error as string,
          variant: 'destructive',
        });
        return;
      }

      await refreshCurrentView();
      toast({
        title: t('general:success-title'),
        description: t('listview-page:created-instance', instanceType),
      });
    } catch (e) {
      error(`Failed to create instance: ${e}`);
      toast({
        title: t('general:error-title'),
        description: t('listview-page:error-create-instance'),
        variant: 'destructive',
      });
    }
  };

  const createGroupInstance = async (
    worldId: string,
    region: Region,
    id: string,
    instanceType: GroupInstanceType,
    queueEnabled: boolean,
    selectedRoles?: string[],
  ) => {
    try {
      const result = await commands.createGroupInstance(
        worldId,
        id,
        instanceType,
        selectedRoles ?? null,
        region,
        queueEnabled,
      );

      if (result.status === 'error') {
        throw new Error(result.error);
      }

      await refreshCurrentView();
      toast({
        title: t('general:success-title'),
        description: t('listview-page:created-instance', instanceType),
      });
    } catch (e) {
      error(`Failed to create group instance: ${e}`);
      toast({
        title: t('general:error-title'),
        description: t('listview-page:error-create-group-instance'),
        variant: 'destructive',
      });
    }
  };

  const getGroups = async (): Promise<UserGroup[]> => {
    try {
      const result = await commands.getUserGroups();
      if (result.status === 'error') {
        throw new Error(result.error);
      }
      return result.data;
    } catch (e) {
      error(`Failed to get groups: ${e}`);
      toast({
        title: t('general:error-title'),
        description: t('listview-page:error-get-groups'),
        variant: 'destructive',
      });
      return [];
    }
  };

  const getGroupPermissions = async (
    id: string,
  ): Promise<GroupInstancePermissionInfo> => {
    try {
      const result = await commands.getPermissionForCreateGroupInstance(id);
      if (result.status === 'error') {
        throw new Error(result.error);
      }
      return result.data;
    } catch (e) {
      error(`Failed to get group permissions: ${e}`);
      toast({
        title: t('general:error-title'),
        description: t('listview-page:error-get-group-permissions'),
        variant: 'destructive',
      });
      throw new Error('Group permissions not found');
    }
  };

  const loadCardSize = async () => {
    try {
      const result = await commands.getCardSize();
      if (result.status === 'ok') {
        setCardSize(CardSize[result.data as keyof typeof CardSize]);
      }
    } catch (e) {
      error(`Failed to load card size: ${e}`);
      toast({
        title: t('general:error-title'),
        description: t('listview-page:error-load-card-size'),
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    loadCardSize();
  }, [showSettings]);

  const onRenameFolder = async (oldName: string, newName: string) => {
    try {
      await commands.renameFolder(oldName, newName);
      await loadFolders();
      setCurrentFolder(newName);
      toast({
        title: 'Success',
        description: 'Folder renamed successfully',
      });
    } catch (e) {
      error(`Failed to rename folder: ${e}`);
      toast({
        title: t('general:error-title'),
        description: t('listview-page:error-rename-folder'),
        variant: 'destructive',
      });
    }
  };

  const handleDeleteFolder = async (folderName: string) => {
    try {
      await commands.deleteFolder(folderName);
      await loadFolders();
      setShowDeleteFolder(null);
      toast({
        title: 'Success',
        description: 'Folder deleted successfully',
      });
    } catch (e) {
      error(`Failed to delete folder: ${e}`);
      toast({
        title: t('general:error-title'),
        description: t('listview-page:error-delete-folder'),
        variant: 'destructive',
      });
    }
  };

  const renderMainContent = () => {
    if (showAbout) {
      return <AboutSection />;
    }

    if (showSettings) {
      return (
        <SettingsPage
          onCardSizeChange={loadCardSize}
          onOpenHiddenFolder={() => {
            handleSelectFolder(SpecialFolders.Hidden);
          }}
          onDataChange={loadFolders}
        />
      );
    }

    if (showFind) {
      return (
        <FindPage
          onWorldsChange={(worlds) => {
            setWorlds(worlds);
          }}
          onSelectWorld={(worldId) => {
            handleOpenWorldDetails(worldId);
          }}
          onShowFolderDialog={(worlds) => {
            setSelectedWorldsForFolder(worlds);
            setShowFolderDialog(true);
          }}
          onSelectedWorldsChange={(selectedWorlds) => {
            setSelectedWorldsForFolder(selectedWorlds);
          }}
          clearSelection={shouldClearFindSelection}
          onClearSelectionComplete={() => setShouldClearFindSelection(false)}
        />
      );
    }

    return (
      <>
        <div className="p-4 flex justify-between items-center">
          <h1 className="text-xl font-bold">
            {Object.values(SpecialFolders).includes(
              currentFolder as SpecialFolders,
            )
              ? t(`general:${currentFolder.toLowerCase().replace(' ', '-')}`)
              : currentFolder}
          </h1>
          <div className="flex items-center">
            {currentFolder !== SpecialFolders.Hidden && (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setIsAddWorldOpen(true)}
                  className="ml-2"
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleReload}
                  className="ml-2"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
        <div className="flex-1">
          <WorldGrid
            size={cardSize}
            worlds={worlds}
            folderName={currentFolder}
            initialSelectedWorlds={selectedWorldsForFolder}
            onRemoveFromFolder={removeWorldsFromFolder}
            onHideWorld={handleHideWorld}
            onUnhideWorld={handleRestoreWorld}
            onOpenWorldDetails={handleOpenWorldDetails}
            onShowFolderDialog={(worlds) => {
              setSelectedWorldsForFolder(worlds);
              setShowFolderDialog(true);
            }}
            onSelectedWorldsChange={(selectedWorlds) => {
              setSelectedWorldsForFolder(selectedWorlds);
            }}
          />
        </div>
      </>
    );
  };

  return (
    <div className="flex h-screen">
      <AppSidebar
        folders={folders}
        onFoldersChange={loadFolders}
        onAddFolder={() => setShowCreateFolder(true)}
        onSelectFolder={handleSelectFolder}
        selectedFolder={currentFolder}
        onSelectAbout={() => {
          setShowAbout(true);
          setShowSettings(false);
          setShowFind(false);
          setShowWorldDetails(false);
        }}
        onSelectSettings={() => {
          setShowSettings(true);
          setShowAbout(false);
          setShowFind(false);
          setShowWorldDetails(false);
        }}
        onRenameFolder={onRenameFolder}
        onDeleteFolder={(folderName) => setShowDeleteFolder(folderName)}
      />
      <div className="flex-1 overflow-auto">{renderMainContent()}</div>
      <CreateFolderDialog
        open={showCreateFolder}
        onOpenChange={(open) => {
          if (!open) {
            setShowCreateFolder(false);
          }
        }}
        onConfirm={handleCreateFolder}
      />
      <AddWorldPopup
        open={isAddWorldOpen}
        onConfirm={handleAddWorld}
        onClose={() => setIsAddWorldOpen(false)}
        existingWorlds={
          Object.values(SpecialFolders).includes(
            currentFolder as SpecialFolders,
          )
            ? worlds.map((world) => world.worldId)
            : worlds
                .filter((world) =>
                  world.folders.includes(currentFolder as string),
                )
                .map((world) => world.worldId)
        }
      />
      <WorldDetailPopup
        open={showWorldDetails}
        onOpenChange={(open) => {
          setShowWorldDetails(open);
          if (!open) {
            setSelectedWorldForDetails(null);
            refreshCurrentView();
          }
        }}
        worldId={selectedWorldForDetails ? selectedWorldForDetails : ''}
        onCreateInstance={createInstance}
        onCreateGroupInstance={createGroupInstance}
        onGetGroups={getGroups}
        onGetGroupPermissions={getGroupPermissions}
        dontSaveToLocal={isFindPage}
      />
      <AddToFolderDialog
        open={showFolderDialog}
        onOpenChange={setShowFolderDialog}
        selectedWorlds={worlds.filter((world) =>
          selectedWorldsForFolder.includes(world.worldId),
        )}
        folders={folders}
        onConfirm={(foldersToAdd, foldersToRemove) =>
          handleAddToFolders(foldersToAdd, foldersToRemove)
        }
        isFindPage={isFindPage}
      />
      <DeleteFolderDialog
        folderName={showDeleteFolder}
        onOpenChange={(open) => {
          if (!open) {
            setShowDeleteFolder(null);
          }
        }}
        onConfirm={handleDeleteFolder}
      />
    </div>
  );
}
