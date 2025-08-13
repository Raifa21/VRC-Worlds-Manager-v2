'use client';

import React, { useContext, useState } from 'react';
import { useTheme } from 'next-themes';
import { useToast } from '@/hooks/use-toast';
import { useLocalization } from '@/hooks/use-localization';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { WorldCardPreview } from '@/components/world-card';
import { Platform } from '@/types/worlds';
import {
  commands,
  FolderRemovalPreference,
  UpdateChannel,
  CardSize,
} from '@/lib/bindings';
import {
  Loader2,
  LogOut,
  Trash2,
  Upload,
  FolderOpen,
  Save,
  FolderUp,
} from 'lucide-react';
import { LocalizationContext } from '../../../../../components/localization-context';
import { info, error } from '@tauri-apps/plugin-log';
import { Card } from '../../../../../components/ui/card';
import { useRouter } from 'next/navigation';
import { open } from '@tauri-apps/plugin-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RestoreBackupDialog } from '@/app/listview/components/views/settings/components/popups/restore-backup-dialog';
import { MigrationPopup } from '@/components/migration-popup';
import { DeleteDataConfirmationDialog } from '@/app/listview/components/views/settings/components/popups/delete-data-confirmation';
import { ExportPopup, ExportType } from './components/popups/export';

interface SettingsPageProps {
  onCardSizeChange?: () => void;
  onOpenHiddenFolder: () => void;
  onDataChange: () => void;
}

