import { useState, useEffect } from 'react';
import { supabase } from "../integrations/supabase/client";
import { useToast } from '@/hooks/use-toast';
import { getApiUrl } from '../lib/getApiUrl';

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
        description: "Scanning campaigns for stalling indicators...",
      });

      const response = await fetch(`${getApiUrl()}/api/youtube-data-api/detect-stalling`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        console.error('Stalling detection failed:', err);
        toast({
          title: "Detection Failed",
          description: err.error || 'Failed to run stalling detection.',
          variant: "destructive"
        });
        return;
      }

      const data = await response.json();

      toast({
        title: "Detection Complete",
        description: `Checked ${data.checked} campaigns. ${data.stalled} stalling, ${data.recovered} recovered.`,
      });

      return data;
    } catch (error) {
      console.error('Error in testStallingDetection:', error);
      toast({
        title: "Detection Failed",
        description: "Could not reach the API. Check that the server is running.",
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