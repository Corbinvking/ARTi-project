import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit2, Save, X } from "lucide-react";
import { supabase } from "../../integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { SERVICE_TYPES } from "../../lib/constants";
import type { Database } from "../../integrations/supabase/types";

type PricingTier = Database['public']['Tables']['pricing_tiers']['Row'];
type ServiceType = Database['public']['Enums']['service_type'];

export const PricingManagement = () => {
  const [pricingTiers, setPricingTiers] = useState<PricingTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newTier, setNewTier] = useState({
    service_type: '' as ServiceType,
    tier_min_views: 0,
    tier_max_views: null as number | null,
    cost_per_1k_views: 0
  });
  const [showAddForm, setShowAddForm] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchPricingTiers();
  }, []);

  const fetchPricingTiers = async () => {
    try {
      const { data, error } = await supabase
        .from('pricing_tiers')
        .select('*')
        .order('service_type')
        .order('tier_min_views');

      if (error) throw error;
      setPricingTiers(data || []);
    } catch (error) {
      console.error('Error fetching pricing tiers:', error);
      toast({
        title: "Error",
        description: "Failed to load pricing tiers",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTier = async (tier: PricingTier) => {
    try {
      const { error } = await supabase
        .from('pricing_tiers')
        .update({
          tier_min_views: tier.tier_min_views,
          tier_max_views: tier.tier_max_views,
          cost_per_1k_views: tier.cost_per_1k_views
        })
        .eq('id', tier.id);

      if (error) throw error;

      setPricingTiers(prev => 
        prev.map(p => p.id === tier.id ? tier : p)
      );
      setEditingId(null);
      toast({
        title: "Success",
        description: "Pricing tier updated successfully",
      });
    } catch (error) {
      console.error('Error updating pricing tier:', error);
      toast({
        title: "Error",
        description: "Failed to update pricing tier",
        variant: "destructive",
      });
    }
  };

  const handleAddTier = async () => {
    try {
      const { data, error } = await supabase
        .from('pricing_tiers')
        .insert([newTier])
        .select()
        .single();

      if (error) throw error;

      setPricingTiers(prev => [...prev, data]);
      setNewTier({
        service_type: '' as ServiceType,
        tier_min_views: 0,
        tier_max_views: null,
        cost_per_1k_views: 0
      });
      setShowAddForm(false);
      toast({
        title: "Success",
        description: "Pricing tier added successfully",
      });
    } catch (error) {
      console.error('Error adding pricing tier:', error);
      toast({
        title: "Error",
        description: "Failed to add pricing tier",
        variant: "destructive",
      });
    }
  };

  const formatViewRange = (minViews: number, maxViews: number | null) => {
    if (maxViews === null) {
      return `${minViews.toLocaleString()}+`;
    }
    return `${minViews.toLocaleString()} - ${maxViews.toLocaleString()}`;
  };

  const getServiceTypeLabel = (serviceType: ServiceType) => {
    return SERVICE_TYPES.find(type => type.value === serviceType)?.label || serviceType;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">Loading pricing tiers...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Pricing Tier Management
            <Button
              size="sm"
              onClick={() => setShowAddForm(true)}
              disabled={showAddForm}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Tier
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {showAddForm && (
            <Card className="mb-4">
              <CardHeader>
                <CardTitle className="text-lg">Add New Pricing Tier</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-service-type">Service Type</Label>
                    <Select
                      value={newTier.service_type}
                      onValueChange={(value) => setNewTier(prev => ({ ...prev, service_type: value as ServiceType }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select service type" />
                      </SelectTrigger>
                      <SelectContent>
                        {SERVICE_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-cost">Cost per 1K Views ($)</Label>
                    <Input
                      id="new-cost"
                      type="number"
                      step="0.01"
                      value={newTier.cost_per_1k_views}
                      onChange={(e) => setNewTier(prev => ({ ...prev, cost_per_1k_views: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-min-views">Minimum Views</Label>
                    <Input
                      id="new-min-views"
                      type="number"
                      value={newTier.tier_min_views}
                      onChange={(e) => setNewTier(prev => ({ ...prev, tier_min_views: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-max-views">Maximum Views (optional)</Label>
                    <Input
                      id="new-max-views"
                      type="number"
                      value={newTier.tier_max_views || ''}
                      onChange={(e) => setNewTier(prev => ({ ...prev, tier_max_views: e.target.value ? parseInt(e.target.value) : null }))}
                      placeholder="Leave empty for unlimited"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleAddTier} disabled={!newTier.service_type}>
                    <Save className="w-4 h-4 mr-2" />
                    Save Tier
                  </Button>
                  <Button variant="outline" onClick={() => setShowAddForm(false)}>
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service Type</TableHead>
                <TableHead>View Range</TableHead>
                <TableHead>Cost per 1K Views</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pricingTiers.map((tier) => (
                <TableRow key={tier.id}>
                  <TableCell>
                    <Badge variant="outline">
                      {getServiceTypeLabel(tier.service_type)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {editingId === tier.id ? (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={tier.tier_min_views}
                          onChange={(e) => {
                            const newTiers = pricingTiers.map(t => 
                              t.id === tier.id ? { ...t, tier_min_views: parseInt(e.target.value) || 0 } : t
                            );
                            setPricingTiers(newTiers);
                          }}
                          className="w-24"
                        />
                        <span>-</span>
                        <Input
                          type="number"
                          value={tier.tier_max_views || ''}
                          onChange={(e) => {
                            const newTiers = pricingTiers.map(t => 
                              t.id === tier.id ? { ...t, tier_max_views: e.target.value ? parseInt(e.target.value) : null } : t
                            );
                            setPricingTiers(newTiers);
                          }}
                          placeholder="∞"
                          className="w-24"
                        />
                      </div>
                    ) : (
                      <div className="font-mono">
                        {formatViewRange(tier.tier_min_views, tier.tier_max_views)}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === tier.id ? (
                      <Input
                        type="number"
                        step="0.01"
                        value={tier.cost_per_1k_views}
                        onChange={(e) => {
                          const newTiers = pricingTiers.map(t => 
                            t.id === tier.id ? { ...t, cost_per_1k_views: parseFloat(e.target.value) || 0 } : t
                          );
                          setPricingTiers(newTiers);
                        }}
                        className="w-32"
                      />
                    ) : (
                      <div className="font-mono">
                        ${tier.cost_per_1k_views.toFixed(4)}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === tier.id ? (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleSaveTier(tier)}
                        >
                          <Save className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingId(null);
                            fetchPricingTiers(); // Reset changes
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingId(tier.id)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};