import { useLocalization } from '@/hooks/use-localization';
import {
  CardSize,
  commands,
  FolderRemovalPreference,
  UpdateChannel,
} from '@/lib/bindings';
import { error, info } from '@tauri-apps/plugin-log';
import { useContext, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { open } from '@tauri-apps/plugin-dialog';
import { ExportType } from './components/popups/export';
import { useRouter } from 'next/navigation';
import { LocalizationContext } from '../../../components/localization-context';
import { useFolders } from '../hook/use-folders';
import { useTheme } from 'next-themes';
import { onOpenUrl } from '@tauri-apps/plugin-deep-link';

export const useSettingsPage = () => {
  const [cardSize, setCardSize] = useState<CardSize>('Normal');
  const [language, setLanguage] = useState<string>('en-US');
  const [folderRemovalPreference, setFolderRemovalPreference] =
    useState<FolderRemovalPreference | null>(null);
  const [updateChannel, setUpdateChannel] = useState<UpdateChannel | null>(
    null,
  );

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showMigrateDialog, setShowMigrateDialog] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);

  const router = useRouter();

  const { setLanguage: changeLanguage } = useContext(LocalizationContext);

  const { refresh: onDataChange } = useFolders();

  const { setTheme } = useTheme();

  // Add missing export confirm handler
  const handleExportConfirm = async (
    folders: string[],
    exportType: ExportType,
    sortField: string,
    sortDirection: string,
  ) => {
    try {
      let result;
      switch (exportType) {
        case ExportType.PLS:
          info('Exporting to Portal Library System...');
          result = await commands.exportToPortalLibrarySystem(
            folders,
            sortField,
            sortDirection,
          );
          break;
        default:
          error(`Unknown export type: ${exportType}`);
          toast(t('general:error-title'), {
            description: t('settings-page:error-unknown-export-type'),
          });
          return;
      }
      if (result.status === 'error') {
        error(`Export failed: ${result.error}`);
        toast(t('general:error-title'), {
          description: t('settings-page:error-export-data'),
        });
        return;
      }
      info('Export completed successfully');
      toast(t('settings-page:export-success-title'), {
        description: t('settings-page:export-success-description'),
      });
    } catch (e) {
      error(`Export error: ${e}`);
      toast(t('general:error-title'), {
        description: t('settings-page:error-export-data'),
      });
    }
  };

  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const themeResult = await commands.getTheme();
        const languageResult = await commands.getLanguage();
        const cardSizeResult = await commands.getCardSize();
        const updateChannelResult = await commands.getUpdateChannel();
        const folderRemovalPreferenceResult =
          await commands.getFolderRemovalPreference();
        const theme = themeResult.status === 'ok' ? themeResult.data : 'system';
        const language =
          languageResult.status === 'ok' ? languageResult.data : 'en-US';
        const cardSize =
          cardSizeResult.status === 'ok' ? cardSizeResult.data : 'Normal';
        const updateChannel =
          updateChannelResult.status === 'ok'
            ? updateChannelResult.data
            : 'stable';

        const folderRemovalPreference =
          folderRemovalPreferenceResult.status === 'ok'
            ? folderRemovalPreferenceResult.data
            : 'ask';
        setTheme(theme);
        setLanguage(language);
        setCardSize(cardSize);
        setFolderRemovalPreference(folderRemovalPreference);
        setUpdateChannel(updateChannel);
        // put a toast if commands fail
        if (
          themeResult.status === 'error' ||
          languageResult.status === 'error' ||
          cardSizeResult.status === 'error' ||
          updateChannelResult.status === 'error' ||
          folderRemovalPreferenceResult.status === 'error'
        ) {
          toast(t('general:error-title'), {
            description:
              t('settings-page:error-load-preferences') +
              ': ' +
              (themeResult.status === 'error' ? themeResult.error : '') +
              (languageResult.status === 'error' ? languageResult.error : '') +
              (cardSizeResult.status === 'error' ? cardSizeResult.error : '') +
              (updateChannelResult.status === 'error'
                ? updateChannelResult.error
                : '') +
              (folderRemovalPreferenceResult.status === 'error'
                ? folderRemovalPreferenceResult.error
                : ''),
          });
        }
      } catch (e) {
        error(`Failed to load preferences: ${e}`);
        toast(t('general:error-title'), {
          description: t('settings-page:error-load-preferences'),
        });
      }
    };

    loadPreferences();
  }, [setTheme]);

  const { t } = useLocalization();

  const handleBackup = async () => {
    try {
      info('Creating backup...');

      // Ask user to select a directory for backup
      const selectedDir = await open({
        directory: true,
        multiple: false,
        title: t('settings-page:select-backup-directory'),
      });

      // If user cancelled the selection
      if (selectedDir === null) {
        info('Backup cancelled: No directory selected');
        return;
      }

      const backupPath = selectedDir as string;
      info(`Selected backup directory: ${backupPath}`);

      const result = await commands.createBackup(backupPath);

      if (result.status === 'error') {
        error(`Backup creation failed: ${result.error}`);
        toast(t('general:error-title'), {
          description: t('settings-page:error-create-backup'),
        });
        return;
      }

      info(`Backup created successfully at: ${backupPath}`);
      toast(t('settings-page:backup-success-title'), {
        description: t('settings-page:backup-success-description'),
      });
    } catch (e) {
      error(`Backup error: ${e}`);
      toast(t('general:error-title'), {
        description: t('settings-page:error-create-backup'),
      });
    }
  };

  const handleRestoreConfirm = async (path: string) => {
    try {
      info(`Restoring from backup: ${path}`);
      const result = await commands.restoreFromBackup(path);

      if (result.status === 'error') {
        error(`Restore failed: ${result.error}`);
        toast(t('general:error-title'), {
          description: t('settings-page:error-restore-backup'),
        });
        return;
      }

      info('Restore completed successfully');
      toast(t('settings-page:restore-success-title'), {
        description: t('settings-page:restore-success-description'),
      });
      onDataChange();
    } catch (e) {
      error(`Restore error: ${e}`);
      toast(t('general:error-title'), {
        description: t('settings-page:error-restore-backup'),
      });
    }
  };

  const handleMigrationConfirm = async (
    worldsPath: string,
    foldersPath: string,
  ) => {
    try {
      info(`Migrating data from ${worldsPath} and ${foldersPath}`);
      const result = await commands.migrateOldData(worldsPath, foldersPath);

      if (result.status === 'error') {
        error(`Migration failed: ${result.error}`);
        toast(t('general:error-title'), {
          description: t('settings-page:error-migrate-data'),
        });
        return;
      }

      info('Migration completed successfully');
      toast(t('settings-page:migration-success-title'), {
        description: t('settings-page:migration-success-description'),
      });
      onDataChange();
    } catch (e) {
      error(`Migration error: ${e}`);
      toast(t('general:error-title'), {
        description: t('settings-page:error-migrate-data'),
      });
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      info('Deleting all data...');
      const result = await commands.deleteData();
      if (result.status === 'error') {
        error(`Data deletion failed: ${result.error}`);
        toast(t('general:error-title'), {
          description: t('settings-page:error-delete-data'),
        });
        return;
      }
      info('Data deleted successfully');
      toast(t('settings-page:delete-success-title'), {
        description: t('settings-page:delete-success-description'),
      });

      setShowDeleteConfirm(false);
      onDataChange();
    } catch (e) {
      error(`Data deletion error: ${e}`);
      toast(t('general:error-title'), {
        description: t('settings-page:error-delete-data'),
      });
    }
  };

  const handleLogout = async () => {
    try {
      info('Logging out...');
      const result = await commands.logout();

      if (result.status === 'error') {
        error(`Logout failed: ${result.error}`);
        toast(t('general:error-title'), {
          description: t('settings-page:error-logout'),
        });
        return;
      }

      info('Logged out successfully');
      router.push('/login');
    } catch (e) {
      error(`Logout error: ${e}`);
      toast(t('general:error-title'), {
        description: t('settings-page:error-logout'),
      });
    }
  };

  const handleOpenLogs = async () => {
    try {
      const result = await commands.openLogsDirectory();

      if (result.status === 'ok') {
        info('Opened logs directory');
      } else {
        error(`Failed to open logs directory: ${result.error}`);
      }
    } catch (e) {
      error(`Failed to open logs directory: ${e}`);
      toast(t('general:error-title'), {
        description: t('general:error-open-logs'),
      });
    }
  };

  const handleThemeChange = async (value: string) => {
    try {
      info(`Setting theme to: ${value}`);
      const result = await commands.setTheme(value);

      if (result.status === 'ok') {
        setTheme(value);
        info(`Theme set to: ${value}`);
      } else {
        error(`Failed to set theme: ${result.error}`);
        toast(t('general:error-title'), {
          description:
            t('settings-page:error-save-preferences') + ': ' + result.error,
        });
      }
    } catch (e) {
      error(`Failed to save theme: ${e}`);
      toast(t('general:error-title'), {
        description: t('settings-page:error-save-preferences'),
      });
    }
  };

  const handleLanguageChange = async (value: string) => {
    try {
      info(`Setting language to: ${value}`);
      const result = await commands.setLanguage(value);
      if (result.status === 'ok') {
        changeLanguage(value);
        setLanguage(value);
        info(`Language set to: ${value}`);
      } else {
        error(`Failed to set language: ${result.error}`);
        toast(t('general:error-title'), {
          description:
            t('settings-page:error-save-preferences') + ': ' + result.error,
        });
      }
    } catch (e) {
      error(`Failed to save language: ${e}`);
      toast(t('general:error-title'), {
        description: t('settings-page:error-save-preferences'),
      });
    }
  };

  const handleCardSizeChange = async (value: CardSize) => {
    try {
      info(`Setting card size to: ${value}`);
      const result = await commands.setCardSize(value);
      if (result.status === 'ok') {
        setCardSize(value);
        info(`Card size set to: ${value}`);
      } else {
        error(`Failed to set card size: ${result.error}`);
        toast(t('general:error-title'), {
          description:
            t('settings-page:error-save-preferences') + ': ' + result.error,
        });
        return;
      }
    } catch (e) {
      error(`Failed to save card size: ${e}`);
      toast(t('general:error-title'), {
        description: t('settings-page:error-save-preferences'),
      });
    }
  };

  const handleFolderRemovalPreferenceChange = async (
    value: FolderRemovalPreference,
  ) => {
    try {
      info(`Setting folder removal preference to: ${value}`);
      const result = await commands.setFolderRemovalPreference(value);
      if (result.status === 'ok') {
        info(`Folder removal preference set to: ${value}`);
        setFolderRemovalPreference(value);
      } else {
        error(`Failed to set folder removal preference: ${result.error}`);
        toast(t('general:error-title'), {
          description:
            t('settings-page:error-save-preferences') + ': ' + result.error,
        });
      }
    } catch (e) {
      error(`Failed to save folder removal preference: ${e}`);
      toast(t('general:error-title'), {
        description: t('settings-page:error-save-preferences'),
      });
    }
  };

  const handleUpdateChannelChange = async (value: UpdateChannel) => {
    try {
      info(`Setting update channel to: ${value}`);
      const result = await commands.setUpdateChannel(value);
      if (result.status === 'ok') {
        setUpdateChannel(value);
        info(`Update channel set to: ${value}`);
      } else {
        error(`Failed to set update channel: ${result.error}`);
        toast(t('general:error-title'), {
          description:
            t('settings-page:error-save-preferences') + ': ' + result.error,
        });
      }
    } catch (e) {
      error(`Failed to save update channel: ${e}`);
      toast(t('general:error-title'), {
        description: t('settings-page:error-save-preferences'),
      });
    }
  };

  const openHiddenFolder = () => {
    router.push('/listview/folders/hidden');
  };

  return {
    cardSize,
    language,
    folderRemovalPreference,
    updateChannel,
    showDeleteConfirm,
    setShowDeleteConfirm,
    showMigrateDialog,
    setShowMigrateDialog,
    showRestoreDialog,
    setShowRestoreDialog,
    showExportDialog,
    setShowExportDialog,
    handleExportConfirm,
    handleBackup,
    handleRestoreConfirm,
    handleMigrationConfirm,
    handleDeleteConfirm,
    handleLogout,
    handleOpenLogs,
    handleThemeChange,
    handleLanguageChange,
    handleCardSizeChange,
    handleFolderRemovalPreferenceChange,
    handleUpdateChannelChange,
    openHiddenFolder,
    t,
  };
};
