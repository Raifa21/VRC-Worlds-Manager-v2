'use client';

import { useSearchParams } from 'next/navigation';
import { useLocalization } from '@/hooks/use-localization';
import { Button } from '@/components/ui/button';
import { SiDiscord } from '@icons-pack/react-simple-icons';
import { FolderOpen, Globe } from 'lucide-react';
import { commands } from '@/lib/bindings';
import { useToast } from '@/hooks/use-toast';
import { info, error } from '@tauri-apps/plugin-log';
import { useState, useContext } from 'react';
import { LocalizationContext } from '@/components/localization-context';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function ReadDataErrorPage() {
  const { t } = useLocalization();
  const { setLanguage } = useContext(LocalizationContext);
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [language, setLanguageState] = useState('en-US');

  // Get the value of the 'error' query parameter as the error message
  const errorMessage =
    searchParams.get('error') || t('error-page:unknown-error');

  const handleOpenLogs = async () => {
    try {
      const result = await commands.openLogsDirectory();

      if (result.status === 'ok') {
        info('Opened logs directory');
      } else {
        error(`Failed to open logs directory: ${result.error}`);
        toast({
          title: t('general:error-title'),
          description: t('general:error-open-logs'),
          variant: 'destructive',
        });
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
          <Button
            variant="outline"
            onClick={handleOpenLogs}
            className="gap-2 w-full"
          >
            <FolderOpen className="h-4 w-4" />
            <span>{t('error-page:logs')}</span>
          </Button>

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
