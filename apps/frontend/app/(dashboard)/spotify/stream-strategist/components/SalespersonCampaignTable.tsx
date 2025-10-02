"use client"

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Search, DollarSign, Target, Calendar, TrendingUp } from "lucide-react";
import { useSalespersonCampaigns } from "../hooks/useSalespersonCampaigns";

interface SalespersonCampaignTableProps {
  onViewDetails: (campaignId: string) => void;
}

export function SalespersonCampaignTable({ onViewDetails }: SalespersonCampaignTableProps) {
  const { data: campaigns = [], isLoading } = useSalespersonCampaigns();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("active");

  const filteredCampaigns = campaigns.filter(campaign => {
    const matchesSearch = campaign.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         campaign.client_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesTab = true;
    switch (activeTab) {
      case 'active':
        matchesTab = campaign.status === 'active';
        break;
      case 'completed':
        matchesTab = campaign.status === 'completed';
        break;
      case 'pending':
        matchesTab = ['draft', 'built', 'unreleased', 'operator_review_complete'].includes(campaign.status);
        break;
      default:
        matchesTab = true;
    }
    
    return matchesSearch && matchesTab;
  });

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'completed': return 'secondary';
      case 'draft': return 'outline';
      case 'built': return 'outline';
      case 'unreleased': return 'outline';
      default: return 'outline';
    }
  };

  const getStatusCounts = () => {
    return {
      active: campaigns.filter(c => c.status === 'active').length,
      completed: campaigns.filter(c => c.status === 'completed').length,
      pending: campaigns.filter(c => ['draft', 'built', 'unreleased', 'operator_review_complete'].includes(c.status)).length,
    };
  };

  const statusCounts = getStatusCounts();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your Campaigns</CardTitle>
          <CardDescription>Track all your campaigns and their performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Loading campaigns...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Campaigns</CardTitle>
        <CardDescription>Track all your campaigns and their performance</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Search */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search campaigns..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Status Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="active">
                Active ({statusCounts.active})
              </TabsTrigger>
              <TabsTrigger value="completed">
                Completed ({statusCounts.completed})
              </TabsTrigger>
              <TabsTrigger value="pending">
                Pending ({statusCounts.pending})
              </TabsTrigger>
              <TabsTrigger value="all">
                All ({campaigns.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-4">
              {filteredCampaigns.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Campaign</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Target className="h-4 w-4" />
                            Progress
                          </div>
                        </TableHead>
                        <TableHead className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <TrendingUp className="h-4 w-4" />
                            Streams
                          </div>
                        </TableHead>
                        <TableHead className="text-right">Daily Streams</TableHead>
                        <TableHead className="text-right">Weekly Streams</TableHead>
                        <TableHead className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <DollarSign className="h-4 w-4" />
                            Price
                          </div>
                        </TableHead>
                        <TableHead className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <DollarSign className="h-4 w-4" />
                            Commission
                          </div>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCampaigns.map((campaign) => (
                        <TableRow 
                          key={campaign.id} 
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => onViewDetails(campaign.id)}
                        >
                          <TableCell>
                            <div>
                              <div className="font-medium">{campaign.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {campaign.track_name || 'Track name not set'}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{campaign.client_name}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusVariant(campaign.status)}>
                              {campaign.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="space-y-1">
                              <Progress 
                                value={campaign.progress_percentage} 
                                className="w-16 h-2 ml-auto" 
                              />
                              <div className="text-xs text-muted-foreground">
                                {campaign.progress_percentage}%
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="space-y-1">
                              <div className="font-medium">
                                {(campaign.stream_goal - campaign.remaining_streams).toLocaleString()}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                / {campaign.stream_goal.toLocaleString()}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="font-medium">
                              {campaign.daily_streams?.toLocaleString() || '0'}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="font-medium">
                              {campaign.weekly_streams?.toLocaleString() || '0'}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="font-medium text-green-600">
                              ${campaign.price_paid?.toLocaleString() || '0'}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="font-medium text-green-600">
                              ${campaign.commission_amount.toLocaleString()}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  {searchTerm ? 'No campaigns match your search.' : `No ${activeTab} campaigns found.`}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </CardContent>
    </Card>
  );
}








