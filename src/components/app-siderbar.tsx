'use client';

import Gear from '@/../public/icons/Gear.svg';
import Logout from '@/../public/icons/Logout.svg';
import Saturn from '@/../public/icons/Saturn.svg';
import { Info, FileQuestion, History, Plus } from 'lucide-react';
import { SpecialFolders } from '@/app/listview/page';
import Image from 'next/image';

import { Separator } from '@/components/ui/separator';

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarFooter,
  SidebarGroupLabel,
} from '@/components/ui/sidebar';

const sidebarStyles = {
  container:
    'flex flex-col h-screen w-[250px] border-r border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60',
  header: 'flex h-14 items-center px-6',
  nav: 'flex-1 space-y-0.5 p-1 pb-0',
  link: 'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:bg-accent/50 hover:text-accent-foreground',
  activeLink: 'bg-accent/60 text-accent-foreground',
  footer: 'sticky bottom-0 left-0 mt-auto p-1 pb-2',
};

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
}

export function AppSidebar({
  folders,
  onFoldersChange,
  onAddFolder,
  onSelectFolder,
  selectedFolder,
}: AppSidebarProps) {
  return (
    <aside className={sidebarStyles.container}>
      <header className={sidebarStyles.header}>
        <h2 className="text-lg font-semibold">VRC World Manager</h2>
      </header>
      <Separator className="" />

      <nav className={sidebarStyles.nav}>
        <SidebarGroup>
          <div
            className="px-3 py-2 text-sm font-medium rounded-lg hover:bg-accent/50 hover:text-accent-foreground overflow-hidden text-ellipsis whitespace-nowrap flex items-center gap-3"
            onClick={() => onSelectFolder(SpecialFolders.All)}
          >
            <Image src={Saturn} alt="Saturn" width={18} height={18} />
            <span className="text-sm font-medium">All Worlds</span>
          </div>
          </SidebarGroup>
          <Separator className="my-2" />
          <SidebarGroup>
          <div
            className="px-3 py-2 text-sm font-medium rounded-lg hover:bg-accent/50 hover:text-accent-foreground overflow-hidden text-ellipsis whitespace-nowrap flex items-center gap-3"
            onClick={() => onSelectFolder(SpecialFolders.Discover)}
          >
            <History className="h-5 w-5" />
            <span className="text-sm font-medium">Recently Visited</span>
          </div>
          <div
            className="px-3 py-2 text-sm font-medium rounded-lg hover:bg-accent/50 hover:text-accent-foreground overflow-hidden text-ellipsis whitespace-nowrap flex items-center gap-3"
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
          <div className="h-[calc(100vh-453px)] overflow-y-auto pl-8">
            {folders.map((folder, index) => (
              <div
                key={index}
                className="w-[193px] px-3 py-2 text-sm font-medium rounded-lg hover:bg-accent/50 hover:text-accent-foreground overflow-hidden text-ellipsis whitespace-nowrap"
                onClick={() => onSelectFolder('folder', folder)}
              >
                {folder}
              </div>
            ))}
          </div>
          <Separator className="my-2" />
          <div
            className={`${sidebarStyles.link}`}
            onClick={() => {
              onFoldersChange();
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
              className="px-3 py-2 text-sm font-medium rounded-lg hover:bg-accent/50 hover:text-accent-foreground overflow-hidden text-ellipsis whitespace-nowrap flex items-center gap-3"
              onClick={() => onSelectFolder(SpecialFolders.Discover)}
            >
            <Info className="h-5 w-5" />
            <span>About</span>
          </div>
          <div
            className="px-3 py-2 text-sm font-medium rounded-lg hover:bg-accent/50 hover:text-accent-foreground overflow-hidden text-ellipsis whitespace-nowrap flex items-center gap-3"
            onClick={() => onSelectFolder(SpecialFolders.Discover)}
          >
            <div className="h-5 w-5 flex items-center justify-center">
              <Image src={Gear} alt="Settings" width={18} height={18} />
            </div>
            <span>Settings</span>
          </div>
          <div
            className="px-3 py-2 text-sm font-medium rounded-lg hover:bg-accent/50 hover:text-accent-foreground overflow-hidden text-ellipsis whitespace-nowrap flex items-center gap-3"
            onClick={() => onSelectFolder(SpecialFolders.Discover)}
          >
            <div className="h-5 w-5 flex items-center justify-center">
              <Image src={Logout} alt="Logout" width={18} height={18} />
            </div>
            <span>Logout</span>
          </div>
        </SidebarGroup>
      </footer>
    </aside>
  );
}
