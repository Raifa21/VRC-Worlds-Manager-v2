'use client'
import Image from "next/image";
import { useEffect, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { useRouter } from 'next/navigation';

export default function Home() {
  const [error, setError] = useState<string | null>(null)
  const router = useRouter();

  useEffect(() => {
    const checkFirstTime = async () => {
      const isFirstTime = await invoke('check_first_time');
      if (isFirstTime) {
        // Handle first time setup
        router.push("/setup");
      } else {
        const checkFilesLoaded = async () => {
          try {
            await invoke('check_files_loaded');
            router.push("/listview");
            const isFilesLoaded = await invoke('check_files_loaded');
          }
          catch (err) {
            router.push(`${"/error/read_data_error"}?${encodeURIComponent(String(err))}`);
          }
        };
        checkFilesLoaded();
      }
    };
    checkFirstTime();
  }, []);

  return <div>Redirecting...</div>;
}

