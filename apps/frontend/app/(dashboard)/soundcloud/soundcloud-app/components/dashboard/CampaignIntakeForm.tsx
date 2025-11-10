"use client"

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Plus, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { cn } from "../../lib/utils";
import { supabase } from "../../integrations/supabase/client";
import { useToast } from "../../hooks/use-toast";

interface Client {
  id: string;
  name: string;
  email: string;
  company?: string;
}

interface CampaignIntakeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CampaignIntakeForm({ open, onOpenChange, onSuccess }: CampaignIntakeFormProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    track_info: "",
    client_id: "",
    goal_reposts: "",
    sales_price: "",
    salesperson_id: "",
    invoice_status: "pending",
    track_url: "",
    submission_date: new Date(),
    date_requested: undefined as Date | undefined,
  });

  const [newClient, setNewClient] = useState({
    name: "",
    email: "",
    company: "",
  });

  // Fetch clients on mount
  useEffect(() => {
    if (open) {
      fetchClients();
    }
  }, [open]);

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('name');

      if (error) throw error;
      setClients(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch clients",
        variant: "destructive",
      });
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const createClient = async () => {
    if (!newClient.name || !newClient.email) {
      toast({
        title: "Error",
        description: "Name and email are required",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('clients')
        .insert([newClient])
        .select()
        .single();

      if (error) throw error;

      setClients(prev => [...prev, data]);
      setFormData(prev => ({ ...prev, client_id: data.id }));
      setNewClient({ name: "", email: "", company: "" });
      setShowNewClientForm(false);
      
      toast({
        title: "Success",
        description: "Client created successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to create client",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Parse track info (Artist - Song Title format)
      const [artist_name, track_name] = formData.track_info.split(' - ').map(s => s.trim());
      
      if (!artist_name || !track_name) {
        throw new Error("Track info must be in format: Artist - Song Title");
      }

      const campaignData = {
        artist_name,
        track_name,
        track_url: formData.track_url,
        client_id: formData.client_id,
        goal_reposts: parseInt(formData.goal_reposts) * 1000000, // Convert millions to actual number
        price_usd: parseFloat(formData.sales_price),
        salesperson_id: formData.salesperson_id === "none" ? null : formData.salesperson_id || null,
        invoice_status: formData.invoice_status,
        submission_date: formData.submission_date.toISOString().split('T')[0],
        date_requested: formData.date_requested?.toISOString().split('T')[0] || null,
        status: 'intake' as const,
      };

      const { error } = await supabase
        .from('campaigns')
        .insert([campaignData]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Campaign intake submitted successfully",
      });

      // Reset form
      setFormData({
        track_info: "",
        client_id: "",
        goal_reposts: "",
        sales_price: "",
        salesperson_id: "",
        invoice_status: "pending",
        track_url: "",
        submission_date: new Date(),
        date_requested: undefined,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit campaign intake",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-500" />
            Campaign Intake Form
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Track Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Track Information</h3>
            
            <div>
              <Label htmlFor="track_info">Track Info (Format: Primary Artist - Song Title)</Label>
              <Input
                id="track_info"
                value={formData.track_info}
                onChange={(e) => handleInputChange("track_info", e.target.value)}
                placeholder="e.g., Calvin Harris - Summer"
                required
              />
            </div>

            <div>
              <Label htmlFor="track_url">Streaming URL</Label>
              <Input
                id="track_url"
                type="url"
                value={formData.track_url}
                onChange={(e) => handleInputChange("track_url", e.target.value)}
                placeholder="https://soundcloud.com/artist/track"
                required
              />
            </div>
          </div>

          {/* Client Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Client Information</h3>
            
            <div className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="client">Client</Label>
                <Select value={formData.client_id} onValueChange={(value) => handleInputChange("client_id", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name} ({client.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="mt-6"
                onClick={() => setShowNewClientForm(!showNewClientForm)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* New Client Form */}
            {showNewClientForm && (
              <div className="p-4 border rounded-lg space-y-3 bg-muted/20">
                <h4 className="font-medium">Add New Client</h4>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    placeholder="Client Name"
                    value={newClient.name}
                    onChange={(e) => setNewClient(prev => ({ ...prev, name: e.target.value }))}
                  />
                  <Input
                    placeholder="Email"
                    type="email"
                    value={newClient.email}
                    onChange={(e) => setNewClient(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                <Input
                  placeholder="Company (optional)"
                  value={newClient.company}
                  onChange={(e) => setNewClient(prev => ({ ...prev, company: e.target.value }))}
                />
                <div className="flex gap-2">
                  <Button type="button" size="sm" onClick={createClient}>Create Client</Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => setShowNewClientForm(false)}>Cancel</Button>
                </div>
              </div>
            )}
          </div>

          {/* Campaign Details */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Campaign Details</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="goal_reposts">Goal (Millions of Reach)</Label>
                <div className="relative">
                  <Input
                    id="goal_reposts"
                    type="number"
                    value={formData.goal_reposts}
                    onChange={(e) => handleInputChange("goal_reposts", e.target.value)}
                    placeholder="20"
                    required
                    className="pr-8"
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-sm">M</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Enter number in millions (e.g., 20 = 20M reach)</p>
              </div>

              <div>
                <Label htmlFor="sales_price">Sale Price ($)</Label>
                <Input
                  id="sales_price"
                  type="number"
                  step="0.01"
                  value={formData.sales_price}
                  onChange={(e) => handleInputChange("sales_price", e.target.value)}
                  placeholder="500.00"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="salesperson">Salesperson (Optional)</Label>
                <Select value={formData.salesperson_id} onValueChange={(value) => handleInputChange("salesperson_id", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select salesperson" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No salesperson assigned</SelectItem>
                    <SelectItem value="f112706b-7004-4bba-ad9c-36b0644815c3">jared@artistinfluence.com</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="invoice_status">Invoice Status</Label>
                <Select value={formData.invoice_status} onValueChange={(value) => handleInputChange("invoice_status", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Dates</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Submit Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.submission_date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.submission_date ? format(formData.submission_date, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.submission_date}
                      onSelect={(date) => date && handleInputChange("submission_date", date)}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label>Date Requested (for support)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.date_requested && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.date_requested ? format(formData.date_requested, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.date_requested}
                      onSelect={(date) => handleInputChange("date_requested", date)}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Submitting..." : "Submit Campaign Intake"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}