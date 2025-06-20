'use client';

import { useLayoutEffect, useRef, useState, useMemo, useEffect } from 'react';
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
import {
  CheckSquare,
  Menu,
  Plus,
  RefreshCw,
  Share,
  SortAsc,
  SortDesc,
  Square,
  Settings,
  X,
  TextSearch,
} from 'lucide-react'; // For the reload icon
import { commands, WorldDisplayData } from '@/lib/bindings';
import { AboutSection } from '@/components/about-section';
import { SettingsPage } from '@/components/settings-page';
import { WorldDetailPopup } from '@/components/world-detail-popup';
import { AddToFolderDialog } from '@/components/add-to-folder-dialog';
import { DeleteFolderDialog } from '@/components/delete-folder-dialog';
import { AddWorldPopup } from '@/components/add-world-popup';
import { GroupInstanceType, InstanceType, Region } from '@/types/instances';
import { toRomaji } from 'wanakana';
import { UserGroup, GroupInstancePermissionInfo } from '@/lib/bindings';
import { SpecialFolders } from '@/types/folders';
import { FindPage } from '@/components/find-page';
import { info, error } from '@tauri-apps/plugin-log';
import { DeleteWorldDialog } from '@/components/delete-world-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AdvancedSearchPanel } from '@/components/advanced-search-panel';
import { ShareFolderPopup } from '@/components/share-folder-popup';

type SortField =
  | 'name'
  | 'authorName'
  | 'favorites'
  | 'dateAdded'
  | 'lastUpdated';

