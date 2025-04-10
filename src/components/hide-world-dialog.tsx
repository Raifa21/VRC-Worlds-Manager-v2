import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { EyeOff } from 'lucide-react';
import { useState } from 'react';

interface HideWorldDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
  worldName: string[] | null;
  worldId: string[] | null;
}

export function HideWorldDialog({
  open,
  onOpenChange,
  onConfirm,
  worldName,
  worldId,
}: HideWorldDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // First cleanup loading state
      setIsLoading(false);
      // Then notify parent after a slight delay to allow cleanup
      setTimeout(() => {
        onOpenChange(false);
      }, 0);
    } else {
      onOpenChange(true);
    }
  };

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm();
      // Let the loading state show briefly before closing
      setTimeout(() => {
        handleOpenChange(false);
      }, 100);
    } catch (error) {
      setIsLoading(false);
    }
  };

  const getTitle = () => {
    if (!worldName?.length || !worldId?.length) return 'Hide World';
    if (worldId.length === 1) return `Hide "${worldName[0]}"`;
    return `Hide "${worldName[0]}" and ${worldId.length - 1} more worlds`;
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-2">
              <p>This hides this world from all folders.</p>
              <p className="text-muted-foreground">
                You can find the world in the &quot;Hidden Folder&quot; in
                settings to revert.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isLoading}
          >
            <EyeOff className="mr-2 h-4 w-4" />
            {isLoading ? 'Hiding...' : 'Hide World'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
