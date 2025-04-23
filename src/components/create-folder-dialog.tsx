import { useState } from 'react';
import { info, error } from '@tauri-apps/plugin-log';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLocalization } from '@/hooks/use-localization';

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
  const { t } = useLocalization();
  const [folderName, setFolderName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isComposing, setIsComposing] = useState(false);

  const handleSubmit = async () => {
    if (!folderName) return;

    setIsLoading(true);
    try {
      info(`Creating folder: ${folderName}`);
      await onConfirm(folderName);
      setFolderName('');
      onOpenChange(false);
    } catch (e) {
      error(`Failed to create folder: ${e}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('create-folder-dialog:title')}</DialogTitle>
        </DialogHeader>
        <Input
          value={folderName}
          onChange={(e) => setFolderName(e.target.value)}
          placeholder={t('create-folder-dialog:placeholder')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !isComposing) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          onCompositionStart={() => {
            setIsComposing(true);
          }}
          onCompositionEnd={() => {
            setTimeout(() => {
              setIsComposing(false);
            }, 0);
          }}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('general:cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={!folderName || isLoading}>
            {isLoading
              ? t('create-folder-dialog:creating')
              : t('create-folder-dialog:create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
