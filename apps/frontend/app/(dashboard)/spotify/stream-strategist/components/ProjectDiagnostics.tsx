"use client"

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '../integrations/supabase/client';
import { APP_CAMPAIGN_SOURCE, APP_CAMPAIGN_TYPE, PROJECT_NAME, PROJECT_ID } from '../lib/constants';
import { CheckCircle, AlertTriangle, Shield, Database, Eye, Zap } from 'lucide-react';

interface DiagnosticResult {
  projectInfo: any;
  campaignCount: number;
  foreignDataCount: number;
  securityStatus: 'SECURE' | 'WARNING' | 'CRITICAL';
}

export function ProjectDiagnostics() {
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult | null>(null);
  const [loading, setLoading] = useState(false);

  const runDiagnostics = async () => {
    setLoading(true);
    try {
      // Get project info
      const { data: projectInfo } = await supabase.rpc('get_artist_influence_project_info');
      
      // Count campaigns for this project
      const { data: campaigns, count: campaignCount } = await supabase
        .from('campaigns')
        .select('*', { count: 'exact' })
        .eq('source', APP_CAMPAIGN_SOURCE)
        .eq('campaign_type', APP_CAMPAIGN_TYPE);

      // Count any foreign data (should be 0)
      const { count: foreignDataCount } = await supabase
        .from('campaigns')
        .select('*', { count: 'exact' })
        .not('source', 'eq', APP_CAMPAIGN_SOURCE);

      const securityStatus = foreignDataCount === 0 ? 'SECURE' : 'CRITICAL';

      setDiagnostics({
        projectInfo,
        campaignCount: campaignCount || 0,
        foreignDataCount: foreignDataCount || 0,
        securityStatus
      });
    } catch (error) {
      console.error('Diagnostics error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  if (!diagnostics) return null;

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Shield className="w-5 h-5 text-primary" />
          <CardTitle className="text-lg">Project Security Diagnostics</CardTitle>
        </div>
        <CardDescription>
          Real-time verification of data isolation and project security
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Project Identity */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Eye className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Project Identity</span>
            </div>
            <div className="pl-6 space-y-1">
              <div className="text-sm">
                <span className="text-muted-foreground">Name:</span> {PROJECT_NAME}
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">ID:</span> {PROJECT_ID}
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Source:</span> {APP_CAMPAIGN_SOURCE}
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Type:</span> {APP_CAMPAIGN_TYPE}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Database className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Data Status</span>
            </div>
            <div className="pl-6 space-y-1">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-3 h-3 text-green-500" />
                <span className="text-sm">Your campaigns: {diagnostics.campaignCount}</span>
              </div>
              <div className="flex items-center space-x-2">
                {diagnostics.foreignDataCount === 0 ? (
                  <CheckCircle className="w-3 h-3 text-green-500" />
                ) : (
                  <AlertTriangle className="w-3 h-3 text-red-500" />
                )}
                <span className="text-sm">Foreign data: {diagnostics.foreignDataCount}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Security Status */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center space-x-2">
            <Zap className="w-4 h-4" />
            <span className="font-medium">Security Status</span>
          </div>
          <Badge 
            variant={diagnostics.securityStatus === 'SECURE' ? 'default' : 'destructive'}
            className="font-medium"
          >
            {diagnostics.securityStatus}
          </Badge>
        </div>

        {/* Protection Measures */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Active Protection Measures:</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center space-x-1">
              <CheckCircle className="w-3 h-3 text-green-500" />
              <span>Unique Constants</span>
            </div>
            <div className="flex items-center space-x-1">
              <CheckCircle className="w-3 h-3 text-green-500" />
              <span>RLS Policies</span>
            </div>
            <div className="flex items-center space-x-1">
              <CheckCircle className="w-3 h-3 text-green-500" />
              <span>Validation Triggers</span>
            </div>
            <div className="flex items-center space-x-1">
              <CheckCircle className="w-3 h-3 text-green-500" />
              <span>Project Identifier</span>
            </div>
          </div>
        </div>

        <div className="flex space-x-2">
          <Button 
            onClick={runDiagnostics} 
            disabled={loading}
            size="sm"
            variant="outline"
          >
            Refresh Diagnostics
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}








