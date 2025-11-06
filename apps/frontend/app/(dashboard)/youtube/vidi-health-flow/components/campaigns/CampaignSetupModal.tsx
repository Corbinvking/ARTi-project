import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Settings, User, Building, Calendar, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCampaigns } from "../../hooks/useCampaigns";
import { LIKE_SERVER_OPTIONS, COMMENT_SERVER_OPTIONS } from "../../lib/constants";
import type { Database } from "../../integrations/supabase/types";

type Campaign = Database['public']['Tables']['campaigns']['Row'] & {
  clients?: { id: string; name: string; email: string | null; company: string | null } | null;
  salespersons?: { id: string; name: string; email: string | null } | null;
};

interface CampaignSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaign: Campaign | null;
}

export const CampaignSetupModal = ({ isOpen, onClose, campaign }: CampaignSetupModalProps) => {
  const { toast } = useToast();
  const { clients, salespersons, updateCampaign } = useCampaigns();
  
  const [formData, setFormData] = useState({
    artist_tier: '',
    comments_sheet_url: '',
    like_server: '',
    comment_server: '',
    wait_time_seconds: '',
    desired_daily: '',
    client_id: '',
    salesperson_id: ''
  });

  const [loading, setLoading] = useState(false);

  // Parse intake data from custom_service_type field
  const intakeData = campaign?.custom_service_type ? 
    (() => {
      try {
        return JSON.parse(campaign.custom_service_type);
      } catch {
        return {};
      }
    })() : {};

  useEffect(() => {
    if (campaign) {
      setFormData({
        artist_tier: campaign.artist_tier?.toString() || '',
        comments_sheet_url: campaign.comments_sheet_url || '',
        like_server: campaign.like_server || '',
        comment_server: campaign.comment_server || '',
        wait_time_seconds: campaign.wait_time_seconds?.toString() || '',
        desired_daily: campaign.desired_daily?.toString() || '',
        client_id: campaign.client_id || '',
        salesperson_id: campaign.salesperson_id || ''
      });
    }
  }, [campaign]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const isSetupComplete = () => {
    return formData.artist_tier && 
           formData.comments_sheet_url && 
           formData.like_server && 
           formData.comment_server && 
           formData.desired_daily;
  };

  const handleSaveSetup = async () => {
    if (!campaign) return;
    
    setLoading(true);
    try {
      await updateCampaign(campaign.id, {
        artist_tier: formData.artist_tier ? parseInt(formData.artist_tier) : null,
        comments_sheet_url: formData.comments_sheet_url || null,
        like_server: formData.like_server || null,
        comment_server: formData.comment_server || null,
        wait_time_seconds: formData.wait_time_seconds ? parseInt(formData.wait_time_seconds) : 0,
        desired_daily: formData.desired_daily ? parseInt(formData.desired_daily) : 0,
        client_id: formData.client_id || null,
        salesperson_id: formData.salesperson_id || null,
        technical_setup_complete: Boolean(isSetupComplete())
      });

      toast({
        title: "Setup Saved",
        description: "Technical setup has been saved successfully.",
      });
      
      onClose();
    } catch (error) {
      console.error('Error saving setup:', error);
      toast({
        title: "Error",
        description: "Failed to save setup. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleActivateCampaign = async () => {
    if (!campaign || !isSetupComplete()) return;
    
    setLoading(true);
    try {
      await updateCampaign(campaign.id, {
        artist_tier: formData.artist_tier ? parseInt(formData.artist_tier) : null,
        comments_sheet_url: formData.comments_sheet_url || null,
        like_server: formData.like_server || null,
        comment_server: formData.comment_server || null,
        wait_time_seconds: formData.wait_time_seconds ? parseInt(formData.wait_time_seconds) : 0,
        desired_daily: formData.desired_daily ? parseInt(formData.desired_daily) : 0,
        client_id: formData.client_id || null,
        salesperson_id: formData.salesperson_id || null,
        technical_setup_complete: true,
        status: 'active'
      });

      toast({
        title: "Campaign Activated",
        description: "Campaign has been activated and will begin processing.",
      });
      
      onClose();
    } catch (error) {
      console.error('Error activating campaign:', error);
      toast({
        title: "Error",
        description: "Failed to activate campaign. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!campaign) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Campaign Setup - {campaign.campaign_name}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Intake Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-4 w-4" />
                Intake Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Campaign Name</Label>
                  <p className="text-sm">{campaign.campaign_name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Service Type</Label>
                  <p className="text-sm">{campaign.service_type}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Goal Views</Label>
                  <p className="text-sm">{campaign.goal_views?.toLocaleString()}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Budget</Label>
                  <p className="text-sm">${campaign.sale_price?.toLocaleString()}</p>
                </div>
              </div>
              
              {intakeData.salesperson_name && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Salesperson</Label>
                  <p className="text-sm">{intakeData.salesperson_name} ({intakeData.salesperson_email})</p>
                </div>
              )}
              
              {intakeData.client_name && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Client</Label>
                  <p className="text-sm">{intakeData.client_name} - {intakeData.client_company}</p>
                  {intakeData.client_email && <p className="text-xs text-muted-foreground">{intakeData.client_email}</p>}
                </div>
              )}
              
              {intakeData.notes && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Notes</Label>
                  <p className="text-sm">{intakeData.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Technical Setup */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Building className="h-4 w-4" />
                Technical Setup
                {!isSetupComplete() && (
                  <Badge variant="destructive" className="ml-2">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Incomplete
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="artist_tier">Artist Tier *</Label>
                  <Select value={formData.artist_tier} onValueChange={(value) => handleInputChange('artist_tier', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select tier" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Tier 1</SelectItem>
                      <SelectItem value="2">Tier 2</SelectItem>
                      <SelectItem value="3">Tier 3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="desired_daily">Desired Daily Views *</Label>
                  <Input
                    id="desired_daily"
                    type="number"
                    placeholder="e.g. 1000"
                    value={formData.desired_daily}
                    onChange={(e) => handleInputChange('desired_daily', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="comments_sheet_url">Comments Sheet URL *</Label>
                <Input
                  id="comments_sheet_url"
                  placeholder="https://docs.google.com/spreadsheets/..."
                  value={formData.comments_sheet_url}
                  onChange={(e) => handleInputChange('comments_sheet_url', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="like_server">Like Server *</Label>
                  <Select value={formData.like_server} onValueChange={(value) => handleInputChange('like_server', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select server" />
                    </SelectTrigger>
                    <SelectContent>
                      {LIKE_SERVER_OPTIONS.map((server) => (
                        <SelectItem key={server} value={server}>
                          {server}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="comment_server">Comment Server *</Label>
                  <Select value={formData.comment_server} onValueChange={(value) => handleInputChange('comment_server', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select server" />
                    </SelectTrigger>
                    <SelectContent>
                      {COMMENT_SERVER_OPTIONS.map((server) => (
                        <SelectItem key={server} value={server}>
                          {server}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="wait_time_seconds">Wait Time (seconds)</Label>
                <Input
                  id="wait_time_seconds"
                  type="number"
                  placeholder="e.g. 300"
                  value={formData.wait_time_seconds}
                  onChange={(e) => handleInputChange('wait_time_seconds', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="client_id">Assign Client</Label>
                  <Select value={formData.client_id} onValueChange={(value) => handleInputChange('client_id', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name} - {client.company}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="salesperson_id">Assign Salesperson</Label>
                  <Select value={formData.salesperson_id} onValueChange={(value) => handleInputChange('salesperson_id', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select salesperson" />
                    </SelectTrigger>
                    <SelectContent>
                      {salespersons.map((person) => (
                        <SelectItem key={person.id} value={person.id}>
                          {person.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleSaveSetup}
              disabled={loading}
            >
              {loading ? "Saving..." : "Save Setup"}
            </Button>
            <Button 
              onClick={handleActivateCampaign}
              disabled={!isSetupComplete() || loading}
            >
              {loading ? "Activating..." : "Complete Setup & Activate"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};