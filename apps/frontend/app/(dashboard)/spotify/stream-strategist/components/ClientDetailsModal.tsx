"use client"

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Plus, X, Trash2, Calendar, DollarSign, RefreshCw } from 'lucide-react';
import { useUpdateClient, useClientCredits, useAddClientCredit, useClient } from '../hooks/useClients';
import { useAllCampaigns, useAssignCampaignToClient, useUnassignCampaignFromClient } from '../hooks/useCampaigns';
import { clearBrowserCache } from '../utils/debugUtils';
import { APP_CAMPAIGN_SOURCE, APP_CAMPAIGN_TYPE } from '../lib/constants';
import { Client } from '../types';
import { format } from 'date-fns';

interface ClientDetailsModalProps {
  client: Client | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ClientDetailsModal({ client, isOpen, onClose }: ClientDetailsModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedClient, setEditedClient] = useState<Partial<Client>>({});
  const [newEmail, setNewEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [creditAmount, setCreditAmount] = useState('');
  const [creditReason, setCreditReason] = useState('');
  const [selectedCampaign, setSelectedCampaign] = useState('');
  const [confirmReassign, setConfirmReassign] = useState<{
    campaignId: string;
    campaignName: string;
    currentClientName: string;
  } | null>(null);

  const updateClient = useUpdateClient();
  const addCredit = useAddClientCredit();
  const assignCampaign = useAssignCampaignToClient();
  const unassignCampaign = useUnassignCampaignFromClient();

  const { data: clientCredits = [] } = useClientCredits(client?.id || '');
  const { data: clientData } = useClient(client?.id || '');
  const { data: allCampaigns = [], refetch: refetchAllCampaigns } = useAllCampaigns();

  // Extract campaigns from client data
  const clientCampaigns = clientData?.campaigns || [];
  const clientWithCampaigns = clientData;

  // Debug logging when modal opens
  useEffect(() => {
    if (isOpen && client) {
      console.log('🔧 ClientDetailsModal opened for:', client.name);
      console.log('🔧 Client ID:', client.id);
      console.log('🔧 Client data:', clientData);
      console.log('🔧 Client campaigns:', clientCampaigns);
      console.log('🔧 All campaigns:', allCampaigns);
      console.log('🔧 Filtering for:', { source: APP_CAMPAIGN_SOURCE, type: APP_CAMPAIGN_TYPE });
      refetchAllCampaigns(); // Force fresh fetch
    }
  }, [isOpen, client, clientData, clientCampaigns]);

  const handleEdit = () => {
    setIsEditing(true);
    setEditedClient({
      name: client?.name,
      emails: [...(client?.emails || [])],
      notes: client?.notes,
    });
    setEmailError('');
    console.log('🔧 Edit mode started, editedClient.emails:', [...(client?.emails || [])]);
  };

  const handleSave = async () => {
    if (!client || !editedClient.name) return;
    
    console.log('🔧 Saving client with data:', editedClient);
    console.log('🔧 Emails being saved:', editedClient.emails);
    
    try {
      await updateClient.mutateAsync({
        id: client.id,
        ...editedClient,
      });
      setIsEditing(false);
      setEmailError('');
    } catch (error) {
      console.error('Error updating client:', error);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedClient({});
  };

  const addEmail = () => {
    setEmailError('');
    
    if (!newEmail.trim()) {
      setEmailError('Email address is required');
      return;
    }
    
    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail.trim())) {
      setEmailError('Please enter a valid email address');
      return;
    }
    
    // Initialize emails array if it doesn't exist
    const currentEmails = editedClient.emails || [];
    
    // Check for duplicates
    if (currentEmails.includes(newEmail.trim())) {
      setEmailError('This email address is already added');
      return;
    }
    
    // Check maximum limit
    if (currentEmails.length >= 5) {
      setEmailError('Maximum of 5 email addresses allowed');
      return;
    }
    
    console.log('🔧 Adding email:', newEmail.trim());
    console.log('🔧 Current emails:', currentEmails);
    
    const updatedEmails = [...currentEmails, newEmail.trim()];
    setEditedClient({
      ...editedClient,
      emails: updatedEmails,
    });
    
    console.log('🔧 Updated emails:', updatedEmails);
    setNewEmail('');
  };

  const removeEmail = (index: number) => {
    const currentEmails = editedClient.emails || [];
    const updatedEmails = currentEmails.filter((_, i) => i !== index);
    
    console.log('🔧 Removing email at index:', index);
    console.log('🔧 Updated emails after removal:', updatedEmails);
    
    setEditedClient({
      ...editedClient,
      emails: updatedEmails,
    });
    setEmailError('');
  };

