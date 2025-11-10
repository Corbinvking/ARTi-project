"use client"

import React, { useState, useEffect } from 'react';
import { Coins, TrendingUp, TrendingDown, Clock, Info } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '../../integrations/supabase/client';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';

interface CreditTransaction {
  id: string;
  type: 'earned' | 'spent';
  amount: number;
  description: string;
  date: string;
  related_submission?: {
    artist_name: string;
    track_url: string;
  };
}

export const CreditHistory: React.FC = () => {
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const { member } = useAuth();

  useEffect(() => {
    if (member) {
      fetchCreditHistory();
    }
  }, [member]);

  const fetchCreditHistory = async () => {
    if (!member) return;

    try {
      // Fetch recent queue assignments (credits spent)
      const { data: assignments, error: assignmentError } = await supabase
        .from('queue_assignments')
        .select(`
          id,
          credits_allocated,
          created_at,
          submissions!inner(
            artist_name,
            track_url
          )
        `)
        .eq('supporter_id', member.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (assignmentError) throw assignmentError;

      // Convert assignments to transactions
      const creditTransactions: CreditTransaction[] = [
        // Spent credits
        ...(assignments?.map(assignment => ({
          id: assignment.id,
          type: 'spent' as const,
          amount: assignment.credits_allocated,
          description: `Supported "${assignment.submissions.artist_name}"`,
          date: assignment.created_at,
          related_submission: assignment.submissions
        })) || []),
        
        // Mock earned credits for demonstration
        // In a real app, you'd fetch from a credits table
        ...generateMockEarnedCredits(member)
      ];

      // Sort by date
      creditTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      setTransactions(creditTransactions.slice(0, 15));
    } catch (error) {
      console.error('Error fetching credit history:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateMockEarnedCredits = (member: any): CreditTransaction[] => {
    const mockCredits: CreditTransaction[] = [];
    const today = new Date();
    
    // Monthly allocation
    mockCredits.push({
      id: 'monthly-allocation',
      type: 'earned',
      amount: member.monthly_repost_limit * 100 || 1000,
      description: 'Monthly credit allocation',
      date: new Date(today.getFullYear(), today.getMonth(), 1).toISOString()
    });

    // Bonus credits for good participation
    if (member.credits_given > 0) {
      mockCredits.push({
        id: 'participation-bonus',
        type: 'earned',
        amount: Math.floor(member.credits_given * 0.1),
        description: 'Participation bonus',
        date: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
      });
    }

    return mockCredits;
  };

  const thisMonthEarned = transactions
    .filter(t => t.type === 'earned' && new Date(t.date).getMonth() === new Date().getMonth())
    .reduce((sum, t) => sum + t.amount, 0);

  const thisMonthSpent = transactions
    .filter(t => t.type === 'spent' && new Date(t.date).getMonth() === new Date().getMonth())
    .reduce((sum, t) => sum + t.amount, 0);

  const monthlyLimit = member ? (member.monthly_repost_limit * 100 || 1000) : 1000;
  const creditUtilization = member ? (thisMonthSpent / monthlyLimit) * 100 : 0;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5" />
            Credit System
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coins className="h-5 w-5" />
          Credit System
        </CardTitle>
        <CardDescription>
          Track your credit earnings and spending for supporting other artists
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Credit Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Available Balance</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Credits you can use to support other artists</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="text-2xl font-bold text-green-600">{member?.net_credits || 0}</div>
          </div>
          
          <div className="space-y-2">
            <span className="text-sm font-medium">This Month Earned</span>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-xl font-semibold text-green-600">+{thisMonthEarned}</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <span className="text-sm font-medium">This Month Spent</span>
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-500" />
              <span className="text-xl font-semibold text-red-600">-{thisMonthSpent}</span>
            </div>
          </div>
        </div>

        {/* Credit Utilization */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Monthly Credit Usage</span>
            <span className="text-sm text-muted-foreground">
              {thisMonthSpent} / {monthlyLimit}
            </span>
          </div>
          <Progress value={creditUtilization} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {creditUtilization.toFixed(1)}% of monthly limit used
          </p>
        </div>

        {/* Recent Transactions */}
        <div className="space-y-4">
          <h4 className="font-medium">Recent Activity</h4>
          {transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No credit activity yet</p>
              <p className="text-sm">Start supporting other artists to see your credit history</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.slice(0, 10).map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="text-sm">
                      {format(new Date(transaction.date), 'MMM d')}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={transaction.type === 'earned' ? 'default' : 'secondary'}
                        className={transaction.type === 'earned' ? 'bg-green-500' : 'bg-red-500'}
                      >
                        {transaction.type === 'earned' ? 'Earned' : 'Spent'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {transaction.description}
                    </TableCell>
                    <TableCell className={`text-right font-medium ${
                      transaction.type === 'earned' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.type === 'earned' ? '+' : '-'}{transaction.amount}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </CardContent>
    </Card>
  );
};