import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { warn, debug, trace, info, error } from '@tauri-apps/plugin-log';

export function useFolders() {
  const [folders, setFolders] = useState<string[]>([]);

  const loadFolders = async () => {
    try {
      const result = await invoke<string[]>('get_folders');
      for (const folder of result) {
        info(`Folder: ${folder}`);
      }
      setFolders(result);
    } catch (e) {
      error(`Error loading folders: ${e}`);
    }
  };

  useEffect(() => {
    loadFolders();
  }, []);

  return { folders, loadFolders };
}
