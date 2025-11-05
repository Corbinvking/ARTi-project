import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Database, AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface DataQuality {
  coverage_percentage: number;
  freshness_score: number;
  completeness_score: number;
  missing_features_count: number;
  stale_data_count: number;
}

interface DataQualityWidgetProps {
  dataQuality: DataQuality | null;
  creatorsCount: number;
  campaignsCount: number;
  loading: boolean;
}

export const DataQualityWidget = ({ 
  dataQuality, 
  creatorsCount, 
  campaignsCount, 
  loading 
}: DataQualityWidgetProps) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const getQualityStatus = () => {
    if (!dataQuality) return { label: 'Unknown', variant: 'secondary', score: 0 };
    
    const overall = (dataQuality.coverage_percentage + dataQuality.freshness_score + dataQuality.completeness_score) / 3;
    
    if (overall >= 80) return { label: 'Excellent', variant: 'success', score: overall };
    if (overall >= 60) return { label: 'Good', variant: 'default', score: overall };
    if (overall >= 40) return { label: 'Fair', variant: 'warning', score: overall };
    return { label: 'Poor', variant: 'destructive', score: overall };
  };

  const qualityStatus = getQualityStatus();

  const getIssues = () => {
    if (!dataQuality) return [];
    
    const issues = [];
    
    if (dataQuality.coverage_percentage < 70) {
      issues.push(`${dataQuality.missing_features_count} creators missing ML features`);
    }
    
    if (dataQuality.freshness_score < 60) {
      issues.push(`${dataQuality.stale_data_count} creators with stale performance data`);
    }
    
    if (dataQuality.completeness_score < 50) {
      issues.push('Incomplete feature extraction for multiple creators');
    }
    
    return issues;
  };

  const issues = getIssues();

  return (
    <div className="space-y-6">
      {/* Data Quality Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Data Quality Score
            </CardTitle>
            <CardDescription>
              Overall health of ML training data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Overall Quality</span>
              <Badge variant={qualityStatus.variant as any}>
                {qualityStatus.label}
              </Badge>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Creator Coverage</span>
                  <span>{dataQuality ? `${dataQuality.coverage_percentage.toFixed(1)}%` : 'N/A'}</span>
                </div>
                <Progress value={dataQuality?.coverage_percentage || 0} />
                <p className="text-xs text-muted-foreground mt-1">
                  Creators with complete ML feature profiles
                </p>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Data Freshness</span>
                  <span>{dataQuality ? `${dataQuality.freshness_score.toFixed(1)}%` : 'N/A'}</span>
                </div>
                <Progress value={dataQuality?.freshness_score || 0} />
                <p className="text-xs text-muted-foreground mt-1">
                  Recent post performance data availability
                </p>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Completeness</span>
                  <span>{dataQuality ? `${dataQuality.completeness_score.toFixed(1)}%` : 'N/A'}</span>
                </div>
                <Progress value={dataQuality?.completeness_score || 0} />
                <p className="text-xs text-muted-foreground mt-1">
                  Feature extraction completeness
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Statistics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Data Statistics
            </CardTitle>
            <CardDescription>
              Current data volumes and processing status
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-primary">{creatorsCount}</div>
                <div className="text-xs text-muted-foreground">Total Creators</div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-primary">{campaignsCount}</div>
                <div className="text-xs text-muted-foreground">Active Campaigns</div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Creators with ML Features</span>
                <span className="font-medium">
                  {dataQuality ? `${creatorsCount - dataQuality.missing_features_count}` : '0'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Missing ML Features</span>
                <span className="font-medium text-warning">
                  {dataQuality?.missing_features_count || 0}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Stale Performance Data</span>
                <span className="font-medium text-destructive">
                  {dataQuality?.stale_data_count || 0}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Quality Issues */}
      {issues.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              <div className="font-medium">Data Quality Issues Detected:</div>
              <ul className="list-disc list-inside space-y-1 text-sm">
                {issues.map((issue, index) => (
                  <li key={index}>{issue}</li>
                ))}
              </ul>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Quality Recommendations */}
      {dataQuality && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              {dataQuality.coverage_percentage < 80 && (
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-warning rounded-full mt-2"></div>
                  <div>
                    <div className="font-medium">Improve Creator Coverage</div>
                    <div className="text-muted-foreground">
                      Run ML feature extraction for {dataQuality.missing_features_count} creators
                    </div>
                  </div>
                </div>
              )}
              
              {dataQuality.freshness_score < 70 && (
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-destructive rounded-full mt-2"></div>
                  <div>
                    <div className="font-medium">Update Performance Data</div>
                    <div className="text-muted-foreground">
                      Refresh post performance tracking for better predictions
                    </div>
                  </div>
                </div>
              )}
              
              {dataQuality.coverage_percentage >= 80 && dataQuality.freshness_score >= 70 && (
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-success rounded-full mt-2"></div>
                  <div>
                    <div className="font-medium">Data Quality Looks Good</div>
                    <div className="text-muted-foreground">
                      ML algorithm has sufficient high-quality data for training
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};