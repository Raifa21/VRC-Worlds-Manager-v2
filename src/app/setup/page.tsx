'use client';

import React, { useState, useEffect, useContext } from 'react';
import { Button } from '@/components/ui/button';
import { invoke } from '@tauri-apps/api/core';
import { useTheme } from 'next-themes';
import { open } from '@tauri-apps/plugin-dialog';
import { Platform } from '@/types/worlds';
import { useRouter } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { WorldCardPreview } from '@/components/world-card';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Loader2, Globe } from 'lucide-react';
import { commands, CardSize } from '@/lib/bindings';
import { SetupLayout } from '@/app/setup/components/setup-layout';
import { useLocalization } from '@/hooks/use-localization';
import { LocalizationContext } from '@/components/localization-context';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { info, error } from '@tauri-apps/plugin-log';
import { SaturnIcon } from '@/components/icons/saturn-icon';
import { FolderOpen, Info } from 'lucide-react';
import { MigrationConfirmationPopup } from '@/app/listview/components/views/settings/components/popups/migration-confirmation-popup';

const WelcomePage: React.FC = () => {
  const router = useRouter();
  const { t } = useLocalization();
  const { setTheme } = useTheme();
  const { setLanguage } = useContext(LocalizationContext);
  const [selectedSize, setSelectedSize] = useState<CardSize>('Normal');
  const [page, setPage] = useState(1);
  const [preferences, setPreferences] = useState({
    theme: 'system',
    language: 'en-US',
    card_size: 'Normal' as CardSize,
  });
  const [defaultPath, setDefaultPath] = useState<string>('');
  const [migrationPaths, setMigrationPaths] = useState<[string, string]>([
    '',
    '',
  ]);
  const [pathValidation, setPathValidation] = useState<[boolean, boolean]>([
    false,
    false,
  ]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [alreadyMigrated, setAlreadyMigrated] = useState<boolean>(false);
  const [hasExistingData, setHasExistingData] = useState<[boolean, boolean]>([
    false,
    false,
  ]);
  const [migrationMeta, setMigrationMeta] = useState<{
    number_of_worlds: number;
    number_of_folders: number;
  } | null>(null);
  const [migrationMetaLoading, setMigrationMetaLoading] = useState(false);
  const [migrationMetaError, setMigrationMetaError] = useState<string | null>(
    null,
  );
  const [showMigrationConfirm, setShowMigrationConfirm] = useState(false);

  useEffect(() => {
    info(`Theme changed to: ${preferences.theme}`);
  }, [preferences.theme]);

  const migrate = async () => {
    const result = await commands.migrateOldData(
      migrationPaths[0],
      migrationPaths[1],
    );
    if (result.status === 'error') {
      toast(t('general:error-title'), {
        description: t('setup-page:toast:error:migrate:message', result.error),
      });
      setPage(2);
      return;
    }
    setPage(3);
    toast(t('general:success-title'), {
      description: t('setup-page:toast:success:migrate:message'),
    });
  };

  const handleNext = async () => {
    if (page === 1) {
      try {
        const hasDataResult = await commands.checkExistingData();
        if (hasDataResult.status === 'ok') {
          setHasExistingData(hasDataResult.data);
        } else {
          error(`Failed to fetch existing data: ${hasDataResult.error}`);
        }

        const [worldsPath, foldersPath] = await invoke<[string, string]>(
          'detect_old_installation',
        );

        info(
          `Detected old installation - Worlds: ${worldsPath}, Folders: ${foldersPath}`,
        );
        info(`Using default path: ${defaultPath}`);
        setMigrationPaths([worldsPath, foldersPath]);
        setPathValidation([true, true]);
      } catch (e) {
        try {
          const defPath = await invoke<string>('pass_paths');
          setDefaultPath(defPath);
        } catch (e) {
          error(`Failed to get paths: ${e}`);
        }
        error(`Failed to detect old installation: ${e}`);
        setPathValidation([false, false]);
      }
    }
    if (page === 2) {
      if (
        !pathValidation[0] ||
        !pathValidation[1] ||
        migrationMetaError !== null
      ) {
        setAlreadyMigrated(false);
        setPage(3);
        return;
      }

      if (hasExistingData[0] || hasExistingData[1]) {
        setShowMigrationConfirm(true);
        return;
      }
      setIsLoading(true);
      await migrate();
      setIsLoading(false);
      setAlreadyMigrated(true);
    }
    if (page === 5) {
      const [result_theme, result_language, result_card_size] =
        await Promise.all([
          commands.setTheme(preferences.theme),
          commands.setLanguage(preferences.language),
          commands.setCardSize(preferences.card_size),
        ]);

      const errorResult =
        result_theme.status === 'error'
          ? result_theme
          : result_language.status === 'error'
            ? result_language
            : result_card_size.status === 'error'
              ? result_card_size
              : null;

      if (errorResult) {
        toast(t('general:error-title'), {
          description: t(
            'setup-page:toast:error:save-preference:message',
            errorResult.error,
          ),
        });

        error(`Failed to save preferences: ${errorResult.error}`);
        setPage(4);
        return;
      }

      await commands.createEmptyAuth();

      if (!alreadyMigrated) {
        await commands.createEmptyFiles();
      }

      router.push('/login');
    }
    setPage(page + 1);
  };

  const handleBack = () => {
    setPage(page - 1);
  };

  const handleFilePick = async (index: number) => {
    const startPath = migrationPaths[index] || defaultPath || '/';
    info(`Opening file picker at: ${startPath}`);
    const selected = await open({
      directory: false,
      multiple: false,
      defaultPath: startPath,
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });

    if (selected) {
      const newPaths: [string, string] = [...migrationPaths];
      newPaths[index] = selected as string;
      setMigrationPaths(newPaths);

      const newValidation: [boolean, boolean] = [...pathValidation];
      newValidation[index] = true;
      setPathValidation(newValidation);

      info(`Selected path: ${selected}`);
    }
  };

  // Fetch migration metadata when both paths are valid
  useEffect(() => {
    const fetchMeta = async () => {
      if (
        pathValidation[0] &&
        pathValidation[1] &&
        migrationPaths[0] &&
        migrationPaths[1]
      ) {
        setMigrationMetaLoading(true);
        setMigrationMetaError(null);
        setMigrationMeta(null);
        try {
          const result = await commands.getMigrationMetadata(
            migrationPaths[0],
            migrationPaths[1],
          );
          if (result.status === 'ok') {
            setMigrationMeta(result.data);
          } else {
            setMigrationMetaError(result.error);
          }
        } catch (e: any) {
          setMigrationMetaError(e?.message || 'Unknown error');
        } finally {
          setMigrationMetaLoading(false);
        }
      } else {
        setMigrationMeta(null);
        setMigrationMetaError(null);
        setMigrationMetaLoading(false);
      }
    };
    fetchMeta();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    migrationPaths[0],
    migrationPaths[1],
    pathValidation[0],
    pathValidation[1],
  ]);

  const handleMigrationConfirm = () => {
    setShowMigrationConfirm(false);
    migrate();
  };

  const handleMigrationCancel = () => {
    setShowMigrationConfirm(false);
    setAlreadyMigrated(true);
    setPage(3);
  };

  return (
    <>
      <div className="welcome-page">
        <MigrationConfirmationPopup
          open={showMigrationConfirm}
          onOpenChange={(open) => {
            if (!open) setShowMigrationConfirm(false);
          }}
          onCancel={handleMigrationCancel}
          onConfirm={handleMigrationConfirm}
        />

        {page === 1 && (
          <SetupLayout
            title={t('setup-page:welcome-title')}
            currentPage={1}
            onBack={handleBack}
            onNext={handleNext}
            isFirstPage={true}
          >
            <div className="h-full flex flex-col items-center justify-center space-y-6 relative">
              <div className="absolute top-0 right-0">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Globe className="h-4 w-4" />
                      <span>
                        {preferences.language === 'en-US'
                          ? 'English'
                          : '日本語'}
                      </span>
                      <span className="sr-only">Change Language</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => {
                        setLanguage('en-US');
                        setPreferences({ ...preferences, language: 'en-US' });
                      }}
                    >
                      English
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        setLanguage('ja-JP');
                        setPreferences({ ...preferences, language: 'ja-JP' });
                      }}
                    >
                      日本語
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Existing welcome content */}
              <h2 className="text-2xl font-semibold">
                {t('setup-page:thank-you')}
              </h2>
              <div className="space-y-4 text-center">
                <p className="text-muted-foreground">
                  {t('setup-page:first-time')}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t('setup-page:not-first-time:foretext')}
                  <a
                    href="https://discord.gg/gNzbpux5xW"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    {t('setup-page:discord')}
                  </a>{' '}
                  {t('setup-page:not-first-time:posttext')}
                </p>
              </div>
            </div>
          </SetupLayout>
        )}
        {page === 2 && (
          <SetupLayout
            title={t('setup-page:migration-title')}
            currentPage={2}
            onBack={handleBack}
            onNext={handleNext}
            isMigrationPage={true}
            isValid={
              pathValidation[0] &&
              pathValidation[1] &&
              migrationMetaError === null
            }
          >
            <div className="flex flex-col flex-1 space-y-6 justify-between h-full min-h-[400px]">
              <div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground text-center">
                    {t('setup-page:migration-description')}
                  </p>
                </div>

                <div className="space-y-4 mt-4">
                  {/* Worlds file selection */}
                  <div className="space-y-2">
                    <Label>{t('general:worlds-data')}</Label>
                    <div className="flex space-x-2 items-center">
                      <Input
                        value={migrationPaths[0]}
                        onChange={(e) =>
                          setMigrationPaths([e.target.value, migrationPaths[1]])
                        }
                        placeholder={defaultPath}
                        disabled={true}
                        className={
                          pathValidation[0]
                            ? 'text-foreground'
                            : 'text-muted-foreground'
                        }
                      />
                      <Button
                        variant="outline"
                        onClick={() => handleFilePick(0)}
                      >
                        {t('general:select-button')}
                      </Button>
                    </div>
                    <div className="h-3">
                      {!pathValidation[0] && (
                        <p className="text-sm text-red-500">
                          {t('setup-page:worlds-file-error')}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Folders file selection */}
                  <div className="space-y-2">
                    <Label>{t('general:folders-data')}</Label>
                    <div className="flex space-x-2 items-center">
                      <Input
                        value={migrationPaths[1]}
                        onChange={(e) =>
                          setMigrationPaths([migrationPaths[0], e.target.value])
                        }
                        placeholder={defaultPath}
                        disabled={true}
                        className={
                          pathValidation[1]
                            ? 'text-foreground'
                            : 'text-muted-foreground'
                        }
                      />
                      <Button
                        variant="outline"
                        onClick={() => handleFilePick(1)}
                      >
                        {t('general:select-button')}
                      </Button>
                    </div>
                    <div className="h-3">
                      {!pathValidation[1] && (
                        <p className="text-sm text-red-500">
                          {t('setup-page:folders-file-error')}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Migration metadata preview */}
                  {(migrationMetaLoading ||
                    migrationMetaError ||
                    migrationMeta) && (
                    <div className="mt-4">
                      {migrationMetaLoading && (
                        <div className="flex items-center justify-center p-4">
                          <Loader2 className="h-5 w-5 animate-spin mr-2" />
                          <span>
                            {t('settings-page:loading-migration-data')}
                          </span>
                        </div>
                      )}
                      {migrationMetaError && (
                        <div className="bg-destructive/10 text-destructive rounded p-3 flex items-start">
                          <Info className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                          <span>{migrationMetaError}</span>
                        </div>
                      )}
                      {migrationMeta && (
                        <div className="bg-muted rounded-md p-4 space-y-3">
                          <div className="flex items-center gap-2">
                            <SaturnIcon className="h-4 w-4" />
                            <span className="text-sm font-medium">
                              {t('settings-page:worlds-count')}:
                            </span>
                            <span className="text-sm">
                              {migrationMeta.number_of_worlds}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <FolderOpen className="h-4 w-4" />
                            <span className="text-sm font-medium">
                              {t('settings-page:folders-count')}:
                            </span>
                            <span className="text-sm">
                              {migrationMeta.number_of_folders}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </SetupLayout>
        )}
        {page === 3 && (
          <SetupLayout
            title={t('setup-page:ui-customization-title')}
            currentPage={3}
            onBack={handleBack}
            onNext={handleNext}
          >
            <div className="flex flex-col space-y-4">
              <p className="text-sm text-muted-foreground text-center mb-4">
                {t('setup-page:ui-description')}
              </p>
              <div className="flex flex-row justify-between">
                <div className="flex flex-col items-left space-y-4">
                  <div className="flex flex-col space-y-1">
                    <Label>{t('setup-page:worlds-label')}</Label>
                    <div className="text-sm text-gray-500">
                      {t('setup-page:worlds-design')}
                    </div>
                  </div>
                  <Select
                    defaultValue={preferences.card_size}
                    onValueChange={(value: CardSize) => {
                      setSelectedSize(value);
                      setPreferences({ ...preferences, card_size: value });
                    }}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Theme" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Compact">
                        {t('general:compact')}
                      </SelectItem>
                      <SelectItem value="Normal">
                        {t('general:normal')}
                      </SelectItem>
                      <SelectItem value="Expanded">
                        {t('general:expanded')}
                      </SelectItem>
                      <SelectItem value="Original">
                        {t('general:original')}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="max-w-[300px] w-full">
                  <div className="flex justify-center">
                    <WorldCardPreview
                      size={selectedSize}
                      world={{
                        worldId: '1',
                        name: t('settings-page:preview-world'),
                        thumbnailUrl: 'icons/1.png',
                        authorName: t('general:author'),
                        lastUpdated: '2017-03-09',
                        visits: 616,
                        dateAdded: '2025-01-01',
                        favorites: 59,
                        platform: Platform.CrossPlatform,
                        folders: [],
                        tags: [],
                        capacity: 16,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </SetupLayout>
        )}
        {page === 4 && (
          <SetupLayout
            title={t('setup-page:preferences-title')}
            currentPage={4}
            onBack={handleBack}
            onNext={handleNext}
          >
            <div className="flex flex-col space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                {t('setup-page:preferences-description')}
              </p>
              <div className="flex flex-col space-y-8 py-6">
                <div className="flex flex-row items-center justify-between p-4 rounded-lg border">
                  <div className="flex flex-col space-y-1.5">
                    <Label className="text-base font-medium">
                      {t('general:theme-label')}
                    </Label>
                    <div className="text-sm text-gray-500">
                      {t('general:theme-description')}
                    </div>
                  </div>
                  <Select
                    defaultValue={preferences.theme}
                    onValueChange={(value) => {
                      setTheme(value);
                      setPreferences({ ...preferences, theme: value });
                    }}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Theme" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">
                        {t('general:light')}
                      </SelectItem>
                      <SelectItem value="dark">{t('general:dark')}</SelectItem>
                      <SelectItem value="system">
                        {t('general:system')}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-row items-center justify-between p-4 rounded-lg border">
                  <div className="flex flex-col space-y-1.5">
                    <Label className="text-base font-medium">
                      {t('general:language-label')}
                    </Label>
                    <div className="text-sm text-gray-500">
                      {t('general:language-description')}
                    </div>
                  </div>
                  <Select
                    defaultValue={preferences.language}
                    onValueChange={(value) => {
                      setLanguage(value);
                      setPreferences({ ...preferences, language: value });
                    }}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ja-JP">日本語</SelectItem>
                      <SelectItem value="en-US">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </SetupLayout>
        )}
        {page === 5 && (
          <SetupLayout
            title={t('setup-page:complete-title')}
            currentPage={5}
            onBack={handleBack}
            onNext={handleNext}
            isLastPage={true}
          >
            <div className="flex flex-col items-center justify-center min-h-[400px]">
              <div className="text-center max-w-md">
                <h2 className="text-3xl font-bold">
                  {t('setup-page:all-set')}
                </h2>

                <div className="space-y-8">
                  <p className="text-lg text-muted-foreground mt-4">
                    {t('setup-page:welcome-text')}
                  </p>

                  <p className="text-base text-muted-foreground">
                    {t('setup-page:hope-text')}
                  </p>
                </div>

                <div className="pt-6">
                  <p className="text-sm text-muted-foreground">
                    {t('setup-page:need-help:foretext')}
                    <a
                      href="https://discord.gg/gNzbpux5xW"
                      className="text-blue-500 hover:underline"
                    >
                      {t('setup-page:discord')}
                    </a>
                    {t('setup-page:need-help:posttext')}
                  </p>
                </div>
              </div>
            </div>
          </SetupLayout>
        )}
      </div>
    </>
  );
};

export default WelcomePage;
