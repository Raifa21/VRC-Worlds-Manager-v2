'use client';

import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useToast } from '@/hooks/use-toast';
import { CreateFolderDialog } from '@/components/create-folder-dialog';
import { useFolders } from '../listview/hook';
import { AppSidebar } from '@/components/app-siderbar';
import { WorldDisplayData } from '@/components/world-card';
import { WorldGrid } from '@/components/world-grid';
import { CardSize } from '../setup/page';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react'; // For the reload icon
import { commands } from '@/lib/bindings';

// enum for special folders
export enum SpecialFolders {
  All = 'All Worlds',
  Unclassified = 'Unclassified Worlds',
  Discover = 'Discover Worlds',
}

export default function ListView() {
  const { folders, loadFolders } = useFolders();
  const { toast } = useToast();
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [worlds, setWorlds] = useState<WorldDisplayData[]>([]);
  const [cardSize, setCardSize] = useState<CardSize>(CardSize.Normal);
  const [currentFolder, setCurrentFolder] = useState<string | SpecialFolders>(
    SpecialFolders.All,
  );

  useEffect(() => {
    loadAllWorlds();
  }, []);

  const handleAddFolder = () => {
    setShowCreateFolder(true);
  };

  const handleSelectFolder = async (
    type:
      | SpecialFolders.All
      | SpecialFolders.Discover
      | SpecialFolders.Unclassified
      | 'folder',
    folderName?: string,
  ) => {
    try {
      switch (type) {
        case SpecialFolders.All:
          await loadAllWorlds();
          break;
        case SpecialFolders.Discover:
          // Handle discover folder if needed
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

  return (
    <div className="flex h-screen">
      <AppSidebar
        folders={folders}
        onFoldersChange={loadFolders}
        onAddFolder={handleAddFolder}
        onSelectFolder={handleSelectFolder}
        selectedFolder={currentFolder}
      />
      <div className="flex-1 flex flex-col">
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
          />
        </div>
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
    </div>
  );
}
