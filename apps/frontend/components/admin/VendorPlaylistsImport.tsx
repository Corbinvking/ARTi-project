"use client"

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/auth";
import { Upload, Download, Check, AlertCircle, Loader2, Music, RefreshCw, Trash2, ArrowRightLeft, Search, Link, SkipForward } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import Papa from "papaparse";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface ParsedPlaylist {
  vendorName: string;
  playlistName: string;
  genres: string[];
  // Spotify enrichment fields
  spotify_id?: string | null;
  spotify_url?: string | null;
  matched_name?: string | null;
  followers?: number | null;
  enriched?: boolean;
  alreadyCached?: boolean;
}

interface VendorMatch {
  csvVendorName: string;
  matchedVendor?: { id: string; name: string };
  playlists: ParsedPlaylist[];
}

interface EnrichmentStats {
  total: number;
  enriched: number;
  notFound: number;
  alreadyCached: number;
}

interface ImportSummary {
  imported: number;
  skipped: number;
  duplicates: number;
  errors: number;
}

// API URL for Spotify API calls
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.artistinfluence.com';

/**
 * Parse the Playlists column from the vendor CSV.
 * Format: '- Playlist Name | Genre1, Genre2, Genre3
 *         - Another Playlist | Genre1, Genre2
 */
function parsePlaylistsColumn(playlistsText: string, vendorName: string): ParsedPlaylist[] {
  if (!playlistsText || playlistsText.trim() === '') {
    return [];
  }

  const playlists: ParsedPlaylist[] = [];
  
  // Split by newlines and handle the format
  // The text may start with ' and each line starts with - 
  const lines = playlistsText
    .replace(/^'/, '') // Remove leading single quote
    .split(/\n/)
    .map(line => line.trim())
    .filter(line => line.startsWith('-') || line.startsWith('•'));

  for (const line of lines) {
    // Remove the leading - or •
    let cleanLine = line.replace(/^[-•]\s*/, '').trim();
    
    // Split by | to separate name and genres
    const parts = cleanLine.split('|');
    
    if (parts.length >= 1) {
      const playlistName = parts[0].trim();
      
      // Parse genres if present
      let genres: string[] = [];
      if (parts.length >= 2) {
        genres = parts[1]
          .split(',')
          .map(g => g.trim())
          .filter(g => g.length > 0);
      }
      
      if (playlistName.length > 0) {
        playlists.push({
          vendorName,
          playlistName,
          genres,
          enriched: false,
          alreadyCached: false
        });
      }
    }
  }

  return playlists;
}

export default function VendorPlaylistsImport() {
  const [isUploading, setIsUploading] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [createNewPlaylists, setCreateNewPlaylists] = useState(false);
  const [autoEnrich, setAutoEnrich] = useState(true);
  const [skipExisting, setSkipExisting] = useState(true);
  const [vendorMatches, setVendorMatches] = useState<VendorMatch[]>([]);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [importStatus, setImportStatus] = useState('');
  const [syncResult, setSyncResult] = useState<{ updated: number; created: number; unmatched: number } | null>(null);
  const [enrichmentStats, setEnrichmentStats] = useState<EnrichmentStats | null>(null);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch existing vendor playlists count
  const { data: existingCount, refetch: refetchCount } = useQuery({
    queryKey: ['vendor-playlists-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('vendor_playlists')
        .select('*', { count: 'exact', head: true });
      
      if (error) throw error;
      return count || 0;
    }
  });

  // Fetch existing cached playlist spotify_ids for skip-existing check
  const { data: existingSpotifyIds, refetch: refetchExisting } = useQuery({
    queryKey: ['vendor-playlists-spotify-ids'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendor_playlists')
        .select('spotify_id, playlist_name_normalized, vendor_id');
      
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch vendors for matching
  const { data: vendors } = useQuery({
    queryKey: ['vendors-for-playlist-import'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendors')
        .select('id, name');
      
      if (error) throw error;
      return data;
    }
  });

  // Find matching vendor (case-insensitive)
  const findMatchingVendor = (vendorName: string) => {
    if (!vendors) return undefined;
    
    const normalized = vendorName.toLowerCase().trim();
    return vendors.find(v => v.name.toLowerCase().trim() === normalized);
  };

  // Check if playlist is already cached
  const isPlaylistCached = (spotifyId: string | null | undefined, playlistName: string, vendorId: string): boolean => {
    if (!existingSpotifyIds) return false;
    
    // Check by spotify_id first (most reliable)
    if (spotifyId) {
      const found = existingSpotifyIds.some(
        (p: any) => p.spotify_id === spotifyId && p.vendor_id === vendorId
      );
      if (found) return true;
    }
    
    // Fallback to normalized name match
    const normalizedName = playlistName.toLowerCase().trim();
    return existingSpotifyIds.some(
      (p: any) => p.playlist_name_normalized === normalizedName && p.vendor_id === vendorId
    );
  };

  // Enrich playlists with Spotify API
  const enrichPlaylists = async (matches: VendorMatch[]): Promise<VendorMatch[]> => {
    setIsEnriching(true);
    setEnrichmentStats(null);
    
    // Collect all unique playlist names
    const allPlaylists: { name: string; vendorIndex: number; playlistIndex: number }[] = [];
    matches.forEach((m, vi) => {
      if (m.matchedVendor) {
        m.playlists.forEach((p, pi) => {
          allPlaylists.push({ name: p.playlistName, vendorIndex: vi, playlistIndex: pi });
        });
      }
    });
    
    setImportProgress({ current: 0, total: allPlaylists.length });
    setImportStatus('Enriching playlists with Spotify data...');
    
    let enrichedCount = 0;
    let notFoundCount = 0;
    let alreadyCachedCount = 0;
    
    // Process in batches of 10 to avoid overwhelming the API
    const BATCH_SIZE = 10;
    
    for (let i = 0; i < allPlaylists.length; i += BATCH_SIZE) {
      const batch = allPlaylists.slice(i, i + BATCH_SIZE);
      const names = batch.map(b => b.name);
      
      setImportProgress({ current: i, total: allPlaylists.length });
      setImportStatus(`Searching Spotify... (${i}/${allPlaylists.length})`);
      
      try {
        // Call bulk find endpoint
        const response = await fetch(`${API_URL}/api/spotify-web-api/bulk-find-playlists`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ names }),
        });
        
        if (!response.ok) {
          console.error('Bulk find failed:', await response.text());
          continue;
        }
        
        const data = await response.json();
        
        // Apply results to the matches
        data.results?.forEach((result: any, idx: number) => {
          const { vendorIndex, playlistIndex } = batch[idx];
          const playlist = matches[vendorIndex].playlists[playlistIndex];
          const vendorId = matches[vendorIndex].matchedVendor?.id || '';
          
          if (result.found && result.spotify_id) {
            playlist.spotify_id = result.spotify_id;
            playlist.spotify_url = result.spotify_url;
            playlist.matched_name = result.matched_name;
            playlist.followers = result.followers;
            playlist.enriched = true;
            enrichedCount++;
          } else {
            playlist.enriched = false;
            notFoundCount++;
          }
          
          // Check if already cached
          if (skipExisting && isPlaylistCached(playlist.spotify_id, playlist.playlistName, vendorId)) {
            playlist.alreadyCached = true;
            alreadyCachedCount++;
          }
        });
        
      } catch (error) {
        console.error('Error enriching batch:', error);
      }
      
      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    setImportProgress({ current: allPlaylists.length, total: allPlaylists.length });
    setImportStatus('Enrichment complete!');
    
    setEnrichmentStats({
      total: allPlaylists.length,
      enriched: enrichedCount,
      notFound: notFoundCount,
      alreadyCached: alreadyCachedCount
    });
    
    setIsEnriching(false);
    return matches;
  };

  // Handle CSV file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setVendorMatches([]);
    setEnrichmentStats(null);
    setImportSummary(null);

    try {
      const text = await file.text();
      const { data, errors } = Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim(),
      });

      if (errors.length > 0) {
        toast({
          title: "CSV Parsing Error",
          description: "Error parsing CSV file. Please check the format.",
          variant: "destructive",
        });
        setIsUploading(false);
        return;
      }

      const rows = data as any[];
      let matches: VendorMatch[] = [];

      for (const row of rows) {
        const vendorName = row['Name'] || '';
        const playlistsText = row['Playlists'] || '';
        
        if (!vendorName) continue;

        const parsedPlaylists = parsePlaylistsColumn(playlistsText, vendorName);
        const matchedVendor = findMatchingVendor(vendorName);

        matches.push({
          csvVendorName: vendorName,
          matchedVendor,
          playlists: parsedPlaylists
        });
      }

      // Refresh existing spotify_ids for skip-existing check
      await refetchExisting();

      // Auto-enrich if enabled
      if (autoEnrich) {
        matches = await enrichPlaylists(matches);
      }

      setVendorMatches(matches);
      
      const totalPlaylists = matches.reduce((sum, m) => sum + m.playlists.length, 0);
      const matchedVendors = matches.filter(m => m.matchedVendor).length;
      
      toast({
        title: "CSV Parsed Successfully",
        description: `Found ${totalPlaylists} playlists across ${matches.length} vendors (${matchedVendors} matched in database)`,
      });

    } catch (error) {
      toast({
        title: "File Upload Error",
        description: "Failed to process the uploaded file.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  };

  // Manual enrich button
  const handleManualEnrich = async () => {
    if (vendorMatches.length === 0) return;
    
    await refetchExisting();
    const enriched = await enrichPlaylists([...vendorMatches]);
    setVendorMatches(enriched);
    
    toast({
      title: "Enrichment Complete",
      description: `Enriched ${enrichmentStats?.enriched || 0} playlists with Spotify data`,
    });
  };

  // Import playlists to database
  const handleImport = async () => {
    const matchedVendors = vendorMatches.filter(m => m.matchedVendor && m.playlists.length > 0);
    
    if (matchedVendors.length === 0) {
      toast({
        title: "No Playlists to Import",
        description: "No vendors with playlists could be matched to the database.",
        variant: "destructive",
      });
      return;
    }

    setIsImporting(true);
    setImportProgress({ current: 0, total: 0 });
    setImportSummary(null);

    try {
      // Step 1: Prepare playlists, deduplicated by spotify_id first, then by name
      const playlistMap = new Map<string, { 
        vendor_id: string; 
        playlist_name: string; 
        genres: string[];
        spotify_id: string | null;
        spotify_url: string | null;
        follower_count: number | null;
      }>();
      
      let skipCount = 0;
      let dupCount = 0;
      
      for (const m of matchedVendors) {
        for (const p of m.playlists) {
          // Skip already cached playlists
          if (skipExisting && p.alreadyCached) {
            skipCount++;
            continue;
          }
          
          // Create unique key: prefer spotify_id, fallback to normalized name per vendor
          let key: string;
          if (p.spotify_id) {
            key = `spotify:${p.spotify_id}:${m.matchedVendor!.id}`;
          } else {
            key = `name:${p.playlistName.toLowerCase().trim()}:${m.matchedVendor!.id}`;
          }
          
          // Only keep first occurrence (skip duplicates)
          if (!playlistMap.has(key)) {
            playlistMap.set(key, {
              vendor_id: m.matchedVendor!.id,
              playlist_name: p.matched_name || p.playlistName, // Use Spotify's name if available
              genres: p.genres,
              spotify_id: p.spotify_id || null,
              spotify_url: p.spotify_url || null,
              follower_count: p.followers || null,
            });
          } else {
            dupCount++;
          }
        }
      }
      
      const allPlaylists = Array.from(playlistMap.values());
      console.log(`Ready to import: ${allPlaylists.length} playlists (${skipCount} skipped, ${dupCount} duplicates)`);

      if (allPlaylists.length === 0) {
        toast({
          title: "Nothing to Import",
          description: "All playlists are already cached or filtered out.",
        });
        setIsImporting(false);
        setImportSummary({ imported: 0, skipped: skipCount, duplicates: dupCount, errors: 0 });
        return;
      }

      setImportProgress({ current: 0, total: allPlaylists.length });
      setImportStatus('Importing playlists...');

      // Step 2: Batch insert in chunks of 50
      const BATCH_SIZE = 50;
      let importedCount = 0;
      let errorCount = 0;

      for (let i = 0; i < allPlaylists.length; i += BATCH_SIZE) {
        const batch = allPlaylists.slice(i, i + BATCH_SIZE);
        
        setImportProgress({ current: i, total: allPlaylists.length });
        setImportStatus(`Importing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(allPlaylists.length / BATCH_SIZE)}...`);

        const { error } = await supabase
          .from('vendor_playlists')
          .upsert(batch, { 
            onConflict: 'vendor_id,playlist_name_normalized',
            ignoreDuplicates: false 
          });

        if (error) {
          console.error('Batch import error:', error);
          errorCount += batch.length;
        } else {
          importedCount += batch.length;
        }
      }

      setImportProgress({ current: allPlaylists.length, total: allPlaylists.length });
      setImportStatus(`Import complete! ${importedCount} playlists imported`);

      setImportSummary({
        imported: importedCount,
        skipped: skipCount,
        duplicates: dupCount,
        errors: errorCount
      });

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['vendor-playlists'] });
      queryClient.invalidateQueries({ queryKey: ['vendor-playlists-count'] });
      queryClient.invalidateQueries({ queryKey: ['vendor-playlists-spotify-ids'] });
      refetchCount();

      toast({
        title: "Import Successful",
        description: `Imported ${importedCount} playlists (${skipCount} skipped, ${errorCount} errors)`,
      });

      // Clear the parsed data after successful import
      setTimeout(() => {
        setVendorMatches([]);
        setImportProgress({ current: 0, total: 0 });
        setImportStatus('');
      }, 5000);

    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "An error occurred during import",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  // Clear all vendor playlists
  const handleClearAll = async () => {
    if (!confirm('Are you sure you want to delete ALL vendor playlists? This cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('vendor_playlists')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['vendor-playlists'] });
      queryClient.invalidateQueries({ queryKey: ['vendor-playlists-count'] });
      queryClient.invalidateQueries({ queryKey: ['vendor-playlists-spotify-ids'] });
      refetchCount();

      toast({
        title: "Cleared",
        description: "All vendor playlists have been deleted.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to clear vendor playlists.",
        variant: "destructive",
      });
    }
  };

  // Sync vendor_playlists cache to main playlists table
  const handleSync = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    setImportStatus('Starting sync...');
    
    try {
      // Step 1: Fetch all vendor_playlists
      const { data: vendorPlaylists, error: vpError } = await supabase
        .from('vendor_playlists')
        .select('*');
      
      if (vpError) throw vpError;
      if (!vendorPlaylists || vendorPlaylists.length === 0) {
        toast({
          title: "Nothing to Sync",
          description: "No vendor playlists in cache to sync.",
          variant: "destructive",
        });
        setIsSyncing(false);
        return;
      }

      setImportStatus(`Processing ${vendorPlaylists.length} cached playlists...`);
      setImportProgress({ current: 0, total: vendorPlaylists.length });

      let updatedCount = 0;
      let createdCount = 0;
      let unmatchedCount = 0;

      // Step 2: Process each vendor_playlist
      for (let i = 0; i < vendorPlaylists.length; i++) {
        const vp = vendorPlaylists[i];
        
        setImportProgress({ current: i + 1, total: vendorPlaylists.length });
        
        // Try to match by spotify_id first (most reliable)
        if (vp.spotify_id) {
          const { data: matchBySpotifyId, error: spotifyMatchError } = await supabase
            .from('playlists')
            .select('id')
            .eq('spotify_id', vp.spotify_id)
            .maybeSingle();
          
          if (!spotifyMatchError && matchBySpotifyId) {
            const { error: updateError } = await supabase
              .from('playlists')
              .update({
                genres: vp.genres,
                vendor_id: vp.vendor_id,
                follower_count: vp.follower_count,
              })
              .eq('id', matchBySpotifyId.id);
            
            if (!updateError) {
              updatedCount++;
              continue;
            }
          }
        }
        
        // Fallback: Try to find matching playlist by name
        const { data: matchingPlaylists, error: matchError } = await supabase
          .from('playlists')
          .select('id, name')
          .ilike('name', vp.playlist_name);
        
        if (matchError) {
          console.error('Error matching playlist:', matchError);
          continue;
        }

        if (matchingPlaylists && matchingPlaylists.length > 0) {
          // Update the first matching playlist
          const { error: updateError } = await supabase
            .from('playlists')
            .update({
              genres: vp.genres,
              vendor_id: vp.vendor_id,
              spotify_id: vp.spotify_id,
              follower_count: vp.follower_count,
            })
            .eq('id', matchingPlaylists[0].id);
          
          if (updateError) {
            console.error('Error updating playlist:', updateError);
          } else {
            updatedCount++;
          }
        } else if (createNewPlaylists && vp.spotify_url) {
          // Create new playlist if toggle is enabled and we have a URL
          const { error: insertError } = await supabase
            .from('playlists')
            .insert({
              name: vp.playlist_name,
              genres: vp.genres || [],
              vendor_id: vp.vendor_id,
              url: vp.spotify_url,
              spotify_id: vp.spotify_id,
              follower_count: vp.follower_count,
            });
          
          if (insertError) {
            console.error('Error creating playlist:', insertError);
          } else {
            createdCount++;
          }
        } else {
          unmatchedCount++;
        }
      }

      setSyncResult({ updated: updatedCount, created: createdCount, unmatched: unmatchedCount });
      setImportStatus(`Sync complete! Updated: ${updatedCount}, Created: ${createdCount}, Unmatched: ${unmatchedCount}`);

      // Invalidate playlist queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      queryClient.invalidateQueries({ queryKey: ['vendor-playlists'] });
      queryClient.invalidateQueries({ queryKey: ['all-playlists'] });

      toast({
        title: "Sync Complete",
        description: `Updated ${updatedCount} playlists${createdCount > 0 ? `, created ${createdCount} new` : ''}${unmatchedCount > 0 ? `, ${unmatchedCount} unmatched` : ''}`,
      });

    } catch (error) {
      console.error('Sync error:', error);
      toast({
        title: "Sync Failed",
        description: error instanceof Error ? error.message : "An error occurred during sync",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
      setImportProgress({ current: 0, total: 0 });
    }
  };

  const totalParsedPlaylists = vendorMatches.reduce((sum, m) => sum + m.playlists.length, 0);
  const matchedVendorCount = vendorMatches.filter(m => m.matchedVendor).length;
  const unmatchedVendorCount = vendorMatches.filter(m => !m.matchedVendor && m.playlists.length > 0).length;
  const newPlaylistsCount = vendorMatches.reduce((sum, m) => 
    sum + m.playlists.filter(p => !p.alreadyCached).length, 0
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Music className="h-5 w-5" />
          Vendor Playlists Cache
        </CardTitle>
        <CardDescription>
          Import vendor playlist ownership data from CSV for auto-matching during campaign imports and scraping.
          Playlists are enriched with Spotify data for reliable matching.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Status */}
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-full">
              <Music className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="font-medium">Cached Playlists</div>
              <div className="text-sm text-muted-foreground">
                {existingCount !== undefined ? `${existingCount} playlists in cache` : 'Loading...'}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { refetchCount(); refetchExisting(); }}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
            {existingCount && existingCount > 0 && (
              <Button variant="destructive" size="sm" onClick={handleClearAll}>
                <Trash2 className="h-4 w-4 mr-1" />
                Clear All
              </Button>
            )}
          </div>
        </div>

        {/* Sync to Playlists Table */}
        {existingCount && existingCount > 0 && (
          <div className="space-y-4 p-4 border rounded-lg bg-blue-50/50 dark:bg-blue-950/20">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium flex items-center gap-2">
                  <ArrowRightLeft className="h-4 w-4" />
                  Sync to Main Playlists Table
                </h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Update the main playlists table with genres, vendor assignments, and Spotify data from the cache.
                </p>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  id="create-new"
                  checked={createNewPlaylists}
                  onCheckedChange={setCreateNewPlaylists}
                />
                <Label htmlFor="create-new" className="text-sm cursor-pointer">
                  Create new playlists for unmatched entries (requires Spotify URL)
                </Label>
              </div>
              <Button 
                onClick={handleSync} 
                disabled={isSyncing || existingCount === 0}
                variant="default"
              >
                {isSyncing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <ArrowRightLeft className="h-4 w-4 mr-2" />
                    Sync {existingCount} Playlists
                  </>
                )}
              </Button>
            </div>

            {/* Sync Progress */}
            {isSyncing && importProgress.total > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{importStatus}</span>
                  <span>{importProgress.current} / {importProgress.total}</span>
                </div>
                <Progress value={(importProgress.current / importProgress.total) * 100} />
              </div>
            )}

            {/* Sync Result */}
            {syncResult && !isSyncing && (
              <Alert>
                <Check className="h-4 w-4" />
                <AlertTitle>Sync Complete</AlertTitle>
                <AlertDescription className="flex items-center gap-3 mt-2">
                  <Badge variant="default">{syncResult.updated} updated</Badge>
                  {syncResult.created > 0 && <Badge variant="secondary">{syncResult.created} created</Badge>}
                  {syncResult.unmatched > 0 && <Badge variant="outline">{syncResult.unmatched} unmatched</Badge>}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Import Options */}
        <div className="flex items-center gap-6 p-3 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-2">
            <Switch
              id="auto-enrich"
              checked={autoEnrich}
              onCheckedChange={setAutoEnrich}
            />
            <Label htmlFor="auto-enrich" className="text-sm cursor-pointer flex items-center gap-1">
              <Search className="h-3 w-3" />
              Auto-enrich with Spotify
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="skip-existing"
              checked={skipExisting}
              onCheckedChange={setSkipExisting}
            />
            <Label htmlFor="skip-existing" className="text-sm cursor-pointer flex items-center gap-1">
              <SkipForward className="h-3 w-3" />
              Skip already cached
            </Label>
          </div>
        </div>

        {/* Upload Section */}
        <div className="space-y-4">
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
            <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
            <Label htmlFor="vendor-csv-upload" className="cursor-pointer">
              <span className="text-lg font-medium">Upload Vendor CSV</span>
              <p className="text-sm text-muted-foreground mt-1">
                Select the Vendors-Active Spotify Vendors.csv file
              </p>
            </Label>
            <Input
              id="vendor-csv-upload"
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              disabled={isUploading || isImporting || isEnriching}
              className="hidden"
            />
            {(isUploading || isEnriching) && (
              <div className="flex items-center justify-center gap-2 mt-3 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {isEnriching ? 'Enriching with Spotify API...' : 'Parsing CSV...'}
              </div>
            )}
          </div>
        </div>

        {/* Enrichment Progress */}
        {isEnriching && importProgress.total > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{importStatus}</span>
              <span>{importProgress.current} / {importProgress.total}</span>
            </div>
            <Progress value={(importProgress.current / importProgress.total) * 100} />
          </div>
        )}

        {/* Enrichment Stats */}
        {enrichmentStats && !isEnriching && (
          <Alert>
            <Link className="h-4 w-4" />
            <AlertTitle>Spotify Enrichment Complete</AlertTitle>
            <AlertDescription className="flex items-center gap-3 mt-2 flex-wrap">
              <Badge variant="default" className="gap-1">
                <Check className="h-3 w-3" />
                {enrichmentStats.enriched} found
              </Badge>
              {enrichmentStats.notFound > 0 && (
                <Badge variant="outline">{enrichmentStats.notFound} not found</Badge>
              )}
              {enrichmentStats.alreadyCached > 0 && (
                <Badge variant="secondary" className="gap-1">
                  <SkipForward className="h-3 w-3" />
                  {enrichmentStats.alreadyCached} already cached
                </Badge>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Parsed Results */}
        {vendorMatches.length > 0 && (
          <div className="space-y-4">
            {/* Summary */}
            <Alert>
              <Music className="h-4 w-4" />
              <AlertTitle>CSV Parsed</AlertTitle>
              <AlertDescription className="flex items-center gap-4 mt-2 flex-wrap">
                <Badge variant="default">{totalParsedPlaylists} playlists</Badge>
                <Badge variant="secondary">{matchedVendorCount} vendors matched</Badge>
                {unmatchedVendorCount > 0 && (
                  <Badge variant="destructive">{unmatchedVendorCount} vendors not in database</Badge>
                )}
                {skipExisting && (
                  <Badge variant="outline" className="gap-1">
                    <Check className="h-3 w-3" />
                    {newPlaylistsCount} new to import
                  </Badge>
                )}
              </AlertDescription>
            </Alert>

            {/* Manual Enrich Button */}
            {!autoEnrich && (
              <Button
                variant="outline"
                onClick={handleManualEnrich}
                disabled={isEnriching}
                className="w-full"
              >
                {isEnriching ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enriching...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Enrich with Spotify API
                  </>
                )}
              </Button>
            )}

            {/* Vendor Preview Table */}
            <div className="rounded-lg border max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background">
                  <TableRow>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Playlists</TableHead>
                    <TableHead className="text-right">Enriched</TableHead>
                    <TableHead className="text-right">New</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendorMatches.map((match, idx) => {
                    const enrichedCount = match.playlists.filter(p => p.enriched).length;
                    const newCount = match.playlists.filter(p => !p.alreadyCached).length;
                    
                    return (
                      <TableRow key={idx} className={!match.matchedVendor ? 'opacity-50' : ''}>
                        <TableCell className="font-medium">{match.csvVendorName}</TableCell>
                        <TableCell>
                          {match.matchedVendor ? (
                            <Badge variant="default" className="gap-1">
                              <Check className="h-3 w-3" />
                              Matched
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="gap-1">
                              <AlertCircle className="h-3 w-3" />
                              Not Found
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">{match.playlists.length}</TableCell>
                        <TableCell className="text-right">
                          {enrichedCount > 0 ? (
                            <span className="text-green-600">{enrichedCount}</span>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {newCount > 0 ? (
                            <span className="text-blue-600">{newCount}</span>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Import Progress */}
            {isImporting && importProgress.total > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{importStatus}</span>
                  <span>{importProgress.current} / {importProgress.total}</span>
                </div>
                <Progress value={(importProgress.current / importProgress.total) * 100} />
              </div>
            )}

            {/* Import Summary */}
            {importSummary && !isImporting && (
              <Alert>
                <Check className="h-4 w-4" />
                <AlertTitle>Import Complete</AlertTitle>
                <AlertDescription className="flex items-center gap-3 mt-2 flex-wrap">
                  <Badge variant="default">{importSummary.imported} imported</Badge>
                  {importSummary.skipped > 0 && (
                    <Badge variant="secondary">{importSummary.skipped} skipped (cached)</Badge>
                  )}
                  {importSummary.duplicates > 0 && (
                    <Badge variant="outline">{importSummary.duplicates} duplicates</Badge>
                  )}
                  {importSummary.errors > 0 && (
                    <Badge variant="destructive">{importSummary.errors} errors</Badge>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* Import Button */}
            <Button 
              onClick={handleImport} 
              disabled={isImporting || matchedVendorCount === 0 || isEnriching}
              className="w-full"
            >
              {isImporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Import {skipExisting ? newPlaylistsCount : totalParsedPlaylists} Playlists from {matchedVendorCount} Vendors
                </>
              )}
            </Button>
          </div>
        )}

        {/* Instructions */}
        <div className="text-xs text-muted-foreground space-y-1 bg-muted/30 p-3 rounded-lg">
          <p><strong>Expected CSV Format:</strong></p>
          <ul className="list-disc list-inside space-y-0.5 ml-2">
            <li><code>Name</code> column: Vendor name (must match vendors in database)</li>
            <li><code>Playlists</code> column: One playlist per line, format: <code>- Playlist Name | Genre1, Genre2</code></li>
          </ul>
          <p className="mt-2">
            <strong>Features:</strong>
          </p>
          <ul className="list-disc list-inside space-y-0.5 ml-2">
            <li>Auto-enriches playlists with Spotify IDs and URLs via API search</li>
            <li>Deduplicates by Spotify ID (most reliable) or normalized name</li>
            <li>Skips already-cached playlists to avoid duplicates</li>
            <li>Syncs to main playlists table for campaign matching</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
