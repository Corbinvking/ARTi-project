"use client"

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, FileText, CheckCircle, XCircle, Loader2, Download, MapPin, FileUp } from 'lucide-react';
import { supabase } from '../../integrations/supabase/client';
import { useToast } from '../../hooks/use-toast';
import { calculateRepostLimit, getFollowerTier } from '../../utils/creditCalculations';

interface BulkMemberImportProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface CSVData {
  headers: string[];
  rows: string[][];
}

interface ColumnMapping {
  csvColumn: string;
  memberField: string | null;
}

interface MappedMember {
  name?: string;
  first_name?: string;
  stage_name?: string;
  groups?: string[];
  primary_email?: string;
  secondary_email?: string;
  soundcloud_url?: string;
  soundcloud_handle?: string;
  spotify_handle?: string;
  follower_count?: number;
  status?: string;
  influence_planner_status?: string;
  manual_monthly_repost_override?: number;
  override_reason?: string;
  // Auto-calculated fields
  size_tier?: 'T1' | 'T2' | 'T3' | 'T4';
  monthly_repost_limit?: number;
}

interface ImportResult {
  member: MappedMember;
  success: boolean;
  error?: string;
  rowIndex: number;
}

// Available member fields for mapping
const MEMBER_FIELDS = [
  { value: 'name', label: 'Full Name', required: true },
  { value: 'first_name', label: 'First Name', required: false },
  { value: 'stage_name', label: 'Stage Name', required: false },
  { value: 'groups', label: 'Groups (comma-separated)', required: false },
  { value: 'primary_email', label: 'Primary Email', required: true },
  { value: 'secondary_email', label: 'Secondary Email', required: false },
  { value: 'soundcloud_url', label: 'SoundCloud URL', required: true },
  { value: 'soundcloud_handle', label: 'SoundCloud Handle', required: false },
  { value: 'spotify_handle', label: 'Spotify Handle', required: false },
  { value: 'follower_count', label: 'Follower Count', required: true },
  { value: 'status', label: 'Status', required: false },
  { value: 'influence_planner_status', label: 'Influence Planner Status', required: false },
  { value: 'manual_monthly_repost_override', label: 'Manual Repost Override', required: false },
  { value: 'override_reason', label: 'Override Reason', required: false },
];

// Smart column matching suggestions
const SMART_MAPPINGS: Record<string, string> = {
  'name': 'name',
  'full_name': 'name',
  'artist_name': 'name',
  'artistname': 'name',
  'first_name': 'first_name',
  'firstname': 'first_name',
  'contact_name': 'first_name',
  'contactname': 'first_name',
  'stage_name': 'stage_name',
  'stagename': 'stage_name',
  'stage': 'stage_name',
  'groups': 'groups',
  'group': 'groups',
  'email': 'primary_email',
  'primary_email': 'primary_email',
  'email_1': 'primary_email',
  'email1': 'primary_email',
  'main_email': 'primary_email',
  'secondary_email': 'secondary_email',
  'email_2': 'secondary_email',
  'email2': 'secondary_email',
  'backup_email': 'secondary_email',
  'soundcloud_url': 'soundcloud_url',
  'soundcloud': 'soundcloud_url',
  'sc_url': 'soundcloud_url',
  'url': 'soundcloud_url',
  'soundcloud_handle': 'soundcloud_handle',
  'sc_handle': 'soundcloud_handle',
  'handle': 'soundcloud_handle',
  'spotify_handle': 'spotify_handle',
  'spotify': 'spotify_handle',
  'follower_count': 'follower_count',
  'followers': 'follower_count',
  'follower': 'follower_count',
  'sc_followers': 'follower_count',
  'soundcloud_followers': 'follower_count',
  'status': 'status',
  'influence_planner_status': 'influence_planner_status',
  'ip_status': 'influence_planner_status',
  'planner_status': 'influence_planner_status',
  'manual_monthly_repost_override': 'manual_monthly_repost_override',
  'repost_override': 'manual_monthly_repost_override',
  'override': 'manual_monthly_repost_override',
  'override_reason': 'override_reason',
  'reason': 'override_reason',
};

