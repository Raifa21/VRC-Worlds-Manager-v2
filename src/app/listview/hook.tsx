import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

export function useFolders() {
  const [folders, setFolders] = useState<string[]>([]);

  const loadFolders = async () => {
    try {
      const result = await invoke<string[]>('get_folders');
      console.log('Folders:', result);
      setFolders(result);
    } catch (error) {
      console.error('Failed to load folders:', error);
    }
  };

  useEffect(() => {
    loadFolders();
  }, []);

  return { folders, loadFolders };
}
