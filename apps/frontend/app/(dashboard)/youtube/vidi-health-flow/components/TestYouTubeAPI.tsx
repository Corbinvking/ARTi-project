import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "../integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Play } from "lucide-react";

export const TestYouTubeAPI = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const testYouTubeAPI = async () => {
    setLoading(true);
    try {
      console.log('Invoking YouTube API function...');
      
      const { data, error } = await supabase.functions.invoke('fetch_youtube_stats', {
        body: { test: true }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }

      setResult(data);
      toast({
        title: "Success!",
        description: `Updated stats for ${data.campaignsProcessed} campaigns`,
      });
    } catch (error: any) {
      console.error('Test failed:', error);
      toast({
        title: "Test Failed",
        description: error.message || 'Unknown error occurred',
        variant: "destructive",
      });
      setResult({ error: error.message });
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