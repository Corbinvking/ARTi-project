import { usePathname } from 'next/navigation';
import { useMemo } from 'react';

interface Breadcrumb {
  label: string;
  href: string;
}

export const useBreadcrumbs = (): Breadcrumb[] => {
  const location = usePathname();

  return useMemo(() => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const breadcrumbs: Breadcrumb[] = [
      { label: 'Dashboard', href: '/' }
    ];

    if (pathSegments.length === 0) {
      return breadcrumbs;
    }

    let currentPath = '';
    for (let i = 0; i < pathSegments.length; i++) {
      const segment = pathSegments[i];
      currentPath += `/${segment}`;

      // Map route segments to human-readable labels
      let label = segment;
      switch (segment) {
        case 'campaigns':
          label = 'Campaigns';
          break;
        case 'reports':
          label = 'Reports';
          break;
        case 'settings':
          label = 'Settings';
          break;
        case 'profile':
          label = 'Profile';
          break;
        case 'admin':
          label = 'Administration';
          break;
        case 'users':
          label = 'User Management';
          break;
        case 'help':
          label = 'Help & Support';
          break;
        case 'campaign-intake':
          label = 'Campaign Intake';
          break;
        default:
          // If it's a UUID or number, it's likely an ID
          if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment) || /^\d+$/.test(segment)) {
            label = 'Details';
          } else {
            // Capitalize first letter and replace hyphens with spaces
            label = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
          }
          break;
      }

      breadcrumbs.push({ label, href: currentPath });
    }

    return breadcrumbs;
  }, [location.pathname]);
};