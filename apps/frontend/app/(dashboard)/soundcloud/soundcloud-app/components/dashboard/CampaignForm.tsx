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
  name: string;
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
    internal_notes: (campaign as any)?.internal_notes || "",
    client_notes: (campaign as any)?.client_notes || "",
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
      // Get unique client names from existing campaigns (no soundcloud_clients table)
      const { data, error } = await supabase
        .from('soundcloud_campaigns')
        .select('client')
        .order('client');

      if (error) throw error;
      
      // Deduplicate
      const uniqueNames = [...new Set((data || []).map((r: any) => r.client).filter(Boolean))];
      setClients(uniqueNames.map(name => ({ name })));
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Build track_info from artist + track name
      const trackInfo = formData.artist_name && formData.track_name
        ? `${formData.artist_name} - ${formData.track_name}`
        : formData.track_name || formData.artist_name || '';

      if (campaign?.id) {
        // Update existing campaign (actual DB schema: flat text columns)
        const updateData: Record<string, any> = {
          track_info: trackInfo,
          url: formData.track_url,
          service_type: formData.campaign_type,
          status: formData.status,
          goal: String(formData.goals || 0),
          remaining: String(formData.remaining_metrics || 0),
          sale_price: formData.sales_price ? `$${formData.sales_price}` : '',
          invoice: formData.invoice_status,
          start_date: formData.start_date || '',
          notes: formData.notes || '',
          internal_notes: formData.internal_notes || '',
          client_notes: formData.client_notes || '',
          updated_at: new Date().toISOString(),
        };

        const { error } = await supabase
          .from('soundcloud_campaigns')
          .update(updateData)
          .eq('id', campaign.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Campaign updated successfully",
        });
      } else {
        // Create new campaign (actual DB schema: flat text columns)
        const insertData: Record<string, any> = {
          track_info: trackInfo,
          client: formData.client_id || '', // client_id here is actually the client name from the dropdown
          url: formData.track_url,
          service_type: formData.campaign_type,
          status: formData.status || 'Active',
          goal: String(formData.goals || 0),
          remaining: String(formData.remaining_metrics || 0),
          sale_price: formData.sales_price ? `$${formData.sales_price}` : '',
          invoice: formData.invoice_status,
          start_date: formData.start_date || '',
          submit_date: new Date().toLocaleDateString('en-US'),
          notes: formData.notes || '',
          internal_notes: formData.internal_notes || '',
          client_notes: formData.client_notes || '',
        };

        const { error } = await supabase
          .from('soundcloud_campaigns')
          .insert([insertData]);

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
                  <SelectItem key={client.name} value={client.name}>
                    {client.name}
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
            <div className="flex gap-2">
              <Button 
                type="button" 
                onClick={() => {
                  if (newClient.name) {
                    setClients(prev => [...prev, { name: newClient.name }]);
                    handleInputChange('client_id', newClient.name);
                    setNewClient({ name: "", email: "" });
                    setShowNewClientForm(false);
                  }
                }} 
                size="sm"
              >
                Add Client
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
        <Label htmlFor="internal_notes">Internal Notes (Ops Only)</Label>
        <Textarea
          id="internal_notes"
          value={formData.internal_notes}
          onChange={(e) => handleInputChange('internal_notes', e.target.value)}
          placeholder="Internal ops notes -- not visible to clients"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="client_notes">Client Notes (Visible to Clients)</Label>
        <Textarea
          id="client_notes"
          value={formData.client_notes}
          onChange={(e) => handleInputChange('client_notes', e.target.value)}
          placeholder="Notes visible to the client"
          rows={2}
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