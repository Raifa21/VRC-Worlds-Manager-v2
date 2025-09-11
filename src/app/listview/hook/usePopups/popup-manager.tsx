'use client';

import { AddToFolderDialog } from '../../components/popups/add-to-folder';
import { AddWorldPopup } from '../../components/popups/add-world';
import { AdvancedSearchPanel } from '../../components/popups/advanced-search-panel';
import { CreateFolderDialog } from '../../components/popups/create-folder-popup';
import { DeleteFolderDialog } from '../../components/popups/delete-folder-popup';
import { ImportedFolderContainsHidden } from '../../components/popups/imported-folder-contains-hidden';
import { WorldDetailPopup } from '../../components/popups/world-details';
import { usePopupStore } from './store';
import { useSearchParams, usePathname } from 'next/navigation';
import { SpecialFolders, FolderType, isUserFolder } from '@/types/folders';
import { useWorlds } from '../use-worlds';
import { commands } from '@/lib/bindings';
import { error, info } from '@tauri-apps/plugin-log';
import { useLocalization } from '@/hooks/use-localization';
import { toast } from 'sonner';
import { ShareFolderPopup } from '../../components/popups/share-folder-popup';

export function PopupManager() {
  const {
    showAddToFolder,
    showAddWorld,
    showAdvancedSearchPanel,
    showCreateFolder,
    showDeleteFolder,
    showImportedFolderContainsHidden,
    showWorldDetails,
    showShareFolder,
    setPopup,
  } = usePopupStore();

  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { t } = useLocalization();

  const currentFolder: FolderType = (() => {
    // Special folders by path
    if (pathname?.includes('/folders/special/all')) return SpecialFolders.All;
    if (pathname?.includes('/folders/special/unclassified'))
      return SpecialFolders.Unclassified;
    if (pathname?.includes('/folders/special/find')) return SpecialFolders.Find;
    if (pathname?.includes('/folders/special/hidden'))
      return SpecialFolders.Hidden;
    // User folder from query param
    const user = searchParams?.get('folderName');
    return (user as FolderType) || SpecialFolders.All;
  })();

  const { refresh } = useWorlds(currentFolder);

  return (
    <>
      {showAddToFolder && (
        <AddToFolderDialog
          selectedWorlds={showAddToFolder}
          currentFolder={currentFolder}
          onClose={() => setPopup('showAddToFolder', null)}
        />
      )}
      {showAddWorld && (
        <AddWorldPopup
          currentFolder={currentFolder}
          onClose={() => setPopup('showAddWorld', false)}
        />
      )}
      {showAdvancedSearchPanel && (
        <AdvancedSearchPanel
          onClose={() => setPopup('showAdvancedSearchPanel', false)}
        />
      )}
      <CreateFolderDialog
        open={!!showCreateFolder}
        onOpenChange={(open) => setPopup('showCreateFolder', open)}
      />
      <DeleteFolderDialog
        folderName={showDeleteFolder}
        onOpenChange={(open) => !open && setPopup('showDeleteFolder', null)}
      />
      {showImportedFolderContainsHidden && (
        <ImportedFolderContainsHidden
          open={!!showImportedFolderContainsHidden}
          worlds={showImportedFolderContainsHidden}
          onOpenChange={(open) =>
            !open && setPopup('showImportedFolderContainsHidden', null)
          }
          onConfirm={async (selectedWorldIds) => {
            try {
              // Unhide all
              await Promise.all(
                selectedWorldIds.map((id) => commands.unhideWorld(id)),
              );
              // Optionally add to current user folder
              if (isUserFolder(currentFolder)) {
                await Promise.all(
                  selectedWorldIds.map((id) =>
                    commands.addWorldToFolder(currentFolder, id),
                  ),
                );
              }
              await refresh();
              toast(t('listview-page:restored-hidden-worlds-title'), {
                description: t(
                  'listview-page:restored-hidden-worlds-description',
                  selectedWorldIds.length,
                ),
              });
              setPopup('showImportedFolderContainsHidden', null);
            } catch (e) {
              error(`[PopupManager] restore hidden during import failed: ${e}`);
              toast(t('general:error-title'), {
                description: t('listview-page:error-restore-hidden-worlds'),
              });
            }
          }}
        />
      )}
      {showShareFolder && (
        <ShareFolderPopup
          open={!!showShareFolder}
          onOpenChange={(open) => setPopup('showShareFolder', open)}
          folderName={currentFolder}
        />
      )}
      {showWorldDetails && (
        <WorldDetailPopup
          open={!!showWorldDetails}
          onOpenChange={(open) =>
            setPopup('showWorldDetails', open ? showWorldDetails : null)
          }
          worldId={showWorldDetails}
          currentFolder={currentFolder}
        />
      )}
    </>
  );
}
