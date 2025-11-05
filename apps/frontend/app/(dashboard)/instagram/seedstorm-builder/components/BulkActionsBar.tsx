import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, CheckCircle, Clock, XCircle, Download } from 'lucide-react';

interface BulkActionsBarProps {
  selectedCount: number;
  onBulkUpdate: (status: string) => void;
  onExport: () => void;
  onClearSelection: () => void;
}

export const BulkActionsBar: React.FC<BulkActionsBarProps> = ({
  selectedCount,
  onBulkUpdate,
  onExport,
  onClearSelection
}) => {
  if (selectedCount === 0) {
    return (
      <div className="flex justify-between items-center p-3 bg-background/50 rounded-lg border">
        <div className="text-sm text-muted-foreground">
          Select creators to perform bulk actions
        </div>
        <Button variant="outline" size="sm" onClick={onExport}>
          <Download className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </div>
    );
  }

  return (
    <div className="flex justify-between items-center p-3 bg-primary/10 rounded-lg border border-primary/20">
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium">
          {selectedCount} creator{selectedCount !== 1 ? 's' : ''} selected
        </span>
        
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onBulkUpdate('paid')}
            className="text-green-600 hover:text-green-700"
          >
            <CheckCircle className="h-4 w-4 mr-1" />
            Mark Paid
          </Button>
          
          <Button
            size="sm"
            variant="outline"
            onClick={() => onBulkUpdate('pending')}
            className="text-yellow-600 hover:text-yellow-700"
          >
            <Clock className="h-4 w-4 mr-1" />
            Mark Pending
          </Button>
          
          <Button
            size="sm"
            variant="outline"
            onClick={() => onBulkUpdate('unpaid')}
            className="text-red-600 hover:text-red-700"
          >
            <XCircle className="h-4 w-4 mr-1" />
            Mark Unpaid
          </Button>
        </div>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onExport}>
          <Download className="h-4 w-4 mr-2" />
          Export Selected
        </Button>
        
        <Button variant="ghost" size="sm" onClick={onClearSelection}>
          Clear Selection
        </Button>
      </div>
    </div>
  );
};