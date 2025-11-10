"use client"

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '../../hooks/use-toast';
import { calculateRepostLimit, getFollowerTier, formatFollowerCount } from '../../utils/creditCalculations';
import { 
  CreditCard, TrendingUp, Calendar, Users, 
  ArrowUpCircle, ArrowDownCircle, AlertCircle,
  PieChart, BarChart3, Send, Target
} from 'lucide-react';
import { InteractiveCard } from '../ui/interactive-card';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Cell, PieChart as RechartsPieChart, Pie
} from 'recharts';

interface CreditTransaction {
  type: 'earned' | 'spent' | 'bonus' | 'penalty';
  amount: number;
  description: string;
  date: string;
}

interface CreditForecast {
  month: string;
  projected: number;
  actual: number;
}

interface EarningOpportunity {
  title: string;
  description: string;
  potential_credits: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

export const EnhancedCreditSystem = () => {
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [forecast, setForecast] = useState<CreditForecast[]>([]);
  const [opportunities, setOpportunities] = useState<EarningOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [transferAmount, setTransferAmount] = useState('');
  const [transferRecipient, setTransferRecipient] = useState('');
  const { toast } = useToast();

  // Mock follower count for demonstration - in real app, get from member data
  const mockFollowerCount = 45000;
  const currentRepostLimit = calculateRepostLimit(mockFollowerCount);
  const followerTier = getFollowerTier(mockFollowerCount);
  const creditBalance = 2850; // Mock balance

  useEffect(() => {
    fetchCreditData();
  }, []);

  const fetchCreditData = async () => {
    setLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const mockTransactions = generateMockTransactions();
    setTransactions(mockTransactions);
    
    const forecastData = generateForecast();
    setForecast(forecastData);
    
    const opportunityData = generateOpportunities();
    setOpportunities(opportunityData);
    
    setLoading(false);
  };

  const generateMockTransactions = (): CreditTransaction[] => {
    return [
      { type: 'earned', amount: currentRepostLimit * 100, description: `Monthly credit allocation (${followerTier})`, date: '2024-01-01' },
      { type: 'bonus', amount: 50, description: 'High-quality submission bonus', date: '2024-01-15' },
      { type: 'spent', amount: 200, description: 'Supported "Summer Vibes"', date: '2024-01-20' },
      { type: 'earned', amount: 100, description: 'Community participation bonus', date: '2024-01-25' },
    ];
  };

  const generateForecast = (): CreditForecast[] => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    return months.map((month, index) => ({
      month,
      projected: currentRepostLimit * 100 + Math.floor(Math.random() * 200),
      actual: index < 3 ? currentRepostLimit * 100 + Math.floor(Math.random() * 100) : 0
    }));
  };

  const generateOpportunities = (): EarningOpportunity[] => {
    return [
      { title: 'Daily Support Goal', description: 'Support 3 artists today to earn bonus credits', potential_credits: 50, difficulty: 'easy' },
      { title: 'Genre Expert', description: 'Support 10 tracks in your favorite genre this week', potential_credits: 200, difficulty: 'medium' },
      { title: 'Community Leader', description: 'Achieve 95%+ approval rate with 20+ submissions', potential_credits: 500, difficulty: 'hard' },
    ];
  };

