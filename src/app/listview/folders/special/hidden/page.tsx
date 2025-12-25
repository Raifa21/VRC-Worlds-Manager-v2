'use client';

import { useLocalization } from '@/hooks/use-localization';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Menu, Plus, RefreshCw } from 'lucide-react';
import WorldFolderPage from '@/app/listview/components/world-folder-page';
import { SpecialFolders } from '@/types/folders';

// Hidden worlds page using shared layout & hook (only hidden worlds)
export default function HiddenWorldsPage() {
  const { t } = useLocalization();

  return (
    <WorldFolderPage
      folderId={SpecialFolders.Hidden}
      title={t('general:hidden-worlds')}
      emptyAllMessage={t('listview-page:no-worlds')}
      emptyFilteredMessage={t('listview-page:no-results-filtered')}
      reloadLogScope="HiddenWorlds"
      renderActions={({ openAddWorld, handleReload, isLoading }) => (
        <>
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
                onClick={openAddWorld}
              >
                <Plus className="h-4 w-4" />
                <span>{t('listview-page:add-world')}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            className="flex items-center gap-2 cursor-pointer ml-2"
            variant="outline"
            onClick={handleReload}
            disabled={isLoading}
          >
            <RefreshCw className="h-4 w-4" />
            <span>{t('general:fetch-refresh')}</span>
          </Button>
        </>
      )}
    />
  );
}
