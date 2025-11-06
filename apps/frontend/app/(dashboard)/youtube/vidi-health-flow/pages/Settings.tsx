import React from 'react';
import { useAuth } from "../contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings as SettingsIcon, DollarSign, Bell, Shield, Youtube, AlertTriangle, Download, Activity, Palette } from 'lucide-react';
import { PricingManagement } from "../components/settings/PricingManagement";
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { TestYouTubeAPI } from "../components/TestYouTubeAPI";
import { SystemHealthDashboard } from "../components/admin/SystemHealthDashboard";
import { SERVICE_TYPES } from "../lib/constants";
import { useSettings } from "../hooks/useSettings";
import { useToast } from '@/hooks/use-toast';

const Settings = () => {
  const { isAdmin, isManager } = useAuth();
  const { toast } = useToast();
  const { settings: stallingSettings, loading: settingsLoading, updateSettings, testStallingDetection } = useSettings();

  const [settings, setSettings] = React.useState({
    notifications: {
      emailNotifications: true,
      pushNotifications: false,
      campaignAlerts: true,
      healthAlerts: true,
    },
    display: {
      theme: 'system',
      compactView: false,
      showHealthScores: true,
      autoRefresh: true,
      refreshInterval: '30',
    },
    defaults: {
      defaultServiceType: 'worldwide',
      defaultGoalViews: '100000',
      defaultDesiredDaily: '5000',
      defaultWaitTime: '300',
    },
    export: {
      includeHealthScores: true,
      includeEngagementMetrics: true,
      includeFinancialData: false,
      dateFormat: 'MM/DD/YYYY',
    }
  });

  const handleSettingChange = (category: string, setting: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category as keyof typeof prev],
        [setting]: value
      }
    }));
  };

  const handleSave = () => {
    toast({
      title: "Settings Saved",
      description: "Your preferences have been updated successfully.",
    });
  };

  const handleMasterToggle = async (enabled: boolean) => {
    const success = await updateSettings({ email_automations_enabled: enabled });
    if (success) {
      toast({
        title: enabled ? "Email Automations Enabled" : "Email Automations Disabled",
        description: enabled 
          ? "All automated emails will now be sent normally." 
          : "⚠️ All automated emails have been DISABLED system-wide.",
        variant: enabled ? "default" : "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your platform configuration and preferences.</p>
      </div>

      <Tabs defaultValue="notifications" className="space-y-6">
        <TabsList className={`grid w-full ${isAdmin ? 'grid-cols-7' : 'grid-cols-6'}`}>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="defaults" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Defaults
          </TabsTrigger>
          {(isAdmin || isManager) && (
            <TabsTrigger value="pricing" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Pricing
            </TabsTrigger>
          )}
          <TabsTrigger value="stalling" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Stalling
          </TabsTrigger>
          <TabsTrigger value="youtube" className="flex items-center gap-2">
            <Youtube className="h-4 w-4" />
            YouTube API
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="health" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              System Health
            </TabsTrigger>
          )}
          <TabsTrigger value="export" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Security
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="notifications" className="space-y-6">
          {/* Master Email Control */}
          <Card className={!stallingSettings.email_automations_enabled ? "border-destructive bg-destructive/5" : ""}>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <SettingsIcon className="h-5 w-5" />
                <CardTitle className="text-lg">Master Email Control</CardTitle>
              </div>
              <CardDescription>
                Control all automated emails sent by the system
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="master-email-toggle" className="text-base font-medium">
                    Enable All Email Automations
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Turn off to disable ALL automated emails to clients, salespeople, and managers
                  </p>
                </div>
                <Switch
                  id="master-email-toggle"
                  checked={stallingSettings.email_automations_enabled}
                  onCheckedChange={handleMasterToggle}
                  disabled={settingsLoading}
                />
              </div>
              
              {/* Status Indicator */}
              <div className={`flex items-center gap-2 p-3 rounded-md ${
                stallingSettings.email_automations_enabled 
                  ? "bg-green-50 text-green-700 border border-green-200" 
                  : "bg-red-50 text-red-700 border border-red-200"
              }`}>
                {stallingSettings.email_automations_enabled ? (
                  <>
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium">All email automations are ACTIVE</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm font-medium">All email automations are DISABLED</span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="email-notifications">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive updates via email</p>
                </div>
                <Switch
                  id="email-notifications"
                  checked={settings.notifications.emailNotifications}
                  onCheckedChange={(checked) => handleSettingChange('notifications', 'emailNotifications', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="push-notifications">Push Notifications</Label>
                  <p className="text-sm text-muted-foreground">Browser push notifications</p>
                </div>
                <Switch
                  id="push-notifications"
                  checked={settings.notifications.pushNotifications}
                  onCheckedChange={(checked) => handleSettingChange('notifications', 'pushNotifications', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="campaign-alerts">Campaign Status Alerts</Label>
                  <p className="text-sm text-muted-foreground">Notify when campaigns need attention</p>
                </div>
                <Switch
                  id="campaign-alerts"
                  checked={settings.notifications.campaignAlerts}
                  onCheckedChange={(checked) => handleSettingChange('notifications', 'campaignAlerts', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="health-alerts">Health Score Alerts</Label>
                  <p className="text-sm text-muted-foreground">Notify when health scores are low</p>
                </div>
                <Switch
                  id="health-alerts"
                  checked={settings.notifications.healthAlerts}
                  onCheckedChange={(checked) => handleSettingChange('notifications', 'healthAlerts', checked)}
                />
              </div>
              <div className="pt-4 border-t">
                <Button onClick={handleSave}>Save Notification Settings</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="defaults" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Default Campaign Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="default-service">Default Service Type</Label>
                <Select
                  value={settings.defaults.defaultServiceType}
                  onValueChange={(value) => handleSettingChange('defaults', 'defaultServiceType', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SERVICE_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="default-goal">Default Goal Views</Label>
                  <Input
                    id="default-goal"
                    type="number"
                    value={settings.defaults.defaultGoalViews}
                    onChange={(e) => handleSettingChange('defaults', 'defaultGoalViews', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="default-daily">Default Desired Daily</Label>
                  <Input
                    id="default-daily"
                    type="number"
                    value={settings.defaults.defaultDesiredDaily}
                    onChange={(e) => handleSettingChange('defaults', 'defaultDesiredDaily', e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="default-wait">Default Wait Time (seconds)</Label>
                <Input
                  id="default-wait"
                  type="number"
                  value={settings.defaults.defaultWaitTime}
                  onChange={(e) => handleSettingChange('defaults', 'defaultWaitTime', e.target.value)}
                />
              </div>
              <div className="pt-4 border-t">
                <Button onClick={handleSave}>Save Default Settings</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {(isAdmin || isManager) && (
          <TabsContent value="pricing" className="space-y-6">
            <PricingManagement />
          </TabsContent>
        )}

        <TabsContent value="stalling" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Stalling Detection Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="stalling-enabled">Enable Stalling Detection</Label>
                  <p className="text-sm text-muted-foreground">Automatically detect and report stalling campaigns</p>
                </div>
                <Switch
                  id="stalling-enabled"
                  checked={stallingSettings.stalling_detection_enabled}
                  onCheckedChange={(checked) => updateSettings({ stalling_detection_enabled: checked })}
                  disabled={settingsLoading}
                />
              </div>
              
              {stallingSettings.stalling_detection_enabled && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="view-threshold">View Threshold</Label>
                      <Input
                        id="view-threshold"
                        type="number"
                        value={stallingSettings.stalling_view_threshold}
                        onChange={(e) => updateSettings({ stalling_view_threshold: parseInt(e.target.value) || 0 })}
                        placeholder="5000"
                      />
                      <p className="text-xs text-muted-foreground">Minimum views required to avoid stalling status</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="day-threshold">Day Threshold</Label>
                      <Input
                        id="day-threshold"
                        type="number"
                        value={stallingSettings.stalling_day_threshold}
                        onChange={(e) => updateSettings({ stalling_day_threshold: parseInt(e.target.value) || 1 })}
                        placeholder="3"
                      />
                      <p className="text-xs text-muted-foreground">Number of days to check for view growth</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="operator-email">Operator Email</Label>
                    <Input
                      id="operator-email"
                      type="email"
                      value={stallingSettings.operator_email}
                      onChange={(e) => updateSettings({ operator_email: e.target.value })}
                      placeholder="rajat@artistinfluence.com"
                    />
                    <p className="text-xs text-muted-foreground">Email address to receive stalling alerts</p>
                  </div>

                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium">Test Detection</h4>
                        <p className="text-xs text-muted-foreground">Run stalling detection manually to test settings</p>
                      </div>
                      <Button 
                        variant="outline" 
                        onClick={testStallingDetection}
                        disabled={settingsLoading}
                      >
                        Run Test
                      </Button>
                    </div>
                  </div>

                  <div className="bg-muted p-4 rounded-lg">
                    <h4 className="text-sm font-medium mb-2">Detection Schedule</h4>
                    <p className="text-xs text-muted-foreground">
                      Stalling detection runs automatically every day at 8:00 AM EST (1:00 PM UTC). 
                      Campaigns with less than {stallingSettings.stalling_view_threshold.toLocaleString()} views gained 
                      in {stallingSettings.stalling_day_threshold} days will be marked as stalling and an alert 
                      will be sent to {stallingSettings.operator_email}.
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="youtube" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>YouTube API Integration</CardTitle>
            </CardHeader>
            <CardContent>
              <TestYouTubeAPI />
            </CardContent>
          </Card>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="health" className="space-y-6">
            <SystemHealthDashboard />
          </TabsContent>
        )}

        <TabsContent value="export" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Export Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="include-health">Include Health Scores</Label>
                  <p className="text-sm text-muted-foreground">Add health metrics to exported data</p>
                </div>
                <Switch
                  id="include-health"
                  checked={settings.export.includeHealthScores}
                  onCheckedChange={(checked) => handleSettingChange('export', 'includeHealthScores', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="include-engagement">Include Engagement Metrics</Label>
                  <p className="text-sm text-muted-foreground">Add likes, comments, and subscriber data</p>
                </div>
                <Switch
                  id="include-engagement"
                  checked={settings.export.includeEngagementMetrics}
                  onCheckedChange={(checked) => handleSettingChange('export', 'includeEngagementMetrics', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="include-financial">Include Financial Data</Label>
                  <p className="text-sm text-muted-foreground">Add pricing and payment information</p>
                </div>
                <Switch
                  id="include-financial"
                  checked={settings.export.includeFinancialData}
                  onCheckedChange={(checked) => handleSettingChange('export', 'includeFinancialData', checked)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date-format">Date Format</Label>
                <Select
                  value={settings.export.dateFormat}
                  onValueChange={(value) => handleSettingChange('export', 'dateFormat', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                    <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                    <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="pt-4 border-t">
                <Button onClick={handleSave}>Save Export Settings</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>
                  Manage security policies and access controls.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Advanced security settings will be available in a future update.
                  </p>
                  <div className="grid gap-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Two-Factor Authentication</p>
                        <p className="text-sm text-muted-foreground">Enhanced account security</p>
                      </div>
                      <div className="text-sm text-muted-foreground">Coming Soon</div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">API Access Management</p>
                        <p className="text-sm text-muted-foreground">Manage API keys and access tokens</p>
                      </div>
                      <div className="text-sm text-muted-foreground">Coming Soon</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default Settings;