export default function ListView() {
  const filterRowRef = useRef<HTMLDivElement>(null);
  const authorRef = useRef<HTMLDivElement>(null);
  const tagsRef = useRef<HTMLDivElement>(null);
  const foldersRef = useRef<HTMLDivElement>(null);
  const foldersLabelRef = useRef<HTMLSpanElement>(null); // ← new
  const clearRef = useRef<HTMLButtonElement>(null);
  const [wrapFolders, setWrapFolders] = useState(false);

  const { folders, loadFolders } = useFolders();
  const { toast } = useToast();
  const { t } = useLocalization();
  const gridScrollRef = useRef<HTMLDivElement>(null);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [showDeleteFolder, setShowDeleteFolder] = useState<string | null>(null);
  const [isAddWorldOpen, setIsAddWorldOpen] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showFind, setShowFind] = useState(false);
  const [worlds, setWorlds] = useState<WorldDisplayData[]>([]);
  const [cardSize, setCardSize] = useState<CardSize>(CardSize.Normal);
  const [isLoading, setIsLoading] = useState(false);
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
  const [shouldClearMultiSelection, setShouldClearMultiSelection] =
    useState(false);
  const [worldsJustAdded, setWorldsJustAdded] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [authorFilter, setAuthorFilter] = useState('');
  const [tagFilters, setTagFilters] = useState<string[]>([]);
  const [folderFilters, setFolderFilters] = useState<string[]>([]);
  const [sortField, setSortField] = useState<SortField>('dateAdded');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [deleteConfirmWorld, setDeleteConfirmWorld] = useState<string | null>(
    null,
  );
  const [deleteConfirmWorldName, setDeleteConfirmWorldName] =
    useState<string>('');
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [showShareFolder, setShowShareFolder] = useState(false);

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
      clearFilters();
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
        variant: 'destructive',
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
        variant: 'destructive',
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

      // Only navigate to the new folder if not in Find page or if add-to-folder dialog is open
      if (currentFolder !== SpecialFolders.Find && !showFolderDialog) {
        await Promise.all([
          setCurrentFolder(newName),
          setShowCreateFolder(false),
        ]);
        handleSelectFolder('folder', newName);
      } else {
        setShowCreateFolder(false);
      }
      toast({
        title: t('listview-page:folder-created-title'),
        description: t('listview-page:folder-created-description', newName),
        duration: 2000,
      });
    } catch (e) {
      error(`Failed to create folder: ${e}`);
      toast({
        title: t('general:error-title'),
        description: t('listview-page:error-create-folder'),
        variant: 'destructive',
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
    setIsLoading(true);
    const result = await commands.getFavoriteWorlds();

    if (result.status === 'error') {
      const e = result.error;

      toast({
        title: t('general:error-title'),
        description: e as string,
        variant: 'destructive',
      });
      error(`Failed to reload: ${e}`);
      setIsLoading(false);
      return;
    }
    if (currentFolder === SpecialFolders.All) {
      await loadAllWorlds();
    } else if (currentFolder === SpecialFolders.Unclassified) {
      await loadUnclassifiedWorlds();
    }

    setIsLoading(false);
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
        title: t('listview-page:restored-title'),
        description: (
          <div className="flex w-full items-center justify-between gap-2">
            <span>{t('listview-page:worlds-restored')}</span>
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
                    title: t('listview-page:worlds-hidden-title'),
                    description: t('listview-page:worlds-hidden-again'),
                  });
                } catch (e) {
                  error(`Failed to restore worlds: ${e}`);
                  toast({
                    title: t('general:error-title'),
                    description: t('listview-page:error-hide-world'),
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
      });

      await refreshCurrentView();
    } catch (e) {
      error(`Failed to restore worlds: ${e}`);
      toast({
        title: t('general:error-title'),
        description: t('listview-page:error-restore-worlds'),
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

        const worldIds = worldsToAdd.map((world) => world.worldId);

        setWorldsJustAdded(worldIds);

        // Check if any of the results have errors
        const errorResult = worldResults.find(
          (result) => result.status === 'error',
        );
        if (errorResult) {
          throw new Error(errorResult.error);
        }
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

      setSelectedWorldsForFolder([]);
      setShouldClearMultiSelection(true);

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

  // Add the onDelete function to handle world deletion
  const onDelete = async (worldId: string) => {
    try {
      // Find the world name for the confirmation dialog
      let worldName = 'this world';
      const worldToDelete = worlds.find((w) => w.worldId === worldId);
      if (worldToDelete) {
        worldName = worldToDelete.name;
      } else {
        const allWorldsResult = await commands.getAllWorlds();
        const hiddenWorldsResult = await commands.getHiddenWorlds();

        let worldsList: WorldDisplayData[] = [];
        if (allWorldsResult.status === 'ok') {
          worldsList = allWorldsResult.data;
        }
        if (hiddenWorldsResult.status === 'ok') {
          worldsList = [...worldsList, ...hiddenWorldsResult.data];
        }

        const foundWorld = worldsList.find((w) => w.worldId === worldId);
        if (foundWorld) {
          worldName = foundWorld.name;
        }
      }

      setDeleteConfirmWorldName(worldName);
      setDeleteConfirmWorld(worldId);
    } catch (e) {
      error(`Failed to prepare world deletion: ${e}`);
      toast({
        title: t('general:error-title'),
        description: t('listview-page:error-delete-world'),
        variant: 'destructive',
      });
    }
  };

  const confirmDeleteWorld = async () => {
    if (!deleteConfirmWorld) return;

    try {
      const worldId = deleteConfirmWorld;
      const result = await commands.deleteWorld(worldId);

      if (result.status === 'error') {
        throw new Error(result.error);
      }

      setDeleteConfirmWorld(null);
      await refreshCurrentView();
      toast({
        title: t('general:success-title'),
        description: t('listview-page:world-deleted-success'),
        duration: 2000,
      });
    } catch (e) {
      error(`Failed to delete world: ${e}`);
      toast({
        title: t('general:error-title'),
        description: t('listview-page:error-delete-world'),
        variant: 'destructive',
      });
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

  const filteredWorlds = useMemo(() => {
    info(
      `Filtering worlds with: searchQuery="${searchQuery}", authorFilter="${authorFilter}", tagFilters=${JSON.stringify(tagFilters)}, folderFilters=${JSON.stringify(folderFilters)}, totalWorlds=${worlds.length}`,
    );

    return worlds.filter((world) => {
      // Check text search
      const textMatch =
        !searchQuery ||
        world.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        world.authorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        toRomaji(world.name)
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        toRomaji(world.authorName)
          .toLowerCase()
          .includes(searchQuery.toLowerCase());

      // Check author filter (EXACT matching)
      const authorMatch =
        !authorFilter ||
        world.authorName.toLowerCase() === authorFilter.toLowerCase();

      // Check tag filters (ALL tags must match - AND logic with EXACT matching)
      const tagMatch =
        tagFilters.length === 0 ||
        (world.tags &&
          tagFilters.every((searchTag) => {
            const prefixedTag = `author_tag_${searchTag}`;
            return world.tags.some(
              (worldTag) =>
                worldTag.toLowerCase() === prefixedTag.toLowerCase(),
            );
          }));

      // Check folder filters (world must be in ALL specified folders - AND logic with EXACT matching)
      const folderMatch =
        folderFilters.length === 0 ||
        folderFilters.every((searchFolder) =>
          world.folders.some(
            (worldFolder) =>
              worldFolder.toLowerCase() === searchFolder.toLowerCase(),
          ),
        );

      const finalMatch = textMatch && authorMatch && tagMatch && folderMatch;

      return finalMatch;
    });
  }, [worlds, searchQuery, authorFilter, tagFilters, folderFilters]);

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

  const sortedAndFilteredWorlds = useMemo(() => {
    return [...filteredWorlds].sort((a, b) => {
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
  }, [filteredWorlds, sortField, sortDirection]);

  const clearFilters = () => {
    setAuthorFilter('');
    setTagFilters([]);
    setFolderFilters([]);
    setSearchQuery('');
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
          clearSelection={shouldClearMultiSelection}
          onClearSelectionComplete={() => setShouldClearMultiSelection(false)}
          worldsJustAdded={worldsJustAdded}
          onWorldsJustAddedProcessed={() => setWorldsJustAdded([])}
        />
      );
    }

    return (
      <>
        <div className="sticky top-0 z-20 bg-background">
          <div className="p-4 flex items-center gap-4">
            <div className="flex-1 flex items-center gap-2">
              <div className="relative flex-1">
                <div className="relative">
                  <input
                    type="text"
                    placeholder={t('world-grid:search-placeholder')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2 pr-10"
                  />

                  {/* Advanced Search button */}
                  <Button
                    variant="ghost"
                    className="absolute right-0 top-1/2 -translate-y-1/2 h-9 w-9 p-0 m-0"
                    onClick={() => setShowAdvancedSearch(true)}
                  >
                    <TextSearch className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex">
              <Select
                value={sortField}
                onValueChange={(value) => handleSort(value as SortField)}
              >
                <SelectTrigger className="w-[180px] h-9">
                  <SelectValue placeholder={t('world-grid:sort-placeholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">
                    {t('world-grid:sort-name')}
                  </SelectItem>
                  <SelectItem value="authorName">
                    {t('general:author')}
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
                onClick={() =>
                  setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
                }
                className="h-9 w-9"
              >
                {sortDirection === 'asc' ? (
                  <SortAsc className="h-4 w-4" />
                ) : (
                  <SortDesc className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant={isSelectionMode ? 'secondary' : 'ghost'}
                onClick={() => {
                  if (isSelectionMode) {
                    setShouldClearMultiSelection(true);
                    setIsSelectionMode(false);
                  } else {
                    setIsSelectionMode(true);
                  }
                }}
                className="h-9 w-9"
              >
                {isSelectionMode ? (
                  <CheckSquare className="h-4 w-4" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Filter Section */}
          {authorFilter || tagFilters.length > 0 || folderFilters.length > 0 ? (
            <div className="px-4 pb-2 border-b bg-muted/50">
              {/* Header: Filters title + Clear All */}
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-muted-foreground">
                  {t('listview-page:active-filters')}
                </span>
                <Button
                  ref={clearRef}
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    clearFilters();
                  }}
                  className="h-7 px-2 text-xs"
                >
                  {t('general:clear-all')}
                </Button>
              </div>
              <div
                ref={filterRowRef}
                className="flex flex-wrap items-center gap-2 max-w-full"
              >
                {/* AUTHOR */}
                {authorFilter && (
                  <div
                    ref={authorRef}
                    className="flex items-center gap-2 shrink-0"
                  >
                    <span className="text-xs text-muted-foreground">
                      {t('general:author')}:
                    </span>
                    <Badge
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      <span
                        className="max-w-[120px] truncate"
                        title={authorFilter}
                      >
                        {authorFilter}
                      </span>
                      <X
                        className="h-3 w-3 cursor-pointer hover:bg-muted-foreground/20 rounded-full"
                        onClick={() => setAuthorFilter('')}
                      />
                    </Badge>
                  </div>
                )}

                {/* TAGS (always row 1) */}
                {tagFilters.length > 0 && (
                  <div
                    ref={tagsRef}
                    className="flex items-center gap-2 min-w-0"
                  >
                    <span className="text-xs text-muted-foreground shrink-0">
                      {t('general:tags')}:
                    </span>
                    <div className="flex items-center gap-1 overflow-hidden whitespace-nowrap">
                      {(() => {
                        const reserved = 80; // for “and X more”
                        const perBadge = 100;
                        const availW =
                          (tagsRef.current?.parentElement?.clientWidth || 0) -
                          reserved -
                          (clearRef.current?.offsetWidth || 0) -
                          (authorRef.current?.offsetWidth || 0);
                        const maxTags = Math.max(
                          1,
                          Math.min(
                            tagFilters.length,
                            Math.floor(availW / perBadge),
                          ),
                        );
                        const visible = tagFilters.slice(0, maxTags);
                        const hidden = tagFilters.length - maxTags;

                        return (
                          <>
                            {visible.map((tag) => (
                              <Badge
                                key={tag}
                                variant="secondary"
                                className="flex items-center gap-1 overflow-hidden"
                              >
                                <span
                                  className="max-w-[80px] truncate whitespace-nowrap"
                                  title={tag}
                                >
                                  {tag}
                                </span>
                                <X
                                  className="h-3 w-3 cursor-pointer hover:bg-muted-foreground/20 rounded-full"
                                  onClick={() =>
                                    setTagFilters((prev) =>
                                      prev.filter((t) => t !== tag),
                                    )
                                  }
                                />
                              </Badge>
                            ))}
                            {hidden > 0 && (
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {t('listview-page:items-hidden', hidden)}
                              </span>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                )}
                {/* FOLDERS */}
                {folderFilters.length > 0 && (
                  <div className="flex flex-col self-center gap-2 -mt-2">
                    {/* Row 1: only if ≥ 2 badges fit */}
                    {(() => {
                      const reserved = 80; // “and X more”
                      const perBadge = 100; // badge+gap
                      const parentW =
                        foldersRef.current?.parentElement?.clientWidth || 0;
                      const usedW =
                        (clearRef.current?.offsetWidth || 0) +
                        (authorRef.current?.offsetWidth || 0) +
                        (tagsRef.current?.offsetWidth || 0);
                      const availW = parentW - reserved - usedW;
                      const fitCount = Math.floor(availW / perBadge);
                      const showFirst = fitCount >= 2;
                      if (!showFirst) return null;

                      const visible = folderFilters.slice(0, fitCount);
                      const hidden = folderFilters.length - fitCount;

                      return (
                        <div
                          ref={foldersRef}
                          className="flex items-center gap-2 min-w-0"
                        >
                          <span
                            ref={foldersLabelRef} // ← label ref
                            className="text-xs text-muted-foreground shrink-0"
                          >
                            {t('general:folders')}:
                          </span>
                          <div className="flex items-center gap-1 overflow-hidden whitespace-nowrap">
                            {visible.map((folder) => (
                              <Badge
                                key={folder}
                                variant="secondary"
                                className="flex items-center gap-1 overflow-hidden"
                              >
                                <span
                                  className="max-w-[100px] truncate whitespace-nowrap"
                                  title={folder}
                                >
                                  {folder}
                                </span>
                                <X
                                  className="h-3 w-3 cursor-pointer hover:bg-muted-foreground/20 rounded-full flex-shrink-0"
                                  onClick={() =>
                                    setFolderFilters((prev) =>
                                      prev.filter((f) => f !== folder),
                                    )
                                  }
                                />
                              </Badge>
                            ))}
                            {hidden > 0 && (
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {t('listview-page:items-hidden', hidden)}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Row 2: show when fewer than 2 fit OR when wrapFolders is true */}
                    {(() => {
                      const reserved = 80; // px for “and X more”
                      const perBadge = 100; // badge+gap
                      const parentW =
                        foldersRef.current?.parentElement?.clientWidth || 0;
                      const usedW =
                        (clearRef.current?.offsetWidth || 0) +
                        (authorRef.current?.offsetWidth || 0) +
                        (tagsRef.current?.offsetWidth || 0) +
                        (foldersLabelRef.current?.offsetWidth || 0);
                      const availW = parentW - reserved - usedW;
                      const fitCount = Math.floor(availW / perBadge);
                      const showFirst = fitCount >= 2;
                      const overflow = folderFilters.slice(fitCount);

                      if (!showFirst || wrapFolders) {
                        return (
                          <div className="mt-2 flex flex-wrap items-center gap-2 max-w-full">
                            <span className="text-xs text-muted-foreground">
                              {t('general:folders')}:
                            </span>
                            {overflow.map((folder) => (
                              <Badge
                                key={folder}
                                variant="secondary"
                                className="flex items-center gap-1 overflow-hidden"
                              >
                                <span
                                  className="max-w-[100px] truncate whitespace-nowrap"
                                  title={folder}
                                >
                                  {folder}
                                </span>
                                <X
                                  className="h-3 w-3 cursor-pointer hover:bg-muted-foreground/20 rounded-full flex-shrink-0"
                                  onClick={() =>
                                    setFolderFilters((prev) =>
                                      prev.filter((f) => f !== folder),
                                    )
                                  }
                                />
                              </Badge>
                            ))}
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
        <div className="flex-1">
          {sortedAndFilteredWorlds.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              {worlds.length === 0
                ? // no raw worlds in this folder / section
                  currentFolder === SpecialFolders.All
                  ? t('listview-page:no-worlds-all')
                  : currentFolder === SpecialFolders.Unclassified
                    ? t('listview-page:no-worlds-unclassified')
                    : !Object.values(SpecialFolders).includes(
                          currentFolder as SpecialFolders,
                        )
                      ? t('listview-page:no-worlds-in-folder', currentFolder)
                      : t('listview-page:no-worlds') // fallback, e.g. hidden
                : // there *are* worlds but filters/search cut them out
                  t('listview-page:no-results-filtered')}
            </div>
          ) : (
            <WorldGrid
              size={cardSize}
              worlds={sortedAndFilteredWorlds}
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
              isSelectionMode={isSelectionMode}
              shouldClearSelection={shouldClearMultiSelection}
              onClearSelectionComplete={() =>
                setShouldClearMultiSelection(false)
              }
              containerRef={gridScrollRef}
            />
          )}
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
          setCurrentFolder(SpecialFolders.NotFolder);
        }}
        onSelectSettings={() => {
          setShowSettings(true);
          setShowAbout(false);
          setShowFind(false);
          setShowWorldDetails(false);
          setCurrentFolder(SpecialFolders.NotFolder);
        }}
        onRenameFolder={onRenameFolder}
        onDeleteFolder={(folderName) => setShowDeleteFolder(folderName)}
      />
      <div ref={gridScrollRef} className="flex-1 flex flex-col overflow-auto">
        {/* Render header when in all worlds, unclassified, or in a folder*/}
        {currentFolder === SpecialFolders.All ||
        currentFolder === SpecialFolders.Unclassified ||
        !Object.values(SpecialFolders).includes(
          currentFolder as SpecialFolders,
        ) ? (
          <div className="p-4 flex justify-between items-center">
            <h1 className="text-xl font-bold truncate">
              {Object.values(SpecialFolders).includes(
                currentFolder as SpecialFolders,
              )
                ? t(`general:${currentFolder.toLowerCase().replace(' ', '-')}`)
                : currentFolder}
            </h1>
            <div className="flex items-center">
              {(currentFolder === SpecialFolders.All ||
                currentFolder === SpecialFolders.Unclassified) && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setIsAddWorldOpen(true)}
                    className="ml-2 flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">
                      {t('listview-page:add-world')}
                    </span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleReload}
                    className="ml-2 flex items-center gap-2"
                    disabled={isLoading}
                  >
                    <RefreshCw
                      className={`h-4 w-4${isLoading ? ' animate-spin' : ''}`}
                    />
                    <span className="hidden sm:inline">
                      {t('listview-page:reload-worlds')}
                    </span>
                  </Button>
                </>
              )}
              {!Object.values(SpecialFolders).includes(
                currentFolder as SpecialFolders,
              ) && (
                <div className="flex items-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 flex items-center gap-2 ml-2 mr-1"
                      >
                        <Menu className="h-10 w-10" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        className="flex items-center gap-2 cursor-pointer"
                        onClick={() => setIsAddWorldOpen(true)}
                      >
                        <Plus className="h-4 w-4" />
                        <span>{t('listview-page:add-world')}</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="flex items-center gap-2 cursor-pointer"
                        onClick={() => setShowShareFolder(true)}
                      >
                        <Share className="h-4 w-4" />
                        <span>{t('listview-page:share-folder')}</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>
          </div>
        ) : null}

        <div>{renderMainContent()}</div>
      </div>
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
        onDeleteWorld={onDelete}
        onSelectAuthor={(author) => {
          setAuthorFilter(author);
        }}
        onSelectTag={(tag) => {
          setTagFilters((prev) => [...prev, tag]);
        }}
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
        onAddFolder={handleCreateFolder}
      />
      <ShareFolderPopup
        open={showShareFolder}
        onOpenChange={(open) => {
          if (!open) {
            setShowShareFolder(false);
          }
        }}
        folderName={currentFolder}
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
      <DeleteWorldDialog
        worldName={deleteConfirmWorldName}
        isOpen={deleteConfirmWorld !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteConfirmWorld(null);
        }}
        onConfirm={confirmDeleteWorld}
      />
      <AdvancedSearchPanel
        open={showAdvancedSearch}
        authorFilter={authorFilter}
        onAuthorFilterChange={setAuthorFilter}
        tagFilters={tagFilters}
        onTagFiltersChange={setTagFilters}
        folderFilters={folderFilters}
        onFolderFiltersChange={setFolderFilters}
        onClose={() => setShowAdvancedSearch(false)}
      />
    </div>
  );
}
