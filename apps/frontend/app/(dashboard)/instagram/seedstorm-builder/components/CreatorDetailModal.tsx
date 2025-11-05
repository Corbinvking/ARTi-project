import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Creator } from "../lib/types";
import { formatNumber, formatCurrency } from "../lib/localStorage";
import { Edit, Mail, MapPin, Eye, Users, TrendingUp, Calendar, DollarSign } from "lucide-react";

interface CreatorDetailModalProps {
  creator: Creator | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (creator: Creator) => void;
}

export const CreatorDetailModal = ({ creator, isOpen, onClose, onEdit }: CreatorDetailModalProps) => {
  if (!creator) return null;

  const calculateCPM = (creator: Creator) => {
    return creator.median_views_per_video > 0 
      ? (creator.reel_rate / creator.median_views_per_video * 1000).toFixed(2)
      : '0.00';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-2">
          <div className="flex items-start justify-between gap-4 pr-6">
            <div className="flex-1">
              <DialogTitle className="text-2xl font-bold">@{creator.instagram_handle}</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Creator profile and performance metrics
              </DialogDescription>
            </div>
            <Button 
              variant="outline" 
              onClick={() => onEdit(creator)}
              className="flex items-center gap-2 shrink-0"
            >
              <Edit className="h-4 w-4" />
              Edit
            </Button>
          </div>
        </DialogHeader>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Creator Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Base Country:</span>
                <Badge variant="secondary">{creator.base_country}</Badge>
              </div>
              
              {creator.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Email:</span>
                  <a href={`mailto:${creator.email}`} className="text-primary hover:underline">
                    {creator.email}
                  </a>
                </div>
              )}
              
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Added:</span>
                <span className="text-muted-foreground">
                  {new Date(creator.created_at).toLocaleDateString()}
                </span>
              </div>
              
              {creator.updated_at && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Last Updated:</span>
                  <span className="text-muted-foreground">
                    {new Date(creator.updated_at).toLocaleDateString()}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Performance Metrics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 border rounded-lg">
                  <div className="text-2xl font-bold text-primary">{formatNumber(creator.followers)}</div>
                  <div className="text-sm text-muted-foreground">Followers</div>
                </div>
                <div className="text-center p-3 border rounded-lg">
                  <div className="text-2xl font-bold text-accent">{formatNumber(creator.median_views_per_video)}</div>
                  <div className="text-sm text-muted-foreground">Median Views</div>
                </div>
                <div className="text-center p-3 border rounded-lg">
                  <div className="text-2xl font-bold">{creator.engagement_rate}%</div>
                  <div className="text-sm text-muted-foreground">Engagement</div>
                </div>
                <div className="text-center p-3 border rounded-lg">
                  <div className="text-2xl font-bold text-foreground">${calculateCPM(creator)}</div>
                  <div className="text-sm text-muted-foreground">CPM</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Rates */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Content Rates
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center p-3 border rounded-lg">
                <span className="font-medium">Reel Rate</span>
                <span className="text-lg font-bold text-accent">
                  {creator.reel_rate && creator.reel_rate > 0 ? formatCurrency(creator.reel_rate) : '$0'}
                </span>
              </div>
              {creator.carousel_rate && creator.carousel_rate > 0 && (
                <div className="flex justify-between items-center p-3 border rounded-lg">
                  <span className="font-medium">Carousel Rate</span>
                  <span className="text-lg font-bold">{formatCurrency(creator.carousel_rate)}</span>
                </div>
              )}
              {creator.story_rate && creator.story_rate > 0 && (
                <div className="flex justify-between items-center p-3 border rounded-lg">
                  <span className="font-medium">Story Rate</span>
                  <span className="text-lg font-bold">{formatCurrency(creator.story_rate)}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Audience & Content */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Audience & Content
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Audience Countries</h4>
                <div className="flex flex-wrap gap-2">
                  {creator.audience_countries?.map((country) => (
                    <Badge key={country} variant="outline">
                      {country}
                    </Badge>
                  )) || <span className="text-muted-foreground text-sm">None specified</span>}
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Music Genres</h4>
                <div className="flex flex-wrap gap-2">
                  {creator.music_genres.map((genre) => (
                    <Badge key={genre} variant="default">
                      {genre}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Content Types</h4>
                <div className="flex flex-wrap gap-2">
                  {creator.content_types.map((type) => (
                    <Badge key={type} variant="secondary">
                      {type}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};