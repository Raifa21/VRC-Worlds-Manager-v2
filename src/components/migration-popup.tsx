import React, { useState } from 'react';
import { useLocalization } from '@/hooks/use-localization';
import { commands } from '@/lib/bindings';
import { info, error } from '@tauri-apps/plugin-log';
import {
  FolderOpen,
  ArrowRightLeft,
  Loader2,
  Info,
  AlertTriangle,
  FileJson,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

interface MigrationData {
  number_of_worlds: number;
  number_of_folders: number;
}

interface MigrationPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (folders_path: string, worlds_path: string) => Promise<void>;
}

export function MigrationPopup({
  open,
  onOpenChange,
  onConfirm,
}: MigrationPopupProps) {
  const { t } = useLocalization();
  const [migrationPaths, setMigrationPaths] = useState<[string, string]>([
    '',
    '',
  ]);
  const [pathValidation, setPathValidation] = useState<[boolean, boolean]>([
    false,
    false,
  ]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [migrationData, setMigrationData] = useState<MigrationData | null>(
    null,
  );

  const handleFilePick = async (index: number) => {
    try {
      const selected = await openDialog({
        directory: false,
        multiple: false,
        title:
          index === 0
            ? t('settings-page:select-worlds-file')
            : t('settings-page:select-folders-file'),
        filters: [{ name: 'JSON', extensions: ['json'] }],
      });

      if (selected === null) {
        info('File selection cancelled');
        return;
      }

      const newPaths: [string, string] = [...migrationPaths];
      newPaths[index] = selected as string;
      setMigrationPaths(newPaths);

      // Update validation
      const newValidation: [boolean, boolean] = [...pathValidation];
      newValidation[index] = true;
      setPathValidation(newValidation);

      // If both files are selected, try to get metadata
      if (newPaths[0] && newPaths[1]) {
        await validateAndLoadMetadata(newPaths[0], newPaths[1]);
      }
    } catch (e) {
      error(`Failed to select file: ${e}`);
      setErrorMessage(t('settings-page:error-select-file'));
    }
  };

  const validateAndLoadMetadata = async (
    worldsPath: string,
    foldersPath: string,
  ) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      // Check if we can read the data from these files
      const result = await commands.getMigrationMetadata(
        worldsPath,
        foldersPath,
      );

      if (result.status === 'error') {
        setErrorMessage(result.error);
        setMigrationData(null);
        setIsLoading(false);
        return;
      }
      const data: MigrationData = {
        number_of_worlds: result.data.number_of_worlds,
        number_of_folders: result.data.number_of_folders,
      };
      setMigrationData(data);
      setIsLoading(false);
    } catch (e) {
      error(`Failed to read migration data: ${e}`);
      setErrorMessage(t('settings-page:error-read-migration-files'));
      setMigrationData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!migrationPaths[0] || !migrationPaths[1]) return;

    try {
      // Pass both paths to the parent component
      await onConfirm(migrationPaths[1], migrationPaths[0]); // folders_path, worlds_path

      // Clean up and close dialog on success
      setMigrationPaths(['', '']);
      setPathValidation([false, false]);
      setMigrationData(null);
      onOpenChange(false);
    } catch (e) {
      // Parent component should handle errors
      error(`Migration confirmation error: ${e}`);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-xl">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t('settings-page:data-migration-title')}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t('settings-page:data-migration-description')}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-4">
            {/* Worlds file selection */}
            <div className="space-y-2">
              <Label>{t('general:worlds-data')}</Label>
              <div className="flex space-x-2">
                <Input
                  value={migrationPaths[0]}
                  readOnly
                  placeholder={t(
                    'settings-page:select-worlds-file-placeholder',
                  )}
                  className="text-muted-foreground flex-1"
                />
                <Button
                  variant="outline"
                  onClick={() => handleFilePick(0)}
                  className="whitespace-nowrap gap-2"
                >
                  <FileJson className="h-4 w-4" />
                  {t('general:select-button')}
                </Button>
              </div>
            </div>

            {/* Folders file selection */}
            <div className="space-y-2">
              <Label>{t('general:folders-data')}</Label>
              <div className="flex space-x-2">
                <Input
                  value={migrationPaths[1]}
                  readOnly
                  placeholder={t(
                    'settings-page:select-folders-file-placeholder',
                  )}
                  className="text-muted-foreground flex-1"
                />
                <Button
                  variant="outline"
                  onClick={() => handleFilePick(1)}
                  className="whitespace-nowrap gap-2"
                >
                  <FileJson className="h-4 w-4" />
                  {t('general:select-button')}
                </Button>
              </div>
            </div>
          </div>

          {isLoading && (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              <span>{t('settings-page:loading-migration-data')}</span>
            </div>
          )}

          {errorMessage && (
            <div className="bg-destructive/10 text-destructive rounded p-3 flex items-start">
              <Info className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {migrationData && (
            <div className="bg-muted rounded-md p-4 space-y-3">
              <div className="flex items-center gap-2">
                <SaturnIcon className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {t('settings-page:worlds-count')}:
                </span>
                <span className="text-sm">
                  {migrationData.number_of_worlds}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {t('settings-page:folders-count')}:
                </span>
                <span className="text-sm">
                  {migrationData.number_of_folders}
                </span>
              </div>
            </div>
          )}

          <div className="bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-md p-4 flex items-start">
            <AlertTriangle className="h-5 w-5 text-amber-500 mr-3 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-amber-800 dark:text-amber-300">
                {t('settings-page:warning')}
              </h4>
              <p className="text-sm text-amber-700 dark:text-amber-400">
                {t('settings-page:warning-text-1')}
                <br />
                {t('settings-page:warning-text-2')}
              </p>
            </div>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>
            {t('general:cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={
              !pathValidation[0] ||
              !pathValidation[1] ||
              isLoading ||
              !migrationData
            }
            onClick={handleConfirm}
            className="bg-primary gap-2"
          >
            {t('settings-page:start-migration')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
