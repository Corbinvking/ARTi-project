import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Zap, Trophy, AlertCircle, Clock, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface ABTest {
  id: string;
  test_name: string;
  status: string;
  control_performance: number;
  test_performance: number;
  statistical_significance: number;
  winner: string | null;
  conclusion: string | null;
}

interface ABTestResultsProps {
  abTests: ABTest[];
  loading: boolean;
}

export const ABTestResults = ({ abTests, loading }: ABTestResultsProps) => {
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return { variant: 'default', icon: Clock, label: 'Running' };
      case 'completed':
        return { variant: 'success', icon: Trophy, label: 'Completed' };
      case 'draft':
        return { variant: 'secondary', icon: AlertCircle, label: 'Draft' };
      default:
        return { variant: 'secondary', icon: AlertCircle, label: status };
    }
  };

  const getWinnerBadge = (winner: string | null, controlPerf: number, testPerf: number) => {
    if (!winner) return null;
    
    const improvement = winner === 'test' 
      ? ((testPerf - controlPerf) / controlPerf * 100)
      : ((controlPerf - testPerf) / testPerf * 100);
    
    return {
      label: winner === 'test' ? 'Test Wins' : 'Control Wins',
      variant: winner === 'test' ? 'success' : 'destructive',
      improvement: improvement.toFixed(1)
    };
  };

  const getSignificanceColor = (significance: number) => {
    if (significance >= 0.95) return 'text-green-600';
    if (significance >= 0.90) return 'text-yellow-600';
    return 'text-red-600';
  };

  const activeTests = abTests.filter(test => test.status === 'active');
  const completedTests = abTests.filter(test => test.status === 'completed');

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              Active Tests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeTests.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Currently running experiments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-500" />
              Completed Tests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedTests.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Finished experiments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              Success Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {completedTests.length > 0 
                ? `${Math.round(completedTests.filter(t => t.winner === 'test').length / completedTests.length * 100)}%`
                : 'N/A'
              }
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Test improvements
            </p>
          </CardContent>
        </Card>
      </div>

      {/* A/B Test Results */}
      <div className="space-y-4">
        {abTests.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground">No A/B tests found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Create experiments to test algorithm improvements
              </p>
            </CardContent>
          </Card>
        ) : (
          abTests.map((test) => {
            const statusBadge = getStatusBadge(test.status);
            const StatusIcon = statusBadge.icon;
            const winnerInfo = getWinnerBadge(test.winner, test.control_performance, test.test_performance);

            return (
              <Card key={test.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{test.test_name}</CardTitle>
                    <Badge variant={statusBadge.variant as any} className="gap-1">
                      <StatusIcon className="h-3 w-3" />
                      {statusBadge.label}
                    </Badge>
                  </div>
                  {test.conclusion && (
                    <CardDescription>{test.conclusion}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Performance Comparison */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Control Performance</span>
                        <span className="font-medium">{(test.control_performance * 100).toFixed(1)}%</span>
                      </div>
                      <Progress value={test.control_performance * 100} className="h-2" />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Test Performance</span>
                        <span className="font-medium">{(test.test_performance * 100).toFixed(1)}%</span>
                      </div>
                      <Progress value={test.test_performance * 100} className="h-2" />
                    </div>
                  </div>

                  <Separator />

                  {/* Test Results */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-sm font-medium text-muted-foreground">Statistical Significance</div>
                      <div className={`text-lg font-bold ${getSignificanceColor(test.statistical_significance)}`}>
                        {(test.statistical_significance * 100).toFixed(1)}%
                      </div>
                    </div>

                    <div className="text-center">
                      <div className="text-sm font-medium text-muted-foreground">Performance Lift</div>
                      <div className={`text-lg font-bold ${
                        test.test_performance > test.control_performance ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {test.test_performance > test.control_performance ? '+' : ''}
                        {(((test.test_performance - test.control_performance) / test.control_performance) * 100).toFixed(1)}%
                      </div>
                    </div>

                    <div className="text-center">
                      {winnerInfo ? (
                        <>
                          <div className="text-sm font-medium text-muted-foreground">Winner</div>
                          <Badge variant={winnerInfo.variant as any} className="text-xs">
                            {winnerInfo.label} (+{winnerInfo.improvement}%)
                          </Badge>
                        </>
                      ) : (
                        <>
                          <div className="text-sm font-medium text-muted-foreground">Status</div>
                          <div className="text-sm text-muted-foreground">In Progress</div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Action Button for Active Tests */}
                  {test.status === 'active' && (
                    <div className="pt-2">
                      <Button variant="outline" size="sm" className="w-full">
                        View Test Details
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};