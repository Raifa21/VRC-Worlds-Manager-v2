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
import { WorldDisplayData } from '@/lib/bindings';
import { useLocalization } from '@/hooks/use-localization';
import { Alert, AlertDescription } from './ui/alert';
import { Input } from './ui/input';
import { SpecialFolders } from '@/types/folders'; // Add this import

interface AddToFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedWorlds?: WorldDisplayData[];
  folders: string[];
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
  folders,
  onConfirm,
  isFindPage,
  onAddFolder,
  currentFolder,
}: AddToFolderDialogProps) {
  const { t } = useLocalization();
  // Add state to track dialog page
  const [dialogPage, setDialogPage] = useState<'folders' | 'removeConfirm'>(
    'folders',
  );
  const [foldersToAdd, setFoldersToAdd] = useState<Set<string>>(new Set());
  const [foldersToRemove, setFoldersToRemove] = useState<Set<string>>(
    new Set(),
  );

  // Check if current folder is a special folder
  const isCurrentFolderSpecial =
    !currentFolder ||
    Object.values(SpecialFolders).includes(currentFolder as SpecialFolders);

  // single‐input mode for creating a new folder
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [createdFolder, setCreatedFolder] = useState<string | null>(null);

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

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm(Array.from(foldersToAdd), Array.from(foldersToRemove));
      setFoldersToAdd(new Set());
      setFoldersToRemove(new Set());
      setDialogPage('folders'); // Reset to main page
    } catch (error) {
      console.error('Error during confirmation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to prepare current folder for removal and handle confirmation
  const handleRemoveFromCurrentFolder = async () => {
    setIsLoading(true);
    try {
      // Make sure currentFolder is a string and not a special folder
      if (currentFolder && !isCurrentFolderSpecial) {
        // Create new arrays instead of modifying sets (more reliable)
        const addArray = Array.from(foldersToAdd);
        const removeArray = [
          ...Array.from(foldersToRemove),
          currentFolder.toString(),
        ];
        await onConfirm(addArray, removeArray);
      }
      // Reset dialog state
      setFoldersToAdd(new Set());
      setFoldersToRemove(new Set());
      setDialogPage('folders');
    } catch (error) {
      console.error('Error removing from current folder:', error);
    } finally {
      setIsLoading(false);
      onOpenChange(false); // Close dialog after completion
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
      setDialogPage('folders'); // Reset page
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
                  const isNew = folder === createdFolder;
                  return (
                    <Button
                      key={folder}
                      data-folder={folder}
                      variant="outline"
                      className="w-full justify-between group"
                      onClick={() => handleClick(folder)}
                    >
                      <span className="truncate">{folder}</span>
                      <span>
                        {getFolderState(folder) === 'all' && <Check />}
                        {getFolderState(folder) === 'some' && <Minus />}
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
              <Button
                onClick={() => {
                  // Only show remove confirmation if:
                  // 1. Current folder is not a special folder
                  // 2. Current folder exists
                  // 3. Current folder is not already being removed
                  if (
                    !isCurrentFolderSpecial &&
                    currentFolder &&
                    !foldersToRemove.has(currentFolder.toString())
                  ) {
                    setDialogPage('removeConfirm');
                  } else {
                    handleConfirm();
                  }
                }}
                disabled={isLoading}
              >
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
              <p className="font-semibold">
                {selectedWorlds?.length || 0} {t('general:worlds')}
              </p>
            </div>

            <div className="flex gap-2 mt-4 justify-center w-full">
              {/* No more Back button */}
              <Button
                variant="outline"
                onClick={handleConfirm}
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  t('general:keep')
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
                ) : (
                  t('general:remove')
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
