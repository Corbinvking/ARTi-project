import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SERVICE_TYPES } from "../../lib/constants";
import { Plus, Trash2 } from "lucide-react";
import type { Database } from "../../integrations/supabase/types";

type ServiceType = Database['public']['Enums']['service_type'];

interface ServiceTypeGoal {
  id: string;
  service_type: ServiceType;
  custom_service_type?: string;
  goal_views: number;
}

interface ServiceTypeSelectorProps {
  serviceTypes: ServiceTypeGoal[];
  onServiceTypesChange: (serviceTypes: ServiceTypeGoal[]) => void;
}

export const ServiceTypeSelector = ({ serviceTypes, onServiceTypesChange }: ServiceTypeSelectorProps) => {
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
  };

  const updateServiceType = (id: string, field: keyof ServiceTypeGoal, value: any) => {
    onServiceTypesChange(serviceTypes.map(st => 
      st.id === id ? { ...st, [field]: value } : st
    ));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Service Types & Goals</Label>
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
              <Select
                value={serviceType.service_type}
                onValueChange={(value) => updateServiceType(serviceType.id, 'service_type', value as ServiceType)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select service type" />
                </SelectTrigger>
                <SelectContent>
                  {SERVICE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

            <div className="space-y-2">
              <Label>Goal Views</Label>
              <Input
                type="number"
                placeholder="e.g. 100000"
                value={serviceType.goal_views || ''}
                onChange={(e) => updateServiceType(serviceType.id, 'goal_views', parseInt(e.target.value) || 0)}
              />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};