"use client"

import React from 'react';
import Link from 'next/link';
import UserMenu from './UserMenu';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { useBreadcrumbs } from "../../hooks/useBreadcrumbs";
import logoImage from '@/assets/artist-influence-logo.png';

const AppHeader = () => {
  const breadcrumbs = useBreadcrumbs();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-4">
        {/* Top row with logo, navigation, and user menu */}
        <div className="flex items-center justify-between">
          <Link href="/youtube/" className="flex items-center">
            <img 
              src={logoImage} 
              alt="Artist Influence" 
              className="h-8 w-auto"
            />
          </Link>
          <UserMenu />
        </div>

        {/* Breadcrumbs row */}
        {breadcrumbs.length > 1 && (
          <div className="mt-4 pt-4 border-t">
            <Breadcrumb>
              <BreadcrumbList>
                {breadcrumbs.map((breadcrumb, index) => (
                  <React.Fragment key={breadcrumb.href}>
                    <BreadcrumbItem>
                      {index === breadcrumbs.length - 1 ? (
                        <BreadcrumbPage>{breadcrumb.label}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink asChild>
                          <Link to={breadcrumb.href}>{breadcrumb.label}</Link>
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                    {index < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
                  </React.Fragment>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        )}
      </div>
    </header>
  );
};

export default AppHeader;