import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "../integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Play } from "lucide-react";

import { getApiUrl } from "../lib/getApiUrl";

export const TestYouTubeAPI = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const testYouTubeAPI = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      const apiUrl = getApiUrl();
      const hostname = typeof window !== 'undefined' ? window.location.hostname : 'server';
      console.log('Testing YouTube API integration...');
      console.log('Hostname:', hostname);
      console.log('API URL:', apiUrl);
      console.log('Env vars:', {
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
        NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
      });
      
      // First, test API connectivity with health check
      console.log('Testing API connectivity...');
      try {
        const healthResponse = await fetch(`${apiUrl}/api/health`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (!healthResponse.ok) {
          throw new Error(`API health check failed: HTTP ${healthResponse.status}`);
        }
        
        const healthData = await healthResponse.json();
        console.log('✅ API server is reachable:', healthData);
      } catch (healthError: any) {
        console.error('❌ API health check failed:', healthError);
        throw new Error(`Cannot reach API server at ${apiUrl}. ${healthError.message || 'Server may be down or unreachable.'}`);
      }
      
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
        const endpoint = `${apiUrl}/api/youtube-data-api/fetch-video-stats`;
        
        console.log('Fetching from:', endpoint);
        
        let response: Response;
        let errorMessage = '';
        
        try {
          response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ videoUrl: testVideoUrl }),
          });
        } catch (fetchError: any) {
          console.error('Fetch error details:', {
            message: fetchError.message,
            name: fetchError.name,
            stack: fetchError.stack,
            endpoint,
          });
          
          // More specific error messages
          if (fetchError.message?.includes('CORS')) {
            errorMessage = `CORS error: The API server is blocking requests from this origin. Check CORS configuration.`;
          } else if (fetchError.message?.includes('Failed to fetch') || fetchError.message?.includes('NetworkError')) {
            errorMessage = `Network error: Cannot connect to ${apiUrl}. The API server may be down, unreachable, or blocked by firewall/CORS.`;
          } else {
            errorMessage = `Network error: ${fetchError.message || 'Failed to connect to API server'}`;
          }
          throw new Error(errorMessage);
        }

        if (!response.ok) {
          let errorData: any;
          try {
            errorData = await response.json();
          } catch {
            errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
          }
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
      const endpoint = `${apiUrl}/api/youtube-data-api/fetch-all-campaigns`;
      console.log('Fetching from:', endpoint);
      
      let response: Response;
      try {
        response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ orgId: campaigns.org_id }),
        });
      } catch (fetchError: any) {
        console.error('Fetch error details:', {
          message: fetchError.message,
          name: fetchError.name,
          stack: fetchError.stack,
          endpoint,
        });
        
        // More specific error messages
        if (fetchError.message?.includes('CORS')) {
          throw new Error(`CORS error: The API server is blocking requests from this origin. Check CORS configuration.`);
        } else if (fetchError.message?.includes('Failed to fetch') || fetchError.message?.includes('NetworkError')) {
          throw new Error(`Network error: Cannot connect to ${apiUrl}. The API server may be down, unreachable, or blocked by firewall/CORS.`);
        } else {
          throw new Error(`Network error: ${fetchError.message || 'Failed to connect to API server. Make sure the API server is running on ' + apiUrl}`);
        }
      }

      if (!response.ok) {
        let errorData: any;
        try {
          errorData = await response.json();
        } catch {
          errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
        }
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
      const errorMsg = error.message || 'Unknown error occurred';
      toast({
        title: "Test Failed",
        description: errorMsg,
        variant: "destructive",
      });
      setResult({ 
        error: errorMsg,
        apiUrl: getApiUrl(),
        hint: errorMsg.includes('Network error') ? 'Make sure the API server is running. Check console for details.' : undefined
      });
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