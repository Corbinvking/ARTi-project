"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Plus, Upload, Download, TrendingUp, Music, Calendar, User, DollarSign } from "lucide-react";
import { supabase } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";

export default function InstagramCreatorsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCreator, setSelectedCreator] = useState<any>(null);
  const [isCreatorModalOpen, setIsCreatorModalOpen] = useState(false);

  // Fetch creators from Supabase
  const { data: creators = [], isLoading } = useQuery({
    queryKey: ['instagram-creators'],
    queryFn: async () => {
      console.log('🔄 Instagram Creators Page: Fetching creators...');
      const { data, error } = await supabase
        .from('creators')
        .select('*')
        .order('followers', { ascending: false });
      
      console.log('📊 Instagram Creators Page: Query result:', {
        dataLength: data?.length,
        error: error,
        hasData: !!data,
        firstCreator: data?.[0]
      });
      
      if (error) {
        console.error('❌ Instagram Creators Page: Error:', error);
        throw error;
      }
      
      console.log(`✅ Instagram Creators Page: Loaded ${data?.length || 0} creators`);
      return data || [];
    }
  });

  // Fetch campaigns for the selected creator
  const { data: creatorCampaigns = [], isLoading: isLoadingCampaigns } = useQuery({
    queryKey: ['creator-campaigns', selectedCreator?.instagram_handle],
    queryFn: async () => {
      if (!selectedCreator?.instagram_handle) return [];
      
      console.log('🔄 Fetching campaigns for creator:', selectedCreator.instagram_handle);
      const { data, error } = await supabase
        .from('instagram_campaigns')
        .select('*')
        .eq('clients', selectedCreator.instagram_handle)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('❌ Error fetching creator campaigns:', error);
        throw error;
      }
      
      console.log(`✅ Loaded ${data?.length || 0} campaigns for ${selectedCreator.instagram_handle}`);
      return data || [];
    },
    enabled: !!selectedCreator?.instagram_handle
  });
  
  console.log('🎨 Instagram Creators Page: Rendering with', creators.length, 'creators');

  const handleCreatorClick = (creator: any) => {
    setSelectedCreator(creator);
    setIsCreatorModalOpen(true);
  };

  const getStatusColor = (status: string) => {
    const colors: any = {
      active: 'bg-green-500 hover:bg-green-600',
      completed: 'bg-blue-500 hover:bg-blue-600',
      draft: 'bg-gray-500 hover:bg-gray-600',
      paused: 'bg-yellow-500 hover:bg-yellow-600',
      unreleased: 'bg-purple-500 hover:bg-purple-600',
      cancelled: 'bg-red-500 hover:bg-red-600'
    };
    return colors[status?.toLowerCase()] || colors.draft;
  };

  const filteredCreators = creators.filter((creator: any) =>
    creator.instagram_handle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    creator.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Creator Database</h1>
        <p className="text-muted-foreground">
          Manage and browse Instagram creators for campaigns
        </p>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search creators..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Creator
        </Button>
        <Button variant="outline">
          <Upload className="mr-2 h-4 w-4" />
          Import CSV
        </Button>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Creators ({filteredCreators.length})</CardTitle>
          <CardDescription>
            View and manage your Instagram creator database
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading creators...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Instagram Handle</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">Followers</TableHead>
                  <TableHead className="text-right">Engagement Rate</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Genres</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCreators.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No creators found. Add creators to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCreators.map((creator: any) => (
                    <TableRow 
                      key={creator.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleCreatorClick(creator)}
                    >
                      <TableCell className="font-medium">@{creator.instagram_handle}</TableCell>
                      <TableCell>{creator.email || '-'}</TableCell>
                      <TableCell className="text-right">
                        {creator.followers?.toLocaleString() || 0}
                      </TableCell>
                      <TableCell className="text-right">
                        {creator.engagement_rate ? `${(creator.engagement_rate * 100).toFixed(2)}%` : '-'}
                      </TableCell>
                      <TableCell>{creator.base_country || '-'}</TableCell>
                      <TableCell>
                        {creator.music_genres?.slice(0, 2).join(', ') || '-'}
                        {creator.music_genres?.length > 2 && ` +${creator.music_genres.length - 2}`}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Creator Campaigns Modal */}
      <Dialog open={isCreatorModalOpen} onOpenChange={setIsCreatorModalOpen}>
        <DialogContent className="max-w-6xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <DialogTitle className="text-2xl">
                  @{selectedCreator?.instagram_handle}
                </DialogTitle>
                <DialogDescription className="mt-2">
                  <div className="flex flex-wrap gap-4 text-sm">
                    <span className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      {selectedCreator?.followers?.toLocaleString() || 0} followers
                    </span>
                    {selectedCreator?.engagement_rate && (
                      <span>
                        {(selectedCreator.engagement_rate * 100).toFixed(2)}% engagement
                      </span>
                    )}
                    {selectedCreator?.base_country && (
                      <span>📍 {selectedCreator.base_country}</span>
                    )}
                  </div>
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                Campaigns ({creatorCampaigns.length})
              </h3>
            </div>

            {isLoadingCampaigns ? (
              <div className="text-center py-12 text-muted-foreground">
                Loading campaigns...
              </div>
            ) : creatorCampaigns.length === 0 ? (
              <Card className="bg-muted/50">
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">
                    No campaigns found for this creator/client.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {creatorCampaigns.map((campaign: any) => {
                  const priceNum = parseFloat(campaign.price?.replace(/[^0-9.]/g, '') || '0');
                  const spendNum = parseFloat(campaign.spend?.replace(/[^0-9.]/g, '') || '0');
                  const remainingNum = parseFloat(campaign.remaining?.replace(/[^0-9.]/g, '') || '0');
                  const progressPercent = priceNum > 0 ? (spendNum / priceNum) * 100 : 0;

                  return (
                    <Card key={campaign.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="grid grid-cols-12 gap-4 items-center">
                          {/* Campaign Info */}
                          <div className="col-span-4">
                            <div className="flex items-center gap-2 mb-1">
                              {campaign.sound_url && <Music className="h-4 w-4 text-muted-foreground" />}
                              <h4 className="font-semibold text-sm truncate">
                                {campaign.campaign || 'Untitled Campaign'}
                              </h4>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {campaign.start_date || 'No date'}
                            </div>
                          </div>

                          {/* Status */}
                          <div className="col-span-2">
                            <Badge className={getStatusColor(campaign.status || 'draft')} variant="outline">
                              <span className="text-xs">{campaign.status || 'Draft'}</span>
                            </Badge>
                          </div>

                          {/* Progress */}
                          <div className="col-span-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Progress value={Math.min(progressPercent, 100)} className="h-1.5 flex-1" />
                                <span className="text-xs font-medium min-w-[32px] text-right">
                                  {progressPercent.toFixed(0)}%
                                </span>
                              </div>
                              {progressPercent >= 100 ? (
                                <div className="text-xs text-green-600 font-medium">
                                  ✓ Complete
                                </div>
                              ) : remainingNum > 0 ? (
                                <div className="text-xs text-orange-600 font-medium">
                                  ${remainingNum.toLocaleString()} left
                                </div>
                              ) : null}
                            </div>
                          </div>

                          {/* Financials */}
                          <div className="col-span-3 grid grid-cols-3 gap-2 text-right">
                            <div>
                              <div className="text-xs font-semibold">{campaign.price || '$0'}</div>
                              <div className="text-[10px] text-muted-foreground">Budget</div>
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-green-600">{campaign.spend || '$0'}</div>
                              <div className="text-[10px] text-muted-foreground">Spent</div>
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-orange-600">{campaign.remaining || '$0'}</div>
                              <div className="text-[10px] text-muted-foreground">Left</div>
                            </div>
                          </div>
                        </div>

                        {/* Salesperson */}
                        {campaign.salespeople && (
                          <div className="mt-2 pt-2 border-t flex items-center gap-2 text-xs text-muted-foreground">
                            <User className="h-3 w-3" />
                            {campaign.salespeople}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

