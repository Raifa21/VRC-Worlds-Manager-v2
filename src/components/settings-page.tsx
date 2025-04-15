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
import { Loader2 } from 'lucide-react';
import { LocalizationContext } from './localization-context';

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
  const { t } = useLocalization();
  const [isSaving, setIsSaving] = React.useState(false);
  const { setLanguage } = useContext(LocalizationContext);

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
          title: t('settings-page:error-title'),
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
          title: t('settings-page:error-title'),
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
    } catch (error) {
      console.error('Failed to save preferences:', error);
      toast({
        title: t('settings-page:error-title'),
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
          title: t('settings-page:error-title'),
          description:
            t('settings-page:error-save-preferences') + ': ' + result.error,
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
        title: t('settings-page:error-title'),
        description: t('settings-page:error-save-preferences'),
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
      <h1 className="text-2xl font-bold">{t('settings-page:title')}</h1>

      <div className="space-y-4">
        <div className="flex flex-row items-center justify-between p-4 rounded-lg border">
          <div className="flex flex-col space-y-1.5">
            <Label className="text-base font-medium">
              {t('settings-page:theme')}
            </Label>
            <div className="text-sm text-muted-foreground">
              {t('settings-page:theme-description')}
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
              <SelectItem value="light">{t('settings-page:light')}</SelectItem>
              <SelectItem value="dark">{t('settings-page:dark')}</SelectItem>
              <SelectItem value="system">
                {t('settings-page:system')}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-row items-center justify-between p-4 rounded-lg border">
          <div className="flex flex-col space-y-1.5">
            <Label className="text-base font-medium">
              {t('settings-page:language')}
            </Label>
            <div className="text-sm text-muted-foreground">
              {t('settings-page:language-description')}
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
              <SelectItem value="ja-JP">
                {t('settings-page:japanese')}
              </SelectItem>
              <SelectItem value="en-US">
                {t('settings-page:english-us')}
              </SelectItem>
              <SelectItem value="en-UK" disabled>
                {t('settings-page:english-uk')}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col items-start justify-between space-y-3 p-4 rounded-lg border">
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
                  {t('settings-page:compact')}
                </SelectItem>
                <SelectItem value={CardSize.Normal}>
                  {t('settings-page:normal')}
                </SelectItem>
                <SelectItem value={CardSize.Expanded}>
                  {t('settings-page:expanded')}
                </SelectItem>
                <SelectItem value={CardSize.Original}>
                  {t('settings-page:original')}
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
              authorName: t('settings-page:author'),
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
