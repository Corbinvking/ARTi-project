"use client"

import { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { 
  Home, 
  BarChart3, 
  Settings, 
  HelpCircle, 
  Building2, 
  Users, 
  Folder,
  FormInput,
  UserCheck2,
  DollarSign,
  Activity,
  ChevronDown,
  ChevronRight
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const sidebarItems = [
  {
    title: "Dashboard",
    url: "/youtube",
    icon: Home,
    roles: ["admin", "manager", "salesperson"]
  },
  {
    title: "Campaigns",
    icon: Folder,
    roles: ["admin", "manager", "salesperson"],
    subItems: [
      {
        title: "All Campaigns",
        url: "/youtube/campaigns",
        roles: ["admin", "manager", "salesperson"]
      },
      {
        title: "Pending Submissions",
        url: "/youtube/campaigns?tab=pending",
        roles: ["admin", "manager", "salesperson"]
      }
    ]
  },
  {
    title: "Campaign Intake",
    url: "/youtube/campaign-intake",
    icon: FormInput,
    roles: ["admin", "manager"]
  },
  {
    title: "Clients",
    url: "/youtube/clients",
    icon: UserCheck2,
    roles: ["admin", "manager", "salesperson"]
  },
  {
    title: "Vendor Payments",
    url: "/youtube/vendor-payments",
    icon: DollarSign,
    roles: ["admin", "manager"]
  },
  {
    title: "Users",
    url: "/youtube/users",
    icon: Users,
    roles: ["admin"]
  },
  {
    title: "System Health",
    url: "/youtube/system-health",
    icon: Activity,
    roles: ["admin"]
  },
  {
    title: "Settings",
    url: "/youtube/settings",
    icon: Settings,
    roles: ["admin", "manager", "salesperson"]
  },
  {
    title: "Help & Support",
    url: "/youtube/help",
    icon: HelpCircle,
    roles: ["admin", "manager", "salesperson"]
  }
];

export function AppSidebar() {
  const { state } = useSidebar();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isAdmin, isManager } = useAuth();
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['Campaigns']);
  
  const getUserRole = () => {
    if (isAdmin) return 'admin';
    if (isManager) return 'manager';
    return 'salesperson';
  };

  const userRole = getUserRole();
  const filteredItems = sidebarItems.filter(item => item.roles.includes(userRole));

  const isActive = (path: string) => {
    if (path === '/youtube') {
      return pathname === '/youtube';
    }
    if (path.includes('?')) {
      const [basePath, query] = path.split('?');
      const searchValue = searchParams?.get(query.split('=')[0]);
      return pathname === basePath && searchValue === query.split('=')[1];
    }
    return pathname.startsWith(path);
  };

  const toggleGroup = (title: string) => {
    setExpandedGroups(prev => 
      prev.includes(title) 
        ? prev.filter(group => group !== title)
        : [...prev, title]
    );
  };

  return (
    <Sidebar
      variant="sidebar"
      collapsible="icon"
    >
      <SidebarHeader>
        <div className="flex items-center gap-2 px-4 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Building2 className="h-4 w-4" />
          </div>
          {state !== 'collapsed' && (
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">Artist Influence</span>
              <span className="truncate text-xs text-muted-foreground">Platform</span>
            </div>
          )}
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredItems.map((item) => {
                const Icon = item.icon;
                
                if (item.subItems) {
                  const isExpanded = expandedGroups.includes(item.title);
                  const hasActiveChild = item.subItems.some(subItem => isActive(subItem.url));
                  
                  return (
                    <SidebarMenuItem key={item.title}>
                      <Collapsible open={isExpanded} onOpenChange={() => toggleGroup(item.title)}>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton isActive={hasActiveChild}>
                            <Icon className="h-4 w-4" />
                            <span>{item.title}</span>
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 ml-auto" />
                            ) : (
                              <ChevronRight className="h-4 w-4 ml-auto" />
                            )}
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenu className="ml-4 mt-1">
                            {item.subItems
                              .filter(subItem => subItem.roles.includes(userRole))
                              .map((subItem) => {
                                const active = isActive(subItem.url);
                                return (
                                  <SidebarMenuItem key={subItem.title}>
                                    <SidebarMenuButton asChild isActive={active} size="sm">
                                      <Link href={subItem.url}>
                                        <span>{subItem.title}</span>
                                      </Link>
                                    </SidebarMenuButton>
                                  </SidebarMenuItem>
                                );
                              })}
                          </SidebarMenu>
                        </CollapsibleContent>
                      </Collapsible>
                    </SidebarMenuItem>
                  );
                }

                const active = isActive(item.url!);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={active}>
                      <Link href={item.url!}>
                        <Icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}