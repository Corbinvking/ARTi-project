"use client"

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, FunnelChart, Funnel, LabelList
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Users, Target, 
  Zap, Award, AlertTriangle, CheckCircle,
  Brain, Lightbulb, Settings, Filter
} from 'lucide-react';

interface CohortData {
  cohort: string;
  month0: number;
  month1: number;
  month2: number;
  month3: number;
  month6: number;
  month12: number;
}

interface FunnelData {
  stage: string;
  value: number;
  color: string;
}

interface CompetitiveMetric {
  metric: string;
  ourValue: number;
  industryAvg: number;
  benchmark: number;
  trend: 'up' | 'down' | 'stable';
}

export const BusinessIntelligence = () => {
  const [loading, setLoading] = useState(true);
  const [selectedCohort, setSelectedCohort] = useState('2024-01');
  const [selectedTimeframe, setSelectedTimeframe] = useState('6m');

  // Mock cohort analysis data
  const cohortData: CohortData[] = [
    { cohort: '2024-01', month0: 100, month1: 85, month2: 72, month3: 65, month6: 58, month12: 52 },
    { cohort: '2024-02', month0: 100, month1: 88, month2: 75, month3: 68, month6: 61, month12: 0 },
    { cohort: '2024-03', month0: 100, month1: 82, month2: 69, month3: 62, month6: 55, month12: 0 },
    { cohort: '2024-04', month0: 100, month1: 90, month2: 78, month3: 71, month6: 0, month12: 0 },
  ];

  // Mock funnel data
  const funnelData: FunnelData[] = [
    { stage: 'Website Visitors', value: 10000, color: '#8884d8' },
    { stage: 'Inquiries Submitted', value: 1200, color: '#82ca9d' },
    { stage: 'Applications Reviewed', value: 800, color: '#ffc658' },
    { stage: 'Members Admitted', value: 300, color: '#ff7c7c' },
    { stage: 'Active Contributors', value: 240, color: '#8dd1e1' },
  ];

  // Mock competitive analysis
  const competitiveMetrics: CompetitiveMetric[] = [
    { metric: 'Member Retention Rate', ourValue: 78, industryAvg: 65, benchmark: 85, trend: 'up' },
    { metric: 'Campaign Completion Rate', ourValue: 92, industryAvg: 75, benchmark: 90, trend: 'up' },
    { metric: 'Revenue Per Member', ourValue: 145, industryAvg: 120, benchmark: 180, trend: 'stable' },
    { metric: 'Time to First Support', ourValue: 2.3, industryAvg: 4.1, benchmark: 1.8, trend: 'down' },
  ];

  // Mock insights and recommendations
  const insights = [
    {
      type: 'opportunity',
      title: 'Genre Expansion Opportunity',
      description: 'Electronic music submissions have 40% higher approval rates but represent only 15% of total submissions.',
      impact: 'High',
      action: 'Launch targeted recruitment campaign for electronic music producers'
    },
    {
      type: 'warning',
      title: 'Member Churn Risk',
      description: 'Members with <3 supports in first month have 75% churn rate.',
      impact: 'High',
      action: 'Implement early engagement program for new members'
    },
    {
      type: 'success',
      title: 'Peak Performance Window',
      description: 'Submissions posted on Tuesday-Thursday have 25% higher reach.',
      impact: 'Medium',
      action: 'Optimize queue scheduling algorithm for these days'
    },
    {
      type: 'insight',
      title: 'Credit Optimization',
      description: 'Members earning 5-10 credits monthly show highest lifetime value.',
      impact: 'Medium',
      action: 'Adjust credit earning mechanics to target this range'
    },
  ];

  useEffect(() => {
    // Simulate data loading
    const timer = setTimeout(() => setLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'opportunity': return <Target className="h-5 w-5 text-blue-500" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'success': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'insight': return <Lightbulb className="h-5 w-5 text-purple-500" />;
      default: return <Brain className="h-5 w-5" />;
    }
  };

  const getInsightBadge = (impact: string) => {
    const variants = {
      High: 'destructive',
      Medium: 'default',
      Low: 'secondary'
    } as const;
    return <Badge variant={variants[impact as keyof typeof variants]}>{impact} Impact</Badge>;
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <div className="h-4 w-4 bg-gray-400 rounded-full" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-[600px] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Analyzing business intelligence data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Business Intelligence</h2>
          <p className="text-muted-foreground">
            Advanced analytics, cohort analysis, and competitive insights
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3m">3 months</SelectItem>
              <SelectItem value="6m">6 months</SelectItem>
              <SelectItem value="1y">1 year</SelectItem>
              <SelectItem value="2y">2 years</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="cohorts" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="cohorts">Cohort Analysis</TabsTrigger>
          <TabsTrigger value="funnels">Conversion Funnels</TabsTrigger>
          <TabsTrigger value="competitive">Competitive Analysis</TabsTrigger>
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
          <TabsTrigger value="experiments">A/B Testing</TabsTrigger>
        </TabsList>

        <TabsContent value="cohorts" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Member Retention Cohorts
                </CardTitle>
                <CardDescription>
                  Track member engagement and retention over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Select value={selectedCohort} onValueChange={setSelectedCohort}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {cohortData.map((cohort) => (
                        <SelectItem key={cohort.cohort} value={cohort.cohort}>
                          {cohort.cohort} Cohort
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="space-y-3">
                    {cohortData.map((cohort) => (
                      <div key={cohort.cohort} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">{cohort.cohort}</span>
                          <span className="text-sm text-muted-foreground">
                            {cohort.month6 || cohort.month3 || cohort.month2 || cohort.month1}% retained
                          </span>
                        </div>
                        <div className="flex gap-1">
                          <div className="w-8 h-6 bg-green-500 rounded-sm flex items-center justify-center">
                            <span className="text-xs text-white">100</span>
                          </div>
                          <div className="w-8 h-6 bg-green-400 rounded-sm flex items-center justify-center">
                            <span className="text-xs text-white">{cohort.month1}</span>
                          </div>
                          <div className="w-8 h-6 bg-yellow-400 rounded-sm flex items-center justify-center">
                            <span className="text-xs text-white">{cohort.month2}</span>
                          </div>
                          <div className="w-8 h-6 bg-orange-400 rounded-sm flex items-center justify-center">
                            <span className="text-xs text-white">{cohort.month3}</span>
                          </div>
                          {cohort.month6 > 0 && (
                            <div className="w-8 h-6 bg-red-400 rounded-sm flex items-center justify-center">
                              <span className="text-xs text-white">{cohort.month6}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Retention Trends</CardTitle>
                <CardDescription>Average retention across all cohorts</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={cohortData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="cohort" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="month1" stroke="#10b981" name="Month 1" />
                    <Line type="monotone" dataKey="month3" stroke="#f59e0b" name="Month 3" />
                    <Line type="monotone" dataKey="month6" stroke="#ef4444" name="Month 6" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="funnels" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Member Acquisition Funnel
                </CardTitle>
                <CardDescription>
                  Conversion rates from visitor to active member
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <FunnelChart>
                    <Funnel
                      dataKey="value"
                      data={funnelData}
                      isAnimationActive
                    >
                      <LabelList position="center" fill="#fff" stroke="none" />
                    </Funnel>
                    <Tooltip />
                  </FunnelChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Conversion Metrics</CardTitle>
                <CardDescription>Key conversion rates and drop-off points</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm">Visitor to Inquiry</span>
                      <span className="text-sm font-medium">12%</span>
                    </div>
                    <Progress value={12} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm">Inquiry to Application</span>
                      <span className="text-sm font-medium">67%</span>
                    </div>
                    <Progress value={67} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm">Application to Admission</span>
                      <span className="text-sm font-medium">38%</span>
                    </div>
                    <Progress value={38} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm">Admission to Active</span>
                      <span className="text-sm font-medium">80%</span>
                    </div>
                    <Progress value={80} className="h-2" />
                  </div>
                </div>

                <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium mb-2">Optimization Opportunities</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Improve inquiry-to-application conversion (+15% potential)</li>
                    <li>• Streamline application review process</li>
                    <li>• Enhance onboarding for new admissions</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="competitive" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Competitive Benchmarking
              </CardTitle>
              <CardDescription>
                How we compare against industry averages and best practices
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {competitiveMetrics.map((metric, index) => (
                  <div key={index} className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{metric.metric}</span>
                      {getTrendIcon(metric.trend)}
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Our Performance</span>
                        <span className="font-medium">{metric.ourValue}{metric.metric.includes('Time') ? ' days' : '%'}</span>
                      </div>
                      <Progress 
                        value={(metric.ourValue / Math.max(metric.benchmark, metric.ourValue)) * 100} 
                        className="h-2" 
                      />
                      
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Industry Avg: {metric.industryAvg}{metric.metric.includes('Time') ? ' days' : '%'}</span>
                        <span>Best-in-Class: {metric.benchmark}{metric.metric.includes('Time') ? ' days' : '%'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  AI-Powered Insights
                </CardTitle>
                <CardDescription>
                  Automated analysis and actionable recommendations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {insights.map((insight, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        {getInsightIcon(insight.type)}
                        <div className="flex-1 space-y-2">
                          <div className="flex justify-between items-start">
                            <h4 className="font-medium">{insight.title}</h4>
                            {getInsightBadge(insight.impact)}
                          </div>
                          <p className="text-sm text-muted-foreground">{insight.description}</p>
                          <div className="bg-muted/50 p-3 rounded">
                            <p className="text-sm"><strong>Recommended Action:</strong> {insight.action}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Insight Impact Summary</CardTitle>
                <CardDescription>Potential impact of implementing recommendations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div>
                      <p className="font-medium text-green-700 dark:text-green-300">Revenue Impact</p>
                      <p className="text-sm text-green-600 dark:text-green-400">Potential monthly increase</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-green-700 dark:text-green-300">+18%</p>
                      <p className="text-sm text-green-600 dark:text-green-400">$2,400</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div>
                      <p className="font-medium text-blue-700 dark:text-blue-300">Member Retention</p>
                      <p className="text-sm text-blue-600 dark:text-blue-400">Expected improvement</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">+12%</p>
                      <p className="text-sm text-blue-600 dark:text-blue-400">~48 members</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <div>
                      <p className="font-medium text-purple-700 dark:text-purple-300">Operational Efficiency</p>
                      <p className="text-sm text-purple-600 dark:text-purple-400">Time saved per week</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">8hrs</p>
                      <p className="text-sm text-purple-600 dark:text-purple-400">25% reduction</p>
                    </div>
                  </div>
                </div>

                <Button className="w-full mt-4">
                  Generate Implementation Plan
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="experiments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                A/B Testing Framework
              </CardTitle>
              <CardDescription>
                Design and track experiments to optimize platform performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Settings className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">A/B Testing Coming Soon</h3>
                <p className="text-muted-foreground mb-4">
                  Advanced experimentation framework for testing queue algorithms, 
                  engagement strategies, and conversion optimizations.
                </p>
                <Button variant="outline">
                  Request Early Access
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};