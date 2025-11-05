import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus } from "lucide-react";
import { Campaign, Creator } from "../lib/types";
// Switch to updateCampaign to avoid type mismatch with saveCampaign
import { getCreators, updateCampaign } from "../lib/localStorage";
import { toast } from "../hooks/use-toast";
import { CreatorSearchModal } from "./CreatorSearchModal";

interface CampaignEditFormProps {
  campaign: Campaign;
  onSuccess: () => void;
}

export const CampaignEditForm = ({ campaign, onSuccess }: CampaignEditFormProps) => {
  const [campaignName, setCampaignName] = useState(campaign.campaign_name);
  const [status, setStatus] = useState(campaign.status);
  const [selectedCreators, setSelectedCreators] = useState<Creator[]>(campaign.selected_creators || []);
  const [isCreatorSearchOpen, setIsCreatorSearchOpen] = useState(false);
  const [allCreators, setAllCreators] = useState<Creator[]>([]);

  useEffect(() => {
    loadCreators();
  }, []);

  const loadCreators = async () => {
    const creators = await getCreators();
    setAllCreators(creators as Creator[]);
  };

  const handleRemoveCreator = (creatorId: string) => {
    setSelectedCreators(prev => prev.filter(c => c.id !== creatorId));
  };

  const handleAddCreator = (creator: Creator) => {
    const isAlreadySelected = selectedCreators.find(existing => existing.id === creator.id);
    if (!isAlreadySelected) {
      const creatorWithPosts = { ...creator, posts_count: 1 };
      setSelectedCreators(prev => [...prev, creatorWithPosts]);
    }
  };

  const handlePostsCountChange = (creatorId: string, newCount: number) => {
    setSelectedCreators(prev => 
      prev.map(c => c.id === creatorId ? { ...c, posts_count: newCount } : c)
    );
  };

  const handleRateChange = (creatorId: string, newRate: number) => {
    setSelectedCreators(prev => 
      prev.map(c => c.id === creatorId ? { ...c, campaign_rate: newRate } : c)
    );
  };

  const handleSave = async () => {
    try {
      const totals = {
        ...campaign.totals,
        total_creators: selectedCreators.length,
        total_posts: selectedCreators.reduce((sum, creator) => sum + (creator.posts_count || 1), 0),
        total_cost: selectedCreators.reduce((sum, creator) => sum + ((creator.campaign_rate || creator.reel_rate || 0) * (creator.posts_count || 1)), 0),
        total_median_views: selectedCreators.reduce((sum, creator) => sum + ((creator.median_views_per_video || 0) * (creator.posts_count || 1)), 0),
      };

      // Persist only DB-backed fields; name will be mapped internally
      await updateCampaign(campaign.id, {
        campaign_name: campaignName,
        status,
        selected_creators: selectedCreators,
        totals
      });
      
      toast({
        title: "Campaign Updated",
        description: "Campaign has been saved successfully",
      });
      
      onSuccess();
    } catch (error) {
      console.error('Error saving campaign:', error);
      toast({
        title: "Error",
        description: "Failed to save campaign",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Save Button */}
      <div className="flex justify-between items-start">
        <div className="grid grid-cols-2 gap-4 flex-1 mr-6">
          <div className="space-y-2">
            <Label htmlFor="campaignName">Campaign Name</Label>
            <Input
              id="campaignName"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={(value) => setStatus(value as Campaign['status'])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Draft">Draft</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button onClick={handleSave} variant="gradient" className="shrink-0">
          Save Changes
        </Button>
      </div>

      {/* Campaign Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Campaign Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Total Creators:</span>
              <div className="font-semibold">{selectedCreators.length}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Total Posts:</span>
              <div className="font-semibold">{selectedCreators.reduce((sum, creator) => sum + (creator.posts_count || 1), 0)}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Total Cost:</span>
              <div className="font-semibold">
                ${selectedCreators.reduce((sum, creator) => sum + (((creator.campaign_rate || creator.reel_rate || 0) * (creator.posts_count || 1))), 0).toLocaleString()}
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">Total Reach:</span>
              <div className="font-semibold">
                {selectedCreators.reduce((sum, creator) => sum + ((creator.median_views_per_video || 0) * (creator.posts_count || 1)), 0).toLocaleString()}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Creators Section */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Selected Creators ({selectedCreators.length})</CardTitle>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setIsCreatorSearchOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Creators
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {selectedCreators.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No creators selected</p>
          ) : (
            <div className="space-y-3">
              {selectedCreators.map((creator) => (
                <div key={creator.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div>
                      <a
                        href={`https://instagram.com/${creator.instagram_handle.replace('@', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-primary hover:text-primary/80 underline"
                      >
                        @{creator.instagram_handle.replace('@', '')}
                      </a>
                      <p className="text-sm text-muted-foreground">
                        {creator.followers?.toLocaleString()} followers
                      </p>
                    </div>
                    <div className="flex gap-1">
                      {creator.music_genres?.slice(0, 2).map((genre) => (
                        <Badge key={genre} variant="outline" className="text-xs">
                          {genre}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`rate-${creator.id}`} className="text-sm">Rate:</Label>
                      <div className="flex items-center">
                        <span className="text-sm mr-1">$</span>
                        <Input
                          id={`rate-${creator.id}`}
                          type="number"
                          min="0"
                          step="5"
                          value={creator.campaign_rate || creator.reel_rate || 0}
                          onChange={(e) => handleRateChange(creator.id, parseInt(e.target.value) || 0)}
                          className="w-20 h-8"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`posts-${creator.id}`} className="text-sm">Posts:</Label>
                      <Input
                        id={`posts-${creator.id}`}
                        type="number"
                        min="1"
                        max="10"
                        value={creator.posts_count || 1}
                        onChange={(e) => handlePostsCountChange(creator.id, parseInt(e.target.value) || 1)}
                        className="w-16 h-8"
                      />
                    </div>
                    <span className="text-sm font-medium min-w-[60px] text-right">
                      ${(((creator.campaign_rate || creator.reel_rate || 0) * (creator.posts_count || 1))).toLocaleString()}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveCreator(creator.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Creator Search Modal */}
      <CreatorSearchModal
        isOpen={isCreatorSearchOpen}
        onClose={() => setIsCreatorSearchOpen(false)}
        onSelectCreator={handleAddCreator}
        selectedCreatorIds={selectedCreators.map(c => c.id)}
      />
    </div>
  );
};