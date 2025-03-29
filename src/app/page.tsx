'use client';
import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useRouter } from 'next/navigation';
import { commands } from '@/lib/bindings';

export default function Home() {
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

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

  return <div>Redirecting...</div>;
}
