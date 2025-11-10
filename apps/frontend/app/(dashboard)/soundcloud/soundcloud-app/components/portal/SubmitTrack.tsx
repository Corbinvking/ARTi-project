"use client"

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../hooks/use-toast';
import { supabase } from '../../integrations/supabase/client';
import { Upload, AlertCircle, CheckCircle, User, Music, Calendar, Settings } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface GenreFamily {
  id: string;
  name: string;
}

export const SubmitTrack = () => {
  const { member, user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [genreFamilies, setGenreFamilies] = useState<GenreFamily[]>([]);
  const [formData, setFormData] = useState({
    track_name: '',
    track_url: '',
    alternative_url: '',
    artist_name: '',
    secondary_email: '',
    release_date: '',
    family: '',
    support_date: '',
    need_live_link: false,
    notes: '',
  });

  // Enhanced access control
  const canSubmit = member && 
    member.status === 'active' && 
    member.submissions_this_month < member.monthly_repost_limit &&
    user?.email && member.emails.includes(user.email);
  
  const remainingSubmissions = member ? member.monthly_repost_limit - member.submissions_this_month : 0;

  // Fetch genre families
  useEffect(() => {
    const fetchGenreFamilies = async () => {
      const { data, error } = await supabase
        .from('genre_families')
        .select('id, name')
        .eq('active', true)
        .order('name');
      
      if (error) {
        console.error('Error fetching genre families:', error);
        return;
      }
      
      setGenreFamilies(data || []);
    };

    fetchGenreFamilies();
  }, []);

  // Auto-populate form data from member info
  useEffect(() => {
    if (member) {
      setFormData(prev => ({
        ...prev,
        artist_name: member.name,
        secondary_email: member.emails.find(email => email !== member.primary_email) || ''
      }));
    }
  }, [member]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member || !canSubmit) return;

    setLoading(true);
    try {
      // Enhanced validation
      if (!formData.track_name?.trim()) {
        toast({
          title: "Missing Track Name",
          description: "Please enter the name of your track",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      if (!formData.track_url && !formData.alternative_url) {
        toast({
          title: "Missing Track URL",
          description: "Please provide either a SoundCloud URL or alternative URL",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Validate SoundCloud URL if provided
      if (formData.track_url && !formData.track_url.includes('soundcloud.com')) {
        toast({
          title: "Invalid SoundCloud URL",
          description: "Please enter a valid SoundCloud URL",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Validate support date is in the future
      if (formData.support_date) {
        const supportDate = new Date(formData.support_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (supportDate < today) {
          toast({
            title: "Invalid Support Date",
            description: "Support date must be in the future",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
      }

      const { error } = await supabase
        .from('submissions')
        .insert([
          {
            member_id: member.id,
            track_name: formData.track_name.trim(),
            track_url: formData.track_url || null,
            alternative_url: formData.alternative_url || null,
            artist_name: formData.artist_name || member.name,
            secondary_email: formData.secondary_email || null,
            release_date: formData.release_date || null,
            support_date: formData.support_date || null,
            family: formData.family || null,
            need_live_link: formData.need_live_link,
            notes: formData.notes || null,
            status: 'new',
            subgenres: [], // Will be determined by admin/auto-classification
          }
        ]);

      if (error) throw error;

      toast({
        title: "Track Submitted!",
        description: "Your track has been submitted successfully and is now in the queue for review.",
      });

      // Reset form
      setFormData({
        track_name: '',
        track_url: '',
        alternative_url: '',
        artist_name: member.name,
        secondary_email: member.emails.find(email => email !== member.primary_email) || '',
        release_date: '',
        family: '',
        support_date: '',
        need_live_link: false,
        notes: '',
      });

    } catch (error: any) {
      toast({
        title: "Submission Failed",
        description: error.message || "An error occurred while submitting your track",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!member) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Loading member data...
      </div>
    );
  }

  // Enhanced access control messaging
  if (!user?.email || !member.emails.includes(user.email)) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <Alert className="border-destructive/20 bg-destructive/5">
          <AlertCircle className="h-4 w-4 text-destructive" />
          <AlertDescription>
            <strong>Access Denied:</strong> Your email address is not associated with a valid member account. 
            Please contact support if you believe this is an error.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (member.status !== 'active') {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <Alert className="border-destructive/20 bg-destructive/5">
          <AlertCircle className="h-4 w-4 text-destructive" />
          <AlertDescription>
            <strong>Account Inactive:</strong> Your member account is not active. 
            Please contact support to reactivate your account.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-foreground">Submit New Track</h1>
        <p className="text-muted-foreground">Submit your track for promotion consideration through our SoundCloud groups</p>
      </div>

      {/* Submission Status */}
      <Alert className={canSubmit ? "border-primary/20 bg-primary/5" : "border-destructive/20 bg-destructive/5"}>
        {canSubmit ? (
          <CheckCircle className="h-4 w-4 text-primary" />
        ) : (
          <AlertCircle className="h-4 w-4 text-destructive" />
        )}
        <AlertDescription>
          {canSubmit ? (
            <>You have <strong>{remainingSubmissions}</strong> submission{remainingSubmissions !== 1 ? 's' : ''} remaining this month (Tier {member.size_tier})</>
          ) : (
            <>You have reached your monthly submission limit of <strong>{member.monthly_repost_limit}</strong> tracks</>
          )}
        </AlertDescription>
      </Alert>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Information Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="primary_email">Primary Email</Label>
                <Input
                  id="primary_email"
                  type="email"
                  value={member.primary_email || ''}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="secondary_email">Secondary Email (Optional)</Label>
                <Input
                  id="secondary_email"
                  type="email"
                  placeholder="alternative@email.com"
                  value={formData.secondary_email}
                  onChange={(e) => handleInputChange('secondary_email', e.target.value)}
                  disabled={!canSubmit || loading}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="artist_name">Brand/Artist Name</Label>
              <Input
                id="artist_name"
                type="text"
                placeholder="Your artist or brand name"
                value={formData.artist_name}
                onChange={(e) => handleInputChange('artist_name', e.target.value)}
                disabled={!canSubmit || loading}
                required
              />
              <p className="text-xs text-muted-foreground">
                This will be displayed in the promotion. Default: {member.name}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Track Details Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Music className="h-5 w-5" />
              Track Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="track_name">Track Name *</Label>
              <Input
                id="track_name"
                type="text"
                placeholder="Enter your track name"
                value={formData.track_name}
                onChange={(e) => handleInputChange('track_name', e.target.value)}
                disabled={!canSubmit || loading}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="track_url">SoundCloud URL</Label>
              <Input
                id="track_url"
                type="url"
                placeholder="https://soundcloud.com/artist/track"
                value={formData.track_url}
                onChange={(e) => handleInputChange('track_url', e.target.value)}
                disabled={!canSubmit || loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="alternative_url">Alternative URL (for unreleased tracks)</Label>
              <Input
                id="alternative_url"
                type="url"
                placeholder="https://dropbox.com/... or private streaming link"
                value={formData.alternative_url}
                onChange={(e) => handleInputChange('alternative_url', e.target.value)}
                disabled={!canSubmit || loading}
              />
              <p className="text-xs text-muted-foreground">
                Use this for private previews, Dropbox links, or other streaming services
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="release_date">Release Date</Label>
              <Input
                id="release_date"
                type="date"
                value={formData.release_date}
                onChange={(e) => handleInputChange('release_date', e.target.value)}
                disabled={!canSubmit || loading}
              />
              <p className="text-xs text-muted-foreground">
                When was or will this track be released?
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Group Preferences Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Group Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="family">Genre Family</Label>
              <Select
                value={formData.family}
                onValueChange={(value) => handleInputChange('family', value)}
                disabled={!canSubmit || loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select genre family" />
                </SelectTrigger>
                <SelectContent>
                  {genreFamilies.map((family) => (
                    <SelectItem key={family.id} value={family.name}>
                      {family.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="support_date">Preferred Support Date</Label>
              <Input
                id="support_date"
                type="date"
                value={formData.support_date}
                onChange={(e) => handleInputChange('support_date', e.target.value)}
                disabled={!canSubmit || loading}
                min={new Date().toISOString().split('T')[0]}
              />
              <p className="text-xs text-muted-foreground">
                When would you like the support to happen? (Optional)
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="need_live_link"
                checked={formData.need_live_link}
                onCheckedChange={(checked) => handleInputChange('need_live_link', checked)}
                disabled={!canSubmit || loading}
              />
              <Label htmlFor="need_live_link" className="text-sm">
                This track requires a live streaming link for promotion
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Additional Information Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Additional Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="notes">Notes & Special Requests</Label>
              <Textarea
                id="notes"
                placeholder="Any additional information, special requests, or context about your track..."
                rows={4}
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                disabled={!canSubmit || loading}
              />
            </div>
          </CardContent>
        </Card>

        <Button 
          type="submit" 
          disabled={!canSubmit || loading || !formData.track_name}
          className="w-full h-12 text-lg"
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
              Submitting Track...
            </>
          ) : (
            <>
              <Upload className="w-5 h-5 mr-2" />
              Submit Track for Review
            </>
          )}
        </Button>
      </form>

      {/* Submission Guidelines */}
      <Card>
        <CardHeader>
          <CardTitle>Submission Guidelines</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <ul className="list-disc list-inside space-y-2">
            <li>Provide either a <strong>SoundCloud URL</strong> for released tracks or an <strong>alternative URL</strong> for unreleased content</li>
            <li>Track must be accessible by our promotion team</li>
            <li>As a <strong>Tier {member.size_tier}</strong> member, you can submit up to <strong>{member.monthly_repost_limit}</strong> tracks per month</li>
            <li>All submissions are reviewed within <strong>24-48 hours</strong> by our team</li>
            <li>You'll receive email notifications for status updates and support confirmations</li>
            <li>Genre classification may be automatically determined or manually reviewed</li>
            <li>Support dates are suggestions - final scheduling depends on queue availability</li>
            <li>Tracks requiring live links will be prioritized for active promotion campaigns</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};