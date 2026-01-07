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
import { Upload, Download, Check, AlertCircle, Loader2, Music, Users, RefreshCw, Trash2 } from "lucide-react";
import Papa from "papaparse";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface ParsedPlaylist {
  vendorName: string;
  playlistName: string;
  genres: string[];
}

interface VendorMatch {
  csvVendorName: string;
  matchedVendor?: { id: string; name: string };
  playlists: ParsedPlaylist[];
}

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
          genres
        });
      }
    }
  }

  return playlists;
}

export default function VendorPlaylistsImport() {
  const [isUploading, setIsUploading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [vendorMatches, setVendorMatches] = useState<VendorMatch[]>([]);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [importStatus, setImportStatus] = useState('');
  
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

  // Handle CSV file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setVendorMatches([]);

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
      const matches: VendorMatch[] = [];

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

    try {
      // Step 1: Delete existing playlists for vendors being imported
      setImportStatus('Clearing existing vendor playlists...');
      const vendorIds = matchedVendors.map(m => m.matchedVendor!.id);
      
      for (const vendorId of vendorIds) {
        await supabase
          .from('vendor_playlists')
          .delete()
          .eq('vendor_id', vendorId);
      }

      // Step 2: Prepare all playlists for import (deduplicated by vendor + normalized name)
      const playlistMap = new Map<string, { vendor_id: string; playlist_name: string; genres: string[] }>();
      
      for (const m of matchedVendors) {
        for (const p of m.playlists) {
          // Create unique key from vendor_id + normalized playlist name
          const key = `${m.matchedVendor!.id}|${p.playlistName.toLowerCase().trim()}`;
          
          // Only keep first occurrence (skip duplicates)
          if (!playlistMap.has(key)) {
            playlistMap.set(key, {
              vendor_id: m.matchedVendor!.id,
              playlist_name: p.playlistName,
              genres: p.genres
            });
          }
        }
      }
      
      const allPlaylists = Array.from(playlistMap.values());
      console.log(`Deduplicated: ${playlistMap.size} unique playlists from ${matchedVendors.reduce((sum, m) => sum + m.playlists.length, 0)} total`);

      setImportProgress({ current: 0, total: allPlaylists.length });
      setImportStatus('Importing playlists...');

      // Step 3: Batch insert in chunks of 50
      const BATCH_SIZE = 50;
      let importedCount = 0;
      let errorCount = 0;

      for (let i = 0; i < allPlaylists.length; i += BATCH_SIZE) {
        const batch = allPlaylists.slice(i, i + BATCH_SIZE);
        
        setImportProgress({ current: i, total: allPlaylists.length });
        setImportStatus(`Importing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(allPlaylists.length / BATCH_SIZE)}...`);

        const { error } = await supabase
          .from('vendor_playlists')
          .insert(batch);

        if (error) {
          console.error('Batch import error:', error);
          errorCount += batch.length;
        } else {
          importedCount += batch.length;
        }
      }

      setImportProgress({ current: allPlaylists.length, total: allPlaylists.length });
      setImportStatus(`Import complete! ${importedCount} playlists imported${errorCount > 0 ? `, ${errorCount} errors` : ''}`);

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['vendor-playlists'] });
      queryClient.invalidateQueries({ queryKey: ['vendor-playlists-count'] });
      refetchCount();

      toast({
        title: "Import Successful",
        description: `Imported ${importedCount} playlists${errorCount > 0 ? ` (${errorCount} errors)` : ''}`,
      });

      // Clear the parsed data after successful import
      setTimeout(() => {
        setVendorMatches([]);
        setImportProgress({ current: 0, total: 0 });
        setImportStatus('');
      }, 3000);

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

  const totalParsedPlaylists = vendorMatches.reduce((sum, m) => sum + m.playlists.length, 0);
  const matchedVendorCount = vendorMatches.filter(m => m.matchedVendor).length;
  const unmatchedVendorCount = vendorMatches.filter(m => !m.matchedVendor && m.playlists.length > 0).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Music className="h-5 w-5" />
          Vendor Playlists Cache
        </CardTitle>
        <CardDescription>
          Import vendor playlist ownership data from CSV for auto-matching during campaign imports and scraping.
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
                {existingCount !== undefined ? `${existingCount} playlists in database` : 'Loading...'}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetchCount()}>
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
              disabled={isUploading || isImporting}
              className="hidden"
            />
            {isUploading && (
              <div className="flex items-center justify-center gap-2 mt-3 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Parsing CSV...
              </div>
            )}
          </div>
        </div>

        {/* Parsed Results */}
        {vendorMatches.length > 0 && (
          <div className="space-y-4">
            {/* Summary */}
            <Alert>
              <Music className="h-4 w-4" />
              <AlertTitle>CSV Parsed</AlertTitle>
              <AlertDescription className="flex items-center gap-4 mt-2">
                <Badge variant="default">{totalParsedPlaylists} playlists</Badge>
                <Badge variant="secondary">{matchedVendorCount} vendors matched</Badge>
                {unmatchedVendorCount > 0 && (
                  <Badge variant="destructive">{unmatchedVendorCount} vendors not in database</Badge>
                )}
              </AlertDescription>
            </Alert>

            {/* Vendor Preview Table */}
            <div className="rounded-lg border max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background">
                  <TableRow>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Playlists</TableHead>
                    <TableHead>Sample Genres</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendorMatches.map((match, idx) => (
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
                      <TableCell className="max-w-[200px] truncate text-muted-foreground text-xs">
                        {match.playlists[0]?.genres.slice(0, 3).join(', ') || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Import Progress */}
            {isImporting && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{importStatus}</span>
                  <span>{importProgress.current} / {importProgress.total}</span>
                </div>
                <Progress value={(importProgress.current / importProgress.total) * 100} />
              </div>
            )}

            {/* Import Button */}
            <Button 
              onClick={handleImport} 
              disabled={isImporting || matchedVendorCount === 0}
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
                  Import {totalParsedPlaylists} Playlists from {matchedVendorCount} Vendors
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
            <strong>Note:</strong> Vendors must exist in the database first. Unmatched vendors will be skipped.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

