'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
  Area,
  ComposedChart,
} from 'recharts';
import {
  Calendar,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  TrendingUp,
  Sparkles,
  Target,
  DollarSign,
  Play,
  Settings,
  ChevronDown,
  CheckCircle2,
  ArrowLeft,
  Loader2,
} from 'lucide-react';
import { format, subDays, eachDayOfInterval } from 'date-fns';
import { supabase } from '@/lib/auth';

// Types for the dashboard
interface CampaignAnalyticsData {
  campaignName: string;
  campaignCount: number;
  createdDate: string;
  totalBudget: number;
  spentBudget: number;
  currency: string;
  
  // Main metrics
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  engagementRate: number;
  
  // Secondary metrics
  livePosts: number;
  avgCostPerView: number;
  sentimentScore: number;
  relevanceScore: number;
  
  // Time series data
  timeSeriesData: TimeSeriesPoint[];
}

interface TimeSeriesPoint {
  date: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  engagement: number;
}

interface CampaignAnalyticsDashboardProps {
  data?: CampaignAnalyticsData;
  isPublic?: boolean;
  campaignId?: string;
}

// Generate mock data for demo
function generateMockData(): CampaignAnalyticsData {
  const startDate = subDays(new Date(), 7);
  const endDate = new Date();
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  
  const timeSeriesData: TimeSeriesPoint[] = days.map((day, index) => {
    const baseViews = 30000 + Math.random() * 20000;
    const baseLikes = 600 + Math.random() * 200;
    const growthFactor = 1 + (index * 0.1);
    
    return {
      date: format(day, 'MMM d, \'yy'),
      views: Math.round(baseViews * growthFactor),
      likes: Math.round(baseLikes * growthFactor),
      comments: Math.round((80 + Math.random() * 40) * growthFactor),
      shares: Math.round((8 + Math.random() * 5) * growthFactor),
      engagement: 2.1 + Math.random() * 0.3,
    };
  });

  return {
    campaignName: 'YOOKiE - THE DARK SiDE OF THE TRASH',
    campaignCount: 1,
    createdDate: 'Nov 17th, 2025',
    totalBudget: 350.00,
    spentBudget: 350.00,
    currency: 'USD',
    
    totalViews: 274817,
    totalLikes: 5358,
    totalComments: 687,
    totalShares: 72,
    engagementRate: 2.23,
    
    livePosts: 6,
    avgCostPerView: 0.0013,
    sentimentScore: 53,
    relevanceScore: 45,
    
    timeSeriesData,
  };
}

