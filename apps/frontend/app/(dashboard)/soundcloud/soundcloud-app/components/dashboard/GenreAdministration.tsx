"use client"

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '../../hooks/use-toast';
import { supabase } from '../../integrations/supabase/client';
import { motion } from 'framer-motion';
import { DraggableGenreManager } from '../admin/DraggableGenreManager';
import { GenreMindMap } from '../admin/GenreMindMap';
import { ArtistGenreBrowser } from '../admin/ArtistGenreBrowser';

import { GenreDistributionChart } from '../admin/GenreDistributionChart';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Music,
  Grip,
  Network,
  Users,
  BarChart3,
  TrendingUp,
  
  Search
} from 'lucide-react';

interface GenreFamily {
  id: string;
  name: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

interface Subgenre {
  id: string;
  name: string;
  family_id: string;
  patterns: string[];
  order_index: number;
  active: boolean;
  created_at: string;
  updated_at: string;
  family?: GenreFamily;
}

export const GenreAdministration = () => {
  const { toast } = useToast();
  const [families, setFamilies] = useState<GenreFamily[]>([]);
  const [subgenres, setSubgenres] = useState<Subgenre[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'drag-drop' | 'mind-map' | 'artist-browser' | 'analytics'>('drag-drop');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      const [familiesResult, subgenresResult] = await Promise.all([
        supabase.from('genre_families').select('*').order('name'),
        supabase.from('subgenres').select('*, genre_families(*)').order('family_id, order_index')
      ]);

      if (familiesResult.error) throw familiesResult.error;
      if (subgenresResult.error) throw subgenresResult.error;

      setFamilies(familiesResult.data || []);
      setSubgenres(subgenresResult.data?.map(sg => ({
        ...sg,
        family: sg.genre_families
      })) || []);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch genre data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGenreUpdate = () => {
    fetchAllData();
  };

  // Handler functions for DraggableGenreManager
  const handleGenreFamilyEdit = (family: GenreFamily) => {
    // The DraggableGenreManager handles this internally now
    console.log('Edit family:', family);
  };

  const handleSubgenreEdit = (subgenre: Subgenre) => {
    // The DraggableGenreManager handles this internally now
    console.log('Edit subgenre:', subgenre);
  };

  const handleGenreFamilyAdd = () => {
    // The DraggableGenreManager handles this internally now
    console.log('Add family');
  };

  const handleSubgenreAdd = (familyId: string) => {
    // The DraggableGenreManager handles this internally now
    console.log('Add subgenre for family:', familyId);
  };

  const handleGenreFamilyDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this genre family?')) return;
    
    try {
      const { error } = await supabase
        .from('genre_families')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Genre family deleted successfully",
      });
      
      fetchAllData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete genre family",
        variant: "destructive",
      });
    }
  };

  const handleSubgenreDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this subgenre?')) return;
    
    try {
      const { error } = await supabase
        .from('subgenres')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Subgenre deleted successfully",
      });
      
      fetchAllData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete subgenre",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-12 w-full max-w-md" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 space-y-6"
    >
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent flex items-center gap-3">
            <div className="bg-gradient-primary p-2 rounded-xl">
              <Music className="w-8 h-8 text-white" />
            </div>
            Interactive Genre Studio
          </h1>
          <p className="text-muted-foreground mt-2">
            Advanced drag-and-drop genre management, mind maps, and analytics
          </p>
        </div>
        <div className="flex items-center gap-3">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-2 bg-muted px-3 py-2 rounded-lg"
          >
            <TrendingUp className="w-4 h-4 text-green-500" />
            <span className="text-sm font-medium">
              {families.length} families, {subgenres.length} subgenres
            </span>
          </motion.div>
        </div>
      </motion.div>

      {/* Interactive Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-card shadow-card border border-border">
            <TabsTrigger value="drag-drop" className="flex items-center gap-2 data-[state=active]:bg-gradient-primary data-[state=active]:text-white">
              <Grip className="w-4 h-4" />
              Drag & Drop
            </TabsTrigger>
            <TabsTrigger value="mind-map" className="flex items-center gap-2 data-[state=active]:bg-gradient-primary data-[state=active]:text-white">
              <Network className="w-4 h-4" />
              Mind Map
            </TabsTrigger>
            <TabsTrigger value="artist-browser" className="flex items-center gap-2 data-[state=active]:bg-gradient-primary data-[state=active]:text-white">
              <Users className="w-4 h-4" />
              Artist Browser
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2 data-[state=active]:bg-gradient-primary data-[state=active]:text-white">
              <BarChart3 className="w-4 h-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          {/* Search Bar for relevant tabs */}
          {(activeTab === 'drag-drop' || activeTab === 'artist-browser') && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-4"
            >
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder={`Search ${activeTab === 'drag-drop' ? 'genres' : 'artists'}...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-card border-border shadow-card"
                />
              </div>
            </motion.div>
          )}

          {/* Tab Content */}
          <TabsContent value="drag-drop" className="space-y-0">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <DraggableGenreManager 
                onGenreFamilyEdit={handleGenreFamilyEdit}
                onSubgenreEdit={handleSubgenreEdit}
                onGenreFamilyDelete={handleGenreFamilyDelete}
                onSubgenreDelete={handleSubgenreDelete}
                onGenreFamilyAdd={handleGenreFamilyAdd}
                onSubgenreAdd={handleSubgenreAdd}
              />
            </motion.div>
          </TabsContent>

          <TabsContent value="mind-map" className="space-y-0">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <GenreMindMap />
            </motion.div>
          </TabsContent>

          <TabsContent value="artist-browser" className="space-y-0">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <ArtistGenreBrowser />
            </motion.div>
          </TabsContent>


          <TabsContent value="analytics" className="space-y-0">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <GenreDistributionChart />
            </motion.div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  );
};