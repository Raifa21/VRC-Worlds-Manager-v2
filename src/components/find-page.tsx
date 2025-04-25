'use client';

import { useLocalization } from '@/hooks/use-localization';

export function FindPage() {
  const { t } = useLocalization();

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <h1 className="text-3xl font-bold mb-4">{t('general:find-worlds')}</h1>
      <p className="text-muted-foreground">
        {t('find-page:under-development')}
      </p>
    </div>
  );
}
