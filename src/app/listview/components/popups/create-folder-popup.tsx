import { useState, useRef, useEffect } from 'react';
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
import { Label } from '../../../../components/ui/label';
import { useFolders } from '@/app/listview/hook/use-folders';

interface CreateFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportFolder?: (UUID: string) => Promise<void>;
}

export function CreateFolderDialog({
  open,
  onOpenChange,
  onImportFolder,
}: CreateFolderDialogProps) {
  const { t } = useLocalization();
  const { createFolder } = useFolders();
  const [folderName, setFolderName] = useState('');
  const [importUUID, setImportUUID] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  // separate refs for import vs create inputs
  const importInputRef = useRef<HTMLInputElement>(null);
  const createInputRef = useRef<HTMLInputElement>(null);

  // Separate handlers for import vs create
  const handleImport = async () => {
    if (!importUUID || !onImportFolder) return;
    setIsLoading(true);
    try {
      await onImportFolder(importUUID);
      setImportUUID('');
      onOpenChange(false);
    } catch (e) {
      error(`Failed to import folder: ${e}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!folderName) return;
    setIsLoading(true);
    try {
      await createFolder(folderName);
      setFolderName('');
      onOpenChange(false);
    } catch (e) {
      error(`Failed to create folder: ${e}`);
    } finally {
      setIsLoading(false);
    }
  };

  // F8/IME support and autofocus only on the "Create" input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F8' && document.activeElement === createInputRef.current) {
        const len = createInputRef.current!.value.length;
        setTimeout(() => {
          createInputRef.current!.focus();
          createInputRef.current!.setSelectionRange(len, len);
        }, 0);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Auto-focus the "Create" input when the dialog opens
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        createInputRef.current?.focus();
      }, 100);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('create-folder-dialog:title')}</DialogTitle>
        </DialogHeader>
        <div className="h-2" />

        {/* Import Section */}
        <DialogTitle>{t('create-folder-dialog:import-title')}</DialogTitle>
        <Label className="text-sm text-muted-foreground mb-2">
          {t('create-folder-dialog:import-description')}
        </Label>
        <div className="flex gap-2 items-center mb-4">
          <Input
            ref={importInputRef}
            value={importUUID}
            onChange={(e) => setImportUUID(e.target.value)}
            placeholder={t('create-folder-dialog:import-placeholder')}
            disabled={isLoading}
          />
          <Button onClick={handleImport} disabled={!importUUID || isLoading}>
            {isLoading
              ? t('create-folder-dialog:importing')
              : t('create-folder-dialog:import')}
          </Button>
        </div>

        <div className="text-center font-semibold py-2">OR</div>

        {/* Create Section */}
        <DialogTitle>{t('create-folder-dialog:create-title')}</DialogTitle>

        <div className="flex gap-2 items-center">
          <Input
            ref={createInputRef}
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            placeholder={t('create-folder-dialog:placeholder')}
            disabled={isLoading}
          />
          <Button onClick={handleCreate} disabled={!folderName || isLoading}>
            {isLoading
              ? t('create-folder-dialog:creating')
              : t('create-folder-dialog:create')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
