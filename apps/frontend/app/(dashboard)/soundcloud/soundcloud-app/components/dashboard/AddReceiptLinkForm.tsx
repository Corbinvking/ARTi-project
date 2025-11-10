"use client"

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CreateReceiptLinkData, CampaignReceiptLink } from '../../hooks/useCampaignReceiptLinks';

interface AddReceiptLinkFormProps {
  campaignId?: string;
  submissionId?: string;
  initialData?: CampaignReceiptLink;
  onSuccess?: () => void;
  onSubmit: (data: CreateReceiptLinkData | Partial<CampaignReceiptLink>) => Promise<any>;
}

export const AddReceiptLinkForm = ({ 
  campaignId, 
  submissionId,
  initialData, 
  onSuccess, 
  onSubmit 
}: AddReceiptLinkFormProps) => {
  const [formData, setFormData] = useState({
    reach_amount: initialData?.reach_amount || 0,
    proof_url: initialData?.proof_url || '',
    scheduled_date: initialData?.scheduled_date || ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.proof_url || !formData.scheduled_date || formData.reach_amount <= 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      const submitData: CreateReceiptLinkData | Partial<CampaignReceiptLink> = {
        ...formData,
        ...(campaignId && { campaign_id: campaignId }),
        ...(submissionId && { submission_id: submissionId }),
        status: 'scheduled',
        supporter_name: null,
        supporter_handle: null
      };
      
      await onSubmit(submitData);
      onSuccess?.();
    } catch (error) {
      console.error('Failed to submit receipt link:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="proof_url">Proof URL</Label>
        <Input
          id="proof_url"
          type="url"
          placeholder="https://soundcloud.com/..."
          value={formData.proof_url}
          onChange={(e) => handleInputChange('proof_url', e.target.value)}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="scheduled_date">Scheduled Date</Label>
          <Input
            id="scheduled_date"
            type="date"
            value={formData.scheduled_date}
            onChange={(e) => handleInputChange('scheduled_date', e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="reach_amount">Reach Amount</Label>
          <Input
            id="reach_amount"
            type="number"
            placeholder="0"
            min="1"
            value={formData.reach_amount}
            onChange={(e) => handleInputChange('reach_amount', parseInt(e.target.value) || 0)}
            required
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : (initialData ? 'Update' : 'Add')} Receipt Link
        </Button>
      </div>
    </form>
  );
};