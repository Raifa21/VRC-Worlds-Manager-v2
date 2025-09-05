import { FolderType } from '@/types/folders';
import { create } from 'zustand';

type SelectedWorldsMap = Map<FolderType, Set<string>>;

interface SelectedWorldsState {
  selectedWorldsMap: SelectedWorldsMap;
  toggleWorldSelection: (folderId: FolderType, worldId: string) => void;
  selectAllWorlds: (folderId: FolderType, worldIds: string[]) => void;
  clearFolderSelections: (folderId: FolderType) => void;
  getSelectedWorlds: (folderId: FolderType) => Set<string>;
  isWorldSelected: (folderId: FolderType, worldId: string) => boolean;
  isSelectionMode: boolean;
  toggleSelectionMode: () => void;
}

export const useSelectedWorldsStore = create<SelectedWorldsState>(
  (set, get) => ({
    selectedWorldsMap: new Map(),
    toggleWorldSelection: (folderId, worldId) => {
      set((state) => {
        const newMap = new Map(state.selectedWorldsMap);
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
        return { selectedWorldsMap: newMap };
      });
    },
    selectAllWorlds: (folderId, worldIds) => {
      set((state) => {
        const newMap = new Map(state.selectedWorldsMap);
        newMap.set(folderId, new Set(worldIds));
        return { selectedWorldsMap: newMap };
      });
    },
    clearFolderSelections: (folderId) => {
      set((state) => {
        const newMap = new Map(state.selectedWorldsMap);
        newMap.delete(folderId);
        return { selectedWorldsMap: newMap };
      });
    },
    getSelectedWorlds: (folderId) => {
      return get().selectedWorldsMap.get(folderId) || new Set();
    },
    isWorldSelected: (folderId, worldId) => {
      return get().selectedWorldsMap.get(folderId)?.has(worldId) || false;
    },
    isSelectionMode: false,
    toggleSelectionMode: () => {
      set((state) => ({ isSelectionMode: !state.isSelectionMode }));
    },
  }),
);
