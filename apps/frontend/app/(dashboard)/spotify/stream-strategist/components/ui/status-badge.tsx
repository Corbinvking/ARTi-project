import { Badge } from "./badge";

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const normalizedStatus = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  
  const variants = {
    'Active': 'bg-green-500/10 text-green-400 border-green-500/30',
    'Draft': 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30', 
    'Paused': 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    'Completed': 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    'Operator Review Complete': 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    'Built': 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
    'Unreleased': 'bg-gray-500/10 text-gray-400 border-gray-500/30',
    'Cancelled': 'bg-red-500/10 text-red-400 border-red-500/30'
  };
  
  const getDisplayStatus = (status: string) => {
    const mappings = {
      'operator_review_complete': 'Operator Review Complete',
      'built': 'Built',
      'unreleased': 'Unreleased',
      'cancelled': 'Cancelled'
    };
    return mappings[status.toLowerCase()] || normalizedStatus;
  };
  
  const displayStatus = getDisplayStatus(status);
  
  return (
    <Badge className={`${variants[displayStatus] || variants['Draft']} border`}>
      {displayStatus}
    </Badge>
  );
}






