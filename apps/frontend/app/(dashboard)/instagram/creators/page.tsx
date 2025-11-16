"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Plus, Upload, Download } from "lucide-react";
import { supabase } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";

export default function InstagramCreatorsPage() {
  const [searchQuery, setSearchQuery] = useState("");

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
  
  console.log('🎨 Instagram Creators Page: Rendering with', creators.length, 'creators');

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
                    <TableRow key={creator.id}>
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
    </div>
  );
}

