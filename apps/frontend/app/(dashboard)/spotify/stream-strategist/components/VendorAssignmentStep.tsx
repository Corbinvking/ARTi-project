"use client"

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../integrations/supabase/client';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useVendors } from '../hooks/useVendors';
import { AlertCircle, Plus, Trash2, DollarSign, TrendingUp, Music, ChevronDown, ChevronRight } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface VendorAssignment {
  vendor_id: string;
  vendor_name: string;
  allocated_streams: number;
  allocated_budget: number;
  playlist_ids?: string[];
}

interface VendorAssignmentStepProps {
  assignments: VendorAssignment[];
  onChange: (assignments: VendorAssignment[]) => void;
  totalStreamGoal: number;
  totalBudget: number;
}

export function VendorAssignmentStep({ 
  assignments, 
  onChange, 
  totalStreamGoal, 
  totalBudget 
}: VendorAssignmentStepProps) {
  const { data: vendors = [] } = useVendors();
  const [selectedVendorId, setSelectedVendorId] = useState<string>('');
  const [expandedVendors, setExpandedVendors] = useState<Set<string>>(new Set());
  
  const activeVendors = vendors.filter(v => v.is_active);

  // Fetch all playlists grouped by vendor
  const { data: allPlaylists = [] } = useQuery({
    queryKey: ['all-playlists'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('playlists')
        .select(`
          *,
          vendor:vendors(id, name, cost_per_1k_streams, is_active)
        `)
        .order('name');
      
      if (error) throw error;
      return data as any[];
    },
  });
  
  // Calculate totals
  const totalAllocatedStreams = assignments.reduce((sum, a) => sum + (a.allocated_streams || 0), 0);
  const totalAllocatedBudget = assignments.reduce((sum, a) => sum + (a.allocated_budget || 0), 0);
  
  const remainingStreams = totalStreamGoal - totalAllocatedStreams;
  const remainingBudget = totalBudget - totalAllocatedBudget;
  
  const isOverAllocatedStreams = totalAllocatedStreams > totalStreamGoal;
  const isOverAllocatedBudget = totalAllocatedBudget > totalBudget;

  const handleAddVendor = () => {
    if (!selectedVendorId) return;
    
    const vendor = activeVendors.find(v => v.id === selectedVendorId);
    if (!vendor) return;
    
    // Check if vendor already added
    if (assignments.some(a => a.vendor_id === selectedVendorId)) {
      return;
    }
    
    const newAssignment: VendorAssignment = {
      vendor_id: vendor.id,
      vendor_name: vendor.name,
      allocated_streams: 0,
      allocated_budget: 0,
      playlist_ids: []
    };
    
    onChange([...assignments, newAssignment]);
    setSelectedVendorId('');
  };

  const handleRemoveVendor = (vendorId: string) => {
    onChange(assignments.filter(a => a.vendor_id !== vendorId));
  };

  const handleUpdateAssignment = (vendorId: string, field: 'allocated_streams' | 'allocated_budget', value: number) => {
    onChange(
      assignments.map(a => 
        a.vendor_id === vendorId 
          ? { ...a, [field]: Math.max(0, value) } 
          : a
      )
    );
  };

  const handleTogglePlaylist = (vendorId: string, playlistId: string) => {
    onChange(
      assignments.map(a => {
        if (a.vendor_id !== vendorId) return a;
        
        const currentPlaylists = a.playlist_ids || [];
        const newPlaylists = currentPlaylists.includes(playlistId)
          ? currentPlaylists.filter(id => id !== playlistId)
          : [...currentPlaylists, playlistId];
        
        return { ...a, playlist_ids: newPlaylists };
      })
    );
  };

  const handleToggleVendorExpansion = (vendorId: string) => {
    setExpandedVendors(prev => {
      const next = new Set(prev);
      if (next.has(vendorId)) {
        next.delete(vendorId);
      } else {
        next.add(vendorId);
      }
      return next;
    });
  };

  // Get playlists for a specific vendor
  const getVendorPlaylists = (vendorId: string) => {
    return allPlaylists.filter(p => p.vendor_id === vendorId);
  };

  const handleAutoDistribute = (type: 'streams' | 'budget') => {
    if (assignments.length === 0) return;
    
    const equalShare = type === 'streams' 
      ? Math.floor(totalStreamGoal / assignments.length)
      : Math.floor((totalBudget / assignments.length) * 100) / 100;
    
    onChange(
      assignments.map((a, index) => ({
        ...a,
        [type === 'streams' ? 'allocated_streams' : 'allocated_budget']: 
          index === 0 
            ? (type === 'streams' ? totalStreamGoal : totalBudget) - (equalShare * (assignments.length - 1))
            : equalShare
      }))
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Vendor Assignment</h3>
        <p className="text-sm text-muted-foreground">
          Assign vendors to handle this campaign and allocate streams/budget to each.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Streams Summary */}
        <Card className={isOverAllocatedStreams ? 'border-destructive' : ''}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Stream Allocation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Campaign Goal:</span>
                <span className="font-medium">{totalStreamGoal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Allocated:</span>
                <span className={`font-medium ${isOverAllocatedStreams ? 'text-destructive' : ''}`}>
                  {totalAllocatedStreams.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Remaining:</span>
                <span className={`font-medium ${isOverAllocatedStreams ? 'text-destructive' : 'text-primary'}`}>
                  {remainingStreams.toLocaleString()}
                </span>
              </div>
              {isOverAllocatedStreams && (
                <div className="flex items-center gap-2 text-xs text-destructive mt-2">
                  <AlertCircle className="h-3 w-3" />
                  Over-allocated by {Math.abs(remainingStreams).toLocaleString()} streams
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Budget Summary */}
        <Card className={isOverAllocatedBudget ? 'border-destructive' : ''}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Budget Allocation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Campaign Budget:</span>
                <span className="font-medium">${totalBudget.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Allocated:</span>
                <span className={`font-medium ${isOverAllocatedBudget ? 'text-destructive' : ''}`}>
                  ${totalAllocatedBudget.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Remaining:</span>
                <span className={`font-medium ${isOverAllocatedBudget ? 'text-destructive' : 'text-primary'}`}>
                  ${remainingBudget.toLocaleString()}
                </span>
              </div>
              {isOverAllocatedBudget && (
                <div className="flex items-center gap-2 text-xs text-destructive mt-2">
                  <AlertCircle className="h-3 w-3" />
                  Over-allocated by ${Math.abs(remainingBudget).toLocaleString()}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Vendor Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add Vendors</CardTitle>
          <CardDescription>Select vendors to work on this campaign</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <select
              value={selectedVendorId}
              onChange={(e) => setSelectedVendorId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="">Select a vendor...</option>
              {activeVendors
                .filter(v => !assignments.some(a => a.vendor_id === v.id))
                .map(vendor => (
                  <option key={vendor.id} value={vendor.id}>
                    {vendor.name} {vendor.max_daily_streams ? `(Max: ${vendor.max_daily_streams.toLocaleString()}/day)` : ''}
                  </option>
                ))}
            </select>
            <Button 
              onClick={handleAddVendor}
              disabled={!selectedVendorId}
              size="default"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Vendor Assignments List */}
      {assignments.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Vendor Allocations</CardTitle>
              <CardDescription>{assignments.length} vendor(s) assigned</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => handleAutoDistribute('streams')}
                variant="outline"
                size="sm"
              >
                Auto-Distribute Streams
              </Button>
              <Button 
                onClick={() => handleAutoDistribute('budget')}
                variant="outline"
                size="sm"
              >
                Auto-Distribute Budget
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {assignments.map((assignment, index) => {
                const vendor = activeVendors.find(v => v.id === assignment.vendor_id);
                const costPerStream = assignment.allocated_streams > 0 
                  ? assignment.allocated_budget / assignment.allocated_streams * 1000
                  : 0;
                
                return (
                  <Card key={assignment.vendor_id} className="border-2">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h4 className="font-semibold">{assignment.vendor_name}</h4>
                          {vendor?.cost_per_1k_streams && (
                            <p className="text-xs text-muted-foreground">
                              Standard rate: ${vendor.cost_per_1k_streams}/1K streams
                            </p>
                          )}
                        </div>
                        <Button
                          onClick={() => handleRemoveVendor(assignment.vendor_id)}
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs">Allocated Streams</Label>
                          <Input
                            type="number"
                            min="0"
                            value={assignment.allocated_streams || ''}
                            onChange={(e) => handleUpdateAssignment(
                              assignment.vendor_id, 
                              'allocated_streams', 
                              parseInt(e.target.value) || 0
                            )}
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Allocated Budget ($)</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={assignment.allocated_budget || ''}
                            onChange={(e) => handleUpdateAssignment(
                              assignment.vendor_id, 
                              'allocated_budget', 
                              parseFloat(e.target.value) || 0
                            )}
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                      
                      {assignment.allocated_streams > 0 && (
                        <div className="mt-3 text-xs text-muted-foreground">
                          Cost per 1K streams: ${costPerStream.toFixed(2)}
                        </div>
                      )}

                      {/* Playlist Selection */}
                      <div className="mt-4 pt-4 border-t">
                        <div 
                          className="flex items-center justify-between cursor-pointer"
                          onClick={() => handleToggleVendorExpansion(assignment.vendor_id)}
                        >
                          <div className="flex items-center gap-2">
                            <Label className="text-sm font-medium cursor-pointer">
                              <Music className="h-4 w-4 inline mr-1" />
                              Select Playlists (Optional)
                            </Label>
                            {assignment.playlist_ids && assignment.playlist_ids.length > 0 && (
                              <Badge variant="secondary" className="text-xs">
                                {assignment.playlist_ids.length} selected
                              </Badge>
                            )}
                          </div>
                          {expandedVendors.has(assignment.vendor_id) ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>

                        {expandedVendors.has(assignment.vendor_id) && (
                          <div className="mt-3 space-y-2 max-h-60 overflow-y-auto">
                            {getVendorPlaylists(assignment.vendor_id).length > 0 ? (
                              getVendorPlaylists(assignment.vendor_id).map(playlist => {
                                const isSelected = assignment.playlist_ids?.includes(playlist.id);
                                return (
                                  <div
                                    key={playlist.id}
                                    className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-colors ${
                                      isSelected
                                        ? 'bg-primary/10 border-primary'
                                        : 'hover:bg-muted/50'
                                    }`}
                                    onClick={() => handleTogglePlaylist(assignment.vendor_id, playlist.id)}
                                  >
                                    <Checkbox checked={isSelected} />
                                    <div className="flex-1 min-w-0">
                                      <div className="text-sm font-medium truncate">{playlist.name}</div>
                                      <div className="text-xs text-muted-foreground">
                                        {playlist.follower_count?.toLocaleString() || 0} followers
                                        {playlist.avg_daily_streams && ` • ~${playlist.avg_daily_streams.toLocaleString()}/day`}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <p className="text-sm text-muted-foreground text-center py-4">
                                No playlists available for this vendor
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Validation Messages */}
      {assignments.length === 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground p-4 border rounded-md bg-muted/20">
          <AlertCircle className="h-4 w-4" />
          <span>No vendors assigned yet. Add at least one vendor to continue.</span>
        </div>
      )}
    </div>
  );
}

