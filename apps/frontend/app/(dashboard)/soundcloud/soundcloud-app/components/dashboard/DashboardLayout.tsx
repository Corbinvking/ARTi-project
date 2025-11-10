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
import { 
  LayoutDashboard, 
  CalendarDays, 
  DollarSign, 
  Inbox,
  Users, 
  Activity, 
  Zap,
  Tags,
  Settings,
  LogOut,
  Home,
  Music,
  BarChart3,
  TrendingUp,
  PieChart,
  FileBarChart,
  Download,
  Brain
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { NotificationBell } from '../notifications/NotificationBell';
import { MobileNavigation } from '../ui/mobile-navigation';
import { useIsMobile } from '../../hooks/use-mobile';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

// New 9-Section Architecture + Analytics
const navigation: NavItem[] = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard, description: "Revenue, campaigns, credits snapshot" },
  { name: "Planner", href: "/dashboard/planner", icon: CalendarDays, description: "Calendar/list unified view" },
  { name: "Campaigns (Paid)", href: "/dashboard/campaigns", icon: DollarSign, description: "Pipeline management" },
  { name: "Queue (Free)", href: "/dashboard/queue", icon: Inbox, description: "Submissions inbox" },
  { name: "Members", href: "/dashboard/members", icon: Users, description: "Directory with credits & connections" },
  { name: "Health", href: "/dashboard/health", icon: Activity, description: "Connection status & warnings" },
  { name: "Automation", href: "/dashboard/automation", icon: Zap, description: "Email templates & logs" },
  { name: "Genres", href: "/dashboard/genres", icon: Tags, description: "Family/subgenre management" },
  { name: "Settings", href: "/dashboard/settings", icon: Settings, description: "Credit rules & configs" },
];

// Analytics Navigation
const analyticsNavigation: NavItem[] = [
  { name: "Analytics Hub", href: "/dashboard/analytics", icon: BarChart3, description: "Executive analytics dashboard" },
  { name: "Revenue Analytics", href: "/dashboard/analytics/revenue", icon: TrendingUp, description: "Financial performance & forecasting" },
  { name: "Member Insights", href: "/dashboard/analytics/members", icon: Users, description: "Member behavior & performance analysis" },
  { name: "Campaign Analytics", href: "/dashboard/analytics/campaigns", icon: PieChart, description: "Campaign ROI & effectiveness" },
  { name: "Weekly Campaign Reports", href: "/dashboard/analytics/reports", icon: FileBarChart, description: "SoundCloud campaign weekly reports" },
  { name: "Data Exports", href: "/dashboard/analytics/exports", icon: Download, description: "Export & schedule reports" },
  { name: "Business Intelligence", href: "/dashboard/analytics/intelligence", icon: Brain, description: "Advanced BI & insights" },
  { name: "Integrated View", href: "/dashboard/analytics/integrated", icon: BarChart3, description: "Unified analytics dashboard" },
];

export const DashboardLayout = () => {
  const { user, signOut } = useAuth();
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

  const currentSection = navigation.find(nav => isActive(nav.href, nav.href === '/dashboard'));

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <Sidebar>
          <SidebarHeader className="border-b border-sidebar-border p-4">
            <div className="flex items-center gap-2">
              <img 
                src="/src/assets/artist-influence-logo.png" 
                alt="Artist Influence" 
                className="h-8 w-auto"
              />
              <div>
                <h2 className="font-semibold text-sidebar-foreground">Admin Dashboard</h2>
                <p className="text-xs text-sidebar-foreground/60">9-Section Architecture</p>
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Core Platform</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigation.map((item) => (
                    <SidebarMenuItem key={item.name}>
                      <SidebarMenuButton 
                        asChild
                        className={isActive(item.href, item.href === '/dashboard') 
                          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" 
                          : ""
                        }
                        tooltip={item.description}
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

            <SidebarGroup>
              <SidebarGroupLabel>Analytics & Reports</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {analyticsNavigation.map((item) => (
                    <SidebarMenuItem key={item.name}>
                      <SidebarMenuButton 
                        asChild
                        className={isActive(item.href) 
                          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" 
                          : ""
                        }
                        tooltip={item.description}
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
          </SidebarContent>

          <SidebarFooter className="p-4 border-t border-sidebar-border">
            <div className="flex items-center gap-3 mb-2 px-2 py-2">
              <div className="w-8 h-8 bg-gradient-primary rounded-full flex items-center justify-center">
                <span className="text-primary-foreground text-sm font-medium">
                  {user?.email?.charAt(0).toUpperCase() || "A"}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">{user?.email}</p>
                <p className="text-xs text-sidebar-foreground/60">Administrator</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              className="w-full justify-start text-sidebar-foreground hover:text-foreground mb-1"
              onClick={() => navigate('/portal')}
            >
              <Music className="h-4 w-4 mr-2" />
              Member Portal
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
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
            <div className="ml-4 flex-1">
              <h1 className="text-lg font-semibold text-foreground">
                {currentSection?.name || 'Dashboard'}
              </h1>
              {currentSection?.description && !isMobile && (
                <p className="text-sm text-muted-foreground">{currentSection.description}</p>
              )}
            </div>
            <div className="flex items-center gap-4">
              <NotificationBell />
            </div>
          </header>
          
          <main className="flex-1 overflow-auto p-4 lg:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};