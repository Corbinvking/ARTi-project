import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FloatingActionButtonProps {
  icon: LucideIcon;
  onClick: () => void;
  label: string;
  className?: string;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}

export const FloatingActionButton = ({
  icon: Icon,
  onClick,
  label,
  className,
  position = 'bottom-right'
}: FloatingActionButtonProps) => {
  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'top-right': 'top-6 right-6',
    'top-left': 'top-6 left-6'
  };

  return (
    <motion.button
      onClick={onClick}
      className={cn(
        'fixed z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-glow',
        'flex items-center justify-center transition-all duration-300',
        'hover:scale-110 hover:shadow-intense group',
        positionClasses[position],
        className
      )}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ 
        type: "spring", 
        stiffness: 400, 
        damping: 25,
        delay: 0.2 
      }}
    >
      <Icon className="h-6 w-6" />
      
      {/* Tooltip */}
      <motion.div
        className="absolute right-16 top-1/2 -translate-y-1/2 bg-popover text-popover-foreground px-3 py-2 rounded-lg text-sm whitespace-nowrap shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
        initial={{ opacity: 0, x: 10 }}
        whileHover={{ opacity: 1, x: 0 }}
      >
        {label}
        <div className="absolute left-full top-1/2 -translate-y-1/2 border-4 border-transparent border-l-popover" />
      </motion.div>
    </motion.button>
  );
};