  const handleTransfer = async () => {
    if (!transferAmount || !transferRecipient) return;

    const amount = parseInt(transferAmount);
    if (amount <= 0 || amount > creditBalance) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid transfer amount",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Transfer Initiated",
      description: `Transferring ${amount} credits to ${transferRecipient}`,
    });
    
    setTransferAmount('');
    setTransferRecipient('');
  };

  const monthlyEarned = transactions
    .filter(t => t.type === 'earned' || t.type === 'bonus')
    .reduce((sum, t) => sum + t.amount, 0);

  const monthlySpent = transactions
    .filter(t => t.type === 'spent')
    .reduce((sum, t) => sum + t.amount, 0);

  const creditUtilization = (monthlySpent / (currentRepostLimit * 100)) * 100;

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-600 bg-green-50 border-green-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'hard': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading credit system...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
          <TabsTrigger value="transfer">Transfer</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Enhanced Credit Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <InteractiveCard className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Credit Balance</h3>
                  <div className="flex items-center space-x-2">
                    {(creditBalance).toLocaleString()}
                    <Badge variant="secondary">Credits</Badge>
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    {followerTier} • {formatFollowerCount(mockFollowerCount)} followers
                  </div>
                </div>
                <div className="p-3 bg-primary/10 rounded-full">
                  <CreditCard className="h-6 w-6 text-primary" />
                </div>
              </div>
            </InteractiveCard>

            <InteractiveCard className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Monthly Limit</h3>
                  <div className="flex items-center space-x-2">
                    {(currentRepostLimit).toLocaleString()}
                    <Badge variant="outline" className="text-green-600 border-green-600">Reposts</Badge>
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    Based on {formatFollowerCount(mockFollowerCount)} followers
                  </div>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <Target className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </InteractiveCard>

            <InteractiveCard className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold mb-2">This Month Spent</h3>
                  <div className="flex items-center space-x-2">
                    {(monthlySpent).toLocaleString()}
                    <Badge variant="outline" className="text-red-600 border-red-600">Used</Badge>
                  </div>
                </div>
                <div className="p-3 bg-red-100 rounded-full">
                  <ArrowDownCircle className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </InteractiveCard>

            <InteractiveCard className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Utilization</h3>
                  <div className="flex items-center space-x-2">
                    <span className="text-3xl font-bold text-purple-600">{creditUtilization.toFixed(1)}%</span>
                    <Badge variant="outline" className="text-purple-600 border-purple-600">Usage</Badge>
                  </div>
                </div>
                <div className="p-3 bg-purple-100 rounded-full">
                  <BarChart3 className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </InteractiveCard>
          </div>

          {/* Credit Utilization Progress */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Monthly Credit Usage</span>
                  <span className="text-sm text-muted-foreground">
                    {monthlySpent} / {currentRepostLimit * 100}
                  </span>
                </div>
                <Progress value={creditUtilization} className="h-3" />
                <p className="text-xs text-muted-foreground">
                  {creditUtilization.toFixed(1)}% of monthly limit used
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Recent Transactions */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {transactions.map((transaction, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-full ${
                        transaction.type === 'earned' || transaction.type === 'bonus' 
                          ? 'bg-green-100' : 'bg-red-100'
                      }`}>
                        {transaction.type === 'earned' || transaction.type === 'bonus' ? (
                          <ArrowUpCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <ArrowDownCircle className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{transaction.description}</p>
                        <p className="text-sm text-muted-foreground">{transaction.date}</p>
                      </div>
                    </div>
                    <div className={`font-bold ${
                      transaction.type === 'earned' || transaction.type === 'bonus' 
                        ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.type === 'earned' || transaction.type === 'bonus' ? '+' : '-'}
                      {transaction.amount}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          {/* Credit Forecast Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Credit Forecast</CardTitle>
              <CardDescription>
                Projected credit earnings based on your activity patterns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={forecast}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Area 
                    type="monotone" 
                    dataKey="projected" 
                    stroke="hsl(var(--primary))" 
                    fill="hsl(var(--primary))" 
                    fillOpacity={0.1}
                    strokeDasharray="5 5"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="actual" 
                    stroke="hsl(var(--chart-1))" 
                    fill="hsl(var(--chart-1))" 
                    fillOpacity={0.2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="opportunities" className="space-y-4">
          <div className="grid gap-4">
            {opportunities.map((opportunity, index) => (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <h3 className="font-semibold">{opportunity.title}</h3>
                      <p className="text-sm text-muted-foreground">{opportunity.description}</p>
                      <div className="flex items-center space-x-2">
                        <Badge className={getDifficultyColor(opportunity.difficulty)}>
                          {opportunity.difficulty}
                        </Badge>
                        <span className="text-sm font-medium">
                          {opportunity.potential_credits} credits
                        </span>
                      </div>
                    </div>
                    <Button>Start</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="transfer" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Transfer Credits</CardTitle>
              <CardDescription>Send credits to another member</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="recipient">Recipient Email</Label>
                <Input
                  id="recipient"
                  placeholder="Enter member email"
                  value={transferRecipient}
                  onChange={(e) => setTransferRecipient(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="Enter amount"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  Available balance: {creditBalance} credits
                </p>
              </div>
              <Button onClick={handleTransfer} className="w-full">
                <Send className="w-4 h-4 mr-2" />
                Send Credits
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};