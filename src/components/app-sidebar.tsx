'use client';

import { SaturnIcon } from './icons/saturn-icon';
import { GearIcon } from './icons/gear-icon';
import { Info, FileQuestion, History, Plus } from 'lucide-react';
import { SpecialFolders } from '@/types/folders';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { commands } from '@/lib/bindings';
import { useState, useEffect, useRef } from 'react';

import { Separator } from '@/components/ui/separator';

import { SidebarGroup } from '@/components/ui/sidebar';

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

const sidebarStyles = {
  container:
    'flex flex-col h-screen w-[250px] border-r border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60',
  header: 'flex h-14 items-center px-6',
  nav: 'flex-1 space-y-0.5 p-1 pb-0',
  link: 'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:bg-accent/50 hover:text-accent-foreground',
  activeLink: 'bg-accent/60 text-accent-foreground',
  footer: 'sticky bottom-0 left-0 mt-auto p-1 pb-2',
};

const SIDEBAR_CLASS = 'app-sidebar';

interface AppSidebarProps {
  folders: string[];
  onFoldersChange: () => Promise<void>;
  onAddFolder: () => void;
  onSelectFolder: (
    type:
      | SpecialFolders.All
      | SpecialFolders.Discover
      | SpecialFolders.Unclassified
      | 'folder',
    folderName?: string,
  ) => Promise<void>;
  selectedFolder?: string;
  onSelectAbout: () => void;
  onSelectSettings: () => void;
  onRenameFolder: (oldName: string, newName: string) => Promise<void>;
  onDeleteFolder: (folderName: string) => void;
}

