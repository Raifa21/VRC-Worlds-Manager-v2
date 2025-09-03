'use client';

import { useRef, useState, useMemo, useEffect, useContext, memo } from 'react';
import { useLocalization } from '@/hooks/use-localization';
import { toast } from 'sonner';
import { CreateFolderDialog } from '@/app/listview/components/popups/create-folder-popup';
import { useFolders } from '@/app/listview/hook/use-folders';
import { AppSidebar } from '@/app/listview/components/app-sidebar';
import { Platform } from '@/types/worlds';
import { WorldGrid } from './components/world-grid';
import { Button } from '@/components/ui/button';
import { onOpenUrl } from '@tauri-apps/plugin-deep-link';
import {
  CheckSquare,
  Menu,
  Plus,
  RefreshCw,
  Share,
  SortAsc,
  SortDesc,
  Square,
  X,
  TextSearch,
} from 'lucide-react'; // For the reload icon
import { commands, WorldDisplayData } from '@/lib/bindings';
import { AboutSection } from './about/page';
import { SettingsPage } from '@/app/listview/settings/page';
import { WorldDetailPopup } from './components/popups/world-details';
import { AddToFolderDialog } from '@/app/listview/components/popups/add-to-folder';
import { DeleteFolderDialog } from '@/app/listview/components/popups/delete-folder-popup';
import { AddWorldPopup } from './components/popups/add-world';
import { GroupInstanceType, InstanceType } from '@/types/instances';
import { InstanceRegion } from '@/lib/bindings';
import { toRomaji } from 'wanakana';
import {
  UserGroup,
  GroupInstancePermissionInfo,
  CardSize,
} from '@/lib/bindings';
import { SpecialFolders } from '@/types/folders';
import { FindPage } from '@/app/listview/folders/find/page';
import { info, error } from '@tauri-apps/plugin-log';
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
import { AdvancedSearchPanel } from '@/app/listview/components/popups/advanced-search-panel';
import { ShareFolderPopup } from '@/components/share-folder-popup';
import { ImportedFolderContainsHidden } from '@/app/listview/components/popups/imported-folder-contains-hidden';
import { UpdateDialogContext } from '@/components/UpdateDialogContext';
import { Input } from '@/components/ui/input';
import { useSelectedWorlds } from '@/app/listview/hook/use-selected-worlds';

type SortField =
  | 'name'
  | 'authorName'
  | 'visits'
  | 'favorites'
  | 'capacity'
  | 'dateAdded'
  | 'lastUpdated';

