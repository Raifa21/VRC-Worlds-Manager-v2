'use client';

import React, { Suspense, useState, useEffect } from 'react';
import { AppSidebar } from './components/app-sidebar';
import { PopupManager } from './hook/usePopups/popup-manager';
import { DndContext, DragOverlay } from '@dnd-kit/core';
import { commands, WorldDisplayData, CardSize } from '@/lib/bindings';
import { toast } from 'sonner';
import { useLocalization } from '@/hooks/use-localization';
import { error } from '@tauri-apps/plugin-log';
import { WorldCardPreview } from '@/components/world-card';

// Central client shell so hooks like useSearchParams live fully inside a client boundary
export function ListViewClientShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t } = useLocalization();
  const [activeWorld, setActiveWorld] = useState<WorldDisplayData | null>(null);
  const [draggedCount, setDraggedCount] = useState(1);
  const [cardSize, setCardSize] = useState<CardSize>('Normal');

  // Load card size
  useEffect(() => {
    const loadCardSize = async () => {
      try {
        const result = await commands.getCardSize();
        if (result.status === 'ok') {
          setCardSize(result.data);
        }
      } catch (e) {
        error(`Failed to load card size: ${e}`);
      }
    };
    loadCardSize();
  }, []);

  const handleDragStart = (event: any) => {
    const worldId = event.active.id;
    const selectedWorlds = event.active.data?.current?.selectedWorlds || [];
    const world = event.active.data?.current?.world;

    // Use the world data that's passed from the draggable
    if (world) {
      setActiveWorld(world);
    }

    // Calculate dragged count
    const count =
      selectedWorlds.length > 0 && selectedWorlds.includes(worldId)
        ? selectedWorlds.length
        : 1;
    setDraggedCount(count);
  };

  const handleDragEnd = async (event: any) => {
    setActiveWorld(null);
    const { active, over } = event;

    if (!over) return;

    // Check if dropped on a folder
    if (over.id && over.id.startsWith('folder-')) {
      const folderName = over.id.replace('folder-', '');
      const worldId = active.id;

      // Get the selected worlds from the store
      const selectedWorlds = active.data?.current?.selectedWorlds || [];

      // Determine which worlds to add
      const worldsToAdd =
        selectedWorlds.length > 0 && selectedWorlds.includes(worldId)
          ? selectedWorlds
          : [worldId];

      // Add worlds to folder
      try {
        await Promise.all(
          worldsToAdd.map((id: string) =>
            commands.addWorldToFolder(folderName, id),
          ),
        );

        toast(t('general:success-title'), {
          description:
            worldsToAdd.length === 1
              ? t('world-grid:world-added-to-folder', folderName)
              : t(
                  'world-grid:worlds-added-to-folder',
                  worldsToAdd.length,
                  folderName,
                ),
        });
      } catch (e) {
        error(`Failed to add worlds to folder: ${e}`);
        toast(t('general:error-title'), {
          description: t('world-grid:error-add-to-folder'),
        });
      }
    }
  };

  return (
    <Suspense fallback={null}>
      <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex">
          <AppSidebar />
          <main className="flex-1 h-screen overflow-y-auto no-webview-scroll-bar">
            {children}
          </main>
          <PopupManager />
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeWorld && (
            <div className="relative opacity-90 cursor-grabbing">
              <WorldCardPreview size={cardSize} world={activeWorld} />
              {draggedCount > 1 && (
                <div className="absolute bottom-2 right-2 bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold z-20">
                  {draggedCount}
                </div>
              )}
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </Suspense>
  );
}

export default ListViewClientShell;
