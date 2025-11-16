"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, ExternalLink, Music, DollarSign, Calendar, User } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";

export default function InstagramCampaignsPage() {
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Fetch campaigns from Supabase
  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['instagram-campaigns'],
    queryFn: async () => {
      console.log('📡 Fetching Instagram campaigns...');
      const { data, error } = await supabase
        .from('instagram_campaigns')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('❌ Error fetching campaigns:', error);
        throw error;
      }
      
      console.log(`✅ Fetched ${data?.length || 0} campaigns:`, data?.[0]);
      return data || [];
    }
  });

  const handleViewDetails = (campaign: any) => {
    setSelectedCampaign(campaign);
    setIsDetailsOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'draft': return 'bg-gray-500';
      case 'completed': return 'bg-blue-500';
      case 'paused': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Campaign History</h1>
          <p className="text-muted-foreground">
            View and manage all Instagram campaigns
          </p>
        </div>
        <Link href="/instagram/campaign-builder">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Campaign
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="text-center py-12">Loading campaigns...</div>
      ) : campaigns.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              No campaigns yet. Create your first Instagram campaign to get started.
            </p>
            <Link href="/instagram/campaign-builder">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Campaign
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((campaign: any) => {
            // Parse price from TEXT to number
            const priceStr = campaign.price || '$0';
            const priceNum = parseFloat(priceStr.replace(/[^0-9.]/g, '')) || 0;
            
            return (
              <Card key={campaign.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-xl">{campaign.campaign || 'Untitled Campaign'}</CardTitle>
                    <Badge className={getStatusColor(campaign.status || 'draft')}>
                      {campaign.status || 'draft'}
                    </Badge>
                  </div>
                  <CardDescription>{campaign.clients || 'No client'}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Price:</span>
                      <span className="font-medium">{campaign.price || '$0'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Spend:</span>
                      <span className="font-medium">{campaign.spend || '$0'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Remaining:</span>
                      <span className="font-medium">{campaign.remaining || '$0'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Salesperson:</span>
                      <span className="font-medium">{campaign.salespeople || 'N/A'}</span>
                    </div>
                    {campaign.start_date && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Start Date:</span>
                        <span className="font-medium">{campaign.start_date}</span>
                      </div>
                    )}
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full mt-4"
                    onClick={() => handleViewDetails(campaign)}
                  >
                    View Details
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Campaign Details Modal */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              {selectedCampaign?.campaign || 'Campaign Details'}
            </DialogTitle>
            <DialogDescription>
              Client: {selectedCampaign?.clients || 'N/A'}
            </DialogDescription>
          </DialogHeader>

          {selectedCampaign && (
            <div className="space-y-6">
              {/* Status Badge */}
              <div>
                <Badge className={getStatusColor(selectedCampaign.status || 'draft')}>
                  {selectedCampaign.status || 'Draft'}
                </Badge>
              </div>

              {/* Financial Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Financial Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Price</p>
                    <p className="text-xl font-bold">{selectedCampaign.price || '$0'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Spend</p>
                    <p className="text-xl font-bold">{selectedCampaign.spend || '$0'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Remaining</p>
                    <p className="text-xl font-bold">{selectedCampaign.remaining || '$0'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Invoice Status</p>
                    <p className="text-lg font-medium">{selectedCampaign.invoice || 'N/A'}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Campaign Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Campaign Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {selectedCampaign.start_date && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Start Date:</span>
                      <span className="font-medium">{selectedCampaign.start_date}</span>
                    </div>
                  )}
                  {selectedCampaign.salespeople && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Salesperson:</span>
                      <span className="font-medium">{selectedCampaign.salespeople}</span>
                    </div>
                  )}
                  {selectedCampaign.campaign_started && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Campaign Started:</span>
                      <span className="font-medium">{selectedCampaign.campaign_started}</span>
                    </div>
                  )}
                  {selectedCampaign.paid_ops && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Paid Ops:</span>
                      <span className="font-medium">{selectedCampaign.paid_ops}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Sound/Music Details */}
              {selectedCampaign.sound_url && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Music className="h-5 w-5" />
                      Music/Sound
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <a 
                      href={selectedCampaign.sound_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-blue-600 hover:underline"
                    >
                      View Sound/Track
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </CardContent>
                </Card>
              )}

              {/* Tracker */}
              {selectedCampaign.tracker && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Campaign Tracker</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <a 
                      href={selectedCampaign.tracker} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-blue-600 hover:underline"
                    >
                      View Tracker
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </CardContent>
                </Card>
              )}

              {/* Notes */}
              {(selectedCampaign.report_notes || selectedCampaign.client_notes) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Notes</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {selectedCampaign.report_notes && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Report Notes:</p>
                        <p className="text-sm">{selectedCampaign.report_notes}</p>
                      </div>
                    )}
                    {selectedCampaign.client_notes && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Client Notes:</p>
                        <p className="text-sm">{selectedCampaign.client_notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Tracking Checkboxes */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Progress Tracking</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      checked={selectedCampaign.send_tracker === 'checked'} 
                      disabled 
                      className="h-4 w-4"
                    />
                    <span className="text-sm">Tracker Sent</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      checked={selectedCampaign.send_final_report === 'checked'} 
                      disabled 
                      className="h-4 w-4"
                    />
                    <span className="text-sm">Final Report Sent</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

