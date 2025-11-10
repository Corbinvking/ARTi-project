import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AnalyticsHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export const AnalyticsHeader: React.FC<AnalyticsHeaderProps> = ({
  title,
  description,
  actions,
  className
}) => {
  return (
    <div className={cn("flex items-start justify-between mb-6", className)}>
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground max-w-2xl">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
};

interface ActionButtonGroupProps {
  children: React.ReactNode;
  className?: string;
}

export const ActionButtonGroup: React.FC<ActionButtonGroupProps> = ({
  children,
  className
}) => {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {children}
    </div>
  );
};