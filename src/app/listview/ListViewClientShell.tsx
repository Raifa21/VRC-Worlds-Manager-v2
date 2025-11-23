'use client';

import React, { Suspense, useState } from 'react';
import { AppSidebar } from './components/app-sidebar';
import { PopupManager } from './hook/usePopups/popup-manager';
import { DndContext, DragOverlay } from '@dnd-kit/core';
import { commands, WorldDisplayData } from '@/lib/bindings';
import { toast } from 'sonner';
import { useLocalization } from '@/hooks/use-localization';
import { error } from '@tauri-apps/plugin-log';

// Central client shell so hooks like useSearchParams live fully inside a client boundary
export function ListViewClientShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t } = useLocalization();
  const [activeWorld, setActiveWorld] = useState<WorldDisplayData | null>(null);
  const [draggedCount, setDraggedCount] = useState(1);

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
          action: {
            label: t('listview-page:undo-button'),
            onClick: async () => {
              try {
                // Remove all worlds from folder in parallel
                await Promise.all(
                  worldsToAdd.map((id: string) =>
                    commands.removeWorldFromFolder(folderName, id),
                  ),
                );

                toast(t('listview-page:restored-title'), {
                  description: t('listview-page:worlds-restored-to-folder'),
                });
              } catch (e) {
                error(`Failed to undo add to folder: ${e}`);
                toast(t('general:error-title'), {
                  description: t('listview-page:error-restore-worlds'),
                });
              }
            },
          },
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
            <div className="relative cursor-grabbing">
              {/* Thumbnail only with consistent size */}
              <div className="relative w-52 h-32 rounded-lg overflow-hidden shadow-2xl border-2 border-primary">
                <img
                  src={activeWorld.thumbnailUrl}
                  alt={activeWorld.name}
                  className="w-full h-full object-cover"
                  draggable="false"
                />
                {draggedCount > 1 && (
                  <div className="absolute bottom-2 right-2 bg-primary text-primary-foreground rounded-full w-10 h-10 flex items-center justify-center text-base font-bold shadow-lg">
                    {draggedCount}
                  </div>
                )}
              </div>
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </Suspense>
  );
}

export default ListViewClientShell;
