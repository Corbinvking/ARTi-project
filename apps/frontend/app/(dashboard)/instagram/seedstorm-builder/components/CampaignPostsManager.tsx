import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit, Trash2, TrendingUp, Upload, Download, AlertCircle } from "lucide-react";
import { supabase } from '../integrations/supabase/client';
import { toast } from "../hooks/use-toast";
import { formatNumber } from "../lib/localStorage";
import { validateInstagramUrl, calculateEngagementRate, getCurrentDateTime } from "../lib/instagramUtils";
import { exportPostsCsv } from "../lib/postCsvUtils";
import BulkPostImport from "./BulkPostImport";
import BatchUpdateTrigger from "./BatchUpdateTrigger";

interface CampaignPost {
  id: string;
  campaign_id: string;
  creator_id: string | null;
  instagram_handle: string;
  post_url: string;
  post_type: string;
  content_description: string | null;
  thumbnail_url: string | null;
  posted_at: string | null;
  status: string;
  created_at: string;
  latest_analytics?: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
    engagement_rate: number;
  };
}

interface CampaignPostsManagerProps {
  campaignId: string;
}

const CampaignPostsManager = ({ campaignId }: CampaignPostsManagerProps) => {
  const [posts, setPosts] = useState<CampaignPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<CampaignPost | null>(null);
  
  const [formData, setFormData] = useState({
    instagram_handle: '',
    post_url: '',
    post_type: 'reel',
    content_description: '',
    thumbnail_url: '',
    posted_at: getCurrentDateTime(),
    views: 0,
    likes: 0,
    comments: 0,
    shares: 0,
    engagement_rate: 0
  });

  const [urlValidation, setUrlValidation] = useState<{ isValid: boolean; error?: string } | null>(null);
  const [selectedPosts, setSelectedPosts] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);

  useEffect(() => {
    fetchPosts();
  }, [campaignId]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      
      // Get campaign posts with latest analytics
      const { data: postsData, error } = await supabase
        .from('campaign_posts')
        .select(`
          *,
          post_analytics (
            views,
            likes,
            comments,
            shares,
            engagement_rate,
            recorded_at
          )
        `)
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Process posts with latest analytics
      const processedPosts = (postsData || []).map(post => {
        const analytics = post.post_analytics || [];
        const latestAnalytics = analytics.length > 0 
          ? analytics.reduce((latest: any, current: any) => 
              new Date(current.recorded_at) > new Date(latest.recorded_at) ? current : latest
            )
          : null;

        return {
          ...post,
          latest_analytics: latestAnalytics
        };
      });

      setPosts(processedPosts);
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast({
        title: "Error",
        description: "Failed to fetch campaign posts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Enhanced URL handling with thumbnail fetching
  const handleUrlChange = async (url: string) => {
    setFormData({...formData, post_url: url});
    
    if (url.trim()) {
      const validation = validateInstagramUrl(url);
      setUrlValidation(validation);
      
      if (validation.isValid) {
        // Auto-populate fields based on URL
        const newFormData = {
          ...formData,
          post_url: url,
          post_type: validation.postType
        };
        
        if (validation.handle && !formData.instagram_handle) {
          newFormData.instagram_handle = validation.handle;
        }
        
        setFormData(newFormData);
        
        // Fetch thumbnail from Instagram oEmbed
        try {
          console.log('Fetching Instagram thumbnail for:', url);
          const { data, error } = await supabase.functions.invoke('instagram-oembed', {
            body: { instagram_url: url }
          });
          
          if (data && data.thumbnail_url && !error) {
            console.log('Thumbnail fetched successfully:', data.thumbnail_url);
            setFormData(prev => ({
              ...prev,
              thumbnail_url: data.thumbnail_url,
              // Use post type from oEmbed if available and more specific
              post_type: data.post_type || prev.post_type
            }));
          } else if (data && data.fallback_thumbnail) {
            console.log('Using fallback thumbnail');
            setFormData(prev => ({
              ...prev,
              thumbnail_url: data.fallback_thumbnail
            }));
          }
        } catch (error) {
          console.error('Error fetching Instagram thumbnail:', error);
          // Continue without thumbnail - the enhanced placeholder will be used
        }
      }
    } else {
      setUrlValidation(null);
    }
  };

  // Auto-calculate engagement rate when metrics change
  const handleMetricsChange = (field: string, value: number) => {
    const newFormData = { ...formData, [field]: value };
    
    if (['views', 'likes', 'comments', 'shares'].includes(field)) {
      const engagementRate = calculateEngagementRate(
        field === 'views' ? value : formData.views,
        field === 'likes' ? value : formData.likes,
        field === 'comments' ? value : formData.comments,
        field === 'shares' ? value : formData.shares
      );
      newFormData.engagement_rate = Math.round(engagementRate * 100) / 100;
    }
    
    setFormData(newFormData);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Final validation
    if (urlValidation && !urlValidation.isValid) {
      toast({
        title: "Invalid URL",
        description: urlValidation.error,
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Add @ prefix if not present
      const handle = formData.instagram_handle.startsWith('@') 
        ? formData.instagram_handle 
        : `@${formData.instagram_handle}`;

      // Insert campaign post
      const { data: postData, error: postError } = await supabase
        .from('campaign_posts')
        .insert([{
          campaign_id: campaignId,
          instagram_handle: handle,
          post_url: formData.post_url,
          post_type: formData.post_type,
          content_description: formData.content_description || null,
          thumbnail_url: formData.thumbnail_url || null,
          posted_at: formData.posted_at || new Date().toISOString(),
          status: 'live'
        }])
        .select()
        .single();

      if (postError) throw postError;

      // Insert analytics data if provided
      if (formData.views > 0 || formData.likes > 0 || formData.comments > 0) {
        const { error: analyticsError } = await supabase
          .from('post_analytics')
          .insert([{
            post_id: postData.id,
            views: formData.views,
            likes: formData.likes,
            comments: formData.comments,
            shares: formData.shares,
            engagement_rate: formData.engagement_rate
          }]);

        if (analyticsError) throw analyticsError;
      }

      toast({
        title: "Success",
        description: "Campaign post added successfully",
      });

      // Reset form and close dialog
      resetForm();
      setIsAddDialogOpen(false);
      
      // Refresh posts list
      fetchPosts();

    } catch (error) {
      console.error('Error adding post:', error);
      toast({
        title: "Error",
        description: "Failed to add campaign post",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      instagram_handle: '',
      post_url: '',
      post_type: 'reel',
      content_description: '',
      thumbnail_url: '',
      posted_at: getCurrentDateTime(),
      views: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      engagement_rate: 0
    });
    setUrlValidation(null);
  };

  const handleDelete = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return;

    try {
      const { error } = await supabase
        .from('campaign_posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Post deleted successfully",
      });

      fetchPosts();
    } catch (error) {
      console.error('Error deleting post:', error);
      toast({
        title: "Error",
        description: "Failed to delete post",
        variant: "destructive",
      });
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedPosts.length || !confirm(`Are you sure you want to delete ${selectedPosts.length} posts?`)) return;

    try {
      const { error } = await supabase
        .from('campaign_posts')
        .delete()
        .in('id', selectedPosts);

      if (error) throw error;

      toast({
        title: "Success",
        description: `${selectedPosts.length} posts deleted successfully`,
      });

      setSelectedPosts([]);
      setShowBulkActions(false);
      fetchPosts();
    } catch (error) {
      console.error('Error deleting posts:', error);
      toast({
        title: "Error",
        description: "Failed to delete posts",
        variant: "destructive",
      });
    }
  };

  const togglePostSelection = (postId: string) => {
    setSelectedPosts(prev => 
      prev.includes(postId) 
        ? prev.filter(id => id !== postId)
        : [...prev, postId]
    );
  };

  const selectAllPosts = () => {
    if (selectedPosts.length === posts.length) {
      setSelectedPosts([]);
    } else {
      setSelectedPosts(posts.map(post => post.id));
    }
  };

  const handleExport = () => {
    exportPostsCsv(posts);
    toast({
      title: "Export Complete",
      description: "Posts exported to CSV successfully",
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Campaign Posts Management</CardTitle>
            <CardDescription>
              Manage posts and analytics for this campaign's public dashboard
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {posts.length > 0 && (
              <Button variant="outline" onClick={() => setShowBulkActions(!showBulkActions)}>
                {showBulkActions ? "Cancel Selection" : "Select Posts"}
              </Button>
            )}
            {posts.length > 0 && (
              <Button variant="outline" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            )}
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Post
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add Campaign Post</DialogTitle>
                  <DialogDescription>
                    Add a new post with engagement metrics for the public dashboard
                  </DialogDescription>
                </DialogHeader>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="post_url">Instagram Post URL *</Label>
                    <Input
                      id="post_url"
                      type="url"
                      placeholder="https://instagram.com/p/ABC123... or https://instagram.com/reel/XYZ789..."
                      value={formData.post_url}
                      onChange={(e) => handleUrlChange(e.target.value)}
                      required
                    />
                    {urlValidation && !urlValidation.isValid && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{urlValidation.error}</AlertDescription>
                      </Alert>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="instagram_handle">Instagram Handle *</Label>
                      <Input
                        id="instagram_handle"
                        placeholder="@username (auto-filled from URL)"
                        value={formData.instagram_handle}
                        onChange={(e) => setFormData({...formData, instagram_handle: e.target.value})}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="post_type">Post Type</Label>
                      <Select value={formData.post_type} onValueChange={(value) => setFormData({...formData, post_type: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="reel">Reel</SelectItem>
                          <SelectItem value="post">Post</SelectItem>
                          <SelectItem value="carousel">Carousel</SelectItem>
                          <SelectItem value="story">Story</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="content_description">Content Description</Label>
                    <Textarea
                      id="content_description"
                      placeholder="Brief description of the post content..."
                      value={formData.content_description}
                      onChange={(e) => setFormData({...formData, content_description: e.target.value})}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="posted_at">Posted At</Label>
                      <Input
                        id="posted_at"
                        type="datetime-local"
                        value={formData.posted_at}
                        onChange={(e) => setFormData({...formData, posted_at: e.target.value})}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="thumbnail_url">Thumbnail URL (Optional)</Label>
                      <Input
                        id="thumbnail_url"
                        type="url"
                        placeholder="https://..."
                        value={formData.thumbnail_url}
                        onChange={(e) => setFormData({...formData, thumbnail_url: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-3">Engagement Metrics</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="views">Views</Label>
                        <Input
                          id="views"
                          type="number"
                          placeholder="0"
                          min="0"
                          value={formData.views || ''}
                          onChange={(e) => handleMetricsChange('views', Number(e.target.value))}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="likes">Likes</Label>
                        <Input
                          id="likes"
                          type="number"
                          placeholder="0"
                          min="0"
                          value={formData.likes || ''}
                          onChange={(e) => handleMetricsChange('likes', Number(e.target.value))}
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div className="space-y-2">
                        <Label htmlFor="comments">Comments</Label>
                        <Input
                          id="comments"
                          type="number"
                          placeholder="0"
                          min="0"
                          value={formData.comments || ''}
                          onChange={(e) => handleMetricsChange('comments', Number(e.target.value))}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="shares">Shares</Label>
                        <Input
                          id="shares"
                          type="number"
                          placeholder="0"
                          min="0"
                          value={formData.shares || ''}
                          onChange={(e) => handleMetricsChange('shares', Number(e.target.value))}
                        />
                      </div>
                    </div>

                    <div className="mt-4">
                      <Label htmlFor="engagement_rate">Engagement Rate (%)</Label>
                      <Input
                        id="engagement_rate"
                        type="number"
                        step="0.01"
                        placeholder="Auto-calculated"
                        min="0"
                        max="100"
                        value={formData.engagement_rate || ''}
                        onChange={(e) => setFormData({...formData, engagement_rate: Number(e.target.value)})}
                        className="mt-2"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Auto-calculated from metrics above, or enter manually
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => {
                      resetForm();
                      setIsAddDialogOpen(false);
                    }}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={urlValidation && !urlValidation.isValid}>
                      Add Post
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="manage" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="manage">Manage Posts</TabsTrigger>
            <TabsTrigger value="import">Bulk Import</TabsTrigger>
            <TabsTrigger value="update">Fix Post Types</TabsTrigger>
          </TabsList>
          
          <TabsContent value="manage" className="space-y-4">
            {showBulkActions && posts.length > 0 && (
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedPosts.length === posts.length && posts.length > 0}
                      onChange={selectAllPosts}
                      className="h-4 w-4"
                    />
                    <span className="text-sm">Select All ({selectedPosts.length} selected)</span>
                  </label>
                </div>
                {selectedPosts.length > 0 && (
                  <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                    <Trash2 className="h-3 w-3 mr-1" />
                    Delete Selected
                  </Button>
                )}
              </div>
            )}

            {loading ? (
              <div className="text-center py-8">
                <div className="text-muted-foreground">Loading posts...</div>
              </div>
            ) : posts.length > 0 ? (
              <div className="space-y-4">
                {posts.map((post) => (
                  <div key={post.id} className="flex items-center justify-between p-4 border rounded-lg">
                    {showBulkActions && (
                      <input
                        type="checkbox"
                        checked={selectedPosts.includes(post.id)}
                        onChange={() => togglePostSelection(post.id)}
                        className="h-4 w-4 mr-3"
                      />
                    )}
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-medium">{post.instagram_handle}</span>
                        <Badge variant="secondary">{post.post_type}</Badge>
                        {post.latest_analytics && (
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <TrendingUp className="h-3 w-3" />
                              {formatNumber(post.latest_analytics.views)} views
                            </div>
                            <div>{formatNumber(post.latest_analytics.likes)} likes</div>
                            <div>{post.latest_analytics.engagement_rate.toFixed(1)}% engagement</div>
                          </div>
                        )}
                      </div>
                      
                      {post.content_description && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {post.content_description}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div>
                          Posted: {post.posted_at ? new Date(post.posted_at).toLocaleDateString() : 'Not specified'}
                        </div>
                        <a 
                          href={post.post_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          View Post
                        </a>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" disabled>
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleDelete(post.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-muted-foreground mb-2">No posts added yet</div>
                <p className="text-sm text-muted-foreground">
                  Add posts to see them appear on the public dashboard
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="import">
            <BulkPostImport 
              campaignId={campaignId}
              onImportComplete={fetchPosts}
            />
          </TabsContent>
          
          <TabsContent value="update" className="flex justify-center">
            <BatchUpdateTrigger />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default CampaignPostsManager;