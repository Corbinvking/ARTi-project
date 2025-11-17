"use client";

import { ReactNode, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Home, Video, FileInput, Users as UsersIcon, DollarSign, Settings, HelpCircle } from "lucide-react";

const youtubeNavItems = [
  {
    title: "Dashboard",
    href: "/youtube",
    icon: Home,
  },
  {
    title: "Campaigns",
    href: "/youtube/campaigns",
    icon: Video,
  },
  {
    title: "Campaign Intake",
    href: "/youtube/campaign-intake",
    icon: FileInput,
  },
  {
    title: "Clients",
    href: "/youtube/clients",
    icon: UsersIcon,
  },
  {
    title: "Vendor Payments",
    href: "/youtube/vendor-payments",
    icon: DollarSign,
  },
  {
    title: "Settings",
    href: "/youtube/settings",
    icon: Settings,
  },
  {
    title: "Help",
    href: "/youtube/help",
    icon: HelpCircle,
  },
];

export default function YouTubeLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  
  // Create QueryClient for YouTube routes
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 minutes
        retry: 1,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex min-h-screen flex-col">
        {/* YouTube Navigation */}
        <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-14 items-center">
            <div className="mr-4 flex">
              <Link href="/youtube" className="mr-6 flex items-center space-x-2">
                <span className="font-bold">YouTube Manager</span>
              </Link>
            </div>
            <div className="flex flex-1 items-center space-x-2 justify-end md:justify-between">
              <nav className="flex items-center space-x-6 text-sm font-medium">
                {youtubeNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href || 
                    (item.href !== "/youtube" && pathname.startsWith(item.href));
                  
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-2 transition-colors hover:text-foreground/80",
                        isActive ? "text-foreground" : "text-foreground/60"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="hidden sm:inline-block">{item.title}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        </nav>

        {/* Content */}
        <div className="flex-1">
          {children}
        </div>
      </div>
    </QueryClientProvider>
  );
}

