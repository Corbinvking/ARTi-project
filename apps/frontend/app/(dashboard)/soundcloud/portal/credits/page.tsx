"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useMyMember, useMyCreditHistory } from "../../soundcloud-app/hooks/useMyMember";
import { 
  Coins, 
  TrendingUp, 
  TrendingDown, 
  ArrowUpRight,
  ArrowDownRight,
  History,
  Gift,
  Zap
} from "lucide-react";

export default function CreditsPage() {
  const { data: member, isLoading: memberLoading } = useMyMember();
  const { data: creditHistory, isLoading: historyLoading } = useMyCreditHistory();

  if (memberLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!member) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Member data not found</p>
      </div>
    );
  }

  const creditLimit = member.monthly_credit_limit || 1000;
  const creditsUsedPercent = creditLimit > 0 ? ((member.credits_used || 0) / creditLimit) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Credits</h1>
        <p className="text-muted-foreground">
          Track your credit balance and history
        </p>
      </div>

      {/* Credit Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5" />
              Credit Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2 mb-4">
              <span className={`text-4xl font-bold ${(member.net_credits || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {(member.net_credits || 0) >= 0 ? '+' : ''}{member.net_credits || 0}
              </span>
              <span className="text-muted-foreground">credits</span>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Credits Given</span>
                <span className="font-medium text-green-600">+{member.credits_given || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Credits Used</span>
                <span className="font-medium text-red-600">-{member.credits_used || 0}</span>
              </div>
              <hr />
              <div className="flex justify-between text-sm font-medium">
                <span>Net Balance</span>
                <span className={(member.net_credits || 0) >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {(member.net_credits || 0) >= 0 ? '+' : ''}{member.net_credits || 0}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Monthly Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Credits Used</span>
                  <span>{member.credits_used || 0} / {creditLimit}</span>
                </div>
                <Progress value={creditsUsedPercent} className="h-2" />
              </div>
              
              <div className="pt-2 border-t">
                <div className="flex items-center gap-2 text-sm">
                  <Zap className="h-4 w-4 text-amber-500" />
                  <span className="text-muted-foreground">Reach Factor:</span>
                  <span className="font-medium">{((member.reach_factor || 0.06) * 100).toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* How Credits Work */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">How Credits Work</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h4 className="font-medium">Earn Credits</h4>
                <p className="text-sm text-muted-foreground">
                  Support other artists' tracks by reposting them. Each repost earns you credits based on your follower count and reach factor.
                </p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <TrendingDown className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h4 className="font-medium">Spend Credits</h4>
                <p className="text-sm text-muted-foreground">
                  When other members repost your tracks, credits are deducted from your balance. Keep your balance positive to stay active!
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Credit History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Credit History
          </CardTitle>
          <CardDescription>
            Your recent credit transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : creditHistory && creditHistory.length > 0 ? (
            <div className="space-y-3">
              {creditHistory.map((entry: any) => (
                <div 
                  key={entry.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {entry.amount > 0 ? (
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <ArrowUpRight className="h-4 w-4 text-green-600" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                        <ArrowDownRight className="h-4 w-4 text-red-600" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-sm">{entry.description || (entry.amount > 0 ? 'Credits Earned' : 'Credits Used')}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(entry.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <span className={`font-medium ${entry.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {entry.amount > 0 ? '+' : ''}{entry.amount}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Gift className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Credit History</h3>
              <p className="text-muted-foreground">
                Your credit transactions will appear here
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