// KPI Metric Card Component
function MetricCard({
  title,
  value,
  icon: Icon,
  isSelected = false,
  prefix = '',
  suffix = '',
  color = 'default',
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  isSelected?: boolean;
  prefix?: string;
  suffix?: string;
  color?: 'default' | 'green' | 'blue' | 'purple' | 'orange';
}) {
  const colorClasses = {
    default: 'text-foreground',
    green: 'text-emerald-500',
    blue: 'text-blue-500',
    purple: 'text-purple-500',
    orange: 'text-orange-500',
  };

  return (
    <Card className={`relative transition-all hover:shadow-md ${isSelected ? 'ring-2 ring-primary' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Sparkles className="h-3.5 w-3.5" />
            <span>{title}</span>
          </div>
          {isSelected && (
            <CheckCircle2 className="h-4 w-4 text-primary" />
          )}
        </div>
        <div className={`text-2xl font-bold ${colorClasses[color]}`}>
          {prefix}{typeof value === 'number' ? value.toLocaleString() : value}{suffix}
        </div>
      </CardContent>
    </Card>
  );
}

// Secondary Metric Card (smaller)
function SecondaryMetricCard({
  title,
  value,
  icon: Icon,
  prefix = '',
  suffix = '',
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  prefix?: string;
  suffix?: string;
}) {
  return (
    <Card className="hover:shadow-md transition-all">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
          <Sparkles className="h-3.5 w-3.5" />
          <span>{title}</span>
        </div>
        <div className="text-xl font-semibold">
          {prefix}{typeof value === 'number' ? value.toLocaleString() : value}{suffix}
        </div>
      </CardContent>
    </Card>
  );
}

// Date Range Selector Component
function DateRangeSelector() {
  return (
    <Button variant="outline" className="gap-2 h-9">
      <Calendar className="h-4 w-4" />
      <span className="text-sm">Nov 27th 2025 → December 4th 2025</span>
      <ChevronDown className="h-4 w-4 opacity-50" />
    </Button>
  );
}

// Filter Dropdown Component
function FilterDropdown({ 
  label, 
  options,
  defaultValue,
}: { 
  label: string;
  options: string[];
  defaultValue?: string;
}) {
  return (
    <Select defaultValue={defaultValue || options[0]}>
      <SelectTrigger className="h-9 min-w-[120px]">
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option} value={option.toLowerCase().replace(/\s+/g, '-')}>
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// Chart configuration
const chartConfig = {
  views: {
    label: 'Views',
    color: '#10b981', // emerald-500
  },
  likes: {
    label: 'Likes',
    color: '#eab308', // yellow-500
  },
  comments: {
    label: 'Comments',
    color: '#3b82f6', // blue-500
  },
  shares: {
    label: 'Shares',
    color: '#a855f7', // purple-500
  },
};

// Analytics Chart Component
function AnalyticsChart({ data }: { data: TimeSeriesPoint[] }) {
  const [selectedMetrics, setSelectedMetrics] = useState(['views', 'likes', 'comments', 'shares']);

  // Find the index for "This Week" marker (around the middle)
  const thisWeekIndex = Math.floor(data.length / 2);
  
  return (
    <Card className="mt-6">
      <CardContent className="p-6">
        <div className="flex items-center justify-end mb-4">
          <Button variant="outline" size="sm" className="gap-2">
            <Settings className="h-4 w-4" />
            Metrics
          </Button>
        </div>
        
        <div className="h-[350px] w-full">
          <ChartContainer config={chartConfig} className="h-full w-full">
            <ComposedChart data={data} margin={{ top: 20, right: 80, left: 20, bottom: 20 }}>
              <defs>
                <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                className="text-muted-foreground"
              />
              
              {/* Primary Y-axis for views */}
              <YAxis 
                yAxisId="views"
                orientation="left"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}
                className="text-emerald-500"
              />
              
              {/* Secondary Y-axis for likes/comments */}
              <YAxis 
                yAxisId="engagement"
                orientation="right"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                className="text-yellow-500"
              />
              
              <ChartTooltip 
                content={<ChartTooltipContent />}
                cursor={{ stroke: '#666', strokeDasharray: '4 4' }}
              />
              
              {/* Reference line for "This Week" */}
              <ReferenceLine
                x={data[thisWeekIndex]?.date}
                stroke="#666"
                strokeDasharray="4 4"
                label={{ 
                  value: 'This Week', 
                  position: 'top',
                  fill: '#666',
                  fontSize: 11,
                }}
              />
              
              {/* Reference line for "Today" */}
              <ReferenceLine
                x={data[data.length - 1]?.date}
                stroke="#666"
                strokeDasharray="4 4"
                label={{ 
                  value: 'Today', 
                  position: 'top',
                  fill: '#666',
                  fontSize: 11,
                }}
              />
              
              {/* Area under views line */}
              <Area
                yAxisId="views"
                type="monotone"
                dataKey="views"
                stroke="transparent"
                fill="url(#viewsGradient)"
              />
              
              {/* Views line */}
              <Line
                yAxisId="views"
                type="monotone"
                dataKey="views"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
              
              {/* Likes line */}
              <Line
                yAxisId="engagement"
                type="monotone"
                dataKey="likes"
                stroke="#eab308"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
              
              {/* Comments line */}
              <Line
                yAxisId="engagement"
                type="monotone"
                dataKey="comments"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
              
              {/* Shares line */}
              <Line
                yAxisId="engagement"
                type="monotone"
                dataKey="shares"
                stroke="#a855f7"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
              
              <Legend 
                verticalAlign="bottom"
                height={36}
                iconType="line"
                wrapperStyle={{ paddingTop: 16 }}
              />
            </ComposedChart>
          </ChartContainer>
        </div>
        
        {/* Right-side metric indicators (from screenshot) */}
        <div className="absolute right-10 top-1/2 transform -translate-y-1/2 flex flex-col gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-emerald-500 font-medium">5.4k</span>
            <span className="text-muted-foreground">74</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-emerald-500 font-medium">5.2k</span>
            <span className="text-muted-foreground">73</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-emerald-500 font-medium">5k</span>
            <span className="text-muted-foreground">72</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Main Dashboard Component
export default function CampaignAnalyticsDashboard({
  data: propData,
  isPublic = false,
  campaignId,
}: CampaignAnalyticsDashboardProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('live-post');
  const [campaignData, setCampaignData] = useState<any>(null);
  const [loading, setLoading] = useState(!!campaignId);

  // Fetch campaign data when campaignId is provided
  useEffect(() => {
    async function fetchCampaign() {
      if (!campaignId) return;
      
      try {
        setLoading(true);
        console.log('📊 Fetching campaign data for ID:', campaignId);
        
        const { data: campaign, error } = await supabase
          .from('instagram_campaigns')
          .select('*')
          .eq('id', campaignId)
          .single();
        
        if (error) {
          console.error('❌ Error fetching campaign:', error);
          return;
        }
        
        console.log('✅ Loaded campaign:', campaign?.campaign);
        setCampaignData(campaign);
      } catch (err) {
        console.error('❌ Error:', err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchCampaign();
  }, [campaignId]);

  // Parse currency value from string like "$350.00" to number
  const parseCurrency = (value: string | number | null | undefined): number => {
    if (!value) return 0;
    if (typeof value === 'number') return value;
    return parseFloat(value.replace(/[^0-9.]/g, '')) || 0;
  };

  // Build analytics data from campaign or use mock data
  const buildAnalyticsData = (): CampaignAnalyticsData => {
    if (propData) return propData;
    
    const mockTimeSeries = generateMockData().timeSeriesData;
    
    if (campaignData) {
      const budget = parseCurrency(campaignData.price);
      const spent = parseCurrency(campaignData.spend);
      
      return {
        campaignName: campaignData.campaign || 'Untitled Campaign',
        campaignCount: 1,
        createdDate: campaignData.start_date || campaignData.created_at?.split('T')[0] || 'Unknown',
        totalBudget: budget,
        spentBudget: spent,
        currency: 'USD',
        
        // Mock analytics metrics (will be replaced with real API data later)
        totalViews: Math.round(spent * 2000 + Math.random() * 50000),
        totalLikes: Math.round(spent * 15 + Math.random() * 1000),
        totalComments: Math.round(spent * 2 + Math.random() * 200),
        totalShares: Math.round(spent * 0.2 + Math.random() * 50),
        engagementRate: 2 + Math.random() * 1.5,
        
        livePosts: Math.floor(Math.random() * 10) + 1,
        avgCostPerView: budget > 0 ? budget / (spent * 2000 + 50000) : 0.001,
        sentimentScore: Math.round(40 + Math.random() * 30),
        relevanceScore: Math.round(35 + Math.random() * 35),
        
        timeSeriesData: mockTimeSeries,
      };
    }
    
    return generateMockData();
  };

  const data = buildAnalyticsData();
  
  // Calculate budget progress
  const budgetProgress = data.totalBudget > 0 ? (data.spentBudget / data.totalBudget) * 100 : 0;

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading campaign analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header with branding and back button */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {!isPublic && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => router.push('/instagram/campaigns')}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Campaigns
              </Button>
            )}
            <div className="bg-gradient-to-r from-red-500 to-pink-500 text-white font-bold px-3 py-1.5 rounded text-sm tracking-tight">
              ARTIST<br />INFLUENCE
            </div>
          </div>
          <div className="text-xl font-light tracking-wide text-muted-foreground">
            co:brand
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {/* Campaign Title & Meta */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-3">
            <h1 className="text-3xl font-bold">{data.campaignName}</h1>
            {campaignData?.clients && (
              <Badge variant="outline" className="text-sm">
                {campaignData.clients}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <span>{data.campaignCount} Campaign</span>
            <span>Created {data.createdDate}</span>
            <div className="flex items-center gap-3">
              <span>Total Budget: {data.currency} ${data.totalBudget.toFixed(2)}</span>
              <div className="w-24">
                <Progress 
                  value={budgetProgress} 
                  className="h-2"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Analytics Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="bg-transparent border-b w-full justify-start rounded-none h-auto p-0 gap-0">
            <TabsTrigger 
              value="live-post" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 pb-3 pt-0"
            >
              Live Post Analytics
            </TabsTrigger>
            <TabsTrigger 
              value="sound" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 pb-3 pt-0"
            >
              Sound Analytics
            </TabsTrigger>
            <TabsTrigger 
              value="campaign" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 pb-3 pt-0"
            >
              Campaign Analytics
            </TabsTrigger>
            <TabsTrigger 
              value="country" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 pb-3 pt-0"
            >
              Country Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="live-post" className="mt-6">
            {/* Filters Row */}
            <div className="flex items-center gap-4 mb-6 flex-wrap">
              <DateRangeSelector />
              <FilterDropdown label="Platforms" options={['All Platforms', 'Instagram', 'TikTok', 'YouTube']} />
              <FilterDropdown label="Country" options={['Country', 'United States', 'United Kingdom', 'Global']} />
              <FilterDropdown label="Campaigns" options={['All Campaigns', 'Active Only', 'Completed']} />
            </div>

            {/* Primary KPI Cards - Row 1 */}
            <div className="grid grid-cols-5 gap-4 mb-4">
              <MetricCard
                title="Total Views"
                value={data.totalViews}
                icon={Eye}
                isSelected={true}
                color="green"
              />
              <MetricCard
                title="Total Likes"
                value={data.totalLikes}
                icon={Heart}
                isSelected={true}
              />
              <MetricCard
                title="Total Comments"
                value={data.totalComments}
                icon={MessageCircle}
                isSelected={true}
              />
              <MetricCard
                title="Total Shares"
                value={data.totalShares}
                icon={Share2}
                isSelected={true}
              />
              <MetricCard
                title="Engagement Rate"
                value={data.engagementRate.toFixed(2)}
                icon={TrendingUp}
                isSelected={true}
                suffix="%"
                color="orange"
              />
            </div>

            {/* Secondary KPI Cards - Row 2 */}
            <div className="grid grid-cols-4 gap-4">
              <SecondaryMetricCard
                title="Live Posts"
                value={data.livePosts}
                icon={Play}
              />
              <SecondaryMetricCard
                title="Avg. Cost Per View"
                value={data.avgCostPerView.toFixed(4)}
                icon={DollarSign}
                prefix="$"
              />
              <SecondaryMetricCard
                title="Sentiment Score"
                value={data.sentimentScore}
                icon={Sparkles}
                suffix="%"
              />
              <SecondaryMetricCard
                title="Relevance Score"
                value={data.relevanceScore}
                icon={Target}
                suffix="%"
              />
            </div>

            {/* Analytics Chart */}
            <AnalyticsChart data={data.timeSeriesData} />
          </TabsContent>

          <TabsContent value="sound" className="mt-6">
            <div className="text-center py-16 text-muted-foreground">
              <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">Sound Analytics Coming Soon</h3>
              <p>Track sound performance, saves, and usage across posts.</p>
            </div>
          </TabsContent>

          <TabsContent value="campaign" className="mt-6">
            <div className="text-center py-16 text-muted-foreground">
              <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">Campaign Analytics Coming Soon</h3>
              <p>Deep dive into campaign performance and ROI metrics.</p>
            </div>
          </TabsContent>

          <TabsContent value="country" className="mt-6">
            <div className="text-center py-16 text-muted-foreground">
              <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">Country Analytics Coming Soon</h3>
              <p>Geographic breakdown of campaign reach and engagement.</p>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

