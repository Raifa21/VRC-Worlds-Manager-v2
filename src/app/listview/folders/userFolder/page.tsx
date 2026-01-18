'use client';

import { useLocalization } from '@/hooks/use-localization';
import { Button } from '@/components/ui/button';
import { Menu, Plus, Share } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSearchParams } from 'next/navigation';
import WorldFolderPage from '@/app/listview/components/world-folder-page';
import { usePopupStore } from '../../hook/usePopups/store';

export default function UserFolder() {
  const searchParams = useSearchParams();
  const folderName = searchParams.get('folderName') || '';
  const { t } = useLocalization();
  const setPopup = usePopupStore((state) => state.setPopup);

  return (
    <WorldFolderPage
      folderId={folderName}
      title={folderName}
      emptyAllMessage={t('listview-page:no-worlds-in-folder', folderName)}
      emptyFilteredMessage={t('listview-page:no-results-filtered')}
      reloadLogScope="UserFolder"
      renderActions={({ openAddWorld, worlds }) => (
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
                onClick={openAddWorld}
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
      )}
    />
  );
}
