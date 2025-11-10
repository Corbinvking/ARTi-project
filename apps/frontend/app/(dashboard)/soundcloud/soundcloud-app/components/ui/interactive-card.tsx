import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface InteractiveCardProps {
  children: ReactNode;
  className?: string;
  hoverScale?: number;
  hoverRotate?: number;
  glowOnHover?: boolean;
  clickable?: boolean;
  onClick?: () => void;
}

export const InteractiveCard = ({
  children,
  className,
  hoverScale = 1.02,
  hoverRotate = 0,
  glowOnHover = false,
  clickable = true,
  onClick
}: InteractiveCardProps) => {
  return (
    <motion.div
      whileHover={{ 
        scale: hoverScale,
        rotate: hoverRotate,
      }}
      whileTap={clickable ? { scale: 0.98 } : {}}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 25
      }}
      className="w-full"
    >
      <Card
        className={cn(
          'transition-all duration-300 cursor-pointer',
          glowOnHover && 'hover:shadow-glow',
          'hover:border-primary/50',
          className
        )}
        onClick={onClick}
      >
        {children}
      </Card>
    </motion.div>
  );
};