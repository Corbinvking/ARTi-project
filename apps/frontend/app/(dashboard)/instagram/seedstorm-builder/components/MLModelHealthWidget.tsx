import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, Clock, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface ModelMetrics {
  latest_accuracy: number;
  latest_precision: number;
  latest_recall: number;
  latest_f1: number;
  improvement_rate: number;
  active_version: string;
  training_status: string;
  last_trained: string;
}

interface MLModelHealthWidgetProps {
  modelMetrics: ModelMetrics | null;
  loading: boolean;
}

export const MLModelHealthWidget = ({ modelMetrics, loading }: MLModelHealthWidgetProps) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusBadge = () => {
    if (!modelMetrics) return { label: 'Unknown', variant: 'secondary', icon: AlertTriangle };
    
    const accuracy = modelMetrics.latest_accuracy;
    if (accuracy >= 0.85) return { label: 'Excellent', variant: 'success', icon: CheckCircle2 };
    if (accuracy >= 0.7) return { label: 'Good', variant: 'default', icon: CheckCircle2 };
    return { label: 'Needs Attention', variant: 'destructive', icon: AlertTriangle };
  };

  const status = getStatusBadge();
  const StatusIcon = status.icon;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Model Performance Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <StatusIcon className="h-5 w-5" />
            Model Performance
          </CardTitle>
          <CardDescription>
            Current algorithm accuracy and key metrics
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Overall Health</span>
            <Badge variant={status.variant as any}>
              {status.label}
            </Badge>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Accuracy</span>
                <span>{modelMetrics ? `${(modelMetrics.latest_accuracy * 100).toFixed(1)}%` : 'N/A'}</span>
              </div>
              <Progress value={(modelMetrics?.latest_accuracy || 0) * 100} />
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Precision</span>
                <span>{modelMetrics ? `${(modelMetrics.latest_precision * 100).toFixed(1)}%` : 'N/A'}</span>
              </div>
              <Progress value={(modelMetrics?.latest_precision || 0) * 100} />
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Recall</span>
                <span>{modelMetrics ? `${(modelMetrics.latest_recall * 100).toFixed(1)}%` : 'N/A'}</span>
              </div>
              <Progress value={(modelMetrics?.latest_recall || 0) * 100} />
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>F1 Score</span>
                <span>{modelMetrics ? `${(modelMetrics.latest_f1 * 100).toFixed(1)}%` : 'N/A'}</span>
              </div>
              <Progress value={(modelMetrics?.latest_f1 || 0) * 100} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Model Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Model Status
          </CardTitle>
          <CardDescription>
            Training status and improvement metrics
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Active Version</span>
              <Badge variant="outline">
                {modelMetrics?.active_version || 'Unknown'}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Training Status</span>
              <Badge variant={modelMetrics?.training_status === 'deployed' ? 'default' : 'secondary'}>
                {modelMetrics?.training_status || 'Unknown'}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Last Trained
              </span>
              <span className="text-sm text-muted-foreground">
                {modelMetrics ? formatDate(modelMetrics.last_trained) : 'Unknown'}
              </span>
            </div>

            <div className="pt-2 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Weekly Improvement</span>
                <span className={`text-sm font-medium ${
                  (modelMetrics?.improvement_rate || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {modelMetrics ? 
                    `${modelMetrics.improvement_rate >= 0 ? '+' : ''}${(modelMetrics.improvement_rate * 100).toFixed(2)}%` 
                    : 'N/A'
                  }
                </span>
              </div>
              {modelMetrics && modelMetrics.improvement_rate > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Algorithm is learning and improving predictions
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};