  const handleAddCredit = async () => {
    if (!client || !creditAmount) return;
    
    try {
      await addCredit.mutateAsync({
        client_id: client.id,
        amount: parseInt(creditAmount),
        reason: creditReason || null,
      });
      setCreditAmount('');
      setCreditReason('');
    } catch (error) {
      console.error('Error adding credit:', error);
    }
  };

  const handleAssignCampaign = async () => {
    if (!client || !selectedCampaign) return;
    
    const selectedCampaignData = allCampaigns.find(c => c.id === selectedCampaign);
    if (!selectedCampaignData) return;
    
    // Check if campaign is already assigned to another client
    if (selectedCampaignData.client_id && selectedCampaignData.client_id !== client.id) {
      setConfirmReassign({
        campaignId: selectedCampaign,
        campaignName: selectedCampaignData.campaign,
        currentClientName: selectedCampaignData.clients?.name || 'Unknown Client'
      });
      return;
    }
    
    // Campaign is unassigned or already assigned to this client, proceed directly
    try {
      await assignCampaign.mutateAsync({
        campaignId: selectedCampaign,
        clientId: client.id,
        previousClientId: selectedCampaignData.client_id || undefined,
      });
      setSelectedCampaign('');
    } catch (error) {
      console.error('Error assigning campaign:', error);
    }
  };
  
  const handleConfirmReassign = async () => {
    if (!client || !confirmReassign) return;
    
    try {
      await assignCampaign.mutateAsync({
        campaignId: confirmReassign.campaignId,
        clientId: client.id,
        previousClientId: allCampaigns.find(c => c.id === confirmReassign.campaignId)?.client_id || undefined,
      });
      setSelectedCampaign('');
      setConfirmReassign(null);
    } catch (error) {
      console.error('Error reassigning campaign:', error);
      setConfirmReassign(null);
    }
  };

  const handleUnassignCampaign = async (campaignId: string) => {
    if (!client) return;
    
    try {
      await unassignCampaign.mutateAsync({
        campaignId,
        clientId: client.id,
      });
    } catch (error) {
      console.error('Error unassigning campaign:', error);
    }
  };

  if (!client) return null;

