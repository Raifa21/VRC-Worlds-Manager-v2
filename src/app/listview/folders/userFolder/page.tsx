'use client';

import { useRef, useState, useEffect, useContext } from 'react';
import { useLocalization } from '@/hooks/use-localization';
import { useFolders } from '@/app/listview/hook/use-folders';
import { WorldGrid } from '../../components/world-grid';
import { Button } from '@/components/ui/button';
import { onOpenUrl } from '@tauri-apps/plugin-deep-link';
import { Menu, Plus, Share } from 'lucide-react'; // For the reload icon
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

export default function UserFolder() {
  // filter references for ui
  const gridScrollRef = useRef<HTMLDivElement>(null);

  const searchParams = useSearchParams();
  const folderName = searchParams.get('folderName') || '';

  // worlds
  const { worlds } = useWorlds(folderName);

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
        console.log('deep link:', urls);
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

  const [sortedAndFilteredWorlds] = useState(worlds); // TODO: change to useFilter(worlds)

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
          <SearchBar />
          <div className="flex-1">
            {sortedAndFilteredWorlds.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                {worlds.length === 0
                  ? // no raw worlds in this folder / section
                    t('listview-page:no-worlds-in-folder', folderName)
                  : // there *are* worlds but filters/search cut them out
                    t('listview-page:no-results-filtered')}
              </div>
            ) : (
              <WorldGrid
                worlds={sortedAndFilteredWorlds}
                containerRef={gridScrollRef}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
