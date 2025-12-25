import { useContext, useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import { UpdateDialogContext } from '@/components/UpdateDialogContext';
import { useLocalization } from '@/hooks/use-localization';
import { useFolders } from './use-folders';
import { usePopupStore } from './usePopups/store';
import { useWorldFilters } from './use-filters';
import { useSelectedWorldsStore } from './use-selected-worlds';
import { useWorlds } from './use-worlds';
import { commands, WorldDisplayData } from '@/lib/bindings';
import { toast } from 'sonner';
import { error } from '@tauri-apps/plugin-log';

export type UseWorldFolderPageOptions = {
  folderId: string;
  showPreReloadToast?: boolean;
  reloadLogScope?: string;
};

export type UseWorldFolderPageResult = {
  t: ReturnType<typeof useLocalization>['t'];
  gridScrollRef: RefObject<HTMLDivElement>;
  worlds: WorldDisplayData[];
  filteredWorlds: WorldDisplayData[];
  isLoading: boolean;
  selectedWorlds: string[];
  allSelected: boolean;
  handleSelectAll: () => void;
  handleReload: () => Promise<void>;
  openAddWorld: () => void;
  openMoveSelected: () => void;
  isSelectionMode: boolean;
};

export const useWorldFolderPage = (
  options: UseWorldFolderPageOptions,
): UseWorldFolderPageResult => {
  const {
    folderId,
    showPreReloadToast = false,
    reloadLogScope = folderId,
  } = options;

  const gridScrollRef = useRef<HTMLDivElement>(null!);
  const { t } = useLocalization();
  const { checkForUpdate } = useContext(UpdateDialogContext);
  const { refresh: refreshFolders } = useFolders();
  const { worlds, refresh, isLoading } = useWorlds(folderId);
  const { filteredWorlds } = useWorldFilters(worlds);
  const setPopup = usePopupStore((s) => s.setPopup);
  const {
    getSelectedWorlds,
    isSelectionMode,
    selectAllWorlds,
    clearFolderSelections,
  } = useSelectedWorldsStore();

  const selectedWorlds = Array.from(getSelectedWorlds(folderId));
  const selectedWorldIdSet = new Set(selectedWorlds);

  const allSelected =
    filteredWorlds.length > 0 &&
    selectedWorlds.length === filteredWorlds.length &&
    filteredWorlds.every((world) => selectedWorldIdSet.has(world.worldId));

  const handleSelectAll = () => {
    if (allSelected) {
      clearFolderSelections(folderId);
    } else {
      const worldIds = filteredWorlds.map((world) => world.worldId);
      selectAllWorlds(folderId, worldIds);
    }
  };

  useEffect(() => {
    checkForUpdate();
  }, [checkForUpdate]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'a') {
        e.preventDefault();
        setPopup('showAddWorld', true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setPopup]);

  const handleReload = async () => {
    try {
      if (showPreReloadToast) {
        toast.info(t('listview-page:reloading-worlds'), { duration: 5000 });
      }

      const favs = await commands.getFavoriteWorlds();
      if (favs.status === 'error') {
        toast(t('general:error-title'), { description: favs.error });
        return;
      }

      await refresh();
      await refreshFolders();
      toast(t('general:success-title'), {
        description: t('listview-page:worlds-fetched'),
      });
    } catch (e) {
      error(`[${reloadLogScope}] reload failed: ${e}`);
      toast.error(t('general:error-title'), {
        description: t('listview-page:error-refresh-worlds'),
      });
    }
  };

  const openAddWorld = () => setPopup('showAddWorld', true);
  const openMoveSelected = () =>
    setPopup(
      'showAddToFolder',
      worlds.filter((w) => selectedWorlds.includes(w.worldId)),
    );

  return {
    t,
    gridScrollRef,
    worlds,
    filteredWorlds,
    isLoading,
    selectedWorlds,
    allSelected,
    handleSelectAll,
    handleReload,
    openAddWorld,
    openMoveSelected,
    isSelectionMode,
  };
};
