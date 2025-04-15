'use client';

import React from 'react';
import { useTheme } from 'next-themes';
import { useToast } from '@/hooks/use-toast';
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
import { Loader2 } from 'lucide-react';

interface SettingsPageProps {
  onCardSizeChange?: () => void;
}

export function SettingsPage({ onCardSizeChange }: SettingsPageProps) {
  const [preferences, setPreferences] = React.useState<{
    theme: string;
    language: string;
    card_size: CardSize;
  } | null>(null);
  const { setTheme } = useTheme();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = React.useState(false);

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
          title: 'Error',
          description:
            'Failed to load preferences: ' +
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
          title: 'Error',
          description: 'Failed to save preferences: ' + result.error,
          variant: 'destructive',
        });
        return;
      }

      // Update local state after successful save
      setPreferences(newPreferences);
    } catch (error) {
      console.error('Failed to save preferences:', error);
      toast({
        title: 'Error',
        description: 'Failed to save preferences',
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
          title: 'Error',
          description: 'Failed to save preferences: ' + result.error,
          variant: 'destructive',
        });
        return;
      }

      setPreferences(newPreferences);
      // Notify parent component to update card size
      onCardSizeChange?.();
    } catch (error) {
      console.error('Failed to save preferences:', error);
      toast({
        title: 'Error',
        description: 'Failed to save preferences',
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
      <h1 className="text-2xl font-bold">Settings</h1>

      <div className="space-y-4">
        <div className="flex flex-row items-center justify-between p-4 rounded-lg border">
          <div className="flex flex-col space-y-1.5">
            <Label className="text-base font-medium">Theme</Label>
            <div className="text-sm text-muted-foreground">
              Select your preferred theme
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
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="dark">Dark</SelectItem>
              <SelectItem value="system">System</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-row items-center justify-between p-4 rounded-lg border">
          <div className="flex flex-col space-y-1.5">
            <Label className="text-base font-medium">Language</Label>
            <div className="text-sm text-muted-foreground">
              Select your preferred language (製作中です)
            </div>
          </div>
          <Select
            value={preferences.language}
            onValueChange={(value) => handlePreferenceChange('language', value)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Language" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ja-JP" disabled>
                Japanese
              </SelectItem>
              <SelectItem value="en-US">English(US)</SelectItem>
              <SelectItem value="en-UK" disabled>
                English(UK)
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col items-start justify-between space-y-3 p-4 rounded-lg border">
          <div className="flex flex-row justify-between w-full">
            <div className="flex flex-col space-y-1.5">
              <Label className="text-base font-medium">World Card Size</Label>
              <div className="text-sm text-muted-foreground">
                Select how world cards appear
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
                <SelectItem value={CardSize.Compact}>Compact</SelectItem>
                <SelectItem value={CardSize.Normal}>Normal</SelectItem>
                <SelectItem value={CardSize.Expanded}>Expanded</SelectItem>
                <SelectItem value={CardSize.Original}>Original</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <WorldCardPreview
            size={preferences.card_size}
            world={{
              worldId: '1',
              name: 'Preview World',
              thumbnailUrl: 'icons/1.png',
              authorName: 'Author',
              lastUpdated: '2025-02-28',
              visits: 1911,
              dateAdded: '2025-01-01',
              favorites: 616,
              platform: Platform.CrossPlatform,
              folders: [],
            }}
          />
        </div>
      </div>
    </div>
  );
}
