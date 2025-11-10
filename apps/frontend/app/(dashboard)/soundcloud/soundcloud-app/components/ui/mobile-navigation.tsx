"use client"

import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Menu, 
  Home, 
  Upload, 
  History, 
  User, 
  Coins, 
  BarChart3, 
  Target, 
  Shield,
  Calendar,
  Music,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  description?: string;
  group?: string;
}

const portalNavigation: NavItem[] = [
  { 
    name: 'Dashboard', 
    href: '/portal', 
    icon: Home, 
    description: 'Overview & quick actions',
    group: 'main'
  },
  { 
    name: 'My Queue', 
    href: '/portal/queue', 
    icon: Calendar,
    badge: 3,
    description: 'Upcoming submissions',
    group: 'main'
  },
  { 
    name: 'Submit Track', 
    href: '/portal/submit', 
    icon: Upload,
    description: 'Submit new music',
    group: 'main'
  },
  { 
    name: 'My History', 
    href: '/portal/history', 
    icon: History,
    description: 'Past submissions',
    group: 'activity' 
  },
  { 
    name: 'Credits', 
    href: '/portal/credits', 
    icon: Coins,
    badge: 150,
    description: 'Credit balance & history',
    group: 'activity'
  },
  { 
    name: 'Analytics', 
    href: '/portal/analytics', 
    icon: BarChart3,
    description: 'Performance insights',
    group: 'tools'
  },
  { 
    name: 'Attribution', 
    href: '/portal/attribution', 
    icon: Target,
    description: 'Track influences',
    group: 'tools'
  },
  { 
    name: 'Avoid List', 
    href: '/portal/avoid-list', 
    icon: Shield,
    description: 'Manage exclusions',
    group: 'tools'
  },
  { 
    name: 'Profile', 
    href: '/portal/profile', 
    icon: User,
    description: 'Account settings',
    group: 'account'
  }
];

interface MobileNavigationProps {
  className?: string;
}

export const MobileNavigation = ({ className }: MobileNavigationProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const isMobile = useIsMobile();
  const { member, isAdmin, isModerator } = useAuth();

  if (!isMobile) return null;

  const isActive = (href: string, exact = false) => {
    if (exact) {
      return location.pathname === href;
    }
    return location.pathname.startsWith(href);
  };

  const groupNavigation = () => {
    const groups = portalNavigation.reduce((acc, item) => {
      const group = item.group || 'other';
      if (!acc[group]) acc[group] = [];
      acc[group].push(item);
      return acc;
    }, {} as Record<string, NavItem[]>);

    const groupOrder = ['main', 'activity', 'tools', 'account'];
    const groupTitles = {
      main: 'Main',
      activity: 'Activity',
      tools: 'Tools',
      account: 'Account'
    };

    return groupOrder.map(groupKey => ({
      key: groupKey,
      title: groupTitles[groupKey as keyof typeof groupTitles],
      items: groups[groupKey] || []
    })).filter(group => group.items.length > 0);
  };

  return (
    <div className={cn("block md:hidden", className)}>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-9 w-9 p-0 hover:bg-accent/50"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle navigation menu</span>
          </Button>
        </SheetTrigger>
        
        <SheetContent side="left" className="w-80 p-0">
          <SheetHeader className="border-b border-border p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                  <Music className="h-4 w-4 text-primary-foreground" />
                </div>
                <div>
                  <SheetTitle className="text-left">Artist Portal</SheetTitle>
                  <p className="text-xs text-muted-foreground">{member?.name}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </SheetHeader>

          <ScrollArea className="flex-1 px-4 py-2">
            <nav className="space-y-6">
              {groupNavigation().map((group, groupIndex) => (
                <div key={group.key}>
                  {groupIndex > 0 && <Separator className="my-4" />}
                  
                  <div>
                    <h4 className="mb-2 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {group.title}
                    </h4>
                    
                    <div className="space-y-1">
                      {group.items.map((item) => {
                        const active = isActive(item.href, item.href === '/portal');
                        
                        return (
                          <NavLink
                            key={item.name}
                            to={item.href}
                            onClick={() => setIsOpen(false)}
                            className={cn(
                              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-200",
                              "hover:bg-accent hover:text-accent-foreground",
                              active && "bg-accent text-accent-foreground font-medium"
                            )}
                          >
                            <item.icon className={cn(
                              "h-4 w-4 flex-shrink-0",
                              active ? "text-accent-foreground" : "text-muted-foreground"
                            )} />
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className="truncate">{item.name}</span>
                                {item.badge && (
                                  <Badge 
                                    variant={active ? "default" : "secondary"} 
                                    className="ml-2 h-5 text-xs"
                                  >
                                    {item.badge}
                                  </Badge>
                                )}
                              </div>
                              {item.description && (
                                <p className="text-xs text-muted-foreground truncate mt-0.5">
                                  {item.description}
                                </p>
                              )}
                            </div>
                          </NavLink>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}

              {/* Admin Quick Access */}
              {(isAdmin || isModerator) && (
                <>
                  <Separator />
                  <div>
                    <h4 className="mb-2 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Quick Access
                    </h4>
                    <NavLink
                      to="/dashboard"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-200 hover:bg-accent hover:text-accent-foreground"
                    >
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <span>Admin Dashboard</span>
                        <p className="text-xs text-muted-foreground">Management tools</p>
                      </div>
                    </NavLink>
                  </div>
                </>
              )}
            </nav>
          </ScrollArea>

          {/* User Info Footer */}
          <div className="border-t border-border p-4 mt-auto">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-primary rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-primary-foreground text-sm font-medium">
                  {member?.name?.charAt(0).toUpperCase() || "U"}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{member?.name}</p>
                <p className="text-xs text-muted-foreground truncate">{member?.emails?.[0]}</p>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};