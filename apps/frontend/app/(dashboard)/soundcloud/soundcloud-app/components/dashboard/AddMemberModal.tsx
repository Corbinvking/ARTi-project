"use client"

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { UserPlus, Music, Loader2 } from 'lucide-react';
import { supabase } from '../../integrations/supabase/client';
import { useToast } from '../../hooks/use-toast';
import { ManualGenreSelector } from './ManualGenreSelector';

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface FormData {
  name: string;
  primary_email: string;
  additional_emails: string;
  soundcloud_url: string;
  monthly_repost_limit: number;
  size_tier: 'T1' | 'T2' | 'T3' | 'T4';
  genre_family_id?: string;
  manual_genres: string[];
  genre_notes: string;
}

interface SoundCloudAnalysis {
  success: boolean;
  followers?: number;
  profileName?: string;
  error?: string;
}

export const AddMemberModal: React.FC<AddMemberModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState<FormData>({
    name: '',
    primary_email: '',
    additional_emails: '',
    soundcloud_url: '',
    monthly_repost_limit: 1,
    size_tier: 'T1',
    genre_family_id: undefined,
    manual_genres: [],
    genre_notes: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [soundcloudAnalysis, setSoundcloudAnalysis] = useState<SoundCloudAnalysis | null>(null);

  const validateUrl = (url: string) => {
    if (!url) return true;
    return /^https?:\/\/(www\.)?soundcloud\.com\/.+/.test(url);
  };

  const analyzeSoundCloudProfile = async () => {
    if (!formData.soundcloud_url) {
      toast({
        title: "Missing SoundCloud URL",
        description: "Please enter a SoundCloud URL first",
        variant: "destructive"
      });
      return;
    }

    if (!validateUrl(formData.soundcloud_url)) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid SoundCloud URL",
        variant: "destructive"
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-soundcloud-profile', {
        body: { soundcloudUrl: formData.soundcloud_url }
      });

      if (error) throw error;

      setSoundcloudAnalysis(data);
      
      if (data.success) {
        toast({
          title: "Analysis Complete",
          description: `Found profile: ${data.profileName} with ${data.followers} followers`,
        });
        
        // Auto-populate name if empty
        if (!formData.name && data.profileName) {
          setFormData(prev => ({ ...prev, name: data.profileName }));
        }
      } else {
        toast({
          title: "Analysis Failed",
          description: data.error || "Could not analyze SoundCloud profile",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error('Error analyzing SoundCloud profile:', error);
      toast({
        title: "Analysis Error",
        description: "Failed to analyze SoundCloud profile",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.primary_email || !formData.soundcloud_url) {
      toast({
        title: "Missing Fields",
        description: "Please fill in name, primary email, and SoundCloud URL",
        variant: "destructive"
      });
      return;
    }

    if (!validateUrl(formData.soundcloud_url)) {
      toast({
        title: "Invalid SoundCloud URL",
        description: "Please enter a valid SoundCloud URL",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      // Prepare emails array
      const emails = [formData.primary_email];
      if (formData.additional_emails.trim()) {
        const additionalEmails = formData.additional_emails
          .split(',')
          .map(email => email.trim())
          .filter(email => email);
        emails.push(...additionalEmails);
      }

      // Use SoundCloud analysis data if available, otherwise default values
      const soundcloudFollowers = soundcloudAnalysis?.success ? soundcloudAnalysis.followers || 0 : 0;

      const { data, error } = await supabase
        .from('soundcloud_members')
        .insert({
          name: formData.name,
          primary_email: formData.primary_email,
          emails: emails,
          soundcloud_url: formData.soundcloud_url,
          soundcloud_followers: soundcloudFollowers,
          monthly_repost_limit: formData.monthly_repost_limit,
          size_tier: formData.size_tier,
          status: 'active',
          genre_family_id: formData.genre_family_id || null,
          manual_genres: formData.manual_genres,
          genre_notes: formData.genre_notes || null
        })
        .select()
        .single();

      if (error) throw error;

      // Auto-provision auth credentials via backend API
      if (data?.id) {
        try {
          const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.artistinfluence.com';
          const provisionRes = await fetch(`${apiBaseUrl}/api/soundcloud/members/provision-auth`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              memberId: data.id,
              email: formData.primary_email,
              name: formData.name,
            }),
          });
          const provisionData = await provisionRes.json();

          if (provisionData.status === 'created' || provisionData.status === 'linked') {
            toast({
              title: "Member Added + Login Created",
              description: `${formData.name} has been added and login credentials were auto-created`,
            });
          } else {
            toast({
              title: "Member Added",
              description: `${formData.name} added. Login provisioning: ${provisionData.reason || provisionData.status}`,
            });
          }
        } catch (provisionErr: any) {
          console.error('Auth provisioning failed:', provisionErr);
          toast({
            title: "Member Added (login pending)",
            description: `${formData.name} was added, but auto-login creation failed. It can be retried later.`,
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Member Added",
          description: `${formData.name} has been successfully added to the system`,
        });
      }

      // Reset form
      setFormData({
        name: '',
        primary_email: '',
        additional_emails: '',
        soundcloud_url: '',
        monthly_repost_limit: 1,
        size_tier: 'T1',
        genre_family_id: undefined,
        manual_genres: [],
        genre_notes: ''
      });
      setSoundcloudAnalysis(null);
      
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error adding member:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add member",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      primary_email: '',
      additional_emails: '',
      soundcloud_url: '',
      monthly_repost_limit: 1,
      size_tier: 'T1',
      genre_family_id: undefined,
      manual_genres: [],
      genre_notes: ''
    });
    setSoundcloudAnalysis(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add New Member
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Basic Information</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name" className="text-sm font-medium">Full Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Artist or member name"
                  className="mt-1"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="primary_email" className="text-sm font-medium">Primary Email *</Label>
                <Input
                  id="primary_email"
                  type="email"
                  value={formData.primary_email}
                  onChange={(e) => setFormData({...formData, primary_email: e.target.value})}
                  placeholder="primary@email.com"
                  className="mt-1"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="additional_emails" className="text-sm font-medium">Additional Emails</Label>
                <Input
                  id="additional_emails"
                  value={formData.additional_emails}
                  onChange={(e) => setFormData({...formData, additional_emails: e.target.value})}
                  placeholder="email2@domain.com, email3@domain.com"
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">Separate multiple emails with commas</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Platform Information */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Platform Information</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="soundcloud_url" className="text-sm font-medium">SoundCloud URL *</Label>
                <Input
                  id="soundcloud_url"
                  value={formData.soundcloud_url}
                  onChange={(e) => setFormData({...formData, soundcloud_url: e.target.value})}
                  placeholder="https://soundcloud.com/artist-name"
                  className="mt-1"
                  required
                />
                
                {soundcloudAnalysis && (
                  <div className="mt-2 p-3 rounded-md bg-muted">
                    {soundcloudAnalysis.success ? (
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{soundcloudAnalysis.profileName}</p>
                          <p className="text-xs text-muted-foreground">
                            {soundcloudAnalysis.followers?.toLocaleString()} followers
                          </p>
                        </div>
                        <Badge variant="secondary">Analyzed</Badge>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-destructive">{soundcloudAnalysis.error}</p>
                        <Badge variant="destructive">Failed</Badge>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Manual Genre Classification */}
          <div>
            <ManualGenreSelector
              selectedFamilyId={formData.genre_family_id}
              selectedGenres={formData.manual_genres}
              genreNotes={formData.genre_notes}
              onFamilyChange={(familyId) => setFormData({...formData, genre_family_id: familyId})}
              onGenresChange={(genres) => setFormData({...formData, manual_genres: genres})}
              onNotesChange={(notes) => setFormData({...formData, genre_notes: notes})}
            />
          </div>

          <Separator />

          {/* Member Settings */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Member Settings</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="monthly_repost_limit" className="text-sm font-medium">Monthly Repost Limit</Label>
                <Input
                  id="monthly_repost_limit"
                  type="number"
                  min="1"
                  value={formData.monthly_repost_limit}
                  onChange={(e) => setFormData({...formData, monthly_repost_limit: parseInt(e.target.value) || 1})}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="size_tier" className="text-sm font-medium">Size Tier</Label>
                <Select value={formData.size_tier} onValueChange={(value: 'T1' | 'T2' | 'T3' | 'T4') => setFormData({...formData, size_tier: value})}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="T1">T1 (0-1K followers)</SelectItem>
                    <SelectItem value="T2">T2 (1K-10K followers)</SelectItem>
                    <SelectItem value="T3">T3 (10K-100K followers)</SelectItem>
                    <SelectItem value="T4">T4 (100K+ followers)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Adding Member...
                </div>
              ) : (
                'Add Member'
              )}
            </Button>
            <Button type="button" variant="outline" onClick={() => { resetForm(); onClose(); }}>
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};