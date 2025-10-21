"use client"

import { useState } from 'react';
import { useCampaignGroups } from '../hooks/useCampaignGroups';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  Upload,
} from 'lucide-react';

type SortField = 'name' | 'client_name' | 'status' | 'total_daily' | 'total_weekly' | 'total_remaining' | 'progress_percentage' | 'invoice_status';
type SortDirection = 'asc' | 'desc';

export function CampaignGroupList() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('start_date' as any);
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedCampaigns, setSelectedCampaigns] = useState<Set<string>>(new Set());

  const { data: campaigns = [], isLoading } = useCampaignGroups();

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-2 h-4 w-4" />;
    }
    return sortDirection === 'asc' ? 
      <ArrowUp className="ml-2 h-4 w-4" /> : 
      <ArrowDown className="ml-2 h-4 w-4" />;
  };

  const filteredAndSortedCampaigns = campaigns
    .filter(campaign => {
      const matchesSearch = 
        campaign.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        campaign.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        campaign.artist_name?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || campaign.status === statusFilter;

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'name':
          aValue = a.name?.toLowerCase() || '';
          bValue = b.name?.toLowerCase() || '';
          break;
        case 'client_name':
          aValue = a.client_name?.toLowerCase() || '';
          bValue = b.client_name?.toLowerCase() || '';
          break;
        case 'total_daily':
          aValue = a.total_daily || 0;
          bValue = b.total_daily || 0;
          break;
        case 'total_weekly':
          aValue = a.total_weekly || 0;
          bValue = b.total_weekly || 0;
          break;
        case 'total_remaining':
          aValue = a.total_remaining || 0;
          bValue = b.total_remaining || 0;
          break;
        case 'progress_percentage':
          aValue = a.progress_percentage || 0;
          bValue = b.progress_percentage || 0;
          break;
        case 'status':
          aValue = a.status || '';
          bValue = b.status || '';
          break;
        case 'invoice_status':
          aValue = a.invoice_status || '';
          bValue = b.invoice_status || '';
          break;
        default:
          aValue = a.start_date || '';
          bValue = b.start_date || '';
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

  const handleSelectAll = () => {
    if (selectedCampaigns.size === filteredAndSortedCampaigns.length) {
      setSelectedCampaigns(new Set());
    } else {
      setSelectedCampaigns(new Set(filteredAndSortedCampaigns.map(c => c.id)));
    }
  };

  const handleSelectCampaign = (campaignId: string) => {
    const newSelected = new Set(selectedCampaigns);
    if (newSelected.has(campaignId)) {
      newSelected.delete(campaignId);
    } else {
      newSelected.add(campaignId);
    }
    setSelectedCampaigns(newSelected);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'complete':
      case 'completed':
        return 'outline';
      case 'cancelled':
      case 'canceled':
        return 'destructive';
      case 'draft':
        return 'secondary';
      case 'unreleased':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  const getInvoiceStatusBadgeVariant = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'paid':
        return 'default';
      case 'sent':
        return 'secondary';
      case 'not invoiced':
        return 'outline';
      case 'n/a':
        return 'outline';
      default:
        return 'outline';
    }
  };

  if (isLoading) {
    return <div className="p-8">Loading campaigns...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Campaigns</h1>
          <p className="text-muted-foreground">
            Showing {filteredAndSortedCampaigns.length} of {campaigns.length} campaigns
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Import Campaigns
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search campaigns, vendors, clients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="Draft">Draft</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Complete">Complete</SelectItem>
              <SelectItem value="Cancelled">Cancelled</SelectItem>
              <SelectItem value="Unreleased">Unreleased</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Campaign Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={selectedCampaigns.size === filteredAndSortedCampaigns.length && filteredAndSortedCampaigns.length > 0}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead 
                className="cursor-pointer select-none hover:bg-muted/50"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center">
                  Campaign
                  {getSortIcon('name')}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer select-none hover:bg-muted/50"
                onClick={() => handleSort('client_name')}
              >
                <div className="flex items-center">
                  Client
                  {getSortIcon('client_name')}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer select-none hover:bg-muted/50"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center">
                  Status
                  {getSortIcon('status')}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer select-none hover:bg-muted/50"
                onClick={() => handleSort('total_daily')}
              >
                <div className="flex items-center">
                  Daily Streams
                  {getSortIcon('total_daily')}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer select-none hover:bg-muted/50"
                onClick={() => handleSort('total_weekly')}
              >
                <div className="flex items-center">
                  Weekly Streams
                  {getSortIcon('total_weekly')}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer select-none hover:bg-muted/50"
                onClick={() => handleSort('total_remaining')}
              >
                <div className="flex items-center">
                  Remaining
                  {getSortIcon('total_remaining')}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer select-none hover:bg-muted/50"
                onClick={() => handleSort('progress_percentage')}
              >
                <div className="flex items-center">
                  Progress
                  {getSortIcon('progress_percentage')}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer select-none hover:bg-muted/50"
                onClick={() => handleSort('invoice_status')}
              >
                <div className="flex items-center">
                  Invoice
                  {getSortIcon('invoice_status')}
                </div>
              </TableHead>
              <TableHead>Performance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedCampaigns.map((campaign) => {
              const isSelected = selectedCampaigns.has(campaign.id);
              
              return (
                <TableRow 
                  key={campaign.id}
                  className="cursor-pointer hover:bg-muted/50"
                >
                  <TableCell>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleSelectCampaign(campaign.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{campaign.artist_name || campaign.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {campaign.name}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Budget: ${campaign.total_budget?.toFixed(2) || '0.00'} | Goal: {campaign.total_goal?.toLocaleString() || '0'}
                      </div>
                      {campaign.start_date && (
                        <div className="text-xs text-muted-foreground">
                          Started: {new Date(campaign.start_date).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{campaign.client_name || 'N/A'}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(campaign.status)}>
                      {campaign.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-center">
                      <div className="font-semibold">{campaign.total_daily?.toLocaleString() || '0'}</div>
                      <div className="text-xs text-muted-foreground">per day</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-center">
                      <div className="font-semibold">{campaign.total_weekly?.toLocaleString() || '0'}</div>
                      <div className="text-xs text-muted-foreground">per week</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-center">
                      <div className="font-semibold">{campaign.total_remaining?.toLocaleString() || '0'}</div>
                      <div className="text-xs text-muted-foreground">remaining</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="text-sm font-medium">{campaign.progress_percentage || 0}%</div>
                      <Progress value={campaign.progress_percentage || 0} className="h-2" />
                      <div className="text-xs text-muted-foreground">
                        {((campaign.total_goal || 0) - (campaign.total_remaining || 0)).toLocaleString()} / {campaign.total_goal?.toLocaleString() || '0'}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getInvoiceStatusBadgeVariant(campaign.invoice_status || 'Not Invoiced')}>
                      {campaign.invoice_status || 'Not Invoiced'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">N/A</Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      {filteredAndSortedCampaigns.length === 0 && !isLoading && (
        <div className="text-center py-12 text-muted-foreground">
          No campaigns found matching your filters.
        </div>
      )}
    </div>
  );
}

