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
  const [currentFolder, setCurrentFolder] = useState<string | undefined>(
    undefined,
  );

  useEffect(() => {
    const specialFolders = searchParams.get('specialFolders');
    const folder = searchParams.get('folder');
    const addFolder = searchParams.get('addFolder');

    if (addFolder === 'true') {
      console.log('Showing create folder dialog');
      setShowCreateFolder(true);
    } else if (specialFolders === 'all') {
      console.log('Loading all worlds');
      loadAllWorlds();
    } else if (specialFolders === 'unclassified') {
      console.log('Loading unclassified worlds');
      loadUnclassifiedWorlds();
    } else if (folder) {
      console.log('Loading folder:', folder);
      loadWorlds(decodeURIComponent(folder));
    } else {
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
      setCurrentFolder('All Worlds');
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
      setCurrentFolder('Unclassified');
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

      // Single navigation after all states are updated
      router.push(`/listview?folder=${encodeURIComponent(newName)}`);
      
    } catch (error) {
      console.error('Failed to create folder:', error);
      toast({
        title: 'Error',
        description: 'Failed to create folder'
      });
    }
  };

  const loadWorlds = async (folder: string) => {
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

  const handleDialogClose = () => {
    router.push(`/listview?folder=${currentFolder}`);
  };

  return (
    <div className="flex h-screen">
      <AppSidebar folders={folders} onFoldersChange={loadFolders} />
      <div className="flex-1 overflow-auto">
        <WorldGrid size={cardSize} worlds={worlds} folderName={currentFolder} />
      </div>
      <CreateFolderDialog
        open={showCreateFolder}
        onOpenChange={(open) => {
          if (!open) {
            const params = new URLSearchParams(searchParams);
            setShowCreateFolder(false);
          }
        }}
        onConfirm={handleCreateFolder}
      />
    </div>
  );
}
