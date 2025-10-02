"use client"

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useToast } from "../hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../integrations/supabase/client";
import { APP_CAMPAIGN_SOURCE, APP_CAMPAIGN_TYPE } from "../lib/constants";
import { Upload } from "lucide-react";
import Papa from "papaparse";

interface CampaignWeeklyImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CampaignWeeklyImportModal({ 
  open, 
  onOpenChange 
}: CampaignWeeklyImportModalProps) {
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [importStatus, setImportStatus] = useState<string>('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleCampaignImport = async (file: File) => {
    setIsImporting(true);
    setImportStatus('Reading CSV file...');
    setImportProgress({ current: 0, total: 0 });
    
    try {
      const text = await file.text();
      console.log('Raw CSV text:', text); // Debug log
      
      // Parse CSV with proper options
      const { data, errors } = Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim(), // Remove spaces from headers
      });
      
      if (errors.length > 0) {
        console.error('CSV parsing errors:', errors);
        toast({
          title: "CSV Parsing Error",
          description: "Error parsing CSV file. Check console for details.",
          variant: "destructive",
        });
        return;
      }
      
      console.log('Parsed data:', data); // Debug log
      
      const rows = data as any[];
      setImportProgress({ current: 0, total: rows.length });
      setImportStatus(`Processing ${rows.length} campaigns...`);
      
      let updatedCount = 0;
      let createdCount = 0;
      let processedCount = 0;
      
      for (const row of rows) {
        // Clean up field names (handle variations in CSV headers)
        const campaignName = row['Campaign Name'] || row['campaign_name'] || row['Campaign'];
        const clientName = row['Client'] || row['client'] || row['Artist'];
        
        // More robust number parsing with validation
        const parseNumber = (value: any): number => {
          if (!value) return 0;
          const str = String(value).replace(/[,\s]/g, ''); // Remove commas and spaces
          const num = parseInt(str) || 0;
          return isNaN(num) ? 0 : num;
        };
        
        const streamGoal = parseNumber(row['Stream Goal'] || row['stream_goal'] || row['Goal']);
        const remainingStreams = parseNumber(row['Remaining Streams'] || row['remaining_streams'] || row['Remaining']);
        const dailyStreams = parseNumber(row['Daily Streams'] || row['daily_streams'] || row['Daily']);
        const weeklyStreams = parseNumber(row['Weekly Streams'] || row['weekly_streams'] || row['Weekly']);
        const trackUrl = row['Track URL'] || row['track_url'] || row['URL'] || '';
        const startDateRaw = row['Start Date'] || row['start_date'] || '';
        
        console.log('Processing row:', {
          campaignName,
          clientName,
          streamGoal,
          remainingStreams,
          dailyStreams,
          weeklyStreams,
          trackUrl
        });
        
        if (!campaignName || !clientName) {
          console.log('Skipping row - missing campaign name or client:', row);
          processedCount++;
          setImportProgress({ current: processedCount, total: rows.length });
          continue;
        }
        
        // Parse playlist data from various potential playlist columns
        let parsedPlaylists: string[] = [];
        const playlistColumns = Object.keys(row).filter(key => 
          key.toLowerCase().includes('playlist') || 
          key.toLowerCase().includes('placed') ||
          key.toLowerCase().includes('adds')
        );
        
        for (const column of playlistColumns) {
          const playlistData = row[column];
          if (playlistData && typeof playlistData === 'string') {
            // Parse format: "PLAYLIST NAME - PLAYLIST NAME - PLAYLIST NAME [NEW] -"
            const playlists = playlistData
              .split(' - ')
              .map(name => name.trim())
              .filter(name => name && name !== '')
              .map(name => name.replace(/\[NEW\]/gi, '').trim()) // Remove [NEW] tags
              .filter(name => name);
            
            parsedPlaylists = [...parsedPlaylists, ...playlists];
          }
        }
        
        // Remove duplicates and get existing playlists from database
        parsedPlaylists = [...new Set(parsedPlaylists)];
        
        // Fetch matching playlists from database with fuzzy matching
        let matchedPlaylists: any[] = [];
        if (parsedPlaylists.length > 0) {
          console.log('Searching for playlists:', parsedPlaylists);
          
          // First try exact match
          const { data: exactMatches } = await supabase
            .from('playlists')
            .select('id, name, vendor_id, vendors(name)')
            .in('name', parsedPlaylists);
          
          if (exactMatches) {
            matchedPlaylists = exactMatches.map(playlist => ({
              id: playlist.id,
              name: playlist.name,
              vendor_name: playlist.vendors?.name || 'Unknown',
              imported: true
            }));
          }
          
          // For unmatched playlists, try fuzzy matching
          const exactMatchNames = new Set(exactMatches?.map(p => p.name) || []);
          const unmatchedPlaylists = parsedPlaylists.filter(name => !exactMatchNames.has(name));
          
          if (unmatchedPlaylists.length > 0) {
            console.log('Trying fuzzy search for:', unmatchedPlaylists);
            
            // Get all playlists for fuzzy matching
            const { data: allPlaylists } = await supabase
              .from('playlists')
              .select('id, name, vendor_id, vendors(name)');
            
            if (allPlaylists) {
              for (const searchName of unmatchedPlaylists) {
                const fuzzyMatch = allPlaylists.find(playlist => {
                  const playlistName = playlist.name.toLowerCase();
                  const searchLower = searchName.toLowerCase();
                  
                  // Check if search name is contained in playlist name or vice versa
                  return playlistName.includes(searchLower) || 
                         searchLower.includes(playlistName) ||
                         // Check for partial word matches
                         playlistName.split(' ').some(word => 
                           searchLower.includes(word) && word.length > 3
                         );
                });
                
                if (fuzzyMatch && !matchedPlaylists.find(m => m.id === fuzzyMatch.id)) {
                  console.log(`Fuzzy matched "${searchName}" to "${fuzzyMatch.name}"`);
                  matchedPlaylists.push({
                    id: fuzzyMatch.id,
                    name: fuzzyMatch.name,
                    vendor_name: fuzzyMatch.vendors?.name || 'Unknown',
                    imported: true
                  });
                }
              }
            }
          }
          
          console.log('Final matched playlists:', matchedPlaylists);
        }
        
        // Find existing campaign by name and client (only in campaign_manager source with spotify type)
        const { data: existingCampaign } = await supabase
          .from('campaigns')
          .select('*')
          .eq('name', campaignName.trim())
          .eq('client', clientName.trim())
          .eq('source', APP_CAMPAIGN_SOURCE)
          .eq('campaign_type', APP_CAMPAIGN_TYPE)
          .maybeSingle();
        
        if (existingCampaign) {
          // Compare playlists and track additions
          const existingPlaylists = Array.isArray(existingCampaign.selected_playlists) 
            ? existingCampaign.selected_playlists 
            : [];
          const existingPlaylistNames = existingPlaylists.map((p: any) => 
            typeof p === 'string' ? p : p.name
          );
          
          const newPlaylists = parsedPlaylists.filter(name => 
            !existingPlaylistNames.includes(name)
          );
          
          let updateNotes = `Updated via CSV import - Daily: ${dailyStreams || 0}, Weekly: ${weeklyStreams || 0}`;
          if (newPlaylists.length > 0) {
            updateNotes += ` | New playlists added: ${newPlaylists.join(', ')}`;
          }
          
          // Fetch and update genres if track URL provided
          let updatedGenres = existingCampaign.sub_genres || [];
          let updatedSubGenre = existingCampaign.sub_genre || '';
          
          if (trackUrl && trackUrl !== existingCampaign.track_url) {
            try {
              console.log('Fetching updated genres for track:', trackUrl);
              const { data: spotifyData, error: spotifyError } = await supabase.functions.invoke('spotify-fetch', {
                body: { trackUrl: trackUrl.trim() }
              });
              
              if (!spotifyError && spotifyData?.genres?.length > 0) {
                updatedGenres = spotifyData.genres.slice(0, 3);
                updatedSubGenre = spotifyData.genres[0] || '';
                console.log('Updated genres from Spotify:', updatedGenres);
              }
            } catch (error) {
              console.warn('Failed to fetch updated genres:', error);
            }
          }

          // Update existing campaign with explicit null handling
          const updateData = {
            stream_goal: streamGoal > 0 ? streamGoal : existingCampaign.stream_goal,
            remaining_streams: remainingStreams > 0 ? remainingStreams : existingCampaign.remaining_streams,
            track_url: trackUrl || existingCampaign.track_url,
            sub_genre: updatedSubGenre,
            sub_genres: updatedGenres,
            selected_playlists: matchedPlaylists.length > 0 ? matchedPlaylists : existingCampaign.selected_playlists,
            // Ensure we always set these values, even if 0
            daily_streams: dailyStreams,
            weekly_streams: weeklyStreams,
          };
          
          console.log('Updating campaign with data:', updateData);
          
          const { error: updateError } = await supabase
            .from('campaigns')
            .update(updateData)
            .eq('id', existingCampaign.id)
            .eq('source', APP_CAMPAIGN_SOURCE)
            .eq('campaign_type', APP_CAMPAIGN_TYPE);
          
          if (updateError) {
            console.error('Error updating campaign:', updateError);
            processedCount++;
            setImportProgress({ current: processedCount, total: rows.length });
            continue;
          }
          
          // Add weekly update entry if streams data provided
          if (dailyStreams || weeklyStreams) {
            await supabase
              .from('weekly_updates')
              .insert({
                campaign_id: existingCampaign.id,
                streams: weeklyStreams || dailyStreams * 7 || 0,
                imported_on: new Date().toISOString().split('T')[0],
                notes: updateNotes
              });
          }
          
          console.log('Updated campaign:', campaignName);
          updatedCount++;
        } else {
          // Create new campaign if doesn't exist
          let genres: string[] = [];
          let subGenre = '';
          
          // Fetch genres from Spotify API if track URL provided
          if (trackUrl) {
            try {
              console.log('Calling Spotify API for track:', trackUrl);
              const { data: spotifyData, error: spotifyError } = await supabase.functions.invoke('spotify-fetch', {
                body: { trackUrl: trackUrl.trim() }
              });
              
              console.log('Spotify API response:', { spotifyData, spotifyError });
              
              if (!spotifyError && spotifyData) {
                if (spotifyData.genres && spotifyData.genres.length > 0) {
                  genres = spotifyData.genres.slice(0, 3); // Top 3 genres
                  subGenre = genres[0] || '';
                  console.log('Extracted genres from Spotify:', genres);
                } else {
                  console.log('No genres returned from Spotify API');
                }
              } else {
                console.log('Spotify API error or no data:', spotifyError);
              }
            } catch (error) {
              console.warn('Failed to fetch genres from Spotify:', error);
            }
          }
          
          // Determine start date - use provided date or default to today
          const startDate = startDateRaw ? 
            new Date(startDateRaw).toISOString().split('T')[0] : 
            new Date().toISOString().split('T')[0];
          
          const { data: newCampaign, error: insertError } = await supabase
            .from('campaigns')
            .insert({
              name: campaignName.trim(),
              brand_name: campaignName.trim(),
              client: clientName.trim(),
              client_name: clientName.trim(),
              stream_goal: streamGoal || 0,
              remaining_streams: remainingStreams || streamGoal || 0,
              budget: 0, // Budget to be manually entered later
              status: 'active',
              track_url: trackUrl || '',
              sub_genre: subGenre,
              sub_genres: genres,
              start_date: startDate,
              duration_days: 90,
              selected_playlists: matchedPlaylists.length > 0 ? matchedPlaylists : [],
              vendor_allocations: {},
              totals: { projected_streams: 0 },
              daily_streams: dailyStreams || 0,
              weekly_streams: weeklyStreams || 0,
              source: APP_CAMPAIGN_SOURCE,
              campaign_type: APP_CAMPAIGN_TYPE, // Explicitly set to spotify
              created_at: startDate,
              updated_at: new Date().toISOString()
            })
            .select()
            .single();
          
          if (insertError) {
            console.error('Error creating campaign:', insertError);
            processedCount++;
            setImportProgress({ current: processedCount, total: rows.length });
            continue;
          }
          
          // Add initial weekly update if provided
          if (newCampaign && (dailyStreams || weeklyStreams)) {
            const importNotes = `Initial import - Daily: ${dailyStreams || 0}, Weekly: ${weeklyStreams || 0}`;
            const playlistNotes = parsedPlaylists.length > 0 ? ` | Playlists: ${parsedPlaylists.join(', ')}` : '';
            
            await supabase
              .from('weekly_updates')
              .insert({
                campaign_id: newCampaign.id,
                streams: weeklyStreams || dailyStreams * 7 || 0,
                imported_on: new Date().toISOString().split('T')[0],
                notes: importNotes + playlistNotes
              });
          }
          
          console.log('Created new campaign:', campaignName);
          createdCount++;
        }
        
        processedCount++;
        setImportProgress({ current: processedCount, total: rows.length });
        setImportStatus(`Processed ${processedCount}/${rows.length} campaigns...`);
      }
      
      // Show completion summary
      const summary = `Import complete! Created: ${createdCount}, Updated: ${updatedCount}, Total: ${processedCount}`;
      setImportStatus(summary);
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['weekly-updates'] });
      
      toast({
        title: "Import Complete",
        description: summary,
      });
      
      // Close modal after short delay
      setTimeout(() => {
        onOpenChange(false);
        setIsImporting(false);
        setImportProgress({ current: 0, total: 0 });
        setImportStatus('');
      }, 2000);
      
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "An error occurred during import",
        variant: "destructive",
      });
      setIsImporting(false);
      setImportStatus('Import failed');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    console.log('File selected:', file);
    if (!file) {
      console.log('No file selected');
      return;
    }
    
    console.log('Starting file import for:', file.name);
    await handleCampaignImport(file);
    event.target.value = ''; // Reset file input
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Campaign Updates</DialogTitle>
          <DialogDescription>
            Upload a CSV file to update existing campaigns or create new ones
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {isImporting ? (
            <div className="space-y-4">
              <div className="text-center">
                <div className="animate-spin h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-sm text-muted-foreground">{importStatus}</p>
                {importProgress.total > 0 && (
                  <div className="mt-2">
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {importProgress.current} of {importProgress.total} processed
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                <Input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  disabled={isImporting}
                  className="hidden"
                  id="csv-upload"
                />
                <Label htmlFor="csv-upload" className="cursor-pointer block space-y-3">
                  <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">
                      Click to upload CSV file
                    </p>
                    <p className="text-xs text-muted-foreground">
                      or drag and drop your file here
                    </p>
                  </div>
                </Label>
              </div>
              
              <div className="bg-muted/30 p-4 rounded-lg space-y-3">
                <p className="font-semibold text-sm">Required CSV Format:</p>
                <div className="bg-background p-3 rounded border text-xs font-mono">
                  <div className="text-foreground mb-1">
                    Campaign Name,Client,Goal,Remaining,Daily,Weekly,URL,Start Date,[Playlist columns]
                  </div>
                  <div className="text-muted-foreground">
                    "Jared Rapoza","Slime",20000,18000,200,1400,"https://open.spotify.com/track/...","2024-01-15","Playlist Name - Another Playlist [NEW] -"
                  </div>
                </div>
                <div className="space-y-2 text-xs text-muted-foreground">
                  <p>• <strong>Column Headers:</strong> Can use "Campaign Name" or "Campaign" or "campaign_name"</p>
                  <p>• <strong>Client Names:</strong> Can use "Client" or "client" or "Artist"</p>
                  <p>• <strong>Start Date:</strong> Campaign start date (YYYY-MM-DD format), defaults to today if not provided</p>
                  <p>• <strong>Budget:</strong> Will be set to $0 and must be manually entered later</p>
                  <p>• <strong>Genres:</strong> Automatically detected from Spotify track URL</p>
                  <p>• <strong>Playlists:</strong> Any column containing playlist data will be parsed automatically</p>
                  <p>• <strong>Updates:</strong> Existing campaigns updated by Campaign Name + Client match</p>
                  <p>• <strong>New campaigns:</strong> Created automatically with created date set to start date</p>
                  <p>• <strong>Debug:</strong> Check browser console for detailed import logs</p>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}








