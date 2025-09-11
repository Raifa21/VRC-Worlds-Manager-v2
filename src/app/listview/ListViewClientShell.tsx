'use client';

import React, { Suspense } from 'react';
import { AppSidebar } from './components/app-sidebar';
import { PopupManager } from './hook/usePopups/popup-manager';

// Central client shell so hooks like useSearchParams live fully inside a client boundary
export function ListViewClientShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={null}>
      <div className="flex">
        <AppSidebar />
        <main className="flex-1 h-screen overflow-y-auto no-webview-scroll-bar">
          {children}
        </main>
        <PopupManager />
      </div>
    </Suspense>
  );
}

export default ListViewClientShell;
