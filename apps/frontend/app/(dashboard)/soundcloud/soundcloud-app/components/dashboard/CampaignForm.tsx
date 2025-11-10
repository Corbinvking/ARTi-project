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
import { supabase } from "../../integrations/supabase/client";
import { useToast } from "../../hooks/use-toast";

interface Client {
  id: string;
  name: string;
  email: string;
}

interface Campaign {
  id?: string;
  track_name: string;
  artist_name: string;
  track_url: string;
  campaign_type: string;
  status: string;
  goals: number;
  remaining_metrics: number;
  sales_price: number;
  invoice_status: string;
  start_date: string;
  client_id: string;
  notes: string;
}

interface CampaignFormProps {
  campaign?: Campaign;
  onSuccess: () => void;
}

export function CampaignForm({ campaign, onSuccess }: CampaignFormProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    track_name: campaign?.track_name || "",
    artist_name: campaign?.artist_name || "",
    track_url: campaign?.track_url || "",
    campaign_type: campaign?.campaign_type || "Reposts",
    status: campaign?.status || "Pending",
    goals: campaign?.goals || 0,
    remaining_metrics: campaign?.remaining_metrics || 0,
    sales_price: campaign?.sales_price || 0,
    invoice_status: campaign?.invoice_status || "TBD",
    start_date: campaign?.start_date || "",
    client_id: campaign?.client_id || "",
    notes: campaign?.notes || "",
  });

  const [newClient, setNewClient] = useState({
    name: "",
    email: "",
  });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('soundcloud_clients')
        .select('id, name, email')
        .order('name');

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const createClient = async () => {
    if (!newClient.name || !newClient.email) {
      toast({
        title: "Error",
        description: "Please fill in all client fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('soundcloud_clients')
        .insert([newClient])
        .select()
        .single();

      if (error) throw error;

      setClients(prev => [...prev, data]);
      setFormData(prev => ({ ...prev, client_id: data.id }));
      setNewClient({ name: "", email: "" });
      setShowNewClientForm(false);

      toast({
        title: "Success",
        description: "Client created successfully",
      });
    } catch (error) {
      console.error('Error creating client:', error);
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
      if (campaign?.id) {
        // Update existing campaign
        const { error } = await supabase
          .from('soundcloud_campaigns')
          .update(formData)
          .eq('id', campaign.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Campaign updated successfully",
        });
      } else {
        // Create new campaign
        const { error } = await supabase
          .from('soundcloud_campaigns')
          .insert([formData]);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Campaign created successfully",
        });
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving campaign:', error);
      toast({
        title: "Error",
        description: "Failed to save campaign",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Client Selection */}
      <div className="space-y-2">
        <Label htmlFor="client_id">Client</Label>
        {!showNewClientForm ? (
          <div className="flex gap-2">
            <Select 
              value={formData.client_id} 
              onValueChange={(value) => handleInputChange('client_id', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name} ({client.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setShowNewClientForm(true)}
            >
              New Client
            </Button>
          </div>
        ) : (
          <div className="space-y-2 p-4 border rounded-lg">
            <Input
              placeholder="Client name"
              value={newClient.name}
              onChange={(e) => setNewClient(prev => ({ ...prev, name: e.target.value }))}
            />
            <Input
              placeholder="Client email"
              type="email"
              value={newClient.email}
              onChange={(e) => setNewClient(prev => ({ ...prev, email: e.target.value }))}
            />
            <div className="flex gap-2">
              <Button type="button" onClick={createClient} size="sm">
                Create Client
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={() => setShowNewClientForm(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Track Information */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="track_name">Track Name</Label>
          <Input
            id="track_name"
            value={formData.track_name}
            onChange={(e) => handleInputChange('track_name', e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="artist_name">Artist Name</Label>
          <Input
            id="artist_name"
            value={formData.artist_name}
            onChange={(e) => handleInputChange('artist_name', e.target.value)}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="track_url">Track URL</Label>
        <Input
          id="track_url"
          type="url"
          value={formData.track_url}
          onChange={(e) => handleInputChange('track_url', e.target.value)}
          required
        />
      </div>

      {/* Campaign Details */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="campaign_type">Campaign Type</Label>
          <Select 
            value={formData.campaign_type} 
            onValueChange={(value) => handleInputChange('campaign_type', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Reposts">Reposts</SelectItem>
              <SelectItem value="Hyppedit">Hyppedit</SelectItem>
              <SelectItem value="Followers">Followers</SelectItem>
              <SelectItem value="Plays">Plays</SelectItem>
              <SelectItem value="Likes">Likes</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select 
            value={formData.status} 
            onValueChange={(value) => handleInputChange('status', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Complete">Complete</SelectItem>
              <SelectItem value="Cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="goals">Goals</Label>
          <Input
            id="goals"
            type="number"
            value={formData.goals}
            onChange={(e) => handleInputChange('goals', parseInt(e.target.value) || 0)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="remaining_metrics">Remaining Metrics</Label>
          <Input
            id="remaining_metrics"
            type="number"
            value={formData.remaining_metrics}
            onChange={(e) => handleInputChange('remaining_metrics', parseInt(e.target.value) || 0)}
          />
        </div>
      </div>

      {/* Financial */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="sales_price">Sales Price ($)</Label>
          <Input
            id="sales_price"
            type="number"
            step="0.01"
            value={formData.sales_price}
            onChange={(e) => handleInputChange('sales_price', parseFloat(e.target.value) || 0)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="invoice_status">Invoice Status</Label>
          <Select 
            value={formData.invoice_status} 
            onValueChange={(value) => handleInputChange('invoice_status', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TBD">TBD</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Sent">Sent</SelectItem>
              <SelectItem value="Paid">Paid</SelectItem>
              <SelectItem value="N/A">N/A</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="start_date">Start Date</Label>
        <Input
          id="start_date"
          type="date"
          value={formData.start_date}
          onChange={(e) => handleInputChange('start_date', e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => handleInputChange('notes', e.target.value)}
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-4">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : campaign ? "Update Campaign" : "Create Campaign"}
        </Button>
      </div>
    </form>
  );
}