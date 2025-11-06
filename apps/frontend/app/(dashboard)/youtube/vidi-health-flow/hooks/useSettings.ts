import { useState, useEffect } from 'react';
import { supabase } from "../integrations/supabase/client";
import { useToast } from '@/hooks/use-toast';

export interface Settings {
  id?: string;
  stalling_detection_enabled: boolean;
  stalling_view_threshold: number;
  stalling_day_threshold: number;
  operator_email: string;
  email_automations_enabled: boolean;
  created_at?: string;
  updated_at?: string;
}

export const useSettings = () => {
  const [settings, setSettings] = useState<Settings>({
    stalling_detection_enabled: true,
    stalling_view_threshold: 5000,
    stalling_day_threshold: 3,
    operator_email: 'rajat@artistinfluence.com',
    email_automations_enabled: true
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .single();

      if (error) {
        console.error('Error fetching settings:', error);
        // Use default settings if none exist
        return;
      }

      if (data) {
        setSettings(data);
      }
    } catch (error) {
      console.error('Error in fetchSettings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (newSettings: Partial<Settings>) => {
    try {
      const updatedSettings = { ...settings, ...newSettings };

      const { data, error } = await supabase
        .from('settings')
        .upsert(updatedSettings, { onConflict: 'id' })
        .select()
        .single();

      if (error) {
        console.error('Error updating settings:', error);
        toast({
          title: "Error",
          description: "Failed to update settings. Please try again.",
          variant: "destructive"
        });
        return false;
      }

      setSettings(data);
      toast({
        title: "Settings Updated",
        description: "Your stalling detection preferences have been saved.",
      });
      return true;
    } catch (error) {
      console.error('Error in updateSettings:', error);
      toast({
        title: "Error", 
        description: "Failed to update settings. Please try again.",
        variant: "destructive"
      });
      return false;
    }
  };

  const testStallingDetection = async () => {
    try {
      toast({
        title: "Running Detection",
        description: "Testing stalling campaign detection...",
      });

      const { data, error } = await supabase.functions.invoke('detect_stalling_campaigns');

      if (error) {
        console.error('Error testing detection:', error);
        toast({
          title: "Test Failed",
          description: "Failed to run stalling detection test.",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Test Complete",
        description: `Checked ${data.checked} campaigns, found ${data.stalled} stalling.`,
      });

      return data;
    } catch (error) {
      console.error('Error in testStallingDetection:', error);
      toast({
        title: "Test Failed",
        description: "Failed to run stalling detection test.",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return {
    settings,
    loading,
    updateSettings,
    testStallingDetection,
    refreshSettings: fetchSettings
  };
};