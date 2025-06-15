'use client';

import { SaturnIcon } from './icons/saturn-icon';
import { GearIcon } from './icons/gear-icon';
import { Info, FileQuestion, History, Plus } from 'lucide-react';
import { SpecialFolders } from '@/types/folders';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { commands } from '@/lib/bindings';
import { useState, useEffect, useRef } from 'react';
import { useLocalization } from '@/hooks/use-localization';

import { Separator } from '@/components/ui/separator';

import { SidebarGroup } from '@/components/ui/sidebar';
import { info, error } from '@tauri-apps/plugin-log';

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Input } from '@/components/ui/input';
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
      | SpecialFolders.Find
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
  const { t } = useLocalization();
  const [localFolders, setLocalFolders] = useState<string[]>(folders);
  const [editingFolder, setEditingFolder] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [folderToDelete, setFolderToDelete] = useState<string | null>(null);
  const [isComposing, setIsComposing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const composingRef = useRef(false);
  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
    } catch (e) {
      // Revert on error
      setLocalFolders(folders);
      error(`Error moving folder: ${e}`);
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

  // Add this effect for F8 key handling, similar to create-folder-dialog.tsx
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F8 key handler - prevent focus loss and text selection
      if (e.key === 'F8' && document.activeElement === inputRef.current) {
        // Save current text length to restore cursor position later
        const textLength = inputRef.current?.value.length || 0;

        // Schedule focus restoration after the F8 key event completes
        setTimeout(() => {
          if (inputRef.current) {
            // Restore focus
            inputRef.current.focus();

            // Place cursor at the end of text without selection
            inputRef.current.setSelectionRange(textLength, textLength);
          }
        }, 10);
      }
    };

    // Add global key listener
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Increase the timeout for focusing when editing starts
  useEffect(() => {
    if (editingFolder) {
      // Use a longer timeout to ensure all other events have been processed
      const focusTimer = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          // Optionally select all text for convenience
          inputRef.current.select();
        }
      }, 50); // Increased from 10ms to 50ms

      // Clean up timer on component unmount or when editingFolder changes
      return () => clearTimeout(focusTimer);
    }
  }, [editingFolder]);

  // Improve the click outside handler to be more precise
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Skip if no active editing or during composition
      if (!editingFolder || isComposing) return;

      // Get the clicked element
      const target = event.target as HTMLElement;

      // Check if click is inside the input or its parent container
      if (
        inputRef.current &&
        (inputRef.current === target ||
          inputRef.current.contains(target) ||
          target.closest('.folder-edit-container'))
      ) {
        // Add this class to your container
        return;
      }

      // If we click anywhere else, cancel editing
      setEditingFolder(null);
      setNewFolderName('');
    };

    // Use mousedown instead of click for better timing
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [editingFolder, isComposing]); // Add isComposing to deps

  return (
    <aside className={cn(sidebarStyles.container, SIDEBAR_CLASS)}>
      <header className={sidebarStyles.header}>
        <h2 className="text-lg font-semibold">VRC Worlds Manager</h2>
      </header>
      <Separator className="" />

      <nav className={sidebarStyles.nav}>
        <SidebarGroup>
          <div
            className={`
              px-3 py-2 text-sm font-medium rounded-lg
              overflow-hidden text-ellipsis whitespace-nowrap flex items-center gap-3
              ${selectedFolder === SpecialFolders.All ? sidebarStyles.activeLink : 'hover:bg-accent/50 hover:text-accent-foreground'}
            `}
            onClick={() => {
              if (selectedFolder === SpecialFolders.All) return;
              onSelectFolder(SpecialFolders.All);
            }}
          >
            <SaturnIcon className="h-[18px] w-[18px]" />
            <span className="text-sm font-medium">
              {t('general:all-worlds')}
            </span>
          </div>
        </SidebarGroup>
        <Separator className="my-2" />
        <SidebarGroup>
          <div
            className={`
              px-3 py-2 text-sm font-medium rounded-lg
              overflow-hidden text-ellipsis whitespace-nowrap flex items-center gap-3
              ${selectedFolder === SpecialFolders.Find ? sidebarStyles.activeLink : 'hover:bg-accent/50 hover:text-accent-foreground'}
            `}
            onClick={() => {
              if (selectedFolder === SpecialFolders.Find) return;
              onSelectFolder(SpecialFolders.Find);
            }}
          >
            <History className="h-5 w-5" />
            <span className="text-sm font-medium">
              {t('general:find-worlds')}
            </span>
          </div>

          <div
            className={`
              px-3 py-2 text-sm font-medium rounded-lg
              overflow-hidden text-ellipsis whitespace-nowrap flex items-center gap-3
              ${
                selectedFolder === SpecialFolders.Unclassified
                  ? sidebarStyles.activeLink
                  : 'hover:bg-accent/50 hover:text-accent-foreground'
              }
            `}
            onClick={() => {
              if (selectedFolder === SpecialFolders.Unclassified) return;
              onSelectFolder(SpecialFolders.Unclassified);
            }}
          >
            <FileQuestion className="h-5 w-5" />
            <span className="text-sm font-medium">
              {t('general:unclassified-worlds')}
            </span>
          </div>
        </SidebarGroup>
        <Separator className="my-2" />
        <SidebarGroup>
          <div className="px-3 py-2 text-xs font-medium text-muted-foreground">
            <span className="text-sm font-medium">{t('general:folders')}</span>
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
                              className={`
                                w-[193px] px-3 py-2 text-sm font-medium rounded-lg
                                overflow-hidden text-ellipsis whitespace-nowrap flex items-center gap-3
                                ${
                                  selectedFolder === folder
                                    ? sidebarStyles.activeLink
                                    : 'hover:bg-accent/50 hover:text-accent-foreground'
                                }
                              `}
                              onClick={() => {
                                if (selectedFolder === folder) return;
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
                                  onFocus={() => {
                                    // Clear any pending blur actions
                                    if (blurTimeoutRef.current) {
                                      clearTimeout(blurTimeoutRef.current);
                                      blurTimeoutRef.current = null;
                                    }
                                  }}
                                  onKeyDown={(e) => {
                                    // Prevent event bubbling when typing
                                    e.stopPropagation();

                                    if (
                                      e.key === 'Enter' &&
                                      !composingRef.current
                                    ) {
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
                                    e.preventDefault();
                                    e.stopPropagation();
                                  }}
                                  onCompositionStart={() => {
                                    composingRef.current = true;
                                    setIsComposing(true);
                                  }}
                                  onCompositionEnd={() => {
                                    composingRef.current = false;

                                    // Use a longer timeout for IME operations
                                    setTimeout(() => {
                                      if (inputRef.current) {
                                        const textLength =
                                          inputRef.current.value.length;
                                        inputRef.current.focus();
                                        inputRef.current.setSelectionRange(
                                          textLength,
                                          textLength,
                                        );
                                      }
                                      setIsComposing(false);
                                    }, 150);
                                  }}
                                  className="h-6 py-0 folder-edit-container" // Added class for identifying container
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
            {t('app-sidebar:add-folder')}
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
            <span>{t('app-sidebar:about')}</span>
          </div>
          <div
            className="px-3 py-2 cursor-pointer text-sm font-medium rounded-lg hover:bg-accent/50 hover:text-accent-foreground overflow-hidden text-ellipsis whitespace-nowrap flex items-center gap-3"
            onClick={() => onSelectSettings()}
          >
            <div className="h-5 w-5 flex items-center justify-center">
              <GearIcon className="h-[18px] w-[18px]" />
            </div>
            <span>{t('general:settings')}</span>
          </div>
        </SidebarGroup>
      </footer>
    </aside>
  );
}
