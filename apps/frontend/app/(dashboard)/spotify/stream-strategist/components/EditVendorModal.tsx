"use client"

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { supabase } from "../integrations/supabase/client";
import { useToast } from "../hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface EditVendorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendor: {
    id: string;
    name: string;
    max_daily_streams: number;
    cost_per_1k_streams: number;
    max_concurrent_campaigns: number;
    is_active: boolean;
  } | null;
}

export default function EditVendorModal({ open, onOpenChange, vendor }: EditVendorModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    max_daily_streams: "",
    cost_per_1k_streams: "",
    max_concurrent_campaigns: "",
    is_active: true,
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Update form data when vendor changes
  useEffect(() => {
    if (vendor) {
      setFormData({
        name: vendor.name,
        max_daily_streams: vendor.max_daily_streams.toString(),
        cost_per_1k_streams: vendor.cost_per_1k_streams.toString(),
        max_concurrent_campaigns: vendor.max_concurrent_campaigns.toString(),
        is_active: vendor.is_active,
      });
    }
  }, [vendor]);

  const editVendorMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!vendor) throw new Error("No vendor selected");
      
      const { error } = await supabase
        .from("vendors")
        .update({
          name: data.name,
          max_daily_streams: parseInt(data.max_daily_streams),
          cost_per_1k_streams: parseFloat(data.cost_per_1k_streams),
          max_concurrent_campaigns: parseInt(data.max_concurrent_campaigns),
          is_active: data.is_active,
        })
        .eq("id", vendor.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      queryClient.invalidateQueries({ queryKey: ["all-playlists"] });
      queryClient.invalidateQueries({ queryKey: ["vendor-playlists"] });
      toast({
        title: "Success",
        description: "Vendor updated successfully - costs synced to all playlists",
      });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update vendor",
        variant: "destructive",
      });
      console.error("Error updating vendor:", error);
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
    editVendorMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Vendor</DialogTitle>
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
            <Button type="submit" disabled={editVendorMutation.isPending}>
              {editVendorMutation.isPending ? "Updating..." : "Update Vendor"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}








