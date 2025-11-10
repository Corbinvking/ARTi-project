"use client"

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '../../hooks/use-toast';
import { Save, X, Plus, Trash2, Clock, Zap, Mail } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface AutomationAction {
  type: 'email' | 'slack' | 'database' | 'function' | 'webhook';
  config: Record<string, any>;
  order: number;
  required: boolean;
}

interface AutomationRule {
  id: string;
  name: string;
  description: string;
  trigger: {
    type: 'schedule' | 'event' | 'condition';
    config: Record<string, any>;
  };
  actions: AutomationAction[];
  enabled: boolean;
  lastRun?: string;
  nextRun?: string;
  successRate: number;
  executionCount: number;
  category: 'queue' | 'notification' | 'member' | 'analytics';
}

interface AutomationRuleEditModalProps {
  rule: AutomationRule | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (rule: AutomationRule) => void;
}

export const AutomationRuleEditModal: React.FC<AutomationRuleEditModalProps> = ({
  rule,
  open,
  onOpenChange,
  onSave
}) => {
  const [formData, setFormData] = useState<AutomationRule>({
    id: rule?.id || '',
    name: rule?.name || '',
    description: rule?.description || '',
    trigger: rule?.trigger || { type: 'schedule', config: {} },
    actions: rule?.actions || [],
    enabled: rule?.enabled || false,
    lastRun: rule?.lastRun,
    nextRun: rule?.nextRun,
    successRate: rule?.successRate || 0,
    executionCount: rule?.executionCount || 0,
    category: rule?.category || 'queue'
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  React.useEffect(() => {
    if (rule) {
      setFormData(rule);
    }
  }, [rule]);

  const handleSave = async () => {
    if (!formData.name.trim() || formData.actions.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please provide a name and at least one action",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      onSave(formData);
      onOpenChange(false);
      
      toast({
        title: "Rule Updated",
        description: "Automation rule has been successfully updated"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update rule",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof AutomationRule, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleTriggerChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      trigger: { ...prev.trigger, config: { ...prev.trigger.config, [field]: value } }
    }));
  };

  const addAction = () => {
    const newAction: AutomationAction = {
      type: 'email',
      config: {},
      order: formData.actions.length + 1,
      required: false
    };
    setFormData(prev => ({
      ...prev,
      actions: [...prev.actions, newAction]
    }));
  };

  const removeAction = (index: number) => {
    setFormData(prev => ({
      ...prev,
      actions: prev.actions.filter((_, i) => i !== index)
    }));
  };

  const updateAction = (index: number, field: keyof AutomationAction, value: any) => {
    setFormData(prev => ({
      ...prev,
      actions: prev.actions.map((action, i) => 
        i === index ? { ...action, [field]: value } : action
      )
    }));
  };

  const getActionIcon = (type: AutomationAction['type']) => {
    switch (type) {
      case 'email': return <Mail className="h-4 w-4" />;
      case 'function': return <Zap className="h-4 w-4" />;
      default: return <Zap className="h-4 w-4" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Edit Automation Rule
            {formData.category && (
              <Badge variant="outline" className="text-xs">
                {formData.category}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Rule Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter rule name"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.enabled}
                onCheckedChange={(checked) => handleInputChange('enabled', checked)}
              />
              <Label>Rule Enabled</Label>
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Describe what this rule does"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Category</Label>
              <Select 
                value={formData.category} 
                onValueChange={(value) => handleInputChange('category', value as AutomationRule['category'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="queue">Queue Management</SelectItem>
                  <SelectItem value="notification">Notifications</SelectItem>
                  <SelectItem value="member">Member Management</SelectItem>
                  <SelectItem value="analytics">Analytics</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Trigger Type</Label>
              <Select 
                value={formData.trigger.type} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, trigger: { ...prev.trigger, type: value as any } }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="schedule">Schedule</SelectItem>
                  <SelectItem value="event">Event</SelectItem>
                  <SelectItem value="condition">Condition</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Trigger Configuration
              </CardTitle>
            </CardHeader>
            <CardContent>
              {formData.trigger.type === 'schedule' && (
                <div>
                  <Label htmlFor="cron">Cron Expression</Label>
                  <Input
                    id="cron"
                    value={formData.trigger.config.cron || ''}
                    onChange={(e) => handleTriggerChange('cron', e.target.value)}
                    placeholder="0 9 * * * (Daily at 9 AM)"
                  />
                </div>
              )}
              {formData.trigger.type === 'event' && (
                <div>
                  <Label htmlFor="event">Event Name</Label>
                  <Input
                    id="event"
                    value={formData.trigger.config.event || ''}
                    onChange={(e) => handleTriggerChange('event', e.target.value)}
                    placeholder="queue_published"
                  />
                </div>
              )}
              {formData.trigger.type === 'condition' && (
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label htmlFor="metric">Metric</Label>
                    <Input
                      id="metric"
                      value={formData.trigger.config.metric || ''}
                      onChange={(e) => handleTriggerChange('metric', e.target.value)}
                      placeholder="engagement_score"
                    />
                  </div>
                  <div>
                    <Label htmlFor="comparison">Comparison</Label>
                    <Select 
                      value={formData.trigger.config.comparison || ''} 
                      onValueChange={(value) => handleTriggerChange('comparison', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="less_than">Less than</SelectItem>
                        <SelectItem value="greater_than">Greater than</SelectItem>
                        <SelectItem value="equals">Equals</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="threshold">Threshold</Label>
                    <Input
                      id="threshold"
                      type="number"
                      value={formData.trigger.config.threshold || ''}
                      onChange={(e) => handleTriggerChange('threshold', parseFloat(e.target.value))}
                      placeholder="0"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Actions ({formData.actions.length})
                </div>
                <Button size="sm" onClick={addAction}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Action
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {formData.actions.map((action, index) => (
                  <div key={index} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getActionIcon(action.type)}
                        <span className="font-medium">Action {index + 1}</span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeAction(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label>Type</Label>
                        <Select 
                          value={action.type} 
                          onValueChange={(value) => updateAction(index, 'type', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="email">Email</SelectItem>
                            <SelectItem value="slack">Slack</SelectItem>
                            <SelectItem value="function">Function</SelectItem>
                            <SelectItem value="database">Database</SelectItem>
                            <SelectItem value="webhook">Webhook</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Order</Label>
                        <Input
                          type="number"
                          value={action.order}
                          onChange={(e) => updateAction(index, 'order', parseInt(e.target.value))}
                          min={1}
                        />
                      </div>
                      <div className="flex items-center space-x-2 pt-6">
                        <Switch
                          checked={action.required}
                          onCheckedChange={(checked) => updateAction(index, 'required', checked)}
                        />
                        <Label>Required</Label>
                      </div>
                    </div>
                  </div>
                ))}
                {formData.actions.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No actions configured. Add an action to get started.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Saving...' : 'Save Rule'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};