export function AppSidebar({
  folders,
  onFoldersChange,
  onAddFolder,
  onSelectFolder,
  selectedFolder,
  onSelectAbout,
  onSelectSettings,
  onRenameFolder,
  onDeleteFolder,
}: AppSidebarProps) {
  const [localFolders, setLocalFolders] = useState<string[]>(folders);
  const [editingFolder, setEditingFolder] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [folderToDelete, setFolderToDelete] = useState<string | null>(null);
  const [isComposing, setIsComposing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update local folders when prop changes
  useEffect(() => {
    setLocalFolders(folders);
  }, [folders]);

  const handleDragEnd = async (result: any) => {
    if (!result.destination) return;

    const { source, destination } = result;
    const newFolders = Array.from(localFolders);
    const [movedFolder] = newFolders.splice(source.index, 1);
    newFolders.splice(destination.index, 0, movedFolder);

    // Update local state immediately
    setLocalFolders(newFolders);

    try {
      await commands.moveFolder(movedFolder, destination.index);
      // Only refresh if needed (in case of error or sync issues)
      await onFoldersChange();
    } catch (error) {
      // Revert on error
      setLocalFolders(folders);
      console.error('Failed to reorder folders:', error);
    }
  };

  const handleRename = async (folder: string) => {
    try {
      if (newFolderName && newFolderName !== folder) {
        await onRenameFolder(folder, newFolderName);
      }
    } finally {
      setEditingFolder(null);
      setNewFolderName('');
    }
  };

  // Add this useEffect to handle clicks outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Check if we're currently editing
      if (!editingFolder) return;

      // Get the clicked element
      const target = event.target as HTMLElement;

      // Check if the click is outside the sidebar
      const sidebar = document.querySelector(`.${SIDEBAR_CLASS}`);
      if (sidebar && !sidebar.contains(target)) {
        setEditingFolder(null);
        setNewFolderName('');
      }
    };

    // Add the event listener
    document.addEventListener('mousedown', handleClickOutside);

    // Clean up
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [editingFolder]); // Only re-run if editingFolder changes

  return (
    <aside className={cn(sidebarStyles.container, SIDEBAR_CLASS)}>
      <header className={sidebarStyles.header}>
        <h2 className="text-lg font-semibold">VRC Worlds Manager</h2>
      </header>
      <Separator className="" />

      <nav className={sidebarStyles.nav}>
        <SidebarGroup>
          <div
            className="px-3 py-2 cursor-pointer text-sm font-medium rounded-lg hover:bg-accent/50 hover:text-accent-foreground overflow-hidden text-ellipsis whitespace-nowrap flex items-center gap-3"
            onClick={() => onSelectFolder(SpecialFolders.All)}
          >
            <SaturnIcon className="h-[18px] w-[18px]" />
            <span className="text-sm font-medium">All Worlds</span>
          </div>
        </SidebarGroup>
        <Separator className="my-2" />
        <SidebarGroup>
          <div
            className="px-3 py-2 cursor-pointer text-sm font-medium rounded-lg hover:bg-accent/50 hover:text-accent-foreground overflow-hidden text-ellipsis whitespace-nowrap flex items-center gap-3"
            onClick={() => onSelectFolder(SpecialFolders.Discover)}
          >
            <History className="h-5 w-5" />
            <span className="text-sm font-medium">Find Worlds</span>
          </div>
          <div
            className="px-3 py-2 cursor-pointer text-sm font-medium rounded-lg hover:bg-accent/50 hover:text-accent-foreground overflow-hidden text-ellipsis whitespace-nowrap flex items-center gap-3"
            onClick={() => onSelectFolder(SpecialFolders.Unclassified)}
          >
            <FileQuestion className="h-5 w-5" />
            <span className="text-sm font-medium">Unclassified Worlds</span>
          </div>
        </SidebarGroup>
        <Separator className="my-2" />
        <SidebarGroup>
          <div className="px-3 py-2 text-xs font-medium text-muted-foreground">
            <span className="text-sm font-medium">Folders</span>
          </div>
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="folders">
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="h-[calc(100vh-417px)] overflow-y-auto pl-8"
                >
                  {localFolders.map((folder, index) => (
                    <Draggable key={folder} draggableId={folder} index={index}>
                      {(provided) => (
                        <ContextMenu>
                          <ContextMenuTrigger>
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className="w-[193px] px-3 py-2 text-sm font-medium rounded-lg hover:bg-accent/50 hover:text-accent-foreground overflow-hidden text-ellipsis whitespace-nowrap"
                              onClick={(e) => {
                                // Don't trigger folder selection when editing the current folder
                                if (editingFolder === folder) {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  return;
                                }

                                // Cancel editing if we're editing a different folder
                                if (editingFolder && editingFolder !== folder) {
                                  setEditingFolder(null);
                                  setNewFolderName('');
                                }

                                onSelectFolder('folder', folder);
                              }}
                            >
                              {editingFolder === folder ? (
                                <Input
                                  ref={inputRef}
                                  value={newFolderName}
                                  onChange={(e) =>
                                    setNewFolderName(e.target.value)
                                  }
                                  onKeyDown={(e) => {
                                    // Prevent event bubbling when typing
                                    e.stopPropagation();

                                    if (e.key === 'Enter' && !isComposing) {
                                      e.preventDefault();
                                      handleRename(folder);
                                    } else if (e.key === 'Escape') {
                                      e.preventDefault();
                                      setEditingFolder(null);
                                      setNewFolderName('');
                                    }
                                  }}
                                  onClick={(e) => {
                                    // Prevent click from bubbling to parent
                                    e.stopPropagation();
                                  }}
                                  onCompositionStart={() =>
                                    setIsComposing(true)
                                  }
                                  onCompositionEnd={(e) => {
                                    setTimeout(() => {
                                      setIsComposing(false);
                                    }, 0);
                                  }}
                                  className="h-6 py-0"
                                  autoFocus
                                />
                              ) : (
                                folder
                              )}
                            </div>
                          </ContextMenuTrigger>
                          <ContextMenuContent>
                            <ContextMenuItem
                              onClick={() => {
                                // First set the editing state
                                setEditingFolder(folder);
                                setNewFolderName(folder);
                                // Use double RAF to ensure DOM has updated and context menu has closed
                                requestAnimationFrame(() => {
                                  requestAnimationFrame(() => {
                                    inputRef.current?.focus();
                                    inputRef.current?.select(); // Also select the text for convenience
                                  });
                                });
                              }}
                            >
                              Rename
                            </ContextMenuItem>
                            <ContextMenuItem
                              className="text-destructive"
                              onClick={() => onDeleteFolder(folder)}
                            >
                              Delete
                            </ContextMenuItem>
                          </ContextMenuContent>
                        </ContextMenu>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
          <Separator className="my-2" />
          <div
            className={`${sidebarStyles.link} cursor-pointer`}
            onClick={() => {
              onAddFolder();
            }}
          >
            <Plus className="h-5 w-5" />
            Add Folder
          </div>
        </SidebarGroup>
      </nav>
      <Separator />
      <footer className={sidebarStyles.footer}>
        <SidebarGroup>
          <div
            className="px-3 py-2 cursor-pointer text-sm font-medium rounded-lg hover:bg-accent/50 hover:text-accent-foreground overflow-hidden text-ellipsis whitespace-nowrap flex items-center gap-3"
            onClick={() => onSelectAbout()}
          >
            <Info className="h-5 w-5" />
            <span>About</span>
          </div>
          <div
            className="px-3 py-2 cursor-pointer text-sm font-medium rounded-lg hover:bg-accent/50 hover:text-accent-foreground overflow-hidden text-ellipsis whitespace-nowrap flex items-center gap-3"
            onClick={() => onSelectSettings()}
          >
            <div className="h-5 w-5 flex items-center justify-center">
              <GearIcon className="h-[18px] w-[18px]" />
            </div>
            <span>Settings</span>
          </div>
        </SidebarGroup>
      </footer>
    </aside>
  );
}
