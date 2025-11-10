import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface LoadingSkeletonProps {
  className?: string;
  variant?: 'default' | 'card' | 'text' | 'circular' | 'rectangular';
  animated?: boolean;
}

export const LoadingSkeleton = ({ 
  className, 
  variant = 'default',
  animated = true 
}: LoadingSkeletonProps) => {
  const baseClasses = "bg-muted animate-pulse";
  
  const variantClasses = {
    default: "rounded-md",
    card: "rounded-lg h-32",
    text: "rounded h-4",
    circular: "rounded-full",
    rectangular: "rounded-none"
  };

  const skeletonClasses = cn(
    baseClasses,
    variantClasses[variant],
    className
  );

  if (animated) {
    return (
      <motion.div
        className={skeletonClasses}
        initial={{ opacity: 0.3 }}
        animate={{ opacity: [0.3, 0.8, 0.3] }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
    );
  }

  return <div className={skeletonClasses} />;
};

// Preset skeleton components
export const CardSkeleton = () => (
  <div className="space-y-4 p-6 border border-border rounded-lg">
    <div className="flex items-center space-x-4">
      <LoadingSkeleton variant="circular" className="h-10 w-10" />
      <div className="space-y-2 flex-1">
        <LoadingSkeleton variant="text" className="w-3/4" />
        <LoadingSkeleton variant="text" className="w-1/2" />
      </div>
    </div>
    <LoadingSkeleton variant="rectangular" className="h-20 w-full" />
    <div className="space-y-2">
      <LoadingSkeleton variant="text" className="w-full" />
      <LoadingSkeleton variant="text" className="w-2/3" />
    </div>
  </div>
);

export const StatCardSkeleton = () => (
  <div className="p-6 border border-border rounded-lg space-y-3">
    <div className="flex items-center justify-between">
      <LoadingSkeleton variant="text" className="w-1/2 h-4" />
      <LoadingSkeleton variant="circular" className="h-4 w-4" />
    </div>
    <LoadingSkeleton variant="text" className="w-1/3 h-8" />
    <LoadingSkeleton variant="text" className="w-2/3 h-3" />
  </div>
);