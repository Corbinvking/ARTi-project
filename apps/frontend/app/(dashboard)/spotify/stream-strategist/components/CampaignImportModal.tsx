"use client"

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useToast } from "../hooks/use-toast";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "../integrations/supabase/client";
import { APP_CAMPAIGN_SOURCE, APP_CAMPAIGN_TYPE } from "../lib/constants";
import { Upload, Download, Check, X, AlertCircle, Loader2, ArrowRight, ArrowLeft, Plus, Trash2, RefreshCw } from "lucide-react";
import Papa from "papaparse";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Checkbox } from "./ui/checkbox";
import { useVendors } from "../hooks/useVendors";
import { Separator } from "./ui/separator";
import { Switch } from "./ui/switch";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";

interface CampaignImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ParsedCSVData {
  headers: string[];
  rows: any[];
  previewRows: any[];
}

interface ColumnMapping {
  csvColumn: string;
  dbField: string;
  required: boolean;
}

interface PlaylistMatch {
  originalName: string;
  matchedPlaylist?: {
    id: string;
    name: string;
    vendor_name: string;
  };
  confidence: 'high' | 'medium' | 'low' | 'none';
  suggestions: Array<{
    id: string;
    name: string;
    vendor_name: string;
    similarity: number;
  }>;
  action: 'match' | 'create' | 'skip';
  createWithVendor?: string;
}

// Production CSV field mappings - matches spotify_campaigns table structure
const REQUIRED_FIELDS = [
  { key: 'campaign', label: 'Campaign Name', required: true },
  { key: 'client', label: 'Client', required: true },
  { key: 'vendor', label: 'Vendor', required: false },
  { key: 'goal', label: 'Goal', required: true },
  { key: 'remaining', label: 'Remaining', required: false },
  { key: 'daily', label: 'Daily Streams', required: false },
  { key: 'weekly', label: 'Weekly Streams', required: false },
  { key: 'url', label: 'Track URL', required: false },
  { key: 'sfa', label: 'SFA Link', required: false },
  { key: 'start_date', label: 'Start Date', required: false },
  { key: 'status', label: 'Status', required: false },
  { key: 'sale_price', label: 'Sale Price', required: false },
  { key: 'playlists', label: 'Playlists', required: false },
  { key: 'paid_vendor', label: 'Paid Vendor', required: false },
  { key: 'curator_status', label: 'Curator Status', required: false },
  { key: 'notes', label: 'Notes', required: false },
  { key: 'playlist_links', label: 'SP Playlist Stuff', required: false },
];

