"use client"

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { useCreateSalesGoal, useCreateTeamGoal } from "../hooks/useSalesGoals";
import { useSalespeople } from "../hooks/useSalespeople";

interface GoalSettingModalProps {
  open: boolean;
  onClose: () => void;
  type: 'individual' | 'team';
}

export function GoalSettingModal({ open, onClose, type }: GoalSettingModalProps) {
  const [activeTab, setActiveTab] = useState(type);
  const { data: salespeople = [] } = useSalespeople();
  const createSalesGoal = useCreateSalesGoal();
  const createTeamGoal = useCreateTeamGoal();

  // Individual goal form state
  const [individualForm, setIndividualForm] = useState({
    salesperson_email: "",
    goal_period_start: "",
    goal_period_end: "",
    revenue_target: "",
    campaigns_target: "",
    commission_target: "",
  });

  // Team goal form state
  const [teamForm, setTeamForm] = useState({
    goal_name: "",
    goal_period_start: "",
    goal_period_end: "",
    target_value: "",
    goal_type: "",
  });

  const handleIndividualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createSalesGoal.mutate({
      salesperson_email: individualForm.salesperson_email,
      goal_period_start: individualForm.goal_period_start,
      goal_period_end: individualForm.goal_period_end,
      revenue_target: Number(individualForm.revenue_target),
      campaigns_target: Number(individualForm.campaigns_target),
      commission_target: Number(individualForm.commission_target),
      is_active: true,
    }, {
      onSuccess: () => {
        onClose();
        setIndividualForm({
          salesperson_email: "",
          goal_period_start: "",
          goal_period_end: "",
          revenue_target: "",
          campaigns_target: "",
          commission_target: "",
        });
      }
    });
  };

  const handleTeamSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createTeamGoal.mutate({
      goal_name: teamForm.goal_name,
      goal_period_start: teamForm.goal_period_start,
      goal_period_end: teamForm.goal_period_end,
      target_value: Number(teamForm.target_value),
      current_value: 0,
      goal_type: teamForm.goal_type,
      is_active: true,
    }, {
      onSuccess: () => {
        onClose();
        setTeamForm({
          goal_name: "",
          goal_period_start: "",
          goal_period_end: "",
          target_value: "",
          goal_type: "",
        });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Set Goals</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'individual' | 'team')} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="individual">Individual</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
          </TabsList>

          <TabsContent value="individual" className="space-y-4">
            <form onSubmit={handleIndividualSubmit} className="space-y-4">
              <div>
                <Label htmlFor="salesperson">Salesperson</Label>
                <Select 
                  value={individualForm.salesperson_email} 
                  onValueChange={(value) => setIndividualForm(prev => ({ ...prev, salesperson_email: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select salesperson" />
                  </SelectTrigger>
                  <SelectContent>
                    {salespeople.map((person) => (
                      <SelectItem key={person.id} value={person.email || person.name}>
                        {person.name} ({person.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start_date">Start Date</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={individualForm.goal_period_start}
                    onChange={(e) => setIndividualForm(prev => ({ ...prev, goal_period_start: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="end_date">End Date</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={individualForm.goal_period_end}
                    onChange={(e) => setIndividualForm(prev => ({ ...prev, goal_period_end: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="revenue_target">Revenue Target ($)</Label>
                <Input
                  id="revenue_target"
                  type="number"
                  step="0.01"
                  value={individualForm.revenue_target}
                  onChange={(e) => setIndividualForm(prev => ({ ...prev, revenue_target: e.target.value }))}
                  required
                />
              </div>

              <div>
                <Label htmlFor="campaigns_target">Campaigns Target</Label>
                <Input
                  id="campaigns_target"
                  type="number"
                  value={individualForm.campaigns_target}
                  onChange={(e) => setIndividualForm(prev => ({ ...prev, campaigns_target: e.target.value }))}
                  required
                />
              </div>

              <div>
                <Label htmlFor="commission_target">Commission Target ($)</Label>
                <Input
                  id="commission_target"
                  type="number"
                  step="0.01"
                  value={individualForm.commission_target}
                  onChange={(e) => setIndividualForm(prev => ({ ...prev, commission_target: e.target.value }))}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={createSalesGoal.isPending}>
                {createSalesGoal.isPending ? "Creating..." : "Create Individual Goal"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="team" className="space-y-4">
            <form onSubmit={handleTeamSubmit} className="space-y-4">
              <div>
                <Label htmlFor="goal_name">Goal Name</Label>
                <Input
                  id="goal_name"
                  value={teamForm.goal_name}
                  onChange={(e) => setTeamForm(prev => ({ ...prev, goal_name: e.target.value }))}
                  placeholder="e.g., Q1 Revenue Target"
                  required
                />
              </div>

              <div>
                <Label htmlFor="goal_type_select">Goal Type</Label>
                <Select 
                  value={teamForm.goal_type} 
                  onValueChange={(value) => setTeamForm(prev => ({ ...prev, goal_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select goal type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="revenue">Revenue</SelectItem>
                    <SelectItem value="campaigns">Campaigns</SelectItem>
                    <SelectItem value="clients">New Clients</SelectItem>
                    <SelectItem value="streams">Total Streams</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="team_start_date">Start Date</Label>
                  <Input
                    id="team_start_date"
                    type="date"
                    value={teamForm.goal_period_start}
                    onChange={(e) => setTeamForm(prev => ({ ...prev, goal_period_start: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="team_end_date">End Date</Label>
                  <Input
                    id="team_end_date"
                    type="date"
                    value={teamForm.goal_period_end}
                    onChange={(e) => setTeamForm(prev => ({ ...prev, goal_period_end: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="target_value">Target Value</Label>
                <Input
                  id="target_value"
                  type="number"
                  step="0.01"
                  value={teamForm.target_value}
                  onChange={(e) => setTeamForm(prev => ({ ...prev, target_value: e.target.value }))}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={createTeamGoal.isPending}>
                {createTeamGoal.isPending ? "Creating..." : "Create Team Goal"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}








