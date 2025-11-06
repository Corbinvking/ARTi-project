import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Keyboard, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface KeyboardShortcutsProps {
  onCalculateAll: () => void;
  onExport: () => void;
  onRefresh: () => void;
  onMarkAllPaid: () => void;
  selectedCount: number;
  onBulkMarkPaid?: () => void;
  onBulkMarkUnpaid?: () => void;
}

export const KeyboardShortcuts = ({
  onCalculateAll,
  onExport,
  onRefresh,
  onMarkAllPaid,
  selectedCount,
  onBulkMarkPaid,
  onBulkMarkUnpaid
}: KeyboardShortcutsProps) => {
  const { toast } = useToast();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if user is typing in an input field
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      // Prevent default browser shortcuts when using Ctrl/Cmd
      const isCtrlOrCmd = event.ctrlKey || event.metaKey;
      
      if (isCtrlOrCmd) {
        switch (event.key.toLowerCase()) {
          case 'k':
            event.preventDefault();
            onCalculateAll();
            toast({
              title: "Keyboard Shortcut",
              description: "Calculating all payments...",
            });
            break;
            
          case 'e':
            event.preventDefault();
            onExport();
            toast({
              title: "Keyboard Shortcut",
              description: "Exporting data...",
            });
            break;
            
          case 'r':
            event.preventDefault();
            onRefresh();
            toast({
              title: "Keyboard Shortcut",
              description: "Refreshing data...",
            });
            break;
            
          case 'p':
            event.preventDefault();
            if (selectedCount > 0 && onBulkMarkPaid) {
              onBulkMarkPaid();
              toast({
                title: "Keyboard Shortcut",
                description: `Marking ${selectedCount} campaigns as paid`,
              });
            } else {
              onMarkAllPaid();
              toast({
                title: "Keyboard Shortcut",
                description: "Marking all unpaid campaigns as paid",
              });
            }
            break;
            
          case 'u':
            if (selectedCount > 0 && onBulkMarkUnpaid) {
              event.preventDefault();
              onBulkMarkUnpaid();
              toast({
                title: "Keyboard Shortcut",
                description: `Marking ${selectedCount} campaigns as unpaid`,
              });
            }
            break;
        }
      }

      // Non-Ctrl shortcuts
      switch (event.key) {
        case 'Escape':
          // Clear any modals or selections (could be implemented by parent)
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onCalculateAll, onExport, onRefresh, onMarkAllPaid, selectedCount, onBulkMarkPaid, onBulkMarkUnpaid, toast]);

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2 text-foreground">
          <Keyboard className="w-5 h-5 text-primary" />
          Keyboard Shortcuts
          <Zap className="w-4 h-4 text-warning" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-foreground">
          <div className="flex items-center justify-between">
            <span>Calculate All Payments</span>
            <Badge variant="secondary" className="font-mono">
              Ctrl + K
            </Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <span>Export Data</span>
            <Badge variant="secondary" className="font-mono">
              Ctrl + E
            </Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <span>Refresh Data</span>
            <Badge variant="secondary" className="font-mono">
              Ctrl + R
            </Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <span>Mark as Paid</span>
            <Badge variant="secondary" className="font-mono">
              Ctrl + P
            </Badge>
          </div>
          
          {selectedCount > 0 && (
            <div className="flex items-center justify-between">
              <span>Mark Selected as Unpaid</span>
              <Badge variant="secondary" className="font-mono">
                Ctrl + U
              </Badge>
            </div>
          )}
          
          <div className="flex items-center justify-between text-muted-foreground">
            <span>Clear Selection</span>
            <Badge variant="outline" className="font-mono">
              Escape
            </Badge>
          </div>
        </div>
        
        {selectedCount > 0 && (
          <div className="mt-3 p-3 bg-info/10 border border-info/20 rounded-md">
            <div className="text-sm text-info-foreground">
              <strong>{selectedCount}</strong> campaigns selected. 
              Use <kbd className="px-2 py-1 bg-secondary text-secondary-foreground rounded text-xs font-mono mx-1">Ctrl + P</kbd> or <kbd className="px-2 py-1 bg-secondary text-secondary-foreground rounded text-xs font-mono mx-1">Ctrl + U</kbd> for bulk operations.
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};