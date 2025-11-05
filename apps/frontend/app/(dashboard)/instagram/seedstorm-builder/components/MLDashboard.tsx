import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { 
  Brain, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2,
  BarChart3,
  Zap,
  RefreshCw,
  Database,
  Target
} from "lucide-react";
import { useMLMetrics } from "../hooks/useMLMetrics";
import { MLModelHealthWidget } from "./MLModelHealthWidget";
import { DataQualityWidget } from "./DataQualityWidget";
import { MLPerformanceChart } from "./MLPerformanceChart";
import { ABTestResults } from "./ABTestResults";

interface MLDashboardProps {
  creators: any[];
  campaigns: any[];
}

export const MLDashboard = ({ creators, campaigns }: MLDashboardProps) => {
  const { 
    modelMetrics, 
    dataQuality, 
    performanceHistory, 
    abTests,
    loading,
    refreshMetrics 
  } = useMLMetrics();

  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshMetrics();
    setRefreshing(false);
  };

  const getHealthStatus = () => {
    if (!modelMetrics) return { status: 'unknown', color: 'secondary' };
    
    const accuracy = modelMetrics.latest_accuracy || 0;
    if (accuracy >= 0.85) return { status: 'healthy', color: 'success' };
    if (accuracy >= 0.7) return { status: 'warning', color: 'warning' };
    return { status: 'critical', color: 'destructive' };
  };

  const healthStatus = getHealthStatus();

  return (
    <div className="space-y-6">
      {/* ML System Header */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Brain className="h-6 w-6 text-primary" />
              <div>
                <CardTitle className="text-2xl">ML Algorithm Dashboard</CardTitle>
                <CardDescription>
                  Monitor algorithm performance, data quality, and learning progress
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={healthStatus.color as any} className="gap-2">
                {healthStatus.status === 'healthy' && <CheckCircle2 className="h-4 w-4" />}
                {healthStatus.status === 'warning' && <AlertTriangle className="h-4 w-4" />}
                {healthStatus.status === 'critical' && <AlertTriangle className="h-4 w-4" />}
                System {healthStatus.status}
              </Badge>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              Model Accuracy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {modelMetrics?.latest_accuracy ? `${(modelMetrics.latest_accuracy * 100).toFixed(1)}%` : 'N/A'}
            </div>
            <Progress 
              value={(modelMetrics?.latest_accuracy || 0) * 100} 
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Database className="h-4 w-4 text-blue-500" />
              Data Coverage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dataQuality?.coverage_percentage ? `${dataQuality.coverage_percentage.toFixed(1)}%` : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Creators with ML features
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-green-500" />
              Active A/B Tests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {abTests?.filter(test => test.status === 'active').length || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Running experiments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-500" />
              Learning Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {modelMetrics?.improvement_rate ? `+${(modelMetrics.improvement_rate * 100).toFixed(1)}%` : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              vs. previous week
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tabs */}
      <Tabs defaultValue="health" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="health" className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Health
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="data" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Data Quality
          </TabsTrigger>
          <TabsTrigger value="experiments" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            A/B Tests
          </TabsTrigger>
        </TabsList>

        <TabsContent value="health" className="space-y-6">
          <MLModelHealthWidget 
            modelMetrics={modelMetrics} 
            loading={loading}
          />
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <MLPerformanceChart 
            performanceHistory={performanceHistory}
            loading={loading}
          />
        </TabsContent>

        <TabsContent value="data" className="space-y-6">
          <DataQualityWidget 
            dataQuality={dataQuality}
            creatorsCount={creators.length}
            campaignsCount={campaigns.length}
            loading={loading}
          />
        </TabsContent>

        <TabsContent value="experiments" className="space-y-6">
          <ABTestResults 
            abTests={abTests}
            loading={loading}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};