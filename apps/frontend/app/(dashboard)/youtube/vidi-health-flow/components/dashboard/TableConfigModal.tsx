import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Eye, SortAsc, Filter } from "lucide-react";

interface TableConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ColumnConfig {
  key: string;
  label: string;
  visible: boolean;
  sortable: boolean;
}

export const TableConfigModal = ({ isOpen, onClose }: TableConfigModalProps) => {
  const { toast } = useToast();
  
  const [columns, setColumns] = useState<ColumnConfig[]>([
    { key: 'campaign_name', label: 'Campaign Name', visible: true, sortable: true },
    { key: 'client', label: 'Client', visible: true, sortable: true },
    { key: 'health', label: 'Health Score', visible: true, sortable: true },
    { key: 'status', label: 'Status', visible: true, sortable: true },
    { key: 'progress', label: 'Progress', visible: true, sortable: false },
    { key: 'engagement', label: 'Engagement', visible: true, sortable: true },
    { key: 'revenue', label: 'Revenue', visible: true, sortable: true },
    { key: 'trend', label: 'Trend', visible: true, sortable: false },
    { key: 'actions', label: 'Actions', visible: true, sortable: false },
  ]);

  const [tableSettings, setTableSettings] = useState({
    rowsPerPage: '10',
    defaultSort: 'campaign_name',
    sortDirection: 'asc',
    enableFilters: true,
    enableSearch: true,
    showRowNumbers: false,
    compactMode: false,
  });

  const handleColumnVisibilityChange = (key: string, visible: boolean) => {
    setColumns(prev => prev.map(col => 
      col.key === key ? { ...col, visible } : col
    ));
  };

  const handleSettingChange = (setting: string, value: any) => {
    setTableSettings(prev => ({
      ...prev,
      [setting]: value
    }));
  };

  const handleSave = () => {
    // In a real app, this would save to localStorage or backend
    toast({
      title: "Table Configuration Saved",
      description: "Your table preferences have been updated.",
    });
    onClose();
  };

  const handleReset = () => {
    setColumns(prev => prev.map(col => ({ ...col, visible: true })));
    setTableSettings({
      rowsPerPage: '10',
      defaultSort: 'campaign_name',
      sortDirection: 'asc',
      enableFilters: true,
      enableSearch: true,
      showRowNumbers: false,
      compactMode: false,
    });
    toast({
      title: "Configuration Reset",
      description: "Table configuration has been reset to defaults.",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configure Campaign Table</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Column Visibility Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Column Visibility
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {columns.map((column) => (
                <div key={column.key} className="flex items-center justify-between">
                  <div>
                    <Label htmlFor={`column-${column.key}`}>{column.label}</Label>
                    {column.sortable && (
                      <p className="text-xs text-muted-foreground">Sortable</p>
                    )}
                  </div>
                  <Switch
                    id={`column-${column.key}`}
                    checked={column.visible}
                    onCheckedChange={(checked) => handleColumnVisibilityChange(column.key, checked)}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Sorting Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SortAsc className="w-4 h-4" />
                Default Sorting
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="default-sort">Default Sort Column</Label>
                  <Select
                    value={tableSettings.defaultSort}
                    onValueChange={(value) => handleSettingChange('defaultSort', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {columns.filter(col => col.sortable).map((column) => (
                        <SelectItem key={column.key} value={column.key}>
                          {column.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sort-direction">Sort Direction</Label>
                  <Select
                    value={tableSettings.sortDirection}
                    onValueChange={(value) => handleSettingChange('sortDirection', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asc">Ascending</SelectItem>
                      <SelectItem value="desc">Descending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Display Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Display Options
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="rows-per-page">Rows Per Page</Label>
                <Select
                  value={tableSettings.rowsPerPage}
                  onValueChange={(value) => handleSettingChange('rowsPerPage', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 rows</SelectItem>
                    <SelectItem value="10">10 rows</SelectItem>
                    <SelectItem value="25">25 rows</SelectItem>
                    <SelectItem value="50">50 rows</SelectItem>
                    <SelectItem value="100">100 rows</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="enable-filters">Enable Filters</Label>
                  <p className="text-sm text-muted-foreground">Show filter options above table</p>
                </div>
                <Switch
                  id="enable-filters"
                  checked={tableSettings.enableFilters}
                  onCheckedChange={(checked) => handleSettingChange('enableFilters', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="enable-search">Enable Search</Label>
                  <p className="text-sm text-muted-foreground">Show search bar above table</p>
                </div>
                <Switch
                  id="enable-search"
                  checked={tableSettings.enableSearch}
                  onCheckedChange={(checked) => handleSettingChange('enableSearch', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="show-row-numbers">Show Row Numbers</Label>
                  <p className="text-sm text-muted-foreground">Display row index numbers</p>
                </div>
                <Switch
                  id="show-row-numbers"
                  checked={tableSettings.showRowNumbers}
                  onCheckedChange={(checked) => handleSettingChange('showRowNumbers', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="compact-mode">Compact Mode</Label>
                  <p className="text-sm text-muted-foreground">Reduce row height and padding</p>
                </div>
                <Switch
                  id="compact-mode"
                  checked={tableSettings.compactMode}
                  onCheckedChange={(checked) => handleSettingChange('compactMode', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-between">
          <Button variant="outline" onClick={handleReset}>
            Reset to Defaults
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save Configuration
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};