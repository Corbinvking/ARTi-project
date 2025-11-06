import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarIcon, Eye, Heart, MessageCircle, TrendingUp, TrendingDown, Minus, Users, AlertTriangle, Clock } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useCampaigns } from "../../hooks/useCampaigns";
import { supabase } from "../../integrations/supabase/client";
import { RatioFixerContent } from "./RatioFixerContent";
import { sanitizeYouTubeUrl } from "../../lib/youtube";
import { MultiServiceTypeSelector } from "./MultiServiceTypeSelector";
import { SERVICE_TYPES, GENRE_OPTIONS, LIKE_SERVER_OPTIONS, COMMENT_SERVER_OPTIONS, SHEET_TIER_OPTIONS } from "../../lib/constants";
import type { Database } from "../../integrations/supabase/types";

type ServiceType = Database['public']['Enums']['service_type'];
type CampaignStatus = Database['public']['Enums']['campaign_status'];

interface DailyStats {
  date: string;
  views: number;
  likes: number;
  comments: number;
  total_subscribers: number;
  subscribers_gained: number;
  time_of_day: string;
  collected_at: string;
}

interface CampaignSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignId: string;
  initialTab?: 'basic' | 'metrics' | 'ratio-fixer' | 'results';
}

const statusOptions: { value: CampaignStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'complete', label: 'Complete' },
];

