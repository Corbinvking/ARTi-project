import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusIndicator } from "./StatusIndicator";
import { CampaignCreator } from "../hooks/useCampaignCreators";
import { Campaign } from "../lib/types";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Edit, MessageSquare } from "lucide-react";

interface CreatorManagementTableProps {
  campaign: Campaign;
  creators: CampaignCreator[];
  loading: boolean;
  onStatusUpdate: (creatorId: string, updates: Partial<CampaignCreator>) => void;
  onBulkUpdate: (creatorIds: string[], updates: Partial<CampaignCreator>) => void;
}

export const CreatorManagementTable = ({ 
  campaign,
  creators, 
  loading,
  onStatusUpdate, 
  onBulkUpdate 
}: CreatorManagementTableProps) => {
  const [selectedCreators, setSelectedCreators] = useState<Set<string>>(new Set());
  const [bulkUpdateType, setBulkUpdateType] = useState<'payment' | 'post' | 'approval'>('payment');
  const [bulkStatus, setBulkStatus] = useState('');
  const [editingCreator, setEditingCreator] = useState<CampaignCreator | null>(null);
  const [notes, setNotes] = useState('');

  const handleSelectCreator = (creatorId: string, checked: boolean) => {
    const newSelected = new Set(selectedCreators);
    if (checked) {
      newSelected.add(creatorId);
    } else {
      newSelected.delete(creatorId);
    }
    setSelectedCreators(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedCreators(new Set(creators.map(c => c.id)));
    } else {
      setSelectedCreators(new Set());
    }
  };

  const handleBulkUpdate = () => {
    if (selectedCreators.size === 0 || !bulkStatus) return;
    
    const updates: Partial<CampaignCreator> = {};
    if (bulkUpdateType === 'payment') {
      updates.payment_status = bulkStatus as any;
    } else if (bulkUpdateType === 'post') {
      updates.post_status = bulkStatus as any;
    } else if (bulkUpdateType === 'approval') {
      updates.approval_status = bulkStatus as any;
    }
    
    onBulkUpdate(Array.from(selectedCreators), updates);
    setSelectedCreators(new Set());
  };

  const handleNotesUpdate = (creator: CampaignCreator) => {
    const updates: Partial<CampaignCreator> = {};
    if (creator.payment_status !== 'paid') {
      updates.payment_notes = notes;
    }
    if (creator.approval_status === 'revision_requested' || creator.approval_status === 'rejected') {
      updates.approval_notes = notes;
    }
    
    onStatusUpdate(creator.id, updates);
    setEditingCreator(null);
    setNotes('');
  };

  const getStatusOptions = (type: 'payment' | 'post' | 'approval') => {
    switch (type) {
      case 'payment':
        return [
          { value: 'unpaid', label: 'Unpaid' },
          { value: 'pending', label: 'Pending' },
          { value: 'paid', label: 'Paid' }
        ];
      case 'post':
        return [
          { value: 'not_posted', label: 'Not Posted' },
          { value: 'scheduled', label: 'Scheduled' },
          { value: 'posted', label: 'Posted' }
        ];
      case 'approval':
        return [
          { value: 'pending', label: 'Pending' },
          { value: 'approved', label: 'Approved' },
          { value: 'revision_requested', label: 'Revision Requested' },
          { value: 'rejected', label: 'Rejected' }
        ];
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Loading creators...
      </div>
    );
  }

  if (creators.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No creators found for this campaign.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Bulk Update Controls */}
      {selectedCreators.size > 0 && (
        <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border">
          <span className="text-sm font-medium">
            {selectedCreators.size} selected
          </span>
          <Select value={bulkUpdateType} onValueChange={(value: any) => setBulkUpdateType(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="payment">Payment</SelectItem>
              <SelectItem value="post">Post</SelectItem>
              <SelectItem value="approval">Approval</SelectItem>
            </SelectContent>
          </Select>
          <Select value={bulkStatus} onValueChange={setBulkStatus}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              {getStatusOptions(bulkUpdateType).map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleBulkUpdate} size="sm">
            Update Selected
          </Button>
        </div>
      )}

      {/* Creator Management Table */}
      <div className="rounded-md border overflow-x-auto max-h-[60vh] overflow-y-auto">
        <Table className="min-w-[1200px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedCreators.size === creators.length}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead className="min-w-[200px]">Creator</TableHead>
              <TableHead className="min-w-[120px] text-right">Followers</TableHead>
              <TableHead className="min-w-[120px] text-right">Rate & Cost</TableHead>
              <TableHead className="min-w-[140px] text-center">Payment Status</TableHead>
              <TableHead className="min-w-[140px] text-center">Post Status</TableHead>
              <TableHead className="min-w-[140px] text-center">Approval Status</TableHead>
              <TableHead className="min-w-[100px] text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {creators.map((creator) => (
              <TableRow key={creator.id}>
                <TableCell>
                  <Checkbox
                    checked={selectedCreators.has(creator.id)}
                    onCheckedChange={(checked) => handleSelectCreator(creator.id, !!checked)}
                  />
                </TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">@{creator.instagram_handle}</div>
                    <div className="text-sm text-muted-foreground">
                      {creator.posts_count || 1} post{(creator.posts_count || 1) > 1 ? 's' : ''} • {creator.post_type}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="font-medium">
                    {campaign.selected_creators?.find(c => c.id === creator.creator_id)?.followers?.toLocaleString() || 'N/A'}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="font-medium">${creator.rate?.toLocaleString() || 0}</div>
                  <div className="text-sm text-muted-foreground">
                    = ${((creator.rate || 0) * (creator.posts_count || 1)).toLocaleString()}
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <Select
                    value={creator.payment_status}
                    onValueChange={(value) => onStatusUpdate(creator.id, { payment_status: value as any })}
                  >
                    <SelectTrigger className="w-auto border-none bg-transparent p-0 h-auto">
                      <StatusIndicator type="payment" status={creator.payment_status} />
                    </SelectTrigger>
                    <SelectContent>
                      {getStatusOptions('payment').map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          <StatusIndicator type="payment" status={option.value} />
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-center">
                  <Select
                    value={creator.post_status}
                    onValueChange={(value) => onStatusUpdate(creator.id, { post_status: value as any })}
                  >
                    <SelectTrigger className="w-auto border-none bg-transparent p-0 h-auto">
                      <StatusIndicator type="post" status={creator.post_status} />
                    </SelectTrigger>
                    <SelectContent>
                      {getStatusOptions('post').map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          <StatusIndicator type="post" status={option.value} />
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-center">
                  <Select
                    value={creator.approval_status}
                    onValueChange={(value) => onStatusUpdate(creator.id, { approval_status: value as any })}
                  >
                    <SelectTrigger className="w-auto border-none bg-transparent p-0 h-auto">
                      <StatusIndicator type="approval" status={creator.approval_status} />
                    </SelectTrigger>
                    <SelectContent>
                      {getStatusOptions('approval').map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          <StatusIndicator type="approval" status={option.value} />
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 justify-center">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingCreator(creator);
                            setNotes(creator.payment_notes || creator.approval_notes || '');
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Edit Notes - @{creator.instagram_handle}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <label className="text-sm font-medium">Notes</label>
                            <Textarea
                              value={notes}
                              onChange={(e) => setNotes(e.target.value)}
                              placeholder="Add payment or approval notes..."
                              rows={3}
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setEditingCreator(null)}>
                              Cancel
                            </Button>
                            <Button onClick={() => handleNotesUpdate(creator)}>
                              Save Notes
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                    
                    {(creator.payment_notes || creator.approval_notes) && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            title="View notes"
                          >
                            <MessageSquare className="h-4 w-4 text-blue-500" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle>Notes - @{creator.instagram_handle}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            {creator.payment_notes && (
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">Payment Notes:</label>
                                <div className="mt-1 p-3 bg-muted/50 rounded-md text-sm">
                                  {creator.payment_notes}
                                </div>
                              </div>
                            )}
                            {creator.approval_notes && (
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">Approval Notes:</label>
                                <div className="mt-1 p-3 bg-muted/50 rounded-md text-sm">
                                  {creator.approval_notes}
                                </div>
                              </div>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};