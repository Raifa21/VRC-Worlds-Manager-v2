'use client';

import Gear from '@/../public/icons/Gear.svg';
import Logout from '@/../public/icons/Logout.svg';
import Saturn from '@/../public/icons/Saturn.svg';
import { File, ChevronDown, Info } from 'lucide-react';
import Image from 'next/image';

import { invoke } from '@tauri-apps/api/core';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

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

const sidebarStyles = {
  container:
    'flex flex-col h-screen w-[250px] border-r border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60',
  header: 'flex h-14 items-center border-b border-border/40 px-6',
  nav: 'flex-1 space-y-0.5 p-4 pb-0',
  link: 'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:bg-accent/50 hover:text-accent-foreground',
  activeLink: 'bg-accent/60 text-accent-foreground',
  footer: 'sticky bottom-0 left-0 mt-auto p-4 border-t border-border/40',
};

interface AppSidebarProps {
  folders: String[];
  onFoldersChange: () => void;
}

export function AppSidebar({ folders, onFoldersChange }: AppSidebarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  return (
    <aside className={sidebarStyles.container}>
      <header className={sidebarStyles.header}>
        <h2 className="text-lg font-semibold">VRC World Manager</h2>
      </header>

      <nav className={sidebarStyles.nav}>
        <SidebarGroup>
          <div
            className="px-3 py-2 text-sm font-medium rounded-lg hover:bg-accent/50 hover:text-accent-foreground overflow-hidden text-ellipsis whitespace-nowrap flex items-center gap-3"
            onClick={() => router.push('/listview?specialFolders=all')}
          >
            <Image src={Saturn} alt="Saturn" width={24} height={24} />
            <span className="text-sm font-medium">All Worlds</span>
          </div>
        </SidebarGroup>

        <Collapsible defaultOpen className="group/collapsible">
          <SidebarGroup>
            <CollapsibleTrigger className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-foreground transition-all hover:bg-accent/50 hover:text-accent-foreground">
              <File className="h-5 w-5" />
              <span className="text-sm font-medium">Folders</span>
              <ChevronDown className="ml-auto h-5 w-5 transition-transform group-data-[state=open]/collapsible:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="h-[calc(100vh-380px)] overflow-y-auto">
                {' '}
                {/* Reduced height */}
                <div
                  className="w-[200px] px-3 py-2 text-sm font-medium rounded-lg hover:bg-accent/50 hover:text-accent-foreground overflow-hidden text-ellipsis whitespace-nowrap"
                  onClick={() =>
                    router.push('/listview?specialFolders=unclassified')
                  }
                >
                  Unclassified
                </div>
                {folders.map((folder, index) => (
                  <div
                    key={index}
                    className="w-[200px] px-3 py-2 text-sm font-medium rounded-lg hover:bg-accent/50 hover:text-accent-foreground overflow-hidden text-ellipsis whitespace-nowrap"
                    onClick={() => router.push(`/listview?folder=${folder}`)}
                  >
                    {folder}
                  </div>
                ))}
              </div>
              <div
                className={`${sidebarStyles.link} border-t border-border/40`}
                onClick={() => {
                  onFoldersChange();
                  router.push(
                    `/listview?${searchParams.toString()}&addFolder=true`,
                  );
                }}
              >
                + Add Folder
              </div>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>
      </nav>

      <footer className={sidebarStyles.footer}>
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
