'use client';

import { useRef, useEffect, useContext } from 'react';
import { useLocalization } from '@/hooks/use-localization';
import { useFolders } from '@/app/listview/hook/use-folders';
import { WorldGrid } from '../../components/world-grid';
import { WorldGridSkeleton } from '../../components/world-grid/skeleton';
import { Button } from '@/components/ui/button';
import { onOpenUrl } from '@tauri-apps/plugin-deep-link';
import { Menu, Plus, Share } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UpdateDialogContext } from '@/components/UpdateDialogContext';
import { useWorlds } from '../../hook/use-worlds';
import { usePopupStore } from '../../hook/usePopups/store';
import { SearchBar } from '../../components/searchbar';
import { useSearchParams } from 'next/navigation';
import { info } from '@tauri-apps/plugin-log';
import { useWorldFilters } from '../../hook/use-filters';

export default function UserFolder() {
  // filter references for ui
  const gridScrollRef = useRef<HTMLDivElement>(null);

  const searchParams = useSearchParams();
  const folderName = searchParams.get('folderName') || '';

  // worlds
  const { worlds, isLoading } = useWorlds(folderName);

  info('Loaded worlds in folder: ' + folderName);
  info('Number of worlds: ' + worlds.length);

  const { importFolder } = useFolders();

  const setPopup = usePopupStore((state) => state.setPopup);

  const { t } = useLocalization();

  // check for updates
  const { checkForUpdate } = useContext(UpdateDialogContext);

  useEffect(() => {
    checkForUpdate();
  }, []);

  // subscribe to deep link events
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    (async () => {
      unsubscribe = await onOpenUrl((urls) => {
        info(`[UserFolder] deep link: ${JSON.stringify(urls)}`);
        //vrc-worlds-manager://vrcwm.raifaworks.com/folder/import/${uuid}
        //call handleImportFolder with the uuid
        const importRegex =
          /vrc-worlds-manager:\/\/vrcwm\.raifaworks\.com\/folder\/import\/([a-zA-Z0-9-]+)/;
        const match = urls[0].match(importRegex);
        if (match && match[1]) {
          const uuid = match[1];
          importFolder(uuid);
        }
      });
    })();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  // Initialize / update filtering for this folder's worlds
  const { filteredWorlds } = useWorldFilters(worlds);
  // Debug
  info(
    `[UserFolder] raw worlds: ${worlds.length}, filtered: ${filteredWorlds.length}`,
  );

  return (
    <div className="flex h-screen">
      <div ref={gridScrollRef} className="flex-1 flex flex-col overflow-auto">
        <div className="p-4 flex justify-between items-center">
          <h1 className="text-xl font-bold truncate">{folderName}</h1>
          <div className="flex items-center">
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
                  {worlds.length > 0 && (
                    <DropdownMenuItem
                      className="flex items-center gap-2 cursor-pointer"
                      onClick={() => setPopup('showShareFolder', true)}
                    >
                      <Share className="h-4 w-4" />
                      <span>{t('listview-page:share-folder')}</span>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        <div>
          <SearchBar currentFolder={folderName} />
          <div className="flex-1">
            {isLoading && worlds.length === 0 ? (
              <WorldGridSkeleton />
            ) : filteredWorlds.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                {worlds.length === 0
                  ? // no raw worlds in this folder / section
                    t('listview-page:no-worlds-in-folder', folderName)
                  : // there *are* worlds but filters/search cut them out
                    t('listview-page:no-results-filtered')}
              </div>
            ) : (
              <WorldGrid
                worlds={filteredWorlds}
                currentFolder={folderName}
                containerRef={gridScrollRef}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
