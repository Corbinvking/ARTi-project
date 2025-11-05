import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { PaymentTrackingCreator } from '../hooks/usePaymentTracking';

interface PaymentNotesModalProps {
  creator: PaymentTrackingCreator | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (creatorId: string, status: string, notes: string) => void;
}

export const PaymentNotesModal: React.FC<PaymentNotesModalProps> = ({
  creator,
  isOpen,
  onClose,
  onSave
}) => {
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (creator) {
      setNotes(creator.payment_notes || '');
    }
  }, [creator]);

  const handleSave = () => {
    if (creator) {
      onSave(creator.id, creator.payment_status, notes);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            Payment Notes - {creator?.instagram_handle}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="payment-amount">Amount</Label>
            <div className="text-2xl font-bold text-primary">
              ${creator?.rate || 0}
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="campaign">Campaign</Label>
            <div className="text-sm text-muted-foreground">
              {creator?.campaign_name}
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="due-date">Due Date</Label>
            <div className="text-sm text-muted-foreground">
              {creator?.due_date ? new Date(creator.due_date).toLocaleDateString() : 'Not set'}
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="payment-notes">Payment Notes</Label>
            <Textarea
              id="payment-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add payment notes, tracking information, or other details..."
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Notes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};