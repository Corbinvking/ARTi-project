import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, MessageCircle, TrendingUp } from 'lucide-react';
import { PublicCampaignData } from '../hooks/usePublicCampaign';

interface PerformanceMetricsProps {
  campaign: PublicCampaignData;
}

const PerformanceMetrics = ({ campaign }: PerformanceMetricsProps) => {
  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString();
  };

  const formatPercentage = (num: number) => {
    return `${num.toFixed(2)}%`;
  };

  const metrics = [
    {
      title: 'Total Views',
      value: formatNumber(campaign.metrics.total_views),
      icon: Eye,
      color: 'text-blue-600',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Comments',
      value: formatNumber(campaign.metrics.total_comments),
      icon: MessageCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-500/10',
    },
    {
      title: 'Engagement',
      value: formatPercentage(campaign.metrics.avg_engagement_rate),
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-500/10',
    },
  ];

  return (
    <div className="mb-8">
      <h2 className="text-xl font-semibold text-foreground mb-4">Performance Metrics</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {metrics.map((metric, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {metric.title}
              </CardTitle>
              <div className={`p-2 rounded-full ${metric.bgColor}`}>
                <metric.icon className={`h-4 w-4 ${metric.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${metric.color}`}>
                {metric.value}
              </div>
              {campaign.posts_live > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Based on {campaign.posts_live} live posts
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {campaign.posts_live === 0 && (
        <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          <p className="text-amber-700 text-sm">
            <strong>Note:</strong> Performance metrics are estimated based on creator statistics. 
            Actual performance will be displayed once posts go live.
          </p>
        </div>
      )}
    </div>
  );
};

export default PerformanceMetrics;