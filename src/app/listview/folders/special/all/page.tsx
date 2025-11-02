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

// All worlds page (special folder: All) using shared hooks for data + filters.
export default function AllWorldsPage() {
  const gridScrollRef = useRef<HTMLDivElement>(null);
  const { t } = useLocalization();
  const { checkForUpdate } = useContext(UpdateDialogContext);
  const { worlds, refresh, isLoading } = useWorlds(SpecialFolders.All);
  const { filteredWorlds } = useWorldFilters(worlds);
  const setPopup = usePopupStore((s) => s.setPopup);
  const { refresh: refreshFolders, importFolder } = useFolders();

  useEffect(() => {
    checkForUpdate();
  }, [checkForUpdate]);

  useEffect(() => {
    info(`[AllWorlds] raw=${worlds.length} filtered=${filteredWorlds.length}`);
  }, [worlds, filteredWorlds]);

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
      toast.info(t('listview-page:reloading-worlds'), { duration: 5000 });
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
      error(`[AllWorlds] reload failed: ${e}`);
      toast.error(t('general:error-title'), {
        description: t('listview-page:error-refresh-worlds'),
      });
    }
  };

  return (
    <div className="flex h-screen">
      <div ref={gridScrollRef} className="flex-1 flex flex-col overflow-auto">
        <div className="p-4 flex justify-between items-center">
          <h1 className="text-xl font-bold truncate">
            {t('general:all-worlds')}
          </h1>
          <div className="flex items-center">
            <Button
              className="flex items-center gap-2 cursor-pointer"
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
          <SearchBar currentFolder={SpecialFolders.All} />
          <div className="flex-1">
            {isLoading && worlds.length === 0 ? (
              <WorldGridSkeleton />
            ) : filteredWorlds.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                {worlds.length === 0
                  ? t('listview-page:no-worlds-all')
                  : t('listview-page:no-results-filtered')}
              </div>
            ) : (
              <WorldGrid
                worlds={filteredWorlds}
                currentFolder={SpecialFolders.All}
                containerRef={gridScrollRef}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
