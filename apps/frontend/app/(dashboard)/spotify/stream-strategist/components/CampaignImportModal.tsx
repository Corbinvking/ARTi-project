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
import { Upload, Download, Check, X, AlertCircle, Loader2, ArrowRight, ArrowLeft, Plus } from "lucide-react";
import Papa from "papaparse";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Checkbox } from "./ui/checkbox";
import { useVendors } from "../hooks/useVendors";
import { Separator } from "./ui/separator";

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

const REQUIRED_FIELDS = [
  { key: 'name', label: 'Campaign Name', required: true },
  { key: 'client', label: 'Client Name', required: true },
  { key: 'stream_goal', label: 'Stream Goal', required: true },
  { key: 'budget', label: 'Budget', required: false },
  { key: 'track_url', label: 'Track URL', required: false },
  { key: 'start_date', label: 'Start Date', required: false },
  { key: 'daily_streams', label: 'Daily Streams', required: false },
  { key: 'weekly_streams', label: 'Weekly Streams', required: false },
  { key: 'remaining_streams', label: 'Remaining Streams', required: false },
  { key: 'status', label: 'Status', required: false },
  { key: 'playlists', label: 'Playlists', required: false },
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
    
    const patterns = {
      name: /^(campaign\s*name|name|campaign)$/i,
      client: /^(client|artist|brand)$/i,
      stream_goal: /^(stream\s*goal|goal|target|streams?)$/i,
      budget: /^(budget|cost|price)$/i,
      track_url: /^(track\s*url|url|link|spotify\s*url)$/i,
      start_date: /^(start\s*date|date|launch\s*date)$/i,
      daily_streams: /^(daily\s*streams?|daily)$/i,
      weekly_streams: /^(weekly\s*streams?|weekly)$/i,
      remaining_streams: /^(remaining\s*streams?|remaining)$/i,
      status: /^(status|state)$/i,
      playlists: /^(playlist|playlists?|placed|adds)$/i
    };

    headers.forEach(header => {
      for (const [field, pattern] of Object.entries(patterns)) {
        if (pattern.test(header)) {
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
    const templateData = [{
      'Campaign Name': 'Example Campaign',
      'Client': 'Example Client',
      'Stream Goal': '50000',
      'Budget': '1000',
      'Track URL': 'https://open.spotify.com/track/...',
      'Start Date': '2024-01-01',
      'Daily Streams': '500',
      'Weekly Streams': '3500',
      'Remaining Streams': '25000',
      'Status': 'active',
      'Playlists': '• Coffee Music 2025 ☕️\n• Restaurant Background\n• Chill Vibes'
    }];

    const csv = Papa.unparse(templateData);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'campaign_import_template.csv';
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
      // STEP 1: Group CSV rows by campaign name + client for consolidation
      setImportStatus('Grouping campaigns by name and client...');
      const campaignGroups = new Map<string, any[]>();
      
      for (const row of csvData!.rows) {
        const campaignName = row[columnMappings.name || ''];
        const client = row[columnMappings.client || ''];
        
        if (campaignName && client) {
          const groupKey = `${campaignName}|${client}`;
          if (!campaignGroups.has(groupKey)) {
            campaignGroups.set(groupKey, []);
          }
          campaignGroups.get(groupKey)!.push(row);
        }
      }

      setImportProgress({ current: 0, total: campaignGroups.size });

      // STEP 2: Create new playlists first
      const playlistsToCreate = playlistMatches.filter(m => m.action === 'create');
      const createdPlaylists: Record<string, string> = {};

      for (const match of playlistsToCreate) {
        if (match.createWithVendor || defaultVendor) {
          setImportStatus(`Creating playlist: ${match.originalName}`);
          
          const { data, error } = await supabase
            .from('playlists')
            .insert({
              name: match.originalName,
              vendor_id: match.createWithVendor || defaultVendor,
              url: '', // Will be filled later
              genres: [],
              avg_daily_streams: 0,
              follower_count: 0
            })
            .select()
            .single();

          if (!error && data) {
            createdPlaylists[match.originalName] = data.id;
          }
        }
      }

      // STEP 3: Process each consolidated campaign group
      let processedCount = 0;
      let createdCount = 0;
      let updatedCount = 0;

      for (const [groupKey, groupRows] of campaignGroups) {
        const [campaignName, client] = groupKey.split('|');
        setImportStatus(`Processing campaign group: ${campaignName} (${groupRows.length} vendor rows)`);
        
        // STEP 4: Consolidate data from all rows in the group
        const consolidatedData: any = {};
        let allSelectedPlaylists: any[] = [];
        
        // Initialize numerical fields for summation
        const numericalFields = ['stream_goal', 'budget', 'daily_streams', 'weekly_streams', 'remaining_streams'];
        numericalFields.forEach(field => consolidatedData[field] = 0);
        
        // Process each row in the group
        for (const row of groupRows) {
        // Map CSV data to campaign fields for this row
        const rowData: any = {};
        for (const [dbField, csvColumn] of Object.entries(columnMappings)) {
          if (csvColumn && csvColumn !== "__SKIP__" && row[csvColumn]) {
            let value = row[csvColumn];
            
            // Parse numbers
            if (numericalFields.includes(dbField)) {
              value = parseInt(String(value).replace(/[,\s]/g, '')) || 0;
              consolidatedData[dbField] += value; // Sum numerical values
            } else {
              // For non-numerical fields, use first non-empty value
              if (!consolidatedData[dbField] && value) {
                consolidatedData[dbField] = value;
              }
            }
            
            rowData[dbField] = value;
          }
        }

        // Process playlists for this specific row
        const playlistColumn = columnMappings.playlists;
        if (playlistColumn && playlistColumn !== "__SKIP__" && row[playlistColumn]) {
            const playlistNames = parsePlaylistNames(row[playlistColumn]);
            
            for (const name of playlistNames) {
              const match = playlistMatches.find(m => m.originalName === name);
              if (match?.action === 'match' && match.matchedPlaylist) {
                // Check if we already have this playlist to avoid duplicates
                const exists = allSelectedPlaylists.find(p => p.id === match.matchedPlaylist!.id);
                if (!exists) {
                  allSelectedPlaylists.push({
                    id: match.matchedPlaylist.id,
                    name: match.matchedPlaylist.name,
                    vendor_name: match.matchedPlaylist.vendor_name
                  });
                }
              } else if (match?.action === 'create' && createdPlaylists[name]) {
                // Check if we already have this playlist to avoid duplicates
                const exists = allSelectedPlaylists.find(p => p.id === createdPlaylists[name]);
                if (!exists) {
                  const vendor = vendors?.find(v => v.id === (match.createWithVendor || defaultVendor));
                  allSelectedPlaylists.push({
                    id: createdPlaylists[name],
                    name: name,
                    vendor_name: vendor?.name || 'Unknown'
                  });
                }
              }
            }
          }
        }

        // STEP 5: Check if consolidated campaign exists
        const { data: existingCampaign } = await supabase
          .from('campaigns')
          .select('*')
          .eq('name', consolidatedData.name)
          .eq('client', consolidatedData.client)
          .eq('source', APP_CAMPAIGN_SOURCE)
          .eq('campaign_type', APP_CAMPAIGN_TYPE)
          .maybeSingle();

        if (existingCampaign) {
          // Update existing campaign with consolidated data
          await supabase
            .from('campaigns')
            .update({
              ...consolidatedData,
              selected_playlists: allSelectedPlaylists,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingCampaign.id);
          
          updatedCount++;
        } else {
          // Create new campaign with consolidated data
          await supabase
            .from('campaigns')
            .insert({
              ...consolidatedData,
              selected_playlists: allSelectedPlaylists,
              source: APP_CAMPAIGN_SOURCE,
              campaign_type: APP_CAMPAIGN_TYPE,
              status: consolidatedData.status || 'active',
              duration_days: 90,
              start_date: consolidatedData.start_date || new Date().toISOString().split('T')[0],
              remaining_streams: consolidatedData.remaining_streams || consolidatedData.stream_goal || 0,
              vendor_allocations: {},
              totals: { projected_streams: 0 },
              music_genres: [],
              content_types: [],
              territory_preferences: [],
              post_types: [],
              sub_genres: []
            });
          
          createdCount++;
        }

        processedCount++;
        setImportProgress({ current: processedCount, total: campaignGroups.size });
      }

      // Success
      const summary = `Import complete! Created: ${createdCount}, Updated: ${updatedCount} (from ${csvData!.rows.length} total rows consolidated into ${campaignGroups.size} campaigns)`;
      setImportStatus(summary);
      
      queryClient.invalidateQueries({ queryKey: ['campaigns-enhanced'] });
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      
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
  };

  const renderUploadStep = () => (
    <div className="space-y-6">
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
          <CardTitle className="text-sm">CSV Format Guidelines</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p><strong>Required columns:</strong> Campaign Name, Client, Stream Goal</p>
          <p><strong>Playlist format:</strong> Use bullet points (•) or dashes (-) to separate playlist names</p>
          <p><strong>Example playlist cell:</strong></p>
          <div className="bg-muted p-2 rounded font-mono text-xs">
            • Coffee Music 2025 ☕️<br/>
            • Restaurant Background<br/>
            • Chill Vibes Mix
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
        <Button onClick={processImport} className="gap-2">
          <ArrowRight className="w-4 h-4" />
          Start Import
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Campaigns</DialogTitle>
          <DialogDescription>
            Upload a CSV file to import campaign data with intelligent playlist matching
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
  );
}








