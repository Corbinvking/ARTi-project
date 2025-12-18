import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "../integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Play } from "lucide-react";

const getApiUrl = () => {
  if (typeof window !== 'undefined') {
    const envUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL;
    if (envUrl) {
      return envUrl;
    }
    if (window.location.hostname === 'app.artistinfluence.com') {
      return 'https://api.artistinfluence.com';
    }
    return 'http://localhost:3001';
  }
  return process.env.API_URL || process.env.API_BASE_URL || 'http://localhost:3001';
};

export const TestYouTubeAPI = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const testYouTubeAPI = async () => {
    setLoading(true);
    try {
      console.log('Testing YouTube API integration...');
      
      // First, get an orgId from existing campaigns
      const { data: campaigns, error: campaignError } = await supabase
        .from('youtube_campaigns')
        .select('org_id')
        .limit(1)
        .single();

      if (campaignError || !campaigns?.org_id) {
        // If no campaigns exist, test with a single video fetch instead
        console.log('No campaigns found, testing single video fetch...');
        const testVideoUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
        
        const response = await fetch(`${getApiUrl()}/api/youtube-data-api/fetch-video-stats`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ videoUrl: testVideoUrl }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        setResult({
          success: true,
          message: 'YouTube API test successful!',
          testVideo: {
            videoId: data.videoId,
            title: data.title,
            views: data.viewCount,
            likes: data.likeCount,
            comments: data.commentCount,
          },
        });
        
        toast({
          title: "Success!",
          description: `YouTube API is working. Test video: ${data.title}`,
        });
        return;
      }

      // Test bulk fetch for campaigns
      console.log('Testing bulk campaign fetch...');
      const response = await fetch(`${getApiUrl()}/api/youtube-data-api/fetch-all-campaigns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orgId: campaigns.org_id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setResult(data);
      
      toast({
        title: "Success!",
        description: `Updated ${data.updated} of ${data.total} campaigns`,
      });
    } catch (error: any) {
      console.error('Test failed:', error);
      toast({
        title: "Test Failed",
        description: error.message || 'Unknown error occurred',
        variant: "destructive",
      });
      setResult({ error: error.message || 'Unknown error occurred' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Play className="h-5 w-5" />
          Test YouTube API Integration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={testYouTubeAPI} 
          disabled={loading}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Fetching YouTube Stats...
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Test API Now
            </>
          )}
        </Button>
        
        {result && (
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <pre className="text-xs overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
};