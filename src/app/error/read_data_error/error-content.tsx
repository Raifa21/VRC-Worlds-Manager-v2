'use client';

import { useSearchParams } from 'next/navigation';
import { useLocalization } from '@/hooks/use-localization';
import { Button } from '@/components/ui/button';
import { SiDiscord } from '@icons-pack/react-simple-icons';
import { FolderOpen, Globe } from 'lucide-react';
import { commands } from '@/lib/bindings';
import { toast } from 'sonner';
import { info, error } from '@tauri-apps/plugin-log';
import { useState, useContext } from 'react';
import { LocalizationContext } from '@/components/localization-context';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function ErrorContent() {
  const { t } = useLocalization();
  const { setLanguage } = useContext(LocalizationContext);
  const searchParams = useSearchParams();
  const [language, setLanguageState] = useState('en-US');

  // Get the first key from the query string as the error message
  const errorMessage = (() => {
    // Get all keys from the search params
    const keys = Array.from(searchParams.keys());

    // If there are any keys, use the first one
    if (keys.length > 0) {
      return keys[0].replace(/\+/g, ' '); // Replace '+' with spaces
    }

    // Fallback to unknown error
    return t('error-page:unknown-error');
  })();

  const handleOpenLogs = async () => {
    try {
      const result = await commands.openLogsDirectory();

      if (result.status === 'ok') {
        info('Opened logs directory');
      } else {
        error(`Failed to open logs directory: ${result.error}`);
        toast(t('general:error-title'), {
          description: t('general:error-open-logs'),
        });
      }
    } catch (e) {
      error(`Failed to open logs directory: ${e}`);
      toast(t('general:error-title'), {
        description: t('general:error-open-logs'),
      });
    }
  };

  const handleOpenFolder = async () => {
    try {
      const result = await commands.openFolderDirectory();

      if (result.status === 'ok') {
        info('Opened folder directory');
      } else {
        error(`Failed to open folder directory: ${result.error}`);
        toast(t('general:error-title'), {
          description: t('general:error-open-folder'),
        });
      }
    } catch (e) {
      error(`Failed to open folder directory: ${e}`);
      toast(t('general:error-title'), {
        description: t('general:error-open-folder'),
      });
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen p-6 relative">
      {/* Language Selector */}
      <div className="absolute top-4 right-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Globe className="h-4 w-4" />
              <span>{language === 'en-US' ? 'English' : '日本語'}</span>
              <span className="sr-only">Change Language</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => {
                setLanguage('en-US');
                setLanguageState('en-US');
              }}
            >
              English
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setLanguage('ja-JP');
                setLanguageState('ja-JP');
              }}
            >
              日本語
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="text-center max-w-md">
        <h1 className="text-3xl font-bold mb-4">{t('error-page:title')}</h1>
        <p className="text-lg mb-6">
          {t('error-page:read-data-error-message')}
        </p>
        <p className="text-red-500 mb-8 p-4 bg-red-100 dark:bg-red-900/20 rounded-md">
          Error: {errorMessage}
        </p>

        <div className="flex flex-col gap-4 items-center">
          <div className="flex flex-row gap-2 w-full">
            <Button
              variant="outline"
              onClick={handleOpenLogs}
              className="gap-2 w-full"
            >
              <FolderOpen className="h-4 w-4" />
              <span>{t('error-page:logs')}</span>
            </Button>
            <Button
              variant="outline"
              onClick={handleOpenFolder}
              className="gap-2 w-full"
            >
              <FolderOpen className="h-4 w-4" />
              <span>{t('general:open-folder')}</span>
            </Button>
          </div>

          <Button variant="secondary" className="gap-2 w-full" asChild>
            <a
              href="https://discord.gg/gNzbpux5xW"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center"
            >
              <SiDiscord className="h-4 w-4" />
              <span>{t('error-page:contact-support')}</span>
            </a>
          </Button>

          <Button
            onClick={() => window.location.reload()}
            className="gap-2 w-full"
          >
            {t('error-page:try-again')}
          </Button>
        </div>
      </div>
    </div>
  );
}
