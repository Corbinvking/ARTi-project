"use client"

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { supabase } from "../integrations/supabase/client";
import { useToast } from "../hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface AddVendorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AddVendorModal({ open, onOpenChange }: AddVendorModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    max_daily_streams: "",
    cost_per_1k_streams: "",
    max_concurrent_campaigns: "5",
    is_active: true,
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const addVendorMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("vendors").insert({
        name: data.name,
        max_daily_streams: parseInt(data.max_daily_streams),
        cost_per_1k_streams: parseFloat(data.cost_per_1k_streams),
        max_concurrent_campaigns: parseInt(data.max_concurrent_campaigns),
        is_active: data.is_active,
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      toast({
        title: "Success",
        description: "Vendor added successfully",
      });
      onOpenChange(false);
      setFormData({ name: "", max_daily_streams: "", cost_per_1k_streams: "", max_concurrent_campaigns: "5", is_active: true });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add vendor",
        variant: "destructive",
      });
      console.error("Error adding vendor:", error);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.max_daily_streams || !formData.cost_per_1k_streams || !formData.max_concurrent_campaigns) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }
    addVendorMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Vendor</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Vendor Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter vendor name"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="max_streams">Max Daily Streams</Label>
            <Input
              id="max_streams"
              type="number"
              value={formData.max_daily_streams}
              onChange={(e) => setFormData({ ...formData, max_daily_streams: e.target.value })}
              placeholder="e.g. 10000"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="cost">Cost per 1k Streams ($)</Label>
            <Input
              id="cost"
              type="number"
              step="0.01"
              value={formData.cost_per_1k_streams}
              onChange={(e) => setFormData({ ...formData, cost_per_1k_streams: e.target.value })}
              placeholder="e.g. 2.50"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="max_campaigns">Max Concurrent Campaigns</Label>
            <Input
              id="max_campaigns"
              type="number"
              value={formData.max_concurrent_campaigns}
              onChange={(e) => setFormData({ ...formData, max_concurrent_campaigns: e.target.value })}
              placeholder="e.g. 5"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
            <Label htmlFor="is_active">Active Vendor</Label>
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={addVendorMutation.isPending}>
              {addVendorMutation.isPending ? "Adding..." : "Add Vendor"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}








