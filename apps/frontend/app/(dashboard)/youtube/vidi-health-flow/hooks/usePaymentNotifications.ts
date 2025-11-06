import { useState, useCallback } from "react";
import { supabase } from "../integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { VendorPaymentResult } from "../lib/vendorPaymentCalculator";

type NotificationType = 'weekly_payment_due' | 'payment_overdue' | 'bulk_payment_processed';

interface NotificationRequest {
  type: NotificationType;
  campaignIds?: string[];
  totalAmount?: number;
  dueDate?: string;
}

export const usePaymentNotifications = () => {
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const sendNotification = useCallback(async (request: NotificationRequest) => {
    setSending(true);
    try {
      console.log('Sending payment notification:', request);
      
      const { data, error } = await supabase.functions.invoke('send_payment_notification', {
        body: request
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Notification Sent",
        description: `Payment notification sent successfully to ${data.recipient}`,
      });

      return data;
    } catch (error: any) {
      console.error('Error sending notification:', error);
      toast({
        title: "Notification Failed",
        description: error.message || "Failed to send payment notification",
        variant: "destructive",
      });
      throw error;
    } finally {
      setSending(false);
    }
  }, [toast]);

  const sendWeeklyPaymentDue = useCallback(async (
    campaignIds: string[], 
    totalAmount: number
  ) => {
    return sendNotification({
      type: 'weekly_payment_due',
      campaignIds,
      totalAmount
    });
  }, [sendNotification]);

  const sendPaymentOverdue = useCallback(async (campaignIds: string[]) => {
    return sendNotification({
      type: 'payment_overdue',
      campaignIds
    });
  }, [sendNotification]);

  const sendBulkPaymentProcessed = useCallback(async (
    campaignIds: string[], 
    totalAmount: number
  ) => {
    return sendNotification({
      type: 'bulk_payment_processed',
      campaignIds,
      totalAmount
    });
  }, [sendNotification]);

  const checkOverduePayments = useCallback(async (
    campaigns: any[], 
    vendorPayments: Map<string, VendorPaymentResult>
  ) => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const overdueCampaigns = campaigns.filter(campaign => {
      const campaignDate = new Date(campaign.created_at);
      return !campaign.vendor_paid && campaignDate < oneWeekAgo;
    });

    if (overdueCampaigns.length > 0) {
      try {
        await sendPaymentOverdue(overdueCampaigns.map(c => c.id));
        return overdueCampaigns.length;
      } catch (error) {
        console.error('Failed to send overdue notification:', error);
        return 0;
      }
    }

    return 0;
  }, [sendPaymentOverdue]);

  const checkWeeklyPaymentDue = useCallback(async (
    campaigns: any[], 
    vendorPayments: Map<string, VendorPaymentResult>
  ) => {
    const unpaidCampaigns = campaigns.filter(c => !c.vendor_paid);
    
    if (unpaidCampaigns.length > 0) {
      const totalAmount = unpaidCampaigns.reduce((total, campaign) => {
        const payment = vendorPayments.get(campaign.id);
        return total + (payment?.total_cost || 0);
      }, 0);

      try {
        await sendWeeklyPaymentDue(unpaidCampaigns.map(c => c.id), totalAmount);
        return { count: unpaidCampaigns.length, amount: totalAmount };
      } catch (error) {
        console.error('Failed to send weekly payment notification:', error);
        return { count: 0, amount: 0 };
      }
    }

    return { count: 0, amount: 0 };
  }, [sendWeeklyPaymentDue]);

  const triggerAutomatedCalculation = useCallback(async () => {
    try {
      console.log('Triggering automated payment calculation...');
      
      const { data, error } = await supabase.functions.invoke('automated_payment_calculation', {
        body: {}
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Automated Calculation Complete",
        description: `Processed ${data.processed} campaigns. Success: ${data.successCount}, Errors: ${data.errorCount}`,
        variant: data.errorCount > 0 ? "destructive" : "default",
      });

      return data;
    } catch (error: any) {
      console.error('Error triggering automated calculation:', error);
      toast({
        title: "Calculation Failed",
        description: error.message || "Failed to trigger automated calculation",
        variant: "destructive",
      });
      throw error;
    }
  }, [toast]);

  return {
    sending,
    sendNotification,
    sendWeeklyPaymentDue,
    sendPaymentOverdue,
    sendBulkPaymentProcessed,
    checkOverduePayments,
    checkWeeklyPaymentDue,
    triggerAutomatedCalculation
  };
};