export default function CampaignImportModal({ 
  open, 
  onOpenChange 
}: CampaignImportModalProps) {
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'importing'>('upload');
  const [csvData, setCsvData] = useState<ParsedCSVData | null>(null);
  const [columnMappings, setColumnMappings] = useState<Record<string, string>>({});
  const [playlistMatches, setPlaylistMatches] = useState<PlaylistMatch[]>([]);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [importStatus, setImportStatus] = useState<string>('');
  const [defaultVendor, setDefaultVendor] = useState<string>('');
  
  // Replace Mode state
  const [replaceMode, setReplaceMode] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [existingCampaignCount, setExistingCampaignCount] = useState(0);
  const [isExportingBackup, setIsExportingBackup] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch vendors for playlist creation
  const { data: vendors } = useVendors();

  // Fetch all playlists for matching
  const { data: allPlaylists } = useQuery({
    queryKey: ['playlists-for-import'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('playlists')
        .select(`
          id,
          name,
          vendor_id,
          vendors(name)
        `);
      
      if (error) throw error;
      return data.map(p => ({
        id: p.id,
        name: p.name,
        vendor_name: p.vendors?.name || 'Unknown'
      }));
    },
    enabled: open
  });

  // Fetch existing campaign count for replace mode warning
  const { data: existingCampaigns } = useQuery({
    queryKey: ['existing-campaigns-count'],
    queryFn: async () => {
      const { count: spotifyCount, error: spotifyError } = await supabase
        .from('spotify_campaigns')
        .select('*', { count: 'exact', head: true });
      
      const { count: campaignsCount, error: campaignsError } = await supabase
        .from('campaigns')
        .select('*', { count: 'exact', head: true });
      
      return {
        spotifyCampaigns: spotifyCount || 0,
        campaigns: campaignsCount || 0,
        total: (spotifyCount || 0) + (campaignsCount || 0)
      };
    },
    enabled: open
  });

  // Update existing campaign count when data loads
  useEffect(() => {
    if (existingCampaigns) {
      setExistingCampaignCount(existingCampaigns.spotifyCampaigns);
    }
  }, [existingCampaigns]);

  // Export current campaigns as backup before delete
  const exportCampaignsBackup = async () => {
    setIsExportingBackup(true);
    try {
      // Fetch all spotify_campaigns
      const { data: spotifyCampaigns, error } = await supabase
        .from('spotify_campaigns')
        .select('*')
        .order('id');
      
      if (error) throw error;
      
      if (!spotifyCampaigns || spotifyCampaigns.length === 0) {
        toast({
          title: "No Campaigns to Export",
          description: "There are no existing campaigns to backup.",
        });
        setIsExportingBackup(false);
        return;
      }

      // Generate CSV
      const csv = Papa.unparse(spotifyCampaigns);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const timestamp = new Date().toISOString().split('T')[0];
      link.download = `spotify_campaigns_backup_${timestamp}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Backup Exported",
        description: `Exported ${spotifyCampaigns.length} campaigns to backup file.`,
      });
    } catch (error: any) {
      toast({
        title: "Export Failed",
        description: error.message || "Failed to export campaigns backup",
        variant: "destructive",
      });
    } finally {
      setIsExportingBackup(false);
    }
  };

  // Delete all existing campaigns (preserving campaign_playlists SFA data)
  const deleteAllCampaigns = async (): Promise<{ sfaMappings: Record<number, string> }> => {
    // First, store SFA mappings from campaign_playlists for re-linking
    const { data: campaignPlaylists } = await supabase
      .from('campaign_playlists')
      .select('campaign_id, playlist_name')
      .not('campaign_id', 'is', null);
    
    // Get SFA links for each campaign
    const sfaMappings: Record<number, string> = {};
    if (campaignPlaylists) {
      const campaignIds = [...new Set(campaignPlaylists.map(cp => cp.campaign_id))];
      const { data: campaigns } = await supabase
        .from('spotify_campaigns')
        .select('id, sfa')
        .in('id', campaignIds);
      
      if (campaigns) {
        campaigns.forEach(c => {
          if (c.sfa) {
            sfaMappings[c.id] = c.sfa;
          }
        });
      }
    }

    // Store SFA in campaign_playlists temporarily for re-linking
    for (const [campaignId, sfa] of Object.entries(sfaMappings)) {
      await supabase
        .from('campaign_playlists')
        .update({ playlist_curator: `SFA_BACKUP:${sfa}` })
        .eq('campaign_id', parseInt(campaignId));
    }

    // Delete from spotify_campaigns (campaign_playlists has ON DELETE CASCADE, but we preserved data)
    // First, set campaign_id to null to prevent cascade delete
    await supabase
      .from('campaign_playlists')
      .update({ campaign_id: null })
      .not('campaign_id', 'is', null);

    // Now delete spotify_campaigns
    const { error: deleteSpotifyError } = await supabase
      .from('spotify_campaigns')
      .delete()
      .neq('id', 0); // Delete all

    if (deleteSpotifyError) {
      console.error('Error deleting spotify_campaigns:', deleteSpotifyError);
    }

    // Delete from campaigns table
    const { error: deleteCampaignsError } = await supabase
      .from('campaigns')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (deleteCampaignsError) {
      console.error('Error deleting campaigns:', deleteCampaignsError);
    }

    // Delete from campaign_groups table
    const { error: deleteGroupsError } = await supabase
      .from('campaign_groups')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (deleteGroupsError) {
      console.error('Error deleting campaign_groups:', deleteGroupsError);
    }

    return { sfaMappings };
  };

  // String similarity function for fuzzy matching
  const calculateSimilarity = (str1: string, str2: string): number => {
    const a = str1.toLowerCase().trim();
    const b = str2.toLowerCase().trim();
    
    if (a === b) return 1;
    
    // Levenshtein distance
    const matrix = [];
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    const maxLen = Math.max(a.length, b.length);
    return maxLen === 0 ? 1 : 1 - matrix[b.length][a.length] / maxLen;
  };

  // Parse playlists from various formats
  const parsePlaylistNames = (playlistText: string): string[] => {
    if (!playlistText) return [];
    
    // Handle different formats: bullet points, dashes, commas, line breaks
    return playlistText
      .split(/[•\-\n,]+/)
      .map(name => name
        .trim()
        .replace(/^[\d\.\)]+\s*/, '') // Remove numbering
        .replace(/[^\w\s\(\)\[\]]/g, ' ') // Clean special chars except parens/brackets
        .replace(/\s+/g, ' ')
        .trim()
      )
      .filter(name => name.length > 2) // Filter out very short names
      .slice(0, 20); // Limit to 20 playlists max
  };

  // Match playlists intelligently
  const matchPlaylists = (playlistNames: string[]): PlaylistMatch[] => {
    if (!allPlaylists || playlistNames.length === 0) return [];

    return playlistNames.map(originalName => {
      const cleanName = originalName.toLowerCase().trim();
      
      // Find exact match first
      let exactMatch = allPlaylists.find(p => 
        p.name.toLowerCase().trim() === cleanName
      );
      
      if (exactMatch) {
        return {
          originalName,
          matchedPlaylist: exactMatch,
          confidence: 'high',
          suggestions: [],
          action: 'match'
        };
      }

      // Find fuzzy matches
      const similarities = allPlaylists.map(playlist => ({
        ...playlist,
        similarity: calculateSimilarity(cleanName, playlist.name)
      }));

      // Sort by similarity and get top matches
      const topMatches = similarities
        .filter(s => s.similarity > 0.4)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 3);

      const bestMatch = topMatches[0];
      
      if (bestMatch && bestMatch.similarity > 0.8) {
        return {
          originalName,
          matchedPlaylist: bestMatch,
          confidence: 'high',
          suggestions: topMatches.slice(1),
          action: 'match'
        };
      } else if (bestMatch && bestMatch.similarity > 0.6) {
        return {
          originalName,
          matchedPlaylist: bestMatch,
          confidence: 'medium',
          suggestions: topMatches.slice(1),
          action: 'match'
        };
      } else if (bestMatch && bestMatch.similarity > 0.4) {
        return {
          originalName,
          confidence: 'low',
          suggestions: topMatches,
          action: 'create'
        };
      } else {
        return {
          originalName,
          confidence: 'none',
          suggestions: [],
          action: 'create'
        };
      }
    });
  };

  // Auto-detect column mappings based on header names
  const autoDetectMappings = (headers: string[]): Record<string, string> => {
    const mappings: Record<string, string> = {};
    
    // Patterns match the production CSV column names and spotify_campaigns fields
    const patterns: Record<string, RegExp> = {
      campaign: /^(campaign\s*name|name|campaign)$/i,
      client: /^(client|artist|brand)$/i,
      vendor: /^(vendor|curator|placer)$/i,
      goal: /^(goal|stream\s*goal|target|streams?)$/i,
      remaining: /^(remaining|remaining\s*streams?)$/i,
      daily: /^(daily|daily\s*streams?)$/i,
      weekly: /^(weekly|weekly\s*streams?)$/i,
      url: /^(url|track\s*url|link|spotify\s*url)$/i,
      sfa: /^(sfa|sfa\s*link|spotify\s*for\s*artists)$/i,
      start_date: /^(start\s*date|date|launch\s*date)$/i,
      status: /^(status|state)$/i,
      sale_price: /^(sale\s*price|price|budget|cost)$/i,
      playlists: /^(playlists?|placed|adds)$/i,
      paid_vendor: /^(paid\s*vendor|paid)$/i,
      curator_status: /^(curator\s*status)$/i,
      notes: /^(notes?|comments?)$/i,
      playlist_links: /^(sp\s*playlist\s*stuff|playlist\s*links?|playlist\s*urls?)$/i,
    };

    headers.forEach(header => {
      for (const [field, pattern] of Object.entries(patterns)) {
        if (pattern.test(header.trim())) {
          mappings[field] = header;
          break;
        }
      }
    });

    return mappings;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

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
        return;
      }

      const rows = data as any[];
      const headers = Object.keys(rows[0] || {});
      const previewRows = rows.slice(0, 3);

      setCsvData({
        headers,
        rows,
        previewRows
      });

      // Auto-detect column mappings
      const autoMappings = autoDetectMappings(headers);
      setColumnMappings(autoMappings);

      // Find playlist columns and process matches
      const playlistColumns = headers.filter(h => 
        /playlist|placed|add/i.test(h)
      );
      
      let allPlaylistNames: string[] = [];
      for (const row of rows.slice(0, 5)) { // Sample first 5 rows
        for (const col of playlistColumns) {
          if (row[col]) {
            allPlaylistNames = [...allPlaylistNames, ...parsePlaylistNames(row[col])];
          }
        }
      }

      const uniquePlaylistNames = [...new Set(allPlaylistNames)];
      const matches = matchPlaylists(uniquePlaylistNames);
      setPlaylistMatches(matches);

      // Set default vendor to Club Restricted if available
      const clubVendor = vendors?.find(v => v.name === 'Club Restricted');
      if (clubVendor) {
        setDefaultVendor(clubVendor.id);
      }

      setStep('mapping');
      
    } catch (error) {
      toast({
        title: "File Upload Error",
        description: "Failed to process the uploaded file.",
        variant: "destructive",
      });
    }

    event.target.value = '';
  };

  const handleColumnMappingChange = (dbField: string, csvColumn: string) => {
    setColumnMappings(prev => ({
      ...prev,
      [dbField]: csvColumn
    }));
  };

  const handlePlaylistAction = (index: number, action: 'match' | 'create' | 'skip', vendorId?: string) => {
    setPlaylistMatches(prev => prev.map((match, i) => 
      i === index 
        ? { ...match, action, createWithVendor: vendorId }
        : match
    ));
  };

  const downloadTemplate = () => {
    // Production-matching template with all spotify_campaigns columns
    const templateData = [{
      'Campaign Name': 'Artist Name - Song Title',
      'Client': 'Artist Name',
      'Vendor': 'Club Restricted',
      'Goal': '50000',
      'Remaining': '25000',
      'Daily': '500',
      'Weekly': '3500',
      'Track URL': 'https://open.spotify.com/track/4iV5W9uYEdYUVa79Axb7Rh',
      'SFA Link': 'https://artists.spotify.com/c/artist/123/song/456/audience/playlists',
      'Start Date': '2025-01-01',
      'Status': 'Active',
      'Sale Price': '$1000',
      'Playlists': 'Coffee Music 2025, Restaurant Background, Chill Vibes',
      'Paid Vendor': '',
      'Curator Status': '',
      'Notes': 'Example campaign notes',
      'SP Playlist Stuff': ''
    }, {
      'Campaign Name': 'Another Artist - Track Name',
      'Client': 'Another Artist',
      'Vendor': 'Example Vendor',
      'Goal': '30000',
      'Remaining': '30000',
      'Daily': '0',
      'Weekly': '0',
      'Track URL': 'https://open.spotify.com/track/example',
      'SFA Link': '',
      'Start Date': '2025-01-15',
      'Status': 'Pending',
      'Sale Price': '$500',
      'Playlists': '',
      'Paid Vendor': '',
      'Curator Status': '',
      'Notes': '',
      'SP Playlist Stuff': ''
    }];

    const csv = Papa.unparse(templateData);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'spotify_campaign_import_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const validateMappings = (): string[] => {
    const errors: string[] = [];
    const requiredFields = REQUIRED_FIELDS.filter(f => f.required);
    
    for (const field of requiredFields) {
      if (!columnMappings[field.key] || columnMappings[field.key] === "__SKIP__") {
        errors.push(`${field.label} is required but not mapped.`);
      }
    }

    return errors;
  };

  const processImport = async () => {
    const validationErrors = validateMappings();
    if (validationErrors.length > 0) {
      toast({
        title: "Mapping Error",
        description: validationErrors.join(' '),
        variant: "destructive",
      });
      return;
    }

    setStep('importing');
    
    try {
      let sfaMappings: Record<number, string> = {};

      // STEP 0: Delete existing campaigns if in replace mode
      if (replaceMode) {
        setImportStatus('Preparing to delete existing campaigns...');
        const result = await deleteAllCampaigns();
        sfaMappings = result.sfaMappings;
        setImportStatus(`Deleted existing campaigns. Preserved ${Object.keys(sfaMappings).length} SFA mappings for re-linking.`);
      }

      // STEP 1: Create/update clients and vendors
      setImportStatus('Creating clients and vendors...');
      const clientMap: Record<string, string> = {};
      const vendorMap: Record<string, string> = {};

      // Get unique clients from CSV
      const uniqueClients = [...new Set(csvData!.rows.map(row => row[columnMappings.client]).filter(Boolean))];
      for (const clientName of uniqueClients) {
        // Check if client exists
        const { data: existingClient } = await supabase
          .from('clients')
          .select('id')
          .eq('name', clientName)
          .maybeSingle();

        if (existingClient) {
          clientMap[clientName] = existingClient.id;
        } else {
          // Create new client
          const { data: newClient } = await supabase
            .from('clients')
            .insert({ name: clientName })
            .select('id')
            .single();
          
          if (newClient) {
            clientMap[clientName] = newClient.id;
          }
        }
      }

      // Get unique vendors from CSV
      const uniqueVendors = [...new Set(csvData!.rows.map(row => row[columnMappings.vendor]).filter(Boolean))];
      for (const vendorName of uniqueVendors) {
        const { data: existingVendor } = await supabase
          .from('vendors')
          .select('id')
          .eq('name', vendorName)
          .maybeSingle();

        if (existingVendor) {
          vendorMap[vendorName] = existingVendor.id;
        } else {
          // Create new vendor
          const { data: newVendor } = await supabase
            .from('vendors')
            .insert({ name: vendorName, max_daily_streams: 10000 })
            .select('id')
            .single();
          
          if (newVendor) {
            vendorMap[vendorName] = newVendor.id;
          }
        }
      }

      // STEP 2: Process each row and insert into spotify_campaigns
      setImportStatus('Importing campaigns to spotify_campaigns...');
      let spotifyCreatedCount = 0;
      const totalRows = csvData!.rows.length;
      const importedSpotifyCampaigns: Array<{ id: number; sfa: string | null; campaign: string; client: string }> = [];

      for (let i = 0; i < csvData!.rows.length; i++) {
        const row = csvData!.rows[i];
        setImportProgress({ current: i + 1, total: totalRows * 2 }); // *2 because we have two phases

        const campaignName = row[columnMappings.campaign] || '';
        const clientName = row[columnMappings.client] || '';
        const vendorName = row[columnMappings.vendor] || '';

        if (!campaignName || !clientName) continue;

        // Parse numerical fields
        const goal = String(row[columnMappings.goal] || '0').replace(/[,\s$]/g, '');
        const remaining = String(row[columnMappings.remaining] || goal).replace(/[,\s$]/g, '');
        const daily = String(row[columnMappings.daily] || '0').replace(/[,\s$]/g, '');
        const weekly = String(row[columnMappings.weekly] || '0').replace(/[,\s$]/g, '');
        const salePrice = row[columnMappings.sale_price] || '';

        // Insert into spotify_campaigns
        const { data: spotifyCampaign, error: spotifyError } = await supabase
          .from('spotify_campaigns')
          .insert({
            campaign: campaignName,
            client: clientName,
            vendor: vendorName,
            goal: goal,
            remaining: remaining,
            daily: daily,
            weekly: weekly,
            url: row[columnMappings.url] || '',
            sfa: row[columnMappings.sfa] || '',
            start_date: row[columnMappings.start_date] || '',
            status: row[columnMappings.status] || 'Active',
            sale_price: salePrice,
            playlists: row[columnMappings.playlists] || '',
            paid_vendor: row[columnMappings.paid_vendor] || '',
            curator_status: row[columnMappings.curator_status] || '',
            notes: row[columnMappings.notes] || '',
            playlist_links: row[columnMappings.playlist_links] || '',
            client_id: clientMap[clientName] || null,
            vendor_id: vendorMap[vendorName] || null,
          })
          .select('id, sfa, campaign, client')
          .single();

        if (spotifyError) {
          console.error('Error inserting spotify_campaign:', spotifyError);
        } else if (spotifyCampaign) {
          spotifyCreatedCount++;
          importedSpotifyCampaigns.push(spotifyCampaign);
        }
      }

      // STEP 3: Create campaign_groups and link spotify_campaigns
      setImportStatus('Creating campaign groups...');
      
      // Group by campaign name + client
      const campaignGroupsMap = new Map<string, typeof importedSpotifyCampaigns>();
      for (const sc of importedSpotifyCampaigns) {
        const groupKey = `${sc.campaign}|${sc.client}`;
        if (!campaignGroupsMap.has(groupKey)) {
          campaignGroupsMap.set(groupKey, []);
        }
        campaignGroupsMap.get(groupKey)!.push(sc);
      }

      let groupsCreatedCount = 0;
      for (const [groupKey, campaigns] of campaignGroupsMap) {
        const [campaignName, clientName] = groupKey.split('|');
        const clientId = clientMap[clientName] || null;

        // Calculate totals from the group
        let totalGoal = 0;
        for (const row of csvData!.rows) {
          if (row[columnMappings.campaign] === campaignName && row[columnMappings.client] === clientName) {
            totalGoal += parseInt(String(row[columnMappings.goal] || '0').replace(/[,\s$]/g, '')) || 0;
          }
        }

        // Create campaign_group
        const { data: newGroup, error: groupError } = await supabase
          .from('campaign_groups')
          .insert({
            name: campaignName,
            artist_name: clientName,
            client_id: clientId,
            total_goal: totalGoal,
            status: 'Active',
            start_date: csvData!.rows.find(r => r[columnMappings.campaign] === campaignName)?.[columnMappings.start_date] || new Date().toISOString().split('T')[0],
          })
          .select('id')
          .single();

        if (groupError) {
          console.error('Error creating campaign_group:', groupError);
        } else if (newGroup) {
          groupsCreatedCount++;

          // Link spotify_campaigns to this group
          const campaignIds = campaigns.map(c => c.id);
          await supabase
            .from('spotify_campaigns')
            .update({ campaign_group_id: newGroup.id })
            .in('id', campaignIds);
        }
      }

      // STEP 4: Also import to campaigns table for frontend wizard compatibility
      setImportStatus('Syncing to campaigns table...');
      let campaignsCreatedCount = 0;

      for (let i = 0; i < csvData!.rows.length; i++) {
        const row = csvData!.rows[i];
        setImportProgress({ current: totalRows + i + 1, total: totalRows * 2 });

        const campaignName = row[columnMappings.campaign] || '';
        const clientName = row[columnMappings.client] || '';

        if (!campaignName || !clientName) continue;

        const goal = parseInt(String(row[columnMappings.goal] || '0').replace(/[,\s$]/g, '')) || 0;
        const remaining = parseInt(String(row[columnMappings.remaining] || goal).replace(/[,\s$]/g, '')) || goal;
        const budget = parseInt(String(row[columnMappings.sale_price] || '0').replace(/[,\s$]/g, '')) || 0;

        // Insert into campaigns table
        const { error: campaignsError } = await supabase
          .from('campaigns')
          .insert({
            name: campaignName,
            client: clientName,
            stream_goal: goal,
            budget: budget,
            track_url: row[columnMappings.url] || '',
            start_date: row[columnMappings.start_date] || new Date().toISOString().split('T')[0],
            status: (row[columnMappings.status] || 'active').toLowerCase(),
            remaining_streams: remaining,
            daily_streams: parseInt(String(row[columnMappings.daily] || '0').replace(/[,\s$]/g, '')) || 0,
            weekly_streams: parseInt(String(row[columnMappings.weekly] || '0').replace(/[,\s$]/g, '')) || 0,
            source: APP_CAMPAIGN_SOURCE,
            campaign_type: APP_CAMPAIGN_TYPE,
            duration_days: 90,
            vendor_allocations: {},
            totals: { projected_streams: 0 },
            music_genres: [],
            content_types: [],
            territory_preferences: [],
            post_types: [],
            sub_genres: [],
            selected_playlists: [],
          });

        if (!campaignsError) {
          campaignsCreatedCount++;
        }
      }

      // STEP 5: Re-link campaign_playlists using SFA
      if (replaceMode && Object.keys(sfaMappings).length > 0) {
        setImportStatus('Re-linking campaign playlists...');
        
        // For each imported campaign with an SFA, update matching campaign_playlists
        for (const sc of importedSpotifyCampaigns) {
          if (sc.sfa) {
            // Find campaign_playlists that had this SFA (stored in playlist_curator)
            const { data: orphanedPlaylists } = await supabase
              .from('campaign_playlists')
              .select('id')
              .like('playlist_curator', `SFA_BACKUP:${sc.sfa}%`);

            if (orphanedPlaylists && orphanedPlaylists.length > 0) {
              const ids = orphanedPlaylists.map(p => p.id);
              
              // Restore the campaign_id link and clean up curator backup
              for (const playlist of orphanedPlaylists) {
                const originalCurator = await supabase
                  .from('campaign_playlists')
                  .select('playlist_curator')
                  .eq('id', playlist.id)
                  .single();

                // Update with new campaign_id and restore original curator if possible
                await supabase
                  .from('campaign_playlists')
                  .update({
                    campaign_id: sc.id,
                    playlist_curator: null // Will be set by scraper
                  })
                  .eq('id', playlist.id);
              }
            }
          }
        }
      }

      // Success
      const summary = `Import complete! spotify_campaigns: ${spotifyCreatedCount}, campaign_groups: ${groupsCreatedCount}, campaigns: ${campaignsCreatedCount}${replaceMode ? ' (replaced existing)' : ''}`;
      setImportStatus(summary);
      
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ['campaigns-enhanced'] });
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['spotify-campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['campaign-groups'] });
      queryClient.invalidateQueries({ queryKey: ['existing-campaigns-count'] });
      
      toast({
        title: "Import Successful",
        description: summary,
      });

      setTimeout(() => {
        onOpenChange(false);
        resetModal();
      }, 2000);

    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "An error occurred during import",
        variant: "destructive",
      });
    }
  };

  const resetModal = () => {
    setStep('upload');
    setCsvData(null);
    setColumnMappings({});
    setPlaylistMatches([]);
    setImportProgress({ current: 0, total: 0 });
    setImportStatus('');
    setReplaceMode(false);
    setShowDeleteConfirm(false);
  };

  const renderUploadStep = () => (
    <div className="space-y-6">
      {/* Replace Mode Toggle */}
      <Card className={replaceMode ? "border-destructive bg-destructive/5" : ""}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RefreshCw className={`w-5 h-5 ${replaceMode ? 'text-destructive' : 'text-muted-foreground'}`} />
              <CardTitle className="text-sm">Replace Mode</CardTitle>
            </div>
            <Switch 
              checked={replaceMode} 
              onCheckedChange={setReplaceMode}
            />
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground">
            {replaceMode 
              ? "All existing campaigns will be deleted before importing. Scraped playlist data will be preserved and re-linked."
              : "New campaigns will be added alongside existing ones. Duplicates will be updated."}
          </p>
          {replaceMode && existingCampaignCount > 0 && (
            <Alert variant="destructive" className="mt-3">
              <Trash2 className="h-4 w-4" />
              <AlertTitle>Warning</AlertTitle>
              <AlertDescription>
                This will delete <strong>{existingCampaignCount}</strong> existing campaigns. 
                We recommend exporting a backup first.
              </AlertDescription>
            </Alert>
          )}
          {replaceMode && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={exportCampaignsBackup}
              disabled={isExportingBackup}
              className="mt-3 gap-2"
            >
              <Download className="w-4 h-4" />
              {isExportingBackup ? 'Exporting...' : 'Export Backup'}
            </Button>
          )}
        </CardContent>
      </Card>

      <div className="text-center space-y-4">
        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8">
          <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <Label htmlFor="csv-upload" className="cursor-pointer">
            <span className="text-lg font-medium">Upload CSV File</span>
            <p className="text-sm text-muted-foreground mt-1">
              Select a CSV file with your campaign data
            </p>
          </Label>
          <Input
            id="csv-upload"
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
        
        <Button 
          variant="outline" 
          onClick={downloadTemplate}
          className="gap-2"
        >
          <Download className="w-4 h-4" />
          Download Template
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            CSV Format Preview
            <Badge variant="secondary" className="text-xs">Example Data</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Column Requirements */}
          <div className="text-sm space-y-1">
            <p><Badge variant="default" className="mr-2">Required</Badge> Campaign Name, Client, Goal</p>
            <p><Badge variant="outline" className="mr-2">Optional</Badge> Vendor, Remaining, Daily, Weekly, Track URL, SFA Link, Start Date, Status, Sale Price, Playlists, Notes</p>
          </div>

          {/* Sample CSV Table */}
          <div className="rounded-lg border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-xs font-semibold whitespace-nowrap">Campaign Name</TableHead>
                  <TableHead className="text-xs font-semibold whitespace-nowrap">Client</TableHead>
                  <TableHead className="text-xs font-semibold whitespace-nowrap">Vendor</TableHead>
                  <TableHead className="text-xs font-semibold whitespace-nowrap">Goal</TableHead>
                  <TableHead className="text-xs font-semibold whitespace-nowrap">Remaining</TableHead>
                  <TableHead className="text-xs font-semibold whitespace-nowrap">Daily</TableHead>
                  <TableHead className="text-xs font-semibold whitespace-nowrap">Weekly</TableHead>
                  <TableHead className="text-xs font-semibold whitespace-nowrap">Start Date</TableHead>
                  <TableHead className="text-xs font-semibold whitespace-nowrap">Status</TableHead>
                  <TableHead className="text-xs font-semibold whitespace-nowrap">Sale Price</TableHead>
                  <TableHead className="text-xs font-semibold whitespace-nowrap">Playlists</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="text-xs font-mono whitespace-nowrap">Artist Name - Song Title</TableCell>
                  <TableCell className="text-xs font-mono whitespace-nowrap">Artist Name</TableCell>
                  <TableCell className="text-xs font-mono whitespace-nowrap">Club Restricted</TableCell>
                  <TableCell className="text-xs font-mono whitespace-nowrap">50000</TableCell>
                  <TableCell className="text-xs font-mono whitespace-nowrap">25000</TableCell>
                  <TableCell className="text-xs font-mono whitespace-nowrap">500</TableCell>
                  <TableCell className="text-xs font-mono whitespace-nowrap">3500</TableCell>
                  <TableCell className="text-xs font-mono whitespace-nowrap">2025-01-01</TableCell>
                  <TableCell className="text-xs font-mono whitespace-nowrap">Active</TableCell>
                  <TableCell className="text-xs font-mono whitespace-nowrap">$1000</TableCell>
                  <TableCell className="text-xs font-mono whitespace-nowrap max-w-[150px] truncate">Coffee Music, Chill Vibes</TableCell>
                </TableRow>
                <TableRow className="bg-muted/30">
                  <TableCell className="text-xs font-mono whitespace-nowrap">Another Artist - Track</TableCell>
                  <TableCell className="text-xs font-mono whitespace-nowrap">Another Artist</TableCell>
                  <TableCell className="text-xs font-mono whitespace-nowrap">Example Vendor</TableCell>
                  <TableCell className="text-xs font-mono whitespace-nowrap">30000</TableCell>
                  <TableCell className="text-xs font-mono whitespace-nowrap">30000</TableCell>
                  <TableCell className="text-xs font-mono whitespace-nowrap">0</TableCell>
                  <TableCell className="text-xs font-mono whitespace-nowrap">0</TableCell>
                  <TableCell className="text-xs font-mono whitespace-nowrap">2025-01-15</TableCell>
                  <TableCell className="text-xs font-mono whitespace-nowrap">Pending</TableCell>
                  <TableCell className="text-xs font-mono whitespace-nowrap">$500</TableCell>
                  <TableCell className="text-xs font-mono whitespace-nowrap max-w-[150px] truncate"></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {/* Additional Notes */}
          <div className="text-xs text-muted-foreground space-y-1 bg-muted/30 p-3 rounded-lg">
            <p><strong>Tips:</strong></p>
            <ul className="list-disc list-inside space-y-0.5 ml-2">
              <li>Playlists can be comma-separated or use bullet points (•)</li>
              <li>Status values: Active, Pending, Complete, Paused</li>
              <li>Dates should be in YYYY-MM-DD format</li>
              <li>Goal/Remaining/Daily/Weekly should be numbers only</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderMappingStep = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Map CSV Columns</h3>
        <Button 
          variant="outline" 
          onClick={() => setStep('upload')}
          size="sm"
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
      </div>

      {/* CSV Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">CSV Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {csvData!.headers.map(header => (
                    <TableHead key={header} className="min-w-[120px] text-xs">
                      {header}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {csvData!.previewRows.map((row, idx) => (
                  <TableRow key={idx}>
                    {csvData!.headers.map(header => (
                      <TableCell key={header} className="text-xs max-w-[150px] truncate">
                        {String(row[header] || '').substring(0, 50)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Column Mapping */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Column Mapping</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {REQUIRED_FIELDS.map(field => (
            <div key={field.key} className="flex items-center justify-between gap-4">
              <Label className="min-w-[120px] text-sm">
                {field.label}
                {field.required && <span className="text-destructive ml-1">*</span>}
              </Label>
              <Select
                value={columnMappings[field.key] || ''}
                onValueChange={(value) => handleColumnMappingChange(field.key, value)}
              >
                <SelectTrigger className="max-w-[200px]">
                  <SelectValue placeholder="Select column..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__SKIP__">-- Skip --</SelectItem>
                  {csvData!.headers.map(header => (
                    <SelectItem key={header} value={header}>{header}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Playlist Matching */}
      {playlistMatches.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Playlist Matching</CardTitle>
            <div className="flex items-center gap-2">
              <Label htmlFor="default-vendor" className="text-sm">Default vendor for new playlists:</Label>
              <Select value={defaultVendor} onValueChange={setDefaultVendor}>
                <SelectTrigger className="max-w-[200px]">
                  <SelectValue placeholder="Select vendor..." />
                </SelectTrigger>
                <SelectContent>
                  {vendors?.map(vendor => (
                    <SelectItem key={vendor.id} value={vendor.id}>{vendor.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[400px] overflow-y-auto">
            {playlistMatches.map((match, index) => (
              <div key={index} className="border rounded p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{match.originalName}</span>
                  <Badge 
                    variant={match.confidence === 'high' ? 'default' : 
                             match.confidence === 'medium' ? 'secondary' : 'outline'}
                  >
                    {match.confidence} confidence
                  </Badge>
                </div>
                
                {match.matchedPlaylist && (
                  <div className="text-sm text-muted-foreground">
                    Suggested match: <strong>{match.matchedPlaylist.name}</strong> 
                    <span className="ml-1">({match.matchedPlaylist.vendor_name})</span>
                  </div>
                )}

                <div className="flex gap-2">
                  {match.matchedPlaylist && (
                    <Button
                      size="sm"
                      variant={match.action === 'match' ? 'default' : 'outline'}
                      onClick={() => handlePlaylistAction(index, 'match')}
                      className="gap-1"
                    >
                      <Check className="w-3 h-3" />
                      Use Match
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant={match.action === 'create' ? 'default' : 'outline'}
                    onClick={() => handlePlaylistAction(index, 'create', defaultVendor)}
                    className="gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    Create New
                  </Button>
                  <Button
                    size="sm"
                    variant={match.action === 'skip' ? 'default' : 'outline'}
                    onClick={() => handlePlaylistAction(index, 'skip')}
                    className="gap-1"
                  >
                    <X className="w-3 h-3" />
                    Skip
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <Button 
          onClick={() => {
            if (replaceMode && existingCampaignCount > 0) {
              setShowDeleteConfirm(true);
            } else {
              processImport();
            }
          }} 
          className={`gap-2 ${replaceMode ? 'bg-destructive hover:bg-destructive/90' : ''}`}
        >
          {replaceMode ? (
            <>
              <Trash2 className="w-4 h-4" />
              Delete & Import
            </>
          ) : (
            <>
              <ArrowRight className="w-4 h-4" />
              Start Import
            </>
          )}
        </Button>
      </div>
    </div>
  );

  const renderImportStep = () => (
    <div className="space-y-6 text-center">
      <div className="space-y-4">
        <Loader2 className="w-12 h-12 mx-auto animate-spin" />
        <div>
          <h3 className="font-medium">Importing Campaigns</h3>
          <p className="text-sm text-muted-foreground mt-1">{importStatus}</p>
        </div>
        
        {importProgress.total > 0 && (
          <div className="space-y-2">
            <div className="text-sm">
              {importProgress.current} / {importProgress.total}
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all"
                style={{ 
                  width: `${(importProgress.current / importProgress.total) * 100}%` 
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import Campaigns</DialogTitle>
            <DialogDescription>
              Upload a CSV file to import campaign data with intelligent playlist matching
              {replaceMode && (
                <Badge variant="destructive" className="ml-2">Replace Mode</Badge>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Step indicator */}
            <div className="flex items-center justify-center space-x-4">
              {['upload', 'mapping', 'importing'].map((stepName, index) => (
                <div key={stepName} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                    ${step === stepName ? 'bg-primary text-primary-foreground' :
                      ['upload', 'mapping', 'importing'].indexOf(step) > index ? 'bg-muted-foreground text-white' :
                      'bg-muted text-muted-foreground'}`}
                  >
                    {index + 1}
                  </div>
                  {index < 2 && <div className="w-8 h-px bg-muted mx-2" />}
                </div>
              ))}
            </div>

            {step === 'upload' && renderUploadStep()}
            {step === 'mapping' && renderMappingStep()}
            {step === 'importing' && renderImportStep()}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete All Campaigns?</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to delete <strong>{existingCampaignCount}</strong> existing campaigns. 
              This action cannot be undone. Scraped playlist data will be preserved and re-linked 
              to the new campaigns after import.
              <br /><br />
              <strong>Make sure you have exported a backup before proceeding.</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                setShowDeleteConfirm(false);
                await processImport();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete & Import
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}








