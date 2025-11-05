import { cn } from "../lib/utils";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, AlertCircle, XCircle, Upload } from "lucide-react";

interface StatusIndicatorProps {
  type: 'payment' | 'post' | 'approval';
  status: string;
  className?: string;
}

export const StatusIndicator = ({ type, status, className }: StatusIndicatorProps) => {
  const getStatusConfig = () => {
    if (type === 'payment') {
      switch (status) {
        case 'paid':
          return { variant: 'default', color: 'text-green-600 bg-green-100 hover:bg-green-200 border-green-300', icon: CheckCircle, label: 'Paid' };
        case 'pending':
          return { variant: 'secondary', color: 'text-yellow-600 bg-yellow-100 hover:bg-yellow-200 border-yellow-300', icon: Clock, label: 'Pending' };
        case 'unpaid':
        default:
          return { variant: 'destructive', color: 'text-red-600 bg-red-100 hover:bg-red-200 border-red-300', icon: AlertCircle, label: 'Unpaid' };
      }
    }
    
    if (type === 'post') {
      switch (status) {
        case 'posted':
          return { variant: 'default', color: 'text-green-600 bg-green-100 hover:bg-green-200 border-green-300', icon: CheckCircle, label: 'Posted' };
        case 'scheduled':
          return { variant: 'secondary', color: 'text-blue-600 bg-blue-100 hover:bg-blue-200 border-blue-300', icon: Upload, label: 'Scheduled' };
        case 'not_posted':
        default:
          return { variant: 'outline', color: 'text-gray-600 bg-gray-100 hover:bg-gray-200 border-gray-300', icon: Clock, label: 'Not Posted' };
      }
    }
    
    if (type === 'approval') {
      switch (status) {
        case 'approved':
          return { variant: 'default', color: 'text-green-600 bg-green-100 hover:bg-green-200 border-green-300', icon: CheckCircle, label: 'Approved' };
        case 'pending':
          return { variant: 'secondary', color: 'text-yellow-600 bg-yellow-100 hover:bg-yellow-200 border-yellow-300', icon: Clock, label: 'Pending' };
        case 'revision_requested':
          return { variant: 'outline', color: 'text-orange-600 bg-orange-100 hover:bg-orange-200 border-orange-300', icon: AlertCircle, label: 'Revision' };
        case 'rejected':
          return { variant: 'destructive', color: 'text-red-600 bg-red-100 hover:bg-red-200 border-red-300', icon: XCircle, label: 'Rejected' };
        default:
          return { variant: 'secondary', color: 'text-gray-600 bg-gray-100 hover:bg-gray-200 border-gray-300', icon: Clock, label: status };
      }
    }
    
    return { variant: 'outline', color: 'text-gray-600 bg-gray-100 hover:bg-gray-200 border-gray-300', icon: Clock, label: status };
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <Badge 
      variant={config.variant as any} 
      className={cn("inline-flex items-center gap-1", config.color, className)}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
};