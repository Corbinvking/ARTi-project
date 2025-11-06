import { useState } from "react";
import { supabase } from "../integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useEmailTesting = () => {
  const [testing, setTesting] = useState(false);
  const { toast } = useToast();

  const testEmailSystem = async () => {
    setTesting(true);
    try {
      console.log('Testing email system...');
      
      const { data, error } = await supabase.functions.invoke('test_email_system', {
        body: {}
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Email System Test Complete",
        description: `Test email sent successfully to operations team`,
        variant: "default",
      });

      return data;
    } catch (error: any) {
      console.error('Error testing email system:', error);
      toast({
        title: "Email Test Failed",
        description: error.message || "Failed to send test email",
        variant: "destructive",
      });
      throw error;
    } finally {
      setTesting(false);
    }
  };

  const testMilestoneNotification = async (campaignId: string, milestone: number) => {
    setTesting(true);
    try {
      console.log(`Testing milestone notification: ${milestone}% for campaign ${campaignId}`);
      
      const { data, error } = await supabase.functions.invoke('send_milestone_notification', {
        body: {
          campaign_id: campaignId,
          milestone_percentage: milestone
        }
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Milestone Notification Sent",
        description: `${milestone}% milestone notification sent successfully`,
        variant: "default",
      });

      return data;
    } catch (error: any) {
      console.error('Error sending milestone notification:', error);
      toast({
        title: "Milestone Notification Failed",
        description: error.message || "Failed to send milestone notification",
        variant: "destructive",
      });
      throw error;
    } finally {
      setTesting(false);
    }
  };

  const testOnboardingEmail = async (campaignId: string, emailType: 'welcome' | 'setup_instructions' | 'expectations' | 'faq') => {
    setTesting(true);
    try {
      console.log(`Testing onboarding email: ${emailType} for campaign ${campaignId}`);
      
      const { data, error } = await supabase.functions.invoke('send_onboarding_emails', {
        body: {
          campaign_id: campaignId,
          email_type: emailType
        }
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Onboarding Email Sent",
        description: `${emailType.replace('_', ' ')} email sent successfully`,
        variant: "default",
      });

      return data;
    } catch (error: any) {
      console.error('Error sending onboarding email:', error);
      toast({
        title: "Onboarding Email Failed",
        description: error.message || "Failed to send onboarding email",
        variant: "destructive",
      });
      throw error;
    } finally {
      setTesting(false);
    }
  };

  const testPaymentConfirmation = async (campaignId: string) => {
    setTesting(true);
    try {
      console.log(`Testing payment confirmation for campaign ${campaignId}`);
      
      const { data, error } = await supabase.functions.invoke('send_payment_confirmation', {
        body: {
          campaign_id: campaignId
        }
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Payment Confirmation Sent",
        description: "Payment confirmation email sent successfully",
        variant: "default",
      });

      return data;
    } catch (error: any) {
      console.error('Error sending payment confirmation:', error);
      toast({
        title: "Payment Confirmation Failed",
        description: error.message || "Failed to send payment confirmation",
        variant: "destructive",
      });
      throw error;
    } finally {
      setTesting(false);
    }
  };

  return {
    testing,
    testEmailSystem,
    testMilestoneNotification,
    testOnboardingEmail,
    testPaymentConfirmation
  };
};