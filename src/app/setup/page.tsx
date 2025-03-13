'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { invoke } from '@tauri-apps/api/core';
import { useTheme } from 'next-themes';
import { open } from '@tauri-apps/plugin-dialog';
import { Platform } from '@/components/world-card';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { WorldCardPreview } from '@/components/world-card';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { ConfirmationPopup } from '@/components/confirmation-popup';

export enum CardSize {
  Compact = 'Compact',
  Normal = 'Normal',
  Expanded = 'Expanded',
  Original = 'Original',
}

interface SetupLayoutProps {
  title: string;
  currentPage: number;
  children: React.ReactNode;
  onBack: () => void;
  onNext: () => void;
  isFirstPage?: boolean;
  isLastPage?: boolean;
  isMigrationPage?: boolean;
  alreadyMigrated?: boolean;
  isLoading?: boolean;
}

export function SetupLayout({
  title,
  currentPage,
  children,
  onBack,
  onNext,
  isFirstPage = false,
  isLastPage = false,
  isMigrationPage = false,
  alreadyMigrated = false,
  isLoading = false,
}: SetupLayoutProps) {
  return (
    <div className="container max-w-2xl mx-auto p-4">
      <Progress value={currentPage * 25 - 25} className="mb-8" />
      <Card className="h-[450px]">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="h-[325px]">{children}</CardContent>
        <CardFooter className="flex justify-between">
          <Button
            onClick={onBack}
            disabled={isFirstPage}
            variant={isFirstPage ? 'default' : 'outline'}
          >
            Back
          </Button>
          <Button
            onClick={onNext}
            disabled={isMigrationPage && isLoading}
            variant={
              isLastPage ? 'default' : isFirstPage ? 'default' : 'outline'
            }
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Migrating...
              </>
            ) : isFirstPage ? (
              'Start'
            ) : isLastPage ? (
              'Finish'
            ) : isMigrationPage && !alreadyMigrated ? (
              'Skip'
            ) : (
              'Next'
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

const WelcomePage: React.FC = () => {
  const router = useRouter();
  const { toast } = useToast();
  const { setTheme } = useTheme();
  const [selectedSize, setSelectedSize] = useState<CardSize>(CardSize.Normal);
  const [page, setPage] = useState(1);
  const [preferences, setPreferences] = useState({
    theme: 'system',
    language: 'en-US',
    card_size: CardSize.Normal,
  });
  const [defaultPath, setDefaultPath] = useState<string>('');
  const [migrationPaths, setMigrationPaths] = useState<[string, string]>([
    '',
    '',
  ]);
  const [isValidPath, setIsValidPath] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [alreadyMigrated, setAlreadyMigrated] = useState<boolean>(false);
  const [showMigrationPopup, setShowMigrationPopup] = useState(false);

  useEffect(() => {
    console.log('Current theme:', preferences.theme);
  }, [preferences.theme]);

  const handleNext = async () => {
    if (page === 1) {
      try {
        const [worldsPath, foldersPath] = await invoke<[string, string]>(
          'detect_old_installation',
        );

        console.log('Detected old installation:', worldsPath, foldersPath);
        console.log('Default path:', defaultPath);
        setMigrationPaths([worldsPath, foldersPath]);
        setIsValidPath(true);
      } catch (e) {
        try {
          const defPath = await invoke<string>('pass_paths');
          setDefaultPath(defPath);
        } catch (e) {
          console.error('Failed to get paths:', e);
        }
        console.error('Failed to detect old installation:', e);
        setIsValidPath(false);
      }
    }
    if (page === 5) {
      try {
        await invoke('set_preferences', {
          theme: preferences.theme,
          language: preferences.language,
          cardSize: preferences.card_size,
        });
        await invoke('create_empty_auth');
        if (!alreadyMigrated) {
          await invoke('create_empty_files');
        }
      } catch (e) {
        console.error('Failed to save preferences:', e);
        setPage(4);
      }
      router.push('/listview');
    }
    setPage(page + 1);
  };

  const handleBack = () => {
    setPage(page - 1);
  };

  const handleMigration = async () => {
    setIsLoading(true);
    if (alreadyMigrated) {
      setIsLoading(false);
      setShowMigrationPopup(true);
      return;
    }
    try {
      await invoke('migrate_old_data', {
        worldsPath: migrationPaths[0],
        foldersPath: migrationPaths[1],
      });
      toast({
        title: 'Success',
        description: 'Data migrated successfully!',
      });
      setAlreadyMigrated(true);
      handleNext();
    } catch (e) {
      toast({
        title: 'Error',
        description: 'Failed to migrate data: ' + e,
      });
      setPage(2);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilePick = async (index: number) => {
    const startPath = migrationPaths[index] || defaultPath || '/';
    console.log('Opening file picker at:', startPath);
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
    }
  };

  return (
    <>
      <ConfirmationPopup
        open={showMigrationPopup}
        onOpenChange={setShowMigrationPopup}
        onConfirm={async () => {
          setShowMigrationPopup(false);
          setIsLoading(true);
          try {
            await invoke('migrate_old_data', {
              worldsPath: migrationPaths[0],
              foldersPath: migrationPaths[1],
            });
            toast({
              title: 'Success',
              description: 'Data migrated successfully!',
            });
            setAlreadyMigrated(true);
            handleNext();
          } catch (e) {
            toast({
              title: 'Error',
              description: 'Failed to migrate data: ' + e,
            });
            setPage(2);
          } finally {
            setIsLoading(false);
          }
        }}
        title="Overwrite Existing Data?"
        description="You have already migrated your data. Continuing will overwrite your current data. Are you sure?"
      />
      <div className="welcome-page">
        {page === 1 && (
          <SetupLayout
            title="Welcome to VRC World Manager"
            currentPage={1}
            onBack={handleBack}
            onNext={handleNext}
            isFirstPage={true}
          >
            <div className="h-full flex flex-col items-center justify-center space-y-4">
              <h2 className="text-2xl font-semibold">Welcome!</h2>
              <p className="text-center text-muted-foreground">
                It looks like your first time! Let's set up your VRC World
                Manager preferences.
              </p>
              <p className="text-center text-sm text-muted-foreground">
                Is it not? Please contact us through{' '}
                <a
                  href={`https://discord.gg/gNzbpux5xW`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  Discord
                </a>{' '}
                for support
              </p>
            </div>
          </SetupLayout>
        )}
        {page === 2 && (
          <SetupLayout
            title="Migration"
            currentPage={2}
            onBack={handleBack}
            onNext={handleNext}
            isMigrationPage={true}
            alreadyMigrated={alreadyMigrated}
          >
            <div className="flex flex-col space-y-6">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground text-center">
                  If you have used the original VRC World Manager, you can
                  migrate your old data. <br />
                  Your original data will not be modified during migration.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Worlds Data</Label>
                  <div className="flex space-x-2">
                    <Input
                      value={migrationPaths[0]}
                      onChange={(e) =>
                        setMigrationPaths([e.target.value, migrationPaths[1]])
                      }
                      placeholder={defaultPath}
                      disabled={true}
                      className="text-muted-foreground"
                    />
                    <Button variant="outline" onClick={() => handleFilePick(0)}>
                      Select
                    </Button>
                  </div>
                  {!isValidPath && (
                    <p className="text-sm text-red-500">
                      {' '}
                      Could not detect existing files.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Folders Data</Label>
                  <div className="flex space-x-2">
                    <Input
                      value={migrationPaths[1]}
                      onChange={(e) =>
                        setMigrationPaths([migrationPaths[0], e.target.value])
                      }
                      placeholder={defaultPath}
                      disabled={true}
                      className="text-muted-foreground"
                    />
                    <Button variant="outline" onClick={() => handleFilePick(1)}>
                      Select
                    </Button>
                  </div>
                  {!isValidPath && (
                    <p className="text-sm text-red-500">
                      {' '}
                      Could not detect existing files.
                    </p>
                  )}
                </div>
              </div>

              <Button
                onClick={handleMigration}
                disabled={
                  isLoading || !migrationPaths.every((path) => path !== '')
                }
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Migrating...
                  </>
                ) : (
                  'Migrate'
                )}
              </Button>
              {!alreadyMigrated && (
                <p className="text-sm text-muted-foreground text-center pb-3">
                  Skipping will create new empty folders and settings.
                </p>
              )}
            </div>
          </SetupLayout>
        )}
        {page === 3 && (
          <SetupLayout
            title="UI Customization"
            currentPage={3}
            onBack={handleBack}
            onNext={handleNext}
          >
            <div className="flex flex-col space-y-4">
              <p className="text-sm text-muted-foreground text-center mb-4">
                Customize the appearance of VRC World Manager
              </p>
              <div className="flex flex-row justify-between">
                <div className="flex flex-col items-left space-y-4">
                  <div className="flex flex-col space-y-1">
                    <Label>Worlds</Label>
                    <div className="text-sm text-gray-500">
                      Select the design for world previews
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
                      <SelectItem value={CardSize.Compact}>Compact</SelectItem>
                      <SelectItem value={CardSize.Normal}>Normal</SelectItem>
                      <SelectItem value={CardSize.Expanded}>
                        Expanded
                      </SelectItem>
                      <SelectItem value={CardSize.Original}>
                        Original
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
                        name: 'World',
                        thumbnailUrl:
                          'https://api.vrchat.cloud/api/1/file/file_16e99205-34d4-42f7-8935-657d2b25ce44/5/file',
                        authorName: 'Author',
                        lastUpdated: '2025-01-01',
                        visits: 59,
                        dateAdded: '2025-01-01',
                        favorites: 10,
                        platform: Platform.CrossPlatform,
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
            title="Preferences"
            currentPage={4}
            onBack={handleBack}
            onNext={handleNext}
          >
            <div className="flex flex-col space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Customize your preferences
              </p>
              <div className="flex flex-col space-y-8 py-6">
                <div className="flex flex-row items-center justify-between p-4 rounded-lg border">
                  <div className="flex flex-col space-y-1.5">
                    <Label className="text-base font-medium">Theme</Label>
                    <div className="text-sm text-gray-500">
                      Select your preferred theme
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
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-row items-center justify-between p-4 rounded-lg border">
                  {' '}
                  {/* TODO: add localization */}
                  <div className="flex flex-col space-y-1.5">
                    <Label className="text-base font-medium">Language</Label>
                    <div className="text-sm text-gray-500">
                      Select your preferred language
                    </div>
                  </div>
                  <Select
                    defaultValue={preferences.language}
                    onValueChange={(value) => {
                      setPreferences({ ...preferences, language: value });
                    }}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Theme" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ja-JP">Japanese</SelectItem>
                      <SelectItem value="en-US">English(US)</SelectItem>
                      <SelectItem value="en-UK">English(UK)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </SetupLayout>
        )}
        {page === 5 && (
          <SetupLayout
            title="Setup Complete"
            currentPage={5}
            onBack={handleBack}
            onNext={handleNext}
            isLastPage={true}
          >
            <div className="flex flex-col items-center justify-center min-h-[400px]">
              <div className="text-center max-w-md">
                <h2 className="text-3xl font-bold">You're All Set!</h2>

                <div className="space-y-8">
                  <p className="text-lg text-muted-foreground mt-4">
                    Welcome to VRC World Manager. Start exploring and managing
                    your VRChat worlds.
                  </p>

                  <p className="text-base text-muted-foreground">
                    We hope this tool helps you organize and discover amazing
                    VRChat worlds.
                  </p>
                </div>

                <div className="pt-6">
                  <p className="text-sm text-muted-foreground">
                    Need help? Join our{' '}
                    <a
                      href="https://discord.gg/gNzbpux5xW"
                      className="text-blue-500 hover:underline"
                    >
                      Discord
                    </a>{' '}
                    community.
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
