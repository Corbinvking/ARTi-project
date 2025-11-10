"use client"

import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ExternalLink, Mail, Calendar, Crown, Music, Edit, Save, X, Loader2, RefreshCw, CheckCircle2, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../../integrations/supabase/client';
import { useToast } from '../../hooks/use-toast';
import { format } from 'date-fns';

interface Member {
  id: string;
  name: string;
  stage_name?: string;
  primary_email: string;
  emails: string[];
  status: string;
  size_tier: string;
  followers: number;
  soundcloud_followers: number;
  soundcloud_url: string;
  families: string[];
  subgenres: string[];
  monthly_repost_limit: number;
  submissions_this_month: number;
  net_credits: number;
  created_at: string;
  manual_genres: string[];
  genre_family_id?: string;
  genre_notes?: string;
  manual_monthly_repost_override?: number;
  override_reason?: string;
  override_set_by?: string;
  override_set_at?: string;
  computed_monthly_repost_limit?: number;
}

interface GenreFamily {
  id: string;
  name: string;
  active: boolean;
}

interface Subgenre {
  id: string;
  name: string;
  family_id: string;
  active: boolean;
}

interface MemberDetailModalProps {
  member: Member | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export const MemberDetailModal: React.FC<MemberDetailModalProps> = ({
  member,
  isOpen,
  onClose,
  onUpdate
}) => {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    stage_name: '',
    primary_email: '',
    emails: [] as string[],
    soundcloud_url: '',
    soundcloud_followers: 0,
    monthly_repost_limit: 1,
    manual_monthly_repost_override: null as number | null,
    override_reason: '',
    families: [] as string[],
    subgenres: [] as string[],
    manual_genres: [] as string[]
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisSuccess, setAnalysisSuccess] = useState(false);
  const [displayMember, setDisplayMember] = useState<Member | null>(null);
  const [genreFamilies, setGenreFamilies] = useState<GenreFamily[]>([]);
  const [subgenres, setSubgenres] = useState<Subgenre[]>([]);
  const [availableSubgenres, setAvailableSubgenres] = useState<Subgenre[]>([]);

  useEffect(() => {
    if (member) {
      setFormData({
        name: member.name || '',
        stage_name: member.stage_name || '',
        primary_email: member.primary_email || '',
        emails: member.emails || [],
        soundcloud_url: member.soundcloud_url || '',
        soundcloud_followers: member.soundcloud_followers || 0,
        monthly_repost_limit: member.monthly_repost_limit || 1,
        manual_monthly_repost_override: member.manual_monthly_repost_override || null,
        override_reason: member.override_reason || '',
        families: member.families || [],
        subgenres: member.subgenres || [],
        manual_genres: member.manual_genres || []
      });
      setDisplayMember(member);
      setAnalysisSuccess(false);
    }
  }, [member]);

