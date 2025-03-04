"use client"

import Gear from "@/../public/icons/Gear.svg"
import Logout from "@/../public/icons/Logout.svg"
import Saturn from "@/../public/icons/Saturn.svg"
import { File, ChevronDown, Info } from "lucide-react"
import Image from "next/image"

import { invoke } from '@tauri-apps/api/core';
import { useState, useEffect } from 'react';

import { Sidebar, SidebarContent, SidebarGroup, SidebarHeader, SidebarFooter, SidebarGroupLabel } from "@/components/ui/sidebar";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "./ui/collapsible";


interface Folder {
    folderName: string;
    worldCount: number;
}

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
        <Sidebar>
            <SidebarHeader>
                VRC World Manager
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <Image src={Saturn} alt="Saturn" width={32} height={32} />
                    ワールド一覧
                </SidebarGroup>
                <Collapsible defaultOpen className="group/collapsible">
                    <SidebarGroup>
                        <SidebarGroupLabel asChild>
                            <CollapsibleTrigger>
                                <File className="w-6 h-6" />
                                フォルダ
                                <ChevronDown className="ml-auto transition-transform group-data-collapsible-open:transform-rotate-180" />
                            </CollapsibleTrigger>
                        </SidebarGroupLabel>
                        <CollapsibleContent>
                            {folders.map((folder, index) => (
                                <div key={index}>{folder.folderName}</div>
                            ))}
                        </CollapsibleContent>
                    </SidebarGroup>
                </Collapsible>
            </SidebarContent>
            <SidebarFooter>
                <SidebarGroup>
                    <Info className="w-6 h-6" />
                    このアプリについて
                </SidebarGroup>
                <SidebarGroup>
                    <Image src={Gear} alt="Gear" width={24} height={24} />
                    設定
                </SidebarGroup>
                <SidebarGroup>
                    <Image src={Logout} alt="Logout" width={24} height={24} />
                    ログアウト
                </SidebarGroup>
            </SidebarFooter>
        </Sidebar>
    )
}