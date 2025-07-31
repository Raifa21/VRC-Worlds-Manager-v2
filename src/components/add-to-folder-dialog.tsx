import { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Check, Info, Loader2, Minus, AlertCircle } from 'lucide-react';
import { commands, WorldDisplayData } from '@/lib/bindings';
import { useLocalization } from '@/hooks/use-localization';
import { Alert, AlertDescription } from './ui/alert';
import { Input } from './ui/input';
import { SpecialFolders } from '@/types/folders'; // Add this import
import { error, info } from '@tauri-apps/plugin-log';
import { Checkbox } from './ui/checkbox';
import { FolderRemovalPreference } from '@/lib/bindings';
import { useFolders } from '@/hooks/use-folders';

interface AddToFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedWorlds?: WorldDisplayData[];
  onConfirm: (
    foldersToAdd: string[],
    foldersToRemove: string[],
  ) => Promise<void>;
  isFindPage?: boolean;
  onAddFolder?: (name: string) => Promise<void>;
  currentFolder: string | SpecialFolders;
}

export function AddToFolderDialog({
  open,
  onOpenChange,
  selectedWorlds,
  onConfirm,
  isFindPage,
  onAddFolder,
  currentFolder,
}: AddToFolderDialogProps) {
  const { t } = useLocalization();
  const { folders, refresh } = useFolders();
  // Remove duplicated state - keep only rememberChoice
  const [dialogPage, setDialogPage] = useState<'folders' | 'removeConfirm'>(
    'folders',
  );
  const [foldersToAdd, setFoldersToAdd] = useState<Set<string>>(new Set());
  const [foldersToRemove, setFoldersToRemove] = useState<Set<string>>(
    new Set(),
  );
  const [rememberChoice, setRememberChoice] = useState<boolean>(false);

  // Check if current folder is a special folder
  const isCurrentFolderSpecial =
    !currentFolder ||
    Object.values(SpecialFolders).includes(currentFolder as SpecialFolders);

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

  const handleAddClick = () => {
    if (onAddFolder) {
      setIsCreatingNew(true);
    }
  };

  const handleNewNameKey = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    const name = newFolderName.trim();
    if (!name || !onAddFolder) return;
    setIsLoading(true);
    await onAddFolder(name);
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
      world.folders.includes(folder),
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
            !isCurrentFolderSpecial
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

    if (open) {
      loadFolderRemovalPreference();
    }
  }, [open, currentFolder, isCurrentFolderSpecial]); // Add open dependency to ensure it loads when dialog opens

  // Update the confirmation button click handler
  const handleConfirmButtonClick = () => {
    // Log current state for debugging
    info(
      `Current folder: ${currentFolder}, isSpecial: ${isCurrentFolderSpecial}`,
    );
    info(`Current preference: ${folderRemovalPreference}`);
    info(
      `Current folder in removeList: ${foldersToRemove.has(currentFolder?.toString() || '')}`,
    );

    // Check if we should show confirmation dialog - FIX the condition
    if (
      !isCurrentFolderSpecial &&
      currentFolder &&
      !foldersToRemove.has(currentFolder.toString())
    ) {
      // Log the branch we're taking
      info(
        `Should show dialog based on preference: ${folderRemovalPreference}`,
      );

      // Compare as string to ensure correct matching
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

      if (currentFolder && !isCurrentFolderSpecial) {
        const addArray = Array.from(foldersToAdd);
        // Explicitly add current folder to removeArray
        const removeArray = [
          ...Array.from(foldersToRemove),
          currentFolder.toString(),
        ];

        await onConfirm(addArray, removeArray);
      } else {
        await onConfirm(Array.from(foldersToAdd), Array.from(foldersToRemove));
      }

      // Reset state
      setFoldersToAdd(new Set());
      setFoldersToRemove(new Set());
      setDialogPage('folders');
    } catch (error) {
      console.error('Error during folder operations:', error);
    } finally {
      setIsLoading(false);
      onOpenChange(false);
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
      await onConfirm(Array.from(foldersToAdd), Array.from(foldersToRemove));

      // Reset state
      setFoldersToAdd(new Set());
      setFoldersToRemove(new Set());
      setDialogPage('folders');
    } catch (error) {
      console.error('Error during folder operations:', error);
    } finally {
      setIsLoading(false);
      onOpenChange(false);
    }
  };

  // Regular confirmation without special handling for current folder
  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm(Array.from(foldersToAdd), Array.from(foldersToRemove));
      setFoldersToAdd(new Set());
      setFoldersToRemove(new Set());
    } catch (error) {
      console.error('Error during confirmation:', error);
    } finally {
      setIsLoading(false);
      onOpenChange(false);
    }
  };

  // reset on close
  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setFoldersToAdd(new Set());
      setFoldersToRemove(new Set());
      setIsCreatingNew(false);
      setNewFolderName('');
      setIsLoading(false);
      setDialogPage('folders');
      setRememberChoice(false);
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('add-to-folder-dialog:title')}</DialogTitle>
          <DialogDescription>
            {selectedWorlds?.length === 1
              ? t(
                  'add-to-folder-dialog:description-single',
                  selectedWorlds.length,
                )
              : t(
                  'add-to-folder-dialog:description-multiple',
                  selectedWorlds?.length,
                )}
          </DialogDescription>
        </DialogHeader>

        {/* Show different content based on the current page */}
        {dialogPage === 'folders' ? (
          <>
            {folders.length === 0 && (
              <div className="border border-muted rounded-md px-2 py-2 text-xs text-center">
                {t('add-to-folder-dialog:no-folders')}
              </div>
            )}
            <ScrollArea className={isFindPage ? 'h-[240px]' : 'h-[300px]'}>
              <div ref={listRef} className="space-y-2 px-2 pb-2">
                {folders.map((folder) => {
                  const isNew = folder[0] === createdFolder;
                  return (
                    <Button
                      key={folder[0]}
                      data-folder={folder[0]}
                      variant="outline"
                      className="w-full justify-between group"
                      onClick={() => handleClick(folder[0])}
                    >
                      <span className="flex flex-row items-center w-full justify-start">
                        <span className="font-mono text-xs text-muted-foreground w-10 text-left flex-shrink-0">
                          {folder[1]}
                        </span>
                        <span className="truncate flex-1 pr-2 text-left w-[10px]">
                          {folder[0]}
                        </span>
                      </span>
                      <span>
                        {getFolderState(folder[0]) === 'all' && <Check />}
                        {getFolderState(folder[0]) === 'some' && <Minus />}
                      </span>
                    </Button>
                  );
                })}

                {isCreatingNew && (
                  <Input
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={(e) => {
                      // only submit on Enter if not composing (IME)
                      if (e.key === 'Enter' && !composingRef.current) {
                        handleNewNameKey(e);
                      }
                    }}
                    onCompositionStart={() => {
                      composingRef.current = true;
                      setIsComposing(true);
                    }}
                    onCompositionEnd={() => {
                      // small timeout to ensure composition has ended
                      setTimeout(() => {
                        composingRef.current = false;
                        setIsComposing(false);
                      }, 0);
                    }}
                    onBlur={() => setIsCreatingNew(false)} // hide input on focus loss
                    disabled={isLoading}
                    autoFocus
                    placeholder={t('add-to-folder-dialog:new-placeholder')}
                    className="w-full px-2 py-1 border border-input rounded"
                  />
                )}
              </div>
            </ScrollArea>

            {/* add‐folder toggle button */}
            <div className="mt-2 px-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleAddClick}
                disabled={isLoading || isCreatingNew}
                className="w-full"
              >
                + {t('add-to-folder-dialog:add-folder')}
              </Button>
            </div>

            {/* Info card for Find Page */}
            {isFindPage && (
              <Alert className="mt-2">
                <AlertDescription className="flex">
                  <Info className="h-4 w-4 mt-0.5 mr-2" />
                  {t('add-to-folder-dialog:find-page-info')}
                </AlertDescription>
              </Alert>
            )}
            <DialogFooter>
              <Button
                variant="secondary"
                onClick={() => handleOpenChange(false)}
              >
                {t('general:cancel')}
              </Button>
              <Button onClick={handleConfirmButtonClick} disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  t('general:confirm')
                )}
              </Button>
            </DialogFooter>
          </>
        ) : (
          // Remove confirmation page
          <div className="py-4 px-2 flex flex-col items-center gap-4">
            <Alert variant="destructive">
              <AlertDescription className="flex">
                <AlertCircle className="h-4 w-4 mt-0.5 mr-2" />
                {t('add-to-folder-dialog:remove-confirm', {
                  folder: currentFolder,
                })}
              </AlertDescription>
            </Alert>

            <div className="flex flex-col text-center gap-1 text-sm text-muted-foreground">
              <p>{t('add-to-folder-dialog:remove-description')}</p>
            </div>

            {/* Remember choice checkbox */}
            <div className="flex items-center space-x-2 self-start mt-2">
              <Checkbox
                id="remember-choice"
                checked={rememberChoice}
                onCheckedChange={(checked) => setRememberChoice(!!checked)}
              />
              <label
                htmlFor="remember-choice"
                className="text-sm text-muted-foreground cursor-pointer"
              >
                {t('add-to-folder-dialog:remember-choice')}
              </label>
            </div>

            <div className="flex gap-2 mt-4 justify-center w-full">
              <Button
                variant="outline"
                onClick={handleKeepInCurrentFolder}
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : rememberChoice ? (
                  t('add-to-folder-dialog:always-keep')
                ) : (
                  t('add-to-folder-dialog:keep')
                )}
              </Button>
              <Button
                variant="destructive"
                onClick={handleRemoveFromCurrentFolder}
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : rememberChoice ? (
                  t('add-to-folder-dialog:always-remove')
                ) : (
                  t('add-to-folder-dialog:remove')
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
