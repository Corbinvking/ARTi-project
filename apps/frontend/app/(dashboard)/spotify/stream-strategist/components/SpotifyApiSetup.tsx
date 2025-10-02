import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { ExternalLink } from "lucide-react";

export default function SpotifyApiSetup() {
  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-primary">Spotify API Setup Required</CardTitle>
          <CardDescription>
            To auto-populate playlist data, we need Spotify API credentials.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/20 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Please configure these secrets in your Supabase project:</h3>
            <ul className="space-y-1 text-sm">
              <li>• <code className="bg-muted px-2 py-1 rounded">SPOTIFY_CLIENT_ID</code></li>
              <li>• <code className="bg-muted px-2 py-1 rounded">SPOTIFY_CLIENT_SECRET</code></li>
            </ul>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium">Steps to set up:</h4>
            <ol className="text-sm space-y-1 ml-4">
              <li>1. Get your API keys from Spotify Developer Dashboard</li>
              <li>2. Add them as secrets in your Supabase project</li>
              <li>3. The CSV import will then auto-populate playlist data</li>
            </ol>
          </div>
          
          <Button variant="outline" className="w-full" asChild>
            <a 
              href="https://developer.spotify.com/dashboard" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-center"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Go to Spotify Developer Dashboard
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}







