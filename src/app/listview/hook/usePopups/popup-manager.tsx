'use client';

import { AddToFolderDialog } from '../../components/popups/add-to-folder';
import { AddWorldPopup } from '../../components/popups/add-world';
import { AdvancedSearchPanel } from '../../components/popups/advanced-search-panel';
import { CreateFolderDialog } from '../../components/popups/create-folder-popup';
import { DeleteFolderDialog } from '../../components/popups/delete-folder-popup';
import { ImportedFolderContainsHidden } from '../../components/popups/imported-folder-contains-hidden';
import { WorldDetailPopup } from '../../components/popups/world-details';
import { usePopupStore } from './store';

export function PopupManager() {
  const {
    showAddToFolder,
    showAddWorld,
    showAdvancedSearchPanel,
    showCreateFolder,
    showDeleteFolder,
    showImportedFolderContainsHidden,
    showWorldDetails,
    setPopup,
  } = usePopupStore();

  return (
    <>
      {showAddToFolder && (
        <AddToFolderDialog
          selectedWorlds={showAddToFolder}
          onClose={() => setPopup('showAddToFolder', null)}
        />
      )}
      {showAddWorld && (
        <AddWorldPopup onClose={() => setPopup('showAddWorld', false)} />
      )}
      {showAdvancedSearchPanel && (
        <AdvancedSearchPanel
          onClose={() => setPopup('showAdvancedSearchPanel', false)}
        />
      )}
      {showCreateFolder && (
        <CreateFolderDialog
          onClose={() => setPopup('showCreateFolder', false)}
        />
      )}
      {showDeleteFolder && (
        <DeleteFolderDialog
          folderId={showDeleteFolder}
          onClose={() => setPopup('showDeleteFolder', null)}
        />
      )}
      {showImportedFolderContainsHidden && (
        <ImportedFolderContainsHidden
          onClose={() => setPopup('showImportedFolderContainsHidden', false)}
        />
      )}
      {showWorldDetails && (
        <WorldDetailPopup
          worldId={showWorldDetails}
          onClose={() => setPopup('showWorldDetails', null)}
        />
      )}
    </>
  );
}
