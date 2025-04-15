'use client';

import { useLocalization } from '@/hooks/use-localization';

export default function ErrorPage({ error }: { error: string }) {
  const { t } = useLocalization();

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-2xl font-bold mb-4">{t('error-page:title')}</h1>
      <p className="text-red-500">{error}</p>
      <button
        onClick={() => window.location.reload()}
        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
      >
        {t('error-page:retry')}
      </button>
    </div>
  );
}
