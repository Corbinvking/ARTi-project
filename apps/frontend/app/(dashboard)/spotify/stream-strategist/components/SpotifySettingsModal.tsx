"use client"

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useToast } from "../hooks/use-toast";
import { supabase } from "../integrations/supabase/client";

interface SpotifySettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SpotifySettingsModal({ open, onOpenChange }: SpotifySettingsModalProps) {
  const [credentials, setCredentials] = useState({
    client_id: "",
    client_secret: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadCredentials();
    }
  }, [open]);

  const loadCredentials = async () => {
    try {
      // Try to load existing credentials from localStorage for now
      const savedClientId = localStorage.getItem('spotify_client_id') || '';
      const savedClientSecret = localStorage.getItem('spotify_client_secret') || '';
      
      setCredentials({
        client_id: savedClientId,
        client_secret: savedClientSecret,
      });
    } catch (error) {
      console.error('Error loading credentials:', error);
    }
  };

  const handleSave = async () => {
    if (!credentials.client_id || !credentials.client_secret) {
      toast({
        title: "Error",
        description: "Please enter both Client ID and Client Secret",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Save to localStorage for now (in production, use Supabase secrets)
      localStorage.setItem('spotify_client_id', credentials.client_id);
      localStorage.setItem('spotify_client_secret', credentials.client_secret);
      
      toast({
        title: "Success",
        description: "Spotify API credentials saved successfully",
      });
      
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save credentials",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Spotify API Configuration</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="client_id">Client ID</Label>
            <Input
              id="client_id"
              type="text"
              value={credentials.client_id}
              onChange={(e) => setCredentials({ ...credentials, client_id: e.target.value })}
              placeholder="Your Spotify Client ID"
            />
          </div>
          
          <div>
            <Label htmlFor="client_secret">Client Secret</Label>
            <Input
              id="client_secret"
              type="password"
              value={credentials.client_secret}
              onChange={(e) => setCredentials({ ...credentials, client_secret: e.target.value })}
              placeholder="Your Spotify Client Secret"
            />
          </div>
          
          <div className="text-sm text-muted-foreground">
            Get your API credentials from the{" "}
            <a 
              href="https://developer.spotify.com/dashboard" 
              target="_blank" 
              rel="noopener noreferrer"
              className="underline hover:text-primary"
            >
              Spotify Developer Dashboard
            </a>
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={isLoading}
            >
              {isLoading ? "Saving..." : "Save Credentials"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}








