import { WorldDisplayData } from '@/lib/bindings';
import { create } from 'zustand';

interface PopupState {
  showAddToFolder: WorldDisplayData[] | null;
  showAddWorld: boolean;
  showAdvancedSearchPanel: boolean;
  showCreateFolder: boolean;
  showDeleteFolder: string | null;
  showImportedFolderContainsHidden: WorldDisplayData[] | null;
  showWorldDetails: string | null;
  showShareFolder: boolean;
  setPopup: <K extends keyof PopupState>(key: K, value: PopupState[K]) => void;
  resetPopups: () => void;
}

export const usePopupStore = create<PopupState>((set) => ({
  showAddToFolder: null,
  showAddWorld: false,
  showAdvancedSearchPanel: false,
  showCreateFolder: false,
  showDeleteFolder: null,
  showImportedFolderContainsHidden: null,
  showWorldDetails: null,
  showShareFolder: false,
  setPopup: (key, value) => set({ [key]: value }),
  resetPopups: () =>
    set({
      showAddToFolder: null,
      showAddWorld: false,
      showAdvancedSearchPanel: false,
      showCreateFolder: false,
      showDeleteFolder: null,
      showImportedFolderContainsHidden: null,
      showShareFolder: false,
    }),
}));
