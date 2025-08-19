import { FolderType } from '@/types/folders';
import { useState, useCallback } from 'react';

type SelectedWorldsMap = Map<FolderType, Set<string>>; // folder -> Set of world IDs

export const useSelectedWorlds = () => {
  const [selectedWorldsMap, setSelectedWorldsMap] = useState<SelectedWorldsMap>(
    new Map(),
  );

  const toggleWorldSelection = useCallback(
    (folderId: FolderType, worldId: string) => {
      setSelectedWorldsMap((prev) => {
        const newMap = new Map(prev);
        const folderSelections = new Set(newMap.get(folderId) || []);

        if (folderSelections.has(worldId)) {
          folderSelections.delete(worldId);
        } else {
          folderSelections.add(worldId);
        }

        if (folderSelections.size === 0) {
          newMap.delete(folderId);
        } else {
          newMap.set(folderId, folderSelections);
        }

        return newMap;
      });
    },
    [],
  );

  const selectAllWorlds = useCallback(
    (folderId: FolderType, worldIds: string[]) => {
      setSelectedWorldsMap((prev) => {
        const newMap = new Map(prev);
        newMap.set(folderId, new Set(worldIds));
        return newMap;
      });
    },
    [],
  );

  const clearFolderSelections = useCallback((folderId: FolderType) => {
    setSelectedWorldsMap((prev) => {
      const newMap = new Map(prev);
      newMap.delete(folderId);
      return newMap;
    });
  }, []);

  const getSelectedWorlds = useCallback(
    (folderId: FolderType): Set<string> => {
      return selectedWorldsMap.get(folderId) || new Set();
    },
    [selectedWorldsMap],
  );

  const isWorldSelected = useCallback(
    (folderId: FolderType, worldId: string): boolean => {
      return selectedWorldsMap.get(folderId)?.has(worldId) || false;
    },
    [selectedWorldsMap],
  );

  return {
    toggleWorldSelection,
    selectAllWorlds,
    clearFolderSelections,
    getSelectedWorlds,
    isWorldSelected,
    selectedWorldsMap: selectedWorldsMap as ReadonlyMap<
      FolderType,
      ReadonlySet<string>
    >,
  };
};