export const CampaignSettingsModal = ({ isOpen, onClose, campaignId, initialTab = 'basic' }: CampaignSettingsModalProps) => {
  const { toast } = useToast();
  const { campaigns, clients, salespersons, updateCampaign, triggerYouTubeStatsFetch } = useCampaigns();
  const [loading, setLoading] = useState(false);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);
  const [refreshingYouTubeData, setRefreshingYouTubeData] = useState(false);
  
  const campaign = campaigns.find(c => c.id === campaignId);
  
  const [serviceTypes, setServiceTypes] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    campaign_name: '',
    youtube_url: '',
    client_id: '',
    salesperson_id: '',
    service_type: '' as ServiceType,
    custom_service_type: '',
    status: '' as CampaignStatus,
    genre: '',
    goal_views: '',
    sale_price: '',
    start_date: undefined as Date | undefined,
    end_date: undefined as Date | undefined,
    comments_sheet_url: '',
    like_server: '',
    comment_server: '',
    minimum_engagement: '',
    wait_time_seconds: '',
    sheet_tier: '',
    desired_daily: '',
    manual_progress: '',
    // Boolean flags
    needs_update: false,
    confirm_start_date: false,
    views_stalled: false,
    ask_for_access: false,
    youtube_api_enabled: false,
  });

  useEffect(() => {
    if (campaign) {
      // Initialize service types from new structure or fallback to legacy
      const campaignServiceTypes = (campaign as any).service_types ? 
        (typeof (campaign as any).service_types === 'string' ? 
          JSON.parse((campaign as any).service_types) : 
          (campaign as any).service_types).map((st: any, index: number) => ({
          ...st,
          id: `${campaign.id}-${index}`
        })) :
        [{
          id: `${campaign.id}-0`,
          service_type: campaign.service_type,
          custom_service_type: (campaign as any).custom_service_type,
          goal_views: campaign.goal_views || 0
        }];
      
      setServiceTypes(campaignServiceTypes);
      
      // Fetch daily stats when campaign changes
      if (isOpen) {
        fetchDailyStats();
      }
      
      setFormData({
        campaign_name: campaign.campaign_name || '',
        youtube_url: campaign.youtube_url || '',
        client_id: campaign.client_id || '',
        salesperson_id: campaign.salesperson_id || '',
        service_type: campaign.service_type,
        custom_service_type: (campaign as any).custom_service_type || '',
        status: campaign.status || 'pending',
        genre: campaign.genre || '',
        goal_views: campaign.goal_views?.toString() || '',
        sale_price: campaign.sale_price?.toString() || '',
        start_date: campaign.start_date ? new Date(campaign.start_date) : undefined,
        end_date: campaign.end_date ? new Date(campaign.end_date) : undefined,
        comments_sheet_url: campaign.comments_sheet_url || '',
        like_server: campaign.like_server || '',
        comment_server: campaign.comment_server || '',
        minimum_engagement: campaign.minimum_engagement?.toString() || '',
        wait_time_seconds: campaign.wait_time_seconds?.toString() || '',
        sheet_tier: campaign.sheet_tier || '',
        desired_daily: campaign.desired_daily?.toString() || '',
        manual_progress: (campaign as any).manual_progress?.toString() || '',
        needs_update: campaign.needs_update || false,
        confirm_start_date: campaign.confirm_start_date || false,
        views_stalled: campaign.views_stalled || false,
        ask_for_access: campaign.ask_for_access || false,
        youtube_api_enabled: campaign.youtube_api_enabled || false,
      });
    }
  }, [campaign, isOpen]);

  const fetchDailyStats = async () => {
    if (!campaign) return;
    
    setLoadingStats(true);
    try {
      const { data, error } = await supabase
        .from('campaign_stats_daily')
        .select('date, views, likes, comments, total_subscribers, subscribers_gained, time_of_day, collected_at')
        .eq('campaign_id', campaign.id)
        .order('date', { ascending: true })
        .order('collected_at', { ascending: true });

      if (error) throw error;

      setDailyStats(data || []);
    } catch (error) {
      console.error('Error fetching daily stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleRefreshYouTubeData = async () => {
    if (!campaign) return;
    
    setRefreshingYouTubeData(true);
    try {
      const { error } = await triggerYouTubeStatsFetch(campaign.id);
      if (error) throw error;
      
      toast({
        title: "YouTube Data Updated",
        description: "Fresh data has been fetched from YouTube API.",
      });
      
      // Refresh the display after YouTube data is updated
      await fetchDailyStats();
    } catch (error) {
      console.error('Error refreshing YouTube data:', error);
      toast({
        title: "Error",
        description: "Failed to refresh YouTube data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setRefreshingYouTubeData(false);
    }
  };

  const calculateTrend = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const getTrendIcon = (trend: number) => {
    if (trend > 5) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (trend < -5) return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-gray-500" />;
  };

  // Helper function to get latest subscriber count
  const getLatestSubscriberCount = () => {
    if (dailyStats.length > 0) {
      // Get the most recent total subscriber count
      return dailyStats[dailyStats.length - 1]?.total_subscribers || 0;
    }
    return campaign.total_subscribers || 0;
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const calculateHealthScore = (campaign: any): number => {
    let score = 50; // Base score
    
    const viewsProgress = campaign.goal_views > 0 ? (campaign.current_views || 0) / campaign.goal_views : 0;
    score += viewsProgress * 30; // Up to 30 points for view progress
    
    if (campaign.status === 'active') score += 10;
    if (!campaign.views_stalled) score += 10;
    if (!campaign.in_fixer) score += 5;
    
    return Math.min(100, Math.max(0, Math.round(score)));
  };

  const handleInputChange = (field: string, value: string | Date | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const isSetupComplete = () => {
    return formData.desired_daily && 
           formData.comments_sheet_url && 
           formData.like_server && 
           formData.comment_server;
  };

  const getMissingFields = () => {
    const missing: string[] = [];
    if (!formData.desired_daily) missing.push('Desired Daily Views');
    if (!formData.comments_sheet_url) missing.push('Comments Sheet URL');
    if (!formData.like_server) missing.push('Like Server');
    if (!formData.comment_server) missing.push('Comment Server');
    return missing;
  };

  const handleSave = async () => {
    if (!campaign) return;
    
    // Check if user is trying to activate without completing setup
    if (formData.status === 'active' && campaign.status !== 'active' && !isSetupComplete()) {
      const missingFields = getMissingFields();
      toast({
        title: "Cannot Activate Campaign",
        description: `Please complete the technical setup first. Missing fields: ${missingFields.join(', ')}`,
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);
    try {
      // Calculate total goal views from service types
      const totalGoalViews = serviceTypes.reduce((sum, st) => sum + (st.goal_views || 0), 0);
      
      const updateData = {
        campaign_name: formData.campaign_name,
        youtube_url: sanitizeYouTubeUrl(formData.youtube_url),
        client_id: formData.client_id || null,
        salesperson_id: formData.salesperson_id || null,
        service_type: serviceTypes.length > 0 ? serviceTypes[0].service_type : formData.service_type,
        custom_service_type: serviceTypes.length > 0 ? serviceTypes[0].custom_service_type : formData.custom_service_type,
        service_types: JSON.stringify(serviceTypes.map(({ id, ...st }) => st)),
        status: formData.status,
        genre: formData.genre || null,
        goal_views: totalGoalViews,
        sale_price: formData.sale_price ? parseFloat(formData.sale_price) : null,
        start_date: formData.start_date ? format(formData.start_date, 'yyyy-MM-dd') : null,
        end_date: formData.end_date ? format(formData.end_date, 'yyyy-MM-dd') : null,
        comments_sheet_url: formData.comments_sheet_url || null,
        like_server: formData.like_server || null,
        comment_server: formData.comment_server || null,
        minimum_engagement: formData.minimum_engagement ? parseInt(formData.minimum_engagement) : 0,
        wait_time_seconds: formData.wait_time_seconds ? parseInt(formData.wait_time_seconds) : 0,
        sheet_tier: formData.sheet_tier || null,
        desired_daily: formData.desired_daily ? parseInt(formData.desired_daily) : 0,
        manual_progress: formData.manual_progress ? parseInt(formData.manual_progress) : 0,
        needs_update: formData.needs_update,
        confirm_start_date: formData.confirm_start_date,
        views_stalled: formData.views_stalled,
        ask_for_access: formData.ask_for_access,
        youtube_api_enabled: formData.youtube_api_enabled,
        technical_setup_complete: Boolean(isSetupComplete()),
      };

      const { error } = await updateCampaign(campaign.id, updateData);
      
      if (error) {
        throw error;
      }

      toast({
        title: "Campaign Updated",
        description: "Campaign settings have been saved successfully.",
      });
      
      onClose();
    } catch (error) {
      console.error('Error updating campaign:', error);
      toast({
        title: "Error",
        description: "Failed to update campaign. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleActivateCampaign = async () => {
    if (!campaign || !isSetupComplete()) return;
    
    setLoading(true);
    try {
      // Calculate total goal views from service types
      const totalGoalViews = serviceTypes.reduce((sum, st) => sum + (st.goal_views || 0), 0);
      
      const updateData = {
        campaign_name: formData.campaign_name,
        youtube_url: sanitizeYouTubeUrl(formData.youtube_url),
        client_id: formData.client_id || null,
        salesperson_id: formData.salesperson_id || null,
        service_type: serviceTypes.length > 0 ? serviceTypes[0].service_type : formData.service_type,
        custom_service_type: serviceTypes.length > 0 ? serviceTypes[0].custom_service_type : formData.custom_service_type,
        service_types: JSON.stringify(serviceTypes.map(({ id, ...st }) => st)),
        genre: formData.genre || null,
        goal_views: totalGoalViews,
        sale_price: formData.sale_price ? parseFloat(formData.sale_price) : null,
        start_date: formData.start_date ? format(formData.start_date, 'yyyy-MM-dd') : null,
        end_date: formData.end_date ? format(formData.end_date, 'yyyy-MM-dd') : null,
        comments_sheet_url: formData.comments_sheet_url || null,
        like_server: formData.like_server || null,
        comment_server: formData.comment_server || null,
        minimum_engagement: formData.minimum_engagement ? parseInt(formData.minimum_engagement) : 0,
        wait_time_seconds: formData.wait_time_seconds ? parseInt(formData.wait_time_seconds) : 0,
        sheet_tier: formData.sheet_tier || null,
        desired_daily: formData.desired_daily ? parseInt(formData.desired_daily) : 0,
        manual_progress: formData.manual_progress ? parseInt(formData.manual_progress) : 0,
        needs_update: formData.needs_update,
        confirm_start_date: formData.confirm_start_date,
        views_stalled: formData.views_stalled,
        ask_for_access: formData.ask_for_access,
        youtube_api_enabled: formData.youtube_api_enabled,
        technical_setup_complete: true,
        status: 'active' as CampaignStatus,
      };

      const { error } = await updateCampaign(campaign.id, updateData);
      
      if (error) {
        throw error;
      }

      toast({
        title: "Campaign Activated",
        description: "Campaign has been activated and will begin processing.",
      });
      
      onClose();
    } catch (error) {
      console.error('Error activating campaign:', error);
      toast({
        title: "Error",
        description: "Failed to activate campaign. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!campaign) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Campaign Settings - {campaign.campaign_name}
            {campaign.status === 'pending' && !campaign.technical_setup_complete && !isSetupComplete() && (
              <Badge variant="destructive" className="ml-2">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Setup Incomplete
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Manage campaign settings, targets, ratio fixer configuration, and view performance results.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue={initialTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="metrics">Metrics & Targets</TabsTrigger>
            <TabsTrigger value="ratio-fixer">Ratio Fixer</TabsTrigger>
            <TabsTrigger value="results">Results</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="campaign_name">Campaign Name</Label>
                  <Input
                    id="campaign_name"
                    value={formData.campaign_name}
                    onChange={(e) => handleInputChange('campaign_name', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="youtube_url">YouTube URL</Label>
                  <Input
                    id="youtube_url"
                    value={formData.youtube_url}
                    onChange={(e) => handleInputChange('youtube_url', e.target.value)}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="youtube_api_enabled"
                    checked={formData.youtube_api_enabled}
                    onChange={(e) => handleInputChange('youtube_api_enabled', e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor="youtube_api_enabled" className="text-sm font-medium">
                    Enable YouTube API Tracking (Daily automatic stats collection)
                  </Label>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={(value: CampaignStatus) => handleInputChange('status', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((status) => (
                        <SelectItem 
                          key={status.value} 
                          value={status.value}
                          disabled={status.value === 'active' && campaign.status !== 'active' && !isSetupComplete()}
                        >
                          {status.label}
                          {status.value === 'active' && campaign.status !== 'active' && !isSetupComplete() && ' (Setup Required)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {campaign.status !== 'active' && !isSetupComplete() && (
                    <p className="text-sm text-muted-foreground">
                      Complete technical setup in "Metrics & Targets" tab to activate
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="client_id">Client</Label>
                    <Select value={formData.client_id} onValueChange={(value) => handleInputChange('client_id', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select client" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name} - {client.company}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="salesperson_id">Salesperson</Label>
                    <Select value={formData.salesperson_id} onValueChange={(value) => handleInputChange('salesperson_id', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select salesperson" />
                      </SelectTrigger>
                      <SelectContent>
                        {salespersons.map((person) => (
                          <SelectItem key={person.id} value={person.id}>
                            {person.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="metrics" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Campaign Metrics & Targets</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <MultiServiceTypeSelector
                  serviceTypes={serviceTypes}
                  onServiceTypesChange={setServiceTypes}
                />
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="desired_daily">Desired Daily</Label>
                    <Input
                      id="desired_daily"
                      type="number"
                      value={formData.desired_daily}
                      onChange={(e) => handleInputChange('desired_daily', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sale_price">Sale Price ($)</Label>
                    <Input
                      id="sale_price"
                      type="number"
                      step="0.01"
                      value={formData.sale_price}
                      onChange={(e) => handleInputChange('sale_price', e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="genre">Genre</Label>
                    <Select value={formData.genre} onValueChange={(value) => handleInputChange('genre', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select genre" />
                      </SelectTrigger>
                      <SelectContent>
                        {GENRE_OPTIONS.map((genre, index) => (
                          <SelectItem key={index} value={genre}>
                            {genre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="manual_progress">Total Views Override</Label>
                    <Input
                      id="manual_progress"
                      type="number"
                      placeholder="Leave 0 for YouTube API tracking"
                      min="0"
                      value={formData.manual_progress}
                      onChange={(e) => handleInputChange('manual_progress', e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.start_date ? format(formData.start_date, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <CalendarComponent
                          mode="single"
                          selected={formData.start_date}
                          onSelect={(date) => handleInputChange('start_date', date)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.end_date ? format(formData.end_date, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <CalendarComponent
                          mode="single"
                          selected={formData.end_date}
                          onSelect={(date) => handleInputChange('end_date', date)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                
                {/* Engagement & Technical Settings */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="minimum_engagement">Minimum Engagement</Label>
                    <Input
                      id="minimum_engagement"
                      type="number"
                      value={formData.minimum_engagement}
                      onChange={(e) => handleInputChange('minimum_engagement', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="wait_time_seconds">Wait Time (seconds)</Label>
                    <Input
                      id="wait_time_seconds"
                      type="number"
                      value={formData.wait_time_seconds}
                      onChange={(e) => handleInputChange('wait_time_seconds', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="like_server">Like Server</Label>
                    <Select value={formData.like_server} onValueChange={(value) => handleInputChange('like_server', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select server" />
                      </SelectTrigger>
                      <SelectContent>
                        {LIKE_SERVER_OPTIONS.map((server, index) => (
                          <SelectItem key={index} value={server}>
                            {server}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="comment_server">Comment Server</Label>
                    <Select value={formData.comment_server} onValueChange={(value) => handleInputChange('comment_server', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select server" />
                      </SelectTrigger>
                      <SelectContent>
                        {COMMENT_SERVER_OPTIONS.map((server, index) => (
                          <SelectItem key={index} value={server}>
                            {server}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sheet_tier">Sheet Tier</Label>
                    <Select value={formData.sheet_tier} onValueChange={(value) => handleInputChange('sheet_tier', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select tier" />
                      </SelectTrigger>
                      <SelectContent>
                        {SHEET_TIER_OPTIONS.map((tier) => (
                          <SelectItem key={tier.value} value={tier.value}>
                            {tier.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="comments_sheet_url">Comments Sheet URL</Label>
                  <Input
                    id="comments_sheet_url"
                    value={formData.comments_sheet_url}
                    onChange={(e) => handleInputChange('comments_sheet_url', e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/..."
                  />
                </div>

                {/* Boolean flags */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="needs_update"
                      checked={formData.needs_update}
                      onCheckedChange={(checked) => handleInputChange('needs_update', checked)}
                    />
                    <Label htmlFor="needs_update">Needs Update</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="confirm_start_date"
                      checked={formData.confirm_start_date}
                      onCheckedChange={(checked) => handleInputChange('confirm_start_date', checked)}
                    />
                    <Label htmlFor="confirm_start_date">Confirm Start Date</Label>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="views_stalled"
                      checked={formData.views_stalled}
                      onCheckedChange={(checked) => handleInputChange('views_stalled', checked)}
                    />
                    <Label htmlFor="views_stalled">Views Stalled</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="ask_for_access"
                      checked={formData.ask_for_access}
                      onCheckedChange={(checked) => handleInputChange('ask_for_access', checked)}
                    />
                    <Label htmlFor="ask_for_access">Ask for Access</Label>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ratio-fixer" className="space-y-4">
            <RatioFixerContent 
              campaign={campaign} 
              formData={formData}
              onInputChange={handleInputChange}
            />
          </TabsContent>

          <TabsContent value="results" className="space-y-6">
            {/* Campaign Health & Status */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Campaign Health & Status</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Current Status</span>
                    <Badge variant={campaign.status === 'active' ? 'default' : campaign.status === 'complete' ? 'default' : 'secondary'}>
                      {campaign.status}
                    </Badge>
                  </div>
                  {campaign.views_stalled && (
                    <div className="flex items-center gap-2 text-sm text-destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <span>Campaign is stalling</span>
                    </div>
                  )}
                  {campaign.in_fixer && (
                    <div className="flex items-center gap-2 text-sm text-warning mt-1">
                      <Clock className="h-4 w-4" />
                      <span>In Ratio Fixer</span>
                    </div>
                  )}
                  {campaign.stalling_detected_at && (
                    <div className="mt-2 pt-2 border-t border-border">
                      <div className="text-xs text-muted-foreground">
                        Stalling detected: {new Date(campaign.stalling_detected_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  )}
                </Card>
                <Card className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Health Score</span>
                    <Badge variant={(() => {
                      const healthScore = calculateHealthScore(campaign);
                      return healthScore >= 75 ? 'default' : healthScore >= 60 ? 'secondary' : 'destructive';
                    })()}>
                      {calculateHealthScore(campaign)}%
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Based on view progress and engagement metrics
                  </div>
                </Card>
              </div>
            </div>

            {/* Current Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Views</CardTitle>
                  <Eye className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatNumber(campaign.current_views || 0)}</div>
                  {dailyStats.length >= 2 && (
                    <div className="flex items-center text-xs text-muted-foreground">
                      {getTrendIcon(calculateTrend(
                        dailyStats[dailyStats.length - 1]?.views || campaign.current_views || 0, 
                        dailyStats[dailyStats.length - 2]?.views || 0
                      ))}
                      <span className="ml-1">
                        {calculateTrend(
                          dailyStats[dailyStats.length - 1]?.views || campaign.current_views || 0, 
                          dailyStats[dailyStats.length - 2]?.views || 0
                        ).toFixed(1)}% from last data point
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Likes</CardTitle>
                  <Heart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatNumber(campaign.current_likes || 0)}</div>
                  {dailyStats.length >= 2 && (
                    <div className="flex items-center text-xs text-muted-foreground">
                      {getTrendIcon(calculateTrend(
                        dailyStats[dailyStats.length - 1]?.likes || campaign.current_likes || 0, 
                        dailyStats[dailyStats.length - 2]?.likes || 0
                      ))}
                      <span className="ml-1">
                        {calculateTrend(
                          dailyStats[dailyStats.length - 1]?.likes || campaign.current_likes || 0, 
                          dailyStats[dailyStats.length - 2]?.likes || 0
                        ).toFixed(1)}% from last data point
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Comments</CardTitle>
                  <MessageCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatNumber(campaign.current_comments || 0)}</div>
                  {dailyStats.length >= 2 && (
                    <div className="flex items-center text-xs text-muted-foreground">
                      {getTrendIcon(calculateTrend(
                        dailyStats[dailyStats.length - 1]?.comments || campaign.current_comments || 0, 
                        dailyStats[dailyStats.length - 2]?.comments || 0
                      ))}
                      <span className="ml-1">
                        {calculateTrend(
                          dailyStats[dailyStats.length - 1]?.comments || campaign.current_comments || 0, 
                          dailyStats[dailyStats.length - 2]?.comments || 0
                        ).toFixed(1)}% from last data point
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Subscribers</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {campaign.subscribers_hidden ? 'Hidden' : formatNumber(getLatestSubscriberCount())}
                  </div>
                  {!campaign.subscribers_hidden && dailyStats.length >= 2 && (
                    <div className="flex items-center text-xs text-muted-foreground">
                      {dailyStats[dailyStats.length - 1]?.subscribers_gained > 0 ? (
                        <>
                          <TrendingUp className="w-4 h-4 text-green-500" />
                          <span className="ml-1">+{formatNumber(dailyStats[dailyStats.length - 1]?.subscribers_gained || 0)} today</span>
                        </>
                      ) : dailyStats[dailyStats.length - 1]?.subscribers_gained < 0 ? (
                        <>
                          <TrendingDown className="w-4 h-4 text-red-500" />
                          <span className="ml-1">{formatNumber(dailyStats[dailyStats.length - 1]?.subscribers_gained || 0)} today</span>
                        </>
                      ) : (
                        <>
                          <Minus className="w-4 h-4 text-gray-500" />
                          <span className="ml-1">No change today</span>
                        </>
                      )}
                    </div>
                  )}
                  {campaign.subscribers_hidden && (
                    <div className="text-xs text-muted-foreground">
                      Subscriber count hidden by channel
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Daily Growth Charts */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Daily Performance Trends (3x Daily Collection)
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={fetchDailyStats}
                      disabled={loadingStats || refreshingYouTubeData}
                    >
                      {loadingStats ? "Loading..." : "Refresh Display"}
                    </Button>
                    <Button 
                      variant="default" 
                      size="sm" 
                      onClick={handleRefreshYouTubeData}
                      disabled={refreshingYouTubeData || loadingStats}
                    >
                      {refreshingYouTubeData ? "Fetching..." : "Fetch Fresh Data"}
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dailyStats.length === 0 ? (
                  <div className="h-80 flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <div className="text-lg mb-2">No historical data available</div>
                      <div className="text-sm">
                        {campaign.youtube_api_enabled 
                          ? "Data collection will begin automatically. Check back in 24 hours." 
                          : "Enable YouTube API tracking in Basic Info to start collecting data."
                        }
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart 
                        data={dailyStats.map(stat => ({
                          dateTime: `${format(new Date(stat.date), 'MMM dd')} ${stat.time_of_day === 'morning' ? 'AM' : stat.time_of_day === 'afternoon' ? 'PM' : 'Eve'}`,
                          date: format(new Date(stat.date), 'MMM dd'),
                          timeOfDay: stat.time_of_day,
                          views: stat.views,
                          likes: stat.likes,
                          comments: stat.comments,
                          subscribers: stat.total_subscribers || 0,
                          collected_at: stat.collected_at
                        }))}
                        margin={{ top: 5, right: 30, left: 20, bottom: 60 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="dateTime"
                          tick={{ fontSize: 12 }}
                          angle={-45}
                          textAnchor="end"
                          height={60}
                        />
                        <YAxis />
                        <Tooltip 
                          formatter={(value: number, name: string) => [
                            value.toLocaleString(),
                            name.charAt(0).toUpperCase() + name.slice(1)
                          ]}
                          labelFormatter={(label) => `${label}`}
                        />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="views" 
                          stroke="hsl(var(--primary))" 
                          strokeWidth={2} 
                          name="Views"
                          dot={{ r: 3 }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="likes" 
                          stroke="hsl(var(--destructive))" 
                          strokeWidth={2} 
                          name="Likes"
                          dot={{ r: 3 }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="comments" 
                          stroke="hsl(var(--muted-foreground))" 
                          strokeWidth={2} 
                          name="Comments"
                          dot={{ r: 3 }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="subscribers" 
                          stroke="hsl(var(--accent-foreground))" 
                          strokeWidth={2} 
                          name="Subscribers"
                          dot={{ r: 3 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Progress Information */}
            <Card>
              <CardHeader>
                <CardTitle>Progress Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Views Progress</span>
                    <span>{Math.round(((campaign.current_views || 0) / (campaign.goal_views || 1)) * 100)}%</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full" 
                      style={{
                        width: `${Math.min(((campaign.current_views || 0) / (campaign.goal_views || 1)) * 100, 100)}%`
                      }}
                    ></div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Engagement Rate</div>
                    <div className="font-semibold">
                      {campaign.current_views > 0 ? 
                        (((campaign.current_likes || 0) + (campaign.current_comments || 0)) / campaign.current_views * 100).toFixed(2) + '%' 
                        : '0%'
                      }
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Days Running</div>
                    <div className="font-semibold">
                      {campaign.start_date ? 
                        Math.max(0, Math.floor((new Date().getTime() - new Date(campaign.start_date).getTime()) / (1000 * 60 * 60 * 24)))
                        : 'Not started'
                      }
                    </div>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground bg-muted p-3 rounded">
                  <strong>Tracking Schedule:</strong> Data is collected automatically 3 times daily (8 AM, 2 PM, 8 PM EST). 
                  Subscriber counts are tracked once daily in the morning. Tracking stops when campaign is marked as complete.
                </div>
              </CardContent>
            </Card>
            
            {campaign.last_youtube_fetch && (
              <div className="text-xs text-muted-foreground text-center">
                Last YouTube API fetch: {format(new Date(campaign.last_youtube_fetch), 'MMM dd, yyyy at h:mm a')}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <div className="flex gap-2">
            <Button 
              variant="outline"
              onClick={handleSave} 
              disabled={loading}
            >
              {loading ? "Saving..." : "Save Changes"}
            </Button>
            {campaign.status === 'pending' && isSetupComplete() && (
              <Button 
                onClick={handleActivateCampaign}
                disabled={loading}
              >
                {loading ? "Activating..." : "Complete Setup & Activate"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};