import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle } from 'lucide-react';

interface CampaignPaceIndicatorProps {
  currentStreams: number;
  goalStreams: number;
  daysElapsed: number;
  daysRemaining: number;
  projectedCompletionPercentage: number;
  isOnTrack: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function CampaignPaceIndicator({ 
  currentStreams, 
  goalStreams, 
  daysElapsed, 
  daysRemaining, 
  projectedCompletionPercentage,
  isOnTrack,
  size = 'md'
}: CampaignPaceIndicatorProps) {
  const currentProgress = goalStreams > 0 ? (currentStreams / goalStreams) * 100 : 0;
  const expectedProgress = daysElapsed > 0 ? (daysElapsed / (daysElapsed + daysRemaining)) * 100 : 0;
  
  const getStatusConfig = () => {
    if (projectedCompletionPercentage >= 100) {
      return {
        status: 'On Track',
        color: 'text-green-600',
        bgColor: 'bg-green-100',
        icon: CheckCircle,
        variant: 'default' as const
      };
    } else if (projectedCompletionPercentage >= 80) {
      return {
        status: 'Good Pace',
        color: 'text-blue-600',
        bgColor: 'bg-blue-100',
        icon: TrendingUp,
        variant: 'secondary' as const
      };
    } else if (projectedCompletionPercentage >= 60) {
      return {
        status: 'Behind',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-100',
        icon: AlertTriangle,
        variant: 'outline' as const
      };
    } else {
      return {
        status: 'Needs Action',
        color: 'text-red-600',
        bgColor: 'bg-red-100',
        icon: TrendingDown,
        variant: 'destructive' as const
      };
    }
  };

  const statusConfig = getStatusConfig();
  const Icon = statusConfig.icon;

  const sizeClasses = {
    sm: {
      container: 'p-2',
      text: 'text-xs',
      icon: 'h-3 w-3',
      progress: 'h-1'
    },
    md: {
      container: 'p-3',
      text: 'text-sm',
      icon: 'h-4 w-4',
      progress: 'h-2'
    },
    lg: {
      container: 'p-4',
      text: 'text-base',
      icon: 'h-5 w-5',
      progress: 'h-3'
    }
  };

  const classes = sizeClasses[size];

  return (
    <div className={`border rounded-lg ${classes.container}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className={`${classes.icon} ${statusConfig.color}`} />
          <span className={`font-medium ${classes.text}`}>Campaign Pace</span>
        </div>
        <Badge variant={statusConfig.variant} className={classes.text}>
          {statusConfig.status}
        </Badge>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className={`${classes.text} text-muted-foreground`}>
            {currentStreams.toLocaleString()} / {goalStreams.toLocaleString()} streams
          </span>
          <span className={`${classes.text} font-medium`}>
            {currentProgress.toFixed(1)}%
          </span>
        </div>
        <Progress value={Math.min(currentProgress, 100)} className={classes.progress} />
        
        {size !== 'sm' && (
          <div className={`${classes.text} text-muted-foreground`}>
            <div className="flex justify-between">
              <span>Days remaining: {daysRemaining}</span>
              <span>Projected: {projectedCompletionPercentage}%</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}







