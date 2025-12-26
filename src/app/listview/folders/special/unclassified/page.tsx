'use client';

import { useLocalization } from '@/hooks/use-localization';
import { Button } from '@/components/ui/button';
import { Plus, RefreshCw } from 'lucide-react';
import WorldFolderPage from '@/app/listview/components/world-folder-page';
import { SpecialFolders } from '@/types/folders';

// Unclassified worlds page using shared layout & hook (only worlds with no folders & not hidden)
export default function UnclassifiedWorldsPage() {
  const { t } = useLocalization();

  return (
    <WorldFolderPage
      folderId={SpecialFolders.Unclassified}
      title={t('general:unclassified-worlds')}
      emptyAllMessage={t('listview-page:no-worlds-unclassified')}
      emptyFilteredMessage={t('listview-page:no-results-filtered')}
      reloadLogScope="UnclassifiedWorlds"
      renderActions={({ openAddWorld, handleReload, isLoading }) => (
        <>
          <Button
            className="flex items-center gap-2 cursor-pointer ml-2"
            variant="outline"
            onClick={openAddWorld}
          >
            <Plus className="h-4 w-4" />
            <span>{t('listview-page:add-world')}</span>
          </Button>
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
