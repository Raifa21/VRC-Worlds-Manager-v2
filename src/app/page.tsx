'use client';
import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { commands } from '@/lib/bindings';
import { useLocalization } from '@/hooks/use-localization';

export default function Home() {
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { t } = useLocalization();

  useEffect(() => {
    const checkFirstTime = async () => {
      const isFirstTime = await commands.requireInitialSetup();

      if (isFirstTime) {
        router.push('/setup');
      } else {
        const checkFilesAndAuth = async () => {
          const result = await commands.checkFilesLoaded();

          if (result.status === 'error') {
            router.push(
              `${'/error/read_data_error'}?${encodeURIComponent(result.error)}`,
            );
            return;
          }

          // Then check authentication
          const authResult = await commands.tryLogin();

          if (authResult.status === 'ok') {
            router.push('/listview');
          } else {
            router.push('/login');
          }
        };
        checkFilesAndAuth();
      }
    };
    checkFirstTime();
  }, []);

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{t('general:loading')}</p>
    </div>
  );
}