  // Fetch genre data when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchGenreData();
    }
  }, [isOpen]);

  const fetchGenreData = async () => {
    try {
      const [familiesResponse, subgenresResponse] = await Promise.all([
        supabase.from('genre_families').select('*').eq('active', true).order('name'),
        supabase.from('subgenres').select('*').eq('active', true).order('name')
      ]);

      if (familiesResponse.error) throw familiesResponse.error;
      if (subgenresResponse.error) throw subgenresResponse.error;

      setGenreFamilies(familiesResponse.data || []);
      setSubgenres(subgenresResponse.data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load genre data",
        variant: "destructive"
      });
    }
  };

  // Update available subgenres when families change
  useEffect(() => {
    const available = subgenres.filter(sub => formData.families.includes(sub.family_id));
    setAvailableSubgenres(available);
    
    // Remove subgenres that are no longer available
    const validSubgenres = formData.subgenres.filter(subId => 
      available.some(sub => sub.id === subId)
    );
    if (validSubgenres.length !== formData.subgenres.length) {
      setFormData(prev => ({ ...prev, subgenres: validSubgenres }));
    }
  }, [formData.families, subgenres]);

  const validateUrl = (url: string, platform: string) => {
    if (!url) return true;
    const patterns = {
      soundcloud: /^https?:\/\/(www\.)?soundcloud\.com\/.+/,
    };
    return patterns[platform as keyof typeof patterns]?.test(url) || false;
  };

  const analyzeProfile = useCallback(async (url: string) => {
    if (!member || !url || !validateUrl(url, 'soundcloud')) return;

    setIsAnalyzing(true);
    setAnalysisSuccess(false);
    
    try {
      const { data, error } = await supabase.functions.invoke('analyze-soundcloud-profile', {
        body: { url, member_id: member.id }
      });

      if (error) throw error;

      if (data?.followers) {
        setFormData(prev => ({
          ...prev,
          soundcloud_followers: data.followers
        }));
        setAnalysisSuccess(true);
        
        toast({
          title: "Analysis Complete",
          description: `Found ${data.followers.toLocaleString()} followers`
        });

        // Auto-hide success indicator after 3 seconds
        setTimeout(() => setAnalysisSuccess(false), 3000);
      }
    } catch (error: any) {
      console.error('Profile analysis error:', error);
      toast({
        title: "Analysis Failed",
        description: error.message || "Could not analyze SoundCloud profile",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  }, [member, toast]);

  // Debounced effect for URL changes
  useEffect(() => {
    if (!isEditing || !formData.soundcloud_url) return;

    const timeoutId = setTimeout(() => {
      if (validateUrl(formData.soundcloud_url, 'soundcloud')) {
        analyzeProfile(formData.soundcloud_url);
      }
    }, 1500); // Wait 1.5 seconds after user stops typing

    return () => clearTimeout(timeoutId);
  }, [formData.soundcloud_url, isEditing, analyzeProfile]);

  const handleSave = async () => {
    if (!member) return;

    if (!validateUrl(formData.soundcloud_url, 'soundcloud')) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid SoundCloud URL",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('members')
        .update({
          name: formData.name,
          stage_name: formData.stage_name || null,
          primary_email: formData.primary_email,
          emails: formData.emails,
          soundcloud_url: formData.soundcloud_url || null,
          soundcloud_followers: formData.soundcloud_followers,
          monthly_repost_limit: formData.monthly_repost_limit,
          manual_monthly_repost_override: formData.manual_monthly_repost_override,
          override_reason: formData.override_reason || null,
          override_set_by: formData.manual_monthly_repost_override ? null : null, // Will be set by auth context in real implementation
          override_set_at: formData.manual_monthly_repost_override ? new Date().toISOString() : null,
          families: formData.families,
          subgenres: formData.subgenres,
          manual_genres: formData.manual_genres
        })
        .eq('id', member.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Member profile updated successfully"
      });

      setIsEditing(false);
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update member",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (member) {
      setFormData({
        name: member.name || '',
        stage_name: member.stage_name || '',
        primary_email: member.primary_email || '',
        emails: member.emails || [],
        soundcloud_url: member.soundcloud_url || '',
        soundcloud_followers: member.soundcloud_followers || 0,
        monthly_repost_limit: member.monthly_repost_limit || 1,
        manual_monthly_repost_override: member.manual_monthly_repost_override || null,
        override_reason: member.override_reason || '',
        families: member.families || [],
        subgenres: member.subgenres || [],
        manual_genres: member.manual_genres || []
      });
    }
    setIsAnalyzing(false);
    setAnalysisSuccess(false);
    setIsEditing(false);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { label: 'Active', color: 'bg-green-500' },
      needs_reconnect: { label: 'Needs Reconnect', color: 'bg-orange-500' },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || {
      label: status,
      color: 'bg-gray-500'
    };
    
    return (
      <Badge className={`${config.color} text-white`}>
        {config.label}
      </Badge>
    );
  };

  const getTierBadge = (tier: string) => {
    const tierConfig = {
      T1: { label: 'Tier 1', color: 'bg-gray-500', followers: '0-1K' },
      T2: { label: 'Tier 2', color: 'bg-blue-500', followers: '1K-10K' },
      T3: { label: 'Tier 3', color: 'bg-purple-500', followers: '10K-100K' },
      T4: { label: 'Tier 4', color: 'bg-yellow-500', followers: '100K+' },
    };
    
    const config = tierConfig[tier as keyof typeof tierConfig] || {
      label: tier,
      color: 'bg-gray-500',
      followers: 'Unknown'
    };
    
    return (
      <Badge className={`${config.color} text-white`}>
        <Crown className="w-3 h-3 mr-1" />
        {config.label} ({config.followers})
      </Badge>
    );
  };

  if (!member) return null;

  const currentMember = displayMember || member;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold">
              {currentMember.name}
            </DialogTitle>
            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <Button onClick={handleSave} disabled={isLoading} size="sm">
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                  </Button>
                  <Button onClick={handleCancel} variant="outline" size="sm">
                    <X className="w-4 h-4" />
                  </Button>
                </>
              ) : (
                <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
                  <Edit className="w-4 h-4" />
                  Edit
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status and Tier */}
          <div className="flex items-center gap-4">
            {getStatusBadge(currentMember.status)}
            {getTierBadge(currentMember.size_tier)}
          </div>

          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="member_name" className="text-sm font-medium">Member Name</Label>
                {isEditing ? (
                  <Input
                    id="member_name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Full name"
                    className="mt-1"
                  />
                ) : (
                  <p className="text-sm text-muted-foreground mt-1">{currentMember.name}</p>
                )}
              </div>
              <div>
                <Label htmlFor="stage_name" className="text-sm font-medium">Stage Name</Label>
                {isEditing ? (
                  <Input
                    id="stage_name"
                    value={formData.stage_name}
                    onChange={(e) => setFormData({...formData, stage_name: e.target.value})}
                    placeholder="Artist/stage name"
                    className="mt-1"
                  />
                ) : (
                  <p className="text-sm text-muted-foreground mt-1">{currentMember.stage_name || 'Not set'}</p>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Contact Information */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Contact Information
            </h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="primary_email" className="text-sm font-medium">Primary Email</Label>
                {isEditing ? (
                  <Input
                    id="primary_email"
                    type="email"
                    value={formData.primary_email}
                    onChange={(e) => setFormData({...formData, primary_email: e.target.value})}
                    placeholder="primary@example.com"
                    className="mt-1"
                  />
                ) : (
                  <p className="text-sm text-muted-foreground mt-1">{currentMember.primary_email}</p>
                )}
              </div>
              <div>
                <Label className="text-sm font-medium">All Email Addresses</Label>
                {isEditing ? (
                  <div className="space-y-2 mt-1">
                    {formData.emails.map((email, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          type="email"
                          value={email}
                          onChange={(e) => {
                            const newEmails = [...formData.emails];
                            newEmails[index] = e.target.value;
                            setFormData({...formData, emails: newEmails});
                          }}
                          placeholder="email@example.com"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newEmails = formData.emails.filter((_, i) => i !== index);
                            setFormData({...formData, emails: newEmails});
                          }}
                          disabled={formData.emails.length <= 1}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setFormData({...formData, emails: [...formData.emails, '']});
                      }}
                      className="mt-2"
                    >
                      Add Email
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {currentMember.emails?.map((email, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {email}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Platform Information */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Platform Information</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="soundcloud_url" className="text-sm font-medium">SoundCloud URL</Label>
                {isEditing ? (
                  <div className="relative">
                    <Input
                      id="soundcloud_url"
                      value={formData.soundcloud_url}
                      onChange={(e) => {
                        setFormData({...formData, soundcloud_url: e.target.value});
                        setAnalysisSuccess(false);
                      }}
                      placeholder="https://soundcloud.com/artist-name"
                      className="mt-1 pr-10"
                    />
                    {isAnalyzing && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 mt-0.5">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    )}
                    {analysisSuccess && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 mt-0.5">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mt-1">
                    {currentMember.soundcloud_url ? (
                      <a 
                        href={currentMember.soundcloud_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-primary hover:underline"
                      >
                        {currentMember.soundcloud_url}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <p className="text-sm text-muted-foreground">Not set</p>
                    )}
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="soundcloud_followers" className="text-sm font-medium">SoundCloud Followers</Label>
                  {isEditing && formData.soundcloud_url && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => analyzeProfile(formData.soundcloud_url)}
                      disabled={isAnalyzing || !validateUrl(formData.soundcloud_url, 'soundcloud')}
                      className="h-6 px-2 text-xs"
                    >
                      {isAnalyzing ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3 w-3" />
                      )}
                      Refresh
                    </Button>
                  )}
                </div>
                {isEditing ? (
                  <div className="relative">
                    <Input
                      id="soundcloud_followers"
                      type="number"
                      min="0"
                      value={formData.soundcloud_followers}
                      onChange={(e) => {
                        setFormData({...formData, soundcloud_followers: parseInt(e.target.value) || 0});
                        setAnalysisSuccess(false);
                      }}
                      className="mt-1"
                    />
                    {isAnalyzing && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 mt-0.5">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground mt-1">
                    {currentMember.soundcloud_followers?.toLocaleString() || 0} followers
                  </p>
                )}
                {isEditing && isAnalyzing && (
                  <p className="text-xs text-muted-foreground mt-1">Analyzing profile...</p>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Genre Assignment */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Music className="w-5 h-5" />
              Genre Assignment
            </h3>
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Genre Families</Label>
                {isEditing ? (
                  <div className="space-y-2 mt-1">
                    <Select 
                      value="" 
                      onValueChange={(value) => {
                        if (!formData.families.includes(value)) {
                          setFormData(prev => ({
                            ...prev,
                            families: [...prev.families, value]
                          }));
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Add genre family" />
                      </SelectTrigger>
                      <SelectContent>
                        {genreFamilies
                          .filter(family => !formData.families.includes(family.id))
                          .map(family => (
                            <SelectItem key={family.id} value={family.id}>
                              {family.name}
                            </SelectItem>
                          ))
                        }
                      </SelectContent>
                    </Select>
                    <div className="flex flex-wrap gap-2">
                      {formData.families.map(familyId => {
                        const family = genreFamilies.find(f => f.id === familyId);
                        return family ? (
                          <Badge key={familyId} variant="default" className="flex items-center gap-1">
                            {family.name}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-4 w-4 p-0 hover:bg-transparent"
                              onClick={() => {
                                setFormData(prev => ({
                                  ...prev,
                                  families: prev.families.filter(id => id !== familyId)
                                }));
                              }}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {currentMember.families?.map(familyId => {
                      const family = genreFamilies.find(f => f.id === familyId);
                      return family ? (
                        <Badge key={familyId} variant="default" className="text-xs">
                          {family.name}
                        </Badge>
                      ) : null;
                    }) || <span className="text-xs text-muted-foreground">No families assigned</span>}
                  </div>
                )}
              </div>

              <div>
                <Label className="text-sm font-medium">Subgenres</Label>
                {isEditing ? (
                  <div className="space-y-2 mt-1">
                    <Select 
                      value="" 
                      onValueChange={(value) => {
                        if (!formData.subgenres.includes(value)) {
                          setFormData(prev => ({
                            ...prev,
                            subgenres: [...prev.subgenres, value]
                          }));
                        }
                      }}
                      disabled={availableSubgenres.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={availableSubgenres.length === 0 ? "Select families first" : "Add subgenre"} />
                      </SelectTrigger>
                      <SelectContent>
                        {availableSubgenres
                          .filter(subgenre => !formData.subgenres.includes(subgenre.id))
                          .map(subgenre => (
                            <SelectItem key={subgenre.id} value={subgenre.id}>
                              {subgenre.name}
                            </SelectItem>
                          ))
                        }
                      </SelectContent>
                    </Select>
                    <div className="flex flex-wrap gap-2">
                      {formData.subgenres.map(subgenreId => {
                        const subgenre = subgenres.find(s => s.id === subgenreId);
                        return subgenre ? (
                          <Badge key={subgenreId} variant="secondary" className="flex items-center gap-1">
                            {subgenre.name}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-4 w-4 p-0 hover:bg-transparent"
                              onClick={() => {
                                setFormData(prev => ({
                                  ...prev,
                                  subgenres: prev.subgenres.filter(id => id !== subgenreId)
                                }));
                              }}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {currentMember.subgenres?.map(subgenreId => {
                      const subgenre = subgenres.find(s => s.id === subgenreId);
                      return subgenre ? (
                        <Badge key={subgenreId} variant="secondary" className="text-xs">
                          {subgenre.name}
                        </Badge>
                      ) : null;
                    }) || <span className="text-xs text-muted-foreground">No subgenres assigned</span>}
                  </div>
                )}
              </div>

              <div>
                <Label className="text-sm font-medium">Manual Genres</Label>
                {isEditing ? (
                  <div className="space-y-2 mt-1">
                    {formData.manual_genres.map((genre, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          value={genre}
                          onChange={(e) => {
                            const newGenres = [...formData.manual_genres];
                            newGenres[index] = e.target.value;
                            setFormData({...formData, manual_genres: newGenres});
                          }}
                          placeholder="Manual genre"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newGenres = formData.manual_genres.filter((_, i) => i !== index);
                            setFormData({...formData, manual_genres: newGenres});
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setFormData({...formData, manual_genres: [...formData.manual_genres, '']});
                      }}
                      className="mt-2"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Manual Genre
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {currentMember.manual_genres?.map((genre, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {genre}
                      </Badge>
                    )) || <span className="text-xs text-muted-foreground">No manual genres</span>}
                  </div>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Member Settings */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Member Settings</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="monthly_repost_limit" className="text-sm font-medium">Monthly Repost Limit</Label>
                {isEditing ? (
                  <Input
                    id="monthly_repost_limit"
                    type="number"
                    min="1"
                    value={formData.monthly_repost_limit}
                    onChange={(e) => setFormData({...formData, monthly_repost_limit: parseInt(e.target.value) || 1})}
                    className="mt-1"
                  />
                ) : (
                  <p className="text-sm text-muted-foreground mt-1">
                    {currentMember.monthly_repost_limit} per month
                  </p>
                )}
              </div>
              <div>
                <Label className="text-sm font-medium">Submissions This Month</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {currentMember.submissions_this_month || 0}
                </p>
              </div>
            </div>
            
            {/* Credit Override Section */}
            <div className="mt-6 p-4 bg-card border border-border rounded-lg">
              <h4 className="text-md font-semibold mb-3 flex items-center gap-2">
                <Crown className="w-4 h-4" />
                Credit Override (Admin Only)
              </h4>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">
                      Calculated Limit (Auto)
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {currentMember.computed_monthly_repost_limit || 
                       currentMember.soundcloud_followers ? 
                       (currentMember.soundcloud_followers < 100000 ? 1 : 
                        currentMember.soundcloud_followers < 500000 ? 2 : 3) : 1} 
                      credits/month
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Based on {currentMember.soundcloud_followers?.toLocaleString() || 0} followers
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="manual_override" className="text-sm font-medium">
                      Manual Override
                    </Label>
                    {isEditing ? (
                      <Input
                        id="manual_override"
                        type="number"
                        min="0"
                        max="10"
                        value={formData.manual_monthly_repost_override || ''}
                        placeholder="Leave empty for auto calculation"
                        onChange={(e) => setFormData({
                          ...formData, 
                          manual_monthly_repost_override: e.target.value ? parseInt(e.target.value) : null
                        })}
                        className="mt-1"
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground mt-1">
                        {currentMember.manual_monthly_repost_override ? 
                         `${currentMember.manual_monthly_repost_override} credits/month (Override)` : 
                         'Auto calculation'}
                      </p>
                    )}
                  </div>
                </div>
                
                {formData.manual_monthly_repost_override && isEditing && (
                  <div>
                    <Label htmlFor="override_reason" className="text-sm font-medium">
                      Override Reason
                    </Label>
                    <Input
                      id="override_reason"
                      placeholder="Reason for manual override (required)"
                      value={formData.override_reason}
                      onChange={(e) => setFormData({...formData, override_reason: e.target.value})}
                      className="mt-1"
                    />
                  </div>
                )}
                
                {currentMember.override_set_at && (
                  <div className="text-xs text-muted-foreground">
                    Override set on {format(new Date(currentMember.override_set_at), 'MMM dd, yyyy')}
                    {currentMember.override_reason && (
                      <>
                        <br />
                        Reason: {currentMember.override_reason}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Genre Information */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Music className="w-5 h-5" />
              Genre Classification
            </h3>
            <div className="space-y-3">
              <div>
                <Label className="text-sm font-medium">Families</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {((displayMember?.families ?? currentMember.families)?.length) ? (
                    (displayMember?.families ?? currentMember.families)!.map((family, index) => (
                      <Badge key={index} variant="secondary">
                        {family}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No families assigned</p>
                  )}
                </div>
              </div>
              
              <div>
                <Label className="text-sm font-medium">Subgenres</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {((displayMember?.subgenres ?? currentMember.subgenres)?.length) ? (
                    (displayMember?.subgenres ?? currentMember.subgenres)!.map((subgenre, index) => (
                      <Badge key={index} variant="outline">
                        {subgenre}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No subgenres assigned</p>
                  )}
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Manual Genres</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {currentMember.manual_genres?.length ? (
                    currentMember.manual_genres.map((genre, index) => (
                      <Badge key={index} variant="secondary">
                        {genre}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No manual genres assigned</p>
                  )}
                </div>
              </div>

              {currentMember.genre_notes && (
                <div>
                  <Label className="text-sm font-medium">Genre Notes</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {currentMember.genre_notes}
                  </p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Statistics */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Statistics</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-sm font-medium">Net Credits</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {currentMember.net_credits || 0}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium">Total Followers</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {currentMember.followers?.toLocaleString() || 0}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium">Member Since</Label>
                <div className="flex items-center gap-1 mt-1">
                  <Calendar className="w-3 h-3" />
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(currentMember.created_at), 'MMM dd, yyyy')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};