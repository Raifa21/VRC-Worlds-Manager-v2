'use client';

import React, { Suspense, useState, useEffect, useRef } from 'react';
import { AppSidebar } from './components/app-sidebar';
import { PopupManager } from './hook/usePopups/popup-manager';

const MIN_SIDEBAR_WIDTH = 250;
const MAX_SIDEBAR_WIDTH = 600;
const DEFAULT_SIDEBAR_WIDTH = 250;
const SIDEBAR_WIDTH_STORAGE_KEY = 'sidebar-width';

// Central client shell so hooks like useSearchParams live fully inside a client boundary
export function ListViewClientShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Load saved width from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY);
    if (saved) {
      const width = parseInt(saved, 10);
      if (width >= MIN_SIDEBAR_WIDTH && width <= MAX_SIDEBAR_WIDTH) {
        setSidebarWidth(width);
      }
    }
  }, []);

  // Handle mouse move during resize
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      // Clamp the width to min/max boundaries to prevent sticking
      const newWidth = Math.max(
        MIN_SIDEBAR_WIDTH,
        Math.min(MAX_SIDEBAR_WIDTH, e.clientX),
      );
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      if (isResizing) {
        setIsResizing(false);
        // Save to localStorage
        localStorage.setItem(
          SIDEBAR_WIDTH_STORAGE_KEY,
          sidebarWidth.toString(),
        );
      }
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      // Prevent text selection while dragging
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, sidebarWidth]);

  const handleResizeStart = () => {
    setIsResizing(true);
  };

  return (
    <Suspense fallback={null}>
      <div className="flex">
        <div
          ref={sidebarRef}
          style={{ width: `${sidebarWidth}px` }}
          className="relative flex-shrink-0"
        >
          <AppSidebar sidebarWidth={sidebarWidth} />
          {/* Resize handle */}
          <div
            onMouseDown={handleResizeStart}
            className="absolute top-0 right-0 w-1 h-full cursor-ew-resize hover:bg-border transition-colors z-50"
            style={{
              background: isResizing ? 'hsl(var(--border))' : 'transparent',
            }}
          >
            <div className="absolute inset-y-0 -left-1 -right-1" />
          </div>
        </div>
        <main className="flex-1 h-screen overflow-y-auto no-webview-scroll-bar">
          {children}
        </main>
        <PopupManager />
      </div>
    </Suspense>
  );
}

export default ListViewClientShell;
