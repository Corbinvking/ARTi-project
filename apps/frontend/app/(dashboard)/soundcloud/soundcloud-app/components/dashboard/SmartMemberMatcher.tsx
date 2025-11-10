"use client"

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Brain, Target, Users, Zap, BarChart3, Settings, 
  Shuffle, RefreshCw, CheckCircle, AlertTriangle,
  TrendingUp, Activity, Clock, Star
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { InteractiveCard } from '../ui/interactive-card';
import { supabase } from '../../integrations/supabase/client';
import { useToast } from '../../hooks/use-toast';

interface MatchingCriteria {
  genreCompatibility: number;
  followerAlignment: number;
  engagementHistory: number;
  creditOptimization: number;
  geographicSpread: number;
  avoidListRespect: number;
  fairnessBalance: number;
}

interface MatchingResult {
  submissionId: string;
  trackName: string;
  artistName: string;
  genre: string;
  recommendedSupporters: SupporterMatch[];
  alternativeOptions: SupporterMatch[];
  confidence: number;
  reasoning: string[];
}

interface SupporterMatch {
  memberId: string;
  memberName: string;
  followerCount: number;
  genreMatch: number;
  engagementScore: number;
  availableCredits: number;
  estimatedReach: number;
  riskFactors: string[];
  confidence: number;
  priority: 'high' | 'medium' | 'low';
}

interface PerformanceMetrics {
  totalMatches: number;
  successRate: number;
  avgEngagement: number;
  memberSatisfaction: number;
  reachAccuracy: number;
  conflictRate: number;
}

