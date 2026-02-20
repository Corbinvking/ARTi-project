"use client";

import { ReactNode, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Home, Users, Target, BarChart3, CheckCircle, Workflow } from "lucide-react";

const instagramNavItems = [
  {
    title: "Dashboard",
    href: "/instagram",
    icon: Home,
  },
  {
    title: "Creators",
    href: "/instagram/creators",
    icon: Users,
  },
  {
    title: "Campaign Builder",
    href: "/instagram/campaign-builder",
    icon: Target,
  },
  {
    title: "Campaigns",
    href: "/instagram/campaigns",
    icon: BarChart3,
  },
  {
    title: "Quality Assurance",
    href: "/instagram/qa",
    icon: CheckCircle,
  },
  {
    title: "Business Rules",
    href: "/instagram/workflow",
    icon: Workflow,
  },
];

export default function InstagramLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  
  // Create QueryClient for Instagram routes
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
      {/* Instagram Sub-Navigation */}
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 mb-6">
        <div className="container mx-auto flex h-12 items-center px-4">
          <div className="flex items-center space-x-6 text-sm font-medium">
            {instagramNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || 
                (item.href !== "/instagram" && pathname.startsWith(item.href));
              
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
          </div>
        </div>
      </nav>

      {/* Content */}
      {children}
    </QueryClientProvider>
  );
}
