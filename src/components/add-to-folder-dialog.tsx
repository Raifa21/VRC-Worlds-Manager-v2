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
import { Check, Minus } from 'lucide-react';
import { WorldDisplayData } from './world-card';

interface AddToFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedWorlds: WorldDisplayData[];
  folders: string[];
  onConfirm: (foldersToAdd: string[], foldersToRemove: string[]) => void;
}

export function AddToFolderDialog({
  open,
  onOpenChange,
  selectedWorlds,
  folders,
  onConfirm,
}: AddToFolderDialogProps) {
  const [foldersToAdd, setFoldersToAdd] = useState<Set<string>>(new Set());
  const [foldersToRemove, setFoldersToRemove] = useState<Set<string>>(
    new Set(),
  );

  const getInitialState = (folder: string) => {
    const worldsInFolder = selectedWorlds.filter((world) =>
      world.folders.includes(folder),
    ).length;

    if (worldsInFolder === 0) return 'none';
    if (worldsInFolder === selectedWorlds.length) return 'all';
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

  const handleConfirm = () => {
    onConfirm(Array.from(foldersToAdd), Array.from(foldersToRemove));
    setFoldersToAdd(new Set());
    setFoldersToRemove(new Set());
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setFoldersToAdd(new Set());
      setFoldersToRemove(new Set());
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Folders</DialogTitle>
          <DialogDescription>
            Select folders to add or remove {selectedWorlds.length} world
            {selectedWorlds.length > 1 ? 's' : ''}{' '}
            {selectedWorlds.length > 1 ? 'from' : 'to'}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[300px] pr-4">
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
        <DialogFooter>
          <Button variant="secondary" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>Confirm</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
