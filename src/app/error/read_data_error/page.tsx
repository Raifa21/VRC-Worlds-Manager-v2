'use client';

import { Suspense } from 'react';
import { ErrorContent } from './error-content';

export default function ReadDataErrorPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen">
          Loading...
        </div>
      }
    >
      <ErrorContent />
    </Suspense>
  );
}
