import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SERVICE_TYPES } from "../../lib/constants";
import { Plus, Trash2, ChevronDown } from "lucide-react";
import type { Database } from "../../integrations/supabase/types";

type ServiceType = Database['public']['Enums']['service_type'];

interface ServiceTypeGoal {
  id: string;
  service_type: ServiceType;
  custom_service_type?: string;
  goal_views: number;
}

interface MultiServiceTypeSelectorProps {
  serviceTypes: ServiceTypeGoal[];
  onServiceTypesChange: (serviceTypes: ServiceTypeGoal[]) => void;
}

export const MultiServiceTypeSelector = ({ serviceTypes, onServiceTypesChange }: MultiServiceTypeSelectorProps) => {
  const [searchTerms, setSearchTerms] = useState<{ [key: string]: string }>({});
  const [showDropdowns, setShowDropdowns] = useState<{ [key: string]: boolean }>({});
  const [highlightedIndexes, setHighlightedIndexes] = useState<{ [key: string]: number }>({});
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Initialize search terms when service types change
  useEffect(() => {
    const newSearchTerms: { [key: string]: string } = {};
    serviceTypes.forEach(serviceType => {
      if (serviceType.service_type && !searchTerms[serviceType.id]) {
        const serviceTypeOption = SERVICE_TYPES.find(st => st.value === serviceType.service_type);
        newSearchTerms[serviceType.id] = serviceTypeOption?.label || serviceType.service_type;
      }
    });
    if (Object.keys(newSearchTerms).length > 0) {
      setSearchTerms(prev => ({ ...prev, ...newSearchTerms }));
    }
  }, [serviceTypes]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdowns({});
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const addServiceType = () => {
    const newServiceType: ServiceTypeGoal = {
      id: Date.now().toString(),
      service_type: '' as ServiceType,
      goal_views: 0
    };
    onServiceTypesChange([...serviceTypes, newServiceType]);
  };

  const removeServiceType = (id: string) => {
    onServiceTypesChange(serviceTypes.filter(st => st.id !== id));
    // Clean up state for removed service type
    const newSearchTerms = { ...searchTerms };
    const newShowDropdowns = { ...showDropdowns };
    delete newSearchTerms[id];
    delete newShowDropdowns[id];
    setSearchTerms(newSearchTerms);
    setShowDropdowns(newShowDropdowns);
  };

  const updateServiceType = (id: string, field: keyof ServiceTypeGoal, value: any) => {
    onServiceTypesChange(serviceTypes.map(st => 
      st.id === id ? { ...st, [field]: value } : st
    ));
  };

  const handleSearchChange = (id: string, value: string) => {
    setSearchTerms(prev => ({ ...prev, [id]: value }));
    setShowDropdowns(prev => ({ ...prev, [id]: true }));
    setHighlightedIndexes(prev => ({ ...prev, [id]: 0 }));
  };

  const selectServiceType = (id: string, serviceType: ServiceType, label: string) => {
    updateServiceType(id, 'service_type', serviceType);
    setSearchTerms(prev => ({ ...prev, [id]: label }));
    setShowDropdowns(prev => ({ ...prev, [id]: false }));
    
    // Auto-set goal_views to 0 for engagements_only
    if (serviceType === 'engagements_only') {
      updateServiceType(id, 'goal_views', 0);
    }
  };

  const getFilteredServiceTypes = (searchTerm: string) => {
    if (!searchTerm) return SERVICE_TYPES;
    return SERVICE_TYPES.filter(type => 
      type.label.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const getDisplayValue = (serviceType: ServiceTypeGoal) => {
    if (serviceType.service_type) {
      const serviceTypeOption = SERVICE_TYPES.find(st => st.value === serviceType.service_type);
      return serviceTypeOption?.label || serviceType.service_type;
    }
    return searchTerms[serviceType.id] || '';
  };

  const handleKeyDown = (id: string, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdowns[id]) return;

    const filteredTypes = getFilteredServiceTypes(searchTerms[id] || '');
    const currentIndex = highlightedIndexes[id] || 0;

    switch(e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndexes(prev => ({
          ...prev,
          [id]: currentIndex < filteredTypes.length - 1 ? currentIndex + 1 : 0
        }));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndexes(prev => ({
          ...prev,
          [id]: currentIndex > 0 ? currentIndex - 1 : filteredTypes.length - 1
        }));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredTypes[currentIndex]) {
          selectServiceType(id, filteredTypes[currentIndex].value as ServiceType, filteredTypes[currentIndex].label);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowDropdowns(prev => ({ ...prev, [id]: false }));
        break;
    }
  };

  const totalGoalViews = serviceTypes.reduce((sum, st) => sum + (st.goal_views || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-base font-medium">Service Types & Goals</Label>
          <p className="text-sm text-muted-foreground">Total Goal Views: {totalGoalViews.toLocaleString()}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addServiceType}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Service Type
        </Button>
      </div>

      {serviceTypes.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-6 text-center text-muted-foreground">
            No service types added. Click "Add Service Type" to get started.
          </CardContent>
        </Card>
      )}

      {serviceTypes.map((serviceType, index) => (
        <Card key={serviceType.id}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center justify-between">
              Service Type {index + 1}
              {serviceTypes.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeServiceType(serviceType.id)}
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Service Type *</Label>
              <div className="relative" ref={dropdownRef}>
                <Input
                  placeholder="Search service types..."
                  value={getDisplayValue(serviceType)}
                  onChange={(e) => handleSearchChange(serviceType.id, e.target.value)}
                  onFocus={() => setShowDropdowns(prev => ({ ...prev, [serviceType.id]: true }))}
                  onKeyDown={(e) => handleKeyDown(serviceType.id, e)}
                  className="pr-8"
                />
                <ChevronDown 
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground cursor-pointer"
                  onClick={() => setShowDropdowns(prev => ({ ...prev, [serviceType.id]: !prev[serviceType.id] }))}
                />
                {showDropdowns[serviceType.id] && (
                  <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md max-h-60 overflow-y-auto">
                    {getFilteredServiceTypes(searchTerms[serviceType.id] || '').map((type, idx) => (
                      <div
                        key={type.value}
                        className={`px-3 py-2 text-popover-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer text-sm ${
                          idx === (highlightedIndexes[serviceType.id] || 0) ? 'bg-accent/50 border-l-2 border-primary' : ''
                        }`}
                        onClick={() => selectServiceType(serviceType.id, type.value as ServiceType, type.label)}
                      >
                        {type.label}
                      </div>
                    ))}
                    {getFilteredServiceTypes(searchTerms[serviceType.id] || '').length === 0 && (
                      <div className="px-3 py-2 text-sm text-muted-foreground">
                        No service types found
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {serviceType.service_type === 'custom' && (
              <div className="space-y-2">
                <Label>Custom Service Type</Label>
                <Input
                  placeholder="Enter custom service type"
                  value={serviceType.custom_service_type || ''}
                  onChange={(e) => updateServiceType(serviceType.id, 'custom_service_type', e.target.value)}
                />
              </div>
            )}

            {/* Goal Views Input - Hidden for Engagements Only */}
            {serviceType.service_type !== 'engagements_only' ? (
              <div className="space-y-2">
                <Label>Goal Views <span className="text-destructive">*</span></Label>
                <Input
                  type="number"
                  placeholder="e.g. 100000"
                  value={serviceType.goal_views || ''}
                  onChange={(e) => updateServiceType(serviceType.id, 'goal_views', parseInt(e.target.value) || 0)}
                />
              </div>
            ) : (
              <div className="p-3 bg-muted rounded-lg border border-border">
                <p className="text-sm text-muted-foreground">
                  <strong>Engagements Only Mode:</strong> No view goal required. The Ratio Fixer will calculate optimal engagement targets based on the video's current view count during 3 daily check-ins.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};