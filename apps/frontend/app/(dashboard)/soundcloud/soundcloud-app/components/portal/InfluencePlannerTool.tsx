"use client"

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useInfluencePlanner } from '../../hooks/useInfluencePlanner'
import { Target, Users, TrendingUp, Calendar, AlertCircle, CheckCircle, Zap } from 'lucide-react'
import { format } from 'date-fns'

interface InfluencePlannerToolProps {
  submissionId?: string
  campaignId?: string
  initialTrackUrl?: string
  initialGenres?: string[]
}

export const InfluencePlannerTool = ({
  submissionId,
  campaignId,
  initialTrackUrl,
  initialGenres
}: InfluencePlannerToolProps) => {
  const { loading, currentPlan, createInfluencePlan, executeInfluencePlan, clearCurrentPlan } = useInfluencePlanner()
  
  const [trackUrl, setTrackUrl] = useState(initialTrackUrl || '')
  const [genres, setGenres] = useState(initialGenres?.join(', ') || '')
  const [targetReach, setTargetReach] = useState('10000')
  const [scheduledDate, setScheduledDate] = useState('')

  const handleCreatePlan = async () => {
    const genreList = genres.split(',').map(g => g.trim()).filter(Boolean)
    
    await createInfluencePlan({
      submission_id: submissionId,
      campaign_id: campaignId,
      track_url: trackUrl || undefined,
      genres: genreList.length > 0 ? genreList : undefined,
      target_reach: parseInt(targetReach) || 10000,
      date: scheduledDate || undefined
    })
  }

  const handleExecutePlan = async () => {
    if (!currentPlan?.proposal_id || !scheduledDate) return
    
    const success = await executeInfluencePlan(currentPlan.proposal_id, scheduledDate)
    if (success) {
      clearCurrentPlan()
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Influence Planner
          </CardTitle>
          <CardDescription>
            Create intelligent support campaigns by finding the most compatible supporters for your tracks
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!currentPlan ? (
            // Plan Configuration
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="trackUrl">Track URL (optional)</Label>
                  <Input
                    id="trackUrl"
                    placeholder="https://soundcloud.com/artist/track"
                    value={trackUrl}
                    onChange={(e) => setTrackUrl(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="genres">Genres</Label>
                  <Input
                    id="genres"
                    placeholder="Electronic, House, Techno"
                    value={genres}
                    onChange={(e) => setGenres(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="targetReach">Target Reach</Label>
                  <Input
                    id="targetReach"
                    type="number"
                    placeholder="10000"
                    value={targetReach}
                    onChange={(e) => setTargetReach(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="scheduledDate">Scheduled Date (optional)</Label>
                  <Input
                    id="scheduledDate"
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                  />
                </div>
              </div>
              
              <Button 
                onClick={handleCreatePlan} 
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Analyzing...' : 'Create Influence Plan'}
              </Button>
            </div>
          ) : (
            // Plan Results
            <div className="space-y-6">
              {/* Plan Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Supporters</span>
                  </div>
                  <div className="text-2xl font-bold">{currentPlan.supporters.length}</div>
                </Card>
                
                <Card className="p-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium">Est. Reach</span>
                  </div>
                  <div className="text-2xl font-bold">{currentPlan.total_reach.toLocaleString()}</div>
                </Card>
                
                <Card className="p-4">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-orange-600" />
                    <span className="text-sm font-medium">Credits</span>
                  </div>
                  <div className="text-2xl font-bold">{currentPlan.estimated_credits}</div>
                </Card>
              </div>
              
              {/* Conflicts & Recommendations */}
              {(currentPlan.conflicts.length > 0 || currentPlan.recommendations.length > 0) && (
                <div className="space-y-4">
                  {currentPlan.conflicts.length > 0 && (
                    <div className="p-4 bg-destructive/10 rounded-md">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="h-4 w-4 text-destructive" />
                        <span className="font-medium text-destructive">Conflicts</span>
                      </div>
                      <ul className="text-sm space-y-1">
                        {currentPlan.conflicts.map((conflict, index) => (
                          <li key={index}>• {conflict}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {currentPlan.recommendations.length > 0 && (
                    <div className="p-4 bg-blue-50 rounded-md">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="h-4 w-4 text-blue-600" />
                        <span className="font-medium text-blue-600">Recommendations</span>
                      </div>
                      <ul className="text-sm space-y-1">
                        {currentPlan.recommendations.map((rec, index) => (
                          <li key={index}>• {rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
              
              {/* Supporter List */}
              <div className="space-y-4">
                <h3 className="font-medium">Selected Supporters</h3>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {currentPlan.supporters.map((supporter, index) => (
                    <Card key={supporter.member_id} className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>{supporter.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{supporter.name}</div>
                            <div className="text-sm text-muted-foreground">@{supporter.handle}</div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm">
                          <div className="text-center">
                            <div className="font-medium">{supporter.followers.toLocaleString()}</div>
                            <div className="text-muted-foreground">followers</div>
                          </div>
                          <div className="text-center">
                            <div className="font-medium">{supporter.estimated_reach.toLocaleString()}</div>
                            <div className="text-muted-foreground">reach</div>
                          </div>
                          <div className="text-center">
                            <Progress 
                              value={supporter.compatibility_score * 100} 
                              className="w-16" 
                            />
                            <div className="text-muted-foreground">match</div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
              
              <Separator />
              
              {/* Execution */}
              <div className="space-y-4">
                <h3 className="font-medium">Execute Plan</h3>
                <div className="flex gap-4 items-end">
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="executeDate">Execution Date</Label>
                    <Input
                      id="executeDate"
                      type="date"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      min={format(new Date(), 'yyyy-MM-dd')}
                    />
                  </div>
                  <Button 
                    onClick={handleExecutePlan}
                    disabled={loading || !scheduledDate}
                  >
                    {loading ? 'Executing...' : 'Execute Plan'}
                  </Button>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" onClick={clearCurrentPlan}>
                  Create New Plan
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}