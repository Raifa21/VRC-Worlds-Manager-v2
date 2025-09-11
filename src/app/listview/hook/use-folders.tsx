import useSWR, { mutate } from 'swr';
import { commands, FolderData } from '@/lib/bindings';
import { toast } from 'sonner';
import { useLocalization } from '../../../hooks/use-localization';
import { usePathname, useRouter } from 'next/navigation';
import { usePopupStore } from './usePopups/store';

const fetchFolders = async (): Promise<FolderData[]> => {
  const result = await commands.getFolders();
  if (result.status === 'ok') return result.data;
  throw new Error(result.error);
};

const createFolderCommand = async (name: string) => {
  return await commands.createFolder(name);
};

const deleteFolderCommand = async (name: string) => {
  return await commands.deleteFolder(name);
};

const renameFolderCommand = async (oldName: string, newName: string) => {
  return await commands.renameFolder(oldName, newName);
};

const moveFolderCommand = async (
  folderName: string,
  destinationIndex: number,
) => {
  return await commands.moveFolder(folderName, destinationIndex);
};

export function useFolders() {
  const { t } = useLocalization();

  const router = useRouter();

  const setPopup = usePopupStore((state) => state.setPopup);

  const {
    data: folders = [],
    error,
    isLoading,
    mutate: refresh,
  } = useSWR<FolderData[]>('folders', fetchFolders, {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    errorRetryCount: 3,
    errorRetryInterval: 2000,
  });

  const createFolder = async (name: string): Promise<void> => {
    const result = await createFolderCommand(name);
    if (result.status !== 'ok') {
      toast(t('general:error-title'), {
        description: t('listview-page:error-create-folder'),
      });
      throw new Error(result.error);
    } else {
      toast(t('listview-page:folder-created-title'), {
        description: t('listview-page:folder-created-description', name),
        duration: 2000,
      });
    }
    mutate('folders');
  };

  const deleteFolder = async (name: string): Promise<void> => {
    const result = await deleteFolderCommand(name);
    if (result.status !== 'ok') {
      toast(t('general:error-title'), {
        description: t('listview-page:error-delete-folder'),
      });
      throw new Error(result.error);
    } else {
      toast(t('listview-page:folder-deleted-title'), {
        description: t('listview-page:folder-deleted-description', name),
        duration: 2000,
      });
    }
    mutate('folders');
  };

  const renameFolder = async (
    oldName: string,
    newName: string,
  ): Promise<void> => {
    if (!newName || newName === oldName) {
      return;
    }
    const result = await renameFolderCommand(oldName, newName);
    if (result.status !== 'ok') {
      toast(t('general:error-title'), {
        description: t('listview-page:error-rename-folder'),
      });
      throw new Error(result.error);
    } else {
      toast(t('listview-page:folder-renamed-title'), {
        description: t('listview-page:folder-renamed-description', newName),
        duration: 2000,
      });
    }
    mutate('folders');
  };

  const moveFolder = async (
    folderName: string,
    destinationIndex: number,
  ): Promise<void> => {
    const result = await moveFolderCommand(folderName, destinationIndex);
    if (result.status !== 'ok') {
      mutate('folders');
    }
  };

  const importFolder = async (UUID: string) => {
    try {
      toast(t('listview-page:importing-folder'), { duration: 5000 });
      const result = await commands.downloadFolder(UUID);
      if (result.status === 'ok') {
        const folderName = result.data[0];
        const hiddenWorlds = result.data[1];
        await refresh();
        router.push(`/listview/folders/userFolder?folderName=${folderName}`);
        if (hiddenWorlds.length > 0) {
          setPopup('showImportedFolderContainsHidden', hiddenWorlds);
        }
        toast(t('listview-page:folder-imported-title'), {
          description: t(
            'listview-page:folder-imported-description',
            result.data[0],
          ),
        });
      } else {
        toast(t('general:error-title'), {
          description: t('listview-page:error-import-folder'),
        });
      }
    } catch (e) {
      error(`Failed to import folder: ${e}`);
      toast(t('general:error-title'), {
        description: t('listview-page:error-import-folder'),
      });
    }
  };

  return {
    folders,
    error,
    isLoading,
    refresh,
    createFolder,
    deleteFolder,
    renameFolder,
    moveFolder,
    importFolder,
  };
}
