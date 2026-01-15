"use client"

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Textarea } from "./ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { useToast } from "../hooks/use-toast";
import { 
  Calendar, 
  Target, 
  DollarSign, 
  Music, 
  ArrowLeft,
  Rocket,
  CheckCircle,
  Clock,
  TrendingUp,
  Users,
  PlayCircle,
  XCircle,
  AlertTriangle
} from "lucide-react";
import { useCampaignBuilder } from "../hooks/useCampaignBuilder";

interface CampaignReviewProps {
  campaignData: {
    name: string;
    client: string;
    client_id?: string;
    track_url: string;
    track_name?: string;
    stream_goal: number;
    budget: number;
    sub_genre: string;
    start_date: string;
    duration_days: number;
  };
  allocationsData: {
    selectedPlaylists: any[];
    selectedVendors?: any[];
    allocations: any[];
    vendorAllocations?: any[];
    totalProjectedStreams: number;
    totalCost: number;
  };
  onBack: () => void;
  isReviewing?: boolean;
  submissionData?: any;
  onApprove?: (data: any, allocationsData: any) => Promise<any>;
  onReject?: (reason: string) => Promise<void>;
}

export default function CampaignReview({ 
  campaignData, 
  allocationsData, 
  onBack, 
  isReviewing = false, 
  submissionData, 
  onApprove, 
  onReject 
}: CampaignReviewProps) {
  const [isLaunching, setIsLaunching] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const { toast } = useToast();
  const router = useRouter();
  const { saveCampaign, isEditing } = useCampaignBuilder();

  const handleLaunch = async (status: 'built' | 'unreleased' | 'active' = 'active') => {
        setIsLaunching(true);
        try {
          console.log('Starting campaign launch/approval process...');
          console.log('Campaign data:', campaignData);
          console.log('Allocations data:', allocationsData);
          console.log('Status:', status);
          console.log('Is reviewing:', isReviewing);
          
          if (isReviewing && onApprove) {
            console.log('Calling onApprove function...');
            await onApprove(campaignData, allocationsData);
            console.log('✅ Approval successful');
          } else {
            console.log('Saving campaign...');
            // For regular campaign creation, set status to 'active' by default
            await saveCampaign(campaignData, allocationsData, status === 'built' ? 'active' : status);
            console.log('✅ Campaign saved successfully');
          }
          router.push('/spotify/campaigns');
        } catch (error) {
      console.error('❌ Error launching/approving campaign:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        campaignData,
        allocationsData,
        status,
        isReviewing
      });
      toast({
        title: "Error",
        description: `Failed to ${isReviewing ? 'approve' : 'launch'} campaign: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setIsLaunching(false);
    }
  };

  const handleReject = async () => {
    if (!onReject || !rejectionReason.trim()) return;
    
    try {
      await onReject(rejectionReason);
      router.push('/campaigns');
    } catch (error) {
      console.error('Error rejecting submission:', error);
    } finally {
      setShowRejectDialog(false);
      setRejectionReason("");
    }
  };

  // Safely get allocation data with fallbacks
  const totalProjectedStreams = allocationsData.totalProjectedStreams || 0;
  // Fix: Remove incorrect fallback that was using arbitrary multiplier
  const totalCost = allocationsData.totalCost || 0;

  // Calculate average vendor cost per 1K streams
  const calculateAvgVendorCostPer1k = () => {
    const playlists = allocationsData.selectedPlaylists || [];
    if (playlists.length === 0) return 8; // Default
    
    let totalCostPer1k = 0;
    let count = 0;
    for (const p of playlists) {
      const costPer1k = p.cost_per_1k || p.vendor?.cost_per_1k_streams || 8;
      totalCostPer1k += costPer1k;
      count++;
    }
    return count > 0 ? totalCostPer1k / count : 8;
  };

  const avgVendorCostPer1k = calculateAvgVendorCostPer1k();

  const coverage = Math.min((totalProjectedStreams / campaignData.stream_goal) * 100, 100);
  const endDate = new Date(new Date(campaignData.start_date).getTime() + campaignData.duration_days * 24 * 60 * 60 * 1000);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">
          {isReviewing ? 'Submission Review' : 'Campaign Review'}
        </h2>
        <p className="text-muted-foreground">
          {isReviewing 
            ? 'Review the submission details and approve or reject' 
            : 'Review your campaign details and launch when ready'
          }
        </p>
        {isReviewing && submissionData && (
          <div className="bg-accent/10 border border-accent/20 rounded-lg p-4 text-sm">
            <p><span className="font-medium">Submitted by:</span> {submissionData.salesperson}</p>
            <p><span className="font-medium">Submission Date:</span> {new Date(submissionData.created_at).toLocaleDateString()}</p>
            {submissionData.notes && (
              <p><span className="font-medium">Notes:</span> {submissionData.notes}</p>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Campaign Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Campaign Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Music className="w-5 h-5" />
                Campaign Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Campaign Name</p>
                  <p className="font-medium">{campaignData.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Client</p>
                  <p className="font-medium">{campaignData.client}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Track</p>
                  <p className="font-medium">{campaignData.track_name || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Sub-genre</p>
                  <p className="font-medium">{campaignData.sub_genre}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Start Date</p>
                  <p className="font-medium flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {new Date(campaignData.start_date).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">End Date</p>
                  <p className="font-medium flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {endDate.toLocaleDateString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

              {/* Allocation Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Playlist Allocation Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Selected Playlists</p>
                  <p className="text-2xl font-bold">{allocationsData.selectedPlaylists?.length || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Selected Vendors</p>
                  <p className="text-2xl font-bold">{allocationsData.selectedVendors?.length || 0}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Projected Streams</p>
                  <p className="text-2xl font-bold">{totalProjectedStreams.toLocaleString()}</p>
                </div>
              </div>
              
              {/* Show selected vendors */}
              {allocationsData.selectedVendors && allocationsData.selectedVendors.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  <span className="text-sm text-muted-foreground">Vendors:</span>
                  {allocationsData.selectedVendors.map((vendor: any) => (
                    <Badge key={vendor.id} variant="secondary">
                      {vendor.name}
                    </Badge>
                  ))}
                </div>
              )}
              
              {/* Direct Vendor Allocations */}
              {allocationsData.vendorAllocations && allocationsData.vendorAllocations.length > 0 && (
                <div className="space-y-3 border-t pt-3">
                  <p className="text-sm font-medium text-muted-foreground">Direct Vendor Allocations:</p>
                  <div className="space-y-2">
                    {allocationsData.vendorAllocations.map((va: any) => (
                      <div key={va.vendor_id} className="flex justify-between items-center p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div>
                          <p className="font-medium text-sm">Vendor Direct Allocation</p>
                          <p className="text-xs text-muted-foreground">Vendor ID: {va.vendor_id}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{va.allocation.toLocaleString()} streams</p>
                          <p className="text-xs text-muted-foreground">${(va.allocation * 0.001).toFixed(2)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Vendor-Grouped Playlist Breakdown */}
              {allocationsData.selectedPlaylists && allocationsData.selectedPlaylists.length > 0 && (
                <div className="space-y-3 border-t pt-3">
                  <p className="text-sm font-medium text-muted-foreground">Playlist Breakdown by Vendor:</p>
                  <div className="space-y-4 max-h-64 overflow-y-auto">
                     {(() => {
                       // Group playlists by vendor - properly fetch and display vendor information
                       const vendorGroups = allocationsData.selectedPlaylists.reduce((acc: any, playlist: any) => {
                         // Handle both playlist object and playlist ID formats
                         const playlistData = typeof playlist === 'string' 
                           ? allocationsData.allocations?.find((a: any) => a.id === playlist || a.playlist_id === playlist)
                           : playlist;
                         
                         if (!playlistData) return acc;
                         
                         const vendorId = playlistData.vendor_id || playlistData.vendor?.id;
                         const vendorName = playlistData.vendor_name || playlistData.vendor?.name || `Vendor ${vendorId?.slice?.(-8) || 'Unknown'}`;
                         const costPer1k = playlistData.cost_per_1k || playlistData.vendor?.cost_per_1k_streams || 8;
                         
                         if (!acc[vendorName]) {
                           acc[vendorName] = {
                             vendor: { name: vendorName, id: vendorId, cost_per_1k: costPer1k },
                             playlists: [],
                             totalStreams: 0,
                             totalCost: 0
                           };
                         }
                         
                         const streams = playlistData.streams_allocated || playlistData.allocation || 0;
                         const cost = (streams / 1000) * costPer1k;
                         
                         acc[vendorName].playlists.push({
                           id: playlistData.id,
                           name: playlistData.name || `Playlist`,
                           streams,
                           cost,
                           dailyStreams: playlistData.avg_daily_streams || 0
                         });
                         acc[vendorName].totalStreams += streams;
                         acc[vendorName].totalCost += cost;
                         return acc;
                       }, {});

                      return Object.entries(vendorGroups).map(([vendorName, group]: [string, any]) => (
                        <div key={vendorName} className="border rounded-lg p-3 bg-accent/5">
                          <div className="flex justify-between items-center mb-2">
                            <h4 className="font-medium text-sm">{vendorName}</h4>
                            <div className="text-right text-xs text-muted-foreground">
                              <div>{group.totalStreams.toLocaleString()} streams</div>
                              <div className="font-medium">${group.totalCost.toFixed(2)}</div>
                            </div>
                          </div>
                          <div className="space-y-1">
                            {group.playlists.map((playlist: any, idx: number) => (
                              <div key={playlist.id || idx} className="flex justify-between items-center text-xs py-1 px-2 bg-background/50 rounded">
                                <span className="truncate flex-1 mr-2">{playlist.name || 'Unnamed Playlist'}</span>
                                <span className="text-muted-foreground whitespace-nowrap">
                                  {playlist.streams ? playlist.streams.toLocaleString() : '0'} • ${playlist.cost ? playlist.cost.toFixed(2) : '0.00'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Goal Coverage</span>
                  <span className="font-medium">{coverage.toFixed(1)}%</span>
                </div>
                <Progress value={coverage} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {coverage >= 100 ? "Goal exceeded!" : `${(100 - coverage).toFixed(1)}% remaining to reach goal`}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Budget Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Budget Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total Budget</p>
                  <p className="text-xl font-bold">${campaignData.budget.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Projected Vendor Cost</p>
                  <p className="text-xl font-bold text-green-600">
                    ${totalCost > 0 ? totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ((totalProjectedStreams / 1000) * avgVendorCostPer1k).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Avg Vendor Rate</p>
                  <p className="text-xl font-bold">${avgVendorCostPer1k.toFixed(2)}/1K</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Est. Margin</p>
                  <p className="text-xl font-bold text-blue-600">
                    ${(campaignData.budget - (totalCost > 0 ? totalCost : ((totalProjectedStreams / 1000) * avgVendorCostPer1k))).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <p className="text-sm text-muted-foreground">Expected Daily Streams</p>
                  <p className="font-medium">{Math.round(totalProjectedStreams / campaignData.duration_days).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Projected Total Streams</p>
                  <p className="font-medium">{totalProjectedStreams.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Launch Panel */}
        <div className="space-y-6">
          <Card className="bg-accent/5 border-accent/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Rocket className="w-5 h-5 text-accent" />
                Ready to Launch?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Status Indicators */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm">Campaign configured</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm">Playlists selected</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm">Budget allocated</span>
                </div>
              </div>

              <Separator />

              {/* Quick Stats */}
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Stream Goal</span>
                  <span className="text-sm font-medium">{campaignData.stream_goal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Projected Streams</span>
                  <span className="text-sm font-medium">{totalProjectedStreams.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Duration</span>
                  <span className="text-sm font-medium">{campaignData.duration_days} days</span>
                </div>
              </div>

              <Separator />

              {/* Action Buttons */}
              <div className="space-y-3">
                <Button variant="outline" onClick={onBack} className="w-full">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Recommendations
                </Button>
                
                {isReviewing ? (
                  <Button
                   onClick={() => handleLaunch('active')}
                   disabled={isLaunching}
                   className="bg-green-600 hover:bg-green-700 w-full"
                 >
                   {isLaunching ? (
                     "Approving..."
                   ) : (
                     <>
                       <CheckCircle className="w-4 h-4 mr-2" />
                       Approve Campaign
                     </>
                   )}
                 </Button>
                ) : (
                  <>
                    <Button
                      onClick={() => handleLaunch('active')}
                      disabled={isLaunching}
                      className="bg-primary hover:bg-primary/90 w-full"
                    >
                      {isLaunching ? (
                        "Launching..."
                      ) : (
                        <>
                          <Rocket className="w-4 h-4 mr-2" />
                          {isEditing ? 'Save & Activate' : 'Launch Campaign'}
                        </>
                      )}
                    </Button>
                    
                    <Button
                      variant="outline"
                      onClick={() => handleLaunch('unreleased')}
                      disabled={isLaunching}
                      className="w-full"
                    >
                      {isLaunching ? (
                        "Saving..."
                      ) : (
                        <>
                          <Clock className="w-4 h-4 mr-2" />
                          Save as Unreleased
                        </>
                      )}
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

    </div>
  );
}








