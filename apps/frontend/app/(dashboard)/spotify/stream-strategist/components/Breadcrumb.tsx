"use client"

import { ChevronRight, Home } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "../lib/utils";

interface BreadcrumbItem {
  label: string;
  href: string;
  current?: boolean;
}

const getBreadcrumbItems = (pathname: string): BreadcrumbItem[] => {
  const items: BreadcrumbItem[] = [
    { label: "Dashboard", href: "/" }
  ];

  const segments = pathname.split('/').filter(Boolean);

  if (segments.length === 0) return items;

  // Route-specific breadcrumbs
  switch (segments[0]) {
    case 'playlists':
      items.push({ label: "Vendors & Playlists", href: "/playlists", current: true });
      break;
    case 'campaigns':
      items.push({ label: "Campaign History", href: "/campaigns", current: true });
      break;
    case 'clients':
      items.push({ label: "Client Management", href: "/clients", current: true });
      break;
    case 'reports':
      items.push({ label: "Reports & Analytics", href: "/reports", current: true });
      break;
    case 'ml-dashboard':
      items.push({ label: "Campaign Intelligence", href: "/ml-dashboard", current: true });
      break;
    case 'payments':
      items.push({ label: "Payment History", href: "/payments", current: true });
      break;
    case 'team-goals':
      items.push({ label: "Team Goals", href: "/team-goals", current: true });
      break;
    case 'campaign':
      items.push({ label: "Campaigns", href: "/campaigns" });
      if (segments[1] === 'new') {
        items.push({ label: "Campaign Builder", href: "/campaign/new", current: true });
      } else if (segments[1] === 'edit') {
        items.push({ label: "Edit Campaign", href: `/campaign/edit/${segments[2]}`, current: true });
      }
      break;
    case 'campaign-intake':
      items.push({ label: "Campaign Submission", href: "/campaign-intake", current: true });
      break;
    case 'campaign-builder':
      items.push({ label: "Campaign Builder", href: "/campaign-builder" });
      if (segments[1] === 'review') {
        items.push({ label: "Review Submission", href: `/campaign-builder/review/${segments[2]}`, current: true });
      }
      break;
    case 'salesperson':
      items.push({ label: "Salesperson Dashboard", href: "/salesperson", current: true });
      break;
    case 'vendor':
      items.push({ label: "Vendor Portal", href: "/vendor" });
      if (segments[1] === 'playlists') {
        items.push({ label: "My Playlists", href: "/vendor/playlists", current: true });
      } else if (segments[1] === 'requests') {
        items.push({ label: "Campaign Requests", href: "/vendor/requests", current: true });
      } else if (segments[1] === 'payments') {
        items.push({ label: "Payment History", href: "/vendor/payments", current: true });
      }
      break;
    default:
      // For any unmatched route, show the current path
      const lastSegment = segments[segments.length - 1];
      items.push({ 
        label: lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1).replace('-', ' '), 
        href: pathname, 
        current: true 
      });
  }

  return items;
};

export function Breadcrumb() {
  const pathname = usePathname();
  const items = getBreadcrumbItems(pathname);

  // Don't show breadcrumbs on the home page
  if (pathname === '/') return null;

  return (
    <nav className="flex items-center space-x-1 text-sm text-muted-foreground mb-4">
      <Link 
        href="/spotify" 
        className="flex items-center hover:text-foreground transition-colors"
      >
        <Home className="h-4 w-4" />
      </Link>
      
      {items.slice(1).map((item, index) => (
        <div key={item.href} className="flex items-center space-x-1">
          <ChevronRight className="h-4 w-4" />
          {item.current ? (
            <span className="font-medium text-foreground">{item.label}</span>
          ) : (
            <Link 
              href={`/spotify${item.href}`}
              className="hover:text-foreground transition-colors"
            >
              {item.label}
            </Link>
          )}
        </div>
      ))}
    </nav>
  );
}








