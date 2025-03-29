import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface CreateFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (name: string) => Promise<void>;
}

export function CreateFolderDialog({
  open,
  onOpenChange,
  onConfirm,
}: CreateFolderDialogProps) {
  const [folderName, setFolderName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isComposing, setIsComposing] = useState(false);

  const handleSubmit = async () => {
    if (!folderName) return;

    setIsLoading(true);
    try {
      await onConfirm(folderName);
      setFolderName('');
      onOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Folder</DialogTitle>
        </DialogHeader>
        <Input
          value={folderName}
          onChange={(e) => setFolderName(e.target.value)}
          placeholder="Enter folder name"
          onKeyDown={(e) => {
            console.log('Key pressed:', e.key);
            if (e.key === 'Enter' && !isComposing) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          onCompositionStart={(e) => {
            setIsComposing(true);
          }}
          onCompositionEnd={(e) => {
            setTimeout(() => {
              setIsComposing(false);
            }, 0);
          }}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!folderName || isLoading}>
            {isLoading ? 'Creating...' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
