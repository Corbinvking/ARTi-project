"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { Alert, AlertDescription } from "./ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import { 
  Target, 
  Activity, 
  Gauge, 
  Zap,
  CheckCircle2,
  AlertCircle,
  Database,
  TrendingUp,
  ChevronDown,
  ChevronRight,
  Info
} from "lucide-react";
import { useState } from "react";

interface MLMetricExplanationCardsProps {
  className?: string;
}

interface MetricExplanation {
  id: string;
  title: string;
  icon: React.ReactNode;
  description: string;
  purpose: string;
  currentStatus: {
    dataAvailable: boolean;
    completeness: number;
    status: 'ready' | 'partial' | 'insufficient';
  };
  dataRequirements: string[];
  expectedBehavior: string;
  integrationNotes: string;
}

export function MLMetricExplanationCards({ className }: MLMetricExplanationCardsProps) {
  const [openCards, setOpenCards] = useState<string[]>([]);

  const toggleCard = (cardId: string) => {
    setOpenCards(prev => 
      prev.includes(cardId) 
        ? prev.filter(id => id !== cardId)
        : [...prev, cardId]
    );
  };

  const metrics: MetricExplanation[] = [
    {
      id: 'accuracy',
      title: 'Algorithm Accuracy',
      icon: <Target className="h-5 w-5 text-success" />,
      description: 'Measures how precisely the ML algorithm predicts campaign performance outcomes compared to actual results.',
      purpose: 'This metric tracks the reliability of our predictive models in forecasting stream counts, engagement rates, and campaign success. Higher accuracy means better budget allocation and more reliable campaign planning.',
      currentStatus: {
        dataAvailable: true,
        completeness: 25,
        status: 'insufficient'
      },
      dataRequirements: [
        'Historical campaign performance data (minimum 50 campaigns)',
        'Actual vs predicted stream counts',
        'Vendor performance history across multiple campaigns',
        'Seasonal performance variations',
        'Genre-specific performance patterns'
      ],
      expectedBehavior: 'With sufficient data, accuracy should reach 85-95%. The algorithm will learn from prediction errors and continuously improve. You\'ll see accuracy increase over time as more campaigns are processed.',
      integrationNotes: 'Ready for SFA integration. Once connected, real-time campaign data will automatically improve accuracy calculations. Historical data import will provide immediate baseline improvements.'
    },
    {
      id: 'learning_rate',
      title: 'Learning Rate',
      icon: <Activity className="h-5 w-5 text-primary" />,
      description: 'Shows how quickly the ML model adapts and learns from new campaign data and performance outcomes.',
      purpose: 'Indicates the speed at which our algorithms incorporate new insights. A healthy learning rate means the system stays current with market trends, seasonal changes, and evolving vendor performance patterns.',
      currentStatus: {
        dataAvailable: true,
        completeness: 30,
        status: 'partial'
      },
      dataRequirements: [
        'Daily campaign performance updates',
        'Weekly vendor performance reports',
        'Real-time streaming data from SFA',
        'Market trend indicators',
        'Seasonal adjustment factors'
      ],
      expectedBehavior: 'Optimal learning rate is 2-4 adaptations per day. Too high indicates instability, too low suggests the model isn\'t responsive enough. With more data, you\'ll see consistent daily learning activity.',
      integrationNotes: 'SFA integration will enable real-time learning. The system will automatically process new performance data and adjust predictions within hours of campaign updates.'
    },
    {
      id: 'confidence',
      title: 'Model Confidence',
      icon: <Gauge className="h-5 w-5 text-warning" />,
      description: 'Represents the statistical confidence level of ML predictions and recommendations made by the system.',
      purpose: 'Higher confidence means more reliable predictions for budget allocation, vendor selection, and campaign planning. This helps stakeholders understand prediction reliability for decision-making.',
      currentStatus: {
        dataAvailable: true,
        completeness: 35,
        status: 'partial'
      },
      dataRequirements: [
        'Large sample size of historical campaigns (200+ recommended)',
        'Diverse campaign types and genres',
        'Complete vendor performance tracking',
        'Cross-validation datasets',
        'Statistical significance testing data'
      ],
      expectedBehavior: 'Target confidence level is 80-90%. As data volume increases, confidence intervals will narrow and predictions become more reliable. You\'ll see confidence scores improve with each completed campaign.',
      integrationNotes: 'Full functionality requires both historical data import and live SFA connection. Statistical confidence calculations will be most accurate with 6+ months of comprehensive campaign data.'
    },
    {
      id: 'optimizations',
      title: 'Active Optimizations',
      icon: <Zap className="h-5 w-5 text-warning" />,
      description: 'Counts the number of high-priority optimization opportunities identified by the ML system.',
      purpose: 'Identifies actionable improvements in vendor allocation, budget distribution, timing, and targeting. These optimizations can significantly improve campaign ROI and performance outcomes.',
      currentStatus: {
        dataAvailable: true,
        completeness: 40,
        status: 'partial'
      },
      dataRequirements: [
        'Multi-campaign vendor performance comparisons',
        'Budget allocation efficiency tracking',
        'Timing and seasonal performance data',
        'Cross-campaign learning insights',
        'ROI tracking across all campaigns'
      ],
      expectedBehavior: 'Typically shows 3-8 active high-priority optimizations. As the system learns, it will identify specific patterns like optimal vendor mixes, budget distributions, and timing strategies for different campaign types.',
      integrationNotes: 'Optimization identification improves dramatically with SFA integration. Real-time data enables dynamic optimization suggestions and automatic adjustment recommendations.'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready': return 'text-success';
      case 'partial': return 'text-warning';
      case 'insufficient': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ready': return <CheckCircle2 className="h-4 w-4 text-success" />;
      case 'partial': return <AlertCircle className="h-4 w-4 text-warning" />;
      case 'insufficient': return <Database className="h-4 w-4 text-destructive" />;
      default: return <Info className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className={className}>
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Understanding Your ML Metrics</h3>
        <p className="text-sm text-muted-foreground">
          Learn what each metric measures, current data status, and what to expect as more campaign data becomes available.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {metrics.map((metric) => (
          <Card key={metric.id} className="border-l-4 border-l-primary/30">
            <Collapsible 
              open={openCards.includes(metric.id)}
              onOpenChange={() => toggleCard(metric.id)}
            >
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {metric.icon}
                      <CardTitle className="text-base">{metric.title}</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={getStatusColor(metric.currentStatus.status)}>
                        {metric.currentStatus.status}
                      </Badge>
                      {openCards.includes(metric.id) ? 
                        <ChevronDown className="h-4 w-4" /> : 
                        <ChevronRight className="h-4 w-4" />
                      }
                    </div>
                  </div>
                  <CardDescription className="text-sm">
                    {metric.description}
                  </CardDescription>
                </CardHeader>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <CardContent className="pt-0 space-y-4">
                  {/* Purpose */}
                  <div>
                    <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Business Purpose
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {metric.purpose}
                    </p>
                  </div>

                  {/* Current Status */}
                  <div>
                    <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                      {getStatusIcon(metric.currentStatus.status)}
                      Current Data Status
                    </h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Data Completeness</span>
                        <span>{metric.currentStatus.completeness}%</span>
                      </div>
                      <Progress value={metric.currentStatus.completeness} className="h-2" />
                      <p className="text-xs text-muted-foreground">
                        {metric.currentStatus.completeness < 50 ? 
                          'Limited data available - basic functionality only' :
                          metric.currentStatus.completeness < 80 ?
                          'Partial data available - some insights available' :
                          'Sufficient data - full functionality enabled'
                        }
                      </p>
                    </div>
                  </div>

                  {/* Data Requirements */}
                  <div>
                    <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                      <Database className="h-4 w-4" />
                      Required Data Sources
                    </h4>
                    <ul className="space-y-1">
                      {metric.dataRequirements.map((req, index) => (
                        <li key={index} className="text-xs text-muted-foreground flex items-start gap-2">
                          <span className="w-1 h-1 rounded-full bg-primary mt-2 flex-shrink-0" />
                          {req}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Expected Behavior */}
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      <strong>With Full Data:</strong> {metric.expectedBehavior}
                    </AlertDescription>
                  </Alert>

                  {/* Integration Notes */}
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <h4 className="font-medium text-sm mb-1">SFA Integration Ready</h4>
                    <p className="text-xs text-muted-foreground">
                      {metric.integrationNotes}
                    </p>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        ))}
      </div>

      {/* Overall Status */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="h-5 w-5" />
            System Integration Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Historical Data Import</span>
                <Badge variant="outline">Pending</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Import previous campaign data to establish baseline metrics and improve initial accuracy.
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">SFA Live Connection</span>
                <Badge variant="outline">Ready</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Connect to SFA for real-time campaign data and automatic model updates.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}








