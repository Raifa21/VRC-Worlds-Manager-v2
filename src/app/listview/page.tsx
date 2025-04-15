'use client';

import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useToast } from '@/hooks/use-toast';
import { CreateFolderDialog } from '@/components/create-folder-dialog';
import { useFolders } from '../listview/hook';
import { AppSidebar } from '@/components/app-sidebar';
import { WorldDisplayData } from '@/types/worlds';
import { WorldGrid } from '@/components/world-grid';
import { CardSize } from '@/types/preferences';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react'; // For the reload icon
import { commands } from '@/lib/bindings';
import { AboutSection } from '@/components/about-section';
import { SettingsPage } from '@/components/settings-page';
import { WorldDetailPopup } from '@/components/world-detail-popup';
import { AddToFolderDialog } from '@/components/add-to-folder-dialog';
import { GroupInstanceType, InstanceType, Region } from '@/types/instances';
import {
  GroupInstanceCreatePermission,
  UserGroup,
  GroupInstanceCreateAllowedType,
  GroupInstancePermissionInfo,
} from '@/lib/bindings';
import { SpecialFolders } from '@/types/folders';
import { DiscoverPage } from '@/components/discover-page';

export default function ListView() {
  const { folders, loadFolders } = useFolders();
  const { toast } = useToast();
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showDiscover, setShowDiscover] = useState(false);
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
    WorldDisplayData[]
  >([]);

  useEffect(() => {
    loadAllWorlds();
  }, []);

  const handleSelectFolder = async (
    type:
      | SpecialFolders.All
      | SpecialFolders.Discover
      | SpecialFolders.Unclassified
      | 'folder',
    folderName?: string,
  ) => {
    try {
      setShowAbout(false);
      setShowSettings(false);
      setShowDiscover(false);
      switch (type) {
        case SpecialFolders.All:
          await loadAllWorlds();
          break;
        case SpecialFolders.Discover:
          setShowDiscover(true);
          break;
        case SpecialFolders.Unclassified:
          await loadUnclassifiedWorlds();
          break;
        case 'folder':
          if (folderName) {
            await loadFolderContents(folderName);
          }
          break;
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load worlds',
        duration: 3000,
      });
    }
  };

  const loadAllWorlds = async () => {
    try {
      const worlds = await invoke<WorldDisplayData[]>('get_all_worlds');
      setWorlds(worlds);
      setCurrentFolder(SpecialFolders.All);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load worlds',
      });
    }
  };
  const loadUnclassifiedWorlds = async () => {
    try {
      const worlds = await invoke<WorldDisplayData[]>(
        'get_unclassified_worlds',
      );
      setWorlds(worlds);
      setCurrentFolder(SpecialFolders.Unclassified);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load worlds',
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
    } catch (error) {
      console.error('Failed to create folder:', error);
      toast({
        title: 'Error',
        description: 'Failed to create folder',
      });
    }
  };

  const loadFolderContents = async (folder: string) => {
    try {
      console.log('Folder:', folder);
      const worlds = await invoke<WorldDisplayData[]>('get_worlds', {
        folderName: folder,
      });
      console.log('Worlds:', worlds);
      setWorlds(worlds);
      setCurrentFolder(folder);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load worlds',
      });
      console.log('Failed to load worlds:', error);
    }
  };

  const handleReload = async () => {
    const result = await commands.getFavoriteWorlds();

    if (result.status === 'error') {
      const error = result.error;

      toast({
        title: 'Error',
        description: error as string,
        variant: 'destructive',
      });
      console.error('Failed to reload:', error);
      return;
    }
    if (currentFolder === SpecialFolders.All) {
      await loadAllWorlds();
    } else if (currentFolder === SpecialFolders.Unclassified) {
      await loadUnclassifiedWorlds();
    } else if (currentFolder) {
      await loadFolderContents(currentFolder);
    }

    toast({
      title: 'Success',
      description: 'Worlds fetched successfully!',
      duration: 2000,
    });
  };

  const refreshCurrentView = async () => {
    try {
      console.log('Refreshing current view');
      console.log('Current folder:', currentFolder);
      switch (currentFolder) {
        case SpecialFolders.All:
          await loadAllWorlds();
          break;
        case SpecialFolders.Unclassified:
          await loadUnclassifiedWorlds();
          break;
        default:
          if (currentFolder) {
            await loadFolderContents(currentFolder);
          }
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to refresh worlds',
        duration: 3000,
      });
    }
  };

  const handleHideWorld = async (worldId: string[], worldName: string[]) => {
    try {
      for (const id of worldId) {
        await commands.hideWorld(id);
      }

      toast({
        title: 'Worlds hidden',
        description: (
          <div className="flex w-full items-center justify-between gap-2">
            <span>
              {worldName.length > 1
                ? `Hidden "${worldName[0]}" and ${worldName.length - 1} more worlds`
                : `Hidden "${worldName[0]}"`}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  for (const id of worldId) {
                    await commands.unhideWorld(id);
                  }
                  await refreshCurrentView();
                  toast({
                    title: 'Restored',
                    description: 'Worlds restored from hidden',
                  });
                } catch (error) {
                  console.error('Failed to restore worlds:', error);
                  toast({
                    title: 'Error',
                    description: 'Failed to restore worlds',
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
    } catch (error) {
      console.error('Failed to hide world:', error);
      toast({
        title: 'Error',
        description: 'Failed to hide world',
        variant: 'destructive',
      });
    }
  };

  const removeWorldsFromFolder = async (worldIds: string[]) => {
    try {
      // Store the world IDs for potential undo
      const removedWorlds = worldIds;

      for (const id of worldIds) {
        await commands.removeWorldFromFolder(currentFolder, id);
      }
      toast({
        title: 'Worlds removed',
        description: (
          <div className="flex w-full items-center justify-between gap-2">
            <span>Removed from {currentFolder}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  // Restore the worlds
                  for (const id of removedWorlds) {
                    await commands.addWorldToFolder(currentFolder, id);
                  }
                  await refreshCurrentView();
                  toast({
                    title: 'Restored',
                    description: 'Worlds restored to folder',
                  });
                } catch (error) {
                  console.error('Failed to restore worlds:', error);
                  toast({
                    title: 'Error',
                    description: 'Failed to restore worlds',
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
    } catch (error) {
      console.error('Failed to remove worlds:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove worlds from folder',
        variant: 'destructive',
      });
    }
  };

  const handleAddToFolders = async (
    worldsToAdd: WorldDisplayData[],
    foldersToAdd: string[],
    foldersToRemove: string[],
  ) => {
    try {
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
      for (const folder of foldersToAdd) {
        for (const world of worldsToAdd) {
          await commands.addWorldToFolder(folder, world.worldId);
        }
      }

      for (const folder of foldersToRemove) {
        for (const world of worldsToAdd) {
          await commands.removeWorldFromFolder(folder, world.worldId);
        }
      }

      toast({
        title: 'Folders updated',
        description: (
          <div className="flex w-full items-center justify-between gap-2">
            <span>
              {worldsToAdd.length > 1
                ? `Updated folders for "${worldsToAdd[0].name}" and ${worldsToAdd.length - 1} more worlds`
                : `Updated folders for "${worldsToAdd[0].name}"`}
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
                    title: 'Restored',
                    description: 'Folder changes undone',
                  });
                } catch (error) {
                  console.error('Failed to undo folder changes:', error);
                  toast({
                    title: 'Error',
                    description: 'Failed to undo folder changes',
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
      setShowFolderDialog(false);
      setSelectedWorldsForFolder([]);
    } catch (error) {
      console.error('Failed to update folders:', error);
      toast({
        title: 'Error',
        description: 'Failed to update folders',
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
          title: 'Error',
          description: error as string,
          variant: 'destructive',
        });
        return;
      }

      await refreshCurrentView();
      toast({
        title: 'Success',
        description: `Created ${instanceType} instance`,
      });
    } catch (error) {
      console.error('Failed to create instance:', error);
      toast({
        title: 'Error',
        description: 'Failed to create instance',
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
        title: 'Success',
        description: `Created ${instanceType} instance`,
      });
    } catch (error) {
      console.error('Failed to create group instance:', error);
      toast({
        title: 'Error',
        description: 'Failed to create group instance',
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
    } catch (error) {
      console.error('Failed to get groups:', error);
      toast({
        title: 'Error',
        description: 'Failed to get groups',
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
    } catch (error) {
      console.error('Failed to get group permissions:', error);
      toast({
        title: 'Error',
        description: 'Failed to get group permissions',
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
    } catch (error) {
      console.error('Failed to load card size:', error);
      toast({
        title: 'Error',
        description: 'Failed to load card size preference',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    loadCardSize();
  }, [showSettings]);

  const renderMainContent = () => {
    if (showAbout) {
      return <AboutSection />;
    }

    if (showSettings) {
      return <SettingsPage onCardSizeChange={loadCardSize} />;
    }

    if (showDiscover) {
      return <DiscoverPage />;
    }

    return (
      <>
        <div className="p-4 flex justify-between items-center">
          <h1 className="text-xl font-bold">{currentFolder}</h1>
          <Button
            variant="outline"
            size="icon"
            onClick={handleReload}
            className="ml-2"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-auto">
          <WorldGrid
            size={cardSize}
            worlds={worlds}
            folderName={currentFolder}
            onWorldChange={refreshCurrentView}
            onRemoveFromFolder={removeWorldsFromFolder}
            onHideWorld={handleHideWorld}
            onOpenWorldDetails={handleOpenWorldDetails}
            onShowFolderDialog={(worlds) => {
              setSelectedWorldsForFolder(worlds);
              setShowFolderDialog(true);
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
          setShowDiscover(false);
          setShowWorldDetails(false);
        }}
        onSelectSettings={() => {
          setShowSettings(true);
          setShowAbout(false);
          setShowDiscover(false);
          setShowWorldDetails(false);
        }}
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
      />
      <AddToFolderDialog
        open={showFolderDialog}
        onOpenChange={setShowFolderDialog}
        selectedWorlds={selectedWorldsForFolder}
        folders={folders}
        onConfirm={(foldersToAdd, foldersToRemove) =>
          handleAddToFolders(
            selectedWorldsForFolder,
            foldersToAdd,
            foldersToRemove,
          )
        }
      />
    </div>
  );
}
