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
import { useSelectedWorldsStore } from '../../hook/use-selected-worlds';

export default function UserFolder() {
  // filter references for ui
  const gridScrollRef = useRef<HTMLDivElement>(null);

  const searchParams = useSearchParams();
  const folderName = searchParams.get('folderName') || '';

  // worlds
  const { worlds, isLoading } = useWorlds(folderName);

  const setPopup = usePopupStore((state) => state.setPopup);

  const { t } = useLocalization();

  // check for updates
  const { checkForUpdate } = useContext(UpdateDialogContext);

  useEffect(() => {
    checkForUpdate();
  }, []);

  // Initialize / update filtering for this folder's worlds
  const { filteredWorlds } = useWorldFilters(worlds);

  const {
    getSelectedWorlds,
    isSelectionMode,
    selectAllWorlds,
    clearFolderSelections,
  } = useSelectedWorldsStore();

  const selectedWorlds = Array.from(getSelectedWorlds(folderName));

  // Check if all filtered worlds are selected
  const allSelected =
    filteredWorlds.length > 0 &&
    selectedWorlds.length === filteredWorlds.length &&
    filteredWorlds.every((world) => selectedWorlds.includes(world.worldId));

  const handleSelectAll = () => {
    if (allSelected) {
      clearFolderSelections(folderName);
    } else {
      const worldIds = filteredWorlds.map((world) => world.worldId);
      selectAllWorlds(folderName, worldIds);
    }
  };

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

  return (
    <div className="flex h-screen">
      <div ref={gridScrollRef} className="flex-1 flex flex-col overflow-auto">
        <div className="p-4 flex justify-between items-center">
          <h1 className="text-xl font-bold truncate">{folderName}</h1>
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
            <div className="flex items-center ml-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 flex items-center gap-2 mr-1"
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
