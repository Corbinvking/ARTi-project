'use client'

import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Database, Home, Plus, History, LogOut, User, CheckCircle, Zap, Search } from "lucide-react";
import { useState } from "react";
import { GlobalSearch } from "./GlobalSearch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";


import { useRouter } from 'next/navigation';
import { WorkflowAlerts } from "./WorkflowAlerts";

const Navigation = () => {
  const location = useLocation();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Don't show navigation on auth page
  if (location.pathname === '/auth') {
    return null;
  }

  const isActive = (path: string) => location.pathname === path;

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Signed out successfully');
      router.push('/auth');
    } catch (error) {
      toast.error('Failed to sign out');
    }
  };

  return (
    <nav className="bg-card border-b border-border">
      <div className="container mx-auto max-w-7xl px-4 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/dashboard" className="flex items-center shrink-0">
            <img 
              src="/src/assets/artist-influence-logo.png" 
              alt="Artist Influence" 
              className="h-8 w-auto"
            />
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center space-x-1 lg:space-x-6 overflow-x-auto scrollbar-hide">
            <Link to="/dashboard">
              <Button 
                variant={isActive("/dashboard") ? "default" : "ghost"} 
                size="sm"
                className="flex items-center gap-1 lg:gap-2 shrink-0"
              >
                <Home className="h-4 w-4" />
                <span className="hidden sm:block">HOME</span>
              </Button>
            </Link>
            
            <Link to="/creators">
              <Button 
                variant={isActive("/creators") ? "default" : "ghost"} 
                size="sm"
                className="flex items-center gap-1 lg:gap-2 shrink-0"
              >
                <Database className="h-4 w-4" />
                <span className="hidden sm:block">CREATORS</span>
              </Button>
            </Link>
            
            <Link to="/campaign-builder">
              <Button 
                variant={isActive("/campaign-builder") ? "default" : "ghost"} 
                size="sm"
                className="flex items-center gap-1 lg:gap-2 shrink-0"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden md:block">BUILD CAMPAIGN</span>
                <span className="hidden sm:block md:hidden">BUILD</span>
              </Button>
            </Link>
            
            <Link to="/qa">
              <Button 
                variant={isActive("/qa") ? "default" : "ghost"} 
                size="sm"
                className="flex items-center gap-1 lg:gap-2 shrink-0"
              >
                <CheckCircle className="h-4 w-4" />
                <span className="hidden sm:block">QA</span>
              </Button>
            </Link>
            
            <Link to="/workflow">
              <Button 
                variant={isActive("/workflow") ? "default" : "ghost"} 
                size="sm"
                className="flex items-center gap-1 lg:gap-2 shrink-0"
              >
                <Zap className="h-4 w-4" />
                <span className="hidden sm:block">WORKFLOW</span>
              </Button>
            </Link>
            
            <Link to="/campaigns">
              <Button 
                variant={isActive("/campaigns") ? "default" : "ghost"} 
                size="sm"
                className="flex items-center gap-1 lg:gap-2 shrink-0"
              >
                <History className="h-4 w-4" />
                <span className="hidden sm:block">CAMPAIGNS</span>
              </Button>
            </Link>

            {/* Search Button */}
            <Button 
              variant="ghost" 
              size="sm"
              className="flex items-center gap-1 lg:gap-2 shrink-0"
              onClick={() => setIsSearchOpen(true)}
            >
              <Search className="h-4 w-4" />
              <span className="hidden lg:block">SEARCH</span>
              <kbd className="hidden xl:inline-flex pointer-events-none h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                <span className="text-xs">⌘</span>K
              </kbd>
            </Button>

            {/* User Menu */}
            <div className="flex items-center space-x-1 lg:space-x-2 shrink-0">
              <WorkflowAlerts />
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="flex items-center gap-1 lg:gap-2">
                    <User className="h-4 w-4" />
                    <span className="hidden lg:block">{user?.email?.split('@')[0]}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="z-50 bg-background border border-border">
                  <DropdownMenuItem disabled>
                    <User className="h-4 w-4 mr-2" />
                    {user?.email}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="h-4 w-4 mr-2" />
                    SIGN OUT
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>
      
      <GlobalSearch 
        isOpen={isSearchOpen} 
        onClose={() => setIsSearchOpen(false)} 
      />
    </nav>
  );
};

export default Navigation;