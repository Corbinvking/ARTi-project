import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, TrendingUp, Calendar, Music, Target, Award } from 'lucide-react';

export const MemberAnalytics = () => {
  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Analytics</h1>
        <p className="text-muted-foreground">
          Track your performance and insights across all submissions
        </p>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Submissions</CardTitle>
            <Music className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
            <p className="text-xs text-muted-foreground">
              +3 this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approval Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">87.5%</div>
            <p className="text-xs text-muted-foreground">
              21 of 24 approved
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reach</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">342K</div>
            <p className="text-xs text-muted-foreground">
              Across all campaigns
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Credits Earned</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">156</div>
            <p className="text-xs text-muted-foreground">
              From supporting others
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Tabs */}
      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="performance" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="timeline" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Timeline
          </TabsTrigger>
          <TabsTrigger value="insights" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Insights
          </TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Submission Performance</CardTitle>
                <CardDescription>
                  Breakdown of your submission results
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm">Approved</span>
                    </div>
                    <div className="text-right">
                      <span className="font-medium">21</span>
                      <span className="text-sm text-muted-foreground ml-2">87.5%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <span className="text-sm">Pending</span>
                    </div>
                    <div className="text-right">
                      <span className="font-medium">2</span>
                      <span className="text-sm text-muted-foreground ml-2">8.3%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span className="text-sm">Rejected</span>
                    </div>
                    <div className="text-right">
                      <span className="font-medium">1</span>
                      <span className="text-sm text-muted-foreground ml-2">4.2%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Genre Performance</CardTitle>
                <CardDescription>
                  Success rate by genre
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">Deep House</Badge>
                    </div>
                    <div className="text-right">
                      <span className="font-medium">95%</span>
                      <span className="text-sm text-muted-foreground ml-2">12/12</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">Techno</Badge>
                    </div>
                    <div className="text-right">
                      <span className="font-medium">83%</span>
                      <span className="text-sm text-muted-foreground ml-2">5/6</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">Progressive</Badge>
                    </div>
                    <div className="text-right">
                      <span className="font-medium">75%</span>
                      <span className="text-sm text-muted-foreground ml-2">3/4</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Reach Analytics</CardTitle>
              <CardDescription>
                Total reach achieved across all approved submissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-muted/30 rounded-lg flex items-center justify-center">
                <p className="text-muted-foreground">Reach analytics chart coming soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Submission Timeline</CardTitle>
              <CardDescription>
                Chronological view of your submission activity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-4 p-4 border rounded-lg">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">Midnight Dreams</h3>
                      <span className="text-sm text-muted-foreground">July 15, 2024</span>
                    </div>
                    <p className="text-sm text-muted-foreground">Deep House • Approved • 15.2K reach</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4 p-4 border rounded-lg">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">Summer Waves</h3>
                      <span className="text-sm text-muted-foreground">July 12, 2024</span>
                    </div>
                    <p className="text-sm text-muted-foreground">Progressive House • Approved • 18.7K reach</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4 p-4 border rounded-lg">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">Electric Nights</h3>
                      <span className="text-sm text-muted-foreground">July 10, 2024</span>
                    </div>
                    <p className="text-sm text-muted-foreground">Techno • Pending Review</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Success Patterns</CardTitle>
                <CardDescription>
                  What makes your submissions successful
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <h4 className="font-medium text-green-800">High Success Rate</h4>
                  <p className="text-sm text-green-600">Deep House tracks have 95% approval rate</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-blue-800">Optimal Timing</h4>
                  <p className="text-sm text-blue-600">Submissions on Tuesdays perform 23% better</p>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <h4 className="font-medium text-purple-800">Quality Focus</h4>
                  <p className="text-sm text-purple-600">Your tracks average 16.8K reach when approved</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recommendations</CardTitle>
                <CardDescription>
                  Suggestions to improve your success rate
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <h4 className="font-medium text-yellow-800">Genre Diversification</h4>
                  <p className="text-sm text-yellow-600">Try Melodic Techno - it's trending in our network</p>
                </div>
                <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <h4 className="font-medium text-orange-800">Submission Timing</h4>
                  <p className="text-sm text-orange-600">Submit earlier in the week for better placement</p>
                </div>
                <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                  <h4 className="font-medium text-indigo-800">Credit Optimization</h4>
                  <p className="text-sm text-indigo-600">You have 47 credits - perfect for premium targeting</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};