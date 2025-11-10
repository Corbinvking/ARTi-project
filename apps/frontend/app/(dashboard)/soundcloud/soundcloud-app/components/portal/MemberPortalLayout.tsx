import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
  SidebarProvider, 
  Sidebar, 
  SidebarContent, 
  SidebarGroup, 
  SidebarGroupContent, 
  SidebarGroupLabel, 
  SidebarMenu, 
  SidebarMenuItem, 
  SidebarMenuButton,
  SidebarTrigger,
  SidebarHeader,
  SidebarFooter
} from '../ui/sidebar';
import { Button } from '@/components/ui/button';
import { useAuth } from '../../contexts/AuthContext';
import { Home, Upload, History, User, LogOut, Music, Calendar, Coins, BarChart3, Target, Shield } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { MobileNavigation } from '../ui/mobile-navigation';
import { useIsMobile } from '../../hooks/use-mobile';

const navigation = [
  { name: 'Dashboard', href: '/portal', icon: Home, exact: true },
  { name: 'My Queue', href: '/portal/queue', icon: Calendar },
  { name: 'Submit Track', href: '/portal/submit', icon: Upload },
  { name: 'My History', href: '/portal/history', icon: History },
  { name: 'Credits', href: '/portal/credits', icon: Coins },
  { name: 'Analytics', href: '/portal/analytics', icon: BarChart3 },
  { name: 'Attribution', href: '/portal/attribution', icon: Target },
  { name: 'Avoid List', href: '/portal/avoid-list', icon: Shield },
  { name: 'Profile', href: '/portal/profile', icon: User },
];

export const MemberPortalLayout = () => {
  const { member, signOut, isAdmin, isModerator } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const isActive = (href: string, exact = false) => {
    if (exact) {
      return location.pathname === href;
    }
    return location.pathname.startsWith(href);
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <Sidebar>
          <SidebarHeader className="border-b border-sidebar-border p-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                <Music className="h-4 w-4 text-primary-foreground" />
              </div>
              <div>
                <h2 className="font-semibold text-sidebar-foreground">Artist Portal</h2>
                <p className="text-xs text-sidebar-foreground/60">{member?.name}</p>
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Navigation</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigation.map((item) => (
                    <SidebarMenuItem key={item.name}>
                      <SidebarMenuButton 
                        asChild
                        className={isActive(item.href, item.exact) 
                          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" 
                          : ""
                        }
                      >
                        <NavLink to={item.href}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.name}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Admin access notice */}
            {(isAdmin || isModerator) && (
              <SidebarGroup>
                <SidebarGroupLabel>Quick Access</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <NavLink to="/dashboard">
                          <User className="h-4 w-4" />
                          <span>Admin Dashboard</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}
          </SidebarContent>

          <SidebarFooter className="p-4 border-t border-sidebar-border">
            <Button 
              variant="ghost" 
              onClick={handleSignOut} 
              className="w-full justify-start text-sidebar-foreground hover:text-accent hover:bg-accent/10"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </SidebarFooter>
        </Sidebar>

        <div className="flex-1 flex flex-col min-h-screen">
          <header className="h-14 border-b border-border bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 flex items-center">
            {!isMobile && <SidebarTrigger />}
            <MobileNavigation className="md:hidden" />
            <div className="ml-4">
              <h1 className="text-lg font-semibold text-foreground">
                {navigation.find(nav => isActive(nav.href, nav.exact))?.name || 'Portal'}
              </h1>
            </div>
          </header>
          
          <main className="flex-1 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};