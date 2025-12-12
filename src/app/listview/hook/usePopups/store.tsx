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
  showShareWorld: { worldId: string; worldName: string } | null;
  // Version bump to signal membership changes across components (e.g., Find badge refresh)
  membershipVersion: number;
  bumpMembershipVersion: () => void;
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
  showShareWorld: null,
  membershipVersion: 0,
  bumpMembershipVersion: () =>
    set((state) => ({ membershipVersion: state.membershipVersion + 1 })),
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
      showShareWorld: null,
      // do not reset membershipVersion here to preserve monotonicity
    }),
}));
