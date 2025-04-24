'use client';

import React, { useContext } from 'react';
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
import { CardSize } from '@/types/preferences';
import { WorldCardPreview } from '@/components/world-card';
import { Platform } from '@/types/worlds';
import { commands } from '@/lib/bindings';
import { Loader2, LogOut, Trash2 } from 'lucide-react';
import { LocalizationContext } from './localization-context';
import { info, error } from '@tauri-apps/plugin-log';
import { Card } from './ui/card';
import { FolderOpen, Save, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
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
import { Separator } from './ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface SettingsPageProps {
  onCardSizeChange?: () => void;
  onOpenHiddenFolder: () => void;
}

export function SettingsPage({
  onCardSizeChange,
  onOpenHiddenFolder,
}: SettingsPageProps) {
  const [preferences, setPreferences] = React.useState<{
    theme: string;
    language: string;
    card_size: CardSize;
  } | null>(null);
  const { setTheme } = useTheme();
  const { toast } = useToast();
  const { t } = useLocalization();
  const [isSaving, setIsSaving] = React.useState(false);
  const { setLanguage } = useContext(LocalizationContext);
  const router = useRouter();
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [showMigrateConfirm, setShowMigrateConfirm] = React.useState(false);

  React.useEffect(() => {
    const loadPreferences = async () => {
      const themeResult = await commands.getTheme();
      const languageResult = await commands.getLanguage();
      const cardSizeResult = await commands.getCardSize();
      const theme = themeResult.status === 'ok' ? themeResult.data : 'system';
      const language =
        languageResult.status === 'ok' ? languageResult.data : 'en-US';
      const cardSize =
        cardSizeResult.status === 'ok' ? cardSizeResult.data : CardSize.Normal;
      setPreferences({
        theme,
        language,
        card_size: cardSize as CardSize,
      });
      setTheme(theme);
      // put a toast if commands fail
      if (
        themeResult.status === 'error' ||
        languageResult.status === 'error' ||
        cardSizeResult.status === 'error'
      ) {
        toast({
          title: t('general:error-title'),
          description:
            t('settings-page:error-load-preferences') +
            ': ' +
            (themeResult.status === 'error' ? themeResult.error : '') +
            (languageResult.status === 'error' ? languageResult.error : '') +
            (cardSizeResult.status === 'error' ? cardSizeResult.error : ''),
          variant: 'destructive',
        });
      }
    };

    loadPreferences();
  }, [setTheme]);

  const handlePreferenceChange = async (
    key: 'theme' | 'language' | 'card_size',
    value: string | CardSize,
  ) => {
    if (!preferences) return;

    // Update theme immediately for visual feedback
    if (key === 'theme') {
      setTheme(value as string);
    }

    // Create new preferences object
    const newPreferences = {
      ...preferences,
      [key]: value,
    };

    try {
      const result = await commands.setPreferences(
        newPreferences.theme,
        newPreferences.language,
        newPreferences.card_size,
      );

      if (result.status === 'error') {
        toast({
          title: t('general:error-title'),
          description:
            t('settings-page:error-save-preferences') + ': ' + result.error,
          variant: 'destructive',
        });
        return;
      }

      if (key === 'language') {
        setLanguage(newPreferences.language);
      }

      // Update local state after successful save
      setPreferences(newPreferences);
    } catch (e) {
      error(`Failed to save preferences: ${e}`);
      toast({
        title: t('general:error-title'),
        description: t('settings-page:error-save-preferences'),
        variant: 'destructive',
      });
    }
  };

  const handleCardSizeChange = async (value: CardSize) => {
    if (!preferences) return;

    const newPreferences = {
      ...preferences,
      card_size: value,
    };

    try {
      const result = await commands.setPreferences(
        newPreferences.theme,
        newPreferences.language,
        newPreferences.card_size,
      );

      if (result.status === 'error') {
        toast({
          title: t('general:error-title'),
          description:
            t('settings-page:error-save-preferences') + ': ' + result.error,
          variant: 'destructive',
        });
        return;
      }

      setPreferences(newPreferences);
      // Notify parent component to update card size
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

  const handleBackup = async () => {
    try {
      info('Creating backup...');
      const result = await commands.createBackup();
      if (result.status === 'error') {
        error(`Backup creation failed: ${result.error}`);
        toast({
          title: t('general:error-title'),
          description: t('settings-page:error-create-backup'),
          variant: 'destructive',
        });
        return;
      }
      info('Backup created successfully');
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

  const handleRestore = async () => {
    try {
      info('Restoring from backup...');
      const result = await commands.restoreFromBackup();
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
    } catch (e) {
      error(`Restore error: ${e}`);
      toast({
        title: t('general:error-title'),
        description: t('settings-page:error-restore-backup'),
        variant: 'destructive',
      });
    }
  };

  const handleOpenBackupFolder = async () => {
    try {
      info('Opening backup folder...');
      await commands.openBackupFolder();
    } catch (e) {
      error(`Failed to open backup folder: ${e}`);
      toast({
        title: t('general:error-title'),
        description: t('settings-page:error-open-backup-folder'),
        variant: 'destructive',
      });
    }
  };

  const handleDataMigration = async () => {
    try {
      info('Starting data migration...');
      setShowMigrateConfirm(false);
      const result = await commands.migrateData();

      if (result.status === 'error') {
        error(`Migration failed: ${result.error}`);
        toast({
          title: t('general:error-title'),
          description: t('settings-page:error-migrate-data'),
          variant: 'destructive',
        });
        return;
      }

      info('Data migration completed successfully');
      toast({
        title: t('settings-page:migrate-success-title'),
        description: t('settings-page:migrate-success-description'),
      });
    } catch (e) {
      error(`Migration error: ${e}`);
      toast({
        title: t('general:error-title'),
        description: t('settings-page:error-migrate-data'),
        variant: 'destructive',
      });
    }
  };

  const handleDataDeletion = async () => {
    try {
      info('Deleting all data...');
      setShowDeleteConfirm(false);
      const result = await commands.deleteAllData();

      if (result.status === 'error') {
        error(`Data deletion failed: ${result.error}`);
        toast({
          title: t('general:error-title'),
          description: t('settings-page:error-delete-data'),
          variant: 'destructive',
        });
        return;
      }

      info('Data deletion completed successfully');
      toast({
        title: t('settings-page:delete-success-title'),
        description: t('settings-page:delete-success-description'),
      });

      // Redirect to setup page after successful deletion
      router.push('/setup');
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

  if (!preferences) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">{t('general:settings')}</h1>

      <Tabs defaultValue="preferences" className="w-full">
        <TabsList className="grid grid-cols-3 mb-6">
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
              value={preferences.theme}
              onValueChange={(value) => handlePreferenceChange('theme', value)}
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
              value={preferences.language}
              onValueChange={(value) =>
                handlePreferenceChange('language', value)
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ja-JP">日本語</SelectItem>
                <SelectItem value="en-US">English (US)</SelectItem>
                <SelectItem value="en-UK" disabled>
                  English (UK)
                </SelectItem>
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
                value={preferences.card_size}
                onValueChange={handleCardSizeChange}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Card Size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={CardSize.Compact}>
                    {t('general:compact')}
                  </SelectItem>
                  <SelectItem value={CardSize.Normal}>
                    {t('general:normal')}
                  </SelectItem>
                  <SelectItem value={CardSize.Expanded}>
                    {t('general:expanded')}
                  </SelectItem>
                  <SelectItem value={CardSize.Original}>
                    {t('general:original')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <WorldCardPreview
              size={preferences.card_size}
              world={{
                worldId: '1',
                name: t('settings-page:preview-world'),
                thumbnailUrl: 'icons/1.png',
                authorName: t('general:sort-author'),
                lastUpdated: '2025-02-28',
                visits: 1911,
                dateAdded: '2025-01-01',
                favorites: 616,
                platform: Platform.CrossPlatform,
                folders: [],
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
              <span className="text-sm">{t('settings-page:open-folder')}</span>
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
                onClick={handleRestore}
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
                {t('settings-page:data-migration-title')}
              </Label>
              <div className="text-sm text-muted-foreground">
                {t('settings-page:data-migration-description')}
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowMigrateConfirm(true)}
              className="gap-2"
              disabled
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
              disabled
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
                {t('settings-page:logout-title')}
              </Label>
              <div className="text-sm text-muted-foreground">
                {t('settings-page:logout-description')}
              </div>
            </div>
            <Button
              variant="outline"
              onClick={handleLogout}
              className="gap-2"
              disabled
            >
              <LogOut className="h-4 w-4" />
              <span className="text-sm">{t('settings-page:logout')}</span>
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
            <Select value="stable" onValueChange={() => {}} disabled>
              <SelectTrigger className="w-fit px-2">
                <SelectValue placeholder="Update Channel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="stable">
                  {t('settings-page:channel-stable')}
                </SelectItem>
                <SelectItem value="pre-release">
                  {t('settings-page:channel-prerelease')}
                </SelectItem>
              </SelectContent>
            </Select>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Alert Dialog for Data Deletion */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('settings-page:delete-confirm-title')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('settings-page:delete-confirm-description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('general:cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDataDeletion}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('settings-page:delete-confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
