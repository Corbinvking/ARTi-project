"use client"

import React, { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "../lib/utils";
import { Button } from "./ui/button";
import { PROJECT_NAME, PROJECT_ID } from "../lib/constants";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { 
  Home, 
  Database, 
  Plus, 
  History, 
  Settings,
  Music,
  Menu,
  X,
  Key,
  Users,
  LogOut,
  User,
  UserPlus,
  Brain,
  DollarSign,
  Target,
  Receipt
} from "lucide-react";
import SpotifySettingsModal from "./SpotifySettingsModal";
import { useAuth } from "../hooks/useAuth";
import { GlobalSearch } from "./GlobalSearch";
import { Breadcrumb } from "./Breadcrumb";
import { NotificationCenter } from "./NotificationCenter";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { KeyboardShortcutsModal } from "./KeyboardShortcutsModal";

interface LayoutProps {
  children: React.ReactNode;
}

interface NavItem {
  title: string;
  href: string;
  icon: any;
  hotkey: string;
  adminOnly?: boolean;
}

// Role-based navigation items
const getNavItemsForRole = (currentRole: string | null) => {
  const baseItems = [
    {
      title: "Dashboard",
      href: "/spotify",
      icon: Home,
      hotkey: "Ctrl+1"
    },
  ];

  if (currentRole === 'admin' || currentRole === 'manager' || currentRole === 'operator') {
    return [
      ...baseItems,
      {
        title: "Vendors",
        href: "/spotify/playlists", 
        icon: Database,
        hotkey: "Ctrl+2"
      },
      {
        title: "Campaigns",
        href: "/spotify/campaigns",
        icon: History,
        hotkey: "Ctrl+4"
      },
      {
        title: "Clients",
        href: "/spotify/clients",
        icon: Users,
        hotkey: "Ctrl+5"
      },
      {
        title: "ML Analytics",
        href: "/spotify/ml-dashboard",
        icon: Brain,
        hotkey: "Ctrl+7"
      },
      ...(currentRole === 'admin' ? [{
        title: "Users", 
        href: "/spotify/users",
        icon: UserPlus,
        hotkey: "Ctrl+6",
        adminOnly: true
      }] : [])
    ];
  }

  if (currentRole === 'salesperson') {
    return [
      {
        title: "Dashboard",
        href: "/spotify/salesperson",
        icon: Home,
        hotkey: "Ctrl+1"
      },
      {
        title: "Campaign Intake",
        href: "/spotify/campaign-intake",
        icon: Plus,
        hotkey: "Ctrl+2"
      },
      {
        title: "Campaigns",
        href: "/spotify/campaigns",
        icon: History,
        hotkey: "Ctrl+3"
      },
      {
        title: "Clients",
        href: "/spotify/clients",
        icon: Users,
        hotkey: "Ctrl+4"
      },
    ];
  }

  if (currentRole === 'vendor') {
    return [
      {
        title: "Dashboard",
        href: "/spotify/vendor",
        icon: Home,
        hotkey: "Ctrl+1"
      },
      {
        title: "My Playlists",
        href: "/spotify/vendor/playlists",
        icon: Music,
        hotkey: "Ctrl+2"
      },
      {
        title: "Campaign Requests",
        href: "/spotify/vendor/requests",
        icon: History,
        hotkey: "Ctrl+3"
      }
    ];
  }

  return baseItems;
};

export default function Layout({ children }: LayoutProps) {
  const [showSpotifySettings, setShowSpotifySettings] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  
  const currentRole = user?.role || null;
  const navItems = getNavItemsForRole(currentRole);

  // Enable keyboard shortcuts
  useKeyboardShortcuts();

  // Handle global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('global-search')?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Artist Influence Style Header */}
      <header className="border-b border-border bg-background sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left: Brand */}
            <div className="flex items-center space-x-8">
              <Link href="/spotify" className="flex items-center space-x-2">
                <img 
                  src="/artist-influence-logo.png" 
                  alt="Artist Influence Logo" 
                  className="h-8 w-auto"
                />
              </Link>
              
              {/* Project Identifier */}
              <div className="hidden md:flex items-center space-x-2 px-3 py-1 bg-primary/10 rounded-full border border-primary/20">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                <span className="text-xs font-medium text-primary">SPOTIFY CAMPAIGNS</span>
              </div>
              
              {/* Desktop Navigation */}
              <nav className="hidden lg:flex space-x-3" data-tour="navigation">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center space-x-1 px-2 py-1.5 rounded-md text-xs font-medium transition-smooth",
                        isActive 
                          ? "text-primary bg-primary/10" 
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      )}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{item.title}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Right: Search & Actions */}
            <div className="flex items-center space-x-4">
              {/* Search */}
              <div className="hidden md:flex" data-tour="search">
                <GlobalSearch onSelect={() => setMobileMenuOpen(false)} />
              </div>

              {/* Notifications */}
              <NotificationCenter />

              {/* Settings */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="hidden md:flex">
                    <Settings className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuLabel>Settings</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem onClick={() => setShowSpotifySettings(true)}>
                    <Key className="mr-2 h-4 w-4" />
                    Spotify API Settings
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator />
                  
                  {/* User Info */}
                  {user && (
                    <>
                      <DropdownMenuLabel>
                        <div className="flex flex-col">
                          <span className="text-sm">{user.email}</span>
                          <span className="text-xs text-muted-foreground">Role: {currentRole || 'No role'}</span>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  
                  <DropdownMenuItem 
                    onClick={async () => {
                      await signOut();
                      router.push('/login');
                    }}
                    className="text-destructive focus:text-destructive"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-border bg-background">
            <div className="container mx-auto px-6 py-4">
              <nav className="space-y-2">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-smooth",
                        isActive 
                          ? "text-primary bg-primary/10" 
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-6">
        {/* Breadcrumb */}
        <Breadcrumb />
        
        {/* Page Content */}
        {children}
      </main>
      
      {/* Modals */}
      <SpotifySettingsModal 
        open={showSpotifySettings} 
        onOpenChange={setShowSpotifySettings}
      />
      
      <KeyboardShortcutsModal />
    </div>
  );
}