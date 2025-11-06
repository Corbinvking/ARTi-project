import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Clock, AlertCircle, CheckCircle, Wrench } from "lucide-react";

const queueData = {
  waiting: 4,
  processing: 2,
  completed: 1,
  avgProcessingTime: "2.4h",
  successRate: 89
};

const queueItems = [
  { id: 1, campaign: "Summer Vibes Mix", priority: "high", status: "processing", timeInQueue: "1.2h" },
  { id: 2, campaign: "Chill Electronic", priority: "medium", status: "processing", timeInQueue: "45m" },
  { id: 3, campaign: "Rock Anthem", priority: "high", status: "waiting", timeInQueue: "2.1h" },
  { id: 4, campaign: "Jazz Fusion", priority: "low", status: "waiting", timeInQueue: "30m" },
];

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "high": return "destructive";
    case "medium": return "warning";
    case "low": return "secondary";
    default: return "secondary";
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "processing": return <Wrench className="h-4 w-4 text-info animate-spin" />;
    case "waiting": return <Clock className="h-4 w-4 text-warning" />;
    case "completed": return <CheckCircle className="h-4 w-4 text-success" />;
    default: return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
  }
};

export const RatioFixerQueue = () => {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="w-2 h-2 bg-primary rounded-full"></div>
          Ratio Fixer Queue
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Queue Statistics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold text-warning">{queueData.waiting}</div>
            <div className="text-sm text-muted-foreground">Waiting</div>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold text-info">{queueData.processing}</div>
            <div className="text-sm text-muted-foreground">Processing</div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Success Rate</span>
            <span className="text-sm font-medium text-success">{queueData.successRate}%</span>
          </div>
          <Progress value={queueData.successRate} className="h-2" />
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Avg. Processing Time</span>
            <span className="text-sm font-medium text-foreground">{queueData.avgProcessingTime}</span>
          </div>
        </div>

        {/* Queue Items */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-foreground">Current Queue</h4>
          {queueItems.map((item) => (
            <div key={item.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-2">
                {getStatusIcon(item.status)}
                <div>
                  <div className="text-sm font-medium text-foreground truncate max-w-[120px]">
                    {item.campaign}
                  </div>
                  <div className="text-xs text-muted-foreground">{item.timeInQueue}</div>
                </div>
              </div>
              <Badge variant={getPriorityColor(item.priority) as any} className="text-xs">
                {item.priority}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};