export const BulkMemberImport: React.FC<BulkMemberImportProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { toast } = useToast();
  const [csvData, setCsvData] = useState<CSVData | null>(null);
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);
  const [mappedMembers, setMappedMembers] = useState<MappedMember[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState<'upload' | 'mapping' | 'preview' | 'process' | 'complete'>('upload');

  const parseCSV = (csvText: string): CSVData => {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const rows = lines.slice(1).map(line => 
      line.split(',').map(cell => cell.trim().replace(/"/g, ''))
    ).filter(row => row.some(cell => cell)); // Remove empty rows

    return { headers, rows };
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast({
        title: "Invalid file type",
        description: "Please upload a CSV file",
        variant: "destructive"
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const csvText = e.target?.result as string;
      try {
        const parsed = parseCSV(csvText);
        setCsvData(parsed);
        
        // Auto-generate smart mappings
        const smartMappings: ColumnMapping[] = parsed.headers.map(header => {
          const normalizedHeader = header.toLowerCase().replace(/\s+/g, '_').replace(/[^\w_]/g, '');
          const suggestedField = SMART_MAPPINGS[normalizedHeader] || null;
          return {
            csvColumn: header,
            memberField: suggestedField
          };
        });
        
        setColumnMappings(smartMappings);
        setCurrentStep('mapping');
        
        toast({
          title: "File uploaded",
          description: `Found ${parsed.headers.length} columns and ${parsed.rows.length} rows`,
        });
      } catch (error) {
        toast({
          title: "Parse error",
          description: "Failed to parse CSV file. Please check format.",
          variant: "destructive"
        });
      }
    };
    reader.readAsText(file);
  };

  const updateColumnMapping = (csvColumn: string, memberField: string | null) => {
    setColumnMappings(prev => 
      prev.map(mapping => 
        mapping.csvColumn === csvColumn 
          ? { ...mapping, memberField } 
          : mapping
      )
    );
  };

  const validateMappings = (): boolean => {
    const requiredFields = MEMBER_FIELDS.filter(f => f.required).map(f => f.value);
    const mappedFields = columnMappings.filter(m => m.memberField).map(m => m.memberField);
    const missingRequired = requiredFields.filter(field => !mappedFields.includes(field));

    if (missingRequired.length > 0) {
      toast({
        title: "Missing required mappings",
        description: `Please map: ${missingRequired.join(', ')}`,
        variant: "destructive"
      });
      return false;
    }

    return true;
  };

  const generatePreview = () => {
    if (!csvData || !validateMappings()) return;

    const members: MappedMember[] = csvData.rows.map(row => {
      const member: MappedMember = {};
      
      columnMappings.forEach(mapping => {
        if (!mapping.memberField) return;
        
        const columnIndex = csvData.headers.indexOf(mapping.csvColumn);
        const value = row[columnIndex]?.trim();
        
        if (!value) return;
        
        switch (mapping.memberField) {
          case 'groups':
            member.groups = value ? value.split(',').map(g => g.trim()).filter(Boolean) : [];
            break;
          case 'follower_count':
            const followerCount = parseInt(value.replace(/,/g, '')) || 0;
            member.follower_count = followerCount;
            member.size_tier = getFollowerTier(followerCount).split(' ')[0] as 'T1' | 'T2' | 'T3' | 'T4';
            member.monthly_repost_limit = calculateRepostLimit(followerCount);
            break;
          case 'manual_monthly_repost_override':
            member.manual_monthly_repost_override = parseInt(value) || undefined;
            break;
          default:
            (member as any)[mapping.memberField] = value;
        }
      });
      
      return member;
    });

    setMappedMembers(members);
    setCurrentStep('preview');
  };

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validateUrl = (url: string) => {
    return /^https?:\/\/(www\.)?soundcloud\.com\/.+/.test(url);
  };

  // Valid enum values for validation
  const VALID_STATUS_VALUES = ['active', 'inactive', 'pending', 'suspended'];
  const VALID_IP_STATUS_VALUES = ['hasnt_logged_in', 'invited', 'connected', 'disconnected', 'uninterested'];

  // Sanitize and validate enum values with proper typing
  const sanitizeStatusValue = (value: string | undefined): 'active' | 'needs_reconnect' => {
    if (!value) return 'active';
    
    const cleanValue = value.toString().trim().toLowerCase();
    const validValues: ('active' | 'needs_reconnect')[] = ['active', 'needs_reconnect'];
    const matchingValue = validValues.find(v => v.toLowerCase() === cleanValue);
    
    return matchingValue || 'active';
  };

  const sanitizeIPStatusValue = (value: string | undefined): 'hasnt_logged_in' | 'invited' | 'connected' | 'disconnected' | 'uninterested' => {
    if (!value) return 'hasnt_logged_in';
    
    const cleanValue = value.toString().trim().toLowerCase();
    const validValues: ('hasnt_logged_in' | 'invited' | 'connected' | 'disconnected' | 'uninterested')[] = ['hasnt_logged_in', 'invited', 'connected', 'disconnected', 'uninterested'];
    const matchingValue = validValues.find(v => v.toLowerCase() === cleanValue);
    
    return matchingValue || 'hasnt_logged_in';
  };

  const processImport = async () => {
    setIsProcessing(true);
    setCurrentStep('process');
    setProgress(0);
    
    const importResults: ImportResult[] = [];
    
    for (let i = 0; i < mappedMembers.length; i++) {
      const member = mappedMembers[i];
      
      try {
        // Validate required fields
        if (!member.name || !member.primary_email || !member.soundcloud_url || member.follower_count === undefined) {
          throw new Error('Missing required fields');
        }

        // Validate formats
        if (!validateEmail(member.primary_email)) {
          throw new Error('Invalid primary email format');
        }

        if (member.secondary_email && !validateEmail(member.secondary_email)) {
          throw new Error('Invalid secondary email format');
        }

        if (!validateUrl(member.soundcloud_url)) {
          throw new Error('Invalid SoundCloud URL format');
        }

        // Prepare member data
        const emails = [member.primary_email];
        if (member.secondary_email) {
          emails.push(member.secondary_email);
        }

        const memberData = {
          name: member.name,
          stage_name: member.stage_name,
          groups: member.groups || [],
          primary_email: member.primary_email,
          emails: emails,
          soundcloud_url: member.soundcloud_url,
          soundcloud_handle: member.soundcloud_handle,
          spotify_handle: member.spotify_handle,
          soundcloud_followers: member.follower_count,
          monthly_repost_limit: member.manual_monthly_repost_override || member.monthly_repost_limit,
          manual_monthly_repost_override: member.manual_monthly_repost_override,
          override_reason: member.override_reason,
          size_tier: member.size_tier,
          status: sanitizeStatusValue(member.status),
          influence_planner_status: sanitizeIPStatusValue(member.influence_planner_status)
        };

        // Insert member
        const { data: insertedMember, error: memberError } = await supabase
          .from('soundcloud_members')
          .insert(memberData)
          .select('id')
          .single();

        if (memberError) throw memberError;

        // Create repost credit wallet
        const { error: walletError } = await supabase
          .from('soundcloud_repost_credit_wallet')
          .insert({
            member_id: insertedMember.id,
            balance: memberData.monthly_repost_limit,
            monthly_grant: memberData.monthly_repost_limit,
            cap: memberData.monthly_repost_limit
          });

        if (walletError) {
          console.warn('Failed to create wallet for member:', walletError);
        }

        importResults.push({
          member,
          success: true,
          rowIndex: i
        });

      } catch (error: any) {
        importResults.push({
          member,
          success: false,
          error: error.message || 'Unknown error',
          rowIndex: i
        });
      }

      setProgress(((i + 1) / mappedMembers.length) * 100);
    }

    setResults(importResults);
    setCurrentStep('complete');
    setIsProcessing(false);

    const successCount = importResults.filter(r => r.success).length;
    const failCount = importResults.length - successCount;

    toast({
      title: "Import complete",
      description: `${successCount} members imported successfully. ${failCount} failed.`,
      variant: successCount > 0 ? "default" : "destructive"
    });

    if (successCount > 0) {
      onSuccess();
    }
  };

  const downloadTemplate = () => {
    const template = `Name,Stage Name,Groups,Primary Email,Secondary Email,SoundCloud URL,SoundCloud Handle,Spotify Handle,Follower Count,Status,Influence Planner Status
DJ Example,DJ Example,Electronic House,dj@example.com,john@backup.com,https://soundcloud.com/dj-example,dj-example,dj_example,150000,active,connected
Producer Name,Producer,Techno,producer@example.com,,https://soundcloud.com/producer-name,producer-name,,50000,active,invited
Artist Stage,Artist Stage,"Pop, Dance",artist@example.com,jane@personal.com,https://soundcloud.com/artist-stage,artist-stage,artist_stage,1200000,active,hasnt_logged_in`;
    
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'member_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetImport = () => {
    setCsvData(null);
    setColumnMappings([]);
    setMappedMembers([]);
    setResults([]);
    setProgress(0);
    setCurrentStep('upload');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Bulk Import Members
          </DialogTitle>
        </DialogHeader>

        {/* Upload Step */}
        {currentStep === 'upload' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Upload CSV File</h3>
                <p className="text-sm text-muted-foreground">
                  Upload a CSV file and map columns to member fields
                </p>
              </div>
              <Button variant="outline" onClick={downloadTemplate} className="flex items-center gap-2">
                <Download className="w-4 h-4" />
                Download Template
              </Button>
            </div>
            
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
              <FileUp className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <Label htmlFor="csvFile" className="cursor-pointer">
                <span className="text-lg font-medium">Choose CSV file</span>
                <p className="text-sm text-muted-foreground mt-1">
                  Or drag and drop your CSV file here
                </p>
              </Label>
              <Input
                id="csvFile"
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Mapping Step */}
        {currentStep === 'mapping' && csvData && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold">Map Columns</h3>
              <p className="text-sm text-muted-foreground">
                Map your CSV columns to member fields. Required fields are marked with *
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {columnMappings.map((mapping, index) => {
                const mappedField = MEMBER_FIELDS.find(f => f.value === mapping.memberField);
                return (
                  <div key={index} className="flex items-center gap-4 p-4 border rounded-lg">
                    <div className="flex-1">
                      <Label className="font-medium">{mapping.csvColumn}</Label>
                      <p className="text-xs text-muted-foreground">
                        Sample: {csvData.rows[0]?.[csvData.headers.indexOf(mapping.csvColumn)] || 'N/A'}
                      </p>
                    </div>
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <div className="flex-1">
                      <Select
                        value={mapping.memberField || 'skip'}
                        onValueChange={(value) => updateColumnMapping(mapping.csvColumn, value === 'skip' ? null : value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="skip">Skip Column</SelectItem>
                          {MEMBER_FIELDS.map(field => (
                            <SelectItem key={field.value} value={field.value}>
                              {field.label} {field.required && '*'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {mappedField?.required && (
                        <Badge variant="secondary" className="mt-1 text-xs">Required</Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2">
              <Button onClick={generatePreview}>
                Preview Import
              </Button>
              <Button variant="outline" onClick={() => setCurrentStep('upload')}>
                Back to Upload
              </Button>
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Preview Step */}
        {currentStep === 'preview' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold">Preview Import</h3>
              <p className="text-sm text-muted-foreground">
                Review {mappedMembers.length} members before import
              </p>
            </div>

            <ScrollArea className="h-96 border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Primary Email</TableHead>
                    <TableHead>SoundCloud URL</TableHead>
                    <TableHead>Followers</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Monthly Limit</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mappedMembers.map((member, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{member.name}</TableCell>
                      <TableCell>{member.primary_email}</TableCell>
                      <TableCell className="text-xs">{member.soundcloud_url}</TableCell>
                      <TableCell>{member.follower_count?.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{member.size_tier}</Badge>
                      </TableCell>
                      <TableCell>{member.manual_monthly_repost_override || member.monthly_repost_limit}</TableCell>
                      <TableCell>
                        <Badge variant={
                          !member.name || !member.primary_email || !member.soundcloud_url ? 'destructive' : 'secondary'
                        }>
                          {!member.name || !member.primary_email || !member.soundcloud_url ? 'Invalid' : 'Valid'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>

            <div className="flex gap-2">
              <Button onClick={processImport}>
                Start Import
              </Button>
              <Button variant="outline" onClick={() => setCurrentStep('mapping')}>
                Back to Mapping
              </Button>
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Process Step */}
        {currentStep === 'process' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold">Processing Import</h3>
              <p className="text-sm text-muted-foreground">
                Creating member accounts with calculated tiers and limits...
              </p>
            </div>

            <div className="space-y-4">
              <Progress value={progress} />
              <div className="text-center">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  {Math.round(progress)}% complete
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Complete Step */}
        {currentStep === 'complete' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold">Import Complete</h3>
              <p className="text-sm text-muted-foreground">
                {results.filter(r => r.success).length} of {results.length} members imported successfully
              </p>
            </div>

            <ScrollArea className="h-64 border rounded-md p-4">
              <div className="space-y-3">
                {results.map((result, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-md">
                    <div>
                      <p className="font-medium">{result.member.name}</p>
                      <p className="text-sm text-muted-foreground">{result.member.primary_email}</p>
                      {result.success && (
                        <p className="text-xs text-green-600">
                          Imported as {result.member.size_tier} with {result.member.manual_monthly_repost_override || result.member.monthly_repost_limit} monthly reposts
                        </p>
                      )}
                      {result.error && (
                        <p className="text-xs text-destructive">{result.error}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {result.success ? (
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Success
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <XCircle className="w-3 h-3 mr-1" />
                          Failed
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="flex gap-2">
              <Button onClick={() => { resetImport(); onClose(); }}>
                Close
              </Button>
              <Button variant="outline" onClick={resetImport}>
                Import More Members
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};