'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { invoke } from '@tauri-apps/api/core';
import { useTheme } from 'next-themes';
import { open } from '@tauri-apps/plugin-shell';
import { Platform } from '@/components/world-card';
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

export enum AutoUpdateFrequency {
  EveryWeek = 'EveryWeek',
  EveryMonth = 'EveryMonth',
  Never = 'Never',
}

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
}

export function SetupLayout({
  title,
  currentPage,
  children,
  onBack,
  onNext,
  isFirstPage = false,
  isLastPage = false,
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
            variant={
              isLastPage ? 'default' : isFirstPage ? 'default' : 'outline'
            }
          >
            {isFirstPage ? 'Start' : isLastPage ? 'Finish' : 'Next'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

const WelcomePage: React.FC = () => {
  const { toast } = useToast();
  const { setTheme } = useTheme();
  const [selectedSize, setSelectedSize] = useState<CardSize>(CardSize.Normal);
  const [page, setPage] = useState(1);
  const [preferences, setPreferences] = useState({
    theme: 'system',
    language: 'en-US',
    auto_update_frequency: AutoUpdateFrequency.Never,
    card_size: CardSize.Normal,
  });
  const [migrationPath, setMigrationPath] = useState<string>('');
  const [isValidPath, setIsValidPath] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    console.log('Current theme:', preferences.theme);
  }, [preferences.theme]);

  useEffect(() => {
    // Auto-detect old installation
    const detectOldInstallation = async () => {
      try {
        const path = await invoke<string>('detect_old_installation');
        setMigrationPath(path);
        setIsValidPath(true);
      } catch (e) {
        setIsValidPath(false);
      }
    };
    detectOldInstallation();
  }, []);

  const handleNext = async () => {
    if (page === 5) {
      // Save preferences before moving to next page
      try {
        await invoke('set_user_preferences', { preferences });
      } catch (e) {
        console.error('Failed to save preferences:', e);
      }
    }
    setPage(page + 1);
  };

  const handleBack = () => {
    setPage(page - 1);
  };

  const handleMigration = async () => {
    setIsLoading(true);
    try {
      await invoke('migrate_old_data', { path: migrationPath });
      toast({
        title: 'Success',
        description: 'Data migrated successfully!',
      });
      handleNext();
    } catch (e) {
      toast({
        title: 'Error',
        description: 'Failed to migrate data: ' + e,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
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
              It looks like your first time! Let's set up your VRC World Manager
              preferences.
            </p>
            <p className="text-center text-sm text-muted-foreground">
              Is it not? Please contact us through{' '}
              <button
                className="text-blue-500 hover:underline"
                onClick={() => open('https://discord.gg/gNzbpux5xW')}
              >
                Discord
              </button>{' '}
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
          onNext={isValidPath ? handleMigration : handleNext}
        >
          <div className="flex flex-col space-y-6">
            <div className="space-y-2">
              <h3 className="text-lg font-medium">Previous Installation</h3>
              <p className="text-muted-foreground">
                If you have used the original VRC World Manager, you can migrate
                your old data.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex space-x-2">
                <Input
                  value={migrationPath}
                  onChange={(e) => setMigrationPath(e.target.value)}
                  placeholder="Path to old VRC World Manager"
                />
                <Button variant="outline" onClick={() => open('file:///')}>
                  Browse
                </Button>
              </div>
              {!isValidPath && (
                <p className="text-sm text-muted-foreground">
                  Could not detect previous installation files
                </p>
              )}
            </div>

            <Button
              onClick={handleMigration}
              disabled={!isValidPath || isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Migrating...
                </>
              ) : isValidPath ? (
                'Migrate Data'
              ) : (
                'Skip Migration'
              )}
            </Button>
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
                  <SelectItem value={CardSize.Expanded}>Expanded</SelectItem>
                  <SelectItem value={CardSize.Original}>Original</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="max-w-[300px] w-full">
              <div className="flex justify-center">
                <WorldCardPreview
                  size={selectedSize}
                  world={{
                    name: 'World',
                    thumbnailUrl:
                      'https://api.vrchat.cloud/api/1/file/file_16e99205-34d4-42f7-8935-657d2b25ce44/5/file',
                    authorName: 'Author',
                    lastUpdated: '2025-01-01',
                    visits: 59,
                    favorites: 10,
                    platform: Platform.CrossPlatform,
                  }}
                />
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
          <div className="grid w-full items-center gap-4">
            <div className="flex flex-row items-center justify-between">
              <div className="flex flex-col space-y-1">
                <Label>Theme</Label>
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
            <div className="flex flex-row items-center justify-between">
              {' '}
              {/* TODO: add localization */}
              <div className="flex flex-col space-y-1">
                <Label>Language</Label>
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
            <div className="flex flex-row items-center justify-between">
              <div className="flex flex-col space-y-1">
                <Label>Auto Update Frequency</Label>
                <div className="text-sm text-gray-500">
                  Select how often you want to update world information
                </div>
              </div>
              <Select
                defaultValue={preferences.auto_update_frequency}
                onValueChange={(value) => {
                  setPreferences({
                    ...preferences,
                    auto_update_frequency: value as AutoUpdateFrequency,
                  });
                }}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Theme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={AutoUpdateFrequency.EveryWeek}>
                    Every Week
                  </SelectItem>
                  <SelectItem value={AutoUpdateFrequency.EveryMonth}>
                    Every Month
                  </SelectItem>
                  <SelectItem value={AutoUpdateFrequency.Never}>
                    Never
                  </SelectItem>
                </SelectContent>
              </Select>
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
          <p>You're all set! Welcome to VRC World Manager.</p>
        </SetupLayout>
      )}
    </div>
  );
};

export default WelcomePage;
