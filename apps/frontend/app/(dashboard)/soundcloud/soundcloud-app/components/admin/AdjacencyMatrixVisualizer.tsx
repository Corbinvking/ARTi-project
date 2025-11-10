"use client"

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '../../hooks/use-toast';
import { supabase } from '../../integrations/supabase/client';
import { motion } from 'framer-motion';
import { Network, Save, RotateCcw, Zap, TrendingUp } from 'lucide-react';

interface GenreFamily {
  id: string;
  name: string;
  active: boolean;
}

interface AdjacencyMatrix {
  [key: string]: {
    [key: string]: number;
  };
}

interface AdjacencyMatrixVisualizerProps {
  families: GenreFamily[];
  onUpdate?: () => void;
}

export const AdjacencyMatrixVisualizer: React.FC<AdjacencyMatrixVisualizerProps> = ({
  families,
  onUpdate
}) => {
  const { toast } = useToast();
  const [matrix, setMatrix] = useState<AdjacencyMatrix>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hoveredCell, setHoveredCell] = useState<{ from: string; to: string } | null>(null);

  useEffect(() => {
    fetchMatrix();
  }, []);

  const fetchMatrix = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('adjacency_matrix')
        .single();

      if (error) throw error;

      setMatrix((data?.adjacency_matrix as AdjacencyMatrix) || {});
    } catch (error: any) {
      console.error('Error fetching matrix:', error);
      toast({
        title: "Error",
        description: "Failed to fetch adjacency matrix",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const initializeMatrix = () => {
    const newMatrix: AdjacencyMatrix = {};
    families.forEach(family => {
      newMatrix[family.id] = {};
      families.forEach(targetFamily => {
        newMatrix[family.id][targetFamily.id] = family.id === targetFamily.id ? 1.0 : 0.5;
      });
    });
    setMatrix(newMatrix);
  };

  const updateMatrixValue = (fromId: string, toId: string, value: number) => {
    const clampedValue = Math.max(0, Math.min(1, value));
    setMatrix(prev => ({
      ...prev,
      [fromId]: {
        ...prev[fromId],
        [toId]: clampedValue
      }
    }));
  };

  const saveMatrix = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('settings')
        .upsert({
          adjacency_matrix: matrix,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Compatibility matrix saved successfully",
      });

      onUpdate?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save matrix",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getCompatibilityColor = (value: number) => {
    if (value >= 0.8) return 'bg-green-500/20 border-green-500/40 text-green-400';
    if (value >= 0.6) return 'bg-yellow-500/20 border-yellow-500/40 text-yellow-400';
    if (value >= 0.4) return 'bg-orange-500/20 border-orange-500/40 text-orange-400';
    return 'bg-red-500/20 border-red-500/40 text-red-400';
  };

  const getCompatibilityLabel = (value: number) => {
    if (value >= 0.8) return 'High';
    if (value >= 0.6) return 'Good';
    if (value >= 0.4) return 'Fair';
    return 'Low';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading compatibility matrix...</p>
        </CardContent>
      </Card>
    );
  }

  const activeFamilies = families.filter(f => f.active);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Network className="w-5 h-5" />
                Genre Compatibility Matrix
              </CardTitle>
              <CardDescription>
                Configure compatibility scores between genre families (0.0 = incompatible, 1.0 = perfect match)
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                onClick={initializeMatrix}
                className="flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Initialize
              </Button>
              <Button 
                onClick={saveMatrix} 
                disabled={saving}
                className="flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Matrix'}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {Object.keys(matrix).length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Network className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Matrix Configured</h3>
            <p className="text-muted-foreground mb-4">
              Initialize the compatibility matrix to start configuring genre relationships
            </p>
            <Button onClick={initializeMatrix} className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Initialize Matrix
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-6">
            <div className="overflow-x-auto">
              <div className="grid grid-cols-1 gap-2 min-w-fit">
                {/* Header row */}
                <div className="grid gap-2" style={{ gridTemplateColumns: `200px repeat(${activeFamilies.length}, 120px)` }}>
                  <div className="p-3 text-sm font-medium text-muted-foreground">
                    From / To
                  </div>
                  {activeFamilies.map(family => (
                    <div
                      key={family.id}
                      className="p-2 bg-muted rounded-lg text-center text-sm font-medium"
                    >
                      {family.name}
                    </div>
                  ))}
                </div>

                {/* Matrix rows */}
                {activeFamilies.map(fromFamily => (
                  <div
                    key={fromFamily.id}
                    className="grid gap-2"
                    style={{ gridTemplateColumns: `200px repeat(${activeFamilies.length}, 120px)` }}
                  >
                    <div className="p-3 bg-muted rounded-lg text-sm font-medium flex items-center">
                      {fromFamily.name}
                    </div>
                    {activeFamilies.map(toFamily => {
                      const value = matrix[fromFamily.id]?.[toFamily.id] || 0;
                      const isHovered = hoveredCell?.from === fromFamily.id && hoveredCell?.to === toFamily.id;
                      
                      return (
                        <motion.div
                          key={toFamily.id}
                          className="relative"
                          whileHover={{ scale: 1.02 }}
                          onHoverStart={() => setHoveredCell({ from: fromFamily.id, to: toFamily.id })}
                          onHoverEnd={() => setHoveredCell(null)}
                        >
                          <Input
                            type="number"
                            min="0"
                            max="1"
                            step="0.1"
                            value={value.toFixed(1)}
                            onChange={(e) => updateMatrixValue(
                              fromFamily.id,
                              toFamily.id,
                              parseFloat(e.target.value) || 0
                            )}
                            className={`text-center h-12 transition-all ${
                              isHovered ? 'ring-2 ring-primary/50' : ''
                            } ${getCompatibilityColor(value)}`}
                          />
                          {isHovered && (
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="absolute -top-8 left-1/2 transform -translate-x-1/2 z-10"
                            >
                              <Badge className={getCompatibilityColor(value)}>
                                {getCompatibilityLabel(value)}
                              </Badge>
                            </motion.div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="mt-6 p-4 bg-muted rounded-lg">
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Compatibility Scale
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-green-500/20 border border-green-500/40" />
                  <span className="text-sm">High (0.8-1.0)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-yellow-500/20 border border-yellow-500/40" />
                  <span className="text-sm">Good (0.6-0.8)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-orange-500/20 border border-orange-500/40" />
                  <span className="text-sm">Fair (0.4-0.6)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-red-500/20 border border-red-500/40" />
                  <span className="text-sm">Low (0.0-0.4)</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};