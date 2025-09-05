import { useFolders } from '@/app/listview/hook/use-folders';
import { useSelectedWorldsStore } from '@/app/listview/hook/use-selected-worlds';
import { useWorlds } from '@/app/listview/hook/use-worlds';
import { useLocalization } from '@/hooks/use-localization';
import {
  commands,
  FolderRemovalPreference,
  WorldDisplayData,
} from '@/lib/bindings';
import { error, info } from '@tauri-apps/plugin-log';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

interface AddToFolderPopupProps {
  selectedWorlds: WorldDisplayData[];
  onClose: () => void;
}

export const useAddToFolderPopup = ({
  selectedWorlds,
  onClose,
}: AddToFolderPopupProps) => {
  const { t } = useLocalization();

  const { folders, createFolder, currentFolder } = useFolders();

  const { worlds, refresh } = useWorlds();

  const pathname = usePathname();

  const isSpecialFolder = pathname.includes('/folders/special/');
  const isFindPage = pathname.includes('/folders/special/find/');

  const { clearFolderSelections } = useSelectedWorldsStore();

  const [foldersToAdd, setFoldersToAdd] = useState<Set<string>>(new Set());
  const [foldersToRemove, setFoldersToRemove] = useState<Set<string>>(
    new Set(),
  );
  const [rememberChoice, setRememberChoice] = useState<boolean>(false);

  const [dialogPage, setDialogPage] = useState<'folders' | 'removeConfirm'>(
    'folders',
  );

  // single‐input mode for creating a new folder
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [createdFolder, setCreatedFolder] = useState<string | null>(null);
  const [folderRemovalPreference, setFolderRemovalPreference] =
    useState<FolderRemovalPreference>('ask'); // Default to 'ask' for folder removal preference

  const [isLoading, setIsLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  // IME composition tracking: prevent Enter during composition from submitting
  const composingRef = useRef(false);
  const [isComposing, setIsComposing] = useState(false);

  // scroll to bottom when starting to create
  useEffect(() => {
    if (isCreatingNew) {
      const el = listRef.current;
      el?.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
  }, [isCreatingNew]);

  const handleNewNameKey = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    const name = newFolderName.trim();
    if (!name) return;
    setIsLoading(true);
    await createFolder(name);
    setIsLoading(false);
    setIsCreatingNew(false);
    setNewFolderName('');
    setCreatedFolder(name);
  };

  // whenever `folders` changes after we created one, scroll it into view
  useEffect(() => {
    if (!createdFolder) return;
    const container = listRef.current;
    if (container) {
      const el = container.querySelector<HTMLElement>(
        `[data-folder="${createdFolder.replace(/"/g, '\\"')}"]`,
      );
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
    setCreatedFolder(null);
  }, [folders, createdFolder]);

  const getInitialState = (folder: string) => {
    const worldsInFolder = selectedWorlds?.filter((world) =>
      world?.folders.includes(folder),
    ).length;

    if (worldsInFolder === 0) return 'none';
    if (worldsInFolder === selectedWorlds?.length) return 'all';
    return 'some';
  };

  const getFolderState = (folder: string) => {
    if (foldersToAdd.has(folder)) return 'all';
    if (foldersToRemove.has(folder)) return 'none';
    return getInitialState(folder);
  };

  const handleClick = (folder: string) => {
    const currentState = getFolderState(folder);
    const initialState = getInitialState(folder);

    if (initialState === 'some') {
      // For folders that started in 'some' state, cycle: some -> all -> none -> some
      if (currentState === 'some') {
        // some -> all
        setFoldersToAdd((prev) => {
          const next = new Set(prev);
          next.add(folder);
          return next;
        });
        setFoldersToRemove((prev) => {
          const next = new Set(prev);
          next.delete(folder);
          return next;
        });
      } else if (currentState === 'all') {
        // all -> none
        setFoldersToAdd((prev) => {
          const next = new Set(prev);
          next.delete(folder);
          return next;
        });
        setFoldersToRemove((prev) => {
          const next = new Set(prev);
          next.add(folder);
          return next;
        });
      } else {
        // none -> some (clear both sets to return to initial state)
        setFoldersToAdd((prev) => {
          const next = new Set(prev);
          next.delete(folder);
          return next;
        });
        setFoldersToRemove((prev) => {
          const next = new Set(prev);
          next.delete(folder);
          return next;
        });
      }
    } else {
      // For folders that started in 'all' or 'none', just toggle between those states
      if (currentState === 'none') {
        setFoldersToAdd((prev) => {
          const next = new Set(prev);
          next.add(folder);
          return next;
        });
        setFoldersToRemove((prev) => {
          const next = new Set(prev);
          next.delete(folder);
          return next;
        });
      } else {
        setFoldersToAdd((prev) => {
          const next = new Set(prev);
          next.delete(folder);
          return next;
        });
        setFoldersToRemove((prev) => {
          const next = new Set(prev);
          next.add(folder);
          return next;
        });
      }
    }
  };

  // Load preferences once when component mounts
  useEffect(() => {
    const loadFolderRemovalPreference = async () => {
      try {
        const result = await commands.getFolderRemovalPreference();
        if (result.status === 'ok') {
          setFolderRemovalPreference(result.data);

          // Only auto-select the folder for removal if preference is alwaysRemove
          if (
            result.data === 'alwaysRemove' &&
            currentFolder &&
            !isSpecialFolder
          ) {
            setFoldersToRemove((prev) => {
              const next = new Set(prev);
              next.add(currentFolder.toString());
              return next;
            });
          }
        }
      } catch (e) {
        error(`Failed to load folder removal preference: ${e}`);
      }
    };

    loadFolderRemovalPreference();
  }, [currentFolder, isSpecialFolder]);

  const handleConfirmButtonClick = () => {
    if (
      !isSpecialFolder &&
      currentFolder &&
      !foldersToRemove.has(currentFolder.toString())
    ) {
      if (folderRemovalPreference === 'ask') {
        info('Setting dialog page to confirmation');
        setDialogPage('removeConfirm');
      } else if (folderRemovalPreference === 'alwaysRemove') {
        info('Auto-removing based on preference');
        const next = new Set(foldersToRemove);
        next.add(currentFolder.toString());
        setFoldersToRemove(next);
        handleConfirm();
      } else {
        info('Auto-keeping based on preference');
        handleConfirm();
      }
    } else {
      // No need for confirmation, proceed
      info('No confirmation needed, proceeding directly');
      handleConfirm();
    }
  };

  // Save preference based on user action
  const saveFolderRemovalPreference = async (action: 'keep' | 'remove') => {
    if (!rememberChoice) return; // Only save if checkbox is checked

    try {
      const preference = action === 'keep' ? 'neverRemove' : 'alwaysRemove';
      await commands.setFolderRemovalPreference(preference);
      info(`Saved folder removal preference: ${preference}`);
    } catch (e) {
      error(`Failed to save folder removal preference: ${e}`);
    }
  };

  // Handle removing from current folder
  const handleRemoveFromCurrentFolder = async () => {
    setIsLoading(true);
    try {
      if (rememberChoice) {
        await saveFolderRemovalPreference('remove');
      }

      if (currentFolder && !isSpecialFolder) {
        const addArray = Array.from(foldersToAdd);
        // Explicitly add current folder to removeArray
        const removeArray = [
          ...Array.from(foldersToRemove),
          currentFolder.toString(),
        ];

        await handleAddToFolders(addArray, removeArray);
      } else {
        await handleAddToFolders(
          Array.from(foldersToAdd),
          Array.from(foldersToRemove),
        );
      }

      // Reset state
      setFoldersToAdd(new Set());
      setFoldersToRemove(new Set());
      setDialogPage('folders');
    } catch (error) {
      console.error('Error during folder operations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle keeping in current folder
  const handleKeepInCurrentFolder = async () => {
    setIsLoading(true);
    try {
      if (rememberChoice) {
        await saveFolderRemovalPreference('keep');
      }

      // Don't modify foldersToRemove, just use as-is
      await handleAddToFolders(
        Array.from(foldersToAdd),
        Array.from(foldersToRemove),
      );

      // Reset state
      setFoldersToAdd(new Set());
      setFoldersToRemove(new Set());
      setDialogPage('folders');
    } catch (error) {
      console.error('Error during folder operations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Regular confirmation without special handling for current folder
  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await handleAddToFolders(
        Array.from(foldersToAdd),
        Array.from(foldersToRemove),
      );
      setFoldersToAdd(new Set());
      setFoldersToRemove(new Set());
    } catch (error) {
      console.error('Error during confirmation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // reset on close
  const handleCancel = (next: boolean) => {
    if (!next) {
      setFoldersToAdd(new Set());
      setFoldersToRemove(new Set());
      setIsCreatingNew(false);
      setNewFolderName('');
      setIsLoading(false);
      setDialogPage('folders');
      setRememberChoice(false);
      onClose();
    }
  };

  const handleAddToFolders = async (
    foldersToAdd: string[],
    foldersToRemove: string[],
  ) => {
    try {
      if (isFindPage) {
        // Create an array of promises for all world fetches
        const worldPromises = selectedWorlds.map((worldData) =>
          commands.getWorld(worldData.worldId, null),
        );

        // Wait for all promises to resolve in parallel
        const worldResults = await Promise.all(worldPromises);

        const worldIds = selectedWorlds.map((world) => world.worldId);

        // Check if any of the results have errors
        const errorResult = worldResults.find(
          (result) => result.status === 'error',
        );
        if (errorResult) {
          throw new Error(errorResult.error);
        }
        toast(t('listview-page:worlds-added-title'), {
          description:
            selectedWorlds.length > 1
              ? t(
                  'listview-page:worlds-added-description-multiple',
                  selectedWorlds.length,
                )
              : t('listview-page:worlds-added-description-single'),
        });
      }
      // Store original state for each world-folder combination
      const originalStates = selectedWorlds.map((world) => ({
        worldId: world.worldId,
        worldName: world.name,
        addedTo: foldersToAdd.filter(
          (folder) => !world.folders.includes(folder),
        ),
        removedFrom: foldersToRemove.filter((folder) =>
          world.folders.includes(folder),
        ),
      }));

      // Perform changes...
      try {
        const addPromises = [];
        const removePromises = [];

        // Gather all add operations
        for (const folder of foldersToAdd) {
          for (const world of selectedWorlds) {
            addPromises.push(commands.addWorldToFolder(folder, world.worldId));
          }
        }

        // Gather all remove operations - with validation
        const validFoldersToRemove = foldersToRemove.filter((folder) =>
          folders.some((f) => f.name === folder),
        );

        for (const folder of validFoldersToRemove) {
          for (const world of selectedWorlds) {
            // Only remove if the world is actually in this folder
            if (world.folders.includes(folder)) {
              removePromises.push(
                commands.removeWorldFromFolder(folder, world.worldId),
              );
            }
          }
        }

        // Execute all operations in parallel
        const results = await Promise.all([...addPromises, ...removePromises]);

        // Check for errors in results if needed
        const hasErrors = results.some((result) => result?.status === 'error');
        if (hasErrors) {
          throw new Error('One or more folder operations failed');
        }
      } catch (e) {
        error(`Failed during folder operations: ${e}`);
        throw e; // Re-throw to be caught by the outer try/catch
      }

      clearFolderSelections(currentFolder);

      if (!isFindPage) {
        toast(t('listview-page:folders-updated-title'), {
          description:
            selectedWorlds.length > 1
              ? t('listview-page:folders-updated-multiple', {
                  firstWorldName: selectedWorlds[0].name,
                  additionalCount: selectedWorlds.length - 1,
                })
              : t('listview-page:folders-updated-single', {
                  firstWorldName: selectedWorlds[0].name,
                }),
          action: {
            label: t('listview-page:undo-button'),
            onClick: async () => {
              try {
                // Undo changes per world
                for (const state of originalStates) {
                  // Remove from folders that were added
                  for (const folder of state.addedTo) {
                    await commands.removeWorldFromFolder(folder, state.worldId);
                  }
                  // Add back to folders that were removed
                  for (const folder of state.removedFrom) {
                    await commands.addWorldToFolder(folder, state.worldId);
                  }
                }
                await refresh();
                toast(t('listview-page:restored-title'), {
                  description: t('listview-page:folder-changes-undone'),
                });
              } catch (e) {
                error(`Failed to undo folder changes: ${e}`);
                toast(t('general:error-title'), {
                  description: t('listview-page:error-undo-folder-changes'),
                });
              }
            },
          },
        });

        await refresh();
      }
    } catch (e) {
      error(`Failed to update folders: ${e}`);
      toast(t('general:error-title'), {
        description: t('listview-page:error-update-folders'),
      });
    }
  };

  return {
    folders,
    isCreatingNew,
    setIsCreatingNew,
    newFolderName,
    setNewFolderName,
    setIsComposing,
    composingRef,
    handleNewNameKey,
    listRef,
    getFolderState,
    handleClick,
    isLoading,
    dialogPage,
    rememberChoice,
    setRememberChoice,
    handleConfirmButtonClick,
    handleRemoveFromCurrentFolder,
    handleKeepInCurrentFolder,
    handleCancel,
    selectedWorlds,
    isFindPage,
    createdFolder,
    currentFolder,
  };
};
