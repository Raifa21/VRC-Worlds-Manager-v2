'use client';

import Gear from '@/../public/icons/Gear.svg';
import Logout from '@/../public/icons/Logout.svg';
import Saturn from '@/../public/icons/Saturn.svg';
import { File, ChevronDown, Info } from 'lucide-react';
import Image from 'next/image';

import { invoke } from '@tauri-apps/api/core';
import { useState, useEffect } from 'react';

import { Separator } from '@/components/ui/separator';

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarFooter,
  SidebarGroupLabel,
} from '@/components/ui/sidebar';
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from './ui/collapsible';

interface Folder {
  folderName: string;
  worldCount: number;
}

const sidebarStyles = {
  container:
    'flex flex-col h-full w-[250px] border-r border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60',
  header: 'flex h-14 items-center border-b border-border/40 px-6',
  nav: 'flex-1 space-y-1 p-4',
  link: 'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:bg-accent/50 hover:text-accent-foreground',
  activeLink: 'bg-accent/60 text-accent-foreground',
  footer: 'mt-auto p-4 border-t border-border/40',
};

export function AppSidebar() {
  const [folders, setFolders] = useState<Folder[]>([]);

  useEffect(() => {
    loadFolders();
  }, []);

  const loadFolders = async () => {
    try {
      const result = await invoke<Folder[]>('get_folders');
      setFolders(result);
    } catch (error) {
      console.error('Failed to load folders:', error);
    }
  };

  const createFolder = async (name: string) => {
    try {
      await invoke<Folder>('create_folder', { folderName: name });
      await loadFolders(); // Reload folders after creating new one
    } catch (error) {
      console.error('Failed to create folder:', error);
    }
  };
  return (
    <aside className={sidebarStyles.container}>
      <header className={sidebarStyles.header}>
        <h2 className="text-lg font-semibold">VRC Manager</h2>
      </header>

      <nav className={sidebarStyles.nav}>
        <SidebarGroup>
          <div className="flex items-center gap-3">
            <Image src={Saturn} alt="Saturn" width={24} height={24} />
            <span>Worlds</span>
          </div>
        </SidebarGroup>

        <Separator className="my-2 bg-border/60" />

        <Collapsible defaultOpen className="group/collapsible">
          <SidebarGroup>
            <SidebarGroupLabel asChild>
              <CollapsibleTrigger className="flex w-full items-center gap-3">
                <File className="h-5 w-5" />
                <span>Folders</span>
                <ChevronDown className="ml-auto h-5 w-5 transition-transform group-data-[state=open]/collapsible:rotate-180" />
              </CollapsibleTrigger>
            </SidebarGroupLabel>
            <CollapsibleContent>
              {folders.map((folder, index) => (
                <div key={index}>{folder.folderName}</div>
              ))}
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>
      </nav>

      <footer className={sidebarStyles.footer}>
        <Separator className="mb-2 bg-border/60" />
        <SidebarGroup>
          <div className="flex items-center gap-3">
            <Info className="h-5 w-5" />
            <span>About</span>
          </div>
        </SidebarGroup>
        <SidebarGroup>
          <div className="flex items-center gap-3">
            <Image src={Gear} alt="Settings" width={20} height={20} />
            <span>Settings</span>
          </div>
        </SidebarGroup>
        <SidebarGroup>
          <div className="flex items-center gap-3">
            <Image src={Logout} alt="Logout" width={20} height={20} />
            <span>Logout</span>
          </div>
        </SidebarGroup>
      </footer>
    </aside>
  );
}
