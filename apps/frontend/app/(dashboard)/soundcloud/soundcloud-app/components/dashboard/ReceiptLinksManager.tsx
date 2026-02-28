"use client"

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, ExternalLink, Edit, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useReceiptLinks, CampaignReceiptLink } from '../../hooks/useCampaignReceiptLinks';
import { AddReceiptLinkForm } from './AddReceiptLinkForm';
import { formatFollowerCount } from '../../utils/creditCalculations';
import { format } from 'date-fns';

interface ReceiptLinksManagerProps {
  campaignId?: string;
  submissionId?: string;
  onReachUpdate?: (totalReach: number) => void;
  onReachChanged?: (newTotalReach: number) => void;
}

export const ReceiptLinksManager = ({ campaignId, submissionId, onReachUpdate, onReachChanged }: ReceiptLinksManagerProps) => {
  const [editingLink, setEditingLink] = useState<CampaignReceiptLink | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  const { 
    receiptLinks, 
    loading, 
    addReceiptLink, 
    updateReceiptLink, 
    deleteReceiptLink, 
    getTotalReach 
  } = useReceiptLinks(campaignId, submissionId);

  const totalReach = getTotalReach();

  // Update parent when total reach changes
  React.useEffect(() => {
    onReachUpdate?.(totalReach);
    onReachChanged?.(totalReach);
  }, [totalReach, onReachUpdate, onReachChanged]);

  const handleAddSuccess = () => {
    setIsAddDialogOpen(false);
  };

  const handleEditSuccess = () => {
    setIsEditDialogOpen(false);
    setEditingLink(null);
  };

  const handleEdit = (link: CampaignReceiptLink) => {
    setEditingLink(link);
    setIsEditDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this receipt link?')) {
      await deleteReceiptLink(id);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500/10 text-green-500';
      case 'in_progress': return 'bg-blue-500/10 text-blue-500';
      case 'scheduled': return 'bg-yellow-500/10 text-yellow-500';
      default: return 'bg-gray-500/10 text-gray-500';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5" />
            Receipt Links
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5" />
            Receipt Links
          </CardTitle>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Add Receipt
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Receipt Link</DialogTitle>
              </DialogHeader>
              <AddReceiptLinkForm 
                campaignId={campaignId}
                submissionId={submissionId}
                onSuccess={handleAddSuccess}
                onSubmit={addReceiptLink}
              />
            </DialogContent>
          </Dialog>
        </div>
        {receiptLinks.length > 0 && (
          <p className="text-sm text-muted-foreground">
            Total Reach: <span className="font-semibold text-primary">
              {formatFollowerCount(totalReach)}
            </span>
          </p>
        )}
      </CardHeader>
      <CardContent>
        {receiptLinks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <ExternalLink className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No receipt links added yet</p>
            <p className="text-sm">Add receipt links to track campaign progress</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Supporter</TableHead>
                <TableHead>Handle</TableHead>
                <TableHead>Reach</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Scheduled Date</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {receiptLinks.map((link) => (
                <TableRow key={link.id}>
                  <TableCell className="font-medium">
                    {link.supporter_name}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      @{link.supporter_handle}
                      {link.proof_url && (
                        <a 
                          href={link.proof_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:text-blue-700"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono">
                      {formatFollowerCount(link.reach_amount)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(link.status)}>
                      {link.status.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {link.scheduled_date 
                      ? format(new Date(link.scheduled_date), 'MMM dd, yyyy')
                      : 'TBD'
                    }
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(link)}
                        className="h-7 w-7 p-0"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(link.id)}
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Receipt Link</DialogTitle>
            </DialogHeader>
            {editingLink && (
              <AddReceiptLinkForm 
                campaignId={campaignId}
                submissionId={submissionId}
                initialData={editingLink}
                onSuccess={handleEditSuccess}
                onSubmit={async (data) => {
                  await updateReceiptLink(editingLink.id, data);
                }}
              />
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};