import { useFolders } from '@/app/listview/hook/use-folders';
import { useSelectedWorldsStore } from '@/app/listview/hook/use-selected-worlds';
import { useWorlds } from '@/app/listview/hook/use-worlds';
import { useLocalization } from '@/hooks/use-localization';
import {
  commands,
  FolderData,
  FolderRemovalPreference,
  WorldDisplayData,
} from '@/lib/bindings';
import { FolderType, isUserFolder, SpecialFolders } from '@/types/folders';
import { error, info } from '@tauri-apps/plugin-log';
import { mutate as mutateFoldersCache } from 'swr';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { usePopupStore } from '@/app/listview/hook/usePopups/store';

interface AddToFolderPopupProps {
  selectedWorlds: WorldDisplayData[];
  currentFolder: FolderType;
  onClose: () => void;
}

export const useAddToFolderPopup = ({
  selectedWorlds,
  currentFolder,
  onClose,
}: AddToFolderPopupProps) => {
  const { t } = useLocalization();

  const { folders, createFolder, refresh: refreshFolders } = useFolders();

  const { worlds, refresh } = useWorlds(currentFolder);

  const isSpecialFolder = !isUserFolder(currentFolder);
  const isFindPage = currentFolder === SpecialFolders.Find;

  const { clearFolderSelections } = useSelectedWorldsStore();
  const bumpMembershipVersion = usePopupStore((s) => s.bumpMembershipVersion);

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
  // Map of worldId -> set of folders from backend (authoritative)
  const [membershipByWorld, setMembershipByWorld] = useState<
    Map<string, Set<string>>
  >(new Map());

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

  // Load authoritative folder membership for selected worlds
  useEffect(() => {
    let cancelled = false;
    const loadMembership = async () => {
      try {
        const entries = await Promise.all(
          selectedWorlds.map(async (w) => {
            try {
              const res = await commands.getFoldersForWorld(w.worldId);
              if (res.status === 'ok') {
                return [w.worldId, new Set<string>(res.data)] as const;
              }
              error(
                `[AddToFolder] getFoldersForWorld failed for ${w.worldId}: ${res.error}`,
              );
              // fallback to provided world.folders if available
              return [w.worldId, new Set<string>(w.folders ?? [])] as const;
            } catch (e) {
              error(
                `[AddToFolder] getFoldersForWorld threw for ${w.worldId}: ${e}`,
              );
              return [w.worldId, new Set<string>(w.folders ?? [])] as const;
            }
          }),
        );
        if (!cancelled) {
          const map = new Map<string, Set<string>>(entries);
          setMembershipByWorld(map);
          info(
            `[AddToFolder] Loaded membership for ${entries.length} selected worlds`,
          );
        }
      } catch (e) {
        error(`[AddToFolder] Failed to load memberships: ${e}`);
      }
    };
    if (selectedWorlds?.length) loadMembership();
    return () => {
      cancelled = true;
    };
  }, [selectedWorlds]);

  const handleNewNameKey = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    const name = newFolderName.trim();
    if (!name) return;
    info(`[AddToFolder] Creating new folder via Enter key, name="${name}"`);
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
    info(
      `[AddToFolder] New folder created, scrolling into view: ${createdFolder}`,
    );
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
    const worldsInFolder = selectedWorlds?.filter((world) => {
      const set = membershipByWorld.get(world.worldId);
      // prefer authoritative membership; fallback to world.folders
      if (set) return set.has(folder);
      return world?.folders?.includes(folder);
    }).length;

    const initialState =
      worldsInFolder === 0
        ? 'none'
        : worldsInFolder === selectedWorlds?.length
          ? 'all'
          : 'some';
    return initialState;
  };

  const getFolderState = (folder: string) => {
    if (foldersToAdd.has(folder)) {
      return 'all';
    }
    if (foldersToRemove.has(folder)) {
      return 'none';
    }
    const s = getInitialState(folder);
    return s;
  };

  const handleClick = (folder: string) => {
    const currentState = getFolderState(folder);
    const initialState = getInitialState(folder);
    info(
      `[AddToFolder] handleClick(folder="${folder}") current=${currentState}, initial=${initialState}`,
    );

    if (initialState === 'some') {
      // For folders that started in 'some' state, cycle: some -> all -> none -> some
      if (currentState === 'some') {
        // some -> all
        setFoldersToAdd((prev) => {
          const next = new Set(prev);
          next.add(folder);
          info(
            `[AddToFolder] queued ADD folder="${folder}"; addSet=[${Array.from(
              next,
            ).join(', ')}]`,
          );
          return next;
        });
        setFoldersToRemove((prev) => {
          const next = new Set(prev);
          next.delete(folder);
          info(
            `[AddToFolder] unqueue REMOVE folder="${folder}"; removeSet=[${Array.from(
              next,
            ).join(', ')}]`,
          );
          return next;
        });
      } else if (currentState === 'all') {
        // all -> none
        setFoldersToAdd((prev) => {
          const next = new Set(prev);
          next.delete(folder);
          info(
            `[AddToFolder] unqueue ADD folder="${folder}"; addSet=[${Array.from(
              next,
            ).join(', ')}]`,
          );
          return next;
        });
        setFoldersToRemove((prev) => {
          const next = new Set(prev);
          next.add(folder);
          info(
            `[AddToFolder] queued REMOVE folder="${folder}"; removeSet=[${Array.from(
              next,
            ).join(', ')}]`,
          );
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
          info(
            `[AddToFolder] Loaded folderRemovalPreference=${result.data} currentFolder="${currentFolder}" isSpecial=${isSpecialFolder}`,
          );

          // Only auto-select the folder for removal if preference is alwaysRemove
          if (
            result.data === 'alwaysRemove' &&
            currentFolder &&
            !isSpecialFolder
          ) {
            setFoldersToRemove((prev) => {
              const next = new Set(prev);
              next.add(currentFolder.toString());
              info(
                `[AddToFolder] Auto-queue remove currentFolder="${currentFolder}" due to preference alwaysRemove`,
              );
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
    info(
      `[AddToFolder] Confirm clicked. currentFolder="${currentFolder}" isSpecial=${isSpecialFolder} queuedAdd=[${Array.from(
        foldersToAdd,
      ).join(', ')}] queuedRemove=[${Array.from(foldersToRemove).join(', ')}]`,
    );
    if (
      !isSpecialFolder &&
      currentFolder &&
      !foldersToRemove.has(currentFolder.toString())
    ) {
      if (folderRemovalPreference === 'ask') {
        info('[AddToFolder] Switching to removeConfirm page');
        setDialogPage('removeConfirm');
      } else if (folderRemovalPreference === 'alwaysRemove') {
        info('[AddToFolder] Auto-removing based on preference');
        const next = new Set(foldersToRemove);
        next.add(currentFolder.toString());
        setFoldersToRemove(next);
        handleConfirm();
      } else {
        info('[AddToFolder] Auto-keeping based on preference');
        handleConfirm();
      }
    } else {
      // No need for confirmation, proceed
      info('[AddToFolder] No confirmation needed, proceeding directly');
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
    info('[AddToFolder] Remove from current folder clicked');
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
      info('[AddToFolder] remove done. Closing dialog');
      onClose();
    } catch (e) {
      error(`[AddToFolder] Error during folder operations: ${e}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle keeping in current folder
  const handleKeepInCurrentFolder = async () => {
    info('[AddToFolder] Keep in current folder clicked');
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
      info('[AddToFolder] keep done. Closing dialog');
      onClose();
    } catch (e) {
      error(`[AddToFolder] Error during folder operations: ${e}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Regular confirmation without special handling for current folder
  const handleConfirm = async () => {
    info(
      `[AddToFolder] handleConfirm executing with add=[${Array.from(
        foldersToAdd,
      ).join(', ')}] remove=[${Array.from(foldersToRemove).join(', ')}]`,
    );
    setIsLoading(true);
    try {
      await handleAddToFolders(
        Array.from(foldersToAdd),
        Array.from(foldersToRemove),
      );
      setFoldersToAdd(new Set());
      setFoldersToRemove(new Set());
      info('[AddToFolder] confirm done. Closing dialog');
      onClose();
    } catch (e) {
      error(`[AddToFolder] Error during confirmation: ${e}`);
    } finally {
      setIsLoading(false);
    }
  };

  // reset on close
  const handleCancel = (next: boolean) => {
    if (!next) {
      info('[AddToFolder] Dialog cancelled/closed by user');
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
      info(
        `[AddToFolder] handleAddToFolders start isFindPage=${isFindPage} add=[${foldersToAdd.join(
          ', ',
        )}] remove=[${foldersToRemove.join(', ')}] selected=${
          selectedWorlds.length
        }`,
      );
      if (isFindPage) {
        // Create an array of promises for all world fetches
        const worldPromises = selectedWorlds.map((worldData) =>
          commands.getWorld(worldData.worldId, null),
        );

        // Wait for all promises to resolve in parallel
        const worldResults = await Promise.all(worldPromises);

        // Check if any of the results have errors
        const errorResult = worldResults.find(
          (result) => result.status === 'error',
        );
        if (errorResult) {
          throw new Error(errorResult.error);
        }
        info('[AddToFolder] Verified worlds exist from search results');
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
      // Store original state for each world-folder combination (prefer authoritative membership)
      const originalStates = selectedWorlds.map((world) => {
        const membership =
          membershipByWorld.get(world.worldId) ?? new Set(world.folders ?? []);

        return {
          worldId: world.worldId,
          worldName: world.name,
          addedTo: foldersToAdd.filter((folder) => !membership.has(folder)),
          removedFrom: foldersToRemove.filter((folder) =>
            membership.has(folder),
          ),
        };
      });
      info(
        `[AddToFolder] OriginalStates prepared for ${originalStates.length} worlds`,
      );

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
            // Only remove if the world is actually in this folder (authoritative membership first)
            const membership =
              membershipByWorld.get(world.worldId) ??
              new Set(world.folders ?? []);

            if (membership.has(folder)) {
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
        info(
          `[AddToFolder] Folder ops completed: add=${addPromises.length} remove=${removePromises.length}`,
        );

        // Optimistically bump cached folder counts so sidebar updates immediately (deduped revalidate can lag)
        const folderDelta = new Map<string, number>();
        for (const state of originalStates) {
          state.addedTo.forEach((folder) => {
            folderDelta.set(folder, (folderDelta.get(folder) ?? 0) + 1);
          });
          state.removedFrom.forEach((folder) => {
            folderDelta.set(folder, (folderDelta.get(folder) ?? 0) - 1);
          });
        }

        if (folderDelta.size > 0) {
          await mutateFoldersCache<FolderData[]>(
            'folders',
            (current) => {
              if (!current) return current;
              return current.map((f) => {
                const delta = folderDelta.get(f.name) ?? 0;
                if (delta === 0) return f;
                const nextCount = Math.max(0, f.world_count + delta);
                return { ...f, world_count: nextCount };
              });
            },
            { revalidate: true },
          );

          info(
            `[AddToFolder] Optimistic folder count delta applied: ${Array.from(
              folderDelta.entries(),
            )
              .map(([name, delta]) => `${name}:${delta}`)
              .join(', ')}`,
          );
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
              ? t(
                  'listview-page:folders-updated-multiple',
                  selectedWorlds[0].name,
                  selectedWorlds.length - 1,
                )
              : t(
                  'listview-page:folders-updated-single',
                  selectedWorlds[0].name,
                ),
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
                // Refresh folders list to update world counts in sidebar
                await refreshFolders();
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
      // For Find page, membership has changed; bump version so grids recompute existence
      if (isFindPage) {
        bumpMembershipVersion();
      }
      // Refresh folders list to update world counts in sidebar
      await refreshFolders();
      info('[AddToFolder] handleAddToFolders completed successfully');
      // Closing is handled by caller paths (confirm/keep/remove) too; still close here to be safe.
      onClose();
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