export const SmartMemberMatcher: React.FC = () => {
  const [criteria, setCriteria] = useState<MatchingCriteria>({
    genreCompatibility: 85,
    followerAlignment: 70,
    engagementHistory: 80,
    creditOptimization: 75,
    geographicSpread: 60,
    avoidListRespect: 100,
    fairnessBalance: 90
  });
  
  const [results, setResults] = useState<MatchingResult[]>([]);
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [isMatching, setIsMatching] = useState(false);
  const [selectedResult, setSelectedResult] = useState<MatchingResult | null>(null);
  const [autoOptimize, setAutoOptimize] = useState(true);
  const [learningMode, setLearningMode] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadPerformanceMetrics();
    loadSampleResults();
  }, []);

  const loadPerformanceMetrics = async () => {
    // Mock performance metrics - in production this would come from analytics
    const mockMetrics: PerformanceMetrics = {
      totalMatches: 1247,
      successRate: 87.3,
      avgEngagement: 6.4,
      memberSatisfaction: 8.7,
      reachAccuracy: 82.1,
      conflictRate: 3.2
    };
    setMetrics(mockMetrics);
  };

  const loadSampleResults = () => {
    // Mock matching results
    const mockResults: MatchingResult[] = [
      {
        submissionId: 'sub_1',
        trackName: 'Midnight Vibes',
        artistName: 'DJ Synthesis',
        genre: 'Deep House',
        confidence: 94,
        reasoning: [
          'High genre compatibility with electronic music supporters',
          'Optimal follower count alignment (10K-50K range)',
          'Strong historical engagement rates'
        ],
        recommendedSupporters: [
          {
            memberId: 'mem_1',
            memberName: 'ElectroBeats',
            followerCount: 35000,
            genreMatch: 96,
            engagementScore: 8.7,
            availableCredits: 45,
            estimatedReach: 2100,
            riskFactors: [],
            confidence: 97,
            priority: 'high'
          },
          {
            memberId: 'mem_2',
            memberName: 'HouseVibes',
            followerCount: 28000,
            genreMatch: 92,
            engagementScore: 7.9,
            availableCredits: 38,
            estimatedReach: 1890,
            riskFactors: ['Lower recent activity'],
            confidence: 89,
            priority: 'high'
          },
          {
            memberId: 'mem_3',
            memberName: 'DeepGrooves',
            followerCount: 41000,
            genreMatch: 88,
            engagementScore: 8.2,
            availableCredits: 52,
            estimatedReach: 2340,
            riskFactors: [],
            confidence: 91,
            priority: 'medium'
          }
        ],
        alternativeOptions: [
          {
            memberId: 'mem_4',
            memberName: 'TechnoFlow',
            followerCount: 22000,
            genreMatch: 78,
            engagementScore: 7.1,
            availableCredits: 29,
            estimatedReach: 1420,
            riskFactors: ['Genre compatibility lower than optimal'],
            confidence: 76,
            priority: 'low'
          }
        ]
      },
      {
        submissionId: 'sub_2',
        trackName: 'Urban Dreams',
        artistName: 'MC FlowState',
        genre: 'Hip Hop',
        confidence: 89,
        reasoning: [
          'Strong hip hop community alignment',
          'Good geographic distribution potential',
          'Balanced credit optimization'
        ],
        recommendedSupporters: [
          {
            memberId: 'mem_5',
            memberName: 'HipHopCentral',
            followerCount: 62000,
            genreMatch: 98,
            engagementScore: 9.1,
            availableCredits: 67,
            estimatedReach: 3200,
            riskFactors: [],
            confidence: 95,
            priority: 'high'
          },
          {
            memberId: 'mem_6',
            memberName: 'UrbanBeats',
            followerCount: 45000,
            genreMatch: 94,
            engagementScore: 8.4,
            availableCredits: 48,
            estimatedReach: 2450,
            riskFactors: [],
            confidence: 92,
            priority: 'high'
          }
        ],
        alternativeOptions: []
      }
    ];
    
    setResults(mockResults);
    if (mockResults.length > 0) {
      setSelectedResult(mockResults[0]);
    }
  };

  const runMatching = async () => {
    setIsMatching(true);
    
    try {
      // Simulate AI matching process
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // In production, this would call the matching algorithm
      // const { data, error } = await supabase.functions.invoke('smart-member-matching', {
      //   body: { criteria, submissions: pendingSubmissions }
      // });
      
      loadSampleResults(); // Reload with new results
      
      toast({
        title: "Matching Complete",
        description: `Generated ${results.length} optimized matches`,
      });
    } catch (error) {
      console.error('Error running matching:', error);
      toast({
        title: "Matching Failed",
        description: "Could not complete member matching",
        variant: "destructive"
      });
    } finally {
      setIsMatching(false);
    }
  };

  const optimizeCriteria = async () => {
    // Simulate optimization based on historical performance
    const optimizedCriteria = {
      ...criteria,
      genreCompatibility: Math.min(95, criteria.genreCompatibility + 5),
      engagementHistory: Math.min(95, criteria.engagementHistory + 3),
      creditOptimization: Math.max(70, criteria.creditOptimization - 2)
    };
    
    setCriteria(optimizedCriteria);
    
    toast({
      title: "Criteria Optimized",
      description: "Matching criteria updated based on performance data"
    });
  };

  const getCriteriaLabel = (key: keyof MatchingCriteria): string => {
    const labels = {
      genreCompatibility: 'Genre Compatibility',
      followerAlignment: 'Follower Alignment',
      engagementHistory: 'Engagement History',
      creditOptimization: 'Credit Optimization',
      geographicSpread: 'Geographic Spread',
      avoidListRespect: 'Avoid List Respect',
      fairnessBalance: 'Fairness Balance'
    };
    return labels[key];
  };

  const getPriorityColor = (priority: SupporterMatch['priority']) => {
    switch (priority) {
      case 'high': return 'text-green-600 bg-green-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="space-y-6">
      <motion.div 
        className="flex items-center justify-between"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div>
          <h1 className="text-3xl font-bold">Smart Member Matcher</h1>
          <p className="text-muted-foreground">
            AI-powered intelligent member assignment and optimization
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={optimizeCriteria}>
            <Brain className="w-4 h-4 mr-2" />
            Auto-Optimize
          </Button>
          <Button onClick={runMatching} disabled={isMatching}>
            {isMatching ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Matching...
              </>
            ) : (
              <>
                <Shuffle className="w-4 h-4 mr-2" />
                Run Matching
              </>
            )}
          </Button>
        </div>
      </motion.div>

      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: 'Total Matches', value: metrics.totalMatches, icon: Target },
            { label: 'Success Rate', value: metrics.successRate, suffix: '%', icon: CheckCircle },
            { label: 'Avg Engagement', value: metrics.avgEngagement, suffix: '/10', icon: Activity },
            { label: 'Member Satisfaction', value: metrics.memberSatisfaction, suffix: '/10', icon: Star },
            { label: 'Reach Accuracy', value: metrics.reachAccuracy, suffix: '%', icon: TrendingUp },
            { label: 'Conflict Rate', value: metrics.conflictRate, suffix: '%', icon: AlertTriangle }
          ].map((metric, index) => (
            <InteractiveCard key={metric.label} hoverScale={1.03}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{metric.label}</CardTitle>
                <metric.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(metric.value).toLocaleString()}
                  {metric.suffix}
                </div>
              </CardContent>
            </InteractiveCard>
          ))}
        </div>
      )}

      <Tabs defaultValue="matching" className="space-y-6">
        <TabsList>
          <TabsTrigger value="matching">Matching Results</TabsTrigger>
          <TabsTrigger value="criteria">Matching Criteria</TabsTrigger>
          <TabsTrigger value="performance">Performance Analysis</TabsTrigger>
          <TabsTrigger value="settings">Algorithm Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="matching" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Matching Results</CardTitle>
                <CardDescription>AI-generated supporter recommendations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {results.map((result) => (
                    <motion.div
                      key={result.submissionId}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedResult?.submissionId === result.submissionId 
                          ? 'bg-primary/10 border-primary' 
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => setSelectedResult(result)}
                      whileHover={{ scale: 1.02 }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-sm">{result.trackName}</h4>
                        <Badge variant="outline">{result.confidence}%</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">
                        by {result.artistName}
                      </p>
                      <Badge variant="secondary" className="text-xs">
                        {result.genre}
                      </Badge>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>
                  {selectedResult ? `${selectedResult.trackName} - Recommendations` : 'Select a Result'}
                </CardTitle>
                <CardDescription>
                  {selectedResult ? `Confidence: ${selectedResult.confidence}%` : 'Choose a matching result to view details'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedResult ? (
                  <div className="space-y-6">
                    <div>
                      <h4 className="font-medium mb-3">AI Reasoning</h4>
                      <ul className="space-y-1">
                        {selectedResult.reasoning.map((reason, index) => (
                          <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                            <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                            {reason}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-medium mb-3">Recommended Supporters</h4>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Member</TableHead>
                            <TableHead>Genre Match</TableHead>
                            <TableHead>Est. Reach</TableHead>
                            <TableHead>Credits</TableHead>
                            <TableHead>Priority</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedResult.recommendedSupporters.map((supporter) => (
                            <TableRow key={supporter.memberId}>
                              <TableCell>
                                <div>
                                  <p className="font-medium text-sm">{supporter.memberName}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {supporter.followerCount.toLocaleString()} followers
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm">{supporter.genreMatch}%</span>
                                  <Progress value={supporter.genreMatch} className="w-12 h-2" />
                                </div>
                              </TableCell>
                              <TableCell className="text-sm">
                                {supporter.estimatedReach.toLocaleString()}
                              </TableCell>
                              <TableCell className="text-sm">
                                {supporter.availableCredits}
                              </TableCell>
                              <TableCell>
                                <Badge 
                                  className={`text-xs ${getPriorityColor(supporter.priority)}`}
                                >
                                  {supporter.priority}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {selectedResult.alternativeOptions.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-3">Alternative Options</h4>
                        <div className="space-y-2">
                          {selectedResult.alternativeOptions.map((supporter) => (
                            <div key={supporter.memberId} className="p-3 border rounded-lg">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium text-sm">{supporter.memberName}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {supporter.followerCount.toLocaleString()} followers • {supporter.genreMatch}% match
                                  </p>
                                </div>
                                <Badge variant="outline" className="text-xs">
                                  {supporter.confidence}%
                                </Badge>
                              </div>
                              {supporter.riskFactors.length > 0 && (
                                <div className="mt-2">
                                  {supporter.riskFactors.map((risk, index) => (
                                    <Badge key={index} variant="destructive" className="text-xs mr-1">
                                      {risk}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    <Brain className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Select a matching result to view AI recommendations</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="criteria">
          <Card>
            <CardHeader>
              <CardTitle>Matching Criteria Configuration</CardTitle>
              <CardDescription>
                Adjust the weights and parameters for the AI matching algorithm
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {Object.entries(criteria).map(([key, value]) => (
                <div key={key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={key}>{getCriteriaLabel(key as keyof MatchingCriteria)}</Label>
                    <span className="text-sm font-medium">{value}%</span>
                  </div>
                  <Slider
                    id={key}
                    min={0}
                    max={100}
                    step={5}
                    value={[value]}
                    onValueChange={(newValue) => 
                      setCriteria(prev => ({ ...prev, [key]: newValue[0] }))
                    }
                  />
                </div>
              ))}
              
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="auto-optimize">Auto-Optimization</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically adjust criteria based on performance data
                    </p>
                  </div>
                  <Switch
                    id="auto-optimize"
                    checked={autoOptimize}
                    onCheckedChange={setAutoOptimize}
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="learning-mode">Learning Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable machine learning improvements
                  </p>
                </div>
                <Switch
                  id="learning-mode"
                  checked={learningMode}
                  onCheckedChange={setLearningMode}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Algorithm Performance</CardTitle>
                <CardDescription>Historical matching success metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Success Rate Trend</h4>
                    <div className="flex items-center gap-2 text-sm">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      <span>+2.3% improvement this month</span>
                    </div>
                  </div>
                  
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Member Satisfaction</h4>
                    <div className="flex items-center gap-2 text-sm">
                      <Star className="h-4 w-4 text-yellow-500" />
                      <span>8.7/10 average rating</span>
                    </div>
                  </div>
                  
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Reach Accuracy</h4>
                    <div className="flex items-center gap-2 text-sm">
                      <Target className="h-4 w-4 text-blue-500" />
                      <span>82.1% prediction accuracy</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Optimization Recommendations</CardTitle>
                <CardDescription>AI-suggested improvements</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Alert>
                    <Brain className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Genre Compatibility:</strong> Consider increasing weight to 90% for better match quality.
                    </AlertDescription>
                  </Alert>
                  
                  <Alert>
                    <Activity className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Engagement History:</strong> Recent data shows this factor has high predictive value.
                    </AlertDescription>
                  </Alert>
                  
                  <Alert>
                    <Zap className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Credit Optimization:</strong> Current settings may be over-prioritizing credits vs. quality.
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Algorithm Settings</CardTitle>
              <CardDescription>Advanced configuration options</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Settings className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Advanced algorithm settings interface</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};