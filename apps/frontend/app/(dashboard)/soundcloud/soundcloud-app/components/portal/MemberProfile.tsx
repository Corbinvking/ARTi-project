"use client"

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '../../hooks/use-toast';
import { 
  User, 
  Mail, 
  Globe, 
  Music, 
  Settings, 
  Save, 
  Loader2, 
  ExternalLink,
  Bell,
  Shield,
  Palette
} from 'lucide-react';

interface ProfileData {
  name: string;
  primary_email: string;
  soundcloud_url: string;
  notification_preferences: {
    submissions: boolean;
    queue_updates: boolean;
    system_updates: boolean;
    marketing: boolean;
  };
}

interface GenreFamily {
  id: string;
  name: string;
}

export const MemberProfile = () => {
  const { member } = useAuth();
  const { toast } = useToast();
  
  const [profileData, setProfileData] = useState<ProfileData>({
    name: '',
    primary_email: '',
    soundcloud_url: '',
    notification_preferences: {
      submissions: true,
      queue_updates: true,
      system_updates: true,
      marketing: false,
    }
  });
  
  const [genreFamilies, setGenreFamilies] = useState<GenreFamily[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (member) {
      setProfileData({
        name: member.name || '',
        primary_email: member.primary_email || '',
        soundcloud_url: member.soundcloud_url || '',
        notification_preferences: {
          submissions: true,
          queue_updates: true,
          system_updates: true,
          marketing: false,
        }
      });
      setSelectedGenres(member.families || []);
    }
  }, [member]);

  useEffect(() => {
    fetchGenreFamilies();
  }, []);

  const fetchGenreFamilies = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('genre_families')
        .select('id, name')
        .eq('active', true)
        .order('name');

      if (error) throw error;
      setGenreFamilies(data || []);
    } catch (error) {
      console.error('Error fetching genre families:', error);
      toast({
        title: "Error",
        description: "Failed to load genre options.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const validateUrl = (url: string, platform: 'soundcloud' | 'spotify') => {
    if (!url) return true;
    
    const patterns = {
      soundcloud: /^https:\/\/(www\.)?soundcloud\.com\/.+/,
      spotify: /^https:\/\/open\.spotify\.com\/(artist|user)\/.+/
    };
    
    return patterns[platform].test(url);
  };

  const handleSave = async () => {
    if (!member) return;

    // Validate URLs
    if (profileData.soundcloud_url && !validateUrl(profileData.soundcloud_url, 'soundcloud')) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid SoundCloud profile URL.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('members')
        .update({
          name: profileData.name,
          primary_email: profileData.primary_email,
          soundcloud_url: profileData.soundcloud_url || null,
          families: selectedGenres,
          updated_at: new Date().toISOString(),
        })
        .eq('id', member.id);

      if (error) throw error;

      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleGenre = (genreId: string) => {
    setSelectedGenres(prev => 
      prev.includes(genreId) 
        ? prev.filter(id => id !== genreId)
        : [...prev, genreId]
    );
  };

  if (!member) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Profile Settings</h1>
        <p className="text-muted-foreground">
          Manage your profile information, platform links, and preferences.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Personal Information
            </CardTitle>
            <CardDescription>
              Update your name and contact information.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={profileData.name}
                onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter your full name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Primary Email</Label>
              <Input
                id="email"
                type="email"
                value={profileData.primary_email}
                onChange={(e) => setProfileData(prev => ({ ...prev, primary_email: e.target.value }))}
                placeholder="Enter your email address"
              />
            </div>

            <div className="pt-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Member Status</Label>
                <Badge variant="secondary">{member.status}</Badge>
              </div>
              <div className="flex items-center justify-between mt-2">
                <Label className="text-sm font-medium">Size Tier</Label>
                <Badge>{member.size_tier}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Platform Links */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Platform Links
            </CardTitle>
            <CardDescription>
              Connect your music platform profiles.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="soundcloud">SoundCloud Profile</Label>
              <div className="flex gap-2">
                <Input
                  id="soundcloud"
                  value={profileData.soundcloud_url}
                  onChange={(e) => setProfileData(prev => ({ ...prev, soundcloud_url: e.target.value }))}
                  placeholder="https://soundcloud.com/your-profile"
                />
                {profileData.soundcloud_url && (
                  <Button
                    variant="outline"
                    size="icon"
                    asChild
                  >
                    <a href={profileData.soundcloud_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                )}
              </div>
            </div>
            
            {/* Remove Spotify Profile section */}

            {member.soundcloud_followers > 0 && (
              <div className="pt-2 text-sm text-muted-foreground">
                SoundCloud Followers: {member.soundcloud_followers.toLocaleString()}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Genre Preferences */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Genre Preferences
            </CardTitle>
            <CardDescription>
              Select the music genres that best represent your style.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {genreFamilies.map((genre) => (
                  <Badge
                    key={genre.id}
                    variant={selectedGenres.includes(genre.id) ? "default" : "outline"}
                    className="cursor-pointer transition-all hover:scale-105"
                    onClick={() => toggleGenre(genre.id)}
                  >
                    {genre.name}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notification Preferences */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notification Preferences
            </CardTitle>
            <CardDescription>
              Choose which notifications you'd like to receive.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Submission Updates</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified about your track submission status changes.
                </p>
              </div>
              <Switch
                checked={profileData.notification_preferences.submissions}
                onCheckedChange={(checked) => 
                  setProfileData(prev => ({
                    ...prev,
                    notification_preferences: {
                      ...prev.notification_preferences,
                      submissions: checked
                    }
                  }))
                }
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Queue Updates</Label>
                <p className="text-sm text-muted-foreground">
                  Receive notifications about new support queue assignments.
                </p>
              </div>
              <Switch
                checked={profileData.notification_preferences.queue_updates}
                onCheckedChange={(checked) => 
                  setProfileData(prev => ({
                    ...prev,
                    notification_preferences: {
                      ...prev.notification_preferences,
                      queue_updates: checked
                    }
                  }))
                }
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>System Updates</Label>
                <p className="text-sm text-muted-foreground">
                  Important system announcements and maintenance notifications.
                </p>
              </div>
              <Switch
                checked={profileData.notification_preferences.system_updates}
                onCheckedChange={(checked) => 
                  setProfileData(prev => ({
                    ...prev,
                    notification_preferences: {
                      ...prev.notification_preferences,
                      system_updates: checked
                    }
                  }))
                }
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Marketing & Updates</Label>
                <p className="text-sm text-muted-foreground">
                  News about new features, tips, and community updates.
                </p>
              </div>
              <Switch
                checked={profileData.notification_preferences.marketing}
                onCheckedChange={(checked) => 
                  setProfileData(prev => ({
                    ...prev,
                    notification_preferences: {
                      ...prev.notification_preferences,
                      marketing: checked
                    }
                  }))
                }
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-6">
        <Button 
          onClick={handleSave} 
          disabled={isSaving}
          className="min-w-[120px]"
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
};