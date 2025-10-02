"use client"

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { supabase } from "../integrations/supabase/client";
import { useToast } from "../hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar } from "./ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";

interface AddPerformanceEntryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  playlistId: string;
  playlistName: string;
}

export default function AddPerformanceEntryModal({ 
  open, 
  onOpenChange, 
  playlistId, 
  playlistName 
}: AddPerformanceEntryModalProps) {
  const [formData, setFormData] = useState({
    daily_streams: "",
    date_recorded: new Date(),
  });
  const [dateOpen, setDateOpen] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const addEntryMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      console.log("Adding performance entry:", {
        playlist_id: playlistId,
        daily_streams: parseInt(data.daily_streams),
        date_recorded: format(data.date_recorded, 'yyyy-MM-dd'),
      });
      
      const { data: result, error } = await supabase.from("performance_entries").insert({
        playlist_id: playlistId,
        daily_streams: parseInt(data.daily_streams),
        date_recorded: format(data.date_recorded, 'yyyy-MM-dd'),
      }).select();
      
      console.log("Insert result:", result, "Error:", error);
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["performance-entries", playlistId] });
      queryClient.invalidateQueries({ queryKey: ["playlists"] });
      queryClient.invalidateQueries({ queryKey: ["all-playlists"] });
      toast({
        title: "Success",
        description: "Performance entry added successfully",
      });
      onOpenChange(false);
      setFormData({ daily_streams: "", date_recorded: new Date() });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add performance entry",
        variant: "destructive",
      });
      console.error("Error adding performance entry:", error);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.daily_streams) {
      toast({
        title: "Error",
        description: "Please enter daily streams",
        variant: "destructive",
      });
      return;
    }
    addEntryMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Performance Entry - {playlistName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="daily_streams">Daily Streams</Label>
            <Input
              id="daily_streams"
              type="number"
              value={formData.daily_streams}
              onChange={(e) => setFormData({ ...formData, daily_streams: e.target.value })}
              placeholder="e.g. 1500"
            />
          </div>
          
          <div className="space-y-2">
            <Label>Date Recorded</Label>
            <Popover open={dateOpen} onOpenChange={setDateOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(formData.date_recorded, "PPP")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.date_recorded}
                  onSelect={(date) => { if (date) { setFormData({ ...formData, date_recorded: date }); setDateOpen(false); } }}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={addEntryMutation.isPending}>
              {addEntryMutation.isPending ? "Adding..." : "Add Entry"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}