export function SettingsPage({
  onCardSizeChange,
  onOpenHiddenFolder,
  onDataChange,
}: SettingsPageProps) {
  const { toast } = useToast();
  const { t } = useLocalization();
  const [isSaving, setIsSaving] = React.useState(false);
  const { setTheme } = useTheme();
  const { setLanguage: changeLanguage } = useContext(LocalizationContext);
  const [language, setLanguage] = React.useState<string>('en-US');
  const [cardSize, setCardSize] = React.useState<CardSize | null>(null);
  const [folderRemovalPreference, setFolderRemovalPreference] =
    React.useState<FolderRemovalPreference | null>(null);
  const [updateChannel, setUpdateChannel] =
    React.useState<UpdateChannel | null>(null);

  const router = useRouter();
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [showMigrateDialog, setShowMigrateDialog] = React.useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);

  // Add missing export confirm handler
  const handleExportConfirm = async (
    folders: string[],
    exportType: ExportType,
  ) => {
    try {
      let result;
      switch (exportType) {
        case ExportType.PLS:
          info('Exporting to Portal Library System...');
          result = await commands.exportToPortalLibrarySystem(folders);
          break;
        default:
          error(`Unknown export type: ${exportType}`);
          toast({
            title: t('general:error-title'),
            description: t('settings-page:error-unknown-export-type'),
            variant: 'destructive',
          });
          return;
      }
      if (result.status === 'error') {
        error(`Export failed: ${result.error}`);
        toast({
          title: t('general:error-title'),
          description: t('settings-page:error-export-data'),
          variant: 'destructive',
        });
        return;
      }
      info('Export completed successfully');
      toast({
        title: t('settings-page:export-success-title'),
        description: t('settings-page:export-success-description'),
      });
    } catch (e) {
      error(`Export error: ${e}`);
      toast({
        title: t('general:error-title'),
        description: t('settings-page:error-export-data'),
        variant: 'destructive',
      });
    }
  };

  React.useEffect(() => {
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
          toast({
            title: t('general:error-title'),
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
            variant: 'destructive',
          });
        }
      } catch (e) {
        error(`Failed to load preferences: ${e}`);
        toast({
          title: t('general:error-title'),
          description: t('settings-page:error-load-preferences'),
          variant: 'destructive',
        });
      }
    };

    loadPreferences();
  }, [setTheme]);

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
        toast({
          title: t('general:error-title'),
          description: t('settings-page:error-create-backup'),
          variant: 'destructive',
        });
        return;
      }

      info(`Backup created successfully at: ${backupPath}`);
      toast({
        title: t('settings-page:backup-success-title'),
        description: t('settings-page:backup-success-description'),
      });
    } catch (e) {
      error(`Backup error: ${e}`);
      toast({
        title: t('general:error-title'),
        description: t('settings-page:error-create-backup'),
        variant: 'destructive',
      });
    }
  };

  const handleRestoreConfirm = async (path: string) => {
    try {
      info(`Restoring from backup: ${path}`);
      const result = await commands.restoreFromBackup(path);

      if (result.status === 'error') {
        error(`Restore failed: ${result.error}`);
        toast({
          title: t('general:error-title'),
          description: t('settings-page:error-restore-backup'),
          variant: 'destructive',
        });
        return;
      }

      info('Restore completed successfully');
      toast({
        title: t('settings-page:restore-success-title'),
        description: t('settings-page:restore-success-description'),
      });
      onDataChange();
    } catch (e) {
      error(`Restore error: ${e}`);
      toast({
        title: t('general:error-title'),
        description: t('settings-page:error-restore-backup'),
        variant: 'destructive',
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
        toast({
          title: t('general:error-title'),
          description: t('settings-page:error-migrate-data'),
          variant: 'destructive',
        });
        return;
      }

      info('Migration completed successfully');
      toast({
        title: t('settings-page:migration-success-title'),
        description: t('settings-page:migration-success-description'),
      });
      onDataChange();
    } catch (e) {
      error(`Migration error: ${e}`);
      toast({
        title: t('general:error-title'),
        description: t('settings-page:error-migrate-data'),
        variant: 'destructive',
      });
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      info('Deleting all data...');
      const result = await commands.deleteData();
      if (result.status === 'error') {
        error(`Data deletion failed: ${result.error}`);
        toast({
          title: t('general:error-title'),
          description: t('settings-page:error-delete-data'),
          variant: 'destructive',
        });
        return;
      }
      info('Data deleted successfully');
      toast({
        title: t('settings-page:delete-success-title'),
        description: t('settings-page:delete-success-description'),
      });

      setShowDeleteConfirm(false);
      onDataChange();
    } catch (e) {
      error(`Data deletion error: ${e}`);
      toast({
        title: t('general:error-title'),
        description: t('settings-page:error-delete-data'),
        variant: 'destructive',
      });
    }
  };

  const handleLogout = async () => {
    try {
      info('Logging out...');
      const result = await commands.logout();

      if (result.status === 'error') {
        error(`Logout failed: ${result.error}`);
        toast({
          title: t('general:error-title'),
          description: t('settings-page:error-logout'),
          variant: 'destructive',
        });
        return;
      }

      info('Logged out successfully');
      router.push('/login');
    } catch (e) {
      error(`Logout error: ${e}`);
      toast({
        title: t('general:error-title'),
        description: t('settings-page:error-logout'),
        variant: 'destructive',
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
      toast({
        title: t('general:error-title'),
        description: t('general:error-open-logs'),
        variant: 'destructive',
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
        toast({
          title: t('general:error-title'),
          description:
            t('settings-page:error-save-preferences') + ': ' + result.error,
          variant: 'destructive',
        });
      }
    } catch (e) {
      error(`Failed to save theme: ${e}`);
      toast({
        title: t('general:error-title'),
        description: t('settings-page:error-save-preferences'),
        variant: 'destructive',
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
        toast({
          title: t('general:error-title'),
          description:
            t('settings-page:error-save-preferences') + ': ' + result.error,
          variant: 'destructive',
        });
      }
    } catch (e) {
      error(`Failed to save language: ${e}`);
      toast({
        title: t('general:error-title'),
        description: t('settings-page:error-save-preferences'),
        variant: 'destructive',
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
        toast({
          title: t('general:error-title'),
          description:
            t('settings-page:error-save-preferences') + ': ' + result.error,
          variant: 'destructive',
        });
        return;
      }
      onCardSizeChange?.();
    } catch (e) {
      error(`Failed to save card size: ${e}`);
      toast({
        title: t('general:error-title'),
        description: t('settings-page:error-save-preferences'),
        variant: 'destructive',
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
        toast({
          title: t('general:error-title'),
          description:
            t('settings-page:error-save-preferences') + ': ' + result.error,
          variant: 'destructive',
        });
      }
    } catch (e) {
      error(`Failed to save folder removal preference: ${e}`);
      toast({
        title: t('general:error-title'),
        description: t('settings-page:error-save-preferences'),
        variant: 'destructive',
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
        toast({
          title: t('general:error-title'),
          description:
            t('settings-page:error-save-preferences') + ': ' + result.error,
          variant: 'destructive',
        });
      }
    } catch (e) {
      error(`Failed to save update channel: ${e}`);
      toast({
        title: t('general:error-title'),
        description: t('settings-page:error-save-preferences'),
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">{t('general:settings')}</h1>
      <Tabs defaultValue="preferences" className="w-full">
        <div className="sticky top-0 z-10 bg-background pt-2 pb-2">
          <TabsList className="grid grid-cols-3">
            <TabsTrigger value="preferences">
              {t('settings-page:section-preferences')}
            </TabsTrigger>
            <TabsTrigger value="data-management">
              {t('settings-page:section-data-management')}
            </TabsTrigger>
            <TabsTrigger value="others">
              {t('settings-page:section-others')}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="preferences" className="space-y-4">
          <Card className="flex flex-row items-center justify-between p-4 rounded-lg border">
            <div className="flex flex-col space-y-1.5">
              <Label className="text-base font-medium">
                {t('general:theme-label')}
              </Label>
              <div className="text-sm text-muted-foreground">
                {t('general:theme-description')}
              </div>
            </div>
            <Select
              value={useTheme().theme || 'system'}
              onValueChange={(value) => handleThemeChange(value)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Theme" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">{t('general:light')}</SelectItem>
                <SelectItem value="dark">{t('general:dark')}</SelectItem>
                <SelectItem value="system">{t('general:system')}</SelectItem>
              </SelectContent>
            </Select>
          </Card>

          <Card className="flex flex-row items-center justify-between p-4 rounded-lg border">
            <div className="flex flex-col space-y-1.5">
              <Label className="text-base font-medium">
                {t('general:language-label')}
              </Label>
              <div className="text-sm text-muted-foreground">
                {t('general:language-description')}
              </div>
            </div>
            <Select
              value={language || 'en-US'}
              onValueChange={(value) => handleLanguageChange(value)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ja-JP">日本語</SelectItem>
                <SelectItem value="en-US">English</SelectItem>
              </SelectContent>
            </Select>
          </Card>

          <Card className="flex flex-col items-start justify-between space-y-3 p-4 rounded-lg border">
            <div className="flex flex-row justify-between w-full">
              <div className="flex flex-col space-y-1.5">
                <Label className="text-base font-medium">
                  {t('settings-page:world-card-size')}
                </Label>
                <div className="text-sm text-muted-foreground">
                  {t('settings-page:world-card-description')}
                </div>
              </div>
              <Select
                value={cardSize || 'Normal'}
                onValueChange={handleCardSizeChange}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Card Size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Compact">
                    {t('general:compact')}
                  </SelectItem>
                  <SelectItem value="Normal">{t('general:normal')}</SelectItem>
                  <SelectItem value="Expanded">
                    {t('general:expanded')}
                  </SelectItem>
                  <SelectItem value="Original">
                    {t('general:original')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <WorldCardPreview
              size={cardSize || 'Normal'}
              world={{
                worldId: '1',
                name: t('settings-page:preview-world'),
                thumbnailUrl: 'icons/1.png',
                authorName: t('general:author'),
                lastUpdated: '2025-02-28',
                visits: 1911,
                dateAdded: '2025-01-01',
                favorites: 616,
                platform: Platform.CrossPlatform,
                folders: [],
                tags: [],
                capacity: 16,
              }}
            />
          </Card>
        </TabsContent>

        <TabsContent value="data-management" className="space-y-4">
          <Card className="flex flex-row items-center justify-between p-4 rounded-lg border">
            <div className="flex flex-col space-y-1.5">
              <Label className="text-base font-medium">
                {t('settings-page:hidden-folder')}
              </Label>
              <div className="text-sm text-muted-foreground">
                {t('settings-page:hidden-folder-description')}
              </div>
            </div>
            <Button
              variant="outline"
              onClick={onOpenHiddenFolder}
              className="gap-2"
            >
              <FolderOpen className="h-4 w-4" />
              <span className="text-sm">{t('general:open-folder')}</span>
            </Button>
          </Card>

          <Card className="flex flex-row items-center justify-between p-4 rounded-lg border">
            <div className="flex flex-col space-y-1.5">
              <Label className="text-base font-medium">
                {t('settings-page:backup-title')}
              </Label>
              <div className="text-sm text-muted-foreground">
                {t('settings-page:backup-description')}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                onClick={handleBackup}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                <span className="text-sm">
                  {t('settings-page:create-backup')}
                </span>
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowRestoreDialog(true)}
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                <span className="text-sm">
                  {t('settings-page:restore-backup')}
                </span>
              </Button>
            </div>
          </Card>
          <Card className="flex flex-row items-center justify-between p-4 rounded-lg border">
            <div className="flex flex-col space-y-1.5">
              <Label className="text-base font-medium">
                {t('settings-page:export-title')}
              </Label>
              <div className="text-sm text-muted-foreground">
                {t('settings-page:export-description')}
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowExportDialog(true)}
              className="gap-2"
            >
              <FolderUp className="h-4 w-4" />
              <span className="text-sm">{t('settings-page:export-data')}</span>
            </Button>
          </Card>

          <Card className="flex flex-row items-center justify-between p-4 rounded-lg border">
            <div className="flex flex-col space-y-1.5">
              <Label className="text-base font-medium">
                {t('settings-page:data-migration-title')}
              </Label>
              <div className="text-sm text-muted-foreground">
                {t('settings-page:data-migration-description')}
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowMigrateDialog(true)}
              className="gap-2"
            >
              <span className="text-sm">{t('settings-page:migrate-data')}</span>
            </Button>
          </Card>

          <Card className="flex flex-row items-center justify-between p-4 rounded-lg border border-destructive bg-destructive/5">
            <div className="flex flex-col space-y-1.5">
              <Label className="text-base font-medium">
                {t('settings-page:data-deletion-title')}
              </Label>
              <div className="text-sm text-muted-foreground">
                {t('settings-page:data-deletion-description')}
              </div>
            </div>
            <Button
              variant="destructive"
              onClick={() => setShowDeleteConfirm(true)}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              <span className="text-sm">
                {t('settings-page:delete-all-data')}
              </span>
            </Button>
          </Card>
        </TabsContent>

        <TabsContent value="others" className="space-y-4">
          <Card className="flex flex-row items-center justify-between p-4 rounded-lg border">
            <div className="flex flex-col space-y-1.5">
              <Label className="text-base font-medium">
                {t('settings-page:folder-removal-title')}
              </Label>
              <div className="text-sm text-muted-foreground">
                {t('settings-page:folder-removal-description')}
              </div>
            </div>
            <Select
              value={folderRemovalPreference ?? 'ask'}
              onValueChange={(value) =>
                handleFolderRemovalPreferenceChange(
                  value as FolderRemovalPreference,
                )
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Folder Removal Preference" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ask">
                  {t('settings-page:folder-removal-ask')}
                </SelectItem>
                <SelectItem value="neverRemove">
                  {t('settings-page:folder-removal-keep')}
                </SelectItem>
                <SelectItem value="alwaysRemove">
                  {t('settings-page:folder-removal-remove')}
                </SelectItem>
              </SelectContent>
            </Select>
          </Card>

          <Card className="flex flex-row items-center justify-between p-4 rounded-lg border">
            <div className="flex flex-col space-y-1.5">
              <Label className="text-base font-medium">
                {t('settings-page:logs-title')}
              </Label>
              <div className="text-sm text-muted-foreground">
                {t('settings-page:logs-description')}
              </div>
            </div>
            <Button
              variant="outline"
              onClick={handleOpenLogs}
              className="gap-2"
            >
              <FolderOpen className="h-4 w-4" />
              <span className="text-sm">{t('general:open-folder')}</span>
            </Button>
          </Card>

          <Card className="flex flex-row items-center justify-between p-4 rounded-lg border">
            <div className="flex flex-col space-y-1.5">
              <Label className="text-base font-medium">
                {t('settings-page:update-channel-title')}
              </Label>
              <div className="text-sm text-muted-foreground">
                {t('settings-page:update-channel-description')}
              </div>
            </div>
            <Select
              value={updateChannel || 'stable'}
              onValueChange={(value) =>
                handleUpdateChannelChange(value as UpdateChannel)
              }
            >
              <SelectTrigger className="w-fit px-2">
                <SelectValue placeholder="Update Channel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="stable">
                  {t('settings-page:update-channel-stable')}
                </SelectItem>
                <SelectItem value="pre-release">
                  {t('settings-page:update-channel-prerelease')}
                </SelectItem>
              </SelectContent>
            </Select>
          </Card>

          <Card className="flex flex-row items-center justify-between p-4 rounded-lg border">
            <div className="flex flex-col space-y-1.5">
              <Label className="text-base font-medium">
                {t('settings-page:logout-title')}
              </Label>
              <div className="text-sm text-muted-foreground">
                {t('settings-page:logout-description')}
              </div>
            </div>
            <Button variant="outline" onClick={handleLogout} className="gap-2">
              <LogOut className="h-4 w-4" />
              <span className="text-sm">{t('settings-page:logout')}</span>
            </Button>
          </Card>
        </TabsContent>
      </Tabs>

      <RestoreBackupDialog
        open={showRestoreDialog}
        onOpenChange={setShowRestoreDialog}
        onConfirm={handleRestoreConfirm}
      />
      <ExportPopup
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        onConfirm={handleExportConfirm}
      />
      <MigrationPopup
        open={showMigrateDialog}
        onOpenChange={setShowMigrateDialog}
        onConfirm={handleMigrationConfirm}
      />
      <DeleteDataConfirmationDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
