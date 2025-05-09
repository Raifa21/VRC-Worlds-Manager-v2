import { useState } from 'react';
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
import { Check, Info, Loader2, Minus } from 'lucide-react';
import { WorldDisplayData } from '@/types/worlds';
import { useLocalization } from '@/hooks/use-localization';
import { Alert, AlertDescription } from './ui/alert';

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
}

export function AddToFolderDialog({
  open,
  onOpenChange,
  selectedWorlds,
  folders,
  onConfirm,
  isFindPage,
}: AddToFolderDialogProps) {
  const { t } = useLocalization();
  const [foldersToAdd, setFoldersToAdd] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [foldersToRemove, setFoldersToRemove] = useState<Set<string>>(
    new Set(),
  );

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
    await onConfirm(Array.from(foldersToAdd), Array.from(foldersToRemove));
    setFoldersToAdd(new Set());
    setFoldersToRemove(new Set());
    setIsLoading(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setFoldersToAdd(new Set());
      setFoldersToRemove(new Set());
      setIsLoading(false);
    }
    onOpenChange(open);
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
        {folders.length === 0 && (
          <div className="text-muted-foreground">
            {t('add-to-folder-dialog:no-folders')}
          </div>
        )}
        <ScrollArea className={isFindPage ? 'h-[240px]' : 'h-[300px]'}>
          <div className="space-y-2">
            {folders.map((folder) => {
              const state = getFolderState(folder);
              return (
                <Button
                  key={folder}
                  variant="outline"
                  className="w-full justify-between group"
                  onClick={() => handleClick(folder)}
                >
                  <span>{folder}</span>
                  <span className="text-muted-foreground group-hover:text-primary">
                    {state === 'all' && <Check className="h-4 w-4" />}
                    {state === 'some' && <Minus className="h-4 w-4" />}
                  </span>
                </Button>
              );
            })}
          </div>
        </ScrollArea>

        {/* Info card for Find Page */}
        {isFindPage && (
          <Alert className="mt-2">
            <AlertDescription className="flex gap-2">
              <Info className="h-4 w-4 mt-0.5" />
              {t('add-to-folder-dialog:find-page-info')}
            </AlertDescription>
          </Alert>
        )}
        <DialogFooter>
          <Button variant="secondary" onClick={() => handleOpenChange(false)}>
            {t('general:cancel')}
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              t('general:confirm')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
