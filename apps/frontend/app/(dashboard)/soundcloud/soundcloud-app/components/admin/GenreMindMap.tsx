"use client"

import React, { useState, useEffect, useCallback } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Background,
  Controls,
  MiniMap,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { supabase } from '../../integrations/supabase/client';
import { useToast } from '../../hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, Download, RefreshCw, Zap } from 'lucide-react';

interface GenreFamily {
  id: string;
  name: string;
  description?: string;
  color?: string;
}

interface Subgenre {
  id: string;
  name: string;
  family_id: string;
  patterns: string[];
  active: boolean;
}

interface AdjacencyMatrix {
  [key: string]: {
    [key: string]: number;
  };
}

const GenreNodeComponent: React.FC<{ data: any }> = ({ data }) => {
  const isFamily = data.type === 'family';
  
  return (
    <div className={`
      relative group transition-all duration-500 ease-out
      ${isFamily 
        ? 'min-w-[200px] max-w-[240px]' 
        : 'min-w-[140px] max-w-[180px]'
      }
      hover:scale-105 hover:z-10
    `}>
      {/* Glow effect for families */}
      {isFamily && (
        <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition-all duration-500" />
      )}
      
      <Card className={`
        relative backdrop-blur-sm border-0 shadow-xl
        ${isFamily 
          ? 'bg-gradient-to-br from-card/95 via-card to-card/90 shadow-primary/10' 
          : 'bg-gradient-to-br from-muted/80 to-muted/60 shadow-muted/20'
        }
        hover:shadow-2xl transition-all duration-500 ease-out
        ${isFamily ? 'rounded-2xl' : 'rounded-xl'}
      `}>
        <CardContent className={`${isFamily ? 'p-5' : 'p-3'} relative`}>
          {/* Background pattern for families */}
          {isFamily && (
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent rounded-2xl" />
          )}
          
          <div className="relative">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-3">
                {data.color && (
                  <div className="relative">
                    <div 
                      className={`${isFamily ? 'w-4 h-4' : 'w-3 h-3'} rounded-full shadow-lg`}
                      style={{ backgroundColor: data.color }}
                    />
                    {isFamily && (
                      <div 
                        className="absolute inset-0 rounded-full animate-pulse opacity-50"
                        style={{ backgroundColor: data.color }}
                      />
                    )}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className={`
                    font-semibold leading-tight tracking-tight
                    ${isFamily 
                      ? 'text-lg text-primary bg-gradient-to-r from-primary to-primary/80 bg-clip-text' 
                      : 'text-sm text-foreground/90'
                    }
                  `}>
                    {data.label}
                  </div>
                </div>
              </div>
              
              {data.count !== undefined && (
                <Badge 
                  variant={isFamily ? "default" : "secondary"} 
                  className={`
                    text-xs font-medium shrink-0
                    ${isFamily 
                      ? 'bg-gradient-to-r from-primary/90 to-primary text-primary-foreground shadow-lg' 
                      : 'bg-muted-foreground/10 text-muted-foreground'
                    }
                    hover:scale-110 transition-transform duration-200
                  `}
                >
                  {data.count} {isFamily ? 'sub' : 'art'}
                </Badge>
              )}
            </div>
            
            {data.description && (
              <p className={`
                text-muted-foreground leading-relaxed line-clamp-2
                ${isFamily ? 'text-xs mt-2' : 'text-xs mt-1'}
              `}>
                {data.description}
              </p>
            )}
            
            {/* Interactive indicator */}
            <div className={`
              absolute -bottom-1 -right-1 w-2 h-2 rounded-full 
              ${isFamily ? 'bg-primary/40' : 'bg-muted-foreground/30'}
              opacity-0 group-hover:opacity-100 transition-all duration-300
              animate-pulse
            `} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const nodeTypes = {
  genreNode: GenreNodeComponent,
};

export const GenreMindMap: React.FC = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [genreFamilies, setGenreFamilies] = useState<GenreFamily[]>([]);
  const [subgenres, setSubgenres] = useState<Subgenre[]>([]);
  const [adjacencyMatrix, setAdjacencyMatrix] = useState<AdjacencyMatrix>({});
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNodes, setSelectedNodes] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [familiesResponse, subgenresResponse] = await Promise.all([
        supabase.from('genre_families').select('*').order('name'),
        supabase.from('subgenres').select('*').order('order_index')
      ]);

      if (familiesResponse.error) throw familiesResponse.error;
      if (subgenresResponse.error) throw subgenresResponse.error;

      setGenreFamilies(familiesResponse.data || []);
      setSubgenres(subgenresResponse.data || []);
      setAdjacencyMatrix({}); // No adjacency matrix table for now
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch genre data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateNodes = useCallback(() => {
    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];

    // Filter based on search term
    const filteredFamilies = genreFamilies.filter(family =>
      family.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredSubgenres = subgenres.filter(subgenre =>
      subgenre.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      filteredFamilies.some(family => family.id === subgenre.family_id)
    );

    // Enhanced layout with better spacing and visual hierarchy
    const familySpacing = 400; // Increased spacing between families
    const familyRowHeight = 350; // Increased row height for better readability

    // Add family nodes with improved positioning
    filteredFamilies.forEach((family, index) => {
      const familySubgenres = filteredSubgenres.filter(
        sub => sub.family_id === family.id
      );

      const col = index % 3;
      const row = Math.floor(index / 3);
      const familyX = col * familySpacing + 200; // Offset from edge
      const familyY = row * familyRowHeight + 150; // Offset from top

      newNodes.push({
        id: family.id,
        type: 'genreNode',
        position: { x: familyX, y: familyY },
        data: {
          label: family.name,
          type: 'family',
          color: family.color,
          description: family.description,
          count: familySubgenres.length,
        },
        className: selectedNodes.has(family.id) 
          ? 'ring-2 ring-primary/60 ring-offset-2 ring-offset-background' 
          : '',
        style: {
          zIndex: 10,
        },
      });

      // Add subgenre nodes with improved circular layout
      familySubgenres.forEach((subgenre, subIndex) => {
        const subgenreCount = familySubgenres.length;
        const angle = (subIndex / subgenreCount) * 2 * Math.PI - Math.PI / 2; // Start from top
        const radius = Math.max(160, 120 + subgenreCount * 8); // Dynamic radius based on count
        
        // Calculate position with some randomness for organic feel
        const jitter = (Math.random() - 0.5) * 20;
        const x = familyX + Math.cos(angle) * radius + jitter;
        const y = familyY + Math.sin(angle) * radius + jitter * 0.5;

        newNodes.push({
          id: subgenre.id,
          type: 'genreNode',
          position: { x, y },
          data: {
            label: subgenre.name,
            type: 'subgenre',
            count: 0, // Could fetch artist count here
          },
          className: selectedNodes.has(subgenre.id) 
            ? 'ring-2 ring-accent/60 ring-offset-1 ring-offset-background' 
            : '',
          style: {
            zIndex: 5,
          },
        });

        // Enhanced edge styling with gradients and animations
        newEdges.push({
          id: `${family.id}-${subgenre.id}`,
          source: family.id,
          target: subgenre.id,
          type: 'smoothstep',
          style: { 
            stroke: 'url(#familyGradient)',
            strokeWidth: 2,
          },
          className: 'animate-pulse',
          animated: true,
        });
      });
    });

    // Enhanced adjacency matrix edges with luxury styling
    Object.entries(adjacencyMatrix).forEach(([familyId1, connections]) => {
      Object.entries(connections).forEach(([familyId2, weight]) => {
        if (
          weight > 0 && 
          familyId1 !== familyId2 &&
          filteredFamilies.some(f => f.id === familyId1) &&
          filteredFamilies.some(f => f.id === familyId2)
        ) {
          newEdges.push({
            id: `adj-${familyId1}-${familyId2}`,
            source: familyId1,
            target: familyId2,
            type: 'straight',
            style: { 
              stroke: 'hsl(var(--accent))',
              strokeWidth: Math.max(2, weight * 4),
              strokeDasharray: '8,4',
              opacity: 0.7,
            },
            label: `${weight}`,
            labelStyle: { 
              fontSize: '11px', 
              fontWeight: '600',
              fill: 'hsl(var(--accent))',
              background: 'hsl(var(--background))',
              padding: '2px 6px',
              borderRadius: '4px',
              border: '1px solid hsl(var(--accent) / 0.3)',
            },
            animated: true,
          });
        }
      });
    });

    setNodes(newNodes);
    setEdges(newEdges);
  }, [genreFamilies, subgenres, adjacencyMatrix, searchTerm, selectedNodes]);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    generateNodes();
  }, [generateNodes]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const handleNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    const newSelectedNodes = new Set(selectedNodes);
    if (selectedNodes.has(node.id)) {
      newSelectedNodes.delete(node.id);
    } else {
      newSelectedNodes.add(node.id);
    }
    setSelectedNodes(newSelectedNodes);
  }, [selectedNodes]);

  const exportAsImage = () => {
    // This would implement image export functionality
    toast({
      title: "Export",
      description: "Mind map export functionality coming soon!",
    });
  };

  const generateLayout = () => {
    // Implement automatic layout generation
    toast({
      title: "Layout",
      description: "Auto-layout generation coming soon!",
    });
  };

  if (loading) {
    return (
      <div className="h-[600px] flex items-center justify-center">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Loading mind map...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[700px] w-full relative overflow-hidden rounded-2xl border border-border/50 shadow-2xl">
      {/* Luxury background with gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background/95 to-muted/20" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,hsl(var(--primary)/0.1),transparent_70%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,hsl(var(--accent)/0.08),transparent_70%)]" />
      
      {/* Gradient definitions for edges */}
      <svg className="absolute inset-0 pointer-events-none" width="0" height="0">
        <defs>
          <linearGradient id="familyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{stopColor: 'hsl(var(--primary))', stopOpacity: 0.8}} />
            <stop offset="100%" style={{stopColor: 'hsl(var(--accent))', stopOpacity: 0.6}} />
          </linearGradient>
        </defs>
      </svg>
      
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.15, maxZoom: 1.2 }}
        className="relative z-10"
        minZoom={0.3}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
      >
        {/* Luxury background pattern */}
        <Background 
          gap={20} 
          size={1.2}
          color="hsl(var(--muted-foreground) / 0.15)"
        />
        
        {/* Enhanced controls */}
        <Controls 
          className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-xl shadow-lg"
          showInteractive={false}
        />
        
        {/* Luxury minimap */}
        <MiniMap 
          nodeColor={(node) => {
            const data = node.data;
            return data.type === 'family' 
              ? 'hsl(var(--primary))' 
              : 'hsl(var(--muted-foreground) / 0.6)';
          }}
          className="bg-card/90 backdrop-blur-sm border border-border/50 rounded-xl shadow-lg overflow-hidden"
          maskColor="hsl(var(--background) / 0.8)"
        />
        
        {/* Enhanced search and controls panel */}
        <Panel position="top-left" className="space-y-3">
          <Card className="bg-card/95 backdrop-blur-sm border-border/50 shadow-xl">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Search className="h-4 w-4 text-primary" />
                </div>
                <Input
                  placeholder="Search genres..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}  
                  className="flex-1 bg-background/50 border-border/50 focus:bg-background transition-colors"
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={generateLayout}
                  className="bg-background/50 backdrop-blur-sm hover:bg-primary/10 hover:text-primary hover:border-primary/50 transition-all duration-300"
                >
                  <Zap className="h-4 w-4 mr-1" />
                  Auto Layout
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={exportAsImage}
                  className="bg-background/50 backdrop-blur-sm hover:bg-accent/10 hover:text-accent hover:border-accent/50 transition-all duration-300"
                >
                  <Download className="h-4 w-4 mr-1" />
                  Export
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={fetchData}
                  className="bg-background/50 backdrop-blur-sm hover:bg-muted hover:text-muted-foreground transition-all duration-300"
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Refresh
                </Button>
              </div>
            </CardContent>
          </Card>
        </Panel>
        
        {/* Enhanced info panel */}
        <Panel position="bottom-left">
          <Card className="bg-card/95 backdrop-blur-sm border-border/50 shadow-xl">
            <CardContent className="p-4">
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gradient-to-r from-primary to-primary/80 shadow-lg" />
                  <span className="text-muted-foreground">Genre Families</span>
                  <Badge variant="secondary" className="ml-auto">
                    {genreFamilies.length}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-muted-foreground/60 shadow-lg" />
                  <span className="text-muted-foreground">Subgenres</span>
                  <Badge variant="secondary" className="ml-auto">
                    {subgenres.length}
                  </Badge>
                </div>
                {Object.keys(adjacencyMatrix).length > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-1 bg-accent rounded-full shadow-lg" style={{clipPath: 'polygon(0 0, 80% 0, 100% 100%, 20% 100%)'}} />
                    <span className="text-muted-foreground">Compatibility Links</span>
                    <Badge variant="secondary" className="ml-auto">
                      {Object.keys(adjacencyMatrix).length}
                    </Badge>
                  </div>
                )}
                {selectedNodes.size > 0 && (
                  <div className="flex items-center gap-2 pt-1 border-t border-border/50">
                    <div className="w-3 h-3 rounded border-2 border-primary animate-pulse" />
                    <span className="text-muted-foreground">Selected</span>
                    <Badge variant="default" className="ml-auto bg-primary text-primary-foreground">
                      {selectedNodes.size}
                    </Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </Panel>
      </ReactFlow>
    </div>
  );
};