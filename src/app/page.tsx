'use client';
import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const checkFirstTime = async () => {
      const isFirstTime = await invoke('require_initial_setup');
      if (isFirstTime) {
        router.push('/setup');
      } else {
        const checkFilesAndAuth = async () => {
          try {
            // First check if files are loaded
            await invoke('check_files_loaded');

            // Then check authentication
            try {
              await invoke('try_login');
              router.push('/listview');
            } catch (authErr) {
              // Auth failed, redirect to login
              router.push('/login');
            }
          } catch (err) {
            // File loading failed
            router.push(
              `${'/error/read_data_error'}?${encodeURIComponent(String(err))}`,
            );
          }
        };
        checkFilesAndAuth();
      }
    };
    checkFirstTime();
  }, []);

  return <div>Redirecting...</div>;
}
