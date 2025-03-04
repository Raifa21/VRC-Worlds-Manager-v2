import Gear from "@/../public/icons/Gear.svg"
import Logout from "@/../public/icons/Logout.svg"
import Saturn from "@/../public/icons/Saturn.svg"
import { File, ChevronDown, Info } from "lucide-react"
import Image from "next/image"

import { Sidebar, SidebarContent, SidebarGroup, SidebarHeader, SidebarFooter, SidebarGroupLabel } from "@/components/ui/sidebar";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "./ui/collapsible";

export function AppSidebar() {
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
                            file 1
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