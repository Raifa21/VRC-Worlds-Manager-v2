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
import { MigrationConfirmationPopup } from '@/components/migration-confirmation-popup';
import { commands } from '@/lib/bindings';

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
      <Card className="h-[480px]">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="h-[355px]">{children}</CardContent>
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
  const [pathValidation, setPathValidation] = useState<[boolean, boolean]>([
    false,
    false,
  ]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [alreadyMigrated, setAlreadyMigrated] = useState<boolean>(false);
  const [showMigrationPopup, setShowMigrationPopup] = useState(false);
  const [hasExistingData, setHasExistingData] = useState<[boolean, boolean]>([
    false,
    false,
  ]);

  useEffect(() => {
    console.log('Current theme:', preferences.theme);
  }, [preferences.theme]);

  const handleNext = async () => {
    if (page === 1) {
      try {
        const hasDataResult = await commands.checkExistingData();
        if (hasDataResult.status === 'ok') {
          setHasExistingData(hasDataResult.data);
        } else {
          console.error('Failed to fetch existing data:', hasDataResult.error);
        }

        const [worldsPath, foldersPath] = await invoke<[string, string]>(
          'detect_old_installation',
        );

        console.log('Detected old installation:', worldsPath, foldersPath);
        console.log('Default path:', defaultPath);
        setMigrationPaths([worldsPath, foldersPath]);
        setPathValidation([true, true]);
      } catch (e) {
        try {
          const defPath = await invoke<string>('pass_paths');
          setDefaultPath(defPath);
        } catch (e) {
          console.error('Failed to get paths:', e);
        }
        console.error('Failed to detect old installation:', e);
        setPathValidation([false, false]);
      }
    }
    if (page === 5) {
      const result = await commands.setPreferences(
        preferences.theme,
        preferences.language,
        preferences.card_size,
      );

      if (result.status === 'error') {
        toast({
          title: 'Error',
          description: 'Failed to save preferences: ' + result.error,
        });

        console.error('Failed to save preferences:', result.error);
        setPage(4);
        return;
      }

      await commands.createEmptyAuth();

      if (!alreadyMigrated) {
        await commands.createEmptyFiles();
      }

      router.push('/');
    }
    setPage(page + 1);
  };

  const handleBack = () => {
    setPage(page - 1);
  };

  const handleMigration = async () => {
    setIsLoading(true);

    if (hasExistingData[0] || hasExistingData[1]) {
      setIsLoading(false);
      setShowMigrationPopup(true);
      return;
    }

    try {
      const result = await commands.migrateOldData(
        migrationPaths[0],
        migrationPaths[1],
        [false, false],
      );

      if (result.status === 'error') {
        toast({
          title: 'Error',
          description: 'Failed to migrate data: ' + result.error,
        });
        setPage(2);
        return;
      }

      toast({
        title: 'Success',
        description: 'Data migrated successfully!',
        duration: 300,
      });
      setAlreadyMigrated(true);
      handleNext();
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

      const newValidation: [boolean, boolean] = [...pathValidation];
      newValidation[index] = true;
      setPathValidation(newValidation);

      console.log('Selected path:', selected);
    }
  };

  return (
    <>
      <MigrationConfirmationPopup
        open={showMigrationPopup}
        onOpenChange={setShowMigrationPopup}
        hasExistingData={hasExistingData}
        isLoading={isLoading}
        onConfirm={async (keepExisting) => {
          setShowMigrationPopup(false);
          setIsLoading(true);
          try {
            // Pass the inverse of keepExisting since we want to overwrite when not keeping
            const result = await commands.migrateOldData(
              migrationPaths[0],
              migrationPaths[1],
              [!keepExisting[0], !keepExisting[1]],
            );

            if (result.status === 'error') {
              toast({
                title: 'Error',
                description: 'Failed to migrate data: ' + result.error,
              });
              setPage(2);
              return;
            }

            toast({
              title: 'Success',
              description: 'Data migrated successfully!',
            });
            setAlreadyMigrated(true);
            handleNext();
          } finally {
            setIsLoading(false);
          }
        }}
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
            <div className="h-full flex flex-col items-center justify-center space-y-6">
              <h2 className="text-2xl font-semibold">
                Thank you for installing!
              </h2>
              <div className="space-y-4 text-center">
                <p className="text-muted-foreground">
                  Since this is your first time here, let's take a moment to set
                  up
                  <br />
                  VRC World Manager just the way you like it.
                </p>
                <p className="text-sm text-muted-foreground">
                  Not your first time? Please contact us through{' '}
                  <a
                    href="https://discord.gg/gNzbpux5xW"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    Discord
                  </a>{' '}
                  for support.
                </p>
              </div>
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
                  <div className="h-3">
                    {!pathValidation[0] && (
                      <p className="text-sm text-red-500">
                        Could not detect existing worlds file.
                      </p>
                    )}
                  </div>
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
                  <div className="h-3">
                    {!pathValidation[1] && (
                      <p className="text-sm text-red-500">
                        Could not detect existing folders file.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <Button
                onClick={handleMigration}
                disabled={
                  isLoading ||
                  !migrationPaths.every((path) => path !== '') ||
                  !pathValidation.some((isValid) => isValid)
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

              {!alreadyMigrated && !hasExistingData && (
                <p className="text-sm text-muted-foreground text-center pb-3">
                  Skipping will create new empty folders, if one does not exist.
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
                        thumbnailUrl: 'public/icons/1.png',
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
