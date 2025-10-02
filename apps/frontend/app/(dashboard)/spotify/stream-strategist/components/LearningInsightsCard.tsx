// Component to display learning insights and AI recommendations

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Alert, AlertDescription } from "./ui/alert";
import { Progress } from "./ui/progress";
import { 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Brain,
  Target,
  BarChart3,
  Lightbulb
} from "lucide-react";
import { LearningInsights } from "../lib/allocationAlgorithm";

interface LearningInsightsCardProps {
  insights: LearningInsights;
  className?: string;
}

export function LearningInsightsCard({ insights, className }: LearningInsightsCardProps) {
  const confidenceColor = insights.confidenceScore >= 0.8 ? "text-success" : 
                         insights.confidenceScore >= 0.6 ? "text-warning" : "text-destructive";
  
  const confidenceIcon = insights.confidenceScore >= 0.8 ? CheckCircle : 
                         insights.confidenceScore >= 0.6 ? TrendingUp : AlertTriangle;
  
  const ConfidenceIcon = confidenceIcon;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          AI Learning Insights
        </CardTitle>
        <CardDescription>
          Machine learning analysis and recommendations for this campaign
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Confidence Score */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ConfidenceIcon className={`h-4 w-4 ${confidenceColor}`} />
              <span className="text-sm font-medium">Confidence Score</span>
            </div>
            <span className={`text-sm font-semibold ${confidenceColor}`}>
              {Math.round(insights.confidenceScore * 100)}%
            </span>
          </div>
          <Progress 
            value={insights.confidenceScore * 100} 
            className="h-2"
          />
          <p className="text-xs text-muted-foreground">
            Based on historical data, vendor reliability, and genre matching accuracy
          </p>
        </div>

        {/* Performance Expectations */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Expected Performance</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="text-center p-2 bg-success/10 rounded">
              <div className="font-semibold text-success">
                {insights.expectedPerformance.optimistic.toLocaleString()}
              </div>
              <div className="text-muted-foreground">Optimistic</div>
            </div>
            <div className="text-center p-2 bg-primary/10 rounded">
              <div className="font-semibold text-primary">
                {insights.expectedPerformance.realistic.toLocaleString()}
              </div>
              <div className="text-muted-foreground">Realistic</div>
            </div>
            <div className="text-center p-2 bg-muted rounded">
              <div className="font-semibold">
                {insights.expectedPerformance.conservative.toLocaleString()}
              </div>
              <div className="text-muted-foreground">Conservative</div>
            </div>
          </div>
        </div>

        {/* Recommendations */}
        {insights.recommendations.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-warning" />
              <span className="text-sm font-medium">AI Recommendations</span>
            </div>
            <div className="space-y-1">
              {insights.recommendations.map((rec, index) => (
                <Alert key={index} className="border-l-4 border-l-success">
                  <AlertDescription className="text-sm">
                    {rec}
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </div>
        )}

        {/* Risk Factors */}
        {insights.riskFactors.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <span className="text-sm font-medium">Risk Factors</span>
            </div>
            <div className="space-y-1">
              {insights.riskFactors.map((risk, index) => (
                <Alert key={index} variant="destructive" className="border-l-4 border-l-destructive">
                  <AlertDescription className="text-sm">
                    {risk}
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </div>
        )}

        {/* Learning Status */}
        <div className="pt-4 border-t">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <BarChart3 className="h-3 w-3" />
              <span>Algorithm v2.0 • Learning Enabled</span>
            </div>
            <Badge variant="outline" className="text-xs">
              Smart Allocation
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}