  const displayClient = isEditing ? { ...client, ...editedClient } : client;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] w-[1400px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{displayClient.name}</span>
            <div className="flex gap-2">
              {!isEditing ? (
                <Button onClick={handleEdit} variant="outline" size="sm">
                  Edit
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button 
                    onClick={handleSave} 
                    size="sm"
                    disabled={updateClient.isPending}
                  >
                    Save
                  </Button>
                  <Button 
                    onClick={handleCancel} 
                    variant="outline" 
                    size="sm"
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Client Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Client Information</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="client-name">Client Name</Label>
                {isEditing ? (
                  <Input
                    id="client-name"
                    value={editedClient.name || ''}
                    onChange={(e) => setEditedClient({ ...editedClient, name: e.target.value })}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">{displayClient.name}</p>
                )}
              </div>
              
              <div>
                <Label>Credit Balance</Label>
                <p className="text-sm font-semibold text-green-600">
                  {displayClient.credit_balance || 0} credits
                </p>
              </div>
            </div>

            <div>
              <Label>Email Addresses</Label>
              <div className="space-y-2">
                {displayClient.emails?.map((email, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Badge variant="secondary">{email}</Badge>
                    {isEditing && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeEmail(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                {isEditing && ((editedClient.emails?.length || 0) < 5) && (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add email address"
                        value={newEmail}
                        onChange={(e) => {
                          setNewEmail(e.target.value);
                          if (emailError) setEmailError('');
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addEmail();
                          }
                        }}
                        type="email"
                        className={emailError ? 'border-red-500' : ''}
                      />
                      <Button type="button" onClick={addEmail} size="sm">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {emailError && (
                      <p className="text-sm text-red-500">{emailError}</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="client-notes">Notes</Label>
              {isEditing ? (
                <Textarea
                  id="client-notes"
                  value={editedClient.notes || ''}
                  onChange={(e) => setEditedClient({ ...editedClient, notes: e.target.value })}
                  placeholder="Add notes about this client..."
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  {displayClient.notes || 'No notes available'}
                </p>
              )}
            </div>
          </div>

          <Separator />

          {/* Credit Management */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Credit Management</h3>
            
            <div className="flex gap-2">
              <Input
                placeholder="Credit amount"
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
                type="number"
                className="w-32"
              />
              <Input
                placeholder="Reason (optional)"
                value={creditReason}
                onChange={(e) => setCreditReason(e.target.value)}
                className="flex-1"
              />
              <Button 
                onClick={handleAddCredit}
                disabled={!creditAmount || addCredit.isPending}
                size="sm"
              >
                <DollarSign className="h-4 w-4 mr-2" />
                Add Credit
              </Button>
            </div>

            {clientCredits.length > 0 && (
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientCredits.slice(0, 5).map((credit) => (
                      <TableRow key={credit.id}>
                        <TableCell>
                          {format(new Date(credit.created_at), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell className={credit.amount > 0 ? 'text-green-600' : 'text-red-600'}>
                          {credit.amount > 0 ? '+' : ''}{credit.amount}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {credit.reason || 'No reason specified'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <Separator />

          {/* Campaign Management */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Campaigns ({clientCampaigns.length})</h3>
              
              <div className="flex gap-2">
                {allCampaigns.length > 0 ? (
                  <>
                    <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
                      <SelectTrigger className="w-64">
                        <SelectValue placeholder="Select campaign to assign" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border z-50">
                        {allCampaigns
                          .filter(campaign => 
                            campaign.source === APP_CAMPAIGN_SOURCE && 
                            campaign.campaign_type === APP_CAMPAIGN_TYPE
                          )
                          .map((campaign) => {
                            const isUnassigned = !campaign.client_id;
                            const isAssignedToCurrentClient = campaign.client_id === client?.id;
                            const isAssignedToOtherClient = campaign.client_id && campaign.client_id !== client?.id;
                            
                            return (
                              <SelectItem 
                                key={campaign.id} 
                                value={campaign.id}
                                disabled={isAssignedToCurrentClient}
                                className={
                                  isUnassigned 
                                    ? "text-green-600" 
                                    : isAssignedToOtherClient 
                                    ? "text-primary" 
                                    : "text-muted-foreground"
                                }
                              >
                                <div className="flex items-center gap-2">
                                  <span>
                                    {isUnassigned && "✅"}
                                    {isAssignedToOtherClient && "🔄"}
                                    {isAssignedToCurrentClient && "✓"}
                                  </span>
                                  <span>{campaign.campaign}</span>
                                  {isAssignedToOtherClient && (
                                    <span className="text-xs text-muted-foreground">
                                      (assigned to {campaign.clients?.name || 'Unknown'})
                                    </span>
                                  )}
                                  {isAssignedToCurrentClient && (
                                    <span className="text-xs text-muted-foreground">(already assigned)</span>
                                  )}
                                </div>
                              </SelectItem>
                            );
                          })}
                      </SelectContent>
                    </Select>
                    <Button 
                      onClick={handleAssignCampaign}
                      disabled={!selectedCampaign || assignCampaign.isPending}
                      size="sm"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {allCampaigns.find(c => c.id === selectedCampaign)?.client_id && 
                       allCampaigns.find(c => c.id === selectedCampaign)?.client_id !== client?.id
                        ? 'Reassign' 
                        : 'Assign'}
                    </Button>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No campaigns available</p>
                )}
                
                {/* Debug button - remove after fixing */}
                <Button 
                  onClick={() => {
                    clearBrowserCache();
                    refetchAllCampaigns();
                    window.location.reload();
                  }}
                  variant="outline"
                  size="sm"
                  title="Clear cache and refresh if seeing wrong campaigns"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {clientCampaigns.length > 0 ? (
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Campaign</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>Budget</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientCampaigns.map((campaign) => (
                      <TableRow key={campaign.id}>
                        <TableCell className="font-medium">
                          <div>
                            <div>{campaign.name}</div>
                            {campaign.song_count > 1 && (
                              <div className="text-xs text-muted-foreground">
                                {campaign.song_count} songs
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={campaign.status?.toLowerCase() === 'active' ? 'default' : 'secondary'}>
                            {campaign.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {campaign.start_date ? format(new Date(campaign.start_date), 'MMM dd, yyyy') : 'N/A'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">${campaign.total_budget?.toFixed(2) || '0.00'}</div>
                            <div className="text-xs text-muted-foreground">
                              Goal: {campaign.total_goal?.toLocaleString() || '0'}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Unassign Campaign</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to unassign "{campaign.name}" from this client?
                                  The campaign will remain in the system but won't be associated with any client.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleUnassignCampaign(campaign.id)}>
                                  Unassign
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-muted-foreground">No campaigns assigned to this client.</p>
            )}
          </div>
        </div>
      </DialogContent>
      
      {/* Reassignment Confirmation Dialog */}
      <AlertDialog open={!!confirmReassign} onOpenChange={() => setConfirmReassign(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reassign Campaign</AlertDialogTitle>
            <AlertDialogDescription>
              Campaign "{confirmReassign?.campaignName}" is currently assigned to "{confirmReassign?.currentClientName}".
              <br />
              <br />
              Are you sure you want to reassign it to "{client?.name}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmReassign(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmReassign}>
              Reassign Campaign
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}








