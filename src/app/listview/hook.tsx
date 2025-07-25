import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { warn, debug, trace, info, error } from '@tauri-apps/plugin-log';
import { commands } from '@/lib/bindings';

export function useFolders() {
  const [folders, setFolders] = useState<[string, number][]>([]);

  const loadFolders = async () => {
    try {
      const result = await commands.getFolders();
      if (result.status !== 'ok') {
        throw new Error(`Failed to load folders: ${result.error}`);
      }

      setFolders(result.data);
    } catch (e) {
      error(`Error loading folders: ${e}`);
    }
  };

  useEffect(() => {
    loadFolders();
  }, []);

  return { folders, loadFolders };
}