export default function ListView() {
  // filter references for ui
  const filterRowRef = useRef<HTMLDivElement>(null);
  const authorRef = useRef<HTMLDivElement>(null);
  const tagsRef = useRef<HTMLDivElement>(null);
  const foldersRef = useRef<HTMLDivElement>(null);
  const foldersLabelRef = useRef<HTMLSpanElement>(null);
  const memoTextRef = useRef<HTMLDivElement>(null);
  const clearRef = useRef<HTMLButtonElement>(null);
  const [wrapFolders, setWrapFolders] = useState(false);
  const gridScrollRef = useRef<HTMLDivElement>(null);

  // filter + sort
  const [searchQuery, setSearchQuery] = useState('');
  const [authorFilter, setAuthorFilter] = useState('');
  const [tagFilters, setTagFilters] = useState<string[]>([]);
  const [folderFilters, setFolderFilters] = useState<string[]>([]);
  const [memoTextFilter, setMemoTextFilter] = useState('');
  const [sortField, setSortField] = useState<SortField>('dateAdded');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // popups
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [showDeleteFolder, setShowDeleteFolder] = useState<string | null>(null);
  const [isAddWorldOpen, setIsAddWorldOpen] = useState(false);
  const [showFolderDialog, setShowFolderDialog] = useState(false);
  const [showWorldDetails, setShowWorldDetails] = useState(false);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [showShareFolder, setShowShareFolder] = useState(false);
  const [
    showImportedFolderContainsHidden,
    setShowImportedFolderContainsHidden,
  ] = useState(false);
  // hidden world popup data
  const [containedHiddenWorlds, setContainedHiddenWorlds] = useState<
    WorldDisplayData[]
  >([]);

  // special pages
  const [showAbout, setShowAbout] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showFind, setShowFind] = useState(false);

  // worlds
  const [worlds, setWorlds] = useState<WorldDisplayData[]>([]);

  // preferences
  const [cardSize, setCardSize] = useState<CardSize>('Normal');

  // loading
  const [isLoading, setIsLoading] = useState(false);

  // current folder
  const [currentFolder, setCurrentFolder] = useState<string | SpecialFolders>(
    SpecialFolders.All,
  );

  const { folders, refresh: refreshFolders } = useFolders();
  const { t } = useLocalization();
  const { toggleWorldSelection, selectAllWorlds } = useSelectedWorlds();

  const { checkForUpdate } = useContext(UpdateDialogContext);

  useEffect(() => {
    checkForUpdate();
  }, []);

  useEffect(() => {
    loadAllWorlds();
  }, []);

  const isFindPage = useMemo(() => {
    return currentFolder === SpecialFolders.Find;
  }, [currentFolder]);

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
            setCurrentFolder(folderName);
            loadSelectedState(folderName);
          }
          break;
      }
    } catch (error) {
      toast(t('general:error-title'), {
        description: t('listview-page:error-load-worlds'),
      });
    }
  };

  const loadAllWorlds = async () => {
    try {
      const worlds = await commands.getAllWorlds();
      if (worlds.status === 'ok') {
        setWorlds(worlds.data);
      } else {
        toast(t('general:error-title'), {
          description: worlds.error,
        });
      }
    } catch (error) {
      toast(t('general:error-title'), {
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
        toast(t('general:error-title'), {
          description: worlds.error,
        });
      }
    } catch (error) {
      toast(t('general:error-title'), {
        description: t('listview-page:error-load-worlds'),
      });
    }
  };
  const openHiddenFolder = async () => {
    info('Opening hidden worlds');
    try {
      const hiddenWorlds = await commands.getHiddenWorlds();
      if (hiddenWorlds.status === 'error') {
        toast('Error', {
          description: hiddenWorlds.error as string,
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
      toast('Error', {
        description: 'Failed to load hidden worlds',
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
      toast(t('listview-page:world-added-title'), {
        description: t('listview-page:world-added-description'),
      });
      await refreshCurrentView();
    } catch (e) {
      error(`Failed to add world: ${e}`);
      toast(t('general:error-title'), {
        description: t('listview-page:error-add-world'),
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
        toast(t('general:error-title'), {
          description: result.error,
        });
      }
    } catch (e) {
      toast(t('general:error-title'), {
        description: t('listview-page:error-load-worlds'),
      });
      error(`Error loading worlds: ${e}`);
    }
  };

  const handleReload = async () => {
    setIsLoading(true);
    const result = await commands.getFavoriteWorlds();

    if (result.status === 'error') {
      const e = result.error;

      toast(t('general:error-title'), {
        description: e as string,
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
    toast(t('general:success-title'), {
      description: t('listview-page:worlds-fetched'),
    });
  };

  const refreshCurrentView = async () => {
    try {
      refreshFolders();
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
      toast(t('general:error-title'), {
        description: t('listview-page:error-refresh-worlds'),
      });
    }
  };

  const handleRestoreWorld = async (worldIds: string[]) => {
    try {
      const restoredWorlds = worldIds;

      // Unhide all worlds in parallel
      await Promise.all(worldIds.map((id) => commands.unhideWorld(id)));

      toast(t('listview-page:restored-title'), {
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
                  toast(t('listview-page:worlds-hidden-title'), {
                    description: t('listview-page:worlds-hidden-again'),
                  });
                } catch (e) {
                  error(`Failed to restore worlds: ${e}`);
                  toast(t('general:error-title'), {
                    description: t('listview-page:error-hide-world'),
                  });
                }
              }}
            >
              {t('listview-page:undo-button')}
            </Button>
          </div>
        ),
      });

      await refreshCurrentView();
    } catch (e) {
      error(`Failed to restore worlds: ${e}`);
      toast(t('general:error-title'), {
        description: t('listview-page:error-restore-worlds'),
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

      toast(t('listview-page:worlds-removed-title'), {
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
                  toast(t('listview-page:restored-title'), {
                    description: t('listview-page:worlds-restored-to-folder'),
                  });
                } catch (e) {
                  error(`Failed to restore worlds: ${e}`);
                  toast(t('general:error-title'), {
                    description: t('listview-page:error-restore-worlds'),
                  });
                }
              }}
            >
              {t('listview-page:undo-button')}
            </Button>
          </div>
        ),
        className: 'relative',
        style: {
          '--progress': '100%',
        } as React.CSSProperties,
      });

      await refreshCurrentView();
    } catch (e) {
      error(`Failed to remove worlds from folder: ${e}`);
      toast(t('general:error-title'), {
        description: t('listview-page:error-remove-from-folder'),
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
          folders.some((f) => f.name === folder),
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
                    });
                  }
                }}
              >
                {t('listview-page:undo-button')}
              </Button>
            </div>
          ),
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
    region: InstanceRegion,
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
      });
    }
  };

  const createGroupInstance = async (
    worldId: string,
    region: InstanceRegion,
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
      });
      throw new Error('Group permissions not found');
    }
  };

  const handleDeleteWorld = async (worldId: string) => {
    try {
      const result = await commands.deleteWorld(worldId);

      if (result.status === 'error') {
        toast({
          title: t('general:error-title'),
          description: t('listview-page:error-delete-world'),
        });
        return;
      }

      await refreshCurrentView();
      toast({
        title: t('general:success-title'),
        description: t('listview-page:world-deleted-success'),
      });
    } catch (e) {
      error(`Failed to delete world: ${e}`);
      toast({
        title: t('general:error-title'),
        description: t('listview-page:error-delete-world'),
      });
    }
  };

  const loadCardSize = async () => {
    try {
      const result = await commands.getCardSize();
      if (result.status === 'ok') {
        setCardSize(result.data);
      }
    } catch (e) {
      error(`Failed to load card size: ${e}`);
      toast({
        title: t('general:error-title'),
        description: t('listview-page:error-load-card-size'),
      });
    }
  };

  useEffect(() => {
    loadCardSize();
  }, [showSettings]);

  const [filteredWorlds, setFilteredWorlds] = useState<WorldDisplayData[]>(
    worlds || [],
  );

  useEffect(() => {
    // Synchronous filtering (except memotext)
    const baseFiltered = worlds.filter((world) => {
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

    // Perform filtering, including memo text if applicable
    const filterWorlds = async () => {
      let memoTextWorldIds = null;
      if (memoTextFilter) {
        try {
          const result = await commands.searchMemoText(memoTextFilter);
          if (result.status === 'ok') {
            memoTextWorldIds = new Set(result.data);
          } else {
            toast({
              title: t('general:error-title'),
              description: result.error,
            });
          }
        } catch (e) {
          error(`Error searching memo text: ${e}`);
          toast({
            title: t('general:error-title'),
            description: t('listview-page:error-search-memo-text'),
          });
        }
      }

      const finalFiltered = worlds.filter((world) =>
        doesWorldMatchFilters(
          world,
          searchQuery,
          authorFilter,
          tagFilters,
          folderFilters,
          memoTextWorldIds,
        ),
      );
      setFilteredWorlds(finalFiltered);
    };

    filterWorlds();
  }, [
    worlds,
    searchQuery,
    authorFilter,
    tagFilters,
    folderFilters,
    memoTextFilter,
  ]);

  const getDefaultDirection = (field: SortField): 'asc' | 'desc' => {
    switch (field) {
      case 'visits':
      case 'favorites':
      case 'capacity':
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
        case 'visits':
          return multiplier * (a.visits - b.visits);
        case 'favorites':
          return multiplier * (a.favorites - b.favorites);
        case 'capacity':
          return multiplier * (a.capacity - b.capacity);
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
    setMemoTextFilter('');
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
          onDataChange={refreshFolders}
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
            // Reverse the worlds array to ensure the most recently added worlds appear first in the folder dialog.
            setSelectedWorldsForFolder(worlds.slice().reverse());
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
                  <Input
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
                  <SelectItem value="visits">
                    {t('world-grid:sort-visits')}
                  </SelectItem>
                  <SelectItem value="favorites">
                    {t('world-grid:sort-favorites')}
                  </SelectItem>
                  <SelectItem value="capacity">
                    {t('world-grid:sort-capacity')}
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
          {authorFilter ||
          tagFilters.length > 0 ||
          folderFilters.length > 0 ||
          memoTextFilter ? (
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
                {/* MEMO TEXT - Add this block */}
                {memoTextFilter && (
                  <div
                    ref={memoTextRef}
                    className="flex items-center gap-2 shrink-0"
                  >
                    <span className="text-xs text-muted-foreground">
                      {t('general:memo')}:
                    </span>
                    <Badge
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      <span
                        className="max-w-[120px] truncate"
                        title={memoTextFilter}
                      >
                        {memoTextFilter}
                      </span>
                      <X
                        className="h-3 w-3 cursor-pointer hover:bg-muted-foreground/20 rounded-full"
                        onClick={() => setMemoTextFilter('')}
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

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    (async () => {
      unsubscribe = await onOpenUrl((urls) => {
        console.log('deep link:', urls);
        //vrc-worlds-manager://vrcwm.raifaworks.com/folder/import/${uuid}
        //call handleImportFolder with the uuid
        const importRegex =
          /vrc-worlds-manager:\/\/vrcwm\.raifaworks\.com\/folder\/import\/([a-zA-Z0-9-]+)/;
        const match = urls[0].match(importRegex);
        if (match && match[1]) {
          const uuid = match[1];
          handleImportFolder(uuid);
        }
      });
    })();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const handleImportFolder = async (UUID: string) => {
    try {
      const result = await commands.downloadFolder(UUID);
      if (result.status === 'ok') {
        const folderName = result.data[0];
        const hiddenWorlds = result.data[1];
        await refreshFolders();
        setShowCreateFolder(false);
        handleSelectFolder('folder', folderName);
        if (hiddenWorlds.length > 0) {
          setShowImportedFolderContainsHidden(true);
          setContainedHiddenWorlds(hiddenWorlds);
        }
        toast({
          title: t('listview-page:folder-imported-title'),
          description: t(
            'listview-page:folder-imported-description',
            result.data[0],
          ),
        });
      } else {
        toast({
          title: t('general:error-title'),
          description: t('listview-page:error-import-folder'),
        });
      }
    } catch (e) {
      error(`Failed to import folder: ${e}`);
      toast({
        title: t('general:error-title'),
        description: t('listview-page:error-import-folder'),
      });
    }
  };

  const handleRestoreInImport = async (worlds: string[]) => {
    try {
      if (!containedHiddenWorlds || worlds.length === 0) {
        toast({
          title: t('general:error-title'),
          description: t('listview-page:error-no-hidden-worlds'),
        });
        return;
      }
      for (const world of worlds) {
        await commands.unhideWorld(world);
        await commands.addWorldToFolder(currentFolder, world);
      }
      setContainedHiddenWorlds([]);
      setShowImportedFolderContainsHidden(false);
      await refreshCurrentView();
      toast({
        title: t('listview-page:restored-hidden-worlds-title'),
        description: t(
          'listview-page:restored-hidden-worlds-description',
          containedHiddenWorlds.length,
        ),
      });
    } catch (e) {
      error(`Failed to restore hidden worlds: ${e}`);
      toast({
        title: t('general:error-title'),
        description: t('listview-page:error-restore-hidden-worlds'),
      });
    }
  };

  return (
    <div className="flex h-screen">
      <AppSidebar
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
                      {worlds.length > 0 && (
                        <DropdownMenuItem
                          className="flex items-center gap-2 cursor-pointer"
                          onClick={() => setShowShareFolder(true)}
                        >
                          <Share className="h-4 w-4" />
                          <span>{t('listview-page:share-folder')}</span>
                        </DropdownMenuItem>
                      )}
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
        onImportFolder={handleImportFolder}
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
        onDeleteWorld={handleDeleteWorld}
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
        onConfirm={(foldersToAdd, foldersToRemove) =>
          handleAddToFolders(foldersToAdd, foldersToRemove)
        }
        isFindPage={isFindPage}
        currentFolder={currentFolder}
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
      />
      <AdvancedSearchPanel
        open={showAdvancedSearch}
        authorFilter={authorFilter}
        onAuthorFilterChange={setAuthorFilter}
        tagFilters={tagFilters}
        onTagFiltersChange={setTagFilters}
        folderFilters={folderFilters}
        onFolderFiltersChange={setFolderFilters}
        memoTextFilter={memoTextFilter}
        onMemoTextFilterChange={setMemoTextFilter}
        onClose={() => setShowAdvancedSearch(false)}
      />
      <ImportedFolderContainsHidden
        open={showImportedFolderContainsHidden}
        worlds={containedHiddenWorlds}
        onOpenChange={(open) => {
          if (!open) {
            setShowImportedFolderContainsHidden(false);
          }
        }}
        onConfirm={handleRestoreInImport}
      />
    </div>
  );
}
function doesWorldMatchFilters(
  world: WorldDisplayData,
  searchQuery: string,
  authorFilter: string,
  tagFilters: string[],
  folderFilters: string[],
  memoTextWorldIds: Set<string> | null,
): boolean {
  // Text search: name or authorName (case-insensitive, also romaji)
  const textMatch =
    !searchQuery ||
    world.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    world.authorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    toRomaji(world.name).toLowerCase().includes(searchQuery.toLowerCase()) ||
    toRomaji(world.authorName)
      .toLowerCase()
      .includes(searchQuery.toLowerCase());

  // Author filter: exact match (case-insensitive)
  const authorMatch =
    !authorFilter ||
    world.authorName.toLowerCase() === authorFilter.toLowerCase();

  // Tag filters: all tags must match (AND logic, exact match with prefix)
  const tagMatch =
    tagFilters.length === 0 ||
    (world.tags &&
      tagFilters.every((searchTag) => {
        const prefixedTag = `author_tag_${searchTag}`;
        return world.tags.some(
          (worldTag) => worldTag.toLowerCase() === prefixedTag.toLowerCase(),
        );
      }));

  // Folder filters: world must be in all specified folders (AND logic, exact match)
  const folderMatch =
    folderFilters.length === 0 ||
    folderFilters.every((searchFolder) =>
      world.folders.some(
        (worldFolder) =>
          worldFolder.toLowerCase() === searchFolder.toLowerCase(),
      ),
    );

  // Memo text filter: if present, worldId must be in memoTextWorldIds
  const memoTextMatch =
    memoTextWorldIds == null || memoTextWorldIds.has(world.worldId);

  return textMatch && authorMatch && tagMatch && folderMatch && memoTextMatch;
}
