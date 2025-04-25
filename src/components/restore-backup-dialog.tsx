import React, { useState } from 'react';
import { useLocalization } from '@/hooks/use-localization';
import { commands } from '@/lib/bindings';
import { info, error } from '@tauri-apps/plugin-log';
import { FolderOpen } from 'lucide-react';
import { Calendar, Info, AlertTriangle, Loader2, Folder } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import { SaturnIcon } from './icons/saturn-icon';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';

interface BackupMetadata {
  date: string;
  number_of_worlds: number;
  number_of_folders: number;
}

interface RestoreBackupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (path: string) => Promise<void>;
}

export function RestoreBackupDialog({
  open,
  onOpenChange,
  onConfirm,
}: RestoreBackupDialogProps) {
  const { t } = useLocalization();
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<BackupMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleDateConversion = (dateString: string) => {
    //dateString in the form: 2025-04-25_04-22-51
    const dateParts = dateString.split('_');
    const date = dateParts[0];
    return date;
  };

  const handleSelectBackup = async () => {
    try {
      const selectedDir = await openDialog({
        directory: true,
        multiple: false,
        title: t('settings-page:select-restore-directory'),
      });

      if (selectedDir === null) {
        info('Backup selection cancelled');
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);
      const backupPath = selectedDir as string;

      // Try to load backup metadata
      const result = await commands.getBackupMetadata(backupPath);

      if (result.status === 'error') {
        setErrorMessage(result.error);
        setSelectedPath(null);
        setMetadata(null);
        setIsLoading(false);
        return;
      }

      setSelectedPath(backupPath);

      const metadata: BackupMetadata = {
        date: handleDateConversion(result.data.date),
        number_of_worlds: result.data.number_of_worlds,
        number_of_folders: result.data.number_of_folders,
      };
      setMetadata(metadata);
      setIsLoading(false);
    } catch (e) {
      error(`Failed to select backup: ${e}`);
      setErrorMessage(t('settings-page:error-read-backup'));
      setIsLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!selectedPath) return;
    try {
      await onConfirm(selectedPath);
      setSelectedPath(null);
      setMetadata(null);
      onOpenChange(false);
    } catch (e) {
      // Error handling is done in the parent component
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-xl">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t('settings-page:restore-backup')}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t('settings-page:restore-backup-description')}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex justify-between items-center w-full">
              <span>{t('settings-page:backup-location')}</span>
              <Button
                variant="outline"
                onClick={handleSelectBackup}
                className="gap-2 whitespace-nowrap"
              >
                <FolderOpen className="h-4 w-4" />
                {t('settings-page:select-backup')}
              </Button>
            </div>
          </div>

          {isLoading && (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              <span>{t('settings-page:loading-backup-info')}</span>
            </div>
          )}

          {errorMessage && (
            <div className="bg-destructive/10 text-destructive rounded p-3 flex items-start">
              <Info className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {metadata && selectedPath && (
            <>
              <div className="bg-muted rounded-md p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    {t('settings-page:backup-created')}:
                  </span>
                  <span className="text-sm">{metadata.date}</span>
                </div>

                <div className="flex items-center gap-2">
                  <SaturnIcon className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    {t('settings-page:worlds-count')}:
                  </span>
                  <span className="text-sm">{metadata.number_of_worlds}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Folder className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    {t('settings-page:folders-count')}:
                  </span>
                  <span className="text-sm">{metadata.number_of_folders}</span>
                </div>

                <div className="flex items-start gap-2 text-muted-foreground">
                  <Info className="h-4 w-4 mt-0.5" />
                  <div className="flex flex-col break-words">
                    <span className="text-sm font-medium">
                      {t('settings-page:backup-location')}:
                    </span>
                    <span className="text-sm break-words">{selectedPath}</span>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-md p-4 flex items-start">
                <AlertTriangle className="h-5 w-5 text-amber-500 mr-3 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-amber-800 dark:text-amber-300">
                    {t('settings-page:warning')}
                  </h4>
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    {t('settings-page:restore-warning-1')}
                    <br />
                    {t('settings-page:restore-warning-2')}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>{t('general:cancel')}</AlertDialogCancel>
          <AlertDialogAction
            disabled={!selectedPath || isLoading}
            onClick={handleConfirm}
            className="bg-primary"
          >
            {t('settings-page:restore-confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
