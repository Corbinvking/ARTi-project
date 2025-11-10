import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Music, Users, TrendingUp, Heart, Repeat, MessageCircle, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

interface PreviewResult {
  trackInfo: {
    artistName: string;
    trackName: string;
    url: string;
  };
  classification: {
    family: string;
    subgenres: string[];
  };
  supporters: {
    total: number;
    tierBreakdown: { T1: number; T2: number; T3: number; T4: number };
    profiles: Array<{
      name: string;
      followers: number;
      tier: string;
      estimatedReach: number;
    }>;
  };
  reachEstimate: {
    totalPotentialReach: number;
    averageReachPerSupporter: number;
    estimatedLikes: number;
    estimatedReposts: number;
    estimatedComments: number;
  };
}

export default function PreviewTool() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [trackUrl, setTrackUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<PreviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!trackUrl.trim()) {
      toast({
        title: "URL Required",
        description: "Please enter a SoundCloud track URL",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const { data, error: functionError } = await supabase.functions.invoke('preview-estimate', {
        body: { trackUrl: trackUrl.trim() }
      });

      if (functionError) {
        throw new Error(functionError.message || 'Failed to generate preview');
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setResult(data);
      toast({
        title: "Preview Generated",
        description: "Your support estimate is ready!",
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Something went wrong';
      setError(errorMessage);
      toast({
        title: "Preview Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getTierLabel = (tier: string) => {
    const labels = {
      T1: 'Rising (0-1K)',
      T2: 'Growing (1K-10K)', 
      T3: 'Established (10K-100K)',
      T4: 'Major (100K+)'
    };
    return labels[tier as keyof typeof labels] || tier;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate('/')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <Music className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-semibold">Preview Tool</h1>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/auth')}>
              Login
            </Button>
            <Button onClick={() => navigate('/auth')}>
              Join Now
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Introduction */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-4">See Your Potential Support</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Enter your SoundCloud track URL below to see how many artists would support your music 
            and estimate your potential reach if you joined our community.
          </p>
        </div>

        {/* Input Form */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Track Analysis</CardTitle>
            <CardDescription>
              Paste your SoundCloud track URL to get started
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex gap-2">
                <Input
                  type="url"
                  placeholder="https://soundcloud.com/artist/track-name"
                  value={trackUrl}
                  onChange={(e) => setTrackUrl(e.target.value)}
                  className="flex-1"
                  disabled={isLoading}
                />
                <Button type="submit" disabled={isLoading || !trackUrl.trim()}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    'Get Preview'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive" className="mb-8">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-6">
            {/* Track Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Music className="h-5 w-5" />
                  Track Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div>
                    <span className="font-medium">Artist:</span> {result.trackInfo.artistName}
                  </div>
                  <div>
                    <span className="font-medium">Track:</span> {result.trackInfo.trackName}
                  </div>
                  <div>
                    <span className="font-medium">Genre:</span> {result.classification.family}
                  </div>
                  {result.classification.subgenres.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">Subgenres:</span>
                      {result.classification.subgenres.map((subgenre) => (
                        <Badge key={subgenre} variant="secondary">
                          {subgenre}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Reach Estimate */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Estimated Reach
                </CardTitle>
                <CardDescription>
                  Potential engagement if you joined our community today
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <Heart className="h-6 w-6 mx-auto mb-2 text-red-500" />
                    <div className="text-2xl font-bold">
                      {formatNumber(result.reachEstimate.estimatedLikes)}
                    </div>
                    <div className="text-sm text-muted-foreground">Likes</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <Repeat className="h-6 w-6 mx-auto mb-2 text-green-500" />
                    <div className="text-2xl font-bold">
                      {formatNumber(result.reachEstimate.estimatedReposts)}
                    </div>
                    <div className="text-sm text-muted-foreground">Reposts</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <MessageCircle className="h-6 w-6 mx-auto mb-2 text-blue-500" />
                    <div className="text-2xl font-bold">
                      {formatNumber(result.reachEstimate.estimatedComments)}
                    </div>
                    <div className="text-sm text-muted-foreground">Comments</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <TrendingUp className="h-6 w-6 mx-auto mb-2 text-purple-500" />
                    <div className="text-2xl font-bold">
                      {formatNumber(result.reachEstimate.totalPotentialReach)}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Reach</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Supporters */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Potential Supporters ({result.supporters.total})
                </CardTitle>
                <CardDescription>
                  Active artists in your genre who would support your track
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Tier Breakdown */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  {Object.entries(result.supporters.tierBreakdown).map(([tier, count]) => (
                    <div key={tier} className="text-center p-3 border rounded-lg">
                      <div className="text-lg font-bold">{count}</div>
                      <div className="text-sm text-muted-foreground">
                        {getTierLabel(tier)}
                      </div>
                    </div>
                  ))}
                </div>

                <Separator className="mb-4" />

                {/* Top Supporters */}
                {result.supporters.profiles.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-4">Sample Supporters</h4>
                    <div className="space-y-2">
                      {result.supporters.profiles.slice(0, 5).map((supporter, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <div className="font-medium">{supporter.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {formatNumber(supporter.followers)} followers
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge variant={
                              supporter.tier === 'T4' ? 'default' :
                              supporter.tier === 'T3' ? 'secondary' :
                              supporter.tier === 'T2' ? 'outline' : 'outline'
                            }>
                              {getTierLabel(supporter.tier)}
                            </Badge>
                            <div className="text-sm text-muted-foreground mt-1">
                              ~{formatNumber(supporter.estimatedReach)} reach
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Call to Action */}
            <Card className="border-primary">
              <CardContent className="pt-6 text-center">
                <h3 className="text-xl font-bold mb-2">Ready to Get This Support?</h3>
                <p className="text-muted-foreground mb-4">
                  Join our community to start receiving real support from {result.supporters.total} artists in your genre
                </p>
                <Button size="lg" onClick={() => navigate('/auth')}>
                  Join SoundCloud Groups
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}