import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Plus, Settings, Trash2, ArrowRight } from 'lucide-react';
import { useWorkflowAutomation, WorkflowRule } from '../hooks/useWorkflowAutomation';

interface WorkflowRuleEditorProps {
  rule?: WorkflowRule;
  onSave?: () => void;
}

const triggerFields = [
  { value: 'payment_status', label: 'Payment Status' },
  { value: 'post_status', label: 'Post Status' },
  { value: 'approval_status', label: 'Approval Status' },
  { value: 'due_date', label: 'Due Date' },
  { value: 'completion_rate', label: 'Completion Rate' }
];

const triggerConditions = [
  { value: 'changes_to', label: 'Changes to' },
  { value: 'equals', label: 'Equals' },
  { value: 'greater_than', label: 'Greater than' },
  { value: 'less_than', label: 'Less than' },
  { value: 'date_threshold', label: 'Date threshold (days)' }
];

const actionFields = [
  { value: 'payment_status', label: 'Payment Status' },
  { value: 'post_status', label: 'Post Status' },
  { value: 'approval_status', label: 'Approval Status' },
  { value: 'escalated', label: 'Escalated' },
  { value: 'reminder_sent', label: 'Reminder Sent' },
  { value: 'campaign_status', label: 'Campaign Status' }
];

export const WorkflowRuleEditor: React.FC<WorkflowRuleEditorProps> = ({ rule, onSave }) => {
  const { createWorkflowRule, updateWorkflowRule } = useWorkflowAutomation();
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: rule?.name || '',
    description: rule?.description || '',
    trigger_field: rule?.trigger_field || '',
    trigger_value: rule?.trigger_value || '',
    trigger_condition: rule?.trigger_condition || 'changes_to',
    action_field: rule?.action_field || '',
    action_value: rule?.action_value || '',
    action_condition: rule?.action_condition || '',
    is_enabled: rule?.is_enabled ?? true
  });

  const handleSave = async () => {
    try {
      if (rule) {
        await updateWorkflowRule(rule.id, formData);
      } else {
        await createWorkflowRule(formData);
      }
      setIsOpen(false);
      onSave?.();
    } catch (error) {
      console.error('Error saving workflow rule:', error);
    }
  };

  const resetForm = () => {
    if (rule) {
      setFormData({
        name: rule.name,
        description: rule.description || '',
        trigger_field: rule.trigger_field,
        trigger_value: rule.trigger_value,
        trigger_condition: rule.trigger_condition,
        action_field: rule.action_field,
        action_value: rule.action_value,
        action_condition: rule.action_condition || '',
        is_enabled: rule.is_enabled
      });
    } else {
      setFormData({
        name: '',
        description: '',
        trigger_field: '',
        trigger_value: '',
        trigger_condition: 'changes_to',
        action_field: '',
        action_value: '',
        action_condition: '',
        is_enabled: true
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (open) resetForm();
    }}>
      <DialogTrigger asChild>
        {rule ? (
          <Button variant="ghost" size="sm">
            <Settings className="h-4 w-4" />
          </Button>
        ) : (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Rule
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{rule ? 'Edit Workflow Rule' : 'Create Workflow Rule'}</DialogTitle>
          <DialogDescription>
            Configure automated actions that trigger when specific conditions are met.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Rule Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter rule name"
              />
            </div>
            
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe what this rule does"
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="enabled"
                checked={formData.is_enabled}
                onCheckedChange={(checked) => setFormData({ ...formData, is_enabled: checked })}
              />
              <Label htmlFor="enabled">Enable this rule</Label>
            </div>
          </div>

          {/* Trigger Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Trigger Condition</CardTitle>
              <CardDescription>When should this rule activate?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="trigger-field">Field</Label>
                  <Select
                    value={formData.trigger_field}
                    onValueChange={(value) => setFormData({ ...formData, trigger_field: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select field" />
                    </SelectTrigger>
                    <SelectContent>
                      {triggerFields.map(field => (
                        <SelectItem key={field.value} value={field.value}>
                          {field.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="trigger-condition">Condition</Label>
                  <Select
                    value={formData.trigger_condition}
                    onValueChange={(value: any) => setFormData({ ...formData, trigger_condition: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select condition" />
                    </SelectTrigger>
                    <SelectContent>
                      {triggerConditions.map(condition => (
                        <SelectItem key={condition.value} value={condition.value}>
                          {condition.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="trigger-value">Value</Label>
                <Input
                  id="trigger-value"
                  value={formData.trigger_value}
                  onChange={(e) => setFormData({ ...formData, trigger_value: e.target.value })}
                  placeholder="Enter trigger value"
                />
              </div>
            </CardContent>
          </Card>

          {/* Action Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Action to Take</CardTitle>
              <CardDescription>What should happen when the trigger fires?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="action-field">Field to Update</Label>
                  <Select
                    value={formData.action_field}
                    onValueChange={(value) => setFormData({ ...formData, action_field: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select field" />
                    </SelectTrigger>
                    <SelectContent>
                      {actionFields.map(field => (
                        <SelectItem key={field.value} value={field.value}>
                          {field.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="action-value">New Value</Label>
                  <Input
                    id="action-value"
                    value={formData.action_value}
                    onChange={(e) => setFormData({ ...formData, action_value: e.target.value })}
                    placeholder="Enter new value"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="action-condition">Additional Condition (Optional)</Label>
                <Input
                  id="action-condition"
                  value={formData.action_condition}
                  onChange={(e) => setFormData({ ...formData, action_condition: e.target.value })}
                  placeholder="e.g., due_within_7_days"
                />
              </div>
            </CardContent>
          </Card>

          {/* Rule Preview */}
          {formData.trigger_field && formData.action_field && (
            <Card className="bg-muted/50">
              <CardHeader>
                <CardTitle className="text-lg">Rule Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2 text-sm">
                  <Badge variant="outline">WHEN</Badge>
                  <span>{triggerFields.find(f => f.value === formData.trigger_field)?.label}</span>
                  <span>{triggerConditions.find(c => c.value === formData.trigger_condition)?.label}</span>
                  <Badge variant="secondary">{formData.trigger_value}</Badge>
                  <ArrowRight className="h-4 w-4" />
                  <Badge variant="outline">THEN</Badge>
                  <span>Set {actionFields.find(f => f.value === formData.action_field)?.label}</span>
                  <span>to</span>
                  <Badge variant="default">{formData.action_value}</Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!formData.name || !formData.trigger_field || !formData.action_field}>
              {rule ? 'Update Rule' : 'Create Rule'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};