import React, { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit, Trash2, Search, CheckCircle, Activity, TrendingUp } from 'lucide-react';
import { useCampaigns } from "../../hooks/useCampaigns";
import { useToast } from "@/hooks/use-toast";
import { ClientDetailModal } from "./ClientDetailModal";
import { CampaignSettingsModal } from "../campaigns/CampaignSettingsModal";
import type { Database } from "../../integrations/supabase/types";

type Campaign = Database['public']['Tables']['youtube_campaigns']['Row'];

interface ClientForm {
  name: string;
  company: string;
  email: string;
  email2: string;
  email3: string;
}

export function ClientsManagement() {
  const { clients, campaigns, createClient, updateClient, deleteClient, requestYouTubeAccess } = useCampaigns();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [youtubeAccessLoading, setYoutubeAccessLoading] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [clientDetailModalOpen, setClientDetailModalOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [campaignModalOpen, setCampaignModalOpen] = useState(false);
  const [campaignModalMode, setCampaignModalMode] = useState<'basic' | 'advanced'>('basic');
  const [formData, setFormData] = useState<ClientForm>({
    name: '',
    company: '',
    email: '',
    email2: '',
    email3: ''
  });

  // Group campaigns by client and calculate stats
  const clientStats = useMemo(() => {
    const statsMap = new Map<string, { 
      campaigns: Campaign[], 
      total: number, 
      active: number,
      health: number 
    }>();
    
    campaigns.forEach(campaign => {
      if (campaign.client_id) {
        if (!statsMap.has(campaign.client_id)) {
          statsMap.set(campaign.client_id, { 
            campaigns: [], 
            total: 0, 
            active: 0,
            health: 0 
          });
        }
        statsMap.get(campaign.client_id)!.campaigns.push(campaign);
      }
    });
    
    // Calculate stats for each client
    statsMap.forEach((stats, clientId) => {
      stats.total = stats.campaigns.length;
      stats.active = stats.campaigns.filter(c => c.status === 'active').length;
      
      // Calculate average health
      const healthScores = stats.campaigns.map(c => {
        const goal = c.goal_views || 0;
        const current = c.current_views || 0;
        return goal > 0 ? Math.min((current / goal) * 100, 100) : 0;
      });
      stats.health = healthScores.length > 0 
        ? healthScores.reduce((sum, score) => sum + score, 0) / healthScores.length 
        : 0;
    });
    
    return statsMap;
  }, [campaigns]);

  const resetForm = () => {
    setFormData({
      name: '',
      company: '',
      email: '',
      email2: '',
      email3: ''
    });
    setEditingClient(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.email.trim()) {
      toast({
        title: "Validation Error",
        description: "Name and primary email are required.",
        variant: "destructive",
      });
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const emails = [formData.email, formData.email2, formData.email3].filter(Boolean);
    for (const email of emails) {
      if (!emailRegex.test(email)) {
        toast({
          title: "Invalid Email",
          description: `Please enter a valid email address: ${email}`,
          variant: "destructive",
        });
        return;
      }
    }

    try {
      if (editingClient) {
        await updateClient(editingClient.id, formData);
        toast({
          title: "Success",
          description: "Client updated successfully.",
        });
      } else {
        await createClient(formData);
        toast({
          title: "Success",
          description: "Client created successfully.",
        });
      }
      
      resetForm();
      setIsCreateOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save client. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (client: any) => {
    setEditingClient(client);
    setFormData({
      name: client.name || '',
      company: client.company || '',
      email: client.email || '',
      email2: client.email2 || '',
      email3: client.email3 || ''
    });
    setIsCreateOpen(true);
  };

  const handleDelete = async (clientId: string, clientName: string) => {
    try {
      await deleteClient(clientId);
      toast({
        title: "Success",
        description: `Client "${clientName}" deleted successfully.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete client. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleYouTubeAccessRequest = async (clientId: string, clientName: string) => {
    setYoutubeAccessLoading(clientId);
    try {
      await requestYouTubeAccess(clientId);
      toast({
        title: "YouTube Access Requested",
        description: `YouTube access instructions sent to ${clientName}.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send YouTube access request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setYoutubeAccessLoading(null);
    }
  };

  const handleClientClick = (client: any) => {
    setSelectedClient(client);
    setClientDetailModalOpen(true);
  };

  const handleCampaignClick = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setCampaignModalMode('basic');
    setCampaignModalOpen(true);
  };

  const getHealthColor = (health: number) => {
    if (health >= 80) return 'bg-green-100 text-green-700 border-green-300';
    if (health >= 50) return 'bg-yellow-100 text-yellow-700 border-yellow-300';
    return 'bg-red-100 text-red-700 border-red-300';
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Clients Management</h2>
          <p className="text-muted-foreground">
            Manage your client database. Click a client to view campaigns and details.
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Client
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingClient ? 'Edit Client' : 'Add New Client'}
              </DialogTitle>
              <DialogDescription>
                {editingClient ? 'Update client information.' : 'Add a new client to your database.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Client full name"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  value={formData.company}
                  onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                  placeholder="Company name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Primary Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="primary@example.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email2">Secondary Email</Label>
                <Input
                  id="email2"
                  type="email"
                  value={formData.email2}
                  onChange={(e) => setFormData(prev => ({ ...prev, email2: e.target.value }))}
                  placeholder="secondary@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email3">Third Email</Label>
                <Input
                  id="email3"
                  type="email"
                  value={formData.email3}
                  onChange={(e) => setFormData(prev => ({ ...prev, email3: e.target.value }))}
                  placeholder="third@example.com"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingClient ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Clients Table */}
      <Card>
        <CardHeader>
          <CardTitle>Clients ({filteredClients.length})</CardTitle>
          <CardDescription>
            Click on a client to view all campaigns and detailed information
          </CardDescription>
          <div className="flex items-center space-x-2 pt-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search clients by name, company, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Campaigns</TableHead>
                <TableHead>Health</TableHead>
                <TableHead>YouTube Access</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.map((client) => {
                const stats = clientStats.get(client.id) || { total: 0, active: 0, health: 0, campaigns: [] };
                
                return (
                  <TableRow 
                    key={client.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleClientClick(client)}
                  >
                    <TableCell className="font-medium">{client.name}</TableCell>
                    <TableCell>
                      {client.company ? (
                        <Badge variant="outline">{client.company}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{client.email}</div>
                      {client.email2 && (
                        <div className="text-xs text-muted-foreground">{client.email2}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Activity className="h-3 w-3" />
                          {stats.total} total
                        </Badge>
                        {stats.active > 0 && (
                          <Badge variant="default" className="flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" />
                            {stats.active} active
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {stats.total > 0 ? (
                        <Badge 
                          variant="outline" 
                          className={`${getHealthColor(stats.health)} font-medium`}
                        >
                          {stats.health.toFixed(0)}%
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <Switch
                          disabled={
                            youtubeAccessLoading === client.id ||
                            !client.email ||
                            client.youtube_access_requested === true
                          }
                          checked={client.youtube_access_requested === true}
                          onCheckedChange={(checked) => {
                            // This switch is a one-way action: OFF -> request access (ON).
                            // After requested, it becomes locked to avoid accidental toggling.
                            if (checked && !client.youtube_access_requested) {
                              handleYouTubeAccessRequest(client.id, client.name);
                            }
                          }}
                        />
                        {client.youtube_access_requested ? (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span>Requested</span>
                          </div>
                        ) : !client.email ? (
                          <span className="text-xs text-muted-foreground">Add email to enable</span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(client)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Client</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{client.name}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(client.id, client.name)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          
          {filteredClients.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? 'No clients found matching your search.' : 'No clients added yet. Click "Add Client" to get started.'}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Client Detail Modal */}
      <ClientDetailModal
        client={selectedClient}
        campaigns={selectedClient ? (clientStats.get(selectedClient.id)?.campaigns || []) : []}
        isOpen={clientDetailModalOpen}
        onClose={() => {
          setClientDetailModalOpen(false);
          setSelectedClient(null);
        }}
        onCampaignClick={handleCampaignClick}
      />

      {/* Campaign Settings Modal */}
      {selectedCampaign && (
        <CampaignSettingsModal
          campaign={selectedCampaign}
          mode={campaignModalMode}
          isOpen={campaignModalOpen}
          onClose={() => {
            setCampaignModalOpen(false);
            setSelectedCampaign(null);
          }}
        />
      )}
    </div>
  );
}