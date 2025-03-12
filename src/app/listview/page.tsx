'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useToast } from '@/hooks/use-toast';
import { CreateFolderDialog } from '@/components/create-folder-dialog';
import { useRouter } from 'next/navigation';
import { useFolders } from '../listview/hook';
import { AppSidebar } from '@/components/app-siderbar';
import { WorldDisplayData } from '@/components/world-card';
import { WorldGrid } from '@/components/world-grid';
import { CardSize } from '../setup/page';

export default function ListView() {
  const { folders, loadFolders } = useFolders();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [worlds, setWorlds] = useState<WorldDisplayData[]>([]);
  const [cardSize, setCardSize] = useState<CardSize>(CardSize.Normal);

  useEffect(() => {
    const specialFolders = searchParams.get('specialFolders');
    const folder = searchParams.get('folder');
    const addFolder = searchParams.get('addFolder');

    if (addFolder === 'true') {
      setShowCreateFolder(true);
    } else if (specialFolders === 'all') {
      loadAllWorlds();
    } else if (specialFolders === 'unclassified') {
      loadUnclassifiedWorlds();
    } else if (folder) {
      loadWorlds(folder);
    } else {
      // This is only when the page is first loaded
      initialize_listview();
    }
  }, [searchParams]);

  const initialize_listview = async () => {
    try {
      console.log('Initializing listview');
      await invoke<String[]>('get_folders');
      loadFolders();
      const cardSize = await invoke<CardSize>('get_card_size');
      setCardSize(cardSize);
      router.push(`/listview?specialFolders=all`);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load folders',
      });
    }
  };

  const loadAllWorlds = async () => {
    try {
      const worlds = await invoke<WorldDisplayData[]>('get_all_worlds');
      setWorlds(worlds);
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
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load worlds',
      });
    }
  };

  const handleCreateFolder = async (name: string) => {
    try {
      await invoke('create_folder', { name: name });
      await loadFolders(); // Refresh folders after creation
      console.log('Folder created:', name);
      toast({
        title: 'Success',
        description: `Folder "${name}" created`,
      });
      router.push(`/listview?folder=${name}`);
    } catch (error) {
      console.log('Failed to create folder:', error);
      toast({
        title: 'Error',
        description: 'Failed to create folder',
      });
      const params = new URLSearchParams(searchParams);
      params.delete('addFolder');
      router.push(`/listview?${params.toString()}`);
    }
  };

  const loadWorlds = async (folder: string) => {
    try {
      const worlds = await invoke<WorldDisplayData[]>('get_worlds', {
        folder_name: folder,
      });
      setWorlds(worlds);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load worlds',
      });
    }
  };

  const handleDialogClose = () => {
    const params = new URLSearchParams(searchParams);
    params.delete('addFolder');
    router.push(`/listview?${params.toString()}`);
  };

  return (
    <div className="flex h-screen">
      <AppSidebar folders={folders} onFoldersChange={loadFolders} />
      <div className="flex-1 overflow-auto">
        <WorldGrid size={cardSize} worlds={worlds} />
      </div>
      <CreateFolderDialog
        open={showCreateFolder}
        onOpenChange={(open) => {
          setShowCreateFolder(open);
          if (!open) handleDialogClose();
        }}
        onConfirm={handleCreateFolder}
      />
    </div>
  );
}
