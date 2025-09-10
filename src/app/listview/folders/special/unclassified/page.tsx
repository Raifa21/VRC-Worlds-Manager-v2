'use client';

import { useEffect, useRef, useContext } from 'react';
import { useLocalization } from '@/hooks/use-localization';
import { useWorlds } from '../../../hook/use-worlds';
import { useWorldFilters } from '../../../hook/use-filters';
import { SearchBar } from '../../../components/searchbar';
import { WorldGrid } from '../../../components/world-grid';
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

// Unclassified worlds page using shared hooks (only worlds with no folders & not hidden)
export default function UnclassifiedWorldsPage() {
  const gridScrollRef = useRef<HTMLDivElement>(null);
  const { t } = useLocalization();
  const { checkForUpdate } = useContext(UpdateDialogContext);
  const { worlds, refresh } = useWorlds(SpecialFolders.Unclassified);
  const { filteredWorlds } = useWorldFilters(worlds);
  const setPopup = usePopupStore((s) => s.setPopup);
  const { refresh: refreshFolders } = useFolders();

  useEffect(() => {
    checkForUpdate();
  }, [checkForUpdate]);

  useEffect(() => {
    info(
      `[UnclassifiedWorlds] raw=${worlds.length} filtered=${filteredWorlds.length}`,
    );
  }, [worlds, filteredWorlds]);

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
            {t('general:unclassified')}
          </h1>
          <div className="flex items-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 flex items-center gap-2 ml-2 mr-1"
                >
                  <Menu className="h-10 w-10" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="flex items-center gap-2 cursor-pointer"
                  onClick={() => setPopup('showAddWorld', true)}
                >
                  <Plus className="h-4 w-4" />
                  <span>{t('listview-page:add-world')}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
            {filteredWorlds.length === 0 ? (
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
      </div>
    </div>
  );
}
