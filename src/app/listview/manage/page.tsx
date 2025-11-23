'use client';

import { useEffect, useRef, useContext } from 'react';
import { useLocalization } from '@/hooks/use-localization';
import { useWorlds } from '../hook/use-worlds';
import { useWorldFilters } from '../hook/use-filters';
import { SearchBar } from '../components/searchbar';
import { WorldGrid } from '../components/world-grid';
import { WorldGridSkeleton } from '../components/world-grid/skeleton';
import { useFolders } from '../hook/use-folders';
import { usePopupStore } from '../hook/usePopups/store';
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

export default function ManageWorldsPage() {
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

  // const handleReload = async () => {
  //   try {
  //     toast.info(t('listview-page:reloading-worlds'), { duration: 5000 });
  //     const favs = await commands.getFavoriteWorldGroups();
  //     if (favs.status === 'error') {
  //       toast(t('general:error-title'), { description: favs.error });
  //       return;
  //     }
  //     await refresh();
  //     await refreshFolders();
  //     toast(t('general:success-title'), {
  //       description: t('listview-page:worlds-fetched'),
  //     });
  //   } catch (e) {
  //     error(`[AllWorlds] reload failed: ${e}`);
  //     toast.error(t('general:error-title'), {
  //       description: t('listview-page:error-refresh-worlds'),
  //     });
  //   }
  // };

  return (
    <div className="flex h-screen">
      <div ref={gridScrollRef} className="flex-1 flex flex-col overflow-auto">
        <div className="p-4 flex justify-between items-center">
          <h1 className="text-xl font-bold truncate">
            {t('general:vrchat-favorites')}
          </h1>
          <div className="flex items-center">
            <Button
              variant="outline"
              size="icon"
              className="ml-2"
              // onClick={handleReload}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
