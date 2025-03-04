'use client'
import Image from "next/image";
import { useEffect, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { useRouter } from 'next/navigation';

export default function Home() {
  const [error, setError] = useState<string | null>(null)
  const router = useRouter();

  useEffect(() => {
    invoke('get_data')
      .catch(err => setError(err.toString()))
  }, [])
  if (error != null) {
    useEffect(() => {
      router.push(`${"/error/read_data_error"}?${error}`);
    }, []);
  }
  else {

    useEffect(() => {
      router.push("/listview");
    }, []);

    return <div>Redirecting...</div>;
  }
}
