"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMyMember } from "../../soundcloud-app/hooks/useMyMember";
import { useAuth } from "../../soundcloud-app/contexts/AuthContext";
import { supabase } from "../../soundcloud-app/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  User,
  Mail,
  Music,
  TrendingUp,
  Crown,
  Calendar,
  ExternalLink,
  Save,
  Loader2,
  WifiOff,
  CheckCircle,
} from "lucide-react";

export default function ProfilePage() {
  const { user } = useAuth();
  const { data: member, isLoading, refetch } = useMyMember();
  const { toast } = useToast();
  
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    soundcloud_url: '',
  });

  const handleEdit = () => {
    setFormData({
      name: member?.name || '',
      soundcloud_url: member?.soundcloud_url || '',
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!member?.id) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('soundcloud_members')
        .update({
          name: formData.name,
          soundcloud_url: formData.soundcloud_url,
        })
        .eq('id', member.id);

      if (error) throw error;

      toast({
        title: "Profile Updated",
        description: "Your profile has been saved successfully.",
      });
      
      setIsEditing(false);
      refetch();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!member) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Member profile not found</p>
      </div>
    );
  }

  const ipStatus = (member as any)?.influence_planner_status;
  const isDisconnected = ['disconnected', 'INVALID', 'UNLINKED', 'needs_reconnect'].includes(ipStatus);
  const isConnected = ipStatus === 'connected' || ipStatus === 'LINKED' || ipStatus === 'active';

  const tierConfig: Record<string, { label: string; color: string }> = {
    T1: { label: 'Tier 1 (0-1K)', color: 'bg-slate-100 text-slate-700' },
    T2: { label: 'Tier 2 (1K-10K)', color: 'bg-blue-100 text-blue-700' },
    T3: { label: 'Tier 3 (10K-100K)', color: 'bg-purple-100 text-purple-700' },
    T4: { label: 'Tier 4 (100K+)', color: 'bg-amber-100 text-amber-700' },
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Profile</h1>
          <p className="text-muted-foreground">
            Manage your member profile and settings
          </p>
        </div>
        {!isEditing && (
          <Button onClick={handleEdit}>
            Edit Profile
          </Button>
        )}
      </div>

      {/* Connection Status */}
      {isDisconnected && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <WifiOff className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-destructive">SoundCloud Account Disconnected</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Your account is disconnected from the repost network. Reposts and support are paused until you reconnect.
                </p>
                <a
                  href="https://app.influenceplanner.com/connect"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="destructive" size="sm" className="mt-3">
                    Reconnect Account
                    <ExternalLink className="h-3 w-3 ml-2" />
                  </Button>
                </a>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!isDisconnected && (
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
              <div>
                <p className="font-medium text-green-700">SoundCloud Account Connected</p>
                <p className="text-sm text-muted-foreground">
                  Your repost network connection is active.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Profile Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center">
              <User className="h-8 w-8 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl">{member.name}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={tierConfig[member.size_tier]?.color || 'bg-slate-100'}>
                  <Crown className="h-3 w-3 mr-1" />
                  {tierConfig[member.size_tier]?.label || member.size_tier}
                </Badge>
                <Badge variant={member.status === 'active' ? 'default' : 'secondary'}>
                  {member.status}
                </Badge>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Display Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="soundcloud_url">SoundCloud URL</Label>
                <Input
                  id="soundcloud_url"
                  value={formData.soundcloud_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, soundcloud_url: e.target.value }))}
                  placeholder="https://soundcloud.com/your-profile"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <p className="font-medium">{member.primary_email || user?.email}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">SoundCloud</p>
                  {member.soundcloud_url ? (
                    <a 
                      href={member.soundcloud_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-primary hover:underline"
                    >
                      <Music className="h-4 w-4" />
                      <span>View Profile</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <p className="text-muted-foreground">Not set</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Member Stats</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-muted rounded-lg">
              <TrendingUp className="h-6 w-6 mx-auto text-primary mb-2" />
              <p className="text-2xl font-bold">{member.soundcloud_followers?.toLocaleString() || 0}</p>
              <p className="text-xs text-muted-foreground">SC Followers</p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <Music className="h-6 w-6 mx-auto text-primary mb-2" />
              <p className="text-2xl font-bold">{member.monthly_repost_limit || member.monthly_submission_limit || 0}</p>
              <p className="text-xs text-muted-foreground">Monthly Limit</p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <Crown className="h-6 w-6 mx-auto text-primary mb-2" />
              <p className="text-2xl font-bold">{member.net_credits || 0}</p>
              <p className="text-xs text-muted-foreground">Net Credits</p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <Calendar className="h-6 w-6 mx-auto text-primary mb-2" />
              <p className="text-2xl font-bold">{member.submissions_this_month || 0}</p>
              <p className="text-xs text-muted-foreground">This Month</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Genres Card */}
      {(member.families?.length > 0 || member.groups?.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Genres</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {(member.groups || member.families || []).map((genre: string, index: number) => (
                <Badge key={index} variant="secondary">
                  {genre}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Account Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Account Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Member Since</span>
              <span>{new Date(member.created_at).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Last Updated</span>
              <span>{new Date(member.updated_at).toLocaleDateString()}</span>
            </div>
            {member.last_submission_at && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last Submission</span>
                <span>{new Date(member.last_submission_at).toLocaleDateString()}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Reach Factor</span>
              <span>{((member.reach_factor || 0.06) * 100).toFixed(1)}%</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

