import { ChevronRight, Home } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

const routeMap: Record<string, string> = {
  dashboard: "Dashboard",
  creators: "Creator Database", 
  "campaign-builder": "Campaign Builder",
  campaigns: "Campaign History",
  qa: "Quality Assurance",
  workflow: "Workflow Management",
  "client-dashboard": "Client Dashboard"
};

export const Breadcrumbs = () => {
  const location = useLocation();
  const pathSegments = location.pathname.split('/').filter(Boolean);
  
  if (pathSegments.length === 0 || pathSegments[0] === 'dashboard') {
    return null; // Don't show breadcrumbs on home page
  }

  const breadcrumbs: BreadcrumbItem[] = [
    { label: "Home", href: "/dashboard" }
  ];

  // Build breadcrumb trail
  let currentPath = "";
  pathSegments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    const isLast = index === pathSegments.length - 1;
    
    breadcrumbs.push({
      label: routeMap[segment] || segment.charAt(0).toUpperCase() + segment.slice(1),
      href: isLast ? undefined : currentPath
    });
  });

  return (
    <nav className="flex items-center space-x-1 text-sm text-muted-foreground mb-4">
      {breadcrumbs.map((item, index) => (
        <div key={index} className="flex items-center">
          {index > 0 && <ChevronRight className="h-4 w-4 mx-1" />}
          {item.href ? (
            <Link 
              to={item.href} 
              className="hover:text-foreground transition-colors"
            >
              {index === 0 ? <Home className="h-4 w-4" /> : item.label}
            </Link>
          ) : (
            <span className="text-foreground font-medium">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  );
};