'use client';

import { useEffect, useRef, useContext } from 'react';
import { useLocalization } from '@/hooks/use-localization';
import { useWorlds } from '../../../hook/use-worlds';
import { useWorldFilters } from '../../../hook/use-filters';
import { SearchBar } from '../../../components/searchbar';
import { WorldGrid } from '../../../components/world-grid';
import { WorldGridSkeleton } from '../../../components/world-grid/skeleton';
import { useFolders } from '../../../hook/use-folders';
import { usePopupStore } from '../../../hook/usePopups/store';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Menu, Plus, RefreshCw } from 'lucide-react';
import { info, error } from '@tauri-apps/plugin-log';
import { toast } from 'sonner';
import { UpdateDialogContext } from '@/components/UpdateDialogContext';
import { SpecialFolders } from '@/types/folders';
import { commands } from '@/lib/bindings';
import { onOpenUrl } from '@tauri-apps/plugin-deep-link';
import { useSelectedWorldsStore } from '../../../hook/use-selected-worlds';

// Unclassified worlds page using shared hooks (only worlds with no folders & not hidden)
export default function UnclassifiedWorldsPage() {
  const gridScrollRef = useRef<HTMLDivElement>(null);
  const { t } = useLocalization();
  const { checkForUpdate } = useContext(UpdateDialogContext);
  const { worlds, refresh, isLoading } = useWorlds(SpecialFolders.Unclassified);
  const { filteredWorlds } = useWorldFilters(worlds);
  const setPopup = usePopupStore((s) => s.setPopup);
  const { refresh: refreshFolders } = useFolders();
  const {
    getSelectedWorlds,
    isSelectionMode,
    selectAllWorlds,
    clearFolderSelections,
  } = useSelectedWorldsStore();

  const selectedWorlds = Array.from(
    getSelectedWorlds(SpecialFolders.Unclassified),
  );

  // Check if all filtered worlds are selected
  const allSelected =
    filteredWorlds.length > 0 &&
    selectedWorlds.length === filteredWorlds.length &&
    filteredWorlds.every((world) => selectedWorlds.includes(world.worldId));

  const handleSelectAll = () => {
    if (allSelected) {
      clearFolderSelections(SpecialFolders.Unclassified);
    } else {
      const worldIds = filteredWorlds.map((world) => world.worldId);
      selectAllWorlds(SpecialFolders.Unclassified, worldIds);
    }
  };

  useEffect(() => {
    checkForUpdate();
  }, [checkForUpdate]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // CTRL + A - Open add world popup
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
      error(`[UnclassifiedWorlds] reload failed: ${e}`);
      toast(t('general:error-title'), {
        description: t('listview-page:error-refresh-worlds'),
      });
    }
  };

  return (
    <div className="flex h-screen">
      <div ref={gridScrollRef} className="flex-1 flex flex-col overflow-auto">
        <div className="p-4 flex justify-between items-center">
          <h1 className="text-xl font-bold truncate">
            {t('general:unclassified-worlds')}
          </h1>
          <div className="flex items-center">
            {isSelectionMode && filteredWorlds.length > 0 && (
              <Button
                variant="outline"
                onClick={handleSelectAll}
                className="flex items-center gap-2 cursor-pointer"
              >
                <span>
                  {allSelected
                    ? t('general:clear-all')
                    : t('general:select-all')}
                </span>
              </Button>
            )}
            <Button
              className="flex items-center gap-2 cursor-pointer ml-2"
              variant="outline"
              onClick={() => setPopup('showAddWorld', true)}
            >
              <Plus className="h-4 w-4" />
              <span>{t('listview-page:add-world')}</span>
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="ml-2"
              onClick={handleReload}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div>
          <SearchBar currentFolder={SpecialFolders.Unclassified} />
          <div className="flex-1">
            {isLoading && worlds.length === 0 ? (
              <WorldGridSkeleton />
            ) : filteredWorlds.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                {worlds.length === 0
                  ? t('listview-page:no-worlds-unclassified')
                  : t('listview-page:no-results-filtered')}
              </div>
            ) : (
              <WorldGrid
                worlds={filteredWorlds}
                currentFolder={SpecialFolders.Unclassified}
                containerRef={gridScrollRef}
              />
            )}
          </div>
        </div>

        {/* Floating action button when worlds are selected */}
        {selectedWorlds.length > 0 && (
          <div
            className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 flex justify-center pointer-events-none w-full"
            style={{ left: 'calc(50% + 125px)' }}
          >
            <div className="pointer-events-auto relative inline-block">
              <div
                className="absolute inset-0 rounded-lg bg-background"
                style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
                aria-hidden="true"
              />
              <Button
                variant="default"
                size="lg"
                className="rounded-lg flex items-center gap-2 px-4 py-3 relative"
                onClick={() =>
                  setPopup(
                    'showAddToFolder',
                    worlds.filter((w) => selectedWorlds.includes(w.worldId)),
                  )
                }
              >
                <Plus className="w-5 h-5" />
                <span className="text-md font-semibold">
                  {t('world-grid:move-title')}
                </span>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
