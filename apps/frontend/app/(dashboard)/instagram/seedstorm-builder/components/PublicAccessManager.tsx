import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Copy, RefreshCw, ExternalLink } from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { toast } from '../hooks/use-toast';

interface PublicAccessManagerProps {
  campaignId: string;
  publicAccessEnabled: boolean;
  publicToken: string | null;
  onUpdate: () => void;
}

const PublicAccessManager = ({ 
  campaignId, 
  publicAccessEnabled, 
  publicToken, 
  onUpdate 
}: PublicAccessManagerProps) => {
  const [loading, setLoading] = useState(false);

  const generatePublicUrl = (token: string) => {
    return `${window.location.origin}/client/${token}`;
  };

  const handleTogglePublicAccess = async (enabled: boolean) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('campaigns')
        .update({ public_access_enabled: enabled })
        .eq('id', campaignId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Public access ${enabled ? 'enabled' : 'disabled'} successfully`,
      });

      onUpdate();
    } catch (error) {
      console.error('Error toggling public access:', error);
      toast({
        title: "Error",
        description: "Failed to update public access setting",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateToken = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('regenerate_campaign_public_token', {
        campaign_id: campaignId
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Public URL regenerated successfully",
      });

      onUpdate();
    } catch (error) {
      console.error('Error regenerating token:', error);
      toast({
        title: "Error", 
        description: "Failed to regenerate public URL",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: "Public URL copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const openInNewTab = (url: string) => {
    window.open(url, '_blank');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Public Dashboard Access</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-2">
          <Switch
            id="public-access"
            checked={publicAccessEnabled}
            onCheckedChange={handleTogglePublicAccess}
            disabled={loading}
          />
          <Label htmlFor="public-access">
            Enable public access to campaign dashboard
          </Label>
        </div>

        {publicAccessEnabled && publicToken && (
          <div className="space-y-3">
            <div>
              <Label className="text-sm font-medium">Public Dashboard URL</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={generatePublicUrl(publicToken)}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(generatePublicUrl(publicToken))}
                  disabled={loading}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openInNewTab(generatePublicUrl(publicToken))}
                  disabled={loading}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={handleRegenerateToken}
              disabled={loading}
              className="w-full"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Regenerate URL
            </Button>

            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <p className="text-sm text-amber-700">
                <strong>Note:</strong> Anyone with this URL can view the campaign dashboard. 
                Keep this link secure and only share with intended clients.
              </p>
            </div>
          </div>
        )}

        {publicAccessEnabled && !publicToken && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-sm text-red-700">
              Public access is enabled but no token was generated. Please contact support.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PublicAccessManager;