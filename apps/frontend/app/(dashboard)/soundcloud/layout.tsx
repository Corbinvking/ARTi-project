"use client";

import { ReactNode, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Home, Music, PlayCircle, BarChart3, Settings, Users, Calendar, Bell } from "lucide-react";

const navItems = [
  { title: "Dashboard", href: "/soundcloud", icon: Home },
  { title: "Planner", href: "/soundcloud/dashboard/planner", icon: Calendar },
  { title: "Campaigns", href: "/soundcloud/dashboard/campaigns", icon: PlayCircle },
  { title: "Queue", href: "/soundcloud/dashboard/queue", icon: Music },
  { title: "Members", href: "/soundcloud/dashboard/members", icon: Users },
  { title: "Analytics", href: "/soundcloud/dashboard/analytics", icon: BarChart3 },
  { title: "Settings", href: "/soundcloud/dashboard/settings", icon: Settings },
];

export default function SoundCloudLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5,
        retry: 1,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex min-h-screen flex-col">
        <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-14 items-center">
            <div className="mr-4 flex">
              <Link href="/soundcloud" className="mr-6 flex items-center space-x-2">
                <Music className="h-6 w-6" />
                <span className="font-bold">SoundCloud Manager</span>
              </Link>
            </div>
            <div className="flex flex-1 items-center space-x-2 justify-end md:justify-between">
              <nav className="flex items-center space-x-6 text-sm font-medium">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href ||
                    (item.href !== "/soundcloud" && pathname.startsWith(item.href));

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
        <div className="flex-1">
          {children}
        </div>
      </div>
    </QueryClientProvider>
  );
}


